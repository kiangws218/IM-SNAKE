"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — 移动端触屏控件（v0.23 重做）
 * 对接引擎：VInput / 合成键盘事件 / touchMode 标志
 * ============================================================ */
(function(){
  if(typeof window==="undefined")return;

  /* ---------- 尽早注入 viewport，锁定手机布局 ---------- */
  (function(){
    if(!document.querySelector('meta[name="viewport"]')){
      const mv=document.createElement("meta");
      mv.setAttribute("name","viewport");
      mv.setAttribute("content","width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover");
      document.head.appendChild(mv);
    }
  })();

  const hasTouch=("ontouchstart" in window)||(navigator.maxTouchPoints>0);

  /* ---------- 工具 ---------- */
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
  let mode=null;
  try{mode=localStorage.getItem("imsnake_input");}catch(e){}

  function main(){
    fitCanvas();
    addEventListener("resize",fitCanvas);
    addEventListener("orientationchange",()=>setTimeout(fitCanvas,300));
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
    const mk=(label,sub,m)=>{
      const b=document.createElement("button");
      b.innerHTML="<div style='font-size:16px;font-weight:bold'>"+label+"</div>"+
        "<div style='font-size:10px;opacity:.55;margin-top:4px'>"+sub+"</div>";
      b.style.cssText="width:min(240px,72vw);padding:13px 8px;background:#23243a;"+
        "border:1px solid #3a3b5c;border-radius:10px;color:#e8e6f0;font-family:inherit;cursor:pointer;";
      b.addEventListener("pointerup",ev=>{ev.preventDefault();choose(m);});
      return b;
    };
    wrap.appendChild(mk("📱 手机触屏","虚拟方向键 · 大开火钮"));
    wrap.appendChild(mk("⌨️ 键盘鼠标","WASD + J/K/F"));
    document.body.appendChild(wrap);
  }
  function choose(m){
    mode=m;
    try{localStorage.setItem("imsnake_input",m);}catch(e){}
    const c=document.getElementById("imsChooser");
    if(c)c.remove();
    if(m==="touch")buildTouch();
    fitCanvas();portraitHint();
  }

  /* ---------- 触屏模式 ---------- */
  function buildTouch(){
    touchMode=true;
    lockPage();

    const T=58,G=8;
    function btn(glyph,x,y,w,h,accent){
      const d=document.createElement("div");
      d.textContent=glyph;
      d.style.cssText="position:fixed;z-index:6;display:flex;align-items:center;justify-content:center;"+
        "left:"+x+"px;top:"+y+"px;width:"+w+"px;height:"+h+"px;"+
        "border-radius:"+(w===h?"50%":"14px")+";"+
        "background:rgba(35,36,58,.62);border:2px solid "+(accent||"rgba(255,215,110,.55)")+";"+
        "color:"+ (accent&&accent.indexOf("217,87")>=0?"#fff":"#ffd76e") +";"+
        "font:bold "+Math.floor(h*.32)+"px Consolas;user-select:none;-webkit-user-select:none;touch-action:none;";
      return d;
    }
    function hold(node,down,up){
      const dn=ev=>{ev.preventDefault();node.style.background="rgba(99,199,77,.45)";down();};
      const up2=ev=>{ev.preventDefault();node.style.background="rgba(35,36,58,.62)";if(up)up();};
      node.addEventListener("touchstart",dn,{passive:false});
      node.addEventListener("touchend",up2,{passive:false});
      node.addEventListener("touchcancel",up2,{passive:false});
      node.addEventListener("mousedown",dn);
      node.addEventListener("mouseup",up2);
      node.addEventListener("mouseleave",()=>{if(up&&!VInput.fire)up2({preventDefault(){}});});
    }
    function fireHold(node,down,up){
      const dn=ev=>{ev.preventDefault();node.style.background="rgba(255,93,93,.55)";down();};
      const up2=ev=>{ev.preventDefault();node.style.background="rgba(217,87,99,.5)";if(up)up();};
      node.addEventListener("touchstart",dn,{passive:false});
      node.addEventListener("touchend",up2,{passive:false});
      node.addEventListener("touchcancel",up2,{passive:false});
      node.addEventListener("mousedown",dn);
      node.addEventListener("mouseup",up2);
    }

    /* 十字方向键（左下） */
    const S=64,Gp=6;
    const ox=Math.max(14,innerWidth*.06), oy=innerHeight-S*3-Gp*2-24;
    const cross=[
      ["w","▲",ox+S+Gp,oy],
      ["a","◀",ox,oy+S+Gp],
      ["d","▶",ox+2*(S+Gp),oy+S+Gp],
      ["s","▼",ox+S+Gp,oy+2*(S+Gp)],
    ];
    for(const[k,g,x,y]of cross){
      const b=btn(g,x,y,S,S);
      hold(b,()=>key(k,true),()=>key(k,false));
      document.body.appendChild(b);
    }

    /* 右下动作簇 */
    const FR=86;
    const fb=btn("吐豆",innerWidth-FR-18,innerHeight-FR-18,FR,FR,"rgba(217,87,99,.75)");
    fb.style.fontSize="17px";
    fireHold(fb,()=>{VInput.fire=true;},()=>{VInput.fire=false;});
    document.body.appendChild(fb);

    const cut=btn("断尾",innerWidth-FR-26-70,innerHeight-FR-14,70,58,"rgba(232,106,138,.6)");
    cut.style.fontSize="14px";
    hold(cut,()=>key("k",true),()=>key("k",false));
    document.body.appendChild(cut);

    const nd=btn("节点",innerWidth-FR-18,innerHeight-FR*2-Gp*3-6,70,52,"rgba(122,79,163,.7)");
    nd.style.fontSize="14px";
    hold(nd,()=>key("f",true),()=>key("f",false));
    document.body.appendChild(nd);

    const sp=btn("冲刺",innerWidth-FR-26-70,innerHeight-FR*2-Gp*3+2,70,52,"rgba(99,199,77,.65)");
    sp.style.fontSize="14px";
    hold(sp,()=>{VInput.boost=true;},()=>{VInput.boost=false;});
    document.body.appendChild(sp);

    /* 顶部小钮：暂停 / 全屏 */
    const ps=btn("Ⅱ",innerWidth-104,12,42,42);
    hold(ps,()=>key("p",true),()=>key("p",false));
    document.body.appendChild(ps);
    const fsb=btn("⛶",innerWidth-56,12,42,42);
    fsb.addEventListener("touchend",ev=>{
      ev.preventDefault();
      try{
        if(document.fullscreenElement)document.exitFullscreen();
        else{
          (document.documentElement.requestFullscreen||function(){}).call(document.documentElement);
          if(screen.orientation&&screen.orientation.lock)
            screen.orientation.lock("landscape").catch(()=>{});
        }
      }catch(err){}
      setTimeout(fitCanvas,400);
    },{passive:false});
    document.body.appendChild(fsb);

    fitCanvas();portraitHint();
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
  let hintT=null;
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
