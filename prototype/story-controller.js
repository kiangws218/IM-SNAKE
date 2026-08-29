"use strict";
(function(root){
const A=root.IMS_STORY_RUNTIME,S=root.IMS_STORY_STATE,E=root.IMS_STORY_EVENTS,M=root.IMS_STORY_MAPS;
const T=E.TYPES,B=E.bus,TM=M.TYPES.TUTORIAL,WM=M.TYPES.WILDERNESS,MS=M.STORY_MAPS;
const old={open:root.openPanel,close:root.closePanel,eat:root.eatNPC,die:root.dieNPC,pick:root.pickUps,shot:root.stanceShot,proj:root.updateProjs,enemies:root.updateEnemies,menu:root.showMenu};
let D=null,lastMap=null,gateSent=false,exitSent=false,observedBeans=0,observedLen=0;
const ty=(n,f)=>T[n]||f,emit=(n,p)=>B&&B.emit(ty(n,"story."+n.toLowerCase()),p||{}),snap=()=>D&&D.runtime.state.snapshot(),cnt=k=>snap()&&snap().counters[k]||0,node=()=>D&&D.runtime.node?D.runtime.node.id:"";
function state(fn,r){if(D)D.runtime.state.update(fn,r);}
function close(){if(old.close)old.close();panelOpen=false;freeze=false;moveLock=false;panelNpc=null;npcNode=null;}
function lvl(m){return{obstacles:m.obstacles||[],mechs:(m.gates||[]).map(g=>({kind:"gate",id:g.id,x:g.x,y:g.y,w:g.w,h:g.h,need:g.need||3,reward:null})),waves:[],caps:{slime:0,rat:0,flower:0},beans:0,npcs:[]};}
function enemyAt(s){const t=ENEMY_TYPES[s.type];if(!t)return;const e={type:s.type,x:s.x,y:s.y,flash:0,hitT:0,hp:t.hp,max:t.hp,r:t.r,vx:0,vy:0,wanderT:0,squash:rnd(6)};enemies.push(e);}
function loadMap(id,entry){
 const m=MS[id];lastMap=id;gateSent=false;exitSent=false;boss=null;bossStakes=[];playMode="story";storyStage=id===TM?0:6;reset(true);buildFromLevel(lvl(m));groundBeans.length=0;(m.beans||[]).forEach(p=>groundBeans.push({x:p[0],y:p[1]}));enemies.length=0;npcs.length=0;
 const sp=(entry&&m.entryPoints&&m.entryPoints[entry])||m.spawn;snake.fx=sp.x;snake.fy=sp.y;dir=sp.dir;snake.len=id===TM?CFG.initLen:CFG.initLen;coilPath();computeSegs();computeEnclosure();observedBeans=beansEaten;observedLen=snake.len;
 if(id===WM){const k=m.npcs&&m.npcs[0],st=snap().actors.keti.status;if(k&&st!=="dead"&&st!=="eaten"){const q=NPC_TYPES.keti;D.keti={storyId:"keti",kind:"keti",x:k.x,y:k.y,r:q.r,hp:q.hp,maxHp:q.hp,flash:0,inside:false,crying:false};npcs.push(D.keti);state(s=>{s.actors.keti.status="alive";},"keti_spawn");}}
 gameState="play";paused=false;freeze=false;firing=false;fireKey=false;heldKeys.clear();dirQueue.length=0;moveLock=false;document.getElementById("overlay").classList.remove("show");document.getElementById("tut").classList.remove("show");document.getElementById("ovBtns").style.display="";document.getElementById("pickList").innerHTML="";ensurePrimarySpawnSafe();emit("MAP_LOADED",{mapId:id,spawnId:entry||null,clearForwardSeconds:3});banner(id===TM?"序章 · 教学地图：沿走廊前进":"地图 2 · 荒野：寻找哭声");
}
function dialog(a){
 panelOpen=true;freeze=true;panelNpc=null;npcNode=null;const p=ensurePanel();p.style.display="flex";document.getElementById("npcName").textContent=a.speaker||"我";document.getElementById("npcSub").textContent=a.sub||"序章";drawPortraitInto(document.getElementById("npcPortrait"),a.portrait||"snake_self",!!a.crying);document.getElementById("npcSay").textContent=a.text||"";
 const box=document.getElementById("npcOpts");box.innerHTML="";(a.choices||[{id:"continue",label:"继续"}]).forEach(c=>{const b=document.createElement("button");b.className="npc-opt"+(c.danger?" red":"");b.textContent=c.label;b.onclick=()=>{close();try{D.runtime.choose(c.id);}catch(e){console.error(e);}};box.appendChild(b);});trackPanelOpts(box);requestAnimationFrame(()=>p.classList.add("open"));
}
function nameInput(){
 panelOpen=true;freeze=true;const p=ensurePanel();p.style.display="flex";document.getElementById("npcName").textContent="我";document.getElementById("npcSub").textContent="序章 · 输入名字";drawPortraitInto(document.getElementById("npcPortrait"),"snake_self",false);document.getElementById("npcSay").innerHTML="这段旅程，应该怎么称呼你？<br><input id='storyNameInput' maxlength='16' style='margin-top:12px;width:220px;padding:8px;background:#10111e;color:#ffe9b3;border:1px solid #ffd76e;border-radius:6px;font:14px Consolas'><button id='storyNameConfirm' class='npc-opt'>确定</button>";
 const i=document.getElementById("storyNameInput"),b=document.getElementById("storyNameConfirm"),done=()=>{const n=(i.value||"").trim()||"未命名";state(s=>{s.player.name=n;s.currentNode="InputPlayerName";},"name_input");close();banner("名字已记住："+n);};b.onclick=done;i.onkeydown=e=>{if(e.key==="Enter")done();};panelOpts=[b];panelSel=0;requestAnimationFrame(()=>{p.classList.add("open");i.focus();});
}
function eatKeti(){const n=D&&D.keti;if(n&&npcs.includes(n)&&old.eat)old.eat(n);state(s=>{s.actors.keti.status="eaten";s.actors.keti.corpsePresent=false;},"keti_eaten");emit("ACTOR_EATEN",{actorId:"keti"});}
function eatCorpse(){state(s=>{s.actors.keti.status="eaten";s.actors.keti.corpsePresent=false;},"keti_corpse_eaten");emit("ACTOR_EATEN",{actorId:"keti",corpse:true});}
function wallWait(){close();if(cnt("tutorialBeansEaten")>=5&&gateSent){D.runtime.follow("dialogue_3");return;}D.runtime.waitFor({events:[ty("PLAYER_BEAN_EATEN","story.player_bean_eaten"),ty("FRAGILE_GATE_BROKEN","story.fragile_gate_broken")],predicate:()=>cnt("tutorialBeansEaten")>=5&&gateSent,target:"dialogue_3"});}
function exitWait(){close();D.runtime.startTimer("tutorial_exit_timeout",30);D.runtime.waitFor({events:[ty("MAP_EXIT_ENTERED","story.map_exit_entered"),ty("TIMER_EXPIRED","story.timer_expired")],predicate:e=>e.type===ty("MAP_EXIT_ENTERED","story.map_exit_entered")||(e.payload&&e.payload.id==="tutorial_exit"),target:e=>e.type===ty("MAP_EXIT_ENTERED","story.map_exit_entered")?"wilderness_start":"dialogue_4"});}
const G={
 prologue_start:{id:"prologue_start",onEnter:{name:"load",args:{id:TM}},auto:"tutorial_1"},
 tutorial_1:{id:"tutorial_1",wait:{events:[ty("PLAYER_BEAN_EATEN","story.player_bean_eaten")],predicate:()=>cnt("tutorialBeansEaten")>=3,target:"dialogue_1"}},
 dialogue_1:{id:"dialogue_1",onEnter:{name:"dialog",args:{speaker:"我",sub:"序章 · 对话框 1",text:"我究竟像这样吃了多久……感觉……有点恶心。要吐了！",choices:[{id:"go",label:"吐出来！",next:"tutorial_2"}]}}},
 tutorial_2:{id:"tutorial_2",wait:{events:[ty("PLAYER_BEAN_SPIT","story.player_bean_spit")],predicate:()=>cnt("tutorialBeansSpit")>=3,target:"dialogue_2"}},
 dialogue_2:{id:"dialogue_2",onEnter:{name:"dialog",args:{speaker:"我",sub:"序章 · 对话框 2",text:"吐出来舒服多了。但我的身体也变短了。前面有一堵脆弱的墙？似乎可以靠这个破坏它。",choices:[{id:"go",label:"继续前进",run:wallWait}]}}},
 dialogue_3:{id:"dialogue_3",onEnter:{name:"dialog",args:{speaker:"我",sub:"序章 · 对话框 3",text:"墙后面是什么？先别停下来，找到门，再出去。",choices:[{id:"go",label:"走向门",run:exitWait}]}}},
 dialogue_4:{id:"dialogue_4",onEnter:{name:"dialog",args:{speaker:"我",sub:"序章 · 对话框 4",text:"时间过去了……这里似乎还藏着什么。你可以继续玩一会儿，也可以现在离开。",choices:[{id:"go",label:"继续小游戏",next:"tutorial_free_play"},{id:"leave",label:"走出门",next:"tutorial_free_play"}]}}},
 tutorial_free_play:{id:"tutorial_free_play",onEnter:{name:"banner",args:{text:"自由探索：找到已经打开的门，走出教学地图"}},wait:{events:[ty("MAP_EXIT_ENTERED","story.map_exit_entered")],target:"wilderness_start"}},
 wilderness_start:{id:"wilderness_start",onEnter:{name:"load",args:{id:WM,entry:"wilderness_entry"}},auto:"wilderness_keti_wait"},
 wilderness_keti_wait:{id:"wilderness_keti_wait",wait:{events:[ty("ACTOR_INTERACTED","story.actor_interacted")],predicate:e=>e.payload&&e.payload.actorId==="keti",target:"keti_question"}},
 keti_question:{id:"keti_question",onEnter:{name:"dialog",args:{speaker:"可蒂",sub:"地图 2 · 荒野",portrait:"keti",crying:true,text:"呜……你也是从那边来的吗？",choices:[{id:"yes",label:"是的。",next:"keti_cry"},{id:"eat",label:"吃掉",next:"keti_eaten",danger:true}]}}},
 keti_cry:{id:"keti_cry",onEnter:{name:"dialog",args:{speaker:"可蒂",sub:"可蒂哭了",portrait:"keti",crying:true,text:"你会吃掉我吗？",choices:[{id:"save",label:"开玩笑的，我不会吃你的",next:"wilderness_slimes"},{id:"eat",label:"吃掉",next:"keti_eaten",danger:true},{id:"leave",label:"离开",next:"free_explore"}]}}},
 keti_eaten:{id:"keti_eaten",onEnter:{name:"eatKeti"},auto:"eaten_slimes"},
 eaten_slimes:{id:"eaten_slimes",onEnter:{name:"slimes"},wait:{events:[ty("ENEMIES_DEFEATED","story.enemies_defeated")],predicate:()=>D.spawned&&enemies.length===0,target:"free_explore"}},
 wilderness_slimes:{id:"wilderness_slimes",onEnter:{name:"slimes"},wait:{events:[ty("ENEMIES_DEFEATED","story.enemies_defeated")],predicate:()=>D.spawned&&enemies.length===0,target:()=>snap().actors.keti.status==="alive"?"keti_saved":"keti_dead"}},
 keti_saved:{id:"keti_saved",onEnter:{name:"dialog",args:{speaker:"可蒂",sub:"可蒂存活",portrait:"keti",text:"谢谢你……你叫什么名字？",choices:[{id:"name",label:"告诉她我的名字",next:"input_player_name"}]}}},
 keti_dead:{id:"keti_dead",onEnter:{name:"dialog",args:{speaker:"我",sub:"可蒂死亡",text:"哭声消失了。她的尸体还留在这里。",choices:[{id:"leave",label:"离开",next:"free_explore"},{id:"eat",label:"吃掉尸体",next:"keti_eaten_after_death",danger:true}]}}},
 keti_eaten_after_death:{id:"keti_eaten_after_death",onEnter:{name:"eatCorpse"},auto:"free_explore"},
 free_explore:{id:"free_explore",onEnter:{name:"freeExplore"},wait:{events:[ty("TIMER_EXPIRED","story.timer_expired")],predicate:e=>e.payload&&e.payload.id==="free_explore_memory",target:"memory_blur"}},
 memory_blur:{id:"memory_blur",onEnter:{name:"memoryBlur"}},
 input_player_name:{id:"input_player_name",onEnter:{name:"nameInput"}}
};
function syncSignals(){
 if(!D||!storyActive||playMode!=="story")return;
 if(beansEaten>observedBeans){
  const delta=beansEaten-observedBeans;
  state(s=>{s.counters.tutorialBeansEaten+=delta;s.player.bodyLength=snake.len;},"bean_eaten");
  for(let i=0;i<delta;i++)emit("PLAYER_BEAN_EATEN",{count:cnt("tutorialBeansEaten")});
 }
 observedBeans=beansEaten;
 if(snake.len<observedLen){
  const delta=observedLen-snake.len;
  state(s=>{s.counters.tutorialBeansSpit+=delta;s.player.bodyLength=snake.len;},"bean_spit");
  for(let i=0;i<delta;i++)emit("PLAYER_BEAN_SPIT",{count:cnt("tutorialBeansSpit")});
 }
 observedLen=snake.len;
 emit("ENEMIES_DEFEATED",{remaining:enemies.length,total:kills});
}
function update(){if(!D||!storyActive||playMode!=="story")return;const n=node();if(n==="tutorial_1"||n==="dialogue_1")storyStage=0;else if(n==="tutorial_2"||n==="dialogue_2")storyStage=1;else if(n==="dialogue_3")storyStage=2;else storyStage=3;if(lastMap===TM&&MECHS.some(m=>m.kind==="gate"&&m.done)&&!gateSent){gateSent=true;state(s=>{s.flags.tutorialGateBroken=true;s.flags.tutorialExitUnlocked=true;s.counters.tutorialGateSpit=3;},"gate_broken");emit("FRAGILE_GATE_BROKEN",{gateId:"tutorial_fragile_gate"});}if(lastMap===TM&&!exitSent&&gateSent&&snake.fx>55.3&&snake.fy>=22&&snake.fy<=27){exitSent=true;emit("MAP_EXIT_ENTERED",{id:"tutorial_exit",mapId:TM,targetMap:WM});}}
function tick(){if(!D||!storyActive||playMode!=="story")return;syncSignals();update();}
function interact(n){if(!D||!storyActive||playMode!=="story"||!n||n.kind!=="keti"||node()!=="wilderness_keti_wait")return false;D.keti=n;state(s=>{s.actors.keti.met=true;},"keti_met");emit("ACTOR_INTERACTED",{actorId:"keti"});return true;}
function goal(){const n=node();if(n==="tutorial_1")return"目标 吃豆 "+Math.min(3,cnt("tutorialBeansEaten"))+"/3";if(n==="tutorial_2")return"目标 吐出 "+Math.min(3,cnt("tutorialBeansSpit"))+"/3";if(n==="dialogue_2")return"目标 吃豆 5 颗并破坏脆弱墙";if(n==="dialogue_3"||n==="dialogue_4"||n==="tutorial_free_play")return"目标 找到门并走出教学地图";if(n==="wilderness_keti_wait"||n==="keti_question"||n==="keti_cry")return"目标 找到哭声的主人";if(n==="wilderness_slimes"||n==="eaten_slimes")return"目标 击败两只史莱姆";if(n==="free_explore")return"自由探索";return"按剧情继续";}
root.pickUps=function(){old.pick();};
root.stanceShot=function(){old.shot();};
root.updateProjs=function(dt){old.proj(dt);};root.updateEnemies=function(dt){old.enemies(dt);};
root.dieNPC=function(n){const k=n&&n.kind==="keti";old.die(n);if(k&&D&&playMode==="story"){state(s=>{s.actors.keti.status="dead";s.actors.keti.corpsePresent=true;},"keti_dead");emit("ACTOR_DIED",{actorId:"keti"});}};
root.eatNPC=function(n){const k=n&&n.kind==="keti";old.eat(n);if(k&&D&&playMode==="story"){state(s=>{s.actors.keti.status="eaten";s.actors.keti.corpsePresent=false;},"keti_eaten");emit("ACTOR_EATEN",{actorId:"keti"});}};
root.openPanel=function(n,id){if(interact(n))return;return old.open(n,id);};root.storyControllerInteract=interact;root.storyControllerTick=tick;root.storyCheckProgress=update;root.storyGoalText=goal;
function start(){if(D)D.runtime.stop();storyActive=true;storyStage=0;storyTransitioning=false;playMode="story";const st=new S.StoryStateStore();st.reset("new_story");D={spawned:false,keti:null,runtime:new A.StoryRuntime({graph:G,state:st,bus:B,adapters:{load:a=>loadMap(a.id,a.entry),dialog:a=>dialog(a),banner:a=>banner(a.text),eatKeti:eatKeti,eatCorpse:eatCorpse,slimes:()=>{D.spawned=true;enemies.length=0;enemyAt({type:"slime",x:54.5,y:21.5});enemyAt({type:"slime",x:54.5,y:27.5});},freeExplore:()=>{close();banner("自由探索：30 秒后会出现记忆模糊");D.runtime.startTimer("free_explore_memory",30);},memoryBlur:()=>{state(s=>{s.flags.memoryBlurSeen=true;s.player.bodyLength=CFG.minLen;},"memory_blur");snake.len=CFG.minLen;computeSegs();dialog({speaker:"我",sub:"记忆模糊",text:"我……刚才吃了什么？脑子里只剩下一片空白。",choices:[{id:"name",label:"输入名字",next:"input_player_name"}]});},nameInput:nameInput}})};D.runtime.start("prologue_start");}
root.startStoryMode=start;root.startStoryStage=start;root.storyDirector=()=>D;root.startCampaign=()=>{boss=null;bossStakes=[];playMode="campaign";resetRun();carry={len:CFG.initLen,charges:1};levelIdx=0;startLevel();};document.getElementById("pauseHome").onclick=()=>root.showMenu();root.showMenu=()=>{if(D)D.runtime.stop();D=null;boss=null;bossStakes=[];storyActive=false;storyStage=-1;lastMap=null;return typeof old.menu==="function"?old.menu():null;};
})(typeof window!=="undefined"?window:globalThis);
