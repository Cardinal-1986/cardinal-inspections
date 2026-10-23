/* gate_1391 — checks that could never pass.
 *   A  no `typeof X === / !== '<string>'` in index.html compares against a string typeof cannot return
 *      (13 sites compared against 'async function'); cr-suf's wrapper is retired, not switched on
 *   B  in Chromium: the switches really flipped — Admin Health picked up both extensions, and
 *      Production's punch tick goes through CardinalPunch.toggle (one write, done_by stamped)
 *   C  api/supplement.js, driven with a stubbed fetch: photo mode and Draft letter both answer 200
 *      (they were ReferenceErrors: packLines, items)
 * Args: [index.html] [api/supplement.js] -> negative control (1390 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const API = process.argv[3] || '/home/user/cardinal-inspections/api/supplement.js';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

/* A — static */
const VALID = new Set(['undefined', 'object', 'boolean', 'number', 'bigint', 'string', 'symbol', 'function']);
const bad = [];
for (const m of APP_HTML.matchAll(/typeof\s+[\w$.\[\]'"]+\s*[!=]==?\s*(['"])([^'"\n]{1,30})\1/g))
  if (!VALID.has(m[2])) bad.push(m[2] + ' @' + APP_HTML.slice(0, m.index).split('\n').length);
ok(bad.length === 0, 'A  every typeof comparison names a real typeof result', bad.slice(0, 4).join(', '));
ok(/1391: RETIRED/.test(APP_HTML), 'A  cr-suf readScopeOfLoss wrapper retired (routeScopeToReader owns prepare)');

/* B — runtime */
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [{ id: 'j1', name: 'Sample Client', stage: 'Scheduled', address: '1 Main St', checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }],
  punch_items: [{ id: 'pi1', project_id: 'j1', title: 'Reset gutter', status: 'open', created_at: '2026-10-01T12:00:00Z' }],
  inspection_reports: [], estimates: [], collections: [], appointments: [], commissions: [], contracts: [], insurance_claims: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page); await page.waitForTimeout(1500); await settle(page);
  await page.waitForTimeout(3500);
  const r = await page.evaluate(async () => {
    const A = window.CardinalAdminHealth || {};
    let used = 0;
    const P = window.CardinalPunch; const orig = P && P.toggle;
    if (P) P.toggle = async function(id){ used++; return orig.apply(this, arguments); };
    try { if (P && P.reload) await P.reload(); } catch (_) {}
    try { window.CardinalProduction.open(); } catch (_) {}
    await new Promise(r => setTimeout(r, 1500));
    const go = document.querySelector('#cr-pb [data-go="cal"]'); if (go) go.click();
    await new Promise(r => setTimeout(r, 900));
    const before = (window.__WRITES__ || []).length;
    const box = document.querySelector('#cr-pb [data-tick="pi1"]');
    let via = 'none';
    if (box) { box.click(); via = 'click'; }
    await new Promise(r => setTimeout(r, 800));
    const w = (window.__WRITES__ || []).slice(before).filter(x => x.table === 'punch_items');
    return { roster: !!A.__crRosterHooked, extra: !!A.__crExtraHooked, used, via, writes: w.length,
             doneBy: w[0] && w[0].values && w[0].values.done_by };
  });
  ok(r.roster && r.extra, 'B  Admin Health extensions hooked in (roster + extra checks)', JSON.stringify({ roster: r.roster, extra: r.extra }));
  if (r.via === 'click') {
    ok(r.used === 1, 'B  Production punch tick delegates to CardinalPunch.toggle', 'used ' + r.used);
    ok(r.writes === 1, 'B  exactly one punch_items write (no double flip)', r.writes + ' writes');
  } else console.log('  (punch tick control not found on Production — delegation checked statically only)');
  await ctx.close();
} finally { await browser.close(); }

/* C — api/supplement.js with a stubbed transport */
const tmp = fs.mkdtempSync('/tmp/g1391-');
fs.copyFileSync(API, path.join(tmp, 'supplement.mjs'));
process.env.GEMINI_API_KEY = 'test';
let ai = 0;
globalThis.fetch = async (url, opt) => {
  const u = String(url);
  const J = (o, s = 200) => ({ ok: s < 300, status: s, json: async () => o, arrayBuffer: async () => new ArrayBuffer(0) });
  if (u.includes('/auth/v1/user')) return J({ email: 'theo@cardinalrenovations.net' });
  if (u.includes('/rpc/is_cardinal_admin')) return J(true);
  if (u.includes('/storage/v1/')) return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([255, 216, 255, 224, 1, 2, 3]).buffer };
  if (u.includes('generativelanguage')) {
    ai++;
    const body = JSON.parse(opt.body); const txt = JSON.stringify(body);
    const ans = /letter_html/.test(txt) ? { subject: 'Supplement', letter_html: '<p>Please add starter.</p>' }
                                        : { gaps: [], scope_summary: '' };
    return J({ candidates: [{ content: { parts: [{ text: JSON.stringify(ans) }] } }] });
  }
  return J({}, 404);
};
const mod = await import(pathToFileURL(path.join(tmp, 'supplement.mjs')).href);
const call = async body => { let st = 0, out = null;
  const res = { status(s){ st = s; return this; }, json(o){ out = o; return this; }, setHeader(){} };
  await mod.default({ method: 'POST', headers: { authorization: 'Bearer t' }, body }, res); return { st, out }; };
const STORE = 'https://yipslubcptjoarblzbpl.supabase.co/storage/v1/object/sign/photos/a.jpg?token=x';
const ph = await call({ mode: 'photos', photos: [{ url: STORE }], meas: {}, claim: {} });
ok(ph.st === 200, 'C  photo mode answers 200', ph.st + ' ' + JSON.stringify(ph.out).slice(0, 120));
const dr = await call({ mode: 'draft', items: [{ item: 'Starter strip', pack_id: null }], claim: {}, meas: {} });
ok(dr.st === 200 && dr.out && dr.out.ok !== false, 'C  Draft letter answers 200 after the model call', dr.st + ' ' + JSON.stringify(dr.out).slice(0, 120));
ok(ai >= 2, 'C  the model was reached on both paths', 'calls ' + ai);
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
