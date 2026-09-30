(function(S){
  'use strict';
  const U=S.util,$=id=>document.getElementById(id);let dragId=null;
  const bind=(id,fn)=>$(id).addEventListener('click',fn);
  S.ui={
    notice(text,type='info'){$('notice-text').textContent=text;$('notice').className='notice '+type;$('notice').hidden=false;},
    distance(m){const imperial=S.app?.state.settings.units==='imperial';return imperial?(m/1609.344).toLocaleString('fr',{maximumFractionDigits:1})+' mi':m<1000?Math.round(m)+' m':(m/1000).toLocaleString('fr',{maximumFractionDigits:1})+' km';},
    height(m){if(!Number.isFinite(m))return '—';return Math.round(m*(S.app.state.settings.units==='imperial'?3.28084:1)).toLocaleString('fr')+' '+(S.app.state.settings.units==='imperial'?'ft':'m');},
    time(h){if(!Number.isFinite(h))return '—';const minutes=Math.round(h*60);return Math.floor(minutes/60)+' h '+String(minutes%60).padStart(2,'0');},
    dialog(id){$(id).showModal();},
    tab(name){for(const el of document.querySelectorAll('[data-tab]')){el.classList.toggle('active',el.dataset.tab===name);el.setAttribute('aria-pressed',el.dataset.tab===name);}for(const el of document.querySelectorAll('.tab-panel'))el.hidden=el.id!=='tab-'+name;if(name==='projects')this.renderProjects();},
    theme(value){document.documentElement.dataset.theme=value;S.app.state.settings.theme=value;S.app.savePrefs();S.app.persist();},
    renderProfile(){const st=S.app.state,p=S.profiles[st.profile];$('current-profile').innerHTML=p?U.icon(p.icon)+U.escape(p.name):'Choisir une activité';for(const b of document.querySelectorAll('[data-profile]'))b.setAttribute('aria-pressed',b.dataset.profile===st.profile);this.renderOptions();},
    renderOptions(){const st=S.app.state,o=st.options;for(const key of ['unpaved','traffic','climb','daily','speed'])$(key).value=o[key];$('avoid-toll').checked=o.avoidToll;$('poi-radius').value=st.poiRadius;this.outputs();},
    outputs(){
      $('unpaved-out').textContent=$('unpaved').value+' %';$('traffic-out').textContent=['Faible','Moyen','Fort'][+$('traffic').value];$('climb-out').textContent=$('climb').value+' m/km';$('daily-out').textContent=this.distance(+$('daily').value*1000);$('speed-out').textContent=S.app.state.settings.units==='imperial'?(+$('speed').value*.621371).toFixed(1)+' mi/h':$('speed').value+' km/h';$('poi-radius-out').textContent=this.distance(+$('poi-radius').value);
    },
    renderWaypoints(){
      const st=S.app.state,list=$('waypoint-list');list.replaceChildren();$('point-count').textContent=st.waypoints.length;$('route-empty').hidden=!!st.waypoints.length||!!st.route;$('loop').setAttribute('aria-pressed',st.loop);$('route-name').value=st.name;
      for(const [i,p] of st.waypoints.entries()){
        const li=document.createElement('li');li.className='waypoint';li.draggable=true;li.dataset.id=p.id;
        li.innerHTML=`<span class="grip" aria-hidden="true">⠿</span><span class="waypoint-number">${i+1}</span><div class="waypoint-main"><input maxlength="100" aria-label="Nom du point ${i+1}" value="${U.escape(p.name)}"><div class="waypoint-coord">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</div></div><div class="waypoint-tools"><button data-action="up" aria-label="Monter le point ${i+1}" title="Monter">↑</button><button data-action="down" aria-label="Descendre le point ${i+1}" title="Descendre">↓</button></div><button class="delete" data-action="remove" title="Supprimer le point" aria-label="Supprimer le point ${i+1}">×</button>`;
        li.querySelector('input').onchange=e=>{p.name=e.target.value.trim()||'Point '+(i+1);S.map.renderWaypoints();S.app.persist();};
        li.querySelector('[data-action=remove]').onclick=()=>S.app.removeWaypoint(p.id);
        li.querySelector('[data-action=up]').onclick=()=>S.app.reorder(p.id,i-1);li.querySelector('[data-action=up]').disabled=i===0;
        li.querySelector('[data-action=down]').onclick=()=>S.app.reorder(p.id,i+1);li.querySelector('[data-action=down]').disabled=i===st.waypoints.length-1;
        li.ondragstart=e=>{if(e.target.tagName==='INPUT'){e.preventDefault();return;}dragId=p.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',p.id);};li.ondragover=e=>{e.preventDefault();li.classList.add('drag-over');};li.ondragleave=()=>li.classList.remove('drag-over');li.ondrop=e=>{e.preventDefault();li.classList.remove('drag-over');if(dragId)S.app.reorder(dragId,i);dragId=null;};li.ondragend=()=>{dragId=null;document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));};list.append(li);
      }
      if(st.importedWaypoints.length){const p=document.createElement('p');p.className='small muted';p.textContent=`${st.importedWaypoints.length} point(s) nommé(s) importé(s), conservé(s) dans le GPX.`;list.append(p);}
    },
    renderStats(m){
      const imperial=S.app.state.settings.units==='imperial';
      $('stat-distance').innerHTML=m.distance?`${(m.distance/(imperial?1609.344:1000)).toLocaleString('fr',{maximumFractionDigits:1})}<small>${imperial?'mi':'km'}</small>`:'—';
      $('stat-ascent').textContent=m.elevationKnown?this.height(m.ascent):'—';$('stat-descent').textContent=m.elevationKnown?this.height(m.descent):'—';$('stat-time').textContent=m.distance?this.time(m.hours):'—';$('difficulty').textContent=m.difficulty;
      $('elevation-range').textContent=m.elevationKnown?`${this.height(m.min)} – ${this.height(m.max)}${m.coverage<1?' · altitudes partielles':''}`:'Altitude non renseignée';
      $('surface-bar').replaceChildren();for(const [type,length] of Object.entries(m.surfaces)){const pct=m.distance?length/m.distance*100:0;$('surface-'+type).textContent=m.distance?Math.round(pct)+' %':'—';const part=document.createElement('span');part.style.width=pct+'%';part.style.background=S.config.surface[type];$('surface-bar').append(part);}
    },
    renderCategories(){const st=S.app.state,container=$('poi-categories');container.replaceChildren();for(const [id,c] of Object.entries(S.poiCategories)){const label=document.createElement('label');label.className='poi-category';label.innerHTML=U.icon(c.icon)+`<span>${U.escape(c.name)}</span><input type="checkbox" value="${id}" ${st.poiCategories.includes(id)?'checked':''}>`;label.querySelector('input').onchange=e=>{if(e.target.checked)st.poiCategories.push(id);else st.poiCategories=st.poiCategories.filter(x=>x!==id);S.app.changed(false);S.poi.schedule();};container.append(label);}},
    renderPOIs(){
      $('poi-count').textContent=S.poi.items.length;const list=$('poi-list');list.replaceChildren();const selected=new Set(S.app.state.selectedPOIs.map(x=>x.id));
      for(const p of S.poi.items.slice(0,(S.poi.page+1)*30)){const card=document.createElement('article');card.className='poi-card';card.innerHTML=`<h3>${U.escape(p.name)}</h3><p>${U.escape(S.poiCategories[p.category].name)} · ${this.distance(p.distance)} de la trace</p><button data-action="view">Voir</button><button data-action="select">${selected.has(p.id)?'Retirer du GPX':'Inclure dans le GPX'}</button>`;card.querySelector('[data-action=view]').onclick=()=>{document.body.classList.remove('panel-open');S.map.focusPOI(p);};card.querySelector('[data-action=select]').onclick=()=>S.app.togglePOI(p);list.append(card);}
      $('poi-more').hidden=S.poi.items.length<=(S.poi.page+1)*30;$('poi-alerts').replaceChildren();for(const msg of S.poi.alerts){const p=document.createElement('p');p.textContent=msg;$('poi-alerts').append(p);}
    },
    renderStages(){
      const list=$('stages-list');list.replaceChildren();for(const day of S.elevation.stages()){const div=document.createElement('div');div.className='stage-row';div.innerHTML=`<span><strong>Jour ${day.day}</strong> · ${this.distance(day.distance)} · +${day.elevationKnown?this.height(day.ascent):'—'}</span>${day.id!=='end'?'<button title="Supprimer cette fin d’étape" aria-label="Supprimer cette fin d’étape">×</button>':''}`;if(day.id!=='end')div.querySelector('button').onclick=()=>{S.app.state.stages=S.app.state.stages.filter(x=>x.id!==day.id);S.map.renderStages();this.renderStages();S.app.changed(false);S.poi.schedule();};list.append(div);}
      $('nogos-list').replaceChildren();for(const [i,n] of S.app.state.nogos.entries()){const row=document.createElement('div');row.className='nogo-row';row.innerHTML=`<span>Zone ${i+1} · rayon ${this.distance(n.radius)}</span><button aria-label="Supprimer la zone ${i+1}">×</button>`;row.querySelector('button').onclick=()=>{S.app.state.nogos=S.app.state.nogos.filter(x=>x.id!==n.id);S.map.renderNogos();this.renderStages();S.app.changed(true);};$('nogos-list').append(row);}
    },
    thumbnail(points){if(points.length<2)return '<svg class="project-thumb"></svg>';const pts=U.sample(points,100),xs=pts.map(p=>p.lng*Math.cos(p.lat*Math.PI/180)),ys=pts.map(p=>-p.lat),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=Math.min(270/(maxX-minX||.0001),42/(maxY-minY||.0001));return `<svg class="project-thumb" viewBox="0 0 290 58" aria-hidden="true"><path d="${pts.map((p,i)=>`${i===0||p.break?'M':'L'}${(145+(xs[i]-(minX+maxX)/2)*scale).toFixed(1)},${(29+(ys[i]-(minY+maxY)/2)*scale).toFixed(1)}`).join(' ')}"/></svg>`;},
    async renderProjects(){
      const list=$('projects-list');list.textContent='Chargement…';const projects=await S.storage.list();list.replaceChildren();if(!projects.length){list.innerHTML='<div class="empty-card"><strong>Votre carnet attend ses sorties.</strong><p>Enregistrez un parcours pour le retrouver ici.</p></div>';return;}
      for(const p of projects){const card=document.createElement('article');card.className='project-card';card.innerHTML=this.thumbnail(p.route?.points||p.waypoints||[])+`<h3>${U.escape(p.name)}</h3><p>${new Date(p.updatedAt).toLocaleDateString('fr')} · ${this.distance(p.route?U.cumulative(p.route.points).at(-1):0)}</p><button data-action="open">Ouvrir</button><button data-action="duplicate">Dupliquer</button><button data-action="rename">Renommer</button><button data-action="delete">Supprimer</button>`;
        card.querySelector('[data-action=open]').onclick=async()=>{await S.app.backup();S.app.load(p);this.tab('route');};
        card.querySelector('[data-action=duplicate]').onclick=async()=>{await S.storage.put({...p,id:U.id(),name:p.name+' — copie'});this.renderProjects();};
        card.querySelector('[data-action=rename]').onclick=async()=>{const name=prompt('Nom du parcours',p.name);if(name?.trim()){p.name=name.trim().slice(0,100);await S.storage.put(p);this.renderProjects();}};
        card.querySelector('[data-action=delete]').onclick=async()=>{if(confirm(`Supprimer « ${p.name} » de ce navigateur ?`)){try{await S.storage.remove(p.id);this.renderProjects();}catch(e){this.notice(e.message,'error');}}};list.append(card);
      }
    },
    settings(){const form=$('settings-form'),s=S.app.state.settings;for(const key of ['units','theme','brouter','profileUpload','nominatim','contact'])form.elements[key].value=s[key]||'';form.elements.overpass.value=s.overpass[0];form.elements.overpassMirror.value=s.overpass[1];form.elements.autocomplete.checked=s.autocomplete;this.dialog('settings-dialog');},
    refresh(){this.renderProfile();this.renderWaypoints();this.renderCategories();this.renderPOIs();this.renderStages();$('basemap').value=S.app.state.basemap;document.body.classList.toggle('route-stale',!!S.app.state.routeDirty);},
    init(){
      document.body.insertAdjacentHTML('afterbegin',S.iconSymbols);
      for(const b of document.querySelectorAll('[data-icon]'))b.insertAdjacentHTML('afterbegin',U.icon(b.dataset.icon));
      for(const b of document.querySelectorAll('.dialog-close'))b.onclick=()=>b.closest('dialog').close();
      for(const [id,p] of Object.entries(S.profiles)){const b=document.createElement('button');b.className='profile-card';b.dataset.profile=id;b.title=p.description;b.setAttribute('aria-pressed','false');b.innerHTML=U.icon(p.icon)+`<div><strong>${U.escape(p.name)}</strong><span>${U.escape(p.description)}</span></div>`;b.onclick=()=>S.app.chooseProfile(id);$('profile-grid').append(b);}
      for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>this.tab(b.dataset.tab);
      bind('profile-open',()=>this.dialog('profile-dialog'));bind('settings-open',()=>this.settings());bind('help-open',()=>this.dialog('help-dialog'));bind('notice-close',()=>$('notice').hidden=true);
      bind('panel-toggle',()=>{const open=document.body.classList.toggle('panel-open');$('panel-toggle').setAttribute('aria-expanded',open);});
      bind('theme-toggle',()=>this.theme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
      bind('new-route',()=>S.app.newProject());bind('save-project',()=>S.app.saveProject());bind('reverse',()=>{S.app.state.waypoints.reverse();S.app.changed(true);});
      bind('loop',()=>{S.app.state.loop=!S.app.state.loop;S.app.changed(true);});bind('recalculate',()=>S.app.recalculate());bind('cancel-routing',()=>{S.routing.cancel();this.notice('Calcul annulé. La dernière trace reste disponible.');});
      bind('fit-route',()=>S.map.fit());bind('locate',()=>S.map.locate());$('basemap').onchange=e=>{S.app.state.basemap=e.target.value;S.map.setBase(e.target.value);S.app.persist();};
      bind('fit-route-side',()=>{document.body.classList.remove('panel-open');$('panel-toggle').setAttribute('aria-expanded','false');S.map.fit();});
      $('route-name').oninput=e=>{S.app.state.name=e.target.value;S.app.persist();};
      for(const key of ['unpaved','traffic','climb','daily','speed']){$(key).oninput=()=>{this.outputs();S.app.state.options[key]=+$(key).value;if(['speed','daily'].includes(key)){S.elevation.update();this.renderStages();S.app.persist();}else S.app.changed(true);};}
      $('avoid-toll').onchange=e=>{S.app.state.options.avoidToll=e.target.checked;S.app.changed(true);};
      $('poi-radius').oninput=()=>{this.outputs();S.app.state.poiRadius=+$('poi-radius').value;S.app.persist();S.poi.schedule();};bind('poi-refresh',()=>S.poi.search());bind('poi-more',()=>{S.poi.page++;this.renderPOIs();});
      bind('auto-stages',()=>S.app.autoStages());bind('stage-mode',()=>S.map.setStageMode(!S.map.stageMode));bind('add-nogo',()=>S.map.drawNogo());
      bind('elevation-toggle',()=>{const el=$('elevation-wrap');el.hidden=!el.hidden;$('elevation-toggle').setAttribute('aria-expanded',!el.hidden);S.elevation.resize();});
      bind('import-file',()=>$('file-input').click());$('file-input').onchange=async e=>{const file=e.target.files[0];if(file)await S.app.importFile(file);e.target.value='';};
      bind('export-open',()=>{$('export-note').textContent=S.app.state.routeDirty?'Attention : le GPX exportera la dernière trace calculée, antérieure aux dernières modifications.':`${S.app.state.selectedPOIs.length} service(s) sélectionné(s) seront inclus dans le GPX.`;this.dialog('export-dialog');});
      bind('export-gpx',()=>{try{if(S.app.state.routeDirty&&!confirm('Le parcours a changé depuis le dernier calcul. Exporter tout de même la dernière trace ?'))return;S.gpx.export(S.app.state);}catch(e){this.notice(e.message,'error');$('export-dialog').close();}});
      bind('export-json',()=>S.app.exportJSON());bind('export-brf',()=>{try{if(!S.app.state.profile)throw new Error('Choisissez d’abord une activité.');U.download(S.buildProfile(S.app.state.profile,S.app.state.options),U.filename(S.app.state.profile,'brf'));}catch(e){this.notice(e.message,'error');}});
      bind('export-share',()=>S.app.share());bind('copy-share',async()=>{try{await navigator.clipboard.writeText($('share-url').value);$('copy-share').textContent='Copié';}catch{$('share-url').focus();$('share-url').select();this.notice('Copiez le texte sélectionné avec Ctrl+C.');}});
      $('settings-form').onsubmit=e=>{e.preventDefault();try{const f=e.target.elements,s=S.app.state.settings,next={...s};for(const k of ['brouter','profileUpload','nominatim'])next[k]=U.safeURL(f[k].value);next.overpass=[U.safeURL(f.overpass.value),U.safeURL(f.overpassMirror.value)];next.units=f.units.value;next.theme=f.theme.value;next.contact=f.contact.value;next.autocomplete=f.autocomplete.checked;if(new URL(next.nominatim).hostname==='nominatim.openstreetmap.org')next.autocomplete=false;S.app.state.settings=next;this.theme(next.theme);S.app.savePrefs();S.app.persist();S.elevation.update();this.renderStages();this.outputs();$('settings-dialog').close();this.notice('Paramètres enregistrés. Utilisez Recalculer pour interroger la nouvelle instance.');}catch(err){this.notice(err.message,'error');}};
      U.on('routing-busy',busy=>{$('busy').hidden=!busy;$('busy-text').textContent='Calcul du parcours…';});U.on('routing-progress',text=>$('busy-text').textContent=text);U.on('route-stale',()=>document.body.classList.add('route-stale'));U.on('poi-status',msg=>$('poi-status').textContent=msg);U.on('storage-warning',msg=>this.notice(msg,'warning'));
      window.addEventListener('offline',()=>this.notice('Vous êtes hors connexion. Vos traces et projets restent accessibles ; les services et fonds de carte nécessitent Internet.','warning'));window.addEventListener('online',()=>this.notice('Connexion rétablie. Vous pouvez relancer le calcul ou la recherche de services.'));
    }
  };
})(Sillage);

