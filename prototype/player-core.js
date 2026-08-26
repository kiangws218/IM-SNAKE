"use strict";
/* 与渲染、DOM、关卡无关的玩家运动核心。 */
(function(root){
  function create(id,opt){
    opt=opt||{};
    const x=opt.x==null?0:opt.x,y=opt.y==null?0:opt.y,dx=opt.dx==null?1:opt.dx,dy=opt.dy||0,len=opt.len||4;
    const p={id,snake:{fx:x,fy:y,len,path:[],pathLen:0},dir:{x:dx,y:dy},dirQueue:[],
      segPos:[],occSet:new Set(),held:new Set(),firing:false,fireT:0,fireHeld:false,
      hearts:opt.hearts||6,invuln:0,cutCd:0,alive:true,danger:null,charges:opt.charges==null?1:opt.charges,
      color:opt.color||"#63c74d",light:opt.light||"#8fe36b"};
    for(let i=1;i<=len+3;i++)p.snake.path.push({x:x-dx*i,y:y-dy*i});
    return p;
  }
  function prunePath(p,maxLen){
    const path=p.snake.path;let acc=0,cut=-1;
    for(let i=0;i+1<path.length;i++){
      const a=path[i],b=path[i+1];acc+=Math.hypot(a.x-b.x,a.y-b.y);
      if(acc>=maxLen){cut=i+2;break;}
    }
    if(cut>=0)path.length=cut;
    p.snake.pathLen=0;
    for(let i=0;i+1<path.length;i++)p.snake.pathLen+=Math.hypot(path[i].x-path[i+1].x,path[i].y-path[i+1].y);
  }
  function computeSegments(p,spacing,key){
    const snake=p.snake,segs=p.segPos,occ=p.occSet;
    segs.length=0;segs.push({x:snake.fx,y:snake.fy});
    let px=snake.fx,py=snake.fy,target=spacing,acc=0;
    const need=(snake.len-1)*spacing;
    for(let i=0;i<snake.path.length&&segs.length<snake.len;i++){
      const q=snake.path[i],d=Math.hypot(q.x-px,q.y-py);
      if(d>0){
        while(acc+d>=target&&segs.length<snake.len){
          const r=(target-acc)/d;segs.push({x:px+(q.x-px)*r,y:py+(q.y-py)*r});target+=spacing;
        }
        acc+=d;px=q.x;py=q.y;
      }
    }
    while(segs.length<snake.len)segs.push({x:px,y:py});
    occ.clear();
    for(const s of segs)occ.add(key(Math.floor(s.x),Math.floor(s.y)));
    for(let i=0;i+1<segs.length;i++){
      const ax=Math.floor(segs[i].x),ay=Math.floor(segs[i].y),bx=Math.floor(segs[i+1].x),by=Math.floor(segs[i+1].y);
      if(ax!==bx&&ay!==by){occ.add(key(ax,by));occ.add(key(bx,ay));}
    }
    prunePath(p,need+3);
  }
  function queueDirection(p,d,max){
    if(!d)return false;
    const ref=p.dirQueue.length?p.dirQueue[p.dirQueue.length-1]:p.dir;
    if(d.x===ref.x&&d.y===ref.y)return false;
    p.dirQueue.push({x:d.x,y:d.y});if(p.dirQueue.length>(max||3))p.dirQueue.shift();return true;
  }
  function applyQueue(p){
    while(p.dirQueue.length){
      const d=p.dirQueue.shift(),l=Math.hypot(d.x,d.y)||1,n={x:d.x/l,y:d.y/l};
      if(n.x*p.dir.x+n.y*p.dir.y<-.999)continue;
      p.dir=n;return n;
    }
    return null;
  }
  function selfBite(p,px,py,r,start,nearNode){
    for(let i=start||2;i<p.segPos.length;i++){
      const s=p.segPos[i];if(nearNode&&nearNode(s.x,s.y))continue;
      if(Math.hypot(px-s.x,py-s.y)<(r||.62))return true;
    }
    return false;
  }
  function pathHead(p){return p.snake.path.length?p.snake.path[0]:{x:p.snake.fx,y:p.snake.fy};}
  root.PlayerCore={create,prunePath,computeSegments,queueDirection,applyQueue,selfBite,pathHead};
})(typeof window!=="undefined"?window:globalThis);
