/* render_1194 — REAL Chromium render of WHAT WE FOUND (Slice 2).
   Proves in a real engine what jsdom cannot: the composed dark ground
   composites dark (<0.15 luminance) right after the warm-light Plans
   (>0.8) — the §11 transition; every ink on the evidence chapter clears
   its floor against the composited ground (gradient stops included);
   every control ≥44px; no sideways scroll; the marks land INSIDE the
   photograph's box. Also captures the §17 proof screenshots at iPad
   landscape into --shots <dir>.

   The photographs served are a STAGED FIXTURE (watermarked as such in
   the image itself) — the production photos bucket is private and no
   customer evidence is used, so nothing here can be mistaken for it.

   Control: point it at the 1193 artifact — the found pane never paints. */
import fs from 'node:fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('render_1194: playwright not found'); process.exit(2); }
const FILE = process.argv[2];
const SHOTS = (() => { const i = process.argv.indexOf('--shots');
  return i > 0 ? process.argv[i + 1] : ''; })();
if (SHOTS && !fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
const html = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };

/* the staged fixture photograph — unmistakably not customer evidence */
const FIXTURE_SVG = (hue) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#aebfcb"/><stop offset="1" stop-color="#8fa2ad"/></linearGradient>
  <linearGradient id="lt" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="rgba(255,255,255,.16)"/><stop offset="1" stop-color="rgba(0,0,0,.22)"/></linearGradient></defs>
  <rect width="1200" height="240" fill="url(#sky)"/>
  <rect y="200" width="1200" height="700" fill="${hue}"/>
  ${Array.from({ length: 11 }, (_, r) =>
    Array.from({ length: 13 }, (_, c) =>
      `<rect x="${c * 96 + (r % 2 ? 48 : 0) - 48}" y="${210 + r * 64}" width="92" height="60" fill="${hue}" stroke="rgba(0,0,0,.28)" stroke-width="2" rx="2"/>`
    ).join('')).join('')}
  <rect y="200" width="1200" height="700" fill="url(#lt)"/>
  <rect x="850" y="90" width="130" height="230" fill="#7a6a5e" stroke="rgba(0,0,0,.3)" stroke-width="3"/>
  <text x="24" y="874" font-family="monospace" font-size="30" fill="rgba(255,255,255,.85)"
    stroke="rgba(0,0,0,.5)" stroke-width="1">STAGED FIXTURE — NOT CUSTOMER EVIDENCE</text>
</svg>`;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1194, height: 834 } });
const p = await ctx.newPage();
await p.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('https://ap.test/'))
    return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  if (u.startsWith('https://ximg.test/'))
    return r.fulfill({ status: 200, contentType: 'image/svg+xml',
      body: FIXTURE_SVG(u.includes('b-') ? '#5d554e' : '#4e4a46') });
  return r.fulfill({ status: 200, body: '' });
});
const errs = []; p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await p.goto('https://ap.test/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);

await p.evaluate(() => {
  const CK = { structure: 'Single-family residence', method: 'Full inspection',
    attic: 'Accessed', age: '18 years', condition: 'Fair', layers: '1 Layer',
    decking: 'OSB', pitch: '6/12', rooftype: 'Asphalt shingles',
    leak: 'No', wind: 'Yes', hail: 'Yes', granule: 'Mild', flash: 'Yes',
    boot: 'No', bio: 'No', deckcond: 'Good', attic_deck: 'Good', light: 'No',
    baffles: 'Blocked', soffit: 'Yes', ductout: 'Yes', ventcond: 'Good — balanced',
    fluecond: 'Good', completed_at: '2026-08-30T14:00:00Z',
    meas: { sq: '24.3', pitch: '6/12', ridge: '48', valley: '31', eave: '96' } };
  const rows = [{ id: 'p1', name: 'Kim Lawson', stage: 'Approved',
                  address: '12 Oak St, Dayton OH', checklist: JSON.stringify(CK) },
                { id: 'p9', name: 'Empty Job', stage: 'Lead', checklist: '{}' }];
  const shots = [
    { id: 's1', path: 'walks/w1/a.jpg', caption: 'The south slope, from the ridge',
      findings: [
        { defect: 'hail_impact', severity: 'crit', label: 'Impact bruising, south slope',
          box: { x: 0.30, y: 0.46, w: 0.16, h: 0.13 } },
        { defect: 'wind_lifted', severity: 'warn', label: 'Lifted tab at the rake',
          box: { x: 0.66, y: 0.34, w: 0.11, h: 0.10 } }
      ], ai_quality: null, reviewed_at: '2026-08-30', sort_order: 0 },
    { id: 's2', path: 'walks/w1/b-flash.jpg', caption: 'Chimney counter-flashing',
      findings: [
        { defect: 'flashing_failed', severity: 'crit', label: 'Counter-flashing pulled from the mortar',
          box: { x: 0.64, y: 0.14, w: 0.18, h: 0.22 } }
      ], ai_quality: null, reviewed_at: '2026-08-30', sort_order: 1 },
    { id: 's3', path: 'walks/w1/c.jpg', caption: '',
      findings: [], ai_quality: 'poor', reviewed_at: '2026-08-30', sort_order: 2 }
  ];
  const mk = t => { const q = { _t: t, _eq: {} };
    for (const m of ['select', 'order', 'limit']) q[m] = () => q;
    q.eq = (k, v) => { q._eq[k] = v; return q; };
    q.single = () => q; q.maybeSingle = () => q;
    q.then = res => {
      let data = [];
      if (q._t === 'projects') data = rows.filter(r => !q._eq.id || r.id === q._eq.id);
      else if (q._t === 'walks') data = (q._eq.project_id === 'p1') ? [{ id: 'w1' }] : [];
      else if (q._t === 'walk_shots') data = (q._eq.walk_id === 'w1') ? shots : [];
      else if (q._t === 'workmanship_pairs') data = [{ id: 'wp1' }];
      return Promise.resolve({ data }).then(res);
    };
    return q; };
  Object.defineProperty(window, 'supa', { value: { from: t => mk(t),
    storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }),
                              createSignedUrl:  () => Promise.resolve({ data: {} }) }) } },
    writable: false });
  window.patchProjectCk = () => Promise.resolve();
  window.signedPhotoMap = paths => {
    const m = {}; paths.forEach(pp => { m[pp] = 'https://ximg.test/' + pp.split('/').pop(); });
    return Promise.resolve(m);
  };
});

const shoot = async (name) => {
  if (!SHOTS) return;
  const cdp = await ctx.newCDPSession(p);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(SHOTS + '/' + name + '.png', Buffer.from(data, 'base64'));
  await cdp.detach();
};

/* the ink/tap/overflow probe — the render_gs1191 pattern */
const probe = async (name) => {
  const res = await p.evaluate(() => {
    const out = { low: [], texts: 0, wide: false, tap: [], lum: null, marksIn: true };
    const v = document.getElementById('cr-appt');
    const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = (r, g, bb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bb);
    const parse = s => { const m = String(s).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
      return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
    const grounds = el => { const g = [];
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n); const bc = parse(cs.backgroundColor);
        if (bc && bc.a > 0.85) g.push(bc);
        for (const m of (cs.backgroundImage || '').matchAll(/rgba?\([^)]+\)/g)) {
          const s2 = parse(m[0]); if (s2 && s2.a > 0.85) g.push(s2); }
        if (g.length && bc && bc.a > 0.99) break; }
      if (!g.length) g.push({ r: 5, g: 6, b: 7, a: 1 }); return g; };
    const pg = parse(getComputedStyle(v).backgroundColor);
    if (pg) out.lum = L(pg.r, pg.g, pg.b);
    const walk = document.createTreeWalker(v, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = walk.nextNode())) {
      const s = (t.nodeValue || '').trim(); if (!s) continue;
      const el = t.parentElement; if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const rc = el.getBoundingClientRect(); if (rc.width < 1 || rc.height < 1) continue;
      if (el.disabled) continue;
      const ink = parse(cs.color); if (!ink) continue;
      out.texts++;
      const li = L(ink.r, ink.g, ink.b);
      let worst = 99;
      for (const g of grounds(el)) { const lg = L(g.r, g.g, g.b);
        const c = (Math.max(li, lg) + 0.05) / (Math.min(li, lg) + 0.05); if (c < worst) worst = c; }
      const px = parseFloat(cs.fontSize) || 16; const bold = (parseInt(cs.fontWeight) || 400) >= 700;
      const floor = (px >= 24 || (px >= 18.66 && bold)) ? 3.0 : 4.5;
      if (worst < floor) out.low.push(s.slice(0, 40) + ' | ' + cs.color + ' ' + px.toFixed(1) + 'px = ' + worst.toFixed(2) + ':1');
    }
    out.wide = v && v.scrollWidth > document.documentElement.clientWidth + 1;
    for (const el of v.querySelectorAll('button, textarea, input')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.width < 44 || r.height < 44) out.tap.push((el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    for (const mk2 of v.querySelectorAll('.wf-mark')) {
      const ph = mk2.closest('.wf-ph'); if (!ph) { out.marksIn = false; continue; }
      const a = mk2.getBoundingClientRect(), bb = ph.getBoundingClientRect();
      if (a.left < bb.left - 1 || a.right > bb.right + 1 || a.top < bb.top - 1 || a.bottom > bb.bottom + 1)
        out.marksIn = false;
    }
    return out;
  });
  ok(name + ': renders real text', res.texts > 5, 'texts=' + res.texts);
  ok(name + ': every ink clears its floor', res.low.length === 0, res.low.join(' || '));
  ok(name + ': no sideways scroll', !res.wide);
  ok(name + ': every control >=44px', res.tap.length === 0, res.tap.join(' | '));
  ok(name + ': marks stay inside their photograph', res.marksIn);
  return res;
};

const opened = await p.evaluate(async () => {
  if (!window.CardinalAppointment) return false;
  await window.CardinalAppointment.open();
  return true;
});
ok('module opens', opened);
await p.waitForTimeout(700);
await p.evaluate(() => { const j = document.querySelector('#cr-appt .ap-job'); j && j.click(); });
await p.waitForTimeout(900);

/* the warm side, for the transition delta */
const plansLum = await p.evaluate(() => {
  for (let i = 0; i < 3; i++) { const n = document.querySelector('#cr-appt [data-gs="next"]'); n && n.click(); }
  return null;
});
await p.waitForTimeout(700);
const lumL = await p.evaluate(() => {
  const v = document.getElementById('cr-appt');
  const m = String(getComputedStyle(v).backgroundColor).match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return m ? 0.2126 * lin(+m[1]) + 0.7152 * lin(+m[2]) + 0.0722 * lin(+m[3]) : null;
});
ok('Plans composites LIGHT (the conversation layer)', lumL !== null && lumL > 0.8, 'lum=' + lumL);

/* Next from Plans -> What We Found */
await p.evaluate(() => { const n = document.querySelector('#cr-appt [data-gs="next"]'); n && n.click(); });
await p.waitForTimeout(1100);
const onFound = await p.evaluate(() => !!document.querySelector('#cr-appt [data-gs-pane="found"]'));
ok('Next from Plans lands on What We Found', onFound);
const r1 = await probe('found opening');
ok('the room quiets down: found composites DARK', r1.lum !== null && r1.lum < 0.15, 'lum=' + r1.lum);
await shoot('gs2_1_found_opening');

/* a story brought forward */
await p.evaluate(() => { const s = document.querySelector('#cr-appt .wf-story'); s && s.click(); });
await p.waitForTimeout(300);
await probe('story brought forward');
await shoot('gs2_3_findings_nav');

/* scrolled to the serviceable + numbers */
await p.evaluate(() => {
  const el = [...document.querySelectorAll('#cr-appt .wf-sec')]
    .find(h => h.textContent.includes('Holding up well'));
  el && el.scrollIntoView({ block: 'start' });
});
await p.waitForTimeout(300);
ok('Holding up well + numbers render', await p.evaluate(() =>
  document.querySelector('#cr-appt').textContent.includes('Holding up well') &&
  document.querySelector('#cr-appt').textContent.includes('squares of covering')));
await shoot('gs2_4_serviceable');

/* the photograph forward (lightbox) */
await p.evaluate(() => { document.getElementById('cr-appt').scrollTop = 0;
  const ph = document.querySelector('#cr-appt [data-wf-shot]'); ph && ph.click(); });
await p.waitForTimeout(500);
ok('a tapped photograph fills the screen', await p.evaluate(() => {
  const el = document.querySelector('#cr-appt [data-slot="wflight"]');
  return !!el && el.classList.contains('on');
}));
await shoot('gs2_2_evidence_finding');
await p.evaluate(() => { const x = document.querySelector('#cr-appt [data-wf-light="x"]'); x && x.click(); });

/* the empty job: the rep sees the chapter dimmed; the homeowner never
   lands on it (gate_1192 owns the skip mechanics — this is the VISUAL) */
await p.evaluate(async () => {
  await window.CardinalAppointment.close();
  await window.CardinalAppointment.open();
});
await p.waitForTimeout(700);
await p.evaluate(() => {
  const jobs = [...document.querySelectorAll('#cr-appt .ap-job')];
  const em = jobs.find(j => j.textContent.includes('Empty Job'));
  em && em.click();
});
await p.waitForTimeout(900);
const dim = await p.evaluate(() => {
  const chips = [...document.querySelectorAll('#cr-appt-rail .ar-step')];
  return { n: chips.length, off: chips.filter(c => c.classList.contains('ar-off')).map(c => c.textContent) };
});
ok('empty job dims Findings on the rail (rep-facing)',
   dim.off.includes('Findings'), JSON.stringify(dim));
await shoot('gs2_5_empty_skip');

ok('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
