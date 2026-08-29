/* gate_979.mjs — Punch & Repairs and the Team Directory get the Production
   header (build 979).

   crmNow() names five views. punchView and teamView were not among them, so
   both fell to stickyCrm() and wore whichever portal you had last used —
   measured in Chromium on the 978 tree: the SAME page came up under the
   community green (#047857), the insurance white (#FFFFFF) or the retail steel
   depending only on where you had been.

   The whole risk in this build is the SECOND-ORDER effect, because crmHead()
   feeds three other consumers: goHome()'s destination, portalNow() (which
   drives the burger menu's per-portal sections) and paintCrmPills(). Theo's
   question was literally "or will that break anything", so most of the
   assertions below are about what must NOT move.

     1  the header names both screens Production
     2  ...in a REAL render, across all three portals
     3  the check is LAST in crmHead — an open project and a real CRM view
        still outrank it
     4  data-crm is untouched: the PAGE stays neutral (punch is cross-CRM)
     5  the gold house lands where it landed before, clicked for real
     6  ...and that assertion can FAIL — without the guard, 4 of 6 move
     7  the production header tokens actually exist to be worn
     8  Production is a title the header knows
     9  goHome resolves tool screens through the portal, not to retail
    10  syncPortalSections' own expressions, evaluated at p='production'

   Usage: node gate_979.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash (BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||'SHIPPED';
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

function extractFn(src, marker){
  const i = src.indexOf(marker);
  if(i === -1) return null;
  const o = src.indexOf('{', i);
  if(o === -1) return null;
  let d = 0;
  for(let k=o;k<src.length;k++){
    if(src[k] === '{') d++;
    else if(src[k] === '}'){ d--; if(d === 0) return src.slice(i, k+1); }
  }
  return null;
}
const CRMHEAD = extractFn(APP, 'function crmHead(){');
const GOHOME  = extractFn(APP, 'function goHome(){');
const SYNC    = extractFn(APP, 'function syncPortalSections(){');
need('0a crmHead() found', !!CRMHEAD, 'not found');
need('0b goHome() found', !!GOHOME, 'not found');

/* ---- 3: ORDER matters. The punch/team check must come after both guards, or
   an open community project would be overruled by a hidden view. ---- */
if(CRMHEAD){
  /* ⚠ Anchor on the CODE FORM, never on the bare name. The first hit for
     'stickyCrm()' in this function is my own explanatory COMMENT ("Reaching
     stickyCrm() meant the header wore..."), which reported the fallback as
     coming BEFORE the checks and failed correct code. Fifth time this project
     has paid for that trap; the rule is assert on a form your own prose cannot
     contain. */
  /* ⚠ RIG REPAIR 29 Aug 2026 (triage at build 1121): builds 1104/1116 folded
     the 979 punch/team pair into ONE census — `SHARED_HEAD` + `sharedScreen()`
     — so the two getElementById calls are gone from crmHead by design ("the
     979 pair is folded in here", crmHead's own 1104 comment; gate_1116.mjs
     guards the census). The 979 contract survives unchanged: the shared-screen
     check still sits after crmNow and projopen and before stickyCrm, and both
     ids are still in the census — which is what is asserted now. */
  const iCrmNow  = CRMHEAD.indexOf('var k = crmNow()');
  const iProjopen= CRMHEAD.indexOf("contains('projopen')");
  const iShared  = CRMHEAD.indexOf("if(sharedScreen()) return 'production'");
  const iSticky  = CRMHEAD.indexOf('return stickyCrm()');
  const censusHasBoth = /SHARED_HEAD\s*=\s*\{[\s\S]*?punchView\s*:/.test(APP) &&
                        /SHARED_HEAD\s*=\s*\{[\s\S]*?teamView\s*:/.test(APP);
  need('3 the punch/team check is last — projopen and a real CRM view still win',
       iShared > -1 && censusHasBoth && iCrmNow < iShared && iProjopen < iShared &&
       iShared < iSticky,
       'order in crmHead: crmNow@'+iCrmNow+' projopen@'+iProjopen+
       ' sharedScreen@'+iShared+' stickyCrm@'+iSticky+
       ' censusHasPunch+Team='+censusHasBoth);
} else need('3 the punch/team check is last', false, 'crmHead not found');

/* ---- 9: goHome must resolve tool screens through the portal ---- */
need('9 goHome sends tool screens through the portal, not to retail',
     !!GOHOME && /crm === 'production'/.test(GOHOME) && /crm === 'sales'/.test(GOHOME) &&
     /stickyCrm\(\)/.test(GOHOME),
     GOHOME ? 'goHome has no tool-screen branch — home would jump to retail' : 'goHome not found');

/* ---- 7,8: the things being worn must exist ---- */
need('7 the production header tokens exist',
     /body\[data-crm-head="production"\]\s*\.site\s*\{/.test(APP) &&
     /body\[data-crm-head="production"\]\s*#cr-hd2-ribbon\s*\{/.test(APP),
     'no production .site or ribbon rule to wear');
need('8 Production is a title the header knows',
     /production:\s*'Production'/.test(APP),
     'TITLES has no production entry');

/* ---- 10: syncPortalSections at p="production", from its OWN expressions ---- */
if(SYNC){
  /* ⚠ [^)]*? cannot cross a paren, and sell's expression is
     !(p === 'retail' || p === 'sales') — the regex version returned null for it
     and the gate read a PARSE FAILURE as a behaviour failure. Walk the parens
     instead: find setSectionHidden(, match to its close, take the argument
     after the top-level comma. */
  const dec = (key) => {
    const marker = "setSectionHidden(";
    let at = -1;
    for(let i = SYNC.indexOf(marker); i !== -1; i = SYNC.indexOf(marker, i + 1)){
      const head = SYNC.slice(i, i + marker.length + 40);
      if(head.indexOf("'" + key + "'") !== -1){ at = i; break; }
    }
    if(at === -1) return null;
    let d = 0, comma = -1, end = -1;
    for(let k = at + marker.length - 1; k < SYNC.length; k++){
      const c = SYNC[k];
      if(c === '(') d++;
      else if(c === ')'){ d--; if(d === 0){ end = k; break; } }
      else if(c === ',' && d === 1 && comma === -1) comma = k;
    }
    if(comma === -1 || end === -1) return null;
    const expr = SYNC.slice(comma + 1, end).trim();
    try{ return new Function('p', 'return (' + expr + ');')('production'); }
    catch(e){ return 'threw on ' + JSON.stringify(expr) + ': ' + e.message; }
  };
  const sell = dec('sell'), prod = dec('prodboard'), bid = dec('newbid'), sol = dec('sol');
  need('10 the burger menu goes Production-shaped on these screens',
       prod === false && sell === true && bid === true && sol === true,
       'hidden at p=production -> prodboard:' + prod + ' sell:' + sell +
       ' newbid:' + bid + ' sol:' + sol + '  (prodboard must be false = shown)');
} else need('10 the burger menu goes Production-shaped', false, 'syncPortalSections not found');

/* ---- the real renders ---- */
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },180000);

async function drive(appText){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:appText});
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2200);
  const rows=[];
  for (const portal of ['community','insurance','retail']){
    for (const v of ['punch','team']){
      rows.push(await page.evaluate(async ({portal,v})=>{
        try{ if(window.CardinalPortal && window.CardinalPortal.set) window.CardinalPortal.set(portal); }catch(e){}
        if(v==='punch' && typeof window.openPunchView==='function'){ await window.openPunchView(); }
        else { if(typeof hideAllViews==='function') hideAllViews();
               var tv=document.getElementById('teamView'); if(tv) tv.style.display='block'; }
        document.body.appendChild(document.createComment('x'));
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        await new Promise(r=>setTimeout(r,350));
        const site=document.querySelector('header.site'), cs=site?getComputedStyle(site):null;
        const head=document.body.dataset.crmHead, crm=document.body.dataset.crm;
        const title=(document.querySelector('#brandTitle h1')||{}).textContent;
        const hbg=cs?cs.getPropertyValue('--hbg').trim():null;
        /* click the REAL gold house with the three destinations spied — goHome
           is module-scoped, so re-deriving its mapping would test nothing. */
        let landed='none';
        const rH=window.showHome, rT=window.showCardinalTruth;
        const hub=window.CardinalCommunityHub, rS=hub&&hub.show;
        window.showHome=function(){ landed='retail-home'; };
        window.showCardinalTruth=function(){ landed='insurance-hub'; };
        if(hub) hub.show=function(){ landed='community-hub'; };
        const btn=document.getElementById('cr-hd2-home');
        if(!btn) landed='no-home-button'; else btn.click();
        await new Promise(r=>setTimeout(r,200));
        window.showHome=rH; window.showCardinalTruth=rT; if(hub) hub.show=rS;
        return { portal, v, head, crm, title, hbg, landed };
      },{portal,v}));
    }
  }
  await page.close();
  return rows;
}

const now = await drive(APP);
const bad2 = now.filter(r => r.head !== 'production');
need('1 the header names both screens Production',
     bad2.length === 0,
     'still portal-coloured on: ' + bad2.map(r=>r.portal+'/'+r.v+'='+r.head).join(', '));
/* ⚠ RIG REPAIR 29 Aug 2026 (triage at build 1121): build 1116 — Theo's pick,
   quoted in the log ("can we get rid of the word production on just the
   screens that are not productions?") — made a shared screen name ITSELF while
   still wearing the production chrome. SHARED_HEAD says punchView:'Punch',
   teamView:'Team'. The chrome check (--hbg) is unchanged. */
const TITLE_WANT = { punch:'Punch', team:'Team' };
const badTitle = now.filter(r => String(r.title||'').trim() !== TITLE_WANT[r.v]);
const badBg = now.filter(r => r.hbg !== '#181b20');
need('2 ...and really renders the production chrome, all three portals',
     badTitle.length === 0 && badBg.length === 0,
     'title wrong on ' + badTitle.length + ' (saw ' +
     [...new Set(now.map(r=>r.v+'="'+String(r.title||'').trim()+'"'))].join(' / ') +
     '), --hbg wrong on ' + badBg.length +
     ' (saw ' + [...new Set(now.map(r=>r.hbg))].join(' / ') + ')');
const badCrm = now.filter(r => r.crm === 'production');
need('4 data-crm untouched — the PAGE stays neutral, punch is cross-CRM',
     badCrm.length === 0,
     'page ground went production on: ' + badCrm.map(r=>r.portal+'/'+r.v).join(', '));

/* ---- 5,6: home must not move — and the check must be able to fail ---- */
const expected = { community:'community-hub', insurance:'insurance-hub', retail:'retail-home' };
const moved = now.filter(r => r.landed !== expected[r.portal]);
need('5 the gold house lands where it always did, clicked for real',
     moved.length === 0,
     'moved: ' + moved.map(r=>r.portal+'/'+r.v+' -> '+r.landed).join(', '));

/* Build the same artifact WITHOUT the goHome guard and prove assertion 5 goes
   red on it. A check that cannot fail is worse than no check. */
const GUARD = "if(crm === 'production' || crm === 'sales') crm = stickyCrm();";
if(APP.indexOf(GUARD) !== -1){
  const d = mkdtempSync(join(tmpdir(),'g979-'));
  const p = join(d,'noguard.html');
  writeFileSync(p, APP.replace(GUARD,'/* guard removed for the negative control */'));
  const без = await drive(readFileSync(p,'utf8'));
  const brokeN = без.filter(r => r.landed !== expected[r.portal]).length;
  need('6 ...and that check CAN fail — pull the guard and home moves',
       brokeN >= 4,
       'without the goHome guard only ' + brokeN + ' destination(s) moved; ' +
       'expected at least 4, so assertion 5 proves nothing');
} else {
  need('6 ...and that check CAN fail — pull the guard and home moves',
       false, 'the goHome guard is absent, so the self-control could not be built');
}

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_979 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
