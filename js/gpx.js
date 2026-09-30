(function(S){
  'use strict';
  const U=S.util;
  function number(value,min,max){const n=Number(value);if(value===null||value===''||!Number.isFinite(n)||n<min||n>max)throw new Error('Le GPX contient des coordonnées invalides.');return n;}
  function child(el,tag){return Array.from(el.children).find(x=>x.localName===tag)?.textContent||'';}
  S.gpx={
    parse(text){
      if(text.length>S.config.maxFileBytes)throw new Error('Fichier trop volumineux (limite 25 Mo).');
      if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('Les déclarations DTD et entités ne sont pas acceptées dans un GPX.');
      const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length||doc.documentElement.localName!=='gpx')throw new Error('GPX mal formé : un document XML avec une racine <gpx> est requis.');
      const point=el=>({lat:number(el.getAttribute('lat'),-85,85),lng:number(el.getAttribute('lon'),-180,180),ele:child(el,'ele')===''?null:number(child(el,'ele'),-12000,100000),name:child(el,'name').slice(0,200),surface:'unknown'});
      const points=[];let segments=Array.from(doc.getElementsByTagNameNS('*','trkseg'));
      if(!segments.length)segments=Array.from(doc.getElementsByTagNameNS('*','rte'));
      for(const seg of segments){let first=true;for(const el of seg.children){if(!['trkpt','rtept'].includes(el.localName))continue;const p=point(el);if(first&&points.length)p.break=true;points.push(p);first=false;if(points.length>S.config.maxPoints)throw new Error('GPX trop détaillé (300 000 points maximum).');}}
      const waypoints=Array.from(doc.getElementsByTagNameNS('*','wpt')).map(point);
      if(points.length<2)throw new Error('Ce GPX doit contenir une trace ou une route d’au moins deux points.');
      if(waypoints.length>5000)throw new Error('Ce GPX contient trop de points nommés (limite 5 000).');
      const track=doc.getElementsByTagNameNS('*','trk')[0]||doc.getElementsByTagNameNS('*','rte')[0];
      return {name:child(track,'name')||'Parcours importé',route:{points,source:'gpx',calculatedAt:new Date().toISOString()},importedWaypoints:waypoints.map(p=>({...p,id:U.id()}))};
    },
    serialize(state){
      if(!state.route?.points.length)throw new Error('Créez ou importez une trace avant l’export GPX.');
      const lines=['<?xml version="1.0" encoding="UTF-8"?>','<gpx version="1.1" creator="Sillage 1.0" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 https://www.topografix.com/GPX/1/1/gpx.xsd">',`<metadata><name>${U.escape(state.name)}</name><time>${new Date().toISOString()}</time></metadata>`];
      const wpts=[...state.waypoints,...state.importedWaypoints,...state.stages.map((p,i)=>({...p,name:'Fin du jour '+(i+1),sym:'Flag, Red'})),...state.selectedPOIs.map(p=>({...p,sym:S.poiCategories[p.category]?.sym||'Waypoint'}))];
      for(const p of wpts)lines.push(`<wpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}">${Number.isFinite(p.ele)?`<ele>${p.ele.toFixed(1)}</ele>`:''}<name>${U.escape(p.name||'Point de passage')}</name><sym>${U.escape(p.sym||'Waypoint')}</sym></wpt>`);
      lines.push(`<trk><name>${U.escape(state.name)}</name><type>${U.escape(S.profiles[state.profile]?.name||'Itinéraire')}</type><trkseg>`);
      state.route.points.forEach((p,i)=>{if(p.break&&i)lines.push('</trkseg><trkseg>');lines.push(`<trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}">${Number.isFinite(p.ele)?`<ele>${p.ele.toFixed(1)}</ele>`:''}</trkpt>`);});lines.push('</trkseg></trk></gpx>');return lines.join('\n');
    },
    export(state){U.download(this.serialize(state),U.filename(state.name,'gpx'),'application/gpx+xml');},
    // Original track is kept. Only routing anchors are downsampled on explicit recalculation.
    anchors(route){const points=route.points,cum=U.cumulative(points),total=cum[cum.length-1],target=Math.min(120,Math.max(2,Math.ceil(total/2500)+1)),out=[];for(let i=0;i<target;i++){const p=U.atDistance(points,cum,total*i/(target-1)).point;if(!out.length||U.distance(p,out[out.length-1])>1)out.push({...p,id:U.id(),name:i===0?'Départ importé':i===target-1?'Arrivée importée':`Passage ${i+1}`});}return out;}
  };
})(Sillage);
