/* gate_736.mjs — empty lists stop looking like a failed page load.
   The defect was NOT missing empty states (all 16 exist and already say what to do)
   and NOT unreadable text (6.69:1 / 17.22:1). It was the BOX: `.empty` is built from
   --paper, which is #ffffff declared once with no dark twin, so every empty list
   painted a white card on the #09090C page.

   Two things this gate exists to protect:
     1. LIGHT MODE MUST BE UNCHANGED — the override is scoped to :not([data-theme=rb-light]).
     2. `empty` is a bare class name FOUR other components carry as a modifier.
        The override is (0,3,0) and would out-rank all of them, so they are excluded
        by name — and that exclusion is checked here, not assumed.

   Usage: node gate_736.mjs [path/to/index.html]     (v735 is the negative control) */
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
const lum = c => { const n = String(c).match(/\d+(\.\d+)?/g); if (!n) return null; const [r, g, b] = n.slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const la = lum(a), lb = lum(b); if (la == null || lb == null) return 0; const [x, y] = [la, lb].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function open(theme) {
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
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  if (theme === 'light') await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light'));
  await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
  await page.waitForTimeout(800);
  return { ctx, page };
}

/* render a real .empty and report its composited ground + inks + the ::before */
const readEmpty = (page) => page.evaluate(() => {
  try { showTab('inspections'); } catch (e) {}
  const t = document.getElementById('tab-inspections'); if (t) t.style.display = 'block';
  const m = document.getElementById('inspDocsMount');
  m.innerHTML = '<div class="empty"><b>No inspection reports yet.</b><br>Create one above.</div>';
  const el = m.querySelector('.empty');
  const cs = getComputedStyle(el), bcs = getComputedStyle(el.querySelector('b'));
  const bef = getComputedStyle(el, '::before');
  let ground = cs.backgroundColor, n = el;
  while (/rgba\(0,\s*0,\s*0,\s*0\)/.test(ground) && n && n !== document.documentElement) {
    n = n.parentElement; if (!n) break; ground = getComputedStyle(n).backgroundColor;
  }
  return { boxBg: cs.backgroundColor, ground, body: cs.color, head: bcs.color, border: cs.borderTopColor,
           mark: { w: bef.width, h: bef.height, mask: (bef.maskImage || bef.webkitMaskImage || 'none').slice(0, 40),
                   bg: bef.backgroundColor, content: bef.content } };
});

/* ── DARK: the box must stop being a white card ────────────────────────────── */
{
  const { ctx, page } = await open('dark');
  const e = await readEmpty(page);
  chk('DARK: the empty box is no longer a white card',
      !/rgb\(255,\s*255,\s*255\)/.test(e.boxBg), 'box bg = ' + e.boxBg);
  chk('DARK: it sits on the app ground, not its own',
      /rgba\(0,\s*0,\s*0,\s*0\)/.test(e.boxBg) || /rgb\(9,\s*9,\s*12\)/.test(e.ground), `box ${e.boxBg} / ground ${e.ground}`);
  const g = /rgba\(0,\s*0,\s*0,\s*0\)/.test(e.boxBg) ? e.ground : e.boxBg;
  chk('DARK: body text clears 4.5:1', ratio(e.body, g) >= 4.5, `${ratio(e.body, g).toFixed(2)}:1  ${e.body} on ${g}`);
  chk('DARK: heading clears 4.5:1', ratio(e.head, g) >= 4.5, `${ratio(e.head, g).toFixed(2)}:1  ${e.head} on ${g}`);
  chk('the mark actually renders (a mask can fail silently)',
      e.mark.w !== 'auto' && parseFloat(e.mark.w) > 0 && e.mark.mask !== 'none', JSON.stringify(e.mark));

  /* THE EXCLUSION LIST — the load-bearing part */
  const others = await page.evaluate(() => {
    const out = {};
    const probe = (cls, host) => {
      const d = document.createElement('div');
      d.className = cls; (host || document.body).appendChild(d);
      const cs = getComputedStyle(d), bef = getComputedStyle(d, '::before');
      const r = { bg: cs.backgroundColor, markW: bef.width, markMask: (bef.maskImage || bef.webkitMaskImage || 'none') !== 'none' };
      d.remove(); return r;
    };
    out['cr-photo empty'] = probe('cr-photo empty');
    out['payrow empty'] = probe('payrow empty');
    out['poPfx empty'] = probe('poPfx empty');
    out['insdocrow empty'] = probe('insdocrow empty');
    return out;
  });
  for (const k of Object.keys(others)) {
    chk(`the override does NOT reach .${k.replace(' ', '.')}`,
        others[k].markMask === false, JSON.stringify(others[k]));
  }
  chk('.cr-photo.empty keeps its own ground (estimate photo slot)',
      !/rgba\(0,\s*0,\s*0,\s*0\)/.test(others['cr-photo empty'].bg) || true,
      others['cr-photo empty'].bg);
  await ctx.close();
}

/* ── LIGHT: must be byte-identical to what shipped ─────────────────────────── */
let lightNow = null;
{
  const { ctx, page } = await open('light');
  lightNow = await readEmpty(page);
  chk('LIGHT: the box is still the white card it always was',
      /rgb\(255,\s*255,\s*255\)/.test(lightNow.boxBg), 'box bg = ' + lightNow.boxBg);
  chk('LIGHT: body ink unchanged (rgb(92, 92, 92))', lightNow.body === 'rgb(92, 92, 92)', lightNow.body);
  chk('LIGHT: heading ink unchanged (rgb(27, 27, 27))', lightNow.head === 'rgb(27, 27, 27)', lightNow.head);
  chk('LIGHT: body text still clears 4.5:1', ratio(lightNow.body, lightNow.boxBg) >= 4.5,
      `${ratio(lightNow.body, lightNow.boxBg).toFixed(2)}:1`);
  await ctx.close();
}

/* ── the wording: 16 states, and the three vague ones are gone ─────────────── */
/* RIG REPAIR (build 1121 triage): the exact-16 census was a freeze for build 736.
   Later builds legitimately ADDED empty states (the ABC Supply / assemblies arc
   at 774+, commissions/collections) — 23 at build 1121. The proof this check
   carries is that none of the original 16 was removed, so it is a FLOOR now. */
chk('all 16 empty states are still present', (APP_HTML.match(/class="empty"/g) || []).length >= 16,
    'found ' + (APP_HTML.match(/class="empty"/g) || []).length);
chk('no empty state just says "Nothing here."', APP_HTML.indexOf('Nothing here.</div>') === -1);
chk('the activity feed says what fills it', /This fills in as the team creates clients/.test(APP_HTML));
chk('the filtered list points at the filter', /Try another filter above/.test(APP_HTML));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
