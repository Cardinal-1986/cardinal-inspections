/* gate_749.mjs — the numbered house diagram on the roofing Construction Agreement.

   A diagram is judged by eye, so most of this gate exists to prove the things an eye
   cannot check on one render:

     1. The image actually DECODES and PAINTS. A data URI that is truncated, or an
        <img> whose src got mangled by the template literal, still produces an <img>
        element in the DOM and still passes every structural assertion. So this gate
        reads naturalWidth/naturalHeight from the browser — the only values that are
        non-zero solely when the bytes really decoded.

     2. It PRINTS, at a sane size, and does not split across a page. Print is invisible
        to every other gate in this repo.

     3. It is NOT a photo-upload slot. wireCoverPhoto() claims .cover-photo and
        wirePhotoFrames() claims .fig .frame, injecting a file input and turning the
        box into a drop target. Run the real editor wiring, then assert no input
        appeared inside the figure and no upload button was added.

     4. It is NOT editable. The figure sits outside EDITABLE_SELECTOR, so lockTemplate()
        must leave it alone — otherwise a rep could delete the diagram by typing.

     5. 748 did not regress: 76 tick boxes, zero "[circle" prompts, and the siding and
        gutter agreements gained nothing.

   Usage: node gate_749.mjs [path/to/index.html]     (v748 is the negative control) */
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
  /* NOTE: images are NOT aborted here. The diagram is a data: URI and must be allowed
     to decode — aborting image loads would make check 1 vacuously fail. */
  if (t === 'font' || t === 'media') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  if (u.startsWith('data:')) return r.continue();
  return r.abort();
});
await page.addInitScript(() => { window.__SEED__ = { team_profiles: [], projects: [], inspection_reports: [], estimates: [], contracts: [] }; });
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);

const TPL = await page.evaluate(() => {
  const out = {};
  for (const n of ['ROOF_AGREEMENT', 'SIDING_AGREEMENT', 'GUTTER_AGREEMENT', 'ESTIMATE_TEMPLATE']) {
    try { const v = window[n] || eval(n); if (typeof v === 'string') out[n] = v; } catch (e) {}
  }
  return out;
});
chk('the agreements were readable from the app', !!TPL.ROOF_AGREEMENT);

/* ── 0. source-level shape ────────────────────────────────────────────────── */
chk('the roofing agreement carries exactly one diagram',
    (TPL.ROOF_AGREEMENT.match(/class="roofdiag"/g) || []).length === 1,
    (TPL.ROOF_AGREEMENT.match(/class="roofdiag"/g) || []).length);
/* ⚠️ TEST FOR THE FIGURE, NOT THE CLASS NAME. Every priced document is built from the
   SAME skeleton (ESTIMATE_BASE_RAW), so the .roofdiag CSS rule is present in all of
   them by design -- exactly as .cbx has always been. An unused rule costs nothing.
   The first version of this gate matched /roofdiag/ and went 2 red against a correct
   build, reporting a diagram in the siding and gutter agreements that does not exist. */
for (const n of ['SIDING_AGREEMENT', 'GUTTER_AGREEMENT', 'ESTIMATE_TEMPLATE']) {
  chk(`${n} has NO diagram FIGURE`, !/<figure class="roofdiag">/.test(TPL[n] || ''));
  chk(`${n} carries no embedded image`, !/data:image\/jpeg;base64,/.test(TPL[n] || ''));
}
chk('but they DO share the stylesheet rule (one skeleton, by design)',
    /\.roofdiag\{/.test(TPL.SIDING_AGREEMENT || ''));
chk('the diagram precedes the numbered spec rows',
    TPL.ROOF_AGREEMENT.indexOf('roofdiag') < TPL.ROOF_AGREEMENT.indexOf('1. Decking'));
chk('the image carries a real alt description',
    /alt="Cutaway of a roof with numbered callouts[^"]{60,}"/.test(TPL.ROOF_AGREEMENT));

/* ── 748 must not have regressed ─────────────────────────────────────────── */
/* ROOF was 23 at 749; build 779 deliberately added boxes for every lettered
   option on the spec sheet (decking A–F, ridge vent, extra structure): now 32. */
for (const [n, want] of [['ROOF_AGREEMENT', 32], ['SIDING_AGREEMENT', 21], ['GUTTER_AGREEMENT', 32]]) {
  const got = (TPL[n].match(/class="cbx"/g) || []).length;
  chk(`748 intact: ${n} still has ${want} tick boxes`, got === want, got);
}
chk('748 intact: no "[circle" prompt anywhere', !/\[circle/i.test(APP_HTML));

/* ── 1-4. render it, with the REAL editor wiring ──────────────────────────── */
const live = await (async () => { try { return await page.evaluate(async () => {
  const fr = document.getElementById('reportFrame');
  const ed = document.getElementById('editorView');
  ed.classList.add('open'); ed.setAttribute('aria-hidden', 'false');
  await new Promise(res => { fr.onload = () => res(); fr.srcdoc = window.ROOF_AGREEMENT || eval('ROOF_AGREEMENT'); });
  const doc = fr.contentDocument;
  lockTemplate(doc);
  wirePhotoFrames(doc);
  wireCoverPhoto(doc);
  wireCheckboxes(doc);

  const fig = doc.querySelector('figure.roofdiag');
  const img = fig && fig.querySelector('img');
  if (!img) return { missing: true };
  /* wait for the data: URI to actually decode */
  if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 4000); });

  const cs = getComputedStyle(fig);
  const rect = img.getBoundingClientRect();
  /* Build 779 replaced the one-column table.meta spec sheet with the .specgrid
     (two red-ruled columns matching the printed master) and moved the diagram
     INSIDE the grid, beside the numbered items it points at. The spec surface
     is now the grid holding "1. Decking"; the figure must live within it. */
  const specTable = [...doc.querySelectorAll('.specgrid')]
    .find(t => /1\.\s*Decking/.test(t.textContent)) || null;
  const saved = serializeFrame();
  return {
    /* THE ONLY VALUES THAT PROVE THE BYTES DECODED */
    naturalW: img.naturalWidth, naturalH: img.naturalHeight,
    complete: img.complete,
    srcIsData: /^data:image\/jpeg;base64,/.test(img.getAttribute('src') || ''),
    srcLen: (img.getAttribute('src') || '').length,
    renderedW: Math.round(rect.width), renderedH: Math.round(rect.height),
    breakInside: cs.breakInside,
    /* 3. not a photo slot */
    inputsInFigure: fig.querySelectorAll('input').length,
    buttonsInFigure: fig.querySelectorAll('button').length,
    figWired: fig.getAttribute('data-wired'),
    /* 4. not editable */
    figEditable: fig.getAttribute('contenteditable'),
    imgEditable: img.getAttribute('contenteditable'),
    insideEditableHost: !!fig.closest('[contenteditable="true"]'),
    /* order in the live DOM */
    foundSpecTable: !!specTable,
    beforeSpecTable: !!(specTable && specTable.contains(fig)),
    /* it must survive the save */
    savedHasFigure: /class="roofdiag"/.test(saved),
    savedHasImage: /data:image\/jpeg;base64,/.test(saved),
    savedBytes: saved.length,
  };
}); } catch (e) { return { crashed: String(e).split('\n')[0] }; } })();
chk('the figure exists in the rendered document', !live.missing && !live.crashed,
    live.crashed || (live.missing ? 'no figure.roofdiag' : 'found'));
chk('THE IMAGE ACTUALLY DECODED (non-zero natural size)',
    live.naturalW === 760 && live.naturalH > 400, `${live.naturalW}x${live.naturalH}`);
chk('its src is an intact jpeg data URI', live.srcIsData && live.srcLen > 120000, live.srcLen + ' chars');
chk('it paints at a readable size on screen',
    live.renderedW > 250 && live.renderedH > 150, `${live.renderedW}x${live.renderedH} css px`);
chk('it is told not to split across a page', live.breakInside === 'avoid', live.breakInside);
chk('the 779 spec grid was located (holds "1. Decking")', live.foundSpecTable);
chk('the diagram sits INSIDE the spec grid, beside the items it points at (779)', live.beforeSpecTable);
chk('it is NOT a photo-upload slot (no input injected)', live.inputsInFigure === 0, live.inputsInFigure);
chk('no upload button was added to it', live.buttonsInFigure === 0, live.buttonsInFigure);
chk('the photo wiring did not claim it', live.figWired === null, String(live.figWired));
chk('it is NOT editable', live.figEditable === null && live.imgEditable === null,
    `fig=${live.figEditable} img=${live.imgEditable}`);
chk('and it sits outside every editable host', live.insideEditableHost === false);
chk('it survives the save', live.savedHasFigure && live.savedHasImage);
chk('a saved agreement stays under 500 KB', live.savedBytes < 500000, Math.round(live.savedBytes / 1024) + ' KB');

/* ── 2. PRINT IT ──────────────────────────────────────────────────────────── */
const printed = await (async () => {
  const p2 = await ctx.newPage();
  await p2.setContent(TPL.ROOF_AGREEMENT, { waitUntil: 'load' });
  await p2.emulateMedia({ media: 'print' });
  const r = await p2.evaluate(() => {
    /* BUG_CLASSES 37: the control build has no diagram, so this selector is null.
       Bail out with a structured result -- a harness that throws on the previous
       build has not been seen to FAIL, it has been seen to BREAK, and a crash often
       prints nothing at all through a `grep FAIL` and reads as "no failures". */
    const img = document.querySelector('.roofdiag img');
    if (!img) return { absent: true, display: 'none', w: 0, h: 0, natural: 0, capped: false, dpi: 0 };
    const b = img.getBoundingClientRect();
    return {
      display: getComputedStyle(img).display,
      w: Math.round(b.width), h: Math.round(b.height),
      natural: img.naturalWidth,
      /* Build 779: inside the .specgrid the image is deliberately sized by its
         grid column (.specgrid .roofdiag img{max-width:100%} overrides the old
         3.6in cap). The invariant that survives 779 is NO UPSCALING: the print
         width must never exceed the 760px natural width of the recovered PNG. */
      capped: b.width <= (img.naturalWidth || 760) + 1,
      dpi: img.naturalWidth ? Math.round(img.naturalWidth / (b.width / 96)) : 0,
    };
  });
  const pdf = await p2.pdf({ format: 'Letter', printBackground: true });
  await p2.close();
  return { ...r, pdfBytes: pdf.length };
})().catch(e => ({ crashed: String(e).split('\n')[0], display: 'none', w: 0, h: 0, capped: false, dpi: 0, pdfBytes: 0 }));
chk('a diagram was found to print at all', !printed.absent && !printed.crashed,
    printed.crashed || (printed.absent ? 'no .roofdiag img in the document' : 'found'));
chk('the diagram prints', printed.display !== 'none' && printed.w > 200, `${printed.w}x${printed.h}px`);
chk('it never upscales past the 760px natural width (779 grid sizing)', printed.capped,
    printed.w + 'px (natural ' + printed.natural + ')');
chk('and lands at a sensible print resolution', printed.dpi >= 100, printed.dpi + ' dpi');
chk('the agreement still produces a PDF', printed.pdfBytes > 100000, printed.pdfBytes + ' bytes');

/* ── source guards ────────────────────────────────────────────────────────── */
const src = APP_HTML;
chk('the data URI is embedded exactly once', (src.match(/data:image\/jpeg;base64,/g) || []).length === 1);
/* Build 779 added a scoped override (.specgrid .roofdiag{) so the diagram sizes
   to its grid column; the base rule is still defined once. */
chk('the .roofdiag css: one base rule + the 779 .specgrid override',
    (src.match(/\.roofdiag\{/g) || []).length === 2 &&
    (src.match(/\.specgrid \.roofdiag\{/g) || []).length === 1);
chk('no backtick reached the estimate skeleton', (() => {
  const d = /(?:var|const)\s+ESTIMATE_BASE_RAW\s*=\s*`/.exec(src);
  const blk = src.slice(d.index + d[0].length, src.indexOf('`;', d.index + d[0].length));
  return !blk.includes('`') && !blk.includes('${');
})());

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
