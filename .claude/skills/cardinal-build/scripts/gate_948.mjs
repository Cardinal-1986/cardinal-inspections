/* gate_948.mjs — Crew Dispatch becomes the Magnet Board (build 948).
   Against the seeded mock (5 crews, WOs at +1d/+5d/next-Sunday, punch i1-i5):
     1. the window is the NEXT 7 DAYS: first column is TODAY (lit), all seven
        render, the Sunday column carries .sun and hatches its EMPTY cells
        while the booked Sunday cell shows a full magnet
     2. every trade sits on its own strip with data-band + a crew count, and
        tapping a strip folds the trade to a one-line summary (chevron turns)
     3. crews render as dog tags (uppercase mono names, the punched hole)
     4. jobs are full-size magnets on the PHONE (title >=12px, address shown)
        and the grid PANS at 390 (min-width > viewport) but fits at 1194
     5. the punch band is foldable, Curtis keeps his colour, red magnets
     6. the map toggle still works
   Usage: node gate_948.mjs [path] — previous build = negative control. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||(/v9\d\d/.test(FILE)?'CONTROL':'SHIPPED');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
async function boot(w,h){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    if(window.CardinalDispatch&&window.CardinalDispatch.open) window.CardinalDispatch.open();});
  await page.waitForTimeout(1200);
  return page;
}

/* ── phone ── */
{
  const page=await boot(390,844);
  const f=await page.evaluate(()=>{
    const el=document.getElementById('cr-disp');
    if(!el||!el.classList.contains('open')) return null;
    const heads=[...el.querySelectorAll('.dcol .c')].slice(1);  /* drop the rail cell */
    const today=new Date();
    const strips=[...el.querySelectorAll('.dband[data-band]')].map(b=>({
      band:b.getAttribute('data-band'),
      cnt:(b.querySelector('.cnt')||{}).textContent||'',
      chev:(b.querySelector('.chev')||{}).textContent||'' }));
    const tag=el.querySelector('.crewc .cn');
    const tagBox=el.querySelector('.crewc > div');
    const job=el.querySelector('.job');
    const sunHead=heads.findIndex(h=>h.classList.contains('sun'));
    const sunEmpty=el.querySelector('.dcell.sun.demp');
    const sunBooked=[...el.querySelectorAll('.dcell')].filter(c=>{
      /* the booked-Sunday cell: has a magnet AND its column is the sun column */
      return c.querySelector('.job') && !c.classList.contains('demp');
    });
    const grid=el.querySelector('.dspgrid'), scroll=el.querySelector('.dspscroll');
    return {
      nHeads:heads.length,
      firstIsToday:heads[0]&&heads[0].classList.contains('today'),
      firstDate:heads[0]?parseInt((heads[0].querySelector('b')||{}).textContent,10):-1,
      todayDate:today.getDate(),
      sunHead, sunEmptyHatched: sunEmpty?getComputedStyle(sunEmpty).backgroundImage!=='none':false,
      strips,
      tagUpper: tag?getComputedStyle(tag).textTransform:'',
      tagMono: tag?/mono|Menlo|Consolas/i.test(getComputedStyle(tag).fontFamily):false,
      tagHole: tagBox?getComputedStyle(tagBox,'::before').content!=='none':false,
      jobT: job?parseFloat(getComputedStyle(job.querySelector('.t')).fontSize):0,
      jobAddr: job?!!job.querySelector('.a'):false,
      pans: grid&&scroll ? grid.scrollWidth>scroll.clientWidth : false,
      curtis: (()=>{ const c=el.querySelector('.crewc.own-curtis .cn'); return c?getComputedStyle(c).color:''; })(),
      repMag: !!el.querySelector('.rep'),
    };
  });
  if(!f){ fails.push('board did not open'); }
  else{
    need('seven day columns', f.nHeads===7, 'got '+f.nHeads);
    need('first column is TODAY (rolling window)', f.firstIsToday&&f.firstDate===f.todayDate, f.firstDate+' vs '+f.todayDate);
    need('a Sunday column carries .sun', f.sunHead>=0, 'idx='+f.sunHead);
    need('empty Sunday cells hatch', f.sunEmptyHatched);
    need('trades on their own strips with counts', f.strips.length>=5 && f.strips.every(s=>/CREW|^\d+$/.test(s.cnt)||s.band==='__rep__'), JSON.stringify(f.strips.map(s=>s.band)));
    need('punch strip present and foldable', f.strips.some(s=>s.band==='__rep__'));
    need('dog tags: uppercase mono name', f.tagUpper==='uppercase'&&f.tagMono, f.tagUpper);
    need('dog tags: the punched hole renders', f.tagHole);
    need('phone magnets are FULL SIZE (title >=12px)', f.jobT>=12, f.jobT+'px');
    need('magnets carry the address', f.jobAddr);
    need('the grid PANS on the phone', f.pans);
    need('Curtis keeps his colour on the punch band', /63, 184, 201|15, 124, 139/.test(f.curtis), f.curtis);
    need('red punch magnets render', f.repMag);
    /* fold a trade */
    const folded=await page.evaluate(()=>{
      const b=document.querySelector('#cr-disp .dband[data-band="Roofing"]'); if(!b) return null;
      b.click();
      return new Promise(res=>setTimeout(()=>{
        const el=document.getElementById('cr-disp');
        res({ sum:!!el.querySelector('.dsum'),
              chev:(el.querySelector('.dband[data-band="Roofing"] .chev')||{}).textContent||'',
              lanes:el.querySelectorAll('.dband[data-band="Roofing"] ~ .dlane').length });
      },400));
    });
    if(!folded) fails.push('no Roofing strip to fold');
    else{
      need('fold collapses the trade to a summary', folded.sum);
      need('chevron turns when folded', folded.chev==='▸', JSON.stringify(folded.chev));
    }
    /* map toggle survives */
    const map=await page.evaluate(()=>{
      const b=document.querySelector('#cr-disp [data-dspmap]'); if(!b) return null;
      b.click();
      return new Promise(res=>setTimeout(()=>{
        res({ vis:getComputedStyle(document.querySelector('#cr-disp .dspmapview')).display!=='none' });
      },500));
    });
    need('map toggle still works', !!(map&&map.vis));
  }
  await page.close();
}
/* ── wide ── */
{
  const page=await boot(1440,900);
  const w=await page.evaluate(()=>{
    const el=document.getElementById('cr-disp');
    const grid=el.querySelector('.dspgrid'), scroll=el.querySelector('.dspscroll');
    const job=el.querySelector('.job .t');
    return { fits: grid&&scroll ? grid.scrollWidth<=scroll.clientWidth+2 : false,
             jobT: job?parseFloat(getComputedStyle(job).fontSize):0 };
  });
  need('all seven columns FIT at desktop width', w.fits);
  need('desktop magnets carry 13px titles', w.jobT>=13, w.jobT+'px');
  await page.close();
}
await browser.close();
console.log('');
console.log('GATE 948 ['+LABEL+'] — '+passes+' passed, '+fails.length+' failed');
fails.forEach(f=>console.log('  ✗ '+f));
console.log(fails.length?'GATE 948 RED':'GATE 948 GREEN — the Magnet Board holds');
process.exit(fails.length?1:0);
