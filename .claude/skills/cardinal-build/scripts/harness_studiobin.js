/* Build 632 — the Archive button was never wired, and binning several sites.

   THE BUG THIS EXISTS TO PREVENT COMING BACK:
   setupMode() returned inside its isShowroomHost() branch, BEFORE any
   addEventListener ran. On a showroom host, Archive site / Restore site / the
   lens switcher were drawn and dead. archived_at was NULL on all 60,503 rows —
   the click had never once reached the database.

   Every static assertion below is worth less than the jsdom section at the
   bottom, which EXECUTES the shipped setupMode under both hostnames and asks
   the DOM whether a listener is attached. A regex can be satisfied by code that
   still never runs; that is exactly how this shipped.

   Usage: node harness_studiobin.js [studio.html] */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/studio.html';
const STU = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* Brace-match rather than slicing to the next landmark — a slice that runs past
   the function sweeps up neighbours and fails correct code (class 15). */
const body = (src, sig) => {
  const i = src.indexOf(sig); if (i === -1) return '';
  let d = 0; const j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  return '';
};

console.log('\n── the wiring: the showroom branch must not skip it ──');
const setup = body(STU, 'function setupMode()');
ok('setupMode was found and brace-matched', setup.length > 200, setup.length + ' chars');
const branch = setup.slice(setup.indexOf('if(isShowroomHost()){'),
                           setup.indexOf('\n    }else{'));
ok('the showroom branch contains NO return — that was the whole bug',
  branch.length > 40 && !/return/.test(branch), branch.replace(/\s+/g, ' ').slice(0, 110));
ok('625s intent survives: the mode is still forced and the toggle still hidden',
  /st\.mode = 'work';/.test(branch) && /box\.style\.display = 'none';/.test(branch));
ok('the wiring sits AFTER the modeWired guard, so it runs on every host',
  setup.indexOf('if(modeWired) return;') < setup.indexOf("getElementById('stuArchive')"));
ok('all three previously-dead controls are wired in that block',
  /getElementById\('atlLens'\)\.addEventListener/.test(setup) &&
  /getElementById\('stuArchive'\)\.addEventListener/.test(setup) &&
  /getElementById\('stuRestore'\)\.addEventListener/.test(setup));

console.log('\n── the silent no-op: an update that matches nothing ──');
const sa = body(STU, 'async function setArchived');
/* A PostgREST update matching zero rows SUCCEEDS. Checking only res.error made a
   no-op indistinguishable from success — which is how the unwired button
   presented as "nothing happens" rather than as an error. */
ok('the ids are selected back, so the row count can be checked',
  /await upd\.select\('id'\)/.test(sa));
ok('an empty result is reported, not swallowed',
  /if\(!res\.data \|\| !res\.data\.length\)/.test(sa) && /Nothing was archived/.test(sa));
ok('it names the address that matched nothing',
  /no photos matched ' \+ address/.test(sa));
ok('it guards its client, like every other writer in this file',
  /if\(!sb \|\| !address\) return false;/.test(sa));

console.log('\n── bin several: one pipeline, not a second query ──');
const bulk = body(STU, 'async function bulkArchive');
ok('bulk reuses setArchived per site', /setArchived\(list\[i\], on, true\)/.test(bulk));
/* A single .in('project_address', [...]) would be fewer round trips and a SECOND
   code path for the same act. The per-site call has to be right anyway. */
ok('bulk grew NO query of its own', !/from\('studio_photos'\)/.test(bulk));
ok('it repaints once at the end, not once per site',
  (bulk.match(/await loadFacets\(\)/g) || []).length === 1 && /quiet/.test(sa));
ok('it says how many sites AND how many photographs moved',
  /' site' \+ \(done === 1 \? '' : 's'\)/.test(bulk) && /moved \+ ' photo'/.test(bulk));
ok('the direction follows the lens — Bin restores, Sites archives',
  /var on = \(st\.lens !== 'bin'\);/.test(bulk));

console.log('\n── the tick in the rail ──');
/* The rail row is ALREADY a <button>. A nested button is invalid markup that
   engines resolve by dropping one, which would have made this silently
   unclickable — hence a span carrying role/aria instead. */
ok('the tick is a SPAN with checkbox semantics, never a nested button',
  /<span class="atl-tick/.test(STU) && /role="checkbox"/.test(STU) &&
  !/<button[^>]*class="atl-tick/.test(STU));
ok('ticking does NOT also select the site',
  /closest\('\.atl-tick'\)/.test(STU) && /ev\.stopPropagation\(\);/.test(STU));
ok('aria-checked tracks the state, not just the class',
  /setAttribute\('aria-checked'/.test(STU));
ok('the bulk button only appears in lenses where a row IS a site',
  /var okLens = \(st\.lens === 'site' \|\| st\.lens === 'bin'\);/.test(STU));
ok('a selection cannot survive a lens change into the opposite action',
  /clearPicked\(\);/.test(STU) && body(STU, 'function clearPicked').includes('PICKED.clear()'));
ok('the tick has a hit area larger than its 16px box (thumb, not mouse)',
  /\.atl-tick::before\{ content:''; position:absolute; inset:/.test(STU));

console.log('\n── EXECUTED: does the listener actually attach, on both hosts? ──');
/* This is the section that matters. The bug shipped past every static check a
   regex could make, because the code existed and simply never ran. */
for (const host of ['studio.cardinalroster.com', 'showroom.cardinalroster.com']) {
  /* Every element setupMode touches, listed by reading the function rather than
     guessed — a missing stub throws and reads exactly like an app failure.
     (It threw twice here before I enumerated them.) */
  const dom = new JSDOM(`<!doctype html><body>
    <div id="stuMode"><button data-mode="work"></button><button data-mode="private"></button></div>
    <div id="atlLens"></div>
    <div id="atlView"><button data-view="grid"></button><button data-view="events"></button></div>
    <input id="stuSearch">
    <button id="stuArchive"></button><button id="stuRestore"></button>
    <button id="stuBulk"></button><div id="atlRail"></div><div id="atlFacets"></div>
    </body>`, { url: 'https://' + host + '/studio.html' });
  const d = dom.window.document;
  const wired = {};
  ['stuArchive', 'stuRestore', 'atlLens', 'stuBulk'].forEach(id => {
    const el = d.getElementById(id);
    const orig = el.addEventListener.bind(el);
    el.addEventListener = (t, f, o) => { if (t === 'click') wired[id] = true; return orig(t, f, o); };
  });

  const code = `
    var st = { mode:'work', lens:'site', sel:null, view:'grid' };
    function isShowroomHost(){
      try{ if(location.search.indexOf('vision=1') !== -1) return true;
           return location.hostname.indexOf('showroom.') === 0; }catch(_){ return false; }
    }
    function applyMode(){}
    function renderRail(){} function paintChip(){} function paintSiteActions(){}
    function resetAndLoad(){} function paintBulk(){} function clearPicked(){}
    function setArchived(){} function bulkArchive(){}
    ${body(STU, 'function setupMode()')}
    var modeWired = false;
    setupMode();
    return { showroom: isShowroomHost() };
  `;
  let res;
  try {
    res = new Function('document', 'location', code)(d, dom.window.location);
  } catch (e) {
    ok(`${host}: setupMode runs`, false, e.message);
    continue;
  }
  ok(`${host} (showroom=${res.showroom}): Archive site IS wired`, !!wired.stuArchive);
  ok(`${host}: Restore site IS wired`, !!wired.stuRestore);
  ok(`${host}: the lens switcher IS wired`, !!wired.atlLens);
  ok(`${host}: the bulk button IS wired`, !!wired.stuBulk);
}

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
