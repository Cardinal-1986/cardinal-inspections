/* Build 705 — the payments door, measured in a real engine.

   Two questions jsdom cannot answer:
     1. Does the new Payment Information tile READ on the black card?
        (.cc-jmb paints through --ccm-* tokens and a gradient border trick —
        jsdom returns rgba(0,0,0,0) for all of it.)
     2. Does the round trip hold? openPaymentsPage() must swap the whole view,
        and payBackBtn/dbCloseTo() must bring #projectView back. Also watch
        for CR-COM-021's shape: more than one #dbMap after the return.

   Loads the REAL document (never concatenated <style> scrapes), injects the
   Job Menu exactly as the shipped syncJobMenu emits it, and measures inks
   against the WORST ground an ancestor actually paints — alpha layers
   composited over what's beneath (the render_pcard.js lessons).

   The round trip runs against the SHIPPED openPaymentsPage/dbCloseTo with a
   stub currentProject; any throw is reported, not hidden.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_ccpay.js [index.html] */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await br.newPage({ viewport: { width: 390, height: 900 } });
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);

  /* ── 1 · the tile on the black card, measured ── */
  const m = await p.evaluate(() => {
    const cc = document.createElement('div');
    cc.id = 'cr-cc';
    cc.style.cssText = 'position:fixed;inset:auto 0 0 0;top:0;overflow:auto;z-index:99999;padding:14px;';
    cc.innerHTML =
      '<h3 class="cc-sect">Job Menu</h3><div class="cc-jm" id="cr-cc-jm">' +
      '<button class="cc-jmb" data-jm="0" type="button"><span class="l">Documents</span><span class="n">3</span></button>' +
      '<button class="cc-jmb" data-jm="1" type="button"><span class="l">Photos</span><span class="n z">0</span></button>' +
      '<button class="cc-jmb" data-jm="pay" type="button"><span class="l">Payment Information</span></button>' +
      '</div>';
    document.body.appendChild(cc);

    const px = s => (s.match(/[\d.]+/g) || []).map(Number);
    /* alpha layers composite over the ground beneath — render_pcard's walk,
       PLUS one correction that walk did not need: within one element,
       background LAYERS stack in listed order (first = topmost). The .cc-jmb
       trick paints an OPAQUE card gradient over an emerald border gradient
       (`…card) padding-box, var(--ccm-edge2) border-box`) — pooling all stops
       of one element scored the label against the border paint, 1.74:1, when
       the border layer never shows under the text. Split each element's
       backgroundImage into top-level comma layers and stop at the first layer
       whose every stop is opaque. */
    function bgLayers(cs) {
      const layers = [];
      const img = cs.backgroundImage;
      if (img && img !== 'none') {
        let depth = 0, cur = '';
        const parts = [];
        for (const ch of img) {
          if (ch === '(') depth++;
          if (ch === ')') depth--;
          if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
          cur += ch;
        }
        if (cur.trim()) parts.push(cur);
        for (const part of parts) {
          const stops = [];
          (part.match(/rgba?\([^)]+\)/g) || []).forEach(s => {
            const v = px(s);
            if (v.length >= 3) stops.push({ rgb: v.slice(0, 3), a: v.length === 4 ? v[3] : 1, css: s });
          });
          if (stops.length) layers.push(stops);
        }
      }
      const c = px(cs.backgroundColor);
      if (c.length >= 3 && !(c.length === 4 && c[3] === 0))
        layers.push([{ rgb: c.slice(0, 3), a: c.length === 4 ? c[3] : 1, css: cs.backgroundColor }]);
      return layers;
    }
    function grounds(el) {
      const layers = [];   /* global top→bottom list of per-layer stop sets */
      let covered = false;
      for (let n = el; n && n.nodeType === 1 && !covered; n = n.parentElement) {
        for (const layer of bgLayers(getComputedStyle(n))) {
          layers.push(layer);
          if (layer.every(s => s.a >= 1)) { covered = true; break; }
        }
      }
      let cands = [{ rgb: [255, 255, 255], css: '#fff(fallthrough)' }];
      for (let i = layers.length - 1; i >= 0; i--) {
        const next = [];
        for (const st of layers[i]) for (const under of cands)
          next.push({ rgb: st.rgb.map((v, k) => Math.round(v * st.a + under.rgb[k] * (1 - st.a))),
            css: st.a < 1 ? st.css + ' over ' + under.css : st.css });
        cands = next.slice(0, 12);
      }
      return cands;
    }
    const lum = ([r, g, b]) => {
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);

    const tile = cc.querySelector('[data-jm="pay"]');
    const lbl = tile.querySelector('.l');
    const ink = px(getComputedStyle(lbl).color);
    let worst = null;
    for (const g of grounds(lbl)) {
      const r = ratio(ink.slice(0, 3), g.rgb);
      if (!worst || r < worst.r) worst = { r, css: g.css };
    }
    const box = tile.getBoundingClientRect();
    const neighbor = cc.querySelector('[data-jm="0"]').getBoundingClientRect();
    return {
      ink: getComputedStyle(lbl).color,
      worstGround: worst.css,
      contrast: Number(worst.r.toFixed(2)),
      tileH: Math.round(box.height),
      tileW: Math.round(box.width),
      neighborH: Math.round(neighbor.height)
    };
  });
  console.log('── the tile ──  ink ' + m.ink + '  worst ground ' + m.worstGround +
    '  → ' + m.contrast + ':1  (' + m.tileW + '×' + m.tileH + 'px, neighbors ' + m.neighborH + 'px)');
  ok('Payment Information reads on the black card (' + m.contrast + ':1 ≥ 4.5)', m.contrast >= 4.5, m.contrast);
  /* the shipped .cc-jmb tiles are 43px; matching the neighbours is what this
     build owns — resizing the whole Job Menu is not Phase 1 scope */
  ok('tap target matches its neighbour tiles (' + m.tileH + 'px)', m.tileH === m.neighborH,
    m.tileH + ' vs ' + m.neighborH);

  await p.screenshot({ path: SHOT + 'ccpay-tile.png', clip: { x: 0, y: 0, width: 390, height: 260 } });

  /* ── 2 · the round trip, on the SHIPPED functions ── */
  const rt = await p.evaluate(() => {
    const out = { steps: [], errors: [] };
    const disp = id => { const e = document.getElementById(id); return e ? getComputedStyle(e).display : 'MISSING'; };
    try {
      /* community-shaped, or the cc module's own render() correctly tears the
         injected #cr-cc down (isCommunity → projClaimType reads lead.claim_type) */
      window.currentProject = { id: 'rt-705', name: 'Round Trip', stage: 'Lead',
        address: '1 Test St', checklist: JSON.stringify({ lead: {
          claim_type: 'community', partner_name: 'City of Kettering',
          homeowner_name: 'Karrie Johnson' } }) };
      document.getElementById('projectView').style.display = 'block';
      out.before = { project: disp('projectView'), payments: disp('paymentsView') };
      try { window.openPaymentsPage(); }
      catch (e) { out.errors.push('openPaymentsPage: ' + e.message); }
      out.open = { project: disp('projectView'), payments: disp('paymentsView') };
      try { document.getElementById('payBackBtn').click(); }
      catch (e) { out.errors.push('payBackBtn: ' + e.message); }
      out.back = { project: disp('projectView'), payments: disp('paymentsView') };
      out.dbMaps = document.querySelectorAll('#dbMap, [id="dbMap"]').length;
    } catch (e) { out.errors.push('rig: ' + e.message); }
    return out;
  });
  /* the cc module's body observer runs AFTER this evaluate returns — the
     first draft checked #cr-cc synchronously and caught the module mid-cycle
     (it had correctly torn down the step-1 injection while currentProject was
     still undefined). The claim that matters is the END state: back from
     payments on a community job, the module owns the page with a black card. */
  await p.waitForTimeout(900);
  const end = await p.evaluate(() => ({
    cc: !!document.getElementById('cr-cc'),
    own: document.getElementById('projectView').classList.contains('cr-cc-own'),
    dbMaps: document.querySelectorAll('#dbMap, [id="dbMap"]').length
  }));
  console.log('── round trip ──', JSON.stringify(rt), ' end:', JSON.stringify(end));
  ok('openPaymentsPage swaps the view (project hidden, payments shown)',
    rt.open && rt.open.project === 'none' && rt.open.payments === 'block', JSON.stringify(rt.open));
  ok('Back restores #projectView and hides payments',
    rt.back && rt.back.project === 'block' && rt.back.payments === 'none', JSON.stringify(rt.back));
  ok('at most one #dbMap after the return (CR-COM-021 watch)',
    rt.dbMaps <= 1 && end.dbMaps <= 1, rt.dbMaps + '/' + end.dbMaps);
  ok('the module re-raises the black card for the community job', end.cc === true, JSON.stringify(end));
  if (!end.own) console.log('  (info: cr-cc-own not set — takeOver() keys on offsetParent visibility, expected in a stub rig)');
  if (rt.errors.length) console.log('  (reported, not hidden: ' + rt.errors.join(' | ') + ')');
  if (pageErrors.length) console.log('  (page errors during load/trip: ' + pageErrors.slice(0, 5).join(' | ') + ')');

  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
