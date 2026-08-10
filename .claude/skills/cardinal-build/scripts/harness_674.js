/* Build 674 — a Hover report fills the measurements.

   Theo put Hover's 31-page report on the Gunn job and the app kept the PDF and
   none of the numbers.

   The load-bearing tests here EXECUTE the shipped merge against real checklist
   shapes — including the one that only becomes reachable BECAUSE of this build:
   a job measured by Roofr and then by Hover. 554's merge would have stamped
   that 'Field + Hover', claiming somebody stood on the roof. That assertion is
   run against the OLD merge too, and it goes red there.

   Usage: node harness_674.js [index.html] [api/hover.js] [prev-index.html] [prev-hover.js]
   Point the first two at 673 as the negative control — must go red.         */
const fs = require('fs');
const path = require('path');

const abs = p => (p ? path.resolve(p) : p);
const IDX = abs(process.argv[2]) || '/home/user/cardinal-inspections/index.html';
const APIF = abs(process.argv[3]) || '/home/user/cardinal-inspections/api/hover.js';
const PREV_IDX = abs(process.argv[4]) || null;
const PREV_API = abs(process.argv[5]) || null;
const SRC = fs.readFileSync(IDX, 'utf8');
const API = fs.readFileSync(APIF, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function fnText(src, name) {
  let i = src.indexOf('async function ' + name + '(');
  if (i < 0) i = src.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') { d++; started = true; }
    else if (src[j] === '}') { d--; if (started && d === 0) return src.slice(i, j + 1); }
  }
  return null;
}

/* the roof numbers a Hover "Complete Measurements" report yields */
const HOVER = { squares: 32.4, pitch: '6/12', ridge_lf: 64, hip_lf: 48,
  valley_lf: 36, eave_lf: 172, rake_lf: 96, siding_area_sqft: 2210,
  imported_at: '2026-08-10T04:00:00.000Z' };
const ROOFR = { squares: 30.0, pitch: '5/12', ridge_lf: 60, eave_lf: 160,
  imported_at: '2026-08-09T04:00:00.000Z' };

(async function () {

console.log('\n── one merge, two sources (EXECUTED) ──');
const mergeSrc = fnText(SRC, 'aerialMerge');
if (!mergeSrc) {
  /* the negative control lands here. Say it plainly and exit red — a stack
     trace from `new Function(null)` is not a test result. */
  console.log('  ✗ aerialMerge() is not in ' + IDX + ' — this artifact predates 674.');
  console.log('\nRESULT: FAIL  (0 passed, 1 failed)  — control artifact, as expected');
  process.exit(1);
}
ok('aerialMerge() exists — the 554 merge, generalised', !!mergeSrc);
ok('…and roofrMerge is kept as a thin wrapper, so its caller reads unchanged',
  /function roofrMerge\(all, d\)\{ return aerialMerge\(all, d, 'Roofr'\); \}/.test(SRC));
ok('…there is exactly ONE merge body, not two',
  (SRC.match(/put\('valley', d\.valley_lf\);/g) || []).length === 1,
  (SRC.match(/put\('valley', d\.valley_lf\);/g) || []).length);

const mk = () => new Function(mergeSrc + '\nreturn aerialMerge;')();

if (mergeSrc) {
  const merge = mk();

  {
    const all = {};
    const wrote = merge(all, HOVER, 'Hover');
    ok('a blank job takes the Hover numbers', all.meas && all.meas.sq === '32.4' &&
      all.meas.pitch === '6/12' && all.meas.eave === '172', JSON.stringify(all.meas));
    ok('…labelled Hover', all.meas.source === 'Hover', all.meas.source);
    ok('…the raw payload is filed under checklist.hover, not checklist.roofr',
      all.hover === HOVER && all.roofr === undefined);
    ok('…and it reports how many fields it wrote', wrote === 7, wrote);
    ok('…the derived pitch reaches checklist.pitch for the agreement', all.pitch === '6/12');
  }

  {
    /* a human measured the roof: Hover fills the BLANKS and touches nothing else */
    const all = { meas: { sq: '28.0', pitch: '7/12', source: 'Field', updated_at: 'x' } };
    merge(all, HOVER, 'Hover');
    ok('a FIELD measurement is never overwritten — someone stood on that roof',
      all.meas.sq === '28.0' && all.meas.pitch === '7/12');
    ok('…but blanks it never filled are filled', all.meas.eave === '172' && all.meas.ridge === '64');
    ok('…and the record says Field + Hover', all.meas.source === 'Field + Hover', all.meas.source);
  }

  {
    /* THE BUG THIS BUILD MAKES REACHABLE: Roofr first, then Hover */
    const all = {};
    merge(all, ROOFR, 'Roofr');
    ok('Roofr writes first and is labelled Roofr', all.meas.source === 'Roofr', all.meas.source);
    merge(all, HOVER, 'Hover');
    ok('Roofr-then-Hover keeps Roofr\'s numbers where they exist',
      all.meas.sq === '30.0' && all.meas.eave === '160');
    ok('…fills what Roofr did not have', all.meas.hip === '48' && all.meas.valley === '36');
    ok('THE LABEL NAMES WHAT IS ACTUALLY IN THERE: "Roofr + Hover", not "Field + …"',
      all.meas.source === 'Roofr + Hover', all.meas.source);
    ok('…and never claims a field measurement that did not happen',
      all.meas.source.indexOf('Field') === -1, all.meas.source);
  }

  {
    /* a corrected re-upload from the SAME source must refresh its own numbers */
    const all = {};
    merge(all, ROOFR, 'Roofr');
    merge(all, { squares: 33.3, eave_lf: 180, imported_at: 'z' }, 'Roofr');
    ok('a corrected re-upload refreshes its own earlier numbers',
      all.meas.sq === '33.3' && all.meas.eave === '180');
    ok('…and stays labelled Roofr', all.meas.source === 'Roofr', all.meas.source);
  }

  {
    const all = {};
    merge(all, { area_sqft: 3240, imported_at: 'q' }, 'Hover');
    ok('square feet convert to squares when the report gives only sqft',
      all.meas.sq === '32.4', all.meas && all.meas.sq);
  }

  {
    const all = { meas: { sq: '32.4', pitch: '6/12', ridge: '64', hip: '48',
      valley: '36', eave: '172', rake: '96', source: 'Hover' } };
    const wrote = merge(all, HOVER, 'Hover');
    ok('re-importing an identical report writes nothing and is not an error', wrote === 0, wrote);
    ok('…and does not restamp updated_at on a no-op', !all.meas.updated_at);
  }
}

console.log('\n── the old merge would have LIED, proved against 673 ──');
{
  if (!PREV_IDX || !fs.existsSync(PREV_IDX)) {
    ok('the previous index.html was supplied for the differential label test', false,
      'pass it as argv[4] — this is NOT being skipped silently');
  } else {
    const prevSrc = fs.readFileSync(PREV_IDX, 'utf8');
    const oldMerge = fnText(prevSrc, 'roofrMerge');
    ok('673\'s roofrMerge extracted', !!oldMerge);
    if (oldMerge) {
      const old = new Function(oldMerge + '\nreturn roofrMerge;')();
      const all = { meas: { sq: '32.4', eave: '172', source: 'Hover' } };
      old(all, ROOFR);
      ok('673 stamps a Hover-then-Roofr job "Field + Roofr" — a measurer who never existed',
        all.meas.source === 'Field + Roofr', all.meas.source);
      const all2 = { meas: { sq: '32.4', eave: '172', source: 'Hover' } };
      mk()(all2, ROOFR, 'Roofr');
      ok('674 stamps the same job "Hover + Roofr" — what actually went into it',
        all2.meas.source === 'Hover + Roofr', all2.meas.source);
    }
  }
}

console.log('\n── /api/hover returns the roof block, and the siding caller is untouched ──');
{
  ok('the roof keys are asked for, by the names /api/roofr already uses',
    ['squares', 'area_sqft', 'pitch', 'ridge_lf', 'hip_lf', 'valley_lf', 'eave_lf', 'rake_lf']
      .every(k => API.indexOf("'- " + k + ":") > -1 || API.indexOf('- ' + k + ':') > -1));
  ok('every siding key the material order reads is STILL asked for',
    ['siding_area_sqft', 'openings_count', 'opening_perimeter_lf', 'outside_corner_lf',
     'inside_corner_lf', 'base_length_lf', 'soffit_area_sqft', 'fascia_lf', 'stories']
      .every(k => API.indexOf(k) > -1));
  ok('the model is told a roof-only or siding-only report is EXPECTED, not a failure',
    /A roof-only report has null for every siding field/.test(API));
  ok('…and told never to carry a siding number into a roof field',
    /Never carry a siding number into a roof field/.test(API));

  /* drive both handlers with the same stubbed model reply: the route is a
     passthrough, so the RESPONSE must be identical — only the prompt grew */
  async function drive(file, reply) {
    const mod = await import('file://' + file + '?v=' + Date.now() + Math.random());
    const keyWas = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key';
    const seen = { prompt: '' };
    const realFetch = global.fetch;
    global.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      seen.prompt = body.contents[0].parts.map(p => p.text || '').join('');
      return { ok: true, status: 200, json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }) };
    };
    const res = { code: null, body: null,
      status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await mod.default({ method: 'POST', body: { text: 'x'.repeat(200) } }, res);
    global.fetch = realFetch;
    if (keyWas === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = keyWas;
    return { res, seen };
  }

  const REPLY = { siding_area_sqft: 2210, openings_count: 14, fascia_lf: 120,
    squares: 32.4, pitch: '6/12', eave_lf: 172 };
  const now = await drive(APIF, REPLY);
  ok('the route still passes the model\'s JSON through unchanged',
    now.res.code === 200 && JSON.stringify(now.res.body) === JSON.stringify(REPLY),
    now.res.code + ' ' + JSON.stringify(now.res.body));
  ok('the prompt now asks for squares AND siding area in one pass',
    /squares:/.test(now.seen.prompt) && /siding_area_sqft:/.test(now.seen.prompt));

  if (PREV_API && fs.existsSync(PREV_API)) {
    const before = await drive(PREV_API, REPLY);
    ok('BACK-COMPAT: the siding caller gets the identical response from both handlers',
      JSON.stringify(before.res.body) === JSON.stringify(now.res.body) &&
      before.res.code === now.res.code);
    ok('…and 673\'s prompt genuinely did NOT ask for the roof, so this is a real gain',
      !/squares:/.test(before.seen.prompt));
  } else {
    ok('the previous api/hover.js was supplied for the differential test', false,
      'pass it as argv[5]');
  }
}

console.log('\n── the upload: filing first, reading second (EXECUTED) ──');
{
  const fn = fnText(SRC, 'importMeasFrom');
  ok('importMeasFrom() exists', !!fn);
  if (fn && mergeSrc) {
    async function run(opts) {
      const notes = [];
      const patches = [];
      const noteEl = { style: {}, textContent: '' };
      const els = { msImpNote: noteEl };
      const doc = { getElementById: id => els[id] || null };
      const realFetch = global.fetch;
      global.fetch = async () => opts.routeFails
        ? { ok: false, status: 502, json: async () => ({ error: 'AI request failed' }) }
        : { ok: true, status: 200, json: async () => opts.reply };
      const sandbox = new Function('document', 'fetch', 'extractPdfText', 'patchProjectCk',
        'renderMeasureTab', 'refreshMeasSummary', 'aerialMerge', 'notes', 'patches',
        mergeSrc + '\n' + fn +
        '\nreturn importMeasFrom;')(
          doc, global.fetch,
          async (f, say) => { say('Reading PDF…'); if (opts.extractFails) throw new Error('bad pdf'); return 'TEXT'; },
          async (pr, patch) => { patches.push(patch); },
          () => {}, () => {}, null, notes, patches);
      await sandbox(opts.pr, opts.source, {});
      global.fetch = realFetch;
      return { note: noteEl.textContent, patches };
    }

    const clean = { id: 'p1', checklist: '{}' };
    const good = await run({ pr: clean, source: 'Hover', reply: HOVER });
    ok('a good read patches the project with the merged measurements',
      good.patches.length === 1 && good.patches[0].meas && good.patches[0].meas.sq === '32.4',
      JSON.stringify(good.patches[0] && good.patches[0].meas));
    ok('…and reports what it filled, in the field\'s own units',
      /32\.4 SQ/.test(good.note) && /172 LF eave/.test(good.note), good.note);
    ok('…naming the source on the record', /source: Hover/.test(good.note), good.note);

    const dead = await run({ pr: clean, source: 'Hover', routeFails: true });
    ok('a FAILED read does not patch anything', dead.patches.length === 0);
    ok('…and says the document IS filed, rather than that the upload failed',
      /report is filed, but its numbers could not be read/.test(dead.note), dead.note);
    ok('…and offers the fallback a person can actually take',
      /enter them by hand/.test(dead.note));

    const bad = await run({ pr: clean, source: 'Roofr', extractFails: true });
    ok('an unreadable PDF fails the same honest way, not as a lost upload',
      bad.patches.length === 0 && /is filed/.test(bad.note), bad.note);

    /* a field-measured job where the report adds nothing new */
    const measured = { id: 'p2', checklist: JSON.stringify({ meas: {
      sq: '32.4', pitch: '6/12', ridge: '64', hip: '48', valley: '36',
      eave: '172', rake: '96', source: 'Field' } }) };
    const noop = await run({ pr: measured, source: 'Hover', reply: HOVER });
    ok('a report that adds nothing writes nothing — a correct refusal',
      noop.patches.length === 0);
    ok('…and says so as a fact, not as a failure',
      /No new measurements to add/.test(noop.note) || /report filed\./.test(noop.note), noop.note);
  }
}

console.log('\n── the wiring, at both doors ──');
{
  /* Assert the ORDERING, not a distance. The first version bounded the gap at
     400 characters and went red because the comment explaining the ordering is
     itself ~300 characters — a magic number that would break again on any
     edit. Positions state the invariant directly and cannot drift. */
  ok('the Measurements upload files the PDF BEFORE it tries to read it', (function () {
    const add = SRC.indexOf('await measDb.add(');
    const imp = SRC.indexOf('importMeasFrom(pr, src, f)');
    const bail = SRC.indexOf('run the meas_docs SQL.');
    return add > -1 && imp > add && bail > add && bail < imp;
  })());
  ok('…and a failed FILE returns before the read is ever attempted',
    /run the meas_docs SQL\.'\);\s*\n\s*return;/.test(SRC));
  ok('…and only Hover and Roofr are read; a Field upload is just filed',
    /if\(src === 'Hover' \|\| src === 'Roofr'\) importMeasFrom/.test(SRC));
  ok('…the source is captured before the async gap, not read off the global later',
    /var src = __msUpSrc;/.test(SRC));
  ok('the material-order import also lands its numbers in meas now',
    /aerialMerge\(mAll, data, trade === 'siding' \? 'Hover' : 'Roofr'\)/.test(SRC));
  ok('…and does not break the material order if the merge throws',
    /\}catch\(me3\)\{\}/.test(SRC));
  ok('there is a status line for a read that takes 10–30 seconds',
    /id="msImpNote"/.test(SRC));
}

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 674 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 674; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:674,/.test(SRC));
  ok('…including the label fix, in plain words',
    /used to get stamped as though someone had measured it in the field/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
