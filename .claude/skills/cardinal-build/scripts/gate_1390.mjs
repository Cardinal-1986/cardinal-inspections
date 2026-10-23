/* gate_1390 — Scan document is a scanner, not a camera.
 *   A  a photo of a tilted white page on a dark table: the corners are found within 4% of the truth
 *   B  Save PDF files ONE .pdf on the job through addJobFiles (storage upload + a "File: Scan … .pdf" row),
 *      with one page per scanned page (2 here, via Add page), each page portrait and flattened
 *   C  Document mode whitens the paper (page corner ≥ 240) and keeps the ink dark (≤ 90)
 *   D  the controls are 44px or taller; nothing is filed before Save PDF; Cancel files nothing
 * Arg: [index.html] -> negative control (1389: the photo is filed raw, must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { execSync } from 'child_process';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SHOT = process.env.SHOT || '';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
const P = (id, stage) => ({ id, name: 'Client ' + id, stage, address: '1 Main St', phone: '9375550101', email: 'c@example.com', checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const C = (pid) => ({ id: 'c' + pid, project_id: pid, title: 'Contract — Client ' + pid, total: 14800, signed_at: '2026-09-01T12:00:00Z', html: '<p>x</p>', status: 'signed', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const I = (pid, status) => ({ id: 'i' + pid, project_id: pid, title: 'Invoice — Client ' + pid, total: 14800, html: '<p>i</p>', status, sent_at: status === 'sent' ? new Date(Date.now() - 4 * 86400000).toISOString() : null, share_token: 'aaaaaaaa-bbbb-cccc-dddd-0000000000' + pid, created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z' });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('j1', 'Approved')], inspection_reports: [], collections: [], appointments: [], estimates: [],
  commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
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
    window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: as.split('@')[0] };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { window.__pr = []; window.print = function(){ window.__pr.push(document.title); }; });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.waitForTimeout(1500); await settle(page);
  return { ctx, page };
}


async function shot(page, path){
  try { const c = await page.context().newCDPSession(page);
    const r = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: 1800, scale: 1 } });
    fs.writeFileSync(path, Buffer.from(r.data, 'base64')); } catch (e) { console.log('  (screenshot skipped)'); }
}
const card = (page, id) => page.evaluate(async id => {
  openProject(id); await new Promise(r => setTimeout(r, 1300));
  const c = document.querySelector('#projectView .crji-card'); if (!c) return null;
  const btns = [...c.querySelectorAll('.crji-acts .crji-btn')];
  const bar = c.querySelector('.crji-bar i');
  return { reds: btns.filter(b => b.classList.contains('primary')).map(b => b.textContent.trim()),
    amt: (c.querySelector('.crji-amt') || {}).textContent || '', txt: c.textContent.replace(/\s+/g, ' '),
    bar: bar ? bar.style.width : null, minH: Math.min(...btns.map(b => b.getBoundingClientRect().height)),
    jump: !!document.querySelector('#projectView [data-crji-jump]'),
    pBal: (document.querySelector('#projectView .crjp-card b.crjp-bal') || {}).textContent || '',
    pBar: (document.querySelector('#projectView .crjp-card .crjp-pbar i') || { style: {} }).style.width || null,
    balCount: [...document.querySelectorAll('#projectView *')].filter(e => e.children.length === 0 && e.offsetParent && /^\s*Balance due\s*$/i.test(e.textContent)).length, balWhere: [...document.querySelectorAll('#projectView *')].filter(e => e.children.length === 0 && /^\s*Balance due\s*$/i.test(e.textContent)).map(e => (e.closest('[id],[class]')||{}).className + '|' + e.tagName + '|' + (e.offsetParent ? 'shown' : 'hidden')) };
}, id);
/* a synthetic photo: dark table, a white page tilted by perspective, black text lines on it */
const QUAD = [[260, 150], [980, 230], [930, 1250], [190, 1150]];
const photo = (page) => page.evaluate((Q) => new Promise(res => {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 1400; const x = c.getContext('2d');
  x.fillStyle = '#3b3027'; x.fillRect(0, 0, 1200, 1400);
  x.fillStyle = '#f4f1ea'; x.beginPath(); Q.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill();
  const g = x.createLinearGradient(0, 0, 1200, 0); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fill();
  x.fillStyle = '#222'; for (let k = 0; k < 14; k++) { const t = 0.15 + k * 0.05; const L = [Q[0][0] + (Q[3][0] - Q[0][0]) * t + 60, Q[0][1] + (Q[3][1] - Q[0][1]) * t + 20];
    x.fillRect(L[0], L[1], 480, 14); }
  c.toBlob(b => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); }, 'image/jpeg', 0.92);
}), QUAD);
try {
  const { ctx, page } = await boot(null, false);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} document.body.dataset.crm = 'retail'; });
  const dataUrl = await photo(page);
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const tmp = '/tmp/claude-0/-home-user-cardinal-inspections/11285e75-bb52-5439-bd47-dc24e2a32109/scratchpad/scan/'; fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(tmp + 'photo.jpg', buf);
  await page.evaluate(async () => { openProject('j1'); await new Promise(r => setTimeout(r, 900)); openDocsPage();
    window.__files = []; const o = window.addJobFiles; window.addJobFiles = function(f){ window.__files.push(...[...f].map(x => x)); return o.apply(this, arguments); }; window.__WRITES__ = []; });
  await page.setInputFiles('#jdScanInput', tmp + 'photo.jpg');
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => { const r = document.getElementById('cr-scan');
    const q = window.CardinalScan && (() => { return null; })();
    const btns = r ? [...r.querySelectorAll('button')].filter(b => b.getBoundingClientRect().height > 0).map(b => b.getBoundingClientRect().height) : [];
    return { open: !!(r && r.classList.contains('open')), minH: btns.length ? Math.min(...btns) : 0, filed: window.__WRITES__.filter(w => /storage|inspection_reports/.test(w.table)).length }; });
  ok(st.open && st.filed === 0, 'B0 the photo opens the scanner and nothing is filed yet', JSON.stringify(st));
  const corners = await page.evaluate(async () => { const im = new Image(); im.src = document.querySelector('#cr-scan canvas') ? '' : ''; return null; });
  const cq = await page.evaluate(async (src) => { const im = new Image(); await new Promise(r => { im.onload = r; im.src = src; });
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0);
    return window.CardinalScan._findCorners(c); }, dataUrl);
  const err = Math.max(...cq.map((p, i) => Math.hypot(p[0] - QUAD[i][0], p[1] - QUAD[i][1]))) / 1400;
  ok(err < 0.04, 'A  the page corners are found within 4% of the truth', 'worst ' + (err * 100).toFixed(1) + '%  ' + JSON.stringify(cq.map(p => p.map(Math.round))));
  await page.click('#cr-scan [data-scn="add"]');   /* keeps page 1 and asks for another photo */
  await page.waitForTimeout(1500);
  const camSel = '#cr-scan input[type=file]';
  await page.setInputFiles(camSel, tmp + 'photo.jpg'); await page.waitForTimeout(2500);
  await page.click('#cr-scan [data-scn="done"]'); await page.waitForTimeout(3500);
  const res = await page.evaluate(async () => {
    const f = window.__files[0]; const out = { n: window.__files.length, name: f && f.name, type: f && f.type, size: f && f.size };
    if (f) { const b = new Uint8Array(await f.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); out.b64 = btoa(s); }
    out.writes = window.__WRITES__.filter(w => /storage|inspection_reports/.test(w.table)).map(w => w.table + ':' + w.op + ':' + ((w.payload && (w.payload.title || w.payload.path)) || ''));
    out.closed = !document.getElementById('cr-scan').classList.contains('open');
    return out; });
  let pinfo = '', pages = 0, portrait = false, white = 0, ink = 255;
  if (res.b64) { fs.writeFileSync(tmp + 'out.pdf', Buffer.from(res.b64, 'base64'));
    try { pinfo = execSync('pdfinfo ' + tmp + 'out.pdf').toString(); pages = Number((/Pages:\s+(\d+)/.exec(pinfo) || [])[1] || 0);
      const m = /Page size:\s+([\d.]+) x ([\d.]+)/.exec(pinfo); portrait = !!m && Number(m[2]) > Number(m[1]);
      execSync('pdftoppm -r 30 -f 1 -l 1 -gray ' + tmp + 'out.pdf ' + tmp + 'p');
      const pgm = fs.readdirSync(tmp).find(n => /^p-.*\.pgm$/.test(n)); const raw = fs.readFileSync(tmp + pgm);
      const hdr = raw.toString('latin1', 0, 40).split(/\s+/); const W = +hdr[1], H = +hdr[2]; const px = raw.subarray(raw.length - W * H);
      white = px[Math.round(H * 0.05) * W + Math.round(W * 0.9)];
      for (let i = 0; i < px.length; i++) ink = Math.min(ink, px[i]);
    } catch (e) { pinfo = 'ERR ' + e.message; } }
  ok(res.n === 1 && /^Scan .*\(2 pages\)\.pdf$/.test(res.name || '') && res.type === 'application/pdf' && res.closed,
     'B1 Save PDF files ONE pdf through addJobFiles and closes', JSON.stringify({ n: res.n, name: res.name, type: res.type, size: res.size }));
  ok(res.writes.some(w => /^storage:job-files:upload/.test(w)) && res.writes.some(w => /^inspection_reports:insert:File: Scan .*\.pdf$/.test(w)),
     'B2 it lands like any upload: job-files storage + a File: row', JSON.stringify(res.writes));
  ok(pages === 2 && portrait, 'B3 a valid PDF, one portrait page per scanned page', JSON.stringify({ pages, portrait, info: pinfo.split('\n').filter(l => /Pages|Page size|PDF version/.test(l)) }));
  ok(white >= 240 && ink <= 90, 'C  Document mode: paper white, ink dark', JSON.stringify({ white, ink }));
  ok(st.minH >= 44, 'D1 every scanner control is 44px or taller', String(st.minH));
  await page.evaluate(() => { window.__files = []; window.__WRITES__ = []; });
  await page.setInputFiles('#jdScanInput', tmp + 'photo.jpg'); await page.waitForTimeout(2000);
  await page.click('#cr-scan [data-scn="cancel"]'); await page.waitForTimeout(800);
  const cz = await page.evaluate(() => ({ n: window.__files.length, w: window.__WRITES__.filter(w => /storage|inspection_reports/.test(w.table)).length, open: document.getElementById('cr-scan').classList.contains('open') }));
  ok(cz.n === 0 && cz.w === 0 && !cz.open, 'D2 Cancel files nothing', JSON.stringify(cz));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.stack).slice(0, 400)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1390: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
