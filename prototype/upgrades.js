"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — 肉鸽强化卡池（agent 领地：只改这个文件）
 * ------------------------------------------------------------
 * 规范：
 * 每张卡 = {id, name, desc, tags, apply(RUN, api)}
 *   api.heal(n) 回复 n 心（引擎注入的副作用接口）
 *   RUN 是本局运行时状态，可修改字段：
 *     spitRateMult  吐豆频率倍率(默认1)
 *     dmgBonus      豆子伤害加值(默认0)
 *     maxHearts     心上限(默认6)
 *     nodeHpBonus   新放置节点耐久加值(默认0)
 *     prisonDps     监狱基础伤害/s(默认5)
 *     prisonBonus   每多一环加成(默认2)
 *     cutCd         断尾冷却s(默认10)
 *     pickupR       拾取半径格(默认0.6)
 *     greedy        吃豆概率额外+1节 0~1(默认0)
 * 卡池会随局外解锁系统扩充（第二层，待做）
 * ============================================================ */
const UPGRADE_POOL=[
  {
    id:"spit_speed", name:"唾液腺强化", tags:["攻击"],
    desc:"站桩吐豆频率 +33%",
    apply(R){R.spitRateMult=Math.min(2.5,+(R.spitRateMult*1.33).toFixed(2));}
  },
  {
    id:"venom", name:"毒牙", tags:["攻击"],
    desc:"豆子伤害 +1",
    apply(R){R.dmgBonus+=1;}
  },
  {
    id:"thick_skin", name:"厚表皮", tags:["生存"],
    desc:"心上限 +1，并回复 1 心",
    apply(R){R.maxHearts+=1;api.heal(1);}
  },
  {
    id:"hard_node", name:"硬化节点", tags:["围困"],
    desc:"之后放置的环形节点耐久 +5",
    apply(R){R.nodeHpBonus+=5;}
  },
  {
    id:"pressure_ring", name:"压迫之环", tags:["围困"],
    desc:"窒息监狱伤害 +2/s",
    apply(R){R.prisonDps+=2;}
  },
  {
    id:"quick_cut", name:"迅捷断尾", tags:["生存"],
    desc:"断尾冷却 -35%",
    apply(R){R.cutCd=Math.max(3,+(R.cutCd*0.65).toFixed(1));}
  },
  {
    id:"magnet_lips", name:"磁力唇", tags:["经济"],
    desc:"拾取半径 +0.25 格",
    apply(R){R.pickupR=+(R.pickupR+0.25).toFixed(2);}
  },
  {
    id:"greedy_stomach", name:"贪婪胃囊", tags:["经济"],
    desc:"吃豆时 30% 概率额外 +1 节",
    apply(R){R.greedy=Math.min(0.9,R.greedy+0.3);}
  },
];
