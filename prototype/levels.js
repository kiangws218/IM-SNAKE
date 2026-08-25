"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — 关卡数据层（agent 领地：只改这个文件）
 * ------------------------------------------------------------
 * 规范：
 * obstacles: [x,y,w,h] 网格矩形数组（含"围栏"，用于缩小有效场地）
 * waves:     开场刷怪 {type,count}，type ∈ slime|rat|flower
 * caps:      持续补怪上限 {slime,rat,flower}
 * beans:     场上地面豆目标数（8~14）
 * goal:      通关条件
 *   {type:"kills",count:n}       击杀 n 只
 *   {type:"prisonKills",count:n} 窒息监狱处决 n 只
 *   {type:"survive",time:sec,kills:n} 存活 sec 秒且击杀 n 只
 *
 * zones 扩展：
 *   {kind:"slope",x,y,w,h,dx,dy,up,down,dragMult}
 *     坡地：沿(dx,dy)走减速up倍/反向加速down倍；区内豆子阻力×dragMult
 *   {kind:"wind",x,y,w,h,fx,fy}
 *     风区：区域内玩家豆子持续受力(fx,fy)；敌方种子不受风
 *
 * mechs 扩展：
 *   {kind:"gate",x,y,w,h,need,reward}
 *     吞豆石门：开局实体墙，朝门射豆喂满 need 颗后开启并发奖励
 *   {kind:"pillar",x,y,charge,reward}
 *     充能桩：把桩连怪一起围进监狱充能 charge 秒后触发奖励
 * reward: {type:"beans",n}|{type:"heal",n}|{type:"shockwave",r}
 *        |{type:"buff",name,mult,dur}|{type:"seedClear"}
 *
 * 设计原则（制作人拍板）：
 *   地图由小到大循序渐进；前两关纯地形无特殊环境；
 *   第3关引入机关谜题；第4关引入坡度与风；第5关全机制大考。
 *   出生点固定 (6.5,24.5)——所有围栏必须把该点包进场地内！
 * ============================================================ */
const LEVELS=[
  {
    id:"ch1-1", name:"围栏练习场",
    hint:"紧凑的练习场：吃豆变长，长按 J 站桩吐豆。清掉 5 只怪即可过关",
    obstacles:[
      [4,14,36,1],[4,33,36,1],[4,15,1,18],[39,15,1,18],
      [14,20,2,2],[26,17,2,2],[32,27,2,2],[20,29,2,2],
    ],
    zones:[],
    mechs:[],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:2},{type:"rat",count:1}],
    caps:{slime:2,rat:1,flower:0},
    beans:10,
    goal:{type:"kills",count:5},
  },
  {
    id:"ch1-2", name:"双庭校场",
    hint:"隔墙有门洞的对称双庭院——学会用 F 放节点辅助封口，把史莱姆围进窒息监狱 1 次",
    obstacles:[
      [4,11,44,1],[4,36,44,1],[4,12,1,24],[47,12,1,24],
      [25,12,1,10],[25,26,1,10],
      [14,18,2,2],[36,30,2,2],[38,16,2,2],[13,31,2,2],
    ],
    zones:[],
    mechs:[],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:3}],
    caps:{slime:3,rat:1,flower:0},
    beans:10,
    goal:{type:"prisonKills",count:1},
  },
  {
    id:"ch1-3", name:"先祖石门",
    hint:"中央宝库双门紧闭——朝门体射豆喂饱它们（各 4 颗），门开即得奖励。清掉 7 只怪过关",
    obstacles:[
      [8,8,52,1],[8,39,52,1],[8,9,1,30],[59,9,1,30],
      [28,20,13,1],[28,28,13,1],[28,21,1,3],[28,26,1,3],[40,21,1,3],[40,26,1,3],
      [14,14,2,2],[50,14,2,2],[14,32,2,2],[50,32,2,2],
      [22,34,2,1],[46,12,2,1],
    ],
    zones:[],
    mechs:[
      {kind:"gate",x:28,y:24,w:1,h:2,need:4,reward:{type:"beans",n:5}},
      {kind:"gate",x:40,y:24,w:1,h:2,need:4,reward:{type:"heal",n:2}},
    ],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:3},{type:"rat",count:1},{type:"flower",count:1}],
    caps:{slime:3,rat:1,flower:1},
    beans:10,
    goal:{type:"kills",count:7},
  },
  {
    id:"ch1-4", name:"风坡丘陵",
    hint:"东半坡上坡迟缓下坡如飞，豆子在上坡射程骤减；南谷横风会吹偏弹道。围住发光祭坛充能引爆冲击波！存活 40 秒并击杀 7 只",
    obstacles:[
      [4,6,64,1],[4,41,64,1],[4,7,1,34],[67,7,1,34],
      [16,16,2,2],[28,24,2,2],[44,32,2,2],[56,20,2,2],[12,28,2,2],
      [60,30,2,2],[34,12,2,2],
    ],
    zones:[
      {kind:"slope",x:36,y:7,w:28,h:34,dx:1,dy:0,up:.75,down:1.3,dragMult:1.5},
      {kind:"wind",x:4,y:30,w:60,h:10,fx:4,fy:-1},
    ],
    mechs:[
      {kind:"pillar",x:50,y:14,charge:6,reward:{type:"shockwave",r:8}},
    ],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:2},{type:"rat",count:1},{type:"flower",count:1}],
    caps:{slime:3,rat:1,flower:1},
    beans:11,
    goal:{type:"survive",time:40,kills:7},
  },
  {
    id:"ch1-5", name:"风谷终局",
    hint:"毕业大考全机制同屏：北墙石门讨 6 豆开近路、南谷侧风行军、东北上坡苦行、西北祭坛围出狂暴。活过 60 秒并击杀 10 只",
    obstacles:[
      [34,0,2,20],[34,23,2,5],
      [8,6,2,2],[20,6,2,2],[8,16,2,2],
      [18,40,4,2],[46,42,4,2],
      [56,8,3,2],[64,14,2,2],
      [24,26,2,2],
    ],
    zones:[
      {kind:"wind",x:8,y:34,w:56,h:12,fx:5,fy:-2},
      {kind:"slope",x:40,y:4,w:28,h:22,dx:1,dy:0,up:.75,down:1.3,dragMult:1.5},
    ],
    mechs:[
      {kind:"gate",x:34,y:20,w:2,h:3,need:6,reward:{type:"seedClear"}},
      {kind:"pillar",x:14,y:10,charge:7,reward:{type:"buff",name:"狂暴",mult:2,dur:10}},
    ],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:2},{type:"rat",count:2},{type:"flower",count:2}],
    caps:{slime:4,rat:3,flower:3},
    beans:12,
    goal:{type:"survive",time:60,kills:10},
  },
];
