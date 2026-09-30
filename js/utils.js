(function (S) {
  'use strict';
  const rad = Math.PI / 180;
  const U = S.util = {
    id: () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
    clone: x => JSON.parse(JSON.stringify(x)),
    clamp: (x,a,b) => Math.max(a, Math.min(b, +x)),
    escape: s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])),
    debounce(fn, ms) { let timer; const f = (...a) => {clearTimeout(timer); timer = setTimeout(() => fn(...a), ms);}; f.cancel=()=>clearTimeout(timer); return f; },
    sleep: (ms, signal) => new Promise((resolve,reject) => {
      if(signal?.aborted) return reject(new DOMException('Annulé','AbortError'));
      const stop=()=>{clearTimeout(t); reject(new DOMException('Annulé','AbortError'));};
      const t=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},ms);
      signal?.addEventListener('abort',stop,{once:true});
    }),
    validCoord: p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat)<=85 && Math.abs(p.lng)<=180,
    distance(a,b) { const dlat=(b.lat-a.lat)*rad, dlng=(b.lng-a.lng)*rad; const x=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2; return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x))); },
    cumulative(points) { const d=[0]; for(let i=1;i<points.length;i++) d.push(d[i-1]+(points[i].break ? 0 : U.distance(points[i-1],points[i]))); return d; },
    nearest(p, points, cumulative) {
      let best={distance:Infinity,index:0,along:0,point:points[0]};
      const kx=111320*Math.cos(p.lat*rad), ky=111320;
      for(let i=1;i<points.length;i++) {
        if(points[i].break) continue;
        const a=points[i-1],b=points[i]; const x=(a.lng-p.lng)*kx,y=(a.lat-p.lat)*ky, dx=(b.lng-a.lng)*kx,dy=(b.lat-a.lat)*ky;
        const t=U.clamp(-(x*dx+y*dy)/(dx*dx+dy*dy||1),0,1), d=Math.hypot(x+t*dx,y+t*dy);
        if(d<best.distance) best={distance:d,index:t<.5?i-1:i,along:(cumulative?.[i-1]||0)+t*U.distance(a,b),point:{lat:a.lat+t*(b.lat-a.lat),lng:a.lng+t*(b.lng-a.lng)}};
      }
      return best;
    },
    // Preserve the original track for exports; rendering/POI scans use a bounded copy.
    sample(points, max=5000) {if(points.length<=max) return points; const step=Math.ceil(points.length/max); return points.filter((p,i)=>i%step===0 || i===points.length-1 || p.break || points[i+1]?.break);},
    atDistance(points, cum, meters) { let lo=0,hi=cum.length-1; while(lo<hi) {const m=(lo+hi)>>1; if(cum[m]<meters)lo=m+1;else hi=m;} return {index:lo,point:points[lo]}; },
    download(content,name,type='text/plain') {
      const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
      a.href=url;a.download=name;a.textContent='Télécharger '+name;a.className='download-link';
      const host=document.querySelector('#export-dialog[open]')||document.body;host.append(a);a.click();
      // Keep a real link available when an embedded browser blocks automatic
      // downloads; ordinary browsers download immediately after the user click.
      setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},300000);
    },
    filename(name,ext) {return new Date().toISOString().slice(0,10)+'-'+(name||'parcours').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70)+'.'+ext;},
    safeURL(value) {const url=new URL(value); if(!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new Error('Une URL HTTP(S) sans identifiants est requise.');return url.href;},
    async fetch(url, options={}, timeout=S.config.timeout) {
      if(location.protocol==='file:'&&/openstreetmap\.org$/.test(new URL(url).hostname))throw new Error('Le service public exige un Referer HTTP. Lancez le serveur statique indiqué dans le README.');
      if(navigator.onLine===false) throw new Error('Vous êtes hors connexion. Le projet reste disponible localement.');
      const controller=new AbortController(), external=options.signal;
      const abort=()=>controller.abort(); if(external?.aborted) abort();external?.addEventListener('abort',abort,{once:true});
      const timer=setTimeout(abort,timeout);
      try {
        const res=await fetch(url,{...options,signal:controller.signal,credentials:'omit',referrerPolicy:'strict-origin-when-cross-origin'});
        if(!res.ok) { const e=new Error(`Service indisponible (HTTP ${res.status}).`); e.status=res.status; e.detail=(await res.text()).slice(0,500); e.retryAfter=res.headers.get('Retry-After'); throw e; }
        return res;
      } catch(e) {
        if(e.name==='AbortError'&&!external?.aborted) throw new Error('Le service a dépassé le délai de réponse. Réessayez ou raccourcissez le parcours.');
        if(e instanceof TypeError) throw new Error('Service inaccessible : vérifiez la connexion, l’URL et l’autorisation CORS de l’instance.');
        throw e;
      } finally { clearTimeout(timer);external?.removeEventListener('abort',abort); }
    },
    // Serialized request-start gates: concurrent callers cannot bypass throttling.
    gate(interval) {let chain=Promise.resolve(),last=0;return signal=>{const next=chain.catch(()=>{}).then(async()=>{await U.sleep(Math.max(0,last+interval-Date.now()),signal);last=Date.now();});chain=next;return next;};},
    icon(name,cls='') {return `<svg class="icon ${cls}" aria-hidden="true"><use href="#${name}"></use></svg>`;},
    event(name,detail) {document.dispatchEvent(new CustomEvent('sillage:'+name,{detail}));},
    on(name,fn) {document.addEventListener('sillage:'+name,e=>fn(e.detail));}
  };
})(Sillage);

