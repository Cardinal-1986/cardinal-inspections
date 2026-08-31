/* gate_1182 — the report cover logo is a file, and the FIVE things that read it
 * still get a logo.
 *
 * WHAT 1182 DID. The same 139,982-char base64 PNG was written into index.html
 * twice — once in the roof report template, once in the exterior report, sha1
 * 6859fb78351b both times. The templates are genuinely different documents and
 * both stay; only the image was redundant. It is /cardinal-report-logo.png now.
 *
 * ⚠ WHY THIS GATE IS SHAPED THE WAY IT IS — read before editing it.
 * The first version asked `document.querySelectorAll('img.cover-logo')` and
 * found ZERO, because the report templates live inside a <script> block as
 * JavaScript STRING CONSTANTS; nothing named cover-logo is ever in the resting
 * DOM. Two of its checks were `.every()` over that empty array and passed
 * VACUOUSLY. So it was a gate that could not fail, sitting on top of a build
 * that had broken five things:
 *
 *   ESTIMATE_TEMPLATE · buildEstimate() · the login/editor brand logo · the
 *   daily login quote · cardinalLogo() in cr-epub-script
 *
 * every one of which dug the data URI back out of a template constant by
 * regex. With the blob gone all five matched nothing: three substituted '' for
 * the logo, and the fourth — the brand-logo IIFE — did `if(!m) return;`, so it
 * abandoned the whole function and took the daily quote out with it. Nothing
 * threw. The letterhead vanished off every client-facing estimate and contract
 * and the login screen lost its logo, silently.
 *
 * Therefore: assert on the ARTIFACT TEXT for what only text can show, and on
 * RUNTIME VALUES for the five consumers. Never on the resting DOM.
 *
 * Optional path arg -> negative control. TWO controls are meaningful here:
 *   index_v1181.html          — before the swap (still carries both blobs)
 *   index_v1182_broken.html   — the swap WITHOUT the consumer repair; this is
 *                               the state I nearly shipped, and the only
 *                               control that proves the gate catches it. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, waitForSoft, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
const LOGO = fs.readFileSync('/home/user/cardinal-inspections/cardinal-report-logo.png');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 150000);

let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };

/* ---------------------------------------------------------------- ARTIFACT
   The templates are strings, so the file text is the only place their markup
   can be read. Count the real <img>, not the class name — the class name also
   appears inside the extraction regexes and inside this build's own comment,
   which is the comment-pollution trap this project has been bitten by twice. */
const IMG = '<img class="cover-logo" src="/cardinal-report-logo.png"';
const imgs = APP_HTML.split(IMG).length - 1;
ok(imgs === 2, `both report templates carry the file-backed cover logo (found ${imgs})`);
ok(APP_HTML.indexOf('iVBORw0KGgoAAAANSUhEUgAABEwAAAKHCAYAAA') === -1,
   'no copy of the base64 blob survives in the artifact');
ok((APP_HTML.match(/onerror="this\.onerror=null;this\.src='\/cardinal-transparent\.png'"/g) || []).length === 2,
   'both carry an onerror fallback to the main Cardinal logo');

/* THE REGRESSION CHECK. Any surviving `.match(/class="…-logo" src="(data:image`
   is a consumer still hunting for a blob that no longer exists — i.e. a silently
   empty logo. This is the single assertion that would have caught the break. */
const extractions = (APP_HTML.match(/match\(\/class="(?:cover|est)-logo" src="\(data:image/g) || []).length;
ok(extractions === 0,
   `no consumer still digs the logo out of a template by regex (found ${extractions})`);
ok((APP_HTML.match(/var CARDINAL_LOGO_SRC = '\/cardinal-report-logo\.png';/g) || []).length === 1,
   'the path is declared exactly once — one source of truth');

/* ----------------------------------------------------------------- RUNTIME */
const ck = t => JSON.stringify({ lead: { claim_type: t } });
const P = (id, name, stage, type) => ({ id, name, stage, address: '', phone: '', email: '',
  checklist: ck(type), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('r1','R Lead','Lead','retail'), P('c1','C One','Lead','community')],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [],
  contracts: [], punch_items: [], insurance_claims: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
  /* serve the real PNG the way Vercel will — this is the whole point of trading
     a data URI for a fetch, so the gate must actually perform the fetch */
  if (url.endsWith('/cardinal-report-logo.png'))
    return route.fulfill({ status: 200, contentType: 'image/png', body: LOGO });
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
/* The shipped cardinalLogo(), lifted verbatim out of the artifact by brace
   matching — it lives inside cr-epub-script's IIFE and is unreachable from page
   scope. Extract it here so the runtime check runs the REAL function. If the
   extraction fails the gate says so and goes red; it never silently skips. */
function extractFn(html, name) {
  const at = html.indexOf('function ' + name + '(');
  if (at === -1) return '';
  let i = html.indexOf('{', at), depth = 0;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return html.slice(at, j + 1); }
  }
  return '';
}
const CL_SRC = extractFn(APP_HTML, 'cardinalLogo');
ok(CL_SRC.length > 60, `cardinalLogo() could be lifted out of the artifact (${CL_SRC.length} chars)`);

await page.addInitScript(src => { window.__CL_SRC__ = src; }, CL_SRC);
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
/* was a fixed 3.5-second sleep — a guess. Measured on the shipped tree: the app
   is fully booted at 555ms, so that was six times too long AND still unsafe
   under load. waitAppReady polls real signals and throws naming the stuck one. */
await waitAppReady(page);

const WANT = '/cardinal-report-logo.png';

/* ⚠ CLASS 37: every symbol below is read through a guard, because on the 1181
   control some of them hold a data URI and on a future tree one may not exist
   at all. A control that CRASHES has proved nothing; it must report RED. */
const r = await page.evaluate(async (WANT) => {
  const g = fn => { try { return fn(); } catch (e) { return { __err: String(e && e.message || e) }; } };
  const head = v => (typeof v === 'string' ? v.slice(0, 60) : JSON.stringify(v));
  const out = {};

  /* 1. cardinalLogo() — feeds buildDocHtml(), i.e. every estimate document.
     ⚠ It is NOT a global: cr-epub-script wraps everything in an IIFE, so
     `typeof cardinalLogo` is "undefined" in page scope and the obvious call
     reports "(not defined)" on a perfectly healthy tree. Pull the SHIPPED
     function text out of the artifact and run that — the project's own rule,
     execute the real function rather than a re-implementation of it. */
  out.cardinalLogo = g(() => {
    const src = window.__CL_SRC__;
    if (!src) return '(could not extract cardinalLogo from the artifact)';
    // eslint-disable-next-line no-new-func
    return new Function(src + '\nreturn cardinalLogo();')();
  });

  /* 2+3. the two template constants must carry the path, not src="" */
  out.reportSrc = g(() => {
    const m = String(window.REPORT_TEMPLATE || '').match(/class="cover-logo" src="([^"]*)"/);
    return m ? head(m[1]) : '(no cover-logo img in REPORT_TEMPLATE)';
  });
  out.estimateSrc = g(() => {
    const m = String(window.ESTIMATE_TEMPLATE || '').match(/class="est-logo" src="([^"]*)"/);
    return m ? head(m[1]) : '(no est-logo img in ESTIMATE_TEMPLATE)';
  });

  /* 4. buildEstimate() — the contracts and agreements path */
  out.builtSrc = g(() => {
    if (typeof buildEstimate !== 'function') return '(buildEstimate not defined)';
    const html = buildEstimate('SERVICE <span>CONTRACT</span>', '<p>body</p>', '<p>terms</p>');
    const m = String(html).match(/class="est-logo" src="([^"]*)"/);
    return m ? head(m[1]) : '(no est-logo img in the built document)';
  });

  /* 5. the login/editor brand logo AND the daily quote — both live inside the
        one IIFE that used to bail out with `if(!m) return;` */
  const bl = document.getElementById('brandLogo');
  out.brandSrc = bl ? (bl.getAttribute('src') || '') : '(no #brandLogo)';
  /* ⚠ DO NOT assert #brandLogo is VISIBLE. cr-lg-script hides it on purpose and
     re-hides it through a MutationObserver on its style attribute, backed by a
     `display:none !important` rule in cr-lg-styles — the header's own gold home
     made it redundant. The first draft of this gate asserted it was shown and
     went red on correct code. #editorLogo is the one that IIFE actually
     reveals, and nothing hides it, so that is where "the function ran to the
     end" can honestly be measured. */
  const el = document.getElementById('editorLogo');
  out.editorSrc = el ? (el.getAttribute('src') || '') : '(no #editorLogo)';
  out.editorShown = !!el && el.style.display === 'block';
  const lq = document.getElementById('loginQuote');
  out.quote = lq ? (lq.textContent || '').trim().length : -1;

  /* 6. and the bytes really decode over HTTP */
  out.decoded = await new Promise(res => {
    const im = new Image();
    im.onload = () => res({ ok: true, w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => res({ ok: false });
    im.src = WANT;
  });
  return out;
}, WANT);

const isPath = v => v === WANT;
/* a failing value here can be a 140 KB data URI — truncate it, or the gate's
   own output buries the other findings */
const sh = v => JSON.stringify(typeof v === 'string' && v.length > 70 ? v.slice(0, 70) + '\u2026' : v);
ok(isPath(r.cardinalLogo), `cardinalLogo() returns the path — every estimate document's letterhead (got ${sh(r.cardinalLogo)})`);
ok(isPath(r.reportSrc),    `REPORT_TEMPLATE's cover logo points at the file (got ${sh(r.reportSrc)})`);
ok(isPath(r.estimateSrc),  `ESTIMATE_TEMPLATE's logo is filled in, not empty (got ${sh(r.estimateSrc)})`);
ok(isPath(r.builtSrc),     `buildEstimate() puts a logo on a contract (got ${sh(r.builtSrc)})`);
ok(isPath(r.brandSrc),     `the header brand logo has its src (got ${sh(r.brandSrc)})`);
ok(isPath(r.editorSrc),    `the editor's home logo has its src (got ${sh(r.editorSrc)})`);
ok(r.editorShown,          'and the editor logo was actually revealed — the IIFE ran to the end');
ok(r.quote > 20,           `the daily login quote still renders — the same IIFE (chars: ${r.quote})`);
ok(r.decoded && r.decoded.ok, 'the served file DECODES as an image — not a 404, not a corrupt write');
ok(r.decoded && r.decoded.ok && r.decoded.w > 400 && r.decoded.h > 200,
   `and it is the full-size logo, not a stub (${r.decoded && r.decoded.w}x${r.decoded && r.decoded.h})`);

/* --------------------------------------------------- RENDER ONE FOR REAL
   Structure is not paint. Put the actual roof-report template into a document
   and confirm the cover logo lays out with real dimensions — the one check
   that answers "would a homeowner see a broken image icon". */
const tpl = await page.evaluate(() => {
  try { return String(window.REPORT_TEMPLATE || ''); } catch (_) { return ''; }
});
if (!tpl) {
  ok(false, 'REPORT_TEMPLATE could not be read, so the rendered check could not run');
} else {
  const rp = await ctx.newPage();
  await rp.route('**/*', async route => {
    const url = route.request().url();
    if (url.endsWith('/cardinal-report-logo.png'))
      return route.fulfill({ status: 200, contentType: 'image/png', body: LOGO });
    if (url === 'https://app.cardinalroster.com/report')
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: tpl });
    return route.abort();
  });
  await rp.goto('https://app.cardinalroster.com/report', { waitUntil: 'domcontentloaded' });
  await rp.waitForTimeout(1500);
  const paint = await rp.evaluate(() => {
    const im = document.querySelector('img.cover-logo');
    if (!im) return { found: false };
    const b = im.getBoundingClientRect();
    return { found: true, complete: im.complete, nw: im.naturalWidth, nh: im.naturalHeight,
             w: Math.round(b.width), h: Math.round(b.height) };
  });
  ok(paint.found, 'the rendered report has a cover-logo element');
  ok(paint.found && paint.complete && paint.nw > 0,
     `and it LOADED in the rendered report (natural ${paint.nw}x${paint.nh}) — no broken-image icon on a client's document`);
  ok(paint.found && paint.w > 100 && paint.h > 20,
     `and it occupies real space on the page (${paint.w}x${paint.h})`);
  await rp.close();
}

await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
