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

  let director=null,lastMap=null,gateSent=false,exitSent=false,observedEnemies=0,campInside=false;
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
  const withHints=text=>String(text||"").replace(/\{fire\}/g,hint("fire")).replace(/\{interact\}/g,hint("interact")).replace(/\{node\}/g,hint("node")).replace(/\{move\}/g,"["+movementHint()+"]");

  function closeDialogue(){
    if(typeof root.closePanel==="function")root.closePanel();
    if(typeof root.clearDialogueFocus==="function")root.clearDialogueFocus();
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
    const flags=snapshot()&&snapshot().flags||{};
    return {
      cols:map.cols,rows:map.rows,cleanMap:!!map.cleanMap,solidOutside:map.solidOutside||null,obstacles:map.obstacles||[],terrain:map.terrain||[],
      mechs:(map.gates||[]).filter(g=>!g.openFlag||!flags[g.openFlag]).map(g=>({kind:"gate",id:g.id,x:g.x,y:g.y,w:g.w,h:g.h,need:g.need||3,reward:null})).concat((map.mechs||[]).filter(m=>!m.doneFlag||!flags[m.doneFlag])),
      waves:[],caps:{slime:0,rat:0,flower:0},beans:0,npcs:[]
    };
  }

  function enemyAt(spec){
    const type=ENEMY_TYPES[spec.type];if(!type)return;
    const enemy={type:spec.type,storyId:spec.storyId||null,x:spec.x,y:spec.y,flash:0,hitT:0,hp:Number.isFinite(spec.hp)?spec.hp:type.hp,max:type.hp,r:type.r,vx:0,vy:0,wanderT:0,squash:rnd(6),approachTarget:spec.approachTarget||null,approachDone:!!spec.approachDone};
    if(type.kind==="ranged"){enemy.shootT=type.cadence;enemy.warned=false;}
    enemies.push(enemy);return enemy;
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
    const state=director.runtime.state.snapshot();state.player.nodeCharges=charges;
    Object.entries(director.actors||{}).forEach(([actorId,actor])=>{if(actor){const saved=state.actors[actorId]||(state.actors[actorId]={});saved.x=actor.x;saved.y=actor.y;saved.hp=actor.hp;if(actor.critical)saved.status="critical";else if(actor.downed)saved.status="downed";else if(actor.unconscious&&!String(saved.status).startsWith("bound_"))saved.status="unconscious";}});
    if(lastMap===Maps.TYPES.CHAPTER1_CAVE&&state.flags.goblinFightStarted&&!state.flags.goblinsDefeated){state.encounters.caveGoblins=enemies.filter(enemy=>enemy.storyId&&enemy.storyId.startsWith("cave_goblin_")).map(enemy=>({storyId:enemy.storyId,type:enemy.type,x:enemy.x,y:enemy.y,hp:enemy.hp,approachTarget:enemy.approachTarget,approachDone:enemy.approachDone}));}
    const sword=stomachPickups.find(item=>item.id==="ironSword");if(sword)state.worldItems.forest_sword={status:"ground",mapId:lastMap,x:sword.x,y:sword.y};
    director.runtime.state.replace(state,"world_snapshot");
    return saveStore.save(director.slot,state,{currentNode:state.currentNode,currentMap:lastMap,completed:state.flags&&state.flags.storyCompleted});
  }

  function loadMap(args){
    const id=args.mapId,map=MS[id];if(!map)throw new Error("Unknown story map: "+id);
    const previousMap=lastMap;lastMap=id;setOwnership(map);gateSent=false;exitSent=false;campInside=false;boss=null;bossStakes=[];
    updateState(state=>{if(previousMap&&previousMap!==id)Object.keys(state.actors||{}).forEach(actorId=>{const actor=state.actors[actorId];if(actorId!=="ajian"&&actor.status==="unconscious"&&actor.location===previousMap&&!String(previousMap).includes("camp")){actor.status="dead";actor.location=null;}if(actor.status==="riding")actor.location=id;});if(map.chapter&&state.chapter!==map.chapter){state.chapter=map.chapter;state.counters.chapterBeansEaten=0;state.counters.chapterBeansSpit=0;state.flags.chapter1HungerSeen=false;state.flags.chapter1HungerPending=false;}state.currentMap=id;},"map_selected");
    if(previousMap===Maps.TYPES.CHAPTER1_CAVE&&id===Maps.TYPES.CHAPTER1_FOREST)updateState(state=>{
      [["ajie",71.5,45.5],["lisi",74.5,45.5]].forEach(([actorId,x,y])=>{const actor=state.actors[actorId];if(actor&&!['dead','eaten','swallowed','bones','left'].includes(actor.status)){actor.status="alive";actor.location=id;actor.x=x;actor.y=y;}});
    },"party_returned_to_camp");
    playMode="story";storyStage=id===TM?0:id===WM?5:8;if(typeof root.setWorldSize==="function")root.setWorldSize(map.cols,map.rows);reset(true);buildFromLevel(levelFromMap(map));
    charges=snapshot().flags.chapter1RingTaken?Math.max(0,Math.min(CFG.nodeMax,Number(snapshot().player.nodeCharges)||0)):0;
    groundBeans.length=0;(map.beans||[]).forEach(point=>groundBeans.push({x:point[0],y:point[1]}));
    enemies.length=0;npcs.length=0;director.actors={};director.items={};
    const spawn=(args.entry&&map.entryPoints&&map.entryPoints[args.entry])||map.spawn;
    snake.fx=spawn.x;snake.fy=spawn.y;dir=spawn.dir;
    if(typeof root.restoreStomachInventory==="function")root.restoreStomachInventory(snapshot().inventory);
    if(snapshot().player.rider&&typeof root.restoreStoryRider==="function")root.restoreStoryRider(snapshot().player.rider);
    snake.len=Math.max(CFG.initLen,Number(snapshot().player.bodyLength)||CFG.initLen,CFG.minLen+(typeof stomach!=="undefined"?stomach.getLengthContribution():0));
    coilPath();computeSegs();computeEnclosure();
    const rules=map.rules||{};curBeanTarget=Number(rules.beanTarget)||0;beanT=Number(rules.beanRespawn)||CFG.beanRespawn;
    for(let i=0;i<(Number(rules.initialRandomBeans)||0);i++)spawnBean();
    (map.enemySpawns||[]).forEach(enemyAt);
    if(id===Maps.TYPES.CHAPTER1_CAVE&&snapshot().flags.goblinFightStarted&&!snapshot().flags.goblinsDefeated)spawnGoblinEncounter(true);
    (map.items||[]).forEach(spec=>{const storyId=spec.storyId||spec.id,saved=snapshot().worldItems&&snapshot().worldItems[storyId];if(saved&&["stomach","consumed"].includes(saved.status))return;const item={storyId,id:spec.id,x:saved&&saved.status==="ground"?saved.x:spec.x,y:saved&&saved.status==="ground"?saved.y:spec.y,interactive:saved&&saved.status==="ground"?false:!!spec.interactive,inside:false};stomachPickups.push(item);director.items[item.storyId]=item;});
    (map.npcs||[]).forEach(spec=>{
      const actorId=spec.id||spec.kind,type=NPC_TYPES[spec.kind],actor=snapshot().actors[actorId];
      if(!type||actor&&["dead","eaten","swallowed","riding","bones","left"].includes(actor.status))return;
      const status=actor&&actor.status!=="unknown"?actor.status:(spec.initialStatus||"alive"),inactive=["unconscious","bound_unconscious","critical"].includes(status),downed=status==="downed",camped=id===Maps.TYPES.CHAPTER1_FOREST&&["ajie","lisi"].includes(actorId)&&actor&&actor.x>=68&&actor.y>=41;
      const npc={storyId:actorId,actorId,kind:spec.kind,x:Number.isFinite(actor&&actor.x)?actor.x:spec.x,y:Number.isFinite(actor&&actor.y)?actor.y:spec.y,r:type.r,hp:Number.isFinite(actor&&actor.hp)?actor.hp:(downed?0:type.hp),maxHp:type.hp,flash:0,inside:false,crying:false,bandit:!!spec.bandit,unconscious:inactive,critical:status==="critical",bound:String(status).startsWith("bound_"),storyProtected:!!spec.storyProtected,damageable:inactive||downed?false:spec.damageable!==false,interactable:inactive&&!spec.interactiveWhenUnconscious?false:spec.interactable!==false,speed:camped?0:Number(spec.speed)||0,patrol:inactive||downed||camped?null:spec.patrol||null,patrolIndex:0};
      npcs.push(npc);director.actors[actorId]=npc;if(actorId==="keti")director.keti=npc;
      updateState(state=>{StateApi.ensureActor(state,actorId,{status,location:id,x:npc.x,y:npc.y,hp:npc.hp});},actorId+"_spawn");
    });
    if(id===Maps.TYPES.CHAPTER1_FOREST&&snapshot().flags.banditCombatStarted&&!snapshot().flags.banditResolved)["buck","miro"].forEach(actorId=>{const actor=director.actors[actorId];if(actor&&!actor.downed){actor.hostile=true;actor.damageable=true;actor.interactable=false;actor.attackTarget="body";actor.bodyHits=0;actor.chaseElapsed=0;}});
    if(id===Maps.TYPES.CHAPTER1_CAVE&&snapshot().flags.goblinFightStarted&&!snapshot().flags.goblinsDefeated&&director.actors.ajian){director.actors.ajian.damageable=true;director.actors.ajian.interactable=false;}
    observedEnemies=enemies.length;gameState="play";paused=false;freeze=false;firing=false;fireKey=false;
    heldKeys.clear();dirQueue.length=0;moveLock=false;
    document.getElementById("overlay").classList.remove("show");
    document.getElementById("tut").classList.remove("show");
    document.getElementById("ovBtns").style.display="";
    document.getElementById("pickList").innerHTML="";
    ensurePrimarySpawnSafe();
    emit("MAP_LOADED",{mapId:id,spawnId:args.entry||null,clearForwardSeconds:3});
    banner(id===TM?"序章 · 教学地图：用 ["+movementHint()+"] 沿走廊前进":id===WM?"地图 2 · 荒野：寻找哭声":"第一章 · "+map.name);
    rememberCheckpoint(args.checkpoint||(id===TM?"prologue_start":id===WM?"wilderness_start":"chapter1_start"));
  }

  function dialogue(args){
    const data=Dialogue.normalize(args),pages=data.pages.map(withHints);
    const continuing=panelOpen;let pageIndex=0;
    panelOpen=true;freeze=true;heldKeys.clear();fireKey=false;dirQueue.length=0;panelNpc=null;npcNode=null;
    if(typeof root.armPanelInputGate==="function")root.armPanelInputGate();
    const panel=ensurePanel(),say=document.getElementById("npcSay"),options=document.getElementById("npcOpts");
    panel.style.display="grid";
    document.getElementById("npcName").textContent=displaySpeaker(data.speaker||"我");
    document.getElementById("npcSub").textContent=data.sub||"序章";
    drawPortraitInto(document.getElementById("npcPortrait"),data.portrait||portraitId(data.speaker),!!data.crying);
    if(!continuing&&typeof root.resetPanelDialogue==="function")root.resetPanelDialogue();

    const render=()=>{
      if(typeof root.armPanelInputGate==="function")root.armPanelInputGate();
      const page=speakerPage(pages[pageIndex],data.speaker||"我");
      document.getElementById("npcName").textContent=displaySpeaker(page.speaker);
      drawPortraitInto(document.getElementById("npcPortrait"),portraitId(page.speaker,data.portrait),!!data.crying);
      if(typeof root.focusDialogueActor==="function")root.focusDialogueActor(portraitId(page.speaker));
      if(typeof root.appendPanelDialogue==="function")root.appendPanelDialogue(page.text);else say.textContent=page.text;
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
          button.onclick=()=>{const next=director.runtime.graph[choice.next],keepsTranscript=!!(next&&next.onEnter&&next.onEnter.name==="dialog");if(!keepsTranscript)closeDialogue();director.runtime.choose(choice.id);saveCurrent();};
          options.appendChild(button);
        });
      }
      trackPanelOpts(options);
    };
    render();requestAnimationFrame(()=>panel.classList.add("open"));
  }

  function portraitId(speaker,fallback){return ({"我":"snake_self","玩家":"snake_self","旁白":"snake_self","教学":"snake_self","可蒂":"keti","阿杰":"ajie","丽丝":"lisi","阿见":"ajian","少女":"ajian","巴克":"buck","米罗":"miro"})[speaker]||fallback||"snake_self";}
  function displaySpeaker(speaker){return ["我","玩家"].includes(speaker)?snapshot().player.name||"我":speaker;}
  function speakerPage(text,fallback){const value=String(text||""),match=value.match(/^(可蒂|阿杰|丽丝|阿见|少女|巴克|米罗|旁白|教学|玩家|我)[：:]\s*(.*)$/s);return match?{speaker:match[1],text:match[2]}:{speaker:fallback,text:value};}

  function nameInput(args){
    panelOpen=true;freeze=true;heldKeys.clear();fireKey=false;dirQueue.length=0;
    if(typeof root.armPanelInputGate==="function")root.armPanelInputGate();
    const panel=ensurePanel();panel.style.display="grid";
    document.getElementById("npcName").textContent="我";
    document.getElementById("npcSub").textContent="序章 · 输入名字";
    drawPortraitInto(document.getElementById("npcPortrait"),"snake_self",false);
    document.getElementById("npcSay").innerHTML="这段旅程，应该怎么称呼你？<br><input id='storyNameInput' maxlength='16' style='margin-top:12px;width:220px;padding:8px;background:#10111e;color:#ffe9b3;border:1px solid #ffd76e;border-radius:6px;font:14px Consolas'><button id='storyNameConfirm' class='npc-opt'>确定</button>";
    const input=document.getElementById("storyNameInput"),button=document.getElementById("storyNameConfirm");
    const done=()=>{
      const name=(input.value||"").trim()||"未命名";
      updateState(state=>{state.player.name=name;},"name_input");
      closeDialogue();banner("名字已记住："+name);director.runtime.follow(args.next);saveCurrent();
    };
    button.onclick=done;input.onkeydown=event=>{if(event.key==="Enter")done();};
    panelOpts=[button];panelSel=0;requestAnimationFrame(()=>{panel.classList.add("open");input.focus();});
  }

  function eatKeti(){const npc=director&&director.keti;if(npc&&npcs.includes(npc))root.swallowStoryNPC(npc);}
  function eatCorpse(){
    const added=typeof root.addStomachItem==="function"?root.addStomachItem("ketiCorpse",1,"keti_corpse_eaten"):null;
    updateState(state=>{state.actors.keti.status="eaten";state.actors.keti.corpsePresent=false;state.player.bodyLength=snake.len;},"keti_corpse_eaten");
    saveCurrent();emit("ACTOR_EATEN",{actorId:"keti",corpse:true,itemAdded:!!(added&&added.added)});
  }
  function spawnSlimes(){director.spawned=true;enemies.length=0;enemyAt({type:"slime",x:54.5,y:21.5});enemyAt({type:"slime",x:54.5,y:27.5});observedEnemies=enemies.length;}
  function waitForMemoryBlur(){closeDialogue();banner("继续向前……");director.runtime.startTimer("free_explore_memory",6);}
  function memoryBlur(){
    const state=snapshot(),item=hasItem(state,"keti")?"keti":hasItem(state,"ketiCorpse")?"ketiCorpse":null;
    if(item&&typeof root.startMemoryVomit==="function")root.startMemoryVomit(item);
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
      if(event.type===eventType("ITEM_INTERACTED"))return event.payload&&event.payload.itemId==="cave_ring"?"chapter1_ring":"chapter1_sword";
      const state=snapshot(),actorId=event.payload&&event.payload.actorId,actor=state.actors[actorId]||{};
      if(actorId==="ajian"&&state.flags.campSettlementSeen)return actor.status==="unconscious"?"camp_ajian_unconscious":"camp_ajian_resting";
      if(actorId==="buck"||actorId==="miro"){
        if(state.flags.banditResolved)return actorId==="buck"?"bandit_resolved_buck":"bandit_resolved_miro";
        if(state.flags.banditCombatStarted&&actor.status==="downed"&&state.actors.buck.status==="downed"&&state.actors.miro.status==="downed")return"bandit_search";
        return"bandit_intro";
      }
      if(actor.status==="unconscious"&&actorId==="ajie")return"chapter1_ajie_unconscious";
      if(actor.status==="unconscious"&&actorId==="lisi")return"chapter1_lisi_unconscious";
      const ajie=state.actors.ajie.status==="alive",lisi=state.actors.lisi.status==="alive";
      if(state.flags.findAjianAccepted){banner("任务进行中：寻找阿见");return"chapter1_explore";}
      if(state.flags.chapter1SwordRecognizedPending){updateState(next=>{next.flags.chapter1SwordRecognizedPending=false;},"chapter1_sword_notice_consumed");return ajie&&lisi?"chapter1_sword_recognized":ajie?"chapter1_sword_recognized_ajie":lisi?"chapter1_sword_recognized_lisi":"chapter1_explore";}
      if(state.flags.findAjianDeclined)return ajie?"chapter1_quest_request_ajie":lisi?"chapter1_quest_request":"chapter1_explore";
      if(!state.flags.chapter1MeetingSeen)updateState(next=>{next.flags.chapter1MeetingSeen=true;},"chapter1_meeting_seen");
      return ajie&&lisi?"chapter1_meeting":lisi?"chapter1_lisi_only":ajie?"chapter1_ajie_only":"chapter1_explore";
    }});
  }
  const gold=()=>Math.max(0,Number(snapshot()&&snapshot().player&&snapshot().player.gold)||0);
  function resolveBandit(outcome){updateState(state=>{state.flags.banditResolved=true;state.flags.banditClueKnown=true;state.flags.banditOutcome=outcome||state.flags.banditOutcome||"resolved";},"bandit_resolved");saveCurrent();}
  function payBandits(){if(gold()<3)return false;updateState(state=>{state.player.gold=Math.max(0,(Number(state.player.gold)||0)-3);state.flags.banditResolved=true;state.flags.banditClueKnown=true;state.flags.banditOutcome="paid";},"bandit_paid");saveCurrent();return true;}
  function tradeSword(){if(!root.consumeStoryItem("ironSword"))return false;updateState(state=>{state.flags.banditResolved=true;state.flags.banditClueKnown=true;state.flags.banditOutcome="sword";state.worldItems.forest_sword={status:"consumed",mapId:lastMap};},"bandit_sword_paid");saveCurrent();return true;}
  function claimBanditCombatReward(){const state=snapshot();if(state.flags.banditRewardClaimed)return;updateState(next=>{next.player.gold=(Number(next.player.gold)||0)+6;next.flags.banditRewardClaimed=true;next.flags.banditResolved=true;next.flags.banditClueKnown=true;next.flags.banditOutcome="combat";},"bandit_combat_reward");saveCurrent();}
  function reverseBanditRobbery(){const state=snapshot();if(!state.flags.banditRewardClaimed){updateState(next=>{next.player.gold=(Number(next.player.gold)||0)+6;next.flags.banditRewardClaimed=true;next.flags.banditResolved=true;next.flags.banditClueKnown=true;next.flags.banditOutcome="robbed";},"bandit_reverse_robbery");}else resolveBandit("robbed");saveCurrent();}
  function swallowBandit(actorId){const actor=director.actors[actorId];if(actor&&root.swallowStoryNPC(actor)){director.actors[actorId]=null;updateState(state=>{StateApi.ensureActor(state,actorId,{status:"swallowed",location:"stomach"});state.flags.banditClueKnown=true;},"bandit_swallowed");}}
  function releaseBandit(actorId){const actor=snapshot().actors[actorId]||{};if(root.releaseStoryActor(actorId,actor.x,actor.y,actor.hp))updateState(state=>{StateApi.ensureActor(state,actorId,{status:"unconscious",location:lastMap});},"bandit_released");}
  function resolveBanditThreat(){resolveBandit("threat");}
  function startBanditCombat(){const state=snapshot();updateState(next=>{next.flags.banditCombatStarted=true;},"bandit_combat_started");["buck","miro"].forEach(id=>{const actor=director.actors[id];if(actor&&actor.hp>0){actor.hostile=true;actor.damageable=true;actor.interactable=false;actor.attackTarget="body";actor.bodyHits=0;actor.attackPhase=null;actor.chaseElapsed=0;}});}
  function waitBanditCombat(){closeDialogue();const neutralized=()=>["buck","miro"].every(id=>["downed","swallowed"].includes(snapshot().actors[id].status));if(neutralized()){director.runtime.follow("bandit_search");return;}director.runtime.waitFor({events:[eventType("BANDIT_DOWNED")],predicate:neutralized,target:"bandit_search"});}
  function settleAjian(){const before=snapshot();if(before.flags.campSettlementSeen)return before.flags.campArrivalMethod||"rider";const carried=hasItem(before,"ajian"),arrival=carried||before.actors.ajian.status==="unconscious"?"stomach":"rider";if(carried)root.consumeStoryItem("ajian");updateState(state=>{state.flags.campSettlementSeen=true;state.flags.campArrivalMethod=arrival;state.flags.findAjianAccepted=false;state.quests.findAjian={status:"completed",title:"把阿见带到河边营地",priority:10};state.player.rider=null;StateApi.ensureActor(state,"ajian",{status:arrival==="stomach"?"unconscious":"alive",location:lastMap,x:73,y:47});},"ajian_camp_settled");director.actors.ajian=root.placeStoryActor?root.placeStoryActor("ajian",73,47,arrival==="stomach"):director.actors.ajian;rider=null;saveCurrent();return arrival;}
  function claimCampReward(){const state=snapshot();if(state.flags.campRewardClaimed)return;settleAjian();updateState(next=>{next.player.gold=(Number(next.player.gold)||0)+10;next.flags.campRewardClaimed=true;next.flags.campRewardKind="gold";},"camp_reward");saveCurrent();}
  function claimCampLick(){if(snapshot().flags.campRewardClaimed)return;updateState(state=>{state.flags.campRewardClaimed=true;state.flags.campRewardKind="lick";},"camp_lick_reward");saveCurrent();}
  function claimCampEat(actorId){if(snapshot().flags.campRewardClaimed)return;swallowActor(actorId);updateState(state=>{state.flags.campRewardClaimed=true;state.flags.campRewardKind="eat";state.flags.campRewardActor=actorId;},"camp_eat_reward");saveCurrent();}
  function caveExplore(){
    closeDialogue();
    director.runtime.waitFor({events:[eventType("ITEM_INTERACTED"),eventType("ACTOR_INTERACTED")],target:event=>{
      if(event.type===eventType("ITEM_INTERACTED")){
        const id=event.payload&&event.payload.itemId;
        if(id==="cave_soup")return snapshot().flags.caveSoupDrunk?"cave_soup_empty":"cave_soup";
        if(id==="cave_potion")return"cave_potion";
        if(id==="cave_ring")return"chapter1_ring";
      }
      const actor=snapshot().actors.ajian||{},status=actor.status;
      if(status==="bound_unconscious")return"cave_ajian_found";
      if(status==="bound_awake")return"cave_ajian_untie_return";
      if(status==="critical")return"cave_ajian_critical";
      if(status==="unconscious")return"cave_ajian_rewake";
      if(snapshot().flags.goblinsDefeated)return snapshot().flags.ajianIdentityKnown?"cave_ajian_destination":"cave_ajian_rescued";
      return"cave_explore";
    }});
  }
  function ajianNpc(){return director&&director.actors&&director.actors.ajian;}
  function drinkSoup(){api.heal(1);updateState(state=>{state.flags.caveSoupDrunk=true;state.worldItems.cave_soup={status:"used",mapId:lastMap};},"cave_soup_drunk");}
  function takePotion(){const item=director.items.cave_potion;if(item&&root.collectStoryItem(item))updateState(state=>{state.flags.cavePotionTaken=true;state.worldItems.cave_potion={status:"stomach",mapId:lastMap};},"cave_potion_taken");}
  function wakeAjian(method){const actor=ajianNpc();if(actor){actor.unconscious=false;actor.bound=true;actor.interactable=true;}updateState(state=>{state.flags.lickWakeLearned=true;state.flags.ajianFound=true;state.flags.ajianAwake=true;state.flags.ajianFirstWakeMethod=method;if(method==="face")state.flags.ajianFaceLicked=true;else state.flags.ajianFootLicked=true;StateApi.ensureActor(state,"ajian",{status:"bound_awake",location:lastMap,hp:actor?actor.hp:8,met:true});},"ajian_wake_"+method);}
  function wakeReleasedActor(actorId,method){const actor=director.actors[actorId]||npcs.find(npc=>targetId(npc)===actorId);if(actor){actor.unconscious=false;actor.interactable=true;actor.inside=true;director.actors[actorId]=actor;}updateState(state=>{StateApi.ensureActor(state,actorId,{status:"alive",location:lastMap,met:true});},actorId+"_woken_by_"+method);}
  function cutAjianRope(){const actor=ajianNpc();if(actor){actor.bound=false;actor.unconscious=false;actor.damageable=false;}updateState(state=>{state.flags.ajianUntied=true;StateApi.ensureActor(state,"ajian",{status:"alive",location:lastMap});},"ajian_untied");}
  function spawnGoblinEncounter(restore){
    if(enemies.some(enemy=>enemy.storyId&&enemy.storyId.startsWith("cave_goblin_")))return;
    const saved=restore&&snapshot().encounters&&snapshot().encounters.caveGoblins;
    if(saved&&saved.length)saved.forEach(enemyAt);
    else{const encounter=(MS[Maps.TYPES.CHAPTER1_CAVE].encounters||[])[0];(encounter.origin||[]).forEach((point,index)=>enemyAt({type:"goblin_archer",storyId:"cave_goblin_"+(index+1),x:point[0],y:point[1],approachTarget:encounter.approach[index]}));}
    const actor=ajianNpc();if(actor){actor.damageable=true;actor.storyProtected=true;actor.interactable=false;}
    observedEnemies=enemies.length;
    director.spawned=true;if(!restore)updateState(state=>{state.flags.goblinFightStarted=true;state.encounters.caveGoblins=[];},"cave_goblins_started");
  }
  function waitCaveCombat(){closeDialogue();director.runtime.waitFor({events:[eventType("ENEMIES_DEFEATED")],predicate:()=>director.spawned&&observedEnemies>0&&enemies.length===0,target:caveCombatOutcome});}
  function caveCombatOutcome(){const actor=ajianNpc(),critical=!!(actor&&actor.critical)||snapshot().flags.ajianCritical;updateState(state=>{state.flags.goblinsDefeated=true;state.flags.ajianCritical=critical;state.encounters.caveGoblins=[];StateApi.ensureActor(state,"ajian",{status:critical?"critical":"alive",location:lastMap,hp:actor?actor.hp:1});},"cave_goblins_defeated");if(actor){actor.damageable=false;actor.interactable=true;actor.inside=true;}banner("哥布林都倒下了。去看看阿见。");return"cave_explore";}
  function swallowAjian(){const actor=ajianNpc();if(!actor)return;updateState(state=>{StateApi.ensureActor(state,"ajian",{hp:actor.hp});state.flags.ajianSwallowedOnce=true;},"ajian_swallowing");swallowActor("ajian");}
  function healAjian(){if(!root.consumeStoryItem("healingPotion"))return;const actor=ajianNpc();if(actor){actor.hp=Math.max(1,actor.hp);actor.critical=false;actor.unconscious=false;actor.damageable=false;}updateState(state=>{state.flags.ajianCritical=false;StateApi.ensureActor(state,"ajian",{status:"alive",hp:1,location:lastMap});},"ajian_healed");}
  function rewakeAjian(method){const actor=ajianNpc(),before=snapshot(),critical=before.flags.ajianCritical||before.actors.ajian.status==="critical",first=before.flags.ajianFirstWakeMethod||method,reaction=(first===method?"same_":"switch_")+method;if(actor&&!critical){actor.unconscious=false;actor.critical=false;actor.interactable=true;}updateState(state=>{state.flags.ajianRewakeReaction=reaction;if(method==="face")state.flags.ajianFaceLicked=true;else state.flags.ajianFootLicked=true;StateApi.ensureActor(state,"ajian",{status:critical?"critical":"alive",location:lastMap});},"ajian_rewake_"+method);}
  function resolveAjianRewake(){const state=snapshot();director.runtime.follow(state.flags.ajianCritical?"cave_ajian_critical_brief":"cave_ajian_rewake_"+(state.flags.ajianRewakeReaction||"same_face"));}
  function lickRescuedAjian(){updateState(state=>{state.flags.ajianRescueFootLicked=true;},"ajian_rescue_foot_licked");}
  function revealAjian(){updateState(state=>{state.flags.ajianIdentityKnown=true;state.quests.findAjian={status:"active",title:"带阿见回河边营地",priority:10};},"ajian_identity_revealed");const state=snapshot();if(state.flags.chapter1MeetingSeen||state.flags.findAjianAccepted)director.runtime.follow("cave_ajian_reveal_known");else director.runtime.follow("cave_ajian_reveal_unknown");}
  function mountAjian(){const actor=ajianNpc();if(!actor||!root.mountStoryActor(actor)){banner("负重过高，阿见现在无法骑上来。");return;}director.actors.ajian=null;updateState(state=>{state.player.rider="ajian";StateApi.ensureActor(state,"ajian",{status:"riding",location:lastMap});state.quests.findAjian={status:"active",title:"把阿见带到河边营地",priority:10};},"ajian_mounted");}
  function takeSword(){const item=director.items.forest_sword;if(item&&root.collectStoryItem(item)){updateState(state=>{state.flags.chapter1SwordTaken=true;state.worldItems.forest_sword={status:"stomach",mapId:lastMap};},"chapter1_sword_taken");}}
  function takeRing(){const item=director.items.cave_ring;if(item&&root.collectStoryRing(item))updateState(state=>{state.flags.chapter1RingTaken=true;state.player.nodeCharges=charges;state.worldItems.cave_ring={status:"consumed",mapId:lastMap};},"chapter1_ring_taken");}
  function swallowActor(actorId){const actor=director.actors[actorId];if(actor&&root.swallowStoryNPC(actor))director.actors[actorId]=null;}
  function releaseActor(actorId){const actor=snapshot().actors[actorId]||{};if(root.releaseStoryActor(actorId,actor.x,actor.y,actor.hp))director.actors[actorId]=npcs.find(n=>targetId(n)===actorId)||null;}
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
    ketiOutcome:()=>snapshot().actors.keti.status==="alive"?"keti_saved":"keti_dead",
    caveCombatOutcome
  };
  const choiceActions={waitForWall:wallWait,waitForExit:exitWait,takeSword,takeRing,drinkSoup,takePotion,wakeAjianFace:()=>wakeAjian("face"),wakeAjianFoot:()=>wakeAjian("foot"),rewakeAjianFace:()=>rewakeAjian("face"),rewakeAjianFoot:()=>rewakeAjian("foot"),wakeAjieFace:()=>wakeReleasedActor("ajie","face"),wakeAjieFoot:()=>wakeReleasedActor("ajie","foot"),wakeLisiFace:()=>wakeReleasedActor("lisi","face"),wakeLisiFoot:()=>wakeReleasedActor("lisi","foot"),cutAjianRope,spawnGoblinEncounter:()=>spawnGoblinEncounter(false),swallowAjian,healAjian,lickRescuedAjian,revealAjian,mountAjian,swallowAjie:()=>swallowActor("ajie"),swallowLisi:()=>swallowActor("lisi"),releaseAjie:()=>releaseActor("ajie"),releaseLisi:()=>releaseActor("lisi"),releaseAjian:()=>releaseActor("ajian"),dropSword,startAjieCombat,payBandits,tradeSword,swallowBuck:()=>swallowBandit("buck"),swallowMiro:()=>swallowBandit("miro"),releaseBuck:()=>releaseBandit("buck"),releaseMiro:()=>releaseBandit("miro"),reverseBanditRobbery,startBanditCombat,waitBanditCombat,claimBanditCombatReward,resolveBanditThreat,claimCampReward,claimCampLick,claimCampEatAjie:()=>claimCampEat("ajie"),claimCampEatLisi:()=>claimCampEat("lisi")};

  const hasItem=(state,id)=>!!(state.inventory&&state.inventory.slots||[]).find(slot=>slot.id===id&&slot.count>0);
  const choiceConditions={hasSword:state=>hasItem(state,"ironSword"),hasPotion:state=>hasItem(state,"healingPotion"),hasAjie:state=>hasItem(state,"ajie"),hasLisi:state=>hasItem(state,"lisi"),hasAjian:state=>hasItem(state,"ajian"),hasBuck:state=>hasItem(state,"buck"),hasMiro:state=>hasItem(state,"miro"),hasGold3:state=>(Number(state.player&&state.player.gold)||0)>=3,buckAlive:state=>state.actors.buck.status==="alive",miroAlive:state=>state.actors.miro.status==="alive",lickWakeLearned:state=>!!state.flags.lickWakeLearned,ajieAlive:state=>state.actors.ajie.status==="alive",lisiAlive:state=>state.actors.lisi.status==="alive",ajianFootAvailable:state=>!state.flags.ajianRescueFootLicked,canMountAjian:()=>!rider&&stomachWeight()+3<=CFG.carryCapacity};
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
      director.actors[targetId(target)]=target;
      target.inside=true;
      if(typeof root.focusDialogueTarget==="function")root.focusDialogueTarget(target);
      if(currentNode()==="wilderness_keti_wait"){
        director.keti=target;updateState(state=>{state.actors.keti.met=true;},"keti_met");emit("ACTOR_INTERACTED",{actorId:targetId(target)});
      }
      else if(currentNode()==="chapter1_explore")emit("ACTOR_INTERACTED",{actorId:targetId(target)});
      else if(currentNode()==="chapter1_ajie_downed_wait")emit("ACTOR_INTERACTED",{actorId:targetId(target)});
      else if(currentNode()==="cave_explore")emit("ACTOR_INTERACTED",{actorId:targetId(target)});
      return true;
    }
    if(kind==="item"){
      target.inside=true;
      if(typeof root.focusDialogueTarget==="function")root.focusDialogueTarget(target);
      if(currentNode()==="chapter1_explore"||currentNode()==="cave_explore")emit("ITEM_INTERACTED",{itemId:targetId(target)});
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
      const released=npcs.find(npc=>targetId(npc)===actorId);if(released)director.actors[actorId]=released;
      updateState(state=>{StateApi.ensureActor(state,actorId,{status:actorId==="ajian"&&state.flags.ajianCritical?"critical":"unconscious",location:lastMap,x:payload.x,y:payload.y,hp:payload.hp});},actorId+"_released");
      if(actorId==="lisi"&&director.actors.ajie&&director.actors.ajie.hostile){director.actors.ajie.hostile=false;director.actors.ajie.damageable=false;director.actors.ajie.interactable=false;director.actors.ajie.resting=6;director.runtime.follow("chapter1_lisi_released");}
    }else if(name==="actorCritical"){
      const actorId=payload&&payload.actorId;if(!actorId)return;updateState(state=>{if(actorId==="ajian")state.flags.ajianCritical=true;StateApi.ensureActor(state,actorId,{status:"critical",hp:payload.hp,location:lastMap});},actorId+"_critical");
    }else if(name==="actorHealed"){
      const actorId=payload&&payload.actorId;if(!actorId)return;updateState(state=>{if(actorId==="ajian")state.flags.ajianCritical=false;StateApi.ensureActor(state,actorId,{status:"alive",hp:payload.hp,location:lastMap});},actorId+"_healed");
    }else if(name==="riderMounted"){
      const actorId=payload&&payload.actorId;if(!actorId)return;updateState(state=>{state.player.rider=actorId;StateApi.ensureActor(state,actorId,{status:"riding",location:lastMap});},actorId+"_mounted");
    }else if(name==="actorDowned"){
      const actorId=payload&&payload.actorId;if(!actorId)return;
      updateState(state=>{StateApi.ensureActor(state,actorId,{status:"downed",location:lastMap});},actorId+"_downed");emit("AJIE_DOWNED",{actorId});
    }else if(name==="banditDowned"){
      const actorId=payload&&payload.actorId;if(!actorId)return;
      updateState(state=>{StateApi.ensureActor(state,actorId,{status:"downed",location:lastMap});},actorId+"_downed");emit("BANDIT_DOWNED",{actorId});
    }else if(name==="actorLeft"){
      const actorId=payload&&payload.actorId;if(!actorId)return;
      updateState(state=>{StateApi.ensureActor(state,actorId,{status:"left",location:null});},actorId+"_left");emit("AJIE_LEFT",{actorId});
    }else if(name==="nodeChargesChanged"){
      updateState(state=>{state.player.nodeCharges=Math.max(0,Number(payload&&payload.charges)||0);},"node_charges_changed");
    }else if(name==="worldItemDropped"){
      if(payload&&payload.id==="ironSword"){
        const noticed=!payload.noticedBefore&&Object.values(director.actors||{}).some(actor=>actor&&!actor.unconscious&&!actor.hostile&&Math.hypot(actor.x-payload.x,actor.y-payload.y)<=2);
        updateState(state=>{state.worldItems.forest_sword={status:"ground",mapId:lastMap,x:payload.x,y:payload.y};if(noticed)state.flags.chapter1SwordRecognizedPending=true;},"chapter1_sword_ground");
      }
    }else if(name==="swordNearActor"){
      if(!snapshot().flags.findAjianAccepted){
        updateState(state=>{state.flags.chapter1SwordRecognizedPending=true;},"chapter1_sword_hit_actor");
        if(currentNode()==="chapter1_explore")
        emit("ACTOR_INTERACTED",{actorId:payload&&payload.actorId});
      }
    }else if(name==="ajieBodyLearned"){
      if(currentNode()==="chapter1_combat_pending")director.runtime.follow("chapter1_ajie_body_learned");
    }else if(name==="inventoryChanged"){
      updateState(state=>{state.inventory=payload.inventory;state.player.bodyLength=payload.bodyLength||snake.len;if((payload.inventory.slots||[]).some(slot=>slot.id==="ironSword"&&slot.count>0))state.worldItems.forest_sword={status:"stomach",mapId:lastMap};},payload.reason||"inventory_changed");saveCurrent();
    }else if(name==="mechanicCompleted"&&payload&&payload.id==="bridge_pillar"){
      updateState(state=>{state.flags.bridgeLowered=true;state.quests.lowerBridge={status:"completed",title:"放下吊桥",priority:20};},"bridge_lowered");saveCurrent();banner("桥桩充能完成，吊桥已经放下！");
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
    const map=MS[lastMap];
    if(lastMap!==TM&&!exitSent&&map)for(const exit of map.exits||[]){const r=exit.rect;if(r&&snake.fx>=r[0]&&snake.fx<=r[0]+r[2]&&snake.fy>=r[1]&&snake.fy<=r[1]+r[3]){exitSent=true;saveCurrent();const state=snapshot(),targetNode=exit.targetMap===Maps.TYPES.CHAPTER1_CAVE?(!state.flags.caveEntered?"cave_intro":state.flags.goblinFightStarted&&!state.flags.goblinsDefeated?"cave_goblin_combat":"cave_explore"):"chapter1_explore";loadMap({mapId:exit.targetMap,entry:exit.targetEntry,checkpoint:targetNode});director.runtime.follow(targetNode);break;}}
    if(lastMap===Maps.TYPES.CHAPTER1_FOREST){
      const state=snapshot(),camp=(map.triggers||[]).find(trigger=>trigger.id==="camp_settlement"),r=camp&&camp.rect,inside=!!(r&&snake.fx>=r[0]&&snake.fx<=r[0]+r[2]&&snake.fy>=r[1]&&snake.fy<=r[1]+r[3]);
      const ajian=state.actors.ajian||{},hasAjianHere=state.player.rider==="ajian"||hasItem(state,"ajian")||ajian.location===lastMap&&ajian.x>=68&&ajian.y>=41;
      const hasHost=state.actors.ajie.status==="alive"||state.actors.lisi.status==="alive";
      if(inside&&!campInside&&!state.flags.campRewardClaimed&&hasAjianHere&&hasHost){const arrival=settleAjian(),now=snapshot(),hosts=now.actors.ajie.status==="alive"&&now.actors.lisi.status==="alive"?"both":now.actors.lisi.status==="alive"?"lisi":"ajie";director.runtime.follow("camp_settlement_"+arrival+"_"+hosts);}
      campInside=inside;
    }
    if(map&&!snapshot().flags.bridgeSeen)for(const trigger of map.triggers||[]){const r=trigger.rect;if(trigger.id==="bridge_approach"&&snake.fx>=r[0]&&snake.fx<=r[0]+r[2]&&snake.fy>=r[1]&&snake.fy<=r[1]+r[3]){updateState(state=>{state.flags.bridgeSeen=true;state.quests.lowerBridge={status:"active",title:"给桥桩充能，放下吊桥",priority:20,target:6,progress:0};},"bridge_seen");banner("吊桥被收起了。围住桥桩并持续充能。更深处也许能找到环形节点。");saveCurrent();break;}}
    if(currentNode()==="cave_goblin_combat"&&snapshot().flags.goblinFightStarted&&observedEnemies>0&&enemies.length===0)emit("ENEMIES_DEFEATED",{remaining:0,total:kills});
    else if(observedEnemies>0&&enemies.length===0)emit("ENEMIES_DEFEATED",{remaining:0,total:kills});
    observedEnemies=enemies.length;
  }

  function goalText(){if(snapshot()&&snapshot().flags.findAjianAccepted&&currentNode()==="chapter1_explore")return"寻找阿见";const goal=director&&director.runtime.node&&director.runtime.node.goal;if(!goal)return"按剧情继续";const suffix=goal.inputHint?" "+(goal.inputHint==="move"?"["+movementHint()+"]":hint(goal.inputHint)):"";if(goal.kind==="counter")return goal.label+" "+Math.min(goal.target,count(goal.counter))+"/"+goal.target+suffix;return (goal.text||"按剧情继续")+suffix;}
  function questList(){const state=snapshot();if(!state)return[];const quests=Object.assign({},state.quests||{});if(state.flags.findAjianAccepted&&!quests.findAjian)quests.findAjian={status:"active",title:"寻找阿见",priority:10};const bridge=typeof MECHS!=="undefined"&&MECHS.find(mech=>mech.id==="bridge_pillar");if(quests.lowerBridge&&bridge&&!bridge.done)quests.lowerBridge=Object.assign({},quests.lowerBridge,{progress:Math.floor(bridge.prog*10)/10,target:bridge.charge});return Object.keys(quests).map(id=>Object.assign({id},quests[id])).filter(quest=>quest.status==="active").sort((a,b)=>(Number(a.priority)||0)-(Number(b.priority)||0));}
  function questText(){const quests=questList();return quests.length?"任务目标\n"+quests.map(quest=>"• "+quest.title+(Number.isFinite(quest.progress)&&Number.isFinite(quest.target)?" "+Math.min(quest.progress,quest.target)+"/"+quest.target:"")).join("\n"):"";}
  function progressText(){const progress=director&&director.runtime.node&&director.runtime.node.progress;return progress?progress.chapter+" "+progress.step+"/"+progress.total:"剧情模式";}

  function createDirector(state,slot){
    return {slot,spawned:false,keti:null,actors:{},items:{},checkpoint:null,runtime:new RuntimeApi.StoryRuntime({graph:compileGraph(Story.nodes),state,bus:B,adapters:{loadMap,dialog:dialogue,banner:args=>banner(args.text),eatKeti,eatCorpse,spawnSlimes,waitForMemoryBlur,memoryBlur,nameInput,storyEnd,chapterExplore,caveExplore,waitCaveCombat,waitBanditCombat,revealAjian,resolveAjianRewake,waitAjieCombat,waitDownedInteraction}})};
  }

  function start(slot){
    stop();storyActive=true;storyStage=0;storyTransitioning=false;playMode="story";
    const state=new StateApi.StoryStateStore();state.reset("new_story");
    director=createDirector(state,Number(slot)||1);
    director.runtime.start(Story.start);
    return {ok:true,slot:director.slot};
  }
  function chapterResumeNode(state,preferredNode){
    const candidate=preferredNode||state.currentNode;
    if(state.currentMap===Maps.TYPES.CHAPTER1_CAVE){if(state.flags.chapter1RingTaken&&["chapter1_ring","chapter1_ring_tutorial"].includes(candidate))return"cave_explore";return candidate&&Story.nodes[candidate]&&(candidate.startsWith("cave_")||["chapter1_ring","chapter1_ring_tutorial"].includes(candidate))?candidate:(state.flags.goblinFightStarted&&!state.flags.goblinsDefeated?"cave_goblin_combat":"cave_explore");}
    if(state.flags.banditCombatStarted&&!state.flags.banditResolved&&["buck","miro"].every(id=>["downed","swallowed"].includes(state.actors[id]&&state.actors[id].status)))return"bandit_search";
    return candidate&&Story.nodes[candidate]&&!candidate.startsWith("cave_")?candidate:"chapter1_explore";
  }
  function resume(slot){
    if(!saveStore)return {ok:false,error:{code:"SAVE_UNAVAILABLE",message:"存档系统不可用"}};
    const loaded=saveStore.load(slot);if(!loaded.ok)return loaded;if(loaded.empty)return start(slot);
    stop();storyActive=true;storyStage=0;storyTransitioning=false;playMode="story";
    const state=new StateApi.StoryStateStore(loaded.data),checkpoint=loaded.data.checkpoint;
    director=createDirector(state,Number(slot)||1);
    if([Maps.TYPES.CHAPTER1_FOREST,Maps.TYPES.CHAPTER1_CAVE].includes(loaded.data.currentMap)){const nodeId=chapterResumeNode(loaded.data);loadMap({mapId:loaded.data.currentMap,entry:loaded.data.currentMap===Maps.TYPES.CHAPTER1_CAVE?"cave_entrance":"forest_cave_return",checkpoint:nodeId});director.runtime.start(nodeId);return {ok:true,slot:director.slot,resumed:true,legacy:!!loaded.legacy};}
    const nodeId=checkpoint&&checkpoint.nodeId||(loaded.data.currentMap===WM?"wilderness_start":Story.start);
    director.runtime.start(nodeId);
    return {ok:true,slot:director.slot,resumed:true,legacy:!!loaded.legacy};
  }
  function retry(){if(!director){start(1);return;}if(!director.checkpoint){start(director.slot);return;}const checkpoint=JSON.parse(JSON.stringify(director.checkpoint));director.runtime.stop();director.runtime.state.replace(checkpoint.state,"checkpoint_restore");if([Maps.TYPES.CHAPTER1_FOREST,Maps.TYPES.CHAPTER1_CAVE].includes(checkpoint.state.currentMap)){const nodeId=chapterResumeNode(checkpoint.state,checkpoint.nodeId);loadMap({mapId:checkpoint.state.currentMap,entry:checkpoint.state.currentMap===Maps.TYPES.CHAPTER1_CAVE?"cave_entrance":"forest_cave_return",checkpoint:nodeId});director.runtime.start(nodeId);}else director.runtime.start(checkpoint.nodeId);}
  function stop(){if(director)director.runtime.stop();if(exitTimeoutHandle)clearTimeout(exitTimeoutHandle);exitTimeoutHandle=null;exitTimeoutPending=false;director=null;ownership={actors:new Set(),mechanics:new Set(),exits:new Set(),items:new Set()};boss=null;bossStakes=[];storyActive=false;storyStage=-1;lastMap=null;observedEnemies=0;campInside=false;}

  root.IMS_STORY_API={start,resume,retry,stop,save:saveCurrent,listSaves:()=>saveStore?saveStore.list():[],deleteSave:slot=>saveStore?saveStore.delete(slot):{ok:false},currentSlot:()=>director&&director.slot,tick:update,goalText,questList,questText,progressText,storyGold:gold,routeInteraction,owns,engineEvent,director:()=>director};
  root.storyControllerInteraction=routeInteraction;
  root.storyControllerOwns=owns;
  root.storyControllerInteract=target=>routeInteraction("actor",target);
  root.storyControllerTick=update;
  root.storyDirector=()=>director;
})(typeof window!=="undefined"?window:globalThis);
