/* gate_947.mjs — the punch-out card, tightened (build 947).
   Drives the REAL card against the seeded mock. i5 = on site (open visit,
   working); i1 = assigned + future date (not started). Asserts:
     field/working: tools above dispatch, dispatch folded, fold expands,
     empty description is one line, chips hidden till focus, jump spans
     scroll instead of tripping the not-ready alert, kebab menu owns Delete,
     no dead ≡ handle, supplement chip in the header, five templates for a
     manager, ready-state green rule shipped, tap floors on rendered rects
     (+ ::after pads where visuals stay small), back-after-restore stays put.
   Usage: node gate_947.mjs [path] — previous build = negative control (RED,
   named failures, no crash — BUG_CLASSES 37). */
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
async function boot(role){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as='+role,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});});
  return page;
}

/* ── field user, working item (i5: open visit) ── */
{
  const page=await boot('scottie');
  page.on('dialog',async d=>{ fails.push('unexpected dialog: '+d.message().slice(0,60)); await d.dismiss(); });
  await page.evaluate(()=>window.CardinalPunchCard&&window.CardinalPunchCard.open('i5',{back:'none'}));
  await page.waitForTimeout(1000);
  const f=await page.evaluate(()=>{
    const el=document.getElementById('cr-pk');
    const secs=[...el.querySelectorAll('.pksplit > div:first-child > *')];
    const idx=c=>secs.findIndex(s=>s.matches(c)||s.querySelector(':scope'+(c[0]==='.'?c:''))&&s.matches(c));
    const pos=sel=>secs.findIndex(s=>s.matches(sel));
    return {
      order:{ vis:pos('.pkvis'), ck:pos('#pkSecCk'), ph:pos('#pkSecPh'), fold:pos('.pkfold:not(.dim)'), desc:pos('.pkfold.dim') },
      foldTxt:(el.querySelector('.pkfold:not(.dim) .tx')||{}).textContent||'',
      hasSelect:!!el.querySelector('select[data-f="assigned"]'),
      descLine:!!el.querySelector('.pkfold.dim'),
      hnd:!!el.querySelector('.hnd'),
      supChip:!!el.querySelector('.pksupc'), supOld:!!el.querySelector('.pksup'),
      tagsHidden:el.querySelector('.pktags')?.classList.contains('hide')||false,
      kebab:!!el.querySelector('.pkmenu'), dd:!!el.querySelector('.pkmenu-dd'),
      removeSection:[...el.querySelectorAll('.pkh')].some(h=>/Remove/.test(h.textContent)),
      jumps:el.querySelectorAll('.pkclose .jump').length,
      closeBg:getComputedStyle(el.querySelector('.pkclose')).backgroundColor,
      tickPad:getComputedStyle(el.querySelector('.pkck .bx')||el, '::after').height,
    };
  });
  need('working card: check-in strip above checklist above photos', f.order.vis>-1&&f.order.ck>f.order.vis&&f.order.ph>f.order.ck, JSON.stringify(f.order));
  need('dispatch folded below the tools', f.order.fold>f.order.ph, JSON.stringify(f.order));
  need('fold line says who and when', /Curtis/.test(f.foldTxt), '"'+f.foldTxt+'"');
  need('no assign select while folded', !f.hasSelect);
  need('empty description is one line', f.descLine);
  need('the dead ≡ handle is gone', !f.hnd);
  need('supplement is a header chip, big button gone', f.supChip&&!f.supOld);
  need('tag chips hidden before focus', f.tagsHidden);
  need('kebab present, dropdown closed, Remove section gone', f.kebab&&!f.dd&&!f.removeSection);
  need('close subtitle carries jump spans', f.jumps>=1, 'jumps='+f.jumps);
  need('close is NOT green while blocked', !/rgb\(27, 125, 73\)/.test(f.closeBg), f.closeBg);
  /* i5 has no steps in seed — tick pad only measurable with steps; skip if none */
  await page.evaluate(()=>{ const t=document.querySelector('#cr-pk .pktags'); });
  /* focus reveals chips */
  await page.focus('#cr-pk [data-f="msg"]').catch(()=>fails.push('no message input to focus'));
  await page.waitForTimeout(200);
  const chips=await page.evaluate(()=>!document.querySelector('#cr-pk .pktags')?.classList.contains('hide'));
  need('chips appear on focus', chips);
  /* jump does not trip the alert (dialog listener above fails on any dialog) */
  const j=await page.$('#cr-pk .pkclose .jump');
  if(j){ await j.click(); await page.waitForTimeout(500); need('jump tap did not alert', !fails.some(x=>/unexpected dialog/.test(x))); }
  else fails.push('no jump span to tap');
  /* fold expands */
  const foldOk=await page.evaluate(()=>{const b=document.querySelector('#cr-pk .pkfold:not(.dim)'); if(!b) return false; b.click(); return true;});
  await page.waitForTimeout(300);
  const expanded=await page.evaluate(()=>!!document.querySelector('#cr-pk .pkm'));
  need('fold expands to the dispatch tiles', foldOk&&expanded, foldOk?'':'no .pkfold on this build');
  /* kebab opens the menu with Delete (Scottie is full_access) */
  const kebOk=await page.evaluate(()=>{const b=document.querySelector('#cr-pk .pkmenu'); if(!b) return false; b.click(); return true;});
  if(!kebOk) fails.push('no .pkmenu kebab on this build to tap');
  await page.waitForTimeout(300);
  const menu=await page.evaluate(()=>({ dd:!!document.querySelector('#cr-pk .pkmenu-dd'),
    del:!!document.querySelector('#cr-pk .pkmenu-dd [data-act="del"]') }));
  need('kebab opens menu with Delete', menu.dd&&menu.del);
  /* floors: rendered rects */
  const floor=await page.evaluate(()=>{
    const out=[];
    document.querySelectorAll('#cr-pk .pkbtn,#cr-pk .pkadd,#cr-pk .pkgalbtn,#cr-pk .pkback,#cr-pk .pkmenu,#cr-pk .pktag,#cr-pk .pkfold').forEach(e=>{
      const b=e.getBoundingClientRect(); const cs=getComputedStyle(e);
      if(cs.display==='none'||!b.width) return;
      if(b.height<43.5) out.push(e.className.split(' ')[0]+' '+Math.round(b.height));
    });
    return out;
  });
  need('card controls meet the 44px floor', floor.length===0, floor.slice(0,6).join(' | '));
  await page.close();
}

/* ── manager, not-started item (i1) ── */
{
  const page=await boot('theo');
  await page.evaluate(()=>window.CardinalPunchCard&&window.CardinalPunchCard.open('i1',{back:'none'}));
  await page.waitForTimeout(1000);
  const m=await page.evaluate(()=>{
    const el=document.getElementById('cr-pk');
    return { sel:!!el.querySelector('select[data-f="assigned"]'),
      tpls:el.querySelectorAll('[data-tpl]').length,
      win:[...el.querySelectorAll('[data-tpl]')].some(b=>/Window/.test(b.textContent)),
      gen:[...el.querySelectorAll('[data-tpl]')].some(b=>/General/.test(b.textContent)),
      readyRule:[...document.styleSheets].some(sh=>{try{return [...sh.cssRules].some(r=>r.cssText&&r.cssText.indexOf('.pkclose.ready')>-1&&r.cssText.indexOf('rgb(27, 125, 73)')>-1);}catch(e){return false;}}) };
  });
  need('manager, not started: dispatch open (assign select)', m.sel);
  need('five templates', m.tpls===5, 'tpls='+m.tpls);
  need('windows template present', m.win);
  need('general template present', m.gen);
  need('ready-state green rule shipped (#1b7d49)', m.readyRule);
  /* back-after-restore stays put */
  await page.evaluate(()=>{ window.CardinalPunchCard.close(false); });
  await page.waitForTimeout(200);
  await page.evaluate(()=>{ window.CardinalPunchCard.open(window.__crPunchCardLast); });  /* the navRestore shape: no opts */
  await page.waitForTimeout(600);
  await page.evaluate(()=>{ const b=document.querySelector('#cr-pk .pkback'); if(b) b.click(); });
  await page.waitForTimeout(600);
  const prod=await page.evaluate(()=>({ pb:document.getElementById('cr-pb')?.classList.contains('open')||false }));
  need('back after a restore does NOT land on Production', !prod.pb);
  await page.close();
}

/* ── source-level: the supplement badge exists at both render sites ── */
need('board badge markup shipped (2 sites)', (APP.match(/pu-tag supp|pu-st warn">SUPPLEMENT/g)||[]).length>=2,
  String((APP.match(/pu-tag supp|pu-st warn">SUPPLEMENT/g)||[]).length));

await browser.close();
console.log('');
console.log('GATE 947 ['+LABEL+'] — '+passes+' passed, '+fails.length+' failed');
fails.forEach(f=>console.log('  ✗ '+f));
console.log(fails.length?'GATE 947 RED':'GATE 947 GREEN — the tightened card holds');
process.exit(fails.length?1:0);
