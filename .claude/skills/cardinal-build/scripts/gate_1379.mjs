/* gate_1379 — the Claims hub's "owed" counts the carrier's checks already in (audit R8b).
 * Four insurance jobs at Invoiced, each ACV $6,000 · depreciation $3,000 · approved supplement $1,000:
 *   A carrier paid $6,000 (+ a $1,000 HOMEOWNER payment, which must not count) → dep $3,000 · sup $1,000
 *   B carrier paid $8,000                                                       → dep $1,000 · sup $1,000
 *   C carrier paid $9,500                                                       → dep $0     · sup $500
 *   D nothing recorded                                                          → dep $3,000 · sup $1,000 (as before)
 * Totals: Depreciation $7,000, Supplement $3,500; the Invoiced rail tile $10,500. 1378 reads $12,000 / $4,000.
 * Arg: [index.html] -> negative control (1378: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const P = id => ({ id, name: 'Client ' + id, stage: 'Invoiced', address: '1 Main St', phone: '9375550101', email: 'c@example.com',
  checklist: JSON.stringify({ lead: { claim_type: 'insurance' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const CL = id => ({ id: 'cl' + id, project_id: id, carrier: 'Sample Mutual', approved_rcv: 9000, approved_acv: 6000, approved_depreciation: 3000,
  first_scope_rcv: 8000, deductible: 1000, deductible_waived: false, supplement_status: 'approved', supplement_filed: 1000, supplement_approved: 1000 });
const K = (pid, i, amt, src) => ({ id: 'k' + pid + i, project_id: pid, amount: amt, source: src, collected_at: '2026-10-01', created_at: '2026-10-01T12:00:00Z', type: 'deposit' });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: ['A', 'B', 'C', 'D'].map(P), insurance_claims: ['A', 'B', 'C', 'D'].map(CL),
  collections: [K('A', 1, 6000, 'insurance'), K('A', 2, 1000, null), K('B', 1, 8000, 'insurance'), K('C', 1, 6000, 'insurance'), K('C', 2, 3500, 'insurance')],
  inspection_reports: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page); await page.waitForTimeout(1500); await settle(page);
  const d = await page.evaluate(async () => {
    const T = window.CardinalTruthHome; if (!T) return { err: 'no CardinalTruthHome' };
    try { showCardinalTruth(); } catch (_) {}   /* the hub loads its claims only while its screen is open */
    await new Promise(r => setTimeout(r, 600)); await T.refresh(); const c = T.compute();
    return { dep: c.owedDep, sup: c.owedSupp, inv: c.byKey && c.byKey.Invoiced ? c.byKey.Invoiced.amt : null,
      cache: (window.cacheCollections || []).length, src: (window.cacheCollections || []).filter(k => k.source === 'insurance').length };
  });
  ok(d.cache === 5 && d.src === 4, 'fixture: the app\'s payment cache holds the five payments with their source', JSON.stringify(d));
  ok(d.dep === 7000, 'Depreciation owed counts the carrier\'s checks: $7,000 (was $12,000)', JSON.stringify(d));
  ok(d.sup === 3500, 'Supplement owed: $3,500 (C\'s overpay past depreciation reaches the supplement)', JSON.stringify(d));
  ok(d.inv === 10500, 'the Invoiced rail tile shows what is left: $10,500', JSON.stringify(d));
  await ctx.close();
} catch (e) { ok(false, 'browser part ran', String(e && e.message || e)); }
await browser.close();
console.log(fail ? `GATE 1379 RED — ${pass} passed, ${fail} failed` : `GATE 1379 GREEN — ${pass} passed`);
process.exit(fail ? 1 : 0);
