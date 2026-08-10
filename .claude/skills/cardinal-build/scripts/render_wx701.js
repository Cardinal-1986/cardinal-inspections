/* render_wx701.js — build 701 gate: the weather panel is gone.

   A removal is harder to gate than an addition, because "the element is not
   there" is also what a page that failed to render says. So this asserts the
   landing page is ALIVE first — its wordmark, greeting, quote and course rows
   are all present and painted — and only then that the panel is absent.

   Four things it checks that a source grep cannot:

   1. The panel is gone from the DOM in BOTH themes, and gone from the layout —
      `.cr-lr-head` is down to one child, so nothing is left holding a gap.

   2. Nothing throws. `wx()` was called from a bare `try{}catch(_){}` at module
      load, and the CSS, markup and three helpers came out in one pass; a half
      removal is a ReferenceError at load, not a blank space.

   3. The wordmark got its size back. The shrink rule existed only to make room
      for the panel — its own comment said so. Restoring it is only safe if the
      text still fits, so this MEASURES the text against its box at four widths
      rather than trusting the clamp.

   4. cr-lr-styles is brace-balanced under check_build's own stripping rules.
      This is here because the first cut of 701 was RED exactly there: the rule
      remover walked out of a `.cr-lr-wx` match to the nearest brace, and for
      the last rule in the phone media query the nearest boundary backwards was
      inside a COMMENT. It cut the comment in half, and the resulting unclosed
      comment-opener swallowed 1,411 characters of live CSS as far as the next
      closing delimiter.

      (Writing that closing delimiter literally in THIS banner ended it early
      and made the prose below it parse as code — the same fault, in the note
      about the fault. Node caught it; the wording is deliberate.)

   Usage: NODE_PATH=<scratchpad>/node_modules node render_wx701.js [index.html]
   Point it at 700 as the negative control — every panel assertion inverts.  */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const SRC = fs.readFileSync(FILE, 'utf8');

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

  // ---- the landing page, dark and light, at phone width -------------------
  for (const mode of ['dark', 'light']) {
    const p = await br.newPage({ viewport: { width: 393, height: 900 } });
    await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    const errors = [];
    p.on('pageerror', e => errors.push(String(e).slice(0, 140)));
    await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
    if (mode === 'light') await p.evaluate(() => document.documentElement.setAttribute('data-mode', 'light'));
    await p.waitForTimeout(900);

    const R = await p.evaluate(() => {
      const q = s => document.querySelectorAll(s).length;
      const head = document.querySelector('.cr-lr-head');
      const mark = document.querySelector('.cr-lr-mark');
      const lv = document.getElementById('landingView');
      return {
        alive: !!(lv && mark && mark.textContent.trim()),
        courses: q('.cr-lr-course'), quote: q('.cr-lr-quote'), pairs: q('.cr-lr-pair button'),
        wxClass: q('.cr-lr-wx'), wxSlot: q('[data-slot="wx"]'),
        wxAny: [...document.querySelectorAll('#landingView *')]
          .filter(e => /^(wx|cr-lr-wx)/.test(e.className || '')).length,
        headKids: [...(head ? head.children : [])].map(c => c.className || c.tagName),
        /* the course rows: title, subtitle and count each on their own line.
           They were <span>s at display:inline, so every row read
           "Quick InspectionWalk the roof". Measure the gap, not the display —
           display:block with a zero gap would still be wrong. */
        rows: [...document.querySelectorAll('.cr-lr-course')].map(c => {
          const t = c.querySelector('.tt'), s = c.querySelector('.sb'), n = c.querySelector('.n');
          const top = e => e ? Math.round(e.getBoundingClientRect().top) : null;
          return { tt: top(t), sb: top(s), n: top(n), label: t ? t.textContent.trim().slice(0, 18) : '' };
        }),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });

    console.log(`\n[${mode}] landing @393px`);
    ok(R.alive, 'the landing page rendered — a removal gate must prove the page still works');
    ok(R.courses >= 3, `its course rows are there (${R.courses})`);
    ok(R.quote === 1 && R.pairs >= 2, `quote and pair tiles are there (${R.quote} / ${R.pairs})`);
    ok(R.wxClass === 0 && R.wxSlot === 0, `no weather element (${R.wxClass} .cr-lr-wx, ${R.wxSlot} [data-slot=wx])`);
    ok(R.wxAny === 0, `nothing wx-shaped left anywhere in the landing view (${R.wxAny})`);
    ok(R.headKids.length === 1 && /cr-lr-id/.test(R.headKids[0]),
      `.cr-lr-head is down to the id block, holding no gap (${R.headKids.join(', ') || 'empty'})`);
    /* NOT `typeof window.wxPaint` — cr-lr-script is an IIFE, so the helpers
       were never globals and that reads 'undefined' on the old file too. It
       passed on the negative control, which is the tell for an assertion that
       cannot fail. The helpers have to be checked in the source. */
    ok(R.overflow <= 0, `no horizontal overflow (${R.overflow}px)`);

    /* 15px is well clear of both states: the inline bug put the subtitle 4-6px
       below the title (a baseline offset on ONE line), the fix puts it 23-26px
       below (its own line). Nothing lands in between. */
    const run = R.rows.filter(r => r.sb !== null && r.sb - r.tt < 15);
    ok(run.length === 0,
      `every course row stacks title over subtitle (${R.rows.map(r => r.label + ' +' + (r.sb - r.tt)).join(', ')})`);
    const runN = R.rows.filter(r => r.n !== null && r.n - r.sb < 15);
    ok(runN.length === 0,
      `and the client count is on its own line too (${R.rows.filter(r => r.n !== null).map(r => r.label + ' +' + (r.n - r.sb)).join(', ') || 'none has one'})`);

    ok(errors.length === 0, `nothing throws at load (${errors.slice(0, 2).join(' | ') || 'none'})`);
    await p.close();
  }

  // ---- the wordmark got its size back, and still fits ---------------------
  console.log('\nwordmark, restored to clamp(38px,12vw,58px)');
  for (const w of [360, 393, 430, 560]) {
    const p = await br.newPage({ viewport: { width: w, height: 900 } });
    await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(600);
    const M = await p.evaluate(() => {
      const el = document.querySelector('.cr-lr-mark');
      const r = document.createRange(); r.selectNodeContents(el);
      return { font: parseFloat(getComputedStyle(el).fontSize),
               text: Math.round(r.getBoundingClientRect().width),
               box: Math.round(el.getBoundingClientRect().width) };
    });
    // 12vw, clamped to [38,58]. The old rule was 8.2vw — a 32% smaller glyph.
    const want = Math.min(58, Math.max(38, w * 0.12));
    ok(Math.abs(M.font - want) < 0.6,
      `${w}px: wordmark is ${M.font.toFixed(1)}px, the full clamp (want ${want.toFixed(1)})`);
    ok(M.text < M.box,
      `${w}px: and still fits — ${M.text}px of text in a ${M.box}px box`);
    await p.close();
  }

  // ---- the helpers, checked where they actually live ----------------------
  console.log('\nthe module internals (IIFE-private, so source is the only view)');
  const GONE = ['function wx(', 'function wxPaint(', 'function wxCached(',
    'WX_CODES', 'WX_TTL', 'WX_KEY', 'WX_LL', 'open-meteo.com',
    'cr-lr-wx', 'data-slot="wx"'];
  const left = GONE.filter(s => SRC.includes(s));
  ok(left.length === 0, `every weather internal is gone (left: ${left.join(', ') || 'none'})`);

  /* The 525 banner documented the Open-Meteo call. A comment that outlives its
     code is how the next session concludes a feature exists. */
  ok(!SRC.includes("today's weather (525)"), 'and its banner comment went too');

  // ---- cr-lr-styles balances the way check_build counts it ----------------
  const blocks = [...SRC.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)];
  const bad = [];
  blocks.forEach((m, i) => {
    let css = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/"[^"]*"|'[^']*'/g, '');
    if (css.split('{').length !== css.split('}').length) bad.push(i);
  });
  console.log('');
  ok(bad.length === 0,
    `every <style> block balances after comment+quote stripping (bad: ${bad.join(',') || 'none'})`);

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
