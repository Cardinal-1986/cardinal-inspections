// gate_1014.mjs — proves the six audit-remainder fixes of build 1014.
//
//  [1] db.remove clears estimates back-references (EXECUTES the shipped fn
//      against a recording sb mock: delete + two null-updates)
//  [2] publish verifies the doc exists (db.get) before db.update (structural,
//      inside the brace-matched publish region)
//  [3] burger has a data-nav="notify" row; hideAdminItemsForNonAdmin does NOT
//      hide it; the nav==='notify' handler branch exists
//  [4] the cr-c-pending span is pinned #e0a13a, not var(--cr-amber)
//  [5] lossAge EXECUTED under TZ=America/New_York with Date.now pinned to an
//      Ohio evening: date-only loss reads the calendar count, not one high
//  [6] payLegacyInNote EXECUTED: with wsPaid>0 and no collection it names the
//      real consequence; with a collection it keeps "keeps the total the same";
//      payMigrateLegacyIn references payMigrateDrop()
//  [7] renderApptsPage's ✕ is behind apptCanEdit (render + handler)
//  [8] vercel.json lists api/coach.js and api/design.js at maxDuration 60
//  [9] the one-time push nudge exists: dismiss key, permission==='default'
//      guard, enableNotifications call
//
// Usage:
//   node gate_1014.mjs                                  # working tree -> GREEN
//   node gate_1014.mjs <index.html> <vercel.json>       # control (1013) -> RED
//
// Every extraction failure is a NAMED failure, never a crash (BUG_CLASSES 37).

process.env.TZ = 'America/New_York';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const INDEX = process.argv[2] || path.join(REPO, 'index.html');
const VERCEL = process.argv[3] || path.join(REPO, 'vercel.json');
const src = fs.readFileSync(INDEX, 'utf8');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

function braceSlice(anchor, label) {
  const at = src.indexOf(anchor);
  if (at === -1) { fails.push(`[extract] ${label}: anchor not found`); return null; }
  let i = src.indexOf('{', at), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(at, j + 1); }
  }
  fails.push(`[extract] ${label}: brace-match failed`);
  return null;
}

// ---- [1] db.remove executes the back-reference clears ----------------------
{
  const txt = braceSlice('remove: async function(id){', 'db.remove');
  if (txt) {
    const calls = [];
    const chain = (table) => ({
      delete: () => ({ eq: async (c, v) => { calls.push({ op: 'delete', table, c, v }); return { error: null }; } }),
      update: (fields) => ({ eq: async (c, v) => { calls.push({ op: 'update', table, fields, c, v }); return { error: null }; } }),
    });
    try {
      const obj = new Function('TEAM', 'TABLE', 'sb', 'lsSave', 'lsLoad',
        'return {' + txt + '};')(true, 'inspection_reports', { from: chain }, () => {}, () => []);
      await obj.remove('DOC-9');
      ok(calls.some(x => x.op === 'delete' && x.table === 'inspection_reports' && x.v === 'DOC-9'),
         `[1] db.remove must delete the doc; calls=${JSON.stringify(calls)}`);
      ok(calls.some(x => x.op === 'update' && x.table === 'estimates' && x.fields && x.fields.doc_id === null && x.c === 'doc_id' && x.v === 'DOC-9'),
         `[1] db.remove must null estimates.doc_id referencing the deleted doc; calls=${JSON.stringify(calls)}`);
      ok(calls.some(x => x.op === 'update' && x.table === 'estimates' && x.fields && x.fields.contract_doc_id === null && x.c === 'contract_doc_id' && x.v === 'DOC-9'),
         `[1] db.remove must null estimates.contract_doc_id too; calls=${JSON.stringify(calls)}`);
    } catch (e) { fails.push(`[1] db.remove execution failed: ${e.message}`); }
  }
}

// ---- [2] publish verifies the doc exists before update ---------------------
{
  const at = src.indexOf('if(est.doc_id && !opts.forceNew){');
  if (at === -1) fails.push('[2] publish doc_id branch not found');
  else {
    const region = src.slice(at, at + 1200);
    const gi = region.indexOf('await window.db.get(est.doc_id)');
    const ui = region.indexOf('await window.db.update(est.doc_id');
    ok(gi > -1 && ui > -1 && gi < ui,
       `[2] publish must db.get(est.doc_id) BEFORE db.update (get@${gi}, update@${ui})`);
  }
}

// ---- [3] the notify door ---------------------------------------------------
{
  ok(/data-nav="notify"/.test(src), '[3] no element carries data-nav="notify" — the handler branch is a door with no button');
  ok(src.includes("nav === 'notify'"), '[3] the notify handler branch is missing');
  const hide = braceSlice('function hideAdminItemsForNonAdmin(){', 'hideAdminItemsForNonAdmin');
  if (hide) ok(!hide.includes("hideOpt('notify')"), '[3] hideAdminItemsForNonAdmin must NOT hide the notify row');
}

// ---- [4] pinned amber ------------------------------------------------------
{
  const span = src.indexOf('class="cr-c-pending"');
  if (span === -1) fails.push('[4] cr-c-pending span not found');
  else {
    const s = src.slice(span, span + 300);
    ok(s.includes('#e0a13a'), '[4] cr-c-pending must pin #e0a13a');
    ok(!s.includes('var(--cr-amber)'), '[4] cr-c-pending must not reference --cr-amber (2.31:1 in rb-light on the theme-fixed card)');
  }
}

// ---- [5] lossAge executes at local midnight --------------------------------
{
  const fnLoss = braceSlice('function lossAge(iso){', 'lossAge');
  const fnCr = braceSlice('function crDate(', 'crDate');
  if (fnLoss && fnCr) {
    try {
      // Pin "now" to 2026-08-23T00:30Z = 2026-08-22 20:30 EDT (an Ohio evening).
      const NOW = Date.parse('2026-08-23T00:30:00Z');
      const out = new Function('window', 'Date',
        fnCr + '\nwindow.crDate = crDate;\n' + fnLoss + '\nreturn lossAge("2026-08-20");')(
        {}, new Proxy(Date, { get: (t, p) => p === 'now' ? () => NOW : t[p], construct: (t, a) => new t(...a) }));
      ok(/2 days ago/.test(out),
         `[5] lossAge('2026-08-20') at Ohio 8:30pm on Aug 22 must say "2 days ago", got "${out}" (UTC parse says 3)`);
    } catch (e) { fails.push(`[5] lossAge execution failed: ${e.message}`); }
  }
}

// ---- [6] honest migrate note ----------------------------------------------
{
  const fnDrop = braceSlice('function payMigrateDrop(){', 'payMigrateDrop');
  const fnNote = braceSlice('function payLegacyInNote(){', 'payLegacyInNote');
  if (!fnDrop) fails.push('[6] payMigrateDrop missing — the note/confirm cannot compute the real Balance Due consequence');
  if (fnDrop && fnNote) {
    try {
      const run = (collPaidObj, wsPaid) => new Function('collPaid', 'currentProject', 'payTotals', 'payLegacyIn', 'fmtMoney',
        fnDrop + '\n' + fnNote + '\nreturn payLegacyInNote();')(
        collPaidObj, { id: 'J1' }, () => ({ wsPaid }), () => [{ p: { amt: 100, dir: 'in' }, i: 0 }],
        (n) => '$' + Number(n).toFixed(2));
      const risky = run({}, 5000);            // no collection yet, wsPaid 5000
      ok(risky.includes('stop counting') && risky.includes('$5000.00'),
         `[6] with wsPaid and no collection the note must name the consequence; got: ${risky.slice(0, 220)}`);
      ok(!risky.includes('keeps the total the same'), '[6] the false "keeps the total the same" must not show in the risky case');
      const safe = run({ J1: 100 }, 5000);    // collections already rule
      ok(safe.includes('keeps the total the same'), `[6] with collections ruling, the original sentence is true and kept; got: ${safe.slice(0, 220)}`);
    } catch (e) { fails.push(`[6] note execution failed: ${e.message}`); }
  }
  const mig = braceSlice('async function payMigrateLegacyIn(){', 'payMigrateLegacyIn');
  if (mig) ok(mig.includes('payMigrateDrop()'), '[6] payMigrateLegacyIn confirm must compute payMigrateDrop() instead of the fixed false sentence');
}

// ---- [7] apMount delete gated ---------------------------------------------
{
  const rap = braceSlice('function renderApptsPage(){', 'renderApptsPage');
  if (rap) ok(/apptCanEdit\(a\)\s*\?[^]*data-apdel/.test(rap),
     '[7] renderApptsPage must render the ✕ behind apptCanEdit(a)');
  const h = src.indexOf("getElementById('apMount').addEventListener('click'");
  if (h === -1) fails.push('[7] apMount click handler not found');
  else ok(src.slice(h, h + 800).includes('apptCanEdit'),
     '[7] the apMount delete handler must re-check apptCanEdit (defense in depth)');
}

// ---- [8] vercel.json maxDuration ------------------------------------------
{
  try {
    const v = JSON.parse(fs.readFileSync(VERCEL, 'utf8'));
    const f = v.functions || {};
    ok(f['api/coach.js'] && f['api/coach.js'].maxDuration === 60, '[8] api/coach.js missing from vercel.json maxDuration');
    ok(f['api/design.js'] && f['api/design.js'].maxDuration === 60, '[8] api/design.js missing from vercel.json maxDuration');
  } catch (e) { fails.push(`[8] vercel.json unreadable: ${e.message}`); }
}

// ---- [9] the one-time nudge ------------------------------------------------
{
  const at = src.indexOf('cr-push-nudge-dismissed');
  if (at === -1) fails.push('[9] push nudge (cr-push-nudge-dismissed) missing');
  else {
    const s = src.slice(Math.max(0, at - 400), at + 2600);
    ok(s.includes("Notification.permission !== 'default'"), "[9] nudge must skip unless permission is 'default' (denied cannot be re-prompted)");
    ok(s.includes('enableNotifications()'), '[9] nudge must call enableNotifications()');
    ok(s.includes('crPushNudge'), '[9] nudge bar element missing');
  }
}

if (fails.length) {
  console.error('RED — gate_1014 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1014: all six audit-remainder fixes present and behaving.');
