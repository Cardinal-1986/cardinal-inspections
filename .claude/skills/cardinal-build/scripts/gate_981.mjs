/* gate_981.mjs — one job menu (build 981).

   The community card's job menu was a DOM screen-scrape of #jaGrid — the Job
   Activity grid Keeper retired at build 348, which #tab-overview paints out
   with display:none on every profile. Nobody could see the original, so nobody
   could see the copy had gone stale: "Contracts" opened the Estimates tab
   because the dead tile carries data-ja="estimates", "Appointments" opened the
   company Schedule Board, and 9 of 10 labels still carried the pre-686 emoji.

   ⚠ The obvious fix — MOVE the live .ja-menu into the card, the way
   adoptLocation() moves the map — was tested and REJECTED before this build was
   designed: the next renderOverview() rebuilds .ja-menu in #acxMount while the
   adopted copy sits in #cr-cc, duplicating four ids that async count-fills
   reach by getElementById. Measured: 1 -> 2, and it does not self-heal.

     1  the mirror reads the LIVE menu, not the retired grid
     2  ...and carries the ACT string, not an array index
     3  the dispatch re-queries at click time (the captured list went stale)
     4  Checklists is on the ONE shared menu (Theo's A1) — not forked
     5  the showTab wrapper exists, and suspend/resume EXTEND the existing
        export rather than adding a 95th window.Cardinal* name
     6  DRIVE: the mirror gains the live entries, drawn icons, and zero emoji
     7  DRIVE: the four inert header controls work on a community job
     8  DRIVE: the count badge clears 4.5:1 in BOTH themes
     9  the 348 grid is NOT deleted — four other references still need it

   Usage: node gate_981.mjs [path] — previous build = negative control; must go
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
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

let fails=[], passes=0;
function need(n, ok, d){ if(ok){passes++;} else fails.push(n+(d?' — '+d:'')); }
const blockOf = id => { const i=APP.indexOf('<script id="'+id+'"'); if(i===-1) return ''; return APP.slice(APP.indexOf('>',i)+1, APP.indexOf('</script>',i)); };
const CC = blockOf('cr-cc-script');
need('0 cr-cc-script found', !!CC, 'missing');

need('1 the mirror reads the LIVE menu, not the retired grid',
     /querySelectorAll\('#acxMount \.ja-menu \.jabox'\)/.test(CC) &&
     !/querySelectorAll\('#jaGrid \.jatile'\)/.test(CC),
     /#jaGrid \.jatile/.test(CC) ? 'still scraping #jaGrid' : 'the .ja-menu query is absent');
need('2 the mirror carries the ACT string, not an index',
     /data-jm="' \+ esc\(act\)/.test(CC) && /\.querySelector\('\.jbl'\)/.test(CC) && /\.querySelector\('\.jan'\)/.test(CC),
     'label/count still read the legacy .jn shape, or data-jm is still an index');
need('3 the dispatch re-queries at click time',
     /\.jabox\[data-jm="' \+ t\.dataset\.jm/.test(CC) && !/boxes\[Number\(t\.dataset\.jm\)\]/.test(CC),
     'still indexing a captured node list');
/* ⚠ RIG REPAIR 29 Aug 2026 (triage at build 1121): the assertion had pinned the
   tile's ICON key (dbIc('tasks')), which is incidental to the contract. Builds
   1080–1082 ("a menu you can read", PR #503) gave Checklists its own icon —
   dbIc('checklist') — because Tasks, Punch Outs and Checklists shared one
   clipboard (the comment beside the tile says so). The contract — the
   Checklists tile lives on the ONE shared menu and routes to 'checklists' —
   is unchanged; only the icon argument is left free. */
need('4 Checklists is on the ONE shared menu (A1)',
     /jt\(dbIc\('[a-z_-]+'\), 'Checklists', '', 'checklists'\)/.test(APP),
     'the Checklists tile is not on .ja-menu — re-pointing loses that door');
const exportBlock = (CC.match(/window\.CardinalCommunityJob\s*=\s*\{[\s\S]*?\};/) || [''])[0];
need('5 showTab is wrapped, and suspend/resume EXTEND the existing export',
     /var _showTab981 = window\.showTab/.test(CC) &&
     /suspend\s*:\s*suspendForTab/.test(exportBlock) && /resume\s*:\s*resumeFromTab/.test(exportBlock),
     !/_showTab981/.test(CC) ? 'no showTab wrapper' : 'suspend/resume are not on CardinalCommunityJob');
/* ⚠ 993: this assertion was STALE and had been red on main since 986.
   As written at 981 it required `id="jaGrid"` to still be PRESENT, because at
   that time 5 of the grid's 11 references were functional and deleting the
   markup would have orphaned them. Build 986 then retired the grid properly —
   markup, writer and router all went, and the anchor moved to #acxMount — so
   the assertion has been asserting the opposite of the shipped truth ever
   since, and nobody looked. Fix the gate when the gate is wrong; never bend
   the artifact back to satisfy an old assumption.

   Re-measured on the shipped file: 7 occurrences of the string, and ALL SEVEN
   ARE PROSE — module banners explaining the retirement. Asserted on the
   FUNCTIONAL forms rather than the bare name, because a comment that quotes
   the identifier it documents is exactly what breaks a file-wide count. The
   two `#jaGrid [data-ja=...]` hits are inside backticks in those comments. */
need('9 the retired grid is GONE — no markup, no lookup, only prose',
     !/id="jaGrid"/.test(APP) && !/getElementById\('jaGrid'\)/.test(APP) &&
     !/querySelector(?:All)?\(\s*['"`][^'"`]*#jaGrid/.test(APP),
     'a functional #jaGrid reference is back — 986 retired it and the anchor is #acxMount');

/* ── the drive: a REAL community job, both themes ─────────────────────────── */
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },150000);
const page=await browser.newPage({viewport:{width:1194,height:900}});
const perr=[]; page.on('pageerror',e=>perr.push(String(e.message)));
await page.route('**/*', r=>{const u=r.request().url(), rt=r.request().resourceType();
  if(u.startsWith('https://sentinel.test/') && /sentinel\.test\/?(\?|$)/.test(u))
    return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(rt==='image') return r.fulfill({status:200,contentType:'image/png',body:PNG});
  return r.fulfill({status:200,contentType:'text/plain',body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2400);

const drive = await page.evaluate(async ()=>{
  const res={};
  const cache=window.cacheProjects||[];
  const isC = pr => { try{ const ck=typeof pr.checklist==='string'?JSON.parse(pr.checklist):pr.checklist||{};
    return ((ck.lead||{}).claim_type)==='community'; }catch(e){ return false; } };
  /* ⚠ the mock seeds NO community job, so #cr-cc never mounts and the mirror is
     never built — a drive against a retail job would pass vacuously and prove
     nothing about this build. Seed one. */
  let target = cache.find(isC);
  if(!target && cache.length){
    target = cache[0];
    const ck=(typeof target.checklist==='string')?JSON.parse(target.checklist||'{}'):(target.checklist||{});
    ck.lead=Object.assign({}, ck.lead||{}, {claim_type:'community', partner_name:'Habitat for Humanity'});
    target.checklist=JSON.stringify(ck);
  }
  if(!target){ res.err='no projects in the harness'; return res; }
  if(typeof window.openProject==='function') await window.openProject(target.id);
  await new Promise(r=>setTimeout(r,2200));
  const lv=document.getElementById('landingView'); if(lv) lv.style.display='none';
  await new Promise(r=>setTimeout(r,900));

  const jm=document.getElementById('cr-cc-jm');
  res.mounted=!!jm;
  if(jm){
    const b=Array.from(jm.querySelectorAll('.cc-jmb'));
    res.count=b.length;
    res.withIcon=b.filter(x=>x.querySelector('svg')).length;
    res.emoji=b.filter(x=>/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(x.textContent)).length;
    res.acts=b.map(x=>x.getAttribute('data-jm'));
  }
  res.live=document.querySelectorAll('#acxMount .ja-menu .jabox').length;

  /* the four controls that rendered, updated themselves and did nothing */
  res.tabs={};
  for(const n of ['contracts','workorders','measure','commissions']){
    try{ window.showTab(n); }catch(e){ res.tabs[n]='threw'; continue; }
    await new Promise(r=>setTimeout(r,420));
    const t=document.getElementById('tab-'+n);
    res.tabs[n] = !t ? 'absent' : ((t.offsetParent!==null && t.getClientRects().length) ? 'visible' : 'hidden');
  }
  /* D1: we are SUSPENDED now (a tab is showing). Overview must bring the card
     back. ⚠ This only discriminates from a suspended state — asserted from a
     fresh card it passes trivially. */
  res.wasSuspended = res.tabs.contracts === 'visible';
  try{ window.showTab('overview'); }catch(e){}
  await new Promise(r=>setTimeout(r,700));
  const cc=document.getElementById('cr-cc');
  res.overviewRestores = cc ? (cc.offsetParent!==null) : false;

  /* the count badge, both themes, against the ground it really composites on */
  function lum(c){const s=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
    return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];}
  function ratio(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
  function rgb(s){const m=String(s||'').match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);return m?[+m[1],+m[2],+m[3]]:null;}
  res.badge={};
  for(const th of ['dark','light']){
    if(th==='light') document.documentElement.setAttribute('data-theme','rb-light');
    else document.documentElement.removeAttribute('data-theme');
    await new Promise(r=>setTimeout(r,220));
    const n=document.querySelector('#cr-cc .cc-jmb .n');
    if(!n){ res.badge[th]='no badge element'; continue; }
    const ink=rgb(getComputedStyle(n).color);
    let el=n, ground=null;
    while(el && !ground){ const bg=rgb(getComputedStyle(el).backgroundColor);
      const a=parseFloat((String(getComputedStyle(el).backgroundColor).match(/[\d.]+\)$/)||['1'])[0]);
      if(bg && a>0.9) ground=bg; el=el.parentElement; }
    res.badge[th] = (ink&&ground) ? +ratio(ink,ground).toFixed(2) : 'unmeasurable';
  }
  document.documentElement.removeAttribute('data-theme');
  return res;
});
clearTimeout(watchdog);
await browser.close();

need('6a the community card mounted (otherwise this drive proves nothing)',
     !!drive.mounted, drive.err || 'no #cr-cc-jm — the seed did not take');
need('6 the mirror gains the live entries, drawn icons and zero emoji',
     drive.count >= 14 && drive.withIcon >= 13 && drive.emoji === 0,
     'buttons ' + drive.count + ', with icon ' + drive.withIcon + ', carrying emoji ' + drive.emoji);
const t = drive.tabs || {};
const working = ['contracts','workorders','measure','commissions'].filter(k => t[k] === 'visible');
need('7 the four inert header controls work on a community job',
     working.length === 4,
     'still not opening: ' + ['contracts','workorders','measure','commissions']
       .filter(k => t[k] !== 'visible').map(k => k+'='+t[k]).join(', '));
need('7b ...and Overview brings the black card back from a suspended state',
     drive.wasSuspended && drive.overviewRestores,
     drive.wasSuspended ? 'the card did not return' : 'never suspended, so this proved nothing');
const bd = drive.badge || {};
need('8 the count badge clears 4.5:1 in BOTH themes',
     typeof bd.dark === 'number' && typeof bd.light === 'number' && bd.dark >= 4.5 && bd.light >= 4.5,
     'dark ' + bd.dark + ':1, light ' + bd.light + ':1');
need('6b no page errors during the drive', perr.length === 0, perr.slice(0,2).join(' | '));

console.log('\ngate_981 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
