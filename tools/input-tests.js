#!/usr/bin/env node
const fs=require("fs"),vm=require("vm"),path=require("path");
const code=fs.readFileSync(path.resolve(__dirname,"..","prototype","input.js"),"utf8");
const box={globalThis:{}};vm.createContext(box);vm.runInContext(code,box);
const I=box.globalThis.InputMap;
function eq(actual,expected,label){if(actual!==expected)throw new Error(label+": expected "+expected+", got "+actual);}
eq(I.actionFor(1,{code:"KeyW"}),"up","P1 WASD");
eq(I.actionFor(1,{key:"ArrowLeft"}),"left","P1 arrows fallback");
eq(I.actionFor(1,{key:" "}),"fire","synthetic mobile fire");
eq(I.actionFor(1,{key:"Shift"}),"cut","synthetic mobile cut");
eq(I.actionFor(2,{code:"Numpad0"}),"fire","P2 fire");
eq(I.actionFor(2,{code:"KeyW"}),null,"P2 isolation");
console.log("INPUT ACTION TESTS PASSED");
