/* gate_1249.mjs — On hold (3C). Real Chromium against the seeded mock, plus
   two seeded rows: i6 held until a FUTURE day, i7 held until YESTERDAY.
     A  an open card offers "Put on hold"; a closed card (i2) does not
     B  the sheet: five reasons, six working days from tomorrow with no Sunday,
        each day showing a load ("free" / "N stop(s)"), Hold disabled until a
        reason AND a day are picked
     C  holding writes hold_reason, hold_until, hold_note, hold_by, hold_at and
        moves scheduled_at to the look-again day (time cleared) — ONE write,
        through the punch pipeline, status untouched
     D  the card then says On hold with the reason and the day, and offers
        Take off hold, which writes all five hold fields back to null
     E  the Punch List puts i6 under On hold and i7 back in its group with the
        Back from hold flag
     F  the sheet's controls are 44px or more at 390
   usage: node gate_1249.mjs [file.html]  — RED on 1248, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const SHOTS=process.env.SHOTS||'';
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
async function boot(theme){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});});
  if(theme==='light') await page.addInitScript(()=>{ window.__sentinelTheme='rb-light'; });
  await page.addInitScript(SETUP);
  await page.addInitScript(()=>{
    const S=(window.__SEED__||{}).punch_items; if(!S) return;
    const key=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); };
    const base={ project_id:'p1', detail:null, kind:'ticket', priority:'normal', status:'open', assigned_to:'scottie@cardinalrenovations.net',
      created_by:'curtis@cardinalrenovations.net', created_at:new Date(Date.now()-5*864e5).toISOString(), scheduled_time:null,
      photos:[], comments:[], steps:[], template:null, visits:[] };
    S.push(Object.assign({}, base, { id:'i6', title:'Pipe boot reseal', scheduled_at:key(5), hold_reason:'materials', hold_until:key(5), hold_note:'Boot on order', hold_by:'curtis@cardinalrenovations.net', hold_at:new Date().toISOString() }));
    S.push(Object.assign({}, base, { id:'i7', title:'Flashing at the chimney', scheduled_at:key(-1), hold_reason:'weather', hold_until:key(-1), hold_by:'curtis@cardinalrenovations.net', hold_at:new Date(Date.now()-3*864e5).toISOString() }));
  });
  if(SHOTS) await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {} }) }); } catch (e) {} });
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(async ()=>{
    ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    if(window.CardinalPunch&&window.CardinalPunch.reload) await window.CardinalPunch.reload();
  });
  return page;
}
const snap=async (page,path)=>{ const c=await page.context().newCDPSession(page); const r=await c.send('Page.captureScreenshot',{format:'png'}); (await import('fs')).writeFileSync(path,Buffer.from(r.data,'base64')); };
const openCard=async (p,id)=>{ await p.evaluate(id=>window.CardinalPunchCard&&window.CardinalPunchCard.open(id),id); await p.waitForTimeout(600); };
const click=async (p,sel,why)=>{ const ok=await p.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return false; e.click(); return true; },sel); if(!ok) need('control exists: '+why,false,sel); await p.waitForTimeout(350); return ok; };

const p=await boot('dark');
await openCard(p,'i2');
need('A  a closed card offers no hold', !(await p.evaluate(()=>!!document.querySelector('#cr-pk [data-act="hold"]'))));
await p.evaluate(()=>window.CardinalPunchCard.close&&window.CardinalPunchCard.close(false));
await openCard(p,'i4');
need('A  an open card offers Put on hold', await p.evaluate(()=>/Put on hold/.test((document.querySelector('#cr-pk [data-act="hold"]')||{}).textContent||'')));
await click(p,'#cr-pk [data-act="hold"]','Put on hold');
const sh=await p.evaluate(()=>{
  const days=[...document.querySelectorAll('#cr-pk .pkhs-d')].map(b=>({k:b.getAttribute('data-hd'), t:b.textContent, h:b.getBoundingClientRect().height, w:b.getBoundingClientRect().width}));
  const tiles=[...document.querySelectorAll('#cr-pk .pkhs-t')].map(b=>({k:b.getAttribute('data-hr'), h:b.getBoundingClientRect().height}));
  const go=document.querySelector('#cr-pk [data-act="holdgo"]');
  return { open:!!document.querySelector('#cr-pk .pkhs'), days, tiles, goDis: go?go.disabled:null };
});
const tom=(()=>{ const d=new Date(); d.setDate(d.getDate()+1); return d; })();
const sunday=sh.days.some(d=>{ const p=d.k.split('-'); return new Date(+p[0],+p[1]-1,+p[2]).getDay()===0; });
need('B  the sheet opens', sh.open);
need('B  five reasons', sh.tiles.map(t=>t.k).join(',')==='materials,homeowner,weather,adjuster,other', sh.tiles.map(t=>t.k).join(','));
need('B  six working days, none a Sunday, from tomorrow on', sh.days.length===6 && !sunday && sh.days[0].k > new Date(Date.now()-864e5).toISOString().slice(0,8)+'00', sh.days.map(d=>d.k).join(','));
need('B  every day shows its load', sh.days.every(d=>/free|\d+ stops?/.test(d.t)), sh.days.map(d=>d.t).join(' | '));
need('B  Hold is disabled before a pick', sh.goDis===true, String(sh.goDis));
need('F  reasons and days are 44px or more', sh.tiles.every(t=>t.h>=44) && sh.days.every(d=>d.h>=44&&d.w>=44), sh.days.map(d=>Math.round(d.w)+'x'+Math.round(d.h)).join(','));
if(SHOTS) await snap(p,SHOTS+'/sheet-empty.png');

await click(p,'#cr-pk [data-hr="materials"]','reason');
await p.evaluate(()=>{ const t=document.querySelector('#cr-pk [data-f="holdnote"]'); if(t) t.value='Boot ordered from ABC'; });
const day=sh.days[3]&&sh.days[3].k;
await click(p,'#cr-pk [data-hd="'+day+'"]','day');
need('B  the note survives a re-render', await p.evaluate(()=>(document.querySelector('#cr-pk [data-f="holdnote"]')||{}).value==='Boot ordered from ABC'));
const goTxt=await p.evaluate(()=>{ const g=document.querySelector('#cr-pk [data-act="holdgo"]'); return g?{d:g.disabled,t:g.textContent}:null; });
need('B  Hold names the day once both are picked', goTxt && !goTxt.d && /Hold until/.test(goTxt.t), JSON.stringify(goTxt));
if(SHOTS) await snap(p,SHOTS+'/sheet-picked.png');
await p.evaluate(()=>{ window.__WRITES__=[]; });
await click(p,'#cr-pk [data-act="holdgo"]','Hold');
await p.waitForTimeout(500);
const w=await p.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='punch_items'&&x.op!=='select'&&x.payload).map(x=>x.payload));
const pl=w[0]||{};
need('C  one write', w.length===1, w.length);
need('C  it carries the reason, the day, the note, who and when', pl.hold_reason==='materials' && pl.hold_until===day && pl.hold_note==='Boot ordered from ABC' && /@/.test(pl.hold_by||'') && !!pl.hold_at, JSON.stringify(pl).slice(0,200));
need('C  scheduled_at moves to the look-again day, time cleared', pl.scheduled_at===day && pl.scheduled_time===null, JSON.stringify(pl).slice(0,200));
need('C  status is untouched', !('status' in pl));
const card=await p.evaluate(()=>({ txt:(document.querySelector('#cr-pk .pkhold')||{}).textContent||'', sheet:!!document.querySelector('#cr-pk .pkhs') }));
need('D  the card says On hold, the reason and the day', /On hold/.test(card.txt)&&/Materials/.test(card.txt)&&/Look at it again/.test(card.txt), card.txt.slice(0,120));
need('D  the sheet closed', !card.sheet);
if(SHOTS) await snap(p,SHOTS+'/card-held.png');
await p.evaluate(()=>{ window.__WRITES__=[]; });
await click(p,'#cr-pk [data-act="unhold"]','Take off hold');
await p.waitForTimeout(500);
const w2=await p.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='punch_items'&&x.op!=='select'&&x.payload).map(x=>x.payload));
const u=w2[0]||{};
need('D  Take off hold clears all five fields', ['hold_reason','hold_until','hold_note','hold_by','hold_at'].every(k=>k in u && u[k]===null), JSON.stringify(u));
await p.evaluate(()=>window.CardinalPunchCard.close&&window.CardinalPunchCard.close(false));

await p.evaluate(()=>window.openPunchView&&window.openPunchView());
await p.waitForTimeout(900);
const list=await p.evaluate(()=>{
  const out={}; let cur=null;
  for(const el of document.querySelectorAll('#puList > *')){
    if(el.classList.contains('pl-grp')){ cur=el.textContent.split('·')[0].trim(); out[cur]=[]; }
    else if(el.classList.contains('pl-row')&&cur) out[cur].push({id:el.getAttribute('data-pu'), t:el.textContent});
  }
  return out;
});
const find=id=>{ for(const g in list){ const r=list[g].find(x=>x.id===id); if(r) return {g, t:r.t}; } return null; };
const i6=find('i6'), i7=find('i7');
need('E  i6 sits under On hold, naming the reason', i6&&i6.g==='On hold'&&/materials/.test(i6.t), JSON.stringify(i6));
need('E  i7 is back in its group with the Back from hold flag', i7&&i7.g!=='On hold'&&/Back from hold/.test(i7.t), JSON.stringify(i7));
if(SHOTS) await snap(p,SHOTS+'/list.png');
await p.close();

if(SHOTS){ const q=await boot('light'); await openCard(q,'i6'); await snap(q,SHOTS+'/card-held-light.png'); await click(q,'#cr-pk [data-act="hold"]','Change'); await snap(q,SHOTS+'/sheet-light.png'); await q.close(); }
await browser.close();
console.log((fails.length?'GATE 1249 RED':'GATE 1249 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
