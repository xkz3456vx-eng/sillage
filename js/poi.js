(function(S){
  'use strict';
  const U=S.util, gate=U.gate(S.config.overpassInterval);
  let controller,revision=0,timer;
  const categories=S.poiCategories={
    water:{name:'Eau potable',icon:'water',sym:'Drinking Water',filters:['[amenity=drinking_water]','[natural=spring][drinking_water=yes]']},
    fountain:{name:'Fontaines',icon:'fountain',sym:'Water Source',filters:['[amenity=fountain]']},
    food:{name:'Courses & boulangeries',icon:'food',sym:'Shopping Center',filters:['[shop~"^(supermarket|convenience|bakery)$"]']},
    lodging:{name:'Hébergements & bivouac',icon:'lodging',sym:'Lodging',filters:['[tourism~"^(hotel|motel|hostel|camp_site|caravan_site|guest_house|alpine_hut|wilderness_hut|chalet|apartment)$"]','[camp_site=basic]','[tourism=camp_pitch]']},
    toilets:{name:'Toilettes publiques',icon:'toilets',sym:'Restroom',filters:['[amenity=toilets]']},
    bicycle:{name:'Vélo & réparation',icon:'bicycle',sym:'Bike Trail',filters:['[shop=bicycle]','[amenity=bicycle_repair_station]']},
    transport:{name:'Gares & transports',icon:'transport',sym:'Ground Transportation',filters:['[railway~"^(station|halt)$"]','[public_transport=station]','[highway=bus_stop]']},
    pharmacy:{name:'Pharmacies',icon:'pharmacy',sym:'Medical Facility',filters:['[amenity=pharmacy]']},
    tourism:{name:'Offices de tourisme',icon:'tourism',sym:'Information',filters:['[tourism=information][information=office]']}
  };
  function classify(t){
    if(t.amenity==='drinking_water'||t.natural==='spring'&&t.drinking_water==='yes')return 'water';
    if(t.amenity==='fountain')return 'fountain';
    if(['supermarket','convenience','bakery'].includes(t.shop))return 'food';
    if(['hotel','motel','hostel','camp_site','caravan_site','guest_house','alpine_hut','wilderness_hut','chalet','apartment','camp_pitch'].includes(t.tourism)||t.camp_site==='basic')return 'lodging';
    if(t.amenity==='toilets')return 'toilets';if(t.shop==='bicycle'||t.amenity==='bicycle_repair_station')return 'bicycle';
    if(['station','halt'].includes(t.railway)||t.public_transport==='station'||t.highway==='bus_stop')return 'transport';
    if(t.amenity==='pharmacy')return 'pharmacy';return 'tourism';
  }
  function hours(s){
    if(!s)return 'Horaires non renseignés';if(s==='24/7')return 'Ouvert en continu (24 h / 24)';
    const days={Mo:'lun.',Tu:'mar.',We:'mer.',Th:'jeu.',Fr:'ven.',Sa:'sam.',Su:'dim.',PH:'jours fériés',SH:'vacances scolaires'};
    return s.replace(/Mo|Tu|We|Th|Fr|Sa|Su|PH|SH/g,m=>days[m]).replace(/\boff\b/g,'fermé').replace(/\bopen\b/g,'ouvert')+' · horaires locaux';
  }
  function bbox(points,radius){
    let south=90,north=-90,west=180,east=-180;for(const p of points){south=Math.min(south,p.lat);north=Math.max(north,p.lat);west=Math.min(west,p.lng);east=Math.max(east,p.lng);}
    const dy=radius/111000,dx=radius/(111000*Math.max(.08,Math.cos((south+north)/2*Math.PI/180)));
    // Quantize outward: a cache hit cannot exclude the desired corridor.
    return [Math.max(-85,Math.floor((south-dy)*100)/100),Math.max(-180,Math.floor((west-dx)*100)/100),Math.min(85,Math.ceil((north+dy)*100)/100),Math.min(180,Math.ceil((east+dx)*100)/100)];
  }
  function chunks(points,radius){
    const result=[];let group=[],length=0;
    for(let i=0;i<points.length;i++){
      const p=points[i];if(p.break&&group.length){result.push(bbox(group,radius));group=[];length=0;}
      if(group.length)length+=U.distance(group[group.length-1],p);group.push(p);
      if(length>8000){result.push(bbox(group,radius));group=[p];length=0;}
    }
    if(group.length)result.push(bbox(group,radius));return [...new Map(result.map(b=>[b.join(','),b])).values()];
  }
  async function query(box,cats,settings,signal){
    const key='poi:'+settings.overpass.join('|')+':'+box.join(',')+':'+cats.slice().sort().join(',');
    const cached=await S.storage.cacheGet(key,S.config.poiTTL);if(cached)return cached;
    const q=`[out:json][timeout:30][maxsize:16777216];(${cats.flatMap(c=>categories[c].filters.map(f=>`nwr${f}(${box.join(',')});`)).join('')});out center tags;`;
    let error;
    for(let attempt=0;attempt<3;attempt++){
      try{
        await gate(signal);const endpoint=settings.overpass[attempt%settings.overpass.length];
        const res=await U.fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:q}),signal},45000);
        const data=await res.json();if(data.remark)throw new Error('Overpass : '+data.remark);if(!Array.isArray(data.elements))throw new Error('Réponse Overpass invalide.');
        await S.storage.cacheSet(key,data.elements);return data.elements;
      }catch(e){if(signal.aborted)throw e;error=e;if(attempt<2){U.event('poi-status','Serveur POI occupé ; nouvel essai sur le miroir…');let delay=Math.min(15000,2000*(attempt+1));const retry=Number(e.retryAfter);if(Number.isFinite(retry)&&retry>0)delay=Math.min(60000,retry*1000);await U.sleep(delay,signal);}}
    }
    throw error;
  }
  S.poi={items:[],page:0,complete:false,alerts:[],hours,classify,bbox,chunks,
    cancel(){revision++;clearTimeout(timer);controller?.abort();},
    schedule(){this.cancel();timer=setTimeout(()=>this.search(),1100);},
    async search(){
      this.cancel();const rev=revision,state=U.clone(S.app.state),route=state.route;
      this.items=[];this.page=0;this.complete=false;this.alerts=[];S.map.showPOIs([]);S.ui.renderPOIs();
      if(!route||state.routeDirty){U.event('poi-status','Calculez une trace à jour pour rechercher des services.');return;}
      if(!state.poiCategories.length){U.event('poi-status','Choisissez au moins une catégorie de services.');return;}
      controller=new AbortController();const signal=controller.signal;
      // Antimeridian corridors require wrapped bboxes; explicitly avoid world-wide queries.
      if(route.points.some((p,i)=>i&&Math.abs(p.lng-route.points[i-1].lng)>180)){U.event('poi-status','Pour rechercher les POI, scindez ce parcours au passage du méridien 180°.');return;}
      const scan=U.sample(route.points,4500),cum=U.cumulative(scan),boxes=chunks(scan,state.poiRadius),collected=new Map();
      let failed=0,truncated=boxes.length>S.config.maxCorridorChunks;
      try{
        for(const [index,box] of boxes.slice(0,S.config.maxCorridorChunks).entries()){
          U.event('poi-status',`Recherche des haltes : zone ${index+1} / ${Math.min(boxes.length,S.config.maxCorridorChunks)}…`);
          try{const rows=await query(box,state.poiCategories,state.settings,signal);for(const x of rows)collected.set(`${x.type}/${x.id}`,x);}catch(e){if(signal.aborted)throw e;failed++;if(failed>=3)throw e;}
        }
        const items=[];let count=0;
        for(const [id,x] of collected){
          const p={lat:x.lat??x.center?.lat,lng:x.lon??x.center?.lon};if(!U.validCoord(p))continue;
          const cat=classify(x.tags||{});if(!state.poiCategories.includes(cat))continue;
          const near=U.nearest(p,scan,cum);if(near.distance<=state.poiRadius)items.push({...p,id,category:cat,name:x.tags?.name||categories[cat].name,tags:x.tags||{},distance:near.distance,along:near.along});
          if(++count%100===0)await U.sleep(0,signal);
        }
        if(rev!==revision)return;
        this.items=items.sort((a,b)=>a.along-b.along).slice(0,S.config.maxPOIs);truncated||=items.length>S.config.maxPOIs;
        this.complete=!failed&&!truncated;
        this.alerts=this.waterAlerts(state,cum[cum.length-1]);
        // A separate 5 km search around each day's destination makes this alert
        // independent of the narrower corridor slider.
        if(state.poiCategories.includes('lodging')){
          const ends=[...state.stages.map(p=>U.nearest(p,scan,cum)).sort((a,b)=>a.along-b.along).map(x=>x.point),scan[scan.length-1]];
          for(const [index,end] of ends.slice(0,20).entries()){
            try{const rows=await query(bbox([end],5000),['lodging'],state.settings,signal);const found=rows.some(x=>{const p={lat:x.lat??x.center?.lat,lng:x.lon??x.center?.lon};return U.validCoord(p)&&U.distance(p,end)<=5000;});
              if(!found)this.alerts.push(`Jour ${index+1} : aucun hébergement OSM détecté dans un rayon de 5 km de l’arrivée.`);
            }catch(e){if(signal.aborted)throw e;this.alerts.push(`Hébergements du jour ${index+1} : recherche indisponible, présence inconnue.`);}
          }
          if(ends.length>20)this.alerts.push('Vérification des hébergements limitée aux 20 premières arrivées.');
        }
        if(rev!==revision)return;
        S.map.showPOIs(this.items);S.ui.renderPOIs();
        const absent=state.poiCategories.filter(c=>!this.items.some(p=>p.category===c)).map(c=>categories[c].name.toLowerCase());
        U.event('poi-status',`${this.items.length} service(s) détecté(s). ${this.complete?'':'Résultats partiels : certaines zones n’ont pas pu être couvertes. '}${absent.length?'Aucun résultat : '+absent.join(', ')+'.':''}`);
      }catch(e){if(signal.aborted||rev!==revision)return;this.complete=false;U.event('poi-status','Recherche POI interrompue : '+e.message);S.ui.notice('Les services autour du parcours n’ont pas pu être vérifiés. '+e.message,'warning');}
    },
    waterAlerts(state,total){
      if(!state.poiCategories.includes('water'))return ['Activez « Eau potable » pour vérifier les points d’eau sur le parcours.'];
      if(!this.complete)return ['Recherche partielle : les réserves d’eau ne peuvent pas être évaluées sur tout le parcours.'];
      const positions=[0,...this.items.filter(x=>x.category==='water').map(x=>x.along).sort((a,b)=>a-b),total],alerts=[];
      for(let i=1;i<positions.length;i++){const gap=positions[i]-positions[i-1];if(gap>=35000)alerts.push(`Aucun point d’eau potable OSM détecté sur ${S.ui.distance(gap)} après le km ${(positions[i-1]/1000).toFixed(1)}. Prévoyez vos réserves.`);}
      return alerts.slice(0,8);
    },
    popup(p){
      const el=document.createElement('div'),selected=S.app.state.selectedPOIs.some(x=>x.id===p.id),cat=categories[p.category];
      el.innerHTML=`<h3>${U.escape(p.name)}</h3><p>${U.escape(cat.name)} · à ${S.ui.distance(p.distance||0)} de la trace</p><p>${U.escape(hours(p.tags?.opening_hours))}</p>${p.category==='fountain'?'<p>Potabilité : '+(p.tags?.drinking_water==='yes'?'signalée dans OSM':'non confirmée')+'</p>':''}<a href="https://www.openstreetmap.org/${U.escape(p.id)}" target="_blank" rel="noopener">Voir la fiche OpenStreetMap</a><div><button data-action="waypoint">Ajouter au parcours</button><button data-action="select">${selected?'Retirer du GPX':'Inclure dans le GPX'}</button></div>`;
      el.querySelector('[data-action=waypoint]').onclick=()=>{S.app.addWaypoint(p);S.map.instance.closePopup();};
      el.querySelector('[data-action=select]').onclick=e=>{S.app.togglePOI(p);e.target.textContent=S.app.state.selectedPOIs.some(x=>x.id===p.id)?'Retirer du GPX':'Inclure dans le GPX';};
      return el;
    }
  };
})(Sillage);
