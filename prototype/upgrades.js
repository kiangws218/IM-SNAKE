"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — 肉鸽强化卡池（agent 领地：只改这个文件）
 * ------------------------------------------------------------
 * 规范：
 * 每张卡 = {id, name, desc, tags, apply(RUN, api)}
 *   api.heal(n) 回复 n 心（引擎注入的副作用接口，自动截断到上限）
 *   RUN 是本局运行时状态，可修改字段：
 *     spitRateMult  吐豆频率倍率(默认1)        dmgBonus     豆子伤害加值(默认0)
 *     maxHearts     心上限(默认6)              nodeHpBonus  新放置节点耐久加值(默认0)
 *     prisonDps     监狱基础伤害/s(默认5)       prisonBonus  每多一环加成(默认2)
 *     cutCd         断尾冷却s(默认10)          pickupR      拾取半径格(默认0.6)
 *     greedy        吃豆概率额外+1节 0~1(默认0) speedMult    移速倍率(默认1)
 *     contactDmg    身体接触怪物的持续伤害/s(默认0)
 *
 * 平衡基准（GDD §8）：吐豆间隔1s / 伤害1+⌊L÷5⌋ / 监狱5每秒 / 心6 / 移速4格每秒
 * 全局硬上限（所有同类卡叠加也不会突破）：
 *   spitRateMult≤3.0  dmgBonus≤10  maxHearts∈[3,14]  contactDmg≤12
 *   speedMult≤1.8  prisonDps≤20  prisonBonus≤8  nodeHpBonus≤20
 *   pickupR≤2.0  greedy≤0.9  cutCd≥2.5
 * 卡池会随局外解锁系统扩充（第二层，待做）
 * ============================================================ */
const UPGRADE_POOL=[
  /* ---------- 攻击 · 豆子输出 ---------- */
  {
    id:"spit_speed", name:"唾液腺强化", tags:["攻击"],
    desc:"站桩吐豆频率 +33%（间隔 1s → 约 0.75s），可叠，上限 3 倍速",
    apply(R){R.spitRateMult=Math.min(2.5,+(R.spitRateMult*1.33).toFixed(2));}
  },
  {
    id:"venom", name:"毒牙", tags:["攻击"],
    desc:"豆子伤害 +1（基础伤害 = 1+身长÷5 取整，长蛇收益更高）",
    apply(R){R.dmgBonus=Math.min(10,R.dmgBonus+1);}
  },
  {
    id:"rapid_spit", name:"连珠吐息", tags:["攻击"],
    desc:"站桩吐豆频率 +25%，与唾液腺强化可叠，总上限 3 倍",
    apply(R){R.spitRateMult=Math.min(3,+(R.spitRateMult*1.25).toFixed(2));}
  },
  {
    id:"heavy_bean", name:"重豆锤炼", tags:["攻击"],
    desc:"豆子伤害 +2，代价是吐豆频率 -12%——颗颗都是铁秤砣",
    apply(R){R.dmgBonus=Math.min(10,R.dmgBonus+2);R.spitRateMult=+(R.spitRateMult*0.88).toFixed(2);}
  },
  {
    id:"fang_toxin", name:"淬毒獠牙", tags:["攻击"],
    desc:"豆子伤害 +1 且吐豆频率 +12%，两样都占但都不多",
    apply(R){R.dmgBonus=Math.min(10,R.dmgBonus+1);R.spitRateMult=Math.min(3,+(R.spitRateMult*1.12).toFixed(2));}
  },
  {
    id:"burning_heart", name:"燃心吐息", tags:["攻击","风险"],
    desc:"心上限 -1（最低 3），换来伤害 +2 和频率 +15%——烧命换火力",
    apply(R){R.maxHearts=Math.max(3,R.maxHearts-1);R.dmgBonus=Math.min(10,R.dmgBonus+2);R.spitRateMult=Math.min(3,+(R.spitRateMult*1.15).toFixed(2));}
  },

  /* ---------- 攻击 · 身体接触 ---------- */
  {
    id:"scale_blade", name:"身怀利鳞", tags:["攻击","围困"],  // [制作人需求]
    desc:"身体蹭到怪物时造成 3 点/秒持续伤害（贴身缠绕也能磨死敌人），可叠至 12/秒",
    apply(R){R.contactDmg=Math.min(12,R.contactDmg+3);}
  },
  {
    id:"snare_instinct", name:"围猎本能", tags:["围困","攻击"],
    desc:"监狱每多一环伤害加成 +1，且身体接触伤害 +2/秒——身体既是墙也是刀",
    apply(R){R.prisonBonus=Math.min(8,R.prisonBonus+1);R.contactDmg=Math.min(12,R.contactDmg+2);}
  },

  /* ---------- 生存 ---------- */
  {
    id:"thick_skin", name:"厚表皮", tags:["生存"],
    desc:"心上限 +1，并立刻回复 1 心",
    apply(R,api){R.maxHearts=Math.min(14,R.maxHearts+1);api.heal(1);}
  },
  {
    id:"iron_head", name:"铁头功", tags:["生存"],  // [制作人需求]
    desc:"心上限 +2，并立刻回复 2 心——练过铁头功的蛇，命都硬一点",
    apply(R,api){R.maxHearts=Math.min(14,R.maxHearts+2);api.heal(2);}
  },
  {
    id:"quick_cut", name:"迅捷断尾", tags:["生存"],
    desc:"断尾冷却 -35%（10s → 6.5s），下限 3 秒",
    apply(R){R.cutCd=Math.max(3,+(R.cutCd*0.65).toFixed(1));}
  },
  {
    id:"molt_renewal", name:"蜕皮新生", tags:["生存"],
    desc:"心上限 +1，并蜕掉旧皮回满全部心——濒死时的救命稻草",
    apply(R,api){R.maxHearts=Math.min(14,R.maxHearts+1);api.heal(99);}
  },
  {
    id:"light_tail", name:"轻尾快刀", tags:["生存","风险"],
    desc:"断尾冷却减半（10s → 5s，下限 2.5s），但心上限 -1——尾巴轻了，命也薄了",
    apply(R){R.cutCd=Math.max(2.5,+(R.cutCd*0.5).toFixed(1));R.maxHearts=Math.max(3,R.maxHearts-1);}
  },

  /* ---------- 围困 · 监狱压迫 ---------- */
  {
    id:"hard_node", name:"硬化节点", tags:["围困"],
    desc:"之后放置的环形节点耐久 +5（基础 10 → 15），更扛啃",
    apply(R){R.nodeHpBonus=Math.min(20,R.nodeHpBonus+5);}
  },
  {
    id:"pressure_ring", name:"压迫之环", tags:["围困"],
    desc:"窒息监狱伤害 +2/秒（基础 5 → 7），可叠至上限 20/秒",
    apply(R){R.prisonDps=Math.min(20,R.prisonDps+2);}
  },
  {
    id:"toxic_prison", name:"毒气牢房", tags:["围困"],
    desc:"窒息监狱伤害 +3/秒，比压迫之环更狠（基础上限同 20/秒）",
    apply(R){R.prisonDps=Math.min(20,R.prisonDps+3);}
  },
  {
    id:"ring_mastery", name:"环环相扣", tags:["围困"],
    desc:"监狱每多一环，伤害加成 +2/秒（基础 +2 → +4）——多监狱流核心卡，叠场上 2~3 座监狱时收益爆炸",
    apply(R){R.prisonBonus=Math.min(8,R.prisonBonus+2);}
  },
  {
    id:"fortress_wall", name:"铁壁节点", tags:["围困"],
    desc:"新节点耐久 +8 且监狱伤害 +1/秒——一卡顶半座堡垒",
    apply(R){R.nodeHpBonus=Math.min(20,R.nodeHpBonus+8);R.prisonDps=Math.min(20,R.prisonDps+1);}
  },

  /* ---------- 机动 ---------- */
  {
    id:"swift_slither", name:"迅捷游走", tags:["机动"],  // [制作人需求]
    desc:"移动速度 +15%（4 格/秒 → 4.6 格/秒），冲刺时同样受益，可叠至上限 1.8 倍",
    apply(R){R.speedMult=Math.min(1.8,+(R.speedMult*1.15).toFixed(2));}
  },
  {
    id:"wind_body", name:"御风而行", tags:["机动","经济"],
    desc:"移动速度 +12% 且拾取半径 +0.1 格——游得快，豆也顺手卷走",
    apply(R){R.speedMult=Math.min(1.8,+(R.speedMult*1.12).toFixed(2));R.pickupR=Math.min(2,+(R.pickupR+0.1).toFixed(2));}
  },
  {
    id:"snake_master", name:"蛇行大师", tags:["机动","攻击"],
    desc:"移动速度 +8% 且吐豆频率 +10%——边遛怪边开火的走A流",
    apply(R){R.speedMult=Math.min(1.8,+(R.speedMult*1.08).toFixed(2));R.spitRateMult=Math.min(3,+(R.spitRateMult*1.1).toFixed(2));}
  },

  /* ---------- 经济 · 滚雪球 ---------- */
  {
    id:"magnet_lips", name:"磁力唇", tags:["经济"],
    desc:"拾取半径 +0.25 格（0.6 → 0.85），路过的豆自动吸进嘴",
    apply(R){R.pickupR=Math.min(2,+(R.pickupR+0.25).toFixed(2));}
  },
  {
    id:"greedy_stomach", name:"贪婪胃囊", tags:["经济"],
    desc:"吃豆时 30% 概率额外 +1 节（白赚长度=血量+弹匣），可叠至 90%",
    apply(R){R.greedy=Math.min(0.9,R.greedy+0.3);}
  },
  {
    id:"scavenger", name:"拾荒本能", tags:["经济"],
    desc:"拾取半径 +0.35 格 且吃豆额外 +1 节概率 +15%——地图上的每一粒豆都不放过",
    apply(R){R.pickupR=Math.min(2,+(R.pickupR+0.35).toFixed(2));R.greedy=Math.min(0.9,R.greedy+0.15);}
  },
  {
    id:"thrifty_metabolism", name:"节流吐纳", tags:["经济"],
    desc:"吐豆频率 -15%（省下的长度就是血条），心上限 +1——细水长流的苟活流",
    apply(R){R.spitRateMult=+(R.spitRateMult*0.85).toFixed(2);R.maxHearts=Math.min(14,R.maxHearts+1);}
  },
];
