(function(S){
  'use strict';
  const U=S.util, gate=U.gate(S.config.routeInterval);
  let timer, controller, revision=0;
  function surface(tags){
    const t=Object.fromEntries(String(tags).split(/\s+/).filter(s=>s.includes('=')).map(s=>s.split('=')));
    if(/^(asphalt|paved|concrete|paving_stones|sett|cobblestone)$/.test(t.surface))return 'road';
    if(/^(gravel|fine_gravel|compacted|pebblestone)$/.test(t.surface))return 'gravel';
    if(/^(ground|dirt|earth|grass|sand|mud|rock|clay)$/.test(t.surface))return 'trail';
    if(t.surface==='unpaved')return t.highway==='path'?'trail':'gravel';
    return 'unknown'; // Never infer asphalt merely from the road class.
  }
  function parse(data){
    const f=data.features?.find(x=>x.geometry?.type==='LineString');
    if(!f||f.geometry.coordinates.length<2)throw new Error('BRouter n’a retourné aucune trace utilisable. Déplacez les points sur une voie.');
    const points=f.geometry.coordinates.map(c=>({lat:c[1],lng:c[0],ele:Number.isFinite(c[2])?c[2]:null,surface:'unknown'}));
    if(points.some(p=>!U.validCoord(p)))throw new Error('Coordonnées invalides dans la réponse BRouter.');
    // Messages describe the section ENDING at the supplied coordinate (backwards).
    // Match monotonically by coordinates, never by array index or row count.
    const rows=f.properties?.messages||[], header=rows[0]||[];
    const lon=header.indexOf('Longitude'),lat=header.indexOf('Latitude'),tag=header.indexOf('WayTags');
    const positions=new Map();
    const key=(a,b)=>Math.round(a*1e6)+','+Math.round(b*1e6);
    points.forEach((p,i)=>{const k=key(p.lng,p.lat);if(!positions.has(k))positions.set(k,[]);positions.get(k).push(i);});
    let start=0;
    if(lon>=0&&lat>=0&&tag>=0)for(const row of rows.slice(1)){
      let x=+row[lon],y=+row[lat];if(Math.abs(x)>180||Math.abs(y)>90){x/=1e6;y/=1e6;}
      const indexes=positions.get(key(x,y))||[];let end=indexes.find(i=>i>=start);
      if(end===undefined)continue;
      const kind=surface(row[tag]);for(let i=start+1;i<=end;i++)points[i].surface=kind;start=end;
    }
    return {points,source:'brouter',base:f.properties?.creator||'BRouter',calculatedAt:new Date().toISOString()};
  }
  async function profileId(state,signal){
    const source=S.buildProfile(state.profile,state.options), endpoint=state.settings.profileUpload;
    const key='profile:'+endpoint+':'+source;
    const cached=await S.storage.cacheGet(key,6*3600000);if(cached)return cached;
    await gate(signal);
    const response=await U.fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:source,signal});
    const data=await response.json();if(data.error||!data.profileid)throw new Error('Profil BRouter refusé : '+(data.error||'réponse invalide')+'. Vérifiez l’URL de publication des profils.');
    await S.storage.cacheSet(key,data.profileid);return data.profileid;
  }
  function explain(e){
    const d=String(e.detail||e.message);
    if(e.status===429)return 'BRouter reçoit trop de requêtes. Attendez un moment puis utilisez Recalculer.';
    if(/not found|not routable|no track|position|distance to next|island|cannot find/i.test(d))return 'Un point est isolé ou hors du réseau routable. Déplacez-le sur une route ou un sentier, puis recalculez. Détail : '+d.slice(0,180);
    return e.message+(e.detail?' '+e.detail.slice(0,180):'');
  }
  S.routing={parse,surface,
    cancel(){revision++;clearTimeout(timer);controller?.abort();U.event('routing-busy',false);},
    schedule(){this.cancel();S.app.state.routeDirty=true;S.app.persist();U.event('route-stale');timer=setTimeout(()=>this.calculate(),S.config.debounce);},
    async calculate(){
      this.cancel();const rev=revision, state=U.clone(S.app.state);
      if(state.waypoints.length<2){S.app.setRoute(null);return;}
      controller=new AbortController();const signal=controller.signal;U.event('routing-busy',true);
      try{
        const id=await profileId(state,signal), routePoints=[];
        const w=state.loop?[...state.waypoints,state.waypoints[0]]:state.waypoints;
        // Sequential overlapping batches bound URL size and public-server load.
        for(let start=0;start<w.length-1;start+=S.config.routeBatch-1){
          const chunk=w.slice(start,start+S.config.routeBatch),url=new URL(state.settings.brouter);
          url.search=new URLSearchParams({lonlats:chunk.map(p=>`${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join('|'),profile:id,alternativeidx:'0',format:'geojson',nogos:state.nogos.map(n=>`${n.lng},${n.lat},${Math.round(n.radius)}`).join('|')});
          const key='route:'+url.href;let part=await S.storage.cacheGet(key,S.config.routeTTL);
          if(!part){await gate(signal);const response=await U.fetch(url,{signal});part=parse(await response.json());await S.storage.cacheSet(key,part);}
          const offset=routePoints.length?1:0;for(let j=offset;j<part.points.length;j++)routePoints.push(part.points[j]);
          if(routePoints.length>S.config.maxPoints)throw new Error('Trace trop détaillée : divisez le projet en plusieurs itinéraires.');
          U.event('routing-progress',`Calcul du tronçon ${Math.floor(start/(S.config.routeBatch-1))+1} / ${Math.ceil((w.length-1)/(S.config.routeBatch-1))}`);
        }
        if(rev!==revision)return;
        S.app.setRoute({points:routePoints,source:'brouter',calculatedAt:new Date().toISOString()});
      }catch(e){if(signal.aborted||rev!==revision)return;S.ui.notice(explain(e),'error');}
      finally{if(rev===revision)U.event('routing-busy',false);}
    }
  };
})(Sillage);
