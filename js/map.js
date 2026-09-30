(function(S){
  'use strict';
  const U=S.util;let instance,routeLayer,waypointLayer,stageLayer,nogoLayer,poiLayer,importLayer,cursorLayer,baseLayer,drawing=false,drawer;
  const icon=(html,size=30)=>L.divIcon({html,className:'sillage-marker',iconSize:[size,size],iconAnchor:[size/2,size/2]});
  S.map={instance:null,stageMode:false,
    init(){
      instance=this.instance=L.map('map',{zoomControl:false,preferCanvas:true,worldCopyJump:true,doubleClickZoom:false}).setView(S.config.center,S.config.zoom);
      L.control.zoom({zoomInTitle:'Zoom avant',zoomOutTitle:'Zoom arrière'}).addTo(instance);
      instance.attributionControl.setPrefix(false);this.setBase(S.app.state.basemap||'osm');
      routeLayer=L.layerGroup().addTo(instance);waypointLayer=L.layerGroup().addTo(instance);stageLayer=L.layerGroup().addTo(instance);nogoLayer=L.featureGroup().addTo(instance);poiLayer=L.layerGroup().addTo(instance);importLayer=L.layerGroup().addTo(instance);
      // An SVG renderer for elevation markers is created separately from route canvas.
      cursorLayer=L.circleMarker([0,0],{radius:6,color:'#fff',weight:3,fillColor:S.config.surface.road,fillOpacity:1,interactive:false});
      instance.on('click',e=>{if(drawing)return;if(this.stageMode){this.addStage(e.latlng);return;}S.app.addWaypoint({lat:e.latlng.lat,lng:e.latlng.lng});});
      instance.on('moveend',()=>{this.renderPOIMarkers();S.app.state.view={center:[instance.getCenter().lat,instance.getCenter().lng],zoom:instance.getZoom()};S.app.persist();});
      instance.on('draw:drawstart',()=>{drawing=true;document.body.classList.add('draw-active');});
      instance.on('draw:drawstop',()=>{setTimeout(()=>drawing=false,100);document.body.classList.remove('draw-active');});
      instance.on(L.Draw.Event.CREATED,e=>{const p=e.layer.getLatLng();S.app.state.nogos.push({id:U.id(),lat:p.lat,lng:p.lng,radius:Math.max(10,Math.min(20000,e.layer.getRadius()))});this.renderNogos();S.ui.renderStages();S.app.changed(true);});
      new ResizeObserver(()=>{instance.invalidateSize();S.elevation.resize();}).observe(document.querySelector('.map-workspace'));
      L.drawLocal.draw.handlers.circle.tooltip={start:'Cliquez puis faites glisser pour tracer une zone à éviter.'};L.drawLocal.draw.handlers.simpleshape.tooltip.end='Relâchez pour terminer.';
      L.drawLocal.draw.handlers.circle.radius='Rayon';
    },
    setBase(id){const cfg=S.config.tiles[id]||S.config.tiles.osm;if(baseLayer)instance.removeLayer(baseLayer);if(location.protocol==='file:')return;baseLayer=L.tileLayer(cfg.url,{attribution:cfg.attribution,maxZoom:cfg.maxZoom,keepBuffer:1}).addTo(instance);let notified=false;baseLayer.on('tileerror',()=>{if(notified)return;notified=true;S.ui.notice('Certaines tuiles sont indisponibles. Vérifiez la connexion ou changez de fond de carte.','warning');});document.getElementById('map').classList.toggle('satellite-map',id==='satellite');},
    renderWaypoints(){
      waypointLayer.clearLayers();const st=S.app.state;
      st.waypoints.forEach((p,i)=>{
        const marker=L.marker([p.lat,p.lng],{draggable:true,icon:icon(`<span class="waypoint-pin ${i===st.waypoints.length-1&&i?'finish':''}">${i===0?'D':i===st.waypoints.length-1?'A':i+1}</span>`),title:p.name||`Point ${i+1}`,bubblingMouseEvents:false}).addTo(waypointLayer);
        marker.on('dragend',e=>{const ll=e.target.getLatLng();S.app.moveWaypoint(p.id,ll);});marker.on('contextmenu',e=>{L.DomEvent.stop(e.originalEvent);S.app.removeWaypoint(p.id);});
        const el=document.createElement('div');el.innerHTML=`<strong>${U.escape(p.name||'Point '+(i+1))}</strong><br><button>Supprimer ce point</button>`;el.querySelector('button').onclick=()=>S.app.removeWaypoint(p.id);marker.bindPopup(el);
      });
      importLayer.clearLayers();for(const p of st.importedWaypoints.slice(0,500)){L.circleMarker([p.lat,p.lng],{radius:5,color:'#8a629d',weight:2,fillOpacity:.8,bubblingMouseEvents:false}).bindTooltip(U.escape(p.name||'Point GPX')).addTo(importLayer);}
      document.getElementById('map-hint').hidden=st.waypoints.length>0||!!st.route;
    },
    renderRoute(){
      routeLayer.clearLayers();this.hideCursor();const points=S.app.state.route?.points;if(!points)return;
      // Group contiguous surfaces before simplification so rare surface changes
      // never acquire their neighbour's color. Canvas handles long tracks.
      let group=[],kind=null;const bySurface={road:[],gravel:[],trail:[],unknown:[]};
      const flush=()=>{if(group.length<2)return;bySurface[kind in bySurface?kind:'unknown'].push(U.sample(group,4000).map(p=>[p.lat,p.lng]));};
      for(let i=1;i<points.length;i++){const p=points[i];if(p.break){flush();group=[];kind=null;continue;}if(p.surface!==kind){flush();kind=p.surface;group=[points[i-1],p];}else group.push(p);}
      flush();
      // At most four Leaflet objects, even when a large imported trace alternates
      // surfaces thousands of times. Multi-polylines retain each disjoint section.
      for(const [surface,parts] of Object.entries(bySurface)){if(!parts.length)continue;const line=L.polyline(parts,{color:S.config.surface[surface],weight:5,opacity:.95,smoothFactor:1.2,bubblingMouseEvents:false}).addTo(routeLayer);line.on('mousemove',e=>S.elevation.hover(e.latlng));line.on('mouseout',()=>this.hideCursor());line.on('click',e=>{if(this.stageMode)this.addStage(e.latlng);else S.app.addWaypoint({lat:e.latlng.lat,lng:e.latlng.lng});});}
    },
    fit(){const points=S.app.state.route?.points||S.app.state.waypoints;if(points.length){const sampled=U.sample(points,3000);instance.fitBounds(L.latLngBounds(sampled.map(p=>[p.lat,p.lng])),{paddingTopLeft:[55,90],paddingBottomRight:[30,Math.min(350,instance.getSize().y*.47)],maxZoom:15});}else S.ui.notice('Ajoutez des points pour cadrer votre parcours.');},
    cursor(ll){cursorLayer.setLatLng(ll);if(!instance.hasLayer(cursorLayer))cursorLayer.addTo(instance);},hideCursor(){if(cursorLayer&&instance.hasLayer(cursorLayer))instance.removeLayer(cursorLayer);},
    showPOIs(items){this.poiItems=items;this.renderPOIMarkers();},
    renderPOIMarkers(){
      if(!poiLayer)return;poiLayer.clearLayers();
      const bounds=instance.getBounds().pad(.1),selected=new Set(S.app.state.selectedPOIs.map(x=>x.id));
      const all=new Map([...(this.poiItems||[]),...S.app.state.selectedPOIs].map(p=>[p.id,p])),groups=new Map();
      for(const p of all.values()){
        if(!bounds.contains([p.lat,p.lng]))continue;
        const pixel=instance.latLngToContainerPoint([p.lat,p.lng]);
        const key=selected.has(p.id)||instance.getZoom()>=17?p.id:Math.floor(pixel.x/42)+':'+Math.floor(pixel.y/42);
        if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);
      }
      let count=0;
      for(const group of groups.values()){
        if(count++>=600)break;
        if(group.length===1){const p=group[0];L.marker([p.lat,p.lng],{icon:icon(`<span class="poi-pin ${selected.has(p.id)?'selected':''}">${U.icon(S.poiCategories[p.category].icon)}</span>`,27),title:p.name,bubblingMouseEvents:false}).bindPopup(()=>S.poi.popup(p)).addTo(poiLayer);}
        else {const lat=group.reduce((a,p)=>a+p.lat,0)/group.length,lng=group.reduce((a,p)=>a+p.lng,0)/group.length;L.marker([lat,lng],{icon:icon(`<span class="poi-cluster">${group.length}</span>`,30),title:`${group.length} services ; cliquez pour zoomer`,bubblingMouseEvents:false}).on('click',()=>instance.setView([lat,lng],Math.min(17,instance.getZoom()+2))).addTo(poiLayer);}
      }
    },
    focusPOI(p){instance.setView([p.lat,p.lng],15);L.popup().setLatLng([p.lat,p.lng]).setContent(S.poi.popup(p)).openOn(instance);},
    addStage(ll){const points=S.app.state.route?.points;if(!points){S.ui.notice('Calculez une trace avant de placer une fin d’étape.','warning');return;}const near=U.nearest(ll,points);if(near.distance>3000){S.ui.notice('Placez la fin d’étape plus près de la trace.','warning');return;}if(S.app.state.stages.length>=100){S.ui.notice('Limite de 100 fins d’étapes.','warning');return;}S.app.state.stages.push({...points[near.index],id:U.id()});this.setStageMode(false);this.renderStages();S.ui.renderStages();S.app.changed(false);S.poi.schedule();},
    setStageMode(value){this.stageMode=value;document.getElementById('stage-mode').setAttribute('aria-pressed',value);if(value)S.ui.notice('Cliquez sur la trace pour marquer la fin de votre journée.');},
    renderStages(){stageLayer.clearLayers();const st=S.app.state;if(!st.route)return;const points=st.route.points,cum=U.cumulative(points);const order=new Map(st.stages.map(p=>[p.id,U.nearest(p,points,cum).along]));st.stages.sort((a,b)=>order.get(a.id)-order.get(b.id));st.stages.forEach((p,i)=>{const m=L.marker([p.lat,p.lng],{icon:icon(`<span class="stage-pin">J${i+1}</span>`),draggable:true,bubblingMouseEvents:false,title:'Fin du jour '+(i+1)}).addTo(stageLayer);m.on('dragend',()=>{const near=U.nearest(m.getLatLng(),points);Object.assign(p,points[near.index]);this.renderStages();S.ui.renderStages();S.app.changed(false);S.poi.schedule();});});},
    drawNogo(){if(S.app.state.nogos.length>=12){S.ui.notice('Limite de 12 zones à éviter par projet.','warning');return;}drawer=new L.Draw.Circle(instance,{shapeOptions:{color:'#b94c4c',fillOpacity:.12},showRadius:true,metric:true});drawer.enable();},
    renderNogos(){nogoLayer.clearLayers();for(const n of S.app.state.nogos){L.circle([n.lat,n.lng],{radius:n.radius,color:'#b94c4c',weight:2,fillOpacity:.1,bubblingMouseEvents:false}).bindTooltip('Zone à éviter · '+Math.round(n.radius)+' m').addTo(nogoLayer);}},
    restore(){this.setStageMode(false);drawer?.disable();this.renderWaypoints();this.renderRoute();this.renderStages();this.renderNogos();this.showPOIs([]);const v=S.app.state.view;if(v)instance.setView(v.center,v.zoom);else if(S.app.state.route)this.fit();},
    locate(){if(!navigator.geolocation){S.ui.notice('La géolocalisation n’est pas disponible.','warning');return;}navigator.geolocation.getCurrentPosition(p=>instance.setView([p.coords.latitude,p.coords.longitude],14),e=>S.ui.notice(e.code===1?'La géolocalisation a été refusée. Recherchez un lieu ou placez le départ sur la carte.':'Position indisponible. Recherchez un lieu.','warning'),{timeout:10000,maximumAge:60000});}
  };
})(Sillage);

