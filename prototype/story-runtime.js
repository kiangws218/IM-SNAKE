"use strict";

(function(root){
  const events=root.IMS_STORY_EVENTS;
  const types=events&&events.TYPES||{};
  const stateApi=root.IMS_STORY_STATE;

  class StoryRuntime{
    constructor(options){
      options=options||{};
      this.bus=options.bus||(events&&events.bus);
      this.state=options.state||new stateApi.StoryStateStore();
      this.graph=options.graph||{};
      this.adapters=options.adapters||{};
      this.node=null;this.waiting=null;this.timers=new Map();this.unsubscribers=[];
    }
    registerGraph(graph){this.graph=graph||{};return this;}
    start(nodeId){this.stopWait();this.state.update(s=>{s.currentNode=nodeId;},"start");return this.enter(nodeId);}
    enter(nodeId){
      const node=this.graph[nodeId];if(!node)throw new Error("Unknown story node: "+nodeId);
      this.node=node;
      if(this.bus)this.bus.emit(types.NODE_ENTERED||"story.node_entered",{nodeId,node});
      if(node.onEnter)this.runCommand(node.onEnter);
      if(node.wait)this.waitFor(node.wait);
      if(node.auto)this.follow(node.auto);
      return node;
    }
    follow(targetId){return targetId?this.enter(targetId):null;}
    choose(choiceId){
      if(!this.node||!this.node.choices)throw new Error("No choices available");
      const choice=this.node.choices.find(item=>item.id===choiceId);
      if(!choice)throw new Error("Unknown choice: "+choiceId);
      if(choice.set)this.state.update(s=>applyPatch(s,choice.set),"choice:"+choiceId);
      if(this.bus)this.bus.emit(types.DIALOGUE_OPTION_SELECTED||"dialogue.option_selected",{nodeId:this.node.id,choiceId});
      return this.follow(choice.next);
    }
    waitFor(wait){
      this.stopWait();
      if(!this.bus||!wait||!Array.isArray(wait.events))return;
      const handler=event=>{
        if(!wait.events.includes(event.type))return;
        if(wait.predicate&&!wait.predicate(event,this.state.snapshot()))return;
        this.stopWait();
        const target=typeof wait.target==="function"?wait.target(event,this.state.snapshot()):wait.target;
        if(target)this.follow(target);
      };
      this.unsubscribers.push(this.bus.on("*",handler));this.waiting=wait;
    }
    runCommand(command){
      const name=command&&(command.name||command),adapter=this.adapters[name];
      if(typeof adapter==="function")adapter(command.args||{},this.state,this);
    }
    stopWait(){this.unsubscribers.splice(0).forEach(off=>off());this.waiting=null;}
    startTimer(id,seconds,onExpire){
      this.stopTimer(id);
      this.timers.set(id,setTimeout(()=>{
        this.timers.delete(id);
        if(this.bus)this.bus.emit(types.TIMER_EXPIRED||"story.timer_expired",{id});
        if(onExpire)onExpire();
      },Math.max(0,seconds)*1000));
    }
    stopTimer(id){const timer=this.timers.get(id);if(timer){clearTimeout(timer);this.timers.delete(id);}}
    stop(){this.stopWait();this.timers.forEach(timer=>clearTimeout(timer));this.timers.clear();this.node=null;}
  }
  function applyPatch(target,patch){
    Object.keys(patch||{}).forEach(path=>{
      const parts=path.split(".");let cursor=target;
      for(let i=0;i<parts.length-1;i++)cursor=cursor[parts[i]]||(cursor[parts[i]]={});
      cursor[parts[parts.length-1]]=patch[path];
    });
    return target;
  }
  root.IMS_STORY_RUNTIME={StoryRuntime,applyPatch};
})(typeof window!=="undefined"?window:globalThis);
