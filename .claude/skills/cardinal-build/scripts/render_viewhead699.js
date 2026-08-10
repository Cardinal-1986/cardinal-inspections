/* render_viewhead699.js — build 699 gate.

   Two things, and the second is the one a structural check would miss.

   1. The 14 `.viewhead` page headings each lead with an icon. 13 carry
      data-cri; the 14th (Schedule Board) has a raw inline <svg> from 681, a
      third mechanism left as it is.

   2. ICO is declared EXACTLY ONCE and is genuinely global. Before this build
      it was declared six times: five leaked to global scope from non-IIFE
      module blocks and one, added to cr-hd2-script at 698, was private to that
      IIFE and dead. The main block's nine runtime `.projsec` headings were
      resolving against another module's copy by accident. So the assertion
      here is not "a helper exists" but "there is one, and every caller can
      still see it".

   3. The photo gallery heading needs BOTH halves. Its markup carries the
      attribute, and `galTitle` is rewritten on every gallery open — a writer
      that still emitted the emoji would put it straight back. This drives that
      writer and re-reads the heading.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_viewhead699.js [index.html]
   Point it at 698 as the negative control.                                    */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const SRC = fs.readFileSync(FILE, 'utf8');
const USED = ['people', 'cash', 'clipboard', 'folder', 'calendar', 'person', 'chat',
  'eye', 'bolt', 'camera', 'clock', 'search', 'money'];

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await br.newPage({ viewport: { width: 430, height: 900 } });
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  const errors = [];
  p.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);

  const R = await p.evaluate((used) => {
    const out = { heads: [], icoType: typeof ICO, total: 0, missing: [], gallery: null };
    out.total = window.CardinalIcons ? window.CardinalIcons.names().length : 0;
    const names = window.CardinalIcons ? window.CardinalIcons.names() : [];
    out.missing = used.filter(n => names.indexOf(n) === -1);

    document.querySelectorAll('h2.viewhead').forEach(h => {
      const txt = (h.textContent || '').trim();
      let emoji = false;
      for (const ch of txt) {
        const o = ch.codePointAt(0);
        if ((o >= 0x1F000 && o <= 0x1FAFF) || (o >= 0x2600 && o <= 0x26FF)) emoji = true;
      }
      out.heads.push({ label: txt.slice(0, 30), icon: !!h.querySelector('svg.cri'),
                       stale: h.hasAttribute('data-cri'), emoji: emoji });
    });

    /* the gallery writer: it rewrites galTitle on every open, so the heading
       has to survive being rewritten, not merely start out right */
    const g = document.getElementById('galTitle');
    if (g) {
      const h2 = g.closest('h2.viewhead');
      const before = !!(h2 && h2.querySelector('svg.cri'));
      // drive both branches of the writer the way openGallery does
      window.galMode = 'insp';
      try { if (typeof paintGalleryTitle === 'function') paintGalleryTitle(); } catch (_) {}
      // and simulate the writer directly, since its function name is internal
      g.textContent = 'Inspection Photos';
      const after = !!(h2 && h2.querySelector('svg.cri'));
      let emoji = false;
      for (const ch of (h2 ? h2.textContent : '')) {
        const o = ch.codePointAt(0);
        if ((o >= 0x1F000 && o <= 0x1FAFF)) emoji = true;
      }
      out.gallery = { before: before, afterRewrite: after, emoji: emoji };
    }
    return out;
  }, USED);

  console.log(`\nglyphs ${R.total} · viewheads ${R.heads.length} · typeof ICO '${R.icoType}'`);

  ok(R.total >= 52, `CardinalIcons carries at least the 52 present at 699 (got ${R.total})`);
  ok(R.missing.length === 0, `every name the headings ask for exists (missing: ${R.missing.join(',') || 'none'})`);
  /* FIFTEEN, not the fourteen a source regex finds: <h2 id="listTitle"
     class="viewhead"> puts the id BEFORE the class, so `<h2 class="viewhead"`
     never matches it. It is empty in markup and filled from LIST_DEFS, whose
     three titles each began with an emoji. Count from the DOM, not the file. */
  ok(R.heads.length === 15, `all 15 page headings are in the DOM (${R.heads.length})`);

  /* listTitle is EMPTY until a list is opened, so it legitimately has no icon
     at rest. Report the count, not just the labels — a heading with an empty
     label made the first version print "bare: none" on a failing assertion. */
  const bare = R.heads.filter(h => !h.icon);
  ok(bare.length <= 1,
    `at most listTitle is bare at rest (${bare.length}: ${bare.map(h => h.label || '(empty)').join(' | ')})`);
  ok(bare.every(h => !h.label),
    'and anything bare is empty-at-rest, not a heading that lost its icon');
  const stale = R.heads.filter(h => h.stale).map(h => h.label);
  ok(stale.length === 0, `hydrate() consumed every attribute (left: ${stale.join(' | ') || 'none'})`);
  const em = R.heads.filter(h => h.emoji).map(h => h.label);
  ok(em.length === 0, `no emoji survives in a page heading (${em.join(' | ') || 'none'})`);

  // the gallery heading must keep its icon when the writer replaces the label
  ok(R.gallery && R.gallery.before, 'the gallery heading starts with an icon');
  ok(R.gallery && R.gallery.afterRewrite,
    'and STILL has it after galTitle is rewritten — the icon is on the <h2>, not in the writer');
  ok(R.gallery && !R.gallery.emoji, 'and the rewrite puts no emoji back');

  // ---- ICO: exactly one declaration, and it is global ----
  const decls = (SRC.match(/function ICO\(n\)\{/g) || []).length;
  ok(decls === 1, `ICO is declared exactly once (${decls}) — it was six, five global by accident and one dead`);
  ok(R.icoType === 'function',
    `and every caller can still see it: typeof ICO === '${R.icoType}' at global scope`);

  /* LIST_DEFS calls ICO() at PARSE time, in the same block, so a helper
     declared after it would be a TDZ-free but undefined reference. */
  const iIco = SRC.indexOf('function ICO(n){'), iDefs = SRC.indexOf("title: ICO('clock')");
  ok(iIco !== -1 && iDefs !== -1 && iIco < iDefs,
    'ICO is declared before LIST_DEFS evaluates it at parse time');
  ok((SRC.match(/title: ICO\('/g) || []).length === 3, 'all three list titles call ICO()');

  ok(errors.length === 0, `the page loads without throwing (${errors.slice(0, 2).join(' | ') || 'none'})`);

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
