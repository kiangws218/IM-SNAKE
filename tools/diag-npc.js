const fs=require("fs"),path=require("path");
const dir=path.resolve("prototype");
let code="";
for(const m of fs.readFileSync(path.join(dir,"index.html"),"utf8").matchAll(/<script src="([^"]+)"><\/script>/g))
  code+=fs.readFileSync(path.join(dir,m[1]),"utf8")+"\n;\n";
for(const m of fs.readFileSync(path.join(dir,"index.html"),"utf8").matchAll(/<script>([\s\S]*?)<\/script>/g))
  code+=m[1]+"\n;\n";
const els={};
function mkEl(id){
  const ctx=new Proxy({},{get:(t,p)=>p in t?t[p]:(...a)=>({width:0,height:0}),set:()=>true});
  return {id,style:{},textContent:"",innerHTML:"",
    classList:{add(){},remove(){},contains(){return false}},
    children:[],appendChild(c){this.children.push(c);return c},
    querySelector(){return{textContent:""}},
    querySelectorAll(){return[]},
    lastElementChild:{textContent:""},
    setAttribute(){},getContext(){return ctx;},
    onclick:null};
}
const document={getElementById(id){if(!els[id])els[id]=mkEl(id);return els[id];},
  createElement(t){return mkEl("<"+t+">");},body:mkEl("body"),
  querySelector(){return null},querySelectorAll(){return[]},
  addEventListener(){},fullscreenElement:null,head:mkEl("head")};
const listeners={};
global.window=global;
global.document=document;
global.addEventListener=(ev,fn)=>{(listeners[ev]=listeners[ev]||[]).push(fn)};
global.requestAnimationFrame=cb=>{rafCb=cb};
let rafCb=null,simTime=0;
global.performance={now:()=>simTime};
global.navigator={maxTouchPoints:0};
global.localStorage={_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}};
global.screen={orientation:{}};
global.location={reload(){}};
const fire=(ev,name)=>{(listeners[name]||[]).forEach(f=>f(ev))};
const frames=n=>{for(let i=0;i<n;i++){simTime+=16.7;const cb=rafCb;rafCb=null;if(cb)cb(simTime);}};
try{
  new Function("document","addEventListener","performance","requestAnimationFrame","window","navigator","localStorage","screen",code)(
    document,addEventListener,performance,()=>{},global,global.navigator,global.localStorage,global.screen);
  console.log("[load] OK");
  els["ovBtn3"].onclick();
  frames(5);
  // 找可蒂并传送到蛇头旁
  const keti=window.__IMS.npcs.find(n=>n.kind==="keti");
  if(!keti){console.error("no keti");process.exit(1);}
  keti.x=window.__IMS.snake.fx+0.5;keti.y=window.__IMS.snake.fy;
  frames(10);
  const sn=window.__IMS.snake;
  console.log("[after 10 frames] snake.fx:",sn.fx.toFixed(2),"| keti.dist:",Math.hypot(keti.x-sn.fx,keti.y-sn.fy).toFixed(2),"| keti.inside:",keti.inside);
  console.log("[gate] gameState:",window.__IMS.gameState,"| paused:",window.__IMS.paused,"| freeze:",window.__IMS.freeze,"| alive:",window.__IMS.alive,"| moveLock:",window.__IMS.moveLock);
  console.log("[hud.stat]:",JSON.stringify(els["stat"]?els["stat"].textContent:"<none>"));
  console.log("[proximity frames] panelOpen:",window.__IMS.panelOpen,"freeze:",window.__IMS.freeze);
  const p=els["npcPanel"];
  console.log("panel display:",p&&p.style.display,"| innerHTML len:",p? p.innerHTML.length:-1);
  console.log("npcSay text:",JSON.stringify(els["npcSay"]?els["npcSay"].textContent:"<no el>"));
  console.log("npcName text:",JSON.stringify(els["npcName"]?els["npcName"].textContent:"<no el>"));
  const opts=els["npcOpts"];
  console.log("npcOpts children:",opts?opts.children.length:-1);
  for(const[k,e]of Object.entries(els)){
    const t=String(e.textContent||"");
    if(t.startsWith("["))console.log("BANNER:",k,"→",t.split("\n")[0],"|",t.split("\n")[1]||"");
  }
}catch(e){
  console.error("ERROR:",e.message);
  console.error(e.stack.split("\n").slice(0,8).join("\n"));
}
