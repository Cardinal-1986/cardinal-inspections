/* gate_1262.mjs — Upload a signed contract (Jacob, via Theo).
   Real Chromium, signed in as a SALESMAN (nick — the rig has no jacob), on
   Mark Diamond (p1), which has no signed contract.
     A  the Contracts tab has "Upload signed contract"; it opens a sheet whose
        trades include Windows and Other / handwritten
     B  it refuses with no amount, and with no file — and writes nothing
     C  Windows, $8,450, signed 30 Sep, one photo: ONE contract document
        titled "Contract — Windows — Mark Diamond", the photo inside it as a
        JPEG, then signed_at = 2026-09-30 and total = 8450
     D  the job now prices from that contract: jobFinance value 8450, source
        'contract' — so Invoices & Payments can open (before: no contract)
     E  the contract list shows it as SIGNED
   usage: node gate_1262.mjs [file.html] — RED on 1261, never a crash
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
await page.evaluate(()=>{ try{ showTab('contracts'); }catch(_){} });
await page.waitForTimeout(400);
const before=await page.evaluate(()=>{ try{ const f=jobFinance(currentProject); return {v:f.value,s:f.source}; }catch(e){ return {err:String(e)}; } });

/* A */
const a=await page.evaluate(()=>{ const b=document.getElementById('pUploadContractBtn'); if(!b) return null;
  b.click(); const s=document.getElementById('ctUpSheet');
  return { open:!!(s&&s.classList.contains('open')), trades:s?[...s.querySelectorAll('#ctUpTrade option')].map(o=>o.textContent):[], h:b.getBoundingClientRect().height }; });
need('A  Contracts has "Upload signed contract" and it opens the sheet', !!a && a.open, JSON.stringify(a));
need('A  …offering Windows and Other / handwritten', !!a && a.trades.includes('Windows') && a.trades.includes('Other / handwritten'), JSON.stringify(a&&a.trades));

/* B */
const mark=()=>page.evaluate(()=>{ window.__WRITES__=[]; });
const docWrites=()=>page.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='inspection_reports'&&x.op!=='select'&&x.payload).map(x=>({op:x.op,row:Array.isArray(x.payload)?x.payload[0]:x.payload})));
const status=()=>page.evaluate(()=>(document.getElementById('ctUpSt')||{}).textContent||'');
const go=async()=>{ await page.evaluate(()=>{ const g=document.getElementById('ctUpGo'); if(g) g.click(); }); await page.waitForTimeout(900); };
await mark();
await page.evaluate(()=>{ const t=document.getElementById('ctUpTrade'); if(t) t.value='Windows'; });
await go();
need('B  no amount: it says so and writes nothing', /amount/i.test(await status()) && (await docWrites()).length===0, await status());
await page.evaluate(()=>{ const m=document.getElementById('ctUpAmt'); if(m) m.value='8,450'; const d=document.getElementById('ctUpDate'); if(d) d.value='2026-09-30'; });
await go();
need('B  no file: it says so and writes nothing', /photo or PDF/i.test(await status()) && (await docWrites()).length===0, await status());

/* C */
const fi=await page.$('#ctUpFile');
if(fi) await fi.setInputFiles({ name:'windows-agreement.png', mimeType:'image/png', buffer:png(120,160) });
await go(); await page.waitForTimeout(800);
const w=await docWrites();
const ins=w.filter(x=>x.op==='insert').map(x=>x.row), upd=w.filter(x=>x.op==='update').map(x=>x.row);
need('C  ONE contract document, titled "Contract — Windows — Mark Diamond"', ins.length===1 && ins[0].title==='Contract — Windows — Mark Diamond', JSON.stringify(ins.map(r=>r.title)));
need('C  …with the photo inside it as a JPEG', ins.length===1 && /<img alt="Signed contract, page 1" src="data:image\/jpeg;base64,/.test(ins[0].html||''), ins[0]?String(ins[0].html||'').slice(0,80):'none');
const u=upd.find(r=>'total' in r||'signed_at' in r)||{};
need('C  …then signed_at 2026-09-30 and total 8450', /^2026-09-30/.test(String(u.signed_at||'')) && Number(u.total)===8450, JSON.stringify(u));

/* D + E */
const after=await page.evaluate(()=>{ try{ const f=jobFinance(currentProject); return {v:f.value,s:f.source}; }catch(e){ return {err:String(e)}; } });
need('D  the job now prices from it: 8450, source contract (was '+JSON.stringify(before)+')', after.v===8450 && after.s==='contract', JSON.stringify(after));
const listed=await page.evaluate(()=>{ const m=document.getElementById('contractDocsMount'); return m?m.textContent.replace(/\s+/g,' '):''; });
need('E  the contract list shows it, SIGNED', /Windows/.test(listed) && /SIGNED/.test(listed), listed.slice(0,200));
need('E  …and the sheet closed', await page.evaluate(()=>!document.querySelector('#ctUpSheet.open')));

await browser.close();
console.log((fails.length?'GATE 1262 RED':'GATE 1262 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
