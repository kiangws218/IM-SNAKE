"use strict";
const assert=require("assert");
const {StorySaveStore,KEY_PREFIX,LEGACY_KEY}=require("../prototype/story-save.js");
class MemoryStorage{constructor(){this.data=new Map();}getItem(k){return this.data.has(k)?this.data.get(k):null;}setItem(k,v){this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}}
const storage=new MemoryStorage(),store=new StorySaveStore({storage,now:()=>"2026-08-31T00:00:00.000Z"});
const state={storyId:"prologue",chapter:"intro",currentNode:"Start",currentMap:"tutorial",player:{name:"小明"},nested:{items:[1,2]}};
let saved=store.save(2,state);assert.equal(saved.ok,true);assert.equal(saved.meta.slot,2);assert.equal(store.list()[1].playerName,"小明");
state.nested.items.push(3);let loaded=store.load(2);assert.deepEqual(loaded.data.nested.items,[1,2]);loaded.data.nested.items.push(9);assert.deepEqual(store.load(2).data.nested.items,[1,2]);
assert.equal(store.delete(2).ok,true);assert.equal(store.load(2).empty,true);
storage.setItem(LEGACY_KEY,JSON.stringify({schemaVersion:1,storyId:"prologue",chapter:"old",currentNode:"Legacy",player:{name:"旧玩家"}}));
let legacy=store.load(1);assert.equal(legacy.ok,true);assert.equal(legacy.legacy,true);assert.equal(storage.getItem(LEGACY_KEY)!==null,true);
assert.equal(legacy.data.player.name,"旧玩家");
storage.setItem(KEY_PREFIX+3,"{broken");assert.equal(store.load(3).error.code,"CORRUPT_JSON");assert.equal(store.list()[2].corrupted,true);
const migrated=new StorySaveStore({storage:new MemoryStorage(),schemaVersion:2,migrations:[{from:1,to:2,migrate:e=>{e.state.migrated=true;return e;}}]});
migrated.storage.setItem(KEY_PREFIX+1,JSON.stringify({schemaVersion:1,meta:{},state:{ok:true}}));assert.equal(migrated.load(1).data.migrated,true);
console.log("story-save-tests: ok");
