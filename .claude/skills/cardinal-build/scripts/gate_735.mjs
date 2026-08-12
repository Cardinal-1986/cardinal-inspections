/* gate_735.mjs — two toast defects the 733 audit turned up.
   1. window.toast was READ at nine sites in three modules and ASSIGNED NOWHERE, so
      every one fell through to a native alert(). Proved by STUBBING alert and
      driving a real call path, not by grepping.
   2. The estimates .cr-toast mounts to document.body but its colours are
      var(--cr-black/red/green), declared only on #cr-estimates-mount — measured
      rgba(0,0,0,0) on body, white text on nothing. Proved by computed style.

   Usage: node gate_735.mjs [path/to/index.html]     (v734 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Approved', sales_rep: 'theo@cardinalrenovations.net',
               checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
               created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], punch_items: [], appointments: []
};

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {}
  /* count native alerts — the symptom under test is "this showed a grey OK box" */
  window.__ALERTS__ = [];
  window.alert = function (m) { window.__ALERTS__.push(String(m)); };
});
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);

/* ── 1. window.toast exists and is the app-wide one ────────────────────────── */
const wired = await page.evaluate(() => ({
  type: typeof window.toast,
  sameFamily: typeof window.toast === 'function' && typeof window.crToast === 'function'
}));
chk('window.toast is DEFINED (nine call sites depend on it)', wired.type === 'function', 'typeof = ' + wired.type);

/* drive the exact shape those nine sites use, and prove no alert() fires */
const drive = await page.evaluate(() => {
  document.querySelectorAll('#crToasts .crt').forEach(t => t.remove());
  window.__ALERTS__ = [];
  const call = (fn) => { try { fn(); } catch (e) { return String(e.message || e); } return null; };
  /* cr-occ shape: window.toast(msg)            -> info
     cr-health shape: window.toast(msg,'error') -> err
     a success spelling for completeness         -> ok */
  const errs = [
    call(() => { if (window.toast) window.toast('39.9 MB down to 12.1 MB'); else alert('39.9 MB down to 12.1 MB'); }),
    call(() => { if (typeof window.toast === 'function') { window.toast("This action isn't connected yet", 'error'); } else alert("This action isn't connected yet"); }),
    call(() => { if (window.toast) window.toast('Saved', 'success'); else alert('Saved'); })
  ].filter(Boolean);
  const q = [...document.querySelectorAll('#crToasts .crt')];
  return { errs, alerts: window.__ALERTS__.slice(), n: q.length,
           kinds: q.map(e => e.className.replace('crt ', '')),
           texts: q.map(e => e.innerText.replace(/\s*×\s*$/, '').replace(/\s+/g, ' ').trim()) };
});
chk('the three call shapes all produce a toast', drive.n === 3, JSON.stringify(drive.texts));
chk('and NONE of them falls through to a native alert()', drive.alerts.length === 0, JSON.stringify(drive.alerts));
chk("window.toast(msg,'error') maps to the ERROR style", (drive.kinds || []).indexOf('err') !== -1, JSON.stringify(drive.kinds));
chk("window.toast(msg,'success') maps to the OK style", (drive.kinds || []).indexOf('ok') !== -1, JSON.stringify(drive.kinds));
chk('a bare window.toast(msg) is neutral, not an error', (drive.kinds || []).indexOf('info') !== -1, JSON.stringify(drive.kinds));
chk('no call threw', drive.errs.length === 0, JSON.stringify(drive.errs));

/* ── 2. the estimates toast paints a real ground on document.body ─────────── */
const est = await page.evaluate(() => {
  const out = {};
  ['', 'error', 'success'].forEach(v => {
    const el = document.createElement('div');
    el.className = 'cr-toast ' + v;
    el.textContent = 'probe';
    document.body.appendChild(el);
    const cs = getComputedStyle(el);
    out[v || 'base'] = { bg: cs.backgroundColor, fg: cs.color };
    el.remove();
  });
  return out;
});
const transparent = b => /rgba\(0,\s*0,\s*0,\s*0\)/.test(b) || b === 'transparent';
for (const k of ['base', 'error', 'success']) {
  chk(`the estimates toast (${k}) has a real ground on document.body`,
      est[k] && !transparent(est[k].bg), est[k] ? `${est[k].fg} on ${est[k].bg}` : 'not rendered');
}
const lum = c => { const n = c.match(/\d+(\.\d+)?/g); if (!n) return 0; const [r, g, b] = n.slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
for (const k of ['base', 'error', 'success']) {
  const v = est[k];
  const r = v && !transparent(v.bg) ? ratio(v.fg, v.bg) : 0;
  chk(`the estimates toast (${k}) clears 4.5:1`, r >= 4.5, v ? `${r.toFixed(2)}:1  ${v.fg} on ${v.bg}` : 'n/a');
}

/* ── 3. the app-wide toast is unaffected ──────────────────────────────────── */
const still = await page.evaluate(() => {
  document.querySelectorAll('#crToasts .crt').forEach(t => t.remove());
  window.crToastErr('still here');
  const e = document.querySelector('#crToasts .crt.err');
  return { ok: !!e, bg: e ? getComputedStyle(e).backgroundColor : null };
});
chk('the app-wide error toast still works (733 not regressed)', still.ok === true && still.bg === 'rgb(161, 22, 35)', JSON.stringify(still));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
