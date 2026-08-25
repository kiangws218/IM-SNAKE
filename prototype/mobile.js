"use strict";
/* ============================================================
 * 我蛇了 IM SNAKE — 移动端触屏控件（v0.18 重做）
 * 领地：仅本文件。对接引擎：VInput 全局 + 合成键盘事件 + touchMode 标志
 * ============================================================ */
(function(){
  if(typeof window==="undefined")return;
  const hasTouch=("ontouchstart" in window)||(navigator.maxTouchPoints>0);

  let saved=null;
  try{saved=localStorage.getItem("imsnake_input");}catch(e){}

  /* ---------- 画布自适应（横竖屏通用） ---------- */
  function fitCanvas(){
    const cv=document.getElementById("cv");
    if(!cv)return;
    const reserveH=(touchMode===true)?0.66:0.85;
    const s=Math.min((innerWidth*0.98)/cv.width,(innerHeight*reserveH)/cv.height,1.15);
    cv.style.width=Math.round(cv.width*s)+"px";
    cv.style.height=Math.round(cv.height*s)+"px";
  }
  addEventListener("resize",fitCanvas);
  addEventListener("orientationchange",()=>setTimeout(fitCanvas,250));

  /* ---------- 选择窗口 ---------- */
  function buildChooser(){
    const wrap=document.createElement("div");
    wrap.style.cssText="position:fixed;inset:0;z-index:50;background:rgba(8,8,16,.92);"+
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;"+
      "font-family:Consolas,monospace;color:#e8e6f0;";
    const t=document.createElement("div");
    t.textContent="请选择操作方式";
    t.style.cssText="font-size:20px;letter-spacing:4px;color:#ffd76e;";
    wrap.appendChild(t);
    const mk=(label,sub,m)=>{
      const b=document.createElement("button");
      b.innerHTML="<div style='font-size:17px;font-weight:bold'>"+label+"</div>"+
        "<div style='font-size:11px;opacity:.6;margin-top:4px'>"+sub+"</div>";
      b.style.cssText="width:230px;padding:14px 10px;background:#23243a;border:1px solid #3a3b5c;"+
        "border-radius:10px;color:#e8e6f0;font-family:inherit;cursor:pointer;text-align:center;";
      b.onpointerup=ev=>{ev.preventDefault();choose(m);};
      return b;
    };
    wrap.appendChild(mk("手机触屏","虚拟方向键 + 操作钮"));
    wrap.appendChild(mk("键盘鼠标","WASD / J / K / F"));
    document.body.appendChild(wrap);
    return wrap;
  }

  function choose(m){
    mode=m;
    try{localStorage.setItem("imsnake_input",m);}catch(e){}
    if(chooser&&chooser.parentNode)chooser.parentNode.removeChild(chooser);
    if(m==="touch")buildTouchUI();
    fitCanvas();
  }

  let chooser=null,mode=saved;

  /* ---------- 触屏 UI ---------- */
  function el(txt,css){
    const d=document.createElement("div");
    d.textContent=txt;
    d.style.cssText=css+"user-select:none;-webkit-user-select:none;touch-action:none;"+
      "display:flex;align-items:center;justify-content:center;font-family:Consolas,monospace;";
    return d;
  }
  const BTN="position:fixed;z-index:6;border-radius:50%;background:rgba(35,36,58,.55);"+
    "border:2px solid rgba(255,215,110,.5);color:#ffd76e;font-weight:bold;";

  function bindHold(node,keyDown,keyUp){
    const down=ev=>{ev.preventDefault();keyDown();};
    const up=ev=>{ev.preventDefault();if(keyUp)keyUp();};
    node.addEventListener("touchstart",down,{passive:false});
    node.addEventListener("touchend",up,{passive:false});
    node.addEventListener("touchcancel",up,{passive:false});
    node.addEventListener("mousedown",down);
    node.addEventListener("mouseup",up);
    node.addEventListener("mouseleave",up);
  }
  function key(name,down){ 
    window.dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{key:name}));
  }

  function buildTouchUI(){
    touchMode=true;
    document.documentElement.style.cssText+="overscroll-behavior:none;";
    document.body.style.cssText+="touch-action:none;-webkit-user-select:none;user-select:none;";

    /* 十字方向键（左下） */
    const U=44,G=6,BASE=210;
    const cx=U+G,cy=innerHeight-U*1.5-G-90;
    const pad=el("", "position:fixed;z-index:6;");
    const dirs=[
      ["w","▲",cx+U+G,cy],
      ["a","◀",cx,cy+U+G],
      ["d","▶",cx+2*(U+G),cy+U+G],
      ["s","▼",cx+U+G,cy+2*(U+G)],
    ];
    for(const[keyName,glyph,bx,by]of dirs){
      const b=el(glyph,BTN+"width:"+U+"px;height:"+U+"px;left:"+bx+"px;top:"+by+"px;"+
        "background:rgba(35,36,58,.7);");
      bindHold(b,()=>{key(keyName,true);heldKeysAdd(keyName);},()=>{key(keyName,false);heldKeysDel(keyName);});
      pad.appendChild(b);
    }
    document.body.appendChild(pad);

    /* 右侧动作钮 */
    const R=76;
    const fire=el("吐豆",BTN+"width:"+R+"px;height:"+R+"px;right:"+(G+8)+"px;bottom:"+(G*3+150)+"px;"+
      "font-size:16px;background:rgba(217,87,99,.55);border-color:rgba(255,120,130,.7);color:#fff;");
    bindHold(fire,()=>{VInput.fire=true;},()=>{VInput.fire=false;});
    document.body.appendChild(fire);

    const cut=el("断尾",BTN.replace("50%","12px")+"width:60px;height:60px;right:"+(G+16+R)+"px;bottom:"+(G*3+160)+"px;font-size:13px;");
    bindHold(cut,()=>key("k",true),()=>key("k",false));
    document.body.appendChild(cut);

    const node=el("节点",BTN.replace("50%","12px")+"width:60px;height:60px;right:"+(G+8)+"px;bottom:"+(G*3+70)+"px;font-size:13px;");
    bindHold(node,()=>key("f",true),()=>key("f",false));
    document.body.appendChild(node);

    const sprint=el("冲刺",BTN.replace("50%","12px")+"width:60px;height:60px;right:"+(G+16+R)+"px;bottom:"+(G*3+80)+"px;font-size:13px;border-color:#63c74d;color:#63c74d;");
    bindHold(sprint,()=>{VInput.boost=true;sprint.style.background="rgba(99,199,77,.5)";},
      ()=>{VInput.boost=false;sprint.style.background="rgba(35,36,58,.55)";});
    document.body.appendChild(sprint);

    /* 暂停 + 全屏（顶部小钮） */
    const pause=el("Ⅱ",BTN.replace("50%","10px")+"width:40px;height:40px;top:8px;right:52px;font-size:15px;");
    bindHold(pause,()=>key("p",true),()=>key("p",false));
    document.body.appendChild(pause);

    const fs=el("⛶",BTN.replace("50%","10px")+"width:40px;height:40px;top:8px;right:6px;font-size:16px;");
    fs.addEventListener("touchend",ev=>{ev.preventDefault();
      try{
        if(document.fullscreenElement)document.exitFullscreen();
        else{
          (document.documentElement.requestFullscreen||function(){}).call(document.documentElement);
          if(screen.orientation&&screen.orientation.lock)screen.orientation.lock("landscape").catch(()=>{});
        }
      }catch(err){}
      setTimeout(fitCanvas,400);
    },{passive:false});
    document.body.appendChild(fs);

    fitCanvas();
    portraitHint();
  }

  let hintT=null;
  function portraitHint(){
    if(innerHeight>innerWidth&&mode==="touch"){
      let h=document.getElementById("imsRotate");
      if(!h){
        h=document.createElement("div");h.id="imsRotate";
        h.style.cssText="position:fixed;top:54px;left:50%;transform:translateX(-50%);z-index:20;"+
          "background:rgba(255,215,110,.9);color:#1a1023;padding:6px 14px;border-radius:6px;"+
          "font:12px Consolas;pointer-events:none;";
        document.body.appendChild(h);
      }
      h.textContent="建议横屏体验 ⤺";
      h.style.display="block";
      clearTimeout(hintT);
      hintT=setTimeout(()=>{h.style.display="none";},3000);
    }
  }
  addEventListener("resize",portraitHint);

  /* 兼容引擎 heldKeys（十字键通过合成键盘事件已可驱动，
     但引擎冲刺判定读 heldKeys.size，这里同步维护以保持语义一致） */
  function heldKeysAdd(k){try{heldKeys.add(k);}catch(e){}}
  function heldKeysDel(k){try{heldKeys.delete(k);}catch(e){}}

  addEventListener("blur",()=>{
    VInput.fire=false;VInput.boost=false;VInput.active=false;
  });

  /* ---------- 启动 ---------- */
  fitCanvas();
  if(mode==="touch")buildTouchUI();
  else if(mode!=="kb")chooser=buildChooser();
})();
