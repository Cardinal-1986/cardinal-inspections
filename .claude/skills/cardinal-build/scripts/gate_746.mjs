/* gate_746.mjs — Company Documents: Download stops swallowing the app.

   Three assertions earn this build:
     1. DOWNLOAD CANNOT REPLACE THE APP. The link must carry target="_blank". This
        is the whole "can't get back to the CRM" bug and it is one attribute.
     2. A 404 ROW SAYS SO. Two of five listed PDFs do not exist in production; the
        row must stop offering a dead link.
     3. ⚠️ AND NOTHING ELSE DOWNGRADES A ROW. A network error, an offline PWA or a
        slow reply must leave the buttons alone — refusing to offer a document that
        IS there would be worse than the bug being fixed. The gate serves 404 for
        the two real missing files, 200 for the three real ones, and a hard network
        FAILURE for a fourth, and asserts each lands differently.

   Usage: node gate_746.mjs [path/to/index.html]     (v745 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');

/* mirrors production exactly, verified with curl on 12 Aug 2026 */
const PRESENT = ['Cardinal_Roofing_Contract.pdf', 'Cardinal_Siding_Contract.pdf', 'Cardinal_Gutter_Contract.pdf'];
const MISSING = ['Cardinal_Window_Contract.pdf', 'Cardinal_Gutter_Contract_Fillable.pdf'];

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
let headCount = 0;
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType(), m = r.request().method();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (u.includes('/docs/')) {
    if (m === 'HEAD') headCount++;
    const name = u.split('/').pop();
    /* the network-failure case: this file EXISTS but the request dies */
    if (name === 'Cardinal_Gutter_Contract.pdf' && m === 'HEAD') return r.abort('failed');
    if (MISSING.indexOf(name) !== -1) return r.fulfill({ status: 404, body: 'Not Found' });
    return r.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' });
  }
  if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(() => { window.__SEED__ = { team_profiles: [], projects: [], inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [], collections: [], commissions: [], draws: [], punch_items: [], appointments: [] }; });
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);

/* render the Company Documents list */
const drew = await page.evaluate(async () => {
  const fns = ['renderCompanyDocs', 'drawCompanyDocs', 'cdRender', 'renderCompanyDocList'];
  for (const f of fns) { if (typeof window[f] === 'function') { try { window[f](); return f; } catch (e) {} } }
  /* fall back to the way a person gets there */
  const el = document.getElementById('cdCats');
  if (el) { const b = el.querySelector('button'); if (b) { b.click(); return 'clicked cdCats'; } }
  return null;
});
await page.waitForTimeout(1400);

const rows = await page.evaluate(() => {
  const list = document.getElementById('cdDocList');
  if (!list) return { noList: true };
  return {
    rows: [...list.querySelectorAll('.cdocrow')].map(r => ({
      name: (r.querySelector('.cdname') ? r.querySelector('.cdname').childNodes[0].textContent : '').trim().slice(0, 46),
      links: [...r.querySelectorAll('a.btn')].map(a => ({
        txt: a.textContent.trim(),
        href: (a.getAttribute('href') || '').split('/').pop(),
        target: a.getAttribute('target') || '',
        rel: a.getAttribute('rel') || '',
        dl: a.hasAttribute('download')
      })),
      missing: !!r.querySelector('.cdmissing'),
      missingTxt: r.querySelector('.cdmissing') ? r.querySelector('.cdmissing').textContent.trim() : ''
    }))
  };
});
chk('the Company Documents list rendered', !rows.noList && rows.rows && rows.rows.length === 5,
    'drew via ' + drew + '; rows=' + (rows.rows ? rows.rows.length : 'none'));

const R = rows.rows || [];
const byFile = f => R.find(r => r.links.some(l => l.href === f)) ||
                    R.find(r => (r.name || '').length && r.missing && f) || null;

/* ── 1. THE BUG: Download must never replace the app ──────────────────────── */
const dls = R.flatMap(r => r.links).filter(l => /download/i.test(l.txt));
const views = R.flatMap(r => r.links).filter(l => /view/i.test(l.txt));
chk('every Download link opens in its own tab', dls.length > 0 && dls.every(l => l.target === '_blank'),
    JSON.stringify(dls.map(l => ({ f: l.href, t: l.target }))));
chk('every Download link is rel=noopener', dls.length > 0 && dls.every(l => /noopener/.test(l.rel)),
    JSON.stringify(dls.map(l => l.rel)));
chk('Download still carries the download attribute (desktop still downloads)',
    dls.length > 0 && dls.every(l => l.dl === true), JSON.stringify(dls.map(l => l.dl)));
chk('View is unchanged — still its own tab', views.length > 0 && views.every(l => l.target === '_blank'),
    JSON.stringify(views.map(l => l.target)));

/* ── 2. a 404 row stops offering a dead link ──────────────────────────────── */
const missingRows = R.filter(r => r.missing);
chk('exactly the two absent documents are marked unavailable', missingRows.length === 2,
    JSON.stringify(R.map(r => ({ n: r.name.slice(0, 28), missing: r.missing, links: r.links.length }))));
chk('and those rows offer no links at all', missingRows.every(r => r.links.length === 0),
    JSON.stringify(missingRows.map(r => r.links.length)));
chk('the note says what is wrong in plain words',
    missingRows.every(r => /not uploaded/i.test(r.missingTxt)), JSON.stringify(missingRows.map(r => r.missingTxt)));

/* ── 3. ⚠️ NOTHING ELSE downgrades a row ──────────────────────────────────── */
const okRows = R.filter(r => !r.missing);
chk('the three real documents keep both buttons', okRows.length === 3 && okRows.every(r => r.links.length === 2),
    JSON.stringify(okRows.map(r => ({ n: r.name.slice(0, 24), l: r.links.length }))));
/* Cardinal_Gutter_Contract.pdf had its HEAD request KILLED at the network layer.
   It exists, so its row must be untouched. This is the assertion that stops the
   probe hiding real documents whenever the iPad drops off wifi. */
const gutter = R.find(r => r.links.some(l => l.href === 'Cardinal_Gutter_Contract.pdf'));
chk('A NETWORK FAILURE DOES NOT HIDE A REAL DOCUMENT', !!gutter && gutter.missing === false && gutter.links.length === 2,
    JSON.stringify(gutter));
chk('the probe actually ran (HEAD requests were made)', headCount >= 4, 'HEAD count = ' + headCount);

/* ── 4. source level ──────────────────────────────────────────────────────── */
const src = APP_HTML;
chk('cdCheckFiles is defined once', (src.match(/function cdCheckFiles\(\)\{/g) || []).length === 1);
chk('it downgrades on 404 and nothing else', /if\(r\.status !== 404\) return;/.test(src));
chk('a failed request is swallowed, leaving the row alone', /\.catch\(function\(\)\{ \/\* offline or blocked/.test(src));
chk('the probe is scoped to the row it is checking', /row\.querySelectorAll\('a\.btn'\)/.test(src));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
