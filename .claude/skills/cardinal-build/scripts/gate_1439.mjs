/* gate_A3 — round-1 leftovers on 1438: documents, the editor, two money labels.
 *
 *   P12.14  the Estimates empty state names Blank estimate
 *   P05.07  the Activity Count strip says it counts every board (the Money Collected figure unchanged)
 *   P05.11  Commissions at 390: the Owed table keeps Net (the amount paid) and hides Draws
 *   P03.11/J15.08  Contracts tab: one red button, Upload is the outline chip in line, the intro is
 *           shorter, and a signed row offers no Mark sent / Mark unsent
 *   P02.03  editor chip: SENT after Email to client, DRAFT on an estimate document, "PO" on the back chip
 *   P03.08  phone editor: Client signature in the main row (not the drawer), the bar no taller
 *   P03.09  signing in person raises one toast ("Signed — buyer"), not "Saved" as well
 *   P11.05  the EMAILED contract and the PRINTED contract carry no [prompt], no "— select —", no
 *           "Tap a box" hint; a filled field survives; the editor gets its prompts back after printing
 *   P02.11  phone preview: the estimate's label cells span the column
 *   P11.11  print inks: estimate labels/footer, Roof Options numbers/footer and the page footer >= 4.5:1
 *   P11.13  Roof Options with 1, 2 and 3 options prints on one Letter page; the closing line keeps company
 *   P11.07  printed invoice: no INVOICE STATUS box, Paid $0.00 (no minus), Terms not on a page of its own,
 *           payment history kept
 *   P04.03  figure captions renumber with their headings — share page (api/share.js) and app print
 *   V3      phone invoice editor: the Bill To table fits the frame
 *
 *   node gate_A3.mjs [artifact.html] [--share path/to/share.js]
 * Defaults: the repo index.html and the repo api/share.js. Must be RED on build 1438 (BASE).
 */
import fs from 'fs';
import os from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = '/home/user/cardinal-inspections/';
const S = REPO + '.claude/skills/cardinal-build/scripts/';
const args = process.argv.slice(2);
const si = args.indexOf('--share');
const SHARE = resolve(si !== -1 ? args[si + 1] : REPO + 'api/share.js');
const FILE = resolve(args.find((a, i) => !a.startsWith('--') && (si === -1 || i !== si + 1)) || REPO + 'index.html');
process.env.APPFILE = FILE;
const { boot, log } = await import(S + 'gate_1403_lib.mjs');
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
/* fixtures beside this file: R9 with three priced estimates (V2's seed) and an AI-drafted report saved by 1438 (V3) */
const SEED_EXTRA = fs.readFileSync(join(HERE, 'gate_1439_seed.js'), 'utf8');
const REPORT_AI = fs.readFileSync(join(HERE, 'gate_1439_report.html'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const watchdog = setTimeout(() => { console.log('  ✗ FAIL gate timed out'); process.exit(1); }, 540000);

let passes = 0; const fails = [];
function ok(c, msg, det) { if (c) passes++; else fails.push(msg); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + msg + (det !== undefined ? '  — ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 260) : '')); }
const LUM = c => { const v = (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const RATIO = (a, b) => { const x = LUM(a), y = LUM(b); return Math.round((Math.max(x, y) + .05) / (Math.min(x, y) + .05) * 100) / 100; };
const PROMPT_RX = /\[[^\]\n]{1,90}\]/g;
console.log('gate_1439 on ' + FILE + '\n  share.js: ' + SHARE);

/* ── PDF helper: Letter, served from the repo origin so the logo loads ── */
const pb = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function pdfOf(html, tag, probe) {
  const ctx = await pb.newContext({ viewport: { width: 900, height: 1200 } });
  await ctx.route('**/*', async route => { const url = route.request().url();
    if (url.includes('/__doc/')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (url.startsWith('data:')) return route.continue();
    if (url.startsWith('https://app.cardinalroster.com/')) { const p = decodeURIComponent(new URL(url).pathname).slice(1); const f = REPO + p; if (p && !p.includes('..') && fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: p.endsWith('.png') ? 'image/png' : 'application/octet-stream', body: fs.readFileSync(f) }); return route.fulfill({ status: 404, body: '' }); }
    return route.abort(); });
  const pg = await ctx.newPage();
  await pg.goto('https://app.cardinalroster.com/__doc/' + tag, { waitUntil: 'load' }); await pg.waitForTimeout(400);
  await pg.emulateMedia({ media: 'print' });
  const pr = probe ? await pg.evaluate(probe) : null;
  const buf = await pg.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true });
  const tmp = join(os.tmpdir(), 'gateA3_' + process.pid + '_' + tag + '.pdf'); fs.writeFileSync(tmp, buf);
  const pages = execFileSync('pdftotext', ['-layout', tmp, '-']).toString().split('\f').filter(s => s.trim());
  await ctx.close();
  return { pages, text: pages.join('\n'), probe: pr };
}

/* ══ 1 · PHONE, Theo: tabs, the contract editor, Email, signing, Commissions, home, the invoice editor ══ */
const SEED_PHONE = `(function(){ var S=window.__SEED__; if(!S) return; var n=new Date().toISOString();
  var r=S.projects.find(function(p){return p.id==='R1';});
  S.projects.push(Object.assign({}, r, { id:'R7', name:'Sample Retail Seven', stage:'Prospect', email:'retail7@example.com', phone:'9375550197', address:'7 Pine St' }));
  S.inspection_reports.push({ id:'ctR1u', project_id:'R1', title:'Contract — Siding — Sample Retail One', total:9000, status:'unsent', html:'<p>agreement</p>', created_at:n, updated_at:n });
  S.inspection_reports.push({ id:'estR1d', project_id:'R1', title:'Estimate — Gutters — Sample Retail One', total:2100, status:'unsent', html:'<p>estimate</p>', created_at:n, updated_at:n });
  S.commissions=(S.commissions||[]).concat([{id:'cmA',project_id:'R1',rep_email:'rep@cardinalrenovations.net',amount:1500,status:'pending',created_at:n},{id:'cmB',project_id:'I1',rep_email:'rep@cardinalrenovations.net',amount:900,status:'pending',created_at:n}]);
  S.draws=(S.draws||[]).concat([{id:'drA',rep_email:'rep@cardinalrenovations.net',amount:500,status:'outstanding',paid_at:n.slice(0,10),created_at:n}]); })();`;
const B1 = await boot('theo', { instr: false, seed: SEED_PHONE });
const page = B1.page;
let senddoc = null;
await page.route('**/api/senddoc', async route => { senddoc = route.request().postData(); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
const E = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String(e.message).split('\n')[0] }));
const ask = () => E(() => { const a = document.getElementById('crAsk'); return a && a.classList.contains('open') ? a.innerText.replace(/\s+/g, ' ').slice(0, 300) : null; });
const pick = re => E(src => { const re = new RegExp(src, 'i'); const a = document.getElementById('crAsk'); if (!a || !a.classList.contains('open')) return null;
  const b = [...a.querySelectorAll('button')].find(x => x.offsetParent && re.test(x.innerText)); if (!b) return 'nobtn'; b.click(); return b.innerText.trim(); }, re.source);
try {
  await E(() => { try { window.CardinalFrontDoor && window.CardinalFrontDoor.close(); } catch (_) {} });

  console.log('\nP12.14  the Estimates empty state');
  await E(() => { try { hideAllViews(); } catch (e) {} openProject('R7'); }); await sleep(1600);
  await E(() => showTab('estimates')); await sleep(700);
  { const t = await E(() => (document.getElementById('estDocsMount') || {}).innerText || '');
    ok(typeof t === 'string' && /No estimates yet/.test(t), 'P12.14 the empty state is showing', t);
    ok(/Blank estimate/.test(t) && /From a template/.test(t) && /Upload estimate/.test(t), 'P12.14 it names all three: From a template, Blank estimate, Upload estimate', t);
    const b = await E(() => { const x = document.getElementById('cr-est-new-btn'); return x ? x.textContent.trim() : null; });
    ok(b === 'Blank estimate', 'P12.14 the button it names is on the tab', b); }

  console.log('\nP03.11 / J15.08  the Contracts tab');
  await E(() => showTab('contracts')); await sleep(800);
  { const r = await E(() => {
      const t = document.getElementById('tab-contracts'); const p = t.querySelector('.subnote'); const cs = getComputedStyle(p);
      const R = id => { const b = document.getElementById(id); const q = b.getBoundingClientRect(); const s = getComputedStyle(b); return { cls: b.className, x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height), bg: s.backgroundColor, ml: s.marginLeft }; };
      const reds = [...t.querySelectorAll('button')].filter(b => b.getClientRects().length && getComputedStyle(b).backgroundColor === 'rgb(200, 32, 46)').map(b => b.textContent.trim());
      return { lines: Math.round(p.getBoundingClientRect().height / parseFloat(cs.lineHeight)), intro: p.innerText.replace(/\s+/g, ' ').trim(), nw: R('pNewContractBtn'), wrap: R('pContractWrap'), up: R('pUploadContractBtn'), reds }; });
    ok(r.reds && r.reds.length === 1 && /New contract/.test(r.reds[0]), 'J15.08 one solid red button on the tab (+ New contract)', r.reds);
    ok(r.up && /\bchipbtn\b/.test(r.up.cls) && !/\bbtn\b/.test(r.up.cls) && r.up.bg !== 'rgb(200, 32, 46)', 'J15.08 Upload signed contract is the outline .chipbtn', r.up);
    ok(r.up && r.up.h >= 44, 'J15.08 it keeps the 44px floor', r.up);
    const sameRow = r.up && r.nw && Math.abs((r.up.y + r.up.h / 2) - (r.nw.y + r.nw.h / 2)) <= 3 && Math.abs(r.up.x - (r.nw.x + r.nw.w) - 6) <= 1;
    const wrapped = r.up && r.wrap && r.up.y >= r.wrap.y + r.wrap.h && Math.abs(r.up.x - r.nw.x) <= 1 && r.up.y - (r.wrap.y + r.wrap.h) >= 3 && r.up.y - (r.wrap.y + r.wrap.h) <= 8;   /* 4px row gap + the chip's own 2px top margin */
    ok(sameRow || wrapped, 'J15.08 in line: 6px beside + New contract, or wrapped flush left under it (Blank estimate\'s 6px / 4px spacing)', { nw: r.nw, wrap: r.wrap, up: r.up });
    ok(r.lines < 9, 'P03.11 the intro is shorter than its 9 lines', r.lines + ' lines: ' + r.intro);
    ok(/^Roofing, siding and gutter Construction Agreements, prefilled from this profile\./.test(r.intro || '') && /Upload signed contract keeps a photo or PDF and opens the invoice\./.test(r.intro || '') &&
       /The Terms & Conditions and both 3-Day Notice of Cancellation copies stay the printed master in ☰ Menu → Company Documents\./.test(r.intro || ''), 'P03.11 only the repetition went: every instruction and the Company Documents path stay', r.intro); }
  await E(() => { openProject('R1'); }); await sleep(1500); await E(() => showTab('contracts')); await sleep(900);
  { const rows = await E(() => [...document.querySelectorAll('#contractDocsMount tbody tr')].map(tr => ({ t: (tr.querySelector('.title b') || {}).textContent, signed: /SIGNED/.test((tr.querySelector('td.status') || {}).innerText || ''), acts: [...tr.querySelectorAll('button')].map(b => b.textContent.trim()) })));
    const sg = (rows || []).find(r => r.signed), un = (rows || []).find(r => !r.signed);
    ok(!!sg && !sg.acts.some(a => /^Mark (un)?sent$/.test(a)), 'P03.11 a SIGNED contract row offers no Mark sent / Mark unsent', sg);
    ok(!!un && un.acts.some(a => a === 'Mark sent'), 'P03.11 an unsigned contract row still offers Mark sent', un); }

  console.log('\nP02.03  the editor chip on an estimate document');
  await E(() => openEditor('estR1d')); await sleep(2400);
  { const r = await E(() => ({ chip: document.getElementById('editorStatusChip').textContent, cls: document.getElementById('editorStatusChip').className, toggle: document.getElementById('toggleStatusBtn').textContent, back: document.getElementById('edClientChip').innerText.replace(/\s+/g, ' ') }));
    ok(r.chip === 'DRAFT', 'P02.03 an unsent estimate document reads DRAFT (its card\'s word), not UNSENT', r);
    ok(r.toggle === 'Mark sent', 'P02.03 ... and still offers Mark sent', r.toggle);
    ok(/^\u2039 Back \d+: Sample Retail One$/.test(r.back || ''), 'P02.03 390: the phone chip keeps its width for the name (the PO label is wider screens only)', r.back); }
  await E(() => closeEditor()); await sleep(900);

  console.log('\nP03.08  the phone editor toolbar, a fresh Roofing agreement');
  await E(() => { openProject('R7'); }); await sleep(1400);
  await E(() => createContractForCurrent('roof')); await sleep(3600);
  { const r = await E(() => {
      const tb = document.querySelector('#editorView .toolbar'); const g = tb.querySelector('.edbtns'); const sig = document.getElementById('sigBtn'); const sr = sig.getBoundingClientRect();
      const vis = [...g.children].filter(b => b.tagName === 'BUTTON' && b.getClientRects().length && b.getBoundingClientRect().width > 0);
      const rows = new Set(vis.map(b => Math.round(b.getBoundingClientRect().top))).size;
      return { chip: document.getElementById('editorStatusChip').textContent, tbH: Math.round(tb.getBoundingClientRect().height), rows, n: vis.length, ids: vis.map(b => b.id),
        sigShown: sr.width > 0 && sr.height > 0, sigH: Math.round(sr.height), titleH: Math.round(document.getElementById('reportTitle').getBoundingClientRect().height), sigInRow: sig.parentElement === g, sigInSecondary: !!sig.closest('#edSecondary'), fill: (document.getElementById('fillChipTxt') || {}).textContent }; });
    ok(r.chip === 'UNSENT', 'P02.03 a contract keeps UNSENT (only estimate documents read DRAFT)', r.chip);
    ok(r.sigShown && r.sigInRow && !r.sigInSecondary, 'P03.08 Client signature is in the main row, visible without More', r);
    ok(r.sigH >= 44, 'P03.08 ... at the 44px floor', r.sigH);
    ok(r.rows <= 4 && r.n <= 8, 'P03.08 the 2-column grid stays at 4 rows', { rows: r.rows, n: r.n, ids: r.ids });
    /* 1443 (P07.06) grew the title field from 34 to 44px for the tap floor, and the bar grows by exactly
       that. What this guards is 1439's own move: Client signature in the main row adds no height. */
    ok(r.tbH <= 365 + Math.max(0, r.titleH - 34), 'P03.08 the open toolbar is no taller than it was (363px on 1438, plus the title field\'s growth to the 44px floor)', { tbH: r.tbH, titleH: r.titleH });
    await E(() => document.getElementById('edMoreBtn').click()); await sleep(400);
    const dr = await E(() => [...document.querySelectorAll('#edDrawer .edrow')].map(x => x.textContent.trim()));
    ok(Array.isArray(dr) && dr.length >= 3 && !dr.some(t => /Client signature/.test(t)), 'P03.08 the More drawer no longer lists it (moved, never copied)', dr);
    await E(() => document.getElementById('edMoreBtn').click()); await sleep(300);
    await page.evaluate(() => { const f = document.getElementById('reportFrame'); f.contentWindow.scrollTo(0, 600); f.contentWindow.dispatchEvent(new Event('scroll')); }).catch(() => {}); await sleep(700);
    const fold = await E(() => { const ev = document.getElementById('editorView'); const sig = document.getElementById('sigBtn'); return { compact: ev.classList.contains('edcompact'), sig: getComputedStyle(sig).display }; });
    ok(!fold.compact || fold.sig === 'none', 'P03.08 the folded bar hides it like the other non-Save buttons', fold);
    await page.evaluate(() => { const f = document.getElementById('reportFrame'); f.contentWindow.scrollTo(0, 0); f.contentWindow.dispatchEvent(new Event('scroll')); }).catch(() => {}); await sleep(500); }

  console.log('\nP02.03 + P11.05  Email to client');
  await E(() => document.getElementById('emailDocBtn').click()); await sleep(1500);
  for (let i = 0; i < 4; i++) { if (!(await ask())) break; await pick(/anyway|^Continue/); await sleep(700); }
  await E(() => { const g = document.getElementById('emShGo'); g && g.click(); }); await sleep(2600);
  { const r = await E(() => ({ chip: document.getElementById('editorStatusChip').textContent, toggle: document.getElementById('toggleStatusBtn').textContent, row: (cacheRows.find(x => current && x.id === current.id) || {}).status }));
    ok(r.chip === 'SENT' && r.toggle === 'Mark unsent', 'P02.03 after a successful Email to client the open document reads SENT / Mark unsent', r); }
  if (await ask()) { await pick(/Not now|^No|Cancel|Later/); await sleep(1500); }
  { const r = await E(() => ({ chip: document.getElementById('editorStatusChip').textContent, toggle: document.getElementById('toggleStatusBtn').textContent }));
    ok(r.chip === 'SENT' && r.toggle === 'Mark unsent', 'P02.03 ... and still does after the follow-up question', r); }
  let att = null; try { att = senddoc ? JSON.parse(senddoc).html : null; } catch (_) {}
  ok(!!att, 'P11.05 the Email to client POST was captured', att ? att.length + ' chars' : 'none');
  if (att) {
    const ctx = await pb.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route('**/*', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    const pg = await ctx.newPage(); await pg.setContent(att, { waitUntil: 'load' }); await pg.waitForTimeout(500);
    const r = await pg.evaluate((src) => { const RX = new RegExp(src, 'g'); const vis = e => !!(e && e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const hits = []; let n;
      while ((n = walker.nextNode())) { if (!vis(n.parentElement)) continue; const m = n.textContent.match(RX); if (m) hits.push(...m); }
      const selects = [...document.querySelectorAll('select')].filter(vis).length;
      const t = document.body.innerText;
      return { hits, selects, tap: /Tap a box/.test(t), selectWord: (t.match(/— select —/g) || []).length, client: /Sample Retail Seven/.test(t), terms: /Notice of Cancellation/.test(t), cancel: /may cancel this transaction/.test(t), buyerRow: /Co-buyer/i.test(t) }; }, PROMPT_RX.source);
    await ctx.close();
    ok(r.hits.length === 0, 'P11.05 the emailed contract shows no [prompt] text', r.hits.slice(0, 12).join(' '));
    ok(r.selects === 0 && r.selectWord === 0, 'P11.05 ... no "— select —" dropdowns (answers frozen to text)', { selects: r.selects, word: r.selectWord });
    ok(!r.tap, 'P11.05 ... and not the editor\'s "Tap a box to check it" hint', r.tap);
    ok(r.client && r.terms && r.cancel && r.buyerRow, 'P11.05 control: the filled client name, the Notice of Cancellation text and the Co-buyer row are all still there', r);
    /* control: the shipped api/senddoc.js still links the printed master in the cleaned copy (1427's C) */
    const J0 = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => JSON.stringify(b) });
    const PDF0 = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(3000, 32)]); const sent0 = [];
    const f0 = globalThis.fetch;
    globalThis.fetch = async (u, o) => { u = String(u); if (u.includes('/auth/v1/user')) return J0({ email: 'theo@cardinalrenovations.net', user_metadata: { full_name: 'Theo' } });
      if (u.includes('/docs/')) return { ok: true, status: 200, arrayBuffer: async () => PDF0 }; if (u.includes('api.resend.com')) { sent0.push(JSON.parse(o.body)); return J0({ id: 'e1' }); } return J0([]); };
    process.env.RESEND_API_KEY = 're_test';
    try {
      const tmp = join(os.tmpdir(), 'gateA3_senddoc_' + process.pid + '.mjs'); fs.writeFileSync(tmp, fs.readFileSync(REPO + 'api/senddoc.js', 'utf8').replace(/from '\.\/_/g, "from '" + pathToFileURL(REPO + 'api/').href + '_'));
      const sd = await import(pathToFileURL(tmp).href); const res = { s: 0, status(c) { this.s = c; return this; }, json() { return this; } };
      await sd.default({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { to: 'retail7@example.com', title: 'Contract \u2014 Roofing \u2014 Sample Retail Seven', html: att } }, res);
      const a0 = sent0[0] ? Buffer.from(sent0[0].attachments[0].content, 'base64').toString('utf8') : '';
      ok(res.s === 200 && /data-cr-master="1"/.test(a0) && sent0[0].attachments.length === 2,
        'P11.05 control: senddoc still links and attaches the printed master to the cleaned copy', { status: res.s, linked: /data-cr-master="1"/.test(a0), files: sent0[0] && sent0[0].attachments.length });
    } catch (e) { ok(false, 'P11.05 senddoc control threw: ' + String(e.message).split('\n')[0]); }
    globalThis.fetch = f0;
  }

  console.log('\nP03.09  signing in person');
  await sleep(2500);
  await E(() => document.getElementById('sigBtn').click()); await sleep(1200);
  await pick(/Sign anyway/); await sleep(900);
  if (await ask()) { await pick(/anyway|^Continue/); await sleep(800); }
  await E(() => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Buyer' && e.offsetParent); b && b.click(); }); await sleep(900);
  await E(() => { const c = document.getElementById('sigPad'); if (!c) return; const r = c.getBoundingClientRect();
    const fire = (t, x, y) => c.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, clientX: r.left + x, clientY: r.top + y }));
    fire('mousedown', 20, r.height / 2); for (let i = 0; i < 20; i++) fire('mousemove', 20 + i * 10, r.height / 2 + (i % 2 ? 12 : -12)); document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
  await E(() => { const b = document.getElementById('sigApply'); if (b && b.offsetParent) b.click(); }); await sleep(1500);
  { const r = await E(() => ({ toasts: [...document.querySelectorAll('#crToasts .crt, .crtm')].filter(t => t.getClientRects().length).map(t => t.textContent.trim().slice(0, 60)),
      signed: !!document.getElementById('reportFrame').contentDocument.querySelector('.sigslot.signed'), chip: document.getElementById('editorStatusChip').textContent }));
    ok(r.signed && r.chip === 'SIGNED', 'P03.09 the buyer\'s signature landed (control)', r);
    ok(Array.isArray(r.toasts) && r.toasts.some(t => /^Signed/.test(t)) && !r.toasts.some(t => /^Saved/.test(t)), 'P03.09 one confirmation: "Signed — buyer", no "Saved —" stacked with it', r.toasts); }
  if (await ask()) { await pick(/Not now|^No|Cancel|Later/); await sleep(500); }
  await E(() => closeEditor()); await sleep(1000);

  console.log('\nP05.07  the home Activity Count');
  await E(() => { try { showHome(); } catch (_) {} try { renderOps(); } catch (_) {} }); await sleep(1000);
  { const r = await E(() => { const t = document.querySelector('#actStrip .actbox:nth-child(4)'); return { head: (document.querySelector('.acthead') || {}).textContent, tile: t ? t.innerText.replace(/\s+/g, ' ') : null, crm: document.body.dataset.crm }; });
    ok(/All Boards/i.test(r.head || '') && /Last 30 Days/i.test(r.head || ''), 'P05.07 the strip is labelled with its scope: all boards, last 30 days', r.head);
    ok(/Money Collected \$16,500/.test(r.tile || ''), 'P05.07 Money Collected still reads $16,500 (label only, no number changed)', r.tile); }

  console.log('\nP05.11  Commissions on a phone');
  await E(() => window.CardinalPay.open()); await sleep(1800);
  const COMM = () => { const t = document.querySelector('#payView table.pay-owed') || [...document.querySelectorAll('#payView .pay-card')].find(c => /^Owed/.test((c.querySelector('h3') || {}).textContent || '')).querySelector('table');
    const th = t ? [...t.querySelectorAll('thead th')].map(h => ({ t: h.textContent.trim(), shown: getComputedStyle(h).display !== 'none' })) : [];
    const net = t ? [...t.querySelectorAll('tbody tr')].filter(tr => tr.children.length >= 5).map(tr => ({ v: tr.children[3].textContent.trim(), shown: getComputedStyle(tr.children[3]).display !== 'none' })) : [];
    const draws = [...document.querySelectorAll('#payView .pay-card')].find(c => /^Active draws/.test((c.querySelector('h3') || {}).textContent || ''));
    const dth = draws && draws.querySelector('thead') ? [...draws.querySelectorAll('thead th')].map(h => h.textContent.trim() + (getComputedStyle(h).display === 'none' ? ':hidden' : '')) : [];
    return { th, net, dth, sw: document.documentElement.scrollWidth, vw: innerWidth, tw: t ? Math.round(t.getBoundingClientRect().width) : null }; };
  { const r = await E(COMM);
    const sh = n => (r.th || []).find(h => h.t === n);
    ok(sh('Net') && sh('Net').shown && r.net.length > 0 && r.net.every(c => c.shown), 'P05.11 390: the Owed table shows Net, the amount actually paid', r);
    ok(sh('Draws') && !sh('Draws').shown && sh('Owed') && sh('Owed').shown, 'P05.11 390: ... and hides Draws instead', r.th);
    ok(r.sw <= r.vw, 'P05.11 390: the page does not scroll sideways', { sw: r.sw, vw: r.vw, tw: r.tw });
    ok((r.dth || []).join(',') === 'Rep,Amount,Job,Paid:hidden,', 'P05.11 the other tables keep their phone column rule (Active draws, unchanged)', r.dth); }
  await page.setViewportSize({ width: 1280, height: 900 }); await sleep(600);
  { const r = await E(COMM);
    ok((r.th || []).filter(h => h.t).every(h => h.shown) && r.th.filter(h => h.t).length === 4, 'P05.11 desktop: Rep, Owed, Draws and Net all show', r.th); }
  await page.setViewportSize({ width: 390, height: 844 }); await sleep(400);
  await E(() => { try { window.CardinalPay.close(); } catch (_) {} try { hideAllViews(); } catch (_) {} }); await sleep(600);
} catch (e) { ok(false, 'phone session threw: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
await B1.browser.close();

/* ══ 2 · PHONE: the invoice editor with no line items (V3) ══ */
console.log('\nV3  the phone invoice editor\'s Bill To table');
{
  const NOINV = `(function(){ var S=window.__SEED__; if(!S) return; S.inspection_reports = S.inspection_reports.filter(function(r){ return !/^inv/.test(r.id); }); })();`;
  const { browser, page: p2 } = await boot('theo', { instr: false, seed: NOINV });
  try {
    await p2.evaluate(() => { try { window.CardinalFrontDoor && window.CardinalFrontDoor.close(); } catch (_) {} openProject('R1'); }); await sleep(2400);
    await p2.evaluate(() => { const b = document.querySelector('#projectView [data-inv-gen]'); b && b.click(); }); await sleep(4500);
    const r = await p2.evaluate(() => { const fr = document.getElementById('reportFrame'); const d = fr.contentDocument; const t = d.querySelector('table.meta');
      const cut = t ? [...t.querySelectorAll('td')].filter(td => td.getBoundingClientRect().right > d.documentElement.clientWidth + 1).map(td => td.textContent.trim().slice(0, 18)) : ['no table'];
      return { title: document.getElementById('reportTitle').value, items: !!d.querySelector('table.items'), docSW: d.documentElement.scrollWidth, docCW: d.documentElement.clientWidth, frameW: Math.round(fr.getBoundingClientRect().width), tableR: t ? Math.round(t.getBoundingClientRect().right) : null, cut,
        inv: (d.body.innerText.match(/Invoice #\s*\n?\s*(\S+)/) || [])[1], due: /Upon receipt/.test(d.body.innerText) }; });
    ok(/^Invoice/.test(r.title) && !r.items, 'V3 control: an invoice with no line items is open (the phone-width layout)', r);
    ok(r.docSW <= r.docCW + 1 && r.cut.length === 0, 'V3 the Bill To table fits the 390px frame: nothing cut at the right edge', r);
  } catch (e) { ok(false, 'V3 session threw: ' + String(e.message).split('\n')[0]); }
  await browser.close();
}

/* ══ 3 · DESKTOP: documents printed the editor way ══ */
const B3 = await boot('theo', { desktop: true, seed: SEED_EXTRA, instr: false });
const d3 = B3.page;
const E3 = (f, a) => d3.evaluate(f, a).catch(e => ({ __err: String(e.message).split('\n')[0] }));
const printOf = id => E3(async (id) => { await openEditor(id); await new Promise(r => setTimeout(r, 2300)); const d = document.getElementById('reportFrame').contentDocument;
  ensurePrintFix(d); compactForPrint(d); const h = '<!DOCTYPE html>\n' + d.documentElement.outerHTML; restorePrintMarks(d);
  const after = { prompts: (d.body.innerText.match(/\[[^\]\n]{1,90}\]/g) || []).length, blankph: d.querySelectorAll('[data-blankph],[data-origph],[data-origtxt],[data-crblank],[data-origfig]').length, cobuyer: /\[CO-BUYER\]/.test(d.body.innerText) };
  let ser = ''; try { ser = serializeFrame(); } catch (_) {}
  const pf = (d.getElementById('printFix') || {}).textContent || '';
  await closeEditor(); return { h, after, ser: { co: /\[CO-BUYER\]/.test(ser), marks: /data-(blankph|origph|origtxt|crblank|origfig)/.test(ser) }, pf }; }, id);
try {
  await E3(() => { try { window.CardinalFrontDoor && window.CardinalFrontDoor.close(); } catch (_) {} openProject('R9'); }); await sleep(1500);
  await E3(() => { window.crAsk = async () => true; });
  const made = {};
  made.estimate = await E3(async () => { const e = window.__SEED__.estimates.find(x => x.id === 'eR9'); const p = cacheProjects.find(x => x.id === 'R9'); return await window.db.create('EST-2026-0209 — Roof Replacement — OC Duration', window.CardinalEstimatePublish.buildDocHtml(e, p, {}), p.name, p.id); });
  for (const n of [1, 2, 3]) made['gbb' + n] = await E3(async (n) => { const S = window.__SEED__.estimates; const p = cacheProjects.find(x => x.id === 'R9'); const all = [{ est: S.find(x => x.id === 'eR9g'), label: 'Good' }, { est: S.find(x => x.id === 'eR9'), label: 'Better' }, { est: S.find(x => x.id === 'eR9b'), label: 'Best' }];
    return await window.db.create('Roof Options — Sample Homeowner Nine', window.CardinalEstimatePublish.buildGbbHtml(n === 3 ? all : all.slice(0, n), p, (window.CardinalEstimatePublish.plans || [])[0]), p.name, p.id); }, n);
  for (const [k, fn] of [['invoice', 'createInvoiceFor(cacheProjects.find(x => x.id === "R9"))'], ['contract', 'createContractForCurrent("roof")']]) {
    const n0 = await E3(() => window.__SEED__.inspection_reports.length);
    await E3((fn) => (0, eval)(fn), fn); await sleep(2800);
    const ids = await E3(n => window.__SEED__.inspection_reports.slice(n).map(x => x.id), n0); made[k] = ids && ids[0];
    await E3(() => closeEditor()); await sleep(700);
  }
  ok(Object.values(made).every(v => typeof v === 'string'), 'docs control: estimate, Roof Options x3, invoice and contract were made', made);

  { await E3(id => openEditor(id), made.estimate); await sleep(2300);
    const r = await E3(() => { const c = document.getElementById('edClientChip'); const s = c.querySelector('small'); const cr = c.getBoundingClientRect(), sr = s ? s.getBoundingClientRect() : null;
      return { back: c.innerText.replace(/\s+/g, ' ').trim(), label: s ? s.innerText : null, labelFits: !!sr && sr.right <= cr.right - 4 && sr.width > 0 }; });
    ok(/^\u2039 Back PO \d+: Sample Homeowner Nine$/.test(r.back) && /^PO \d+:$/.test(r.label || '') && r.labelFits, 'P02.03 desktop: the back chip names the number as a PO, the label itself in full', r);
    await E3(() => closeEditor()); await sleep(700); }

  console.log('\nP02.11  the estimate on a phone (in-app preview, 362px)');
  { const r = await E3(async () => { const e = window.__SEED__.estimates.find(x => x.id === 'eR9'); const p = cacheProjects.find(x => x.id === 'R9'); const h = window.CardinalEstimatePublish.buildDocHtml(e, p, {});
      const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:362px;height:700px;border:0;z-index:99999'; document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(h); f.contentDocument.close(); await new Promise(r => setTimeout(r, 500)); const d = f.contentDocument;
      const tbl = d.querySelector('table.meta'); const tw = tbl.getBoundingClientRect().width;
      const ks = [...d.querySelectorAll('table.meta td.k')].filter(k => k.textContent.trim()).map(k => { const lh = parseFloat(getComputedStyle(k).lineHeight) || 16; const r = k.getBoundingClientRect(); return { t: k.textContent.trim(), w: Math.round(r.width), lines: Math.round((r.height - parseFloat(getComputedStyle(k).paddingTop) - parseFloat(getComputedStyle(k).paddingBottom)) / lh) }; });
      f.remove(); return { tw: Math.round(tw), ks }; });
    ok(r.ks && r.ks.length >= 4 && r.ks.every(k => k.w >= r.tw - 1), 'P02.11 every stacked label spans the column', r);
    ok(r.ks && r.ks.every(k => k.lines <= 1), 'P02.11 ... so none wraps (PREPARED FOR, PROPERTY ADDRESS, CLIENT CONTACT, VALID THROUGH)', r.ks); }

  const INK = () => { const o = {}; const pick = s => [...document.querySelectorAll(s)].filter(e => e.textContent.trim()).slice(0, 4).map(e => getComputedStyle(e).color);
    o.metaK = pick('table.meta td.k'); o.foot = pick('.foot'); o.gbbEn = pick('.gbb-en');
    const f = document.querySelector('.foot'); o.footBreak = f ? getComputedStyle(f).breakBefore : null;
    o.live = [...document.querySelectorAll('[data-cardinal-live]')].filter(e => e.getClientRects().length && e.id === 'cr-inv-live').length; return o; };

  console.log('\nP11.11 + P11.13  the estimate');
  const est = await printOf(made.estimate);
  const pe = await pdfOf(est.h, 'est.html', INK);
  { const k = pe.probe.metaK.map(c => RATIO(c, 'rgb(255,255,255)')), f = pe.probe.foot.map(c => RATIO(c, 'rgb(255,255,255)'));
    ok(k.length >= 4 && k.every(x => x >= 4.5), 'P11.11 estimate labels (Prepared For, Estimate # ...) >= 4.5:1 on paper', k);
    ok(f.length >= 1 && f.every(x => x >= 4.5), 'P11.11 estimate closing footer >= 4.5:1', f);
    const m = /@bottom-center\{[^}]*color:(#[0-9a-f]{6})/i.exec(est.pf || '');
    ok(!!m && RATIO(m[1].replace(/^#(..)(..)(..)$/, (a, r, g, b) => `rgb(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)})`), 'rgb(255,255,255)') >= 4.5, 'P11.11 the printed page footer (office phone) >= 4.5:1', m && m[1]);
    ok(pe.probe.footBreak === 'avoid', 'P11.13 the estimate\'s closing line keeps company with the block above (break-before:avoid)', pe.probe.footBreak);
    const last = pe.pages[pe.pages.length - 1].split('\n').filter(l => l.trim());
    ok(last.length >= 4, 'P11.13 the estimate\'s last page is not the closing line alone', last.length + ' lines'); }

  for (const n of [1, 2, 3]) {
    const g = await printOf(made['gbb' + n]);
    const pg = await pdfOf(g.h, 'gbb' + n + '.html', INK);
    ok(pg.pages.length === 1, `P11.13 Roof Options with ${n} option${n > 1 ? 's' : ''} prints on ONE Letter page`, pg.pages.length + ' pages');
    if (n === 3) {
      ok(/Owens Corning warranty registered/.test(pg.text) && /www\.cardinalrenovations\.net/.test(pg.text) && /Initial to choose/.test(pg.text), 'P11.13 control: the fine print, the company line and every "Initial to choose" box still print', '');
      const en = pg.probe.gbbEn.map(c => RATIO(c, 'rgb(255,255,255)')), ft = pg.probe.foot.map(c => RATIO(c, 'rgb(255,255,255)'));
      ok(en.length === 3 && en.every(x => x >= 4.5), 'P11.11 Roof Options estimate numbers (EST-2026-...) >= 4.5:1', en);
      ok(ft.length >= 1 && ft.every(x => x >= 4.5) && pg.probe.footBreak === 'avoid', 'P11.11/P11.13 Roof Options footer >= 4.5:1 and kept with the block above', { ft, br: pg.probe.footBreak });
    }
  }

  console.log('\nP11.07  the printed invoice');
  { const iv = await printOf(made.invoice);
    const pi = await pdfOf(iv.h, 'inv.html', INK);
    ok(!/INVOICE STATUS/i.test(pi.text) && pi.probe.live === 0, 'P11.07 no INVOICE STATUS box on paper', { live: pi.probe.live });
    ok(/PAYMENT HISTORY/i.test(pi.text), 'P11.07 the payment history still prints', '');
    const paid = (pi.text.match(/Paid\s+(\S+)/) || [])[1];
    ok(paid === '$0.00', 'P11.07 nothing paid prints "$0.00", not "-$0.00"', paid);
    ok(pi.pages.length <= 2, 'P11.07 10 lines print on 2 pages, not 3 (Terms no longer forced onto its own)', pi.pages.length + ' pages');
    const tp = pi.pages.findIndex(p => /\bTerms\b/.test(p) && /Payment terms\./.test(p));
    ok(tp >= 0 && /(Balance due|Please remit)/.test(pi.pages[tp]) , 'P11.07 Terms prints on the page with the summary\'s close', tp); }

  console.log('\nP11.05  the printed contract');
  { const c = await printOf(made.contract);
    const pc = await pdfOf(c.h, 'ctr.html', null);
    const hits = pc.text.match(PROMPT_RX) || [];
    ok(hits.length === 0, 'P11.05 the printed contract shows no [prompt] text ([CO-BUYER], [INSURANCE CO.], [n], [rate], [0.00], [__] ...)', hits.slice(0, 12).join(' '));
    ok(!/— select —/.test(pc.text), 'P11.05 ... and no "— select —"', (pc.text.match(/— select —/g) || []).length);
    ok(/Sample Homeowner Nine/.test(pc.text) && /may cancel this transaction/.test(pc.text) && /Co-buyer/i.test(pc.text), 'P11.05 control: the filled client name, the right-to-cancel text and the Co-buyer row still print', '');
    ok(c.after.cobuyer && c.after.prompts > 5 && c.after.blankph === 0, 'P11.05 after printing the editor has every prompt back and no print marks', c.after);
    ok(c.ser.co && !c.ser.marks, 'P11.05 what is saved is the document with its prompts, never the print\'s blanks', c.ser); }

  console.log('\nP04.03  app print: figure captions renumber with their headings');
  { const r = await E3(async (h) => { const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-5000px;width:800px;height:600px'; document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(h); f.contentDocument.close(); await new Promise(r => setTimeout(r, 400)); const d = f.contentDocument;
      const figs = () => { const out = []; let cur = null; [...d.querySelectorAll('h2.sec, .fig')].forEach(e => { if (e.matches('h2.sec')) { if (!e.closest('[data-emptysec]')) cur = (e.querySelector('.num') || {}).textContent; return; }
        if (e.closest('[data-emptysec]') || e.getAttribute('data-emptyfig') || !e.querySelector('.frame img')) return; const b = e.querySelector('.cap > b'); const m = b && /Fig\.\s*(\d+)\./.exec(b.textContent); if (m) out.push({ under: String(cur).trim(), fig: m[1], txt: b.textContent }); }); return out; };
      const orig = [...d.querySelectorAll('.fig .cap > b')].map(b => b.textContent).join('|');
      compactForPrint(d); const printed = figs(); restorePrintMarks(d); const back = [...d.querySelectorAll('.fig .cap > b')].map(b => b.textContent).join('|'); f.remove();
      return { printed, restored: orig === back }; }, REPORT_AI);
    ok(r.printed && r.printed.length >= 3, 'P04.03 control: the AI report prints at least 3 photos', r.printed);
    ok(r.printed && r.printed.every(x => x.fig === x.under), 'P04.03 app print: every caption carries its printed section number', r.printed);
    ok(r.restored, 'P04.03 app print: restorePrintMarks() puts every caption back', r.restored); }
} catch (e) { ok(false, 'desktop session threw: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
await B3.browser.close();

/* ══ 4 · the share page (the shipped handler, stubbed fetch) ══ */
console.log('\nP04.03  the share page: figure captions renumber with their headings');
try {
  const J = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => JSON.stringify(b) });
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-not-real';
  globalThis.fetch = async (u) => String(u).includes('share_token') ? J([{ id: 'd1', project_id: 'R1', project: 'Sample', html: REPORT_AI, title: 'Sample Retail One — 5 Pine St', total: 0, signed_at: null }]) : J([]);
  const tmp = join(os.tmpdir(), 'gateA3_share_' + process.pid + '.mjs'); fs.writeFileSync(tmp, fs.readFileSync(SHARE, 'utf8').replace(/from '\.\/_/g, "from '" + pathToFileURL(REPO + 'api/').href + '_'));
  const m = await import(pathToFileURL(tmp).href);
  let out = '';
  await m.default({ query: { t: 'aaaaaaaa-bbbb-cccc-dddd-0000000000d2' }, headers: {} }, { setHeader() {}, status() { return this; }, send(s) { out = String(s); }, end(s) { out = String(s || out); } });
  ok(out.length > 1000, 'P04.03 control: share.js served the report', out.length);
  for (const [dv, opt] of [['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['desktop', { viewport: { width: 1280, height: 900 } }]]) {
    const ctx = await pb.newContext(opt); await ctx.route('**/*', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    const p = await ctx.newPage(); await p.setContent(out, { waitUntil: 'load' }); await sleep(500);
    const r = await p.evaluate(() => { const vis = e => e.offsetParent !== null && getComputedStyle(e).display !== 'none'; const res = []; let cur = null;
      [...document.querySelectorAll('h2.sec, .fig')].forEach(e => { if (e.matches('h2.sec')) { if (vis(e)) cur = (e.querySelector('.num') || {}).textContent; return; } if (!vis(e)) return; const b = e.querySelector('.cap > b'); const mm = b && /Fig\.\s*(\d+)\./.exec(b.textContent); if (mm) res.push({ under: String(cur).trim(), fig: mm[1] }); });
      return res; });
    ok(r.length >= 3 && r.every(x => x.fig === x.under), `P04.03 share page (${dv}): every visible caption carries its heading's number`, r);
    await ctx.close();
  }
  /* P11.11 / P11.07 share-side: the client's own print footer, and "$0.00" for nothing paid */
  const src = fs.readFileSync(SHARE, 'utf8');
  ok(!/@bottom-center\{[^}]*#8a8a8a/.test(src) && /@bottom-center\{[^}]*#6b6b6b/.test(src), 'P11.11 the share page\'s printed footer is #6b6b6b (5.33:1), not #8a8a8a (3.45:1)', '');
  const inv = m.liveInvoiceSummary ? null : null;   /* not exported: driven through the handler instead */
  globalThis.fetch = async (u) => { u = String(u);
    if (u.includes('share_token')) return J([{ id: 'v1', project_id: 'R1', project: 'Sample', html: '<html><head></head><body><div class="est-head"></div><table><tr><td>Paid</td><td id="invPaid">&#8722;$0.00</td></tr><tr><td id="estTotal">$1,000.00</td></tr></table></body></html>', title: 'Invoice — Sample', total: 1000, signed_at: null }]);
    if (u.includes('/collections')) return J([]); if (u.includes('/projects')) return J([{ checklist: '{}' }]); return J([]); };
  let o2 = '';
  await m.default({ query: { t: 'aaaaaaaa-bbbb-cccc-dddd-0000000000d3' }, headers: {} }, { setHeader() {}, status() { return this; }, send(s) { o2 = String(s); }, end(s) { o2 = String(s || o2); } });
  const pc = (/id="invPaid"[^>]*>([^<]*)</.exec(o2) || [])[1];
  ok(pc === '$0.00', 'P11.07 the share page writes Paid $0.00 when nothing is paid (not -$0.00)', pc);
} catch (e) { ok(false, 'share session threw: ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
await pb.close();

const errs = log.filter(l => /PAGEERROR/.test(l));
ok(errs.length === 0, 'no page errors in any session', errs.slice(0, 3));
const total = passes + fails.length;
const FLOOR = 60;
if (total < FLOOR) { fails.push(`only ${total} checks ran (floor ${FLOOR})`); console.log(`  ✗ FAIL only ${total} checks ran (floor ${FLOOR})`); }
console.log(`\n${fails.length ? 'GATE 1439 RED' : 'GATE 1439 GREEN'} — ${passes} passed, ${fails.length} failed`);
clearTimeout(watchdog);
process.exit(fails.length ? 1 : 0);
