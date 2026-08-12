/* touch_audit.mjs — measure every interactive control at phone width.
   Answers "how bad is it really?" with rendered rectangles, not opinions.

   ⚠️ MEASURE THE RENDERED RECT, NOT `display`. Build 746's print audit reported
   two leaking controls because it read each element's own `display` instead of
   what it actually paints. Here: skip anything with a zero-area rect, anything
   `visibility:hidden`, and anything whose ancestor chain is display:none — which
   getBoundingClientRect already collapses to 0.

   ⚠️ THE TARGET IS THE HIT AREA, NOT THE GLYPH. A 20px icon inside a 48px
   padded button is FINE. So measure the element that actually receives the
   click (the button/anchor), and for an icon-only control also report the
   nearest ancestor that carries a click handler or is a button. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = readFileSync('/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
const MIN = 44;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },      // iPhone 14 / 15 logical width
  deviceScaleFactor: 3, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (t === 'font' || t === 'media') return r.abort();
  if (u.startsWith('data:')) return r.continue();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: Array.from({ length: 6 }, (_, i) => ({
    id: 'p' + i, name: 'Client ' + i, stage: ['Lead', 'Approved', 'Scheduled', 'Completed', 'Invoiced', 'Closed'][i],
    crm: 'retail', checklist: '{}', created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z',
    address: String(100 + i) + ' Webster St', phone: '9375551212', email: 'c' + i + '@x.com',
  })),
  inspection_reports: [], estimates: [], contracts: [], punch_items: [],
  photos: [], appointments: [], collections: [], commissions: [],
};
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);

const MEASURE = (min) => {
  const SEL = 'button, a[href], a[onclick], [role="button"], input[type="checkbox"], input[type="radio"], ' +
              'select, summary, [onclick], .chip, .chipbtn, .cbx, .pill, .tab, [data-act], [data-open], [data-tab]';
  const out = [];
  const seen = new Set();
  document.querySelectorAll(SEL).forEach(el => {
    if (seen.has(el)) return; seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;                 // not painted
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') return;
    if (cs.pointerEvents === 'none') return;
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w >= min && h >= min) return;                            // passes
    const id = (el.id ? '#' + el.id : '') +
               (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    out.push({
      tag: el.tagName.toLowerCase(), id: id.slice(0, 60), w, h,
      text: (el.textContent || '').trim().slice(0, 22),
      area: w * h,
    });
  });
  return out;
};

const screens = [
  ['landing / home', async () => {}],
  ['burger menu', async () => { const b = document.querySelector('[data-act="menu"], #burger, .burger, [aria-label*="enu"]'); if (b) b.click(); }],
];

const report = {};
for (const [name, prep] of screens) {
  try { await page.evaluate(prep); await page.waitForTimeout(900); } catch (e) {}
  report[name] = await page.evaluate(MEASURE, MIN);
}

/* total interactive controls on the landing screen, for a denominator */
const total = await page.evaluate(() => {
  const SEL = 'button, a[href], a[onclick], [role="button"], input[type="checkbox"], input[type="radio"], select, summary, [onclick], .chip, .chipbtn, .cbx, .pill, .tab, [data-act], [data-open], [data-tab]';
  let n = 0; const seen = new Set();
  document.querySelectorAll(SEL).forEach(el => {
    if (seen.has(el)) return; seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.pointerEvents === 'none') return;
    n++;
  });
  return n;
});

for (const [name, list] of Object.entries(report)) {
  console.log(`\n===== ${name} — ${list.length} control(s) under ${MIN}px =====`);
  const byKey = {};
  for (const c of list) { const k = c.tag + c.id; (byKey[k] = byKey[k] || []).push(c); }
  Object.entries(byKey)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 22)
    .forEach(([k, v]) => {
      const c = v[0];
      console.log(`  ${String(v.length).padStart(3)}x  ${String(c.w).padStart(3)}x${String(c.h).padStart(3)}px  ${k}  ${c.text ? '“' + c.text + '”' : ''}`);
    });
}
console.log(`\nvisible interactive controls measured on the last screen: ${total}`);

/* the specific controls Theo named */
const named = await page.evaluate(() => {
  const probe = (label, sel) => {
    const els = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height; });
    return { label, n: els.length, sizes: els.slice(0, 4).map(e => { const r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }) };
  };
  return [
    probe('#cr-ri-zoom close (photo viewer)', '#cr-ri-zoom .close'),
    probe('stage <select>', 'select'),
    probe('checkboxes', 'input[type=checkbox]'),
    probe('.chipbtn', '.chipbtn'),
  ];
});
console.log('\n=== the controls named in the request ===');
for (const p of named) console.log(`  ${p.label.padEnd(34)} count=${String(p.n).padStart(3)}  ${p.sizes.join(', ')}`);

await browser.close();
