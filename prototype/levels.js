"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — 关卡数据层（agent 领地：只改这个文件）
 * ------------------------------------------------------------
 * 规范：
 * obstacles: [x,y,w,h] 网格矩形数组（留出出生点周围）
 * waves:     开场刷怪 {type,count}，type ∈ slime|rat|flower
 * caps:      持续补怪上限 {slime,rat,flower}
 * beans:     场上地面豆目标数
 * goal:      通关条件
 *   {type:"kills",count:n}       击杀 n 只
 *   {type:"prisonKills",count:n} 窒息监狱处决 n 只
 *   {type:"survive",time:sec}    存活 sec 秒
 * ============================================================ */
const LEVELS=[
  {
    id:"ch1-1", name:"苏醒草原 · 其一",
    hint:"吃豆变长，长按J站桩射击——清掉 6 只怪",
    obstacles:[],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:2},{type:"rat",count:1}],
    caps:{slime:2,rat:1,flower:0},
    beans:12,
    goal:{type:"kills",count:6},
  },
  {
    id:"ch1-2", name:"苏醒草原 · 其二",
    hint:"毕业考：按 F 放节点，用身体把史莱姆围进窒息监狱 ×2",
    obstacles:[[20,18,2,2],[34,26,2,2],[46,16,3,1],[14,32,2,2],[52,28,2,2]],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:2}],
    caps:{slime:3,rat:1,flower:0},
    beans:10,
    goal:{type:"prisonKills",count:2},
  },
  {
    id:"ch1-3", name:"针刺花园",
    hint:"针刺花的种子瞄准你的头——侧移闪避，存活 45 秒并杀 6 只",
    obstacles:[[16,12,3,2],[30,20,2,2],[44,14,3,2],[22,34,3,2],[38,36,2,2],[56,22,2,3]],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"flower",count:2},{type:"slime",count:1}],
    caps:{slime:2,rat:1,flower:2},
    beans:10,
    goal:{type:"survive",time:45,kills:6},
  },
];
