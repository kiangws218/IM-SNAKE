"use strict";

const fs=require("fs");
const input=process.argv[2];
const output=process.argv[3]||"prototype/prologue.yarn";
if(!input){
  console.error("Usage: node tools/generate-prologue-yarn.js");
  process.exit(2);
}
const project=JSON.parse(fs.readFileSync(input,"utf8"));
const names={
"3ab85262-d563-46b7-9d8d-2f0d419f7f23":"Start",
"a7b8bb72-cfce-4368-9c0f-8da062be4c6e":"Prologue_Tutorial1",
"034cfd9e-d986-4c27-925d-c5a18487b9c6":"Prologue_Dialogue1",
"261c75d0-4046-4f2f-b054-2bf777774b9b":"Prologue_Tutorial2",
"ef72a48c-a1db-4384-8e45-92ecc3196ee2":"Prologue_Dialogue2",
"7feeae65-5e39-4cb2-8da3-8c7877cd8ab1":"Prologue_Dialogue3",
"3a8ecaa6-7ec4-4f37-90db-bd164babe2c5":"Prologue_Dialogue4",
"6bc75e2d-f9ef-442d-9d90-9347dc088d81":"Prologue_ContinuousSnake",
"a1638596-78f7-4be3-970c-93950b66ff42":"Map2_Wilderness",
"49ae05e1-c9ec-4bd6-bd0d-b1c69e3893c5":"Keti_Question",
"85fa8087-be4c-4933-beff-02d2a65a3b22":"Keti_Crying",
"8603f54c-2768-44d5-822f-31aca338630e":"Keti_Eaten",
"df6d5c0b-bed7-4a27-852e-7b2188c90c4b":"FreeExploration",
"c85f634e-20fb-4604-b1c5-142c7c85adae":"Keti_Reassured",
"6df11ec7-d84a-456c-921a-03353d1644ed":"Keti_EatenAfterCrying",
"bf633ffb-a583-4ac8-bb64-dadf67fcff3c":"Keti_LeftBehind",
"360688cc-7492-422a-bf24-65ee409e7808":"Keti_SlimeEncounter",
"6f11e12a-a337-436d-b332-f27a7ea91755":"Keti_Tutorial3",
"f646b76c-370d-413e-9fa8-efd1d940fe6e":"Keti_Saved",
"f505841f-ee2c-42f3-bd6b-8ae7555ead18":"Keti_Dead",
"3da1f651-fc1f-44d9-90d1-f3b9673e12ea":"Road_Tutorial3",
"e61c47b5-a4f5-4121-a8a5-642fc661cdf9":"InputPlayerName",
"5ad0b97c-edd8-4011-84ae-84f6837ee48e":"Keti_EatenAfterDeath",
"98f1bcd9-f50c-409b-8ffe-51441d34f136":"MemoryBlur",
"94cc7a9e-81c4-4caf-9cf9-3d27785c45d7":"Road_SlimeEncounter",
"3bf88674-ad23-439d-83ef-1f704ffccc5e":"Chapter1_Start",
"e9c7b701-5839-4608-845a-94ff126edc01":"Chapter1_Level1",
"f2b48594-308c-4bbc-8630-9b4407dc0e37":"Woman_Question",
"f03dcb36-1cad-4e96-8838-f58cf881565e":"Woman_DaughterEatenRequest",
"a2436fff-6ba8-48e0-ac94-ef29736ba7b2":"Woman_RequestHelp",
"18da6fe8-a4e2-40d4-878b-632c2a0e1f98":"Woman_Eaten",
"122af3fb-62dc-4be8-9749-4150ed585f16":"Woman_Refuse"
};
function clean(value){
  return String(value||"").replace(/<p>/gi,"").replace(/<\/p>/gi,"\n").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]*>/g,"").replace(/\n{3,}/g,"\n\n").trim();
}
function escapeArg(value){
  return String(value||"").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\r?\n/g," ");
}
function nodeName(id){return names[id]||("Node_"+id.slice(0,8));}
const out=[
  "// IM-SNAKE Yarn-compatible narrative graph",
  "// Generated from Arcweave project.json.",
  "// Every Arcweave element keeps its original ID in tags.",
  "// Edge labels are preserved as transition metadata.",
  "// They are not automatically treated as player choices.",
  ""
];
for(const [id,element] of Object.entries(project.elements)){
  const title=nodeName(id);
  const type=element.title&&clean(element.title)?"dialogue":"event";
  out.push("title: "+title);
  out.push("tags: arcweave:"+id+", type:"+type);
  out.push("---");
  const content=clean(element.content);
  if(content)out.push(content);
  const edges=(element.outputs||[]).map(connId=>project.connections[connId]).filter(Boolean);
  if(edges.length===0){
    out.push("// Terminal node: no outgoing Arcweave connection.");
  }else if(edges.length===1){
    const edge=edges[0],label=clean(edge.label);
    if(label)out.push("// Transition condition: "+label);
    out.push("<<jump "+nodeName(edge.targetid)+">>");
  }else{
    out.push("// Multiple outgoing edges; the runtime must classify their conditions.");
    for(const edge of edges){
      out.push('<<transition target="'+escapeArg(nodeName(edge.targetid))+'" condition="'+escapeArg(clean(edge.label)||"unlabeled")+'">>');
    }
  }
  out.push("===","");
}
fs.writeFileSync(output,out.join("\n"),"utf8");
for(const file of ["prototype/patch_test.txt","prototype/utf8_test.txt"]){
  try{fs.unlinkSync(file);}catch(error){}
}
console.log("generated "+output+" nodes="+Object.keys(project.elements).length+" connections="+Object.keys(project.connections).length);
