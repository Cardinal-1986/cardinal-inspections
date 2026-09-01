#!/usr/bin/env node
/* gate_1190 — the legacy Vision path is gone, and NOTHING REACHABLE went with it.
 *
 *   node gate_1190.mjs [index.html]
 *   node gate_1190.mjs <prev> --control      the 1189 tree; group A must fail
 *
 * Two halves, and the second is the one that matters.
 *
 * A · REMOVED. The Vision hub, isVisionHost() and the ?vision=1 branches are
 *     gone from CODE — proven through the lexer, because this build's own
 *     comments discuss every one of those names and a raw count cannot tell
 *     an explanation from a call.
 *
 * B · NOT REMOVED. cr-show-* and cr-occ-* were in the cleanup scope and were
 *     DELIBERATELY KEPT, because the audit found them reachable from five
 *     places inside Cardinal that the cutover did not touch. This half proves
 *     that, so "we cleaned up" can never quietly mean "we broke The Walk".
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(existsSync('/opt/node22/lib/node_modules/playwright/index.js')
  ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');

const HERE = dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const CONTROL = process.argv.includes('--control');
const APP = args[0] || resolve(HERE, '../../../../index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']
  .map(p => readFileSync(resolve(HERE, p), 'utf8')).join('\n;\n');
let pass = 0, fail = 0;
const ok = (n, c, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

/* CODE hits only. The lexer is the instrument this file insists on: every one
   of these names still appears in prose explaining its own removal. */
const codeHits = needle => {
  const out = execFileSync('python3', [resolve(HERE, 'jslex_count.py'), APP, needle], { encoding: 'utf8' });
  return parseInt(/in CODE\s*:\s*(\d+)/.exec(out)[1], 10);
};

console.log('gate_1190 ' + (CONTROL ? '(CONTROL — group A must FAIL)' : '') + '\n  app: ' + APP + '\n');

/* ── A · what this build removed ──────────────────────────────────────── */
for (const n of ['isVisionHost', 'visionHtml', '_vision'])
  ok(`A the name "${n}" has no CODE occurrence left`, codeHits(n) === 0, String(codeHits(n)));
ok('A no ?vision=1 test in code',   !HTML.includes("location.search.indexOf('vision=1')"));
ok('A no showroom. host test in code', !HTML.includes("location.hostname.indexOf('showroom.')"));
ok('A the data-cr-vision selector is gone', !HTML.includes('body[data-cr-vision'));
ok('A nothing writes data-cr-vision', !HTML.includes("setAttribute('data-cr-vision'"));
ok('A the hub markup class is gone', !/class="cr-vh/.test(HTML));

/* ── B · what this build refused to remove, and why ───────────────────── */
for (const b of ['cr-show-styles', 'cr-show-script', 'cr-occ-styles', 'cr-occ-script'])
  ok(`B the ${b} block is still here`, HTML.includes(`id="${b}"`));
/* the five in-Cardinal consumers the audit found — each is a live door the
   cutover did not touch, and each is why the modules stayed */
const CONSUMERS = [
  ["the client profile's Walk tab", "window.CardinalShowcase.openForProject(pr)"],
  ['hideAllViews() registration',   "{ id:'cr-show', api:window.CardinalShowcase }"],
  ['the history restore case',      "case 'showcase':"],
  ['the Front Door showroom door',  "if(d === 'showroom')"],
  ['the Front Door colors door',    "if(d === 'colors')"],
  ['the shingle colour dropdowns',  'window.CardinalColors.list()'],
  ['the shingle line dropdowns',    'window.CardinalColors.lines()'],
  ['The Appointment drives it',     "window.CardinalShowcase.openForProject(proj, { showroom:true })"],
];
for (const [why, needle] of CONSUMERS)
  ok(`B still reachable: ${why}`, HTML.includes(needle), needle.slice(0, 46));

/* ── C · driven, not read ─────────────────────────────────────────────── */
const browser = await chromium.launch();
async function boot(q) {
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://cardinal.test/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP);
  await page.goto('https://cardinal.test/' + q, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs };
}
{ /* sign-in still lands somewhere real — showMain() was edited, so this is the
     regression that would matter most, and it is driven rather than reasoned */
  const { ctx, page, errs } = await boot('');
  const s = await page.evaluate(() => {
    const at = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const vis = id => { const e = document.getElementById(id); if (!e) return 'absent';
      return getComputedStyle(e).display === 'none' ? 'hidden' : 'shown'; };
    return { hit: at ? at.tagName : null, main: vis('mainView'), landing: vis('landingView'),
             header: !!document.querySelector('header.site'),
             nav: (document.getElementById('navWrap') || {}).style ?
                  getComputedStyle(document.getElementById('navWrap')).display : 'absent' };
  });
  ok('C sign-in still lands on the CRM home', s.main === 'shown', JSON.stringify(s));
  ok('C the header is not suppressed', s.header === true);
  ok('C the nav is not suppressed', s.nav !== 'none', s.nav);
  ok('C no page error on boot', errs.length === 0, errs[0] || '');
  await ctx.close();
}
{ /* the modules still OPEN — the doors that kept them alive */
  const { ctx, page } = await boot('');
  const r = await page.evaluate(async () => {
    const out = {};
    try { window.CardinalShowcase.open(); } catch (e) { out.showErr = String(e); }
    await new Promise(r => setTimeout(r, 700));
    const sh = document.getElementById('cr-show');
    out.showcase = sh ? (sh.classList.contains('open') || getComputedStyle(sh).display !== 'none') : false;
    try { window.CardinalShowcase.close(false); } catch (e) {}
    try { window.CardinalColors.open(); } catch (e) { out.occErr = String(e); }
    await new Promise(r => setTimeout(r, 700));
    const oc = document.getElementById('cr-occ');
    out.colors = oc ? getComputedStyle(oc).display !== 'none' : false;
    return out;
  });
  ok('C the Showcase still opens in Cardinal', r.showcase === true, r.showErr || JSON.stringify(r));
  ok('C OC Colors still opens in Cardinal',    r.colors === true,   r.occErr || JSON.stringify(r));
  await ctx.close();
}
for (const [q, id, label] of [['?open=appt', 'cr-appt', 'The Appointment'],
                              ['?open=why',  'cr-why',  'Why Cardinal']]) {
  const { ctx, page } = await boot(q);
  const st = await page.evaluate(i => {
    const e = document.getElementById(i);
    return e ? { there: true, display: getComputedStyle(e).display,
                 h: Math.round(e.getBoundingClientRect().height) } : { there: false };
  }, id);
  ok(`C ${q} still cold-loads ${label}`, st.there && st.display !== 'none' && st.h > 200, JSON.stringify(st));
  await ctx.close();
}
await browser.close();
console.log('\n' + (fail ? 'RED' : 'GREEN') + '  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
