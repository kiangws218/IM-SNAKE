"use strict";

(function(root){
  const SLOT_COUNT=3;
  const KEY_PREFIX="imsnake.story.slot.";
  const LEGACY_KEY="imsnake.story.main";
  const CURRENT_SCHEMA=1;
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const validSlot=slot=>{
    const n=Number(slot);
    return Number.isInteger(n)&&n>=1&&n<=SLOT_COUNT?n:null;
  };
  const storageOf=provided=>provided||(root&&root.localStorage);
  const errorResult=(code,message,error)=>({ok:false,error:{code,message,detail:error&&String(error.message||error)}});

  class StorySaveStore{
    constructor(options){
      options=options||{};
      this.storage=storageOf(options.storage);
      this.now=options.now||(()=>new Date().toISOString());
      this.schemaVersion=options.schemaVersion||CURRENT_SCHEMA;
      this.migrations=new Map();
      (options.migrations||[]).forEach(m=>this.registerMigration(m.from,m.to,m.migrate));
    }
    key(slot){const n=validSlot(slot);return n?KEY_PREFIX+n:null;}
    registerMigration(from,to,migrate){
      if(!Number.isInteger(from)||!Number.isInteger(to)||typeof migrate!=="function")throw new Error("Invalid story save migration");
      this.migrations.set(from+"->"+to,migrate);return this;
    }
    migrate(envelope){
      let value=clone(envelope),version=Number(value&&value.schemaVersion)||0;
      while(version<this.schemaVersion){
        const next=version+1,fn=this.migrations.get(version+"->"+next);
        if(!fn)return errorResult("SCHEMA_UNSUPPORTED","没有可用的存档版本迁移：v"+version+" → v"+next);
        try{value=fn(clone(value));version=next;value.schemaVersion=version;}
        catch(error){return errorResult("SCHEMA_MIGRATION_FAILED","存档版本迁移失败",error);}
      }
      if(version>this.schemaVersion)return errorResult("SCHEMA_TOO_NEW","存档版本高于当前游戏版本");
      return {ok:true,value};
    }
    readRaw(key){
      if(!this.storage||typeof this.storage.getItem!=="function")return errorResult("STORAGE_UNAVAILABLE","当前环境不支持存档");
      try{return {ok:true,raw:this.storage.getItem(key)};}catch(error){return errorResult("STORAGE_READ_FAILED","读取存档失败",error);}
    }
    decode(key,raw,legacy){
      if(raw===null||raw===undefined)return {ok:true,empty:true};
      let parsed;try{parsed=JSON.parse(raw);}catch(error){return errorResult("CORRUPT_JSON","存档数据损坏，无法解析",error);}
      if(legacy&&parsed&&typeof parsed==="object"&&!parsed.state){
        parsed={schemaVersion:1,meta:{storyId:parsed.storyId||"prologue",chapter:parsed.chapter||null,currentNode:parsed.currentNode||null,currentMap:parsed.currentMap||null,playerName:parsed.player&&parsed.player.name||""},state:parsed};
      }
      const migrated=this.migrate(parsed);if(!migrated.ok)return migrated;
      const value=migrated.value;
      if(!value||typeof value!=="object"||!value.state||typeof value.state!=="object")return errorResult("INVALID_SAVE","存档格式无效");
      return {ok:true,value};
    }
    metadata(slot,envelope,legacy){
      const m=envelope&&envelope.meta||{};
      return {slot,exists:true,updatedAt:m.updatedAt||null,storyId:m.storyId||null,chapter:m.chapter||null,currentNode:m.currentNode||null,currentMap:m.currentMap||null,playerName:m.playerName||"",completed:!!m.completed,legacy:!!legacy};
    }
    save(slot,state,metadata){
      const n=validSlot(slot);if(!n)return errorResult("INVALID_SLOT","存档位必须是 1、2 或 3");
      if(!state||typeof state!=="object")return errorResult("INVALID_STATE","无法保存空的剧情状态");
      const s=clone(state),m=metadata||{};
      const envelope={schemaVersion:this.schemaVersion,meta:{slot:n,updatedAt:m.updatedAt||this.now(),storyId:m.storyId||s.storyId||"prologue",chapter:m.chapter||s.chapter||null,currentNode:m.currentNode||s.currentNode||null,currentMap:m.currentMap!==undefined?m.currentMap:(s.currentMap||null),playerName:m.playerName!==undefined?m.playerName:((s.player&&s.player.name)||""),completed:m.completed!==undefined?!!m.completed:!!(s.flags&&s.flags.storyCompleted)},state:s};
      if(!this.storage||typeof this.storage.setItem!=="function")return errorResult("STORAGE_UNAVAILABLE","当前环境不支持存档");
      try{this.storage.setItem(this.key(n),JSON.stringify(envelope));return {ok:true,meta:this.metadata(n,envelope,false),data:clone(s)};}catch(error){return errorResult("STORAGE_WRITE_FAILED","保存存档失败",error);}
    }
    load(slot){
      const n=validSlot(slot);if(!n)return errorResult("INVALID_SLOT","存档位必须是 1、2 或 3");
      let read=this.readRaw(this.key(n));if(!read.ok)return read;
      let legacy=false,key=this.key(n),raw=read.raw;
      // The historical single-slot save maps to slot 1 only; never make it
      // appear as three separate saves in the slot picker.
      if(raw===null&&n===1){const old=this.readRaw(LEGACY_KEY);if(!old.ok)return old;if(old.raw!==null){raw=old.raw;legacy=true;key=LEGACY_KEY;}}
      const decoded=this.decode(key,raw,legacy);if(!decoded.ok)return decoded;
      if(decoded.empty)return {ok:true,empty:true,slot:n};
      return {ok:true,slot:n,legacy,meta:this.metadata(n,decoded.value,legacy),data:clone(decoded.value.state)};
    }
    list(){
      const result=[];
      for(let n=1;n<=SLOT_COUNT;n++){
        const loaded=this.load(n);
        if(!loaded.ok)result.push({slot:n,exists:true,corrupted:true,error:loaded.error});
        else if(loaded.empty)result.push({slot:n,exists:false,legacy:false});
        else result.push(loaded.meta);
      }
      return result;
    }
    delete(slot){
      const n=validSlot(slot);if(!n)return errorResult("INVALID_SLOT","存档位必须是 1、2 或 3");
      if(!this.storage||typeof this.storage.removeItem!=="function")return errorResult("STORAGE_UNAVAILABLE","当前环境不支持存档");
      try{this.storage.removeItem(this.key(n));if(n===1)this.storage.removeItem(LEGACY_KEY);return {ok:true,slot:n};}catch(error){return errorResult("STORAGE_DELETE_FAILED","删除存档失败",error);}
    }
  }
  root.IMS_STORY_SAVE={StorySaveStore,SLOT_COUNT,KEY_PREFIX,LEGACY_KEY,CURRENT_SCHEMA};
  if(typeof module!=="undefined"&&module.exports)module.exports=root.IMS_STORY_SAVE;
})(typeof window!=="undefined"?window:globalThis);
