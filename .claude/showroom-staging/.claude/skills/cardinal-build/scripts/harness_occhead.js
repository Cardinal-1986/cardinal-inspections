/* The check nobody had, and the reason three renders kept saying "fine".
   Every earlier look at this screen was at ONE viewport (1194px) where the
   longest product name happens to fit. It only breaks when the header gets
   tight — which is the condition Theo's iPad was in and the harness never was.

   Asserts, on the Duration FLEX line page in ALL THREE presentation styles:
     · at EVERY width — no break can land INSIDE a word (the orphaned ®), and
       word-break:keep-all is in force;
     · at >=820px — the title renders on ONE line.
   It does NOT demand one line on a phone: at 390px this name wraps at a SPACE
   into two lines, which is ordinary and is on the surface with a pixel baseline
   that 618/623 protect. An earlier draft asserted that and was simply wrong.

   This catches a real regression: at 820px, build 625 rendered the title at
   26px in a 373px box — 2 lines, 62px tall. Build 626 renders it on one.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_occhead.js [index.html]

   FIXED 675 — this line used to hardcode an absolute path into the scratchpad
   of the session that wrote it, so the harness could never run again in any
   other session (MODULE_NOT_FOUND). Resolve through NODE_PATH like the other
   nine Chromium scripts. A harness that cannot run proves nothing.        */
/* ⚠ WAS `require('playwright-core')`, WHICH IS NOT INSTALLED — this harness
   died on MODULE_NOT_FOUND before running a single assertion, and a crash reads
   as "not green" rather than as "proved nothing" (BUG_CLASSES 37). Same
   resolution ladder sentinel.js already uses; the package here is `playwright`. */
let chromium;
for (const _p of ['playwright', 'playwright-core',
                  '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(_p).chromium; break; } catch (_) {}
}
if (!chromium) { console.error('harness_occhead.js: playwright not found - cannot run'); process.exit(2); }
const CR_ROOT = require('./script_paths.cjs').ROOT + '/';  /* not a path to one machine */
const fs = require('fs');

const FILE = process.argv[2] || CR_ROOT + 'index.html';
const html = fs.readFileSync(FILE, 'utf8');
/* ⚠ MODULE TEXT COMES FROM module_source.cjs, NOT FROM A BLOCK SLICE.
   This gate used to cut its module out of index.html by `<style id="cr-occ-styles">`.
   That stops working the instant the module becomes an external file, which is
   what the Showroom relocation does — and it stops working SILENTLY, handing
   the gate an empty string so every assertion fails for a reason the output
   never names. The resolver finds the module inline today and in the file it is
   relocated to tomorrow, and returns byte-identical text either way. */
/* missing:'throw' replaces the old silent garbage — see audit_contrast.js. */
const MS = require('./module_source.cjs');
const CSS = MS.moduleText(html, 'colors.css', { htmlPath: FILE, missing: 'throw' });
const JS  = MS.moduleText(html, 'colors.js',  { htmlPath: FILE, missing: 'throw' });

const WIDTHS = [
  [390, 844, 'iPhone'],
  [820, 1180, 'the media-query boundary'],
  [1024, 768, 'iPad portrait-ish'],
  [1194, 834, 'iPad 11 landscape'],
  [1366, 1024, 'iPad Pro 12.9'],
];
const STYLES = ['roofs', 'compare', 'feature'];

let pass = 0, fail = 0;
const ok = (l, c, note) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (note !== undefined ? '  → ' + note : '')); } };

(async () => {
  /* ⚠ BROWSER PATH COMES FROM chromium_launch.cjs, NOT FROM A LITERAL.
   This gate hard-coded a path inside the sandbox it was written in, so it died
   at launch — before its first assertion — on any other machine, CI included.
   Same class as the absolute .sql paths that made harness_tray unrunnable. */
const browser = await require('./chromium_launch.cjs').launchChromium(chromium);
  console.log(`\nheader fit — ${FILE.split('/').pop()}\n`);
  console.log('  width  style     font     title box   <b> h   lines  widest word');
  console.log('  ' + '-'.repeat(62));

  for (const [w, h, label] of WIDTHS) {
    for (const style of STYLES) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.setContent(`<!doctype html><html><head><meta charset=utf-8><style>
        html,body{margin:0;background:#050607}${CSS} #cr-occ{display:block!important}
      </style></head><body></body></html>`);
      await page.evaluate(() => {
        const PX = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        window.currentUser = { email: 'theo@cardinalrenovations.net' };
        window.is_admin = () => true; window.hideAllViews = () => {}; window.showHome = () => {};
        const q = { select(){return this;}, order(){return this;}, eq(){return this;},
          then(r){ return Promise.resolve({ data: [], error: null }).then(r); } };
        window.supa = { from(t){ const o = Object.create(q); o._t = t; return o; },
          storage:{ from(){ return { createSignedUrls: async p => ({ data: p.map(x => ({ signedUrl: PX })), error: null }) }; } } };
      });
      await page.addScriptTag({ content: JS });
      await page.evaluate(() => window.CardinalColors.open());
      await page.waitForTimeout(320);
      await page.evaluate(s => { const b = document.querySelector(`.occ-sty[data-sty="${s}"]`); if (b) b.click(); }, style);
      await page.waitForTimeout(180);
      await page.evaluate(() => { const l = document.querySelector('.occ-line[data-line="flex"]'); if (l) l.click(); });
      await page.waitForTimeout(380);

      const m = await page.evaluate(() => {
        const t = document.querySelector('.occ-title'), b = t && t.querySelector('b');
        if (!t || !b) return null;
        const cs = getComputedStyle(b);
        const fs = parseFloat(cs.fontSize);
        // a single line is at most ~1.35x the font size for this face
        const br = b.getBoundingClientRect(), tr = t.getBoundingClientRect();
        // measure the unwrapped width by cloning into a nowrap span
        const probe = b.cloneNode(true);
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;width:auto';
        b.parentNode.appendChild(probe);
        const natural = probe.getBoundingClientRect().width;
        // the widest single WORD — if this fits, no break INSIDE a word is ever
        // needed, which is the actual defect Theo photographed (an orphaned ®)
        let widestWord = 0;
        for (const word of b.textContent.split(/\s+/).filter(Boolean)) {
          probe.textContent = word;
          widestWord = Math.max(widestWord, probe.getBoundingClientRect().width);
        }
        probe.remove();
        return { fs, h: Math.round(br.height), box: Math.round(tr.width),
                 natural: Math.round(natural), widestWord: Math.round(widestWord),
                 wb: cs.wordBreak, text: b.textContent };
      });
      await page.close();
      if (!m) { ok(`${w}px ${style}: title present`, false, 'no title element'); continue; }

      const lines = Math.max(1, Math.round(m.h / (m.fs * 1.25)));
      const wordFits = m.widestWord <= m.box + 1;
      console.log(`  ${String(w).padStart(5)}  ${style.padEnd(9)} ${String(m.fs.toFixed(1)).padStart(5)}px  ` +
                  `${String(m.box).padStart(6)}px  ${String(m.h).padStart(4)}px  ${String(lines).padStart(4)}   ` +
                  `${String(m.widestWord).padStart(5)}px`);

      /* THE defect: an orphaned ®. It can only happen if a break lands INSIDE a
         word, so the invariant is that the widest word fits — at EVERY width,
         phone included. Asserting "always one line" instead was wrong: on a
         390px phone this name wraps at a SPACE into two lines, which is
         ordinary, long-standing, and on the one surface with a pixel baseline
         that 618/623 deliberately protect. Do not tighten this back. */
      ok(`${String(w).padStart(4)}px · ${style.padEnd(8)} · no break possible inside a word`,
        wordFits, `widest word ${m.widestWord}px, box ${m.box}px`);
      ok(`${String(w).padStart(4)}px · ${style.padEnd(8)} · word-break:keep-all in force`,
        m.wb === 'keep-all', m.wb);

      /* One line only where the header genuinely has room — the >=820px range,
         which is where Theo's iPad sits and where the report came from. */
      if (w >= 820) ok(`${String(w).padStart(4)}px · ${style.padEnd(8)} · title on ONE line`,
        lines === 1, `${lines} lines, <b> ${m.h}px tall at ${m.fs}px`);
    }
  }
  await browser.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(1); });
