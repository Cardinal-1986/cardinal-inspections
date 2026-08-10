/* Build 679 — four defects Theo hit in one sitting.

   EXECUTES the shipped code. Each function under test is sliced out of the
   artifact by brace-matching and run with mocks, so nothing here is a
   re-implementation and pointing it at 678 genuinely tests 678.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_679.js [index.html]
   Point it at 678 as the negative control — must go red.                   */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* a named function, brace-matched out of the file (or out of one block) */
function fnText(name, hay) {
  const s = hay === undefined ? SRC : hay;
  let i = s.indexOf('async function ' + name + '(');
  if (i < 0) i = s.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0, j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) {
    if (s[k] === '{') d++;
    else if (s[k] === '}') { d--; if (d === 0) return s.slice(i, k + 1); }
  }
  return null;
}
const block = id => {
  const a = SRC.indexOf('<script id="' + id + '">');
  return a < 0 ? '' : SRC.slice(a, SRC.indexOf('</script>', a));
};
const CC = block('cr-cc-script');
const CTH = block('cr-cth-script');

/* ── P1 · the Supplement Desk is reachable ─────────────────────────────── */
console.log('── P1 · the Supplement Desk has a door ──');
{
  /* The bug was structural: the card lived in the STATIC .ins-grid, and the
     hub's render() does host.innerHTML on .ins-body — which CONTAINS that grid.
     So assert on the DYNAMIC grid, which is the only one that survives. */
  const host = /host\s*=\s*document\.querySelector\('#cardinalTruthView \.ins-body'\)/.test(CTH);
  ok('the hub still renders into .ins-body (the container that wipes the static grid)', host);
  ok('the Desk is in the DYNAMIC Tools grid', /data-go="desk"/.test(CTH),
    'not found in cr-cth-script');
  ok('…and it is wired to a destination', /d === 'desk'/.test(CTH));
  ok('…which navigates rather than opening a tab an installed app does not have',
    /d === 'desk'[\s\S]{0,200}?location\.href\s*=\s*'\/supplement\.html'/.test(CTH),
    'must be location.href, not window.open');
  ok('…and it does NOT use window.open, which is what blanks an installed PWA',
    !/d === 'desk'[\s\S]{0,200}?window\.open/.test(CTH));

  /* the static card may stay — it is harmless — but it must not be the ONLY one */
  const staticCard = (SRC.match(/href="\/supplement\.html"/g) || []).length;
  ok('there is at least one supplement.html reference outside the dead static grid',
    /data-go="desk"/.test(CTH), staticCard + ' href(s) in markup');
}

/* ── P2 · the job name stops following you ─────────────────────────────── */
console.log('\n── P2 · leaving a job clears the job name ──');
{
  const setFn = fnText('setHeaderJobMenu');
  ok('setHeaderJobMenu() was found', !!setFn);
  if (setFn) {
    /* EXECUTE it. Reading for the strings would pass on a function that never
       runs the branch. */
    const dom = new JSDOM('<!doctype html><body>' +
      '<span id="headCtx"><small>1042:</small> Willie Parson — ReBuild</span>' +
      '<span id="cbCtx"><small>1042:</small> Willie Parson — ReBuild</span>' +
      '<select id="jobMenuSel"></select><button id="navBtn"></button><div id="navWrap"></div>' +
      '</body>');
    const w = dom.window;
    const run = new w.Function('document', 'setTimeout', 'fixHeadPad',
      setFn + '; return setHeaderJobMenu;')(w.document, () => {}, () => {});

    run(true);
    ok('opening a job sets body.projopen', w.document.body.classList.contains('projopen'));
    const stillThere = w.document.getElementById('cbCtx').textContent.trim();
    ok('…and does not wipe the name it just wrote', /Willie Parson/.test(stillThere), stillThere);

    run(false);
    ok('LEAVING a job drops body.projopen', !w.document.body.classList.contains('projopen'));
    ok('…and clears the ribbon name — the one Theo saw follow him',
      w.document.getElementById('cbCtx').innerHTML === '',
      JSON.stringify(w.document.getElementById('cbCtx').innerHTML));
    ok('…and clears its twin too, so the two can never disagree again',
      w.document.getElementById('headCtx').innerHTML === '',
      JSON.stringify(w.document.getElementById('headCtx').innerHTML));
  }

  /* the three hub navigations that skipped the teardown entirely */
  for (const nav of ['showCardinalTruth', 'showInsuranceClients', 'showResourceLibrary']) {
    const t = fnText(nav);
    ok(nav + '() now runs the job-context teardown',
      !!t && /setHeaderJobMenu\(false\)/.test(t),
      t ? 'no setHeaderJobMenu(false)' : 'function not found');
  }
}

/* ── P3 · the map ──────────────────────────────────────────────────────── */
console.log('\n── P3 · the map is a link, and an unfindable address says so ──');
{
  const paint = fnText('dbPaintMap');
  ok('dbPaintMap() was found', !!paint);
  if (paint) {
    /* NOT `!/window\.open/` — that was the first draft and it went red on the
       COMMENT explaining the removal, which is this project's comment-pollution
       trap in the flattering direction reversed. Assert the BEHAVIOUR: there is
       no onclick HANDLER any more, and the old one is explicitly nulled so a
       re-render cannot leave a stale closure behind. */
    ok('the map has no click handler at all — a handler is what blanked the app',
      !/el\.onclick\s*=\s*function/.test(paint) && /el\.onclick\s*=\s*null/.test(paint),
      'onclick=function present, or onclick=null missing');
    ok('…it is a real anchor, which is what iOS honours from a tap',
      /<a href="[\s\S]{0,80}target="_blank"/.test(paint) && /rel="noopener"/.test(paint));

    /* EXECUTE the address heuristic against the two real addresses */
    const warn = fnText('addrLooksIncomplete');
    ok('addrLooksIncomplete() was found', !!warn);
    if (warn) {
      const f = new Function(warn + '; return addrLooksIncomplete;')();
      ok('Kimberly Lawson\'s real address is flagged — no city, state or ZIP',
        f('1049 Cicillion Ave') === true);
      ok('Willie Parson\'s real address is NOT flagged',
        f('2408 Lakeview Ave, Dayton, OH 45417, USA') === false);
      ok('Adam Gunn\'s real address is NOT flagged',
        f('9222 Arlington Rd, Brookville, OH 45309, USA') === false);
      ok('a bare ZIP is enough to find it', f('1049 Cicillion Ave 45417') === false);
      ok('an empty address is flagged', f('') === true && f(null) === true);
    }
    const wh = fnText('addrWarnHtml');
    ok('the warning is a NOTE BESIDE the map, not a replacement for it',
      !!wh && /axnote/.test(wh) && !/return\s+''\s*;\s*\}$/.test(paint),
      'the map must still render — hiding it removes the evidence');
  }
}

/* ── P4 · a way out of a community card ────────────────────────────────── */
console.log('\n── P4 · a community card is no longer a one-way door ──');
{
  ok('the card renders a way back', /data-cc-out/.test(CC));
  ok('…and it is WIRED — not drawn and dead (BUG_CLASSES 16)',
    /function wireOut\(/.test(CC) && /\n\s*wireOut\(\);/.test(CC),
    'defined=' + /function wireOut\(/.test(CC) + ' called=' + /\n\s*wireOut\(\);/.test(CC));

  const wo = fnText('wireOut', CC);
  ok('wireOut() was found in the community block', !!wo);
  if (wo) {
    /* EXECUTE it: does the tap actually reach the hub? */
    const dom = new JSDOM('<!doctype html><body><div id="cr-cc">' +
      '<button data-cc-out="1">‹ Community</button></div></body>');
    const w = dom.window;
    let wentTo = null;
    const hub = { show: () => { wentTo = 'hub'; } };
    const f = new w.Function('document', 'window', wo + '; return wireOut;')(w.document, { CardinalCommunityHub: hub });
    f();
    w.document.querySelector('[data-cc-out]').click();
    ok('tapping it opens the Community hub', wentTo === 'hub', String(wentTo));

    /* and if the hub module is missing, it must not dead-end */
    let home = null;
    const f2 = new w.Function('document', 'window', wo + '; return wireOut;')(
      w.document, { showHome: () => { home = 'home'; } });
    f2();
    w.document.querySelector('[data-cc-out]').click();
    ok('…and falls back to Home rather than doing nothing', home === 'home', String(home));
  }
  ok('the control is a real 44px target — this is used on a phone',
    /#cr-cc \.cc-out\{[^}]*min-height:44px/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
