/* gate_1218 — the Accounts Receivable dashboard and the offline payment sheet
 * went dark, and light mode did not move.
 *
 *   node gate_1218.mjs [artifact]
 *
 * Run it against the PREVIOUS build as a negative control: on 1217 the AR view
 * grounds at rgb(244,244,245) with the app in dark mode and section A fails.
 *
 * ⚠ THREE TRAPS THIS GATE IS BUILT AROUND, each of which has already cost a
 *   build on this project:
 *
 *   1. BUG_CLASSES 98 — `backgroundColor` is not the background. Cards here
 *      paint gradients, which are background-IMAGES, so an ancestor walk that
 *      reads only backgroundColor sails past the painted element and scores
 *      the ink against the page behind it. `groundOf()` collects every layer
 *      an ancestor actually paints, colour and gradient stops alike, and
 *      scores against the WORST of them.
 *
 *   2. The 1216 trap — a check that measures an element which does not exist
 *      in the mock passes by measuring `null`, on the build AND on the control.
 *      So the recomputed inks are read off the RESOLVED CUSTOM PROPERTY, which
 *      exists whether or not a row happens to be overdue in the fixtures, and
 *      `expectEl()` records a FAIL when a named element is missing rather than
 *      skipping it.
 *
 *   3. The theme trap — the app themes ITSELF at boot and will clear a bare
 *      data-theme attribute within ~500ms. The only honest way to sweep light
 *      is the app's own key, which is what the sentinel setup does when
 *      window.__sentinelTheme is set before boot. Never set the attribute and
 *      measure later.
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const require_ = createRequire(import.meta.url);
const ART = process.argv[2] || resolve(ROOT, 'index.html');
const APP = readFileSync(ART, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8');
const MOCK  = readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');
const PW = existsSync('/opt/node22/lib/node_modules/playwright/index.js')
  ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright';
const { launchChromium } = require_(resolve(HERE, 'chromium_launch.cjs'));
const { chromium } = require_(PW);

let fails = 0, checks = 0;
const ok   = (m) => { checks++; console.log('   ok   ' + m); };
const fail = (m) => { checks++; fails++; console.log('  FAIL ' + m); };
const is   = (c, m) => c ? ok(m) : fail(m);

const TIMER = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 240000);

/* the probe runs inside the page; it must be self-contained. */
const PROBE = `(${function () {
  const px = c => { const m = String(c).match(/-?[\d.]+/g); return m && m.length >= 3
      ? [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1] : null; };
  const over = (f, b) => { const a = f[3]; return [0,1,2].map(i => f[i]*a + b[i]*(1-a)).concat([1]); };
  const lum = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return .2126*f(c[0]) + .7152*f(c[1]) + .0722*f(c[2]); };
  const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((p,q)=>q-p); return (x+.05)/(y+.05); };
  /* BUG_CLASSES 98: a background-image is a LAYER LIST. Take every stop. */
  const stops = bi => { const out = [];
    if (!bi || bi === 'none') return out;
    const re = /rgba?\([^)]*\)/g; let m;
    while ((m = re.exec(bi))) { const c = px(m[0]); if (c && c[3] > 0.05) out.push(c); }
    return out; };
  /* Every ground an ancestor actually paints.
     ⚠ THE FIRST VERSION OF THIS FAILED A CORRECT BUILD, and the fault is worth
     recording because it is the mirror image of BUG_CLASSES 98. It pushed an
     opaque WHITE layer unconditionally as the paint-over base AND left it in
     the candidate list — so white was always among the candidates, "worst"
     was always white, and every ink on a black screen scored ~1.1:1 against a
     page that is not there. It reported 15 failures on a view whose measured
     ground luminance is 0.004. White belongs here only when the walk reached
     the document without finding anything opaque. */
  const groundOf = el => {
    const layers = [];
    let opaque = null;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      stops(cs.backgroundImage).forEach(c => layers.push(c));
      const c = px(cs.backgroundColor);
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 0.999) { opaque = c; break; } }
    }
    const base = opaque || [255,255,255,1];
    if (!opaque) layers.push(base);
    if (!layers.length) layers.push(base);
    /* composite each candidate over the opaque tail so a translucent wash is
       scored where it actually sits, not as if the page were behind it */
    return layers.map(c => over(c, base));
  };
  const worst = (fg, el) => {
    let lo = 99, ground = null;
    groundOf(el).forEach(g => { const r = ratio(over(fg, g), g); if (r < lo) { lo = r; ground = g; } });
    return { r: Math.round(lo * 100) / 100, ground };
  };
  const hex = c => c ? '#' + c.slice(0,3).map(v => ('0'+Math.round(v).toString(16)).slice(-2)).join('') : null;

  return {
    px, lum, hex,
    /* score every leaf text node inside a root */
    inks(rootSel) {
      const root = document.querySelector(rootSel);
      if (!root) return { missing: true };
      const bad = [];
      let n = 0;
      root.querySelectorAll('*').forEach(el => {
        const t = (el.textContent || '').trim();
        if (!t || el.children.length) return;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        const fg = px(cs.color); if (!fg) return;
        const size = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight, 10) || 400;
        const floor = (size >= 24 || (size >= 18.66 && w >= 700)) ? 3 : 4.5;
        const m = worst(fg, el);
        n++;
        if (m.r < floor) bad.push({ sel: el.className || el.tagName, txt: t.slice(0, 24),
                                    color: cs.color, r: m.r, floor, ground: hex(m.ground) });
      });
      return { n, bad };
    },
    groundLum(sel) {
      const el = document.querySelector(sel); if (!el) return null;
      const cs = getComputedStyle(el);
      const c = px(cs.backgroundColor); if (!c || c[3] < 0.999) return null;
      return Math.round(lum(c) * 1000) / 1000;
    },
    prop(sel, name) {
      const el = document.querySelector(sel); if (!el) return null;
      return (getComputedStyle(el).getPropertyValue(name) || '').trim() || null;
    },
    bg(sel) { const el = document.querySelector(sel); return el ? getComputedStyle(el).backgroundColor : null; },
    exists(sel) { return !!document.querySelector(sel); }
  };
}})()`;

const run = async (theme) => {
  const b = await launchChromium(chromium);
  const ctx = await b.newContext({ viewport: { width: 1440, height: 980 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  await p.route('**/*', async r => { const u = r.request().url();
    if (u === 'https://app.cardinalroster.com/')
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (u.includes('@supabase/supabase-js'))
      return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (u.includes('chart') || u.includes('papaparse'))
      return r.fulfill({ status: 200, contentType: 'application/javascript',
        body: 'window.Chart=function(){this.destroy=function(){}};window.Chart.defaults={};window.Papa={parse:function(){return{data:[]}}};' });
    if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
    return r.abort(); });
  p.on('dialog', d => d.accept());
  if (theme === 'rb-light') await p.addInitScript(() => { window.__sentinelTheme = 'rb-light'; });
  await p.addInitScript(MOCK);
  await p.addInitScript(SETUP);
  /* ⚠ THE SHARED FIXTURE CARRIES NO INVOICES, ON PURPOSE, and the sentinel
     setup says so in its own `ar` state: "the per-row reminder line
     (.crar-rem) needs a seeded invoice with a balance and is NOT covered yet".
     So every sweep of this screen to date has measured the EMPTY state — the
     chrome, the KPI tray and the master row — and never once an invoice row,
     its money columns, its status pill or the overdue spine. Those are exactly
     the surfaces this build re-coloured, so a gate that accepted the empty
     state would be checking the half of the screen that did not change.
     Seeded HERE rather than in the shared setup so a colour build does not
     move the fixture counts every other gate is written against. Closing the
     gap in the setup itself is recorded in OPEN_ITEMS.
     This runs AFTER the setup, so it extends the seed the routed mock reads. */
  await p.addInitScript(() => {
    const S = (window.__SEED__ = window.__SEED__ || {});
    const old = new Date(Date.now() - 47 * 86400000).toISOString();   /* 47d => overdue */
    (S.projects = S.projects || []).push({
      id: 'p4', name: 'Ardmore Duplex', address: '412 Ardmore Ave', city: 'Dayton', state: 'OH', zip: '45417',
      stage: 'Invoiced', created_by: 'theo@cardinalrenovations.net', sales_rep: null,
      checklist: JSON.stringify({ ws: {} }), phone: '937-555-0190', email: 'ardmore@example.com', crm: 'retail',
      created_at: old, updated_at: old, stage_since: old
    });
    (S.inspection_reports = S.inspection_reports || []).push(
      { id: 'd-con-p4', project_id: 'p4', title: 'Contract — Ardmore Duplex', total: 18400,
        signed_at: old, status: 'sent', created_at: old, created_by: 'theo@cardinalrenovations.net' },
      { id: 'd-inv-p4', project_id: 'p4', title: 'Invoice — Ardmore Duplex', total: 18400,
        status: 'sent', sent_at: old, created_at: old, created_by: 'theo@cardinalrenovations.net' }
    );
  });
  await p.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  await p.evaluate(async () => {
    const s = (window.__sentinelStates || []).find(x => x.name === 'ar'); if (s) await s.run();
  });
  await p.waitForTimeout(800);
  return { b, p };
};

const LABEL = ART.replace(/^.*\//, '');
console.log('gate_1218 — AR dashboard + payment sheet · ' + LABEL);

/* ── A. DARK ─────────────────────────────────────────────────────────── */
{
  const { b, p } = await run('dark');
  const R = await p.evaluate(`(()=>{ const P=${PROBE}; return {
      open:   P.exists('#cr-ar-view'),
      shown:  getComputedStyle(document.getElementById('cr-ar-view')||document.createElement('i')).display,
      lumView: P.groundLum('#cr-ar-view'),
      lumRow:  P.groundLum('#cr-ar-view .crar-row'),
      lumKpi:  P.groundLum('#cr-ar-view .crar-kpi'),
      hasRow:  P.exists('#cr-ar-view .crar-row'),
      hasKpi:  P.exists('#cr-ar-view .crar-kpi'),
      tokens: {
        bg:    P.prop('#cr-ar-view','--est-bg'),
        panel: P.prop('#cr-ar-view','--est-panel'),
        ink:   P.prop('#cr-ar-view','--est-ink'),
        dim:   P.prop('#cr-ar-view','--est-dim'),
        red:   P.prop('#cr-ar-view','--est-red'),
        warn:  P.prop('#cr-ar-view','--est-warn'),
        mist:  P.prop('#cr-ar-view','--crar-mist'),
        alert: P.prop('#cr-ar-view','--crar-alert'),
        pos:   P.prop('#cr-ar-view','--crar-pos'),
        on:    P.prop('#cr-ar-view','--crar-on')
      },
      inks: P.inks('#cr-ar-view')
    }; })()`);

  is(R.open && R.shown === 'block', 'A1  the AR dashboard opened  [display=' + R.shown + ']');
  is(R.lumView !== null && R.lumView < 0.05,
     'A2  the page ground is dark  [luminance ' + R.lumView + ', was 0.876 porcelain]');
  is(R.hasRow, 'A3  the fixtures render at least one invoice row (so A4 cannot pass vacuously)');
  is(R.hasRow && R.lumRow !== null && R.lumRow < 0.05,
     'A4  the invoice card is dark  [luminance ' + R.lumRow + ']');
  is(R.hasKpi && R.lumKpi !== null && R.lumKpi < 0.05,
     'A5  the KPI tile is dark  [luminance ' + R.lumKpi + ']');

  /* the five literals that could NOT be carried — read off the resolved
     property, so the check does not depend on a fixture being overdue */
  const want = { alert:'#f08a90', pos:'#34d399', on:'#34d399', warn:'#e0a94f', mist:'#a8b0ba' };
  Object.keys(want).forEach(k => is(R.tokens[k] === want[k],
    'A6.' + k + '  recomputed ink is ' + want[k] + '  [got ' + R.tokens[k] + ']'));

  /* the brand red is a FILL and a SPINE, and is deliberately unchanged */
  is(R.tokens.red === '#C8202E', 'A7  --est-red is still the brand red (fill + spine)  [' + R.tokens.red + ']');

  is(R.inks.missing !== true, 'A8  the ink sweep found the view');
  is(!R.inks.missing && R.inks.n >= 25,
     'A9  the ink sweep scored a real screen  [' + (R.inks.n || 0) + ' text nodes, floor 25]');
  if (!R.inks.missing && R.inks.bad.length)
    R.inks.bad.slice(0, 12).forEach(x => console.log('        ' + x.r + ':1 (floor ' + x.floor + ') ' +
      x.color + ' on ' + x.ground + '  "' + x.txt + '"'));
  is(!R.inks.missing && R.inks.bad.length === 0,
     'A10 every ink in the dark AR view clears its floor  [' + (R.inks.bad || []).length + ' below]');

  /* ── the payment sheet, opened the way the app opens it ── */
  const M = await p.evaluate(`(async()=>{ const P=${PROBE};
      let how='none';
      const t = document.querySelector('#cr-ar-view [data-arpay]');
      if (t) { t.click(); how='click'; }
      else if (window.CardinalAR && window.CardinalAR.list) {
        const rows = window.CardinalAR.list() || [];
        if (rows.length && window.CardinalAR.recordPayment) { window.CardinalAR.recordPayment(rows[0].project||rows[0]); how='api'; }
      }
      await new Promise(r=>setTimeout(r,500));
      const m = document.getElementById('cr-pay-modal');
      return { how, open: !!(m && m.classList.contains('open')),
               lumSheet: P.groundLum('#cr-pay-modal .crpay-box'),
               lumField: P.groundLum('#cr-pay-modal .crpay-in'),
               lumSeg:   P.groundLum('#cr-pay-modal .crpay-seg'),
               inks: P.inks('#cr-pay-modal .crpay-box') }; })()`);

  is(M.open, 'A11 the payment sheet opened  [via ' + M.how + ']  — a closed sheet cannot be measured');
  if (M.open) {
    is(M.lumSheet !== null && M.lumSheet < 0.05,
       'A12 the sheet is dark  [luminance ' + M.lumSheet + ', was 0.876 porcelain]');
    is(M.lumField !== null && M.lumField < 0.08, 'A13 the text fields are dark  [' + M.lumField + ']');
    is(M.lumSeg   !== null && M.lumSeg   < 0.08, 'A14 the segmented control is dark  [' + M.lumSeg + ']');
    if (M.inks.bad && M.inks.bad.length)
      M.inks.bad.slice(0, 8).forEach(x => console.log('        ' + x.r + ':1 ' + x.color + ' on ' + x.ground + '  "' + x.txt + '"'));
    is(M.inks.bad && M.inks.bad.length === 0,
       'A15 every ink on the dark sheet clears its floor  [' + ((M.inks.bad || []).length) + ' below]');
  } else { fail('A12 sheet dark (not measured)'); fail('A13 fields dark (not measured)');
           fail('A14 segments dark (not measured)'); fail('A15 sheet inks (not measured)'); }
  await b.close();
}

/* ── B. LIGHT — the porcelain must be exactly what shipped ───────────── */
{
  const { b, p } = await run('rb-light');
  const R = await p.evaluate(`(()=>{ const P=${PROBE}; return {
      theme: document.documentElement.getAttribute('data-theme'),
      lumView: P.groundLum('#cr-ar-view'),
      tokens: {
        bg:P.prop('#cr-ar-view','--est-bg'), panel:P.prop('#cr-ar-view','--est-panel'),
        ink:P.prop('#cr-ar-view','--est-ink'), dim:P.prop('#cr-ar-view','--est-dim'),
        line:P.prop('#cr-ar-view','--est-line'), well:P.prop('#cr-ar-view','--est-well'),
        numbg:P.prop('#cr-ar-view','--est-numbg'), warn:P.prop('#cr-ar-view','--est-warn'),
        mist:P.prop('#cr-ar-view','--crar-mist'), alert:P.prop('#cr-ar-view','--crar-alert'),
        pos:P.prop('#cr-ar-view','--crar-pos'), on:P.prop('#cr-ar-view','--crar-on')
      },
      inks: P.inks('#cr-ar-view')
    }; })()`);

  is(R.theme === 'rb-light', 'B1  the light theme is actually on  [data-theme=' + R.theme + ']');
  is(R.lumView !== null && R.lumView > 0.75,
     'B2  light mode is still porcelain  [luminance ' + R.lumView + ']');
  const shipped = { bg:'#F4F4F5', panel:'#FFFFFF', ink:'#0F172A', dim:'#475569',
                    line:'#E2E8F0', well:'#F8FAFC', numbg:'#EAEEF3', warn:'#8a6420',
                    mist:'#64748B', alert:'#C8202E', pos:'#047857', on:'#166534' };
  const wrong = Object.keys(shipped).filter(k => R.tokens[k] !== shipped[k]);
  if (wrong.length) wrong.forEach(k => console.log('        ' + k + ': want ' + shipped[k] + ', got ' + R.tokens[k]));
  is(wrong.length === 0,
     'B3  every light value is byte-for-byte what shipped  [' + wrong.length + ' drifted of ' + Object.keys(shipped).length + ']');
  if (R.inks.bad && R.inks.bad.length)
    R.inks.bad.slice(0, 12).forEach(x => console.log('        ' + x.r + ':1 (floor ' + x.floor + ') ' + x.color + ' on ' + x.ground + '  "' + x.txt + '"'));
  is(!R.inks.missing && R.inks.bad.length === 0,
     'B4  every ink in light mode clears its floor  [' + ((R.inks.bad || []).length) + ' below]');
  await b.close();
}

clearTimeout(TIMER);
console.log((fails ? 'RED   ' : 'GREEN ') + (checks - fails) + '/' + checks + ' checks');
process.exit(fails ? 1 : 0);
