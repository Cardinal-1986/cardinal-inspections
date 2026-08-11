/* render_projsec698.js — build 698 gate.

   All 27 `.projsec` headings on the client page now lead with a drawn icon.
   They divide by MECHANISM, and the two halves need different proof:

     17 STATIC   — in the markup, swapped by hydrate() at load. These can be
                   read straight out of the DOM.
     10 RUNTIME  — built as strings when their screen renders, so they call
                   CardinalIcons.get() instead. Driving all ten screens is
                   more setup than it is worth, so they are proved three ways:
                   the call site exists in source, the glyph name resolves to
                   real path data, and loading the page throws no error — an
                   ICO() that were out of scope would be a ReferenceError at
                   the call site, not a silent blank, because the try/catch is
                   INSIDE ICO and cannot catch its own absence.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_projsec698.js [index.html]
   Point it at 697 as the negative control.                                   */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const NEW4 = ['contract', 'ruler', 'box', 'lock'];
// every name the headings ask for, static and runtime
const USED = ['bell', 'bolt', 'people', 'pin', 'flag', 'page', 'calculator', 'contract',
  'money', 'ladder', 'clipboard', 'ruler', 'box', 'chart', 'cash', 'person',
  'cards', 'menu', 'tag', 'folder', 'flask', 'shield', 'lock', 'hardhat'];
// the ten runtime headings, by the label that follows the icon call
const RUNTIME_LABELS = ['Unassigned documents', 'Location', 'Job Menu', 'Job Details',
  'Assigned To', 'Insurance Documents', 'iTel Reports', 'Insurance Information',
  'Sign-in sessions', 'Punch Outs'];

const SRC = fs.readFileSync(FILE, 'utf8');

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await br.newPage({ viewport: { width: 430, height: 900 } });
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  const errors = [];
  p.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);

  const R = await p.evaluate(({ used, new4 }) => {
    const out = { heads: [], missingGlyph: [], emptyGlyph: [], total: 0, icoType: typeof ICO };
    out.total = window.CardinalIcons ? window.CardinalIcons.names().length : 0;
    const names = window.CardinalIcons ? window.CardinalIcons.names() : [];
    out.missingGlyph = used.filter(n => names.indexOf(n) === -1);
    out.emptyGlyph = used.filter(n => {
      const g = window.CardinalIcons.get(n);
      return !g || (g.indexOf('<path') === -1 && g.indexOf('<rect') === -1 && g.indexOf('<circle') === -1);
    });
    document.querySelectorAll('h3.projsec').forEach(h => {
      const txt = (h.textContent || '').trim();
      let emoji = false;
      for (const ch of txt) {
        const o = ch.codePointAt(0);
        if ((o >= 0x1F000 && o <= 0x1FAFF) || (o >= 0x2600 && o <= 0x26FF)) emoji = true;
      }
      out.heads.push({
        label: txt.slice(0, 34),
        icon: !!h.querySelector('svg.cri'),
        stale: h.hasAttribute('data-cri'),   // hydrate() must have consumed it
        emoji: emoji
      });
    });
    return out;
  }, { used: USED, new4: NEW4 });

  console.log(`\nglyphs: ${R.total} · static .projsec in the DOM: ${R.heads.length}`);

  /* A FLOOR, not an equality — written as `=== 51` first, which is the same
     mistake that had already broken icons692 and tools695 in this session.
     The names this build needs are checked by name just below. */
  ok(R.total >= 51, `CardinalIcons carries at least the 51 present at 698 (got ${R.total})`);
  ok(R.missingGlyph.length === 0, `every name the headings ask for exists (missing: ${R.missingGlyph.join(',') || 'none'})`);
  ok(R.emptyGlyph.length === 0, `every one returns real path data (empty: ${R.emptyGlyph.join(',') || 'none'})`);

  ok(R.heads.length >= 15, `the static headings are in the DOM to check (${R.heads.length})`);
  const noIcon = R.heads.filter(h => !h.icon).map(h => h.label);
  ok(noIcon.length === 0, `every static heading has a drawn icon (bare: ${noIcon.join(' | ') || 'none'})`);
  const stale = R.heads.filter(h => h.stale).map(h => h.label);
  ok(stale.length === 0, `hydrate() consumed every attribute (left over: ${stale.join(' | ') || 'none'})`);
  const withEmoji = R.heads.filter(h => h.emoji).map(h => h.label);
  ok(withEmoji.length === 0, `no emoji survives in a static heading (${withEmoji.join(' | ') || 'none'})`);

  // ---- the runtime ten, checked in source ----
  let sited = 0;
  const missing = [];
  for (const label of RUNTIME_LABELS) {
    const re = new RegExp("<h3 class=\"projsec\"[^>]*>' \\+ ICO\\('[a-z]+'\\) \\+ '" +
                          label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (re.test(SRC)) sited++; else missing.push(label);
  }
  ok(sited === 10, `all ten runtime headings call ICO() at their site (missing: ${missing.join(' | ') || 'none'})`);

  /* What matters is that ICO is REACHABLE from the call sites, not how many
     copies exist. This asserted `>= 6` and so encoded a defect as a
     requirement: at 698 there were six declarations, five global by accident
     and one dead inside cr-hd2-script's IIFE. 699 consolidated them to one and
     this gate went red on a strictly better file. Ask the page, not the text. */
  ok(R.icoType === 'function',
    `ICO is reachable from the call sites (typeof ICO === '${R.icoType}')`);

  ok(errors.length === 0,
    `the page loads without throwing — an out-of-scope ICO would be a ReferenceError, not a blank (${errors.slice(0, 2).join(' | ') || 'none'})`);

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
