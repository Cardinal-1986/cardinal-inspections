/* gate_1303 — the Community home opens on Retail's pipeline, plus a Tarp Only tile.
 *   A  seven buckets, in Retail's PIPE_BUCKETS order, above "waiting on you"
 *   B  Retail's words except P = "Bid Submitted" and On Hold = "Waiting"
 *   C  the counts are right (A counts Approved + Scheduled, as Retail does)
 *   D  a REAL TAP on Bid Submitted opens All estimates showing only those jobs
 *   E  Tarp Only counts both spellings of the field, at any stage, and a real tap
 *      opens Clients filtered to exactly them
 *   F  Production sees the counts and no dollars
 *   G  every new piece of text clears 4.5:1 against the ground it sits on, dark AND light
 * Optional path arg -> negative control (1302: no pipeline, must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SHOT = process.env.SHOT || '';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 170000);
const P = (id, name, stage, ckx) => ({ id, name, stage, address: '', phone: '', email: '',
  checklist: JSON.stringify(Object.assign({ lead: Object.assign({ claim_type: 'community', partner_name: 'Habitat for Humanity of Greater Dayton', bid_amount: 1000 }, (ckx && ckx.lead) || {}) }, ckx && ckx.flat || {})),
  created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
                  { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production' }],
  projects: [
    P('c1','Lead One','Lead'), P('c2','Lead Two','Lead'),
    P('c3','Bid Bea','Prospect'), P('c4','Bid Bo','Prospect'),
    P('c5','Wait Wes','OnHold'), P('c6','Won Wanda','Approved'), P('c7','Sched Sam','Scheduled'),
    P('c8','Done Dan','Completed'), P('c9','Closed Cal','Closed'),
    P('t1','Tarp Flat','Lead', { flat: { work_type: 'Tarp Only' } }),
    P('t2','Tarp Lead','Completed', { lead: { work_type: 'Tarp Only' } }),
    { id:'r1', name:'Retail Rita', stage:'Prospect', address:'', phone:'', email:'', checklist: JSON.stringify({ lead:{ claim_type:'retail' } }), created_at:'2026-08-10T12:00:00Z', updated_at:'2026-08-10T12:00:00Z' }],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: []
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
    window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: 'Curtis' };
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
  document.querySelectorAll('#cr-ch2 [data-pane="home"] .cc-pipe .pipebtn .plabel, #cr-ch2 [data-pane="home"] .cc-pipe .pipebtn .pcount, #cr-ch2 [data-pane="home"] .cc-pipe .pipebtn .pmoney, #cr-ch2 .cc-pipek, #cr-ch2 .cc-tarponly b, #cr-ch2 .cc-tarponly span, #cr-ch2 .cc-tarponly small').forEach(el => {
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
  if (SHOT) await shot(page, SHOT + '_dark.png');
  let s = await read(page);
  ok(!s.none && s.btns.length === 7 && JSON.stringify(s.btns.map(b => b.key)) === JSON.stringify(s.retail),
     'A  seven buckets in Retail’s order', JSON.stringify(s.btns.map(b => b.key)));
  ok(s.order === true, 'A  the pipeline sits above "waiting on you"');
  const L = Object.fromEntries((s.btns || []).map(b => [b.key, b.label]));
  ok(/^(Bid|Estimate) Submitted$/.test(L.Prospect) && L.OnHold === 'Waiting', 'B  P reads Estimate Submitted (Bid Submitted before 1312), On Hold reads Waiting', JSON.stringify(L));
  ok(L.Lead === 'L' && L.Approved === 'A' && L.Completed === 'C' && L.Invoiced === 'I' && L.Closed === 'Closed', 'B  the rest are Retail’s own words');
  const N = Object.fromEntries((s.btns || []).map(b => [b.key, b.n]));
  ok(N.Lead === 3 && N.Prospect === 2 && N.OnHold === 1 && N.Approved === 2 && N.Completed === 2 && N.Closed === 1 && N.Invoiced === 0,
     'C  counts are right (A = Approved + Scheduled; the retail job is not counted)', JSON.stringify(N));
  ok((s.btns || []).every(b => b.money), 'F  admin sees dollars');
  let cr = await ink(page), lowD = cr.filter(x => x.r < 4.5);
  ok(cr.length >= 20 && !lowD.length, 'G  dark: every new label, count and dollar figure clears 4.5:1', lowD.length ? JSON.stringify(lowD) : 'min ' + Math.min(...cr.map(x => x.r)) + ' over ' + cr.length);
  await tap(page, '#cr-ch2 [data-pane="home"] .pipebtn[data-ccpipe="Prospect"]');
  let pn = await pane(page);
  ok(pn.on === 'bids' && JSON.stringify(pn.rows) === '["c3","c4"]', 'D  a real tap on Bid Submitted opens exactly those two estimates', JSON.stringify(pn));
  await page.evaluate(() => { const b = document.querySelector('#cr-ch2 .cc-back'); if (b) b.click(); }); await page.waitForTimeout(700);
  s = await read(page);
  ok(s.tile && s.tile.n === 2 && s.tile.door, 'E  Tarp Only counts both jobs (flat and lead field, Lead and Completed)', JSON.stringify(s.tile));
  await tap(page, '#cr-ch2 [data-pane="home"] .cc-tarponly');
  pn = await pane(page);
  ok(pn.on === 'clients' && JSON.stringify(pn.rows) === '["t1","t2"]', 'E  a real tap on Tarp Only opens Clients filtered to exactly them', JSON.stringify(pn));
  await ctx.close();
  ({ ctx, page } = await boot(null, true));
  if (SHOT) await shot(page, SHOT + '_light.png');
  cr = await ink(page); const lowL = cr.filter(x => x.r < 4.5);
  ok(cr.length >= 20 && !lowL.length, 'G  light: every new label, count and dollar figure clears 4.5:1', lowL.length ? JSON.stringify(lowL) : 'min ' + Math.min(...cr.map(x => x.r)) + ' over ' + cr.length);
  await ctx.close();
  ({ ctx, page } = await boot('curtis@cardinalrenovations.net', false));
  s = await read(page);
  ok(s.btns && s.btns.length === 7 && s.btns.every(b => !b.money), 'F  Production sees the pipeline with no dollars', JSON.stringify((s.btns || []).map(b => b.money)));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed', String(e.message || e).slice(0, 120)); }
await browser.close();
console.log(`GATE 1303 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
