"use strict";

(function(root){
  const MAPS=root.IMS_STORY_MAPS.TYPES;
  const progress=(step,total=8)=>({chapter:"序章",step,total});
  const chapterProgress=(step,total=5)=>({chapter:"第一章",step,total});
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
        wait:{events:["ENEMIES_DEFEATED"],condition:"enemiesCleared",target:"free_explore"}
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
        id:"free_explore",enter:{action:"freeExplore"},progress:progress(8),goal:textGoal("自由探索"),
        wait:{events:["TIMER_EXPIRED"],condition:"freeExploreTimer",target:"memory_blur"}
      },
      memory_blur:{id:"memory_blur",enter:{action:"memoryBlur"},next:"memory_blur_dialogue",progress:progress(8),goal:textGoal("回忆自己的名字")},
      memory_blur_dialogue:{
        id:"memory_blur_dialogue",progress:progress(8),goal:textGoal("回忆自己的名字"),
        dialogue:{speaker:"我",sub:"记忆模糊",pages:["我……刚才吃了什么？","脑子里只剩下一片空白。"],choices:[{id:"name",label:"回忆自己的名字",next:"input_player_name"}]}
      },
      input_player_name:{id:"input_player_name",enter:{action:"nameInput",next:"chapter1_start"},progress:progress(8),goal:textGoal("输入名字")},
      prologue_complete:{id:"prologue_complete",enter:{action:"storyEnd",title:"序章试玩完成",text:"名字和选择已经记录。后续章节会从这里继续。"},progress:progress(8),goal:textGoal("序章完成")}
      ,chapter1_start:{id:"chapter1_start",enter:{action:"loadMap",mapId:MAPS.CHAPTER1_FOREST,chapter:"chapter1",checkpoint:"chapter1_start"},next:"chapter1_explore",progress:chapterProgress(1),goal:textGoal("探索森林")}
      ,chapter1_explore:{id:"chapter1_explore",enter:{action:"chapterExplore"},progress:chapterProgress(1),goal:textGoal("自由探索森林")}
      ,chapter1_hunger:{id:"chapter1_hunger",progress:chapterProgress(1),goal:textGoal("阅读对话"),dialogue:{speaker:"我",sub:"第一章 · 森林",pages:["好饿……","为什么一点饱腹感都没有呢？"],choices:[{id:"continue",label:"继续探索",set:{"flags.chapter1HungerSeen":true,"flags.chapter1HungerPending":false},next:"chapter1_explore"}]}}
      ,chapter1_sword:{id:"chapter1_sword",progress:chapterProgress(2),goal:textGoal("查看铁剑"),dialogue:{speaker:"我",sub:"森林中的遗失物",pages:["一把生锈的铁剑落在地上，似乎是谁遗失在这里的。"],choices:[{id:"eat",label:"吃掉铁剑",action:"takeSword",next:"chapter1_sword_eaten"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_sword_eaten:{id:"chapter1_sword_eaten",progress:chapterProgress(2),goal:textGoal("继续探索"),dialogue:{speaker:"我",sub:"铁剑进入了胃袋",pages:["有些扎喉咙……","但是饥饿感并没有缓解。"],choices:[{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_meeting:{id:"chapter1_meeting",progress:chapterProgress(3),goal:textGoal("回应两名冒险者"),dialogue:{speaker:"阿杰",sub:"第一章 · 森林相遇",pages:["我操！怎么会有这么大的蛇！","阿杰拔出腰间的剑指向你：讨伐你这样的魔物，正是我训练至今的愿望！","丽丝：阿杰！你冷静一下！","丽丝：它看起来并没有恶意……","丽丝：而且，我们还要抓紧时间，找到你失踪的弟弟，不是吗？"],choices:[{id:"eat_ajie",label:"吃掉阿杰",when:"ajieAlive",action:"swallowAjie",next:"chapter1_ajie_swallowed",danger:true},{id:"eat_lisi",label:"吃掉丽丝",when:"lisiAlive",action:"swallowLisi",next:"chapter1_lisi_swallowed",danger:true},{id:"sword",label:"吐出铁剑",when:"hasSword",action:"dropSword",next:"chapter1_sword_recognized"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_ajie_swallowed:{id:"chapter1_ajie_swallowed",progress:chapterProgress(3),goal:textGoal("回应丽丝"),dialogue:{speaker:"丽丝",sub:"阿杰被吞下",pages:["咦啊啊啊啊！！","你把阿杰给……！","丽丝被吓得瘫坐在地上，双腿不断发抖。"],choices:[{id:"release",label:"吐出阿杰",when:"hasAjie",action:"releaseAjie",next:"chapter1_ajie_released"},{id:"eat_lisi",label:"吃掉丽丝",when:"lisiAlive",action:"swallowLisi",next:"chapter1_both_swallowed",danger:true},{id:"sword",label:"吐出铁剑",when:"hasSword",action:"dropSword",next:"chapter1_sword_recognized"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_ajie_released:{id:"chapter1_ajie_released",progress:chapterProgress(3),goal:textGoal("继续探索"),dialogue:{speaker:"我",sub:"阿杰昏迷",pages:["你喉咙一滚，把浑身沾满粘液的阿杰吐了出来。","阿杰昏了过去，胸口规律地起伏。","在粘液的腐蚀下，阿杰的衣服残缺不整。","丽丝：咦啊啊啊啊！！","丽丝：阿杰……你的衣服！","丽丝连忙用手捂住眼睛，却又从指缝里偷偷张望。","丽丝：……咦？","丽丝：阿杰……你怎么没有……","丽丝：难道说，阿杰其实是女生？"],choices:[{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_lisi_swallowed:{id:"chapter1_lisi_swallowed",progress:chapterProgress(3),goal:textGoal("面对阿杰"),dialogue:{speaker:"阿杰",sub:"丽丝被吞下",pages:["啊！可恶的混蛋！","把丽丝还回来！","阿杰拔出剑冲向你。"],choices:[{id:"release",label:"吐出丽丝",when:"hasLisi",action:"releaseLisi",next:"chapter1_lisi_released"},{id:"fight",label:"迎战",action:"startAjieCombat",next:"chapter1_combat_pending",danger:true}]}}
      ,chapter1_lisi_released:{id:"chapter1_lisi_released",progress:chapterProgress(3),goal:textGoal("继续探索"),dialogue:{speaker:"我",sub:"丽丝昏迷",pages:["你喉咙一滚，把浑身沾满粘液的丽丝吐了出来。","在粘液的腐蚀下，丽丝的衣服残缺不整。","阿杰立刻飞扑上去接住丽丝，随后整张脸涨得通红。","阿杰：我……我以后再找你算账！"],choices:[{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_both_swallowed:{id:"chapter1_both_swallowed",progress:chapterProgress(3),goal:textGoal("决定下一步"),dialogue:{speaker:"我",sub:"森林恢复安静",pages:["两人的声音都消失在你的腹中。"],choices:[{id:"release_ajie",label:"吐出阿杰",when:"hasAjie",action:"releaseAjie",next:"chapter1_ajie_released"},{id:"release_lisi",label:"吐出丽丝",when:"hasLisi",action:"releaseLisi",next:"chapter1_lisi_released"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_sword_recognized:{id:"chapter1_sword_recognized",progress:chapterProgress(4),goal:textGoal("解释铁剑的来历"),dialogue:{speaker:"阿杰",sub:"阿见的剑",pages:["啊！是阿见的剑！","果然……是你吃了他吗？"],choices:[{id:"found",label:"这是我在森林里捡到的",next:"chapter1_quest_request"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_quest_request:{id:"chapter1_quest_request",progress:chapterProgress(4),goal:textGoal("是否帮助寻找阿见"),dialogue:{speaker:"丽丝",sub:"寻找阿见",pages:["那你有见到他吗？可不可以请你……","阿杰：等等！怎么可以请求魔物的帮助。","丽丝：可不可以请你帮帮我们找到阿见？我们会尽可能地报答你！"],choices:[{id:"accept",label:"同意",set:{"flags.findAjianAccepted":true},next:"chapter1_quest_accepted"},{id:"decline",label:"拒绝",set:{"flags.findAjianDeclined":true},next:"chapter1_quest_declined"}]}}
      ,chapter1_quest_accepted:{id:"chapter1_quest_accepted",progress:chapterProgress(5),goal:textGoal("继续探索"),dialogue:{speaker:"丽丝",sub:"已接取：寻找阿见",pages:["谢谢你！我们也会继续寻找阿见的。","你其实不是一般的魔物，对吗？","我们之前遇到的魔物都不会说话。","我们的营地在山洞附近，可以在那里找到我们。","希望一切顺利！"],choices:[{id:"leave",label:"继续探索",next:"chapter1_explore"}]}}
      ,chapter1_quest_declined:{id:"chapter1_quest_declined",progress:chapterProgress(5),goal:textGoal("继续探索"),dialogue:{speaker:"丽丝",sub:"暂时拒绝",pages:["好吧……我们还会继续寻找阿见的。","有缘分的话再见吧！","你以后仍可以在山洞旁的营地找到我们。"],choices:[{id:"leave",label:"继续探索",next:"chapter1_explore"}]}}
      ,chapter1_lisi_only:{id:"chapter1_lisi_only",progress:chapterProgress(3),goal:textGoal("回应丽丝"),dialogue:{speaker:"丽丝",sub:"只剩丽丝清醒",pages:["丽丝仍在发抖，但没有立刻逃走。","丽丝：你……究竟想做什么？"],choices:[{id:"eat_lisi",label:"吃掉丽丝",when:"lisiAlive",action:"swallowLisi",next:"chapter1_both_swallowed",danger:true},{id:"sword",label:"吐出铁剑",when:"hasSword",action:"dropSword",next:"chapter1_sword_recognized_lisi"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_ajie_only:{id:"chapter1_ajie_only",progress:chapterProgress(3),goal:textGoal("回应阿杰"),dialogue:{speaker:"阿杰",sub:"只剩阿杰清醒",pages:["阿杰握紧了剑，视线始终没有离开你。"],choices:[{id:"release_lisi",label:"吐出丽丝",when:"hasLisi",action:"releaseLisi",next:"chapter1_lisi_released"},{id:"eat_ajie",label:"吃掉阿杰",when:"ajieAlive",action:"swallowAjie",next:"chapter1_both_swallowed",danger:true},{id:"sword",label:"吐出铁剑",when:"hasSword",action:"dropSword",next:"chapter1_sword_recognized_ajie"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_sword_recognized_lisi:{id:"chapter1_sword_recognized_lisi",progress:chapterProgress(4),goal:textGoal("解释铁剑的来历"),dialogue:{speaker:"丽丝",sub:"阿见的剑",pages:["啊！这是阿见的剑！","难道……你吃了他吗？"],choices:[{id:"found",label:"这是我在森林里捡到的",next:"chapter1_quest_request"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_sword_recognized_ajie:{id:"chapter1_sword_recognized_ajie",progress:chapterProgress(4),goal:textGoal("解释铁剑的来历"),dialogue:{speaker:"阿杰",sub:"阿见的剑",pages:["啊！是阿见的剑！","果然……是你吃了他吗？"],choices:[{id:"found",label:"这是我在森林里捡到的",next:"chapter1_quest_request_ajie"},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
      ,chapter1_quest_request_ajie:{id:"chapter1_quest_request_ajie",progress:chapterProgress(4),goal:textGoal("是否帮助寻找阿见"),dialogue:{speaker:"阿杰",sub:"寻找阿见",pages:["……如果真是你捡到的，那你也许闻到过阿见的气味。","我不喜欢向魔物求助。","但如果你愿意帮我找到弟弟，我会记下这份人情。"],choices:[{id:"accept",label:"同意",set:{"flags.findAjianAccepted":true},next:"chapter1_quest_accepted_ajie"},{id:"decline",label:"拒绝",set:{"flags.findAjianDeclined":true},next:"chapter1_quest_declined_ajie"}]}}
      ,chapter1_quest_accepted_ajie:{id:"chapter1_quest_accepted_ajie",progress:chapterProgress(5),goal:textGoal("继续探索"),dialogue:{speaker:"阿杰",sub:"已接取：寻找阿见",pages:["……谢谢。","我们的营地在山洞附近。如果找到线索，就去那里找我。"],choices:[{id:"leave",label:"继续探索",next:"chapter1_explore"}]}}
      ,chapter1_quest_declined_ajie:{id:"chapter1_quest_declined_ajie",progress:chapterProgress(5),goal:textGoal("继续探索"),dialogue:{speaker:"阿杰",sub:"暂时拒绝",pages:["随你。","我会自己继续找。你要是改变主意，就来山洞旁的营地。"],choices:[{id:"leave",label:"继续探索",next:"chapter1_explore"}]}}
      ,chapter1_combat_pending:{id:"chapter1_combat_pending",progress:chapterProgress(3),goal:textGoal("击倒阿杰，或躲避追击 30 秒"),enter:{action:"waitAjieCombat"}}
      ,chapter1_ajie_body_learned:{id:"chapter1_ajie_body_learned",progress:chapterProgress(3),goal:textGoal("阿杰改变了攻击目标"),dialogue:{speaker:"阿杰",sub:"战斗中",pages:["什么？攻击竟然无法对巨蛇的身体造成伤害……","难道要打头才可以？"],choices:[{id:"continue",label:"继续战斗",next:"chapter1_combat_pending"}]}}
      ,chapter1_ajie_downed_wait:{id:"chapter1_ajie_downed_wait",progress:chapterProgress(3),goal:textGoal("靠近倒地的阿杰与他交谈"),enter:{action:"waitDownedInteraction"}}
      ,chapter1_ajie_downed:{id:"chapter1_ajie_downed",progress:chapterProgress(3),goal:textGoal("回应阿杰"),dialogue:{speaker:"阿杰",sub:"战败",pages:["我认可了你的强大，再无话说！","只可惜让丽丝陪我一起死了……"],choices:[{id:"release_lisi",label:"吐出丽丝",when:"hasLisi",action:"releaseLisi",next:"chapter1_lisi_released"},{id:"eat_ajie",label:"吃掉阿杰",action:"swallowAjie",next:"chapter1_both_swallowed",danger:true},{id:"leave",label:"离开",next:"chapter1_explore"}]}}
    }
  };

  root.IMS_STORY_DATA={PROLOGUE};
})(typeof window!=="undefined"?window:globalThis);
