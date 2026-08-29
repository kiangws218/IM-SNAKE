"use strict";
/* 玩家人数与键位设置 UI；零依赖，配置由 InputMap 持久化。 */
(function(root){
  if(typeof document==="undefined")return;
  const S={panel:null,body:null,status:null,capture:null,countOnly:false,inputMode:null};
  function el(tag,text){const n=document.createElement(tag);if(!n.dataset)n.dataset={};if(text!=null)n.textContent=text;return n;}
  function style(){
    if(document.getElementById("imsSettingsStyle"))return;
    const s=el("style");s.id="imsSettingsStyle";s.textContent=
      "#imsSettings{position:fixed;inset:0;z-index:75;background:rgba(8,8,16,.94);display:none;align-items:center;justify-content:center;font-family:Consolas,monospace;color:#e8e6f0}"+
      "#imsSettingsCard{width:min(700px,92vw);max-height:88vh;overflow:auto;background:#171827;border:2px solid #ffd76e;border-radius:12px;padding:18px}"+
      "#imsSettings h2{color:#ffd76e;letter-spacing:3px;margin-bottom:12px}.ims-count{display:flex;gap:10px;margin:12px 0 18px}.ims-count button,.ims-bind,.ims-close,.ims-reset{background:#23243a;color:#e8e6f0;border:1px solid #3a3b5c;border-radius:7px;padding:8px 12px;font:13px Consolas;cursor:pointer}.ims-count button.on,.ims-bind.capture{border-color:#ffd76e;color:#ffd76e}.ims-player{margin-top:12px;padding:12px;background:#101120;border-radius:8px}.ims-player h3{margin-bottom:8px}.ims-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 14px}.ims-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.ims-status{min-height:20px;color:#ffb3ba;margin:10px 0}.ims-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}@media(max-width:560px){.ims-grid{grid-template-columns:1fr}}";
    (document.head||document.body).appendChild(s);
  }
  function build(){
    if(S.panel)return;style();
    const wrap=el("div");wrap.id="imsSettings";
    const card=el("div");card.id="imsSettingsCard";
    const title=el("h2","游戏设置");card.appendChild(title);
    const intro=el("div","玩家数量");intro.style.color="#8b88a3";card.appendChild(intro);
    const counts=el("div");counts.className="ims-count";
    for(const n of[1,2]){const b=el("button",n+" 人");b.dataset.count=String(n);b.onclick=()=>chooseCount(n);counts.appendChild(b);}
    card.appendChild(counts);
    S.body=el("div");card.appendChild(S.body);
    S.status=el("div");S.status.className="ims-status";card.appendChild(S.status);
    const actions=el("div");actions.className="ims-actions";
    const reset=el("button","恢复默认键位");reset.className="ims-reset";reset.onclick=()=>{InputMap.resetBindings();S.status.textContent="键位已恢复默认";render();};
    const close=el("button","完成");close.className="ims-close";close.onclick=closePanel;actions.appendChild(reset);actions.appendChild(close);card.appendChild(actions);
    wrap.appendChild(card);document.body.appendChild(wrap);S.panel=wrap;S.closeBtn=close;S.resetBtn=reset;S.countBtns=counts.children;
  }
  function chooseCount(n){
    InputMap.setPlayerCount(n);S.status.textContent="已选择 "+n+" 人"+(typeof gameState!=="undefined"&&gameState==="play"?"，下一局生效":"");
    S.countOnly=false;render();
  }
  function render(){
    build();const count=InputMap.getPlayerCount(),cfg=InputMap.snapshot();
    for(const b of Array.from(S.countBtns||[]))b.className=Number(b.dataset.count)===count?"on":"";
    S.body.innerHTML="";
    for(let id=1;id<=count;id++){
      const box=el("div");box.className="ims-player";
      const h=el("h3","P"+id+(id===1?" · 绿色":" · 蓝色"));h.style.color=id===1?"#8fe36b":"#7fd1e8";box.appendChild(h);
      const grid=el("div");grid.className="ims-grid";
      for(const action of InputMap.ACTIONS){
        const row=el("div");row.className="ims-row";row.appendChild(el("span",InputMap.LABELS[action]));
        const b=el("button",InputMap.keyLabel(cfg.bindings[id][action]));b.className="ims-bind";
        b.onclick=()=>beginCapture(id,action,b);row.appendChild(b);grid.appendChild(row);
      }
      box.appendChild(grid);S.body.appendChild(box);
    }
    S.closeBtn.style.display=S.countOnly&&InputMap.needsPlayerChoice()?"none":"";
    S.resetBtn.style.display=S.countOnly?"none":"";
  }
  function beginCapture(id,action,button){
    if(S.capture&&S.capture.button)S.capture.button.className="ims-bind";
    S.capture={id,action,button};button.className="ims-bind capture";button.textContent="请按新按键…";
    S.status.textContent="正在修改 P"+id+" · "+InputMap.LABELS[action]+"；Esc 取消";
  }
  function captureKey(ev){
    if(!S.capture)return;const code=InputMap.eventCode(ev);
    if(ev.preventDefault)ev.preventDefault();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    if(code==="Escape"){S.capture=null;S.status.textContent="已取消";render();return;}
    const hit=InputMap.conflict(code,S.capture.id,S.capture.action,InputMap.getPlayerCount());
    if(hit){S.status.textContent="按键冲突：已用于 P"+hit.player+" · "+InputMap.LABELS[hit.action];return;}
    InputMap.setBinding(S.capture.id,S.capture.action,code);
    S.status.textContent="已保存 P"+S.capture.id+" · "+InputMap.LABELS[S.capture.action];S.capture=null;render();
  }
  function open(countOnly){
    build();S.countOnly=!!countOnly;S.status.textContent=countOnly?"请选择使用键盘游玩的玩家数量":"修改会自动保存";
    S.panel.style.display="flex";render();
  }
  function closePanel(){if(S.capture)S.capture=null;if(S.panel)S.panel.style.display="none";}
  function onInputChosen(mode,forceCountChoice){
    S.inputMode=mode;
    if(mode==="touch"){if(InputMap.needsPlayerChoice())InputMap.setPlayerCount(1);return;}
    if(mode==="kb"&&(forceCountChoice||InputMap.needsPlayerChoice()))open(true);
  }
  function init(){
    build();
    const menu=document.getElementById("ovBtn7");if(menu)menu.onclick=()=>open(false);
    const pause=document.getElementById("pauseSettings");if(pause)pause.onclick=()=>open(false);
    if(!S.keyHook){addEventListener("keydown",captureKey,true);S.keyHook=true;}
  }
  root.GameSettings={init,open,close:closePanel,onInputChosen,state:S};
})(typeof window!=="undefined"?window:globalThis);
