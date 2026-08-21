/* gate_970.mjs — Publish acts on the estimate you have open (build 970).

   The satellites (Publish, → Contract, Mark-as-Sent, and the plain Save) read
   window.currentProject, which ONLY openProject() sets. Open a saved estimate
   from Menu → Estimates and that global still points at the last client opened —
   or is null — so pickEstimate()'s id match fails and rows[0] hands back a
   DIFFERENT client's newest estimate.

     1  estProjectNow() prefers the OPEN estimate's own project
     2  ...and falls back to window.currentProject when no editor is open
     3  ...and is null when neither exists (no TypeError)
     4  pickEstimate REFUSES rather than returning another client's row
     5  ...but still returns the right row when the id IS present
     6  ...and still returns rows[0] when no id was asked for (unchanged path)
     7  all four capture sites use the shared resolver, none reads the global raw
     8  both publish paths refuse a null estimate instead of acting on it

   Usage: node gate_970.mjs [path] — previous build = negative control; must go
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
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },120000);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* ---- 1,2,3: the shared resolver ---- */
const res = await page.evaluate(()=>{
  const out={err:null};
  try{
    out.exists = (typeof window.estProjectNow === 'function');
    if(!out.exists) return out;
    /* the dangerous case: the global points at ANOTHER client while the editor
       holds the real one */
    window.currentProject = { id:'p-WRONG', name:'Wrong Client' };
    const realCP = window.CardinalEstimates && window.CardinalEstimates.currentProject;
    window.CardinalEstimates = window.CardinalEstimates || {};
    window.CardinalEstimates.currentProject = () => ({ id:'p-RIGHT', name:'Right Client' });
    out.prefersEditor = (window.estProjectNow()||{}).id;
    /* no editor open -> the global is the fallback, unchanged behaviour */
    window.CardinalEstimates.currentProject = () => null;
    out.fallsBack = (window.estProjectNow()||{}).id;
    /* neither -> null, and no throw */
    window.currentProject = null;
    out.neither = window.estProjectNow();
    window.CardinalEstimates.currentProject = realCP;
  }catch(e){ out.err=String(e&&e.message||e); }
  return out;
});
need('1 resolver prefers the open estimate\'s own project', res.prefersEditor === 'p-RIGHT',
     res.err ? ('threw: '+res.err) : (res.exists ? ('got ' + res.prefersEditor) : 'estProjectNow() does not exist'));
need('2 resolver falls back to the global when no editor is open', res.fallsBack === 'p-WRONG',
     'got ' + res.fallsBack);
need('3 resolver is null when neither exists, without throwing', res.neither === null,
     'got ' + JSON.stringify(res.neither));

/* ---- 4,5,6: pickEstimate ---- */
const pick = await page.evaluate(()=>{
  const out={err:null};
  try{
    if(typeof window.pickEstimate !== 'function'){ out.missing = true; return out; }
    const otherClientRows = [ {id:'e-OTHER-newest', project_id:'p-WRONG'}, {id:'e-OTHER-old', project_id:'p-WRONG'} ];
    /* the exact scenario: we asked for the estimate we have open, and it is not here */
    const r = window.pickEstimate(otherClientRows, 'e-MINE');
    out.wrongClient = r ? r.id : null;
    /* the id IS present */
    const rows2 = [ {id:'e-A'}, {id:'e-MINE'} ];
    out.rightRow = (window.pickEstimate(rows2, 'e-MINE')||{}).id;
    /* no id asked for — unchanged legacy path */
    out.noId = (window.pickEstimate(rows2, null)||{}).id;
  }catch(e){ out.err=String(e&&e.message||e); }
  return out;
});
need('4 pickEstimate refuses rather than handing back another client\'s row',
     pick.wrongClient === null,
     pick.missing ? 'pickEstimate not exposed' : (pick.err ? ('threw: '+pick.err) : ('returned ' + JSON.stringify(pick.wrongClient))));
need('5 pickEstimate still finds the row when the id is present', pick.rightRow === 'e-MINE',
     'got ' + pick.rightRow);
need('6 pickEstimate still returns rows[0] when no id was asked for', pick.noId === 'e-A',
     'got ' + pick.noId);

/* ---- 7,8: the shipped source, read rather than assumed ---- */
function blockOf(id){
  const i = APP.indexOf('<script id="' + id + '"');
  if(i === -1) return '';
  const j = APP.indexOf('</script>', i);
  return APP.slice(i, j);
}
const epub = blockOf('cr-epub-script'), e2c = blockOf('cr-e2c-script'), ess = blockOf('cr-ess-script');
/* a raw read of the global at a capture point is the defect; openPreview's
   `currentProject() || window.currentProject` is the correct pattern and is
   deliberately allowed */
function rawCaptures(src){
  return (src.match(/=\s*window\.currentProject\s*;/g) || []).length;
}
need('7a cr-epub no longer captures the global raw', rawCaptures(epub) === 0, rawCaptures(epub) + ' raw capture(s) left');
need('7b cr-e2c no longer captures the global raw', rawCaptures(e2c) === 0, rawCaptures(e2c) + ' raw capture(s) left');
need('7c cr-ess no longer captures the global raw (both Save and Publish)', rawCaptures(ess) === 0, rawCaptures(ess) + ' raw capture(s) left');
need('7d all four sites use the shared resolver',
     (epub.match(/estProjectNow\(\)/g)||[]).length >= 1 &&
     (e2c.match(/estProjectNow\(\)/g)||[]).length >= 1 &&
     (ess.match(/estProjectNow\(\)/g)||[]).length >= 2,
     'epub=' + (epub.match(/estProjectNow\(\)/g)||[]).length +
     ' e2c=' + (e2c.match(/estProjectNow\(\)/g)||[]).length +
     ' ess=' + (ess.match(/estProjectNow\(\)/g)||[]).length);
need('8 both publish paths refuse a null estimate before acting',
     /if\(!est\)\{ alert\(/.test(epub) && /if\(!est\)\{ alert\(/.test(e2c),
     'epub guard=' + /if\(!est\)\{ alert\(/.test(epub) + ' e2c guard=' + /if\(!est\)\{ alert\(/.test(e2c));

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_970 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
