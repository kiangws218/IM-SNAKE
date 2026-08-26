"use strict";
/* 输入动作映射：引擎只识别动作，不直接依赖物理按键。 */
(function(root){
  const DEFAULTS={
    1:{up:["KeyW","ArrowUp"],down:["KeyS","ArrowDown"],left:["KeyA","ArrowLeft"],right:["KeyD","ArrowRight"],fire:["KeyJ","Space"],cut:["KeyK","ShiftLeft","ShiftRight"],node:["KeyF"]},
    2:{up:["ArrowUp"],down:["ArrowDown"],left:["ArrowLeft"],right:["ArrowRight"],fire:["Numpad0"],cut:["Numpad1"],node:["Numpad2"]}
  };
  const KEY_TO_CODE={
    " ":"Space",space:"Space",shift:"ShiftLeft",enter:"Enter",
    arrowup:"ArrowUp",arrowdown:"ArrowDown",arrowleft:"ArrowLeft",arrowright:"ArrowRight"
  };
  function eventCode(ev){
    if(ev&&ev.code)return ev.code;
    const key=String(ev&&ev.key||"");
    return KEY_TO_CODE[key.toLowerCase()]||(key.length===1&&/[a-z]/i.test(key)?"Key"+key.toUpperCase():key);
  }
  function actionFor(playerId,ev,bindings){
    const code=eventCode(ev),map=(bindings||DEFAULTS)[playerId]||{};
    for(const action of Object.keys(map))if(map[action].includes(code))return action;
    return null;
  }
  root.InputMap={DEFAULTS,eventCode,actionFor};
})(typeof window!=="undefined"?window:globalThis);
