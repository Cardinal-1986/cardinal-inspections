/* gate_958.mjs — move a magnet on the Crew Dispatch board (build 958).

   Seeded mock (Betos/Roofing w1 +1d, w2 +5d; Pineda/Siding w3 next Sunday)
   plus two rows this gate adds for itself: a SECOND roofing crew (c6, so the
   cross-crew branch has somewhere legal to land) and a COMPLETED Betos work
   order (w9, so "a finished job keeps no grip" can be asserted rather than
   assumed) with a job of its own (w8) so the board does not collapse it into
   the idle row.

     1  rescheduleWorkOrder is a real global
     2  every unfinished magnet carries a .mv[data-dmove] grip, drawn SVG
     3  the finished magnet carries NONE
     4  nothing is held at rest: no .armmv, no .dcell.tgt
     5  the grip picks the job up — root .armmv, magnet .moving, hint changes
     6  legal targets: Betos' other days YES, its own current day NO
     7  the OTHER roofing crew's days YES
     8  the SIDING crew's days NO  ← the trade fence, the assertion that matters
     9  a second tap on the grip puts it down
    10  same crew, new day → ONE crew_work_orders UPDATE naming that row
    11  ...carrying the refusal guards (neq superseded, is completed_on null)
    12  ...and ZERO inserts — no new WO number, no second document
    13  ...the magnet is now rendered in the new day (read-after-write)
    14  ...the board stayed open and put the job down
    15  a REFUSED write puts the magnet back where it was
    16  ...and says so out loud (showError called)
    17  different crew → the build-555 picker, crew + day preset
    18  ...and the board itself wrote nothing on that path
    19  a tap on an illegal cell just puts the job down — no write
    20  close() empties the hand
    21  arming a tray chip drops a held magnet — one thing in the hand, both ways

   Usage: node gate_958.mjs [path] — point at the previous build as the
   negative control. It must go RED with named failures and MUST NOT crash:
   every lookup is guarded (BUG_CLASSES 37). */
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

function key(off){ const d=new Date(); const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  x.setDate(x.getDate()+off);
  return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }

/* c6 gives the cross-crew branch a legal landing spot; w9 gives assertion 3 a
   finished job. Both are pushed into the SHARED seed from this gate only, so
   gate_948/949's own numbers are untouched. */
const EXTRA = `(function(){ try{
  var S = window.__SEED__; if(!S) return;
  S.crews.push({ id:'c6', name:'Second Roofing Crew', legal_name:null, trade:'Roofing', archived:false, contact_name:'Test Foreman' });
  S.crew_work_orders.push({ id:'w9', crew_id:'c1', project_id:'p1', report_id:null, status:'completed',
    scheduled_on:'${key(3)}', sent_at:'2026-08-19T12:00:00Z', completed_on:'${key(3)}' });
  /* c6 needs work of its own or the board collapses it into the idle row and
     the cross-crew branch has no lane to land on. */
  S.crew_work_orders.push({ id:'w8', crew_id:'c6', project_id:'p1', report_id:null, status:'draft',
    scheduled_on:'${key(4)}', sent_at:null, completed_on:null });
}catch(e){} })();`;

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

async function boot(w,h){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(u.indexOf('api.open-meteo.com')>=0) return r.abort();
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.addInitScript(EXTRA);
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    if(window.CardinalDispatch&&window.CardinalDispatch.open) window.CardinalDispatch.open();});
  await page.waitForTimeout(1400);
  /* every write the board makes from here is ours to read */
  await page.evaluate(()=>{ window.__WRITES__.length = 0;
    window.__ERRS__ = []; const se = window.showError;
    window.showError = function(m){ window.__ERRS__.push(String(m)); if(typeof se==='function') try{ se.apply(this,arguments); }catch(_){} }; });
  return page;
}

/* helpers that never throw on a tree missing the thing they look for */
const H = {
  laneOf: `(nm)=>{ const el=document.getElementById('cr-disp'); if(!el) return null;
      for(const ln of el.querySelectorAll('.dlane')){ const cn=ln.querySelector('.cn');
        if(cn && cn.textContent.toLowerCase().includes(nm)) return ln; } return null; }`,
};

async function tapGrip(page, woId){
  return page.evaluate((id)=>{ const b=document.querySelector('#cr-disp .job .mv[data-dmove="'+id+'"]');
    if(!b) return false; b.click(); return true; }, woId);
}
async function tapCell(page, laneName, ymd){
  return page.evaluate(([nm,day])=>{
    const el=document.getElementById('cr-disp'); if(!el) return false;
    let lane=null;
    for(const ln of el.querySelectorAll('.dlane')){ const cn=ln.querySelector('.cn');
      if(cn && cn.textContent.toLowerCase().includes(nm)){ lane=ln; break; } }
    if(!lane) return false;
    const heads=[...el.querySelectorAll('.dcol .c')].slice(1);
    let idx=-1;
    heads.forEach((h,i)=>{ const b=h.querySelector('b'); if(b && String(day).slice(8).replace(/^0/,'')===b.textContent.trim()) idx=i; });
    if(idx<0) return false;
    const cells=lane.querySelectorAll('.dcell[data-dc]');
    if(!cells[idx]) return false;
    cells[idx].click(); return true;
  }, [laneName, ymd]);
}

/* ── A: at rest ───────────────────────────────────────────────────────────── */
{
  const page=await boot(1440,900);
  const f=await page.evaluate(()=>{
    const el=document.getElementById('cr-disp');
    if(!el||!el.classList.contains('open')) return null;
    const magnets=[...el.querySelectorAll('.dlane .job')];
    const grips=[...el.querySelectorAll('.dlane .job .mv[data-dmove]')];
    const done=magnets.filter(m=>m.querySelector('.pip.done'));
    return {
      hasFn: typeof window.rescheduleWorkOrder==='function',
      magnets: magnets.length,
      grips: grips.length,
      doneCount: done.length,
      doneHasGrip: done.some(m=>!!m.querySelector('.mv')),
      gripSvg: grips.length? !!grips[0].querySelector('svg') : false,
      gripText: grips.length? grips[0].textContent.trim() : '(none)',
      armmv: el.classList.contains('armmv'),
      tgts: el.querySelectorAll('.dcell.tgt').length
    };
  });
  need('1 rescheduleWorkOrder is a global', !!(f&&f.hasFn), f?('typeof = '+(f.hasFn?'function':'missing')):'board never opened');
  need('2 every unfinished magnet has a drawn grip',
       !!(f && f.magnets>0 && f.grips === f.magnets - f.doneCount && f.gripSvg && f.gripText===''),
       f?(f.grips+' grips / '+f.magnets+' magnets ('+f.doneCount+' done), svg='+f.gripSvg+' text="'+f.gripText+'"'):'no board');
  need('3 a finished magnet has no grip', !!(f && f.doneCount>0 && !f.doneHasGrip),
       f?(f.doneCount+' finished, grip present = '+f.doneHasGrip):'no board');
  need('4 nothing held at rest', !!(f && !f.armmv && f.tgts===0),
       f?('armmv='+f.armmv+' tgt cells='+f.tgts):'no board');
  await page.context().close();
}

/* ── B: pick up, and the trade fence ─────────────────────────────────────── */
{
  const page=await boot(1440,900);
  const picked=await tapGrip(page,'w1');
  await page.waitForTimeout(350);
  const f=await page.evaluate(([d1])=>{
    const el=document.getElementById('cr-disp'); if(!el) return null;
    function lane(nm){ for(const ln of el.querySelectorAll('.dlane')){ const cn=ln.querySelector('.cn');
      if(cn && cn.textContent.toLowerCase().includes(nm)) return ln; } return null; }
    function cellStates(nm){ const ln=lane(nm); if(!ln) return null;
      return [...ln.querySelectorAll('.dcell[data-dc]')].map(c=>c.classList.contains('tgt')); }
    const heads=[...el.querySelectorAll('.dcol .c')].slice(1);
    let ownIdx=-1;
    heads.forEach((h,i)=>{ const b=h.querySelector('b'); if(b && String(d1).slice(8).replace(/^0/,'')===b.textContent.trim()) ownIdx=i; });
    const betos=cellStates('betos');
    return {
      armmv: el.classList.contains('armmv'),
      moving: !!el.querySelector('.dlane .job.moving'),
      hint: (el.querySelector('.drail .s')||{textContent:''}).textContent.trim(),
      ownIdx,
      betos,
      betosOwn: (betos && ownIdx>=0) ? betos[ownIdx] : null,
      betosOthers: betos ? betos.filter((v,i)=>i!==ownIdx) : null,
      second: cellStates('second roofing'),
      pineda: cellStates('pineda')
    };
  }, [key(1)]);
  need('5 the grip picks the job up',
       !!(picked && f && f.armmv && f.moving && /holding a job/i.test(f.hint)),
       f?('picked='+picked+' armmv='+f.armmv+' moving='+f.moving+' hint="'+f.hint.slice(0,60)+'"'):'no board');
  need('6 its own day is not a target, its other days are',
       !!(f && f.ownIdx>=0 && f.betosOwn===false && f.betosOthers && f.betosOthers.every(v=>v===true)),
       f?('ownIdx='+f.ownIdx+' own='+f.betosOwn+' others='+JSON.stringify(f.betosOthers)):'no board');
  need('7 the other roofing crew can take it',
       !!(f && f.second && f.second.length===7 && f.second.every(v=>v===true)),
       f?('second-crew cells='+JSON.stringify(f.second)):'no board');
  need('8 the siding crew CANNOT — the trade fence',
       !!(f && f.pineda && f.pineda.length===7 && f.pineda.every(v=>v===false)),
       f?('pineda cells='+JSON.stringify(f.pineda)):'no board');

  await tapGrip(page,'w1');
  await page.waitForTimeout(300);
  const g=await page.evaluate(()=>{ const el=document.getElementById('cr-disp');
    return el?{armmv:el.classList.contains('armmv'), tgts:el.querySelectorAll('.dcell.tgt').length}:null; });
  need('9 a second tap puts it down', !!(g && !g.armmv && g.tgts===0),
       g?('armmv='+g.armmv+' tgt='+g.tgts):'no board');
  await page.context().close();
}

/* ── C: same crew → a real reschedule ────────────────────────────────────── */
{
  const page=await boot(1440,900);
  await tapGrip(page,'w1');
  await page.waitForTimeout(300);
  const tapped=await tapCell(page,'betos',key(2));
  await page.waitForTimeout(900);
  const f=await page.evaluate(([want])=>{
    const w=(window.__WRITES__||[]).filter(x=>x.table==='crew_work_orders');
    const ups=w.filter(x=>x.op==='update'), ins=w.filter(x=>x.op==='insert'||x.op==='upsert');
    const u=ups[0]||null;
    const fl=(u&&u.filters)||[];
    const el=document.getElementById('cr-disp');
    let renderedDay=null;
    if(el){
      const heads=[...el.querySelectorAll('.dcol .c')].slice(1);
      for(const ln of el.querySelectorAll('.dlane')){ const cn=ln.querySelector('.cn');
        if(!cn||!cn.textContent.toLowerCase().includes('betos')) continue;
        const cells=[...ln.querySelectorAll('.dcell[data-dc]')];
        cells.forEach((c,i)=>{ if(c.querySelector('.job .mv[data-dmove="w1"]')){
          const b=heads[i]?heads[i].querySelector('b'):null; renderedDay=b?b.textContent.trim():'?'; } });
      }
    }
    return { nUp:ups.length, nIns:ins.length, payload:u?u.payload:null,
      hasId: fl.some(x=>x.type==='eq'&&x.col==='id'&&String(x.val)==='w1'),
      hasNeq: fl.some(x=>x.type==='neq'&&x.col==='status'&&x.val==='superseded'),
      hasIs: fl.some(x=>x.type==='is'&&x.col==='completed_on'&&x.val===null),
      renderedDay, want: String(want).slice(8).replace(/^0/,''),
      open: !!(el&&el.classList.contains('open')), armmv: !!(el&&el.classList.contains('armmv')) };
  }, [key(2)]);
  need('10 one UPDATE naming that work order',
       !!(tapped && f && f.nUp===1 && f.hasId && f.payload && f.payload.scheduled_on===key(2)),
       f?('tapped='+tapped+' updates='+f.nUp+' id-filter='+f.hasId+' payload='+JSON.stringify(f.payload)):'no board');
  need('11 the refusal guards travel with it', !!(f && f.hasNeq && f.hasIs),
       f?('neq superseded='+f.hasNeq+' is completed_on null='+f.hasIs):'no board');
  need('12 and ZERO inserts — no new WO number', !!(f && f.nIns===0),
       f?(f.nIns+' insert(s) fired'):'no board');
  need('13 the magnet is rendered in the new day', !!(f && f.renderedDay===f.want),
       f?('rendered on day '+f.renderedDay+', wanted '+f.want):'no board');
  need('14 the board stayed open and empty-handed', !!(f && f.open && !f.armmv),
       f?('open='+f.open+' armmv='+f.armmv):'no board');
  await page.context().close();
}

/* ── D: a refused write puts it back ─────────────────────────────────────── */
{
  const page=await boot(1440,900);
  const stubbed=await page.evaluate(()=>{ if(typeof window.rescheduleWorkOrder!=='function') return false;
    window.rescheduleWorkOrder=function(){ return Promise.resolve({ok:false,msg:'refused by test'}); }; return true; });
  await tapGrip(page,'w1');
  await page.waitForTimeout(300);
  await tapCell(page,'betos',key(2));
  await page.waitForTimeout(900);
  const f=await page.evaluate(([home])=>{
    const el=document.getElementById('cr-disp');
    let day=null;
    if(el){ const heads=[...el.querySelectorAll('.dcol .c')].slice(1);
      for(const ln of el.querySelectorAll('.dlane')){ const cn=ln.querySelector('.cn');
        if(!cn||!cn.textContent.toLowerCase().includes('betos')) continue;
        [...ln.querySelectorAll('.dcell[data-dc]')].forEach((c,i)=>{
          if(c.querySelector('.job .mv[data-dmove="w1"]')){ const b=heads[i]?heads[i].querySelector('b'):null; day=b?b.textContent.trim():'?'; } }); } }
    return { day, want:String(home).slice(8).replace(/^0/,''), errs:(window.__ERRS__||[]).length,
      msg:(window.__ERRS__||[])[0]||'' };
  }, [key(1)]);
  need('15 a refused move puts the magnet back', !!(stubbed && f && f.day===f.want),
       f?('stub='+stubbed+' magnet on day '+f.day+', started on '+f.want):'no board');
  need('16 and says so out loud', !!(f && f.errs>0 && /could not move/i.test(f.msg)),
       f?(f.errs+' error(s): "'+String(f.msg).slice(0,60)+'"'):'no board');
  await page.context().close();
}

/* ── E: different crew → the picker, board writes nothing ────────────────── */
{
  const page=await boot(1440,900);
  await tapGrip(page,'w1');
  await page.waitForTimeout(300);
  const tapped=await tapCell(page,'second roofing',key(2));
  await page.waitForTimeout(1200);
  const f=await page.evaluate(([want])=>{
    const crew=document.getElementById('woCrew'), when=document.getElementById('woWhen');
    const w=(window.__WRITES__||[]).filter(x=>x.table==='crew_work_orders');
    const el=document.getElementById('cr-disp');
    return { crew:crew?crew.value:'(no picker)', when:when?when.value:'(no picker)',
      want, writes:w.length, open:!!(el&&el.classList.contains('open')) };
  }, [key(2)]);
  need('17 a different crew opens the picker, crew + day preset',
       !!(tapped && f && f.crew==='c6' && f.when===key(2)),
       f?('tapped='+tapped+' #woCrew="'+f.crew+'" #woWhen="'+f.when+'" wanted c6 / '+key(2)):'no board');
  need('18 and the board itself wrote nothing', !!(f && f.writes===0 && !f.open),
       f?(f.writes+' write(s), board still open = '+f.open):'no board');
  await page.context().close();
}

/* ── F: an illegal cell just puts it down; close() empties the hand ──────── */
{
  const page=await boot(1440,900);
  await tapGrip(page,'w1');
  await page.waitForTimeout(300);
  await tapCell(page,'pineda',key(2));
  await page.waitForTimeout(600);
  const f=await page.evaluate(()=>{ const el=document.getElementById('cr-disp');
    return { armmv:!!(el&&el.classList.contains('armmv')), open:!!(el&&el.classList.contains('open')),
      writes:(window.__WRITES__||[]).filter(x=>x.table==='crew_work_orders').length }; });
  need('19 an illegal cell just puts the job down',
       !!(f && !f.armmv && f.open && f.writes===0),
       f?('armmv='+f.armmv+' open='+f.open+' writes='+f.writes):'no board');

  await tapGrip(page,'w1');
  await page.waitForTimeout(250);
  await page.evaluate(()=>{ if(window.CardinalDispatch&&window.CardinalDispatch.close) window.CardinalDispatch.close(); });
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ if(window.CardinalDispatch&&window.CardinalDispatch.open) window.CardinalDispatch.open(); });
  await page.waitForTimeout(900);
  const g=await page.evaluate(()=>{ const el=document.getElementById('cr-disp');
    return { armmv:!!(el&&el.classList.contains('armmv')), moving:!!(el&&el.querySelector('.job.moving')) }; });
  need('20 close() empties the hand', !!(g && !g.armmv && !g.moving),
       g?('armmv='+g.armmv+' moving='+g.moving):'no board');

  /* one thing in the hand at a time, in BOTH directions: arming a tray chip
     must drop a held magnet, or .arm and .armmv outline cells that mean
     different things at the same time. */
  await tapGrip(page,'w1');
  await page.waitForTimeout(250);
  const held=await page.evaluate(()=>!!(document.getElementById('cr-disp')||{classList:{contains:()=>false}}).classList.contains('armmv'));
  await page.evaluate(()=>{ const c=document.querySelector('#cr-disp .uch[data-pid]'); if(c) c.click(); });
  await page.waitForTimeout(350);
  const h=await page.evaluate(()=>{ const el=document.getElementById('cr-disp');
    return el?{arm:el.classList.contains('arm'), armmv:el.classList.contains('armmv'),
      moving:!!el.querySelector('.job.moving')}:null; });
  need('21 arming a tray chip drops the held magnet',
       !!(held && h && h.arm && !h.armmv && !h.moving),
       h?('held-first='+held+' arm='+h.arm+' armmv='+h.armmv+' moving='+h.moving):'no board');
  await page.context().close();
}

await browser.close();
console.log('\ngate_958 ['+LABEL+'] '+FILE);
console.log('  passed: '+passes+'   failed: '+fails.length);
fails.forEach(f=>console.log('  FAIL  '+f));
console.log(fails.length? '\nRED' : '\nGREEN — 21/21');
process.exit(fails.length?1:0);
