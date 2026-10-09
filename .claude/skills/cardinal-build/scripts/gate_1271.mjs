/* gate_1271.mjs — Upload an estimate (Theo, 9 Oct).
   Real Chromium, signed in as a salesman (nick), on Mark Diamond (p1).
     A  Estimates has "Upload estimate"; it opens the 1262 sheet worded for an estimate
     B  it refuses with no amount, and with no file — and writes nothing
     C  Siding, $12,300, one photo: ONE document "Estimate — Siding — Mark Diamond",
        the photo inside as JPEG, then total 12300 and no signed_at
     D  jobFinance prices the job from it (source estimate); listed under Estimates only
     E  the contract upload is still the contract upload afterwards
   usage: node gate_1271.mjs [file.html] — RED on 1270, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();

/* a real 120x160 PNG, so the image path is actually decoded and redrawn */
function png(w,h){ const crc=(b)=>{let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}let x=0xffffffff;for(const v of b)x=t[(x^v)&255]^(x>>>8);return (x^0xffffffff)>>>0;};
  const chunk=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(ty),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
  const raw=Buffer.alloc((w*3+1)*h); for(let y=0;y<h;y++){ raw[y*(w*3+1)]=0; for(let x=0;x<w;x++){ const o=y*(w*3+1)+1+x*3; raw[o]=200; raw[o+1]=(x*2)&255; raw[o+2]=(y*2)&255; } }
  const ih=Buffer.alloc(13); ih.writeUInt32BE(w,0); ih.writeUInt32BE(h,4); ih[8]=8; ih[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]); }

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);
await page.evaluate(()=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e) e.style.display='none';}); location.hash='#p/p1'; });
await page.waitForTimeout(1800);
await page.evaluate(()=>{ try{ showTab('estimates'); }catch(_){} });
await page.waitForTimeout(400);
const before=await page.evaluate(()=>{ try{ const f=jobFinance(currentProject); return {v:f.value,s:f.source}; }catch(e){ return {err:String(e)}; } });

/* A */
const a=await page.evaluate(()=>{ try{ showTab('estimates'); }catch(_){} const b=document.getElementById('pUploadEstimateBtn'); if(!b) return null;
  const r=b.getBoundingClientRect(); b.click(); const s=document.getElementById('ctUpSheet');
  return { open:!!(s&&s.classList.contains('open')), head:s?(s.querySelector('.q > b')||{}).textContent:'', go:(document.getElementById('ctUpGo')||{}).textContent, shown:r.height>0 }; });
need('A  Estimates has "Upload estimate", shown, and it opens the sheet as an ESTIMATE', !!a && a.shown && a.open && a.head==='Upload estimate' && a.go==='Save estimate', JSON.stringify(a));

/* B */
const mark=()=>page.evaluate(()=>{ window.__WRITES__=[]; });
const docWrites=()=>page.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='inspection_reports'&&x.op!=='select'&&x.payload).map(x=>({op:x.op,row:Array.isArray(x.payload)?x.payload[0]:x.payload})));
const status=()=>page.evaluate(()=>(document.getElementById('ctUpSt')||{}).textContent||'');
const go=async()=>{ await page.evaluate(()=>{ const g=document.getElementById('ctUpGo'); if(g) g.click(); }); await page.waitForTimeout(900); };
await mark();
await page.evaluate(()=>{ const t=document.getElementById('ctUpTrade'); if(t) t.value='Siding'; });
await go();
need('B  no amount: it says "estimate amount" and writes nothing', /estimate amount/i.test(await status()) && (await docWrites()).length===0, await status());
await page.evaluate(()=>{ const m=document.getElementById('ctUpAmt'); if(m) m.value='$12,300'; const d=document.getElementById('ctUpDate'); if(d) d.value='2026-10-02'; });
await go();
need('B  no file: it says so and writes nothing', /photo or PDF of the estimate/i.test(await status()) && (await docWrites()).length===0, await status());

/* C */
const fi=await page.$('#ctUpFile');
if(fi) await fi.setInputFiles({ name:'roofr-siding.png', mimeType:'image/png', buffer:png(120,160) });
await go(); await page.waitForTimeout(800);
const w=await docWrites();
const ins=w.filter(x=>x.op==='insert').map(x=>x.row), upd=w.filter(x=>x.op==='update').map(x=>x.row);
need('C  ONE document titled "Estimate — Siding — Mark Diamond"', ins.length===1 && ins[0].title==='Estimate — Siding — Mark Diamond', JSON.stringify(ins.map(r=>r.title)));
need('C  …with the photo inside it as a JPEG', ins.length===1 && /<img alt="Estimate, page 1" src="data:image\/jpeg;base64,/.test(ins[0].html||''), ins[0]?String(ins[0].html||'').slice(0,80):'none');
const u=upd.find(r=>'total' in r)||{};
need('C  …then total 12300 and NO signed_at (an estimate is not a signature)', Number(u.total)===12300 && !('signed_at' in u), JSON.stringify(u));

/* D */
const after=await page.evaluate(()=>{ try{ const f=jobFinance(currentProject); return {v:f.value,s:f.source}; }catch(e){ return {err:String(e)}; } });
need('D  the job is priced from it: 12300, source estimate (was '+JSON.stringify(before)+')', after.v===12300 && after.s==='estimate', JSON.stringify(after));
const listed=await page.evaluate(()=>{ const m=document.getElementById('estDocsMount'); const c=document.getElementById('contractDocsMount'); return { e:m?m.textContent.replace(/\s+/g,' '):'', c:c?c.textContent:'' }; });
need('D  it is listed under Estimates, not Contracts', /Estimate — Siding/.test(listed.e) && !/Estimate — Siding/.test(listed.c), listed.e.slice(0,200));

/* E — the contract sheet still is the contract sheet after an estimate */
const e=await page.evaluate(()=>{ try{ showTab('contracts'); }catch(_){} const b=document.getElementById('pUploadContractBtn'); if(b) b.click();
  const s=document.getElementById('ctUpSheet'); return { head:s?(s.querySelector('.q > b')||{}).textContent:'', go:(document.getElementById('ctUpGo')||{}).textContent }; });
need('E  Upload signed contract afterwards is still the contract sheet', e.head==='Upload signed contract' && e.go==='Save signed contract', JSON.stringify(e));

await browser.close();
console.log((fails.length?'GATE 1271 RED':'GATE 1271 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
