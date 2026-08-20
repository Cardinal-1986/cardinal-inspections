/* gate_949.mjs — the Magnet Board workflow layer (build 949).
   Against the seeded mock (5 crews, WOs at +1d/+5d/next-Sunday, Kathy May
   Scheduled with no WO) plus a routed Open-Meteo fixture (today clear 5%,
   tomorrow rain 80%):
     1. WEATHER — today's header carries a dry .wx (no %, dim ink); tomorrow's
        carries .wx.wet with "80%" painted in the computed --disp-wx blue
     2. WEATHER FAILURE — with the forecast route aborted, zero .wx spans and
        all seven headers still render (the board never blocks on weather)
     3. FREE-DAY TAG — every trade-lane dog tag carries .cf reading
        "free …" or "booked all 7"; Betos (booked +1d/+5d) reads "free today"
     4. ARM-AND-PLACE — tap Kathy May's tray chip: root gains .arm, the chip
        gains .armed, the hint changes; tap an empty Pineda day cell: the board
        closes and the build-555 picker opens with #woCrew=c2 (Pineda — not
        the select's default, so the control cannot pass it) and #woWhen set
        to that cell's date
     5. SECOND TAP — tapping the armed chip again opens the CLASSIC picker
        (no date preset), exactly the pre-949 flow
     6. BACK DISARMS — arm, Back, reopen: no .arm class survives
     7. NOT ARMED — tapping a job magnet still opens the client (board closes)
   Usage: node gate_949.mjs [path] — previous build = negative control (must
   FAIL 1/3/4 named, not crash: every interaction is guarded, BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||'SHIPPED';
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

/* Open-Meteo fixture: dates computed so the rolling window always holds them */
function key(off){ const d=new Date(); const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()+off);
  return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }
const WXFIX=(()=>{ const time=[],code=[],pp=[];
  for(let i=0;i<14;i++){ time.push(key(i)); code.push(i===1?80:0); pp.push(i===1?80:5); }
  return JSON.stringify({ daily:{ time, weather_code:code, precipitation_probability_max:pp } }); })();

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
async function boot(w,h,wxMode){          /* wxMode: 'fixture' | 'abort' */
  const page=await browser.newPage({viewport:{width:w,height:h}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(u.indexOf('api.open-meteo.com')>=0){
      if(wxMode==='abort') return r.abort();
      return r.fulfill({status:200,contentType:'application/json',body:WXFIX});
    }
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    if(window.CardinalDispatch&&window.CardinalDispatch.open) window.CardinalDispatch.open();});
  await page.waitForTimeout(1400);
  return page;
}

/* ── 1+3: weather fixture + free-day tags (phone) ── */
{
  const page=await boot(390,844,'fixture');
  const f=await page.evaluate(()=>{
    const el=document.getElementById('cr-disp');
    if(!el||!el.classList.contains('open')) return null;
    const heads=[...el.querySelectorAll('.dcol .c')].slice(1);
    const wx0=heads[0]?heads[0].querySelector('.wx'):null;
    const wx1=heads[1]?heads[1].querySelector('.wx'):null;
    const cfs=[...el.querySelectorAll('.dlane .crewc .cf')].map(x=>x.textContent.trim());
    /* the Betos tag: find the lane whose .cn contains BETOS */
    const lanes=[...el.querySelectorAll('.dlane')];
    let betosCf=null;
    for(const ln of lanes){ const cn=ln.querySelector('.cn');
      if(cn&&/betos/i.test(cn.textContent)){ const c=ln.querySelector('.cf'); betosCf=c?c.textContent.trim():'(no .cf)'; break; } }
    return {
      nHeads:heads.length,
      wx0:!!wx0, wx0wet:wx0?wx0.classList.contains('wet'):false, wx0pct:wx0?!!wx0.querySelector('i'):false,
      wx1:!!wx1, wx1wet:wx1?wx1.classList.contains('wet'):false,
      wx1pct:wx1&&wx1.querySelector('i')?wx1.querySelector('i').textContent:'',
      wx1ink:wx1?getComputedStyle(wx1).color:'',
      nCf:cfs.length, cfShape:cfs.every(t=>/^free |^booked all 7$/i.test(t)), betosCf };
  });
  need('board open', !!f);
  if(f){
    need('7 headers', f.nHeads===7, String(f.nHeads));
    need('today header has a dry .wx (no %, not wet)', f.wx0 && !f.wx0wet && !f.wx0pct,
      JSON.stringify({wx0:f.wx0,wet:f.wx0wet,pct:f.wx0pct}));
    need('tomorrow header .wx.wet with 80%', f.wx1 && f.wx1wet && f.wx1pct==='80%',
      JSON.stringify({wx1:f.wx1,wet:f.wx1wet,pct:f.wx1pct}));
    need('wet ink is the computed --disp-wx blue', f.wx1ink==='rgb(109, 179, 242)', f.wx1ink);
    need('every rendered dog tag carries a .cf free-day line', f.nCf>0 && f.cfShape,
      'n='+f.nCf);
    need('Betos (booked +1d/+5d) reads "free today"', f.betosCf==='free today', String(f.betosCf));
  }
  await page.close();
}

/* ── 2: forecast route ABORTED — board intact, zero wx ── */
{
  const page=await boot(390,844,'abort');
  const f=await page.evaluate(()=>{
    const el=document.getElementById('cr-disp');
    if(!el||!el.classList.contains('open')) return null;
    return { nHeads:[...el.querySelectorAll('.dcol .c')].slice(1).length,
             nWx:el.querySelectorAll('.dcol .wx').length,
             lanes:el.querySelectorAll('.dlane').length };
  });
  need('board open with forecast down', !!f);
  if(f){
    need('all 7 headers render without weather', f.nHeads===7 && f.nWx===0,
      JSON.stringify(f));
    need('lanes still render', f.lanes>0, String(f.lanes));
  }
  await page.close();
}

/* ── 4/5/6/7: arm-and-place (iPad width so all cells are visible) ── */
{
  const page=await boot(1194,834,'fixture');
  /* 4a: arm */
  const armed=await page.evaluate(()=>{
    const el=document.getElementById('cr-disp'); if(!el) return null;
    const chip=[...el.querySelectorAll('.uch[data-pid]')].find(c=>/kathy/i.test(c.textContent));
    if(!chip) return {miss:'no Kathy May tray chip'};
    chip.click();
    const hint=el.querySelector('.drail .rl .s');
    return { arm:el.classList.contains('arm'),
             chipArmed:!!el.querySelector('.uch.armed'),
             hint:hint?hint.textContent:'' };
  });
  need('tray chip found and armed', armed && !armed.miss && armed.arm && armed.chipArmed,
    JSON.stringify(armed));
  need('hint switches to place-mode wording', armed && /tap a day/i.test(armed.hint||''),
    armed?String(armed.hint).slice(0,60):'-');
  /* 4b: place on an empty Betos cell */
  const placed=await page.evaluate(()=>{
    const el=document.getElementById('cr-disp'); if(!el) return null;
    const lanes=[...el.querySelectorAll('.dlane')];
    for(const ln of lanes){ const cn=ln.querySelector('.cn');
      if(cn&&/pineda/i.test(cn.textContent)){
        const cell=ln.querySelector('.dcell.demp[data-dc]');
        if(!cell) return {miss:'no empty data-dc cell on the Pineda lane'};
        const dc=cell.getAttribute('data-dc');
        cell.click();
        return { dc };
      } }
    return {miss:'no Pineda lane'};
  });
  need('empty Pineda cell existed and was tapped', placed && !placed.miss, placed&&placed.miss);
  await page.waitForTimeout(900);
  const picker=await page.evaluate(()=>{
    const el=document.getElementById('cr-disp');
    const m=document.getElementById('tskModal');
    const sel=document.getElementById('woCrew'), when=document.getElementById('woWhen');
    return { boardClosed: el?!el.classList.contains('open'):true,
             modal: m?getComputedStyle(m).display:'(none)',
             crew: sel?sel.value:'(no select)',
             when: when?when.value:'(no input)' };
  });
  const expWhen = placed&&placed.dc ? key(parseInt(placed.dc.split('|')[1],10)) : '(unknown)';
  need('board closed and picker opened', picker.boardClosed && picker.modal==='flex',
    JSON.stringify(picker));
  /* Pineda is c2 — NOT the select's default first option, so this check
     cannot pass by coincidence on a tree without the preset (the control). */
  need('picker preselected the crew (c2, not the default)', picker.crew==='c2', String(picker.crew));
  need('picker preselected the tapped day', picker.when===expWhen,
    picker.when+' vs '+expWhen);
  /* close the modal */
  await page.evaluate(()=>{ const b=document.getElementById('woCancel'); if(b) b.click(); });

  /* 5: second tap on the armed chip = classic picker, no date preset */
  await page.evaluate(()=>{ if(window.CardinalDispatch&&window.CardinalDispatch.open) window.CardinalDispatch.open(); });
  await page.waitForTimeout(900);
  const classic=await page.evaluate(async ()=>{
    const el=document.getElementById('cr-disp'); if(!el) return null;
    const chip=[...el.querySelectorAll('.uch[data-pid]')].find(c=>/kathy/i.test(c.textContent));
    if(!chip) return {miss:'no chip'};
    chip.click();                       /* arm */
    const rearmed=el.classList.contains('arm');
    const chip2=[...el.querySelectorAll('.uch[data-pid]')].find(c=>/kathy/i.test(c.textContent));
    if(!chip2) return {miss:'chip vanished after arm re-render'};
    chip2.click();                      /* second tap */
    await new Promise(r=>setTimeout(r,800));
    const m=document.getElementById('tskModal');
    const when=document.getElementById('woWhen');
    return { rearmed, modal:m?getComputedStyle(m).display:'(none)',
             when:when?when.value:'(no input)',
             boardClosed:!el.classList.contains('open') };
  });
  need('second tap opens the classic picker (no date preset)',
    classic && !classic.miss && classic.rearmed && classic.modal==='flex' && classic.when==='' && classic.boardClosed,
    JSON.stringify(classic));
  await page.evaluate(()=>{ const b=document.getElementById('woCancel'); if(b) b.click(); });

  /* 6: Back disarms */
  await page.evaluate(()=>{ if(window.CardinalDispatch&&window.CardinalDispatch.open) window.CardinalDispatch.open(); });
  await page.waitForTimeout(900);
  const back=await page.evaluate(async ()=>{
    const el=document.getElementById('cr-disp'); if(!el) return null;
    const chip=[...el.querySelectorAll('.uch[data-pid]')].find(c=>/kathy/i.test(c.textContent));
    if(chip) chip.click();
    const armedNow=el.classList.contains('arm');
    const bk=el.querySelector('.dspback'); if(bk) bk.click();
    await new Promise(r=>setTimeout(r,300));
    const closed=!el.classList.contains('open');
    if(window.CardinalDispatch&&window.CardinalDispatch.open) window.CardinalDispatch.open();
    await new Promise(r=>setTimeout(r,900));
    return { armedNow, closed, armAfter:el.classList.contains('arm') };
  });
  need('Back disarms (no .arm on reopen)', back && back.armedNow && back.closed && !back.armAfter,
    JSON.stringify(back));

  /* 7: not armed — a job magnet still opens the client */
  const magnet=await page.evaluate(async ()=>{
    const el=document.getElementById('cr-disp'); if(!el||!el.classList.contains('open')) return null;
    const j=el.querySelector('.dlane .job[data-pid]');
    if(!j) return {miss:'no magnet'};
    j.click();
    await new Promise(r=>setTimeout(r,400));
    return { boardClosed:!el.classList.contains('open') };
  });
  need('unarmed magnet tap opens the client (board closes)',
    magnet && !magnet.miss && magnet.boardClosed, JSON.stringify(magnet));
  await page.close();
}

await browser.close();
console.log('gate_949 ['+LABEL+']  PASS '+passes+'  FAIL '+fails.length);
fails.forEach(f=>console.log('  FAIL: '+f));
process.exit(fails.length?1:0);
