#!/usr/bin/env node
/* 冒烟测试：无头跑通 加载→闯关→射击→布点→沙盒→教学 全链路
 * 用法：node tools/smoke.js prototype/index.html   （必须全绿才允许提交） */
const fs=require("fs"),path=require("path");
const htmlPath=path.resolve(process.argv[2]||"prototype/index.html");
if(!fs.existsSync(htmlPath)){console.error("找不到 "+htmlPath);process.exit(1);}
const html=fs.readFileSync(htmlPath,"utf8");
let code="";
const re=/<script src="([^"]+)"><\/script>/g;let m;
while((m=re.exec(html))){
  const p=path.join(path.dirname(htmlPath),m[1]);
  if(!fs.existsSync(p)){console.log("[skip missing] "+m[1]);continue;}
  code+=fs.readFileSync(p,"utf8")+"\n;\n";
}
const inlineMatch=html.match(/<script>([\s\S]*?)<\/script>/);
code+=inlineMatch?inlineMatch[1]:"";

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
  frames(5);
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
  console.log("[tutorial 600 frames] OK");
}catch(err){
  console.error("RUNTIME ERROR:",err.stack);
  process.exit(1);
}
console.log("ALL SMOKE TESTS PASSED");
