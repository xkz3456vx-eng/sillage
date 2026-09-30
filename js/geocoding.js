(function(S){
  'use strict';
  const U=S.util,gate=U.gate(S.config.geocodeInterval);let controller,revision=0;
  let history=[];try{history=JSON.parse(localStorage.getItem('sillage:searches')||'[]');}catch{}
  function results(rows,caption=''){
    const box=document.getElementById('search-results');box.replaceChildren();box.hidden=false;
    if(caption){const p=document.createElement('p');p.className='search-result small muted';p.textContent=caption;box.append(p);}
    for(const row of rows){
      const div=document.createElement('div');div.className='search-result';const name=document.createElement('strong');name.textContent=row.display_name;div.append(name);
      const center=document.createElement('button');center.type='button';center.textContent='Voir sur la carte';center.onclick=()=>{S.map.instance.setView([+row.lat,+row.lon],14);box.hidden=true;};
      const add=document.createElement('button');add.type='button';add.textContent=S.app.state.waypoints.length?'Ajouter une étape':'Définir le départ';add.onclick=()=>{S.app.addWaypoint({lat:+row.lat,lng:+row.lon,name:row.display_name.split(',')[0]});S.map.instance.setView([+row.lat,+row.lon],14);box.hidden=true;};div.append(center,add);box.append(div);
    }
  }
  S.geocoding={
    async search(value){
      const q=value.trim();if(q.length<3){results([],'Saisissez au moins 3 caractères.');return;}
      controller?.abort();controller=new AbortController();const signal=controller.signal,rev=++revision;
      results([],'Recherche en cours…');
      try{
        const settings=S.app.state.settings,url=new URL(settings.nominatim);url.search=new URLSearchParams({q,format:'jsonv2',limit:'6','accept-language':'fr'});if(settings.contact)url.searchParams.set('email',settings.contact);
        const key='geocode:'+url.href;let rows=await S.storage.cacheGet(key,30*86400000);
        if(!rows){await gate(signal);const res=await U.fetch(url,{signal},20000);rows=await res.json();if(!Array.isArray(rows))throw new Error('Réponse de recherche invalide.');await S.storage.cacheSet(key,rows);}
        if(rev!==revision)return;rows=rows.filter(x=>U.validCoord({lat:+x.lat,lng:+x.lon}));results(rows,rows.length?'':'Aucun lieu trouvé. Essayez une commune ou une adresse plus précise.');
        history=[...rows,...history].filter((x,i,a)=>a.findIndex(y=>y.place_id===x.place_id)===i).slice(0,30);try{localStorage.setItem('sillage:searches',JSON.stringify(history));}catch{}
      }catch(e){if(signal.aborted)return;results([],'Recherche indisponible : '+e.message);S.ui.notice(e.message,'error');}
    },
    init(){
      const input=document.getElementById('search-input');const auto=U.debounce(()=>this.search(input.value),1000);
      document.getElementById('search-form').onsubmit=e=>{e.preventDefault();auto.cancel();this.search(input.value);};
      input.oninput=()=>{
        auto.cancel();controller?.abort();revision++;
        const value=input.value.trim().toLocaleLowerCase('fr');if(value.length<2){document.getElementById('search-results').hidden=true;return;}
        const settings=S.app.state.settings;let isPublic=true;try{isPublic=new URL(settings.nominatim).hostname==='nominatim.openstreetmap.org';}catch{}
        if(settings.autocomplete&&!isPublic){auto();return;}
        const local=history.filter(x=>x.display_name.toLocaleLowerCase('fr').includes(value)).slice(0,6);
        results(local,local.length?'Suggestions de votre historique':'Validez pour rechercher.');
      };
      input.onkeydown=e=>{if(e.key==='Escape')document.getElementById('search-results').hidden=true;};
      document.addEventListener('click',e=>{if(!e.target.closest('#search-form'))document.getElementById('search-results').hidden=true;});
    }
  };
})(Sillage);
