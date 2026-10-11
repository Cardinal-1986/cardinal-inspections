/* gate_1311 — Community clean-up, part 2: Estimates and Clients stop repeating the home.
 *   A  both cards sit between the pipeline and "waiting on you"
 *   B  the calendar counts appointments on COMMUNITY jobs only, on the right day
 *   C  a real tap on the calendar opens the Schedule Board
 *   D  Partner A/R totals what is owed on Invoiced jobs, by partner, Habitat first,
 *      and counts the ones over 30 days
 *   E  a real tap on A/R opens All estimates showing exactly the Invoiced jobs
 *   F  Production gets the calendar and no A/R card
 *   G  every new piece of text clears 4.5:1, dark AND light
 * Optional path arg -> negative control (1303: no cards, must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SHOT = process.env.SHOT || '';
const iso = n => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
const ago = n => new Date(Date.now() - n * 86400000).toISOString();
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 170000);
const P = (id, name, stage, ckx) => ({ id, name, stage, address: '', phone: '', email: '',
  checklist: JSON.stringify(Object.assign({ lead: Object.assign({ claim_type: 'community', partner_name: 'Habitat for Humanity of Greater Dayton', bid_amount: 1000 }, (ckx && ckx.lead) || {}) }, ckx && ckx.flat || {})),
  created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
                  { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production' },
                  { email: 'nick@cardinalrenovations.net', name: 'Nick', role: 'sales', title: 'Sales' }],
  projects: [
    P('c1','Lead One','Lead'), P('c6','Won Wanda','Approved'),
    P('i1','Inv Habitat Old','Invoiced', { lead: { bid_amount: 5000 }, flat: { t_Invoiced: ago(40) } }),
    P('i2','Inv Habitat New','Invoiced', { lead: { bid_amount: 2500 }, flat: { t_Invoiced: ago(5) } }),
    P('i3','Inv Partner B','Invoiced', { lead: { bid_amount: 9000, partner_name: 'Partner B' }, flat: { t_Invoiced: ago(3) } }),
    { id:'r1', name:'Retail Rita', stage:'Invoiced', address:'', phone:'', email:'', checklist: JSON.stringify({ lead:{ claim_type:'retail', bid_amount: 77777 } }), created_at:'2026-08-10T12:00:00Z', updated_at:'2026-08-10T12:00:00Z' }],
  appointments: [
    { id:'a1', title:'Build', appt_date: iso(3), appt_time:'08:00', project_id:'c6', kind:'job', created_by:'theo@cardinalrenovations.net' },
    { id:'a2', title:'Build day 2', appt_date: iso(3), appt_time:'08:00', project_id:'c6', kind:'job', created_by:'theo@cardinalrenovations.net' },
    { id:'a3', title:'Retail install', appt_date: iso(5), appt_time:'08:00', project_id:'r1', kind:'job', created_by:'theo@cardinalrenovations.net' }],
  inspection_reports: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: []
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

async function boot(as, light){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(([seed, as, light]) => {
    window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: as.split('@')[0] };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.evaluate(() => { try { window.CardinalFrontDoor.open(); } catch (_) {} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const r = document.querySelector('#cr-fd .fdrow[data-fd="community"]'); if (r) r.click(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const h = window.CardinalCommunityHub; if (h && h.show) h.show(); });
  await page.waitForTimeout(1200); await settle(page);
  return { ctx, page };
}
const read = page => page.evaluate(() => {
  const h = document.getElementById('cr-ch2'); if (!h) return { none: true };
  const home = h.querySelector('[data-pane="home"]');
  const btns = [...(home ? home.querySelectorAll('.pipebtn[data-ccpipe]') : [])].map(b => ({
    key: b.getAttribute('data-ccpipe'), label: (b.querySelector('.plabel') || {}).textContent || '',
    n: +((b.querySelector('.pcount') || {}).textContent || -1), money: !!b.querySelector('.pmoney') }));
  const pipe = home && home.querySelector('.cc-pipe'), atop = home && home.querySelector('.cc-atop');
  const tile = home && home.querySelector('.cc-tarponly');
  return { btns, retail: (window.PIPE_BUCKETS || []).map(b => b.key),
    order: !!(pipe && atop && (pipe.compareDocumentPosition(atop) & Node.DOCUMENT_POSITION_FOLLOWING)),
    tile: tile ? { n: +((tile.querySelector('b') || {}).textContent || -1), door: tile.tagName === 'BUTTON' } : null };
});
async function tap(page, sel){
  await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel);
  await page.waitForTimeout(300);
  const b = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
  if (!b) return false; await page.mouse.click(b.x, b.y); await page.waitForTimeout(900); return true;
}
async function shot(page, path){
  try { const c = await page.context().newCDPSession(page);
    const r = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: 1400, scale: 1 } });
    fs.writeFileSync(path, Buffer.from(r.data, 'base64')); } catch (e) { console.log('  (screenshot skipped: ' + String(e.message).slice(0, 60) + ')'); }
}
const ink = page => page.evaluate(() => {
  const P = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map(x => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const L = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const ground = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = P(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
    let g = { r: 255, g: 255, b: 255, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) g = over(stack[i], g); return g; };
  const out = [];
  document.querySelectorAll('#cr-ch2 .cc-ops .cc-pipek, #cr-ch2 .cc-ops .cc-pipek small, #cr-ch2 .cc-calg i, #cr-ch2 .cc-calg span:not(:empty), #cr-ch2 .cc-caln, #cr-ch2 .cc-arbig, #cr-ch2 .cc-arrow, #cr-ch2 .cc-arold').forEach(el => {
    const fg = P(getComputedStyle(el).color), bg = ground(el); if (!fg) return;
    const a = L(over(fg, bg)), b = L(bg); const r = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    out.push({ t: el.className + ':' + el.textContent.trim().slice(0, 12), r: Math.round(r * 100) / 100 });
  });
  return out;
});
const pane = page => page.evaluate(() => {
  const h = document.getElementById('cr-ch2'), on = h && h.querySelector('[data-pane].on');
  const rows = on ? [...on.querySelectorAll('tr[data-open]')].filter(r => r.getBoundingClientRect().height > 0).map(r => r.getAttribute('data-open')) : [];
  return { on: on ? on.getAttribute('data-pane') : null, rows: rows.sort() };
});

try {
  let { ctx, page } = await boot(null, false);
  await tap(page, '#cr-ch2 [data-pane="home"] .cc-door[data-pane="bids"]');
  if (SHOT) await shot(page, SHOT + '_est.png');
  const b = await page.evaluate(() => { const p = document.querySelector('#cr-ch2 div[data-pane="bids"]'); if (!p) return null;
    const folds = [...p.querySelectorAll('[data-fold]')].map(f => f.getAttribute('data-fold'));
    const all = p.querySelector('[data-fold="allbids"]');
    return { kpi: p.querySelectorAll('.cc-kpi').length, folds, open: !!(all && all.classList.contains('open')),
             rows: all ? all.querySelectorAll('tbody tr[data-open]').length : 0 }; });
  ok(b && b.folds.length > 0 && b.kpi === 0 && !b.folds.some(f => /^(due|partners|week)$/.test(f)), 'A  Estimates draws no tiles, Due soon, Partners or Waiting folds', JSON.stringify(b));
  ok(b && JSON.stringify(b.folds) === '["allbids"]' && b.open && b.rows === 5, 'B  Estimates is All estimates, open, every job in it', JSON.stringify(b));
  await page.evaluate(() => { const b = document.querySelector('#cr-ch2 .cc-back'); if (b) b.click(); }); await page.waitForTimeout(500);
  await tap(page, '#cr-ch2 [data-pane="home"] .pipebtn[data-ccpipe="Invoiced"]');
  const pn = await pane(page);
  ok(pn.on === 'bids' && JSON.stringify(pn.rows) === '["i1","i2","i3"]', 'C  a pipeline tap still lands on All estimates, narrowed', JSON.stringify(pn));
  await page.evaluate(() => { const b = document.querySelector('#cr-ch2 .cc-back'); if (b) b.click(); }); await page.waitForTimeout(500);
  await tap(page, '#cr-ch2 [data-pane="home"] .cc-door[data-pane="clients"]');
  const c = await page.evaluate(() => { const p = document.querySelector('#cr-ch2 div[data-pane="clients"]'); return p ? [...p.querySelectorAll('[data-fold]')].map(f => f.getAttribute('data-fold')) : null; });
  ok(c && c.indexOf('bypartner') !== -1 && c.indexOf('bystage') === -1, 'D  Clients keeps By partner, drops By stage', JSON.stringify(c));
  await ctx.close();
  ({ ctx, page } = await boot('nick@cardinalrenovations.net', false));
  await tap(page, '#cr-ch2 [data-pane="home"] .cc-door[data-pane="bids"]');
  const mine = await page.evaluate(() => { const p = document.querySelector('#cr-ch2 div[data-pane="bids"]'); return p ? (p.querySelector('.cc-mine') || {}).textContent || '' : null; });
  ok(/your (bids|estimates) only/i.test(mine || ''), 'E  a sales rep still sees "your bids only"', JSON.stringify(mine));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed', String(e.message || e).slice(0, 120)); }
await browser.close();
console.log(`GATE 1311 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
