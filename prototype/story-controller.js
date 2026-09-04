"use strict";

(function(root){
  const RuntimeApi=root.IMS_STORY_RUNTIME;
  const StateApi=root.IMS_STORY_STATE;
  const Events=root.IMS_STORY_EVENTS;
  const Maps=root.IMS_STORY_MAPS;
  const Dialogue=root.IMS_STORY_DIALOGUE;
  const SaveApi=root.IMS_STORY_SAVE;
  const Story=root.IMS_STORY_DATA.PROLOGUE;
  const T=Events.TYPES,B=Events.bus,TM=Maps.TYPES.TUTORIAL,WM=Maps.TYPES.WILDERNESS,MS=Maps.STORY_MAPS;

  let director=null,lastMap=null,gateSent=false,exitSent=false,observedEnemies=0;
  let exitTimeoutHandle=null,exitTimeoutPending=false;
  let ownership={actors:new Set(),mechanics:new Set(),exits:new Set(),items:new Set()};
  const saveStore=SaveApi?new SaveApi.StorySaveStore():null;

  const eventType=name=>T[name]||name;
  const emit=(name,payload)=>B.emit(eventType(name),payload||{});
  const snapshot=()=>director&&director.runtime.state.snapshot();
  const count=key=>snapshot()&&snapshot().counters[key]||0;
  const currentNode=()=>director&&director.runtime.node&&director.runtime.node.id||"";
  const updateState=(mutator,reason)=>director&&director.runtime.state.update(mutator,reason);
  const hint=action=>Dialogue.actionHint?Dialogue.actionHint(action,1):"";
  const movementHint=()=>["up","left","down","right"].map(action=>root.InputMap&&root.InputMap.bindingLabel(1,action)).filter(Boolean).join("/");
  const withHints=text=>String(text||"").replace(/\{fire\}/g,hint("fire")).replace(/\{interact\}/g,hint("interact")).replace(/\{move\}/g,"["+movementHint()+"]");

  function closeDialogue(){
    if(typeof root.closePanel==="function")root.closePanel();
    panelOpen=false;freeze=false;moveLock=false;panelNpc=null;npcNode=null;
    const say=document.getElementById("npcSay");if(say)say.onclick=null;
    if(typeof root.clearPanelInputGate==="function")root.clearPanelInputGate();
  }

  function setOwnership(map){
    const interactions=map&&map.interactions||{};
    ownership={
      actors:new Set(interactions.actors||[]),
      mechanics:new Set(interactions.mechanics||interactions.mechs||[]),
      exits:new Set(interactions.exits||[]),
      items:new Set(interactions.items||[])
    };
  }

  function targetId(target){return typeof target==="string"?target:target&&(target.storyId||target.id||target.kind)||"";}
  function owns(kind,target){
    const key=kind==="actor"?"actors":kind==="mechanic"?"mechanics":kind==="exit"?"exits":kind==="item"?"items":"";
    return !!key&&ownership[key].has(targetId(target));
  }

  function levelFromMap(map){
    return {
      cleanMap:!!map.cleanMap,solidOutside:map.solidOutside||null,obstacles:map.obstacles||[],
      mechs:(map.gates||[]).map(g=>({kind:"gate",id:g.id,x:g.x,y:g.y,w:g.w,h:g.h,need:g.need||3,reward:null})),
      waves:[],caps:{slime:0,rat:0,flower:0},beans:0,npcs:[]
    };
  }

  function enemyAt(spec){
    const type=ENEMY_TYPES[spec.type];if(!type)return;
    enemies.push({type:spec.type,x:spec.x,y:spec.y,flash:0,hitT:0,hp:type.hp,max:type.hp,r:type.r,vx:0,vy:0,wanderT:0,squash:rnd(6)});
  }

  function rememberCheckpoint(nodeId){
    if(!director)return;
    director.checkpoint={nodeId,state:director.runtime.state.snapshot()};
    updateState(state=>{state.checkpoint={nodeId,mapId:lastMap};},"checkpoint");
    director.checkpoint.state=director.runtime.state.snapshot();
    saveCurrent();
  }

  function saveCurrent(){
    if(!director||!saveStore)return {ok:false,error:{code:"SAVE_UNAVAILABLE",message:"存档系统不可用"}};
    const state=director.runtime.state.snapshot();
    Object.entries(director.actors||{}).forEach(([actorId,actor])=>{if(actor){const saved=state.actors[actorId]||(state.actors[actorId]={});saved.x=actor.x;saved.y=actor.y;if(actor.downed)saved.status="downed";else if(actor.unconscious)saved.status="unconscious";}});
    const sword=stomachPickups.find(item=>item.id==="ironSword");if(sword)state.worldItems.forest_sword={status:"ground",mapId:lastMap,x:sword.x,y:sword.y};
    return saveStore.save(director.slot,state,{currentNode:state.currentNode,currentMap:lastMap,completed:state.flags&&state.flags.storyCompleted});
  }

  function loadMap(args){
    const id=args.mapId,map=MS[id];if(!map)throw new Error("Unknown story map: "+id);
    const previousMap=lastMap;lastMap=id;setOwnership(map);gateSent=false;exitSent=false;boss=null;bossStakes=[];
    updateState(state=>{if(previousMap&&previousMap!==id)Object.keys(state.actors||{}).forEach(actorId=>{const actor=state.actors[actorId];if(actor.status==="unconscious"&&actor.location===previousMap&&!String(previousMap).includes("camp")){actor.status="dead";actor.location=null;}});if(map.chapter&&state.chapter!==map.chapter){state.chapter=map.chapter;state.counters.chapterBeansEaten=0;state.counters.chapterBeansSpit=0;state.flags.chapter1HungerSeen=false;state.flags.chapter1HungerPending=false;}state.currentMap=id;},"map_selected");
    playMode="story";storyStage=id===TM?0:id===WM?5:8;reset(true);buildFromLevel(levelFromMap(map));
    groundBeans.length=0;(map.beans||[]).forEach(point=>groundBeans.push({x:point[0],y:point[1]}));
    enemies.length=0;npcs.length=0;director.actors={};director.items={};
    const spawn=(args.entry&&map.entryPoints&&map.entryPoints[args.entry])||map.spawn;
    snake.fx=spawn.x;snake.fy=spawn.y;dir=spawn.dir;
    if(typeof root.restoreStomachInventory==="function")root.restoreStomachInventory(snapshot().inventory);
    snake.len=Math.max(CFG.initLen,Number(snapshot().player.bodyLength)||CFG.initLen,CFG.minLen+(typeof stomach!=="undefined"?stomach.getLengthContribution():0));
    coilPath();computeSegs();computeEnclosure();
    const rules=map.rules||{};curBeanTarget=Number(rules.beanTarget)||0;beanT=Number(rules.beanRespawn)||CFG.beanRespawn;
    for(let i=0;i<(Number(rules.initialRandomBeans)||0);i++)spawnBean();
    (map.enemySpawns||[]).forEach(enemyAt);
    (map.items||[]).forEach(spec=>{const storyId=spec.storyId||spec.id,saved=snapshot().worldItems&&snapshot().worldItems[storyId];if(saved&&saved.status==="stomach")return;const item={storyId,id:spec.id,x:saved&&saved.status==="ground"?saved.x:spec.x,y:saved&&saved.status==="ground"?saved.y:spec.y,interactive:saved&&saved.status==="ground"?false:!!spec.interactive,inside:false};stomachPickups.push(item);director.items[item.storyId]=item;});
    (map.npcs||[]).forEach(spec=>{
      const actorId=spec.id||spec.kind,type=NPC_TYPES[spec.kind],actor=snapshot().actors[actorId];
      if(!type||actor&&["dead","eaten","swallowed","bones","left"].includes(actor.status))return;
      const status=actor&&actor.status||"unknown",inactive=status==="unconscious",downed=status==="downed";
      const npc={storyId:actorId,actorId,kind:spec.kind,x:Number.isFinite(actor&&actor.x)?actor.x:spec.x,y:Number.isFinite(actor&&actor.y)?actor.y:spec.y,r:type.r,hp:downed?0:type.hp,maxHp:type.hp,flash:0,inside:false,crying:false,unconscious:inactive,downed,damageable:inactive||downed?false:spec.damageable!==false,interactable:inactive?false:spec.interactable!==false,speed:Number(spec.speed)||0,patrol:inactive||downed?null:spec.patrol||null,patrolIndex:0};
      npcs.push(npc);director.actors[actorId]=npc;if(actorId==="keti")director.keti=npc;
      updateState(state=>{StateApi.ensureActor(state,actorId,{status:status==="unknown"?"alive":status,location:id,x:npc.x,y:npc.y});},actorId+"_spawn");
    });
    observedEnemies=enemies.length;gameState="play";paused=false;freeze=false;firing=false;fireKey=false;
    heldKeys.clear();dirQueue.length=0;moveLock=false;
    document.getElementById("overlay").classList.remove("show");
    document.getElementById("tut").classList.remove("show");
    document.getElementById("ovBtns").style.display="";
    document.getElementById("pickList").innerHTML="";
    ensurePrimarySpawnSafe();
    emit("MAP_LOADED",{mapId:id,spawnId:args.entry||null,clearForwardSeconds:3});
    banner(id===TM?"序章 · 教学地图：用 ["+movementHint()+"] 沿走廊前进":id===WM?"地图 2 · 荒野：寻找哭声":"第一章 · 森林：自由探索");
    rememberCheckpoint(args.checkpoint||(id===TM?"prologue_start":id===WM?"wilderness_start":"chapter1_start"));
  }

  function dialogue(args){
    const data=Dialogue.normalize(args),pages=data.pages.map(withHints);
    const continuing=panelOpen;let pageIndex=0;
    panelOpen=true;freeze=true;heldKeys.clear();fireKey=false;dirQueue.length=0;panelNpc=null;npcNode=null;
    if(typeof root.armPanelInputGate==="function")root.armPanelInputGate();
    const panel=ensurePanel(),say=document.getElementById("npcSay"),options=document.getElementById("npcOpts");
    panel.style.display="flex";
    document.getElementById("npcName").textContent=data.speaker||"我";
    document.getElementById("npcSub").textContent=data.sub||"序章";
    drawPortraitInto(document.getElementById("npcPortrait"),data.portrait||"snake_self",!!data.crying);
    if(!continuing&&typeof root.resetPanelDialogue==="function")root.resetPanelDialogue();

    const render=()=>{
      if(typeof root.armPanelInputGate==="function")root.armPanelInputGate();
      if(typeof root.appendPanelDialogue==="function")root.appendPanelDialogue(pages[pageIndex]);else say.textContent=pages[pageIndex];
      options.innerHTML="";say.onclick=null;
      if(pageIndex<pages.length-1){
        const next=document.createElement("button");next.className="npc-opt";next.textContent="继续 "+hint("interact");
        const advance=()=>{pageIndex++;render();};
        next.onclick=advance;say.onclick=advance;options.appendChild(next);
      }else{
        const choices=director.runtime.getChoices();
        (choices.length?choices:[{id:"continue",label:"继续"}]).forEach(choice=>{
          const button=document.createElement("button");
          button.className="npc-opt"+(choice.danger?" red":"");button.textContent=withHints(choice.label)+" "+hint("interact");
          button.onclick=()=>{const next=director.runtime.graph[choice.next],keepsTranscript=!!(next&&next.onEnter&&next.onEnter.name==="dialog");if(!keepsTranscript)closeDialogue();director.runtime.choose(choice.id);};
          options.appendChild(button);
        });
      }
      trackPanelOpts(options);
    };
    render();requestAnimationFrame(()=>panel.classList.add("open"));
  }

  function nameInput(args){
    panelOpen=true;freeze=true;heldKeys.clear();fireKey=false;dirQueue.length=0;
    if(typeof root.armPanelInputGate==="function")root.armPanelInputGate();
    const panel=ensurePanel();panel.style.display="flex";
    document.getElementById("npcName").textContent="我";
    document.getElementById("npcSub").textContent="序章 · 输入名字";
    drawPortraitInto(document.getElementById("npcPortrait"),"snake_self",false);
    document.getElementById("npcSay").innerHTML="这段旅程，应该怎么称呼你？<br><input id='storyNameInput' maxlength='16' style='margin-top:12px;width:220px;padding:8px;background:#10111e;color:#ffe9b3;border:1px solid #ffd76e;border-radius:6px;font:14px Consolas'><button id='storyNameConfirm' class='npc-opt'>确定</button>";
    const input=document.getElementById("storyNameInput"),button=document.getElementById("storyNameConfirm");
    const done=()=>{
      const name=(input.value||"").trim()||"未命名";
      updateState(state=>{state.player.name=name;},"name_input");
      closeDialogue();banner("名字已记住："+name);director.runtime.follow(args.next);
    };
    button.onclick=done;input.onkeydown=event=>{if(event.key==="Enter")done();};
    panelOpts=[button];panelSel=0;requestAnimationFrame(()=>{panel.classList.add("open");input.focus();});
  }

  function eatKeti(){const npc=director&&director.keti;if(npc&&npcs.includes(npc))root.eatNPC(npc);}
  function eatCorpse(){
    const added=typeof root.addStomachItem==="function"?root.addStomachItem("ketiCorpse",1,"keti_corpse_eaten"):null;
    updateState(state=>{state.actors.keti.status="eaten";state.actors.keti.corpsePresent=false;state.player.bodyLength=snake.len;},"keti_corpse_eaten");
    saveCurrent();emit("ACTOR_EATEN",{actorId:"keti",corpse:true,itemAdded:!!(added&&added.added)});
  }
  function spawnSlimes(){director.spawned=true;enemies.length=0;enemyAt({type:"slime",x:54.5,y:21.5});enemyAt({type:"slime",x:54.5,y:27.5});observedEnemies=enemies.length;}
  function freeExplore(){closeDialogue();banner("自由探索：30 秒后会出现记忆模糊");director.runtime.startTimer("free_explore_memory",30);}
  function memoryBlur(){
    snake.len=typeof minBodyLength==="function"?minBodyLength():CFG.minLen;
    updateState(state=>{state.flags.memoryBlurSeen=true;state.player.bodyLength=snake.len;},"memory_blur");computeSegs();
  }
  function storyEnd(args){
    updateState(state=>{state.flags.storyCompleted=true;},"story_complete");saveCurrent();
    closeDialogue();gameState="victory";victoryRetry="story";
    document.getElementById("ovTitle").textContent=args.title||"剧情完成";
    document.getElementById("ovText").textContent=args.text||"";
    document.getElementById("ovBtn").textContent="重新开始序章";
    document.getElementById("ovBtn2").textContent="回到首页";document.getElementById("ovBtn2").style.display="";
    document.getElementById("ovBtn3").style.display="none";document.getElementById("ovBtn4").style.display="none";
    document.getElementById("ovBtn5").style.display="none";document.getElementById("ovBtn7").style.display="none";
    document.getElementById("overlay").classList.add("show");
  }

  function wallWait(){
    closeDialogue();
    if(count("tutorialBeansEaten")>=5&&gateSent){director.runtime.follow("dialogue_3");return;}
    director.runtime.waitFor({events:[eventType("PLAYER_BEAN_EATEN"),eventType("FRAGILE_GATE_BROKEN")],predicate:()=>count("tutorialBeansEaten")>=5&&gateSent,target:"dialogue_3"});
  }
  function exitWait(){
    closeDialogue();
    if(exitTimeoutHandle)clearTimeout(exitTimeoutHandle);
    exitTimeoutPending=false;
    exitTimeoutHandle=setTimeout(()=>{exitTimeoutHandle=null;exitTimeoutPending=true;},30000);
    director.runtime.waitFor({events:[eventType("MAP_EXIT_ENTERED")],target:"wilderness_start"});
  }
  function chapterExplore(){
    closeDialogue();
    if(snapshot().flags.chapter1HungerPending&&!snapshot().flags.chapter1HungerSeen){director.runtime.follow("chapter1_hunger");return;}
    director.runtime.waitFor({events:[eventType("CHAPTER1_HUNGER_READY"),eventType("ITEM_INTERACTED"),eventType("ACTOR_INTERACTED")],target:event=>{
      if(event.type===eventType("CHAPTER1_HUNGER_READY"))return"chapter1_hunger";
      if(event.type===eventType("ITEM_INTERACTED"))return"chapter1_sword";
      const state=snapshot(),ajie=state.actors.ajie.status==="alive",lisi=state.actors.lisi.status==="alive";
      if(state.flags.chapter1SwordRecognizedPending){updateState(next=>{next.flags.chapter1SwordRecognizedPending=false;},"chapter1_sword_notice_consumed");return ajie&&lisi?"chapter1_sword_recognized":ajie?"chapter1_sword_recognized_ajie":lisi?"chapter1_sword_recognized_lisi":"chapter1_explore";}
      return ajie&&lisi?"chapter1_meeting":lisi?"chapter1_lisi_only":ajie?"chapter1_ajie_only":"chapter1_explore";
    }});
  }
  function takeSword(){const item=director.items.forest_sword;if(item&&root.collectStoryItem(item)){updateState(state=>{state.flags.chapter1SwordTaken=true;state.worldItems.forest_sword={status:"stomach",mapId:lastMap};},"chapter1_sword_taken");}}
  function swallowActor(actorId){const actor=director.actors[actorId];if(actor&&root.swallowStoryNPC(actor))director.actors[actorId]=null;}
  function releaseActor(actorId){const actor=snapshot().actors[actorId]||{};if(root.releaseStoryActor(actorId,actor.x,actor.y))director.actors[actorId]=npcs.find(n=>targetId(n)===actorId)||null;}
  function dropSword(){const item=root.dropStoryItem("ironSword");if(item)updateState(state=>{state.worldItems.forest_sword={status:"ground",mapId:lastMap,x:item.x,y:item.y};state.flags.chapter1SwordRecognizedPending=false;},"chapter1_sword_dropped");}
  function startAjieCombat(){const actor=director.actors.ajie;if(actor){actor.hostile=true;actor.damageable=true;actor.interactable=false;actor.attackTarget="body";actor.bodyHits=0;actor.attackPhase=null;actor.chaseElapsed=0;}}
  function waitAjieCombat(){closeDialogue();director.runtime.waitFor({events:[eventType("AJIE_DOWNED"),eventType("AJIE_LEFT")],target:event=>event.type===eventType("AJIE_DOWNED")?"chapter1_ajie_downed_wait":"chapter1_explore"});}
  function waitDownedInteraction(){closeDialogue();director.runtime.waitFor({events:[eventType("ACTOR_INTERACTED")],predicate:event=>event.payload&&event.payload.actorId==="ajie",target:"chapter1_ajie_downed"});}

  const conditions={
    tutorialBeans3:()=>count("tutorialBeansEaten")>=3,
    tutorialSpit3:()=>count("tutorialBeansSpit")>=3,
    ketiEvent:event=>event.payload&&event.payload.actorId==="keti",
    enemiesCleared:()=>director.spawned&&enemies.length===0,
    freeExploreTimer:event=>event.payload&&event.payload.id==="free_explore_memory"
  };
  const targetResolvers={
    ketiFirstContact:event=>event.type===eventType("ACTOR_INTERACTED")?"keti_question":event.type===eventType("ACTOR_EATEN")?"eaten_slimes":"keti_dead",
    ketiOutcome:()=>snapshot().actors.keti.status==="alive"?"keti_saved":"keti_dead"
  };
  const choiceActions={waitForWall:wallWait,waitForExit:exitWait,takeSword,swallowAjie:()=>swallowActor("ajie"),swallowLisi:()=>swallowActor("lisi"),releaseAjie:()=>releaseActor("ajie"),releaseLisi:()=>releaseActor("lisi"),dropSword,startAjieCombat};

  const hasItem=(state,id)=>!!(state.inventory&&state.inventory.slots||[]).find(slot=>slot.id===id&&slot.count>0);
  const choiceConditions={hasSword:state=>hasItem(state,"ironSword"),hasAjie:state=>hasItem(state,"ajie"),hasLisi:state=>hasItem(state,"lisi"),ajieAlive:state=>state.actors.ajie.status==="alive",lisiAlive:state=>state.actors.lisi.status==="alive"};
  function compileChoice(choice){const compiled=Object.assign({},choice);if(typeof choice.when==="string"){compiled.when=choiceConditions[choice.when];if(typeof compiled.when!=="function")throw new Error("Unknown story choice condition: "+choice.when);}if(choice.action){compiled.run=choiceActions[choice.action];if(typeof compiled.run!=="function")throw new Error("Unknown story choice action: "+choice.action);delete compiled.action;}return compiled;}
  function compileNode(node){
    const compiled={id:node.id,goal:node.goal,progress:node.progress};
    if(node.dialogue){const args=Object.assign({},node.dialogue,{choices:(node.dialogue.choices||[]).map(compileChoice)});compiled.onEnter={name:"dialog",args};}
    else if(node.enter)compiled.onEnter={name:node.enter.action,args:node.enter};
    if(node.next)compiled.auto=node.next;
    if(node.wait){compiled.wait={events:node.wait.events.map(eventType),target:node.wait.target};if(node.wait.condition)compiled.wait.predicate=conditions[node.wait.condition];if(node.wait.targetResolver)compiled.wait.target=targetResolvers[node.wait.targetResolver];}
    return compiled;
  }
  function compileGraph(nodes){const graph={};Object.keys(nodes).forEach(id=>{graph[id]=compileNode(nodes[id]);});return graph;}

  function routeInteraction(kind,target,payload){
    if(!director||!storyActive||playMode!=="story"||!owns(kind,target))return false;
    if(kind==="actor"){
      target.inside=true;
      if(currentNode()==="wilderness_keti_wait"){
        director.keti=target;updateState(state=>{state.actors.keti.met=true;},"keti_met");emit("ACTOR_INTERACTED",{actorId:targetId(target)});
      }
      else if(currentNode()==="chapter1_explore")emit("ACTOR_INTERACTED",{actorId:targetId(target)});
      else if(currentNode()==="chapter1_ajie_downed_wait")emit("ACTOR_INTERACTED",{actorId:targetId(target)});
      return true;
    }
    if(kind==="item"){
      target.inside=true;
      if(currentNode()==="chapter1_explore")emit("ITEM_INTERACTED",{itemId:targetId(target)});
      return true;
    }
    if(payload&&typeof payload.apply==="function")payload.apply();
    return true;
  }

  function engineEvent(name,payload){
    if(!director||!storyActive||playMode!=="story")return;
    if(name==="beanEaten"){
      updateState(state=>{state.counters.tutorialBeansEaten++;if(state.chapter==="chapter1")state.counters.chapterBeansEaten++;state.player.bodyLength=snake.len;},"bean_eaten");emit("PLAYER_BEAN_EATEN",{count:count("tutorialBeansEaten")});
    }else if(name==="beanSpit"){
      updateState(state=>{state.counters.tutorialBeansSpit++;if(state.chapter==="chapter1")state.counters.chapterBeansSpit++;state.player.bodyLength=snake.len;},"bean_spit");emit("PLAYER_BEAN_SPIT",{count:count("tutorialBeansSpit")});
    }else if(name==="actorDied"||name==="actorEaten"){
      const actor=payload&&payload.actor;if(!actor||!owns("actor",actor))return;
      const eaten=name==="actorEaten",actorId=targetId(actor);
      updateState(state=>{StateApi.ensureActor(state,actorId,{status:eaten?(actorId==="keti"?"eaten":"swallowed"):"dead",location:eaten?"stomach":lastMap,corpsePresent:!eaten});},eaten?actorId+"_eaten":actorId+"_dead");emit(eaten?"ACTOR_EATEN":"ACTOR_DIED",{actorId});
    }else if(name==="actorReleased"){
      const actorId=payload&&payload.actorId;if(!actorId)return;
      updateState(state=>{StateApi.ensureActor(state,actorId,{status:"unconscious",location:lastMap,x:payload.x,y:payload.y});},actorId+"_released");
      if(actorId==="lisi"&&director.actors.ajie&&director.actors.ajie.hostile){director.actors.ajie.hostile=false;director.actors.ajie.damageable=false;director.actors.ajie.interactable=false;director.actors.ajie.resting=6;director.runtime.follow("chapter1_lisi_released");}
    }else if(name==="actorDowned"){
      const actorId=payload&&payload.actorId;if(!actorId)return;
      updateState(state=>{StateApi.ensureActor(state,actorId,{status:"downed",location:lastMap});},actorId+"_downed");emit("AJIE_DOWNED",{actorId});
    }else if(name==="actorLeft"){
      const actorId=payload&&payload.actorId;if(!actorId)return;
      updateState(state=>{StateApi.ensureActor(state,actorId,{status:"left",location:null});},actorId+"_left");emit("AJIE_LEFT",{actorId});
    }else if(name==="worldItemDropped"){
      if(payload&&payload.id==="ironSword"){
        const noticed=Object.values(director.actors||{}).some(actor=>actor&&!actor.unconscious&&!actor.hostile&&Math.hypot(actor.x-payload.x,actor.y-payload.y)<=2);
        updateState(state=>{state.worldItems.forest_sword={status:"ground",mapId:lastMap,x:payload.x,y:payload.y};if(noticed)state.flags.chapter1SwordRecognizedPending=true;},"chapter1_sword_ground");
      }
    }else if(name==="ajieBodyLearned"){
      if(currentNode()==="chapter1_combat_pending")director.runtime.follow("chapter1_ajie_body_learned");
    }else if(name==="inventoryChanged"){
      updateState(state=>{state.inventory=payload.inventory;state.player.bodyLength=payload.bodyLength||snake.len;if((payload.inventory.slots||[]).some(slot=>slot.id==="ironSword"&&slot.count>0))state.worldItems.forest_sword={status:"stomach",mapId:lastMap};},payload.reason||"inventory_changed");saveCurrent();
    }
    const state=snapshot();
    if(state&&state.chapter==="chapter1"&&!state.flags.chapter1HungerSeen&&!state.flags.chapter1HungerPending&&(state.counters.chapterBeansEaten>=10||state.counters.chapterBeansSpit>=10)){
      updateState(next=>{next.flags.chapter1HungerPending=true;},"chapter1_hunger_pending");emit("CHAPTER1_HUNGER_READY",{});
    }
  }

  function update(){
    if(!director||!storyActive||playMode!=="story")return;
    const node=director.runtime.node,progress=node&&node.progress;storyStage=progress?Math.max(0,progress.step-1):storyStage;
    if(lastMap===TM&&MECHS.some(mechanic=>mechanic.kind==="gate"&&mechanic.done)&&!gateSent){gateSent=true;updateState(state=>{state.flags.tutorialGateBroken=true;state.flags.tutorialExitUnlocked=true;state.counters.tutorialGateSpit=3;},"gate_broken");emit("FRAGILE_GATE_BROKEN",{gateId:"tutorial_fragile_gate"});}
    const exit=MS[TM]&&MS[TM].exits&&MS[TM].exits[0];
    if(lastMap===TM&&!exitSent&&gateSent&&exit&&snake.fx>=exit.rect[0]&&snake.fx<=exit.rect[0]+exit.rect[2]&&snake.fy>=exit.rect[1]&&snake.fy<=exit.rect[1]+exit.rect[3])routeInteraction("exit",exit,{type:"enter",apply:()=>{exitSent=true;if(exitTimeoutHandle)clearTimeout(exitTimeoutHandle);exitTimeoutHandle=null;exitTimeoutPending=false;emit("MAP_EXIT_ENTERED",{id:exit.id,mapId:TM,targetMap:exit.targetMap});}});
    if(exitTimeoutPending&&currentNode()==="dialogue_3"){
      exitTimeoutPending=false;
      updateState(state=>{state.flags.tutorialTimeoutSeen=true;},"tutorial_timeout");
      director.runtime.follow("dialogue_4");
    }
    if(observedEnemies>0&&enemies.length===0)emit("ENEMIES_DEFEATED",{remaining:0,total:kills});
    observedEnemies=enemies.length;
  }

  function goalText(){const goal=director&&director.runtime.node&&director.runtime.node.goal;if(!goal)return"按剧情继续";const suffix=goal.inputHint?" "+(goal.inputHint==="move"?"["+movementHint()+"]":hint(goal.inputHint)):"";if(goal.kind==="counter")return goal.label+" "+Math.min(goal.target,count(goal.counter))+"/"+goal.target+suffix;return (goal.text||"按剧情继续")+suffix;}
  function progressText(){const progress=director&&director.runtime.node&&director.runtime.node.progress;return progress?progress.chapter+" "+progress.step+"/"+progress.total:"剧情模式";}

  function createDirector(state,slot){
    return {slot,spawned:false,keti:null,actors:{},items:{},checkpoint:null,runtime:new RuntimeApi.StoryRuntime({graph:compileGraph(Story.nodes),state,bus:B,adapters:{loadMap,dialog:dialogue,banner:args=>banner(args.text),eatKeti,eatCorpse,spawnSlimes,freeExplore,memoryBlur,nameInput,storyEnd,chapterExplore,waitAjieCombat,waitDownedInteraction}})};
  }

  function start(slot){
    stop();storyActive=true;storyStage=0;storyTransitioning=false;playMode="story";
    const state=new StateApi.StoryStateStore();state.reset("new_story");
    director=createDirector(state,Number(slot)||1);
    director.runtime.start(Story.start);
    return {ok:true,slot:director.slot};
  }
  function resume(slot){
    if(!saveStore)return {ok:false,error:{code:"SAVE_UNAVAILABLE",message:"存档系统不可用"}};
    const loaded=saveStore.load(slot);if(!loaded.ok)return loaded;if(loaded.empty)return start(slot);
    stop();storyActive=true;storyStage=0;storyTransitioning=false;playMode="story";
    const state=new StateApi.StoryStateStore(loaded.data),checkpoint=loaded.data.checkpoint;
    director=createDirector(state,Number(slot)||1);
    const nodeId=checkpoint&&checkpoint.nodeId||(loaded.data.currentMap===WM?"wilderness_start":Story.start);
    director.runtime.start(nodeId);
    return {ok:true,slot:director.slot,resumed:true,legacy:!!loaded.legacy};
  }
  function retry(){if(!director){start(1);return;}if(!director.checkpoint){start(director.slot);return;}const checkpoint=JSON.parse(JSON.stringify(director.checkpoint));director.runtime.stop();director.runtime.state.replace(checkpoint.state,"checkpoint_restore");director.runtime.start(checkpoint.nodeId);}
  function stop(){if(director)director.runtime.stop();if(exitTimeoutHandle)clearTimeout(exitTimeoutHandle);exitTimeoutHandle=null;exitTimeoutPending=false;director=null;ownership={actors:new Set(),mechanics:new Set(),exits:new Set(),items:new Set()};boss=null;bossStakes=[];storyActive=false;storyStage=-1;lastMap=null;observedEnemies=0;}

  root.IMS_STORY_API={start,resume,retry,stop,save:saveCurrent,listSaves:()=>saveStore?saveStore.list():[],deleteSave:slot=>saveStore?saveStore.delete(slot):{ok:false},currentSlot:()=>director&&director.slot,tick:update,goalText,progressText,routeInteraction,owns,engineEvent,director:()=>director};
  root.storyControllerInteraction=routeInteraction;
  root.storyControllerOwns=owns;
  root.storyControllerInteract=target=>routeInteraction("actor",target);
  root.storyControllerTick=update;
  root.storyDirector=()=>director;
})(typeof window!=="undefined"?window:globalThis);
