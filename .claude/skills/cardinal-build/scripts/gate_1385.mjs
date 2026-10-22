/* gate_1385 — tidier construction agreements.
 * Roofing: layers are asked once (1A dropdown); no "Existing Layers" section; Roof Pitch is 12.
 * Roofing, siding, gutters: no Terms heading/bullets, Acceptance note kept, body still points at its
 * printed master. Estimate and invoice templates still carry their Terms.
 * Arg: [index.html] -> negative control (1384 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 120000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [], appointments: [], collections: [], inspection_reports: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  const r = await page.evaluate(() => {
    const g = n => { try { return (0, eval)(n); } catch (e) { return ''; } };
    const T = { roof: g('ROOF_AGREEMENT'), siding: g('SIDING_AGREEMENT'), gutter: g('GUTTER_AGREEMENT') };
    const est = g('ESTIMATE_TEMPLATE') || '';
    let pre = '', pre0 = '';
    try {
      const f = g('prefillClientInfo'), pc = g('parseCkAll');
      const tries = [{ layers: '2 Layers' }, { roof: { layers: '2 Layers' } }, { checklist: { layers: '2 Layers' } }];
      for (const ck of tries) {
        const pr = { id: 'x', name: 'Sample Client', address: '1 Main St', checklist: JSON.stringify(ck) };
        if (pc && pc(pr).layers === '2 Layers') { pre = f(T.roof, pr); break; }
      }
      pre0 = f(T.roof, { id: 'y', name: 'Sample Client', address: '1 Main St', checklist: '{}' });
    } catch (e) { pre = 'ERR ' + e.message; }
    return { pre: (/aria-label="Layers to remove"[^>]*>/.exec(pre) || [''])[0], pre0: (/aria-label="Layers to remove"[^>]*>/.exec(pre0) || [''])[0], T, est: { len: est.length, terms: est.indexOf('>Terms</h2>') !== -1 } };
  });
  const roof = r.T.roof;
  ok(roof.length > 1000, 'fixture: roofing agreement template built', roof.length);
  ok(/Remove existing roofing <select[^>]*data-crsel="qty"/.test(roof), 'roofing: layers picked once, in Decking 1A');
  ok(roof.indexOf('Existing Layers') === -1 && roof.indexOf('Number / type of layers') === -1, 'roofing: no second Existing Layers section');
  ok(roof.indexOf('<h3>12. Roof Pitch</h3>') !== -1 && roof.indexOf('13. Roof Pitch') === -1, 'roofing: Roof Pitch is section 12');
  for (const [k, h] of Object.entries(r.T)) {
    ok(h.indexOf('>Terms</h2>') === -1, k + ': no Terms page heading');
    ok(h.indexOf('form the entire agreement') === -1 && h.indexOf('deliberately not retyped') === -1, k + ': no Terms bullets');
    ok(h.indexOf('<b>Acceptance.</b> Signature below') !== -1, k + ': Acceptance note kept');
    ok(h.indexOf('Company Documents') !== -1 && /Construction Agreement \(Master\)/.test(h), k + ': still points at its printed master');
  }
  ok(/data-crsel-value="2"/.test(r.pre), 'an inspection that recorded 2 layers pre-selects 2 in Decking 1A', r.pre);
  ok(r.pre0 && !/data-crsel-value/.test(r.pre0), 'no inspection layers -> nothing pre-selected', r.pre0);
  ok(r.est.len > 1000 && r.est.terms, 'estimate template still has its Terms', JSON.stringify(r.est));
  await ctx.close();
} catch (e) { ok(false, 'browser part ran', String(e && e.message || e)); }
await browser.close();
console.log(fail ? `GATE 1385 RED — ${pass} passed, ${fail} failed` : `GATE 1385 GREEN — ${pass} passed`);
process.exit(fail ? 1 : 0);
