/* gate_757.mjs — one Home button, not three. Theo: "Retire redundant ones."

   What this has to prove, at 390px AND 1194px:
     1. #cr-home-btn and #cr-pme-exit-btn exist NOWHERE — not on the home
        dashboard, not on a CRM home, and not on any of the five tool screens.
        They were built by MutationObserver-driven modules, so a single snapshot
        is not enough: re-check after a settle window.
     2. The header's gold home button IS still there and IS hit-testable on all
        five tool screens (retiring the wrong one would strand the user).
     3. It still closes the tool screen and still lands on YOUR CRM's home.
     4. ESCAPE still closes a tool screen — deliberately KEPT, and the reason
        cr-pme was not deleted outright.
     5. The retirement is at source: no builder, no stylesheet, and two fewer
        document.body observers.

   Structured bail-outs, not crashes (BUG_CLASSES 37).

   Usage: node gate_757.mjs [path/to/index.html]     (v756 = negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const ck = t => JSON.stringify({ lead: { claim_type: t } });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [
    { id: 'i1', name: 'Adam Gunn', stage: 'Prospect', crm: 'insurance', checklist: ck('insurance'), created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    { id: 'c1', name: 'Habitat Job', stage: 'Approved', crm: 'community', checklist: ck('community'), created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    { id: 'r1', name: 'Retail One', stage: 'Lead', crm: 'retail', checklist: ck('retail'), created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
  ],
  insurance_claims: [{ id: 'cl1', project_id: 'i1', carrier: 'Allstate', claim_number: '0802889162', status: 'filed', rcv: 22397.63, acv: 0, created_by: 'theo@cardinalrenovations.net', created_at: '2026-08-01T12:00:00Z' }],
  pricing_items: [], adjusters: [], community_partners: [],
  estimates: [], contracts: [], inspection_reports: [], collections: [], appointments: [],
  project_photos: [], punch_items: [], commissions: [], draws: [],
};

const MOUNTS = {
  'cr-claims-mount':    `window.crOpenClaims()`,
  'cr-pricing-mount':   `window.crOpenPricing()`,
  'cr-estimates-mount': `window.crOpenEstimates()`,
  'cr-coach-mount':     `window.CardinalCoach && window.CardinalCoach.open()`,
  'cr-adjusters-mount': `window.CardinalAdjusters && window.CardinalAdjusters.open()`,
};

/* the two retired ids, plus a sweep for ANY other visible control titled Home */
const HOMES = `(() => {
  const vis = e => { if (!e) return false; const cs = getComputedStyle(e);
    return e.getClientRects().length > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const retired = ['cr-home-btn', 'cr-pme-exit-btn'].map(id => {
    const e = document.getElementById(id);
    return { id, inDom: !!e, visible: vis(e) };
  });
  const all = [...document.querySelectorAll('button,a,[role="button"]')]
    .filter(e => vis(e) && /^home$/i.test((e.getAttribute('title') || e.getAttribute('aria-label') || '').trim()))
    .map(e => e.id || ('(' + String(e.className || '').slice(0, 24) + ')'));
  const gh = document.getElementById('cr-hd2-home');
  const gr = gh ? gh.getBoundingClientRect() : null;
  const at = gr ? document.elementFromPoint(Math.round(gr.left + gr.width / 2), Math.round(gr.top + gr.height / 2)) : null;
  return { retired, visibleHomes: all,
           goldPresent: vis(gh),
           goldHitTestable: !!(at && at.closest && at.closest('#cr-hd2-home')) };
})()`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

for (const width of [390, 1194]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: width < 500, hasTouch: width < 500 });
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
  await page.waitForTimeout(3200);
  const go = async (code, ms) => { try { await page.evaluate(code); } catch (e) {} await page.waitForTimeout(ms || 850); };
  const probe = async code => { try { return await page.evaluate(code); } catch (e) { return { __err: String(e).split('\n')[0].slice(0, 90) }; } };
  const tag = `${width}px`;
  await go(`(() => { const c = document.querySelector('.cr-lr-course'); if (c) c.click(); else if (window.showHome) showHome(); })()`);

  /* ── ordinary screens ── */
  for (const [name, code] of [['retail home', `window.showHome()`],
                              ['Cardinal Truth', `window.showCardinalTruth()`],
                              ['Community hub', `window.CardinalCommunityHub.show()`],
                              ['Leads & Jobs', `openLeadsView()`]]) {
    await go(code, 1100);
    /* the modules were observer-driven: settle, then look again */
    await page.waitForTimeout(900);
    const h = await probe(HOMES);
    if (h.__err) { chk(`${tag} ${name}: harness ran`, false, h.__err); continue; }
    chk(`${tag} ${name}: no retired Home buttons`, h.retired.every(r => !r.inDom), JSON.stringify(h.retired.filter(r => r.inDom).map(r => r.id)));
    chk(`${tag} ${name}: exactly one Home control on screen`, h.visibleHomes.length === 1, JSON.stringify(h.visibleHomes));
    chk(`${tag} ${name}: and it is the header's gold home`, h.visibleHomes[0] === 'cr-hd2-home', JSON.stringify(h.visibleHomes));
  }

  /* ── every tool screen ── */
  for (const [id, opener] of Object.entries(MOUNTS)) {
    await go(`window.showCardinalTruth()`, 700);
    await go(opener, 1300);
    await page.waitForTimeout(700);
    const h = await probe(HOMES);
    if (h.__err) { chk(`${tag} ${id}: harness ran`, false, h.__err); continue; }
    chk(`${tag} ${id}: no retired Home buttons`, h.retired.every(r => !r.inDom), JSON.stringify(h.retired.filter(r => r.inDom).map(r => r.id)));
    chk(`${tag} ${id}: exactly one Home control`, h.visibleHomes.length === 1, JSON.stringify(h.visibleHomes));
    chk(`${tag} ${id}: the gold home survives and is hit-testable`, h.goldPresent && h.goldHitTestable);
    /* and it still works */
    await go(`document.getElementById('cr-hd2-home').click()`, 1000);
    const a = await probe(`(() => {
      const vis = e => { if (!e) return false; const cs = getComputedStyle(e);
        return e.getClientRects().length > 0 && cs.display !== 'none'; };
      return { open: vis(document.getElementById('${id}')),
               truth: vis(document.getElementById('cardinalTruthView')),
               main: vis(document.getElementById('mainView')) };
    })()`);
    chk(`${tag} ${id}: gold home still closes it and lands on Truth`, !a.open && a.truth && !a.main, JSON.stringify(a));
  }

  /* ── Escape still closes a tool screen (deliberately kept) ── */
  await go(`window.showCardinalTruth()`, 700);
  await go(`window.crOpenClaims()`, 1300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1100);
  const esc = await probe(`(() => {
    const vis = e => { if (!e) return false; const cs = getComputedStyle(e);
      return e.getClientRects().length > 0 && cs.display !== 'none'; };
    return { open: vis(document.getElementById('cr-claims-mount')),
             truth: vis(document.getElementById('cardinalTruthView')) };
  })()`);
  chk(`${tag} ESCAPE still closes the tool screen (kept on purpose)`, !esc.open, JSON.stringify(esc));
  chk(`${tag} …and Escape lands on your CRM's home, not retail`, esc.truth, JSON.stringify(esc));

  await page.close();
  await ctx.close();
}

/* ── source guards: retired AT SOURCE, not merely hidden ── */
const src = APP;
chk('no builder for #cr-home-btn', !src.includes("btn.id = 'cr-home-btn';"));
chk('no builder for the tool-panel exit button', !src.includes("btn.className = 'cr-pme-exit';"));
chk('cr-home-btn-styles is gone', !src.includes('<style id="cr-home-btn-styles">'));
chk('cr-pme-styles is gone', !src.includes('<style id="cr-pme-styles">'));
chk('the Escape handler is kept', src.includes("e.key === 'Escape' && visibleMount()"));
chk('crCloseAll is kept (two other modules call it)', src.includes('window.crCloseAll = function () {'));
chk('the gold home and goHome() are untouched', (src.match(/function goHome\(\)\{/g) || []).length === 1 && src.includes("home.onclick = function(){ goHome(); };"));
/* the LAST-stylesheet positional pin is retired: later builds legitimately
   appended module stylesheets (791 namebar, 1080–83 ask sheet, …); the
   cascade-win proof lives in gate_752 now. */
chk('cr-touch44 block still present exactly once', (src.match(/<style id="cr-touch44-styles">/g) || []).length === 1);

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
