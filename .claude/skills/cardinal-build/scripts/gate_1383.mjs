/* gate_1383 — What's New does not pop up on its own after a build.
 * A signed-in user whose last-seen build is OLDER than the app's: after 5s no What's New box is open,
 * the current build is recorded as seen, and CardinalChangelog.show() (the menu item) still opens it.
 * Arg: [index.html] -> negative control (1382: the box pops up, must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 120000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [], appointments: [], collections: [], inspection_reports: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(seed => { window.__SEED__ = seed; try { localStorage.setItem('cardinal.changelog.lastSeen', '1300'); } catch (e) {} }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page); await page.waitForTimeout(5500);
  const r = await page.evaluate(() => ({ open: !!document.querySelector('.cr-cl-bg'), seen: localStorage.getItem('cardinal.changelog.lastSeen'),
    user: !!window.currentUser }));
  ok(r.user, 'fixture: signed in');
  ok(!r.open, 'no What\'s New pop-up after the app updates', 'open=' + r.open);
  ok(Number(r.seen) > 1300, 'the new build is recorded as seen', r.seen);
  const m = await page.evaluate(() => { window.CardinalChangelog.show(); return document.querySelectorAll('.cr-cl-bg .cr-cl-entry').length; });
  ok(m > 0, 'tapping What\'s New in the menu still opens it, with notes', m + ' entries');
  await ctx.close();
} catch (e) { ok(false, 'browser part ran', String(e && e.message || e)); }
await browser.close();
console.log(fail ? `GATE 1383 RED — ${pass} passed, ${fail} failed` : `GATE 1383 GREEN — ${pass} passed`);
process.exit(fail ? 1 : 0);
