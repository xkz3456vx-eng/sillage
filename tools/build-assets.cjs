/* Rebuild the original icons and embedded BRF sources. Node is a maintenance
 * tool only; end users need no build, package manager or Node installation. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const shapes={
  water:'<path d="M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
  fountain:'<path d="M3 14h18l-3 5H6l-3-5ZM12 14V4M5 8c0-4 7-5 7 0 0-5 7-4 7 0M8 22h8M12 19v3"/>',
  food:'<path d="M4 8h16l-1 13H5L4 8ZM8 8V6a4 4 0 0 1 8 0v2M9 12v5M15 12v5"/>',
  lodging:'<path d="m3 12 9-9 9 9M5 10v11h14V10M9 21v-7h6v7M9 9h6"/>',
  toilets:'<circle cx="7" cy="4" r="2"/><circle cx="17" cy="4" r="2"/><path d="M5 8h4v7H5V8ZM6 15v6M8 15v6M17 8l-3 8h6l-3-8ZM16 16v5M18 16v5"/>',
  bicycle:'<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="m6 16 5-9 7 9H6l-3-9h4M14 4h3l1 3"/>',
  transport:'<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M12 3v8M8 18l-2 3M16 18l2 3M9 21h6"/><circle cx="8" cy="14.5" r=".7"/><circle cx="16" cy="14.5" r=".7"/>',
  pharmacy:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  tourism:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M10 17h4M11 7h2"/>',
  road:'<circle cx="5.5" cy="17" r="4"/><circle cx="18.5" cy="17" r="4"/><path d="m5.5 17 5-10 8 10h-13l-3-9h5M14 4h4v3M10 3l2 1"/>',
  gravel:'<circle cx="5.5" cy="15" r="4"/><circle cx="18.5" cy="15" r="4"/><path d="m5.5 15 5-9 8 9h-13l-3-8h5M14 3h3l1 3M3 22h2M9 21h2M16 22h2M21 20h1"/>',
  mtb:'<path d="m2 11 5-7 5 7M10 9l4-6 8 9"/><circle cx="5" cy="18" r="3.5"/><circle cx="19" cy="18" r="3.5"/><path d="m5 18 5-7 9 7H5M14 10h3l2 8"/>',
  touring:'<circle cx="5.5" cy="17" r="4"/><circle cx="18.5" cy="17" r="4"/><path d="m5.5 17 5-9 8 9h-13l-2-8h4M14 5h3l2 12M2 7h6M3 3h4v4H3V3"/>',
  hiking:'<circle cx="13" cy="4" r="2"/><path d="m11 8 3 1 3 4M12 8l-3 6 5 2-1 6M9 14l-4 7M17 11l2-1-1 12M10 7l-3 1-2 6"/>',
  accessible:'<circle cx="12" cy="4" r="2"/><path d="M11 8v7h6l3 6 2-1M12 11h6M8 11a6 6 0 1 0 7 9"/>',
  bikepacking:'<circle cx="5.5" cy="17" r="4"/><circle cx="18.5" cy="17" r="4"/><path d="m5.5 17 5-9 8 9h-13l-2-8h4M14 5h3l2 12M10 10l5 5h-7M2 5h6v4H2V5M17 8h5v5h-3"/>',
  new:'<path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 14h8M12 10v8"/>',
  import:'<path d="M4 15v6h16v-6M12 3v12m-4-4 4 4 4-4"/>',
  export:'<path d="M4 15v6h16v-6M12 15V3m-4 4 4-4 4 4"/>',
  save:'<path d="M4 3h13l3 3v15H4V3ZM8 3v6h8V3M8 21v-7h8v7"/>',
  settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  reverse:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
  loop:'<path d="M18 7a8 8 0 1 0 2 8M18 3v5h-5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  theme:'<path d="M20 14a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  refresh:'<path d="M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5M4 15a8 8 0 0 0 14 4l3-3m0 5v-5h-5"/>',
  fit:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><circle cx="12" cy="12" r="3"/>',
  locate:'<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  exclude:'<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
  share:'<circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="m8 10 8-4M8 14l8 4"/>'
};
fs.mkdirSync(path.join(root,'assets/icons'),{recursive:true});
let symbols='';
for(const [name,content] of Object.entries(shapes)){
  symbols+=`<symbol id="${name}" viewBox="0 0 24 24">${content}</symbol>`;
  for(const [theme,color] of [['light','#17645a'],['dark','#9cddbf']])fs.writeFileSync(path.join(root,'assets/icons',`${name}-${theme}.svg`),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><title>${name}</title>${content}</svg>\n`);
}
const sprite=`<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>`;
fs.writeFileSync(path.join(root,'assets/icons/sprite.svg'),sprite);
fs.writeFileSync(path.join(root,'js/icons.js'),'Sillage.iconSymbols = '+JSON.stringify(`<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${symbols}</svg>`)+';\n');
const logo='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>Sillage</title><rect x="1" y="1" width="46" height="46" rx="14" fill="#17645a"/><path d="M11 33c3-7 4-19 11-19 8 0-2 20 6 20 4 0 6-7 9-13" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="11" cy="33" r="3" fill="#eeb555"/><circle cx="37" cy="21" r="3" fill="#eeb555"/></svg>\n';
fs.writeFileSync(path.join(root,'assets/logo.svg'),logo);fs.writeFileSync(path.join(root,'assets/favicon.svg'),logo);
const sources={};for(const name of ['trekking','gravel','mtb','hiking-beta','hiking-mountain'])sources[name]=fs.readFileSync(path.join(root,'profiles',name+'.brf'),'utf8');
fs.writeFileSync(path.join(root,'js/profile-sources.js'),'/* Bundled BRouter profiles; provenance and licenses: THIRD_PARTY.md. */\nSillage.profileSources = '+JSON.stringify(sources,null,2)+';\n');
console.log(`Created ${Object.keys(shapes).length*2} original SVG icons and five embedded BRF sources.`);
