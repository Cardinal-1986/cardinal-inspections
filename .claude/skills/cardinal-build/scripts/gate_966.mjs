/* gate_966.mjs — the fill counter (build 966).

   Opens a REAL siding agreement in the REAL editor and reads the chip.

     1  the chip appears on a contract, red, with a count > 0
     2  what it counts: a placeholder still showing its prompt, an unchosen
        dropdown, a tick-one-of-these set with nothing ticked
     3  signatures are NOT counted — filling in a contract before anyone has
        signed must not report the signature lines as missing
     4  ungrouped optional checkboxes are NOT counted
     5  typing into a placeholder drops the count
     6  choosing from a dropdown drops the count
     7  ticking a set drops the count
     8  the chip goes green and reads "All filled" at zero
     9  tapping it jumps to a blank and outlines it
    10  ...and walks to a DIFFERENT one on the next tap
    11  a field added by hand at 965 is counted too

   Usage: node gate_966.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash (BUG_CLASSES 37). */
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

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1194,height:834}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.addInitScript(`(function(){try{var S=window.__SEED__;if(!S)return;
  S.materials=[{id:'m1',category:'siding',manufacturer:'Mastic',product_line:'Carvedwood',color_name:'Almond',status:'current',sort_order:1},
    {id:'m2',category:'gutters',manufacturer:'Cardinal',product_line:'6\" K-Style',color_name:'White',status:'current',sort_order:1}];
  /* every dropdown kind needs something to choose, or the fill-everything loop
     below cannot reach zero and assertion 8 fails for the harness's reasons
     rather than the app's. */
  S.oc_colors=[{id:'o1',name:'Estate Gray',status:'current',hidden:false,sort_order:1},
               {id:'o2',name:'Onyx Black',status:'current',hidden:false,sort_order:2}];
}catch(e){}})();`);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

const opened = await page.evaluate(async ()=>{
  const tpl = window.SIDING_AGREEMENT;
  if(!tpl) return 'no SIDING_AGREEMENT';
  if(typeof window.openEditor !== 'function') return 'no openEditor';
  window.__SEED__.inspection_reports = [{ id:'rep-966', title:'Contract — Siding — Test', html:tpl,
    project:'Test', project_id:'p1', status:'draft', total:0 }];
  await window.openEditor('rep-966');
  await new Promise(r=>setTimeout(r,1300));
  const f=document.getElementById('reportFrame');
  return (f && f.contentDocument && f.contentDocument.querySelector('.ph')) ? 'ok' : 'no document';
});
need('0 a real siding agreement is open in the editor', opened==='ok', String(opened));

const R = await page.evaluate(async ()=>{
  const out={};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const f=document.getElementById('reportFrame'); const doc=f&&f.contentDocument;
  if(!doc) return { dead:'no frame' };
  const chip=document.getElementById('fillChipBtn'), txt=document.getElementById('fillChipTxt');
  out.hasChip = !!(chip && txt);
  if(!out.hasChip) return out;                     /* BUG_CLASSES 37: report, do not throw */
  const read=()=>({ shown:getComputedStyle(chip).display!=='none',
                    text:(txt.textContent||'').trim(),
                    n:parseInt((txt.textContent||'').trim(),10) });
  out.start = read();

  /* what the counter sees, straight from the shipped function */
  const blanks = typeof window.fillBlanks==='function' ? window.fillBlanks(doc) : [];
  out.kinds = blanks.reduce((a,el)=>{
    const k = el.tagName==='SELECT' ? 'select' : (el.classList.contains('cbx') ? 'cbxgroup' : 'ph');
    a[k]=(a[k]||0)+1; return a; }, {});
  out.anySig = blanks.some(el=>el.closest('[data-sig]'));
  out.anyUngroupedCbx = blanks.some(el=>el.classList.contains('cbx') && !el.getAttribute('data-group'));

  /* 5 — typing into a placeholder */
  const ph = blanks.find(el=>el.classList.contains('ph'));
  const before = read().n;
  if(ph){ ph.textContent='Filled in'; doc.dispatchEvent(new Event('input',{bubbles:true})); }
  await wait(320); out.afterType = read().n; out.typeDrop = before - out.afterType;

  /* 6 — choosing from a dropdown */
  const sel = window.fillBlanks(doc).find(el=>el.tagName==='SELECT');
  const b2 = read().n;
  if(sel && sel.options.length>1){ sel.selectedIndex=1; sel.dispatchEvent(new Event('change',{bubbles:true})); }
  await wait(320); out.selDrop = b2 - read().n;

  /* 7 — ticking a set */
  const cb = window.fillBlanks(doc).find(el=>el.classList.contains('cbx'));
  const b3 = read().n;
  if(cb){ cb.click(); }
  await wait(320); out.cbxDrop = b3 - read().n;

  /* 9 + 10 — jump, and jump again to somewhere else */
  const j1 = typeof window.jumpNextBlank==='function';
  if(j1){ window.jumpNextBlank(); }
  await wait(120);
  const hi1 = doc.querySelector('.crfill-hi');
  out.jumped = !!hi1;
  out.hiOutline = hi1 ? getComputedStyle(hi1).outlineStyle : null;
  const first = hi1;
  if(j1){ window.jumpNextBlank(); }
  await wait(120);
  const hi2 = doc.querySelector('.crfill-hi');
  out.movedOn = !!(hi2 && hi2 !== first);

  /* 11 — a hand-added field counts */
  const n0 = read().n;
  if(typeof window.insertField==='function'){
    const host = doc.querySelector('.ph');
    if(host){ const r=doc.createRange(); r.selectNodeContents(host); r.collapse(false);
      const s2=doc.getSelection(); s2.removeAllRanges(); s2.addRange(r);
      await window.insertField('text'); }
  }
  await wait(360); out.addedCounts = read().n > n0;

  /* 8 — fill everything and watch it go green */
  /* Skip what cannot be filled instead of BREAKING on it — the first version
     bailed out of the whole loop at the first empty dropdown and reported 23
     still to fill, which was the harness's fault and not the app's. Stop when a
     pass makes no progress, so an unfillable field can never spin forever. */
  let guard=0, stuck=new Set();
  for(;;){
    if(guard++ > 500) break;
    const list = window.fillBlanks(doc).filter(el=>!stuck.has(el));
    if(!list.length) break;
    const el = list[0];
    if(el.tagName==='SELECT'){
      if(el.options.length>1){ el.selectedIndex=1; el.dispatchEvent(new Event('change',{bubbles:true})); }
      else stuck.add(el);
    }
    else if(el.classList.contains('cbx')) el.click();
    else el.textContent='x';
  }
  out.stuck = stuck.size;
  doc.dispatchEvent(new Event('input',{bubbles:true}));
  await wait(400);
  out.end = read();
  out.endColor = getComputedStyle(chip).color;
  return out;
});

need('1 the chip appears, red, with a count',
     !!(R && R.hasChip && R.start && R.start.shown && R.start.n>0),
     R ? ('chip='+R.hasChip+' '+JSON.stringify(R.start)) : String(R&&R.dead));
need('2 it counts placeholders, dropdowns and tick-one-of sets',
     !!(R && R.kinds && R.kinds.ph>0 && R.kinds.select>0 && R.kinds.cbxgroup>0),
     R ? JSON.stringify(R.kinds) : '');
need('3 signatures are NOT counted', !!(R && R.anySig===false), 'anySig='+(R&&R.anySig));
need('4 ungrouped optional boxes are NOT counted', !!(R && R.anyUngroupedCbx===false),
     'anyUngrouped='+(R&&R.anyUngroupedCbx));
need('5 typing into a placeholder drops the count', !!(R && R.typeDrop>=1), 'drop='+(R&&R.typeDrop));
need('6 choosing from a dropdown drops the count', !!(R && R.selDrop>=1), 'drop='+(R&&R.selDrop));
need('7 ticking a set drops the count', !!(R && R.cbxDrop>=1), 'drop='+(R&&R.cbxDrop));
need('8 at zero it reads All filled, in green',
     !!(R && R.end && R.end.text==='All filled' && R.endColor==='rgb(108, 185, 143)' && R.stuck===0),
     R ? ('text="'+(R.end&&R.end.text)+'" colour='+R.endColor+' unfillable='+R.stuck) : '');
need('9 tapping it outlines a blank', !!(R && R.jumped && R.hiOutline==='solid'),
     R ? ('jumped='+R.jumped+' outline='+R.hiOutline) : '');
need('10 tapping again moves to a different one', !!(R && R.movedOn), 'moved='+(R&&R.movedOn));
need('11 a field added by hand is counted too', !!(R && R.addedCounts), 'counted='+(R&&R.addedCounts));

await browser.close();
console.log('\ngate_966 ['+LABEL+'] '+FILE);
console.log('  passed: '+passes+'   failed: '+fails.length);
fails.forEach(f=>console.log('  FAIL  '+f));
console.log(fails.length? '\nRED' : '\nGREEN — 12/12');
process.exit(fails.length?1:0);
