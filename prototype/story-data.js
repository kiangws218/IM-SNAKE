"use strict";

(function(root){
  const MAPS=root.IMS_STORY_MAPS.TYPES;
  const progress=(step,total=8)=>({chapter:"序章",step,total});
  const textGoal=text=>({kind:"text",text});
  const counterGoal=(label,counter,target)=>({kind:"counter",label,counter,target});

  const PROLOGUE={
    id:"prologue",
    start:"prologue_start",
    nodes:{
      prologue_start:{
        id:"prologue_start",enter:{action:"loadMap",mapId:MAPS.TUTORIAL},next:"tutorial_1",
        progress:progress(1),goal:counterGoal("目标 吃豆","tutorialBeansEaten",3)
      },
      tutorial_1:{
        id:"tutorial_1",progress:progress(1),goal:counterGoal("目标 吃豆","tutorialBeansEaten",3),
        wait:{events:["PLAYER_BEAN_EATEN"],condition:"tutorialBeans3",target:"dialogue_1"}
      },
      dialogue_1:{
        id:"dialogue_1",progress:progress(2),goal:textGoal("阅读对话"),
        dialogue:{speaker:"我",sub:"序章 · 对话 1",pages:[
          "我究竟像这样吃了多久……",
          "感觉……有点恶心。",
          "要吐了！"
        ],choices:[{id:"go",label:"吐出来！",next:"tutorial_2"}]}
      },
      tutorial_2:{
        id:"tutorial_2",progress:progress(3),goal:counterGoal("目标 吐出","tutorialBeansSpit",3),
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
      input_player_name:{id:"input_player_name",enter:{action:"nameInput",next:"prologue_complete"},progress:progress(8),goal:textGoal("输入名字")},
      prologue_complete:{id:"prologue_complete",enter:{action:"storyEnd",title:"序章试玩完成",text:"名字和选择已经记录。后续章节会从这里继续。"},progress:progress(8),goal:textGoal("序章完成")}
    }
  };

  root.IMS_STORY_DATA={PROLOGUE};
})(typeof window!=="undefined"?window:globalThis);
