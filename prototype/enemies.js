"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — 怪物注册表（数据领地：只改这个文件）
 * ------------------------------------------------------------
 * kind 行为原型：
 *   chaser  追击型：缓慢逼近玩家
 *   thief   盗豆型：冲向地面豆子吞食后逃跑
 *   ranged  炮台型：固定原地周期性朝玩家发射慢速种子
 *   charger 冲锋型：闲逛→对准玩家→蓄力直线冲锋→撞墙眩晕
 *   bomber  自爆型：追近后引信自爆，炸毁范围内豆子并伤害玩家
 *
 * 公共字段：kind,hp,speed(部分kind用),r,body(主色),drops(死亡掉豆数)
 * 可选字段：
 *   onDeathSpawns:[{type,count}] 死亡分裂
 * charger 专用：walk,windup,chargeSpeed,stun
 * bomber  专用：fuse,boomR
 * ranged  专用：cadence,telegraph,bulletSpeed
 * thief   专用：eatTime
 * ============================================================ */
const ENEMY_TYPES={
  slime:{
    kind:"chaser", name:"呆呆史莱姆", hp:7, speed:2, r:.55,
    body:"#63c74d", drops:2,
  },
  mini_slime:{
    kind:"chaser", name:"小史莱姆", hp:2, speed:2.6, r:.32,
    body:"#8fe36b", drops:1,
  },
  split_slime:{
    kind:"chaser", name:"分裂史莱姆", hp:9, speed:.8, r:.6,
    body:"#4aa3a3", drops:1,
    onDeathSpawns:[{type:"mini_slime",count:2}],
  },
  turtle:{
    kind:"chaser", name:"铁壳蜗龟", hp:18, speed:.6, r:.62,
    body:"#8a6f3c", drops:4,
  },
  boar:{
    kind:"charger", name:"冲锋野猪", hp:12, r:.55,
    body:"#7a4a2b", drops:3,
    walk:.6, windup:.95, chargeSpeed:7, stun:1.5,
  },
  bomber:{
    kind:"bomber", name:"自爆蛛蜂", hp:4, speed:3.2, r:.4,
    body:"#e8c14d", drops:0,
    fuse:.8, boomR:2.4,
  },
  rat:{
    kind:"thief", name:"偷豆鼠", hp:6, speed:5, r:.5,
    body:"#9ba0b5", eatTime:1, drops:1,
  },
  flower:{
    kind:"ranged", name:"针刺花", hp:8, r:.62,
    body:"#b55088", cadence:4, telegraph:.7, bulletSpeed:2, drops:2,
  },
};

/* 沙盒模式各类型的同屏上限（选关/战役模式以关卡 caps 为准） */
const SANDBOX_CAPS={
  slime:3, mini_slime:0, split_slime:2, turtle:2,
  boar:2, bomber:2, rat:2, flower:2,
};
