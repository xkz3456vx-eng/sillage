const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),store=new Map();const ctx={console,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,DOMException,setTimeout,clearTimeout,structuredClone,Response,performance,crypto:require('node:crypto').webcrypto,navigator:{onLine:true},location:{protocol:'http:'},window:{addEventListener(){}},document:{dispatchEvent(){},addEventListener(){},getElementById(){return {textContent:'',classList:{add(){},remove(){}}};},body:{classList:{add(){},remove(){}}}},CustomEvent:class{constructor(name,options){this.type=name;this.detail=options?.detail;}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'js/config.js'),'utf8').replace('window.Sillage = {};','var Sillage = {};'),ctx);
for(const file of ['utils','profile-sources','profiles','storage','poi','elevation','gpx','app'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),ctx);
const S=ctx.Sillage;let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
test('Aucun profil favorisé à la première visite',()=>assert.equal(S.app.state.profile,null));
test('Import JSON : coordonnées invalides refusées',()=>assert.throws(()=>S.app.validate({version:1,waypoints:[{lat:91,lng:0}]})));
test('Un import ne peut pas rediriger les services vers un autre serveur',()=>{const p=S.app.validate({version:1,settings:{brouter:'https://evil.invalid'}});assert.equal(p.settings.brouter,S.config.brouter);});
test('Clés de prototype refusées comme catégories ou profils',()=>{const p=S.app.validate({version:1,profile:'__proto__',poiCategories:['__proto__','water']});assert.equal(p.profile,null);assert.equal(p.poiCategories.join(','),'water');});
test('Les ancres identiques ont des identités distinctes',()=>{const p=S.app.validate({version:1,waypoints:[{id:'same',lat:45,lng:6},{id:'same',lat:45.1,lng:6}]});assert.notEqual(p.waypoints[0].id,p.waypoints[1].id);});
test('Paramètres externes bornés et nombre de points limité',()=>{const p=S.app.validate({version:1,options:{speed:999,traffic:1.6,daily:1}});assert.equal(p.options.speed,40);assert.equal(p.options.traffic,2);assert.equal(p.options.daily,5);assert.throws(()=>S.app.validate({version:1,waypoints:Array.from({length:161},()=>({lat:45,lng:6}))}));});
test('Sérialisation de GPX avec services et fins de journée',()=>{const p=S.app.validate({version:1,name:'Été & <test>',profile:'hiking',route:{points:[{lat:45,lng:6,ele:100},{lat:45.01,lng:6,ele:null},{lat:46,lng:6,ele:120,break:true},{lat:46.01,lng:6,ele:125}]},selectedPOIs:[{id:'node/42',lat:45,lng:6,name:'Eau',category:'water'}],stages:[{lat:45.01,lng:6}]});const xml=S.gpx.serialize(p);assert(xml.includes('Drinking Water'));assert(xml.includes('&amp;'));fs.writeFileSync(path.join(root,'tests','export-validation.gpx'),xml);});
(async()=>{
  // Validate stale-result suppression with a controlled delayed routing reply.
  S.config.routeInterval=1;vm.runInContext(fs.readFileSync(path.join(root,'js/routing.js'),'utf8'),ctx);
  const cache=new Map();S.storage.cacheGet=async k=>cache.get(k);S.storage.cacheSet=async(k,v)=>cache.set(k,v);
  let delivered=0,notices=[],resolveRoute;
  S.ui={notice:(text)=>notices.push(text)};S.app.setRoute=()=>delivered++;
  S.app.state=S.app.validate({version:1,profile:'road',waypoints:[{lat:45,lng:6},{lat:45.01,lng:6}]});
  S.util.fetch=async(url,options)=>options?.method==='POST'?{json:async()=>({profileid:'custom_test'})}:new Promise(resolve=>resolveRoute=resolve);
  const job=S.routing.calculate();while(!resolveRoute)await new Promise(r=>setTimeout(r,5));S.routing.cancel();resolveRoute({json:async()=>({features:[{geometry:{type:'LineString',coordinates:[[6,45,100],[6,45.01,105]]},properties:{}}]})});await job;assert.equal(delivered,0);console.log('PASS Un résultat réseau retardé ne remplace pas un parcours modifié');count++;
  cache.clear();S.util.fetch=async(url,o)=>o?.method==='POST'?{json:async()=>({profileid:'custom_test'})}:(()=>{throw Object.assign(new Error('HTTP 429'),{status:429});})();await S.routing.calculate();assert.equal(delivered,0);assert(notices.some(x=>x.includes('trop de requêtes')));console.log('PASS HTTP 429 : message explicite et ancienne trace préservée');count++;
  console.log(`${count} tests Node réussis.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
