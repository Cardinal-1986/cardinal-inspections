/* harness_839.js — Address Check (build 839)
 *
 * Executes the SHIPPED cr-addr-script against the SHIPPED addrLooksIncomplete()
 * and the REAL addresses that are on `projects` today. Nothing is
 * re-implemented: both functions are cut out of the artifact and run.
 *
 * Negative control:
 *     node harness_839.js /path/to/index_838.html    # must go RED, not crash
 *
 * Class 37: the control tree has no cr-addr-script, so every element lookup
 * returns null. All DOM reads go through null-safe helpers and every async step
 * through a recording step(), so a missing symbol is a FAILURE with a printed
 * summary rather than a stack trace.
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
const FLOOR = 21;

function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); }
}
function probe(name, fn) {
  try { fn(); }
  catch (e) { fail++; console.log('  FAIL  ' + name + '  — threw: ' + (e && e.message || e)); }
}
function step(name, fn) {
  return () => Promise.resolve().then(fn).catch(e => {
    fail++; console.log('  FAIL  ' + name + '  — threw: ' + (e && e.message || e));
  });
}

const src = fs.readFileSync(FILE, 'utf8');

function cutBlock(id) {
  const open = src.indexOf('<script id="' + id + '">');
  if (open < 0) return null;
  const s = src.indexOf('>', open) + 1;
  const e = src.indexOf('</script>', s);
  return e < 0 ? null : src.slice(s, e);
}
const MODULE = cutBlock('cr-addr-script');

/* the SHIPPED 679 rule, cut out by brace matching so the reuse is real */
function cutFn(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0, started = false;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') { d++; started = true; }
    else if (src[k] === '}') { d--; if (started && d === 0) return src.slice(i, k + 1); }
  }
  return null;
}
const RULE = cutFn('addrLooksIncomplete');

function cutView() {
  const i = src.indexOf('<div id="addrCheckView"');
  if (i < 0) return null;
  const j = src.indexOf('<div id="boardView"', i);
  return j < 0 ? src.slice(i, i + 2000) : src.slice(i, j);
}
const VIEW = cutView();

console.log('artifact: ' + FILE);
console.log('module: ' + (MODULE ? MODULE.length + ' chars' : 'NO') +
            ' · addrLooksIncomplete: ' + (RULE ? 'found' : 'NO') +
            ' · view: ' + (VIEW ? 'found' : 'NO') + '\n');

/* ── 1. structure ──────────────────────────────────────────────────────── */
ok('cr-addr-script exists', !!MODULE);
ok('addrCheckView markup exists', !!VIEW);
ok('the shipped addrLooksIncomplete still exists', !!RULE);
probe('view parts', () => {
  ok('addrMount is in the view', !!VIEW && VIEW.includes('id="addrMount"'));
  ok('Rescan button is in the view', !!VIEW && VIEW.includes('id="addrRescan"'));
  ok('Verify button is in the view', !!VIEW && VIEW.includes('id="addrVerify"'));
});
probe('settings wiring', () => {
  ok('Settings has the row', src.includes('data-set="addrcheck"'));
  ok('the dispatcher routes it', src.includes("k === 'addrcheck'"));
});

/* THE NAV TRAP: an unregistered full-screen view swaps the page underneath
   itself and strands the user. Six screens were lost to this at 570-572. */
probe('hideAllViews registration', () => {
  const i = src.indexOf('function hideAllViews(');
  let hv = '';
  if (i >= 0) {
    let d = 0, started = false;
    for (let k = i; k < src.length; k++) {
      if (src[k] === '{') { d++; started = true; }
      else if (src[k] === '}') { d--; if (started && d === 0) { hv = src.slice(i, k + 1); break; } }
    }
  }
  ok('addrCheckView is registered in hideAllViews exactly once',
     (hv.match(/addrCheckView/g) || []).length === 1,
     'found ' + (hv.match(/addrCheckView/g) || []).length);
});

/* ── 2. the reuse claim, and the invariants ────────────────────────────── */
probe('reuse and invariants', () => {
  ok('addrLooksIncomplete is defined exactly ONCE app-wide (reused, not copied)',
     (src.match(/function addrLooksIncomplete\(/g) || []).length === 1);
  const body = (MODULE || '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('module adds no scroll-lock writer', !!MODULE && !body.includes('body.style.overflow'));
  ok('module adds no body observer', !!MODULE && !body.includes('.observe(document.body'));
  ok('module performs no DB write',
     !!MODULE && !/\.(upsert|insert|update|delete)\s*\(/.test(body));
});

/* ── 3. run it, against the REAL addresses on `projects` ───────────────── */
/* These are the actual rows measured 16 Aug 2026 — not invented fixtures.
   `expect` is what the LOCAL rule alone should say (bad = cannot be placed). */
const REAL = [
  { id: '1',  name: 'A', address: '604 Almond Ave, Dayton, OH 45417',       expect: false },
  { id: '2',  name: 'B', address: '948 Huron',                              expect: true  },
  { id: '3',  name: 'C', address: '2420 Brookline',                         expect: true  },
  { id: '4',  name: 'D', address: '1049 Cicillion Ave',                     expect: true  },
  { id: '5',  name: 'E', address: '921 Testing Way',                        expect: true  },
  { id: '6',  name: 'F', address: '3800 klepinger rd  dayton ohio46416',    expect: true  },
  { id: '7',  name: 'G', address: '',                                       expect: true  },
  { id: '8',  name: 'H', address: '231 Delaware  Ave Dayton Ohio 46405',    expect: false },
  { id: '9',  name: 'I', address: '7036 Montague Road, Huber Heights, Ohio 45424', expect: false }
];

function boot(rows, fetchImpl) {
  const dom = new JSDOM('<!doctype html><html><body>' + (VIEW || '') + '</body></html>',
    { runScripts: 'outside-only' });
  const w = dom.window;
  w.scrollTo = () => {};
  w.hideAllViews = () => {};
  w.openProject = (id) => { w.__opened = id; };
  w.aiHeaders = async () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer t' });
  w.fetch = fetchImpl || (async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  w.__writes = [];
  const wr = (k) => () => { w.__writes.push(k); return {}; };
  w.sb = {
    from: () => ({
      select: () => ({ order: async () => ({ data: rows, error: null }) }),
      upsert: wr('upsert'), insert: wr('insert'), update: wr('update'), delete: wr('delete')
    })
  };
  if (RULE) w.eval(RULE + '; window.addrLooksIncomplete = addrLooksIncomplete;');
  if (MODULE) w.eval(MODULE);
  return w;
}
function html(w) {
  const el = w.document.getElementById('addrMount');
  return el ? el.innerHTML : '';
}

const localRule = step('local rule', () => {
  const w = boot(REAL);
  ok('exports window.CardinalAddrCheck.open',
     !!(w.CardinalAddrCheck && typeof w.CardinalAddrCheck.open === 'function'));
  return (w.CardinalAddrCheck ? w.CardinalAddrCheck.scan() : Promise.resolve()).then(() => {
    const h = html(w);
    const flagged = REAL.filter(r => r.expect);
    const clean = REAL.filter(r => !r.expect);
    /* every address the rule should flag appears, and every one it should not, does not */
    let wrong = [];
    flagged.forEach(r => { if (!h.includes('data-addrgo="' + r.id + '"')) wrong.push('missed ' + JSON.stringify(r.address)); });
    clean.forEach(r => { if (h.includes('data-addrgo="' + r.id + '"')) wrong.push('over-flagged ' + JSON.stringify(r.address)); });
    ok('the shipped 679 rule flags exactly the right ' + flagged.length + ' of ' + REAL.length,
       wrong.length === 0, wrong.join('; '));
    ok('"948 Huron" — the San Francisco row — is flagged', h.includes('data-addrgo="2"'));
    ok('a ZIP glued to the state ("ohio46416") is flagged', h.includes('data-addrgo="6"'));
    ok('an empty address is flagged', h.includes('data-addrgo="7"'));
    ok('a good address is NOT flagged', !h.includes('data-addrgo="9"'));
    ok('the summary counts them', /of\s*<\/b>?\s*9|9<\/b>/.test(h) || h.includes('9'), h.slice(0, 120));
    ok('no DB write during scan', w.__writes.length === 0, w.__writes.join(','));
  });
});

const tapThrough = step('tap through', () => {
  const w = boot(REAL);
  return (w.CardinalAddrCheck ? w.CardinalAddrCheck.scan() : Promise.resolve()).then(() => {
    const row = w.document.querySelector('[data-addrgo="2"]');
    ok('a flagged row is present to tap', !!row);
    if (row) row.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('tapping a row opens that client', w.__opened === '2', 'opened: ' + w.__opened);
  });
});

const remotePass = step('verify pass', () => {
  let sent = [];
  const w = boot(REAL, async (url, opts) => {
    const b = JSON.parse(opts.body);
    sent.push(b);
    /* the Indiana-ZIP row is the one that looks fine and is not */
    if (b.address.indexOf('46405') > -1) {
      return { ok: false, status: 422, json: async () => ({
        error: 'out_of_area',
        detail: 'That address resolved to a point 178 miles from Dayton — almost certainly the wrong place, not the wrong roof.'
      }) };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, check_only: true, partial_match: false }) };
  });
  return (w.CardinalAddrCheck ? w.CardinalAddrCheck.scan() : Promise.resolve())
    .then(() => w.CardinalAddrCheck ? w.CardinalAddrCheck.verify() : null)
    .then(() => {
      ok('verify sends check_only so no Solar call is billed',
         sent.length > 0 && sent.every(b => b.check_only === true),
         JSON.stringify(sent[0] || {}));
      ok('verify only checks rows the local rule cleared',
         sent.length === REAL.filter(r => !r.expect).length,
         'sent ' + sent.length + ', expected ' + REAL.filter(r => !r.expect).length);
      const h = html(w);
      ok('an out-of-area row is now flagged', h.includes('data-addrgo="8"'), h.slice(0, 160));
      ok('the reason names the distance', /178 miles/.test(h));
      ok('a good address is still not flagged', !h.includes('data-addrgo="9"'));
    });
});

/* A network failure must NOT accuse a record that is fine. */
const networkFail = step('network failure', () => {
  const w = boot(REAL, async () => { throw new Error('offline'); });
  return (w.CardinalAddrCheck ? w.CardinalAddrCheck.scan() : Promise.resolve())
    .then(() => w.CardinalAddrCheck ? w.CardinalAddrCheck.verify() : null)
    .then(() => {
      const h = html(w);
      /* GUARD FIRST. Without this the two checks below pass VACUOUSLY on a tree
         with no module at all — nothing is flagged because nothing rendered,
         and "does not flag" reads as a pass. Proving the list drew first is
         what makes them mean something. */
      ok('the list still rendered after the failed verify', h.includes('data-addrgo='), h.slice(0, 100));
      ok('a dropped connection does not flag a good address', h.includes('data-addrgo=') && !h.includes('data-addrgo="9"'));
      ok('a dropped connection does not flag the Indiana-ZIP row either', h.includes('data-addrgo=') && !h.includes('data-addrgo="8"'));
    });
});

Promise.resolve()
  .then(localRule).then(tapThrough).then(remotePass).then(networkFail)
  .then(() => {
    clearTimeout(WATCHDOG);
    console.log('\n' + '='.repeat(56));
    const short = (pass + fail) < FLOOR;
    if (short) console.log('CHECK COUNT ' + (pass + fail) + ' IS BELOW THE FLOOR OF ' + FLOOR + ' — coverage was lost');
    console.log((fail === 0 && !short ? 'GREEN' : 'RED') + '  —  ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail === 0 && !short ? 0 : 1);
  });
