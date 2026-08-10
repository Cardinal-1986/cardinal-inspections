/* The Schedule Board, measured in a real engine.

   Theo: "can't read this page for scheduling." The screenshot shows the
   heading almost invisible against the near-black page.

   Build 527 themed this board for dark — .bday, .bhead, .bnone, .btime,
   .bcli, .brow and .subnote all got computed replacement inks, and its own
   comment records the ratios it was fixing (.bhead was 1.39:1). It did NOT
   theme `.viewhead`, which is still the base rule's `color:#1c1416` — a
   near-black ink chosen for a white page, printed on a near-black one.

   This does not take that on faith. It mounts the REAL #boardView markup with
   every <style> block in document order, then for each text element walks UP
   the ancestor chain to the first non-transparent background — the colour the
   text is actually sitting on, not the one its own rule mentions — and
   computes the WCAG ratio there. jsdom cannot do any of this.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_schedule.js [index.html]
   Point it at the previous build as the negative control.                    */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* ⚠ DO NOT go back to scraping the <style> blocks and concatenating them.
   The first draft of this script did exactly that and reported the page ground
   as rgb(253,252,247) — cream — in every render, including the ones that were
   supposed to be dark. It then "measured" the dark inks against a white page
   and produced a table of confident nonsense, in which the invisible heading
   scored 17.61:1.

   The cause is this file's own documented trap: strings lie. Several of those
   122 blocks are GENERATED PRINT/REPORT stylesheets that live inside template
   strings — they set `:root{--ink:#1b1b1b}` and `body{...}` for an 11pt
   Georgia document, and concatenating them let a contract template restyle the
   app. A naive `<style>` scan over 3.8 MB cannot tell a live tag from markup
   inside a string literal.

   So: load the REAL document and let the browser decide what is a real tag.
   That is the only thing that gets the cascade right.                        */

/* what openScheduleBoard() actually emits: one day with an appointment,
   thirteen empty — the shape Theo photographed. */
const DAYS = (() => {
  const rows = [];
  for (let i = 0; i < 8; i++) {
    const label = ['Monday, Aug 10', 'Tuesday, Aug 11', 'Wednesday, Aug 12', 'Thursday, Aug 13',
                   'Friday, Aug 14', 'Saturday, Aug 15', 'Sunday, Aug 16', 'Monday, Aug 17'][i];
    const suffix = i === 0 ? ' · <b>Today</b>' : (i === 1 ? ' · Tomorrow' : '');
    /* __KIND__ is filled IN THE PAGE from the app's own KIND_META, so this rig
       follows the artifact instead of carrying a stale copy of the glyph. */
    const body = i === 0
      ? '<div class="bitem"><span class="bkind">__KIND__</span>' +
        '<span class="btime">—</span>' +
        '<span class="btitle">Initial appointment — Carl Bolivar ' +
        '<span class="bcli">· Carl Bolivar</span></span></div>'
      : '<div class="bnone">Nothing scheduled</div>';
    rows.push('<div class="bday' + (i === 0 ? '' : ' bempty') + '" data-day="d' + i + '">' +
      '<div class="bhead">' + label + suffix + '</div>' + body + '</div>');
  }
  return rows.join('');
})();

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  for (const [label, w, theme] of [['phone 390 · dark', 390, null],
                                   ['desktop 1280 · dark', 1280, null],
                                   ['phone 390 · light', 390, 'rb-light']]) {
    const p = await br.newPage({ viewport: { width: w, height: 1000 } });
    /* the app must not reach the network: no CDN, no Supabase, no maps. It
       still parses and applies every real stylesheet, which is all we measure. */
    await p.route('**', route => {
      const u = route.request().url();
      if (u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    p.on('pageerror', () => {});           /* the app will throw without its CDNs — expected */
    await p.setContent(SRC, { waitUntil: 'domcontentloaded' });

    /* the theme is set by the app's own pre-paint script; force it so the run
       is deterministic rather than dependent on a stored preference. */
    await p.evaluate(t => {
      if (t) document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
    }, theme);

    /* show the board the way navigation does, then fill it the way
       openScheduleBoard() does. Done AFTER load so the app's own startup
       cannot hide it again underneath us. */
    await p.waitForTimeout(500);
    await p.evaluate(d => {
      document.querySelectorAll('body > div[id$="View"], body > section')
        .forEach(v => { if (v.id !== 'boardView') v.style.display = 'none'; });
      const bv = document.getElementById('boardView');
      if (bv) bv.style.display = 'block';
      const m = document.getElementById('boardMount');
      /* pull the appointment glyph from the app's own KIND_META — whatever it
         is today. If the app still ships an emoji, this render shows an emoji
         and the assertion below goes red, which is exactly what a negative
         control against the previous build should do. */
      let kind = '';
      try {
        kind = (window.CardinalIcons && window.CardinalIcons.get)
          ? window.CardinalIcons.get('calendar') : '📅';
      } catch (_) { kind = '📅'; }
      if (m) m.innerHTML = d.replace('__KIND__', kind);
    }, DAYS);
    await p.waitForTimeout(250);

    const r = await p.evaluate(() => {
      /* THE REAL BACKGROUND: an element's own background is usually
         transparent, so the colour its text sits on comes from an ancestor.
         Walk up until something actually paints. Reading the element's own
         background-color is how you get a confident, wrong answer. */
      const px = s => (s.match(/[\d.]+/g) || []).map(Number);

      /* ⚠ background-COLOR is not the whole background. `.bday` paints a
         linear-gradient, which is a background-IMAGE — so a walk that only
         reads backgroundColor sails straight past the card and reports the
         page behind it. That under-reports on dark (the card is lighter than
         the page) and, worse, hides a real light-mode failure.

         So: collect every candidate ground an ancestor actually paints —
         its colour AND every colour stop of its gradient — and score the text
         against the WORST of them. Conservative by construction. */
      function grounds(el) {
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
          const cs = getComputedStyle(n);
          const img = cs.backgroundImage;
          const out = [];
          if (img && img !== 'none') {
            const stops = img.match(/rgba?\([^)]+\)/g) || [];
            stops.forEach(s => {
              const v = px(s);
              if (v.length >= 3 && !(v.length === 4 && v[3] === 0)) out.push({ css: s, rgb: v.slice(0, 3) });
            });
          }
          const c = px(cs.backgroundColor);
          if (c.length >= 3 && !(c.length === 4 && c[3] === 0)) out.push({ css: cs.backgroundColor, rgb: c.slice(0, 3) });
          if (out.length) return out;
        }
        return [{ css: '#fff (nothing painted)', rgb: [255, 255, 255] }];
      }
      const lum = ([r, g, b]) => {
        const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b);
        return ((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)); };

      const targets = [
        ['.viewhead  (the heading)', '.viewhead', 'large'],
        ['.subnote   (the blurb)', '.subnote', 'body'],
        ['.bhead     (day header)', '.bhead', 'body'],
        ['.bnone     ("Nothing scheduled")', '.bnone', 'body'],
        ['.btime     (the time)', '.btime', 'body'],
        ['.btitle    (appointment)', '.btitle', 'body'],
        ['.bcli      (client name)', '.bcli', 'body'],
      ];
      const out = [];
      for (const [name, sel, kind] of targets) {
        const el = document.querySelector('#boardView ' + sel);
        if (!el) { out.push({ name, sel, missing: true }); continue; }
        const cs = getComputedStyle(el);
        /* -webkit-text-fill-color wins over color when a gradient clip is on */
        const fillRaw = cs.webkitTextFillColor || cs.color;
        const fill = px(fillRaw);
        const clipped = /text/.test(cs.webkitBackgroundClip || '') ||
                        (fill.length === 4 && fill[3] === 0);
        const cands = grounds(el);
        let worst = null;
        if (fill.length >= 3) {
          for (const g of cands) {
            const rr = ratio(fill.slice(0, 3), g.rgb);
            if (!worst || rr < worst.r) worst = { r: rr, css: g.css };
          }
        }
        out.push({
          name, sel, kind, clipped,
          fg: fillRaw, bg: worst ? worst.css : cands[0].css,
          grounds: cands.length,
          ratio: worst ? Number(worst.r.toFixed(2)) : null,
          floor: kind === 'large' ? 3.0 : 4.5,
          fontPx: Math.round(parseFloat(cs.fontSize)),
          weight: cs.fontWeight
        });
      }
      /* ── the icons ──────────────────────────────────────────────────────
         Two things worth proving, and only an engine can prove either:
         1. no emoji survives on this screen — checked over the RENDERED text,
            which catches the HTML-entity form (&#128197;) that a source grep
            for literal UTF-8 would sail straight past;
         2. an icon's stroke actually resolves to the colour of the text it
            sits beside. `stroke="currentColor"` is a promise; getComputedStyle
            is the only thing that collects on it. */
      const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
      const board = document.getElementById('boardView');
      const emojiFound = [];
      board.querySelectorAll('*').forEach(el => {
        for (const n of el.childNodes) {
          if (n.nodeType === 3 && EMOJI.test(n.nodeValue)) {
            emojiFound.push((el.className || el.tagName) + ': ' + n.nodeValue.trim().slice(0, 40));
          }
        }
      });

      const svgs = [...board.querySelectorAll('svg.cri')];
      const inherit = svgs.map(s => {
        const own = getComputedStyle(s).stroke;
        const parentColor = getComputedStyle(s.parentElement).color;
        const r = s.getBoundingClientRect();
        return { stroke: own, parentColor, matches: own === parentColor,
                 w: Math.round(r.width), h: Math.round(r.height),
                 where: s.parentElement.className || s.parentElement.tagName };
      });

      return { rows: out, pageBg: getComputedStyle(document.body).backgroundColor,
               emojiFound: [...new Set(emojiFound)], svgCount: svgs.length, inherit };
    });

    await p.screenshot({ path: SHOT + 'schedule-' + w + (theme || 'dark') + '.png', fullPage: false });
    await p.close();

    console.log('\n── ' + label + ' ──   page ground ' + r.pageBg);
    for (const x of r.rows) {
      if (x.missing) { console.log('   (absent) ' + x.name); continue; }
      const verdict = x.ratio === null ? '  ??' : (x.ratio >= x.floor ? ' ok ' : ' FAIL');
      console.log('  ' + verdict + ' ' + x.name.padEnd(34) +
        String(x.ratio).padStart(6) + ':1  (floor ' + x.floor + ')  ' +
        x.fg + ' on ' + x.bg + (x.clipped ? '   [gradient-clipped]' : ''));
    }

    /* Assert only on the DARK renders. Light is reported for information —
       this board's light mode was never the complaint and must not regress,
       which the light row below checks separately. */
    if (!theme) {
      for (const x of r.rows) {
        if (x.missing || x.ratio === null) continue;
        ok(label + ' · ' + x.sel + ' is readable (' + x.ratio + ':1, floor ' + x.floor + ')',
          x.ratio >= x.floor, x.ratio + ':1');
      }
    } else {
      const head = r.rows.find(x => x.sel === '.viewhead');
      ok('light mode still reads (the fix must not trade one theme for the other)',
        head && head.ratio !== null && head.ratio >= 3.0,
        head ? head.ratio + ':1' : 'heading not found');
    }

    /* the icon assertions run on every render — an icon that inherits
       correctly in dark and wrongly in light is the failure worth catching */
    console.log('  icons: ' + r.svgCount + ' drawn' +
      (r.emojiFound.length ? ' · EMOJI STILL PRESENT: ' + r.emojiFound.join(' | ') : ' · no emoji'));
    ok(label + ' · no emoji survives on the Schedule Board',
      r.emojiFound.length === 0, r.emojiFound.join(' | '));
    ok(label + ' · the icons are actually drawn', r.svgCount >= 2, r.svgCount + ' found');
    const bad = r.inherit.filter(i => !i.matches);
    ok(label + ' · every icon takes the colour of the text beside it',
      bad.length === 0,
      bad.map(b => b.where + ' stroke ' + b.stroke + ' vs text ' + b.parentColor).join(' | '));
    const sized = r.inherit.filter(i => i.w < 8 || i.w > 40);
    ok(label + ' · …and is sized to that text, not fixed',
      sized.length === 0, sized.map(s => s.where + ' ' + s.w + 'x' + s.h).join(' | '));
  }

  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
