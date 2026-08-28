#!/usr/bin/env node
/* 冒烟测试：无头跑通 加载→闯关→射击→布点→沙盒→教学 全链路
 * 用法：node tools/smoke.js prototype/index.html   （必须全绿才允许提交） */
const fs=require("fs"),path=require("path");
const args=process.argv.slice(2),coopMode=args.includes("--coop");
const htmlPath=path.resolve(args.find(a=>!a.startsWith("--"))||"prototype/index.html");
if(!fs.existsSync(htmlPath)){console.error("找不到 "+htmlPath);process.exit(1);}
const html=fs.readFileSync(htmlPath,"utf8");
let code="";
const re=/<script src="([^"]+)"><\/script>/g;let m;
while((m=re.exec(html))){
  const p=path.join(path.dirname(htmlPath),m[1]);
  if(!fs.existsSync(p)){console.log("[skip missing] "+m[1]);continue;}
  code+=fs.readFileSync(p,"utf8")+"\n;\n";
}
let inline="";
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) inline+=m[1]+"\n;\n";
code+=inline;

function mkEl(id){
  return {
    id, style:{}, textContent:"", innerHTML:"",
    classList:{add(){},remove(){},contains(){return false}},
    children:[],
    appendChild(c){this.children.push(c);return c},
    querySelector(){return {textContent:""}},
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
  body:mkEl("body"),
};
let storedControls=coopMode?JSON.stringify({playerCount:2,bindings:{1:{up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD",fire:"KeyJ",cut:"KeyK",node:"KeyF"},2:{up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",fire:"Numpad0",cut:"Numpad1",node:"Numpad2"}}}):null;
global.localStorage={getItem(){return storedControls},setItem(k,v){storedControls=v}};
const listeners={};
global.addEventListener=(ev,fn)=>{(listeners[ev]=listeners[ev]||[]).push(fn)};
let rafCb=null,simTime=0;
global.requestAnimationFrame=cb=>{rafCb=cb};
global.performance={now:()=>simTime};
const fire=(ev,name)=>{(listeners[name]||[]).forEach(f=>f(ev));};
const frames=n=>{for(let i=0;i<n;i++){simTime+=16.7;const cb=rafCb;rafCb=null;if(cb)cb(simTime);}};

try{
  new Function("document","addEventListener","performance","requestAnimationFrame",code)(
    document,addEventListener,performance,requestAnimationFrame);
  console.log("[load] OK");
  els["ovBtn5"].onclick();
  if(!els["pickList"].children.length)throw new Error("Boss challenge selection did not open");
  els["pickList"].children[0].onclick();frames(5);
  if(!global.__IMS.alive)throw new Error("Boss spawn is unsafe");
  if(coopMode&&!global.CoopMode.state.p.alive)throw new Error("P2 boss spawn is unsafe");
  els["pauseHome"].onclick();frames(2);
  frames(5);
  if(coopMode){
    els["ovBtn3"].onclick();frames(30);
    const coop=global.CoopMode&&global.CoopMode.state,p=coop&&coop.p;
    if(!coop||!coop.enabled||!p||!p.alive)throw new Error("P2 was not created");
    const y0=p.snake.fy;fire({key:"ArrowDown",code:"ArrowDown",preventDefault(){},repeat:false},"keydown");frames(25);fire({key:"ArrowDown",code:"ArrowDown",preventDefault(){}},"keyup");
    if(!(p.snake.fy>y0+.2))throw new Error("P2 movement input did not move the player");
    const len0=p.snake.len;fire({key:"0",code:"Numpad0",preventDefault(){},repeat:false},"keydown");frames(8);fire({key:"0",code:"Numpad0",preventDefault(){}},"keyup");
    if(!(p.snake.len<len0))throw new Error("P2 fire did not consume body ammo");
    const charge0=p.charges;fire({key:"2",code:"Numpad2",preventDefault(){},repeat:false},"keydown");
    if(p.charges!==charge0-1)throw new Error("P2 node placement did not consume its own charge");
    frames(20);console.log("[coop P2 move + fire + node] OK");
    const runningStat=els["stat"].textContent;global.CoopMode.defeat("P2 test down");frames(70);
    if(p.alive||els["stat"].textContent===runningStat)throw new Error("P1 did not continue after P2 went down");
    console.log("[coop one player down + teammate continues] OK");els["pauseHome"].onclick();frames(2);
  }
  els["ovBtn"].onclick();
  frames(30);
  console.log("[campaign start L1 + 30 frames] OK");
  fire({key:"w",preventDefault(){},repeat:false},"keydown");
  frames(200);
  console.log("[L1 move 200 frames] OK");
  fire({key:" ",preventDefault(){},repeat:false},"keydown");
  frames(100);
  console.log("[stance fire 100 frames] OK");
  fire({key:"f",preventDefault(){},repeat:false},"keydown");
  frames(60);
  console.log("[node place 60 frames] OK");
  els["ovBtn3"].onclick();
  frames(120);
  console.log("[sandbox 120 frames] OK");
  els["ovBtn2"].onclick();
  frames(600);
  global.__IMS.closePanel();
  global.__IMS.snake.fy=.5;
  fire({key:"w",code:"KeyW",preventDefault(){},repeat:false},"keydown");frames(40);fire({key:"w",code:"KeyW",preventDefault(){}},"keyup");
  if(global.__IMS.gameState!=="dead")throw new Error("Tutorial death flow did not reach retry screen");
  els["ovBtn"].onclick();frames(2);
  if(!global.__IMS.panelOpen||global.__IMS.gameState!=="play")throw new Error("Tutorial retry did not reopen its section dialog");
  global.__IMS.closePanel();els["pauseHome"].onclick();frames(2);
  console.log("[tutorial death + retry] OK");
}catch(err){
  console.error("RUNTIME ERROR:",err.stack);
  process.exit(1);
}
console.log("ALL SMOKE TESTS PASSED");
