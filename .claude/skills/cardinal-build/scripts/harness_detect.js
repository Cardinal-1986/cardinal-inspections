/* api/detect.js harness — runs the SHIPPED validation code, not a copy.
 *
 * The network half (Gemini/OpenAI) cannot be reached from the sandbox and is
 * NOT tested here — say so rather than implying coverage. What IS tested is
 * everything that decides whether a model's proposal becomes a finding, which
 * is where the bugs live: coordinate handling, the no-box-no-finding contract,
 * vocabulary coercion, and the JSON extraction models keep making necessary.
 */
const fs = require('fs');
const vm = require('vm');

const SRC = fs.readFileSync('/home/user/cardinal-inspections/api/detect.js', 'utf8');

/* Slice the pure helpers out of the real file and run them. Everything from the
 * vocabulary down to cleanFindings(), stopping before the first network call. */
const from = SRC.indexOf('const SEVERITIES');
const to = SRC.indexOf('async function askGemini');
if (from === -1 || to === -1) throw new Error('could not slice detect.js — did its shape change?');
const slice = SRC.slice(from, to);

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(slice + '\n;globalThis.__x = { cleanFindings, parseJson, DEFECT_KEYS, SEVERITIES, MAX_FINDINGS, trim };', ctx);
const { cleanFindings, parseJson, DEFECT_KEYS, SEVERITIES, MAX_FINDINGS } = ctx.__x;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
const box = (x, y, w, h) => ({ x, y, w, h });

console.log('\n── the contract: no box, no finding ──');
{
  const r = cleanFindings([
    { defect: 'hail_impact', severity: 'crit', label: 'placed', box: box(0.1, 0.1, 0.2, 0.2) },
    { defect: 'hail_impact', severity: 'crit', label: 'no box at all' },
    { defect: 'wind_lifted', severity: 'warn', label: 'partial box', box: { x: 0.1, y: 0.1 } },
    { defect: 'valley', severity: 'warn', label: 'text coords', box: box('bad', 'x', 'y', 'z') },
    null,
    'not an object'
  ]);
  ok('only the placeable finding survives', r.findings.length === 1, r.findings.map(f => f.label));
  ok('the survivor is the right one', r.findings[0] && r.findings[0].label === 'placed');
  ok('the rest are counted as dropped, not silently lost', r.dropped === 5, r.dropped);
  ok('a non-array returns empty rather than throwing', cleanFindings(undefined).findings.length === 0);
  ok('an empty list is a valid answer', cleanFindings([]).findings.length === 0 && cleanFindings([]).dropped === 0);
}

console.log('\n── coordinates ──');
{
  // Models answer in percent despite instructions often enough to matter.
  const pct = cleanFindings([{ defect: 'hail_impact', severity: 'crit', label: 'pct', box: box(31, 42, 18, 14) }]);
  ok('0-100 percent is converted to fractions',
    pct.findings[0] && Math.abs(pct.findings[0].box.x - 0.31) < 1e-6 &&
    Math.abs(pct.findings[0].box.h - 0.14) < 1e-6, pct.findings[0] && pct.findings[0].box);

  const over = cleanFindings([{ defect: 'valley', severity: 'warn', label: 'overflow', box: box(0.8, 0.9, 0.5, 0.4) }]);
  const b = over.findings[0] && over.findings[0].box;
  ok('a box running off the edge is trimmed, not dropped',
    b && Math.abs(b.x + b.w - 1) < 1e-6 && Math.abs(b.y + b.h - 1) < 1e-6, b);

  const neg = cleanFindings([{ defect: 'valley', severity: 'warn', label: 'negative', box: box(-0.4, -0.2, 0.5, 0.5) }]);
  const nb = neg.findings[0] && neg.findings[0].box;
  ok('negative origin clamps to zero', nb && nb.x === 0 && nb.y === 0, nb);

  const dot = cleanFindings([{ defect: 'nail_pop', severity: 'warn', label: 'dot', box: box(0.5, 0.5, 0.001, 0.001) }]);
  ok('a zero-area dot is not a location', dot.findings.length === 0 && dot.dropped === 1);

  const zero = cleanFindings([{ defect: 'nail_pop', severity: 'warn', label: 'flat', box: box(0.5, 0.5, 0, 0.3) }]);
  ok('zero width is dropped', zero.findings.length === 0);

  const whole = cleanFindings([{ defect: 'other', severity: 'ok', label: 'whole frame', box: box(0, 0, 1, 1) }]);
  ok('a full-frame box is legal', whole.findings.length === 1);
}

console.log('\n── vocabulary ──');
{
  const r = cleanFindings([
    { defect: 'chimney_flashing_thing', severity: 'crit', label: 'made-up defect', box: box(0.1, 0.1, 0.2, 0.2) },
    { defect: 'hail_impact', severity: 'CATASTROPHIC', label: 'made-up severity', box: box(0.3, 0.3, 0.2, 0.2) }
  ]);
  ok('an unknown defect becomes other', r.findings.some(f => f.defect === 'other'));
  ok('every emitted defect is in the whitelist',
    r.findings.every(f => DEFECT_KEYS.indexOf(f.defect) !== -1));
  const made = r.findings.find(f => f.label === 'made-up severity');
  ok('an unknown severity falls to the LEAST alarming, not the most',
    made && made.severity === 'ok', made && made.severity);
  ok('every emitted severity is in the whitelist',
    r.findings.every(f => SEVERITIES.indexOf(f.severity) !== -1));
  ok('severity list is the existing crit/warn/ok, not a fourth scale',
    JSON.stringify(SEVERITIES) === JSON.stringify(['crit', 'warn', 'ok']), SEVERITIES);

  const bare = cleanFindings([{ defect: 'pipe_boot', severity: 'warn', box: box(0.1, 0.1, 0.2, 0.2) }]);
  ok('a missing label falls back to the defect name', bare.findings[0].label === 'pipe boot', bare.findings[0].label);

  const long = cleanFindings([{ defect: 'other', severity: 'ok', label: 'x'.repeat(400),
                                note: 'y'.repeat(400), box: box(0.1, 0.1, 0.2, 0.2) }]);
  ok('label and note are bounded', long.findings[0].label.length <= 70 && long.findings[0].note.length <= 180,
     [long.findings[0].label.length, long.findings[0].note.length]);
}

console.log('\n── ordering and bounds ──');
{
  const mixed = cleanFindings([
    { defect: 'granule_loss', severity: 'ok', label: 'minor', box: box(0.1, 0.1, 0.1, 0.1), confidence: 0.9 },
    { defect: 'wind_lifted', severity: 'warn', label: 'middle', box: box(0.2, 0.2, 0.1, 0.1), confidence: 0.5 },
    { defect: 'hail_impact', severity: 'crit', label: 'worst', box: box(0.3, 0.3, 0.1, 0.1), confidence: 0.4 }
  ]);
  ok('worst first, regardless of confidence',
    mixed.findings.map(f => f.severity).join(',') === 'crit,warn,ok',
    mixed.findings.map(f => f.severity));

  const tie = cleanFindings([
    { defect: 'hail_impact', severity: 'crit', label: 'less sure', box: box(0.1, 0.1, 0.1, 0.1), confidence: 0.3 },
    { defect: 'hail_impact', severity: 'crit', label: 'more sure', box: box(0.2, 0.2, 0.1, 0.1), confidence: 0.95 }
  ]);
  ok('within a severity, higher confidence first', tie.findings[0].label === 'more sure');

  const many = cleanFindings(Array.from({ length: 30 }, (_, i) => ({
    defect: 'hail_impact', severity: 'warn', label: 'f' + i,
    box: box(0.01 * i, 0.01 * i, 0.05, 0.05), confidence: 0.5
  })));
  ok('capped at MAX_FINDINGS', many.findings.length === MAX_FINDINGS, many.findings.length);
  ok('the overflow is reported, not hidden', many.dropped === 30 - MAX_FINDINGS, many.dropped);

  const conf = cleanFindings([{ defect: 'other', severity: 'ok', label: 'c', box: box(0.1, 0.1, 0.1, 0.1), confidence: 7 }]);
  ok('confidence clamps into 0-1', conf.findings[0].confidence === 1, conf.findings[0].confidence);
  const noconf = cleanFindings([{ defect: 'other', severity: 'ok', label: 'c', box: box(0.1, 0.1, 0.1, 0.1) }]);
  ok('absent confidence is null, not a fabricated number', noconf.findings[0].confidence === null);
}

console.log('\n── JSON extraction (models wrap things) ──');
{
  const want = { quality: 'ok', findings: [] };
  ok('bare JSON', JSON.stringify(parseJson('{"quality":"ok","findings":[]}')) === JSON.stringify(want));
  ok('fenced JSON', JSON.stringify(parseJson('```json\n{"quality":"ok","findings":[]}\n```')) === JSON.stringify(want));
  ok('unlabelled fence', JSON.stringify(parseJson('```\n{"quality":"ok","findings":[]}\n```')) === JSON.stringify(want));
  ok('prose either side',
    JSON.stringify(parseJson('Here you go:\n{"quality":"ok","findings":[]}\nHope that helps!')) === JSON.stringify(want));
  ok('garbage returns null rather than throwing', parseJson('I could not read the photo.') === null);
  ok('empty returns null', parseJson('') === null);
  ok('null input returns null', parseJson(null) === null);
}

console.log('\n── the safety properties, stated as tests ──');
{
  ok('the route never returns image bytes', !/toBlob|canvas|image\/jpeg.{0,40}base64.{0,40}res\.status/i.test(SRC));
  ok('the route never writes to storage or a table',
    !/storage\.from|\.insert\(|\.update\(|\.delete\(/.test(SRC));
  ok('session-gated, not open', /requireSession\(req, res\)/.test(SRC) && /Sign in required/.test(SRC));
  ok('image size is capped', /MAX_IMAGE_BYTES = 5 \* 1024 \* 1024/.test(SRC));
  ok('ESM handler, as api\\/package.json requires', /export default async function handler/.test(SRC));
  ok('no CommonJS export anywhere (CI greps the text)', !/module\s*\.\s*exports/.test(SRC));
  ok('carries an OpenAI fallback like every other Gemini route', /askOpenAI/.test(SRC));
  ok('vocabulary is echoed so the client can spot deploy skew', /vocab: \{ severities: SEVERITIES/.test(SRC));
}

console.log('\n' + '─'.repeat(58));
console.log((fail === 0 ? 'GREEN' : 'RED') + ` — ${pass} passed, ${fail} failed`);
console.log('NOT covered: the live Gemini/OpenAI calls. No network path to either');
console.log('from here, so answer quality is unproven until it runs on Vercel.');
process.exit(fail === 0 ? 0 : 1);
