/* The home-screen client card, measured in a real engine.

   Theo, with a screenshot: "Unreadable and unlike your design." White cards
   on the black home screen, names as red-to-grey gradient text.

   THE CAUSE, measured before it was believed: projCardHtml() puts
   stageClass(stg) on the CARD ("pcard pcbadge stg-Lead") so the spine can
   read var(--stgc). But the eight bare `.stg-*` rules (~L738) were written
   for the little stage CHIP — light pastels, `background:#e8f0fb` — and a
   bare class selector cannot tell a chip from a card. Same specificity as
   `.pcard` (0,1,0), later in the file, so the pastel's `background`
   SHORTHAND wins and also resets the card's dark gradient to `none`.

   Build 544's own comment names this exact trap ("a bare rule would paint a
   chip background across the entire card") — it scoped its new DARK chip
   rules to .stagechip.stg-* and left the loaded base pastels bare.

   BUG_CLASSES 27, second occurrence: one class name, two meanings, and the
   junior meaning inherits the senior's box.

   This loads the REAL document (never concatenated <style> scrapes — see
   render_schedule.js for why), injects a card exactly as projCardHtml emits
   it, and measures every text element against the WORST ground an ancestor
   actually paints, gradient stops included.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_pcard.js [index.html]
   Point it at the previous build as the negative control — must go red.     */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const CARD =
  '<div class="pcard pcbadge stg-Lead" data-proj="x">' +
  '<div class="pcini">K</div><div class="pcbd">' +
  '<div class="pcr1"><span class="pcnm">Karrie Johnson</span><span class="pcpo">1043</span>' +
  '<span class="favstar">☆</span></div>' +
  '<div class="pcad">804 E Center St, Germantown</div>' +
  '<div class="pcchips"><span class="stagechip stg-Lead">Lead</span>' +
  '<span class="pcdot"></span><span class="pcrep">Joan Hunt</span>' +
  '<span class="pcdot"></span><span class="pcmeta">0 docs</span></div>' +
  '<div class="pcacts"><a href="tel:1" data-act>Call</a><a href="sms:1" data-act>Text</a></div>' +
  '</div></div>';

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  for (const [label, theme] of [['dark', null], ['light', 'rb-light']]) {
    const p = await br.newPage({ viewport: { width: 390, height: 900 } });
    await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    p.on('pageerror', () => {});
    await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
    await p.evaluate(t => {
      if (t) document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
    }, theme);
    await p.waitForTimeout(500);

    const r = await p.evaluate(card => {
      const host = document.querySelector('#historyMount') || document.body;
      const wrap = document.createElement('div');
      wrap.className = 'projgrid swipe';
      wrap.innerHTML = card;
      host.appendChild(wrap);

      const px = s => (s.match(/[\d.]+/g) || []).map(Number);
      /* ⚠ ALPHA COMPOSITES — the first draft treated rgba(93,161,243,.18) as
         an opaque ground and scored 544's stage chips at 1.54:1, when the
         18% wash composites over the dark card to the ~7:1 the 544 banner
         computed. A translucent layer is not a ground; it is a tint on the
         ground beneath it. Walk up collecting layers until something opaque,
         then blend bottom-up. Gradient stops still fan out worst-case. */
      function grounds(el) {
        const layers = [];                       /* [{stops:[{rgb,a}]}] top-down */
        let base = [255, 255, 255], baseCss = '#fff';
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
          const cs = getComputedStyle(n);
          const stops = [];
          if (cs.backgroundImage && cs.backgroundImage !== 'none') {
            (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).forEach(s => {
              const v = px(s);
              if (v.length >= 3) stops.push({ rgb: v.slice(0, 3), a: v.length === 4 ? v[3] : 1, css: s });
            });
          }
          const c = px(cs.backgroundColor);
          if (c.length >= 3 && !(c.length === 4 && c[3] === 0))
            stops.push({ rgb: c.slice(0, 3), a: c.length === 4 ? c[3] : 1, css: cs.backgroundColor });
          if (stops.length) {
            layers.push(stops);
            if (stops.some(s => s.a >= 1)) {     /* found an opaque floor */
              base = null; break;
            }
          }
        }
        /* resolve: every combination is overkill — blend each layer's stops
           over each candidate beneath, keeping all variants (worst-case fan) */
        let cands = base ? [{ rgb: base, css: baseCss }] : [{ rgb: [255, 255, 255], css: '#fff' }];
        for (let i = layers.length - 1; i >= 0; i--) {
          const next = [];
          for (const st of layers[i]) {
            for (const under of cands) {
              const a = st.a;
              next.push({
                rgb: st.rgb.map((v, k) => Math.round(v * a + under.rgb[k] * (1 - a))),
                css: a < 1 ? st.css + ' over ' + under.css : st.css
              });
            }
          }
          cands = next.slice(0, 12);
        }
        return cands;
      }
      const lum = ([r, g, b]) => {
        const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);

      const card_ = wrap.querySelector('.pcard');
      const ccs = getComputedStyle(card_);
      const rows = [];
      for (const [name, sel] of [['name .pcnm', '.pcnm'], ['po .pcpo', '.pcpo'],
        ['address .pcad', '.pcad'], ['rep .pcrep', '.pcrep'], ['meta .pcmeta', '.pcmeta'],
        ['chip .stagechip', '.stagechip'], ['Call/Text .pcacts a', '.pcacts a']]) {
        const el = wrap.querySelector(sel);
        const cs = getComputedStyle(el);
        const fillRaw = cs.webkitTextFillColor || cs.color;
        const fill = px(fillRaw);
        const clipped = (fill.length === 4 && fill[3] === 0);
        let worst = null;
        if (!clipped && fill.length >= 3) {
          for (const g of grounds(el)) {
            const rr = ratio(fill.slice(0, 3), g.rgb);
            if (!worst || rr < worst.r) worst = { r: rr, css: g.css };
          }
        }
        rows.push({ name, clipped, fg: fillRaw, bg: worst ? worst.css : '-',
          ratio: worst ? Number(worst.r.toFixed(2)) : null });
      }
      return {
        cardBgColor: ccs.backgroundColor,
        cardBgImage: ccs.backgroundImage.slice(0, 80),
        rows
      };
    }, CARD);

    await p.screenshot({ path: SHOT + 'pcard-' + label + '.png', clip: { x: 0, y: 380, width: 390, height: 420 } })
      .catch(() => p.screenshot({ path: SHOT + 'pcard-' + label + '.png' }));
    await p.close();

    console.log('\n── ' + label + ' ──  card ground: ' + r.cardBgColor + ' / ' + r.cardBgImage);
    for (const x of r.rows) {
      console.log('   ' + (x.clipped ? 'CLIPPED ' : (x.ratio >= 4.5 ? ' ok  ' : ' FAIL ')) +
        x.name.padEnd(22) + String(x.ratio).padStart(6) + ':1  ' + x.fg + ' on ' + x.bg);
    }

    if (!theme) {
      /* dark: the card must be DARK — Theo's explicit pick — and everything must read */
      const v = (r.cardBgColor.match(/[\d.]+/g) || []).map(Number);
      const isDark = v.length >= 3 && (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) < 100;
      ok('dark · the card itself is dark, not a pastel chip colour', isDark,
        r.cardBgColor + ' img=' + r.cardBgImage);
      ok('dark · the client name is not gradient-clipped text',
        !r.rows[0].clipped, r.rows[0].fg);
      for (const x of r.rows) {
        if (x.clipped || x.ratio === null) continue;
        ok('dark · ' + x.name + ' reads (' + x.ratio + ':1)', x.ratio >= 4.5, x.ratio + ':1');
      }
    } else {
      /* light: must not regress — the chip keeps its pastel, text still reads */
      ok('light · the name is not gradient-clipped there either', !r.rows[0].clipped, r.rows[0].fg);
      const chip = r.rows.find(x => x.name.includes('chip'));
      ok('light · the stage chip kept its readable pastel (' + chip.ratio + ':1)',
        chip.ratio !== null && chip.ratio >= 4.5, chip.ratio + ':1');
      const nm = r.rows[0];
      ok('light · the name reads (' + nm.ratio + ':1)', nm.ratio !== null && nm.ratio >= 4.5, nm.ratio + ':1');
    }
  }

  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
