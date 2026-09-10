/* audit_prod_notify.mjs — AUDIT PROBE (not a gate): what does assigning a
 * punch-out actually POST to /api/notify?
 *
 *   node audit_prod_notify.mjs [path/to/index.html]
 *
 * Theo, 10 Sep 2026: "When assigning a punch-out there used to be a hyperlink
 * that went out to the assignee. It was not working yesterday."
 *
 * Reading the code says the link should be there. This drives the REAL Assign
 * sheet in a real engine and captures the request body, because a walk-through
 * of the source is not evidence about what a click sends.
 *
 * It intercepts POST /api/notify and prints the payload. It does not send
 * anything: the route is stubbed, so no staff member is texted or emailed by
 * this probe.
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(here, '../../../..');
const FILE = resolve(process.argv[2] || resolve(ROOT, 'index.html'));
const APP = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(resolve(here, 'e2e_mock_supa.js'), 'utf8');
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));

setTimeout(() => { console.log('PROBE TIMEOUT'); process.exit(3); }, 240000).unref();

const PROJ = '11111111-1111-4111-8111-111111111111';
const PUNCH = '22222222-2222-4222-8222-222222222222';

const SEED = {
  projects: [{
    id: PROJ, name: 'Mark Diamond', stage: 'Scheduled',
    address: '804 Burleigh Avenue, Dayton, OH 45402',
    email: 'mark@example.com', phone: '937-333-9192', claim_type: 'retail',
    checklist: JSON.stringify({ po: 1032, stage_since: '2026-09-01T10:00:00Z',
      job_category: 'Residential', work_type: 'New', lead_source: 'Referral', trades: ['Roofing'] }),
    created_at: '2026-09-01T10:00:00Z', created_by: 'theo@cardinalrenovations.net'
  }],
  punch_items: [{
    id: PUNCH, project_id: PROJ, title: 'Ridge cap loose over garage',
    detail: 'Two courses lifted', kind: 'roofing', priority: 'high', status: 'open',
    assigned_to: null, created_by: 'theo@cardinalrenovations.net',
    created_at: '2026-09-09T10:00:00Z', done_at: null, scheduled_at: null,
    photos: [], comments: [], steps: [], visits: []
  }],
  team_profiles: [
    { email: 'curtis@cardinalrenovations.net', name: 'Curtis', title: 'Production', phone: '937-555-0101' },
    { email: 'theo@cardinalrenovations.net',   name: 'Theo',   title: 'Owner',      phone: '937-555-0100' }
  ],
  estimates: [], inspection_reports: [], project_photos: [],
  appointments: [], pricing_items: [], pricing_categories: [], oc_colors: []
};

const posts = [];
let browser = null;
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page.on('console', m => { const t = m.text(); if (/\[prod\]|notif/i.test(t)) console.log('   console: ' + t.slice(0, 160)); });

  await page.route('**/*', async (route) => {
    const req = route.request(), u = req.url(), rt = req.resourceType();
    if (u.includes('/api/notify')) {
      let body = null;
      try { body = JSON.parse(req.postData() || '{}'); } catch (_) { body = { _raw: req.postData() }; }
      posts.push(body);
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, sent: 1, mailed: 1, texted: 1, failed: 0, subs: 1 }) });
    }
    if (u === 'https://app.cardinalroster.com/')
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (u.includes('@supabase/supabase-js'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (u.includes('chart.js') || u.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript',
        body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (u.startsWith('https://app.cardinalroster.com/api/'))
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'font') return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
    if (rt === 'media') return route.abort();
    if (u.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });

  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
  });

  console.log('\n=== 1. open Punch & Repairs (The Line) ===');
  const opened = await page.evaluate(async () => {
    if (typeof window.openPunchView !== 'function') return 'openPunchView missing';
    await window.openPunchView();
    await new Promise(r => setTimeout(r, 900));
    const v = document.getElementById('punchView');
    return { shown: !!(v && v.style.display !== 'none'),
             assignBtns: document.querySelectorAll('[data-puassign-open]').length,
             rows: document.querySelectorAll('#punchView [data-pu-open], #punchView .pu-row').length };
  });
  console.log('   ' + JSON.stringify(opened));

  console.log('\n=== 2. open the Assign sheet ===');
  const sheet = await page.evaluate(async () => {
    const b = document.querySelector('[data-puassign-open]');
    if (!b) return { err: 'no Assign button rendered' };
    b.click();
    await new Promise(r => setTimeout(r, 600));
    const sh = document.getElementById('puShAssign');
    return { open: !!(sh && sh.classList.contains('open')),
             people: [...document.querySelectorAll('[data-asg-who]')].map(x => x.getAttribute('data-asg-who')),
             days: document.querySelectorAll('[data-asg-day]').length,
             notifyToggle: !!document.getElementById('puAsgNtf') };
  });
  console.log('   ' + JSON.stringify(sheet));

  console.log('\n=== 3. pick a person and press Assign ===');
  const assigned = await page.evaluate(async () => {
    const who = document.querySelector('[data-asg-who="curtis@cardinalrenovations.net"]')
             || document.querySelector('[data-asg-who]:not([data-asg-who=""])');
    if (!who) return { err: 'no assignable person in the sheet' };
    const picked = who.getAttribute('data-asg-who');
    who.click();
    await new Promise(r => setTimeout(r, 300));
    const go = document.getElementById('puAsgGo');
    if (!go) return { err: 'no Assign button in the sheet' };
    if (go.disabled) return { err: 'Assign button is disabled after picking ' + picked };
    go.click();
    await new Promise(r => setTimeout(r, 2500));
    return { picked, msg: (document.querySelector('#punchView .pu-msg') || {}).textContent || '' };
  });
  console.log('   ' + JSON.stringify(assigned));

  console.log('\n=== 4. what was POSTed to /api/notify ===');
  if (!posts.length) {
    console.log('   *** NOTHING WAS POSTED — the assignee is never notified ***');
  } else {
    posts.forEach((p, i) => {
      console.log('   [' + i + '] emails : ' + JSON.stringify(p.emails));
      console.log('       title  : ' + JSON.stringify(p.title));
      console.log('       url    : ' + JSON.stringify(p.url));
      console.log('       body   : ' + JSON.stringify(String(p.body || '').slice(0, 120)));
      const linkInHtml = /<a\s[^>]*href=/i.test(String(p.html || ''));
      console.log('       html carries its own <a href>? ' + linkInHtml);
    });
    const withUrl = posts.filter(p => p.url && p.url !== '/');
    console.log('\n   VERDICT: ' + withUrl.length + ' of ' + posts.length +
                ' notification(s) carry a deep link in `url`.');
    if (withUrl.length) console.log('   link sent: ' + withUrl[0].url);
  }
} catch (e) {
  console.log('PROBE ERROR: ' + String((e && e.message) || e).slice(0, 300));
} finally {
  if (browser) { try { await browser.close(); } catch (_) {} }
}
