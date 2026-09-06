"use strict";

(function(root){
  const palettes={
    keti:{hair:"#704b3b",skin:"#ffd3b5",cloth:"#f0d7e2",accent:"#82c8df"},
    ajie:{hair:"#253653",skin:"#f1bd98",cloth:"#536b9d",accent:"#d8e5ff"},
    lisi:{hair:"#8a435d",skin:"#ffd0ae",cloth:"#b85f83",accent:"#ffd2e1"},
    ajian:{hair:"#5d344f",skin:"#ffd0ae",cloth:"#73558f",accent:"#ffe08a"},
    buck:{hair:"#3b2a25",skin:"#c58b6d",cloth:"#765047",accent:"#e2b36c"},
    miro:{hair:"#202b37",skin:"#d49b78",cloth:"#49627a",accent:"#a7d7e8"}
  };
  function palette(id){return palettes[id]||null;}
  function portrait(ctx,id,crying){
    const p=palette(id);if(!p)return false;
    ctx.fillStyle="#101321";ctx.fillRect(0,0,96,96);
    ctx.fillStyle=p.cloth;ctx.fillRect(20,65,56,31);ctx.fillRect(27,57,42,14);
    ctx.fillStyle=p.skin;ctx.fillRect(29,24,38,38);ctx.fillRect(25,33,6,20);ctx.fillRect(67,33,6,20);
    ctx.fillStyle=p.hair;ctx.fillRect(25,17,46,15);ctx.fillRect(22,25,9,32);ctx.fillRect(65,25,9,32);
    if(id==="ajie"){ctx.fillRect(30,12,31,8);ctx.fillRect(58,16,12,8);}
    ctx.fillStyle="#171522";ctx.fillRect(36,39,6,7);ctx.fillRect(55,39,6,7);
    ctx.fillStyle=p.accent;ctx.fillRect(38,40,2,3);ctx.fillRect(57,40,2,3);
    ctx.fillStyle="#9d5263";ctx.fillRect(43,53,11,3);
    if(crying){ctx.fillStyle="#69c5e5";ctx.fillRect(38,47,3,12);ctx.fillRect(57,47,3,12);}
    return true;
  }
  function sprite(ctx,id,x,y,t,state){
    const p=palette(id);if(!p)return false;
    const s=Math.max(2,Math.round(t/8)),left=Math.round(x-3*s),top=Math.round(y-4*s);
    ctx.fillStyle=p.cloth;ctx.fillRect(left+s,top+4*s,4*s,4*s);
    ctx.fillStyle=p.skin;ctx.fillRect(left+2*s,top+s,3*s,3*s);
    ctx.fillStyle=p.hair;ctx.fillRect(left+s,top,5*s,2*s);ctx.fillRect(left+s,top+s,s,3*s);
    ctx.fillStyle="#171522";ctx.fillRect(left+3*s,top+2*s,s,s);
    if(state&&state.unconscious){ctx.fillStyle="#fff";ctx.fillRect(left+s,top-2*s,5*s,s);}
    return true;
  }
  function item(ctx,id,x,y,t){
    if(id==="nodeRing"){
      ctx.save();ctx.translate(x,y);ctx.strokeStyle="#ffd76e";ctx.lineWidth=Math.max(3,t*.14);
      ctx.beginPath();ctx.arc(0,0,t*.34,0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(255,215,110,.2)";
      ctx.beginPath();ctx.arc(0,0,t*.5,0,Math.PI*2);ctx.fill();ctx.restore();return true;
    }
    if(id==="hotSoup"){ctx.save();ctx.translate(x,y);ctx.fillStyle="#6f4932";ctx.fillRect(-t*.35,-t*.05,t*.7,t*.32);ctx.fillStyle="#e7a95b";ctx.fillRect(-t*.27,-t*.08,t*.54,t*.12);ctx.strokeStyle="#eee1ca";ctx.lineWidth=2;for(const ox of[-.14,.12]){ctx.beginPath();ctx.moveTo(t*ox,-t*.17);ctx.quadraticCurveTo(t*(ox+.08),-t*.32,t*ox,-t*.42);ctx.stroke();}ctx.restore();return true;}
    if(id==="healingPotion"){ctx.save();ctx.translate(x,y);ctx.fillStyle="#c7b18b";ctx.fillRect(-t*.12,-t*.4,t*.24,t*.14);ctx.fillStyle="#62d98b";ctx.fillRect(-t*.25,-t*.22,t*.5,t*.55);ctx.fillStyle="#c8ffe0";ctx.fillRect(-t*.15,-t*.14,t*.1,t*.25);ctx.restore();return true;}
    if(id!=="ironSword")return false;
    ctx.save();ctx.translate(x,y);ctx.rotate(-.65);
    ctx.fillStyle="#c8ccd5";ctx.fillRect(-t*.08,-t*.48,t*.16,t*.72);
    ctx.fillStyle="#e8eef8";ctx.fillRect(-t*.035,-t*.45,t*.07,t*.55);
    ctx.fillStyle="#8b6545";ctx.fillRect(-t*.12,t*.2,t*.24,t*.12);ctx.fillRect(-t*.06,t*.3,t*.12,t*.28);
    ctx.restore();return true;
  }
  root.IMS_STORY_ART={portrait,sprite,item};
})(typeof window!=="undefined"?window:globalThis);
