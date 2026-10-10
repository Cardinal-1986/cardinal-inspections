/* gate_1277.mjs — the OC Preferred Contractor lockup on estimates (Theo, 10 Oct, pick #7).
   Real Chromium; the app and /oc-preferred-contractor.png served from the repo.
     A  the file ships: it is a real PNG at the repo root and .vercelignore does not exclude it
     B  the SHIPPED buildDocHtml puts it under the Cardinal logo, and it LOADS (naturalWidth > 0)
        in the rendered estimate — below the logo, not beside it
     C  the Good / Better / Best proposal carries it too
     D  the in-editor ROOFING ESTIMATE template uses the real lockup; the pink text pill is gone
   usage: node gate_1277.mjs [file.html] — RED on 1276, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=join(HERE,'../../../..');
const FILE=process.argv[2]||join(ROOT,'index.html');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 150000).unref();

/* A */
const PNGF=join(ROOT,'oc-preferred-contractor.png');
const png=existsSync(PNGF)?readFileSync(PNGF):Buffer.alloc(0);
const vi=existsSync(join(ROOT,'.vercelignore'))?readFileSync(join(ROOT,'.vercelignore'),'utf8'):'';
const excluded=vi.split('\n').some(l=>{ const t=l.trim(); return t && !t.startsWith('#') && (t==='oc-preferred-contractor.png' || t==='*.png' || t==='/oc-preferred-contractor.png'); });
need('A  /oc-preferred-contractor.png is a real PNG and ships', png.length>2000 && png.slice(1,4).toString()==='PNG' && !excluded, JSON.stringify({bytes:png.length, excluded}));

const LOGO=readFileSync(join(ROOT,'cardinal-report-logo.png'));
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1100,height:900}});
const serve=async r=>{ const u=r.request().url();
  if(u.startsWith('https://sentinel.test/oc-preferred-contractor.png')) return png.length?r.fulfill({status:200,contentType:'image/png',body:png}):r.fulfill({status:404,body:''});
  if(u.startsWith('https://sentinel.test/blank-')) return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body></body></html>'});
  if(u.startsWith('https://sentinel.test/cardinal-report-logo.png')) return r.fulfill({status:200,contentType:'image/png',body:LOGO});
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''}); };
await page.route('**/*', serve);
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2600);
const docs=await page.evaluate(()=>{ const B=window.CardinalEstimatePublish; if(!B) return {};
  const est={ estimate_number:'EST-2026-0999', itemized:true, subtotal:12000, total:12000, deposit_pct:30, deposit_amount:3600, valid_through:'2026-11-08',
    line_items:[{ name:'Roof replacement', qty:28, unit:'SQ', unit_price:425 }], photos:[], id:'e1', title:'Estimate', project_id:'p1' };
  const pr={ name:'Dave McCoy', address:'5226 Kellenberger' };
  let one='', gbb='';
  try{ one=B.buildDocHtml(est, pr, {}); }catch(e){ one='ERR '+e.message; }
  try{ gbb=B.buildGbbHtml([Object.assign({},est,{rank:'Good'}),Object.assign({},est,{rank:'Better'})], pr, null); }catch(e){ gbb='ERR '+e.message; }
  return { one, gbb }; });

/* B */
const p2=await browser.newPage({viewport:{width:900,height:900}});
await p2.route('**/*', serve);
await p2.goto('https://sentinel.test/blank-'+Date.now(),{waitUntil:'domcontentloaded'}).catch(()=>{});
try{ await p2.setContent(docs.one||'<p>none</p>',{waitUntil:'domcontentloaded', timeout:15000}); }catch(_){}
await p2.waitForTimeout(1500);
const b=await p2.evaluate(()=>{ const oc=document.querySelector('.est-brand img.est-ocpc'), lg=document.querySelector('.est-brand img.est-logo');
  if(!oc) return { has:false };
  const a=oc.getBoundingClientRect(), l=lg?lg.getBoundingClientRect():null;
  return { has:true, loaded:oc.complete && oc.naturalWidth>0, nw:oc.naturalWidth, w:Math.round(a.width), below: l ? a.top>=l.bottom-1 : false, alt:oc.alt }; });
need('B  the published estimate carries the lockup under the Cardinal logo', b.has && b.below && /Owens Corning Preferred Contractor/.test(b.alt), JSON.stringify(b));
need('B  …and it actually loads in the rendered estimate', b.loaded && b.w>=100, JSON.stringify(b));

/* C */
need('C  the Good / Better / Best proposal carries it too', /class="est-ocpc" src="\/oc-preferred-contractor\.png"/.test(docs.gbb||''), String(docs.gbb||'').slice(0,80));

/* D */
need('D  the in-editor roofing template uses the real lockup, the pink pill is gone', /<img class="est-oc-img" src="\/oc-preferred-contractor\.png"/.test(APP) && !/<div class="est-oc">⭐ Owens Corning® Preferred Contractor<\/div>/.test(APP));

await browser.close();
console.log((fails.length?'GATE 1277 RED':'GATE 1277 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
