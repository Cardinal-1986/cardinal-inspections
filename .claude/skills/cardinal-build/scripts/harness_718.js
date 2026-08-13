/* Gate for build 718 — a non-admin's sign-in must actually be recorded.
 *
 * Runs the SHIPPED auditStart() (extracted by brace matching) in real Chromium
 * against a Supabase mock that enforces the REAL rule, verified live against the
 * database on 11 Aug 2026 with a non-admin JWT:
 *
 *   POST /rest/v1/audit_sessions?select=id  (Prefer: return=representation) -> 403
 *   POST /rest/v1/audit_sessions            (no RETURNING)                  -> 201
 *
 * i.e. the mock refuses any insert that asks for the row back, because the SELECT
 * policy is is_admin(). Build 717 asks; build 718 does not.
 *
 * Negative control — MUST go red on build 717:
 *   node harness_718.js index.html          -> PASS
 *   node harness_718.js index_prev717.html  -> FAIL
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ART = process.argv[2] || 'index.html';
const WATCHDOG = setTimeout(() => { console.error('GATE TIMEOUT'); process.exit(2); }, 60000);

function func(src, signature) {
  const i = src.indexOf(signature);
  if (i === -1) throw new Error(`no ${signature}`);
  let depth = 0, started = false;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    const ch = src[k];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) return src.slice(i, k + 1); }
  }
  throw new Error('unbalanced braces extracting ' + signature);
}

(async () => {
  const src = fs.readFileSync(ART, 'utf8');
  const startSrc = func(src, 'async function auditStart()');
  // auditNewSid only exists from 717 on; carry it when present.
  const hasHelper = src.indexOf('function auditNewSid()') !== -1;
  const helperSrc = hasHelper ? func(src, 'function auditNewSid()') : '';
  console.log(`artifact : ${path.basename(ART)}`);
  console.log(`auditStart extracted: ${startSrc.length} chars · auditNewSid present: ${hasHelper}`);
  if (startSrc.length < 200) throw new Error('extract too small — refusing to assert');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.route('http://cardinal.harness/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await page.goto('http://cardinal.harness/');

  const res = await page.evaluate(({ startSrc, helperSrc }) => {
    const out = { inserts: [] };
    // ---- Supabase mock enforcing the live-verified RLS behaviour -------------
    const makeQ = (table, state) => ({
      insert(row) {
        state.row = row; state.wantsReturn = false;
        const p = Promise.resolve().then(() => {
          out.inserts.push({ row: state.row, askedForRow: state.wantsReturn });
          if (state.wantsReturn) {
            // exactly what the live DB answers a non-admin: 42501, nothing written
            return { data: null, error: { code: '42501',
              message: 'new row violates row-level security policy for table "audit_sessions"' } };
          }
          out.written = state.row;
          return { data: null, error: null };
        });
        p.select = () => { state.wantsReturn = true; const q = p; q.single = () => p; return q; };
        p.single = () => p;
        return p;
      },
      update(vals) {
        return { eq: (col, v) => { out.updated = { vals, col, v }; return Promise.resolve({ error: null }); } };
      },
    });
    window.sb = { from: (t) => makeQ(t, {}) };
    window.TEAM = true;
    window.currentUser = { email: 'nick@cardinalrenovations.net' };  // a REP, not an admin
    window.auditSid = null;
    const store = {};
    window.ssGet = (k) => (k in store ? store[k] : null);
    window.ssSet = (k, v) => { store[k] = v; };

    // ---- run the shipped code ----------------------------------------------
    // auditStart reads/writes the outer-scope vars TEAM/currentUser/auditSid/sb,
    // so evaluate it where those are the globals it finds.
    const runner = new Function('return (async function(){ ' + helperSrc + '\n' + startSrc +
      '\n var _r = await auditStart(); return { sid: typeof auditSid !== "undefined" ? auditSid : null }; })()');
    return runner().then((r) => {
      out.sidAfter = r.sid;
      out.stored = store.auditSid || null;
      return out;
    }).catch((e) => { out.threw = String(e.message || e); return out; });
  }, { startSrc, helperSrc });

  await browser.close();

  let fails = 0;
  const check = (name, ok, detail) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail !== undefined ? ' — ' + detail : ''}`);
    if (!ok) fails++;
  };

  const ins = res.inserts[0];
  console.log('assertions:');
  check('an insert was attempted', !!ins);
  check('it does NOT ask for the row back', !!ins && ins.askedForRow === false,
        ins ? `askedForRow=${ins.askedForRow}` : 'n/a');
  check('the row was actually written', !!res.written, res.written ? JSON.stringify(res.written) : 'nothing written');
  check('the row carries a client-generated id', !!(res.written && res.written.id),
        res.written && res.written.id ? res.written.id : 'no id');
  check('the id is a valid v4 uuid', !!(res.written && res.written.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(res.written.id)),
        res.written ? String(res.written.id) : 'n/a');
  check('the row carries the signed-in email', !!(res.written && res.written.email === 'nick@cardinalrenovations.net'));
  check('the session id is remembered for the heartbeat', !!res.stored && res.stored === res.written.id,
        String(res.stored));
  check('no page errors', errs.length === 0 && !res.threw, errs.join(' | ') || res.threw || 'none');

  clearTimeout(WATCHDOG);
  console.log(fails === 0 ? '\nPASS' : `\nFAIL (${fails})`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { clearTimeout(WATCHDOG); console.error('HARNESS ERROR:', e.message); process.exit(2); });
