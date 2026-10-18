/* gate_1369 — Activity Count's Money Collected counts the payments (Theo: "Is this even accurately working?").
 *   A  last 30 days of collections, refunds netted: 5,000 - 500 = 4,500; a 1,000 payment 40 days old is out
 *   B  the old worksheet log counts only on a job with NO collections (+300), never on top of collections (999 ignored)
 *      → $4,800
 *   C  an admin's tile is a button; a tap opens Invoices & Payments
 *   D  a rep sees the same tile as plain text (Invoices & Payments is admin only)
 *   E  light theme: the arrow and number still read (>= 3:1 on the tile)
 * Arg: [index.html] -> negative control (1368: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
const ago = d => new Date(Date.now() - d * 86400000).toISOString();
const day = d => ago(d).slice(0, 10);
const P = (id, ckx) => ({ id, name: 'Client ' + id, stage: 'Invoiced', address: '1 Main St', phone: '', email: '',
  checklist: JSON.stringify(Object.assign({ lead: { claim_type: 'retail' } }, ckx || {})), created_at: '2026-06-01T12:00:00Z', updated_at: new Date().toISOString() });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
                  { email: 'rep@cardinalrenovations.net', name: 'Sample Rep', role: 'sales' }],
  projects: [P('m1', { ws: { c1: { paid: 999, log: [{ at: ago(3), a: 999 }] } } }), P('m2', { ws: { c2: { paid: 300, log: [{ at: ago(3), a: 300 }] } } })],
  collections: [{ id: 'k1', project_id: 'm1', amount: 5000, collected_at: day(5), created_at: ago(5), type: 'deposit' },
                { id: 'k2', project_id: 'm1', amount: 1000, collected_at: day(40), created_at: ago(40), type: 'deposit' },
                { id: 'k3', project_id: 'm1', amount: -500, collected_at: day(2), created_at: ago(2), type: 'other', notes: 'Refund' }],
  inspection_reports: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
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
    window.__SEED__ = JSON.parse(JSON.stringify(seed)); if (as) window.__AS__ = { email: as, name: 'Curtis' };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.evaluate(() => { try { window.CardinalHeader.goHome(); } catch (_) {} });
  await page.waitForTimeout(1200); await settle(page);
  return { ctx, page };
}


const TILE = p => p.evaluate(() => { const el = [...document.querySelectorAll('#actStrip .actbox')].find(x => /Money/.test(x.textContent)); if (!el) return null;
  const b = el.querySelector('b'), cs = getComputedStyle(b), after = getComputedStyle(b, '::after');
  return { tag: el.tagName, val: b.firstChild ? b.firstChild.textContent.trim() : b.textContent.trim(), ink: cs.color, arrow: after.content, arrowInk: after.color }; });
const LUM = c => { const v = (/rgba?\(([^)]+)\)/.exec(c) || [0, '0,0,0'])[1].split(',').map(Number).slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const RATIO = (a, b) => { const x = LUM(a), y = LUM(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
{
  const { ctx, page } = await boot();
  const t = await TILE(page);
  ok(t && t.val === '$4,800', 'A+B: Money Collected = $4,800 (5,000 - 500 refund + 300 old log; 1,000 too old, 999 not double-counted)', JSON.stringify(t));
  ok(t && t.tag === 'BUTTON' && /›/.test(t.arrow || ''), 'C: for an admin the tile is a button with an arrow', JSON.stringify(t));
  await page.evaluate(() => { const b = document.querySelector('#actStrip [data-actmoney]'); if (b) b.click(); });
  await page.waitForTimeout(900);
  const ar = await page.evaluate(() => { const v = document.getElementById('cr-ar-view'); return !!(v && getComputedStyle(v).display !== 'none'); });
  ok(ar, 'C: tapping it opens Invoices & Payments');
  await ctx.close();
}
{
  const { ctx, page } = await boot('rep@cardinalrenovations.net');
  const t = await TILE(page);
  ok(t && t.tag === 'DIV' && !/›/.test(t.arrow || ''), 'D: a rep gets a plain tile (no door to the admin page)', JSON.stringify(t));
  await ctx.close();
}
{
  const { ctx, page } = await boot(null, true);
  const t = await TILE(page);
  const r1 = t ? RATIO(t.ink, 'rgb(255,255,255)') : 0, r2 = t ? RATIO(t.arrowInk, 'rgb(255,255,255)') : 0;
  ok(t && r1 >= 3 && r2 >= 3, 'E: light theme, number and arrow read >= 3:1', JSON.stringify({ r1: r1.toFixed(2), r2: r2.toFixed(2) }));
  await ctx.close();
}
await browser.close();
console.log(fail ? 'GATE 1369 RED — ' + fail + ' failing' : 'GATE 1369 GREEN (' + pass + ')');
process.exit(fail ? 1 : 0);
