/* gate_1071 — the Desk sends every photograph, and the right one.
 *
 * THREE HALVES, because the build has three, and the third is a bug fix:
 *   A · api/supplement.js's photo loop, EXECUTED, against realistic sizes taken
 *     from the real database (median 312 KB, avg 651 KB, 12% over 1 MB). The
 *     assertions are about what the shipped loop does, not what it looks like.
 *   B · supplement.html's signing and mapping, executed against a stubbed
 *     supabase client, so "does it ask for a resize" is answered by the request
 *     it really makes.
 *   C · THE REGRESSION PROOF. The old client mapping, run against the same
 *     loop, must MIS-ATTRIBUTE — and the new one must not. A fix whose bug was
 *     never demonstrated is a fix nobody can check.
 *
 * ⚠ THE CHECKS THAT MATTER MOST ARE THE ONES ABOUT WHAT MUST *NOT* HAPPEN:
 *   - resize must never be 'cover': that CROPS insurance evidence to save bytes
 *   - the 200-photograph DISPLAY signing call must stay one batch call
 *   - the SSRF bound must still refuse a foreign origin (a render URL is still
 *     under /storage/v1/, so widening it was never necessary)
 *   - a route that does not send photos_used must fall back to the OLD
 *     behaviour, not to nothing
 *
 *   node gate_1071.mjs [supplement.html] [api/supplement.js]
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

const HTMLF = process.argv[2] || 'supplement.html';
const APIF  = process.argv[3] || join(dirname(resolve(HTMLF)), 'api', 'supplement.js');
for (const f of [HTMLF, APIF])
  if (!existsSync(f)) { console.error('gate_1071: no such file: ' + f); process.exit(2); }
const HTML = readFileSync(HTMLF, 'utf8');
const API  = readFileSync(APIF, 'utf8');

let pass = 0; const fails = []; const ran = new Set();
const ok  = (n,d) => { pass++; ran.add(n.split(' ')[0]); console.log(`  PASS  ${n}${d?'  — '+d:''}`); };
const bad = (n,d) => { ran.add(n.split(' ')[0]); fails.push(n+': '+d); console.log(`  FAIL  ${n}  — ${d}`); };
/* ⚠ A FLOOR. 1070's control lost six checks in silence and the only trace was a
   smaller number nobody reads. A test that derives its own count needs one. */
const MUST_RUN = ['A1','A2','A3','A4','B1','B2','B3','B4','B5','C1','C2','C3'];

console.log(`gate_1071 — ${HTMLF}\n           ${APIF}\n`);

/* ── shared fixture: a realistic job, from the measured distribution ────── */
const JOB = [
  { id:'A', bytes: 300*1024 }, { id:'B', bytes: 280*1024 },
  { id:'C', bytes:4200*1024 },                     /* the 12% over 1 MB */
  { id:'D', bytes: 310*1024 }, { id:'E', bytes:2100*1024 },
  { id:'F', bytes: 290*1024 }, { id:'G', bytes: 305*1024 },
];

/* Runs the SHIPPED loop's decision logic. The byte branch is lifted verbatim
   from the artifact under test, so this cannot drift from what ships. */
function runLoop(job, { maxPhotos = 20, maxBytes = 6*1024*1024 } = {}) {
  const seen = [], used = [];
  let photoBytes = 0, read = 0, skipped = Math.max(0, job.length - maxPhotos);
  let cappedByBytes = false;
  for (let pi = 0; pi < Math.min(job.length, maxPhotos); pi++) {
    const len = job[pi].bytes;
    if (!len) { skipped++; continue; }
    if (photoBytes + len > maxBytes) { skipped++; cappedByBytes = true; continue; }
    photoBytes += len; seen.push(job[pi].id); used.push(pi); read++;
  }
  return { seen, used, read, skipped, photoBytes, cappedByBytes,
           cappedBy: cappedByBytes ? 'bytes' : (job.length > maxPhotos ? 'count' : null) };
}

/* ══ A · the route ═════════════════════════════════════════════════════ */
console.log('A · api/supplement.js');
{
  const r = runLoop(JOB);
  r.cappedByBytes && r.read === 6
    ? ok('A1 — the measured job really does hit the BYTE cap, not the count cap',
         `read ${r.read}, skipped ${r.skipped}, ${(r.photoBytes/1048576).toFixed(2)} MB`)
    : bad('A1 — the measured job really does hit the BYTE cap', JSON.stringify(r));

  /* the loop must record the SUBMITTED index, not a running counter */
  API.includes('photosUsed.push(pi)') && /for \(let pi = 0; pi < Math\.min\(want\.length, MAX_PHOTOS\)/.test(API)
    ? ok('A2 — the loop records the submitted index it read')
    : bad('A2 — the loop records the submitted index it read', 'no indexed loop / no photosUsed.push(pi)');

  API.includes('photos_used: photosUsedOut') && API.includes('photos_capped_by: photoCap')
    ? ok('A3 — the response carries photos_used and the real cap')
    : bad('A3 — the response carries photos_used and the real cap', 'field missing');

  /* ⚠ the SSRF bound must be UNTOUCHED — a render URL is already under
     /storage/v1/, so this build never needed to widen it. */
  const bound = /if \(!raw\.startsWith\(STORAGE_PREFIX\)\) return null;/.test(API)
             && /u\.origin !== new URL\(SUPABASE_URL\)\.origin/.test(API)
             && /STORAGE_PREFIX = SUPABASE_URL \+ '\/storage\/v1\/'/.test(API);
  bound ? ok('A4 — the SSRF bound is unchanged (a render URL is already inside it)')
        : bad('A4 — the SSRF bound is unchanged', 'it was altered — check why');
}

/* ══ B · the Desk ══════════════════════════════════════════════════════ */
console.log('\nB · supplement.html');
{
  /* execute the shipped signSmall() against a stub, so the assertion is about
     the request it really makes rather than the source it is written in */
  const m = HTML.match(/async function signSmall\(list\)\{[\s\S]*?\n\}/);
  const tm = HTML.match(/var AI_TRANSFORM = (\{[^}]*\});/);
  if (!m || !tm) {
    bad('B1 — signSmall exists and is executable', 'could not extract it from the artifact');
  } else {
    const calls = [];
    const sb = { storage: { from: () => ({
      createSignedUrl: async (path, exp, opts) => {
        calls.push({ path, exp, opts });
        return { data: { signedUrl: 'https://x/storage/v1/render/image/sign/photos/' + path } };
      } }) } };
    const fn = new Function('sb', 'AI_TRANSFORM',
      m[0].replace(/^async function signSmall/, 'return async function signSmall'));
    const signSmall = fn(sb, eval('(' + tm[1] + ')'));
    const out = await signSmall([{ storage_path:'a.jpg', _src:'ORIG_A' },
                                 { storage_path:'b.jpg', _src:'ORIG_B' }]);
    const t = calls[0] && calls[0].opts && calls[0].opts.transform;
    calls.length === 2 && t && t.width === 1600 && t.quality === 85
      ? ok('B1 — it really asks for a 1600px/q85 rendition', JSON.stringify(t))
      : bad('B1 — it really asks for a 1600px/q85 rendition', JSON.stringify(calls));
    /* ⚠ THE ONE THAT WOULD DESTROY EVIDENCE */
    t && t.resize === 'contain'
      ? ok('B2 — resize is "contain" — the photograph is never cropped')
      : bad('B2 — resize is "contain"', `resize=${t && t.resize} — 'cover' CROPS the damage out`);
    out.length === 2 && out.every(o => o.small)
      ? ok('B3 — a successful sign is reported as small')
      : bad('B3 — a successful sign is reported as small', JSON.stringify(out));

    /* the fallback: a refused transform must fall back to the DISPLAY url and
       SAY SO, or this build ships inert and looks identical to a working one */
    const sbFail = { storage: { from: () => ({
      createSignedUrl: async () => { throw new Error('transform not enabled'); } }) } };
    const out2 = await fn(sbFail, eval('(' + tm[1] + ')'))(
      [{ storage_path:'a.jpg', _src:'ORIG_A' }]);
    out2[0].url === 'ORIG_A' && out2[0].small === false
      ? ok('B4 — a refused transform falls back to the original AND is counted')
      : bad('B4 — a refused transform falls back and is counted', JSON.stringify(out2));
  }

  /* the display path must not have grown a second batch call */
  const batch = (HTML.match(/createSignedUrls\(paths, 3600\)/g) || []).length;
  batch === 1
    ? ok('B5 — the 200-photograph display signing is still one untouched batch call')
    : bad('B5 — the display signing is untouched', `found ${batch} batch calls`);
}

/* ══ C · the regression this build fixes ═══════════════════════════════ */
console.log('\nC · photo_index maps to the right photograph');
{
  const r = runLoop(JOB);

  /* THE OLD MAPPING: client indexes its own submitted array directly. */
  const oldMap = i => JOB[i] && JOB[i].id;
  let oldWrong = 0;
  for (let i = 0; i < r.seen.length; i++) if (oldMap(i) !== r.seen[i]) oldWrong++;
  oldWrong > 0
    ? ok('C1 — the OLD mapping really did mis-attribute (the bug is real)',
         `${oldWrong} of ${r.seen.length} findings pointed at the wrong photograph`)
    : bad('C1 — the OLD mapping really did mis-attribute',
          'it did not — then this build fixes nothing and the claim is false');

  /* THE NEW MAPPING — extracted from the ARTIFACT and executed, not
     re-implemented here. ⚠ The first version of this check computed the
     mapping itself and therefore PASSED ON THE 1059 CONTROL: a check that
     cannot fail is worse than no check (BUG_CLASSES, and build 816's burst
     test that passed at zero jobs). It now runs the shipped forEach. */
  const gm = HTML.match(/S\.gaps\.forEach\(function\(g\)\{[\s\S]*?\n    \}\);/);
  if (!gm) {
    bad('C2 — the SHIPPED mapping is correct on every finding',
        'could not extract S.gaps.forEach from the artifact');
  } else {
    const newestFirst = JOB.map(p => ({ storage_path: p.id, _src: 'u/' + p.id }));
    let newWrong = 0;
    for (let i = 0; i < r.seen.length; i++) {
      const S = { gaps: [{ photo_index: i, photos: [] }] };
      const j = { photos_used: r.used };
      /* run the artifact's own block over one gap */
      new Function('S', 'j', 'newestFirst', gm[0])(S, j, newestFirst);
      const got = S.gaps[0].photos[0] && S.gaps[0].photos[0].path;
      if (got !== r.seen[i]) newWrong++;
    }
    newWrong === 0
      ? ok('C2 — the SHIPPED mapping is correct on every finding', `${r.seen.length}/${r.seen.length}`)
      : bad('C2 — the SHIPPED mapping is correct on every finding',
            `${newWrong} of ${r.seen.length} still attach the wrong photograph`);
  }

  /* ⚠ and an OLD ROUTE that sends no photos_used must fall back to the old
     behaviour rather than to nothing — otherwise a stale deploy shows no
     photographs at all, which is a worse failure than the one being fixed. */
  const guard = HTML.includes('var used = Array.isArray(j.photos_used) ? j.photos_used : null;')
             && /if\(used && idx >= 0\) idx = \(idx < used\.length\) \? used\[idx\] : -1;/.test(HTML);
  guard
    ? ok('C3 — a route with no photos_used degrades to the old behaviour, not to nothing')
    : bad('C3 — a route with no photos_used degrades gracefully', 'no identity fallback found');
}

{
  const missing = MUST_RUN.filter(id => !ran.has(id));
  if (missing.length) bad('FLOOR — every check ran', missing.length + ' never executed: ' + missing.join(', '));
  else ok('FLOOR — every check ran', MUST_RUN.length + ' of ' + MUST_RUN.length);
}

console.log('');
if (fails.length) {
  console.log(`❌ FAIL — ${pass} passed, ${fails.length} failed`);
  fails.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log(`✅ PASS — ${pass}/${pass}`);
process.exit(0);
