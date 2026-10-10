/* gate_1278.mjs — an estimate looks the same on a phone as on paper (Theo, 10 Oct: "It shouldn't").
   Real Chromium. Phone = 390px, isMobile (so a viewport meta is honoured), DPR 3.
     A  the template (estimate + Good/Better/Best) asks for a Letter-width viewport (width=900)
     B  an OLD estimate (device-width viewport) served through the SHIPPED api/share.js is laid
        out at Letter width on the phone: the header is NOT stacked, the description column is
        the desktop column, and the page fits the screen (no sideways scroll)
     C  in the app's viewer on the phone the estimate frame is 880px wide inside, scaled to fit:
        the header is a row, as on paper, and the frame fills the screen width
     D  on a computer the viewer is untouched
     E  the viewer goes back to normal for a document that is not an estimate
     F  saving / emailing an old estimate writes the Letter viewport into it
   usage: node gate_1278.mjs [index.html] [api/share.js] — RED on 1277, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { tmpdir } from 'os';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const SHARE=process.argv[3]||join(HERE,'../../../../api/share.js');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const route=r=>{ const u=r.request().url(); if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP}); return r.fulfill({status:200,body:''}); };
async function boot(w, mobile){
  const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,serviceWorkers:'block'}:{viewport:{width:w,height:900},serviceWorkers:'block'});
  const page=await ctx.newPage(); page.on('dialog',d=>d.accept());
  await page.route('**/*', route); await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2600);
  return { ctx, page }; }

/* A + build the documents with the shipped builder */
const { ctx:c0, page:p0 } = await boot(1100, false);
const docs=await p0.evaluate(()=>{ const B=window.CardinalEstimatePublish; if(!B) return {};
  const est={ id:'e1', project_id:'p1', estimate_number:'EST-2026-0999', itemized:true, subtotal:12000, total:12000, deposit_pct:30, deposit_amount:3600, valid_through:'2026-11-08',
    line_items:[{ name:'Owens Corning Duration roof replacement', description:'Tear off to the deck. Install OC Duration shingles with ice & water shield and synthetic underlayment.', qty:28, unit:'SQ', unit_price:425 }], photos:[] };
  const pr={ name:'Dave McCoy', address:'5226 Kellenberger, Huber Heights, OH 45424', checklist: JSON.stringify({ lead:{ claim_type:'insurance' } }) };
  let one='', gbb=''; try{ one=B.buildDocHtml(est, pr, {}); }catch(e){ one='ERR'; } try{ gbb=B.buildGbbHtml([Object.assign({},est,{rank:'Good'})], pr, null); }catch(e){ gbb='ERR'; }
  return { one, gbb }; });
await c0.close();
need('A  the estimate and Good/Better/Best ask for a Letter-width viewport, with text autosizing off', /<meta name="viewport" content="width=900">/.test(docs.one||'') && /<meta name="viewport" content="width=900">/.test(docs.gbb||'') && /text-size-adjust:100%/.test(docs.one||'') && /text-size-adjust:100%/.test(docs.gbb||''), String((docs.one||'').match(/<meta name="viewport"[^>]*>/)));

/* B — an OLD estimate through share.js, on a phone */
const oldHtml=String(docs.one||'').replace(/<meta name="viewport" content="[^"]*">/, '<meta name="viewport" content="width=device-width, initial-scale=1">');
const dir=mkdtempSync(join(tmpdir(),'g1278-')); writeFileSync(join(dir,'share.mjs'), readFileSync(SHARE,'utf8'));
process.env.SUPABASE_SERVICE_ROLE_KEY='test-not-real';
globalThis.fetch=async (u)=>{ u=String(u); if(u.includes('/inspection_reports?share_token')) return { ok:true, json:async()=>[{ id:'d1', project_id:'p1', project:'Dave McCoy', html:oldHtml, title:'EST', total:null, signed_at:null }] }; return { ok:true, json:async()=>[], text:async()=>'' }; };
let served=''; try{ const mod=await import(pathToFileURL(join(dir,'share.mjs')).href);
  await new Promise(async res=>{ const r={ setHeader(){}, status(){ return this; }, send(b){ served=String(b); res(); }, json(j){ served=JSON.stringify(j); res(); } };
    await mod.default({ method:'GET', query:{ t:'0123456789abcdef0123456789abcdef' }, headers:{} }, r); }); }catch(e){ console.log('  (share threw '+e.message+')'); }
const mctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
const mp=await mctx.newPage(); await mp.route('**/*', r=>r.request().url().startsWith('https://share.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:served||'<p>none</p>'}):r.fulfill({status:200,body:''}));
await mp.goto('https://share.test/x',{waitUntil:'domcontentloaded'}); await mp.waitForTimeout(800);
const b=await mp.evaluate(()=>{ const h=document.querySelector('.est-head'), t=document.querySelector('table.items'), d=t&&t.querySelector('tbody tr td');
  return { layoutW:document.documentElement.clientWidth, headDir:h?getComputedStyle(h).flexDirection:'', desc:d?Math.round(d.getBoundingClientRect().width):0, thead:t?getComputedStyle(t.querySelector('thead')).display:'', sideways:document.documentElement.scrollWidth>document.documentElement.clientWidth+2 }; });
await mctx.close();
need('B  an old estimate on its link, on a phone: laid out at Letter width, header in a row (as on paper)', b.layoutW>=880 && b.headDir==='row' && b.thead!=='none', JSON.stringify(b));
need('B  …and it fits the screen with no sideways scroll', !b.sideways, JSON.stringify(b));

/* C, E, F — the app's viewer on a phone */
const { ctx:c1, page:p1 } = await boot(390, true);
await p1.evaluate(async()=>{ const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); try{ await s.run(); }catch(_){} });
await p1.waitForTimeout(1500);
await p1.evaluate(()=>{ const b=document.querySelector('#cr-est-view [data-act="bar-publish"]')||document.getElementById('cr-epub-btn'); if(b) b.click(); });
await p1.waitForTimeout(4500);
await p1.evaluate(()=>{ const g=document.querySelector('#crAsk.open .askno'); if(g) g.click(); });
const c=await p1.evaluate(()=>{ const f=document.getElementById('reportFrame'), w=document.getElementById('reportFrameWrap'); const d=f&&f.contentDocument; const h=d&&d.querySelector('.est-head');
  return { fit:f?f.getAttribute('data-est-fit'):null, innerW:d?d.documentElement.clientWidth:0, headDir:h?getComputedStyle(h).flexDirection:'', shown:Math.round(f?f.getBoundingClientRect().width:0), wrap:Math.round(w?w.clientWidth:0), est:!!(d&&d.querySelector('table.items')) }; });
need('C  on a phone the app shows the estimate as its Letter page: 880px inside, header in a row', c.est && !!c.fit && c.innerW>=860 && c.headDir==='row', JSON.stringify(c));
need('C  …scaled to fill the screen width exactly', c.wrap>0 && Math.abs(c.shown-c.wrap)<=2, JSON.stringify(c));
const f=await p1.evaluate(()=>{ try{ const d=document.getElementById('reportFrame').contentDocument; const m=d.querySelector('meta[name="viewport"]'); if(m) m.setAttribute('content','width=device-width, initial-scale=1');
  const out=(typeof serializeFrame==='function')?serializeFrame():''; return (out.match(/<meta name="viewport"[^>]*>/)||[''])[0]; }catch(e){ return 'ERR '+e.message; } });
need('F  saving or emailing an old estimate writes the Letter viewport into it', /content="width=900"/.test(f), f);
const e=await p1.evaluate(()=>{ try{ const d=document.getElementById('reportFrame').contentDocument; const t=d.querySelector('table.items'); if(t) t.remove();
  if(typeof fitEstimateFrame==='function') fitEstimateFrame(); }catch(_){} const fr=document.getElementById('reportFrame'); return { fit:fr.getAttribute('data-est-fit'), transform:fr.style.transform }; });
need('E  a document that is not an estimate gets the normal viewer back', !e.fit && !e.transform, JSON.stringify(e));
await c1.close();

/* D */
const { ctx:c2, page:p2 } = await boot(1280, false);
await p2.evaluate(async()=>{ const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); try{ await s.run(); }catch(_){} });
await p2.waitForTimeout(1500);
await p2.evaluate(()=>{ const b=document.getElementById('cr-epub-btn')||document.querySelector('#cr-est-view [data-act="bar-publish"]'); if(b) b.click(); });
await p2.waitForTimeout(4500);
const d=await p2.evaluate(()=>{ const f=document.getElementById('reportFrame'); return { fit:f.getAttribute('data-est-fit'), transform:f.style.transform, loaded:!!(f.contentDocument&&f.contentDocument.querySelector('table.items')) }; });
need('D  on a computer the viewer is untouched', d.loaded && !d.fit && !d.transform, JSON.stringify(d));
await c2.close();

await browser.close();
console.log((fails.length?'GATE 1278 RED':'GATE 1278 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
