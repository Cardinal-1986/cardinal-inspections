// gate_1015.mjs — proves the build-1015 signing-flow repairs.
//
//  [1] buildEstimate keeps SIGN_FOOTER for a Service Contract (body has no
//      data-sig) and strips it for an Agreement (body has data-sig) — EXECUTES
//      the shipped function with stubbed base templates.
//  [2] isEstimateTitle + docKind accept the published 'EST-YYYY-NNNN — …' prefix
//      AND still accept a plain 'Estimate — …' — EXECUTES the shipped functions.
//  [3] api/clientsign.js: the SHIPPED handler, driven with mocked Supabase —
//      footer doc and buyer-slot doc BOTH get signed_at in the PATCH body; the
//      slot doc's buyer slot becomes 'sigslot signed'/data-clientsigned; an
//      already-signed doc returns 409.
//  [4] api/share.js signable = footer OR unfilled buyer slot, and never once
//      signed — EXECUTES the shipped SIGN_RX/SLOT_RX against sample docs.
//  [5] the contract void readers check 'void' (writer's value), not 'voided'.
//
// Usage:
//   node gate_1015.mjs                                      # working tree -> GREEN
//   node gate_1015.mjs <index.html> <clientsign.js> <share.js>   # control (1014) -> RED

import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const INDEX = process.argv[2] || path.join(REPO, 'index.html');
const CLIENTSIGN = process.argv[3] || path.join(REPO, 'api', 'clientsign.js');
const SHARE = process.argv[4] || path.join(REPO, 'api', 'share.js');
const src = fs.readFileSync(INDEX, 'utf8');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
function braceSlice(anchor, label) {
  const at = src.indexOf(anchor);
  if (at === -1) { fails.push(`[extract] ${label}: not found`); return null; }
  let i = src.indexOf('{', at), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(at, j + 1); }
  }
  fails.push(`[extract] ${label}: brace-match failed`); return null;
}
function varLiteral(name) {
  // SIGN_FOOTER = '...' + '...' ...;  — capture the RHS up to the terminating ;\n
  const m = src.match(new RegExp('var ' + name + " = ([\\s\\S]*?);\\n"));
  return m ? m[1] : null;
}

// ---- [1] buildEstimate footer strip ---------------------------------------
{
  const fn = braceSlice('function buildEstimate(', 'buildEstimate');
  const footer = varLiteral('SIGN_FOOTER');
  if (fn && footer) {
    try {
      /* ⚠ 1183: CARDINAL_LOGO_SRC joined this list when build 1182 moved the
         report logo out of index.html into a file. buildEstimate() reads that
         constant now, and running the function standalone without injecting it
         fails with "CARDINAL_LOGO_SRC is not defined" — which is this gate
         being out of date, not the app being broken (in the app the constant is
         a top-level var in the same block, and gate_1182/gate_1183 verify the
         real behaviour). If you add a dependency to buildEstimate, add it here
         in the same edit. */
      const make = new Function('REPORT_TEMPLATE', 'ESTIMATE_BASE_RAW', 'EST_TERMS_PH', 'SIGN_FOOTER',
        'CARDINAL_LOGO_SRC',
        fn + '\nreturn buildEstimate;');
      const FOOTER = new Function('return (' + footer + ');')();
      const BASE = '__EST_TITLE__ __EST_BODY__ __EST_TERMS__ ' + FOOTER;
      const be = make('', BASE, '', FOOTER, '/cardinal-report-logo.png');
      const svc = be('SERVICE <span>CONTRACT</span>', '<p>no slots here</p>');   // deal, no data-sig
      const agr = be('ROOFING <span>AGREEMENT</span>', '<span class="sigslot" data-sig="buyer"><span class="ph">[sign]</span></span>');
      const est = be('REPAIR <span>ESTIMATE</span>', '<p>body</p>');
      ok(svc.includes('Client Acceptance'), '[1] Service Contract must KEEP its signature footer (no data-sig body)');
      ok(!agr.includes('Client Acceptance'), '[1] Agreement (data-sig body) must STRIP the footer (781 unchanged)');
      ok(est.includes('Client Acceptance'), '[1] Estimate must keep the footer');
    } catch (e) { fails.push('[1] buildEstimate execution failed: ' + e.message); }
  }
}

// ---- [2] isEstimateTitle / docKind prefix strip ---------------------------
{
  const iet = braceSlice('function isEstimateTitle(', 'isEstimateTitle');
  const dk = braceSlice('function docKind(', 'docKind');
  if (iet) {
    try {
      const f = new Function(iet + '\nreturn isEstimateTitle;')();
      ok(f('EST-2026-0896 — Estimate — Joeseph') === true, '[2] isEstimateTitle must accept the EST- prefix');
      ok(f('Estimate — Roof') === true, '[2] isEstimateTitle must still accept a plain Estimate title');
      ok(f('Contract — Roofing — Smith') === false, '[2] isEstimateTitle must still reject a contract');
    } catch (e) { fails.push('[2] isEstimateTitle exec failed: ' + e.message); }
  }
  if (dk) {
    try {
      const f = new Function(dk + '\nreturn docKind;')();
      ok(f('EST-2026-0900 — Siding Estimate — X').trade === 'Siding', '[2] docKind must classify a numbered siding estimate');
    } catch (e) { fails.push('[2] docKind exec failed: ' + e.message); }
  }
}

// ---- [3] clientsign handler: signed_at + slot stamp -----------------------
{
  const TOKEN = 'a1b2c3d4-e5f6-7890-abcd-ef0123456789';
  const SIG = 'data:image/png;base64,AAAABBBBCCCC';
  const FOOTER_HTML = '<div class="line"></div>\n    <div class="lbl">\n  Client Acceptance | Date</div>';
  const SLOT_HTML = 'x<span class="sigslot" data-sig="buyer"><span class="ph">[sign]</span></span>y ' +
                    'Date <span class="sigdate" data-sigdate="buyer"><span class="ph">[date]</span></span>z';
  async function drive(docHtml) {
    let patchBody = null;
    globalThis.fetch = async (url, opts) => {
      const u = String(url), m = (opts && opts.method) || 'GET';
      if (u.includes('/inspection_reports?share_token=')) return { ok: true, json: async () => ([{ id: 'D1', title: 'Contract — Roofing', html: docHtml, project_id: null, created_by: 'r@x' }]) };
      if (u.includes('/inspection_reports?id=') && m === 'PATCH') { patchBody = JSON.parse(opts.body); return { ok: true, text: async () => '' }; }
      throw new Error('unexpected fetch ' + m + ' ' + u);
    };
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk-test';
    delete process.env.RESEND_API_KEY;
    const mod = await import(pathToFileURL(CLIENTSIGN).href + '?t=' + Date.now() + Math.random());
    const res = { _s: null, _j: null, status(c){ this._s = c; return this; }, json(o){ this._j = o; return this; } };
    await mod.default({ method: 'POST', body: { t: TOKEN, sig: SIG, name: 'Jane Client' } }, res);
    return { patchBody, res };
  }
  try {
    const foot = await drive(FOOTER_HTML);
    ok(foot.res._s === 200, `[3] footer doc should sign 200, got ${foot.res._s} (${JSON.stringify(foot.res._j)})`);
    ok(foot.patchBody && foot.patchBody.signed_at, '[3] footer sign must write signed_at (was missing pre-1015)');
    ok(foot.patchBody && /data-clientsigned/.test(foot.patchBody.html), '[3] footer sign must stamp data-clientsigned');

    const slot = await drive(SLOT_HTML);
    ok(slot.res._s === 200, `[3] buyer-slot doc should sign 200, got ${slot.res._s} (${JSON.stringify(slot.res._j)})`);
    ok(slot.patchBody && slot.patchBody.signed_at, '[3] slot sign must write signed_at');
    ok(slot.patchBody && /class="sigslot signed" data-sig="buyer"/.test(slot.patchBody.html), '[3] slot sign must mark the buyer slot signed');
    ok(slot.patchBody && /data-sigdate="buyer">[^<]*signed via secure link/.test(slot.patchBody.html), '[3] slot sign must write the buyer date cell');

    const already = await drive('<span class="sigslot signed" data-sig="buyer" data-clientsigned="1"><img></span>');
    ok(already.res._s === 409, `[3] already-signed doc must 409, got ${already.res._s}`);
  } catch (e) { fails.push('[3] clientsign drive failed: ' + e.message); }
}

// ---- [4] share signable test ----------------------------------------------
{
  const s = fs.readFileSync(SHARE, 'utf8');
  const rxLine = (s.match(/const SIGN_RX = (\/.*\/);/) || [])[1];
  const slotLine = (s.match(/const SLOT_RX = (\/.*\/);/) || [])[1];
  if (!slotLine) fails.push('[4] share.js SLOT_RX not present (agreements still unsignable remotely)');
  if (rxLine && slotLine) {
    try {
      const SIGN_RX = new Function('return ' + rxLine)();
      const SLOT_RX = new Function('return ' + slotLine)();
      const signable = (html) => (SIGN_RX.test(html) || SLOT_RX.test(html)) && !html.includes('data-clientsigned');
      ok(signable('<div class="line"></div>\n<div class="lbl"> Client Acceptance </div>'), '[4] footer doc must be signable');
      ok(signable('<span class="sigslot" data-sig="buyer">'), '[4] unfilled buyer slot must be signable');
      ok(!signable('<span class="sigslot signed" data-sig="buyer" data-clientsigned="1">'), '[4] already-signed must not be signable');
      ok(!signable('<p>plain estimate, no slots</p>'), '[4] a non-signable doc must stay non-signable');
    } catch (e) { fails.push('[4] share regex exec failed: ' + e.message); }
  }
}

// ---- [5] void status readers -----------------------------------------------
{
  ok(src.includes("_canVoid = (_s !== 'signed' && _s !== 'executed' && _s !== 'void')"),
     "[5] _canVoid must check 'void' (the written value), not 'voided'");
  ok(src.includes("if(s === 'void')"), "[5] the Voided eyebrow must check 'void'");
  ok(!src.includes("_s !== 'voided')"), "[5] no reader should still check 'voided'");
}

if (fails.length) {
  console.error('RED — gate_1015 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1015: signing flow whole — footer kept for service contracts, remote sign writes signed_at + stamps buyer slots, numbered estimates classify, void status matches.');
