// gate_1349 — Payments card on the client page: tabs, who/when, duplicate flag, remove, and the office-only paid-out side.
// node gate_1349.mjs [index.html]   (1347 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

async function run(as) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=' + as, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const r = await p.evaluate(async (as) => {
    const pause = ms => new Promise(r => setTimeout(r, ms));
    const S = window.__SEED__, out = {};
    const pr = S.projects.find(x => x.id === 'p1');
    pr.stage = 'Scheduled';
    if (as === 'nick') pr.sales_rep = 'nick@cardinalrenovations.net';
    const now = new Date().toISOString();
    const ago = m => new Date(Date.now() - 5 * 864e5 + m * 6e4).toISOString();   /* entered 5 days back: past the rep's 48-hour window */
    S.inspection_reports.push({ id: 'ctr-p', title: 'Contract — Exterior — Test', project_id: 'p1', status: 'sent', signed_at: now,
      total: 136968.46, html: '<html><body><p>x</p></body></html>', created_at: now, updated_at: now, created_by: 'theo@cardinalrenovations.net' });
    S.collections = [
      { id: 'c1', project_id: 'p1', collected_at: '2026-10-14', amount: 22326.23, type: 'deposit', source: 'homeowner', method: 'check', created_by: 'nick@cardinalrenovations.net', created_at: ago(0) },
      { id: 'c2', project_id: 'p1', collected_at: '2026-10-14', amount: 46158.00, type: 'deposit', source: 'homeowner', method: 'check', created_by: 'nick@cardinalrenovations.net', created_at: ago(1) },
      { id: 'c3', project_id: 'p1', collected_at: '2026-10-14', amount: 22326.23, type: 'deposit', source: 'homeowner', method: 'check', created_by: 'nick@cardinalrenovations.net', created_at: ago(12) }
    ];
    S.crews = (S.crews || []).concat([{ id: 'cw1', name: 'Tear-off Crew', trade: 'Roofing' }]);
    S.crew_payments = [{ id: 'cp1', crew_id: 'cw1', project_id: 'p1', amount: 8000, method: 'check', paid_on: '2026-10-15', created_at: now }];
    await window.reload(); await pause(500);
    window.__READS__ = [];
    window.openProject('p1'); await pause(2200);
    const card = () => document.querySelector('#projectView .crjp-card');
    const c = card();
    out.has = !!c;
    if (!c) return out;
    const inv = document.querySelector('#projectView .crji-card:not(.crjp-card)');
    out.afterInvoice = !!(inv && inv.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
    out.text = c.textContent.replace(/\s+/g, ' ');
    out.tabs = [...c.querySelectorAll('[data-crjp-tab]')].map(x => x.textContent.trim());
    out.rows = c.querySelectorAll('.crjp-row').length;
    out.flags = [...c.querySelectorAll('.crjp-flag')].map(f => f.closest('.crjp-row').querySelector('[data-crjp-more],[data-crjp-rm]')?.getAttribute('data-crjp-more') || f.querySelector('[data-crjp-rm]')?.getAttribute('data-crjp-rm'));
    out.sub = (c.querySelector('.crjp-row small') || {}).textContent;
    out.fin = window.jobFinance ? window.jobFinance(pr) : null;
    out.readTables = [...new Set((window.__READS__ || []).map(x => x.table))];
    const t = c.querySelector('[data-crjp-tab="out"]');
    if (t) { t.click(); await pause(150); out.outText = card().querySelector('.crjp-list').textContent.replace(/\s+/g, ' '); out.outRows = card().querySelectorAll('.crjp-row').length; }
    const a = card().querySelector('[data-crjp-tab="all"]');
    if (a) { a.click(); await pause(150); out.allAmts = [...card().querySelectorAll('.crjp-amt')].map(x => x.textContent.trim()); }
    const ib = card().querySelector('[data-crjp-tab="in"]'); if (ib) { ib.click(); await pause(150); }
    const rm = card().querySelector('.crjp-flag [data-crjp-rm]');
    out.rmOffered = !!rm;
    if (rm) {
      rm.click(); await pause(400);
      const go = document.querySelector('.askgo'); out.asked = go ? (document.querySelector('.askq') || {}).textContent : null;
      if (go) go.click();
      await pause(1800);
      out.deleted = (window.__WRITES__ || []).filter(w => /^collections:delete/.test(typeof w === 'string' ? w : (w.table + ':' + w.op))).length;
      out.left = (S.collections || []).map(x => x.id);
      const c2 = card();
      out.after = c2 ? { rows: c2.querySelectorAll('.crjp-row').length, flags: c2.querySelectorAll('.crjp-flag').length, tab: (c2.querySelector('[data-crjp-tab="in"]') || {}).textContent } : null;
    }
    return out;
  }, as);
  await ctx.close();
  return r;
}

const t = await run('theo');
ok(t.has, 'the client page has a Payments card');
if (t.has) {
  ok(t.afterInvoice, 'it sits right after the invoice card');
  ok(t.tabs.length === 3 && /Received · 3/.test(t.tabs[0]) && /Paid out · 1/.test(t.tabs[1]), 'office sees three tabs with counts', JSON.stringify(t.tabs));
  ok(t.rows === 3, 'Received tab lists the three payments', t.rows);
  ok(/Oct 14/.test(t.sub || '') && /entered \d{1,2}:\d\d (am|pm)/.test(t.sub || '') && /Nick/.test(t.sub || ''), 'each payment shows date, time entered and who', t.sub);
  ok(/CHECK/.test(t.text), 'the method is shown');
  ok(t.flags.length === 1 && t.flags[0] === 'c3', 'only the later-entered copy is flagged', JSON.stringify(t.flags));
  ok(t.fin && t.text.indexOf('Balance due') !== -1 && /Paid out\s*\$8,000\.00/.test(t.text), 'summary shows paid out $8,000.00', t.text.slice(0, 200));
  ok(/Tear-off Crew/.test(t.outText || '') && t.outRows === 1, 'Paid out tab lists the crew payment by crew name', t.outText);
  ok(t.allAmts && t.allAmts.some(x => /^\+\$/.test(x)) && t.allAmts.some(x => /^−\$8,000/.test(x)), 'All tab signs money in + and out −', JSON.stringify(t.allAmts));
  ok(t.rmOffered && /22,326\.23/.test(t.asked || ''), 'Remove this one asks first, naming the amount', t.asked);
  ok(t.deleted === 1 && JSON.stringify(t.left) === '["c1","c2"]', 'it deletes exactly the duplicate', JSON.stringify(t.left));
  ok(t.after && t.after.rows === 2 && t.after.flags === 0 && /Received · 2/.test(t.after.tab || ''), 'the card repaints: two payments, no flag', JSON.stringify(t.after));
}
const n = await run('nick');
ok(n.has, 'a rep sees the Payments card on their own job');
if (n.has) {
  ok(n.tabs.length === 0 && !/Paid out/.test(n.text), 'a rep sees no Paid out tab or total', JSON.stringify(n.tabs));
  ok(!n.readTables.includes('crew_payments') && !n.readTables.includes('draws'), 'a rep never asks for crew payments or draws', JSON.stringify(n.readTables));
  ok(n.rows === 3, 'a rep sees the money that came in', n.rows);
  ok(!n.rmOffered, 'a rep is not offered Remove on a payment entered days ago');
}
await b.close();
console.log(fail ? 'GATE 1349 RED — ' + fail + ' failing' : 'GATE 1349 GREEN');
process.exit(fail ? 1 : 0);
