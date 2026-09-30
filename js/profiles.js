(function(S){
  'use strict';
  /* Table utilisateur → base BRF / tolérance non revêtu / trafic (0..2) /
   * dénivelé indicatif m/km / km par jour / km/h / catégories POI.
   * La base pédestre « hiking » porte le nom hiking-beta sur brouter.de.
   * Les sources officielles figées sont livrées dans profiles/ et embarquées
   * dans profile-sources.js pour permettre l'ouverture via file://.
   */
  S.profiles = {
    road: {name:'Vélo de route',base:'trekking',icon:'road',description:'Routes revêtues, chemins fortement pénalisés et escaliers exclus.',unpaved:5,traffic:2,climb:12,daily:90,speed:23,poi:['water','food','bicycle','transport']},
    gravel: {name:'Gravel',base:'gravel',icon:'gravel',description:'Routes secondaires et chemins roulants ; équilibre réglable avec le non-revêtu.',unpaved:65,traffic:2,climb:20,daily:75,speed:17,poi:['water','food','bicycle','lodging']},
    mtb: {name:'VTT',base:'mtb',icon:'mtb',description:'Chemins et sentiers techniques autorisés selon le profil VTT BRouter.',unpaved:95,traffic:2,climb:35,daily:45,speed:12,poi:['water','food','bicycle']},
    touring: {name:'Trekking / voyage',base:'trekking',icon:'touring',description:'Voyage à vélo : petites routes, voies cyclables et services utiles.',unpaved:40,traffic:2,climb:18,daily:70,speed:16,poi:['water','food','lodging','toilets','bicycle']},
    hiking: {name:'Randonnée pédestre',base:'hiking-beta',icon:'hiking',description:'Sentiers pédestres et chemins de randonnée. Un objectif de dénivelé élevé autorise davantage de terrain de montagne.',unpaved:90,traffic:2,climb:40,daily:22,speed:4.5,poi:['water','lodging','food','transport']},
    accessible: {name:'Poussette / PMR',base:'hiking-beta',icon:'accessible',description:'Filtre conservateur : marches, non-revêtu et sentiers sans indication d’accessibilité exclus. Accessibilité réelle à vérifier.',unpaved:0,traffic:2,climb:5,daily:12,speed:3,poi:['water','toilets','transport','pharmacy']},
    bikepacking: {name:'Bikepacking',base:'gravel',icon:'bikepacking',description:'L’aventure sur plusieurs jours, sur route ou chemin, avec points d’eau et hébergements à portée de trace.',unpaved:65,traffic:2,climb:25,daily:65,speed:15,poi:['water','food','lodging','toilets','bicycle']}
  };
  S.profileOptions=id=>{const p=S.profiles[id]; return {unpaved:p.unpaved,traffic:p.traffic,climb:p.climb,daily:p.daily,speed:p.speed,avoidToll:true};};
  S.profileBase=(id,o)=>id==='hiking'&&o.climb>40?'hiking-mountain':id==='bikepacking'&&o.unpaved<50?'trekking':S.profiles[id].base;
  S.buildProfile=function(id,o){
    const base=S.profileBase(id,o);let source=S.profileSources[base];
    if(!source) throw new Error('Source du profil BRouter introuvable.');
    const pmr=id==='accessible';
    // These are executable BRF expressions, added after base assignments.
    // Uphill cost is a routing preference. A maximum average D+/km is checked
    // after routing; BRouter does not expose a hard daily climbing constraint.
    const globals=`\n# Sillage : reglages utilisateur, priorite aux affectations finales\nassign uphillcost = ${Math.round(20+180*(1-o.climb/100))}\nassign downhillcost = ${pmr?180:35}\nassign uphillcutoff = ${pmr?1:1.5}\nassign downhillcutoff = ${pmr?1:1.5}\nassign processUnusedTags = true\n`;
    // Gravel defines elevation costs in the way context; assigning the same
    // variables globally would make them readonly there. Override in context.
    if(base==='gravel')source=source.replace('---context:node',globals+'\n---context:node');
    else source=source.replace('---context:way',globals+'\n---context:way');
    const terrain=(Math.pow(1-o.unpaved/100,2)*12).toFixed(3);
    const overlay=`\n# Sillage : filtres supplementaires, sans annuler les interdictions de la base\nassign sil_paved = surface=asphalt|paved|concrete|paving_stones\nassign sil_rough = surface=gravel|fine_gravel|compacted|unpaved|ground|dirt|grass|sand|mud|rock|pebblestone\nassign sil_traffic = if highway=trunk|trunk_link|primary|primary_link then ${o.traffic*4} else if highway=secondary|secondary_link then ${o.traffic*1.5} else 0\nassign sil_terrain = if sil_rough then ${terrain} else 0\nassign costfactor = if ${o.avoidToll?'toll=yes':'false'} then 10000 else costfactor\nassign costfactor = if ${id!=='hiking'&&id!=='mtb'?'highway=steps':'false'} then 10000 else costfactor\n${pmr?`assign sil_blocked = or highway=steps or wheelchair=no or not sil_paved and highway=path|footway not wheelchair=yes|designated\nassign costfactor = if sil_blocked then 10000 else costfactor\n`:''}assign costfactor = if greater costfactor 9998 then costfactor else add costfactor add sil_traffic sil_terrain\n`;
    source=source.replace('---context:node',overlay+'\n---context:node');
    return '# Sillage 1.0 - '+id+' / '+base+'\n'+source;
  };
})(Sillage);

