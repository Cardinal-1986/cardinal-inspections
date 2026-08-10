/* Build 667 — the Supplement Desk's engine: api/supplement.js.

   The one thing this build must make IMPOSSIBLE is a letter misquoting Ohio
   code at an adjuster. So the heart of this harness is the enforcement test:
   the model is driven to answer with an invented pack_id and an invented
   section number, and the route must hand back an item with NO citation at
   all — downgraded, not trusted. The pack itself is pinned to Cardinal's own
   Supplement Templates page: a citation that the library does not carry
   cannot exist in this file.

   Usage: node harness_667.js [index.html] [api/supplement.js]
   Point both at the previous build as the negative control — it must go red
   (the route does not exist on 666). */
const fs = require('fs');
const path = require('path');

const IDX = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APIF = process.argv[3] || '/home/user/cardinal-inspections/api/supplement.js';
const SRC = fs.readFileSync(IDX, 'utf8');
let API = '';
try { API = fs.readFileSync(APIF, 'utf8'); } catch (e) {}

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

(async function () {

let handler = null;
try {
  const mod = await import('file://' + APIF + '?v=' + Date.now());
  handler = mod.default;
} catch (e) {}
ok('api/supplement.js exists and exports a handler', typeof handler === 'function');

console.log('\n── the pack is pinned to Cardinal\'s own library ──');
{
  const cites = new Set([...API.matchAll(/citation: '([^']+)'/g)].map(m => m[1])
    .concat([...API.matchAll(/extra: '([^']+)'/g)].map(m => m[1])));
  const lib = new Set([...SRC.matchAll(/<span class="rl-cite[^"]*">([^<]+)<\/span>/g)].map(m => m[1]));
  const missing = [...cites].filter(c => !lib.has(c));
  ok('the pack carries real citations (12 distinct)', cites.size >= 12, cites.size);
  ok('EVERY pack citation occurs verbatim in the Supplement Templates page',
    missing.length === 0, 'missing: ' + missing.join(', '));
  ok('the pack covers all five library groups',
    ['code', 'structural', 'matching', 'flashing', 'related']
      .every(g => API.includes("group: '" + g + "'")));
  ok('the model is told it may never quote a section number itself',
    /Never\s*'\s*\+\s*'quote a building-code section number/.test(API.replace(/\n\s*/g, ' ')) ||
    API.includes('Never ') && API.includes('quote a building-code section number'));
}

/* ── drive the real handler ─────────────────────────────────────────────── */
function res() {
  const r = { code: null, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}
function drive(body, opts) {
  opts = opts || {};
  const seen = { gemini: 0 };
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      if (opts.noAuth) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'theo@cardinalrenovations.net' }) };
    }
    if (u.includes('/rest/v1/rpc/is_cardinal_admin')) {
      return { ok: true, status: 200, json: async () => (opts.admin === false ? false : true) };
    }
    if (u.startsWith('https://yipslubcptjoarblzbpl.supabase.co/storage/')) {
      const buf = Buffer.alloc(opts.storedBytes || 1024, 7);
      return { ok: true, status: 200, headers: { get: () => 'application/pdf' },
               arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    }
    if (u.includes('generativelanguage')) {
      seen.gemini++;
      return { ok: true, status: 200, json: async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: opts.modelText || '{}' }] } }],
        usageMetadata: { promptTokenCount: 40000, candidatesTokenCount: 200 } }) };
    }
    if (u.includes('openai.com')) return { ok: false, status: 400, json: async () => ({}) };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const req = { method: 'POST', headers: { authorization: opts.noAuth ? '' : 'Bearer tok' }, body };
  const r = res();
  const done = () => { global.fetch = realFetch; };
  return handler(req, r).then(() => { done(); return { r, seen }; }, (e) => { done(); throw e; });
}

const keyWas = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = 'test-key';
delete process.env.OPENAI_API_KEY;

if (handler) {
console.log('\n── the gates: session, ADMIN, mode, SSRF ──');
{
  const noauth = await drive({ mode: 'analyze' }, { noAuth: true });
  ok('no session → 401', noauth.r.code === 401, noauth.r.code);
  const notadmin = await drive({ mode: 'analyze' }, { admin: false });
  ok('a signed-in NON-admin → 403 (Theo\'s pick, enforced at the route)',
    notadmin.r.code === 403 && /admin-only/.test(notadmin.r.body.error), notadmin.r.code);
  const badmode = await drive({ mode: 'summon' });
  ok('unknown mode → 400', badmode.r.code === 400);
  const notyet = await drive({ mode: 'read_response' });
  ok('read_response → 501, named as the next build', notyet.r.code === 501);
  const evil = await drive({ mode: 'analyze',
    scope: { url: 'https://evil.test/?x=https://yipslubcptjoarblzbpl.supabase.co/storage/v1/' } });
  ok('a URL merely EMBEDDING the storage origin → 400 (the SSRF bound)',
    evil.r.code === 400 && /not a Cardinal storage URL/.test(evil.r.body.error), evil.r.code);
}

console.log('\n── THE ENFORCEMENT: an invented citation cannot survive ──');
{
  const POISON = JSON.stringify({ gaps: [
    { pack_id: 'drip_edge', item: 'Drip edge missing at rakes', why: 'Scope page 3 carries eaves only', confidence: 'high' },
    { pack_id: 'code_R999', item: 'Invented ground', why: 'Per RCO R999.9 (invented)', qty: 55, confidence: 'high' },
    { pack_id: null, item: 'Ridge cap priced but no starter anywhere', why: 'Internally inconsistent', qty: 12, unit: 'LF' }
  ], scope_summary: 'test' });
  const { r } = await drive({ mode: 'analyze',
    scope: { url: 'https://yipslubcptjoarblzbpl.supabase.co/storage/v1/object/sign/photos/scopes/x.pdf?token=t' },
    meas: { eave: 120, rake: 80, ridge: 42, sq: 24 },
    claim: { carrier: 'Allstate', claim_number: '0802889162' } },
    { modelText: POISON, storedBytes: 2048 });
  ok('analyze answers 200', r.code === 200, JSON.stringify(r.body).slice(0, 120));
  const gaps = (r.body && r.body.gaps) || [];
  const drip = gaps.find(g => g.pack_id === 'drip_edge');
  ok('a real pack_id gets its citation COPIED from the pack',
    drip && drip.citation === 'RCO R905.2.8.5', drip && drip.citation);
  ok('…and its quantity COMPUTED from the measurements (eave 120 + rake 80 = 200 LF)',
    drip && drip.qty === 200 && drip.qty_src === 'meas' && drip.unit === 'LF',
    drip && [drip.qty, drip.qty_src, drip.unit].join('/'));
  const invented = gaps.find(g => /Invented ground/.test(g.item));
  ok('an INVENTED pack_id survives only as an uncited observation',
    invented && invented.pack_id === null && invented.citation === null &&
    invented.basis === 'scope-consistency' && invented.confidence === 'low',
    invented && JSON.stringify([invented.pack_id, invented.citation, invented.confidence]));
  ok('NO gap anywhere carries a citation outside the pack',
    gaps.every(g => g.citation === null || /^(RCO|OAC) /.test(g.citation)));
  ok('a null-pack scope-consistency finding is kept (the model may still observe)',
    gaps.some(g => /Ridge cap priced/.test(g.item) && g.citation === null));
  ok('nothing arrives pre-included — a human ticks every item (the 666 philosophy)',
    gaps.every(g => g.included === false));
}

console.log('\n── draft: quantities-only, tokens, dollar flag ──');
{
  const CLEAN = JSON.stringify({ subject: 'Supplement Request — Claim 0802889162',
    letter_html: '<p>Per RCO R905.2.8.5, drip edge is required…</p><p>[[PHOTOS:g1]]</p>' });
  const clean = await drive({ mode: 'draft',
    claim: { carrier: 'Allstate', claim_number: '0802889162', adjuster_name: 'Shawn Feistamel' },
    items: [{ id: 'g1', item: 'Drip edge', pack_id: 'drip_edge', qty: 200, unit: 'LF', why: 'eaves only' }] },
    { modelText: CLEAN });
  ok('draft answers 200 with subject + letter', clean.r.code === 200 &&
    /Supplement Request/.test(clean.r.body.subject) && /\[\[PHOTOS:g1\]\]/.test(clean.r.body.letter_html));
  ok('a clean letter carries dollar_flag false', clean.r.body.dollar_flag === false);
  const PRICED = JSON.stringify({ subject: 's', letter_html: '<p>Please add $1,234.00 for drip edge.</p>' });
  const priced = await drive({ mode: 'draft',
    claim: {}, items: [{ id: 'g1', item: 'x', pack_id: 'drip_edge' }] }, { modelText: PRICED });
  ok('a dollar amount in the draft raises dollar_flag (flagged, never silently edited)',
    priced.r.body.dollar_flag === true && /\$1,234/.test(priced.r.body.letter_html));
  const empty = await drive({ mode: 'draft', claim: {}, items: [] });
  ok('draft with no items → 400', empty.r.code === 400);
}
}

if (keyWas === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = keyWas;

console.log('\n── deploy safety ──');
{
  let vj = null;
  try { vj = JSON.parse(fs.readFileSync('/home/user/cardinal-inspections/vercel.json', 'utf8')); } catch (e) {}
  const fn = (vj && vj.functions) || {};
  ok('api/supplement.js has its maxDuration entry (same commit — the 662 rule)',
    fn['api/supplement.js'] && fn['api/supplement.js'].maxDuration === 60,
    JSON.stringify(fn['api/supplement.js']));
  const missing = Object.keys(fn).filter(k => !fs.existsSync(path.join('/home/user/cardinal-inspections', k)));
  ok('every functions key still resolves to a file', missing.length === 0, missing.join(', '));
  ok('the desk\'s engine never touches /api/sol (the 647 five-callers fence)',
    !/\/api\/sol/.test(API));
  ok('the migration file is at the repo root as the record',
    fs.existsSync('/home/user/cardinal-inspections/supplement_desk.sql'));
  const sql = fs.readFileSync('/home/user/cardinal-inspections/supplement_desk.sql', 'utf8');
  ok('filing_type has NO default (defaults-become-data, refused on purpose)',
    /add column if not exists filing_type\s+text\n\s+check/.test(sql) && !/filing_type\s+text\s+default/.test(sql));
  ok('the mirror speaks the slot\'s own vocabulary (none / 0 / 0)',
    /coalesce\(v_status, 'none'\)/.test(sql) && /coalesce\(v_filed, 0\)/.test(sql));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
