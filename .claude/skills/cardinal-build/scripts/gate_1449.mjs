#!/usr/bin/env node
/* gate_1449 — Color Studio door A (Theo, 13 Nov 2026: "A"): a Job Menu tile on a client's page,
 * OWNER ONLY, that opens the Showroom workspace with ?open=experience in a new tab.
 *
 *   A  Theo (the Showroom's one owner) sees a "Color Studio" tile in the Job Menu
 *   B  tapping it opens https://showroom.cardinalroster.com/workspace.html?open=experience in a NEW
 *      tab (window.open, _blank) and leaves the client's page where it was
 *   C  Joan (admin, not the owner), Nick (sales) and Curtis (production) do NOT see it — the
 *      Showroom's authorize() refuses them, so a tile would be a door into a 401
 *   D  The Appointment carries no Color Studio door (it faces the homeowner — Theo, 29 Oct)
 *
 *   node gate_1449.mjs [index.html]      must be RED on build 1448
 *   PW_CORE=<playwright-core path>  PW_CHROMIUM=<browser exe>   (local runs)
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PW = process.env.PW_CORE || (existsSync('/opt/node22/lib/node_modules/playwright/index.js') ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');
const { chromium } = require(PW);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const APP  = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(ROOT, 'index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' +
              readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 240) : ''));
  cond ? pass++ : fail++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

async function clientPage(who) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  page.on('dialog', d => d.accept());
  await page.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  /* the rig's ?as= knows scottie/curtis/nick only; an unknown name silently signs in as Theo, so Joan
     (admin, not the Showroom owner) is set directly — and C asserts the email actually took */
  if (who === 'joan') await page.addInitScript(() => { window.__AS__ = { email: 'joan@cardinalrenovations.net', name: 'Joan' }; });
  await page.addInitScript(SETUP);
  await page.addInitScript(() => { window.__opened = []; window.open = (u, t, f) => { window.__opened.push({ u, t, f }); return null; }; });
  await page.goto('https://cardinal.test/?as=' + who, { waitUntil: 'domcontentloaded' });
  await wait(3500);
  /* open the first project the rig's own list holds (the base seed names them p1..p3) */
  await page.evaluate(() => { try { const ps = window.cacheProjects || []; const r = ps.find(x => x.crm === 'retail') || ps[0]; if (r) window.openProject(r.id); } catch (_) {} });
  await wait(2000);
  return { ctx, page, errs };
}
const tile = () => {
  const t = [...document.querySelectorAll('#acxMount .ja-menu .jabox[data-jm="colorstudio"], .ja-menu .jabox[data-jm="colorstudio"]')].find(e => e.getClientRects().length);
  const menu = [...document.querySelectorAll('.ja-menu .jabox')].some(e => e.getClientRects().length);
  return { menu, has: !!t, label: t ? (t.querySelector('.jbl') || {}).textContent : null };
};

/* A + B — Theo */
{
  const { ctx, page, errs } = await clientPage('theo');
  const a = await page.evaluate(tile);
  ok('A the client page rendered its Job Menu', a.menu, a);
  ok('A the owner sees a "Color Studio" tile', a.has && a.label === 'Color Studio', a);
  const before = await page.evaluate(() => location.href);
  await page.evaluate(() => { const t = document.querySelector('.ja-menu .jabox[data-jm="colorstudio"]'); if (t) t.click(); });
  await wait(500);
  const b = await page.evaluate(() => ({ opened: window.__opened, href: location.href }));
  ok('B it opens the Showroom workspace on the Experience, in a new tab',
     b.opened.length === 1 && b.opened[0].u === 'https://showroom.cardinalroster.com/workspace.html?open=experience' && b.opened[0].t === '_blank', b.opened);
  ok('B the client\'s page stays where it was', b.href === before, { before, after: b.href });
  ok('no page errors (owner)', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}
/* C — everyone else */
for (const who of ['joan', 'nick', 'curtis']) {
  const { ctx, page } = await clientPage(who);
  const c = await page.evaluate(tile);
  const em = await page.evaluate(() => String((window.currentUser || {}).email || ''));
  ok(`C signed in as ${who}, not the owner`, em.startsWith(who + '@'), em);
  ok(`C ${who}'s client page rendered its Job Menu (so the next check is not vacuous)`, c.menu, c);
  ok(`C ${who} does not see the tile`, c.menu && !c.has, c);
  await ctx.close();
}
/* D — The Appointment never offers it */
ok('D The Appointment\'s module has no Color Studio door',
   (() => { const a = HTML.indexOf('<script id="cr-appt-script">'), z = HTML.indexOf('</script>', a); return a > 0 && !/showroom\.cardinalroster\.com|colorstudio|Color Studio/.test(HTML.slice(a, z)); })());
/* E — it is new in this build (the control has no tile, and the address is not hard-coded twice) */
ok('E the Showroom address appears once as the tile\'s default', (HTML.match(/workspace\.html\?open=experience/g) || []).length === 1);

await browser.close();
console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed  (${APP})`);
process.exit(fail ? 1 : 0);
