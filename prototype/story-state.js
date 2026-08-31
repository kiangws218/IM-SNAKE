"use strict";

(function(root){
  const busRef=()=>root.IMS_STORY_EVENTS&&root.IMS_STORY_EVENTS.bus;
  const clone=value=>JSON.parse(JSON.stringify(value));

  function defaultState(){
    return {
      schemaVersion:1,storyId:"prologue",chapter:"prologue",
      currentNode:"Start",currentMap:null,
      flags:{tutorialGateBroken:false,tutorialExitUnlocked:false,tutorialTimeoutSeen:false,memoryBlurSeen:false},
      actors:{keti:{status:"unknown",met:false,corpsePresent:false}},
      counters:{tutorialBeansEaten:0,tutorialBeansSpit:0,tutorialGateSpit:0,slimesDefeated:0},
      player:{name:"",bodyLength:4},checkpoint:null
    };
  }

  function mergeDefaults(input){
    const base=defaultState(),out=clone(base);
    if(!input||typeof input!=="object")return out;
    Object.keys(input).forEach(key=>{
      const value=input[key];
      if(value&&typeof value==="object"&&!Array.isArray(value))out[key]=Object.assign({},out[key]||{},value);
      else if(value!==undefined)out[key]=value;
    });
    out.flags=Object.assign({},base.flags,input.flags||{});
    out.actors={};
    const actorIds=new Set([...Object.keys(base.actors),...Object.keys(input.actors||{})]);
    actorIds.forEach(id=>{out.actors[id]=Object.assign({},base.actors[id]||{},(input.actors&&input.actors[id])||{});});
    out.counters=Object.assign({},base.counters,input.counters||{});
    out.player=Object.assign({},base.player,input.player||{});
    return out;
  }

  class StoryStateStore{
    constructor(initial){this.state=mergeDefaults(initial);this.listeners=new Set();}
    snapshot(){return clone(this.state);}
    get(path,fallback){
      if(!path)return this.snapshot();
      const value=path.split(".").reduce((obj,key)=>obj==null?undefined:obj[key],this.state);
      return value===undefined?fallback:value;
    }
    replace(next,reason){
      this.state=mergeDefaults(next);const snapshot=this.snapshot();
      this.listeners.forEach(fn=>fn(snapshot,reason||"replace"));
      const bus=busRef();if(bus)bus.emit("story.state_changed",{state:snapshot,reason:reason||"replace"});
      return snapshot;
    }
    update(mutator,reason){const draft=this.snapshot();mutator(draft);return this.replace(draft,reason||"update");}
    reset(reason){return this.replace(defaultState(),reason||"reset");}
    subscribe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
    save(slot){
      try{localStorage.setItem("imsnake.story."+String(slot||"main"),JSON.stringify(this.state));return true;}
      catch(error){return false;}
    }
    load(slot){
      try{const raw=localStorage.getItem("imsnake.story."+String(slot||"main"));if(!raw)return false;this.replace(JSON.parse(raw),"load");return true;}
      catch(error){return false;}
    }
  }

  root.IMS_STORY_STATE={defaultState,mergeDefaults,StoryStateStore};
})(typeof window!=="undefined"?window:globalThis);
