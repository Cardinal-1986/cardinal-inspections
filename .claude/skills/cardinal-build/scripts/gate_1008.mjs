/* gate_1008.mjs — the two build-1005 fixes: Lead Source reaches the report, Claim Type is a real choice.

   Regressions fixed: (1) build 1005 made Lead Source required on the New Lead form but wrote it to
   checklist.lead.source (nested), while every report/chart/filter/profile reads checklist.lead_source
   (flat) — so the mandatory field fed nothing. (2) build 1005's Claim Type refusal was dead: an
   'unknown' radio was pre-checked in markup and openLeadForm always checked one, so the !_ct guard
   never fired. Now the intake writes the flat lead_source, and no claim type is pre-selected on a
   neutral portal so the choice is active.

   Control: build 1007 — no flat lead_source write, 'unknown' pre-checked, openLeadForm forces a radio.
   Usage: node gate_1008.mjs [path] */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1008: playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const APP  = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8')
            + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');

let fails = [], passes = 0;
const need = (n, ok, d) => { if (ok) passes++; else fails.push(n + (d ? ' — ' + d : '')); };

/* source-level: the 'unknown' radio is no longer pre-checked */
need('the "unknown" claim-type radio is not pre-checked in markup', !APP.includes('value="unknown" checked'),
     "'unknown' is still checked by default");

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'],
}).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
const page = await ctx.newPage();
page.on('pageerror', () => {});
await page.route('**/*', async r => {
  const u = r.request().url();
  if (u.startsWith('https://sentinel.test/'))
    return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
    return r.fulfill({ status: 200, contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  return r.fulfill({ status: 200, body: '' });
});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

/* fill the New Lead form, pick (or clear) claim type + source, click Save, capture pdb.create */
const attempt = (claim, source) => page.evaluate(async ([claim, source]) => {
  const out = {};
  try {
    const M = document.getElementById('leadFormModal'); if (!M) return { err: 'no form' };
    M.style.display = 'block'; M.classList.remove('ldshow');
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('ldFirst', 'Test'); set('ldLast', 'Lead'); set('ldStreet', '1 Main'); set('ldCity', 'Dayton'); set('ldState', 'OH'); set('ldZip', '45402');
    const nc = document.getElementById('ldNoContact'); if (nc) nc.checked = true;
    document.querySelectorAll('input[name="ldClaimType"]').forEach(r => { r.checked = (claim != null && r.value === claim); });
    set('ldSource', source || '');
    out.created = null;
    window.pdb = window.pdb || {}; window.pdb.create = async (f) => { out.created = f; return 'fake-id'; };
    window.reload = async () => {}; window.openProject = () => {};
    document.getElementById('ldError').textContent = '';
    document.getElementById('ldSave').click();
    await new Promise(r => setTimeout(r, 250));
    out.error = document.getElementById('ldError').textContent || '';
    out.createdCalled = out.created !== null;
    if (out.created && out.created.checklist) { try { out.ck = JSON.parse(out.created.checklist); } catch (_) { out.ck = null; } }
    return out;
  } catch (e) { return { err: String(e).split('\n')[0] }; }
}, [claim, source]);

// A — a full valid create writes lead_source at the FLAT key the reports read
const a = await attempt('retail', 'Referral');
need('A: create fires with claim + source', a.createdCalled === true, JSON.stringify({ err: a.err, e: a.error }));
need('A: checklist.lead_source (flat) is the picked source', !!(a.ck && a.ck.lead_source === 'Referral'),
     'flat lead_source=' + (a.ck ? JSON.stringify(a.ck.lead_source) : 'no checklist'));

// B — no claim type picked → refused (the guard is live now)
const b = await attempt(null, 'Referral');
need('B: save refused when no claim type picked', /claim type/i.test(b.error || ''), JSON.stringify({ e: b.error, c: b.createdCalled }));
need('B: create not reached without a claim type', b.createdCalled === false);

// D — openLeadForm on a neutral portal leaves every claim-type radio clear
const d = await page.evaluate(async () => {
  try {
    window.CardinalHeader = Object.assign({}, window.CardinalHeader, { crm: () => '', crmHead: () => '' });
    if (typeof openLeadForm !== 'function') return { noFn: true };
    openLeadForm();
    await new Promise(r => setTimeout(r, 150));
    const checked = [...document.querySelectorAll('input[name="ldClaimType"]')].filter(r => r.checked).map(r => r.value);
    return { checked };
  } catch (e) { return { err: String(e).split('\n')[0] }; }
});
need('D: neutral portal pre-selects NO claim type', !!(d.checked && d.checked.length === 0),
     d.noFn ? 'openLeadForm missing' : JSON.stringify(d));

await browser.close();
if (fails.length) { console.log('gate_1008 FAIL  ' + passes + ' pass / ' + fails.length + ' fail'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('gate_1008 PASS  ' + passes + '/' + passes);
