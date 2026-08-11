/* render_comm726.js — contrast of the Money In & Commissions pane (#commMount),
   measured in REAL Chromium, in BOTH themes.

   Traps this rig avoids, all of them recorded in CLAUDE.md:
     · it loads the REAL document — concatenating the <style> blocks pulls in
       print/report stylesheets living inside template strings and restyles
       the page (a heading once scored 17.61:1 that way);
     · background-color is NOT the background — gradient stops are collected too;
     · an rgba wash is not a ground — every layer is COMPOSITED over what is
       beneath it, keeping the worst-case fan (grounds() is render_pcard.js's copy);
     · it reads webkitTextFillColor before color, so clipped text can't read as ink.

   Usage: node render_comm726.js [path/to/index.html]
   Exit 1 if any text fails its floor (4.5:1 body, 3.0:1 large >=18.66px or bold >=14px). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const APP_HTML = readFileSync(APP, 'utf8');
const now = new Date().toISOString();

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' },
                  { email: 'nick@cardinalrenovations.net', name: 'Nick Hey', role: 'sales' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Invoiced', address: '1 Test Way',
               sales_rep: 'nick@cardinalrenovations.net', checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
               created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  collections: [{ id:'C1', project_id:'P1', collected_at:'2026-08-01', amount:17025, type:'deposit',
                  source:'homeowner', notes:'First check', created_by:'theo@cardinalrenovations.net', created_at:now }],
  commissions: [{ id:'M1', project_id:'P1', rep_email:'nick@cardinalrenovations.net', amount:1702.5,
                  status:'pending', basis:'collection', collection_id:'C1', rate_pct:10,
                  project_name:'Bob DeBuilder', created_at:now }],
  draws: [{ id:'D1', project_id:'P1', rep_email:'nick@cardinalrenovations.net', amount:500, status:'paid',
            paid_at:'2026-08-05', project_name:'Bob DeBuilder', created_at:now }],
  punch_items: [], inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [], appointments: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
await page.waitForTimeout(1500);

async function measure(theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute('data-theme', th === 'light' ? 'rb-light' : '');
    if (th !== 'light') document.documentElement.removeAttribute('data-theme');
  }, theme);
  // open the commissions tab with BOTH forms expanded so every control exists
  await page.evaluate(() => {
    try { showTab('commissions'); } catch (e) {}
    const t = document.getElementById('tab-commissions'); if (t) t.style.display = 'block';
    try { if (window.commUi) { window.commUi.collForm = true; window.commUi.drawForm = true; } } catch (e) {}
    try { renderCommissions(); } catch (e) {}
  });
  await page.waitForTimeout(900);

  return await page.evaluate(() => {
    const px = s => (String(s).match(/[\d.]+/g) || []).map(Number);
    function grounds(el) {
      const layers = [];
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
        if (stops.length) { layers.push(stops); if (stops.some(s => s.a >= 1)) { base = null; break; } }
      }
      let cands = base ? [{ rgb: base, css: baseCss }] : [{ rgb: [255, 255, 255], css: '#fff' }];
      for (let i = layers.length - 1; i >= 0; i--) {
        const next = [];
        for (const st of layers[i]) for (const under of cands) {
          const a = st.a;
          next.push({ rgb: st.rgb.map((v, k) => Math.round(v * a + under.rgb[k] * (1 - a))),
                      css: a < 1 ? st.css + ' over ' + under.css : st.css });
        }
        cands = next.slice(0, 12);
      }
      return cands;
    }
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);

    const host = document.getElementById('commMount');
    if (!host) return { error: 'no #commMount' };
    const out = [];
    const seen = new Set();
    host.querySelectorAll('*').forEach(el => {
      // only elements that directly own visible text
      const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      const isField = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
      if (!own && !isField) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const fill = px(cs.webkitTextFillColor || cs.color);
      if (fill.length < 3 || (fill.length === 4 && fill[3] === 0)) return;
      const size = parseFloat(cs.fontSize) || 14;
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 18.66 || (weight >= 700 && size >= 14);
      const floor = large ? 3.0 : 4.5;
      let worst = null;
      for (const g of grounds(el)) {
        const rr = ratio(fill.slice(0, 3), g.rgb);
        if (!worst || rr < worst.r) worst = { r: rr, on: g.css };
      }
      const label = (isField ? el.tagName.toLowerCase() + '#' + (el.id || '') : (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')));
      const key = label + '|' + (own || '(field)').slice(0, 24);
      if (seen.has(key)) return; seen.add(key);
      out.push({ el: label, text: (own || '(field text)').slice(0, 34), color: cs.color,
                 size: Math.round(size), floor, ratio: +worst.r.toFixed(2), on: worst.on.slice(0, 34),
                 pass: worst.r >= floor });
    });
    return { rows: out };
  });
}

let fails = 0;
for (const theme of ['dark', 'light']) {
  const res = await measure(theme);
  console.log(`\n===== ${theme.toUpperCase()} =====`);
  if (res.error) { console.log('ERROR', res.error); fails++; continue; }
  res.rows.sort((a, b) => a.ratio - b.ratio);
  for (const r of res.rows) {
    const mark = r.pass ? 'ok  ' : 'FAIL';
    console.log(`  [${mark}] ${String(r.ratio).padStart(6)}:1 (floor ${r.floor})  ${r.el.padEnd(22)} "${r.text}"  ink=${r.color} on ${r.on}`);
    if (!r.pass) fails++;
  }
  const bad = res.rows.filter(r => !r.pass).length;
  console.log(`  -- ${res.rows.length} text elements, ${bad} below floor`);
}
console.log(fails === 0 ? '\nCONTRAST GREEN — every text element clears its floor in both themes'
                        : `\nCONTRAST RED — ${fails} failing element(s)`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
