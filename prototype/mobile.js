"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — 移动端触屏控件（v0.23 响应式布局版）
 * 对接引擎：VInput / 合成键盘事件 / touchMode 标志
 * ============================================================ */
(function(){
  if(typeof window==="undefined")return;

  let hintT=null;
  const ui={};

  /* ---------- 尽早注入 viewport ---------- */
  (function(){
    if(!document.querySelector('meta[name="viewport"]')){
      const mv=document.createElement("meta");
      mv.setAttribute("name","viewport");
      mv.setAttribute("content","width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover");
      document.head.appendChild(mv);
    }
  })();

  const hasTouch=("ontouchstart" in window)||(navigator.maxTouchPoints>0);

  function fatal(msg){
    const b=document.createElement("div");
    b.style.cssText="position:fixed;top:0;left:0;right:0;z-index:999;background:#7a1020;color:#fff;"+
      "font:11px Consolas;padding:6px;white-space:pre-wrap;";
    b.textContent="[触屏控件错误] "+msg;
    document.body.appendChild(b);
  }
  function key(name,down){
    window.dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{key:name}));
  }

  /* ---------- 主流程 ---------- */
  const STORE_KEY="imsnake_input_v23";
  const BUILD="v0.23";
  let mode=null;
  try{mode=localStorage.getItem(STORE_KEY);}catch(e){}

  function statusChip(){
    let h=document.getElementById("imsStatus");
    if(!h){
      h=document.createElement("div");h.id="imsStatus";
      h.style.cssText="position:fixed;top:6px;left:6px;z-index:40;pointer-events:none;"+
        "font:10px Consolas;color:rgba(232,230,240,.55);background:rgba(10,10,20,.4);"+
        "padding:2px 6px;border-radius:4px;";
      document.body.appendChild(h);
    }
    h.textContent=BUILD+" · 触屏:"+(hasTouch?"✓":"✗")+" · 模式:"+(mode||"未选");
  }
  function gear(){
    const g=document.createElement("div");
    g.textContent="操作⚙";
    g.style.cssText="position:fixed;top:6px;right:6px;z-index:45;pointer-events:auto;cursor:pointer;"+
      "font:10px Consolas;color:#ffd76e;background:rgba(10,10,20,.55);padding:3px 8px;border-radius:4px;"+
      "border:1px solid #3a3b5c;";
    g.addEventListener("pointerup",ev=>{
      ev.preventDefault();
      try{localStorage.removeItem(STORE_KEY);}catch(e){}
      location.reload();
    });
    document.body.appendChild(g);
  }

  function main(){
    fitCanvas();
    addEventListener("resize",()=>{fitCanvas();layout();});
    addEventListener("orientationchange",()=>setTimeout(()=>{fitCanvas();layout();},300));
    statusChip();
    if(hasTouch&&mode!=="kb")gear();
    if(mode==="touch")buildTouch();
    else if(mode==="kb"){touchMode=false;}
    else buildChooser();
    addEventListener("resize",portraitHint);
    portraitHint();
  }

  try{ main(); }
  catch(e){
    try{fatal(e.message+"\n"+(e.stack||"").split("\n")[1]);}catch(e2){}
  }

  /* ---------- 选择窗口 ---------- */
  function buildChooser(){
    const wrap=document.createElement("div");
    wrap.id="imsChooser";
    wrap.style.cssText="position:fixed;inset:0;z-index:60;background:rgba(8,8,16,.94);"+
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;"+
      "font-family:Consolas,monospace;color:#e8e6f0;touch-action:none;";
    const t=document.createElement("div");
    t.textContent="请选择操作方式";
    t.style.cssText="font-size:19px;letter-spacing:4px;color:#ffd76e;margin-bottom:6px;";
    wrap.appendChild(t);
    const mk=(label,sub,m,accent)=>{
      const b=document.createElement("button");
      b.innerHTML="<div style='font-size:16px;font-weight:bold'>"+label+"</div>"+
        "<div style='font-size:10px;opacity:.55;margin-top:4px'>"+sub+"</div>";
      b.style.cssText="width:min(240px,72vw);padding:13px 8px;background:#23243a;"+
        "border:2px solid "+(accent||"#3a3b5c")+";border-radius:10px;color:#e8e6f0;"+
        "font-family:inherit;cursor:pointer;";
      b.addEventListener("pointerup",ev=>{ev.preventDefault();choose(m);});
      return b;
    };
    wrap.appendChild(mk("📱 手机触屏","虚拟方向键 · 大开火钮","touch","#ffd76e"));
    wrap.appendChild(mk("⌨️ 键盘鼠标","WASD + J/K/F","kb"));
    const ver=document.createElement("div");
    ver.textContent=BUILD+" · 触屏检测:"+(hasTouch?"✓":"✗");
    ver.style.cssText="font-size:10px;color:rgba(232,230,240,.4);";
    wrap.appendChild(ver);
    document.body.appendChild(wrap);
  }
  function choose(m){
    mode=m;
    try{localStorage.setItem(STORE_KEY,m);}catch(e){}
    const c=document.getElementById("imsChooser");
    if(c)c.remove();
    statusChip();
    if(m==="touch")buildTouch();
    fitCanvas();layout();portraitHint();
  }

  /* ---------- 触屏模式 ---------- */
  function buildTouch(){
    touchMode=true;
    lockPage();

    const mk=(txt,accent)=>{
      const d=document.createElement("div");
      d.textContent=txt;
      d.style.cssText="position:fixed;z-index:6;display:flex;align-items:center;justify-content:center;"+
        "user-select:none;-webkit-user-select:none;touch-action:none;"+
        "background:rgba(35,36,58,.62);border:2px solid "+(accent||"rgba(255,215,110,.55)")+";"+
        "color:#ffd76e;font:bold 14px Consolas;"+
        "border-radius:"+(accent&&accent.indexOf("217,87")>=0?"50%":"16px")+";";
      return d;
    };
    ui.up=mk("▲");ui.down=mk("▼");ui.left=mk("◀");ui.right=mk("▶");
    ui.fire=mk("吐豆","rgba(217,87,99,.75)");
    ui.cut=mk("断尾","rgba(232,106,138,.6)");
    ui.node=mk("节点","rgba(122,79,163,.7)");
    ui.sprint=mk("冲刺","rgba(99,199,77,.65)");
    ui.pause=mk("Ⅱ");ui.fs=mk("⛶");
    for(const k of["up","down","left","right","fire","cut","node","sprint","pause","fs"])
      document.body.appendChild(ui[k]);

    const cross={up:["w"],left:["a"],right:["d"],down:["s"]};
    for(const[elName,keys]of Object.entries(cross))
      hold(ui[elName],()=>keys.forEach(k=>key(k,true)),()=>keys.forEach(k=>key(k,false)));
    hold(ui.fire,()=>{VInput.fire=true;},()=>{VInput.fire=false;});
    hold(ui.cut,()=>key("k",true),()=>key("k",false));
    hold(ui.node,()=>key("f",true),()=>key("f",false));
    hold(ui.sprint,()=>{VInput.boost=true;},()=>{VInput.boost=false;});
    hold(ui.pause,()=>key("p",true),()=>key("p",false));
    ui.fs.addEventListener("touchend",ev=>{
      ev.preventDefault();
      try{
        if(document.fullscreenElement)document.exitFullscreen();
        else{
          (document.documentElement.requestFullscreen||function(){}).call(document.documentElement);
          if(screen.orientation&&screen.orientation.lock)
            screen.orientation.lock("landscape").catch(()=>{});
        }
      }catch(err){}
      setTimeout(()=>{fitCanvas();layout();},400);
    },{passive:false});

    layout();fitCanvas();portraitHint();
  }

  function hold(node,down,up){
    const dn=ev=>{ev.preventDefault();node.style.filter="brightness(1.5)";down();};
    const up2=ev=>{ev.preventDefault();node.style.filter="";if(up)up();};
    node.addEventListener("touchstart",dn,{passive:false});
    node.addEventListener("touchend",up2,{passive:false});
    node.addEventListener("touchcancel",up2,{passive:false});
    node.addEventListener("mousedown",dn);
    node.addEventListener("mouseup",up2);
  }

  /* ---------- 响应式布局：全部锚定屏幕边，横竖屏各自排布 ---------- */
  function layout(){
    if(mode!=="touch"||!ui.fire)return;
    const iw=innerWidth,ih=innerHeight,land=iw>=ih;
    const S=Math.round(Math.max(46,Math.min(64,land?ih*.17:iw*.16)));
    const G=Math.round(S*.12);
    const M=Math.round(Math.max(10,S*.2));
    const FR=Math.round(Math.min(S*1.4,ih*.3,96));
    const side=Math.round(FR*.72);
    const pos=(el2,l,t,w,h)=>{
      el2.style.left=l+"px";el2.style.top=t+"px";
      el2.style.width=w+"px";el2.style.height=h+"px";
      el2.style.fontSize=Math.round(h*.3)+"px";
    };
    /* 十字键：左下角，底部锚定 */
    const bx=M,byB=ih-M;
    pos(ui.left,bx,byB-S,S,S);
    pos(ui.right,bx+2*(S+G),byB-S,S,S);
    pos(ui.down,bx+S+G,byB-S,S,S);
    pos(ui.up,bx+S+G,byB-2*S-G,S,S);
    /* 动作簇：右下角，底部锚定 */
    pos(ui.fire,iw-M-FR,byB-FR,FR,FR);
    pos(ui.cut,iw-M-FR-G-side,byB-side,side,side);
    pos(ui.sprint,iw-M-FR-G-side,byB-2*side-G-Math.round((FR-side)/2),side,side);
    pos(ui.node,iw-M-FR,byB-FR-G-side,side,side);
    /* 顶部小钮：右上，顶部锚定 */
    pos(ui.fs,iw-M-46,M,42,42);
    pos(ui.pause,iw-M-46-46-G,M,42,42);
  }

  function lockPage(){
    const st=document.createElement("style");
    st.textContent=
      "html,body{overflow:hidden!important;height:100%;margin:0;}"+
      "body{position:fixed;left:0;top:0;right:0;touch-action:none;overscroll-behavior:none;"+
      "-webkit-user-select:none;user-select:none;}"+
      "#cv{display:block;margin:0 auto;}";
    document.head.appendChild(st);
    document.addEventListener("touchmove",e=>e.preventDefault(),{passive:false});
    scrollTo(0,0);
  }

  /* ---------- 画布适配 ---------- */
  function fitCanvas(){
    const cv=document.getElementById("cv");
    if(!cv)return;
    const reserveH=(typeof touchMode!=="undefined"&&touchMode)?0.68:0.85;
    const s=Math.min((innerWidth*0.98)/cv.width,(innerHeight*reserveH)/cv.height,1.15);
    cv.style.width=Math.round(cv.width*s)+"px";
    cv.style.height=Math.round(cv.height*s)+"px";
  }

  /* ---------- 竖屏提示 ---------- */
  function portraitHint(){
    if(mode!=="touch")return;
    if(innerHeight>innerWidth){
      let h=document.getElementById("imsRotate");
      if(!h){
        h=document.createElement("div");h.id="imsRotate";
        h.style.cssText="position:fixed;top:56px;left:50%;transform:translateX(-50%);z-index:20;"+
          "background:rgba(255,215,110,.92);color:#1a1023;padding:6px 14px;border-radius:6px;"+
          "font:bold 12px Consolas;pointer-events:none;";
        document.body.appendChild(h);
      }
      h.textContent="建议横屏体验 ⤺（右上角 ⛶ 可全屏锁定）";
      h.style.display="block";
      clearTimeout(hintT);
      hintT=setTimeout(()=>{h.style.display="none";},3200);
    }else{
      const h=document.getElementById("imsRotate");
      if(h)h.style.display="none";
    }
  }

  addEventListener("blur",()=>{
    VInput.fire=false;VInput.boost=false;VInput.active=false;fireKey=false;
    try{heldKeys.clear();}catch(e){}
  });
})();
