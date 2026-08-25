"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — 关卡数据层（agent 领地：只改这个文件）
 * ------------------------------------------------------------
 * 规范：
 * obstacles: [x,y,w,h] 网格矩形数组（留出出生点周围；
 *            引擎会先叠一层固定底噪障碍，这里写的是增量结构）
 * waves:     开场刷怪 {type,count}，type ∈ slime|rat|flower
 * caps:      持续补怪上限 {slime,rat,flower}
 * beans:     场上地面豆目标数（8~14）
 * spawn:     出生点元数据（引擎当前固定出生在 (6,25) 朝右，
 *            此字段仅作设计标注：其周围 x<16 且 y∈[18..32] 必须留空）
 * goal:      通关条件
 *   {type:"kills",count:n}       击杀 n 只
 *   {type:"prisonKills",count:n} 窒息监狱处决 n 只
 *   {type:"survive",time:sec,kills:n} 存活 sec 秒且击杀 n 只
 *
 * zones 扩展（v0.16 引擎已支持）：
 *   {kind:"slope",x,y,w,h,dx,dy,up,down,dragMult}
 *     坡地：沿(dx,dy)方向移动减速 up 倍、反向加速 down 倍；
 *     区域内飞行豆子阻力 ×dragMult（豆子射程变短）
 *   {kind:"wind",x,y,w,h,fx,fy}
 *     风区：区域内飞行的玩家豆子持续受力 (fx,fy)，弹道偏移；
 *     注意：敌方的种子不受风影响（引擎行为）
 *
 * mechs 扩展（v0.16 引擎已支持）：
 *   {kind:"gate",x,y,w,h,need,reward}
 *     吞豆石门：矩形区域开局即实体墙，在该区域内吃掉 need 颗豆子
 *     后墙消失并发 reward（详见交接文档的触发判定说明）
 *   {kind:"pillar",x,y,charge,reward}
 *     充能桩：该格子处于封闭区内、且场上存在含怪的监狱时持续充能，
 *     满 charge 秒启动 reward；监狱解除则缓慢衰减
 * reward: {type:"beans",n}|{type:"heal",n}|{type:"shockwave",r}
 *        |{type:"buff",name,mult,dur}|{type:"seedClear"}
 *
 * 河流表现：用 obstacles 长条画河岸，留 1~2 格缺口当桥（河=墙）
 * ============================================================ */
const LEVELS=[
  {
    id:"ch1-1", name:"缓坡河谷 · 晨溪",
    hint:"北坡爬升迟缓、南坡俯冲如飞；大河只有东西两座石桥。先清掉 7 只怪，熟悉脚下的地形",
    obstacles:[
      [0,30,22,2],[26,30,28,2],[56,30,16,2],
      [24,14,2,2],[42,16,2,2],
      [30,26,2,2],[46,24,2,2],
      [32,38,2,2],[50,36,2,2],
    ],
    zones:[
      {kind:"slope",x:16,y:8,w:30,h:20,dx:0,dy:-1,up:.7,down:1.35,dragMult:1.6},
    ],
    mechs:[],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:3},{type:"rat",count:1}],
    caps:{slime:3,rat:1,flower:0},
    beans:12,
    goal:{type:"kills",count:7},
  },
  {
    id:"ch1-2", name:"峡湾风道",
    hint:"峡谷里刮着横风——你吐出的豆子会被吹偏，针刺花的种子却毫不理会风。借石壁掩体走位，存活 40 秒并击倒 6 只",
    obstacles:[
      [24,6,2,26],[48,16,2,26],
      [34,20,2,2],[58,26,2,2],[12,12,2,2],[30,38,2,2],
    ],
    zones:[
      {kind:"wind",x:26,y:14,w:20,h:20,fx:4,fy:0},
      {kind:"wind",x:52,y:6,w:16,h:12,fx:-3,fy:-4},
    ],
    mechs:[],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"flower",count:2},{type:"slime",count:2},{type:"rat",count:1}],
    caps:{slime:3,rat:2,flower:2},
    beans:10,
    goal:{type:"survive",time:40,kills:6},
  },
  {
    id:"ch1-3", name:"先祖石门",
    hint:"中央宝库的两扇石门沉睡着，传说要用门前的豆子喂饱它们才肯开（每扇 5 颗）。先在废墟间清掉 8 只怪，再去试试你的运气",
    obstacles:[
      [28,18,17,1],[28,30,17,1],
      [28,19,1,4],[28,26,1,4],[44,19,1,4],[44,26,1,4],
      [16,10,3,2],[52,10,3,2],[16,38,3,2],[52,38,3,2],
    ],
    zones:[],
    mechs:[
      {kind:"gate",x:28,y:23,w:1,h:3,need:5,reward:{type:"heal",n:2}},
      {kind:"gate",x:44,y:23,w:1,h:3,need:5,reward:{type:"buff",name:"狂暴",mult:2,dur:12}},
    ],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:3},{type:"rat",count:1},{type:"flower",count:1}],
    caps:{slime:3,rat:2,flower:2},
    beans:10,
    goal:{type:"kills",count:8},
  },
  {
    id:"ch1-4", name:"双生祭坛",
    hint:"把发光的祭坛桩连怪一起圈进窒息监狱，充能满即引爆奖励！两座桩都在开阔地，虚线圈就是你要围的范围。监狱处决 3 只",
    obstacles:[
      [55,6,2,2],[63,18,2,2],[10,10,2,2],
      [33,22,1,1],[39,22,1,1],[33,26,1,1],[39,26,1,1],
      [50,26,2,2],[26,14,2,2],[16,34,2,2],
    ],
    zones:[],
    mechs:[
      {kind:"pillar",x:58,y:12,charge:6,reward:{type:"shockwave",r:9}},
      {kind:"pillar",x:36,y:24,charge:8,reward:{type:"beans",n:6}},
    ],
    spawn:{x:6,y:24,dir:[1,0]},
    waves:[{type:"slime",count:3},{type:"rat",count:2}],
    caps:{slime:4,rat:2,flower:2},
    beans:10,
    goal:{type:"prisonKills",count:3},
  },
  {
    id:"ch1-5", name:"风谷终局",
    hint:"毕业大考：北墙石门讨 6 颗豆放你走近路，南谷要顶着侧风行军，西北祭坛正等你围个满怀。活过 60 秒并击杀 10 只",
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
