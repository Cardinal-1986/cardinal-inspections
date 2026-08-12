/* gate_747.mjs — printed documents: no photo on contracts, a header on every page,
   breaks in the right places.

   THIS GATE PRINTS. Every assertion below is taken from a real Chromium PDF or from
   paginated layout maths, not from the CSS text — a print rule can parse, balance
   and still never apply, and `@media print` is invisible to every other gate here.

   The three that earn the build:
     1. An AGREEMENT/CONTRACT carries no property photo; an ESTIMATE still does.
     2. The running header lands on EVERY page — counted by its border band in each
        page's own content stream, because text in a PDF is font-subset encoded and
        cannot be grepped.
     3. Nothing regressed: the documents still print, still carry their content, and
        the page count did not explode (a break-after-every-section would have turned
        a 13-row spec sheet into 13 pages).

   Usage: node gate_747.mjs [path/to/index.html]     (v746 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';
import zlib from 'zlib';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (t === 'image' || t === 'font' || t === 'media') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(() => { window.__SEED__ = { team_profiles: [], projects: [], inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [], collections: [], commissions: [], draws: [], punch_items: [], appointments: [] }; });
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);

/* pull the built templates straight out of the running app */
const TPL = await page.evaluate(() => {
  const want = ['ROOF_AGREEMENT', 'SIDING_AGREEMENT', 'GUTTER_AGREEMENT', 'CONTRACT_TEMPLATE',
                'INVOICE_TEMPLATE', 'ESTIMATE_TEMPLATE', 'GUTTER_TEMPLATE', 'ANDERSEN_TEMPLATE'];
  const out = {};
  for (const n of want) { try { const v = window[n] || eval(n); if (typeof v === 'string') out[n] = v; } catch (e) {} }
  return out;
});
chk('the templates were readable from the app', Object.keys(TPL).length >= 6, Object.keys(TPL).join(','));

/* ── 1. property photo: gone from deals, kept on estimates ────────────────── */
const photo = {};
for (const [n, html] of Object.entries(TPL)) photo[n] = /class="cover-photo"/.test(html);
for (const n of ['ROOF_AGREEMENT', 'SIDING_AGREEMENT', 'GUTTER_AGREEMENT', 'CONTRACT_TEMPLATE'])
  chk(`${n} has NO property photo`, photo[n] === false, String(photo[n]));
for (const n of ['ESTIMATE_TEMPLATE', 'GUTTER_TEMPLATE', 'ANDERSEN_TEMPLATE'])
  chk(`${n} KEEPS its property photo`, photo[n] === true, String(photo[n]));

/* ── 2. the running header, and the placeholder must be substituted ───────── */
for (const [n, html] of Object.entries(TPL)) {
  if (/__EST_RUNHEAD__/.test(html)) chk(`${n} substituted its header text`, false, 'placeholder left raw');
}
chk('no template leaks a raw __EST_RUNHEAD__',
    !Object.values(TPL).some(h => /__EST_RUNHEAD__/.test(h)));
chk('the agreement header names the document',
    /class="runhead">[^<]*ROOFING CONSTRUCTION AGREEMENT/.test(TPL.ROOF_AGREEMENT || ''),
    (TPL.ROOF_AGREEMENT || '').match(/class="runhead">[^<]{0,80}/)?.[0]);
chk('the roof estimate (older skeleton) has one too',
    /class="runhead">[^<]*ROOFING ESTIMATE/.test(TPL.ESTIMATE_TEMPLATE || ''),
    (TPL.ESTIMATE_TEMPLATE || '').match(/class="runhead">[^<]{0,80}/)?.[0]);

/* ── 3. PRINT IT. Count the header band per page in the PDF itself ────────── */
async function printDoc(html) {
  const p2 = await ctx.newPage();
  await p2.setContent(html, { waitUntil: 'domcontentloaded' });
  await p2.emulateMedia({ media: 'print' });
  /* mark the running header with a colour we can count in the content stream —
     PDF text is font-subset encoded and cannot be grepped for words. */
  await p2.addStyleTag({ content: '@media print{.runhead{background:#00ff00 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}' });
  const pdf = await p2.pdf({ format: 'Letter', printBackground: true });
  /* ⚠️ WHAT CAN AND CANNOT BE ASSERTED HERE.
     The first version of this gate modelled pagination as scrollHeight/1056 and
     flagged rows that "straddled a boundary". That is measuring the wrong thing:
     `break-inside:avoid` changes nothing in CONTINUOUS layout — it only acts when
     the engine paginates, and it moves the row to the next page. So the flat model
     reports splits for rows the printer will never split, and it went 2 red against
     a correct build.
     Chromium exposes no per-element page assignment, so the honest assertion is
     that the RULES APPLY (computed style under print media) plus what the real PDF
     can show (the header band on every page). */
  const facts = await p2.evaluate(() => {
    const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : '(absent)'; };
    const rh = document.querySelector('.runhead');
    return {
      trBreak:    cs('table.meta tr', 'breakInside'),
      theadDisp:  cs('table.items thead', 'display') || cs('thead', 'display'),
      secBreak:   cs('h2.sec', 'breakAfter'),
      signBreak:  cs('.sign', 'breakInside'),
      termsBreak: cs('h2.sec.page-break', 'breakBefore'),
      runheadShown: rh ? getComputedStyle(rh).display : '(absent)',
      bodyPadTop: getComputedStyle(document.body).paddingTop
    };
  });
  await p2.close();
  const s = pdf.toString('latin1');
  let pages = 0, green = 0;
  for (const mm of s.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    let d; try { d = zlib.inflateSync(Buffer.from(mm[1], 'latin1')).toString('latin1'); } catch (e) { d = mm[1]; }
    if (!/\bre\b/.test(d)) continue;
    pages++;
    if (/0 1 0 rg/.test(d)) green++;
  }
  return { pages, headerOnPages: green, ...facts };
}

const roof = await printDoc(TPL.ROOF_AGREEMENT);
chk('the agreement still prints', roof.pages >= 2, JSON.stringify({ pages: roof.pages }));
chk('THE HEADER IS ON EVERY PAGE', roof.pages > 0 && roof.headerOnPages === roof.pages,
    roof.headerOnPages + ' of ' + roof.pages + ' pages');
chk('the running header is visible under print media', roof.runheadShown === 'block', roof.runheadShown);
chk('the body makes room for it', /\d/.test(roof.bodyPadTop) && parseFloat(roof.bodyPadTop) > 20, roof.bodyPadTop);
chk('a table ROW is told not to split', roof.trBreak === 'avoid', roof.trBreak);
chk('a long table repeats its header row', roof.theadDisp === 'table-header-group', roof.theadDisp);
chk('a heading is told not to be stranded', roof.secBreak === 'avoid', roof.secBreak);
chk('the signature block is told not to split', roof.signBreak === 'avoid', roof.signBreak);
chk('Terms is told to start a new page', roof.termsBreak === 'page', roof.termsBreak);
chk('the page count did not explode (no break per section)', roof.pages <= 8, 'pages = ' + roof.pages);

const est = await printDoc(TPL.ESTIMATE_TEMPLATE);
chk('the estimate still prints too', est.pages >= 1, JSON.stringify({ pages: est.pages }));
chk('and its header is on every page', est.pages > 0 && est.headerOnPages === est.pages,
    est.headerOnPages + ' of ' + est.pages + ' pages');
chk('the estimate gets the same row rule', est.trBreak === 'avoid', est.trBreak);

/* ── 4. the empty photo no longer prints on an estimate ───────────────────── */
const emptyPhoto = await (async () => {
  const p3 = await ctx.newPage();
  await p3.setContent(TPL.ESTIMATE_TEMPLATE, { waitUntil: 'domcontentloaded' });
  await p3.emulateMedia({ media: 'print' });
  const r = await p3.evaluate(() => {
    const el = document.querySelector('.cover-photo');
    if (!el) return { absent: true };
    const b = el.getBoundingClientRect();
    return { display: getComputedStyle(el).display, area: Math.round(b.width * b.height) };
  });
  await p3.close();
  return r;
})();
chk('an empty property photo does NOT print on an estimate',
    emptyPhoto.absent || emptyPhoto.display === 'none' || emptyPhoto.area === 0, JSON.stringify(emptyPhoto));

/* ── 5. source-level guards ───────────────────────────────────────────────── */
const src = APP_HTML;
chk('both skeletons carry the header CSS', (src.match(/\.runhead\{display:none;\}/g) || []).length === 2);
chk('the pre-existing break classes were not disturbed',
    (src.match(/\.page-break\{break-before:page;\}/g) || []).length === 2 &&
    (src.match(/\.avoid-break\{break-inside:avoid;\}/g) || []).length === 2);
chk('Terms starts its own page', /<h2 class="sec page-break">Terms<\/h2>/.test(src));
chk('the photo is stripped in buildEstimate, not deleted from the skeleton',
    /if\(isDeal\) out = out\.replace\('<div class="cover-photo">PROPERTY PHOTO<\/div>/.test(src));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
