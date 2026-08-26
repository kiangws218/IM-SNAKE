#!/usr/bin/env node
const fs=require("fs"),vm=require("vm"),path=require("path");
const code=fs.readFileSync(path.resolve(__dirname,"..","prototype","player-core.js"),"utf8");
const box={globalThis:{},Set,Math};vm.createContext(box);vm.runInContext(code,box);
const P=box.globalThis.PlayerCore,key=(x,y)=>y*100+x,p=P.create(2,{x:8.5,y:6.5,len:5});
P.computeSegments(p,1,key);
if(p.segPos.length!==5)throw new Error("segment count changed");
if(!p.occSet.has(key(8,6)))throw new Error("head occupancy missing");
P.queueDirection(p,{x:0,y:-1});P.applyQueue(p);
if(p.dir.x!==0||p.dir.y!==-1)throw new Error("valid turn rejected");
P.queueDirection(p,{x:0,y:1});P.applyQueue(p);
if(p.dir.y!==-1)throw new Error("180-degree reversal accepted");
p.segPos.push({x:p.snake.fx+.1,y:p.snake.fy});
if(!P.selfBite(p,p.snake.fx,p.snake.fy,.62,5))throw new Error("self collision missed");
console.log("PLAYER CORE TESTS PASSED");
