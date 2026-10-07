/* gate_1248.mjs — the Punch List, redesigned (1A).
   Real Chromium against the seeded mock: i1 repair (ticket), urgent, dated in
   the PAST · i3 unassigned (the queue) · i4 assigned, no day · i5 on site
   today · i2 closed by Curtis.
     A  the tabs are the four kinds plus All, in order, All on, with counts
        that match the seed (All 4 · Tarps 0 · Repairs 1 · Callbacks 0 · Punch-outs 3)
     B  the list is grouped by WHEN: i1 under Past due (says "days late"),
        i5 under Today (says "On site since"), i4 under No date
     C  every open item is in exactly ONE place — queue or a group, never both,
        never neither (945's rule, carried)
     D  Repairs narrows the list AND the queue to repairs
     E  Closed is one tap away and lists i2 with who closed it; back returns
     F  phone (390): no column header, rows are three short lines, nothing
        scrolls sideways, every kind tab is 44px or more
     G  desktop (1500, list ≥860px): the column header shows, each row is one line, the
        kind strip hides and the rail carries the kinds and Needs attention
     H  tapping a row opens THE card (CardinalPunchCard.open with its id)
     I  the sort sheet, reverse button and the list's tick are gone; the
        home strip still carries its tick (cardHtml kept)
   usage: node gate_1248.mjs [file.html]  — RED on 1247, never a crash (BUG_CLASSES 37)
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
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name+(detail!==undefined?' — '+detail:'')); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
async function boot(w,h,theme){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(/fonts\.(googleapis|gstatic)/.test(u)) return r.abort();
    return r.fulfill({status:200,body:''});});
  if(theme==='light') await page.addInitScript(()=>{ window.__sentinelTheme='rb-light'; });   /* the app themes itself at boot (sentinel_setup) */
  await page.addInitScript(SETUP);
  if(SHOTS) await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {} }) }); } catch (e) {} });
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate((theme)=>{
    ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    if(theme==='light') document.documentElement.setAttribute('data-theme','rb-light');
    window.__OPENED=[];
    window.CardinalPunchCard=Object.assign(window.CardinalPunchCard||{}, { open:function(id){ window.__OPENED.push(String(id)); } });
    if(typeof window.openPunchView==='function') window.openPunchView();
  }, theme);
  await page.waitForTimeout(900);
  return page;
}
const tap=async (page,sel,why)=>{ const el=await page.$(sel); if(!el){ need('control exists: '+why, false, sel); return false; } await el.click().catch(e=>need('tap '+why,false,e.message.slice(0,60))); await page.waitForTimeout(250); return true; };
/* screenshots go through CDP: Playwright's own waits on document.fonts, which
   never settles on this rig (every same-origin URL is answered with the page) */
const snap=async (page,path)=>{ const c=await page.context().newCDPSession(page); const r=await c.send('Page.captureScreenshot',{format:'png'}); (await import('fs')).writeFileSync(path,Buffer.from(r.data,'base64')); };
const ids=(page,sel)=>page.evaluate(sel=>[...document.querySelectorAll(sel)].map(e=>e.getAttribute('data-pu')),sel);

/* ── phone ── */
let p=await boot(390,844,'dark');
const tabs=await p.evaluate(()=>[...document.querySelectorAll('#puTabs [data-putype]')].map(b=>({k:b.getAttribute('data-putype'),on:b.classList.contains('on'),
  n:(b.querySelector('.n')||{}).textContent, h:Math.round(b.getBoundingClientRect().height), w:Math.round(b.getBoundingClientRect().width)})));
need('A  tabs are All + the four kinds, in order', tabs.map(t=>t.k).join(',')==='all,tarp,ticket,callback,punch', tabs.map(t=>t.k).join(','));
need('A  All is on', !!tabs[0]&&tabs[0].on);
need('A  counts match the seed (4 · 0 · 1 · 0 · 3)', tabs.map(t=>t.n).join(' ')==='4 0 1 0 3', tabs.map(t=>t.n).join(' '));
need('F  every kind tab is 44px or more', tabs.length===5&&tabs.every(t=>t.h>=44&&t.w>=44), tabs.map(t=>t.w+'x'+t.h).join(','));

const grp=await p.evaluate(()=>{
  const out={}; let cur=null;
  for(const el of document.querySelectorAll('#puList > *')){
    if(el.classList.contains('pl-grp')) { cur=el.textContent.split('·')[0].trim(); out[cur]=[]; }
    else if(el.classList.contains('pl-row')&&cur) out[cur].push({id:el.getAttribute('data-pu'), late:el.classList.contains('late'), when:(el.querySelector('.pl-wh')||{}).textContent||''});
  }
  return out;
});
const g=(n,id)=>(grp[n]||[]).find(r=>r.id===id);
need('B  i1 sits under Past due and says days late', !!g('Past due','i1')&&g('Past due','i1').late&&/days? late/.test(g('Past due','i1').when), JSON.stringify(grp['Past due']));
need('B  i5 sits under Today, on site', !!g('Today','i5')&&/On site since/.test(g('Today','i5').when), JSON.stringify(grp['Today']));
need('B  i4 sits under No date', !!g('No date','i4')&&/Not scheduled/.test(g('No date','i4').when), JSON.stringify(grp['No date']));

const q=await ids(p,'#puQueue .pu-card[data-pu]'), l=await ids(p,'#puList .pl-row[data-pu]');
const openIds=['i1','i3','i4','i5'];
const both=q.filter(x=>l.includes(x)), seen=[...q,...l].sort().join(',');
need('C  every open item is in exactly one place', both.length===0 && seen===openIds.join(','), 'queue='+q+' list='+l);

const phone=await p.evaluate(()=>{
  const pv=document.getElementById('punchView'), cols=document.querySelector('#puList .pl-cols');
  const row=document.querySelector('#puList .pl-row[data-pu="i1"]');
  return { over: Math.max(pv.scrollWidth-pv.clientWidth, document.documentElement.scrollWidth-document.documentElement.clientWidth),
           tabsFit: (()=>{const t=document.getElementById('puTabs'); return t.scrollWidth<=t.clientWidth;})(),
           cols: cols?getComputedStyle(cols).display:'missing',
           rowH: row?Math.round(row.getBoundingClientRect().height):0 };
});
need('F  phone: no column header', phone.cols==='none', phone.cols);
need('F  phone: a row is three short lines (60–110px)', phone.rowH>=60&&phone.rowH<=110, phone.rowH);
need('F  phone: nothing scrolls sideways', phone.over<=0 && phone.tabsFit, JSON.stringify(phone));
if(SHOTS) await snap(p,SHOTS+'/m-dark.png');

const gone=await p.evaluate(()=>({ sort:!!document.getElementById('puSortChip')||!!document.getElementById('puShSort'),
  dir:!!document.getElementById('puDirBtn'), tick:!!document.querySelector('#puList [data-putoggle]') }));
need('I  sort sheet and reverse button are gone', !gone.sort&&!gone.dir, JSON.stringify(gone));
need('I  the list carries no one-tap tick', !gone.tick);
const strip=await p.evaluate(()=>{ const S=window.CardinalPunchStrip; if(!S) return 'no strip'; const d=document.createElement('div'); d.innerHTML=S.html('retail'); return !!d.querySelector('[data-putoggle]'); });
need('I  the home strip keeps its tick (cardHtml kept)', strip===true, String(strip));

await tap(p,'#puList .pl-row[data-pu="i5"]','a list row');
need('H  tapping a row opens the card with its id', (await p.evaluate(()=>window.__OPENED.join(',')))==='i5', await p.evaluate(()=>window.__OPENED.join(',')));

await tap(p,'#puTabs [data-putype="ticket"]','Repairs tab');
const rq=await ids(p,'#puQueue .pu-card[data-pu]'), rl=await ids(p,'#puList .pl-row[data-pu]');
need('D  Repairs narrows the list to repairs', rl.join(',')==='i1', rl.join(','));
need('D  Repairs narrows the queue too (i3 is a punch-out)', rq.length===0, rq.join(','));
await tap(p,'#puTabs [data-putype="all"]','All tab');

await tap(p,'#puList [data-pufocus="closed"]','Closed');
const cl=await p.evaluate(()=>({ ids:[...document.querySelectorAll('#puList .pl-row')].map(e=>e.getAttribute('data-pu')), txt:document.getElementById('puList').textContent }));
need('E  Closed lists i2 and who closed it', cl.ids.join(',')==='i2' && /by Curtis/.test(cl.txt), JSON.stringify(cl).slice(0,140));
if(SHOTS) await snap(p,SHOTS+'/m-closed.png');
await tap(p,'#puList .pl-back','back to open work');
need('E  back returns to the open groups', (await ids(p,'#puList .pl-row[data-pu]')).length===3);
await p.close();

/* ── light phone, for the eye ── */
if(SHOTS){ const pl=await boot(390,844,'light'); await snap(pl,SHOTS+'/m-light.png'); await pl.close(); }

/* ── desktop ── */
for(const theme of ['dark','light']){
  const d=await boot(1500,900,theme);
  const desk=await d.evaluate(()=>{
    const cols=document.querySelector('#puList .pl-cols'), row=document.querySelector('#puList .pl-row[data-pu="i1"]');
    return { cols: cols?getComputedStyle(cols).display:'missing', rowH: row?Math.round(row.getBoundingClientRect().height):0,
      strip: getComputedStyle(document.getElementById('puTabs')).display,
      rail: [...document.querySelectorAll('#puRail [data-putype]')].map(b=>b.getAttribute('data-putype')).join(','),
      focus: [...document.querySelectorAll('#puRail [data-pufocus]')].map(b=>b.getAttribute('data-pufocus')).join(','),
      over: document.documentElement.scrollWidth-document.documentElement.clientWidth };
  });
  if(theme==='dark'){
    need('G  desktop: the column header shows', desk.cols==='grid', desk.cols);
    need('G  desktop: each row is one line (<= 70px)', desk.rowH>0&&desk.rowH<=70, desk.rowH);
    need('G  desktop: the kind strip hides', desk.strip==='none', desk.strip);
    need('G  desktop: the rail carries the kinds', desk.rail==='all,tarp,ticket,callback,punch', desk.rail);
    need('G  desktop: the rail carries Needs attention', desk.focus==='late,nodate,hold,closed', desk.focus);
    need('G  desktop: nothing scrolls sideways', desk.over<=0, desk.over);
    await tap(d,'#puRail [data-pufocus="late"]','rail Past due');
    need('G  rail Past due shows only the past-due group', (await ids(d,'#puList .pl-row[data-pu]')).join(',')==='i1');
  }
  if(SHOTS) { if(theme==='dark') await tap(d,'#puRail [data-pufocus="late"]','rail toggle back'); await snap(d,SHOTS+'/d-'+theme+'.png'); }
  await d.close();
}

await browser.close();
console.log((fails.length?'GATE 1248 RED':'GATE 1248 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
