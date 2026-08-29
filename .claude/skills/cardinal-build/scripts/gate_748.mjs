/* gate_748.mjs — the three Construction Agreements get real tick boxes.

   Theo: "It says to circle but only does text edits and looks nothing like the
   actual contract with check boxes."

   WHAT THIS GATE HAS TO PROVE, and why each one is not obvious:

     1. Every "[circle …]" prompt is gone from the three Agreements, and the
        boxes landed ONLY there — a stray box in an estimate would be a silent
        regression in a document Theo hands to customers.

     2. THE BOXES ACTUALLY CLICK **INSIDE A contenteditable CELL**. This is the
        real risk in this build and the reason the gate drives a browser at all.
        `table.meta td:not(.k)` is in EDITABLE_SELECTOR, so `lockTemplate()`
        makes every cell holding a new box editable. A caret lives there. If a
        contenteditable host swallowed the click, or `e.preventDefault()` were
        not enough, the boxes would render perfectly and do nothing — build 632's
        "a control that renders but is never wired" (BUG_CLASSES 16) with a
        different cause. So: assert the cell IS editable, then click it anyway.

     3. Group semantics: a grouped box CLEARS ITS SIBLINGS and leaves every other
        group alone; an ungrouped box ("circle all that apply") toggles on its
        own and does not disturb its neighbours.

     4. THE STATE SURVIVES THE SAVE. A tick that does not round-trip through
        `serializeFrame()` is a tick that vanishes the next time the contract is
        opened. Serialize, re-open, re-wire, and read it back.

     5. Re-wiring does not double-bind. `wireCheckboxes` guards on `data-cbx`,
        and `serializeFrame` deliberately strips that attribute so a reloaded
        document can be wired again. If the guard failed, one click would fire
        two handlers and toggle straight back off.

     6. It PRINTS: the box glyph has real width (not a zero-width tofu), a ticked
        box prints ticked, and the on-screen "tap a box" hint does not print.

   Everything below uses the app's OWN shipped functions — lockTemplate,
   wireCheckboxes, serializeFrame — pulled out of the running page. Nothing here
   re-implements them.

   Usage: node gate_748.mjs [path/to/index.html]      (v747 is the negative control) */
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
await page.addInitScript(() => { window.__SEED__ = { team_profiles: [], projects: [], inspection_reports: [], estimates: [], contracts: [] }; });
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);

const DEALS = ['ROOF_AGREEMENT', 'SIDING_AGREEMENT', 'GUTTER_AGREEMENT'];

/* Every OTHER priced document, with the box count it had on build 747.
   ⚠️ THESE NUMBERS WERE MEASURED ON THE BUILT DOCUMENT, NOT COUNTED IN THE
   SOURCE, and the difference failed this gate once. ANDERSEN_TEMPLATE has FIVE
   `class="cbx"` literals in index.html — four series lines plus one inside the
   `cbxColor()` helper — but that helper runs per colour, so the built document
   carries 23. Counting the source and asserting against the runtime is
   BUG_CLASSES 15: an assertion that matches its author's prose rather than the
   app. Re-measure on the control build before changing any of these. */
const SALES = { ESTIMATE_TEMPLATE: 0, SIDING_TEMPLATE: 0, GUTTER_TEMPLATE: 2, ANDERSEN_TEMPLATE: 23,
                INVOICE_TEMPLATE: 0, WINDOW_TEMPLATE: 0, GENERAL_TEMPLATE: 0, CONTRACT_TEMPLATE: 0 };

const TPL = await page.evaluate(names => {
  const out = {};
  for (const n of names) { try { const v = window[n] || eval(n); if (typeof v === 'string') out[n] = v; } catch (e) {} }
  return out;
}, DEALS.concat(Object.keys(SALES)));
chk('the documents were readable from the app', DEALS.every(d => TPL[d]), Object.keys(TPL).join(','));
chk('the app still exposes its own checkbox wiring',
    await page.evaluate(() => typeof wireCheckboxes === 'function' && typeof lockTemplate === 'function'));

/* ── 1. the prompts are gone, and ONLY from the Agreements ─────────────────── */
for (const d of DEALS) {
  const n = (TPL[d].match(/\[circle/gi) || []).length;
  chk(`${d} has NO "[circle …]" prompt left`, n === 0, n + ' left');
  const boxes = (TPL[d].match(/class="cbx"/g) || []).length;
  chk(`${d} carries tick boxes`, boxes >= 20, boxes + ' boxes');
}
chk('no "[circle" survives anywhere in the app', !/\[circle/i.test(APP_HTML),
    (APP_HTML.match(/\[circle/gi) || []).length + ' left');
/* the sales documents must be untouched — a box appearing here is a regression */
for (const [s, want] of Object.entries(SALES)) {
  if (!TPL[s]) { chk(`${s} was readable`, false, 'missing'); continue; }
  const n = (TPL[s].match(/class="cbx"/g) || []).length;
  chk(`${s} box count unchanged (${want})`, n === want, n);
}

/* ── 2-5. drive the REAL editor frame with the app's own functions ─────────── */
async function drive(name) {
  /* any throw becomes a red check, never a dead harness */
  try { return await driveRaw(name); }
  catch (e) { return { crashed: String(e).split('\n')[0] }; }
}
async function driveRaw(name) {
  return await page.evaluate(async docName => {
    const html = window[docName] || eval(docName);
    const fr = document.getElementById('reportFrame');
    const ed = document.getElementById('editorView');
    ed.classList.add('open'); ed.setAttribute('aria-hidden', 'false');
    await new Promise(res => {
      fr.onload = () => res();
      fr.srcdoc = html;
    });
    const doc = fr.contentDocument;
    /* exactly what openEditor does, in the same order */
    lockTemplate(doc);
    wireCheckboxes(doc);
    wireCheckboxes(doc);                     /* twice on purpose — see check 5 */

    const all = [...doc.querySelectorAll('.cbx')];
    const boxOf = el => el.textContent.trim();
    const TICK = '\u2611', EMPTY = '\u2610';
    const r = { total: all.length, allEmptyAtStart: all.length > 0 && all.every(e => boxOf(e) === EMPTY) };

    /* --- the contenteditable trap --- */
    const grouped = all.filter(e => e.getAttribute('data-group'));
    /* ⚠️ THE NEGATIVE CONTROL MUST GO RED, NOT CRASH. On build 747 the
       Agreements carry no boxes at all, so `grouped[0]` is undefined and every
       line below would throw — and a harness that dies on the previous build
       has not been seen to fail, it has been seen to break. Bail out with a
       structured result and let the checks read it as failures. */
    if (grouped.length < 2) { r.noBoxes = true; return r; }
    const g0 = grouped[0];
    const host = g0.closest('[contenteditable="true"]');
    r.insideEditable = !!host;
    r.hostTag = host ? host.tagName + (host.className ? '.' + host.className : '') : '(none)';

    /* --- group semantics --- */
    const gname = g0.getAttribute('data-group');
    const sibs = [...doc.querySelectorAll('.cbx[data-group="' + gname + '"]')];
    r.groupSize = sibs.length;
    const otherName = grouped.map(e => e.getAttribute('data-group')).find(n => n !== gname);
    const others = [...doc.querySelectorAll('.cbx[data-group="' + otherName + '"]')];
    others[0].click();                                   /* arm a second group */
    r.otherArmed = boxOf(others[0]) === TICK;

    sibs[0].click();
    r.firstTicked = boxOf(sibs[0]) === TICK;
    r.doubleBindSafe = boxOf(sibs[0]) === TICK;          /* wired twice -> still one toggle */
    sibs[1].click();
    r.secondTicked = boxOf(sibs[1]) === TICK;
    r.firstCleared = boxOf(sibs[0]) === EMPTY;
    r.exactlyOneInGroup = sibs.filter(e => boxOf(e) === TICK).length === 1;
    r.otherGroupUntouched = boxOf(others[0]) === TICK;

    /* --- ungrouped = "circle all that apply" --- */
    const free = all.filter(e => !e.getAttribute('data-group') && !e.getAttribute('data-val'));
    r.freeCount = free.length;
    if (free.length >= 2) {
      free[0].click();
      r.freeOn = boxOf(free[0]) === TICK;
      r.freeNeighbourUntouched = boxOf(free[1]) === EMPTY;
      free[1].click();
      r.freeBothOn = boxOf(free[0]) === TICK && boxOf(free[1]) === TICK;
      free[0].click();
      r.freeOffAgain = boxOf(free[0]) === EMPTY && boxOf(free[1]) === TICK;
    }

    /* --- 4. does the tick survive the SAVE? --- */
    const saved = serializeFrame();
    r.savedTicks = (saved.match(/☑/g) || []).length;
    r.savedStripsWiring = !/data-cbx/.test(saved);
    r.savedKeepsClass = (saved.match(/class="cbx"/g) || []).length === all.length;
    r.savedDropsEditable = !/contenteditable/.test(saved);

    /* --- reopen the SAVED html and prove it still works --- */
    await new Promise(res => { fr.onload = () => res(); fr.srcdoc = saved; });
    const d2 = fr.contentDocument;
    lockTemplate(d2); wireCheckboxes(d2);
    const re = [...d2.querySelectorAll('.cbx')];
    r.reopenedTicks = re.filter(e => e.textContent.trim() === TICK).length;
    const rg = [...d2.querySelectorAll('.cbx[data-group="' + gname + '"]')];
    rg[0].click();
    r.reopenedStillToggles = rg[0].textContent.trim() === TICK && rg[1].textContent.trim() === EMPTY;

    ed.classList.remove('open');
    document.body.style.overflow = '';
    return r;
  }, name);
}

for (const d of DEALS) {
  const r = await drive(d);
  const T = `${d}:`;
  chk(`${T} the document HAS boxes to drive`, !r.crashed && !r.noBoxes && r.total > 0,
      r.crashed || (r.noBoxes ? 'no boxes' : r.total + ' boxes'));
  chk(`${T} every box starts empty`, r.allEmptyAtStart, r.total + ' boxes');
  chk(`${T} the box sits INSIDE a contenteditable cell (the trap is real)`, r.insideEditable, r.hostTag);
  chk(`${T} clicking a grouped box ticks it — despite the caret`, r.firstTicked);
  chk(`${T} wiring twice does not double-bind`, r.doubleBindSafe);
  chk(`${T} ticking a sibling clears the first`, r.secondTicked && r.firstCleared);
  chk(`${T} exactly one box ticked in that group`, r.exactlyOneInGroup);
  chk(`${T} a DIFFERENT group is left alone`, r.otherGroupUntouched);
  chk(`${T} "all that apply" boxes toggle independently`,
      r.total > 0 && (r.freeCount === 0 || (r.freeOn && r.freeNeighbourUntouched && r.freeBothOn && r.freeOffAgain)),
      r.freeCount + ' ungrouped');
  chk(`${T} the ticks SURVIVE the save`, r.savedTicks >= 2, r.savedTicks + ' ticks in saved html');
  chk(`${T} the save strips data-cbx so it can be re-wired`, r.savedStripsWiring);
  chk(`${T} the save keeps every box`, r.savedKeepsClass);
  chk(`${T} the save drops contenteditable`, r.savedDropsEditable);
  chk(`${T} re-opening the saved contract shows the same ticks`,
      r.reopenedTicks === r.savedTicks, r.reopenedTicks + ' vs ' + r.savedTicks);
  chk(`${T} and the boxes still work after re-opening`, r.reopenedStillToggles);
}

/* ── 2b. a REAL MOUSE CLICK, hit-tested through the visible editor ─────────── */
const mouse = await (async () => {
  await page.evaluate(async () => {
    const fr = document.getElementById('reportFrame'), ed = document.getElementById('editorView');
    ed.classList.add('open'); ed.setAttribute('aria-hidden', 'false');
    await new Promise(res => { fr.onload = () => res(); fr.srcdoc = window.ROOF_AGREEMENT || eval('ROOF_AGREEMENT'); });
    lockTemplate(fr.contentDocument); wireCheckboxes(fr.contentDocument);
  });
  await page.waitForTimeout(400);
  const f = page.frameLocator('#reportFrame');
  const box = f.locator('.cbx[data-group]').first();
  if (await f.locator('.cbx[data-group]').count() === 0) return 'no boxes to click';
  await box.scrollIntoViewIfNeeded();
  await box.click({ timeout: 4000 });                    /* real hit-tested mouse click */
  return await page.evaluate(() =>
    document.getElementById('reportFrame').contentDocument
      .querySelector('.cbx[data-group]').textContent.trim() === '☑');
})().catch(e => 'ERR: ' + e.message.split('\n')[0]);
chk('A REAL MOUSE CLICK ticks the box (nothing overlays it)', mouse === true, String(mouse));

/* ── 6. it prints ─────────────────────────────────────────────────────────── */
const printed = await (async () => {
  const p2 = await ctx.newPage();
  await p2.setContent(TPL.ROOF_AGREEMENT, { waitUntil: 'domcontentloaded' });
  const has = await p2.evaluate(() => {
    const b = document.querySelectorAll('.cbx');
    if (!b.length) return false;
    b[0].textContent = '\u2611';                      /* one ticked box */
    return true;
  });
  if (!has) { await p2.close(); return { none: true, tickedGlyph: '(no boxes)', tickedW: 0, emptyW: 0, tickedH: 0, visible: false, hintPrints: 'absent', pdfBytes: 0 }; }
  await p2.emulateMedia({ media: 'print' });
  const r = await p2.evaluate(() => {
    const b = document.querySelectorAll('.cbx');
    const z = { width: 0, height: 0 };
    const r0 = b[0] ? b[0].getBoundingClientRect() : z, r1 = b[1] ? b[1].getBoundingClientRect() : z;
    const hint = document.querySelector('.items-hint.no-print');
    if (!b.length) return { none: true };
    return {
      tickedGlyph: b[0] ? b[0].textContent.trim() : '(none)',
      tickedW: Math.round(r0.width), tickedH: Math.round(r0.height),
      emptyW: Math.round(r1.width),
      visible: !!b[0] && getComputedStyle(b[0]).display !== 'none',
      hintPrints: hint ? getComputedStyle(hint).display !== 'none' : 'absent',
      count: b.length
    };
  });
  const pdf = await p2.pdf({ format: 'Letter' });
  await p2.close();
  return { ...r, pdfBytes: pdf.length };
})();
chk('a ticked box prints as ticked', printed.tickedGlyph === '☑', printed.tickedGlyph);
chk('the box glyph has real width (not a zero-width tofu)',
    printed.tickedW > 4 && printed.emptyW > 4 && printed.tickedH > 6,
    `ticked ${printed.tickedW}x${printed.tickedH}px, empty ${printed.emptyW}px`);
chk('boxes are visible under print media', printed.visible);
chk('the on-screen "tap a box" hint does NOT print', printed.hintPrints === false, String(printed.hintPrints));
chk('the agreement still produces a PDF', printed.pdfBytes > 20000, printed.pdfBytes + ' bytes');

/* ── 7. source-level guards ───────────────────────────────────────────────── */
const src = APP_HTML;
chk('no javascript was added — wireCheckboxes is still defined once',
    (src.match(/function wireCheckboxes\(doc\)\{/g) || []).length === 1);
/* Build 965 ("a field you can add yourself") added a second, deliberate call —
   insertField() re-wires after inserting a field; both passes are idempotent by
   their own guards (data-cbx). The double-wire safety is proved above by the
   "wiring twice does not double-bind" check. */
chk('and still called exactly twice — openEditor + the 965 insertField re-wire',
    (src.match(/wireCheckboxes\(doc\);/g) || []).length === 2);
chk('no css was added — the .cbx rule is untouched',
    (src.match(/\.cbx\{cursor:pointer;font-size:13pt;user-select:none;\}/g) || []).length === 1);
/* Build 779 (spec sheet matches the printed master) retired the DECKING
   collapse() span on purpose: collapse()'s regex stops at the first </span> and
   cannot survive nested checkbox markup, so decking became data-val tick boxes
   (data-group="rdk") pre-ticked from the inspection. Layers and pitch keep
   collapse(). 5 spans -> 4. */
chk('the .opts collapse spans are untouched (4 since 779 — decking became data-val boxes)',
    (src.match(/data-opts=/g) || []).length === 4);
for (const k of ['layers', 'pitch'])
  chk(`collapse() still matches data-opts="${k}"`,
      new RegExp('<span class="opts" data-opts="' + k + '">[^<]*(?:<(?!/span>)[^<]*)*</span>').test(src));
chk('779: decking is data-val tick boxes in the roofing agreement (data-group="rdk")',
    /data-group="rdk" data-val="OSB"/.test(src));
chk('only the roofing Agreement uses data-val (779 decking); siding/gutter stay clean',
    /data-val/.test(TPL.ROOF_AGREEMENT || '') &&
    ['SIDING_AGREEMENT', 'GUTTER_AGREEMENT'].every(d => !/data-val/.test(TPL[d] || '')));
chk('the dead WHITE SQUARE is now a real box',
    !/&#9633; No gutter protection/.test(src) && /class="cbx" data-group="ggp">&#9744;<\/span> No gutter protection/.test(src));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
