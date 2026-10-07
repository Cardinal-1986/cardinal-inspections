/* gate_1250.mjs — Flag for follow-up. Real Chromium, seeded mock.
     A  as NICK (sales): an open card offers "Flag for follow-up"
     B  flagging with no note refuses (and writes nothing)
     C  flagging with a note: ONE write carrying ping_note / ping_by (Nick) /
        ping_at, clearing any old answer, and the note appended to the card's
        message thread; Curtis, Theo and the assignee are buzzed — never Nick
     D  the card then shows Needs follow-up with the note and a Handled button
     E  the Punch List puts the item FIRST, under Needs follow-up, with a red !
        and the note as its line; a flagged CLOSED item (i2) is there too
     F  as THEO: Handled with no note refuses; with a note it writes
        ping_done_note / ping_done_by / ping_done_at and appends "Handled: …"
     G  after Handled the item leaves Needs follow-up
   usage: node gate_1250.mjs [file.html] — RED on 1249, never a crash
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
async function boot(as, seedPing){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.addInitScript((seedPing)=>{
    const S=(window.__SEED__||{}).punch_items; if(!S||!seedPing) return;
    const at=new Date(Date.now()-36e5).toISOString();
    S.forEach(r=>{ if(r.id==='i4'){ Object.assign(r,{ ping_note:'Client wants to cancel - call her', ping_by:'nick@cardinalrenovations.net', ping_at:at }); }
                   if(r.id==='i2'){ Object.assign(r,{ ping_note:'Leak came back after close', ping_by:'nick@cardinalrenovations.net', ping_at:at }); } });
  }, seedPing);
  if(SHOTS) await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {} }) }); } catch (e) {} });
  await page.goto('https://sentinel.test/?as='+as,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(async ()=>{
    ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    window.__NTF=[]; window.__TELL=[];
    window.notifyTeam=async function(to,s,b){ window.__NTF.push({to:to,s:s,b:b}); return {ok:true,sent:1,subs:1}; };
    window.crTell=function(m){ window.__TELL.push(String(m)); };
    if(window.CardinalPunch&&window.CardinalPunch.reload) await window.CardinalPunch.reload();
  });
  return page;
}
const snap=async (page,path)=>{ const c=await page.context().newCDPSession(page); const r=await c.send('Page.captureScreenshot',{format:'png'}); (await import('fs')).writeFileSync(path,Buffer.from(r.data,'base64')); };
const openCard=async (p,id)=>{ await p.evaluate(id=>window.CardinalPunchCard&&window.CardinalPunchCard.open(id),id); await p.waitForTimeout(600); };
const click=async (p,sel,why)=>{ const ok=await p.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return false; e.click(); return true; },sel); if(!ok) need('control exists: '+why,false,sel); await p.waitForTimeout(400); return ok; };
const writes=p=>p.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='punch_items'&&x.op!=='select'&&x.payload).map(x=>x.payload));
const groups=p=>p.evaluate(()=>{ const out=[]; let cur=null;
  for(const el of document.querySelectorAll('#puList > *')){
    if(el.classList.contains('pl-grp')){ cur={g:el.textContent.split('·')[0].trim(), rows:[]}; out.push(cur); }
    else if(el.classList.contains('pl-row')&&cur) cur.rows.push({id:el.getAttribute('data-pu'), bang:!!el.querySelector('.pl-bang'), pb:(el.querySelector('.pl-pb')||{}).textContent||''});
  } return out; });

/* ── Nick raises it ── */
const p=await boot('nick', false);
await openCard(p,'i4');
need('A  Nick sees Flag for follow-up', await p.evaluate(()=>/Flag for follow-up/.test((document.querySelector('#cr-pk [data-act="ping"]')||{}).textContent||'')));
await click(p,'#cr-pk [data-act="ping"]','Flag for follow-up');
await p.evaluate(()=>{ window.__WRITES__=[]; });
await click(p,'#cr-pk [data-act="pinggo"]','Flag it (empty)');
need('B  an empty flag refuses and writes nothing', (await writes(p)).length===0 && (await p.evaluate(()=>window.__TELL.length))>0);
if(SHOTS) await snap(p,SHOTS+'/compose.png');
await p.evaluate(()=>{ const t=document.querySelector('#cr-pk [data-f="pingnote"]'); if(t) t.value='Client called upset, wants to cancel. Call her today.'; });
await click(p,'#cr-pk [data-act="pinggo"]','Flag it');
await p.waitForTimeout(500);
const w=await writes(p), pl=w[0]||{};
need('C  one write', w.length===1, w.length);
need('C  it carries the note, Nick, and the time', /wants to cancel/.test(pl.ping_note||'') && pl.ping_by==='nick@cardinalrenovations.net' && !!pl.ping_at, JSON.stringify(pl).slice(0,160));
need('C  it clears any old answer', pl.ping_done_at===null && pl.ping_done_by===null && pl.ping_done_note===null);
need('C  the note lands in the message thread', Array.isArray(pl.comments) && /Follow up: Client called/.test((pl.comments.slice(-1)[0]||{}).text||''));
const n=await p.evaluate(()=>window.__NTF);
const to=(n[0]||{}).to||[];
need('C  Curtis, Theo and the assignee (Scottie) are buzzed', n.length===1 && ['curtis@cardinalrenovations.net','theo@cardinalrenovations.net','scottie@cardinalrenovations.net'].every(e=>to.includes(e)), JSON.stringify(to));
need('C  Nick is never buzzed for his own flag', !to.includes('nick@cardinalrenovations.net'));
const card=await p.evaluate(()=>({ t:(document.querySelector('#cr-pk .pkping')||{}).textContent||'', h:!!document.querySelector('#cr-pk [data-act="pingdone"]') }));
need('D  the card shows Needs follow-up, the note and Handled', /Needs follow-up/.test(card.t) && /wants to cancel/.test(card.t) && card.h, card.t.slice(0,100));
if(SHOTS) await snap(p,SHOTS+'/card-flagged.png');
await p.close();

/* ── Theo sees it and handles it ── */
const q=await boot('theo', true);
await q.evaluate(()=>window.openPunchView&&window.openPunchView());
await q.waitForTimeout(900);
const g=await groups(q);
need('E  Needs follow-up is the FIRST group', g[0]&&g[0].g==='Needs follow-up', g.map(x=>x.g).join(','));
const ids=(g[0]&&g[0].rows||[]).map(r=>r.id).sort().join(',');
need('E  it holds i4 and the closed i2', ids==='i2,i4', ids);
const r4=(g[0]&&g[0].rows||[]).find(r=>r.id==='i4')||{};
need('E  the row carries a red ! and the note', r4.bang && /wants to cancel/.test(r4.pb) && /Nick/.test(r4.pb), JSON.stringify(r4));
need('E  i4 is not listed twice', g.reduce((a,x)=>a+x.rows.filter(r=>r.id==='i4').length,0)===1);
if(SHOTS) await snap(q,SHOTS+'/list.png');
await openCard(q,'i4');
await q.evaluate(()=>{ window.__WRITES__=[]; window.__TELL=[]; });
await click(q,'#cr-pk [data-act="pingdone"]','Handled (empty)');
need('F  Handled with no note refuses', (await writes(q)).length===0 && (await q.evaluate(()=>window.__TELL.length))>0);
await q.evaluate(()=>{ const t=document.querySelector('#cr-pk [data-f="pingdone"]'); if(t) t.value='Called her back - kept the job, crew Thursday.'; });
await click(q,'#cr-pk [data-act="pingdone"]','Handled');
await q.waitForTimeout(400);
const w2=await writes(q), h=w2[0]||{};
need('F  Handled writes the answer, Theo, and the time', /kept the job/.test(h.ping_done_note||'') && h.ping_done_by==='theo@cardinalrenovations.net' && !!h.ping_done_at, JSON.stringify(h).slice(0,160));
need('F  Handled lands in the thread', Array.isArray(h.comments) && /Handled: Called her back/.test((h.comments.slice(-1)[0]||{}).text||''));
await q.evaluate(()=>window.CardinalPunchCard.close&&window.CardinalPunchCard.close(false));
await q.evaluate(()=>window.openPunchView&&window.openPunchView());
await q.waitForTimeout(700);
const g2=await groups(q);
const still=(g2.find(x=>x.g==='Needs follow-up')||{rows:[]}).rows.some(r=>r.id==='i4');
need('G  after Handled, i4 leaves Needs follow-up', !still, g2.map(x=>x.g+':'+x.rows.map(r=>r.id)).join(' | '));
await q.close();
await browser.close();
console.log((fails.length?'GATE 1250 RED':'GATE 1250 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
