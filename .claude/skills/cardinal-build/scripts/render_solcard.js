/* Build 639 — is the Scope of Loss card actually visible?
   `display:none !important` from a :not() list is exactly what jsdom cannot
   resolve. Chromium can. Real CSS, real markup shape, real computed style. */
const fs=require('fs'); const {chromium}=require('playwright-core');
const cssOf=f=>{const h=fs.readFileSync(f,'utf8'); const o=[];
  let i=0; while((i=h.indexOf('<style',i))!==-1){
    const s=h.indexOf('>',i)+1, e=h.indexOf('</style>',s);
    if(e===-1) break; o.push(h.slice(s,e)); i=e; } return o.join('\n');};
(async()=>{
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await br.newPage();
  for(const [label,f] of [['BEFORE (638)',process.argv[2]],['AFTER  (639)',process.argv[3]]]){
    await p.setContent(`<!doctype html><html><head><style>${cssOf(f)}</style></head><body>
      <div id="projectView"><div id="tab-overview">
        <div class="contactrow" id="contactRow" style="display:none;"></div>
        <div id="acxMount">the profile</div>
        <div id="solCard"><div class="solCard" id="solCardEl">Scope of Loss Reader (AI)</div></div>
        <div id="cr-pp-mount">punch</div>
      </div></div></body></html>`);
    const r=await p.evaluate(()=>{
      const g=id=>{const e=document.getElementById(id);
        if(!e) return 'missing';
        const s=getComputedStyle(e);
        return s.display + (e.getBoundingClientRect().height>0?' (visible)':' (0 height)');};
      return { solCard:g('solCard'), acxMount:g('acxMount'),
               punch:g('cr-pp-mount'), legacy:g('contactRow') };
    });
    console.log(`\n${label}`);
    for(const k of Object.keys(r)) console.log(`   ${k.padEnd(10)} ${r[k]}`);
  }
  await br.close();
})();
