// gate_1337 — invoice card "$0 paid", Ready-to-invoice source label, Record payment asks above the balance.
// Drives the real cr-ar-script in Chromium with the mock (boot pattern of gate_1316). node gate_1337.mjs [index.html]
import fs from 'node:fs';
import { chromium } from 'playwright';
const FILE = process.argv[2] || new URL('../../../../index.html', import.meta.url).pathname;
const html = fs.readFileSync(FILE, 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
ok(html.includes("(paid > 0 ? money(paid) : '$0') + ' paid of '"), 'A  the card prints $0, not --, when nothing is paid');
ok(html.includes("x.fin.source === 'estimate' ? 'accepted estimate' : 'signed contract'"), 'B  Ready to invoice names its source');
const i = html.indexOf('function savePayModal(){'); const body = i > 0 ? html.slice(i, html.indexOf('\n  }\n', i)) : '';
ok(/amt > _bal \+ 0\.005 && !_payOver/.test(body) && /crAsk\(/.test(body), 'C  Record payment asks before recording more than the balance');
ok(body.indexOf('crAsk(') < body.indexOf('collectionsInsert(row)'), 'D  the ask comes BEFORE the insert');
// behaviour: the ask path returns without writing; "yes" records once
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const p = await b.newPage();
await p.setContent('<div id="x"></div>');
const r = await p.evaluate((src) => {
  const W = []; let asked = 0, answer = false;
  window.crAsk = () => { asked++; return Promise.resolve(answer); };
  window.crTell = () => {}; window.money = (n) => '$' + n;
  const env = { q: (id) => ({ 'crpay-amt': { value: '14000' }, 'crpay-method': { getAttribute: () => 'check' }, 'crpay-type': { getAttribute: () => 'final' },
    'crpay-ref': { value: '' }, 'crpay-date': { value: '2026-10-14' }, 'crpay-save': {}, 'crpay-receipt': null })[id] || null };
  const f = new Function('q', 'jobFinance', 'collectionsInsert', 'closePayModal', 'crTell', 'crAsk', 'money', 'refreshInv', 'fail', 'sendPayReceipt', 'reload', '_ctx',
    'var _payFor = {id:"k1",name:"Karen"}; var currentUser = {email:"jacob@x"}; var _payOver = false;\n' + src + '\n return savePayModal;');
  const save = f(env.q, () => ({ balance: 1400 }), (row) => { W.push(row.amount); return Promise.resolve({ data: [{ id: 'c1' }] }); },
    () => {}, () => {}, (...a) => window.crAsk(...a), (n) => '$' + n, () => {}, () => {}, () => {}, undefined);
  return (async () => {
    save(); await new Promise(r => setTimeout(r, 20)); const afterNo = W.length;
    answer = true; save(); await new Promise(r => setTimeout(r, 20));
    return { asked, afterNo, afterYes: W.length };
  })();
}, body + '\n  }');
ok(r.asked >= 1 && r.afterNo === 0, 'E  $14,000 against a $1,400 balance asks, and "no" writes nothing', JSON.stringify(r));
ok(r.afterYes === 1, 'F  "yes" records it exactly once');
await b.close();
console.log(fail ? 'RED — gate_1337: ' + fail + ' fail' : 'GREEN — gate_1337: all pass');
process.exit(fail ? 1 : 0);
