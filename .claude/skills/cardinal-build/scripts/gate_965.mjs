/* gate_965.mjs — add a field to a contract by hand (build 965).

   Opens a REAL siding agreement in the REAL editor and drives the shipped
   insertField() at a real caret. Every assertion is about the thing that makes
   an inserted field worth having — that it is wired, and that it survives the
   clone that saves a contract. A field that renders and does nothing is the
   defect this project has already paid for (BUG_CLASSES 16).

     1  the caret fence refuses a heading, and SAYS why
     2  a text box lands where the caret is, inside the editable cell
     3  a checkbox lands AND IS WIRED — clicking it ticks to ☑
     4  ...and the tick is a character in the markup, so it survives the clone
     5  a dropdown lands populated (Yes / No / N/A — the new `yesno` list)
     6  ...and choosing writes the `selected` ATTRIBUTE, surviving the clone
     7  a signature line gets a fresh key, and two of them do not collide
     8  pickSigner OFFERS the added line — it was a whitelist of three, and an
        added slot would have been invisible to it (the normStage shape)
     9  Client signature appears once a signable line exists
    10  a field I added can be removed; a printed one cannot

   Usage: node gate_965.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash. */
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
  S.materials=[{id:'m1',category:'siding',manufacturer:'Mastic',product_line:'Carvedwood',color_name:'Almond',status:'current',sort_order:1}];
}catch(e){}})();`);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* Put a real siding agreement in the store and open the REAL editor on it. */
const opened = await page.evaluate(async ()=>{
  const tpl = window.SIDING_AGREEMENT;
  if(!tpl) return 'no SIDING_AGREEMENT';
  if(typeof window.openEditor !== 'function') return 'no openEditor';
  const row = { id:'rep-965', title:'Contract — Siding — Test Client', html:tpl,
                project:'Test Client', project_id:'p1', status:'draft', total:0 };
  const store = window.__SEED__; store.inspection_reports = [row];
  await window.openEditor('rep-965');
  await new Promise(r=>setTimeout(r,1200));
  const f=document.getElementById('reportFrame');
  return (f && f.contentDocument && f.contentDocument.querySelector('.ph')) ? 'ok' : 'editor did not load the document';
});
need('0 the editor opened a real siding agreement', opened==='ok', String(opened));

const R = await page.evaluate(async ()=>{
  const out = {};
  const f=document.getElementById('reportFrame');
  const doc=f && f.contentDocument;
  if(!doc) return { dead:'no frame' };
  const alerts=[]; const realAlert=window.alert; window.alert=m=>alerts.push(String(m));
  /* ⚠ RIG REPAIR 29 Aug 2026 (triage at build 1121): builds 1080–1083 moved the
     app off alert()/confirm() onto crTell()/crAsk(); insertField's fence now
     speaks through crTell, so a stub of alert alone hears nothing and the fence
     read as silent (assertions 1 and 10). Same collector, same contract. */
  const realTell=window.crTell, realAsk=window.crAsk;
  window.crTell=m=>alerts.push(String(m||''));
  window.crAsk=m=>{alerts.push(String(m||''));return Promise.resolve(true);};

  /* BUG_CLASSES 37: a negative control that CRASHES instead of reporting red
     proves nothing, and the crash reads as "not green" rather than as "no
     evidence". The previous build has no insertField and no pickSigner change,
     so every new symbol is reached through a guard that records its absence and
     lets the rest of the run finish. The FIRST version of this gate died on
     `window.insertField is not a function` before printing a single line. */
  const missing = [];
  async function ins(kind, listKind){
    if(typeof window.insertField !== 'function'){
      if(missing.indexOf('insertField')<0) missing.push('insertField');
      return;
    }
    try{ await window.insertField(kind, listKind); }catch(e){ missing.push('insertField threw: '+e.message); }
  }
  out.missing = missing;

  /* Guard the INTERACTION too, not just the symbol. The second version of this
     gate still died on the control — caretIn(null), because the element it was
     asked to click into only exists once a field has been added. BUG_CLASSES 37
     twice in one build: a control that throws proves nothing. */
  function caretIn(el, atEnd){
    if(!el || !el.nodeType) return false;
    try{
      const r=doc.createRange();
      r.selectNodeContents(el); r.collapse(!atEnd);
      const s=doc.getSelection(); s.removeAllRanges(); s.addRange(r);
      return true;
    }catch(e){ return false; }
  }
  const cells=[...doc.querySelectorAll('td')];
  const heading=doc.querySelector('h2,h3,td.k');
  const editable=doc.querySelector('.ph');

  /* 1 — the fence */
  caretIn(heading);
  out.hadHeading = !!heading;
  alerts.length=0;
  await ins('text');
  out.fenceRefused = alerts.length>0;
  out.fenceWhy = alerts[0]||'';
  out.fenceLeftNothing = !!(heading && !heading.querySelector('[data-added]'));

  /* 2 — a text box at the caret */
  caretIn(editable, true);
  await ins('text');
  const host = editable ? (editable.closest('td') || editable.parentNode) : null;
  out.textAdded = !!(host && host.querySelector('.ph[data-added="1"]'));

  /* 3 + 4 — a checkbox, wired, and its tick in the markup */
  caretIn(editable, true);
  await ins('check');
  const cb = host && host.querySelector('.cbx[data-added="1"]');
  out.checkAdded = !!cb;
  if(cb){
    out.checkBefore = cb.textContent;
    try{ cb.click(); }catch(e){}
    out.checkAfter = cb.textContent;
    out.checkClones = cb.cloneNode(true).textContent;
  }

  /* 5 + 6 — a dropdown from the new yesno list, and the selected attribute */
  caretIn(editable, true);
  await ins('list','yesno');
  const sel = host && host.querySelector('select[data-added="1"]');
  out.listAdded = !!sel;
  if(sel){
    out.listOpts=[...sel.querySelectorAll('option')].map(o=>o.value).filter(Boolean);
    sel.value='No'; sel.dispatchEvent(new Event('change',{bubbles:true}));
    const c=sel.cloneNode(true);
    out.listAttr = c.querySelector('option[selected]') ? c.querySelector('option[selected]').value : null;
  }

  /* 7 — two signature lines, distinct keys */
  const before=[...doc.querySelectorAll('[data-sig]')].map(e=>e.getAttribute('data-sig'));
  caretIn(editable, true); await ins('sign');
  caretIn(editable, true); await ins('init');
  const after=[...doc.querySelectorAll('[data-sig]')].map(e=>e.getAttribute('data-sig'));
  out.newKeys = after.filter(k=>before.indexOf(k)<0);
  out.uniqueKeys = new Set(after).size === after.length;

  /* 8 — pickSigner must offer them */
  out.offered = await new Promise(res=>{
    let seen=null;
    const obs=new MutationObserver(()=>{
      const ov=[...document.querySelectorAll('[data-who]')].map(b=>b.getAttribute('data-who')).filter(Boolean);
      if(ov.length){ seen=ov; obs.disconnect();
        const cancel=[...document.querySelectorAll('[data-who]')].find(b=>b.getAttribute('data-who')==='');
        if(cancel) cancel.click();
        res(seen); }
    });
    obs.observe(document.body,{childList:true,subtree:true});
    try{ window.pickSigner(doc, ()=>{}); }catch(e){ obs.disconnect(); res('threw: '+e.message); }
    setTimeout(()=>{ obs.disconnect(); res(seen||'no picker'); }, 1200);
  });

  /* 9 — the signature button */
  var _sb = document.getElementById('sigBtn');
  out.sigBtnShown = !!(_sb && getComputedStyle(_sb).display !== 'none');
  out.addBtn = !!document.getElementById('addFieldBtn');

  /* 10 — remove mine, refuse a printed one */
  const mine = host && host.querySelector('.ph[data-added="1"]');
  out.hadMine = !!mine;
  caretIn(mine, true);
  await ins('del');
  out.removedMine = !!(mine && !host.contains(mine));
  /* A genuinely printed field: not added, not inside an added one, and — the
     part the first version of this assertion missed — not CONTAINING one
     either. Every insert above went inside the first .ph, so that .ph was
     picked as "printed" and `del` correctly removed the added field within it.
     The app was right; the test had chosen the wrong element. */
  const printed = [...doc.querySelectorAll('.ph')].find(p=>
    !p.hasAttribute('data-added') && !p.closest('[data-added]') && !p.querySelector('[data-added]'));
  out.printedPicked = printed ? (printed.textContent||'').slice(0,20) : null;
  const caretOk = caretIn(printed, true);
  alerts.length=0;
  await ins('del');
  out.printedKept = !!(printed && caretOk && doc.contains(printed) && alerts.length>0);

  window.alert=realAlert; window.crTell=realTell; window.crAsk=realAsk;
  return out;
});

need('1 the fence refuses a fixed part, and says why',
     !!(R && R.fenceRefused && R.fenceLeftNothing && /fixed|tap inside/i.test(R.fenceWhy)),
     R ? ('refused='+R.fenceRefused+' clean='+R.fenceLeftNothing+' msg="'+String(R.fenceWhy).slice(0,60)+'"') : String(R&&R.dead));
need('2 a text box lands at the caret', !!(R && R.textAdded),
     'added='+(R&&R.textAdded)+(R&&R.missing&&R.missing.length?' · missing: '+R.missing.join(', '):''));
need('2b the ＋ Field button exists', !!(R && R.addBtn), 'addFieldBtn='+(R&&R.addBtn));
need('3 a checkbox lands AND is wired',
     !!(R && R.checkAdded && R.checkBefore==='☐' && R.checkAfter==='☑'),
     R ? ('added='+R.checkAdded+' before='+JSON.stringify(R.checkBefore)+' after='+JSON.stringify(R.checkAfter)) : '');
need('4 the tick is markup, so it survives the clone',
     !!(R && R.checkClones==='☑'), 'clone='+JSON.stringify(R&&R.checkClones));
need('5 a dropdown lands populated from the new yes/no list',
     !!(R && R.listAdded && R.listOpts && R.listOpts.join('|')==='Yes|No|N/A'),
     R ? JSON.stringify(R.listOpts) : '');
need('6 the choice writes the selected ATTRIBUTE',
     !!(R && R.listAttr==='No'), 'attr='+(R&&R.listAttr));
need('7 signature and initials lines get fresh, distinct keys',
     !!(R && R.newKeys && R.newKeys.length===2 && R.uniqueKeys),
     R ? JSON.stringify(R.newKeys)+' unique='+R.uniqueKeys : '');
/* `every` over an EMPTY array is true, so without the length check this passes
   on any tree where nothing was added — including the control, where it did.
   A check that cannot fail is worse than no check. */
need('8 pickSigner offers the added lines (it was a whitelist of three)',
     !!(R && Array.isArray(R.offered) && R.newKeys && R.newKeys.length===2 &&
        R.newKeys.every(k=>R.offered.indexOf(k)>=0)),
     R ? ('offered='+JSON.stringify(R.offered)+' added='+JSON.stringify(R.newKeys)) : '');
need('9 Client signature is shown', !!(R && R.sigBtnShown), 'shown='+(R&&R.sigBtnShown));
need('10 an added field can be removed; a printed one cannot',
     !!(R && R.removedMine && R.printedKept),
     R ? ('removedMine='+R.removedMine+' printedKept='+R.printedKept+' picked='+JSON.stringify(R.printedPicked)) : '');

await browser.close();
console.log('\ngate_965 ['+LABEL+'] '+FILE);
console.log('  passed: '+passes+'   failed: '+fails.length);
fails.forEach(f=>console.log('  FAIL  '+f));
console.log(fails.length? '\nRED' : '\nGREEN — 12/12');
process.exit(fails.length?1:0);
