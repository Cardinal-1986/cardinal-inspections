/* render_1192 — REAL Chromium: the two visual layers, and the REAL
   interruption drive (Theo's §36).

   Layers: welcome / whynow / priorities / plans / resume / shield must
   composite on the LIGHT canvas (ground luminance > 0.8); the picker —
   the rep's room — must stay DARK (< 0.15).

   Interruption: answers are tapped, the PAGE genuinely reloads
   (page.reload, not a fresh realm), and Resume must land on the exact
   step with the exact answers. The supa mock persists its rows through
   localStorage ('__rig_ck') so the reload faithfully simulates the
   server surviving while the page dies — patchProjectCk writes into the
   bridge, the reborn mock serves them back.

   Control: the 1191 artifact — welcome renders DARK there, so the layer
   assertions go red. Mocked data only; read-only. */
import fs from 'node:fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('render_1192: playwright not found'); process.exit(2); }
const FILE = process.argv[2];
const html = fs.readFileSync(FILE, 'utf8');
const b = await chromium.launch();
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };

const ctx = await b.newContext({ viewport: { width: 1194, height: 834 } });
const p = await ctx.newPage();
await p.route('**/*', r => r.request().url().startsWith('https://ap.test/')
  ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
  : r.fulfill({ status: 200, body: '' }));
const errs = []; p.on('pageerror', e => errs.push(String(e).split('\n')[0]));

/* the bridge-backed mock — installable after every (re)load */
const installMock = () => p.evaluate(() => {
  let store = {};
  try { store = JSON.parse(localStorage.getItem('__rig_ck') || '{}'); } catch (_) {}
  const rows = [{ id: 'p1', name: 'Kim Lawson', stage: 'Approved',
                  address: '12 Oak St, Dayton OH', checklist: store.p1 || '{}' }];
  const mk = t => { const q = { _t: t, _eq: {} };
    for (const m of ['select', 'order', 'limit']) q[m] = () => q;
    q.eq = (k, v) => { q._eq[k] = v; return q; };
    q.single = () => q; q.maybeSingle = () => q;
    q.then = res => Promise.resolve({ data: q._t === 'projects' ? rows : [] }).then(res);
    return q; };
  Object.defineProperty(window, 'supa', { value: { from: t => mk(t),
    storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }),
                              createSignedUrl: () => Promise.resolve({ data: {} }) }) } },
    writable: false });
  window.patchProjectCk = (pr, patch) => {
    let all = {};
    try { all = JSON.parse(pr.checklist || '{}') || {}; } catch (_) {}
    Object.keys(patch).forEach(k => { all[k] = patch[k]; });
    const s = JSON.stringify(all);
    pr.checklist = s;
    const st = JSON.parse(localStorage.getItem('__rig_ck') || '{}');
    st[pr.id] = s;
    localStorage.setItem('__rig_ck', JSON.stringify(st));
    return Promise.resolve();
  };
});

const groundLum = sel => p.evaluate(s => {
  const el = document.querySelector(s);
  if (!el) return -1;
  const parse = v => { const m = String(v).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  for (let n = el; n; n = n.parentElement) {
    const bc = parse(getComputedStyle(n).backgroundColor);
    if (bc && bc.a > 0.85) return 0.2126 * lin(bc.r) + 0.7152 * lin(bc.g) + 0.0722 * lin(bc.b);
  }
  return -2;
}, sel);

await p.goto('https://ap.test/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(() => { try { localStorage.removeItem('__rig_ck'); localStorage.removeItem('gs_session'); } catch (_) {} });
await installMock();

await p.evaluate(() => window.CardinalAppointment.open());
await p.waitForTimeout(700);
let lum = await groundLum('#cr-appt');
ok('the picker is DARK (rep room)', lum >= 0 && lum < 0.15, 'lum=' + lum.toFixed(3));

await p.evaluate(() => { document.querySelector('#cr-appt .ap-job').click(); });
await p.waitForTimeout(800);
lum = await groundLum('#cr-appt');
ok('Welcome is LIGHT (homeowner canvas)', lum > 0.8, 'lum=' + lum.toFixed(3));

/* answer Why now */
await p.evaluate(() => { document.querySelector('#cr-appt [data-gs="next"]').click(); });
await p.waitForTimeout(400);
lum = await groundLum('#cr-appt');
ok('Why now is LIGHT', lum > 0.8, 'lum=' + lum.toFixed(3));
await p.evaluate(() => {
  document.querySelector('#cr-appt .gs-card[data-k="storm"]').click();
  document.querySelector('#cr-appt .gs-card[data-k="leak"]').click();
});
await p.waitForTimeout(300);

/* answer Priorities (ranked) and STOP here — mid-visit */
await p.evaluate(() => { document.querySelector('#cr-appt [data-gs="next"]').click(); });
await p.waitForTimeout(400);
await p.evaluate(() => {
  document.querySelector('#cr-appt .gs-card[data-k="longevity"]').click();
  document.querySelector('#cr-appt .gs-card[data-k="warranty"]').click();
});
await p.waitForTimeout(500);

/* ── THE REAL INTERRUPTION ─────────────────────────────────── */
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await installMock();
await p.evaluate(() => window.CardinalAppointment.open());
await p.waitForTimeout(800);

const resume = await p.evaluate(() => {
  const v = document.getElementById('cr-appt');
  return { lit: v && v.classList.contains('gs-lit'),
           text: v ? v.textContent.slice(0, 300) : '' };
});
ok('after a REAL reload the resume card offers the visit back',
   /Pick up where you left off/.test(resume.text) && resume.text.includes('Kim Lawson'));
ok('the resume card is LIGHT', resume.lit);

await p.evaluate(() => { document.querySelector('#cr-appt [data-gs="resume"]').click(); });
await p.waitForTimeout(900);
const after = await p.evaluate(() => {
  const v = document.getElementById('cr-appt');
  const on = k => { const c = v.querySelector('.gs-card[data-k="' + k + '"]');
    return c && c.classList.contains('on')
      ? ((c.querySelector('.gs-rank') || {}).textContent || 'on') : null; };
  return { head: (v.querySelector('.ap-h') || {}).textContent || '',
           longevity: on('longevity'), warranty: on('warranty'), price: on('price') };
});
ok('Resume lands on the exact step (Priorities)', /What matters most/.test(after.head), after.head);
ok('the exact answers survive the reload (longevity=1, warranty=2, price unset)',
   after.longevity === '1' && after.warranty === '2' && after.price === null,
   JSON.stringify(after));

/* the shield, on the light canvas */
await p.evaluate(() => { document.querySelector('#cr-appt-rail .ar-step').click(); });
await p.waitForTimeout(500);
lum = await groundLum('#cr-appt');
const shieldTxt = await p.evaluate(() => (document.getElementById('cr-appt') || {}).textContent || '');
ok('the shield is LIGHT and in homeowner voice',
   lum > 0.8 && shieldTxt.includes('client list'), 'lum=' + lum.toFixed(3));

ok('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
