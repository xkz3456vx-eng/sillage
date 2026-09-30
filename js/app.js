(function(S){
  'use strict';
  const U=S.util;let saving=Promise.resolve();
  const defaults=()=>({units:'metric',theme:'light',brouter:S.config.brouter,profileUpload:S.config.profileUpload,overpass:[...S.config.overpass],nominatim:S.config.nominatim,autocomplete:S.config.autocomplete,contact:S.config.contact});
  function blank(preferences={}){const profile=Object.hasOwn(S.profiles,preferences.profile)?preferences.profile:null;return {version:1,id:U.id(),name:'Mon prochain départ',profile,options:profile?S.profileOptions(profile):{unpaved:50,traffic:1,climb:25,daily:50,speed:15,avoidToll:true},settings:{...defaults(),...(preferences.settings||{})},waypoints:[],importedWaypoints:[],route:null,routeDirty:false,loop:false,stages:[],nogos:[],poiCategories:profile?[...S.profiles[profile].poi]:[],poiRadius:S.config.poiRadius,selectedPOIs:[],basemap:'osm',view:null};}
  function validate(raw,{trusted=false}={}){
    if(!raw||raw.version!==1||typeof raw!=='object')throw new Error('Format de projet inconnu. Un projet Sillage version 1 est requis.');
    const out=blank(S.storage.prefs());out.id=typeof raw.id==='string'&&raw.id!=='draft'?raw.id:U.id();out.name=String(raw.name||'Parcours importé').slice(0,100);
    out.profile=Object.hasOwn(S.profiles,raw.profile)?raw.profile:out.profile;out.options={...(out.profile?S.profileOptions(out.profile):out.options)};
    for(const [k,min,max] of [['unpaved',0,100],['traffic',0,2],['climb',1,100],['daily',5,200],['speed',1,40]])if(Number.isFinite(raw.options?.[k]))out.options[k]=U.clamp(raw.options[k],min,max);out.options.traffic=Math.round(out.options.traffic);out.options.avoidToll=raw.options?.avoidToll!==false;
    const read=(field,max)=>{if(raw[field]!==undefined&&!Array.isArray(raw[field]))throw new Error('Liste invalide : '+field);const list=raw[field]||[];if(list.length>max)throw new Error('Trop de points dans '+field);return list.map(p=>{if(!U.validCoord(p))throw new Error('Coordonnées invalides dans '+field);return {id:typeof p.id==='string'?p.id.slice(0,100):U.id(),lat:p.lat,lng:p.lng,ele:Number.isFinite(p.ele)?p.ele:null,name:String(p.name||'Point de passage').slice(0,200)};});};
    out.waypoints=read('waypoints',S.config.maxWaypoints);out.importedWaypoints=read('importedWaypoints',5000);out.stages=read('stages',100);out.nogos=read('nogos',12).map((p,i)=>({...p,radius:U.clamp(raw.nogos[i].radius||100,10,20000)}));
    // Prevent duplicate identity keys from making drag/remove ambiguous.
    for(const list of [out.waypoints,out.stages,out.nogos]){const seen=new Set();for(const p of list){if(seen.has(p.id))p.id=U.id();seen.add(p.id);}}
    out.selectedPOIs=read('selectedPOIs',5000).map((p,i)=>({...p,id:/^(node|way|relation)\/\d+$/.test(raw.selectedPOIs[i].id)?raw.selectedPOIs[i].id:'node/0',category:Object.hasOwn(S.poiCategories,raw.selectedPOIs[i].category)?raw.selectedPOIs[i].category:'tourism',tags:Object.fromEntries(['opening_hours','drinking_water'].map(k=>[k,String(raw.selectedPOIs[i].tags?.[k]||'').slice(0,300)]))}));
    if(raw.route){if(!Array.isArray(raw.route.points)||raw.route.points.length<2||raw.route.points.length>S.config.maxPoints)throw new Error('Trace de projet invalide ou trop volumineuse.');out.route={source:raw.route.source==='gpx'?'gpx':'brouter',calculatedAt:String(raw.route.calculatedAt||''),points:raw.route.points.map(p=>{if(!U.validCoord(p))throw new Error('Coordonnée de trace invalide.');return {lat:p.lat,lng:p.lng,ele:Number.isFinite(p.ele)?p.ele:null,surface:Object.hasOwn(S.config.surface,p.surface)?p.surface:'unknown',...(p.break?{break:true}:{})};})};}
    out.routeDirty=!!raw.routeDirty;out.loop=!!raw.loop;out.poiCategories=Array.isArray(raw.poiCategories)?[...new Set(raw.poiCategories.filter(c=>Object.hasOwn(S.poiCategories,c)))]:out.poiCategories;out.poiRadius=Number.isFinite(raw.poiRadius)?U.clamp(raw.poiRadius,200,3000):S.config.poiRadius;out.basemap=Object.hasOwn(S.config.tiles,raw.basemap)?raw.basemap:'osm';
    if(raw.view&&Array.isArray(raw.view.center)&&U.validCoord({lat:raw.view.center[0],lng:raw.view.center[1]}))out.view={center:raw.view.center,zoom:U.clamp(raw.view.zoom||6,2,19)};
    // A shared/imported project cannot redirect APIs. Only local trusted settings
    // may restore endpoints; imports retain the recipient's existing settings.
    if(trusted&&raw.settings){const next={...defaults(),...raw.settings};for(const k of ['brouter','profileUpload','nominatim'])next[k]=U.safeURL(next[k]);next.overpass=next.overpass.slice(0,2).map(U.safeURL);next.units=next.units==='imperial'?'imperial':'metric';next.theme=next.theme==='dark'?'dark':'light';out.settings=next;}
    return out;
  }
  S.app={state:blank(),validate,
    savePrefs(){S.storage.savePrefs({profile:this.state.profile,settings:this.state.settings});},
    persist:U.debounce(()=>S.app.flush(),600),
    async flush(){const snapshot={...U.clone(this.state),projectId:this.state.id,id:'draft'};saving=saving.catch(()=>{}).then(async()=>{const ok=await S.storage.put(snapshot);document.getElementById('save-state').textContent=ok?'Brouillon enregistré':'Export JSON conseillé';});return saving;},
    changed(recalc=false){S.ui.renderWaypoints();S.map.renderWaypoints();this.persist();if(recalc){S.poi.cancel();if(this.state.waypoints.length>=2||this.state.route?.source!=='gpx')S.routing.schedule();}else S.elevation.update();},
    async chooseProfile(id){
      if(this.state.profile!==id&&(S.elevation.current?.distance||0)>200000&&!confirm('Ce parcours dépasse 200 km. Changer d’activité et recalculer entièrement la trace ?'))return;
      this.state.profile=id;this.state.options=S.profileOptions(id);this.state.poiCategories=[...S.profiles[id].poi];this.savePrefs();S.ui.renderProfile();S.ui.renderCategories();document.getElementById('profile-dialog').close();this.changed(this.state.waypoints.length>=2);
      if(id==='accessible')S.ui.notice('Le profil PMR exclut les marches et de nombreux chemins. Les largeurs et pentes réelles restent à vérifier : les données du réseau sont incomplètes.','warning');
    },
    addWaypoint(point){
      if(!this.state.profile){S.ui.dialog('profile-dialog');return;}
      if(!U.validCoord(point)){S.ui.notice('Coordonnées hors limites de la carte.','warning');return;}
      if(this.state.waypoints.length>=S.config.maxWaypoints){S.ui.notice('Limite de 160 points : divisez le parcours en plusieurs projets.','warning');return;}
      if(this.state.route?.source==='gpx'&&!this.state.waypoints.length){if(!confirm('Ajouter ce point nécessite de recalculer la trace importée avec BRouter. Continuer ?'))return;this.state.waypoints=S.gpx.anchors(this.state.route);}
      this.state.waypoints.push({id:U.id(),lat:point.lat,lng:point.lng,name:point.name||(!this.state.waypoints.length?'Départ':'Point '+(this.state.waypoints.length+1))});this.changed(true);
    },
    moveWaypoint(id,p){const w=this.state.waypoints.find(x=>x.id===id);if(w&&U.validCoord(p)){w.lat=p.lat;w.lng=p.lng;this.changed(true);}},
    removeWaypoint(id){this.state.waypoints=this.state.waypoints.filter(p=>p.id!==id);this.changed(true);},
    reorder(id,to){const a=this.state.waypoints,from=a.findIndex(p=>p.id===id);if(from<0||to<0||to>=a.length)return;a.splice(to,0,a.splice(from,1)[0]);this.changed(true);},
    setRoute(route){
      this.state.route=route;this.state.routeDirty=false;document.body.classList.remove('route-stale');
      if(route){for(const stage of this.state.stages){const near=U.nearest(stage,route.points);Object.assign(stage,route.points[near.index]);}}
      else this.state.stages=[];
      S.map.renderRoute();S.map.renderStages();S.elevation.update();S.ui.renderWaypoints();S.ui.renderStages();this.persist();
      const m=S.elevation.current;if(route){if(m.elevationKnown&&m.climbing>this.state.options.climb)S.ui.notice(`Parcours calculé : ${m.climbing.toFixed(1)} m/km de D+, au-delà de votre objectif de ${this.state.options.climb} m/km. Déplacez les étapes ou ajustez le profil.`,'warning');else S.ui.notice('Parcours calculé. Affinez les points ou explorez les haltes à proximité.');S.poi.schedule();}else {S.poi.cancel();S.poi.items=[];S.map.showPOIs([]);S.ui.renderPOIs();}
    },
    recalculate(){
      if(!this.state.profile){S.ui.dialog('profile-dialog');return;}
      if(this.state.route?.source==='gpx'&&!this.state.waypoints.length){if(!confirm('BRouter recalculera la trace à partir de points simplifiés, jusqu’à 120 repères. Le parcours pourra changer et les segments disjoints seront reliés. Continuer ?'))return;this.state.waypoints=S.gpx.anchors(this.state.route);S.ui.renderWaypoints();S.map.renderWaypoints();}
      if(this.state.waypoints.length<2){S.ui.notice('Placez au moins deux points sur la carte.');return;}
      this.state.routeDirty=true;document.body.classList.add('route-stale');this.persist();S.routing.calculate();
    },
    togglePOI(p){const a=this.state.selectedPOIs,i=a.findIndex(x=>x.id===p.id);if(i>=0)a.splice(i,1);else a.push(U.clone(p));this.persist();S.ui.renderPOIs();S.map.renderPOIMarkers();},
    autoStages(){const points=this.state.route?.points;if(!points){S.ui.notice('Créez une trace avant de proposer des étapes.');return;}const cum=S.elevation.current.cum,total=cum.at(-1),step=this.state.options.daily*1000;this.state.stages=[];for(let d=step;d<total&&this.state.stages.length<100;d+=step)this.state.stages.push({...U.atDistance(points,cum,d).point,id:U.id()});S.map.renderStages();S.ui.renderStages();this.persist();S.poi.schedule();},
    async backup(){if(this.state.route||this.state.waypoints.length)await S.storage.put({...this.state,id:U.id(),name:(this.state.name||'Parcours')+' — récupération'});},
    async newProject(){if((this.state.route||this.state.waypoints.length)&&!confirm('Créer un nouveau parcours ? Une copie de récupération sera conservée dans Mes sorties.'))return;await this.backup();this.load(blank(S.storage.prefs()));if(!this.state.profile)S.ui.dialog('profile-dialog');},
    async saveProject(){this.state.name=this.state.name.trim()||'Mon parcours';if(await S.storage.put(this.state)){S.ui.notice('Parcours enregistré dans Mes sorties.');this.persist();S.ui.renderProjects();}},
    load(project,{trusted=true}={}){
      try{S.routing.cancel();S.poi.cancel();const currentSettings=this.state.settings;this.state=validate(project,{trusted});if(!trusted)this.state.settings=currentSettings;S.poi.items=[];S.poi.alerts=[];S.map.setBase(this.state.basemap);S.map.restore();S.elevation.update();S.ui.refresh();S.ui.theme(this.state.settings.theme);this.persist();if(this.state.route&&!this.state.routeDirty)S.poi.schedule();}catch(e){S.ui.notice('Projet non chargé : '+e.message,'error');}
    },
    async importFile(file){
      try{if(file.size>S.config.maxFileBytes)throw new Error('Fichier trop volumineux (25 Mo maximum).');const text=await file.text();let project;
        if(file.name.toLowerCase().endsWith('.json'))project=validate(JSON.parse(text));else {const g=S.gpx.parse(text);project={...blank(S.storage.prefs()),...g};}
        await this.backup();this.load(project,{trusted:false});S.map.fit();S.ui.tab('route');S.ui.notice('Parcours importé. La trace originale est conservée ; le recalcul BRouter reste optionnel.');if(!this.state.profile)S.ui.dialog('profile-dialog');
      }catch(e){S.ui.notice('Import impossible : '+e.message,'error');}
    },
    exportJSON(){const data=U.clone(this.state);delete data.settings;U.download(JSON.stringify(data,null,2),U.filename(this.state.name,'json'),'application/json');},
    share(){
      try{if(location.protocol==='file:')throw new Error('Le partage nécessite une adresse HTTP(S) déployée. Vous pouvez déjà exporter un projet JSON.');if(!this.state.waypoints.length)throw new Error('Le partage par lien utilise des points de routage. Pour une trace importée, utilisez le projet JSON ou recalculez-la d’abord.');
        const st=this.state,data={version:1,name:st.name,profile:st.profile,options:st.options,waypoints:st.waypoints,loop:st.loop,nogos:st.nogos,stages:st.stages,poiCategories:st.poiCategories,poiRadius:st.poiRadius};const bytes=new TextEncoder().encode(JSON.stringify(data));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);const encoded=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const url=location.href.split('#')[0]+'#sillage='+encoded;if(url.length>16000)throw new Error('Lien trop long pour être fiable. Exportez le projet JSON complet.');document.getElementById('share-url').value=url;document.getElementById('share-wrap').hidden=false;document.getElementById('export-note').textContent='Toute personne disposant du lien peut lire les points. La trace sera recalculée à l’ouverture ; les POI sélectionnés sont conservés uniquement dans le GPX ou JSON.';
      }catch(e){document.getElementById('export-note').textContent=e.message;}
    },
    async init(){
      this.state=blank(S.storage.prefs());S.ui.init();await S.storage.init();const draft=await S.storage.get('draft');
      if(draft)try{this.state=validate({...draft,id:draft.projectId},{trusted:true});}catch(e){S.ui.notice('Le brouillon n’a pas pu être restauré : '+e.message,'warning');}
      if(!globalThis.L){S.ui.notice('Les bibliothèques cartographiques locales sont manquantes. Restaurez le dossier vendor.','error');return;}
      S.map.init();S.map.restore();S.geocoding.init();S.elevation.update();S.ui.refresh();S.ui.theme(this.state.settings.theme);S.storage.prune();
      if(location.hash.startsWith('#sillage=')){
        try{const encoded=location.hash.slice(9);if(encoded.length>20000)throw new Error('Lien trop long.');const binary=atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),data=JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));const project=validate(data);await this.backup();this.load(project,{trusted:false});S.map.fit();this.recalculate();history.replaceState(null,'',location.href.split('#')[0]);}catch(e){S.ui.notice('Lien de partage invalide : '+e.message,'error');}
      }
      if(!this.state.profile)S.ui.dialog('profile-dialog');
      if(this.state.route&&!this.state.routeDirty)S.poi.schedule();
      if(location.protocol==='file:')S.ui.notice('Mode fichier local : import, édition et export disponibles. Servez le dossier en HTTP pour identifier correctement l’application auprès des services publics.','warning');
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')this.flush();});
      window.addEventListener('pagehide',()=>this.flush());
    }
  };
  window.addEventListener('DOMContentLoaded',()=>S.app.init().catch(e=>{const el=document.getElementById('notice');el.hidden=false;document.getElementById('notice-text').textContent='Initialisation impossible : '+e.message;}));
})(Sillage);

