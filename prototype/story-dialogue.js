"use strict";

(function(root){
  function splitPages(value){
    if(Array.isArray(value))return value.map(page=>String(page||"").trim()).filter(Boolean);
    return String(value||"")
      .replace(/\r\n?/g,"\n")
      .split(/\n[ \t]*\n+/)
      .map(page=>page.trim())
      .filter(Boolean);
  }

  function normalize(dialogue){
    const source=dialogue||{};
    const pages=splitPages(source.pages||source.text||"");
    return Object.assign({},source,{pages:pages.length?pages:[""]});
  }

  // 对白由某个键触发时，必须先松开该键，并经过极短的输入窗口，才能确认下一页。
  function createInputGate(delayMs){
    let openedAt=0,triggerCode=null,released=false,consumed=false;
    const requested=Number(delayMs),delay=Math.max(0,Number.isFinite(requested)?requested:100);
    const clock=now=>Number.isFinite(Number(now))?Number(now):Date.now();
    return {
      open(code,now){openedAt=clock(now);triggerCode=code||null;released=!triggerCode;consumed=false;},
      keyup(code){if(!triggerCode||!code||code===triggerCode)released=true;},
      canAdvance(now){return !consumed&&released&&clock(now)-openedAt>=delay;},
      consume(now){if(consumed||!released||clock(now)-openedAt<delay)return false;consumed=true;return true;},
      get released(){return released;},get triggerCode(){return triggerCode;}
    };
  }

  function actionHint(action,playerId){
    const input=root.InputMap;
    if(!input)return "";
    const id=playerId||1;
    const label=typeof input.bindingLabel==="function"?input.bindingLabel(id,action):input.keyLabel(input.snapshot().bindings[id][action]);
    return label?"["+label+"]":"";
  }

  root.IMS_STORY_DIALOGUE={splitPages,normalize,createInputGate,actionHint};
})(typeof window!=="undefined"?window:globalThis);
