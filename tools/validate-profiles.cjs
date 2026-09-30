/* Explicit integration test against public BRouter, sequential and throttled.
 * node tools/validate-profiles.cjs --live
 * Without --live: only writes the exact seven default customized BRF files. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx={window:{},console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/config.js'),'utf8').replace('window.Sillage = {};','var Sillage = {};'),ctx);
for(const f of ['profile-sources','profiles'])vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),ctx);
(async()=>{for(const id of Object.keys(ctx.Sillage.profiles)){
  const profile=ctx.Sillage.buildProfile(id,ctx.Sillage.profileOptions(id));fs.writeFileSync(path.join(root,'profiles','sillage-'+id+'.brf'),profile);
  if(!process.argv.includes('--live'))continue;
  const r=await fetch('https://brouter.de/brouter/profile',{method:'POST',headers:{'Content-Type':'text/plain','User-Agent':'Sillage/1.0 integration-validation'},body:profile,signal:AbortSignal.timeout(45000)});
  const data=await r.json();console.log(id,r.status,JSON.stringify(data));if(data.error||!data.profileid)process.exitCode=1;
  await new Promise(r=>setTimeout(r,2200));
}})().catch(e=>{console.error(e);process.exitCode=1;});
