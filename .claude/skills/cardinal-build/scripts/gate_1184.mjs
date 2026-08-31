/* gate_1184 — the header title is a real button, not text pretending.
 *
 * WHY. Since 1164, tapping the portal name opens the Front Door, and the module
 * sets `aria-expanded` on #brandTitle. But #brandTitle is a plain division with
 * no role, and a generic element does not support that attribute — axe reports
 * it CRITICAL (aria-allowed-attr). It announced an expanded state while not
 * being something that can expand, and could not be reached or fired from a
 * keyboard at all.
 *
 * ⚠ IT WAS INVISIBLE FOR TWENTY BUILDS. gate_a11y only saw it once the sentinel
 * walk gained a `frontdoor` state — the violation needs the Front Door open to
 * exist. A check cannot report on a screen it never visits.
 *
 * ⚠ AND IT WAS NEARLY BASELINED AWAY. The same run showed `region` growing
 * legitimately (the walk covers 31 states against a baseline taken at 29), so
 * the obvious move was --rebaseline. That would have written the CRITICAL
 * finding in as accepted debt, permanently. gate_a11y demanding a REASON for a
 * rebaseline is what forced the two apart.
 *
 * This gate holds the fix at the level that matters: not "the attribute is
 * allowed now" but "a keyboard user can actually operate it".
 *
 * Optional path arg -> negative control (1183 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, waitForSoft, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const ROOT = '/home/user/cardinal-inspections/';
const FILE = process.argv[2] || ROOT + 'index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 150000);

let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };

const ck = t => JSON.stringify({ lead: { claim_type: t } });
const P = (id, n, s, t) => ({ id, name: n, stage: s, address: '', phone: '', email: '',
  checklist: ck(t), created_at: '2026-08-10T12:00:00Z', updated_at: '2026-08-10T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('r1','R Lead','Lead','retail'), P('c1','C One','Lead','community')],
  inspection_reports: [], appointments: [], estimates: [], collections: [], commissions: [],
  contracts: [], punch_items: [], insurance_claims: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.route('**/*', async route => {
  const u = route.request().url(), rt = route.request().resourceType();
  if (u === 'https://app.cardinalroster.com/' || u === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (u.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await waitAppReady(page);
await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} try { hideAllViews(); showHome(); } catch (_) {} });
await waitForSoft(page, () => document.querySelectorAll('.pipecard').length >= 3);
await settle(page);

const attrs = await page.evaluate(() => {
  const e = document.getElementById('brandTitle');
  if (!e) return { found: false };
  return { found: true, role: e.getAttribute('role'), tabindex: e.getAttribute('tabindex'),
           expanded: e.getAttribute('aria-expanded'), haspopup: e.getAttribute('aria-haspopup') };
});
ok(attrs.found, '#brandTitle exists');
ok(attrs.role === 'button', `it declares role=button (got ${attrs.role})`);
ok(attrs.tabindex === '0', `it is a tab stop (tabindex ${attrs.tabindex})`);
ok(attrs.expanded === 'false', `it starts collapsed (aria-expanded ${attrs.expanded})`);
ok(attrs.haspopup === 'dialog', `it announces the sheet (aria-haspopup ${attrs.haspopup})`);

/* THE ASSERTION THAT MATTERS: a keyboard user can operate it.
   Real key events on the focused element — never the exported function. */
const focused = await page.evaluate(() => {
  const e = document.getElementById('brandTitle'); if (!e) return false;
  e.focus(); return document.activeElement === e;
});
ok(focused, 'it can take keyboard focus');

await page.keyboard.press('Enter');
await waitForSoft(page, () => !!document.querySelector('#cr-fd.open'), { timeout: 3000 });
let st = await page.evaluate(() => ({
  open: !!document.querySelector('#cr-fd.open'),
  expanded: (document.getElementById('brandTitle') || {}).getAttribute
    ? document.getElementById('brandTitle').getAttribute('aria-expanded') : null }));
ok(st.open, 'ENTER opens the Front Door — the thing a mouse user has had since 1164');
ok(st.expanded === 'true', `and the state is announced (aria-expanded ${st.expanded})`);

await page.keyboard.press('Enter');
await waitForSoft(page, () => !document.querySelector('#cr-fd.open'), { timeout: 3000 });
st = await page.evaluate(() => ({
  open: !!document.querySelector('#cr-fd.open'),
  expanded: document.getElementById('brandTitle').getAttribute('aria-expanded') }));
ok(!st.open, 'ENTER again closes it');
ok(st.expanded === 'false', `and the state goes back (aria-expanded ${st.expanded})`);

/* Space too — a button responds to both, and only testing Enter would let a
   Space-only regression through. */
await page.evaluate(() => document.getElementById('brandTitle').focus());
await page.keyboard.press(' ');
await waitForSoft(page, () => !!document.querySelector('#cr-fd.open'), { timeout: 3000 });
ok(await page.evaluate(() => !!document.querySelector('#cr-fd.open')), 'SPACE opens it too');

await browser.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
