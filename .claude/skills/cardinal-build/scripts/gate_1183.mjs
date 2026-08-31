/* gate_1183 — the hammer watermark actually paints, and it paints INSIDE its card.
 *
 * WHAT 1183 DID. `cardinal-prod.png` — the cardinal on a roofing hatchet — was
 * drawn at 1086 and given a CSS mask rule, and then never appeared, because
 * NOTHING EVER APPLIED THE CLASS the rule hangs off. It occurred exactly twice
 * in the whole file and both occurrences were the stylesheet rules themselves.
 * A grep said "referenced". Chromium said 0 matching elements. 1183 puts the
 * class on the Next 30 Days card — the work schedule that replaced the Work
 * Schedule circles at 1168 — beside the pencil that already watermarks the
 * Team Calendar.
 *
 * ⚠ THE TRAP THIS GATE EXISTS FOR, and a class assertion cannot see it.
 * The ::before is `position:absolute`, and `.pipecard` sets NO position — only
 * `.pipecard.teamcal` does, because the rule was written for a second hero
 * calendar that was never built. Add the class alone and the watermark escapes
 * to the nearest positioned ancestor and paints across the page: the class is
 * present, the rule "applies", and the screen is wrong. So this gate measures
 * the painted box against the CARD, never just the class list.
 *
 * It also holds the two deletions: the files 1183 removed must stay gone, and
 * the ones it deliberately KEPT must stay present — a cleanup that keeps
 * going is how a live asset gets taken out next time.
 *
 * Optional path arg -> negative control (1182 has no element with the class;
 * must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, waitForSoft, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const ROOT = '/home/user/cardinal-inspections/';
const FILE = process.argv[2] || ROOT + 'index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 150000);

let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };

/* ------------------------------------------------------------- ARTIFACT */
ok(APP_HTML.split('class="pipecard opscard prodcal"').length - 1 === 1,
   'the Next 30 Days card carries the class');
ok(APP_HTML.indexOf('.pipecard.prodcal{position:relative;overflow:hidden;}') !== -1,
   'the host positioning context is declared — without it the watermark escapes the card');
ok(APP_HTML.split('<div class="pipecard opscard" id="arCard">').length - 1 === 1,
   'the Accounts Receivable card was NOT given a watermark too');
ok(APP_HTML.indexOf('cr-cmark') === -1 && APP_HTML.indexOf('community-action-icon.png') === -1,
   'the dead community mark and its orphaned rules are gone');

/* the cleanup must STOP where it stopped. These four are live or deliberate. */
for (const [f, why] of [
  ['cardinal-prod.png', 'the hammer this build just wired'],
  ['cardinal-board.png', 'the pencil on the Team Calendar'],
  ['cardinal-transparent.png', 'the sign-in mark'],
  ['cardinal-report-logo.png', 'the report letterhead (1182)'],
  ['community-action-dayton.png', 'the DELIBERATE portal-picker fallback — reachable only if CardinalFrontDoor is missing, which is not a reason to delete it'],
]) ok(fs.existsSync(ROOT + f), `${f} still exists — ${why}`);

for (const f of ['cardinal-hammer.png', 'community-action-icon.png'])
  ok(!fs.existsSync(ROOT + f), `${f} is deleted — nothing could reach it`);

/* -------------------------------------------------------------- RUNTIME */
const ck = t => JSON.stringify({ lead: { claim_type: t } });
const P = (id, n, s, t) => ({ id, name: n, stage: s, address: '', phone: '', email: '',
  checklist: ck(t), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('r1','R Lead','Lead','retail'), P('r2','R Pro','Prospect','retail'), P('c1','C One','Lead','community')],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [],
  contracts: [], punch_items: [], insurance_claims: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 } });
const page = await ctx.newPage();
const fetched = new Set();
page.on('response', r => { const m = r.url().match(/\/([^/?#]+\.(?:png|PNG|svg))(?:[?#]|$)/); if (m) fetched.add(m[1]); });
await page.route('**/*', async route => {
  const u = route.request().url(), rt = route.request().resourceType();
  if (u === 'https://app.cardinalroster.com/' || u === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  const m = u.match(/\/([^/?#]+\.(?:png|PNG|svg))(?:[?#]|$)/);
  if (m && u.startsWith('https://app.cardinalroster.com/')) {
    try { return route.fulfill({ status: 200, contentType: m[1].endsWith('svg') ? 'image/svg+xml' : 'image/png',
      body: fs.readFileSync(ROOT + m[1]) }); } catch (_) { return route.fulfill({ status: 404, body: '' }); }
  }
  if (u.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
/* was a fixed 3.5-second sleep — a guess. Measured on the shipped tree: the app
   is fully booted at 555ms, so that was six times too long AND still unsafe
   under load. waitAppReady polls real signals and throws naming the stuck one. */
await waitAppReady(page);
await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} try { hideAllViews(); showHome(); } catch (_) {} });
/* ⚠ waitForSoft, NOT waitFor. Not every gate's flow lands on the home board, so
   a THROWING predicate here killed gate_1176 outright on the first attempt —
   the helper was right and the predicate was wrong, but the gate crashed
   instead of reporting (BUG_CLASSES 37). This degrades to a bounded wait. */
await waitForSoft(page, () => document.querySelectorAll('.pipecard').length >= 3);
await settle(page);
await page.waitForTimeout(2500);

const r = await page.evaluate(() => {
  /* ⚠ These two are independent of the watermark and must be computed BEFORE
     the early return, or the negative control reports them as failures that are
     not real — the Team Calendar exists on 1182 too. A control that prints a
     wrong reason is only marginally better than one that crashes. */
  const indep = {
    teamcalStillThere: !!document.querySelector('.pipecard.teamcal'),
    count: document.querySelectorAll('.prodcal').length
  };
  const el = document.querySelector('.pipecard.prodcal');
  if (!el) return Object.assign({ found: false }, indep);
  const own = getComputedStyle(el);
  const bef = getComputedStyle(el, '::before');
  const b = el.getBoundingClientRect();
  const title = (el.querySelector('.pipetitle') || {}).textContent || '';
  /* the ::before is inset:0 on its containing block, so if the card is NOT the
     containing block the painted box is the page, not the card. Measure it. */
  return Object.assign({ found: true, title: title.trim(),
    pos: own.position, ovf: own.overflow,
    mask: (bef.webkitMaskImage || bef.maskImage || ''),
    op: parseFloat(bef.opacity), z: bef.zIndex,
    cardW: Math.round(b.width), cardH: Math.round(b.height),
    vw: window.innerWidth, vh: window.innerHeight }, indep);
});

ok(r.found, 'an element with the class exists in the rendered app (this is what 1182 could not say)');
ok(r.found && r.count === 1, `exactly one card carries it (got ${r.count})`);
ok(r.found && /Next 30 Days/i.test(r.title), `and it is the Next 30 Days card (title: "${r.title}")`);
ok(r.found && r.pos === 'relative',
   `the card is the containing block (position: ${r.pos}) — otherwise the watermark paints across the page`);
ok(r.found && r.ovf === 'hidden', `and it clips (overflow: ${r.ovf})`);
ok(r.found && /cardinal-prod\.png/.test(r.mask),
   `the mask resolves to the hammer artwork (${String(r.mask).slice(0, 70)})`);
ok(fetched.has('cardinal-prod.png'),
   'and the browser ACTUALLY FETCHED it — the whole point; it never did before this build');
/* it is a watermark, not a picture: it must stay faint and behind nothing legible */
ok(r.found && r.op > 0 && r.op <= 0.3, `it is faint, as a watermark must be (opacity ${r.op})`);
/* the card must not have grown to page width — the escape symptom */
ok(r.found && r.cardW < r.vw * 0.92,
   `the card is still a card, not the page (${r.cardW}px of ${r.vw}px)`);
ok(r.teamcalStillThere, 'the Team Calendar and its pencil watermark are untouched');
ok(fetched.has('cardinal-board.png'), 'and the pencil still gets fetched');

/* ---- THE ONE THAT MATTERS MOST: it must not paint ON TOP of the dates.
   A watermark that covers the numbers is worse than no watermark. This renders
   the card with the watermark suppressed, then as shipped, and compares the
   GLYPH pixels. Measured while building 1183: unlifted content = 13.8% of
   glyph pixels disturbed, and z-index:0 did NOT help (13.1%) because a
   positioned ::before paints above non-positioned in-flow siblings whatever
   its z-index. Lifting the content is the fix; as shipped it is ~2%, which is
   anti-aliasing against a changed ground. */
async function glyphDrift() {
  const el = await page.$('.pipecard.prodcal');
  if (!el) return null;
  const setOv = css => page.evaluate(c => {
    let s = document.getElementById('__g1183');
    if (!s) { s = document.createElement('style'); s.id = '__g1183'; document.head.appendChild(s); }
    s.textContent = c;
  }, css);
  const grab = async () => {
    const bb = await el.boundingBox();
    return { buf: await page.screenshot({ clip: bb }), bb };
  };
  await setOv('.pipecard.prodcal::before{display:none !important;}');
  await page.waitForTimeout(300);
  const off = await grab();
  await setOv('');
  await page.waitForTimeout(300);
  const on = await grab();
  return page.evaluate(async ([a, b]) => {
    const load = d => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = d; });
    const px = async d => { const im = await load(d); const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0);
      return c.getContext('2d').getImageData(0, 0, im.width, im.height); };
    const A = await px(a), B = await px(b);
    if (A.width !== B.width || A.height !== B.height) return { err: 'size mismatch' };
    let glyph = 0, moved = 0;
    for (let i = 0; i < A.data.length; i += 4) {
      const lum = (A.data[i] + A.data[i+1] + A.data[i+2]) / 3;
      if (lum <= 150) continue;              // only the light date glyphs
      glyph++;
      if (Math.max(Math.abs(A.data[i]-B.data[i]), Math.abs(A.data[i+1]-B.data[i+1]),
                   Math.abs(A.data[i+2]-B.data[i+2])) > 8) moved++;
    }
    return { glyph, moved, pct: glyph ? 100 * moved / glyph : -1 };
  }, ['data:image/png;base64,' + off.buf.toString('base64'),
      'data:image/png;base64,' + on.buf.toString('base64')]);
}
const d = await glyphDrift();
ok(d && d.glyph > 200, `enough date glyphs were sampled to mean anything (${d && d.glyph})`);
ok(d && d.pct >= 0 && d.pct < 3,
   `the watermark stays BEHIND the dates — ${d && d.pct.toFixed(1)}% of glyph pixels disturbed ` +
   `(unlifted content measured 13.8%, so this is the check that would catch a regression)`);

await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
