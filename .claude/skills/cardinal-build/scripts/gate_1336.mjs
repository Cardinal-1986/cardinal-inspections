// gate_1336 — receipts (4C + 4.2B) and one balance for estimate-priced jobs on the server.
// node gate_1336.mjs [repo-root]   (point at a 1335 checkout for the negative control)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2] || new URL('../../../../', import.meta.url).pathname);
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// a tiny PostgREST stand-in for owedOn()
function mockFetch(db) {
  return async (url) => {
    const u = decodeURIComponent(String(url));
    const j = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => '' });
    if (u.includes('/collections?')) return j(db.coll || []);
    if (u.includes('/inspection_reports?project_id')) return j(db.docs || []);
    if (u.includes('/contracts?')) return j(db.ctr || []);
    if (u.includes('/projects?')) return j([{ checklist: JSON.stringify(db.ck || {}) }]);
    if (u.includes('/estimates?project_id')) return j((db.est || []).filter(e => /accepted|signed/.test(e.status)));
    return j([]);
  };
}
let pay = null;
try { pay = await import(path.join(ROOT, 'api/pay.js')); } catch (e) { ok(false, 'api/pay.js imports', e.message); }
const owedOn = pay && pay.owedOn;
ok(typeof owedOn === 'function', 'A  api/pay.js exports owedOn for the receipt');
const INV = { id: 'inv1', title: 'Invoice — Karen', total: 1400, project_id: 'k1' };
const CO = { title: 'Change Order — Roof Rejuvenation', total: 299, signed_at: '2026-10-14' };
async function due(db) { globalThis.fetch = mockFetch(db); const o = await owedOn({}, INV); return o.cents / 100; }
if (owedOn) {
  const est = [{ total: 1400, status: 'accepted', archived: false }];
  ok(await due({ est, docs: [INV, CO], coll: [{ amount: 500 }] }) === 1199,
     'B  invoice made BEFORE the change order: pay link = $1,400 + $299 − $500 = $1,199', await due({ est, docs: [INV, CO], coll: [{ amount: 500 }] }));
  ok(await due({ est, docs: [INV, CO], coll: [{ amount: 500 }], ck: { manual_value: 500 } }) === 1199,
     'C  a smaller leftover manual value does not undercut the accepted estimate (max, like jobFinance)');
  ok(await due({ est: [], docs: [INV], coll: [] }) === 1400, 'D  no accepted estimate, no contract → the invoice’s own total');
  ok(await due({ est, docs: [INV, { title: 'Contract — Karen', total: 9000, signed_at: 'x' }, CO], coll: [] }) === 9299,
     'E  a signed contract still wins outright (contract + change order)');
}
const fnOf = (p) => { const s = fs.readFileSync(path.join(ROOT, p), 'utf8'); const i = s.indexOf('async function owedOn'); return i < 0 ? '' : s.slice(i, s.indexOf('\n}\n', i)); };
ok(fnOf('api/pay.js') && fnOf('api/pay.js') === fnOf('api/share.js'), 'F  owedOn is byte-identical in pay.js and share.js');
const rem = fs.readFileSync(path.join(ROOT, 'api/remind.js'), 'utf8');
ok(/var base = Math\.max\(manual, estByP\[pid\] \|\| 0\)/.test(rem) && /estimates\?project_id=/.test(rem), 'G  remind.js prices an estimate job the same way');

let rc = null;
try { rc = await import(path.join(ROOT, 'api/receipt.js')); } catch (e) { ok(false, 'H  api/receipt.js imports', e.message); }
if (rc) {
  const c = { id: 'abc', amount: 500, method: 'check', notes: 'Offline check #1042', collected_at: '2026-10-14' };
  const t1 = rc.receiptText('Karen', c, 1199);
  ok(/\$500\.00/.test(t1) && /check 1042/.test(t1) && /Balance remaining: \$1,199\.00/.test(t1), 'H  receipt text: amount, method, balance', t1);
  ok(/paid in full/.test(rc.receiptText('Karen', c, 0)), 'I  a zero balance reads "paid in full"');
  const h = rc.receiptHtml({ name: 'Karen Frantz', address: '3745 Stutsman Rd' }, c, { total: 1699, paid: 500, balance: 1199 });
  ok(/Balance remaining/.test(h) && /\$1,699\.00/.test(h) && !/style="[^"]*" style=/.test(h), 'J  receipt email: totals, no doubled style attributes');
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
  globalThis.fetch = async (u) => ({ ok: true, status: 200, json: async () => (String(u).includes('/collections?') ? [{ id: 'c1', project_id: 'k1', amount: 900, source: 'insurance' }] : []), text: async () => '' });
  const r = await rc.sendReceipt({ collectionId: 'c1' });
  ok(r.ok && !r.texted && !r.emailed && /carrier/.test(r.skipped.join(' ')), 'K  a carrier check sends no receipt', JSON.stringify(r));
}
const wh = fs.readFileSync(path.join(ROOT, 'api/pay-webhook.js'), 'utf8');
ok(/if \(ins\.ok\) \{\s*try \{ await sendReceipt\(\{ externalRef/.test(wh), 'L  the webhook sends a receipt only for a fresh insert (never on a 409 redelivery)');
ok(/<input type="checkbox" id="crpay-receipt" checked>/.test(html), 'M  Record payment has the receipt tick box, on by default');
ok(html.includes("cx.from('collections').insert(row).select('id')") && html.includes("fetch('/api/receipt'"), 'N  the recorded payment’s id goes to /api/receipt');
console.log(fail ? 'RED — gate_1336: ' + fail + ' fail' : 'GREEN — gate_1336: all pass');
process.exit(fail ? 1 : 0);
