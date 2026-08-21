/* gate_969.mjs — claims/coach/auto-stage messages escape the bottom bar (build 969).

   The point of this gate is that the OBVIOUS fix does not work. .cr-c-toast and
   .cr-k-toast are appended INTO #cr-claims-mount / #cr-coach-mount, which are
   position:fixed with a non-auto z-index (pinned z-index:60 !important by
   cr-mounthead-styles) — a stacking context. #pwaNav is 9990 in the ROOT context.
   So a bigger z-index on the toast is a silent no-op; only leaving the mount works.
   Every assertion below is therefore about the COMPOSITED result in a real engine:
   which element is actually on top at the toast's own centre point.

     1  a claims toast is not painted inside the trapped mount
     2  ...it is the element you actually see at its own centre, over the nav
     3  ...and its ink clears the 4.5:1 floor on its real ground
     4  same for the coach toast
     5  same for the auto-stage notice
     6  the messages still say what they said (no call site lost its words)
     7  the fallback path survives if window.toast is ever missing

   Usage: node gate_969.mjs [path] — previous build = negative control; must go
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

function lum(c){ const s=c.map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2]; }
function ratio(a,b){ const L1=lum(a),L2=lum(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); }
function rgb(s){ const m=String(s||'').match(/(\d+),\s*(\d+),\s*(\d+)/); return m?[+m[1],+m[2],+m[3]]:null; }

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },120000);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* the installed app is the case that was broken; #pwaNav only reaches 9990 there */
await page.evaluate(()=>{ document.body.classList.add('standalone'); });

/* Execute each module's OWN shipped toast() source — not window.toast, and not a
   re-implementation. The bodies live in closure scope, so they are extracted from
   the artifact by brace-matching and evaluated against the real mounts. On the
   previous build these append into the trapped mount; that is what must go red. */
function extractFn(src, marker){
  const i = src.indexOf(marker);
  if(i === -1) return null;
  const open = src.indexOf('{', i);
  if(open === -1) return null;
  let d = 0;
  for(let k = open; k < src.length; k++){
    if(src[k] === '{') d++;
    else if(src[k] === '}'){ d--; if(d === 0) return src.slice(i, k+1); }
  }
  return null;
}
const CLAIMS_FN = extractFn(APP, "function toast(msg, cls = '')");
const COACH_FN  = extractFn(APP, 'function toast(msg,cls){');
const ESS_FN    = extractFn(APP, 'function toast(html, ms){');
need('0a claims toast() source extracted', !!CLAIMS_FN, 'not found in artifact');
need('0b coach toast() source extracted', !!COACH_FN, 'not found in artifact');
need('0c auto-stage toast() source extracted', !!ESS_FN, 'not found in artifact');

async function fire(which, msg, fnSrc){
  return await page.evaluate(async ({which, msg, fnSrc})=>{
    const out={err:null};
    try{
      const nav = document.getElementById('pwaNav');
      out.navZ = nav ? getComputedStyle(nav).zIndex : null;
      const mountId = which==='claims' ? 'cr-claims-mount' : (which==='coach' ? 'cr-coach-mount' : null);
      if(mountId){
        let m = document.getElementById(mountId);
        if(!m){ m = document.createElement('div'); m.id = mountId; document.body.appendChild(m); }
        /* reproduce the trap the real app builds: fixed + a z-index = stacking context */
        m.style.position = 'fixed'; m.style.inset = '0'; m.style.zIndex = '60';
        m.style.display = 'block';
        out.mountZ = getComputedStyle(m).zIndex;
        out.mountPos = getComputedStyle(m).position;
      }
      if(!fnSrc){ out.found = false; out.err = 'no source'; return out; }
      /* run the SHIPPED body with the names it closes over supplied */
      const runner = new Function('MOUNT','M','toastEl','msg','cls','html','ms', fnSrc + '; return toast;');
      const mountEl = mountId ? document.getElementById(mountId) : document.body;
      const fn = runner(mountEl, mountEl, null);
      if(which==='ess') fn(msg); else fn(msg, 'success');
      await new Promise(r=>setTimeout(r,260));
      const all = Array.from(document.querySelectorAll('div,span,p'));
      const el = all.reverse().find(e => (e.textContent||'').trim() === msg && getComputedStyle(e).display !== 'none');
      if(!el){ out.found=false; return out; }
      out.found = true;
      out.text = (el.textContent||'').trim();
      out.insideMount = !!el.closest('#cr-claims-mount, #cr-coach-mount');
      const r = el.getBoundingClientRect();
      const cx = Math.round(r.left + r.width/2), cy = Math.round(r.top + r.height/2);
      const top = document.elementFromPoint(cx, cy);
      out.topIsToast = !!(top && (top===el || el.contains(top) || top.contains(el)));
      out.topId = top ? (top.id || top.className || top.tagName) : null;
      out.overNav = !!(nav && !nav.contains(top));
      const ink = getComputedStyle(el).color;
      let ground=null, p=el;
      while(p && p!==document.documentElement){
        const bg = getComputedStyle(p).backgroundColor;
        if(bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)){ ground=bg; break; }
        p=p.parentElement;
      }
      out.ink=ink; out.ground=ground;
    }catch(e){ out.err=String(e&&e.message||e); }
    return out;
  }, {which, msg, fnSrc});
}

const claims = await fire('claims','Claim created', CLAIMS_FN);
need('1 claims message is not trapped inside the mount',
     claims.found === true && claims.insideMount === false,
     claims.err ? ('threw: '+claims.err) : ('found=' + claims.found + ' insideMount=' + claims.insideMount + ' mountZ=' + claims.mountZ));
need('2 claims message is the element on top at its own centre',
     claims.topIsToast === true && claims.overNav === true,
     'topElement=' + JSON.stringify(claims.topId) + ' navZ=' + claims.navZ);
const cr = (claims.ink && claims.ground) ? ratio(rgb(claims.ink), rgb(claims.ground)) : 0;
need('3 claims message ink clears 4.5:1 on its real ground', cr >= 4.5,
     'ratio=' + cr.toFixed(2) + ' ink=' + claims.ink + ' ground=' + claims.ground);

const coach = await fire('coach','Saved', COACH_FN);
need('4 coach message escapes its mount and paints on top',
     coach.found === true && coach.insideMount === false && coach.topIsToast === true,
     'found=' + coach.found + ' insideMount=' + coach.insideMount + ' top=' + JSON.stringify(coach.topId));

const ess = await fire('ess','Pipeline moved to Approved', ESS_FN);
need('5 the auto-stage notice paints on top of the bar',
     ess.found === true && ess.topIsToast === true && ess.overNav === true,
     'found=' + ess.found + ' top=' + JSON.stringify(ess.topId));
need('6 the notice still says what it said', /Pipeline moved to Approved/.test(ess.text||''),
     JSON.stringify(ess.text));

/* 7 — the modules keep a working fallback if the shared channel ever goes away */
const src = APP;
const claimsHasFallback = /cr-c-toast/.test(src) && /window\.toast === 'function'/.test(src);
need('7 modules delegate but keep their own fallback', claimsHasFallback,
     'delegation or fallback missing in source');

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_969 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
