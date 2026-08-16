/* harness_838.js — the satellite estimate panel (build 838)
 *
 * Executes the SHIPPED cr-sat-script module text against real response shapes.
 * Nothing here is a re-implementation: the module is cut out of the artifact by
 * its own script id and run, and the markup under test is the real #tab-measure
 * block cut out of the same file.
 *
 * Takes an optional path so it can be pointed at the previous build as a
 * NEGATIVE CONTROL:
 *     node harness_838.js                       # the working tree
 *     node harness_838.js /path/to/index_837.html   # must go RED
 *
 * ⚠ The control tree has no cr-sat-script at all, so every lookup in it returns
 * null. BUG_CLASSES class 37 is a control that CRASHES instead of reporting red
 * — a stack trace reads as "not green" rather than as "proved nothing". Every
 * probe here is therefore wrapped so a missing symbol is recorded as a FAILURE
 * and the run continues to the summary.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || path.join(__dirname, '..', '..', '..', '..', 'index.html');
const WATCHDOG = setTimeout(() => {
  console.error('GATE TIMEOUT — harness hung after 30s');
  process.exit(2);
}, 30000);

let pass = 0, fail = 0;
const FLOOR = 16;                 /* see the summary — a shrinking check count must go red */

function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); }
}
function probe(name, fn) {
  try { fn(); }
  catch (e) { fail++; console.log('  FAIL  ' + name + '  — threw: ' + (e && e.message || e)); }
}

const src = fs.readFileSync(FILE, 'utf8');

/* ── the shipped module, cut out by its own id ─────────────────────────── */
function cutBlock(id) {
  const open = src.indexOf('<script id="' + id + '">');
  if (open < 0) return null;
  const s = src.indexOf('>', open) + 1;
  const e = src.indexOf('</script>', s);
  return e < 0 ? null : src.slice(s, e);
}
const MODULE = cutBlock('cr-sat-script');

/* ── the real markup, cut out by its own container ─────────────────────── */
function cutMeasureTab() {
  const i = src.indexOf('<div id="tab-measure"');
  if (i < 0) return null;
  const j = src.indexOf('<div id="tab-punch"', i);
  return j < 0 ? null : src.slice(i, j);
}
const TAB = cutMeasureTab();

console.log('artifact: ' + FILE);
console.log('module found: ' + (MODULE ? MODULE.length + ' chars' : 'NO') +
            ' · #tab-measure found: ' + (TAB ? TAB.length + ' chars' : 'NO') + '\n');

/* ── 1. structure, straight off the artifact ───────────────────────────── */
ok('cr-sat-script module exists in the artifact', !!MODULE);
ok('#tab-measure block exists', !!TAB);
probe('card markup', () => {
  ok('satGo button is inside #tab-measure', !!TAB && TAB.includes('id="satGo"'));
  ok('satMount is inside #tab-measure', !!TAB && TAB.includes('id="satMount"'));
  ok('satCount is inside #tab-measure', !!TAB && TAB.includes('id="satCount"'));
});

/* The #tab-overview allow-list trap: that container hides every direct child not
   on its allow-list, and five cards have already been lost to it. This card must
   NOT be there — proving the trap does not apply rather than assuming it. */
probe('overview allow-list trap does not apply', () => {
  const ov = src.indexOf('<div id="tab-overview"');
  const ovEnd = src.indexOf('<div id="tab-measure"');
  const inOverview = ov >= 0 && ovEnd > ov && src.slice(ov, ovEnd).includes('id="satGo"');
  ok('satGo is NOT a child of #tab-overview', !inOverview);
});

/* ── 2. the advisory fence, on the shipped text ────────────────────────── */
probe('advisory fence', () => {
  const body = (MODULE || '').replace(/\/\*[\s\S]*?\*\//g, '');   /* drop the banner prose */
  ok('module never calls aerialMerge', !!MODULE && !body.includes('aerialMerge'));
  ok('module never calls patchProjectCk', !!MODULE && !body.includes('patchProjectCk'));
  ok('module performs no DB write',
     !!MODULE && !/\.(upsert|insert|update)\s*\(/.test(body));
});

/* ── 3. run the real module ────────────────────────────────────────────── */
const RESP = {
  source: 'Satellite (Google Solar)', advisory: true,
  area_sqft: 2410, squares: 24.1, facet_count: 6, pitch: '6/12',
  pitch_breakdown: [
    { pitch: '6/12', area_sqft: 1900, percent: 78.8 },
    { pitch: '4/12', area_sqft: 510, percent: 21.2 }
  ],
  imagery_quality: 'HIGH', imagery_date: '2025-4-12',
  resolved_address: '604 Almond Ave, Dayton, OH 45417, USA',
  partial_match: false, unmodelled_pct: null, miles_from_dayton: 3
};

function boot(project, fetchImpl) {
  const dom = new JSDOM('<!doctype html><html><body>' + (TAB || '') + '</body></html>',
    { runScripts: 'outside-only' });
  const w = dom.window;
  w.currentProject = project;
  w.aiHeaders = async () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer test-token' });
  w.fetch = fetchImpl;
  /* a supabase client that records any attempt to write — the fence, observed
     at runtime rather than only grepped for */
  w.__writes = [];
  const rec = (k) => (...a) => { w.__writes.push(k); return { select: () => ({ single: async () => ({}) }) }; };
  w.supa = { from: () => ({ upsert: rec('upsert'), insert: rec('insert'), update: rec('update') }) };
  if (MODULE) w.eval(MODULE);
  return w;
}

const PR_OK = { id: 'p1', address: '604 Almond Ave, Dayton, OH 45417', checklist: '{}' };

/* Null-safe reads. On the control tree the module never runs, so these elements
   may be absent — and a TypeError in an async continuation escapes probe()'s
   try/catch entirely, killing the run before the summary prints. That is
   BUG_CLASSES class 37 exactly, and this harness hit it on its first control
   run. Reading through these keeps a missing element a FAILURE, not a crash. */
function mountHtml(w) {
  const el = w.document.getElementById('satMount');
  return el ? el.innerHTML : '';
}
function countText(w) {
  const el = w.document.getElementById('satCount');
  return el ? el.textContent : '';
}
/* every async step funnels through here so a rejection is recorded, not thrown */
function step(name, fn) {
  return () => Promise.resolve().then(fn).catch(e => {
    fail++; console.log('  FAIL  ' + name + '  — threw: ' + (e && e.message || e));
  });
}

/* 3a — the happy path */
const happyPath = step('happy path', () => {
  let sent = null;
  const w = boot(PR_OK, async (url, opts) => {
    sent = { url, opts };
    return { ok: true, status: 200, json: async () => RESP };
  });
  ok('exports window.CardinalSatMeasure.run',
     !!(w.CardinalSatMeasure && typeof w.CardinalSatMeasure.run === 'function'));

  return (w.CardinalSatMeasure ? w.CardinalSatMeasure.run() : Promise.resolve()).then(() => {
    ok('POSTs to /api/measure', !!sent && sent.url === '/api/measure',
       sent ? sent.url : 'no fetch made');
    ok('sends the Authorization header',
       !!sent && !!sent.opts.headers.Authorization);
    ok('sends the client address',
       !!sent && JSON.parse(sent.opts.body).address === PR_OK.address);

    const html = mountHtml(w);
    ok('renders squares', html.includes('24.1'), html.slice(0, 120));
    ok('renders area with thousands separator', html.includes('2,410'));
    ok('renders facet count', html.includes('>6<'));
    ok('renders the second pitch from the breakdown', html.includes('4/12'));
    ok('says plainly it is not filed', /not filed/i.test(html));
    ok('count chip shows the estimate', countText(w).includes('24.1'));
    ok('no DB write occurred at runtime', w.__writes.length === 0,
       'writes: ' + w.__writes.join(','));
  });
});

/* 3b — the cross-check against a filed report */
const crossCheck = step('cross-check', () => new Promise((resolve) => {
  const pr = Object.assign({}, PR_OK, { checklist: JSON.stringify({ meas: { sq: '41.0', source: 'Hover' } }) });
  const w = boot(pr, async () => ({ ok: true, status: 200, json: async () => RESP }));
  (w.CardinalSatMeasure ? w.CardinalSatMeasure.run() : Promise.resolve()).then(() => {
    const html = mountHtml(w);
    ok('cross-check names the filed source', html.includes('Hover'));
    ok('cross-check shows the filed figure', html.includes('41'));
    /* 24.1 vs 41.0 is a 41% disagreement — the mis-parsed-report case */
    ok('a >=25% disagreement is called out', /big disagreement/i.test(html), html.slice(0, 200));
    resolve();
  }).catch(e => { fail++; console.log('  FAIL  cross-check threw: ' + e.message); resolve(); });
}));

/* 3c — the refusals. Each is a named state, and none may render a number. */
const refusals = step('refusals', () => new Promise((resolve) => {
  const noAddr = boot({ id: 'p2', address: '', checklist: '{}' }, async () => {
    fail++; console.log('  FAIL  fetched despite having no address');
    return { ok: true, status: 200, json: async () => RESP };
  });
  (noAddr.CardinalSatMeasure ? noAddr.CardinalSatMeasure.run() : Promise.resolve()).then(() => {
    ok('no address → refuses without calling the API',
       /no usable address/i.test(mountHtml(noAddr)));

    const oos = boot(PR_OK, async () => ({
      ok: false, status: 422,
      json: async () => ({ error: 'out_of_area', detail: 'That address resolved to a point 2130 miles from Dayton — almost certainly the wrong place, not the wrong roof.' })
    }));
    return (oos.CardinalSatMeasure ? oos.CardinalSatMeasure.run() : Promise.resolve()).then(() => {
      const html = mountHtml(oos);
      ok('out_of_area shows the reason', /2130 miles/.test(html), html.slice(0, 160));
      ok('out_of_area renders no square figure', !/24\.1/.test(html));
    });
  }).then(resolve).catch(e => { fail++; console.log('  FAIL  refusals threw: ' + e.message); resolve(); });
}));

/* 3d — the two quality warnings */
const warnings = step('warnings', () => new Promise((resolve) => {
  const w = boot(PR_OK, async () => ({
    ok: true, status: 200,
    json: async () => Object.assign({}, RESP, { partial_match: true, unmodelled_pct: 18, imagery_quality: 'MEDIUM' })
  }));
  (w.CardinalSatMeasure ? w.CardinalSatMeasure.run() : Promise.resolve()).then(() => {
    const html = mountHtml(w);
    ok('partial match is warned about', /partially matched/i.test(html));
    ok('unmodelled roof share is warned about', html.includes('18%'));
    ok('non-HIGH imagery is warned about', html.includes('MEDIUM'));
    resolve();
  }).catch(e => { fail++; console.log('  FAIL  warnings threw: ' + e.message); resolve(); });
}));

Promise.resolve()
  .then(happyPath)
  .then(crossCheck).then(refusals).then(warnings)
  .then(() => {
    clearTimeout(WATCHDOG);
    console.log('\n' + '='.repeat(56));
    /* A test that derives its own check count can silently LOSE checks and stay
       green — build 816's burst test fell 15 -> 14 and nothing went red. The
       floor makes a shrinking harness a failure. */
    const short = (pass + fail) < FLOOR;
    if (short) console.log('CHECK COUNT ' + (pass + fail) + ' IS BELOW THE FLOOR OF ' + FLOOR + ' — coverage was lost');
    console.log((fail === 0 && !short ? 'GREEN' : 'RED') + '  —  ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail === 0 && !short ? 0 : 1);
  });
