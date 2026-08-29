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
  return {
    id, style:{}, textContent:"", innerHTML:"",
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    children:[],
    appendChild(c){this.children.push(c);return c}, remove(){}, click(){if(this.onclick)this.onclick()},
    setAttribute(){},
    querySelector(){return {textContent:""}}, querySelectorAll(){return this.children},
    getContext(){return ctx2d},
    onclick:null,
  };
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
let storedControls=coopMode?JSON.stringify({playerCount:2,bindings:{1:{up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD",fire:"KeyJ",cut:"KeyK",node:"KeyF"},2:{up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",fire:"Numpad0",cut:"Numpad1",node:"Numpad2"}}}):null;
global.localStorage={getItem(){return storedControls},setItem(k,v){storedControls=v}};
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
  if(!tutorialGate||tutorialGate.x!==48||tutorialGate.y!==16||!tutorialExit||tutorialExit.rect[0]!==47||tutorialExit.rect[1]!==14)
    throw new Error("Tutorial gate/exit was not moved to the upper-right");
  els["ovBtn5"].onclick();
  if(!els["pickList"].children.length)throw new Error("Boss challenge selection did not open");
  els["pickList"].children[0].onclick();frames(180);
  if(!sandbox.__IMS.alive)throw new Error("Boss spawn is unsafe");
  if(coopMode&&!sandbox.CoopMode.state.p.alive)throw new Error("P2 boss spawn is unsafe");
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
  fire({key:"r",code:"KeyR",preventDefault(){},repeat:false},"keydown");
  frames(2);
  if(sandbox.__IMS.gameState!=="play"||!els["stat"].textContent.includes("序章"))throw new Error("Story mode did not start");
  console.log("[story prologue stage 1] OK");
  frames(360);
  if(!sandbox.__IMS.panelOpen)throw new Error("Story stage 1 did not open its dialogue");
  fire({key:"ArrowRight",code:"ArrowRight",preventDefault(){},repeat:false},"keydown");
  fire({key:"d",code:"KeyD",preventDefault(){},repeat:false},"keydown");
  fire({key:"r",code:"KeyR",preventDefault(){},repeat:false},"keydown");
  if(!sandbox.__IMS.panelOpen||sandbox.__IMS.gameState!=="play")throw new Error("Dialogue was closed by an unrelated key");
  console.log("[story dialogue input lock] OK");
  els["npcOpts"].children[0].onclick();
  frames(2);
  frames(200);
  const storyFire=coopMode?"j":" ";
  fire({key:storyFire,code:coopMode?"KeyJ":"Space",preventDefault(){},repeat:false},"keydown");
  frames(190);
  fire({key:storyFire,code:coopMode?"KeyJ":"Space",preventDefault(){}},"keyup");
  if(!sandbox.__IMS.panelOpen)throw new Error("Story stage 2 did not open its dialogue");
  console.log("[story prologue stage 2] OK");
  sandbox.storyDirector().runtime.enter("wilderness_start");
  const keti=sandbox.__IMS.npcs.find(n=>n.kind==="keti");
  if(!keti)throw new Error("Keti was not spawned in wilderness");
  if(!sandbox.storyControllerInteract(keti)||sandbox.storyDirector().runtime.node.id!=="keti_question")
    throw new Error("Keti interaction did not enter the story dialogue");
  if(!sandbox.storyControllerInteract(keti)||sandbox.storyDirector().runtime.node.id!=="keti_question")
    throw new Error("Keti interaction was not claimed by the story controller");
  const chooseKeti=label=>{const b=[...els["npcOpts"].children].reverse().find(x=>x.textContent===label);if(!b)throw new Error("Keti choice not found: "+label);b.onclick();frames(1);};
  chooseKeti("是的。");
  chooseKeti("开玩笑的，我不会吃你的");
  if(sandbox.storyDirector().runtime.node.id!=="wilderness_slimes"||sandbox.__IMS.gameState==="victory")
    throw new Error("Saving Keti incorrectly ended the story");
  console.log("[story Keti continuation] OK");
  els["pauseHome"].onclick();
  frames(2);
  els["ovBtn3"].onclick();
  frames(120);
  console.log("[sandbox 120 frames] OK");
  fire({key:"w",preventDefault(){},repeat:false},"keydown");
  frames(200);
  console.log("[sandbox move 200 frames] OK");
  const sandboxFire=coopMode?"j":" ";
  fire({key:sandboxFire,code:coopMode?"KeyJ":"Space",preventDefault(){},repeat:false},"keydown");
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
