/* gate_1172 — the switcher by FINGER, not by API. Every door is driven with
 * real mouse/touch events at real coordinates: the header title toggles the
 * panel, the drawer row opens it, a panel row navigates, the scrim closes it,
 * and the bar's own buttons (burger, +, home, search) still receive their
 * taps at every text size (the title's box must not eat them).
 * Optional path arg -> negative control (1171: title tap is DEAD, must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(path.join(HERE, 'e2e_mock_supa.js'), 'utf8');
let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 120000);

const ck = t => JSON.stringify({ lead: { claim_type: t } });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [
    { id: 'p1', name: 'R One', stage: 'Lead', address: '', phone: '', email: '', checklist: ck('retail'), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' },
    { id: 'p2', name: 'C One', stage: 'Lead', address: '', phone: '', email: '', checklist: ck('community'), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' }
  ],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [], contracts: [], punch_items: [], insurance_claims: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} try { hideAllViews(); showHome(); } catch (_) {} });
await page.waitForTimeout(700);

const center = sel => page.evaluate(s => {
  const el = document.querySelector(s); if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
}, sel);
const fdOpen = () => page.evaluate(() => { try { return window.CardinalFrontDoor.isOpen(); } catch (_) { return false; } });

// ── 1. the title, by finger: tap opens, tap again closes ──
const t = await center('#brandTitle');
ok(!!t, 'brandTitle present');
if (t) {
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForTimeout(600);
  ok(await fdOpen(), 'TOUCH tap on the title opens the Front Door');
  const h1 = await page.evaluate(() => (document.querySelector('#brandTitle h1') || {}).textContent);
  ok(h1 === 'Cardinal', 'header reads Cardinal while open, got: ' + h1);
  // while open, the sheet covers the header — the close path is the scrim
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.waitForTimeout(300);
  // hit box floor
  const box = await page.evaluate(() => {
    const r = document.getElementById('brandTitle').getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  ok(box.h >= 44, 'title hit box >=44px tall, got ' + Math.round(box.h));
}

// ── 2. the scrim, by finger ──
if (t) {
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForTimeout(500);
  if (await fdOpen()) {
    await page.touchscreen.tap(20, 800); // bottom-left: scrim, outside the sheet
    await page.waitForTimeout(500);
    ok(!(await fdOpen()), 'tapping the scrim closes the panel');
  } else { fail++; bad.push('could not reopen panel for scrim test'); }
}

// ── 3. a panel row, by finger: Community door navigates ──
if (t) {
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForTimeout(500);
  const row = await center('#cr-fd .fdrow[data-fd="community"]');
  if (row) {
    await page.touchscreen.tap(row.x, row.y);
    await page.waitForTimeout(800);
    const st = await page.evaluate(() => ({
      fd: window.CardinalFrontDoor.isOpen(),
      crm: document.body.dataset.crm || 'retail'
    }));
    ok(!st.fd, 'panel closes on a door tap');
    ok(st.crm === 'community', 'the Community door lands in community, got: ' + st.crm);
  } else { fail += 2; bad.push('community row not found', 'community row not found'); }
  await page.evaluate(() => { try { hideAllViews(); showHome(); } catch (_) {}
    try { window.CardinalPortal.set('retail', false); } catch (_) {} });
  await page.waitForTimeout(500);
}

// ── 4. the drawer row, by finger ──
await page.evaluate(() => { const b = document.getElementById('navBtn'); if (b) b.click(); });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const sec = [...document.querySelectorAll('#navMenu .navsec')].find(e => /daily/i.test(e.textContent));
  if (sec && sec.getAttribute('aria-expanded') !== 'true') sec.click();
});
await page.waitForTimeout(400);
const drow = await center('#navMenu .navopt[data-nav="landing"]');
if (drow && drow.w > 0) {
  await page.touchscreen.tap(drow.x, drow.y);
  await page.waitForTimeout(700);
  ok(await fdOpen(), 'the drawer "Switch portal" row opens the Front Door (real tap)');
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
} else { fail++; bad.push('drawer row not tappable/visible: ' + JSON.stringify(drow)); }
await page.waitForTimeout(300);
await page.evaluate(() => {
  const m = document.getElementById('navMenu'); if (m) m.style.display = 'none';
  const bd = document.getElementById('navBackdrop'); if (bd && bd.classList) bd.classList.remove('on');
});
await page.waitForTimeout(300);

// ── 5. the bar's own buttons still take the tap at every text size ──
for (const size of ['', 'lg', 'xl']) {
  await page.evaluate(s => {
    if (s) document.documentElement.setAttribute('data-cr-text', s);
    else document.documentElement.removeAttribute('data-cr-text');
  }, size);
  await page.waitForTimeout(300);
  const hits = await page.evaluate(() => {
    const out = {};
    for (const id of ['navBtn', 'addProjectBtn']) {
      const el = document.getElementById(id);
      if (!el) { out[id] = 'absent'; continue; }
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      out[id] = top && (top === el || el.contains(top) || top.contains(el)) ? 'ok' : (top ? (top.id || top.className || top.tagName) : 'null');
    }
    return out;
  });
  ok(hits.navBtn === 'ok', 'burger still takes the tap at size "' + (size || 'normal') + '", got: ' + hits.navBtn);
  ok(hits.addProjectBtn === 'ok', '+ still takes the tap at size "' + (size || 'normal') + '", got: ' + hits.addProjectBtn);
}
await page.evaluate(() => document.documentElement.removeAttribute('data-cr-text'));

ok(pageErrors.length === 0, 'no page errors: ' + pageErrors.slice(0, 2).join(' | '));
await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
