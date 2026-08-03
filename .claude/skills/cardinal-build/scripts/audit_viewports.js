/* Vision Suite alignment + function audit, builds 588 + 590.
 *
 * WHY: the eyeball missed the ⤢/After collision until a screenshot happened to
 * show it. This sweep finds that class MECHANICALLY: at four real viewports it
 * collects every visible control (buttons, the slider handle) plus the label
 * chips they can collide with, and flags any pair whose intersection exceeds
 * 15% of the smaller element. It also drives every function of the five new
 * features end to end at each size.
 *
 * 590 adds the SHOWROOM pass. The assertion that matters is not "the buttons
 * look gone" but a counted zero: every button actually in the DOM across all
 * three tabs is checked against a write-action list, at every viewport. It also
 * proves the width rule (card hidden on a phone, and open({showroom:true}) at
 * phone width falls BACK rather than refusing), that a tap on the ✕ does not
 * exit, and that a hold does.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; } else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '  -> ' + JSON.stringify(x) : '')); } };
const note = m => console.log(m);

function swatch(hex, w, h, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${hex}"/><g opacity="0.22" fill="#000">${Array.from({length:14},(_,r)=>`<rect x="0" y="${r*(h/14)}" width="${w}" height="${h/28}"/>`).join('')}</g><text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle" dominant-baseline="middle" opacity="0.85">${label||''}</text></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}
const PAIRS = [
  { id:'a1', address:'123 Main St', city:'Dayton', trade:'roof', material:'Owens Corning Duration — Onyx Black',
    completed_on:'2025-11-04', before_path:'showcase/a/before.jpg', build_path:'showcase/a/build.jpg',
    after_path:'showcase/a/after.jpg', score:98, published:true, release_on:'2025-11-14', release_by:'M. Alvarez' },
  { id:'b2', address:'45 Oakwood Ave', city:'Kettering', trade:'siding', material:'James Hardie — Iron Gray',
    completed_on:'2025-08-19', before_path:'showcase/b/before.jpg', build_path:null,
    after_path:'showcase/b/after.jpg', score:92, published:true }
];
const WORK = [{ id:'w1', title:'High-nailing', trade:'roof', lesson:'Nails above the line pin nothing.',
  bad_path:'workmanship/w1/bad.jpg', bad_caption:'3 nails, 35mm high.',
  good_path:'workmanship/w1/good.jpg', good_caption:'Four fasteners, on the line.', published:true }];
const WALKS = [{ id:'w1', title:'4212 Wilmington Pike — hail', address:'4212 Wilmington Pike',
  city:'Dayton', trade:'roof', published:true, sort_order:0 }];
const SHOTS = [
  { id:'s1', walk_id:'w1', sort_order:0, path:'walks/w1/s1.jpg', source:'phone',
    findings:[{ defect:'hail_impact', severity:'crit', label:'Impact bruising',
      box:{x:0.25,y:0.40,w:0.30,h:0.20}, confidence:0.82, edited:false, source:'ai' }],
    reviewed_at:'2026-08-02T10:00:00Z', reviewed_by:'theo@cardinalrenovations.net' }
];
const DETECT_REPLY = { findings:[
  { defect:'nail_pop', severity:'warn', label:'Nail pop', box:{x:0.62,y:0.2,w:0.06,h:0.06}, confidence:0.4 }],
  quality:'ok', quality_note:'', dropped:0, via:'stub', vocab:{severities:['crit','warn','ok'],defects:[]} };

const VIEWPORTS = [
  { name: 'phone 390x844',   w: 390,  h: 844,  lnav: false },
  { name: 'iPad portrait 820x1180', w: 820, h: 1180, lnav: false },
  { name: 'iPad landscape 1180x820', w: 1180, h: 820, lnav: false },
  { name: 'desktop 1440x900', w: 1440, h: 900, lnav: true }
];

/* Overlap sweep: visible buttons + slider handle + label chips inside #cr-show
   (or the form). Flags any pair overlapping >15% of the smaller one. */
async function overlapSweep(page, where) {
  return page.evaluate((where) => {
    const root = document.querySelector(where) || document.getElementById('cr-show');
    if (!root) return { error: 'no root' };
    const sel = 'button, [data-hd], .cr-sh-tag, .cr-sh-score, .cr-sh-rel-b, .cr-sh-chip';
    const els = [...root.querySelectorAll(sel)].filter(e => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    const bad = [];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b = els[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
      const iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
      const inter = ix * iy;
      const small = Math.min(ra.width * ra.height, rb.width * rb.height);
      if (small > 0 && inter / small > 0.15) {
        const tag = e => (e.tagName + '.' + String(e.className).split(' ')[0] + '[' +
          (e.dataset.act || e.dataset.tab || e.textContent.trim().slice(0, 14)) + ']');
        bad.push(tag(a) + ' <-> ' + tag(b) + ' ' + Math.round(inter / small * 100) + '%');
      }
    }
    const overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return { n: els.length, bad, overflowX };
  }, where);
}

/* Touch-target sweep (592). 44px is Apple's floor; this screen gets handed to a
   homeowner, so it is not negotiable. Before 592, 11 of the 12 controls in the
   room were under it — the next/back arrows were 30x30. Measured, not eyeballed,
   at every viewport, so they cannot quietly shrink again.
   Exempt: nothing. If a control is too small to hit it does not belong here. */
async function touchSweep(page, where) {
  return page.evaluate((where) => {
    const root = document.querySelector(where) || document.getElementById('cr-show');
    if (!root) return { error: 'no root' };
    const small = [];
    root.querySelectorAll('button, [data-hd]').forEach(e => {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (r.height < 44 || r.width < 44) {
        small.push((e.dataset.act || e.dataset.tab || e.dataset.ph || e.dataset.jp ||
          (e.hasAttribute('data-hd') ? 'slider-handle' : '') ||
          e.textContent.trim().slice(0, 14) || e.className) +
          ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
    });
    return { small };
  }, where);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const V of VIEWPORTS) {
    note('\n== ' + V.name + ' ==');
    const page = await browser.newPage({ viewport: { width: V.w, height: V.h }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message)));
    await page.route('**/*', r => {
      const u = r.request().url();
      if (u.startsWith('file://')) return r.continue();
      if (u.includes('/api/detect')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DETECT_REPLY) });
      return r.fulfill({ status: 204, body: '' });
    });
    await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    await page.evaluate(({ pairs, work, walks, shots, imgs }) => {
      const table = t => t === 'workmanship_pairs' ? work : t === 'walks' ? walks : t === 'walk_shots' ? shots
        : (t === 'projects' || t === 'project_photos') ? [] : pairs;
      const supa = {
        from(t) { let op = 'select', row = null;
          const q = { select: () => q, order: () => q, eq: () => q, limit: () => q,
            insert(r2) { op = 'insert'; row = r2; return q; }, update(r2) { op = 'update'; row = r2; return q; },
            delete: () => q,
            then(res) { const data = op === 'select' ? table(t) : [{ id: (row && row.id) || 'x' }];
              return Promise.resolve({ data, error: null }).then(res); } };
          return q; },
        storage: { from: () => ({ upload: async () => ({ error: null }),
          download: async p => ({ data: await (await fetch(/before|bad/.test(p) ? imgs.before : imgs.after)).blob(), error: null }) }) },
        auth: { getUser: async () => ({ data: { user: { email: 'theo@cardinalrenovations.net' } } }),
                getSession: async () => ({ data: { session: { access_token: 'tok' } } }) }
      };
      Object.defineProperty(window, 'supa', { value: supa, writable: false, configurable: true });
      Object.defineProperty(window, 'is_admin', { value: () => true, writable: false, configurable: true });
      window.signedPhotoMap = async ps => { const o = {}; ps.forEach(p => {
        o[p] = /before|bad/.test(p) ? imgs.before : /walks/.test(p) ? imgs.walk : imgs.after; }); return o; };
      const lv = document.getElementById('landingView'); if (lv) lv.style.display = 'none';
    }, { pairs: PAIRS, work: WORK, walks: WALKS, shots: SHOTS, imgs: {
      before: swatch('#6E655C', 1600, 1000, 'BEFORE'), after: swatch('#22252A', 1600, 1000, 'AFTER'),
      walk: swatch('#3A3F46', 1600, 1200, 'ROOF') } });
    await page.evaluate(() => window.CardinalShowcase.open());
    await page.waitForTimeout(1000);
    if (V.lnav) {
      await page.evaluate(() => { window.__pin = setInterval(() => document.body.classList.add('cr-lnav-on'), 16); });
      await page.waitForTimeout(300);
    }

    // ── SHOWCASE TAB ──
    let sweep = await overlapSweep(page, '#cr-show');
    ok(V.name + ': showcase — no control overlaps', sweep.bad.length === 0, sweep.bad);
    ok(V.name + ': showcase — no horizontal overflow', !sweep.overflowX);
    let touch = await touchSweep(page, '#cr-show');
    ok(V.name + ': showcase — every control is at least 44px', touch.small.length === 0, touch.small);
    // slider drag
    const cmp = await page.locator('[data-cmp]').boundingBox();
    await page.mouse.move(cmp.x + cmp.width * 0.52, cmp.y + cmp.height / 2);
    await page.mouse.down();
    await page.mouse.move(cmp.x + cmp.width * 0.25, cmp.y + cmp.height / 2, { steps: 8 });
    await page.mouse.up();
    const split = await page.evaluate(() => parseFloat(
      getComputedStyle(document.querySelector('[data-cmp]')).getPropertyValue('--sh-split')));
    ok(V.name + ': slider drags', split < 40, split);
    // lens from the slider
    await page.click('[data-act="cmpexp"]'); await page.waitForTimeout(300);
    ok(V.name + ': slider ⤢ opens the lens', await page.evaluate(() => !!document.querySelector('.cr-sh-lens')));
    await page.click('.cr-sh-ln-x'); await page.waitForTimeout(200);
    // share composer
    await page.click('[data-act="share"]');
    const gotCanvas = await page.waitForFunction(() =>
      !!document.querySelector('#cr-show-form canvas.cr-sh-shprev'), { timeout: 8000 }).then(() => true).catch(() => false);
    ok(V.name + ': share composer draws', gotCanvas);
    sweep = await overlapSweep(page, '#cr-show-form');
    ok(V.name + ': composer — no control overlaps', sweep.bad.length === 0, sweep.bad);
    await page.click('#cr-show-form [data-act="cancel"]'); await page.waitForTimeout(200);
    // curtain call
    await page.click('[data-act="ccplay"]'); await page.waitForTimeout(600);
    ok(V.name + ': curtain call starts', await page.evaluate(() => !!document.querySelector('.cr-sh-cc')));
    await page.mouse.click(V.w / 2, V.h / 2); await page.waitForTimeout(300);
    ok(V.name + ': a touch stops the show', await page.evaluate(() => !document.querySelector('.cr-sh-cc')));

    // ── HALL OF FAME ──
    await page.click('[data-tab="work"]'); await page.waitForTimeout(500);
    sweep = await overlapSweep(page, '#cr-show');
    ok(V.name + ': hall of fame — no control overlaps', sweep.bad.length === 0, sweep.bad);
    touch = await touchSweep(page, '#cr-show');
    ok(V.name + ': hall of fame — every control is at least 44px', touch.small.length === 0, touch.small);
    await page.click('[data-lens]'); await page.waitForTimeout(300);
    ok(V.name + ': HoF photo opens the lens', await page.evaluate(() => !!document.querySelector('.cr-sh-lens')));
    await page.click('.cr-sh-ln-x'); await page.waitForTimeout(200);

    // ── THE WALK ──
    await page.click('[data-tab="walk"]'); await page.waitForTimeout(500);
    await page.click('[data-walk="0"]'); await page.waitForTimeout(500);
    sweep = await overlapSweep(page, '#cr-show');
    ok(V.name + ': walk view — no control overlaps', sweep.bad.length === 0, sweep.bad);
    // present
    await page.click('[data-act="present"]'); await page.waitForTimeout(700);
    ok(V.name + ': present opens', await page.evaluate(() =>
      document.getElementById('cr-show').classList.contains('presenting')));
    sweep = await overlapSweep(page, '.cr-sh-pres');
    ok(V.name + ': present — no control overlaps', sweep.bad.length === 0, sweep.bad);
    const ring = await page.evaluate(() => {
      const l = document.querySelector('.cr-sh-pres'), r = document.querySelector('.cr-sh-pr-ring');
      const L = l.getBoundingClientRect(), R = r.getBoundingClientRect();
      return { fx: (R.left - L.left) / L.width, inside: R.top >= L.top && R.bottom <= L.bottom };
    });
    ok(V.name + ': spotlight ring inside frame at fraction', Math.abs(ring.fx - 0.25) < 0.01 && ring.inside, ring);
    await page.click('.cr-sh-pr-x'); await page.waitForTimeout(300);
    // review: detect (stubbed route), draw a mark, save
    await page.click('[data-shot="0"]'); await page.waitForTimeout(500);
    sweep = await overlapSweep(page, '#cr-show');
    ok(V.name + ': review — no control overlaps', sweep.bad.length === 0, sweep.bad);
    touch = await touchSweep(page, '#cr-show');
    ok(V.name + ': review — every control is at least 44px', touch.small.length === 0, touch.small);
    await page.click('[data-act="rmark"]'); await page.waitForTimeout(200);
    const rev = await page.locator('[data-rev]').boundingBox();
    await page.mouse.move(rev.x + rev.width * 0.6, rev.y + rev.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(rev.x + rev.width * 0.82, rev.y + rev.height * 0.8, { steps: 8 });
    await page.mouse.up(); await page.waitForTimeout(300);
    ok(V.name + ': drawing opens classify sheet', await page.evaluate(() =>
      !!document.querySelector('.cr-sh-clsheet')));
    sweep = await overlapSweep(page, '#cr-show');
    ok(V.name + ': classify sheet — no control overlaps', sweep.bad.length === 0, sweep.bad);
    await page.click('[data-act="dkeep"]'); await page.waitForTimeout(300);
    page.once('dialog', d => d.accept());
    await page.click('[data-act="rsave"]'); await page.waitForTimeout(400);
    ok(V.name + ': save lands back on the walk', await page.evaluate(() =>
      document.querySelectorAll('#cr-show [data-shot]').length === 1));
    ok(V.name + ': no page errors', errors.length === 0, errors.slice(0, 2));

    /* ══════════════ SHOWROOM MODE (590) ══════════════ */
    await page.evaluate(() => window.CardinalShowcase.close(false));
    await page.waitForTimeout(200);
    /* The launcher row obeys the width rule — CSS, read from the real engine.
       NOTE the mount: this is the cr-lr landing (.cr-lr-show inside .cr-lr), NOT
       the dead #landQuick/#landLibrary markup near the top of the file, which is
       hidden by `#landingView>*{display:none}` and never in the DOM. A card added
       there passes every mechanical gate and is invisible — that is exactly what
       happened on the first pass of this build. */
    const cardVis = await page.evaluate(() => {
      const lv = document.getElementById('landingView');
      lv.style.display = 'block';
      const b = document.querySelector('.cr-lr-show[data-go="showroom"]');
      if (!b) return { missing: true, lrBuilt: lv.dataset.crLrBuilt || null };
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return { display: cs.display, w: Math.round(r.width), inline: b.getAttribute('style') };
    });
    const wantCard = V.w >= 820;
    ok(V.name + ': showroom card ' + (wantCard ? 'offered' : 'hidden on a phone'),
      !cardVis.missing && (wantCard ? cardVis.display === 'flex' && cardVis.w > 100
                                    : cardVis.display === 'none'), cardVis);
    ok(V.name + ': showroom card carries no inline style (styleMounts trap)',
      cardVis.inline === null, cardVis.inline);

    if (!wantCard) {
      // below 820 the opener must FALL BACK, never leave a dead button
      await page.evaluate(() => window.CardinalShowcase.open({ showroom: true }));
      await page.waitForTimeout(500);
      const fell = await page.evaluate(() => ({
        flag: window.CardinalShowcase.inShowroom(),
        cls: document.getElementById('cr-show').classList.contains('showroom'),
        back: !!document.querySelector('#cr-show [data-act="back"]')
      }));
      ok(V.name + ': phone falls back to the ordinary Showcase',
        fell.flag === false && fell.cls === false && fell.back === true, fell);
      await page.evaluate(() => window.CardinalShowcase.close(false));
    } else {
      // enter through the CARD, not the API — the wiring is part of the feature
      await page.evaluate(() => { document.querySelector('.cr-lr-show').click(); });
      await page.waitForTimeout(900);
      ok(V.name + ': the card opens the room', await page.evaluate(() =>
        window.CardinalShowcase.inShowroom() &&
        document.getElementById('cr-show').classList.contains('open') &&
        document.getElementById('cr-show').classList.contains('showroom')));

      /* THE assertion. Not "looks read-only" — a counted zero over every control
         actually in the DOM, on each of the three tabs, plus the walk and review
         screens underneath The Walk.

         The first version of this scan looked ONLY at [data-act] and returned a
         clean zero while the review screen still carried a per-finding remove
         button, an editable severity <select> and a resize grip — those use
         data-drop / data-sev / data-grip. A screenshot caught what the assertion
         missed. A counted zero is only as good as the list it counts against, so
         this now sweeps BOTH: the named write actions, and every form control and
         write-ish data-* attribute in the module, whatever it is called. */
      const WRITE = ['add','addjob','del','pub','save','share','sharedead','shdl','shnative',
        'waddc','waddwalk','wdelwalk','wjob','wphone','wpub','rdetect','rmark','rsave',
        'ddrop','dkeep'];
      const WRITE_ATTR = ['data-wdel','data-drop','data-sev','data-grip','data-def',
        'data-dsev','data-jp','data-proj','data-prgo'];
      const scanWrites = () => page.evaluate(({ WRITE, WRITE_ATTR }) => {
        const root = document.getElementById('cr-show');
        const found = [...root.querySelectorAll('[data-act]')]
          .map(e => e.dataset.act).filter(a => WRITE.indexOf(a) !== -1);
        WRITE_ATTR.forEach(a => root.querySelectorAll('[' + a + ']')
          .forEach(() => found.push(a)));
        // anything a finger can type into or pick from, by tag — name-independent
        root.querySelectorAll('select, textarea, input:not([type="file"])')
          .forEach(e => found.push(e.tagName.toLowerCase()));
        return { found, admin: root.querySelectorAll('.cr-sh-admin').length,
          rel: root.querySelectorAll('.cr-sh-rel-b').length,
          back: root.querySelectorAll('[data-act="back"]').length,
          out: root.querySelectorAll('[data-act="reports"]').length,
          exit: root.querySelectorAll('[data-act="exitroom"]').length };
      }, { WRITE, WRITE_ATTR });

      for (const t of ['showcase', 'work', 'walk']) {
        await page.evaluate(t => document.querySelector('[data-tab="' + t + '"]').click(), t);
        await page.waitForTimeout(600);
        const s = await scanWrites();
        ok(V.name + ': showroom/' + t + ' — zero write controls', s.found.length === 0, s.found);
        ok(V.name + ': showroom/' + t + ' — no admin bar', s.admin === 0, s.admin);
        ok(V.name + ': showroom/' + t + ' — no release badge (names another client)',
          s.rel === 0, s.rel);
        ok(V.name + ': showroom/' + t + ' — no back arrow, no way out to Inspections',
          s.back === 0 && s.out === 0, s);
        ok(V.name + ': showroom/' + t + ' — the ✕ is there', s.exit === 1, s.exit);
        const sw = await overlapSweep(page, '#cr-show');
        ok(V.name + ': showroom/' + t + ' — no control overlaps', sw.bad.length === 0, sw.bad);
        const tt = await touchSweep(page, '#cr-show');
        ok(V.name + ': showroom/' + t + ' — every control is at least 44px', tt.small.length === 0, tt.small);
        ok(V.name + ': showroom/' + t + ' — no horizontal overflow', !sw.overflowX);
      }

      // deeper: a walk, then a shot's review screen — the two surfaces that were
      // never amAdmin-gated at all
      await page.evaluate(() => document.querySelector('[data-walk="0"]').click());
      await page.waitForTimeout(600);
      let s = await scanWrites();
      ok(V.name + ': showroom/walk detail — zero write controls', s.found.length === 0, s.found);
      await page.evaluate(() => document.querySelector('[data-shot="0"]').click());
      await page.waitForTimeout(700);
      s = await scanWrites();
      ok(V.name + ': showroom/review — zero write controls', s.found.length === 0, s.found);
      ok(V.name + ': showroom/review — back and the lens survive', await page.evaluate(() =>
        !!document.querySelector('[data-act="rback"]') && !!document.querySelector('[data-act="rlens"]')));
      // the finding still READS, with its severity — read-only, not stripped
      const fnd = await page.evaluate(() => {
        const f = document.querySelector('.cr-sh-fnd');
        if (!f) return { missing: true };
        return { text: f.textContent.replace(/\s+/g, ' ').trim(),
          sev: !!f.querySelector('.sv'), sevText: (f.querySelector('.sv') || {}).textContent };
      });
      ok(V.name + ': showroom/review — the finding still reads, with severity',
        !fnd.missing && fnd.sev && /Impact bruising/.test(fnd.text), fnd);
      ok(V.name + ': showroom/review — no confidence % and no provenance',
        !/% sure/.test(fnd.text) && !/by hand/.test(fnd.text), fnd.text);

      // and the circles cannot be dragged: same gesture that moves a box normally
      const before = await page.evaluate(() => JSON.parse(JSON.stringify(
        document.querySelector('[data-box="0"]').getAttribute('style'))));
      const bb = await page.locator('[data-box="0"]').boundingBox();
      await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await page.mouse.down();
      await page.mouse.move(bb.x + bb.width / 2 + 90, bb.y + bb.height / 2 + 60, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => {
        const b = document.querySelector('[data-box="0"]');
        return b ? b.getAttribute('style') : null;
      });
      ok(V.name + ': showroom — a damage circle cannot be dragged', after === before, { before, after });

      // Present ▶ still works — it is the presentation, not an edit
      await page.evaluate(() => document.querySelector('[data-act="rback"]').click());
      await page.waitForTimeout(400);
      await page.evaluate(() => document.querySelector('[data-act="present"]').click());
      await page.waitForTimeout(700);
      ok(V.name + ': showroom — Present still runs', await page.evaluate(() =>
        document.getElementById('cr-show').classList.contains('presenting')));
      await page.evaluate(() => document.querySelector('.cr-sh-pr-x').click());
      await page.waitForTimeout(300);

      /* Exit: a TAP must do nothing, a HOLD must leave. */
      const ex = await page.locator('[data-act="exitroom"]').boundingBox();
      await page.mouse.click(ex.x + ex.width / 2, ex.y + ex.height / 2);
      await page.waitForTimeout(400);
      ok(V.name + ': showroom — a tap on ✕ does NOT exit', await page.evaluate(() =>
        window.CardinalShowcase.inShowroom() &&
        document.getElementById('cr-show').classList.contains('open')));

      await page.mouse.move(ex.x + ex.width / 2, ex.y + ex.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(420);
      const midRing = await page.evaluate(() => {
        const r = document.querySelector('.cr-sh-exit .ring');
        return r ? r.style.getPropertyValue('--sh-hold') : '';
      });
      ok(V.name + ': showroom — the ring fills while held',
        /^\d/.test(midRing) && parseFloat(midRing) > 60 && parseFloat(midRing) < 300, midRing);
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.waitForTimeout(400);
      ok(V.name + ': showroom — holding ✕ leaves the room', await page.evaluate(() =>
        !window.CardinalShowcase.inShowroom() &&
        !document.getElementById('cr-show').classList.contains('open') &&
        !document.getElementById('cr-show').classList.contains('showroom')));

      // releasing early cancels, and leaves no rAF running
      await page.evaluate(() => {
        document.getElementById('landingView').style.display = 'block';
        document.querySelector('.cr-lr-show').click();
      });
      await page.waitForTimeout(800);
      const ex2 = await page.locator('[data-act="exitroom"]').boundingBox();
      await page.mouse.move(ex2.x + ex2.width / 2, ex2.y + ex2.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(300);
      await page.mouse.up();
      await page.waitForTimeout(600);
      ok(V.name + ': showroom — releasing early cancels and the ring resets',
        await page.evaluate(() => window.CardinalShowcase.inShowroom() &&
          (document.querySelector('.cr-sh-exit .ring').style.getPropertyValue('--sh-hold') || '0deg') === '0deg'));

      // and the flag cannot leak: an ordinary open() clears it
      await page.evaluate(() => window.CardinalShowcase.open());
      await page.waitForTimeout(500);
      ok(V.name + ': an ordinary open() clears showroom', await page.evaluate(() =>
        !window.CardinalShowcase.inShowroom() &&
        !document.getElementById('cr-show').classList.contains('showroom') &&
        !!document.querySelector('#cr-show [data-act="back"]')));
      ok(V.name + ': admin controls come BACK outside the room', await page.evaluate(() =>
        !!document.querySelector('#cr-show [data-act="add"]')));
    }
    ok(V.name + ': no page errors after the showroom pass', errors.length === 0, errors.slice(0, 2));

    if (V.name.startsWith('iPad')) {
      const cdp = await page.context().newCDPSession(page);
      await page.evaluate(() => { document.querySelector('[data-tab="showcase"]').click(); });
      await page.waitForTimeout(600);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      fs.writeFileSync('/tmp/audit-' + V.w + 'x' + V.h + '.png', Buffer.from(data, 'base64'));
      await cdp.detach();
    }
    await page.close();
  }
  await browser.close();
  console.log('\n' + (fail === 0 ? 'GREEN' : 'RED') + ` — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
