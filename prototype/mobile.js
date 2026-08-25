/* ============================================================
 * IM SNAKE · mobile.js v0.1 —— 移动端触屏控件轨道
 * 归属：AGENTS.md「文件领地」mobile.js 轨道；不改任何现有文件。
 *
 * 引擎契约：
 *   - 写全局 VInput{ax,ay,active,boost,fire}（index.html 内联脚本定义）
 *     · 左侧动态摇杆 → ax/ay(-1~1) + active；行程>70% → boost(2倍速)
 *     · 右下开火钮 → fire（站桩连射）
 *   - 「断尾」「节点」小钮 → 合成键盘事件 keydown+keyup 'k' / 'f'
 *
 * 安全性：桌面端（无触屏）本脚本零 DOM、零事件、零样式注入；
 *        所有初始化包在 boot() 内，仅检测到触屏才执行（冒烟测试安全）。
 * ============================================================ */
(function(){
function hasTouch(){
  try{
    if(typeof window==="undefined")return false;          /* 无头环境（冒烟测试）直接退出 */
    if("ontouchstart" in window)return true;
    if(typeof navigator!=="undefined"&&navigator.maxTouchPoints>0)return true;
  }catch(e){}
  return false;
}

function boot(){
  if(typeof VInput==="undefined"){                        /* 引擎契约缺失时静默降级 */
    if(window.console&&console.warn)console.warn("[mobile] VInput 未定义，触屏控件停用");
    return;
  }

  /* ---------- 运行时注入视口 meta 与样式（不动 index.html） ---------- */
  try{
    var vp=document.createElement("meta");
    vp.name="viewport";
    vp.content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";
    document.head.appendChild(vp);
  }catch(e){}

  var css=""
    +"html,body{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}"
    +"#cv,#tut{touch-action:none;}"
    +"#msRoot{position:fixed;left:0;top:0;right:0;bottom:0;z-index:5;pointer-events:none;"
    +"font-family:'Courier New',monospace;}"
    +"#msRoot *{box-sizing:border-box;}"
    +"#msZone{position:absolute;left:0;top:0;width:45%;height:100%;pointer-events:auto;touch-action:none;}"
    +"#msBase,#msCap{position:absolute;display:none;border-radius:50%;pointer-events:none;"
    +"transform:translate(-50%,-50%);will-change:left,top;}"
    +"#msBase{width:116px;height:116px;background:rgba(10,12,18,.40);"
    +"border:2px solid rgba(255,215,110,.55);box-shadow:inset 0 0 22px rgba(255,215,110,.12);}"
    +"#msCap{width:52px;height:52px;background:rgba(255,215,110,.25);border:2px solid #ffd76e;}"
    +"#msCap.msBoost{background:rgba(255,143,94,.35);border-color:#ff8f5e;}"
    +".msBtn{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;"
    +"gap:3px;pointer-events:auto;touch-action:none;border-radius:50%;background:rgba(10,12,18,.45);"
    +"border:2px solid rgba(255,215,110,.65);color:#ffd76e;text-align:center;line-height:1;}"
    +".msBtn b{font-weight:normal;font-size:14px;letter-spacing:2px;}"
    +".msBtn i{font-style:normal;font-size:10px;opacity:.55;}"
    +".msBtn.msOn{background:rgba(255,215,110,.30);border-color:#ffd76e;color:#fff3cf;}"
    +"#msFire{right:20px;bottom:calc(26px + env(safe-area-inset-bottom,0px));width:96px;height:96px;}"
    +"#msFire b{font-size:17px;letter-spacing:4px;text-indent:4px;}"
    +"#msCut{right:130px;bottom:calc(120px + env(safe-area-inset-bottom,0px));width:62px;height:62px;}"
    +"#msNode{right:32px;bottom:calc(146px + env(safe-area-inset-bottom,0px));width:62px;height:62px;}";
  var style=document.createElement("style");
  style.textContent=css;
  document.head.appendChild(style);

  var root=document.createElement("div");
  root.id="msRoot";
  root.innerHTML='<div id="msZone"></div>'
    +'<div id="msBase"></div><div id="msCap"></div>'
    +'<div class="msBtn" id="msCut"><b>断尾</b><i>K</i></div>'
    +'<div class="msBtn" id="msNode"><b>节点</b><i>F</i></div>'
    +'<div class="msBtn" id="msFire"><b>吐豆</b></div>';
  document.body.appendChild(root);

  var zone=document.getElementById("msZone"),
      base=document.getElementById("msBase"),
      cap =document.getElementById("msCap"),
      fire=document.getElementById("msFire"),
      cut =document.getElementById("msCut"),
      node=document.getElementById("msNode");

  /* ---------- 左手动态摇杆：按下处为中心，拖动偏移 → VInput ---------- */
  var MAXR=56, joyId=null, cx=0, cy=0;
  function calcR(){
    var m=Math.min(window.innerWidth,window.innerHeight);
    MAXR=Math.max(44,Math.min(76,m*0.11));
  }
  function showBase(){
    base.style.left=cx+"px"; base.style.top=cy+"px"; base.style.display="block";
  }
  function setStick(tx,ty){
    var dx=tx-cx, dy=ty-cy, d=Math.hypot(dx,dy)||1;
    var cl=Math.min(d,MAXR), ux=dx/d, uy=dy/d;
    cap.style.left=(cx+ux*cl)+"px";
    cap.style.top =(cy+uy*cl)+"px";
    cap.style.display="block";
    VInput.ax=Math.max(-1,Math.min(1,dx/MAXR));           /* 模拟量 -1 ~ 1 */
    VInput.ay=Math.max(-1,Math.min(1,dy/MAXR));
    VInput.active=true;
    VInput.boost=d>MAXR*0.7;                              /* 满行程 70% 即冲刺 */
    if(VInput.boost)cap.classList.add("msBoost");else cap.classList.remove("msBoost");
  }
  function releaseJoy(){
    joyId=null;
    base.style.display="none"; cap.style.display="none";
    cap.classList.remove("msBoost");
    VInput.active=false; VInput.boost=false;
    VInput.ax=0; VInput.ay=-1;                            /* 复位为引擎初值 */
  }
  function findTouch(list,id){
    for(var i=0;i<list.length;i++)if(list[i].identifier===id)return list[i];
    return null;
  }
  zone.addEventListener("touchstart",function(e){
    e.preventDefault();
    if(joyId!==null)return;
    var t=e.changedTouches[0];
    joyId=t.identifier; cx=t.clientX; cy=t.clientY;
    calcR(); showBase(); setStick(t.clientX,t.clientY);
  },{passive:false});
  zone.addEventListener("touchmove",function(e){
    e.preventDefault();
    if(joyId===null)return;
    var t=findTouch(e.changedTouches,joyId);
    if(t)setStick(t.clientX,t.clientY);
  },{passive:false});
  function joyEnd(e){
    if(joyId===null)return;
    if(findTouch(e.changedTouches,joyId))releaseJoy();
  }
  zone.addEventListener("touchend",joyEnd,{passive:false});
  zone.addEventListener("touchcancel",joyEnd,{passive:false});

  /* ---------- 右手开火钮：按住 fire=true，松开 false ---------- */
  function press(el,on){if(on)el.classList.add("msOn");else el.classList.remove("msOn");}
  fire.addEventListener("touchstart",function(e){
    e.preventDefault(); VInput.fire=true; press(fire,true);
  },{passive:false});
  function fireEnd(e){e.preventDefault();VInput.fire=false;press(fire,false);}
  fire.addEventListener("touchend",fireEnd,{passive:false});
  fire.addEventListener("touchcancel",fireEnd,{passive:false});

  /* ---------- 小钮：合成键盘事件触发引擎逻辑 ---------- */
  function tapKey(key){
    window.dispatchEvent(new KeyboardEvent("keydown",{key:key}));
    window.dispatchEvent(new KeyboardEvent("keyup",{key:key}));
  }
  function bindTap(el,key){
    el.addEventListener("touchstart",function(e){
      e.preventDefault(); press(el,true); tapKey(key);
      setTimeout(function(){press(el,false);},130);
    },{passive:false});
    function end(e){e.preventDefault();press(el,false);}
    el.addEventListener("touchend",end,{passive:false});
    el.addEventListener("touchcancel",end,{passive:false});
  }
  bindTap(cut,"k");                                       /* 断尾 */
  bindTap(node,"f");                                      /* 节点 */

  /* ---------- 全局防滚动/缩放 & 状态自愈 ---------- */
  document.addEventListener("touchmove",function(e){
    var t=e.target;
    if(t&&t.closest&&t.closest("#overlay"))return;        /* 菜单/选卡界面允许滚动 */
    e.preventDefault();
  },{passive:false});
  document.addEventListener("gesturestart",function(e){e.preventDefault();});
  root.addEventListener("contextmenu",function(e){e.preventDefault();});

  function hardReset(){                                   /* 失焦/切后台时清空输入，防止粘键 */
    releaseJoy();
    VInput.fire=false;
    press(fire,false); press(cut,false); press(node,false);
  }
  window.addEventListener("blur",hardReset);
  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState==="hidden")hardReset();
  });
}

if(hasTouch()){
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
}
})();
