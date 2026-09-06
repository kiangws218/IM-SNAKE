"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — NPC 注册表 + 对话树（数据领地：只改这个文件）
 * ------------------------------------------------------------
 * NPC_TYPES[kind] = {
 *   name, sub, hp, r, foodValue(吃掉+节数),
 *   options:[{label,action,arg}]   action ∈ trade|dialog|leave
 *   drops:[{type:"beans",n}|{type:"curseOrb"|{type:"nodeCharge"}}]
 *   respawn:秒(可不填=不重生)  greet:开场白  prisonDps:被围时每秒承伤(默认按监狱层级)
 * }
 * DIALOG_TREES[kind][nodeId] = {
 *   say:NPC台词, effect:"cry"(可选演出标记),
 *   options:[{t:选项文本, next:节点id}|{t,action:"eat"|"end"}]
 * }
 * ============================================================ */
const NPC_TYPES={
  merchant:{
    actorId:"merchant", name:"路边商人", sub:"神秘行商", hp:26, r:.55, foodValue:1,
    greet:"「客官，用身长抵账——一节豆子一份货。」",
    hurtGreet:"「你个小混蛋，打我干嘛……行行行，货照卖，但每分伤都得算进价里！」",
    options:[{label:"交易",action:"trade"},{label:"吃掉",action:"eat"},{label:"离开",action:"leave"}],
    drops:[{type:"curseOrb"}],
    respawn:30,
  },
  keti:{
    actorId:"keti", name:"可蒂", sub:"白裙小女孩", hp:14, r:.42, foodValue:2,
    greet:"「？？」",
    options:[{label:"对话",action:"dialog",arg:"start"},{label:"离开",action:"leave"}],
    drops:[{type:"beans",n:3}],
  },
  ajie:{actorId:"ajie",name:"阿杰",sub:"寻找弟弟的冒险者",hp:8,r:.46,foodValue:1,greet:"……",options:[{label:"离开",action:"leave"}],drops:[]},
  lisi:{actorId:"lisi",name:"丽丝",sub:"阿杰的同伴",hp:8,r:.44,foodValue:1,greet:"……",options:[{label:"离开",action:"leave"}],drops:[]},
  ajian:{actorId:"ajian",name:"阿见",sub:"被哥布林诅咒的冒险者",hp:8,r:.44,foodValue:1,greet:"……",options:[{label:"离开",action:"leave"}],drops:[]},
  buck:{actorId:"buck",name:"巴克",sub:"吊桥前的劫匪",hp:10,r:.48,foodValue:1,greet:"站住！过桥费三枚金币，或者把那把铁剑留下。",options:[{label:"离开",action:"leave"}],drops:[]},
  miro:{actorId:"miro",name:"米罗",sub:"吊桥前的劫匪",hp:10,r:.46,foodValue:1,greet:"别耍花样，我们看见你从洞窟出来了。",options:[{label:"离开",action:"leave"}],drops:[]},
};

const DIALOG_TREES={
  keti:{
    start:{
      say:"你要吃掉我吗？",
      options:[
        {t:"是的。",next:"cry"},
        {t:"吃掉！",action:"eat"},
        {t:"离开。",action:"end"},
      ],
    },
    cry:{
      say:"哇———哇———！！",
      effect:"cry",
      options:[
        {t:"吃掉",action:"eat"},
        {t:"离开",action:"end"},
      ],
    },
  },
};
