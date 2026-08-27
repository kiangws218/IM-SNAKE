"use strict";
/* 本地双人合作：P2 复用 PlayerCore，独立生命/身长/冷却/节点，团队共享关卡目标。 */
(function(root){
  const MOVE={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  const S={enabled:false,p:null,downReason:"",carry:null};

  function enabled(){return S.enabled;}
  function active(){return !!(S.enabled&&S.p&&S.p.alive);}
  function reset(){
    S.enabled=InputMap.getPlayerCount()===2&&playMode!=="tutorial"&&playMode!=="intro";
    S.downReason="";
    if(!S.enabled){S.p=null;return;}
    const sy=Math.floor(CFG.rows/2)+4,saved=playMode==="campaign"?(S.carry||carry):null;
    const len=saved?Math.max(CFG.minLen,Math.min(saved.len,120)):CFG.initLen;
    const nodeCount=saved?Math.min(CFG.nodeMax,saved.charges):1;
    S.p=PlayerCore.create(2,{x:6.5,y:sy+.5,dx:1,dy:0,len,hearts:RUN.maxHearts,charges:nodeCount,color:"#4389a8",light:"#7fd1e8"});
    compute();
  }
  function resetRun(){S.carry=null;}
  function captureCarry(){if(S.enabled&&S.p)S.carry={len:S.p.alive?S.p.snake.len:CFG.initLen,charges:S.p.alive?S.p.charges:1};}
  function compute(){if(S.p)PlayerCore.computeSegments(S.p,SPACING(),K);}
  function bodyHas(key){return active()&&S.p.occSet.has(key);}
  function bodyCells(){return active()?S.p.occSet:[];}
  function view(){
    if(!active())return null;
    const p=S.p;
    return{id:2,x:p.snake.fx,y:p.snake.fy,snake:p.snake,segPos:p.segPos,occSet:p.occSet,dir:p.dir,
      hearts:p.hearts,invuln:p.invuln,alive:p.alive};
  }
  function damage(){
    if(!S.p)return 1;
    const base=1+Math.floor(S.p.snake.len/5)+RUN.dmgBonus;
    return Math.max(1,Math.round(base*(TEMPBUFF.t>0?TEMPBUFF.mult:1)));
  }
  function combo(){
    let x=0,y=0;for(const a of S.p.held){const v=MOVE[a];if(v){x+=v[0];y+=v[1];}}
    return(x||y)?{x,y}:null;
  }
  function pushCombo(){if(active())PlayerCore.queueDirection(S.p,combo(),3);}
  function applyQueue(){const n=PlayerCore.applyQueue(S.p);if(n)S.p.dir=n;}
  function pathHead(){return PlayerCore.pathHead(S.p);}
  function selfBite(x,y,r){return PlayerCore.selfBite(S.p,x,y,r||.62,Math.max(2,CFG.neckGuard),nearNode);}
  function enterDanger(type){S.p.danger={type,timer:.5};shake=Math.max(shake,.18);}

  function updateMovement(dt){
    const p=S.p;applyQueue();
    if(p.danger){
      p.danger.timer-=dt;
      const spd=CFG.snakeSpeed*(p.held.size>0&&!p.firing?CFG.speedBoost:1);
      const step=Math.max(spd*dt,.05),nx=p.snake.fx+p.dir.x*step,ny=p.snake.fy+p.dir.y*step;
      if(!hitWall(nx,ny,.26)&&!selfBite(nx,ny,.5))p.danger=null;
      else{if(p.danger.timer<=0)defeat(p.danger.type==="wall"?"P2 撞上了墙":"P2 咬到了自己的尾巴");return;}
    }
    if(p.firing||!p.alive)return;
    let spd=CFG.snakeSpeed*(p.held.size>0?CFG.speedBoost:1)*RUN.speedMult;
    const zn=zoneAt(p.snake.fx,p.snake.fy);
    if(zn&&zn.kind==="slope"){
      const zl=Math.hypot(zn.dx||0,zn.dy||0)||1,d=(p.dir.x*(zn.dx||0)+p.dir.y*(zn.dy||0))/zl;
      if(d>.3)spd*=zn.up!=null?zn.up:.6;else if(d<-.3)spd*=zn.down!=null?zn.down:1.45;
    }
    p.snake.fx+=p.dir.x*spd*dt;p.snake.fy+=p.dir.y*spd*dt;distMoved+=spd*dt;
    if(hitWall(p.snake.fx,p.snake.fy,.34)){enterDanger("wall");compute();pickUps();return;}
    const last=pathHead(),d=Math.hypot(p.snake.fx-last.x,p.snake.fy-last.y);
    if(d>.02)p.snake.path.unshift({x:p.snake.fx,y:p.snake.fy});
    compute();if(selfBite(p.snake.fx,p.snake.fy)){enterDanger("self");return;}pickUps();
  }

  function collectGateBean(b){
    for(const m of MECHS){
      if(m.done||m.kind!=="gate")continue;
      if(b.x>=m.x&&b.x<m.x+m.w&&b.y>=m.y&&b.y<m.y+m.h){
        m.prog++;ftext(m.x+m.w/2,m.y-.5,"吞豆 "+m.prog+"/"+m.need,"#7fd1e8");
        if(m.prog>=m.need){m.done=true;for(const idx of m.cellIdx)obstacles.delete(idx);grantReward(m.reward);computeEnclosure();ftext(m.x+m.w/2,m.y-1.2,"石门开启！","#ffd76e");}
      }
    }
  }
  function pickUps(){
    const p=S.p;
    for(let i=groundBeans.length-1;i>=0;i--){
      const b=groundBeans[i];
      if(Math.hypot(b.x+.5-p.snake.fx,b.y+.5-p.snake.fy)<RUN.pickupR){
        if(b.fromProj)projRecycled++;groundBeans.splice(i,1);p.snake.len++;beansEaten++;collectGateBean(b);
        if(Math.random()<RUN.greedy){p.snake.len++;ftext(b.x+.5,b.y,"贪食 +1","#ffd76e");}
        ftext(b.x+.5,b.y+.3,"P2 +1","#7fd1e8");puff(b.x+.5,b.y+.5,"#7fd1e8");
      }
    }
    for(let i=curses.length-1;i>=0;i--){const c=curses[i];if(Math.hypot(c.x-p.snake.fx,c.y-p.snake.fy)<RUN.pickupR){curses.splice(i,1);openCurseCard(c.card);break;}}
    for(let i=pickups.length-1;i>=0;i--){
      const n=pickups[i];if(Math.hypot(n.x+.5-p.snake.fx,n.y+.5-p.snake.fy)<RUN.pickupR){
        pickups.splice(i,1);if(p.charges<CFG.nodeMax){p.charges++;ftext(n.x+.5,n.y+.3,"P2 节点充能 +1！","#7fd1e8");}
        else ftext(n.x+.5,n.y+.3,"充能已达上限","#8b88a3");
      }
    }
  }

  function stanceShot(){
    const p=S.p;if(p.snake.len<=CFG.minLen){p.firing=false;ftext(p.snake.fx,p.snake.fy-1,"P2 弹匣打空了！","#ff5d5d");return;}
    p.snake.len--;const spd=CFG.spitSpeed*RUN.spitSpeedMult;
    let sx=p.snake.fx+p.dir.x*.9,sy=p.snake.fy+p.dir.y*.9;
    for(const k of[.9,1.4,1.9,2.4,2.9]){const tx=p.snake.fx+p.dir.x*k,ty=p.snake.fy+p.dir.y*k;if(!hitWall(tx,ty,.3)&&circleVsSolids(tx,ty,.3,true)===null){sx=tx;sy=ty;break;}}
    projs.push({owner:2,x:sx,y:sy,vx:p.dir.x*spd,vy:p.dir.y*spd,life:CFG.beanLife,grace:.22,trail:[]});shake=Math.max(shake,.08);
  }
  function updateFire(dt){
    const p=S.p,want=p.fireHeld&&p.alive&&!paused;
    if(want&&!p.firing){p.firing=true;stanceShot();p.fireT=1/(CFG.snakeSpeed*RUN.spitRateMult);}
    if(!want)p.firing=false;
    if(p.firing){p.fireT-=dt;const shotInt=1/(CFG.snakeSpeed*RUN.spitRateMult);while(p.fireT<=0&&p.firing){stanceShot();p.fireT+=shotInt;}}
  }
  function cutTail(){
    if(!active()||gameState!=="play"||paused)return;const p=S.p;if(p.cutCd>0)return;
    if(p.snake.len<=CFG.cutKeep){ftext(p.snake.fx,p.snake.fy-1,"P2 没有可断的尾！","#ff5d5d");return;}
    p.cutCd=RUN.cutCd;cutUsed++;const cutN=p.snake.len-CFG.cutKeep,recover=Math.floor(cutN*CFG.cutRecover);
    const tail=p.segPos[p.snake.len-1]||{x:p.snake.fx,y:p.snake.fy};p.snake.len=CFG.cutKeep;
    if(recover>0)scatterBeans(Math.floor(tail.x),Math.floor(tail.y),recover,2);
    ftext(tail.x,tail.y-.6,"P2 -"+(cutN-recover)+" 节","#7fd1e8");shake=.25;puff(tail.x,tail.y,"#7fd1e8");compute();computeEnclosure();
  }
  function placeNode(){
    if(!active()||gameState!=="play"||paused)return;const p=S.p,cx=Math.floor(p.snake.fx),cy=Math.floor(p.snake.fy);
    if(p.charges<=0){ftext(p.snake.fx,p.snake.fy-1,"P2 没有节点充能！","#ff5d5d");return;}
    if(mapNodes.some(n=>n.x===cx&&n.y===cy))return;const maxHp=CFG.nodeHp+RUN.nodeHpBonus;
    mapNodes.push({owner:2,x:cx,y:cy,hp:maxHp,maxHp,covered:true,bob:0});p.charges--;nodesPlaced++;
    ftext(cx+.5,cy-.5,"P2 放置节点","#7fd1e8");puff(cx+.5,cy+.5,"#7fd1e8");
  }
  function refundCharge(){if(S.p)S.p.charges=Math.min(CFG.nodeMax,S.p.charges+1);}
  function needsCharge(){return active()&&S.p.charges<CFG.nodeMax;}
  function heal(n){if(active())S.p.hearts=Math.min(RUN.maxHearts,S.p.hearts+n);}
  function grow(n){if(active()){S.p.snake.len=Math.max(CFG.minLen,S.p.snake.len+n);compute();}}
  function hurt(reason){
    if(!active()||S.p.invuln>0)return;const p=S.p;p.hearts--;p.invuln=CFG.iframe;shake=.3;hurtFlash=.28;
    ftext(p.snake.fx,p.snake.fy-.8,"P2 -1❤","#7fd1e8");if(p.hearts<=0)defeat(reason);
  }
  function hitBySeed(seed){if(active()&&Math.hypot(seed.x-S.p.snake.fx,seed.y-S.p.snake.fy)<.58){hurt("P2 被种子击中");return true;}return false;}
  function defeat(reason){
    if(!active())return;const p=S.p;S.downReason=reason;p.alive=false;p.hearts=0;p.firing=false;p.fireHeld=false;p.held.clear();p.segPos.length=0;p.occSet.clear();
    ftext(p.snake.fx,p.snake.fy-1,"P2 倒下！","#7fd1e8");computeEnclosure();if(typeof primaryDown!=="undefined"&&primaryDown)die(reason);
  }
  function trimAt(hitIdx,b){
    if(!active()||hitIdx<=0)return;const p=S.p,oldLen=p.snake.len;p.snake.len=Math.max(CFG.minLen,hitIdx);const lost=oldLen-p.snake.len;
    for(let i=hitIdx;i<oldLen;i++){const s=p.segPos[i];if(!s)break;const a=Math.atan2(s.y-b.y,s.x-b.x)+(Math.random()-.5)*.7,spd=7+Math.random()*4;flyingBeans.push({x:s.x,y:s.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,t:.9});}
    shake=Math.max(shake,.4);ftext(p.snake.fx,p.snake.fy-1,"P2 -"+lost+" 节！","#7fd1e8");puff(p.snake.fx,p.snake.fy,"#7fd1e8");compute();computeEnclosure();
  }
  function update(dt){if(!active())return;const p=S.p;p.invuln=Math.max(0,p.invuln-dt);p.cutCd=Math.max(0,p.cutCd-dt);updateMovement(dt);if(active())updateFire(dt);}

  function draw(ctx,T){
    if(!active())return;const p=S.p;
    for(let i=p.segPos.length-1;i>=0;i--){
      const s=p.segPos[i],x=s.x*T,y=s.y*T;
      if(i===0){
        let col=p.light;if(p.invuln>0&&Math.sin(gameTime*30)>0)col="#ffffff";ctx.fillStyle=col;roundRect(x-T/2+2,y-T/2+2,T-4,T-4,7);ctx.fill();
        ctx.fillStyle="#1a1023";const ex=p.dir.x*4,ey=p.dir.y*4;ctx.fillRect(x-6+ex,y-6+ey,4,5);ctx.fillRect(x+2+ex,y-6+ey,4,5);
        ctx.textAlign="center";ctx.font="bold 10px Consolas";ctx.fillStyle="#bdefff";ctx.fillText("P2",x,y-T*.75);
      }else{const shade=.75+.25*(1-i/p.segPos.length);ctx.fillStyle=rgb(55,120+shade*45,165+shade*35);roundRect(x-T/2+2.5,y-T/2+2.5,T-5,T-5,5);ctx.fill();}
    }
  }
  function hud(){
    if(!S.enabled||!S.p)return{enabled:false};const p=S.p;
    return{enabled:true,alive:p.alive,hearts:p.hearts,len:p.snake.len,dmg:damage(),charges:p.charges,fire:p.firing?100:0,cut:(1-p.cutCd/RUN.cutCd)*100};
  }
  function clearInput(){if(!S.p)return;S.p.held.clear();S.p.fireHeld=false;S.p.firing=false;}
  function keydown(ev){
    if(InputMap.getPlayerCount()!==2)return;const action=InputMap.actionFor(2,ev);if(!action)return;
    if(ev.preventDefault)ev.preventDefault();if(gameState!=="play"||!active())return;
    if(MOVE[action]){S.p.held.add(action);if(!ev.repeat)pushCombo();}
    else if(action==="fire")S.p.fireHeld=true;else if(action==="cut")cutTail();else if(action==="node")placeNode();
  }
  function keyup(ev){if(!S.p)return;const action=InputMap.actionFor(2,ev);if(!action)return;S.p.held.delete(action);if(action==="fire")S.p.fireHeld=false;if(MOVE[action])pushCombo();}
  addEventListener("keydown",keydown);addEventListener("keyup",keyup);addEventListener("blur",clearInput);

  root.CoopMode={state:S,enabled,active,reset,resetRun,captureCarry,update,draw,hud,view,bodyHas,bodyCells,damage,hurt,hitBySeed,defeat,trimAt,
    cutTail,placeNode,refundCharge,needsCharge,heal,grow,clearInput};
})(typeof window!=="undefined"?window:globalThis);