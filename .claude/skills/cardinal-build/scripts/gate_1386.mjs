/* gate_1386 — Download saves a PDF (the print sheet), never a .html file.
 * CardinalDownload.html / .frame and the Documents-row downloadReport must call print on the document,
 * lend it the document's title (the PDF's file name), and create no <a download="*.html">.
 * Arg: [index.html] -> negative control (1385 writes a .html, must go RED). */
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
  await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
  await page.addInitScript(MOCK);
  await page.addInitScript(() => {
    window.__dl = []; window.__pr = [];
    const oc = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function(){ if (this.download) { window.__dl.push(this.download); return; } return oc.call(this); };
    window.print = function(){ window.__pr.push({ where: 'top', title: document.title }); };
    const ap = Node.prototype.appendChild;
    Node.prototype.appendChild = function(n){ const r = ap.call(this, n);
      if (n && n.tagName === 'IFRAME') { try { n.contentWindow.print = function(){ window.__pr.push({ where: 'frame', title: document.title, ftitle: n.contentDocument.title }); }; } catch(e){}
        n.addEventListener('load', () => { try { n.contentWindow.print = function(){ window.__pr.push({ where: 'frame', title: document.title, ftitle: n.contentDocument.title }); }; } catch(e){} }); }
      return r; };
  });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.evaluate(() => window.CardinalDownload.html('<h1>Agreement</h1><p>Body</p>', 'Contract — Roofing — Sample Client'));
  await page.waitForTimeout(1500);
  let r = await page.evaluate(() => ({ dl: window.__dl.slice(), pr: window.__pr.slice() }));
  ok(!r.dl.some(n => /\.html$/i.test(n)), 'Download writes no .html file', JSON.stringify(r.dl));
  ok(r.pr.length === 1, 'Download opens the print sheet (Save as PDF) once', JSON.stringify(r.pr));
  ok(r.pr[0] && /Contract . Roofing . Sample Client/.test(r.pr[0].title), 'the PDF is named after the document', r.pr[0] && r.pr[0].title);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  const t = await page.evaluate(() => document.title);
  ok(!/Sample Client/.test(t), 'the app title comes back after the sheet closes', t);
  await page.evaluate(() => { window.__dl = []; window.__pr = []; window.CardinalDownload.html('<!doctype html><html><head><title>x</title></head><body><p>Full doc</p></body></html>', 'Estimate — Sample'); });
  await page.waitForTimeout(1500);
  r = await page.evaluate(() => ({ dl: window.__dl.slice(), pr: window.__pr.slice(), body: (document.getElementById('crPdfFrame') || {}).contentDocument ? document.getElementById('crPdfFrame').contentDocument.body.textContent : '' }));
  ok(r.pr.length === 1 && !r.dl.length, 'a full saved document (Documents row ⋯ Download) also goes to Save as PDF', JSON.stringify(r));
  ok(/Full doc/.test(r.body), 'the document itself is what is printed', r.body);
  await ctx.close();
} catch (e) { ok(false, 'browser part ran', String(e && e.message || e)); }
await browser.close();
console.log(fail ? `GATE 1386 RED — ${pass} passed, ${fail} failed` : `GATE 1386 GREEN — ${pass} passed`);
process.exit(fail ? 1 : 0);
