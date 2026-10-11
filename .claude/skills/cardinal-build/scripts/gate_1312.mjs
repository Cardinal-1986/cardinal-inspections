/* gate_1312 — Community says "estimate", never "bid" (Theo: "Let's keep it estimate and no bid").
 *   A  lexer: no string literal in cr-ch2 / cr-cc / cr-nbid / cr-cpartners carries the word
 *      (internal keys bids / bid / community-bid / data-* attributes excepted), over >= 2000 strings
 *   B  the pipeline's P button reads "Estimate Submitted"
 *   C  the rendered home and Estimates pane, and an opened Community job, show no "bid"
 *   D  the job page still renders its estimate words (so C cannot pass on an empty page)
 * Optional path arg -> negative control (1311: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { execFileSync } from 'child_process';
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
    P('c3','Pat Bea','Prospect'), P('c4','Pat Bo','Prospect'),
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

const NOBID = /\b[Bb]ids?\b/;
try {
  const st = JSON.parse(execFileSync('python3', [HERE + 'gate_1312_static.py', FILE], { encoding: 'utf8' }));
  ok(st.strings >= 2000 && st.hits.length === 0, 'A  no Community string literal says "bid" (' + st.strings + ' strings lexed)', st.hits.slice(0, 4).map(h => h.text).join(' | '));
  let { ctx, page } = await boot(null, false);
  const s = await read(page);
  const L = Object.fromEntries((s.btns || []).map(b => [b.key, b.label]));
  ok(L.Prospect === 'Estimate Submitted', 'B  P reads Estimate Submitted', JSON.stringify(L.Prospect));
  const homeTxt = await page.evaluate(() => { const h = document.querySelector('#cr-ch2 div[data-pane="home"]'); return h ? h.innerText : ''; });
  ok(homeTxt.length > 50 && !NOBID.test(homeTxt), 'C  the home shows no "bid"', (homeTxt.match(/.{0,30}\bbids?\b.{0,30}/i) || [homeTxt.length])[0]);
  await tap(page, '#cr-ch2 [data-pane="home"] .pipebtn[data-ccpipe="Prospect"]');
  const bidsTxt = await page.evaluate(() => { const h = document.querySelector('#cr-ch2 div[data-pane="bids"]'); return h ? h.innerText : ''; });
  ok(bidsTxt.length > 20 && !NOBID.test(bidsTxt), 'C  the Estimates pane shows no "bid"', (bidsTxt.match(/.{0,30}\bbids?\b.{0,30}/i) || [bidsTxt.length])[0]);
  await tap(page, '#cr-ch2 div[data-pane="bids"] tr[data-open="c3"]');
  await page.waitForTimeout(1200);
  const jobTxt = await page.evaluate(() => { const h = document.getElementById('cr-cc'); return h && h.getBoundingClientRect().height > 0 ? h.innerText : ''; });
  ok(jobTxt.length > 100 && /estimate/i.test(jobTxt), 'D  the Community job page opened and talks about its estimate', 'len ' + jobTxt.length);
  ok(jobTxt.length > 100 && !NOBID.test(jobTxt), 'C  the job page shows no "bid"', (jobTxt.match(/.{0,40}\bbids?\b.{0,40}/i) || [jobTxt.length])[0]);
  if (SHOT) await shot(page, SHOT + '_job.png');
  await ctx.close();
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.message).slice(0, 200)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1312: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
