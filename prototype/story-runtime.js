"use strict";
(function(root){
const events=root.IMS_STORY_EVENTS,types=events&&events.TYPES||{},stateApi=root.IMS_STORY_STATE;
class StoryRuntime{
constructor(o){o=o||{};this.bus=o.bus||(events&&events.bus);this.state=o.state||new stateApi.StoryStateStore();this.graph=o.graph||{};this.adapters=o.adapters||{};this.node=null;this.choices=null;this.waiting=null;this.timers=new Map();this.unsubscribers=[];}
registerGraph(g){this.graph=g||{};return this;}
start(id){this.stopWait();this.state.update(s=>{s.currentNode=id;},"start");return this.enter(id);}
enter(id){const n=this.graph[id];if(!n)throw new Error("Unknown story node: "+id);this.node=n;this.choices=n.choices||(n.onEnter&&n.onEnter.args&&n.onEnter.args.choices)||null;this.state.update(s=>{s.currentNode=id;},"node_enter");if(this.bus)this.bus.emit(types.NODE_ENTERED||"story.node_entered",{nodeId:id,node:n});if(n.onEnter)this.runCommand(n.onEnter);if(n.wait)this.waitFor(n.wait);if(n.auto)this.follow(n.auto);return n;}
follow(id){return id?this.enter(id):null;}
canChoose(choice){return !!choice&&(typeof choice.when!=="function"||choice.when(this.state.snapshot(),choice,this));}
getChoices(){return (this.choices||[]).filter(choice=>this.canChoose(choice));}
choose(id){if(!this.node||!this.choices)throw new Error("No choices available");const c=this.choices.find(x=>x.id===id);if(!c)throw new Error("Unknown choice: "+id);if(!this.canChoose(c))throw new Error("Choice unavailable: "+id);if(c.set)this.state.update(s=>applyPatch(s,c.set),"choice:"+id);if(this.bus)this.bus.emit(types.DIALOGUE_OPTION_SELECTED||"dialogue.option_selected",{nodeId:this.node.id,choiceId:id});if(c.run)c.run({runtime:this,state:this.state,choice:c});return this.follow(c.next);}
waitFor(w){this.stopWait();if(!this.bus||!w||!Array.isArray(w.events))return;const h=e=>{if(!w.events.includes(e.type))return;if(w.predicate&&!w.predicate(e,this.state.snapshot()))return;this.stopWait();const target=typeof w.target==="function"?w.target(e,this.state.snapshot()):w.target;this.state.update(s=>{s.lastEvent={type:e.type,payload:e.payload};},"event:"+e.type);if(target)this.follow(target);};this.unsubscribers.push(this.bus.on("*",h));this.waiting=w;}
runCommand(c){const n=c&&(c.name||c),a=this.adapters[n];if(typeof a==="function")a(c.args||{},this.state,this);}
stopWait(){this.unsubscribers.splice(0).forEach(x=>x());this.waiting=null;}
startTimer(id,seconds,onExpire){this.stopTimer(id);this.timers.set(id,setTimeout(()=>{this.timers.delete(id);if(this.bus)this.bus.emit(types.TIMER_EXPIRED||"story.timer_expired",{id});if(onExpire)onExpire();},Math.max(0,seconds)*1000));}
stopTimer(id){const t=this.timers.get(id);if(t){clearTimeout(t);this.timers.delete(id);}}
stop(){this.stopWait();this.timers.forEach(t=>clearTimeout(t));this.timers.clear();this.node=null;this.choices=null;}
}
function applyPatch(t,p){Object.keys(p||{}).forEach(path=>{const a=path.split(".");let c=t;for(let i=0;i<a.length-1;i++)c=c[a[i]]||(c[a[i]]={});c[a[a.length-1]]=p[path];});return t;}
root.IMS_STORY_RUNTIME={StoryRuntime,applyPatch};
})(typeof window!=="undefined"?window:globalThis);
