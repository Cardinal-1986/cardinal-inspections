/* gate_1402 — what the client sees: documents made by the app, served by the real api/share.js, rendered at 390px.
 *   A  the invoice's Pay button is thumb-sized on a phone (≥ 40px on screen)
 *   B  no "Loading…" veil on the client's page
 *   C  a Community invoice drops the empty contact row; a Community agreement carries no occupant email / phone
 *   D  print keeps the Terms heading and leaves the pay bar off the paper
 *   E  back from checkout (?paid=1) says thank you, no Pay button
 *   F  the invoice number has one "#"; a share token minted without crypto.randomUUID is a UUID
 * Args: [index.html] [api/share.js] -> negative control (1401 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SHAREJS = process.argv[3] || '/home/user/cardinal-inspections/api/share.js';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub';
const { boot } = await import('./gate_1401_lib.mjs');
const share = await import(SHAREJS);
import fs from 'fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SRC = fs.readFileSync(process.env.APPFILE, 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

/* the app builds the documents */
let docs;
{
  const { browser, page } = await boot('theo');
  try {
    docs = await page.evaluate(() => {
      const P = id => (window.cacheProjects || []).find(p => p.id === id);
      const inv = id => prefillUserInfo(prefillClientInfo(INVOICE_TEMPLATE, P(id)));
      let tok = null;
      try { const keep = crypto.randomUUID; Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
        tok = window.crUuid4 ? window.crUuid4() : null; Object.defineProperty(crypto, 'randomUUID', { value: keep, configurable: true }); } catch (_) {}
      return { R1: inv('R1'), C1: inv('C1'), C1agr: prefillUserInfo(prefillClientInfo(ROOF_AGREEMENT, P('C1'))), tok };
    });
  } finally { await browser.close(); }
}
ok(!/occupant1@example\.com|9375550192/.test(docs.C1agr), 'C2 the Community agreement carries no occupant email / phone',
  (docs.C1agr.match(/occupant1@example\.com|9375550192/) || [''])[0]);
ok(/^[a-f0-9-]{36}$/.test(String(docs.tok)), 'F2 a token minted without crypto.randomUUID is a UUID', String(docs.tok));
{
  const m = /var num = ([^;]+);/.exec(SRC.slice(SRC.indexOf('function createInvoiceFor')));
  ok(m && !/'#'\s*\+/.test(m[1]), 'F1 the invoice number does not carry its own "#"', m ? m[1].slice(0, 60) : 'none');
}

/* the share handler serves them */
const TOK = 'aaaaaaaa-bbbb-cccc-dddd-000000000015';
async function serve(id, html, query = {}) {
  const ck = id === 'C1' ? { lead: { claim_type: 'community' } } : { lead: { claim_type: 'retail' } };
  const db = {
    inspection_reports: [{ id: 'inv' + id, project_id: id, project: 'Sample ' + id, title: 'Invoice — Sample ' + id, total: 15000, html, share_token: TOK },
      { id: 'ct' + id, project_id: id, title: 'Contract — Sample ' + id, total: 15000, signed_at: '2026-09-01T00:00:00Z', html: 'x' }],
    collections: [{ project_id: id, amount: 5000, source: 'homeowner' }], contracts: [], estimates: [], projects: [{ id, checklist: ck }] };
  globalThis.fetch = async url => {
    const u = new URL(url); let rows = db[u.pathname.split('/').pop()] || [];
    for (const [k, v] of u.searchParams) {
      if (['select', 'limit', 'or', 'order'].includes(k)) continue;
      const m = /^eq\.(.*)$/.exec(v), mi = /^in\.\((.*)\)$/.exec(v);
      if (m) rows = rows.filter(r => String(r[k]) === m[1]);
      if (mi) rows = rows.filter(r => mi[1].split(',').includes(String(r[k])));
    }
    return { ok: true, status: 200, json: async () => rows };
  };
  const res = { code: 0, h: {}, body: '' };
  res.status = c => { res.code = c; return res; }; res.send = b => { res.body = String(b); return res; }; res.setHeader = (k, v) => { res.h[k] = v; };
  await share.default({ query: Object.assign({ t: TOK }, query) }, res);
  return res.body;
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function open(body) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().resourceType() === 'document' ? r.fulfill({ status: 200, contentType: 'text/html', body }) : r.abort());
  await page.goto('https://x.test/api/share?t=' + TOK); await page.waitForTimeout(700);
  return { ctx, page };
}
try {
  const r1 = await serve('R1', docs.R1);
  const { ctx, page } = await open(r1);
  const a = await page.evaluate(() => {
    const bar = document.getElementById('crPayBar'); const b = bar && [...bar.querySelectorAll('button, a')].find(x => /pay/i.test(x.textContent));
    const sc = window.visualViewport ? visualViewport.scale : 1;
    const veil = document.getElementById('restoreVeil');
    return { h: b ? Math.round(b.getBoundingClientRect().height * (parseFloat(bar.style.zoom) || 1) * sc * 10) / 10 : 0, sc,
      veil: !!(veil && getComputedStyle(veil).display !== 'none' && veil.getBoundingClientRect().height > 0) };
  });
  ok(a.h >= 40, 'A  the invoice Pay button is thumb-sized on a phone', JSON.stringify(a));
  ok(!a.veil, 'B  no "Loading…" veil on the client’s page');
  await page.emulateMedia({ media: 'print' });
  const d = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2.sec')].find(x => /Terms/.test(x.textContent));
    const bar = document.getElementById('crPayBar');
    return { terms: !!(h && getComputedStyle(h).display !== 'none'), bar: !!(bar && getComputedStyle(bar).display !== 'none') };
  });
  ok(d.terms && !d.bar, 'D  print keeps the Terms heading and leaves the pay bar off', JSON.stringify(d));
  await ctx.close();

  const c1 = await serve('C1', docs.C1);
  const o2 = await open(c1);
  const c = await o2.page.evaluate(() => [...document.querySelectorAll('.ph')].filter(e => e.offsetParent && /Phone/.test(e.textContent)).map(e => e.textContent)
    .concat((document.body.innerText.match(/occupant1@example\.com|9375550192/g) || [])));
  ok(!c.length, 'C1 a Community invoice shows no empty contact row and no occupant contact', JSON.stringify(c));
  await o2.ctx.close();

  const paid = await serve('R1', docs.R1, { paid: '1' });
  ok(/data-cr-paid="1"/.test(paid) && !/Pay by (card|bank)/.test(paid),
    'E  back from checkout says thank you, no Pay button', /Thank you/.test(paid) ? 'thank-you' : 'pay bar');
} finally { await browser.close(); }

console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
