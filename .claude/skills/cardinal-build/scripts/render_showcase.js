/* Render the Showcase in a REAL browser and check the rules actually apply.
 *
 * WHY THIS EXISTS. jsdom does not resolve var() inside shorthands and does not
 * do the cascade the way an engine does. This project has shipped three bugs
 * that every mechanical gate passed:
 *   build 481 — a rule that parsed, balanced and lost to a more specific
 *               neighbour, so the button rendered solid red instead of ghost
 *   build 573 — two modules painting background:#fff inline from JS; the
 *               tokens read dark and the page painted white
 *   and a palette that shipped to every preview and never to the app
 *
 * So: open index.html in Chromium at desktop width, open the Showcase, and ask
 * getComputedStyle what actually won. Screenshots go beside the report so a
 * human can look at the thing rather than read a claim about it.
 *
 *   node render_showcase.js [path-to-index.html] [outdir]
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const OUT = process.argv[3] || '/tmp/showcase-render';
fs.mkdirSync(OUT, { recursive: true });

/* Playwright's screenshot waits on document.fonts.ready, which never settles
   here: the page declares faces whose files are blocked, and a 204 leaves the
   FontFace pending forever. CDP captures the frame as it stands, which is what
   we want anyway — the point is to see what the engine painted. */
async function capture(page, file) {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { data } = await cdp.send('Page.captureScreenshot',
      { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    await cdp.detach();
    return true;
  } catch (e) {
    console.log('  (capture failed: ' + String(e.message).slice(0, 70) + ')');
    return false;
  }
}

let fails = 0, passes = 0;
const ok = (name, cond, extra) => {
  if (cond) { passes++; console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '  → ' + extra : '')); }
};

/* Two curated pairs, shaped like real rows. The images are data: URIs so the
   render needs no network and no signed URLs — what is under test is the CSS
   and the layout, not the storage path. */
function swatch(hex, w, h, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="${hex}"/>
    <g opacity="0.22" fill="#000">${
      Array.from({length: 14}, (_, r) =>
        `<rect x="0" y="${r * (h / 14)}" width="${w}" height="${h / 28}"/>`).join('')
    }</g>
    <text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="64"
          text-anchor="middle" dominant-baseline="middle" opacity="0.85">${label || ''}</text></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

const PAIRS = [
  { id: 'aaaaaaaa-1111-2222-3333-444444444444', address: '123 Main St', city: 'Dayton',
    trade: 'roof', material: 'Owens Corning Duration — Onyx Black', completed_on: '2025-11-04',
    before_path: 'showcase/a/before.jpg', build_path: 'showcase/a/build.jpg',
    after_path: 'showcase/a/after.jpg', score: 98, published: true,
    release_on: '2025-11-14', release_by: 'M. Alvarez' },
  { id: 'bbbbbbbb-5555-6666-7777-888888888888', address: '45 Oakwood Ave', city: 'Kettering',
    trade: 'siding', material: 'James Hardie — Iron Gray', completed_on: '2025-08-19',
    before_path: 'showcase/b/before.jpg', build_path: null,
    after_path: 'showcase/b/after.jpg', score: 92, published: true }
];
const WORK = [
  { id: 'w1', title: 'High-nailing', trade: 'roof',
    lesson: 'Nails above the line pin nothing. First straight-line wind lifts the course.',
    bad_path: 'workmanship/w1/bad.jpg', bad_caption: '3 nails, 35 mm high. Voids the wind warranty on day one.',
    good_path: 'workmanship/w1/good.jpg', good_caption: 'Four fasteners through both courses, seated on the line.',
    published: true }
];

/* One walk with one reviewed shot. The box fractions are chosen so the expected
   pixel position is easy to state: x .25 / y .40 / w .30 / h .20. */
const WALKS = [
  { id: 'wwww1111-2222-3333-4444-555555555555', title: '4212 Wilmington Pike — hail',
    address: '4212 Wilmington Pike', city: 'Dayton', trade: 'roof',
    published: true, sort_order: 0 }
];
const SHOTS = [
  { id: 'shot-1', walk_id: WALKS[0].id, sort_order: 0,
    path: 'walks/wwww1111-2222-3333-4444-555555555555/s1.jpg', source: 'phone',
    findings: [
      { defect: 'hail_impact', severity: 'crit', label: 'Impact bruising',
        box: { x: 0.25, y: 0.40, w: 0.30, h: 0.20 }, confidence: 0.82, edited: false },
      { defect: 'nail_pop', severity: 'warn', label: 'Nail pop',
        box: { x: 0.70, y: 0.10, w: 0.08, h: 0.08 }, confidence: 0.4, edited: false }
    ],
    reviewed_at: '2026-08-02T10:00:00Z', reviewed_by: 'theo@cardinalrenovations.net' }
];

(async () => {
  /* The image ships Chromium at a build the npm playwright does not expect, so
     point at it rather than downloading a second copy (the environment says
     never run `playwright install`). */
  const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(
    require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});

  async function open(width, height, tag) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message || e)));

    // Nothing may reach the network: no Supabase, no Google, no CDN.
    await page.route('**/*', route => {
      const u = route.request().url();
      if (u.startsWith('file://')) return route.continue();
      /* fulfil rather than abort: an aborted request can leave
         document.fonts.ready pending, and page.screenshot() waits on it. */
      return route.fulfill({ status: 204, body: '' });
    });

    await page.goto('file://' + path.resolve(FILE), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);   // let the app's own boot settle and give up

    await page.evaluate(({ pairs, work, walks, shots, imgs }) => {
      /* Stub the client the module reads at call time, and the signer. The
         module is under test; its data source is not. */
      const table = t => (t === 'workmanship_pairs' ? work
                        : t === 'walks' ? walks
                        : t === 'walk_shots' ? shots
                        : t === 'projects' || t === 'project_photos' ? []
                        : pairs);
      const supa = {
        from(t) {
          const q = { select: () => q, order: () => q, eq: () => q,
                      insert: () => q, update: () => q, delete: () => q,
                      then: r => Promise.resolve({ data: table(t), error: null }).then(r) };
          return q;
        },
        storage: { from: () => ({ upload: async () => ({ error: null }) }) }
      };
      /* LOCKED. The app's async boot nulls window.supa after a plain
         assignment — the skill documents this and the first run of this
         harness walked straight into it, rendering the empty state. */
      Object.defineProperty(window, 'supa', { value: supa, writable: false, configurable: true });
      Object.defineProperty(window, 'is_admin', { value: () => true, writable: false, configurable: true });
      window.signedPhotoMap = async paths => {
        const out = {};
        paths.forEach(p => {
          if (/before/.test(p)) out[p] = imgs.before;
          else if (/build/.test(p)) out[p] = imgs.build;
          else if (/bad/.test(p)) out[p] = imgs.bad;
          else if (/good/.test(p)) out[p] = imgs.good;
          else if (/^walks\//.test(p)) out[p] = imgs.walk;
          else out[p] = imgs.after;
        });
        return out;
      };
      if (window.CardinalShowcase) window.CardinalShowcase.reload = undefined;
      /* Simulate a signed-in user. #landingView is fixed, inset:0, z-150 and is
         NOT hidden by hideAllViews() — it is dismissed by an explicit
         display:none on sign-in. Headless we never sign in, so it stays visible
         underneath and Playwright's actionability check reports it intercepting
         clicks. Not a bug in the module; the harness was simply photographing a
         state no signed-in rep is ever in. */
      var lv = document.getElementById('landingView');
      if (lv) lv.style.display = 'none';
    }, { pairs: PAIRS, work: WORK, walks: WALKS, shots: SHOTS, imgs: {
      before: swatch('#6E655C', 1600, 1000, 'BEFORE'), after: swatch('#22252A', 1600, 1000, 'AFTER'),
      build:  swatch('#55606A', 1600, 1000, 'BUILD'),  bad:   swatch('#8A3B3B', 1200, 750, 'BAD'),
      good:   swatch('#2F6B43', 1200, 750, 'OURS'),
      walk:   swatch('#3A3F46', 1600, 1200, 'ROOF')
    }});

    const hasApi = await page.evaluate(() => !!(window.CardinalShowcase && window.CardinalShowcase.open));
    if (!hasApi) { console.log('  (CardinalShowcase never registered — the module did not run)'); }
    else {
      await page.evaluate(() => window.CardinalShowcase.open());
      await page.waitForTimeout(1200);
    }
    return { page, errors, hasApi };
  }

  /* ── desktop, with the left nav on ─────────────────────────────────────── */
  console.log('\n── desktop 1440×900, body.cr-lnav-on ──');
  {
    const { page, errors, hasApi } = await open(1440, 900, 'desktop');
    ok('the module registered and opened', hasApi);

    /* Count pointercancel. A cancelled gesture is how this failure presented,
       and it is worth naming separately from "the split did not move" — the
       split not moving has a dozen possible causes, a cancel has one. */
    await page.evaluate(() => {
      window.__cancels = 0;
      document.addEventListener('pointercancel', () => { window.__cancels++; }, true);
    });

    /* 572 gates the desktop treatment on body.cr-lnav-on, which the nav script
       sets ONLY once the menu has really mounted. In a headless file:// load
       with no session the menu never mounts, so the class is stripped again
       within a frame — the first run of this harness read 640px/9500 and looked
       like the rules had failed. They had not.
       So: add the class and read the computed style in the SAME synchronous
       block. getComputedStyle forces layout, so this measures the rule with the
       class present, which is the question actually worth asking. Whether the
       class gets SET is the nav module's job, proven separately at 572. */
    const m = await page.evaluate(() => {
      const el = document.getElementById('cr-show');
      if (!el) return null;
      const wrap = el.querySelector('.cr-sh-wrap');
      document.body.classList.add('cr-lnav-on');
      const cs = getComputedStyle(el);
      const ws = getComputedStyle(wrap);
      const cmp = el.querySelector('[data-cmp]');
      const before = el.querySelector('[data-role="before"]');
      const card = el.querySelector('[data-pick="0"] img');
      const rel = el.querySelector('.cr-sh-rel-b');
      return {
        display: cs.display, zIndex: cs.zIndex, left: cs.left, top: cs.top,
        bg: cs.backgroundColor, colour: cs.color,
        wrapMax: ws.maxWidth,
        cmpW: cmp ? Math.round(cmp.getBoundingClientRect().width) : 0,
        beforeClip: before ? getComputedStyle(before).clipPath : '',
        cardSrcIsDisplay: card ? /-d\.jpg|1200|1600/.test(card.getAttribute('src') || '') : false,
        relClass: rel ? rel.className : '', relText: rel ? rel.textContent.trim() : '',
        tabs: el.querySelectorAll('[data-tab]').length,
        bodyOverflow: document.body.style.overflow,
        classStuck: document.body.classList.contains('cr-lnav-on')
      };
    });

    ok('#cr-show exists and is shown', m && m.display === 'block', m && m.display);

    /* The build-481 class: a rule that parses and never applies. This is the
       assertion jsdom structurally cannot make. */
    ok('the 572 desktop width rule WINS (1180px)', m && m.wrapMax === '1180px', m && m.wrapMax);
    ok('the 572 z-index drop WINS (60, not 9500)', m && m.zIndex === '60', m && m.zIndex);
    ok('the overlay is inset from the left for the nav', m && m.left !== '0px', m && m.left);

    /* The 448-449 class: a token stripped at runtime leaves a surface
       transparent and the page behind ghosts through. */
    ok('background actually resolved — not transparent',
      m && m.bg !== 'rgba(0, 0, 0, 0)' && m.bg !== 'transparent', m && m.bg);
    ok('text colour resolved', m && m.colour !== 'rgba(0, 0, 0, 0)', m && m.colour);

    ok('the comparison got real width', m && m.cmpW > 600, m && m.cmpW);
    ok('the before pane is clipped (the slider works at all)',
      m && /inset\(/.test(m.beforeClip), m && m.beforeClip);
    ok('the release badge rendered green for a cleared pair',
      m && /\bok\b/.test(m.relClass) && /Alvarez/.test(m.relText), m && m.relText);
    /* Three tabs at 579 — Showcase, Hall of Fame, The Walk. Inspections is
       deliberately NOT one: it is a link out to the reports list that already
       exists, so this count going to 4 means someone rebuilt it. */
    ok('three tabs present, Inspections still a link', m && m.tabs === 3, m && m.tabs);
    ok('module did not touch body.style.overflow', m && m.bodyOverflow === '', JSON.stringify(m && m.bodyOverflow));
    ok('no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

    /* Hold body.cr-lnav-on on. The nav script strips it within a frame here
       because the menu never mounts in a headless file:// load; pinning it is
       how we photograph the desktop treatment a rep actually sees. The rule
       itself is proven above by the same-tick computed-style reads, not by
       this. */
    await page.evaluate(() => {
      window.__pin = setInterval(() => document.body.classList.add('cr-lnav-on'), 16);
    });
    await page.waitForFunction(() => {
      const c = document.querySelector('[data-cmp]');
      return c && c.getBoundingClientRect().width > 600;
    }, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);

    const wide = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.cr-sh-wrap')).maxWidth);
    ok('pinned nav class gives the wide desktop column', wide === '1180px', wide);

    const shot = n => capture(page, path.join(OUT, n));
    await shot('01-desktop-showcase.png');

    /* THE MOUSE DRAG, and it is a real regression test, not a formality.
       This failed for two runs and I twice blamed the harness — first the pin
       interval above, then the ordering. Both theories were wrong. Logging the
       pointer stream showed pointerdown → ONE pointermove → pointercancel:
       Chromium was starting a native image drag-and-drop off the <img>, which
       cancels the pointer stream. touch-action:none already covered the iPad;
       nothing covered a mouse. Build 578 added -webkit-user-drag:none to
       .cr-sh-cmp img. Remove it and this goes red again. */
    const bb = await page.locator('[data-cmp]').boundingBox();
    await page.mouse.move(bb.x + bb.width * 0.52, bb.y + bb.height / 2);
    await page.mouse.down();
    await page.mouse.move(bb.x + bb.width * 0.22, bb.y + bb.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const drag = await page.evaluate(() => ({
      split: getComputedStyle(document.querySelector('[data-cmp]'))
               .getPropertyValue('--sh-split').trim(),
      cancels: window.__cancels || 0
    }));
    ok('dragging the divider moves the split', drag.split && parseFloat(drag.split) < 40, drag.split);
    ok('the gesture is never cancelled by a native image drag', drag.cancels === 0, drag.cancels);
    await shot('02-desktop-dragged.png');


    // privacy
    await page.click('[data-act="priv"]');
    await page.waitForTimeout(300);
    const priv = await page.evaluate(() => {
      const el = document.getElementById('cr-show');
      return { onClass: el.classList.contains('priv'), text: el.innerText };
    });
    ok('privacy on removes the street address from the rendered text',
      priv.onClass && !/123 Main St/.test(priv.text));
    ok('privacy keeps the city', /Dayton/.test(priv.text));
    await shot('03-desktop-privacy.png');
    await page.click('[data-act="priv"]');

    // hall of fame
    await page.click('[data-tab="work"]');
    await page.waitForTimeout(700);
    const hof = await page.evaluate(() => {
      const el = document.getElementById('cr-show');
      const sides = [...el.querySelectorAll('.cr-sh-side')];
      return {
        n: sides.length,
        badHeadColour: sides[0] ? getComputedStyle(sides[0].querySelector('.h')).color : '',
        goodHeadColour: sides[1] ? getComputedStyle(sides[1].querySelector('.h')).color : '',
        cols: getComputedStyle(el.querySelector('.cr-sh-wk-g')).gridTemplateColumns
      };
    });
    ok('Hall of Fame renders both sides', hof.n === 2, hof.n);
    ok('bad side is red, good side is green — and they differ',
      hof.badHeadColour !== hof.goodHeadColour &&
      /^rgb\(2[0-9]{2}, /.test(hof.badHeadColour), [hof.badHeadColour, hof.goodHeadColour].join(' / '));
    ok('side by side on desktop, not stacked', /\s/.test(hof.cols.trim()), hof.cols);
    await shot('04-desktop-hall-of-fame.png');

    /* ── The Walk (579) ───────────────────────────────────────────────────
       The one thing jsdom structurally cannot check. A circle in the wrong
       place is worse than no circle: it points a homeowner at sound shingle
       and every later finding stops being believed. jsdom does no layout, so
       harness_walk.js can only prove the STYLE says 25%; only an engine can
       prove 25% of the photograph is where the box actually lands. */
    await page.click('[data-tab="walk"]');
    await page.waitForTimeout(600);
    await page.click('[data-walk="0"]');
    await page.waitForTimeout(600);
    const shotsN = await page.evaluate(() =>
      document.querySelectorAll('#cr-show [data-shot]').length);
    ok('the walk opened and its shots listed', shotsN === 1, shotsN);

    await page.click('[data-shot="0"]');
    await page.waitForTimeout(700);

    const geo = await page.evaluate(() => {
      const stage = document.querySelector('#cr-show [data-rev]');
      const img = stage && stage.querySelector('img');
      const b0 = document.querySelector('#cr-show [data-box="0"]');
      const b1 = document.querySelector('#cr-show [data-box="1"]');
      if (!stage || !b0) return null;
      const s = stage.getBoundingClientRect(), r0 = b0.getBoundingClientRect();
      const cs0 = getComputedStyle(b0), cs1 = b1 ? getComputedStyle(b1) : null;
      return {
        stageW: s.width, stageH: s.height,
        imgW: img ? img.getBoundingClientRect().width : 0,
        // where the box actually is, as a fraction of the stage
        fx: (r0.left - s.left) / s.width, fy: (r0.top - s.top) / s.height,
        fw: r0.width / s.width, fh: r0.height / s.height,
        critColour: cs0.borderTopColor, warnColour: cs1 && cs1.borderTopColor,
        boxes: document.querySelectorAll('#cr-show [data-box]').length,
        rows: document.querySelectorAll('#cr-show [data-fnd]').length,
        gripShown: b1 ? getComputedStyle(b1.querySelector('.gr')).display : ''
      };
    });

    ok('the review stage got real size', geo && geo.stageW > 600 && geo.stageH > 100,
      geo && [Math.round(geo.stageW), Math.round(geo.stageH)].join('x'));
    ok('the photograph fills the stage', geo && Math.abs(geo.imgW - geo.stageW) < 2,
      geo && [Math.round(geo.imgW), Math.round(geo.stageW)].join(' vs '));
    /* .25/.40/.30/.20 in, the same fractions out — within a pixel of rounding. */
    ok('a box lands exactly where its fraction says (x)',
      geo && Math.abs(geo.fx - 0.25) < 0.005, geo && geo.fx);
    ok('a box lands exactly where its fraction says (y)',
      geo && Math.abs(geo.fy - 0.40) < 0.005, geo && geo.fy);
    ok('and is the size its fraction says',
      geo && Math.abs(geo.fw - 0.30) < 0.005 && Math.abs(geo.fh - 0.20) < 0.005,
      geo && [geo.fw, geo.fh].join(' / '));
    ok('both findings drew a box and a row', geo && geo.boxes === 2 && geo.rows === 2,
      geo && geo.boxes + '/' + geo.rows);
    /* The 481 class: these rules must WIN, not merely parse. crit and warn have
       to be visibly different or severity carries no information at all. */
    ok('crit and warn resolve to different colours',
      geo && geo.critColour && geo.critColour !== geo.warnColour,
      geo && [geo.critColour, geo.warnColour].join(' / '));
    ok('crit is the red, resolved not transparent',
      geo && /^rgb\(229, 72, 77\)$/.test(geo.critColour), geo && geo.critColour);
    ok('the resize grip is hidden on an unselected box', geo && geo.gripShown === 'none',
      geo && geo.gripShown);
    await shot('05-desktop-the-walk.png');

    /* ── The Lens (586) — zoom geometry, which jsdom cannot make ─────────── */
    await page.click('[data-act="rlens"]');
    await page.waitForTimeout(400);
    const lz0 = await page.evaluate(() => {
      const l = document.querySelector('#cr-show .cr-sh-lens');
      if (!l) return null;
      const box = l.querySelector('.cr-sh-ln-box');
      return { bg: getComputedStyle(l).backgroundColor,
               boxW: box.getBoundingClientRect().width,
               zc: l.querySelector('.cr-sh-ln-zc').textContent };
    });
    ok('lens opened from the review stage', !!lz0);
    ok('lens ground resolved true black', lz0 && lz0.bg === 'rgb(5, 6, 7)', lz0 && lz0.bg);
    ok('starts at fit', lz0 && lz0.zc === '1.0×', lz0 && lz0.zc);
    // zoom in twice via buttons: the finding box must scale WITH the world
    await page.click('[data-lz="in"]'); await page.click('[data-lz="in"]');
    await page.waitForTimeout(250);
    const lz1 = await page.evaluate(() => {
      const l = document.querySelector('#cr-show .cr-sh-lens');
      const box = l.querySelector('.cr-sh-ln-box');
      return { boxW: box.getBoundingClientRect().width,
               zc: l.querySelector('.cr-sh-ln-zc').textContent,
               t: l.querySelector('.w').style.transform };
    });
    ok('zoom chip reads 2.0x after two 1.4x steps', lz1.zc === '2.0×', lz1.zc);
    ok('the finding box scaled with the world (rides along)',
      Math.abs(lz1.boxW / lz0.boxW - 1.96) < 0.05, (lz1.boxW / lz0.boxW).toFixed(3));
    // drag pans
    const lb = await page.locator('#cr-show .cr-sh-lens').boundingBox();
    await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
    await page.mouse.down();
    await page.mouse.move(lb.x + lb.width / 2 - 80, lb.y + lb.height / 2 - 50, { steps: 6 });
    await page.mouse.up();
    ok('drag pans the world', /translate\(-/.test(await page.evaluate(() =>
      document.querySelector('#cr-show .cr-sh-lens .w').style.transform)));
    // real two-pointer pinch via synthetic PointerEvents
    await page.evaluate(() => {
      const l = document.querySelector('#cr-show .cr-sh-lens');
      const r = l.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const mk = (type, id, x, y) => l.dispatchEvent(new PointerEvent(type,
        { pointerId: id, clientX: x, clientY: y, bubbles: true }));
      mk('pointerdown', 11, cx - 40, cy); mk('pointerdown', 12, cx + 40, cy);
      mk('pointermove', 11, cx - 45, cy); mk('pointermove', 12, cx + 45, cy);
      mk('pointermove', 11, cx - 90, cy); mk('pointermove', 12, cx + 90, cy);
      mk('pointerup', 11, cx - 90, cy);  mk('pointerup', 12, cx + 90, cy);
    });
    await page.waitForTimeout(150);
    const pinched = await page.evaluate(() =>
      document.querySelector('#cr-show .cr-sh-lens .cr-sh-ln-zc').textContent);
    ok('a two-pointer pinch zooms further', parseFloat(pinched) > 2.0, pinched);
    await shot('08-desktop-lens.png');
    await page.click('#cr-show .cr-sh-ln-x');
    await page.waitForTimeout(200);
    ok('lens closes', await page.evaluate(() => !document.querySelector('#cr-show .cr-sh-lens')));

    /* ── Chalk (585) — the drawing gesture, which jsdom cannot make ──────── */
    await page.click('[data-act="rmark"]');
    await page.waitForTimeout(200);
    const rev = await page.locator('[data-rev]').boundingBox();
    await page.mouse.move(rev.x + rev.width * 0.60, rev.y + rev.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(rev.x + rev.width * 0.85, rev.y + rev.height * 0.80, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    ok('drawing opens the classify sheet', await page.evaluate(() =>
      !!document.querySelector('#cr-show .cr-sh-clsheet')));
    await page.click('[data-def="nail_pop"]');
    await page.waitForTimeout(150);
    await page.click('[data-dsev="warn"]');
    await page.waitForTimeout(150);
    await page.click('[data-act="dkeep"]');
    await page.waitForTimeout(300);
    const chalk = await page.evaluate(() => {
      const el = document.getElementById('cr-show');
      const boxes = [...el.querySelectorAll('[data-box]')];
      const k = boxes[boxes.length - 1];
      const stage = el.querySelector('[data-rev]');
      const S = stage.getBoundingClientRect(), R = k.getBoundingClientRect();
      return { n: boxes.length,
        fx: (R.left - S.left) / S.width, fw: R.width / S.width,
        colour: getComputedStyle(k).borderTopColor,
        rows: el.querySelectorAll('[data-fnd]').length,
        label: k.textContent.trim() };
    });
    ok('the kept mark is a third box', chalk.n === 3 && chalk.rows === 3, chalk.n + '/' + chalk.rows);
    ok('it landed where it was drawn', Math.abs(chalk.fx - 0.60) < 0.02 && Math.abs(chalk.fw - 0.25) < 0.02,
      chalk.fx + ' / ' + chalk.fw);
    ok('it adopted the picked severity colour', /232, 163, 61/.test(chalk.colour), chalk.colour);
    ok('and the picked defect label', /Nail pop/.test(chalk.label), chalk.label);
    await shot('07-desktop-chalk.png');

    /* ── Spotlight (584) ──────────────────────────────────────────────────
       jsdom proves the markup; only an engine can prove the veil's radial
       gradient RESOLVES (the 448-449 transparent-surface class) and that the
       ring lands at its fractions of the real layer.
       Leaving the review discards the unsaved chalk mark — the 580 guard
       asks first, and Playwright must answer it. */
    page.once('dialog', d => d.accept());
    await page.click('[data-act="rback"]').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('[data-act="present"]');
    await page.waitForTimeout(700);
    const pr = await page.evaluate(() => {
      const el = document.getElementById('cr-show');
      const layer = el.querySelector('.cr-sh-pres');
      const ring = el.querySelector('.cr-sh-pr-ring');
      const veil = el.querySelector('.cr-sh-pr-veil');
      if (!layer || !ring) return null;
      const L = layer.getBoundingClientRect(), R = ring.getBoundingClientRect();
      return {
        presenting: el.classList.contains('presenting'),
        bg: getComputedStyle(layer).backgroundColor,
        veilBg: getComputedStyle(veil).backgroundImage.slice(0, 60),
        fx: (R.left - L.left) / L.width, fy: (R.top - L.top) / L.height,
        segs: el.querySelectorAll('.cr-sh-pr-segs i').length,
        ringColour: getComputedStyle(ring).borderTopColor
      };
    });
    ok('present layer shown', pr && pr.presenting);
    ok('true black resolved, not transparent', pr && pr.bg === 'rgb(5, 6, 7)', pr && pr.bg);
    ok('the veil gradient actually resolved', pr && /radial-gradient/.test(pr.veilBg), pr && pr.veilBg);
    ok('ring lands at its stored fraction', pr && Math.abs(pr.fx - 0.25) < 0.005 && Math.abs(pr.fy - 0.40) < 0.005,
      pr && [pr.fx, pr.fy].join(' / '));
    ok('one segment per finding', pr && pr.segs === 2, pr && pr.segs);
    ok('ring colour is the severity, resolved', pr && /^rgb\(229, 72, 77\)$/.test(pr.ringColour),
      pr && pr.ringColour);
    await shot('06-desktop-spotlight.png');
    // advance: second finding is the warn — ring must move and recolour
    await page.click('[data-prgo="1"]');
    await page.waitForTimeout(700);
    const pr2 = await page.evaluate(() => {
      const el = document.getElementById('cr-show');
      const r = el.querySelector('.cr-sh-pr-ring');
      return { c: getComputedStyle(r).borderTopColor, l: r.style.left };
    });
    ok('advancing moves and recolours the ring',
      pr2 && /232, 163, 61/.test(pr2.c) && Math.abs(parseFloat(pr2.l) - 70) < 0.01,
      pr2 && pr2.c + ' @ ' + pr2.l);
    // past the last step: the show ends
    await page.click('[data-prgo="1"]');
    await page.waitForTimeout(400);
    ok('past the last step the show ends', await page.evaluate(() =>
      !document.getElementById('cr-show').classList.contains('presenting')));

    await page.close();
  }

  /* ── phone: must be byte-for-byte as it shipped, no lnav class ─────────── */
  console.log('\n── phone 390×844, no lnav ──');
  {
    const { page, errors } = await open(390, 844, 'phone');
    const m = await page.evaluate(() => {
      const el = document.getElementById('cr-show');
      /* deliberately WITHOUT the class — a phone must never get these rules */
      const ws = getComputedStyle(el.querySelector('.cr-sh-wrap'));
      return { zIndex: getComputedStyle(el).zIndex, left: getComputedStyle(el).left,
               wrapMax: ws.maxWidth,
               scrollW: document.documentElement.scrollWidth,
               clientW: document.documentElement.clientWidth };
    });
    ok('phone keeps the original z-index (9500)', m.zIndex === '9500', m.zIndex);
    ok('phone is not inset', m.left === '0px', m.left);
    ok('phone keeps the 640px column', m.wrapMax === '640px', m.wrapMax);
    ok('no horizontal overflow', m.scrollW <= m.clientW + 1, m.scrollW + ' vs ' + m.clientW);
    ok('no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await capture(page, path.join(OUT, '05-phone-showcase.png'));
    await page.close();
  }

  await browser.close();
  console.log('\n' + '─'.repeat(58));
  console.log((fails === 0 ? 'GREEN' : 'RED') + ` — ${passes} passed, ${fails} failed`);
  console.log('screenshots: ' + OUT);
  console.log('This checks that rules APPLY and colours RESOLVE. Whether the');
  console.log('result looks right is still Theo\'s call.');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('RENDER CRASH', e); process.exit(2); });
