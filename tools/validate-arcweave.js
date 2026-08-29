"use strict";

const fs=require("fs");
const input=process.argv[2];
if(!input){
  console.error("Usage: node tools/validate-arcweave.js");
  process.exit(2);
}
const graph=JSON.parse(fs.readFileSync(input,"utf8"));
const elements=graph.elements||{};
const connections=graph.connections||{};
const ids=new Set(Object.keys(elements));
const errors=[],warnings=[];
const outgoing=new Map();
for(const [id,element] of Object.entries(elements)){
  const list=[];
  for(const connectionId of element.outputs||[]){
    const connection=connections[connectionId];
    if(!connection){errors.push(id+" references missing connection "+connectionId);continue;}
    if(connection.sourceid!==id)errors.push(connectionId+" source mismatch: "+connection.sourceid+" != "+id);
    if(!ids.has(connection.targetid))errors.push(connectionId+" targets missing element "+connection.targetid);
    list.push(connection.targetid);
  }
  outgoing.set(id,list);
}
for(const [id,connection] of Object.entries(connections)){
  if(!ids.has(connection.sourceid))errors.push(id+" source element is missing: "+connection.sourceid);
  if(!ids.has(connection.targetid))errors.push(id+" target element is missing: "+connection.targetid);
}
const start=graph.startingElement;
if(!ids.has(start))errors.push("startingElement is missing: "+start);
const visited=new Set(),queue=start?[start]:[];
while(queue.length){
  const id=queue.shift();
  if(visited.has(id))continue;
  visited.add(id);
  for(const target of outgoing.get(id)||[])if(!visited.has(target))queue.push(target);
}
for(const id of ids)if(!visited.has(id))warnings.push("unreachable from startingElement: "+id);
console.log("elements="+ids.size+" connections="+Object.keys(connections).length+" reachable="+visited.size);
warnings.forEach(item=>console.log("[warn] "+item));
if(errors.length){
  errors.forEach(item=>console.error("[error] "+item));
  process.exitCode=1;
}else{
  console.log("GRAPH OK");
}
