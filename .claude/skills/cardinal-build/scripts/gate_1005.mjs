/* gate_1005.mjs — the New Lead form enforces its starred questions.

   THE GAP. Claim Type was marked with a * but never enforced — it defaulted to
   'unknown' on save (17 of 57 leads on file have no claim type). Lead Source was
   optional on this form even though the profile add form has required it since
   999 (26 leads have none). Build 1005 requires both to save; Lead Source lives
   behind "More detail", so the form reveals that section when it is the blocker.

   The essentials (name/address/phone-or-email) and the split were already done
   at 782 — this gate covers only the two new refusals plus the clean save.

   Control: the previous build, where a lead saves with neither answered.
   Usage: node gate_1005.mjs [path] */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1005: playwright not found'); process.exit(2); }
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

/* fill the essentials + bypass the contact requirement, set claim type / source
   per the scenario, click Save, and report the outcome */
const attempt = (claimType, source) => page.evaluate(async ([claimType, source]) => {
  const out = { ok: true };
  try {
    const M = document.getElementById('leadFormModal');
    if (!M) return { ok: false, err: 'no leadFormModal' };
    M.style.display = 'block';
    M.classList.remove('ldshow');           // start collapsed every run
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('ldFirst', 'Test'); set('ldLast', 'Lead');
    set('ldStreet', '123 Main St'); set('ldCity', 'Dayton'); set('ldState', 'OH'); set('ldZip', '45402');
    const nc = document.getElementById('ldNoContact'); if (nc) nc.checked = true;  // bypass phone/email
    // claim type
    document.querySelectorAll('input[name="ldClaimType"]').forEach(r => { r.checked = (r.value === claimType); });
    // lead source
    const src = document.getElementById('ldSource'); if (src) src.value = source || '';
    // stub the write path so a clean save has no side effects, and record it
    out.created = null;
    window.pdb = window.pdb || {};
    window.pdb.create = async (f) => { out.created = { claim: (f && f.checklist) ? 'via-checklist' : null }; return 'fake-id'; };
    window.reload = async () => {};
    window.openProject = () => {};
    window.notifyTeam = async () => {};
    document.getElementById('ldError').textContent = '';
    document.getElementById('ldSave').click();
    await new Promise(r => setTimeout(r, 250));
    out.error = document.getElementById('ldError').textContent || '';
    out.ldshow = M.classList.contains('ldshow');
    out.createdCalled = out.created !== null;
    return out;
  } catch (e) { return { ok: false, err: String(e).split('\n')[0] }; }
}, [claimType, source]);

// S1 — no claim type picked → refused, create not reached
const s1 = await attempt('', 'Referral');
need('S1 no claim type: save refused', /claim type/i.test(s1.error || ''), 's1=' + JSON.stringify(s1));
need('S1 no claim type: pdb.create NOT reached', s1.createdCalled === false);

// S2 — claim type set, no source → refused AND More detail revealed
const s2 = await attempt('retail', '');
need('S2 no source: save refused', /came from|knocking/i.test(s2.error || ''), 's2=' + JSON.stringify(s2));
need('S2 no source: More detail revealed (ldshow)', s2.ldshow === true, 's2=' + JSON.stringify(s2));
need('S2 no source: pdb.create NOT reached', s2.createdCalled === false);

// S3 — both answered → save proceeds
const s3 = await attempt('insurance', 'Door Knocking');
need('S3 both answered: no refusal error', (s3.error || '') === '', 's3=' + JSON.stringify(s3));
need('S3 both answered: pdb.create reached', s3.createdCalled === true, 's3=' + JSON.stringify(s3));

await browser.close();
if (fails.length) { console.log('gate_1005 FAIL  ' + passes + ' pass / ' + fails.length + ' fail'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('gate_1005 PASS  ' + passes + '/' + passes);
