/* Build 706 — Partner & Property, rendered by the REAL module and measured.

   Unlike harness_706 (logic, jsdom) this loads the real document in Chromium,
   hands it a community-shaped currentProject, and lets cr-cc-script build the
   whole card itself — takeover, sections, ppSync and all. Network is aborted,
   so the partner roster is empty and the card exercises the legacy
   bare-name fallback path (l.partner_name) — which is also one of the two
   live DB shapes.

   Measures every text element of the new section against the worst ground an
   ancestor actually paints — per-LAYER, top layer first (the render_ccpay
   lesson: an element's border-box gradient never sits under its text), in
   BOTH themes (--ccm-* flips under rb-light).

   Usage: NODE_PATH=<scratchpad>/node_modules node render_ccpp.js [index.html] */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const MEASURE = `(() => {
  const px = s => (s.match(/[\\d.]+/g) || []).map(Number);
  function bgLayers(cs) {
    const layers = [];
    const img = cs.backgroundImage;
    if (img && img !== 'none') {
      let depth = 0, cur = ''; const parts = [];
      for (const ch of img) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim()) parts.push(cur);
      for (const part of parts) {
        const stops = [];
        (part.match(/rgba?\\([^)]+\\)/g) || []).forEach(s => {
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
    const layers = []; let covered = false;
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
  const out = [];
  const box = document.getElementById('cr-cc-pp');
  if (!box) return { missing: true };
  for (const [name, sel] of [
    ['label .ppk', '.ppk'], ['value .ppv', '.ppv'], ['small (dim)', '.pprow small'],
    ['chip', '.ppchip'], ['button', '.ppacts button']]) {
    const el = box.querySelector(sel);
    if (!el) { out.push({ name, absent: true }); continue; }
    const ink = px(getComputedStyle(el).color);
    let worst = null;
    for (const g of grounds(el)) {
      const r = ratio(ink.slice(0, 3), g.rgb);
      if (!worst || r < worst.r) worst = { r, css: g.css };
    }
    out.push({ name, ink: getComputedStyle(el).color, ground: worst.css,
      ratio: Number(worst.r.toFixed(2)), size: parseFloat(getComputedStyle(el).fontSize) });
  }
  const ids = ['cr-cc-jm', 'cr-cc-pp', 'cr-cc-loc'].map(id => {
    const e = document.getElementById(id);
    return e ? Array.prototype.indexOf.call(e.parentNode.children, e) : -1;
  });
  return { rows: out, order: ids,
    text: box.textContent.replace(/\\s+/g, ' ').trim().slice(0, 160) };
})()`;

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await br.newPage({ viewport: { width: 390, height: 1100 } });
  p.on('pageerror', () => {});
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);

  await p.evaluate(() => {
    window.currentProject = { id: 'rt-706', name: 'Karrie Johnson — City of Kettering',
      stage: 'Lead', address: '804 E Center St, Germantown',
      checklist: JSON.stringify({ lead: {
        claim_type: 'community', partner_name: 'City of Kettering',
        homeowner_name: 'Karrie Johnson',
        renter_name: 'Rita Renter', renter_phone: '555-0110' } }) };
    document.getElementById('projectView').style.display = 'block';
  });
  await p.waitForTimeout(1200);   /* let the module's observer build the card */

  for (const [label, theme] of [['dark', null], ['light', 'rb-light']]) {
    await p.evaluate(t => {
      if (t) document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
    }, theme);
    await p.waitForTimeout(150);
    const m = await p.evaluate(MEASURE);
    console.log('\n── ' + label + ' ──');
    if (m.missing) { ok(label + ' · the REAL module rendered #cr-cc-pp', false, 'missing'); continue; }
    if (theme === null) {
      ok('the REAL module rendered the section (bare-name fallback path)',
        m.text.includes('City of Kettering'), m.text);
      ok('the renter line is on the card (CR-COM-016)', m.text.includes('Rita Renter'), m.text);
      ok('the property row explains itself without a partner id',
        m.text.includes('Attach a partner to choose a property.'), m.text);
      ok('section order: Job Menu → Partner & Property → Location',
        m.order[0] < m.order[1] && m.order[1] < m.order[2], JSON.stringify(m.order));
    }
    for (const r of m.rows) {
      if (r.absent) { console.log('   (absent in this state: ' + r.name + ')'); continue; }
      const floor = r.size >= 18 ? 3.0 : 4.5;
      console.log('   ' + (r.ratio >= floor ? ' ok  ' : ' FAIL ') + r.name.padEnd(16) +
        String(r.ratio).padStart(6) + ':1  ' + r.ink + ' on ' + r.ground);
      ok(label + ' · ' + r.name + ' reads (' + r.ratio + ':1)', r.ratio >= floor, r.ratio);
    }
    const el = await p.evaluate(() => {
      const b = document.getElementById('cr-cc-pp');
      const r = b.getBoundingClientRect();
      window.scrollTo(0, Math.max(0, r.top - 120));
      return null;
    });
    void el;
    await p.waitForTimeout(100);
    await p.screenshot({ path: SHOT + 'ccpp-' + label + '.png', clip: { x: 0, y: 0, width: 390, height: 560 } });
  }

  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
