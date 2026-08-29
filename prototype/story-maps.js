"use strict";
(function(root){
const TYPES=Object.freeze({TUTORIAL:"prologue_tutorial",WILDERNESS:"prologue_wilderness"});
const STORY_MAPS={
[TYPES.TUTORIAL]:{id:TYPES.TUTORIAL,name:"教学地图",kind:"story",spawn:{x:8.5,y:24.5,dir:{x:1,y:0},clearForwardSeconds:3},obstacles:[[4,16,51,1],[4,32,51,1],[4,17,1,15],[55,17,1,6],[55,26,1,6]],beans:[[16,24],[24,24],[32,24],[42,24],[48,24],[51,24]],gates:[{id:"tutorial_fragile_gate",kind:"fragile_gate",x:48,y:16,w:3,h:1,need:3,breakEvent:"map.fragile_gate_broken"}],exits:[{id:"tutorial_exit",rect:[47,14,5,3],requiresGate:"tutorial_fragile_gate",targetMap:TYPES.WILDERNESS,targetSpawn:"wilderness_entry"}],npcs:[],enemySpawns:[],rules:{allowFreeSnakeAfterTimeout:true,exitRequiresGate:true}},
[TYPES.WILDERNESS]:{id:TYPES.WILDERNESS,name:"荒野",kind:"story",spawn:{x:7.5,y:24.5,dir:{x:1,y:0},clearForwardSeconds:3},obstacles:[[4,12,60,1],[4,36,60,1],[4,12,1,11],[4,28,1,8],[63,12,1,25],[20,18,2,2],[31,29,2,2],[48,16,2,2]],beans:[],gates:[],exits:[],npcs:[{id:"keti",kind:"keti",x:42.5,y:24.5}],enemySpawns:[],entryPoints:{wilderness_entry:{x:7.5,y:24.5,dir:{x:1,y:0}}},rules:{clearForwardSeconds:3,spawnProtectionSeconds:3}}
};
root.IMS_STORY_MAPS={TYPES,STORY_MAPS,clone:value=>JSON.parse(JSON.stringify(value))};
})(typeof window!=="undefined"?window:globalThis);
