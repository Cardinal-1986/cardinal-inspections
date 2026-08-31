/* Build 625 — the vision host gate, BOTH BRANCHES.
   A gate that only ever hides is as wrong as one that only ever shows, and
   app.cardinalroster.com is the branch nobody would notice breaking. So every
   assertion is made twice: once with ?vision=1, once without.

   showMain() lives in the main unnamed block and cannot be sliced out by id,
   so this executes the SHIPPED function text rather than a re-implementation —
   the repo's "extract the shipped function and run it" recipe. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const html = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, note) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (note !== undefined ? '  → ' + note : '')); } };

/* ---- pull the two shipped pieces out by brace-matching, not by regex ---- */
function fnText(src, header) {
  const i = src.indexOf(header);
  if (i === -1) return null;
  let d = 0, started = false;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') { d++; started = true; }
    else if (src[k] === '}') { d--; if (started && d === 0) return src.slice(i, k + 1); }
  }
  return null;
}
const showMain = fnText(html, 'function showMain(userEmail){');
const isVision = fnText(html, 'function isVisionHost(){');

console.log('\n── the shipped source ──');
ok('showMain() extracted', !!showMain);
ok('isVisionHost() extracted', !!isVision);
ok('isVisionHost is exported on the EXISTING CardinalLanding object',
  /isVisionHost\s*:\s*isVisionHost\s*,/.test(html));
ok('no second window.Cardinal* export was invented',
  (html.match(/window\.CardinalLanding\s*=\s*\{/g) || []).length === 1);
ok('showMain asks the gate defensively (falls back to CRM, the safe direction)',
  /window\.CardinalLanding\s*&&\s*window\.CardinalLanding\.isVisionHost/.test(showMain));

/* ---- run it, both ways ---- */
function run({ vision }) {
  const dom = new JSDOM(
    `<!doctype html><html><body>
       <header class="site"></header>
       <div id="restoreVeil"></div>
       <div id="loginView" class="open"></div>
       <div id="mainView"></div>
       <button id="addProjBtn"></button>
       <span id="navWrap"></span>
       <div id="backupNav"></div><div id="auditNav"></div><div id="teamNav"></div>
       <div id="landingView"></div>
       <div class="cbi" data-go="whatsnew"></div>
       <div id="newMenu"><div data-new="lead"></div></div>
       <span id="whoami"></span>
       <div id="storageNote"></div>
       <div id="bannerMount"></div>
       <button id="signOutBtn"></button>
     </body></html>`,
    { runScripts: 'outside-only', pretendToBeVisual: true,
      url: vision ? 'https://app.cardinalroster.com/?vision=1'
                  : 'https://app.cardinalroster.com/' });
  const w = dom.window, d = w.document;

  // the collaborators showMain touches, stubbed so it can run standalone
  Object.assign(w, {
    fixHeadPad(){}, auditStart(){}, showLanding(){}, hideAllViews(){},
    renderHome(){}, renderHero(){}, renderCalendar(){},
    displayNameFor: () => 'Theo', currentUser: { email: 'theo@cardinalrenovations.net' },
    ADMIN_EMAILS: ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net'],
    PRODUCTION_EMAILS: ['curtis@cardinalrenovations.net'],
    TEAM: null,
    loginView: d.getElementById('loginView'),
    mainView:  d.getElementById('mainView'),
    addProjBtn: d.getElementById('addProjBtn'),
    whoami: d.getElementById('whoami'),
    storageNote: d.getElementById('storageNote'),
    signOutBtn:  d.getElementById('signOutBtn'),
    localBannerHTML: () => '',
    reload(){},
  });
  // the real gate, verbatim, plus the real showMain
  w.eval(isVision + '\nwindow.CardinalLanding = { isVisionHost: isVisionHost };');
  w.eval(showMain);
  try { w.showMain('theo@cardinalrenovations.net'); } catch (e) { return { err: String(e) }; }

  const disp = id => d.getElementById(id).style.display;
  return {
    header: d.querySelector('header.site').style.display,
    addProj: disp('addProjBtn'), navWrap: disp('navWrap'),
    backup: disp('backupNav'), audit: disp('auditNav'), team: disp('teamNav'),
    main: disp('mainView'),
  };
}

console.log('\n── showroom.* / ?vision=1 : the CRM shell must be GONE ──');
const v = run({ vision: true });
ok('showMain ran without throwing', !v.err, v.err);
ok('site header hidden',        v.header === 'none', v.header);
ok('Add-project button hidden', v.addProj === 'none', v.addProj);
ok('nav strip hidden',          v.navWrap === 'none', v.navWrap);
ok('backup nav hidden',         v.backup === 'none', v.backup);
ok('audit nav hidden',          v.audit === 'none', v.audit);
ok('team nav hidden (mirrors audit, so it follows for free)', v.team === 'none', v.team);
ok('the app itself still shows — this hides chrome, not the page',
  v.main === 'block', v.main);

console.log('\n── app.cardinalroster.com : NOTHING may change ──');
const a = run({ vision: false });
ok('showMain ran without throwing', !a.err, a.err);
ok('site header shown',        a.header === '', JSON.stringify(a.header));
ok('Add-project button shown', a.addProj === 'inline-block', a.addProj);
ok('nav strip shown',          a.navWrap === 'inline-block', a.navWrap);
ok('backup nav shown for an admin', a.backup === 'block', a.backup);
ok('audit nav shown for Theo',      a.audit === 'block', a.audit);
ok('team nav mirrors audit',        a.team === a.audit, a.team);

console.log('\n── the iOS font-boost fix ──');
/* ⚠ MODULE TEXT COMES FROM module_source.cjs, NOT FROM A BLOCK SLICE.
   This gate used to cut its module out of index.html by `<style id="cr-occ-styles">`.
   That stops working the instant the module becomes an external file, which is
   what the Showroom relocation does — and it stops working SILENTLY, handing
   the gate an empty string so every assertion fails for a reason the output
   never names. The resolver finds the module inline today and in the file it is
   relocated to tomorrow, and returns byte-identical text either way. */
/* includeOpenTag: this slice deliberately started AT the tag, not after it. */
const MS = require('./module_source.cjs');
const occ = MS.moduleText(html, 'colors.css', { htmlPath: FILE, missing: 'throw', includeOpenTag: true });
ok('#cr-occ declares text-size-adjust',
  /\n\s*-webkit-text-size-adjust:100%;\n\s*text-size-adjust:100%;/.test(occ));
ok('and it is scoped — exactly 2 declarations in the whole file, both here',
  (html.match(/(?<![\w-])(?:-webkit-)?text-size-adjust\s*:/g) || []).length === 2);
ok('no [data-style="feature"] .occ-title rule was added (the CSS was never the cause)',
  !/\[data-style="feature"\][^{]*\.occ-title/.test(occ));

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
