// gate_1364 — a contract's header is an agreement's, not an estimate's.
// A: the Roofing, Siding and Gutter agreements and the Service Contract carry no "Estimate #", no "Valid Through",
//    no second Client Contact row, and title "— Agreement"; they keep Prepared For / Date / Property Address /
//    Prepared By / Client Contact.
// B: a new Siding agreement on a real client fills that header (name, today, address, rep, contact).
// C: estimates are untouched (still Estimate # / Valid Through); invoices keep their 1313 header.
// node gate_1364.mjs [index.html]   (1363 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.on('dialog', d => d.accept().catch(() => {}));
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP);
await p.addInitScript(() => { const S = window.__SEED__; S.projects.push({ id: 'gS', name: 'Pat Siding', address: '9 Elm St, Dayton, OH 45419', phone: '9375550101', email: 'pat@example.com', stage: 'Prospect', created_by: 'theo@cardinalrenovations.net', created_at: '2026-10-10T10:00:00Z', updated_at: '2026-10-10T10:00:00Z', checklist: JSON.stringify({ po: 1300, manual_value: 18500, lead: { claim_type: 'retail', retail: true } }) }); });
await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
const r = await p.evaluate(async () => {
  const meta = h => { const m = /<table class="meta">[\s\S]*?<\/table>/.exec(h || ''); return m ? m[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''; };
  const title = h => { const m = /<title>([^<]*)<\/title>/.exec(h || ''); return m ? m[1] : ''; };
  const g = n => { try { return eval(n); } catch (e) { return null; } };
  const out = {};
  for (const n of ['ROOF_AGREEMENT', 'SIDING_AGREEMENT', 'GUTTER_AGREEMENT', 'CONTRACT_TEMPLATE', 'SIDING_TEMPLATE', 'GENERAL_TEMPLATE']) {
    const h = g(n); out[n] = { meta: meta(h), title: title(h), contacts: (meta(h).match(/Client Contact/g) || []).length };
  }
  out.invoice = (() => { try { const h = buildEstimate('INVOICE', '<p>x</p>'); return meta(h); } catch (e) { return 'ERR ' + e.message; } })();
  window.openProject('gS'); await new Promise(r => setTimeout(r, 2000));
  const w0 = (window.__WRITES__ || []).length;
  await window.createContractForCurrent('siding'); await new Promise(r => setTimeout(r, 2500));
  const ins = (window.__WRITES__ || []).slice(w0).filter(w => w.table === 'inspection_reports' && w.op === 'insert')[0];
  const row = ins && (Array.isArray(ins.payload) ? ins.payload[0] : ins.payload);
  out.made = row ? meta(row.html) : null;
  return out;
});
for (const n of ['ROOF_AGREEMENT', 'SIDING_AGREEMENT', 'GUTTER_AGREEMENT', 'CONTRACT_TEMPLATE']) {
  const x = r[n] || {};
  ok(x.meta && !/Estimate #|Valid Through|Estimate Date/.test(x.meta) && x.contacts === 1 && /— Agreement/.test(x.title),
     `A ${n}: no Estimate # / Estimate Date / Valid Through, one contact row, titled Agreement`, JSON.stringify(x));
  ok(/Prepared For/.test(x.meta) && /\bDate\b/.test(x.meta) && /Property Address/.test(x.meta) && /Prepared By/.test(x.meta), `A ${n}: keeps Prepared For / Date / Property Address / Prepared By`);
}
ok(r.made && /Pat Siding/.test(r.made) && /9 Elm St/.test(r.made) && /9375550101/.test(r.made) && /20\d\d/.test(r.made) && !/\[/.test(r.made),
   'B: a new Siding agreement fills the whole header', r.made);
ok(r.SIDING_TEMPLATE && /Estimate #/.test(r.SIDING_TEMPLATE.meta) && /Valid Through/.test(r.SIDING_TEMPLATE.meta), 'C: a siding ESTIMATE keeps Estimate # / Valid Through', r.SIDING_TEMPLATE && r.SIDING_TEMPLATE.meta);
ok(r.GENERAL_TEMPLATE && /Estimate #/.test(r.GENERAL_TEMPLATE.meta), 'C: the repair estimate keeps its header');
ok(/Bill To/.test(r.invoice) && /Due/.test(r.invoice), 'C: an invoice keeps its 1313 header', r.invoice);
await b.close();
console.log(fail ? 'GATE 1364 RED — ' + fail + ' failing' : 'GATE 1364 GREEN');
