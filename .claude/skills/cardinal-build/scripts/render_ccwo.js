/* Build 707 — Work Orders on the black card, rendered by the REAL modules.

   Loads the real document, hands it a community project whose checklist
   STRING carries two work_orders entries plus an admin currentUser, and lets
   cr-cc-script + cr-wo-script build the card and the section themselves.
   Measures every ink in BOTH themes (per-layer composited grounds — the
   render_ccpay walk). 706 could not render this at all: the read path
   returned [] off the string, so items never existed.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_ccwo.js [index.html] */
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
          if (v.length >= 3) stops.push({ rgb: v.slice(0, 3), a: v.length === 4 ? v[3] : 1 });
        });
        if (stops.length) layers.push(stops);
      }
    }
    const c = px(cs.backgroundColor);
    if (c.length >= 3 && !(c.length === 4 && c[3] === 0))
      layers.push([{ rgb: c.slice(0, 3), a: c.length === 4 ? c[3] : 1 }]);
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
    let cands = [{ rgb: [255, 255, 255] }];
    for (let i = layers.length - 1; i >= 0; i--) {
      const next = [];
      for (const st of layers[i]) for (const under of cands)
        next.push({ rgb: st.rgb.map((v, k) => Math.round(v * st.a + under.rgb[k] * (1 - st.a))) });
      cands = next.slice(0, 12);
    }
    return cands;
  }
  const lum = ([r, g, b]) => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
  const box = document.getElementById('cr-cc-wo');
  if (!box || !box.querySelector('.cr-wo-section')) return { missing: true };
  const rows = [];
  for (const [name, sel] of [
    ['hint', '.cr-wo-hint'], ['item name', '.cr-wo-item .name'], ['item meta', '.cr-wo-item .meta'],
    ['Open btn', '.cr-wo-item [data-act="view"]'], ['Del btn', '.cr-wo-item button.danger'],
    ['Upload btn', '.cr-wo-upload button']]) {
    const el = box.querySelector(sel);
    if (!el) { rows.push({ name, absent: true }); continue; }
    const ink = px(getComputedStyle(el).color);
    let worst = null;
    for (const g of grounds(el)) {
      const r = ratio(ink.slice(0, 3), g.rgb);
      if (!worst || r < worst.r) worst = r < (worst && worst.r || 99) ? { r } : worst;
      if (!worst || r < worst.r) worst = { r };
    }
    rows.push({ name, ink: getComputedStyle(el).color, ratio: Number(worst.r.toFixed(2)) });
  }
  const title = box.querySelector('.cr-wo-title');
  const ids = ['cr-cc-jm', 'cr-cc-pp', 'cr-cc-wo', 'cr-cc-loc'].map(id => {
    const e = document.getElementById(id);
    return e ? Array.prototype.indexOf.call(e.parentNode.children, e) : -1;
  });
  return { rows, order: ids,
    items: box.querySelectorAll('.cr-wo-item').length,
    titleHidden: title ? getComputedStyle(title).display === 'none' : null,
    text: box.textContent.replace(/\\s+/g, ' ').trim().slice(0, 140) };
})()`;

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await br.newPage({ viewport: { width: 390, height: 1200 } });
  p.on('pageerror', () => {});
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);

  await p.evaluate(() => {
    window.currentUser = { email: 'theo@cardinalrenovations.net' };
    window.currentProject = { id: 'rt-707', name: 'Karrie Johnson — City of Kettering',
      stage: 'Lead', address: '804 E Center St, Germantown',
      checklist: JSON.stringify({
        lead: { claim_type: 'community', partner_name: 'City of Kettering', homeowner_name: 'Karrie Johnson' },
        work_orders: [
          { name: 'KH-WorkOrder-2216.pdf', path: 'work_orders/rt-707/1_KH.pdf',
            uploaded_by: 'theo@cardinalrenovations.net', uploaded_at: '2026-08-11T01:00:00Z', size: 482000, type: 'application/pdf' },
          { name: 'Bathroom-punch.pdf', path: 'work_orders/rt-707/2_BP.pdf',
            uploaded_by: 'joan@cardinalrenovations.net', uploaded_at: '2026-08-10T14:00:00Z', size: 90500, type: 'application/pdf' },
        ] }) };
    document.getElementById('projectView').style.display = 'block';
  });
  await p.waitForTimeout(1400);

  for (const [label, theme] of [['dark', null], ['light', 'rb-light']]) {
    await p.evaluate(t => {
      if (t) document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
    }, theme);
    await p.waitForTimeout(150);
    const m = await p.evaluate(MEASURE);
    console.log('\n── ' + label + ' ──');
    if (m.missing) { ok(label + ' · the REAL modules rendered the WO section on the card', false, 'missing'); continue; }
    if (theme === null) {
      ok('the REAL modules rendered 2 work-order items on the card', m.items === 2, m.items);
      ok('no emoji anywhere in the section', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(m.text), m.text);
      ok('the inner cream title is hidden (cc-sect heading names the section)', m.titleHidden === true, m.titleHidden);
      ok('order: Job Menu → Partner & Property → Work Orders → Location',
        m.order[0] < m.order[1] && m.order[1] < m.order[2] && m.order[2] < m.order[3], JSON.stringify(m.order));
    }
    for (const r of m.rows) {
      if (r.absent) { console.log('   (absent: ' + r.name + ')'); continue; }
      console.log('   ' + (r.ratio >= 4.5 ? ' ok  ' : ' FAIL ') + r.name.padEnd(12) +
        String(r.ratio).padStart(6) + ':1  ' + r.ink);
      ok(label + ' · ' + r.name + ' reads (' + r.ratio + ':1)', r.ratio >= 4.5, r.ratio);
    }
    await p.evaluate(() => {
      const b = document.getElementById('cr-cc-wo');
      if (b) window.scrollTo(0, Math.max(0, b.getBoundingClientRect().top + window.scrollY - 140));
    });
    await p.waitForTimeout(100);
    await p.screenshot({ path: SHOT + 'ccwo-' + label + '.png', clip: { x: 0, y: 0, width: 390, height: 620 } });
  }

  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
