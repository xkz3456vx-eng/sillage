(function(S){
  'use strict';
  const PREFIX='sillage:', memory=new Map(); let db=null;
  function warn(e){S.util.event('storage-warning','Stockage local indisponible ou saturé. Exportez un projet JSON pour conserver votre travail. '+(e?.message||''));}
  function localGet(key,fallback=null){try{return JSON.parse(localStorage.getItem(PREFIX+key))??fallback;}catch{return fallback;}}
  function localSet(key,value){try{localStorage.setItem(PREFIX+key,JSON.stringify(value));return true;}catch(e){warn(e);return false;}}
  S.storage={
    prefs:()=>localGet('preferences',{}), savePrefs:p=>localSet('preferences',p),
    async init(){
      try{db=await new Promise((resolve,reject)=>{const r=indexedDB.open('sillage',1);r.onupgradeneeded=()=>{for(const n of ['projects','cache'])r.result.createObjectStore(n,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Fermez les anciens onglets.'));});}
      catch(e){warn(e);}return !!db;
    },
    async run(store,mode,action){
      if(!db) return null;
      return new Promise((resolve,reject)=>{const t=db.transaction(store,mode),r=action(t.objectStore(store));t.oncomplete=()=>resolve(r?.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});
    },
    async put(project){
      const p={...S.util.clone(project),updatedAt:new Date().toISOString()};
      if(db){try{await this.run('projects','readwrite',s=>s.put(p));return true;}catch(e){warn(e);}}
      return localSet('project:'+p.id,p);
    },
    async get(id){try{return (await this.run('projects','readonly',s=>s.get(id)))||localGet('project:'+id);}catch(e){warn(e);return localGet('project:'+id);}},
    async list(){
      let a=[];try{a=(await this.run('projects','readonly',s=>s.getAll()))||[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(PREFIX+'project:')){const p=localGet(k.slice(PREFIX.length));if(p&&!a.some(x=>x.id===p.id))a.push(p);}}}catch(e){warn(e);}
      return a.filter(p=>p.id!=='draft').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    },
    async remove(id){try{await this.run('projects','readwrite',s=>s.delete(id));localStorage.removeItem(PREFIX+'project:'+id);}catch(e){warn(e);throw e;}},
    async cacheGet(id,ttl){
      let v=memory.get(id);if(!v&&db){try{v=await this.run('cache','readonly',s=>s.get(id));}catch{}}
      return v&&Date.now()-v.time<ttl?v.data:null;
    },
    async cacheSet(id,data){
      const record={id,time:Date.now(),data};memory.set(id,record);if(memory.size>100)memory.delete(memory.keys().next().value);
      if(db)try{await this.run('cache','readwrite',s=>s.put(record));}catch{/* Cache optional; project persistence is reported separately. */}
    },
    async prune(){if(!db)return;try{const rows=await this.run('cache','readonly',s=>s.getAll());const old=rows.sort((a,b)=>b.time-a.time).filter((x,i)=>i>150||Date.now()-x.time>30*86400000);for(const r of old)await this.run('cache','readwrite',s=>s.delete(r.id));}catch{}}
  };
})(Sillage);
