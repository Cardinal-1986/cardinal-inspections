/* gate_1254.mjs — a person's day route (2C, free version).
   Real Chromium against the seeded mock, with three extra Scottie jobs (one
   timed today, one untimed today, one on the next working day) and one past
   due, and the 'geo:' cache pre-filled so the order and the minutes are real.
     A  the Punch List has a Routes row: Curtis and Scottie (open work), not Theo
     B  tapping Scottie opens #cr-route on today: 2 stops, timed first, a
        "≈ N min" leg, "≈M min driving" in the summary, and the Google Maps
        link starts at the shop and carries both addresses in order
     C  the day strip is six working days, no Sunday; the next day shows his
        next-day job
     D  "1 past due, not on this route" is listed; as Scottie there is NO
        Add button (moving a day is dispatch — the 1252 bosses)
     E  as CURTIS on Scottie's route, "Add to Today" writes scheduled_at=today,
        scheduled_time=null, and the job joins the route
     F  tapping a stop opens THE card above the route; hideAllViews() closes
        the route; the back button closes it too
     G  every stop, day and back control is 44px+; the header, stops and alert
        read at 4.5:1+ in both themes
     H  with Leaflet available the map draws the shop pin, numbered pins and
        the past-due "!" pin, and the "could not load" note stays hidden (LEAFLET_JS=path/to/leaflet.js; SKIPPED, and said
        so, when the file is not there)
   usage: node gate_1254.mjs [file.html] — RED on 1253, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
const LJS=process.env.LEAFLET_JS||'';
const LEAF=(LJS && existsSync(LJS)) ? readFileSync(LJS,'utf8') : null;
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const CONTRAST=`(function(el){
  function rgb(s){ var m=String(s).match(/[\\d.]+/g)||[]; return m.map(Number); }
  function L(c){ var a=c.slice(0,3).map(function(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  var fg=rgb(getComputedStyle(el).color), n=el, bg=null, stack=[];
  while(n && n.nodeType===1){ var b=rgb(getComputedStyle(n).backgroundColor); if(b.length>=3 && !(b.length>=4 && b[3]===0)){ stack.push(b); if(b.length<4||b[3]>0.9) break; } n=n.parentElement; }
  var base=[255,255,255]; for(var i=stack.length-1;i>=0;i--){ var s=stack[i], a=s.length>=4?s[3]:1; base=[0,1,2].map(function(k){ return s[k]*a+base[k]*(1-a); }); }
  var x=L(fg), y=L(base); return Math.round(((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05))*100)/100;
})`;
async function boot(as, theme){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(LEAF && /leaflet@[\d.]+\/dist\/leaflet\.js/.test(u)) return r.fulfill({status:200,contentType:'application/javascript',body:LEAF});
    return r.fulfill({status:200,body:''});});
  if(theme==='light') await page.addInitScript(()=>{ window.__sentinelTheme='rb-light'; try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){} });
  await page.addInitScript(SETUP);
  await page.addInitScript(()=>{
    const S=(window.__SEED__||{}).punch_items; if(!S) return;
    const key=d=>d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
    const t=new Date(), n=new Date(); n.setDate(n.getDate()+1); if(n.getDay()===0) n.setDate(n.getDate()+1);
    const p=new Date(); p.setDate(p.getDate()-3);
    window.__K={ today:key(t), next:key(n), past:key(p) };
    const base={ status:'open', assigned_to:'scottie@cardinalrenovations.net', created_by:'theo@cardinalrenovations.net', created_at:'2026-09-01T12:00:00Z', photos:[], comments:[], steps:[], template:null, visits:[], detail:null, priority:'normal' };
    S.push(Object.assign({}, base, { id:'r1', project_id:'p2', title:'Reseal pipe boot', kind:'ticket', scheduled_at:key(t), scheduled_time:'13:00:00' }));
    S.push(Object.assign({}, base, { id:'r2', project_id:'p1', title:'Ridge cap lifted', kind:'punch', scheduled_at:key(t), scheduled_time:null }));
    S.push(Object.assign({}, base, { id:'r3', project_id:'p2', title:'Gutter guard', kind:'punch', scheduled_at:key(n), scheduled_time:null }));
    S.push(Object.assign({}, base, { id:'r4', project_id:'p1', title:'Flashing at chimney', kind:'callback', scheduled_at:key(p), scheduled_time:null }));
    try{
      localStorage.setItem('geo:5735 Webster Street, Dayton, OH 45414', JSON.stringify({lat:39.8160,lon:-84.1700}));
      localStorage.setItem('geo:7990 Germantown Pike', JSON.stringify({lat:39.6900,lon:-84.2700}));
      localStorage.setItem('geo:145 Rosemont Blvd', JSON.stringify({lat:39.7900,lon:-84.1700}));
    }catch(e){}
  });
  await page.goto('https://sentinel.test/?as='+as,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(async ()=>{
    ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    window.__TELL=[]; window.crTell=function(m){ window.__TELL.push(String(m)); };
    if(window.CardinalPunch&&window.CardinalPunch.reload) await window.CardinalPunch.reload();
    if(window.openPunchView) window.openPunchView();
  });
  await page.waitForTimeout(800);
  return page;
}
const SC='scottie@cardinalrenovations.net';
const tap=(p,sel)=>p.evaluate(s=>{ const b=document.querySelector(s); if(!b) return false; b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return true; },sel);
const state=p=>p.evaluate(()=>{ const r=document.getElementById('cr-route'); if(!r) return null;
  return { open:r.classList.contains('open'), h1:(r.querySelector('h1')||{}).textContent||'', sum:(document.getElementById('rtSum')||{}).textContent||'',
    stops:[...r.querySelectorAll('[data-rt="stop"]')].map(b=>b.getAttribute('data-v')),
    legs:[...r.querySelectorAll('.rtleg')].map(l=>l.textContent.trim()),
    go:(document.getElementById('rtGo')||{}).href||'',
    days:[...r.querySelectorAll('[data-rt="day"]')].map(b=>b.getAttribute('data-v')),
    late:(document.getElementById('rtLate')||{}).textContent||'',
    add:[...r.querySelectorAll('[data-rt="add"]')].map(b=>b.getAttribute('data-v')) }; });

/* A–D, F, G as Scottie */
for(const theme of ['dark','light']){
  const s=await boot('scottie', theme);
  if(theme==='dark'){
    const chips=await s.evaluate(()=>[...document.querySelectorAll('#puRoutes [data-puroute]')].map(b=>b.getAttribute('data-puroute')));
    need('A  Routes row: Curtis and Scottie, not Theo', chips.includes('curtis@cardinalrenovations.net') && chips.includes(SC) && !chips.includes('theo@cardinalrenovations.net'), JSON.stringify(chips));
  }
  await tap(s,'#puRoutes [data-puroute="'+SC+'"]'); await s.waitForTimeout(700);
  let st=await state(s); const K=await s.evaluate(()=>window.__K);
  if(theme==='dark'){
    need('B  the route opens on Scottie, today', !!st && st.open && /Scottie/.test(st.h1) && /Today/.test(st.h1), st&&st.h1);
    need('B  two stops, the timed one first', !!st && st.stops.join(',')==='r1,r2', st&&st.stops.join(','));
    need('B  each leg reads "≈ N min · M mi"', !!st && st.legs.length===2 && st.legs.every(l=>/^≈ \d+ min · [\d.]+ mi$/.test(l)), st&&JSON.stringify(st.legs));
    need('B  the summary says ≈ minutes driving', !!st && /2 stops · ≈\d+ min driving/.test(st.sum), st&&st.sum);
    need('B  Google Maps: shop, then both addresses in order', !!st && /maps\/dir\/5735%20Webster%20Street[^/]*\/145%20Rosemont%20Blvd\/7990%20Germantown%20Pike$/.test(st.go), st&&st.go);
    need('C  six working days, today first, no Sunday', !!st && st.days.length===6 && st.days[0]===K.today && st.days.every(k=>{ const p=k.split('-'); return new Date(+p[0],+p[1]-1,+p[2]).getDay()!==0; }), st&&st.days.join(','));
    need('D  the past-due job is listed, not on the route', !!st && /1 past due, not on this route/.test(st.late) && /Flashing at chimney/.test(st.late) && !st.stops.includes('r4'), st&&st.late.slice(0,80));
    need('D  Scottie gets no Add button', !!st && st.add.length===0, st&&st.add.join(','));
    await tap(s,'#cr-route [data-rt="day"][data-v="'+K.next+'"]'); await s.waitForTimeout(400);
    const nx=await state(s);
    need('C  the next day shows his next-day job', !!nx && nx.stops.join(',')==='r3', nx&&nx.stops.join(','));
    await tap(s,'#cr-route [data-rt="day"][data-v="'+K.today+'"]'); await s.waitForTimeout(300);
    /* H */
    if(LEAF){
      await s.waitForTimeout(800);
      const pins=await s.evaluate(()=>[...document.querySelectorAll('#rtMap .rtpin')].map(e=>e.textContent));
      need('H  the map has the shop, numbered and past-due pins', pins.includes('C') && pins.includes('1') && pins.includes('2') && pins.includes('!'), pins.join(','));
      need('H  and the dashed route line', await s.evaluate(()=>!!document.querySelector('#rtMap path.leaflet-interactive')));
      need('H  and the "could not load" note stays hidden', await s.evaluate(()=>{ const n=document.getElementById('rtNoMap'); return !!n && getComputedStyle(n).display==='none'; }));
    } else {
      console.log('  SKIP  H  map pins — set LEAFLET_JS to a local leaflet.js to run them');
      need('H  with no Leaflet, the "could not load" note shows', await s.evaluate(()=>{ const n=document.getElementById('rtNoMap'); return !!n && getComputedStyle(n).display!=='none'; }));
    }
    /* F */
    await tap(s,'#cr-route [data-rt="stop"][data-v="r1"]'); await s.waitForTimeout(700);
    const f=await s.evaluate(()=>{ const pk=document.getElementById('cr-pk'), r=document.getElementById('cr-route');
      return { pk:!!pk&&pk.classList.contains('open'), rt:!!r&&r.classList.contains('open'), z:pk&&r?(+getComputedStyle(pk).zIndex > +getComputedStyle(r).zIndex):false }; });
    need('F  a stop opens THE card above the route', f.pk && f.rt && f.z, JSON.stringify(f));
    await s.evaluate(()=>window.CardinalPunchCard&&window.CardinalPunchCard.close(false));
    await s.evaluate(()=>{ try{ window.hideAllViews(); }catch(e){} }); await s.waitForTimeout(200);
    need('F  hideAllViews() closes the route', !((await state(s))||{open:true}).open);
    await tap(s,'#puRoutes [data-puroute="'+SC+'"]'); await s.waitForTimeout(500);
    await tap(s,'#cr-route [data-rt="back"]'); await s.waitForTimeout(400);
    need('F  the back button closes it', !((await state(s))||{open:true}).open);
    await tap(s,'#puRoutes [data-puroute="'+SC+'"]'); await s.waitForTimeout(500);
  }
  const g=await s.evaluate((C)=>{ const ratio=eval(C); const r=document.getElementById('cr-route'); if(!r) return null;
    const ctl=[...r.querySelectorAll('[data-rt]')].map(b=>({ k:b.getAttribute('data-rt'), h:Math.round(b.getBoundingClientRect().height) }));
    const ink=[...r.querySelectorAll('h1,.rtsum,.rtst b,.rtst span,.rtleg,.rtalert h2,.rtlate .tx,.rtlate small,.rtday,.rtday small,.rtt,.rtnote')].filter(e=>e.getClientRects().length).map(e=>({ c:e.className||e.tagName, t:e.textContent.slice(0,20), r:ratio(e) }));
    return { ctl, ink }; }, CONTRAST);
  const small=g?g.ctl.filter(c=>c.h<44):[{k:'none'}];
  need('G  ['+theme+'] every route control is 44px+', !!g && g.ctl.length>=8 && small.length===0, JSON.stringify(small));
  const low=g?g.ink.filter(x=>x.r<4.5):[{c:'none'}];
  need('G  ['+theme+'] the route reads at 4.5:1+', !!g && g.ink.length>=10 && low.length===0, JSON.stringify(low).slice(0,300));
  await s.close();
}

/* E as Curtis */
const k=await boot('curtis','dark');
await k.evaluate(sc=>window.CardinalRoute&&window.CardinalRoute.open(sc), SC); await k.waitForTimeout(600);
let ks=await state(k);
need('E  Curtis gets "Add to Today" on the past-due job', !!ks && ks.add.join(',')==='r4', ks&&ks.add.join(','));
await k.evaluate(()=>{ window.__WRITES__=[]; });
await tap(k,'#cr-route [data-rt="add"][data-v="r4"]'); await k.waitForTimeout(700);
const w=await k.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='punch_items'&&x.op==='update').map(x=>x.payload));
const K2=await k.evaluate(()=>window.__K);
need('E  it writes scheduled_at = today, scheduled_time = null', w.length===1 && w[0].scheduled_at===K2.today && w[0].scheduled_time===null && Object.keys(w[0]).length===2, JSON.stringify(w));
ks=await state(k);
need('E  and the job joins the route', !!ks && ks.stops.includes('r4') && ks.late==='', ks&&JSON.stringify({s:ks.stops,l:ks.late.slice(0,40)}));
await k.close();

await browser.close();
console.log((fails.length?'GATE 1254 RED':'GATE 1254 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
