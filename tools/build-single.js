#!/usr/bin/env node
/* 单文件打包：将 prototype 的所有外部脚本内联进一个 HTML
 * 用法：node tools/build-single.js  →  输出 dist/IM-SNAKE.html */
const fs=require("fs"),path=require("path");
const srcPath=path.resolve(__dirname,"..","prototype","index.html");
const outPath=path.resolve(__dirname,"..","dist","IM-SNAKE.html");
let html=fs.readFileSync(srcPath,"utf8");
html=html.replace(/<script src="([^"]+)"><\/script>/g,(m,p)=>{
  const f=path.join(path.dirname(srcPath),p);
  const code=fs.readFileSync(f,"utf8");
  console.log("inline:",p);
  return "<script>\n"+code+"\n</script>";
});
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,html);
const kb=(fs.statSync(outPath).size/1024).toFixed(1);
console.log("built:",outPath,"("+kb+" KB)");
