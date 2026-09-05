"use strict";

(function(root){
  const busRef=()=>root.IMS_STORY_EVENTS&&root.IMS_STORY_EVENTS.bus;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const actorDefaults=()=>({status:"unknown",location:null,met:false,corpsePresent:false});
  function ensureActor(state,id,patch){
    state.actors=state.actors||{};
    state.actors[id]=Object.assign(actorDefaults(),state.actors[id]||{},patch||{});
    return state.actors[id];
  }

  function defaultState(){
    return {
      schemaVersion:1,storyId:"prologue",chapter:"prologue",
      currentNode:"Start",currentMap:null,
      flags:{tutorialGateBroken:false,tutorialExitUnlocked:false,tutorialTimeoutSeen:false,memoryBlurSeen:false,storyCompleted:false,chapter1HungerSeen:false,chapter1HungerPending:false,chapter1SwordTaken:false,chapter1SwordRecognizedPending:false,chapter1MeetingSeen:false,findAjianAccepted:false,findAjianDeclined:false,chapter1RingTaken:false,caveShortcutOpen:false,bridgeSeen:false,bridgeLowered:false,caveEntered:false,caveSoupDrunk:false,cavePotionTaken:false,lickWakeLearned:false,ajianFound:false,ajianAwake:false,ajianUntied:false,ajianIdentityKnown:false,ajianFaceLicked:false,ajianFootLicked:false,ajianFirstWakeMethod:null,ajianRewakeReaction:null,ajianRescueFootLicked:false,ajianSwallowedOnce:false,goblinFightStarted:false,goblinsDefeated:false,ajianCritical:false},
      quests:{},
      actors:{keti:actorDefaults(),ajie:actorDefaults(),lisi:actorDefaults(),ajian:actorDefaults()},
      encounters:{},
      worldItems:{},
      counters:{tutorialBeansEaten:0,tutorialBeansSpit:0,tutorialGateSpit:0,slimesDefeated:0,chapterBeansEaten:0,chapterBeansSpit:0},
      player:{name:"",bodyLength:4,nodeCharges:0,rider:null},inventory:{version:1,selectedIndex:0,slots:[{id:"bean",count:0}]},checkpoint:null
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
    out.quests=clone(input.quests||base.quests);
    if(out.flags.findAjianAccepted&&!out.quests.findAjian)out.quests.findAjian={status:"active",title:"寻找阿见",priority:10};
    out.actors={};
    const actorIds=new Set([...Object.keys(base.actors),...Object.keys(input.actors||{})]);
    actorIds.forEach(id=>{out.actors[id]=Object.assign(actorDefaults(),base.actors[id]||{},(input.actors&&input.actors[id])||{});});
    out.counters=Object.assign({},base.counters,input.counters||{});
    out.encounters=clone(input.encounters||base.encounters);
    out.player=Object.assign({},base.player,input.player||{});
    if(out.flags.chapter1RingTaken&&(!input.player||!Object.prototype.hasOwnProperty.call(input.player,"nodeCharges")))out.player.nodeCharges=1;
    out.inventory=clone(input.inventory||base.inventory);
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

  root.IMS_STORY_STATE={defaultState,mergeDefaults,actorDefaults,ensureActor,StoryStateStore};
})(typeof window!=="undefined"?window:globalThis);
