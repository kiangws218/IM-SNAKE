"use strict";

(function(root){
  const MAPS=root.IMS_STORY_MAPS.TYPES;
  const progress=(step,total=8)=>({chapter:"序章",step,total});
  const chapterProgress=(step,total=10)=>({chapter:"第一章",step,total});
  const textGoal=text=>({kind:"text",text});
  const counterGoal=(label,counter,target,inputHint)=>({kind:"counter",label,counter,target,inputHint});

  const PROLOGUE={
    id:"prologue",
    start:"prologue_start",
    nodes:{
      prologue_start:{
        id:"prologue_start",enter:{action:"loadMap",mapId:MAPS.TUTORIAL},next:"tutorial_1",
        progress:progress(1),goal:counterGoal("目标 吃豆","tutorialBeansEaten",3,"move")
      },
      tutorial_1:{
        id:"tutorial_1",progress:progress(1),goal:counterGoal("目标 吃豆","tutorialBeansEaten",3,"move"),
        wait:{events:["PLAYER_BEAN_EATEN"],condition:"tutorialBeans3",target:"dialogue_1"}
      },
      dialogue_1:{
        id:"dialogue_1",progress:progress(2),goal:textGoal("阅读对话"),
        dialogue:{speaker:"我",sub:"序章 · 对话 1",pages:[
          "我究竟像这样吃了多久……",
          "感觉……有点恶心。",
          "要吐了！\n\n（长按 {fire} 吐出豆子；用 {interact} 推进对话。）"
        ],choices:[{id:"go",label:"吐出来！",next:"tutorial_2"}]}
      },
      tutorial_2:{
        id:"tutorial_2",progress:progress(3),goal:counterGoal("目标 吐出","tutorialBeansSpit",3,"fire"),
        wait:{events:["PLAYER_BEAN_SPIT"],condition:"tutorialSpit3",target:"dialogue_2"}
      },
      dialogue_2:{
        id:"dialogue_2",progress:progress(4),goal:textGoal("吃豆并破坏脆弱墙"),
        dialogue:{speaker:"我",sub:"序章 · 对话 2",pages:[
          "吐出来舒服多了。",
          "但是我的身体也变短了。",
          "上面有一堵脆弱的墙？",
          "似乎可以靠这个破坏它。"
        ],choices:[{id:"go",label:"继续前进",action:"waitForWall"}]}
      },
      dialogue_3:{
        id:"dialogue_3",progress:progress(5),goal:textGoal("找到门并走出教学地图"),
        dialogue:{speaker:"我",sub:"序章 · 对话 3",pages:[
          "外面会是什么样子呢？",
          "从来没有出去过，去看看好了。"
        ],choices:[{id:"go",label:"走向门",action:"waitForExit"}]}
      },
      dialogue_4:{
        id:"dialogue_4",progress:progress(5),goal:textGoal("找到门并走出教学地图"),
        dialogue:{speaker:"我",sub:"序章 · 对话 4",pages:[
          "也许，我还是适合待在里面。",
          "就这样一直吃下去……"
        ],choices:[
          {id:"stay",label:"继续小游戏",next:"tutorial_free_play"},
          {id:"leave",label:"还是出去看看",next:"tutorial_free_play"}
        ]}
      },
      tutorial_free_play:{
        id:"tutorial_free_play",progress:progress(5),goal:textGoal("找到门并走出教学地图"),
        enter:{action:"banner",text:"自由探索：找到已经打开的门，走出教学地图"},
        wait:{events:["MAP_EXIT_ENTERED"],target:"wilderness_start"}
      },
      wilderness_start:{
        id:"wilderness_start",enter:{action:"loadMap",mapId:MAPS.WILDERNESS,entry:"wilderness_entry"},
        next:"wilderness_keti_wait",progress:progress(6),goal:textGoal("找到哭声的主人")
      },
      wilderness_keti_wait:{
        id:"wilderness_keti_wait",progress:progress(6),goal:textGoal("找到哭声的主人"),
        wait:{events:["ACTOR_INTERACTED","ACTOR_DIED","ACTOR_EATEN"],condition:"ketiEvent",targetResolver:"ketiFirstContact"}
      },
      keti_question:{
        id:"keti_question",progress:progress(6),goal:textGoal("与可蒂交谈"),
        dialogue:{speaker:"可蒂",sub:"地图 2 · 荒野",portrait:"keti",crying:true,pages:["你要吃掉我吗？"],choices:[
          {id:"yes",label:"是的。",next:"keti_cry"},
          {id:"eat",label:"吃掉",next:"keti_eaten",danger:true}
        ]}
      },
      keti_cry:{
        id:"keti_cry",progress:progress(6),goal:textGoal("回应可蒂"),
        dialogue:{speaker:"可蒂",sub:"可蒂哭了",portrait:"keti",crying:true,pages:["哇————！","你会吃掉我吗？"],choices:[
          {id:"save",label:"开玩笑的，我不会吃你的",next:"keti_reassured"},
          {id:"eat",label:"吃掉",next:"keti_eaten",danger:true},
          {id:"leave",label:"离开",next:"free_explore"}
        ]}
      },
      keti_reassured:{
        id:"keti_reassured",progress:progress(7),goal:textGoal("保护可蒂"),
        dialogue:{speaker:"可蒂",sub:"可蒂稍微安心了",portrait:"keti",crying:true,pages:[
          "真的吗？这跟他们说的不一样……",
          "啊！有怪物来了！"
        ],choices:[{id:"fight",label:"挡在她前面",next:"wilderness_slimes"}]}
      },
      keti_eaten:{id:"keti_eaten",enter:{action:"eatKeti"},next:"eaten_slimes",progress:progress(7),goal:textGoal("击败史莱姆")},
      eaten_slimes:{
        id:"eaten_slimes",enter:{action:"spawnSlimes"},progress:progress(7),goal:textGoal("击败两只史莱姆"),
        wait:{events:["ENEMIES_DEFEATED"],condition:"enemiesCleared",target:"keti_memory_wait"}
      },
      wilderness_slimes:{
        id:"wilderness_slimes",enter:{action:"spawnSlimes"},progress:progress(7),goal:textGoal("击败两只史莱姆"),
        wait:{events:["ENEMIES_DEFEATED"],condition:"enemiesCleared",targetResolver:"ketiOutcome"}
      },
      keti_saved:{
        id:"keti_saved",progress:progress(8),goal:textGoal("完成序章"),
        dialogue:{speaker:"可蒂",sub:"可蒂存活",portrait:"keti",pages:[
          "是你救了我吗？",
          "可我……不能离开这里。",
          "请继续往前走吧，大人。",
          "最后，可以请你告诉我你的名字吗？"
        ],choices:[{id:"name",label:"告诉她我的名字",next:"input_player_name"}]}
      },
      keti_dead:{
        id:"keti_dead",progress:progress(8),goal:textGoal("决定如何处理"),
        dialogue:{speaker:"我",sub:"可蒂死亡",pages:["哭声消失了。","她的尸体还留在这里。"],choices:[
          {id:"leave",label:"离开",next:"free_explore"},
          {id:"eat",label:"吃掉尸体",next:"keti_eaten_after_death",danger:true}
        ]}
      },
      keti_eaten_after_death:{id:"keti_eaten_after_death",enter:{action:"eatCorpse"},next:"free_explore",progress:progress(8),goal:textGoal("自由探索")},
      free_explore:{
        id:"free_explore",enter:{action:"waitForMemoryBlur"},progress:progress(8),goal:textGoal("继续向前"),
        wait:{events:["TIMER_EXPIRED"],condition:"freeExploreTimer",target:"memory_blur"}
      },
      keti_memory_wait:{
        id:"keti_memory_wait",enter:{action:"waitForMemoryBlur"},progress:progress(8),goal:textGoal("继续向前"),
        wait:{events:["TIMER_EXPIRED"],condition:"freeExploreTimer",target:"memory_blur"}
      },
      memory_blur:{id:"memory_blur",enter:{action:"memoryBlur"},next:"memory_blur_dialogue",progress:progress(8),goal:textGoal("回忆自己的名字")},
      memory_blur_dialogue:{
        id:"memory_blur_dialogue",progress:progress(8),goal:textGoal("回忆自己的名字"),
        dialogue:{speaker:"我",sub:"记忆模糊",pages:["你感到一阵反胃，刚刚吃过的东西从喉咙里倾泻而出。","我……刚才吃了什么？","脑子里只剩下一片空白。"],choices:[{id:"name",label:"回忆自己的名字",next:"input_player_name"}]}
      },
      input_player_name:{id:"input_player_name",enter:{action:"nameInput",next:"chapter1_start"},progress:progress(8),goal:textGoal("输入名字")},
      prologue_complete:{id:"prologue_complete",enter:{action:"storyEnd",title:"序章试玩完成",text:"名字和选择已经记录。后续章节会从这里继续。"},progress:progress(8),goal:textGoal("序章完成")}
      ,chapter1_start:{id:"chapter1_start",enter:{action:"loadMap",mapId:MAPS.CHAPTER1_FOREST,chapter:"chapter1",checkpoint:"chapter1_start"},next:"chapter1_explore",progress:chapterProgress(1),goal:textGoal("探索森林")}
      ,chapter1_explore:{id:"chapter1_explore",enter:{action:"chapterExplore"},progress:chapterProgress(1),goal:textGoal("自由探索森林")}
      ,chapter1_hunger:{id:"chapter1_hunger",progress:chapterProgress(1),goal:textGoal("阅读对话"),dialogue:{speaker:"我",sub:"第一章 · 森林",pages:["好饿……","为什么一点饱腹感都没有呢？"],choices:[{id:"continue",label:"继续探索",set:{"flags.chapter1HungerSeen":true,"flags.chapter1HungerPending":false},next:"chapter1_explore"}]}}
      ,chapter1_sword:{id:"chapter1_sword",progress:chapterProgress(2),goal:textGoal("查看铁剑"),dialogue:{speaker:"我",sub:"森林中的遗失物",pages:["一把生锈的铁剑落在地上，似乎是谁遗失在这里的。"],choices:[{id:"eat",label:"吃掉铁剑",action:"takeSword",next:"chapter1_sword_eaten"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_sword_eaten:{id:"chapter1_sword_eaten",progress:chapterProgress(2),goal:textGoal("继续探索"),dialogue:{speaker:"我",sub:"铁剑进入了胃袋",pages:["有些扎喉咙……","但是饥饿感并没有缓解。"],choices:[{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_meeting:{id:"chapter1_meeting",progress:chapterProgress(3),goal:textGoal("回应两名冒险者"),dialogue:{speaker:"阿杰",sub:"第一章 · 森林相遇",pages:["我操！怎么会有这么大的蛇！","阿杰拔出腰间的剑指向你：讨伐你这样的魔物，正是我训练至今的愿望！","丽丝：阿杰！你冷静一下！","丽丝：它看起来并没有恶意……","丽丝：而且，我们还要抓紧时间，找到你失踪的弟弟，不是吗？"],choices:[{id:"hunger",label:"（一阵突如其来的饥饿袭来，你控制不住自己……）",next:"chapter1_meeting_hunger"}]}}
      ,chapter1_meeting_hunger:{id:"chapter1_meeting_hunger",progress:chapterProgress(3),goal:textGoal("压制突然袭来的饥饿"),dialogue:{speaker:"旁白",sub:"失控的饥饿",pages:["饥饿压过了思考，你的视线不受控制地在两人之间游移。"],choices:[{id:"eat_ajie",label:"吃掉阿杰",when:"ajieAlive",action:"swallowAjie",next:"chapter1_ajie_swallowed",danger:true},{id:"eat_lisi",label:"吃掉丽丝",when:"lisiAlive",action:"swallowLisi",next:"chapter1_lisi_swallowed",danger:true},{id:"sword",label:"吐出铁剑",when:"hasSword",action:"dropSword",next:"chapter1_sword_recognized"}]}}
      ,chapter1_ajie_swallowed:{id:"chapter1_ajie_swallowed",progress:chapterProgress(3),goal:textGoal("回应丽丝"),dialogue:{speaker:"丽丝",sub:"阿杰被吞下",pages:["咦啊啊啊啊！！","你把阿杰给……！","丽丝被吓得瘫坐在地上，双腿不断发抖。"],choices:[{id:"release",label:"吐出阿杰",when:"hasAjie",action:"releaseAjie",next:"chapter1_ajie_released"},{id:"eat_lisi",label:"吃掉丽丝",when:"lisiAlive",action:"swallowLisi",next:"chapter1_both_swallowed",danger:true},{id:"sword",label:"吐出铁剑",when:"hasSword",action:"dropSword",next:"chapter1_sword_recognized"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_ajie_released:{id:"chapter1_ajie_released",progress:chapterProgress(3),goal:textGoal("继续探索"),dialogue:{speaker:"我",sub:"阿杰昏迷",pages:["你喉咙一滚，把浑身沾满粘液的阿杰吐了出来。","阿杰昏了过去，胸口规律地起伏。","在粘液的腐蚀下，阿杰的衣服残缺不整。","丽丝：咦啊啊啊啊！！","丽丝：阿杰……你的衣服！","丽丝连忙用手捂住眼睛，却又从指缝里偷偷张望。","丽丝：……咦？","丽丝：阿杰……你怎么没有……","丽丝：难道说，阿杰其实是女生？"],choices:[{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_lisi_swallowed:{id:"chapter1_lisi_swallowed",progress:chapterProgress(3),goal:textGoal("面对阿杰"),dialogue:{speaker:"阿杰",sub:"丽丝被吞下",pages:["啊！可恶的混蛋！","把丽丝还回来！","阿杰拔出剑冲向你。"],choices:[{id:"release",label:"吐出丽丝",when:"hasLisi",action:"releaseLisi",next:"chapter1_lisi_released"},{id:"fight",label:"迎战",action:"startAjieCombat",next:"chapter1_combat_pending",danger:true}]}}
      ,chapter1_lisi_released:{id:"chapter1_lisi_released",progress:chapterProgress(3),goal:textGoal("继续探索"),dialogue:{speaker:"我",sub:"丽丝昏迷",pages:["你喉咙一滚，把浑身沾满粘液的丽丝吐了出来。","在粘液的腐蚀下，丽丝的衣服残缺不整。","阿杰立刻飞扑上去接住丽丝，随后整张脸涨得通红。","阿杰：我……我以后再找你算账！"],choices:[{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_ajie_unconscious:{id:"chapter1_ajie_unconscious",progress:chapterProgress(3),goal:textGoal("查看昏迷的阿杰"),dialogue:{speaker:"旁白",sub:"昏迷的阿杰",pages:["阿杰浑身沾满粘液，仍处于昏迷之中。"],choices:[{id:"eat",label:"吃掉阿杰",action:"swallowAjie",next:"chapter1_explore",danger:true},{id:"face",label:"舔他的脸",when:"lickWakeLearned",action:"wakeAjieFace",next:"chapter1_ajie_woken_face"},{id:"foot",label:"舔他的脚",when:"lickWakeLearned",action:"wakeAjieFoot",next:"chapter1_ajie_woken_foot"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_ajie_woken_face:{id:"chapter1_ajie_woken_face",progress:chapterProgress(3),goal:textGoal("继续探索"),dialogue:{speaker:"阿杰",sub:"被舔醒的阿杰",pages:["唔……什么东西黏在我脸上……","阿杰猛地睁开眼，手忙脚乱地擦着脸。","是你？！等等，我怎么还活着？"],choices:[{id:"leave",label:"让他缓一缓",next:"chapter1_explore"}]}}
      ,chapter1_ajie_woken_foot:{id:"chapter1_ajie_woken_foot",progress:chapterProgress(3),goal:textGoal("继续探索"),dialogue:{speaker:"阿杰",sub:"被舔醒的阿杰",pages:["阿杰的腿猛地一缩，差点凭本能踢出去。","谁在碰我的脚……是你？！","他盯着你看了片刻，发现自己还活着，神情变得十分复杂。"],choices:[{id:"leave",label:"让他缓一缓",next:"chapter1_explore"}]}}
      ,chapter1_lisi_unconscious:{id:"chapter1_lisi_unconscious",progress:chapterProgress(3),goal:textGoal("查看昏迷的丽丝"),dialogue:{speaker:"旁白",sub:"昏迷的丽丝",pages:["丽丝浑身沾满粘液，呼吸平稳，却没有醒来。"],choices:[{id:"eat",label:"吃掉丽丝",action:"swallowLisi",next:"chapter1_explore",danger:true},{id:"face",label:"舔她的脸",when:"lickWakeLearned",action:"wakeLisiFace",next:"chapter1_lisi_woken_face"},{id:"foot",label:"舔她的脚",when:"lickWakeLearned",action:"wakeLisiFoot",next:"chapter1_lisi_woken_foot"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_lisi_woken_face:{id:"chapter1_lisi_woken_face",progress:chapterProgress(3),goal:textGoal("继续探索"),dialogue:{speaker:"丽丝",sub:"被舔醒的丽丝",pages:["嗯……好痒……","丽丝缓缓睁开眼，看到近在咫尺的蛇头后整个人僵了一下。","你没有吃掉我……是在叫醒我吗？"],choices:[{id:"leave",label:"让她休息一下",next:"chapter1_explore"}]}}
      ,chapter1_lisi_woken_foot:{id:"chapter1_lisi_woken_foot",progress:chapterProgress(3),goal:textGoal("继续探索"),dialogue:{speaker:"丽丝",sub:"被舔醒的丽丝",pages:["丽丝缩起脚，迷迷糊糊地醒了过来。","咦……刚才是什么？","她看了看你，又看了看自己湿漉漉的脚，脸一下红了起来。"],choices:[{id:"leave",label:"让她休息一下",next:"chapter1_explore"}]}}
      ,chapter1_both_swallowed:{id:"chapter1_both_swallowed",progress:chapterProgress(3),goal:textGoal("决定下一步"),dialogue:{speaker:"我",sub:"森林恢复安静",pages:["两人的声音都消失在你的腹中。"],choices:[{id:"release_ajie",label:"吐出阿杰",when:"hasAjie",action:"releaseAjie",next:"chapter1_ajie_released_alone"},{id:"release_lisi",label:"吐出丽丝",when:"hasLisi",action:"releaseLisi",next:"chapter1_lisi_released_alone"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_ajie_released_alone:{id:"chapter1_ajie_released_alone",progress:chapterProgress(3),goal:textGoal("决定下一步"),dialogue:{speaker:"旁白",sub:"寂静的森林",pages:["你喉咙一滚，把浑身沾满粘液的阿杰吐了出来。","阿杰昏了过去，胸口仍在规律地起伏。","四周没有任何人回应，丽丝的声音仍被隔在你的腹中。"],choices:[{id:"release_lisi",label:"吐出丽丝",when:"hasLisi",action:"releaseLisi",next:"chapter1_both_released_unconscious"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_lisi_released_alone:{id:"chapter1_lisi_released_alone",progress:chapterProgress(3),goal:textGoal("决定下一步"),dialogue:{speaker:"旁白",sub:"寂静的森林",pages:["你把浑身沾满粘液的丽丝吐了出来。","她倒在草地上，呼吸微弱却平稳。","四周没有任何人回应，阿杰的声音仍被隔在你的腹中。"],choices:[{id:"release_ajie",label:"吐出阿杰",when:"hasAjie",action:"releaseAjie",next:"chapter1_both_released_unconscious"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_both_released_unconscious:{id:"chapter1_both_released_unconscious",progress:chapterProgress(3),goal:textGoal("继续探索"),dialogue:{speaker:"旁白",sub:"寂静的森林",pages:["你再次收紧喉咙，把仍在腹中的另一个人也吐了出来。","阿杰和丽丝倒在草地上，两人都没有醒来。","森林里只剩下风吹过树叶的声音。"],choices:[{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_sword_recognized:{id:"chapter1_sword_recognized",progress:chapterProgress(4),goal:textGoal("解释铁剑的来历"),dialogue:{speaker:"阿杰",sub:"阿见的剑",pages:["啊！是阿见的剑！","果然……是你吃了他吗？"],choices:[{id:"found",label:"这是我在森林里捡到的",next:"chapter1_quest_request"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_quest_request:{id:"chapter1_quest_request",progress:chapterProgress(4),goal:textGoal("是否帮助寻找阿见"),dialogue:{speaker:"丽丝",sub:"寻找阿见",pages:["那你有见到他吗？可不可以请你……","阿杰：等等！怎么可以请求魔物的帮助。","丽丝：可不可以请你帮帮我们找到阿见？我们会尽可能地报答你！"],choices:[{id:"accept",label:"同意",set:{"flags.findAjianAccepted":true,"quests.findAjian":{"status":"active","title":"寻找阿见","priority":10}},next:"chapter1_quest_accepted"},{id:"decline",label:"拒绝",set:{"flags.findAjianDeclined":true},next:"chapter1_quest_declined"}]}}
      ,chapter1_quest_accepted:{id:"chapter1_quest_accepted",progress:chapterProgress(5),goal:textGoal("继续探索"),dialogue:{speaker:"丽丝",sub:"已接取：寻找阿见",pages:["谢谢你！我们也会继续寻找阿见的。","你其实不是一般的魔物，对吗？","我们之前遇到的魔物都不会说话。","我们的营地在河边，可以在那里找到我们。","希望一切顺利！"],choices:[{id:"leave",label:"继续探索",next:"chapter1_explore"}]}}
      ,chapter1_quest_declined:{id:"chapter1_quest_declined",progress:chapterProgress(5),goal:textGoal("继续探索"),dialogue:{speaker:"丽丝",sub:"暂时拒绝",pages:["好吧……我们还会继续寻找阿见的。","有缘分的话再见吧！","你以后仍可以在河边的营地找到我们。"],choices:[{id:"leave",label:"继续探索",next:"chapter1_explore"}]}}
      ,chapter1_lisi_only:{id:"chapter1_lisi_only",progress:chapterProgress(3),goal:textGoal("回应丽丝"),dialogue:{speaker:"丽丝",sub:"只剩丽丝清醒",pages:["丽丝仍在发抖，但没有立刻逃走。","丽丝：你……究竟想做什么？"],choices:[{id:"eat_lisi",label:"吃掉丽丝",when:"lisiAlive",action:"swallowLisi",next:"chapter1_both_swallowed",danger:true},{id:"release_ajie",label:"吐出阿杰",when:"hasAjie",action:"releaseAjie",next:"chapter1_ajie_released"},{id:"sword",label:"吐出铁剑",when:"hasSword",action:"dropSword",next:"chapter1_sword_recognized_lisi"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_ajie_only:{id:"chapter1_ajie_only",progress:chapterProgress(3),goal:textGoal("回应阿杰"),dialogue:{speaker:"阿杰",sub:"只剩阿杰清醒",pages:["阿杰握紧了剑，视线始终没有离开你。"],choices:[{id:"release_lisi",label:"吐出丽丝",when:"hasLisi",action:"releaseLisi",next:"chapter1_lisi_released"},{id:"eat_ajie",label:"吃掉阿杰",when:"ajieAlive",action:"swallowAjie",next:"chapter1_both_swallowed",danger:true},{id:"sword",label:"吐出铁剑",when:"hasSword",action:"dropSword",next:"chapter1_sword_recognized_ajie"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_sword_recognized_lisi:{id:"chapter1_sword_recognized_lisi",progress:chapterProgress(4),goal:textGoal("解释铁剑的来历"),dialogue:{speaker:"丽丝",sub:"阿见的剑",pages:["啊！这是阿见的剑！","难道……你吃了他吗？"],choices:[{id:"found",label:"这是我在森林里捡到的",next:"chapter1_quest_request"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_sword_recognized_ajie:{id:"chapter1_sword_recognized_ajie",progress:chapterProgress(4),goal:textGoal("解释铁剑的来历"),dialogue:{speaker:"阿杰",sub:"阿见的剑",pages:["啊！是阿见的剑！","果然……是你吃了他吗？"],choices:[{id:"found",label:"这是我在森林里捡到的",next:"chapter1_quest_request_ajie"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_quest_request_ajie:{id:"chapter1_quest_request_ajie",progress:chapterProgress(4),goal:textGoal("是否帮助寻找阿见"),dialogue:{speaker:"阿杰",sub:"寻找阿见",pages:["……如果真是你捡到的，那你也许闻到过阿见的气味。","我不喜欢向魔物求助。","但如果你愿意帮我找到弟弟，我会记下这份人情。"],choices:[{id:"accept",label:"同意",set:{"flags.findAjianAccepted":true,"quests.findAjian":{"status":"active","title":"寻找阿见","priority":10}},next:"chapter1_quest_accepted_ajie"},{id:"decline",label:"拒绝",set:{"flags.findAjianDeclined":true},next:"chapter1_quest_declined_ajie"}]}}
      ,chapter1_quest_accepted_ajie:{id:"chapter1_quest_accepted_ajie",progress:chapterProgress(5),goal:textGoal("继续探索"),dialogue:{speaker:"阿杰",sub:"已接取：寻找阿见",pages:["……谢谢。","我们的营地在河边。如果找到线索，就去那里找我。"],choices:[{id:"leave",label:"继续探索",next:"chapter1_explore"}]}}
      ,chapter1_quest_declined_ajie:{id:"chapter1_quest_declined_ajie",progress:chapterProgress(5),goal:textGoal("继续探索"),dialogue:{speaker:"阿杰",sub:"暂时拒绝",pages:["随你。","我会自己继续找。你要是改变主意，就来河边的营地。"],choices:[{id:"leave",label:"继续探索",next:"chapter1_explore"}]}}
      ,chapter1_combat_pending:{id:"chapter1_combat_pending",progress:chapterProgress(3),goal:textGoal("击倒阿杰，或躲避追击 30 秒"),enter:{action:"waitAjieCombat"}}
      ,chapter1_ajie_body_learned:{id:"chapter1_ajie_body_learned",progress:chapterProgress(3),goal:textGoal("阿杰改变了攻击目标"),dialogue:{speaker:"阿杰",sub:"战斗中",pages:["什么？攻击竟然无法对巨蛇的身体造成伤害……","难道要打头才可以？"],choices:[{id:"continue",label:"继续战斗",next:"chapter1_combat_pending"}]}}
      ,chapter1_ajie_downed_wait:{id:"chapter1_ajie_downed_wait",progress:chapterProgress(3),goal:textGoal("靠近倒地的阿杰与他交谈"),enter:{action:"waitDownedInteraction"}}
      ,chapter1_ajie_downed:{id:"chapter1_ajie_downed",progress:chapterProgress(3),goal:textGoal("回应阿杰"),dialogue:{speaker:"阿杰",sub:"战败",pages:["我认可了你的强大，再无话说！","只可惜让丽丝陪我一起死了……"],choices:[{id:"release_lisi",label:"吐出丽丝",when:"hasLisi",action:"releaseLisi",next:"chapter1_lisi_released_after_fight"},{id:"eat_ajie",label:"吃掉阿杰",action:"swallowAjie",next:"chapter1_both_swallowed",danger:true},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_lisi_released_after_fight:{id:"chapter1_lisi_released_after_fight",progress:chapterProgress(4),goal:textGoal("询问两人的目的"),dialogue:{speaker:"旁白",sub:"战斗之后",pages:["你把丽丝吐了出来。阿杰踉跄着扑上前，确认她仍在呼吸后，紧握剑柄的手终于松了些。","我：你们在寻找什么人吗？","阿杰：……你刚才差点把丽丝吃了，现在又问这个？","他盯着你看了片刻，又低头看向安然无恙的丽丝。","阿杰：我们在找阿见，我失踪的弟弟。他的剑丢在这片森林里，人却一直没有回来。","阿杰：你既然愿意把丽丝还回来……如果见到阿见，就告诉他我们在河边的营地等他。"],choices:[{id:"accept",label:"答应帮忙寻找阿见",set:{"flags.findAjianAccepted":true,"quests.findAjian":{"status":"active","title":"寻找阿见","priority":10}},next:"chapter1_quest_accepted_ajie"},{id:"decline",label:"暂时不答应",set:{"flags.findAjianDeclined":true},next:"chapter1_quest_declined_ajie"}]}}
      ,cave_intro:{id:"cave_intro",progress:chapterProgress(6),goal:textGoal("探索哥布林洞窟"),dialogue:{speaker:"旁白",sub:"哥布林洞窟入口",pages:["山洞里残留着杂乱的脚印，篝火还没有完全熄灭。","哥布林似乎都外出打猎了，附近暂时没有动静。"],choices:[{id:"continue",label:"继续深入",set:{"flags.caveEntered":true},next:"cave_explore"}]}}
      ,cave_explore:{id:"cave_explore",enter:{action:"caveExplore"},progress:chapterProgress(6),goal:textGoal("探索洞窟，寻找阿见")}
      ,cave_soup:{id:"cave_soup",progress:chapterProgress(6),goal:textGoal("查看热汤"),dialogue:{speaker:"旁白",sub:"尚有余温的营火",pages:["锅里的汤还冒着热气。","似乎有人刚离开不久。"],choices:[{id:"drink",label:"喝掉汤",action:"drinkSoup",next:"cave_soup_drunk"},{id:"leave",label:"离开",next:"cave_explore"}]}}
      ,cave_soup_drunk:{id:"cave_soup_drunk",progress:chapterProgress(6),goal:textGoal("继续探索"),dialogue:{speaker:"我",sub:"热汤",pages:["汤有些烫。","但暖意从喉咙一直传到胃里。","你感觉好受了一些。"],choices:[{id:"continue",label:"继续探索",next:"cave_explore"}]}}
      ,cave_soup_empty:{id:"cave_soup_empty",progress:chapterProgress(6),goal:textGoal("继续探索"),dialogue:{speaker:"旁白",sub:"空汤锅",pages:["锅里只剩下一点余温。"],choices:[{id:"leave",label:"离开",next:"cave_explore"}]}}
      ,cave_potion:{id:"cave_potion",progress:chapterProgress(6),goal:textGoal("查看木箱"),dialogue:{speaker:"旁白",sub:"阿见身旁的木箱",pages:["木箱里放着一瓶泛着绿光的回复药水。"],choices:[{id:"take",label:"收下回复药水",action:"takePotion",next:"cave_potion_taken"},{id:"leave",label:"离开",next:"cave_explore"}]}}
      ,cave_potion_taken:{id:"cave_potion_taken",progress:chapterProgress(6),goal:textGoal("继续探索"),dialogue:{speaker:"教学",sub:"回复药水",pages:["回复药水进入了胃袋。它重 1，可以堆叠。","把它吐出去后，命中人物或自己会回复 1 心；命中任何东西后药瓶都会碎掉，无法回收。"],choices:[{id:"continue",label:"明白了",next:"cave_explore"}]}}
      ,cave_ajian_found:{id:"cave_ajian_found",progress:chapterProgress(7),goal:textGoal("叫醒被吊起的人"),dialogue:{speaker:"旁白",sub:"洞窟深处",pages:["继续深入，一个身材丰满的少女被绳索吊在半空。","她双脚离地，似乎已经昏迷。"],choices:[{id:"face",label:"舔她的脸",action:"wakeAjianFace",next:"cave_ajian_woke_face"},{id:"foot",label:"舔她的脚",action:"wakeAjianFoot",next:"cave_ajian_woke_foot"},{id:"leave",label:"暂时离开",next:"cave_explore"}]}}
      ,cave_ajian_woke_face:{id:"cave_ajian_woke_face",progress:chapterProgress(7),goal:textGoal("帮助被绑住的人"),dialogue:{speaker:"少女",portrait:"ajian",sub:"被绳索吊起",pages:["一股湿滑冰冷的触感从脸颊传来，让她瞬间清醒。","少女猛地惊醒，看到眼前的巨蛇，尖叫一声后又慌忙捂住嘴。","等、等一下……别走。","绳子勒得好痛……求求你，先把我放下来。"],choices:[{id:"cut",label:"咬断绳索",action:"cutAjianRope",next:"cave_ajian_untied"},{id:"leave",label:"离开",next:"cave_ajian_left_bound"}]}}
      ,cave_ajian_woke_foot:{id:"cave_ajian_woke_foot",progress:chapterProgress(7),goal:textGoal("帮助被绑住的人"),dialogue:{speaker:"少女",portrait:"ajian",sub:"被绳索吊起",pages:["脚底传来的痒意让她猛地一颤，整个人惊醒过来。","她看到眼前的巨蛇，尖叫一声后又立刻捂住嘴。","等、等一下……别走。","绳子勒得好痛……求求你，先把我放下来。"],choices:[{id:"cut",label:"咬断绳索",action:"cutAjianRope",next:"cave_ajian_untied"},{id:"leave",label:"离开",next:"cave_ajian_left_bound"}]}}
      ,cave_ajian_left_bound:{id:"cave_ajian_left_bound",progress:chapterProgress(7),goal:textGoal("决定是否松绑"),dialogue:{speaker:"少女",portrait:"ajian",sub:"仍被吊着",pages:["等等……别把我一个人留在这里！"],choices:[{id:"leave",label:"离开",next:"cave_explore"}]}}
      ,cave_ajian_untie_return:{id:"cave_ajian_untie_return",progress:chapterProgress(7),goal:textGoal("替她松绑"),dialogue:{speaker:"少女",portrait:"ajian",sub:"仍被吊着",pages:["你回来了……求你先把绳子弄断，好吗？"],choices:[{id:"cut",label:"咬断绳索",action:"cutAjianRope",next:"cave_ajian_untied"},{id:"leave",label:"离开",next:"cave_explore"}]}}
      ,cave_ajian_untied:{id:"cave_ajian_untied",progress:chapterProgress(7),goal:textGoal("询问她的身份"),dialogue:{speaker:"旁白",sub:"绳索断开",pages:["你用牙尖勾住绳索，小心地将它咬断。","少女失去支撑，慌乱中抱住你的鼻尖，随后滑坐到地上。","少女：谢、谢谢……我还以为你会连我一起咬下去。"],choices:[{id:"who",label:"你是谁？",next:"cave_ajian_identity_who"},{id:"why",label:"你为什么在这里？",next:"cave_ajian_identity_why"}]}}
      ,cave_ajian_identity_who:{id:"cave_ajian_identity_who",progress:chapterProgress(7),goal:textGoal("听她说明"),dialogue:{speaker:"少女",portrait:"ajian",sub:"身份不明",pages:["我……我是……","不……没什么。","你跟他们不是一伙的吧？","我是被哥布林抓到这里来的。","他们要对我……","旁白：她的声音发颤，没有继续说下去。"],choices:[{id:"continue",label:"继续",next:"cave_goblins_return"}]}}
      ,cave_ajian_identity_why:{id:"cave_ajian_identity_why",progress:chapterProgress(7),goal:textGoal("听她说明"),dialogue:{speaker:"少女",portrait:"ajian",sub:"身份不明",pages:["我是被哥布林抓到这里来的……","他们说要对我……","旁白：她猛地打了个寒颤，没有把话说完。"],choices:[{id:"continue",label:"继续",next:"cave_goblins_return"}]}}
      ,cave_goblins_return:{id:"cave_goblins_return",progress:chapterProgress(8),goal:textGoal("准备迎战"),dialogue:{speaker:"旁白",sub:"哥布林归巢",pages:["刚才的尖叫传进洞穴深处。","两名哥布林弓箭手从祭坛方向探出头，朝这里围了过来。","少女：它们回来了……！"],choices:[{id:"fight",label:"挡在她前面",action:"spawnGoblinEncounter",next:"cave_goblin_combat"}]}}
      ,cave_goblin_combat:{id:"cave_goblin_combat",progress:chapterProgress(8),goal:textGoal("击败两名哥布林弓箭手"),enter:{action:"waitCaveCombat"}}
      ,cave_ajian_rescued:{id:"cave_ajian_rescued",progress:chapterProgress(9),goal:textGoal("与获救的人交谈"),dialogue:{speaker:"少女",portrait:"ajian",sub:"战斗结束",pages:["你……你救了我？","她愣愣地看着你，紧绷的肩膀终于松了下来。","谢谢你……"],choices:[{id:"ask",label:"问她接下来怎么办",next:"cave_ajian_reveal"},{id:"lick",label:"舔她的脚",when:"ajianFootAvailable",action:"lickRescuedAjian",next:"cave_ajian_rescue_lick"},{id:"eat",label:"吃掉她",action:"swallowAjian",next:"cave_explore",danger:true},{id:"leave",label:"离开",next:"cave_explore"}]}}
      ,cave_ajian_rescue_lick:{id:"cave_ajian_rescue_lick",progress:chapterProgress(9),goal:textGoal("继续交谈"),dialogue:{speaker:"少女",portrait:"ajian",sub:"战斗结束",pages:["少女惊叫着缩起脚，脸涨得通红。","她迟疑了一会儿，还是别扭地把脚伸了回来。","……既然你救了我，那就……一下。"],choices:[{id:"back",label:"继续交谈",next:"cave_ajian_rescued"}]}}
      ,cave_ajian_critical:{id:"cave_ajian_critical",progress:chapterProgress(9),goal:textGoal("救治濒死的少女"),dialogue:{speaker:"旁白",sub:"战斗结束",pages:["绳索已经断开，少女倒在地上，气息微弱，一动不动。","她没有死，但已经陷入濒死的昏迷。"],choices:[{id:"potion",label:"使用回复药水",when:"hasPotion",action:"healAjian",next:"cave_ajian_reveal"},{id:"lick",label:"舔她的脸",next:"cave_ajian_critical_brief"},{id:"eat",label:"吃掉她",action:"swallowAjian",next:"cave_explore",danger:true},{id:"leave",label:"离开",next:"cave_explore"}]}}
      ,cave_ajian_critical_brief:{id:"cave_ajian_critical_brief",progress:chapterProgress(9),goal:textGoal("寻找回复药水"),dialogue:{speaker:"阿见",sub:"短暂苏醒",pages:["我听得见……可是身体动不了……","他的眼睛再次合上了。"],choices:[{id:"leave",label:"寻找回复药水",next:"cave_explore"}]}}
      ,cave_ajian_reveal:{id:"cave_ajian_reveal",enter:{action:"revealAjian"},progress:chapterProgress(9),goal:textGoal("听阿见坦白身份")}
      ,cave_ajian_reveal_known:{id:"cave_ajian_reveal_known",progress:chapterProgress(9),goal:textGoal("带阿见回营地"),dialogue:{speaker:"阿见",sub:"获救后的坦白",pages:["其实……我不是女孩子。","我本来是个男人，是中了哥布林巫师的诅咒才变成这副样子的。","逃跑的时候，我把剑弄丢了，最后还是被它们抓了回来。","我：你是不是叫阿见？","你……你怎么会知道我的名字？！","我：阿杰和丽丝正在找你。他们在河边的营地等你。"],choices:[{id:"continue",label:"继续",next:"cave_ajian_sword"}]}}
      ,cave_ajian_reveal_unknown:{id:"cave_ajian_reveal_unknown",progress:chapterProgress(9),goal:textGoal("带阿见回营地"),dialogue:{speaker:"阿见",sub:"获救后的坦白",pages:["其实……我不是女孩子。","我本来是个男人，是中了哥布林巫师的诅咒才变成这副样子的。","逃跑的时候，我把剑弄丢了，最后还是被它们抓了回来。","我叫阿见。我和两个同伴走散了。","我们原本约好在河边扎营……他们也许还在那里。","我：我没有见过他们，但可以带你去找那个营地。"],choices:[{id:"continue",label:"继续",next:"cave_ajian_sword"}]}}
      ,cave_ajian_sword:{id:"cave_ajian_sword",progress:chapterProgress(9),goal:textGoal("决定阿见的去向"),dialogue:{speaker:"阿见",sub:"准备离开洞窟",pages:["我现在这个样子……一个人回去有点害怕。"],choices:[{id:"sword",label:"吐出铁剑",when:"hasSword",action:"dropSword",next:"cave_ajian_sword_recognized"},{id:"continue",label:"商量怎么回营地",next:"cave_ajian_destination"}]}}
      ,cave_ajian_sword_recognized:{id:"cave_ajian_sword_recognized",progress:chapterProgress(9),goal:textGoal("决定阿见的去向"),dialogue:{speaker:"阿见",sub:"失而复得的剑",pages:["这……这是我的剑！你在哪里找到的？","我：在森林里。","阿见看了剑一眼，却没有伸手。","这个身体连剑都握不稳。还是先放在你那里吧。"],choices:[{id:"continue",label:"商量怎么回营地",next:"cave_ajian_destination"}]}}
      ,cave_ajian_destination:{id:"cave_ajian_destination",progress:chapterProgress(10),goal:textGoal("把阿见带回河边营地"),dialogue:{speaker:"阿见",sub:"决定去向",pages:["你能带我去河边的营地吗？"],choices:[{id:"ride",label:"骑到我背上吧",when:"canMountAjian",action:"mountAjian",next:"cave_ajian_mounted"},{id:"eat",label:"吃掉阿见",action:"swallowAjian",next:"cave_explore",danger:true},{id:"leave",label:"暂时留在这里",next:"cave_explore"}]}}
      ,cave_ajian_mounted:{id:"cave_ajian_mounted",progress:chapterProgress(10),goal:textGoal("把阿见带回河边营地"),dialogue:{speaker:"阿见",sub:"骑乘",pages:["骑、骑在你身上？","……总比再被吃一次好。","旁白：你伏低脑袋，把舌尖搭在地上。阿见沿着舌尖慢慢爬到头后第一节身体上坐稳。","好、好了。你走慢一点……"],choices:[{id:"go",label:"返回河边营地",next:"cave_explore"}]}}
      ,cave_ajian_rewake:{id:"cave_ajian_rewake",progress:chapterProgress(9),goal:textGoal("叫醒阿见"),dialogue:{speaker:"旁白",sub:"被吐出的阿见",pages:["被吐出来的阿见浑身沾满粘液，仍在昏迷。"],choices:[{id:"eat",label:"再次吃掉",action:"swallowAjian",next:"cave_explore",danger:true},{id:"face",label:"舔他的脸",action:"rewakeAjianFace",next:"cave_ajian_rewake_resolve"},{id:"foot",label:"舔他的脚",action:"rewakeAjianFoot",next:"cave_ajian_rewake_resolve"},{id:"leave",label:"离开",next:"cave_explore"}]}}
      ,cave_ajian_rewake_resolve:{id:"cave_ajian_rewake_resolve",enter:{action:"resolveAjianRewake"},progress:chapterProgress(9),goal:textGoal("查看阿见的状况")}
      ,cave_ajian_rewake_same_face:{id:"cave_ajian_rewake_same_face",progress:chapterProgress(9),goal:textGoal("决定阿见的去向"),dialogue:{speaker:"阿见",sub:"再次舔脸唤醒",pages:["唔……这股又凉又黏的感觉……","等等，你上次就是这么把我叫醒的吧？","为什么我会开始熟悉这种感觉啊！","我刚才……又被你吃掉了吗？"],choices:[{id:"carry",label:"只是为了带你走",next:"cave_ajian_destination"},{id:"urge",label:"我有时控制不住自己",next:"cave_ajian_destination"},{id:"eat",label:"再次吃掉",action:"swallowAjian",next:"cave_explore",danger:true}]}}
      ,cave_ajian_rewake_same_foot:{id:"cave_ajian_rewake_same_foot",progress:chapterProgress(9),goal:textGoal("决定阿见的去向"),dialogue:{speaker:"阿见",sub:"再次舔脚唤醒",pages:["旁白：阿见的脚趾猛地蜷了起来。","又、又来？！","……算了。至少你还记得把我叫醒。","我刚才……又被你吃掉了吗？"],choices:[{id:"carry",label:"只是为了带你走",next:"cave_ajian_destination"},{id:"urge",label:"我有时控制不住自己",next:"cave_ajian_destination"},{id:"eat",label:"再次吃掉",action:"swallowAjian",next:"cave_explore",danger:true}]}}
      ,cave_ajian_rewake_switch_foot:{id:"cave_ajian_rewake_switch_foot",progress:chapterProgress(9),goal:textGoal("决定阿见的去向"),dialogue:{speaker:"阿见",sub:"换一种方式唤醒",pages:["呜哇！这次怎么换地方了？！","……不对，我为什么要问这个！","我刚才……又被你吃掉了吗？"],choices:[{id:"carry",label:"只是为了带你走",next:"cave_ajian_destination"},{id:"urge",label:"我有时控制不住自己",next:"cave_ajian_destination"},{id:"eat",label:"再次吃掉",action:"swallowAjian",next:"cave_explore",danger:true}]}}
      ,cave_ajian_rewake_switch_face:{id:"cave_ajian_rewake_switch_face",progress:chapterProgress(9),goal:textGoal("决定阿见的去向"),dialogue:{speaker:"阿见",sub:"换一种方式唤醒",pages:["……这次是脸？太好了……","不对，这有什么值得庆幸的！","我刚才……又被你吃掉了吗？"],choices:[{id:"carry",label:"只是为了带你走",next:"cave_ajian_destination"},{id:"urge",label:"我有时控制不住自己",next:"cave_ajian_destination"},{id:"eat",label:"再次吃掉",action:"swallowAjian",next:"cave_explore",danger:true}]}}
      ,chapter1_ring:{id:"chapter1_ring",progress:chapterProgress(6),goal:textGoal("查看黄色圆环"),dialogue:{speaker:"我",sub:"洞窟祭坛",pages:["祭坛上摆着一个泛着诡异光泽的黄色圆环。"],choices:[{id:"eat",label:"吃掉黄色圆环",action:"takeRing",next:"chapter1_ring_tutorial"},{id:"leave",label:"离开",next:"cave_explore"}]}}
      ,chapter1_ring_tutorial:{id:"chapter1_ring_tutorial",progress:chapterProgress(6),goal:textGoal("了解环形节点"),dialogue:{speaker:"教学",sub:"获得环形节点",pages:["你获得了 1 点环形节点充能。","环形节点能让你从自己的身体上安全穿过，帮助你闭合包围并困住敌人。","按 {node} 在蛇头当前位置放置节点，再引导蛇头从节点处穿过自己的身体。尾巴完全通过后，节点会自动回收。","被困的敌人会攻击节点；节点被摧毁时，这点充能也会失去。"],choices:[{id:"continue",label:"明白了",next:"cave_explore"}]}}
    }
  };

  root.IMS_STORY_DATA={PROLOGUE};
})(typeof window!=="undefined"?window:globalThis);
