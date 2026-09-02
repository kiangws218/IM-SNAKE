"use strict";

(function(root){
  const TYPES=Object.freeze({
    NODE_ENTERED:"story.node_entered",
    DIALOGUE_OPTION_SELECTED:"dialogue.option_selected",
    PLAYER_BEAN_EATEN:"player.bean_eaten",
    PLAYER_BEAN_SPIT:"player.bean_spit",
    FRAGILE_GATE_BROKEN:"map.fragile_gate_broken",
    MAP_EXIT_ENTERED:"map.exit_entered",
    MAP_LOADED:"map.loaded",
    ACTOR_INTERACTED:"actor.interacted",
    ACTOR_DIED:"actor.died",
    ACTOR_EATEN:"actor.eaten",
    ENEMIES_DEFEATED:"combat.enemies_defeated",
    PLAYER_LEFT_AREA:"player.left_area",
    TIMER_EXPIRED:"story.timer_expired",
    RUN_STARTED:"run.started",
    RUN_ENDED:"run.ended"
  });

  class EventBus{
    constructor(){this.listeners=new Map();this.sequence=0;}
    on(type,handler){
      if(typeof handler!=="function")throw new TypeError("Story event handler must be a function");
      let set=this.listeners.get(type);
      if(!set){set=new Set();this.listeners.set(type,set);}
      set.add(handler);
      return ()=>this.off(type,handler);
    }
    once(type,handler){
      const off=this.on(type,event=>{off();handler(event);});
      return off;
    }
    off(type,handler){
      const set=this.listeners.get(type);if(!set)return;
      set.delete(handler);if(!set.size)this.listeners.delete(type);
    }
    emit(type,payload){
      const event=Object.freeze({type,payload:payload||{},sequence:++this.sequence,time:Date.now()});
      const targets=new Set([...(this.listeners.get(type)||[]),...(this.listeners.get("*")||[])]);
      targets.forEach(handler=>{
        try{handler(event);}catch(error){setTimeout(()=>{throw error;},0);}
      });
      return event;
    }
    clear(){this.listeners.clear();}
    listenerCount(type){const set=this.listeners.get(type);return set?set.size:0;}
  }

  root.IMS_STORY_EVENTS={TYPES,EventBus,bus:new EventBus()};
})(typeof window!=="undefined"?window:globalThis);
