const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');let failures=0,count=0;
function check(ok,label){if(!ok){console.error('FAIL '+label);failures++;}else count++;}
for(const dir of ['js','tests','tools'])for(const file of fs.readdirSync(path.join(root,dir))){if(!/\.(js|cjs)$/.test(file))continue;try{new vm.Script(fs.readFileSync(path.join(root,dir,file),'utf8'),{filename:dir+'/'+file});check(true,file);}catch(e){check(false,e.message);}}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(/^(https?:|\.\/|#)/.test(m[1]))continue;check(fs.existsSync(path.join(root,m[1])),'Fichier référencé : '+m[1]);}
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const file of ['ui.js','app.js','map.js','elevation.js','geocoding.js']){const source=fs.readFileSync(path.join(root,'js',file),'utf8');for(const m of source.matchAll(/(?:getElementById\(|\$\()'([^']+)'\)/g))check(ids.has(m[1]),file+' élément #'+m[1]);}
for(const id of ['road','gravel','mtb','touring','hiking','accessible','bikepacking'])check(fs.existsSync(path.join(root,'profiles','sillage-'+id+'.brf')),'Profil '+id);
for(const name of ['leaflet','leaflet-draw','leaflet-elevation','d3'])check(fs.existsSync(path.join(root,'vendor','LICENSE-'+name+'.txt')),'Licence '+name);
for(const file of ['README.md','THIRD_PARTY.md','LICENSE','assets/palette.md','assets/logo.svg','assets/favicon.svg'])check(fs.existsSync(path.join(root,file)),file);
const icons=fs.readdirSync(path.join(root,'assets/icons'));check(icons.filter(x=>x.endsWith('-light.svg')).length===31,'31 icônes claires');check(icons.filter(x=>x.endsWith('-dark.svg')).length===31,'31 icônes sombres');
console.log(`${count} contrôles réussis ; ${failures} erreur(s).`);process.exitCode=failures?1:0;
