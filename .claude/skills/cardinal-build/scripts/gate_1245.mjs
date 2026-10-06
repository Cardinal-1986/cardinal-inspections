/* gate_1245.mjs — build 1245: Order from ABC, on the client profile's Materials tab.
   The real index.html in Chromium, the shared Supabase mock, and a RECORDING fake
   /api/abc. Nothing reaches ABC.
     A  the Order from ABC button shows for admin and production, and not for sales.
     B  the sheet opens on TEST when the sandbox pair exists; LIVE is disabled while
        ABC_ORDERS_LIVE is off.
     C  "Materials list" pulls the job's list: a remembered match (abc_item_map) is
        applied, an unmatched line is flagged, a zero-quantity line is skipped.
     D  Review REFUSES with the unmatched line named, and sends nothing to ABC.
     E  matching a line searches the SANDBOX, keeps the match on the job's material
        line and remembers it in abc_item_map.
     F  "Estimate" pulls the estimate's ABC lines (abc_item).
     G  the send button exists only on the review screen; nothing is sent before it.
     H  Send TEST posts ONE placeOrder: sandbox:true, the chosen pickup (CPU), the job
        address, every line; the confirmation is shown, the order is saved on the job,
        and materials_ordered_at is NOT set by a test.
     I  hideAllViews() closes the sheet.
   RED on 1244 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1245.mjs [file.html]
*/
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const artifact = resolve(process.argv[2] || resolve(here, '../../../../index.html'));
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require_(existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright');
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
const APP = readFileSync(artifact, 'utf8');
const SETUP = readFileSync(resolve(here, 'sentinel_setup_cardinal.js'), 'utf8');
const MOCK = readFileSync(resolve(here, 'e2e_mock_supa.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 300000).unref();

/* p1 gets a street, a material list and an estimate with ABC lines; one material
   is already remembered in abc_item_map. Patched into the seed, never on disk. */
const EXTRA = `(function(){ try{
  var S = window.__SEED__, p = S.projects.find(function(x){ return x.id === 'p1'; });
  p.street = '7990 Germantown Pike';
  var ck = {}; try{ ck = JSON.parse(p.checklist || '{}'); }catch(_){}
  ck.materials = { roofing: [
    { m:'Architectural shingles', q:34, u:'bundles' },
    { m:'Drip edge (10 ft)', q:22, u:'pcs' },
    { m:'Ice & water (verify)', q:0, u:'rolls' } ] };
  p.checklist = JSON.stringify(ck);
  S.abc_item_map = [{ material:'architectural shingles', item_number:'02OCDURAONX', description:'OC Duration Onyx Black', uom:'BD' }];
  S.estimates = (S.estimates || []).concat([{ id:'e-abc', project_id:'p1', title:'Roof estimate', estimate_number:'E-1001', archived:false,
    line_items:[ { name:'Starter strip', abc_item:'02OCSTART', qty:3, unit:'BD' }, { name:'Labor', qty:1, unit:'job' } ] }]);
}catch(e){ window.__EXTRA_ERR__ = String(e); } })();`;

const browser = await launchChromium(chromium);

async function boot(as) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const calls = [];
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await page.route('**/*', async r => {
    const u = r.request().url();
    if (u === 'https://sentinel.test/' || u.startsWith('https://sentinel.test/?'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (u.startsWith('https://sentinel.test/api/abc')) {
      let b = {}; try { b = JSON.parse(r.request().postData() || '{}'); } catch (_) {}
      calls.push(b);
      const J = (o, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(o) });
      if (b.action === 'status') return J({ configured: true, connected: true, env: 'production', sandbox: true, liveOrders: false });
      if (b.action === 'searchItems') return J({ items: [{ itemNumber: '07DRIP10WH', itemDescription: 'Drip Edge 10ft White', unitsOfMeasure: { stocking: 'PC' } }] });
      if (b.action === 'placeOrder') return J([{ requestId: b.requestId, confirmationNumber: 'SB-778899', status: 'received' }]);
      return J({ items: [] });
    }
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    return r.fulfill({ status: 200, body: '' });
  });
  if (as) await page.addInitScript(a => { window.__AS__ = a; }, as);
  await page.addInitScript(SETUP);
  await page.addInitScript(EXTRA);
  await page.addInitScript(MOCK);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  await page.evaluate(async () => {
    ['landingView', 'loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
    if (typeof openProject === 'function') await openProject('p1');
    await new Promise(r => setTimeout(r, 900));
    if (typeof showTab === 'function') showTab('materials');
    if (typeof renderMaterialsTab === 'function') renderMaterialsTab();
    await new Promise(r => setTimeout(r, 300));
  }).catch(e => errs.push('boot: ' + e));
  return { ctx, page, calls, errs };
}
const btnShown = page => page.evaluate(() => { const b = document.getElementById('matAbcOrder'); return !!b && !b.hidden && b.getBoundingClientRect().height > 0; }).catch(() => false);
const SHOTS = process.env.SHOTS || '';
const shot = async (page, n) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/abco-' + n + '.png' }).catch(() => {}); };
const click = async (page, sel, why) => { try { await page.click(sel, { timeout: 4000 }); await page.waitForTimeout(350); return true; } catch (e) { ok(false, 'could click ' + why, String(e).split('\n')[0]); return false; } };

/* A — who sees the button */
for (const [who, as, want] of [['admin (theo)', null, true],
  ['production (curtis)', { email: 'curtis@cardinalrenovations.net', name: 'Curtis' }, true],
  ['sales (nick)', { email: 'nick@cardinalrenovations.net', name: 'Nick' }, false]]) {
  const s = await boot(as);
  ok((await btnShown(s.page)) === want, 'A  ' + who + (want ? ' sees' : ' does not see') + ' Order from ABC');
  await s.ctx.close();
}

const { ctx, page, calls, errs } = await boot(null);
if (await click(page, '#matAbcOrder', 'Order from ABC')) {
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const el = document.getElementById('cr-abco');
    const seg = [...el.querySelectorAll('[data-act="mode"]')].map(b => ({ v: b.dataset.v, on: b.getAttribute('aria-pressed'), dis: b.disabled }));
    return { open: getComputedStyle(el).display !== 'none', seg };
  }).catch(e => ({ err: String(e) }));
  ok(m.open, 'B  the sheet opens');
  const t = (m.seg || []).find(x => x.v === 'test'), l = (m.seg || []).find(x => x.v === 'live');
  ok(t && t.on === 'true' && l && l.dis === true, 'B  TEST is chosen; LIVE is disabled while live orders are off', JSON.stringify(m.seg));

  /* C */
  await click(page, '#cr-abco [data-act="src-mat"]', 'Materials list');
  const c = await page.evaluate(() => [...document.querySelectorAll('#cr-abco .ln')].map(x => ({ need: x.classList.contains('need'), t: x.textContent.replace(/\s+/g, ' ') })));
  ok(c.length === 2, 'C  two lines from the list (the zero-quantity line is skipped)', c.length);
  ok(c[0] && !c[0].need && /02OCDURAONX/.test(c[0].t), 'C  the remembered match is applied to "Architectural shingles"', c[0] && c[0].t.slice(0, 90));
  ok(c[1] && c[1].need, 'C  "Drip edge" is flagged as not matched');

  await shot(page, 'build');
  /* D */
  await page.fill('#cr-abco [data-af="shipTo"]', 'SB-1163698');
  await page.fill('#cr-abco [data-af="branch"]', '106');
  await click(page, '#cr-abco [data-act="dlv"][data-v="CPU"]', 'Pickup');
  await click(page, '#cr-abco [data-act="review"]', 'Review (blocked)');
  const d = await page.evaluate(() => ({ note: (document.querySelector('#cr-abco .note') || {}).textContent || '', send: !!document.querySelector('#cr-abco [data-act="send"]') }));
  ok(/Drip edge/.test(d.note) && /not matched/.test(d.note), 'D  Review refuses and names the unmatched line', d.note.slice(0, 120));
  ok(!d.send && !calls.some(x => x.action === 'placeOrder'), 'D  no send button and nothing sent to ABC');

  await shot(page, 'refused');
  /* E */
  await click(page, '#cr-abco .ln.need [data-act="match"]', 'Match');
  await click(page, '#cr-abco [data-act="find"]', 'Search');
  await page.waitForTimeout(400);
  await click(page, '#cr-abco [data-act="pick"]', 'pick a hit');
  await page.waitForTimeout(500);
  const srch = calls.filter(x => x.action === 'searchItems');
  ok(srch.length === 1 && srch[0].sandbox === true, 'E  the item search went to the SANDBOX', JSON.stringify(srch[0] || {}));
  const e = await page.evaluate(() => {
    const w = (window.__WRITES__ || []);
    const up = w.filter(x => x.table === 'abc_item_map');
    const ck = JSON.parse(window.currentProject.checklist || '{}');
    const row = ((ck.materials || {}).roofing || [])[1] || {};
    return { up: up.map(x => JSON.stringify(x.payload)).join(' '), abc: row.abc || null, need: document.querySelectorAll('#cr-abco .ln.need').length };
  });
  ok(e.need === 0, 'E  every line is now matched');
  ok(e.abc && e.abc.itemNumber === '07DRIP10WH', 'E  the match is kept on the job\'s own material line', JSON.stringify(e.abc));
  ok(/drip edge \(10 ft\)/.test(e.up) && /07DRIP10WH/.test(e.up), 'E  and remembered in abc_item_map for every job', e.up.slice(0, 140));

  /* F */
  await click(page, '#cr-abco [data-act="src-est"]', 'Estimate');
  await page.waitForTimeout(400);
  const f = await page.evaluate(() => [...document.querySelectorAll('#cr-abco .ln')].map(x => x.textContent));
  ok(f.length === 3 && /02OCSTART/.test(f[2] || ''), 'F  the estimate\'s ABC line is added (and its labour line is not)', f.length);

  /* G + H */
  await click(page, '#cr-abco [data-act="review"]', 'Review');
  const g = await page.evaluate(() => ({ send: !!document.querySelector('#cr-abco [data-act="send"]'), rows: document.querySelectorAll('#cr-abco table tr').length - 1 }));
  ok(g.send && g.rows === 3, 'G  the review shows all 3 lines and only now offers Send', JSON.stringify(g));
  ok(!calls.some(x => x.action === 'placeOrder'), 'G  nothing was sent before Send');
  await shot(page, 'review');
  await click(page, '#cr-abco [data-act="send"]', 'Send TEST');
  await page.waitForTimeout(900);
  const po = calls.filter(x => x.action === 'placeOrder');
  const b = po[0] || {};
  ok(po.length === 1, 'H  exactly one placeOrder', po.length);
  ok(b.sandbox === true && b.deliveryService === 'CPU' && b.branchNumber === '106' && b.shipTo && b.shipTo.number === 'SB-1163698',
     'H  sandbox:true, pickup (CPU), branch and ship-to as entered', JSON.stringify({ sb: b.sandbox, ds: b.deliveryService, br: b.branchNumber, st: b.shipTo && b.shipTo.number }));
  const a = (b.shipTo || {}).address || {};
  ok(a.line1 === '7990 Germantown Pike' && a.city === 'Dayton' && a.state === 'OH' && a.postal === '45418', 'H  the job address is sent', JSON.stringify(a));
  ok(Array.isArray(b.items) && b.items.map(i => i.itemNumber).join() === '02OCDURAONX,07DRIP10WH,02OCSTART' && b.items[0].quantity === 34,
     'H  every line, in order, with its quantity', JSON.stringify(b.items));
  const h = await page.evaluate(() => {
    const ck = JSON.parse(window.currentProject.checklist || '{}');
    return { conf: (document.querySelector('#cr-abco .conf') || {}).textContent || '', orders: ck.abc_orders || [], ordered: ck.materials_ordered_at || '' };
  });
  ok(h.conf === 'SB-778899', 'H  ABC\'s confirmation number is shown', h.conf);
  ok(h.orders.length === 1 && h.orders[0].env === 'test' && h.orders[0].confirmation === 'SB-778899', 'H  the order is saved on the job', JSON.stringify(h.orders[0] || {}).slice(0, 120));
  ok(!h.ordered, 'H  a TEST order does not mark the materials ordered');

  await shot(page, 'done');
  /* I */
  const i = await page.evaluate(() => { hideAllViews(); return getComputedStyle(document.getElementById('cr-abco')).display; });
  ok(i === 'none', 'I  hideAllViews() closes the sheet', i);
}
ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
await ctx.close();
await browser.close();
console.log((fail ? 'GATE 1245 RED' : 'GATE 1245 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
