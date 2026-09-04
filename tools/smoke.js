#!/usr/bin/env node
/* 冒烟测试：无头跑通 加载→闯关→射击→布点→沙盒→教学 全链路
 * 用法：node tools/smoke.js prototype/index.html   （必须全绿才允许提交） */
const fs=require("fs"),path=require("path"),vm=require("vm");
const args=process.argv.slice(2),coopMode=args.includes("--coop");
const htmlPath=path.resolve(args.find(a=>!a.startsWith("--"))||"prototype/index.html");
if(!fs.existsSync(htmlPath)){console.error("找不到 "+htmlPath);process.exit(1);}
const html=fs.readFileSync(htmlPath,"utf8");
let code="";
for(const match of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){
  const src=match[1];
  if(src){
    const p=path.join(path.dirname(htmlPath),src);
    if(!fs.existsSync(p)){console.log("[skip missing] "+src);continue;}
    code+=fs.readFileSync(p,"utf8")+"\n;\n";
  }else code+=match[2]+"\n;\n";
}

function mkEl(id){
  const element={
    id, style:{}, textContent:"",
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    children:[],
    appendChild(c){this.children.push(c);return c}, remove(){}, click(){if(this.onclick)this.onclick()},
    setAttribute(){},
    querySelector(){return {textContent:""}}, querySelectorAll(){return this.children},
    getContext(){return ctx2d},
    onclick:null,
  };
  let html="";
  Object.defineProperty(element,"innerHTML",{get(){return html},set(value){html=String(value);element.children.length=0;}});
  return element;
}
const ctx2d=new Proxy({canvas:null},{
  get(t,p){ if(p in t)return t[p];     return (...a)=>({width:0,height:0}); },
  set(t,p,v){t[p]=v;return true;}
});
const els={};
global.document={
  getElementById(id){if(!els[id])els[id]=mkEl(id);return els[id];},
  createElement(tag){return mkEl("<"+tag+">");},
  querySelector(){return null},
  querySelectorAll(){return[]},
  body:mkEl("body"),
  head:mkEl("head"),
};
const storedValues=new Map();
if(coopMode)storedValues.set("imsnake_controls_v1",JSON.stringify({playerCount:2,bindings:{1:{up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD",fire:"KeyJ",cut:"KeyK",node:"KeyF"},2:{up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",fire:"Numpad0",cut:"Numpad1",node:"Numpad2"}}}));
global.localStorage={getItem(k){return storedValues.has(k)?storedValues.get(k):null},setItem(k,v){storedValues.set(k,String(v))},removeItem(k){storedValues.delete(k)}};
const listeners={};
global.addEventListener=(ev,fn)=>{(listeners[ev]=listeners[ev]||[]).push(fn)};
let rafCbs=[],simTime=0;
global.requestAnimationFrame=cb=>{rafCbs.push(cb)};
global.performance={now:()=>simTime};
const fire=(ev,name)=>{(listeners[name]||[]).forEach(f=>f(ev));};
const frames=n=>{for(let i=0;i<n;i++){simTime+=16.7;const cbs=rafCbs;rafCbs=[];cbs.forEach(cb=>cb(simTime));}};

const sandbox={document:global.document,localStorage:global.localStorage,addEventListener:global.addEventListener,
  performance:global.performance,requestAnimationFrame:global.requestAnimationFrame,navigator:{maxTouchPoints:0},
  screen:{orientation:{}},location:{reload(){}},console,setTimeout,clearTimeout,Math,Set,Map,Uint8Array,Array,Object,JSON,
  Date,Promise,parseInt,parseFloat,isNaN};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.global=sandbox;
vm.createContext(sandbox);
try{
  vm.runInContext(code,sandbox);
  console.log("[load] OK");
  const storyMaps=sandbox.IMS_STORY_MAPS&&sandbox.IMS_STORY_MAPS.STORY_MAPS;
  const tutorialMap=storyMaps&&storyMaps[sandbox.IMS_STORY_MAPS.TYPES.TUTORIAL];
  const tutorialGate=tutorialMap&&tutorialMap.gates&&tutorialMap.gates[0];
  const tutorialExit=tutorialMap&&tutorialMap.exits&&tutorialMap.exits[0];
  if(!tutorialMap.cleanMap||!tutorialMap.solidOutside||tutorialMap.solidOutside[0]!==4||tutorialMap.solidOutside[1]!==16||
     !tutorialGate||tutorialGate.x!==48||tutorialGate.y!==16||!tutorialExit||tutorialExit.rect[0]!==47||tutorialExit.rect[1]!==14)
    throw new Error("Tutorial map boundary or gate/exit was not configured correctly");
  if(!tutorialMap.interactions||!tutorialMap.interactions.mechanics.includes("tutorial_fragile_gate")||
     !tutorialMap.interactions.exits.includes("tutorial_exit"))
    throw new Error("Tutorial interaction ownership was not declared");
  els["ovBtn5"].onclick();
  if(!els["pickList"].children.length)throw new Error("Boss challenge selection did not open");
  els["pickList"].children[0].onclick();frames(180);
  if(!sandbox.__IMS.alive)throw new Error("Boss spawn is unsafe");
  if(coopMode&&!sandbox.CoopMode.state.p.alive)throw new Error("P2 boss spawn is unsafe");
  sandbox.enterPhase2();
  const stake=sandbox.__IMS.bossStakes[0];
  stake.cap=1;sandbox.updateBoss(.5);
  if(stake.cap!==1)throw new Error("Boss stake progress regressed while uncovered");
  els["pauseHome"].onclick();frames(2);
  frames(5);
  if(coopMode){
    els["ovBtn3"].onclick();frames(30);
    const coop=sandbox.CoopMode&&sandbox.CoopMode.state,p=coop&&coop.p;
    if(!coop||!coop.enabled||!p||!p.alive)throw new Error("P2 was not created");
    const y0=p.snake.fy;fire({key:"ArrowDown",code:"ArrowDown",preventDefault(){},repeat:false},"keydown");frames(25);fire({key:"ArrowDown",code:"ArrowDown",preventDefault(){}},"keyup");
    if(!(p.snake.fy>y0+.2))throw new Error("P2 movement input did not move the player");
    const len0=p.snake.len;fire({key:"0",code:"Numpad0",preventDefault(){},repeat:false},"keydown");frames(8);fire({key:"0",code:"Numpad0",preventDefault(){}},"keyup");
    if(!(p.snake.len<len0))throw new Error("P2 fire did not consume body ammo");
    const charge0=p.charges;fire({key:"2",code:"Numpad2",preventDefault(){},repeat:false},"keydown");
    if(p.charges!==charge0-1)throw new Error("P2 node placement did not consume its own charge");
    frames(20);console.log("[coop P2 move + fire + node] OK");
    const runningStat=els["stat"].textContent;sandbox.CoopMode.defeat("P2 test down");frames(70);
    if(p.alive||els["stat"].textContent===runningStat)throw new Error("P1 did not continue after P2 went down");
    console.log("[coop one player down + teammate continues] OK");els["pauseHome"].onclick();frames(2);
  }
  els["ovBtn"].onclick();
  const storySlot=els["pickList"].children[0];
  if(!storySlot)throw new Error("Story save slot selection did not open");
  storySlot.onclick();
  fire({key:"r",code:"KeyR",preventDefault(){},repeat:false},"keydown");
  frames(2);
  if(sandbox.__IMS.gameState!=="play"||!els["stat"].textContent.includes("序章"))throw new Error("Story mode did not start");
  if(coopMode&&sandbox.CoopMode.active())throw new Error("Story mode incorrectly started P2");
  if(!storedValues.has("imsnake.story.slot.1"))throw new Error("Story checkpoint was not auto-saved");
  els["pauseHome"].onclick();frames(2);els["ovBtn"].onclick();
  if(els["pickList"].children.length<6)throw new Error("Existing story save actions were not listed");
  els["pickList"].children[0].onclick();frames(2);
  if(sandbox.__IMS.gameState!=="play"||sandbox.storyDirector().slot!==1)throw new Error("Story save did not resume from the slot picker");
  console.log("[story prologue stage 1] OK");
  frames(360);
  if(!sandbox.__IMS.panelOpen)throw new Error("Story stage 1 did not open its dialogue");
  const dialoguePage=els["npcSay"].textContent;
  fire({key:"j",code:"KeyJ",preventDefault(){},repeat:false},"keydown");frames(2);fire({key:"j",code:"KeyJ",preventDefault(){},repeat:false},"keyup");
  if(els["npcSay"].textContent!==dialoguePage)throw new Error("Fire key incorrectly advanced story dialogue");
  frames(10);fire({key:"Enter",code:"Enter",preventDefault(){},repeat:false},"keydown");frames(1);
  const secondDialoguePage=els["npcSay"].textContent;
  fire({key:"Enter",code:"Enter",preventDefault(){},repeat:false},"keydown");frames(1);
  if(els["npcSay"].textContent!==secondDialoguePage)throw new Error("Held confirm key skipped more than one dialogue page");
  fire({key:"Enter",code:"Enter",preventDefault(){},repeat:false},"keyup");frames(10);
  fire({key:"ArrowRight",code:"ArrowRight",preventDefault(){},repeat:false},"keydown");
  fire({key:"d",code:"KeyD",preventDefault(){},repeat:false},"keydown");
  fire({key:"r",code:"KeyR",preventDefault(){},repeat:false},"keydown");
  if(!sandbox.__IMS.panelOpen||sandbox.__IMS.gameState!=="play")throw new Error("Dialogue was closed by an unrelated key");
  console.log("[story dialogue input lock] OK");
  const chooseStory=label=>{
    for(let guard=0;guard<20;guard++){
      const buttons=[...els["npcOpts"].children],wanted=buttons.find(button=>button.textContent.startsWith(label));
      if(wanted){wanted.onclick();frames(1);return;}
      const next=buttons.find(button=>button.textContent.startsWith("继续"));
      if(!next)throw new Error("Story choice not found: "+label+" (buttons: "+buttons.map(button=>button.textContent).join(" | ")+")");
      next.onclick();frames(1);
    }
    throw new Error("Story dialogue did not reach choice: "+label);
  };
  chooseStory("吐出来！");
  frames(2);
  frames(200);
  const storyFire="j";
  fire({key:storyFire,code:"KeyJ",preventDefault(){},repeat:false},"keydown");
  frames(190);
  fire({key:storyFire,code:"KeyJ",preventDefault(){}},"keyup");
  if(!sandbox.__IMS.panelOpen)throw new Error("Story stage 2 did not open its dialogue");
  const tutorialDrops=sandbox.__IMS.groundBeans.filter(bean=>bean.fromProj);
  if(sandbox.__IMS.projs.length||tutorialDrops.length<3||tutorialDrops.some(bean=>Math.hypot(bean.x+.5-sandbox.__IMS.snake.fx,bean.y+.5-sandbox.__IMS.snake.fy)>8))
    throw new Error("Tutorial spit beans did not settle visibly near the snake");
  console.log("[story prologue stage 2] OK");
  const gate=sandbox.__IMS.mechs.find(m=>m.kind==="gate");
  if(sandbox.__IMS.voidCells.size===0)throw new Error("Tutorial map did not create a solid dark outside");
  let routedGateHits=0;
  if(!sandbox.storyControllerOwns("mechanic",gate)||
     !sandbox.storyControllerInteraction("mechanic",gate,{type:"gate_hit",apply:()=>{routedGateHits++;}})||routedGateHits!==1)
    throw new Error("Story gate interaction was not claimed exactly once");
  sandbox.recordGateHit(gate);sandbox.recordGateHit(gate);
  if(gate.prog!==2)throw new Error("Repeated gate hits were not accumulated");
  console.log("[gate repeated hits] OK");
  sandbox.storyDirector().runtime.enter("wilderness_start");
  if(sandbox.__IMS.groundBeans.length<8)throw new Error("Wilderness did not seed enough beans");
  sandbox.__IMS.groundBeans.length=0;sandbox.updateSpawner(3.1);
  if(sandbox.__IMS.groundBeans.length<1)throw new Error("Wilderness beans did not respawn");
  console.log("[wilderness bean supply] OK");
  const keti=sandbox.__IMS.npcs.find(n=>n.kind==="keti");
  if(!keti)throw new Error("Keti was not spawned in wilderness");
  if(!sandbox.storyControllerOwns("actor",keti)||sandbox.storyControllerInteraction("actor",{kind:"merchant"}))
    throw new Error("Story actor ownership leaked to unrelated NPCs");
  if(!sandbox.storyControllerInteract(keti)||sandbox.storyDirector().runtime.node.id!=="keti_question")
    throw new Error("Keti interaction did not enter the story dialogue");
  if(!sandbox.storyControllerInteract(keti)||sandbox.storyDirector().runtime.node.id!=="keti_question")
    throw new Error("Keti interaction was not claimed by the story controller");
  const chooseKeti=label=>chooseStory(label);
  chooseKeti("是的。");
  chooseKeti("开玩笑的，我不会吃你的");
  chooseKeti("挡在她前面");
  if(sandbox.storyDirector().runtime.node.id!=="wilderness_slimes"||sandbox.__IMS.gameState==="victory")
    throw new Error("Saving Keti incorrectly ended the story");
  console.log("[story Keti continuation] OK");
  sandbox.storyDirector().runtime.enter("wilderness_start");
  const edibleKeti=sandbox.__IMS.npcs.find(n=>n.kind==="keti");
  sandbox.storyControllerInteract(edibleKeti);frames(1);chooseKeti("吃掉");
  if(!sandbox.__IMS.stomach.slots.some(slot=>slot.id==="keti"&&slot.count===1))throw new Error("Swallowed Keti did not enter the stomach");
  const beforeVomit=sandbox.__IMS.snake.len;sandbox.storyDirector().runtime.enter("memory_blur");frames(260);
  const ketiVomit=sandbox.__IMS.projs.find(p=>p.actorId==="keti");if(ketiVomit){ketiVomit.life=0;frames(1);}
  if(sandbox.__IMS.stomach.slots.some(slot=>slot.id==="keti")||!sandbox.__IMS.npcs.some(n=>n.kind==="keti"&&n.unconscious)||sandbox.__IMS.snake.len>=beforeVomit)
    throw new Error("Memory blur did not expel Keti and shorten the snake: before="+beforeVomit+", after="+sandbox.__IMS.snake.len+", projectiles="+sandbox.__IMS.projs.length+", npcs="+sandbox.__IMS.npcs.map(n=>n.kind+":"+n.hp).join(","));
  console.log("[story Keti memory vomit] OK");
  sandbox.startStoryStage();frames(2);
  sandbox.storyDirector().runtime.enter("wilderness_start");
  const doomedKeti=sandbox.__IMS.npcs.find(n=>n.kind==="keti");
  sandbox.dieNPC(doomedKeti);frames(1);
  if(sandbox.storyDirector().runtime.node.id!=="keti_dead")throw new Error("Keti death before dialogue left the story stuck");
  console.log("[story early actor death fallback] OK");
  const corpseLen=sandbox.__IMS.snake.len;chooseStory("吃掉尸体");frames(1);
  if(sandbox.__IMS.stomach.slots.find(slot=>slot.id==="ketiCorpse").count!==1||sandbox.__IMS.snake.len!==corpseLen+2)
    throw new Error("Keti corpse was not added to the stomach with body length");
  fire({key:"e",code:"KeyE",preventDefault(){},repeat:false},"keydown");fire({key:"e",code:"KeyE",preventDefault(){}},"keyup");
  if(sandbox.__IMS.stomach.selected.id!=="ketiCorpse")throw new Error("Stomach next-slot input did not select Keti corpse");
  fire({key:"j",code:"KeyJ",preventDefault(){},repeat:false},"keydown");frames(2);fire({key:"j",code:"KeyJ",preventDefault(){}},"keyup");
  if(sandbox.__IMS.stomach.slots.some(slot=>slot.id==="ketiCorpse")||sandbox.__IMS.snake.len!==corpseLen||!sandbox.__IMS.projs.some(p=>p.payloadId==="ketiCorpse"))
    throw new Error("Selected Keti corpse was not launched and consumed");
  sandbox.__IMS.projs.find(p=>p.payloadId==="ketiCorpse").life=0;frames(1);
  const corpseDrop=sandbox.__IMS.stomachPickups[0];if(!corpseDrop)throw new Error("Launched corpse did not return as a world pickup");
  sandbox.__IMS.snake.fx=corpseDrop.x;sandbox.__IMS.snake.fy=corpseDrop.y;sandbox.pickUps();
  if(!sandbox.__IMS.stomach.slots.some(slot=>slot.id==="ketiCorpse"&&slot.count===1)||sandbox.__IMS.snake.len!==corpseLen+2)throw new Error("Corpse world pickup could not be eaten back into the stomach");
  console.log("[story stomach corpse pickup + select + launch] OK");
  sandbox.startStoryStage();frames(2);
  if(sandbox.storyDirector().runtime.node.id!=="wilderness_keti_wait"||!sandbox.__IMS.npcs.some(n=>n.kind==="keti"))
    throw new Error("Story map checkpoint retry did not restore the wilderness entry state");
  if(sandbox.__IMS.stomach.slots.some(slot=>slot.id==="ketiCorpse"&&slot.count>0))throw new Error("Story checkpoint retry kept post-checkpoint stomach items");
  console.log("[story map checkpoint retry] OK");
  sandbox.storyDirector().runtime.enter("chapter1_start");frames(2);
  if(sandbox.storyDirector().runtime.node.id!=="chapter1_explore")throw new Error("Chapter one did not enter free exploration");
  const sword=sandbox.__IMS.stomachPickups.find(item=>item.storyId==="forest_sword");
  const ajie=sandbox.__IMS.npcs.find(n=>n.storyId==="ajie"),lisi=sandbox.__IMS.npcs.find(n=>n.storyId==="lisi");
  if(!sword||!ajie||!lisi||ajie.damageable!==false||lisi.damageable!==false||ajie.speed!==2)throw new Error("Chapter one forest actors, speed, or sword were not spawned correctly");
  if(sandbox.projectileDamage({owner:1,payload:{damageMult:2}})!==sandbox.beanDamage(1)*2||sandbox.projectileDamage({owner:1,payload:{damage:2}})!==2)throw new Error("Chapter one projectile damage descriptors were not applied");
  for(let i=0;i<10;i++)sandbox.IMS_STORY_API.engineEvent("beanEaten",{});
  if(sandbox.storyDirector().runtime.node.id!=="chapter1_hunger")throw new Error("Chapter hunger OR counter did not trigger at ten eaten beans");
  chooseStory("继续探索");
  sandbox.storyControllerInteraction("item",sword);frames(1);
  if(sandbox.storyDirector().runtime.node.id!=="chapter1_sword")throw new Error("Sword interaction did not open its story node");
  chooseStory("吃掉铁剑");chooseStory("离开");
  if(!sandbox.__IMS.stomach.slots.some(slot=>slot.id==="ironSword"&&slot.count===1))throw new Error("Sword was not stored in the stomach");
  sandbox.storyControllerInteract(ajie);frames(1);chooseStory("离开");
  if(sandbox.storyDirector().runtime.node.id!=="chapter1_explore")throw new Error("Leaving the first encounter did not return to exploration");
  sandbox.storyControllerInteract(ajie);frames(1);chooseStory("吃掉丽丝");
  if(!sandbox.__IMS.stomach.slots.some(slot=>slot.id==="lisi"&&slot.count===1))throw new Error("Swallowed Lisi was not stored as an actor item");
  chooseStory("吐出丽丝");
  const lisiProjectile=sandbox.__IMS.projs.find(p=>p.actorId==="lisi");
  if(!lisiProjectile)throw new Error("Released Lisi did not become a thrown actor projectile");
  lisiProjectile.life=0;frames(1);chooseStory("离开");
  const releasedLisi=sandbox.__IMS.npcs.find(n=>n.storyId==="lisi");
  if(!releasedLisi||!releasedLisi.unconscious||releasedLisi.interactable!==false)throw new Error("Released Lisi was not left unconscious and non-interactive");
  sandbox.startStoryStage();frames(2);
  const combatAjie=sandbox.__IMS.npcs.find(n=>n.storyId==="ajie");
  sandbox.storyControllerInteract(combatAjie);frames(1);chooseStory("吃掉丽丝");chooseStory("迎战");frames(1);
  if(!combatAjie.hostile||combatAjie.damageable!==true)throw new Error("Ajie combat did not enable hostile damage state");
  combatAjie.hp=0;frames(2);
  if(sandbox.storyDirector().runtime.node.id!=="chapter1_ajie_downed_wait"||!combatAjie.downed)throw new Error("Ajie did not enter protected downed interaction state");
  sandbox.storyControllerInteract(combatAjie);frames(1);chooseStory("离开");
  sandbox.startStoryStage();frames(2);
  const questAjie=sandbox.__IMS.npcs.find(n=>n.storyId==="ajie");
  sandbox.storyDirector().runtime.state.update(state=>{state.flags.findAjianAccepted=true;},"test_quest");
  sandbox.storyControllerInteract(questAjie);frames(1);
  if(sandbox.storyDirector().runtime.node.id!=="chapter1_explore"||!els["questHud"].textContent.includes("寻找阿见"))throw new Error("Accepted quest repeated dialogue or lacked its HUD objective");
  sandbox.__IMS.projs.push({owner:1,payloadId:"ironSword",payload:{damageMult:2},x:questAjie.x,y:questAjie.y,vx:1,vy:0,life:3,grace:0,trail:[],streak:0});
  sandbox.storyDirector().runtime.state.update(state=>{state.flags.findAjianAccepted=false;},"test_sword_notice");sandbox.updateProjs(.01);frames(1);
  if(!sandbox.storyDirector().runtime.node.id.startsWith("chapter1_sword_recognized"))throw new Error("Sword projectile hit did not trigger the recognition dialogue");
  sandbox.closePanel();sandbox.startStoryStage();frames(2);
  const weightX=sandbox.__IMS.snake.fx;
  sandbox.addStomachItem("ajie",1,"test");sandbox.addStomachItem("lisi",1,"test");sandbox.addStomachItem("ironSword",1,"test");
  sandbox.updateHud();
  if(sandbox.stomachWeight()!==8||!sandbox.isOverweight()||els["weight"].textContent!=="8/6")throw new Error("Carry weight or overweight HUD was not applied");
  sandbox.updateMovement(.25);
  if(sandbox.__IMS.snake.fx!==weightX)throw new Error("Overweight snake was still able to move");
  sandbox.dropStoryItem("ironSword");sandbox.updateMovement(.25);
  if(sandbox.__IMS.snake.fx===weightX)throw new Error("Snake did not resume movement after unloading to capacity");
  sandbox.startStoryStage();frames(2);
  const collisionTarget=sandbox.__IMS.enemies[0],collisionHp=collisionTarget.hp,impact=sandbox.beanDamage(1);
  const actorProjectile={owner:1,payloadId:"ajie",payload:{weight:3},actorId:"ajie",actorHp:8,x:collisionTarget.x,y:collisionTarget.y,vx:1,vy:0,life:3,grace:0,trail:[],streak:0};
  sandbox.__IMS.projs.push(actorProjectile);sandbox.updateProjs(.01);
  if(collisionTarget.hp!==collisionHp-impact||actorProjectile.actorHp!==8-impact)throw new Error("Thrown actor collision did not deal equal damage to both sides");
  const wallActor={owner:1,payloadId:"ajie",payload:{weight:3},actorId:"ajie",actorHp:8,x:.05,y:24.5,vx:-2,vy:0,life:3,grace:0,trail:[],streak:0};
  sandbox.__IMS.projs.push(wallActor);sandbox.updateProjs(.02);
  if(wallActor.actorHp!==8-impact)throw new Error("Thrown actor did not take one-bean damage from a wall collision");
  sandbox.startStoryStage();frames(2);
  const stackSword=sandbox.__IMS.stomachPickups.find(item=>item.storyId==="forest_sword"),swordAjie=sandbox.__IMS.npcs.find(n=>n.storyId==="ajie");
  sandbox.storyControllerInteraction("item",stackSword);frames(1);chooseStory("吃掉铁剑");chooseStory("离开");
  sandbox.storyControllerInteract(swordAjie);frames(1);chooseStory("吐出铁剑");
  if(sandbox.__IMS.stomach.slots.some(slot=>slot.id==="ironSword")||sandbox.__IMS.stomachPickups.filter(item=>item.id==="ironSword").length!==1)
    throw new Error("Sword dialogue duplicated the sword instead of consuming one inventory item");
  console.log("[chapter one forest + hunger + sword + encounter] OK");
  els["pauseHome"].onclick();
  frames(2);
  els["ovBtn3"].onclick();
  frames(120);
  console.log("[sandbox 120 frames] OK");
  fire({key:"w",preventDefault(){},repeat:false},"keydown");
  frames(200);
  console.log("[sandbox move 200 frames] OK");
  const sandboxFire="j";
  fire({key:sandboxFire,code:"KeyJ",preventDefault(){},repeat:false},"keydown");
  frames(100);
  console.log("[sandbox stance fire 100 frames] OK");
  fire({key:"f",preventDefault(){},repeat:false},"keydown");
  frames(60);
  console.log("[sandbox node place 60 frames] OK");
  els["pauseHome"].onclick();
  frames(2);
  els["ovBtn2"].onclick();
  frames(600);

  sandbox.__IMS.closePanel();
  sandbox.__IMS.snake.fx=-.5;sandbox.__IMS.snake.fy=-.5;
  fire({key:"w",code:"KeyW",preventDefault(){},repeat:false},"keydown");frames(40);fire({key:"w",code:"KeyW",preventDefault(){}},"keyup");
  if(sandbox.__IMS.gameState!=="dead")throw new Error("Tutorial death flow did not reach retry screen");
  els["ovBtn"].onclick();frames(2);
  if(!sandbox.__IMS.panelOpen||sandbox.__IMS.gameState!=="play")throw new Error("Tutorial retry did not reopen its section dialog");
  sandbox.__IMS.closePanel();els["pauseHome"].onclick();frames(2);
  console.log("[tutorial death + retry] OK");
}catch(err){
  console.error("RUNTIME ERROR:",err.stack);
  process.exit(1);
}
console.log("ALL SMOKE TESTS PASSED");
