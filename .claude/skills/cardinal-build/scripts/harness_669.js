/* Build 669 — repairability joins the pack; the Desk reads iTel.

   Theo: "We supplement a lot based on repair ability, discontinued shingle or
   siding, reasonable appearance as well. ITEL is also used when needed."
   Discontinued + appearance were already in the pack; repairability was the
   gap, and iTel (28 real lab reports, keyed by claim) is its evidence.

   Usage: node harness_669.js [index.html] [api/supplement.js] [supplement.html]
   Point all three at the previous build as the negative control — must go red. */
const fs = require('fs');

const IDX = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APIF = process.argv[3] || '/home/user/cardinal-inspections/api/supplement.js';
const DESKF = process.argv[4] || '/home/user/cardinal-inspections/supplement.html';
const SRC = fs.readFileSync(IDX, 'utf8');
const API = fs.readFileSync(APIF, 'utf8');
const DESK = fs.readFileSync(DESKF, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

(async function () {

console.log('\n── the library grows FIRST (the honesty core\'s order of operations) ──');
{
  ok('the Supplement Templates page carries the new Repairability card',
    /Repairability &mdash; Brittle Shingles \/ Repair Not Feasible/.test(SRC));
  ok('…citing the appearance regulation the pack will copy',
    /Brittle Shingles[\s\S]{0,300}OAC 3901-1-54\(I\)\(1\)\(b\)/.test(SRC));
  ok('…with ITEL named as its documentation',
    /ITEL report \(control number\) showing the product discontinued/.test(SRC));
  ok('…and the brittle test in the sample wording',
    /brittle test performed on \[date\] shows adjacent shingles fracturing/.test(SRC));
}

console.log('\n── the pack entry, pinned as always ──');
{
  ok('repairability is in the pack', /id: 'repairability', group: 'matching'/.test(API));
  ok('…citing OAC 3901-1-54(I)(1)(b) (copied server-side like every citation)',
    /'repairability'[\s\S]{0,80}citation: 'OAC 3901-1-54\(I\)\(1\)\(b\)'/.test(API));
  const cites = new Set([...API.matchAll(/citation: '([^']+)'/g)].map(m => m[1])
    .concat([...API.matchAll(/extra: '([^']+)'/g)].map(m => m[1])));
  const lib = new Set([...SRC.matchAll(/<span class="rl-cite[^"]*">([^<]+)<\/span>/g)].map(m => m[1]));
  const missing = [...cites].filter(c => !lib.has(c));
  ok('the pack↔library pin STILL holds with the new entry', missing.length === 0,
    'missing: ' + missing.join(', '));
}

console.log('\n── iTel reaches the analyst (the route, executed) ──');
{
  let handler = null;
  try { handler = (await import('file://' + APIF + '?v=' + Date.now())).default; } catch (e) {}
  ok('handler imports', typeof handler === 'function');
  if (handler) {
    const keyWas = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.OPENAI_API_KEY;
    async function drive(body) {
      const seen = { prompt: '' };
      const realFetch = global.fetch;
      global.fetch = async (url, init) => {
        const u = String(url);
        if (u.includes('/auth/v1/user')) return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'theo@cardinalrenovations.net' }) };
        if (u.includes('is_cardinal_admin')) return { ok: true, status: 200, json: async () => true };
        if (u.includes('generativelanguage')) {
          const sent = JSON.parse(init.body);
          seen.prompt = sent.contents[0].parts.map(p => p.text || '').join('\n');
          return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'STOP',
            content: { parts: [{ text: '{"gaps":[],"scope_summary":"s"}' }] } }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };
      const r = { code: null, body: null, status(c){ this.code = c; return this; }, json(b){ this.body = b; return this; } };
      await handler({ method: 'POST', headers: { authorization: 'Bearer t' }, body }, r);
      global.fetch = realFetch;
      return seen;
    }
    const BASE = { mode: 'analyze', scope: { file: 'QUJD', mime: 'application/pdf' },
      meas: { eave: 120 }, claim: { carrier: 'Allstate' } };
    const withItel = await drive(Object.assign({}, BASE, { itel: {
      control_number: 'IT-2231', verdict: 'No match available', match_product: null,
      mismatch_notes: 'Profile discontinued 2019; closest match differs in exposure.' } }));
    ok('an on-file iTel report reaches the prompt, with its control number',
      /ITEL lab report is ON FILE/.test(withItel.prompt) && /IT-2231/.test(withItel.prompt),
      withItel.prompt.slice(withItel.prompt.indexOf('ITEL') - 10, withItel.prompt.indexOf('ITEL') + 120));
    ok('…verdict and notes ride along', /No match available/.test(withItel.prompt) &&
      /Profile discontinued 2019/.test(withItel.prompt));
    ok('…and the model is told to REFERENCE it, not re-derive it',
      /reference this report in the why field/.test(withItel.prompt));
    const without = await drive(BASE);
    ok('no report on file → not a word about ITEL in the prompt',
      !/ITEL lab report is ON FILE/.test(without.prompt));
    if (keyWas === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = keyWas;
  }
}

console.log('\n── the Desk loads it, shows it, sends it ──');
{
  ok('the Desk loads the claim\'s latest iTel report (bounded, named columns)',
    /from\('itel_lab_reports'\)/.test(DESK) &&
    /select\('control_number, verdict, match_product, mismatch_notes, report_date'\)/.test(DESK) &&
    /\.limit\(1\)/.test(DESK));
  ok('…quietly — absence or refusal is not an error', /catch\(_\)\{\}/.test(
    DESK.slice(DESK.indexOf('async function loadItel'), DESK.indexOf('async function loadItel') + 900)));
  ok('the claim card shows the verdict + control number',
    /kv\('iTel on file',/.test(DESK));
  ok('the analyze payload carries it', /itel: S\.itel \|\| null,/.test(DESK));
}

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 669 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 669; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:669,/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
