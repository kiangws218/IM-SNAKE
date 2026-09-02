"use strict";
/* 可持久化的“物理按键 -> 玩家动作”映射。 */
(function(root){
  const STORAGE_KEY="imsnake_controls_v1";
  const ACTIONS=["up","down","left","right","fire","interact","prevItem","nextItem","cut","node"];
  const LABELS={up:"上移",down:"下移",left:"左移",right:"右移",fire:"吐豆",interact:"确认/交互",prevItem:"胃袋上一格",nextItem:"胃袋下一格",cut:"断尾",node:"放节点"};
  const DEFAULTS={
    1:{up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD",fire:"KeyJ",interact:"Enter",prevItem:"KeyQ",nextItem:"KeyE",cut:"KeyK",node:"KeyF"},
    2:{up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",fire:"Numpad0",interact:"NumpadEnter",prevItem:"Numpad4",nextItem:"Numpad6",cut:"Numpad1",node:"Numpad2"}
  };
  // 空格不再作为吐豆兼容键，确认动作单独使用 Enter。
  const SOLO_ALIASES={up:["ArrowUp"],down:["ArrowDown"],left:["ArrowLeft"],right:["ArrowRight"],cut:["ShiftLeft","ShiftRight"]};
  const KEY_TO_CODE={" ":"Space",space:"Space",shift:"ShiftLeft",enter:"Enter",numpadenter:"NumpadEnter",
    arrowup:"ArrowUp",arrowdown:"ArrowDown",arrowleft:"ArrowLeft",arrowright:"ArrowRight"};
  function copyDefaults(){return{1:Object.assign({},DEFAULTS[1]),2:Object.assign({},DEFAULTS[2])};}
  function load(){
    let raw=null;try{raw=JSON.parse(root.localStorage&&root.localStorage.getItem(STORAGE_KEY)||"null");}catch(e){}
    const cfg={playerCount:null,bindings:copyDefaults()};
    if(raw&&Number(raw.playerCount)>=1&&Number(raw.playerCount)<=2)cfg.playerCount=Number(raw.playerCount);
    if(raw&&raw.bindings)for(const id of[1,2])for(const a of ACTIONS){
      const v=raw.bindings[id]&&raw.bindings[id][a];if(typeof v==="string"&&v)cfg.bindings[id][a]=v;
    }
    return cfg;
  }
  let config=load();
  function save(){try{if(root.localStorage)root.localStorage.setItem(STORAGE_KEY,JSON.stringify(config));}catch(e){}}
  function eventCode(ev){
    if(ev&&ev.code)return ev.code;
    const key=String(ev&&ev.key||"");
    return KEY_TO_CODE[key.toLowerCase()]||(key.length===1&&/[a-z]/i.test(key)?"Key"+key.toUpperCase():key);
  }
  function actionFor(playerId,ev,bindings,count){
    const code=eventCode(ev),map=(bindings||config.bindings)[playerId]||{};
    for(const action of ACTIONS)if(map[action]===code)return action;
    const n=count==null?getPlayerCount():count;
    if(Number(playerId)===1&&n===1)for(const action of Object.keys(SOLO_ALIASES))if(SOLO_ALIASES[action].includes(code))return action;
    return null;
  }
  function conflict(code,exceptPlayer,exceptAction,count){
    const n=count||getPlayerCount();
    for(let id=1;id<=n;id++)for(const action of ACTIONS)
      if(!(id===Number(exceptPlayer)&&action===exceptAction)&&config.bindings[id][action]===code)return{player:id,action};
    return null;
  }
  function setBinding(playerId,action,code){
    if(!ACTIONS.includes(action)||!config.bindings[playerId]||!code)return false;
    config.bindings[playerId][action]=code;save();return true;
  }
  function setPlayerCount(n){config.playerCount=n===2?2:1;save();return config.playerCount;}
  function getPlayerCount(){return config.playerCount===2?2:1;}
  function needsPlayerChoice(){return config.playerCount!==1&&config.playerCount!==2;}
  function resetBindings(){config.bindings=copyDefaults();save();}
  function keyLabel(code){
    const pretty={Space:"空格",ShiftLeft:"左 Shift",ShiftRight:"右 Shift",ArrowUp:"↑",ArrowDown:"↓",ArrowLeft:"←",ArrowRight:"→",
      Enter:"回车",NumpadEnter:"小键盘回车",Numpad0:"小键盘 0",Numpad1:"小键盘 1",Numpad2:"小键盘 2",Numpad4:"小键盘 4",Numpad6:"小键盘 6"};
    return pretty[code]||String(code).replace(/^Key/,"").replace(/^Digit/,"");
  }
  function bindingFor(playerId,action){
    const id=Number(playerId)||1;return config.bindings[id]&&config.bindings[id][action]||null;
  }
  function bindingLabel(playerId,action){return keyLabel(bindingFor(playerId,action));}
  function snapshot(){return JSON.parse(JSON.stringify(config));}
  root.InputMap={STORAGE_KEY,ACTIONS,LABELS,DEFAULTS,SOLO_ALIASES,eventCode,actionFor,conflict,setBinding,
    setPlayerCount,getPlayerCount,needsPlayerChoice,resetBindings,keyLabel,bindingFor,bindingLabel,snapshot,save};
})(typeof window!=="undefined"?window:globalThis);
