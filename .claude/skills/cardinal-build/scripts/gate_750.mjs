/* gate_750.mjs — colour dropdowns on the roofing agreement.

   THE ONE THAT EARNS THIS GATE: a <select>'s chosen value is a PROPERTY, not an
   attribute, and `serializeFrame()` saves a contract with `cloneNode(true)`. A
   clone copies attributes and NOT the live value of a form control. So the naive
   version of this feature looks perfect on screen, passes every structural
   assertion, and silently loses the colour the moment the contract is saved —
   with nothing in the DOM to show it ever held one.

   This gate therefore does the full round trip against the app's own functions:
       populate -> change -> serializeFrame() -> reopen the saved html -> re-read

   It also proves:
     - `oc_colors` still has exactly ONE reader in the whole app (the dropdown
       goes through window.CardinalColors.list(), it does not open a 2nd query),
     - the hidden filter is inherited, so a hidden colour never reaches a contract,
     - a discontinued colour is still OFFERED but says so (Theo's settled rule),
     - the selects work inside a contenteditable cell (the 748 trap),
     - a SAVED contract keeps its own frozen option list rather than restating
       today's catalogue,
     - 748's tick boxes and 749's diagram did not regress.

   Usage: node gate_750.mjs [path/to/index.html]     (v749 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

/* The colour catalogue the mock will answer with. Deliberately includes a HIDDEN
   row and a DISCONTINUED row, because those are the two rules worth proving. */
const SEED_COLORS = [
  { id: '1', name: 'Onyx Black',    slug: 'onyx-black',    status: 'current',      product_line: 'duration', hidden: false, sort_order: 10 },
  { id: '2', name: 'Estate Gray',   slug: 'estate-gray',   status: 'current',      product_line: 'duration', hidden: false, sort_order: 20 },
  { id: '3', name: 'Evergreen Mist',slug: 'evergreen-mist',status: 'coty',         product_line: 'duration', hidden: false, sort_order: 30 },
  { id: '4', name: 'Storm Cloud',   slug: 'storm-cloud',   status: 'discontinued', product_line: 'duration', hidden: false, sort_order: 40 },
  { id: '5', name: 'Shasta White',  slug: 'shasta-white',  status: 'current',      product_line: 'duration', hidden: true,  sort_order: 50 },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (t === 'font' || t === 'media') return r.abort();
  if (u.startsWith('data:')) return r.continue();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(seed => {
  window.__SEED__ = { team_profiles: [], projects: [], inspection_reports: [], estimates: [], contracts: [], oc_colors: seed };
}, SEED_COLORS);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);

/* ── 0. one reader, one pipeline ──────────────────────────────────────────── */
chk("oc_colors has exactly ONE reader in the app",
    (APP_HTML.match(/from\('oc_colors'\)/g) || []).length === 1,
    (APP_HTML.match(/from\('oc_colors'\)/g) || []).length);
chk('CardinalColors exposes the list accessor',
    await page.evaluate(() => !!(window.CardinalColors && typeof window.CardinalColors.list === 'function')));

const TPL = await page.evaluate(() => {
  const o = {};
  for (const n of ['ROOF_AGREEMENT', 'SIDING_AGREEMENT', 'GUTTER_AGREEMENT']) {
    try { o[n] = window[n] || eval(n); } catch (e) {}
  }
  return o;
});
chk('the roofing agreement carries 3 dropdowns',
    (TPL.ROOF_AGREEMENT.match(/<select class="crsel"/g) || []).length === 3,
    (TPL.ROOF_AGREEMENT.match(/<select class="crsel"/g) || []).length);
chk('one shingle-colour + two trim',
    (TPL.ROOF_AGREEMENT.match(/data-crsel="occ"/g) || []).length === 1 &&
    (TPL.ROOF_AGREEMENT.match(/data-crsel="trim"/g) || []).length === 2);
chk('each is contenteditable="false" (the 748 trap)',
    (TPL.ROOF_AGREEMENT.match(/class="crsel"[^>]*contenteditable="false"/g) || []).length === 3);
for (const n of ['SIDING_AGREEMENT', 'GUTTER_AGREEMENT'])
  chk(`${n} gained no dropdown`, !/<select class="crsel"/.test(TPL[n] || ''));

/* ── 1-5. the full round trip through the app's own functions ─────────────── */
const r = await (async () => { try { return await page.evaluate(async () => {
  const fr = document.getElementById('reportFrame'), ed = document.getElementById('editorView');
  ed.classList.add('open'); ed.setAttribute('aria-hidden', 'false');
  await new Promise(res => { fr.onload = () => res(); fr.srcdoc = window.ROOF_AGREEMENT || eval('ROOF_AGREEMENT'); });
  const doc = fr.contentDocument;
  lockTemplate(doc);
  wireCheckboxes(doc);
  await wireColorSelects(doc);
  await wireColorSelects(doc);                       /* twice: must not double-bind */

  const occ  = doc.querySelector('select[data-crsel="occ"]');
  const trim = doc.querySelectorAll('select[data-crsel="trim"]');
  if (!occ || trim.length !== 2) return { missing: true };

  const optTexts = [...occ.options].map(o => o.textContent);
  const out = {
    occCount: occ.options.length,
    occTexts: optTexts,
    trimCount: trim[0].options.length,
    trimTexts: [...trim[0].options].map(o => o.textContent),
    insideEditable: !!occ.closest('[contenteditable="true"]'),
    selfNotEditable: occ.getAttribute('contenteditable'),
  };

  /* pick a colour the way a user does, then fire the real event */
  occ.value = 'Estate Gray';
  occ.dispatchEvent(new Event('change', { bubbles: true }));
  trim[0].value = 'Musket Brown';
  trim[0].dispatchEvent(new Event('change', { bubbles: true }));

  out.liveValue = occ.value;
  out.attrWritten = !!occ.querySelector('option[selected]');
  out.attrValue = (occ.querySelector('option[selected]') || {}).value;
  out.onlyOneSelected = occ.querySelectorAll('option[selected]').length === 1;

  /* change again — the old attribute must be cleared, not accumulated */
  occ.value = 'Onyx Black';
  occ.dispatchEvent(new Event('change', { bubbles: true }));
  out.afterSecondPick = (occ.querySelector('option[selected]') || {}).value;
  out.stillOnlyOne = occ.querySelectorAll('option[selected]').length === 1;

  /* THE SAVE */
  const saved = serializeFrame();
  out.savedHasSelected = /option[^>]*selected/.test(saved);
  out.savedHasOptions = (saved.match(/<option/g) || []).length;
  out.savedStripsWiring = !/data-crsel-wired/.test(saved);

  /* REOPEN and read it back */
  await new Promise(res => { fr.onload = () => res(); fr.srcdoc = saved; });
  const d2 = fr.contentDocument;
  lockTemplate(d2);
  await wireColorSelects(d2);
  const occ2 = d2.querySelector('select[data-crsel="occ"]');
  const trim2 = d2.querySelector('select[data-crsel="trim"]');
  out.reopenedValue = occ2 ? occ2.value : '(gone)';
  out.reopenedTrim = trim2 ? trim2.value : '(gone)';
  out.reopenedOptionCount = occ2 ? occ2.options.length : 0;

  ed.classList.remove('open'); document.body.style.overflow = '';
  return out;
}); } catch (e) { return { crashed: String(e).split('\n')[0] }; } })();

chk('the dropdowns exist and were driveable', !r.missing && !r.crashed,
    r.crashed || (r.missing ? 'missing' : 'ok'));
chk('the shingle dropdown filled from the catalogue', r.occCount > 1, r.occCount + ' options');
chk('a HIDDEN colour never reaches the contract',
    !(r.occTexts || []).some(t => /Shasta White/.test(t)), (r.occTexts || []).join(' | '));
chk('a DISCONTINUED colour is still offered, and says so',
    (r.occTexts || []).some(t => t === 'Storm Cloud (discontinued)'),
    (r.occTexts || []).filter(t => /Storm/.test(t)).join(','));
chk('catalogue order is preserved', (r.occTexts || [])[1] === 'Onyx Black', (r.occTexts || [])[1]);
chk('the trim dropdown has the aluminium set + Other',
    r.trimCount === 12 && (r.trimTexts || []).includes('Musket Brown') && (r.trimTexts || []).includes('Other'),
    r.trimCount + ' options');
chk('it sits inside a contenteditable cell (the trap is real)', r.insideEditable === true);
chk('but the control itself is not editable', r.selfNotEditable === 'false', String(r.selfNotEditable));
chk('picking a colour sets it live', r.liveValue === 'Estate Gray', r.liveValue);
chk('AND writes the selected ATTRIBUTE (what survives the save)',
    r.attrWritten && r.attrValue === 'Estate Gray', r.attrValue);
chk('exactly one option carries it', r.onlyOneSelected);
chk('changing the pick moves the attribute, not adds one',
    r.afterSecondPick === 'Onyx Black' && r.stillOnlyOne, r.afterSecondPick);
chk('THE SAVED CONTRACT CARRIES THE CHOICE', r.savedHasSelected);
chk('and carries its own frozen option list', r.savedHasOptions > 10, r.savedHasOptions + ' options saved');
chk('the save strips the wired marker so it re-binds', r.savedStripsWiring);
chk('REOPENING SHOWS THE SAME COLOUR', r.reopenedValue === 'Onyx Black', r.reopenedValue);
chk('and the same trim colour', r.reopenedTrim === 'Musket Brown', r.reopenedTrim);
chk('reopening did not duplicate the options',
    r.reopenedOptionCount === r.occCount, r.reopenedOptionCount + ' vs ' + r.occCount);

/* ── 6. earlier builds intact ─────────────────────────────────────────────── */
for (const [n, want] of [['ROOF_AGREEMENT', 23], ['SIDING_AGREEMENT', 21], ['GUTTER_AGREEMENT', 32]])
  chk(`748 intact: ${n} still has ${want} tick boxes`,
      (TPL[n].match(/class="cbx"/g) || []).length === want,
      (TPL[n].match(/class="cbx"/g) || []).length);
chk('749 intact: the diagram is still there', /<figure class="roofdiag">/.test(TPL.ROOF_AGREEMENT));
chk('no "[circle" prompt returned', !/\[circle/i.test(APP_HTML));
chk('valley metal is deliberately still free text (out of scope, flagged)',
    /5\. Valley metal[\s\S]{0,120}\[colour\]/.test(APP_HTML));
chk('no backtick reached the estimate skeleton', (() => {
  const d = /(?:var|const)\s+ESTIMATE_BASE_RAW\s*=\s*`/.exec(APP_HTML);
  const blk = APP_HTML.slice(d.index + d[0].length, APP_HTML.indexOf('`;', d.index + d[0].length));
  return !blk.includes('`') && !blk.includes('${');
})());

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
