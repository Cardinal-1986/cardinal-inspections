/* gate_959.mjs — the forecast on the Production calendar (build 959).

   Routed Open-Meteo fixture: today clear 5%, tomorrow rain 80%, +2d cloudy 35%,
   fourteen days only.

     1  CardinalWx is a real global with the whole seam on it
     2  the Crew Dispatch module no longer carries its own copy (source level)
     3  Production's mini calendar paints .wx on forecast days
     4  ...tomorrow is .wx.wet, painted in the computed --pb-wx blue
     5  ...today is .wx and NOT .wet, in the dim ink, with no percentage (5% < 30)
     6  ...+2d shows its 35%
     7  a day PAST Open-Meteo's fourteen carries no .wx at all
        (absent means "no forecast", never "fair weather")
     8  the day heading over the agenda carries its own .wx
     9  the full five-week calendar paints them too
    10  light theme: the wet ink flips to the light twin, and both clear 3:1
    11  Crew Dispatch still shows weather — through the shared module now
    12  ONE fetch for both screens, not two  ← the whole architectural claim
    13  forecast down: zero .wx anywhere, and Production renders completely
        (35+ day cells, the heading, the agenda)
    14  the full calendar LAYS IT OUT — date left, forecast right, computed
    15  the mini calendar keeps its centred number with the icon on that line
        (14/15 exist because the first version of the rule lost on specificity
         and was inert while every assertion above stayed green)

   Usage: node gate_959.mjs [path] — point at the previous build as the
   negative control. It must go RED with named failures and MUST NOT crash. */
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
/* fourteen days, matching what the real endpoint returns for forecast_days=14 */
const WXFIX=(()=>{ const time=[],code=[],pp=[];
  for(let i=0;i<14;i++){ time.push(key(i)); code.push(i===1?61:(i===0?0:3)); pp.push(i===1?80:(i===0?5:35)); }
  return JSON.stringify({ daily:{ time, weather_code:code, precipitation_probability_max:pp } }); })();

/* ── 2: the extraction itself, read off the artifact ── */
{
  const i=APP.indexOf('id="cr-disp-script"');
  const blk = i<0 ? '' : APP.slice(i, APP.indexOf('</script>', i));
  const priv = ['wxDays','wxKind(','wxIcon('].filter(t=>blk.indexOf(t)>=0);
  need('2 Crew Dispatch keeps no private forecast', i>=0 && priv.length===0,
       i<0 ? 'cr-disp-script not found' : ('still there: '+priv.join(', ')));
}

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

async function boot(w,h,wxMode,theme){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  page.__wxHits=0;
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(u.indexOf('api.open-meteo.com')>=0){
      page.__wxHits++;
      if(wxMode==='abort') return r.abort();
      return r.fulfill({status:200,contentType:'application/json',body:WXFIX});
    }
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  /* a stale cache would hide a broken fetch AND make the one-fetch count lie */
  await page.addInitScript(`try{ localStorage.removeItem('cr-dispwx'); }catch(e){}`);
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  if(theme==='light') await page.evaluate(()=>document.documentElement.setAttribute('data-theme','rb-light'));
  await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    if(window.CardinalProduction&&window.CardinalProduction.open) window.CardinalProduction.open();});
  await page.waitForTimeout(1600);
  return page;
}

/* ── A: the mini calendar and the day heading ── */
{
  const page=await boot(1440,900,'fixture');
  const f=await page.evaluate(([d0,d1,d2,dFar])=>{
    const el=document.getElementById('cr-pb');
    if(!el) return null;
    const api=window.CardinalWx;
    function cellFor(k){ return el.querySelector('.pbday[data-day="'+k+'"]'); }
    function read(k){ const c=cellFor(k); if(!c) return {missing:true};
      const w=c.querySelector('.dn .wx');
      if(!w) return {none:true};
      const cs=getComputedStyle(w);
      return { wet:w.classList.contains('wet'), color:cs.color,
        pct:(w.querySelector('i')||{textContent:''}).textContent.trim(), svg:!!w.querySelector('svg') }; }
    const rule=el.querySelector('.pbrule');
    return {
      apiOk: !!(api && typeof api.load==='function' && typeof api.cell==='function'
                && typeof api.kind==='function' && typeof api.wet==='function'),
      cells: el.querySelectorAll('.pbday').length,
      wxCount: el.querySelectorAll('.pbday .dn .wx').length,
      d0:read(d0), d1:read(d1), d2:read(d2), far:read(dFar),
      ruleWx: !!(rule && rule.querySelector('.wx')),
      dimInk: getComputedStyle(el).getPropertyValue('--pb-dim').trim(),
      wxInk: getComputedStyle(el).getPropertyValue('--pb-wx').trim()
    };
  }, [key(0),key(1),key(2),key(20)]);
  need('1 CardinalWx is a real global', !!(f&&f.apiOk), f?('api complete = '+f.apiOk):'Production never opened');
  need('3 the mini calendar paints the forecast', !!(f && f.wxCount>0 && f.wxCount<=14),
       f?(f.wxCount+' .wx on '+f.cells+' day cells'):'no board');
  need('4 tomorrow is wet, in the --pb-wx blue',
       !!(f && f.d1 && f.d1.wet && f.d1.svg && f.d1.pct==='80%' && f.d1.color==='rgb(109, 179, 242)'),
       f&&f.d1?JSON.stringify(f.d1):'no cell');
  need('5 today is dry, dim, and prints no percentage',
       !!(f && f.d0 && !f.d0.wet && f.d0.svg && f.d0.pct==='' && f.d0.color==='rgb(132, 140, 148)'),
       f&&f.d0?JSON.stringify(f.d0):'no cell');
  need('6 a 35% day prints its chance', !!(f && f.d2 && f.d2.pct==='35%'),
       f&&f.d2?JSON.stringify(f.d2):'no cell');
  need('7 past day fourteen there is no icon at all',
       !!(f && f.far && (f.far.none || f.far.missing)),
       f&&f.far?JSON.stringify(f.far):'no cell');
  need('8 the day heading carries its own forecast', !!(f&&f.ruleWx),
       f?('.pbrule .wx = '+f.ruleWx):'no board');

  /* ── 9: the full five-week calendar ── */
  await page.evaluate(()=>{ const b=document.querySelector('#cr-pb [data-go="cal"]'); if(b) b.click(); });
  await page.waitForTimeout(700);
  const g=await page.evaluate(()=>{ const el=document.getElementById('cr-pb');
    return el?{ cells:el.querySelectorAll('.pbday').length,
      wx:el.querySelectorAll('.pbday .dn .wx').length,
      rule:!!(el.querySelector('.pbrule')&&el.querySelector('.pbrule .wx')) }:null; });
  need('9 the full calendar paints them too',
       !!(g && g.cells>=35 && g.wx>0 && g.rule),
       g?(g.wx+' .wx on '+g.cells+' cells, heading='+g.rule):'no board');

  /* 14/15: the LAYOUT, which every assertion above stayed green through while
     it was inert. The first version of this rule was two classes and lost to
     the mini calendar's three; the sentinel caught it, not the gate. The two
     grids are laid out deliberately and differently, so assert both. */
  const lay=await page.evaluate(()=>{
    const el=document.getElementById('cr-pb'); if(!el) return null;
    const dn=[...el.querySelectorAll('.pbcal .pbday .dn')].find(x=>x.querySelector('.wx'));
    if(!dn) return {noWx:true};
    const w=dn.querySelector('.wx');
    const a=dn.getBoundingClientRect(), b=w.getBoundingClientRect();
    const cs=getComputedStyle(dn);
    return { display:cs.display,
      gapToRight:Math.round(a.right - b.right - parseFloat(cs.paddingRight||0)) };
  });
  need('14 the full calendar puts the forecast on the right of the date',
       !!(lay && lay.display==='flex' && lay.gapToRight<=6 && lay.gapToRight>=-2),
       lay?JSON.stringify(lay):'no board');
  await page.context().close();
}

/* ── the mini calendar keeps its centred number, icon inline beside it ── */
{
  const page=await boot(390,844,'fixture');
  const f=await page.evaluate(()=>{
    const el=document.getElementById('cr-pb'); if(!el) return null;
    const dn=[...el.querySelectorAll('.pbmonth .pbday .dn')].find(x=>x.querySelector('.wx'));
    if(!dn) return {noWx:true};
    const w=dn.querySelector('.wx');
    const a=dn.getBoundingClientRect(), b=w.getBoundingClientRect();
    return { display:getComputedStyle(dn).display, h:Math.round(a.height),
      sameLine: b.top >= a.top - 2 && b.bottom <= a.bottom + 2 };
  });
  need('15 the mini calendar keeps the icon on the number\'s line',
       !!(f && f.display==='block' && f.sameLine && f.h<=22),
       f?JSON.stringify(f):'no board');
  await page.context().close();
}

/* ── B: light theme ── */
{
  const page=await boot(1440,900,'fixture','light');
  const f=await page.evaluate(([d1,d0])=>{
    const el=document.getElementById('cr-pb'); if(!el) return null;
    function ink(k){ const c=el.querySelector('.pbday[data-day="'+k+'"] .dn .wx');
      return c?getComputedStyle(c).color:'(none)'; }
    const card=el.querySelector('.pbday');
    return { wet:ink(d1), dry:ink(d0), card:card?getComputedStyle(card).backgroundColor:'(none)' };
  }, [key(1),key(0)]);
  function lum(rgb){ const m=String(rgb).match(/\d+/g); if(!m) return null;
    const c=m.slice(0,3).map(x=>{ const v=+x/255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); });
    return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
  function ratio(a,b){ const la=lum(a), lb=lum(b); if(la==null||lb==null) return 0;
    const hi=Math.max(la,lb), lo=Math.min(la,lb); return (hi+.05)/(lo+.05); }
  const rw=f?ratio(f.wet,f.card):0, rd=f?ratio(f.dry,f.card):0;
  need('10 light theme flips the ink and both clear 3:1',
       !!(f && f.wet==='rgb(21, 95, 158)' && rw>=3 && rd>=3),
       f?('wet='+f.wet+' ('+rw.toFixed(2)+':1) dry='+f.dry+' ('+rd.toFixed(2)+':1) on '+f.card):'no board');
  await page.context().close();
}

/* ── C: one fetch for both screens ── */
{
  const page=await boot(1440,900,'fixture');
  const dispHasWx=await page.evaluate(async ()=>{
    if(!(window.CardinalDispatch&&window.CardinalDispatch.open)) return null;
    window.CardinalDispatch.open();
    await new Promise(r=>setTimeout(r,1300));
    const el=document.getElementById('cr-disp');
    return el?el.querySelectorAll('.dcol .c .wx').length:null;
  });
  await page.waitForTimeout(500);
  need('11 Crew Dispatch still shows weather, through the shared module',
       dispHasWx!==null && dispHasWx>0, 'dispatch header .wx = '+dispHasWx);
  need('12 ONE fetch serves both screens', page.__wxHits===1,
       page.__wxHits+' request(s) to open-meteo after opening Production and Dispatch');
  await page.context().close();
}

/* ── D: forecast down ── */
{
  const page=await boot(1440,900,'abort');
  const f=await page.evaluate(()=>{ const el=document.getElementById('cr-pb'); if(!el) return null;
    const rule=el.querySelector('.pbrule');
    return { wx:el.querySelectorAll('.wx').length, cells:el.querySelectorAll('.pbday').length,
      rule:!!rule, ruleText:rule?rule.textContent.trim().slice(0,24):'',
      agenda:!!(el.querySelector('.pbempty')||el.querySelector('.pbev')||el.innerHTML.length>2000) }; });
  need('13 forecast down: no icons, board complete',
       !!(f && f.wx===0 && f.cells>=28 && f.rule && f.ruleText.length>0 && f.agenda),
       f?JSON.stringify(f):'no board');
  await page.context().close();
}

await browser.close();
console.log('\ngate_959 ['+LABEL+'] '+FILE);
console.log('  passed: '+passes+'   failed: '+fails.length);
fails.forEach(f=>console.log('  FAIL  '+f));
console.log(fails.length? '\nRED' : '\nGREEN — 15/15');
process.exit(fails.length?1:0);
