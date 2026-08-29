/* gate_753.mjs — the menus open under the buttons that open them.

   What this has to prove (Theo: "the burger menu is in left but opens right"):
     1. At >640px, #navMenu's LEFT edge lands under #navBtn's left edge — not
        pinned to the viewport's right — and the menu is fully on-screen.
        Same for #newMenu under the + button.
     2. At 390px both menus are on-screen sheets (the mobile CSS path).
     3. The clamp works: the menu never leaves the viewport at any width.
     4. Delegation still works — clicking a burger item still navigates and
        closes the menu (the fix touched positioning only).
     5. Source: the cr-menu-styles positional pin is gone; the non-positional
        !important rules (width, scroll, max-height) survive.

   ⚠️ Structured bail-outs, not crashes (BUG_CLASSES 37): the negative control
   (v752) must produce a RED REPORT — on v752 the menu measures at the right
   edge, far from the button, so checks 1 fails there by design.

   Usage: node gate_753.mjs [path/to/index.html]    (v752 = negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [], estimates: [], contracts: [], inspection_reports: [], collections: [],
  appointments: [], project_photos: [], punch_items: [], commissions: [], draws: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function measureAt(width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, deviceScaleFactor: 2, isMobile: width < 500, hasTouch: width < 500 });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (t === 'font' || t === 'media') return r.abort();
    if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
    return r.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.evaluate(`(() => { const c = document.querySelector('.cr-lr-course'); if (c) c.click(); else if (window.showHome) showHome(); })()`);
  await page.waitForTimeout(800);
  let out;
  try {
    out = await page.evaluate(`(async () => {
      const g = id => { const e = document.getElementById(id); const r = e.getBoundingClientRect();
        return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width) }; };
      const out = { iw: window.innerWidth };
      /* Build 924: with no desktop rail (body:not(.cr-lnav-on)) the burger menu
         is a LEFT slide-out drawer animating translateX(-100%) -> 0 over .3s.
         Wait out the transition before measuring, and record which mode ran. */
      out.drawer = !document.body.classList.contains('cr-lnav-on');
      document.getElementById('navBtn').click();
      if (out.drawer) await new Promise(res => setTimeout(res, 450));
      out.navBtn = g('navBtn'); out.navMenu = g('navMenu');
      out.navShown = document.getElementById('navMenu').style.display === 'block';
      document.getElementById('navMenu').style.display = 'none';
      document.body.classList.remove('cr-drawer-open');
      document.getElementById('addProjectBtn').click();
      out.addBtn = g('addProjectBtn'); out.newMenu = g('newMenu');
      out.newShown = document.getElementById('newMenu').style.display === 'block';
      document.getElementById('newMenu').style.display = 'none';
      return out;
    })()`);
  } catch (e) { out = { crashed: String(e).split('\n')[0].slice(0, 120) }; }

  /* delegation sanity, once, at 1194 */
  let nav = null;
  if (width === 1194 && !out.crashed) {
    try {
      nav = await page.evaluate(`(async () => {
        document.getElementById('navBtn').click();
        document.querySelector('#navMenu [data-nav="leads"]').click();
        await new Promise(r => setTimeout(r, 700));
        const lv = document.getElementById('leadsView');
        return { opened: !!lv && lv.getClientRects().length > 0,
                 menuClosed: document.getElementById('navMenu').style.display !== 'block' };
      })()`);
    } catch (e) { nav = { err: String(e).split('\n')[0] }; }
  }
  await page.close();
  return { out, nav };
}

for (const width of [390, 768, 1194, 2560]) {
  const { out, nav } = await measureAt(width);
  chk(`${width}px: harness ran`, !out.crashed, out.crashed || 'ok');
  if (out.crashed) continue;
  const m = out.navMenu, b = out.navBtn, n = out.newMenu, a = out.addBtn;
  chk(`${width}px: burger menu shown`, out.navShown);
  chk(`${width}px: burger menu fully on-screen`, m.l >= 0 && m.r <= out.iw, `menu x=[${m.l}..${m.r}] iw=${out.iw}`);
  chk(`${width}px: + menu shown`, out.newShown);
  chk(`${width}px: + menu fully on-screen`, n.l >= 0 && n.r <= out.iw, `menu x=[${n.l}..${n.r}]`);
  /* Build 924: without the desktop rail the burger is a LEFT drawer, not a
     dropdown — anchor to the screen's left edge, not the button. The dropdown
     anchoring contract survives only where the rail is on (out.drawer=false). */
  if (!out.drawer) {
    chk(`${width}px: burger menu LEFT edge under the button`, Math.abs(m.l - b.l) <= 2, `menu.l=${m.l} btn.l=${b.l}`);
    chk(`${width}px: burger menu below the button`, m.t >= b.b, `menu.t=${m.t} btn.b=${b.b}`);
    chk(`${width}px: + menu LEFT edge under the +`, Math.abs(n.l - a.l) <= 2, `menu.l=${n.l} btn.l=${a.l}`);
  } else {
    chk(`${width}px: 924 drawer slid fully in, anchored at the left edge`, m.l === 0, `menu.l=${m.l}`);
    /* the + dropdown anchors to its button only where it fits; on a narrow
       phone the handler clamps it into the viewport (already asserted
       fully-on-screen above), so the anchor check applies over 640 only. */
    if (width > 640)
      chk(`${width}px: + menu LEFT edge under the +`, Math.abs(n.l - a.l) <= 2, `menu.l=${n.l} btn.l=${a.l}`);
  }
  if (nav) {
    chk('burger item still navigates (Leads & Jobs opens)', nav.opened && !nav.err, nav.err || '');
    chk('and the menu closes after the tap', nav.menuClosed);
  }
}

/* source guards */
const src = APP;
chk('the cr-menu-styles positional pin is gone', !/cr-menu-styles">#navMenu\{left:auto !important;right:10px !important/.test(src));
const blk = (src.split('<style id="cr-menu-styles">')[1] || '').split('</style>')[0];
chk('cr-menu-styles still caps width', blk.includes('width:min(300px,calc(100vw - 20px)) !important'));
chk('cr-menu-styles still scrolls and clamps height', blk.includes('max-height:72vh !important') && blk.includes('overscroll-behavior:contain !important'));
chk('burger handler anchors the button left edge', src.includes("navMenu.style.left = Math.round(r.left) + 'px';"));
chk('+ handler anchors the button left edge', src.includes("newMenu.style.left = Math.round(r.left) + 'px';"));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
