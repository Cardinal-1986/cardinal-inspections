/* gate_1427.mjs — Builder D: contracts, remote signing, shared client pages.
   usage: node gate_1427.mjs [index.html] [api dir]      GREEN on D's output, RED (named, no crash) on 1422.
   Needs NODE_PATH for nothing beyond playwright; drives the SHIPPED code:
     App (Chromium rig, gate_1403_lib boot)     a real Roofing agreement made by createContractForCurrent()
                                                 and REPORT_TEMPLATE, plus the editor's send/sign buttons
     api/share.js   (served page, Chromium)     notice delivery, phone view, frozen answers, sheet fields,
                                                 report numbering, estimate Letter view unchanged
     api/clientsign.js (node, stubbed fetch)    initials, co-buyer, signer's copy, never a guessed address
     api/senddoc.js   (node, stubbed fetch)     an emailed agreement carries its printed master
   Sections: A app · S share page · E end-to-end remote signing · B clientsign · C senddoc            */
import fs from 'fs'; import os from 'os'; import path from 'path'; import { pathToFileURL } from 'url';
const REPO = '/home/user/cardinal-inspections';
const INDEX = path.resolve(process.argv[2] || path.join(REPO, 'index.html'));
const API = path.resolve(process.argv[3] || path.join(REPO, 'api'));
process.env.APPFILE = INDEX;
const { boot, log } = await import(REPO + '/.claude/skills/cardinal-build/scripts/gate_1403_lib.mjs');
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 420000).unref();

let pass = 0; const fails = [];
function ok(c, name, detail) { if (c) { pass++; console.log('  PASS  ' + name); } else { fails.push(name); console.log('  FAIL  ' + name + (detail !== undefined ? '  -> ' + String(detail).slice(0, 300) : '')); } }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gateD-'));
for (const f of ['share.js', 'clientsign.js', 'senddoc.js', '_staff.js']) fs.copyFileSync(path.join(API, f), path.join(TMP, f));
fs.writeFileSync(path.join(TMP, 'package.json'), '{"type":"module"}');   // api/package.json's own setting
const importFresh = async (name) => import(pathToFileURL(path.join(TMP, name)).href + '?' + Date.now() + Math.random());

/* ═══ A · the app: make a real agreement, then the editor's four ways out ═══ */
const SEED = `(function(){ var S=window.__SEED__; var r=S.projects.find(function(p){return p.id==='R1';});
  S.projects.push(Object.assign({}, r, { id:'R7', name:'Sample Retail Seven', stage:'Prospect', email:'retail7@example.com', phone:'9375550197', address:'7 Pine St' })); })();`;
let AGR = '', REPORT = '', blanks0 = 0;
{
  const { browser, page } = await boot('theo', { instr: false, seed: SEED });
  const tryDo = async (fn, why) => { try { await fn(); return true; } catch (e) { ok(false, why, e.message.split('\n')[0]); return false; } };
  const askState = () => page.evaluate(() => { const a = document.getElementById('crAsk');
    return { open: !!(a && a.classList.contains('open')), text: a ? a.innerText.replace(/\s+/g, ' ') : '', picks: a ? [...a.querySelectorAll('.askpick')].map(b => b.getAttribute('data-pick')) : [] }; });
  const dialogsSince = (n) => log.slice(n).filter(l => /^DIALOG/.test(l));
  try {
    await page.evaluate(() => { try { hideAllViews(); } catch (e) {} openProject('R7'); }); await sleep(1500);
    await page.evaluate(() => createContractForCurrent('roof')); await sleep(3500);
    const h = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument;
      return { agr: (typeof serializeFrame === 'function') ? serializeFrame() : '', rep: window.REPORT_TEMPLATE || '', n: (typeof fillBlanks === 'function') ? fillBlanks(d).length : -1,
        title: (document.getElementById('titleInput') || {}).value || '' }; });
    AGR = h.agr; REPORT = h.rep; blanks0 = h.n;
    ok(/data-sig="buyer"/.test(AGR) && /ROOFING CONSTRUCTION/.test(AGR) && blanks0 > 5, 'A0  the rig makes a real Roofing agreement with blanks (fillBlanks = ' + blanks0 + ')', h.title);

    // A11 the editor's print path: a contract's CONTRACT PRICE prints once (tfoot as a plain row group)
    await page.emulateMedia({ media: 'print' });
    const tf = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument;
      try { ensurePrintFix(d); } catch (e) { return 'ERR ' + e.message; }
      const f = d.querySelector('table.items tfoot'); const v = f ? d.defaultView.getComputedStyle(f).display : 'none';
      const pf = d.getElementById('printFix'); if (pf) pf.remove(); return v; });
    await page.emulateMedia({ media: 'screen' });
    ok(tf === 'table-row-group', 'A11 printing a contract from the editor: CONTRACT PRICE prints once, not at every page break', tf);
    const lblC = await page.evaluate(() => ((document.querySelector('#textSignBtn .bl') || {}).textContent || '').trim());
    ok(lblC === 'Text to sign', 'A10 a contract keeps "Text to sign"', lblC);
    // A1 Share link: asks first, names where, Fill them goes back without sending
    let n0 = log.length;
    await page.evaluate(() => document.getElementById('shareBtn').click()); await sleep(1500);
    let a = await askState();
    ok(a.open && /blanks? (is|are) still unfilled on this contract/.test(a.text) && /Customer Information|Decking|Shingles|Warranty|Timeline/.test(a.text),
      'A1  Share link on a contract with blanks asks first and names where they are', a.text);
    ok(dialogsSince(n0).length === 0, 'A1  ...and no link is handed out before the rep answers', dialogsSince(n0).join(' | '));
    ok(a.picks.includes('fill') && a.picks.includes('go'), 'A1  ...offering "Fill them" and "Share anyway"', JSON.stringify(a.picks));
    if (await tryDo(() => page.click('#crAsk .askpick[data-pick="fill"]', { timeout: 3000 }), 'A1  (tap Fill them)')) {
      await sleep(400);
      const hi = await page.evaluate(() => !!document.getElementById('reportFrame').contentDocument.querySelector('.crfill-hi'));
      ok(hi && dialogsSince(n0).length === 0, 'A1  Fill them jumps to the first blank and sends nothing', 'hi=' + hi);
    }
    n0 = log.length;
    await page.evaluate(() => document.getElementById('shareBtn').click()); await sleep(1500);
    if (await tryDo(() => page.click('#crAsk .askpick[data-pick="go"]', { timeout: 3000 }), 'A2  (tap Share anyway)')) {
      await sleep(1500);
      ok(dialogsSince(n0).some(l => /Share link/.test(l)), 'A2  "Share anyway" still hands out the link — a deliberate send is never blocked', dialogsSince(n0).join(' | '));
    }
    // A3 Text to sign
    n0 = log.length;
    await page.evaluate(() => document.getElementById('textSignBtn').click()); await sleep(1500);
    a = await askState();
    ok(a.open && /still unfilled/.test(a.text), 'A3  Text to sign asks the same question', a.text);
    await page.evaluate(() => { const b = document.querySelector('#crAsk .askpick[data-pick="fill"]') || document.querySelector('#crAsk .askno'); if (b) b.click(); }); await sleep(600);
    // A4 Email to client: the price question (if any) first, then the blanks; "Email anyway" opens the sheet
    await page.evaluate(() => document.getElementById('emailDocBtn').click()); await sleep(1500);
    a = await askState();
    if (a.open && /has no total/.test(a.text)) { await page.click('#crAsk .askgo'); await sleep(1200); a = await askState(); }
    ok(a.open && /still unfilled/.test(a.text), 'A4  Email to client asks too', a.text);
    if (await tryDo(() => page.click('#crAsk .askpick[data-pick="go"]', { timeout: 3000 }), 'A4  (tap Email anyway)')) {
      await sleep(1200);
      const sheet = await page.evaluate(() => { const s = document.getElementById('crEmailSheet'); return !!(s && s.classList.contains('open')); });
      ok(sheet, 'A4  "Email anyway" goes on to the email sheet', sheet);
      await page.evaluate(() => { const b = document.getElementById('emShNo'); if (b) b.click(); }); await sleep(300);
    }
    // A5 Client signature (in person): asked before the pen
    await page.evaluate(() => document.getElementById('sigBtn').click()); await sleep(1200);
    a = await askState();
    ok(a.open && /still unfilled/.test(a.text) && /Sign anyway/.test(a.text), 'A5  Client signature asks before a pen touches the contract', a.text);
    if (await tryDo(() => page.click('#crAsk .askpick[data-pick="go"]', { timeout: 3000 }), 'A5  (tap Sign anyway)')) {
      await sleep(800);
      const who = await page.evaluate(() => { const w = document.querySelector('[data-who]'); if (!w) return false; let o = w; while (o.parentElement && o.parentElement !== document.body) o = o.parentElement; o.click(); return true; });
      ok(who, 'A5  "Sign anyway" opens the who-is-signing picker as before', who);
    }
    await page.evaluate(() => { const b = document.querySelector('#crAsk .askno'); if (b && document.getElementById('crAsk').classList.contains('open')) b.click(); });
    // A9 a "Saved" toast never sits on an open sheet's buttons (the Email sheet; every crAsk)
    const ov = await page.evaluate(async () => {
      try { window.crToastOk('Saved \u2014 test toast'); } catch (e) {}
      const pr = (typeof crEmailSheet === 'function') ? crEmailSheet({ to: 'x@example.com', subject: 's', message: 'm' }) : null;
      await new Promise(r => setTimeout(r, 300));
      const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const ts = [...document.querySelectorAll('#crToasts .crt')].map(e => e.getBoundingClientRect()).filter(r => r.height > 0);
      const bs = ['emShGo', 'emShNo'].map(id => document.getElementById(id)).filter(Boolean).map(e => e.getBoundingClientRect());
      const n = ts.length, bad = bs.some(b => ts.some(x => hit(x, b)));
      const no = document.getElementById('emShNo'); if (no) no.click();
      if (pr) await pr;
      return { toasts: n, buttons: bs.length, covered: bad }; });
    ok(ov.toasts > 0 && ov.buttons === 2 && !ov.covered, 'A9  on a phone the "Saved" toast no longer covers the Email sheet\'s Send / Cancel', JSON.stringify(ov));
    // A10 a report cannot be signed by its link, so its button is "Text link"
    const lblR = await page.evaluate(async () => { try {
      const id = await db.create('Roof Inspection \u2014 Sample Retail Seven', REPORT_TEMPLATE, 'Sample Retail Seven', 'R7');
      await reload(); await openEditor(id); await new Promise(r => setTimeout(r, 1500));
      return ((document.querySelector('#textSignBtn .bl') || {}).textContent || '').trim(); } catch (e) { return 'ERR ' + e.message; } });
    ok(lblR === 'Text link', 'A10 an inspection report\'s button reads "Text link", not "Text to sign"', lblR);
    // A6 Upload signed contract: Curtis + office hear; the stage does NOT move
    await page.evaluate(() => { try { if (typeof closeEditor === 'function') closeEditor(); } catch (e) {} try { hideAllViews(); } catch (e) {} openProject('R7'); }); await sleep(1500);
    await page.evaluate(() => { showTab('contracts'); document.getElementById('pUploadContractBtn').click(); }); await sleep(800);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    n0 = log.length;
    const up = await tryDo(async () => {
      await page.fill('#ctUpAmt', '14250'); await page.fill('#ctUpDate', '2026-10-28');
      await page.setInputFiles('#ctUpFile', { name: 'signed.png', mimeType: 'image/png', buffer: png });
      await page.click('#ctUpGo');
    }, 'A6  (fill and save Upload signed contract)');
    if (up) {
      await sleep(3500);
      const notes = log.slice(n0).filter(l => /^API POST \/api\/notify/.test(l));
      ok(notes.some(l => /curtis@cardinalrenovations\.net/.test(l) && /Signed contract uploaded/.test(l)),
        'A6  Upload signed contract tells Curtis and the office through notifyTeam', notes.join(' | ') || 'no /api/notify');
      const st = await page.evaluate(() => { const p = cacheProjects.find(x => x.id === 'R7');
        const w = (window.__WRITES__ || []).filter(x => x.table === 'projects' && x.payload && x.payload.stage);
        return { stage: p && p.stage, stageWrites: w.length, saved: (window.__WRITES__ || []).some(x => x.table === 'inspection_reports' && x.payload && x.payload.signed_at) }; });
      ok(st.saved && st.stage === 'Prospect' && st.stageWrites === 0, 'A6  ...and the stage is NOT moved (Theo\'s call) — still Prospect, no stage write', JSON.stringify(st));
    }
    const errs = log.filter(l => /PAGEERROR/.test(l));
    ok(errs.length === 0, 'A7  no page errors in the app run', errs.slice(0, 3).join(' | '));
  } catch (e) { ok(false, 'A   app run crashed', e.message); }
  await browser.close();
}
{
  const src = fs.readFileSync(INDEX, 'utf8');
  ok(!/The Right to Cancel and the printed Notice of Cancellation go with this agreement\./.test(src) && /share link and the client\\u2019s signed-copy email carry them/.test(src),
    'A8  the estimate→contract message no longer claims a Notice is attached that is not');
}
if (!AGR) { AGR = fs.readFileSync(path.join(REPO, '.claude/skills/cardinal-build/scripts/gate_1401_seed.js'), 'utf8').slice(0, 0); }

/* ═══ S · the shared page ═══ */
const AGR_CO = AGR.replace(/(<td class="k">Co-buyer<\/td><td>)<span class="ph">\[CO-BUYER\]<\/span>/, '$1<span class="fill">Sample Co Buyer</span>');
const AGR_BUYER_SIGNED = AGR_CO.replace(/<span class="sigslot" data-sig="buyer">[\s\S]*?<\/span><\/span>/,
  '<span class="sigslot signed" data-sig="buyer"><img src="data:image/png;base64,AAAA" alt="buyer signature"></span>');
const EST = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0">' +
  '<div class="est-head" style="display:flex"><b>CARDINAL</b><span>ESTIMATE</span></div><table class="items"><thead><tr><th>Description</th><th>Price</th></tr></thead><tbody><tr><td>Roof</td><td>$12,000</td></tr></tbody></table>' +
  '<div class="line"></div><div class="lbl">Client Acceptance | Date</div></body></html>';
const TOKEN = 'aaaaaaaa-bbbb-cccc-dddd-0000000000d1';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-not-real';
const J = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => JSON.stringify(b), arrayBuffer: async () => Buffer.from(JSON.stringify(b)) });
async function served(html, title) {
  globalThis.fetch = async (u) => { u = String(u);
    if (u.includes('/inspection_reports?share_token')) return J([{ id: 'd1', project_id: 'R7', project: 'Sample Retail Seven', html, title, total: 15000, signed_at: null }]);
    return J([]); };
  let out = '';
  try { const mod = await importFresh('share.js');
    await mod.default({ method: 'GET', query: { t: TOKEN }, headers: {} }, { setHeader() {}, status() { return this; }, send(b) { out = String(b); }, json(j) { out = JSON.stringify(j); } });
  } catch (e) { out = '<p>share threw ' + e.message + '</p>'; }
  return out;
}
const PDF_BYTES = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(4000, 32)]);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
async function phone(html, onSign) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/*', async r => { const u = r.request().url();
    if (u.startsWith('https://share.test/api/clientsign') && onSign) { const out = await onSign(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: out.status, contentType: 'application/json', body: JSON.stringify(out.body) }); }
    if (u.startsWith('https://share.test/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    return r.fulfill({ status: 200, body: '' }); });
  await pg.goto('https://share.test/api/share?t=' + TOKEN, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(700);
  return { ctx, pg, errs };
}
const vis = `const vis=e=>{const c=getComputedStyle(e);return c.display!=='none'&&c.visibility!=='hidden'&&e.getClientRects().length>0;};`;

if (AGR) {
  const html = await served(AGR, 'Contract — Roofing — Sample Retail Seven');
  const { ctx, pg, errs } = await phone(html);
  const m = await pg.evaluate(new Function(vis + `
    const s=visualViewport.scale, els=[...document.querySelectorAll('p,td,li,.specline,.sopt')].filter(vis).filter(e=>e.textContent.trim().length>2);
    const f=els.map(e=>parseFloat(getComputedStyle(e).fontSize)*s).sort((a,b)=>a-b);
    const bar=document.getElementById('csBar'), open=document.getElementById('csOpen');
    const txt=document.body.innerText;
    const sig=document.querySelector('[data-sig="buyer"]'); const card=document.getElementById('crMasterCard');
    const link=[...document.querySelectorAll('a[href*="/docs/Cardinal_Roofing_Contract.pdf"]')].filter(vis);
    const ph=[...document.querySelectorAll('.ph')].filter(vis).filter(e=>/^\\[/.test(e.textContent.trim()));
    const notesH=[...document.querySelectorAll('h2.sec')].filter(h=>/^Notes$/.test(h.textContent.trim()));
    return { layoutW:document.documentElement.clientWidth, scale:+s.toFixed(3), med:+(f[Math.floor(f.length/2)]||0).toFixed(1), p10:+(f[Math.floor(f.length*0.1)]||0).toFixed(1),
      sideways:document.documentElement.scrollWidth-document.documentElement.clientWidth, zoom:bar?getComputedStyle(bar).zoom:null, openH:open?Math.round(open.getBoundingClientRect().height*s):0,
      menu:/Company Documents\\s*\\u2192/.test(txt), links:link.length, cardAbove: !!(card&&sig&&(card.compareDocumentPosition(sig)&Node.DOCUMENT_POSITION_FOLLOWING)&&vis(card)),
      selects:[...document.querySelectorAll('select')].filter(vis).length, ce:document.querySelectorAll('[contenteditable="true"]').length,
      tapHint:/Tap a box to check it/.test(txt), ph:ph.length, phSample:ph.slice(0,4).map(e=>e.textContent.trim()), notesHead:notesH.filter(vis).length }; `));
  ok(m.layoutW === 390 && m.scale === 1 && m.med >= 15 && m.p10 >= 13 && m.sideways <= 1, 'S1  a contract on a phone is laid out at the phone\'s width: text ≥15px on the glass, no sideways scroll', JSON.stringify(m));
  ok((m.zoom === '1' || m.zoom === '' || m.zoom === 'normal' || m.zoom === null) && m.openH >= 44, 'S1  ...and the sign bar is its normal size (no 2.3× zoom), its button a 44px target', 'zoom=' + m.zoom + ' openH=' + m.openH);
  ok(!m.menu && m.links >= 2 && m.cardAbove, 'S2  the staff-only menu path is gone; the printed master (Terms + both Notices) is linked in the text and in a card above the signatures', JSON.stringify({ menu: m.menu, links: m.links, card: m.cardAbove }));
  ok(m.selects === 0 && m.ce === 0 && !m.tapHint, 'S3  nothing on the page invites an answer the signature would throw away: no live dropdowns, no "Tap a box" hint', JSON.stringify({ s: m.selects, ce: m.ce, hint: m.tapHint }));
  ok(m.ph === 0 && m.notesHead === 0, 'S4  unfilled fields read as blanks, not the editor\'s [hints]; the empty Notes heading is gone', JSON.stringify({ ph: m.ph, sample: m.phSample, notes: m.notesHead }));
  try { await pg.click('#csOpen', { timeout: 3000 }); } catch (e) {}
  await pg.waitForTimeout(300);
  const sh = await pg.evaluate(() => { const g = (id) => document.getElementById(id);
    return { notice: !!g('csNoticeLink') && /Cardinal_Roofing_Contract\.pdf#page=3/.test(g('csNoticeLink').getAttribute('href') || ''),
      cancel: /You, the buyer, may cancel this transaction at any time prior to midnight of the third business day/.test((g('csNotice') || {}).textContent || ''),
      init: !!g('csInit'), initText: (document.getElementById('csOverlay') || {}).innerText || '', email: g('csEmail') ? g('csEmail').value : null, co: !!g('csCoWrap') }; });
  await pg.emulateMedia({ media: 'print' });
  const tfs = await pg.evaluate(() => { const f = document.querySelector('table.items tfoot'); return f ? getComputedStyle(f).display : 'none'; });
  await pg.emulateMedia({ media: 'screen' });
  ok(tfs === 'table-row-group', 'S11 a contract printed from its link: CONTRACT PRICE prints once', tfs);
  ok(sh.notice && sh.cancel, 'S5  the signing sheet quotes the agreement\'s own right-to-cancel sentence and links the Notice of Cancellation', JSON.stringify({ n: sh.notice, c: sh.cancel }));
  ok(sh.init && /initials in 3 places/.test(sh.initText), 'S5  ...asks for the buyer\'s initials for the agreement\'s 3 Initials boxes', sh.init);
  ok(sh.email === 'retail7@example.com' && !sh.co, 'S5  ...offers the signed copy to the address the agreement itself carries; no co-buyer step when none is named', JSON.stringify({ e: sh.email, co: sh.co }));
  ok(errs.length === 0, 'S5  no script errors on the share page', errs.join(' | '));
  await ctx.close();

  const h3 = await served(AGR_BUYER_SIGNED, 'Contract — Roofing — Sample Retail Seven');
  const c3 = await phone(h3);
  const co = await c3.pg.evaluate(() => ({ bar: (document.getElementById('csBar') || {}).innerText || '', name: (document.getElementById('csName') || {}).value || '' }));
  ok(/Co-buyer/.test(co.bar) && co.name === 'Sample Co Buyer', 'S6  a named co-buyer who has not signed can sign from the same link after the buyer', JSON.stringify(co));
  await c3.ctx.close();
}
if (REPORT) {
  const html = await served(REPORT, 'Roof Inspection — Sample Retail Seven');
  for (const W of [390, 1280]) {
    const ctx = await browser.newContext(W < 700 ? { viewport: { width: W, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: W, height: 900 } });
    const pg = await ctx.newPage();
    await pg.route('**/*', r => r.request().url().startsWith('https://share.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.fulfill({ status: 200, body: '' }));
    await pg.goto('https://share.test/x', { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(700);
    const r = await pg.evaluate(new Function(vis + `
      const heads=[...document.querySelectorAll('h2.sec')].filter(vis).map(h=>{const n=h.querySelector('.num');const t=h.cloneNode(true);t.querySelectorAll('.num').forEach(x=>x.remove());return {n:n?n.textContent.trim():'',t:t.textContent.replace(/\\s+/g,' ').trim()};});
      const toc=[...document.querySelectorAll('.toc-row .t')].filter(vis).map(t=>{const m=/^\\s*(\\d+)\\s*(.*)$/.exec(t.textContent.replace(/\\u00a0/g,' '));return m?{n:m[1],t:m[2].trim()}:{n:'',t:t.textContent};});
      const mism=toc.filter(x=>{const h=heads.find(h=>h.t===x.t);return !h||h.n!==x.n;});
      const sum=document.querySelector('[data-cardinal-summary-heading]');
      const s=visualViewport.scale, els=[...document.querySelectorAll('p,td,li')].filter(vis).filter(e=>e.textContent.trim().length>2).map(e=>parseFloat(getComputedStyle(e).fontSize)*s).sort((a,b)=>a-b);
      return { contents:(heads.find(h=>/^Contents/.test(h.t))||{}).n, toc:toc.length, mism:mism.map(x=>x.n+' '+x.t.slice(0,24)), orphan: !!(sum&&vis(sum)&&sum.nextElementSibling&&!vis(sum.nextElementSibling)),
        layoutW:document.documentElement.clientWidth, sideways:document.documentElement.scrollWidth-document.documentElement.clientWidth, min:+(els[0]||0).toFixed(1), max:+(els[els.length-1]||0).toFixed(1) }; `));
    ok(r.toc > 0 && r.mism.length === 0 && !/^\d+$/.test(r.contents || ''), `S7  report link @${W}: every Contents line matches its section's number (Contents keeps its mark, not "1")`, JSON.stringify({ c: r.contents, mism: r.mism }));
    ok(!r.orphan, `S7  report link @${W}: a summary heading over a blank paragraph is not left standing`, r.orphan);
    if (W >= 700) { const cm = await pg.evaluate(() => { const c = document.querySelector('.chip.mod'); return c ? getComputedStyle(c).color : 'none'; });
      await pg.emulateMedia({ media: 'print' });
      const pc = await pg.evaluate(() => { const c = document.querySelector('.cover'); return c ? getComputedStyle(c).breakAfter : 'none'; });
      await pg.emulateMedia({ media: 'screen' });
      ok(cm === 'rgb(27, 27, 27)' && pc === 'page', 'S10 a report printed from its link: MODERATE dark on amber, the cover ends its own page (ensurePrintFix\'s rules)', cm + ' / ' + pc); }
    if (W < 700) ok(r.layoutW === 390 && r.sideways <= 1 && r.min >= 12 && r.max <= 22, 'S8  report link on a phone: its own phone layout, no sideways scroll, no 6px tables beside 20px paragraphs', JSON.stringify(r));
    await ctx.close();
  }
}
{
  const html = await served(EST, 'Estimate — Sample Retail Seven');
  ok(/<meta name="viewport" content="width=900">/.test(html) && /crLetterUi/.test(html) && !/crContractPhone/.test(html), 'S9  an ESTIMATE is still served as its Letter page (1278, Theo\'s ruling, untouched)');
}

/* ═══ E · end to end: the sheet → clientsign → the stored contract and the signer's copy ═══ */
if (AGR) {
  const calls = []; let patch = null;
  const csStub = (docHtml) => async (u, o) => { u = String(u); const m = (o && o.method) || 'GET';
    calls.push({ u, m, body: o && o.body });
    if (u.includes('/inspection_reports?share_token')) return J([{ id: 'd1', title: 'Contract — Roofing — Sample Retail Seven', html: docHtml, project_id: 'R7', created_by: 'theo@cardinalrenovations.net' }]);
    if (u.includes('/inspection_reports?id=') && m === 'PATCH') { patch = JSON.parse(o.body); return J({}); }
    if (u.includes('/projects?id=') && m === 'GET') return J([{ stage: 'Prospect', name: 'Sample Retail Seven', address: '7 Pine St' }]);
    if (u.includes('/docs/Cardinal_Roofing_Contract.pdf')) return { ok: true, status: 200, arrayBuffer: async () => PDF_BYTES };
    return J({ id: 'x' }); };
  const runSign = async (body, docHtml) => { globalThis.fetch = csStub(docHtml); process.env.RESEND_API_KEY = 're_test';
    const mod = await importFresh('clientsign.js'); const res = { s: 0, j: null, status(c) { this.s = c; return this; }, json(j) { this.j = j; return this; } };
    try { await mod.default({ method: 'POST', body }, res); } catch (e) { res.s = 599; res.j = { error: e.message }; }
    return res; };
  const shareHtml = await served(AGR_CO, 'Contract — Roofing — Sample Retail Seven');
  let posted = null;
  const { ctx, pg, errs } = await phone(shareHtml, async (body) => { posted = body; const r = await runSign(body, AGR_CO); return { status: r.s, body: r.j }; });
  const draw = async (sel) => { const b = await pg.$eval(sel, e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await pg.mouse.move(b.x + 20, b.y + 30); await pg.mouse.down(); await pg.mouse.move(b.x + 120, b.y + 80, { steps: 6 }); await pg.mouse.move(b.x + 200, b.y + 40, { steps: 6 }); await pg.mouse.up(); };
  const step = async (fn, why) => { try { await fn(); } catch (e) { ok(false, why, e.message.split('\n')[0]); } };
  await step(() => pg.click('#csOpen', { timeout: 3000 }), 'E0  (open the sheet)');
  await pg.waitForTimeout(300);
  await step(() => pg.fill('#csName', 'Sample Retail Seven', { timeout: 2000 }), 'E0  (type the name)');
  await step(() => pg.fill('#csInit', 'SR', { timeout: 2000 }), 'E1  the sheet has an initials field');
  await step(() => draw('#csPad'), 'E0  (sign)');
  await step(() => draw('#csCoPad'), 'E1  the sheet has a co-buyer signature box when a co-buyer is named');
  await step(() => pg.click('#csApply', { timeout: 2000 }), 'E0  (apply)');
  await pg.waitForTimeout(1500);
  const done = await pg.evaluate(() => ((document.getElementById('csErr') || {}).textContent || '') + ' | ' + ((document.getElementById('csOverlay') || {}).innerText || ''));
  const html2 = (patch && patch.html) || '';
  const inits = (html2.match(/data-clientinit="1"[^>]*>SR</g) || []).length;
  ok(posted && posted.initials === 'SR' && inits === 3 && !/Initials(?:\s|&nbsp;)*<span class="ph">\[__\]/.test(html2), 'E1  the buyer\'s initials land in all 3 Initials boxes of the stored contract', 'stamped=' + inits);
  ok(/class="sigslot signed" data-sig="buyer"/.test(html2) && /class="sigslot signed" data-sig="cobuyer"/.test(html2) && /data-sigdate="cobuyer">[^<]*signed via secure link by Sample Co Buyer/.test(html2) && patch && patch.signed_at,
    'E2  buyer AND co-buyer are stamped into their own rows, signed_at written', JSON.stringify({ b: /data-sig="buyer"/.test(html2), signed: !!(patch && patch.signed_at) }));
  const mails = calls.filter(c => c.u.includes('api.resend.com')).map(c => JSON.parse(c.body));
  const mine = mails.find(x => (x.to || []).join() === 'retail7@example.com');
  ok(mine && /Your signed Roofing Construction Agreement/.test(mine.subject) && (mine.attachments || []).length === 2 &&
     (mine.attachments || []).some(a => /Notice of Cancellation\.pdf$/.test(a.filename)) && /\/api\/share\?t=/.test(mine.html) && /You, the buyer, may cancel/.test(mine.html),
    'E3  the signer gets their signed copy by email: the contract, the Terms + both Notices PDF, the link, and their right to cancel', mine ? JSON.stringify({ s: mine.subject, a: (mine.attachments || []).map(a => a.filename) }) : 'no email to the signer');
  const staff = mails.find(x => /Signed:/.test(x.subject || ''));
  ok(staff && /emailed to the client at retail7@example\.com/.test(staff.html) && /Initials \(SR\) added in 3 places/.test(staff.html), 'E4  the rep\'s "Signed" email says the copy went out and the initials were added', staff ? staff.html.replace(/\s+/g, ' ').slice(0, 200) : 'none');
  ok(/signed copy is on its way to retail7@example\.com/.test(done), 'E5  the signer is told where their copy went', done.replace(/\s+/g, ' ').slice(0, 160));
  ok(errs.length === 0, 'E5  no script errors in the signing flow', errs.join(' | '));
  await ctx.close();

  /* ═══ B · clientsign directly ═══ */
  const SIG = 'data:image/png;base64,AAAABBBBCCCC';
  calls.length = 0; patch = null;
  let r = await runSign({ t: TOKEN, sig: SIG, name: 'Sample Retail Seven' }, AGR);
  ok(r.s === 200 && patch && patch.signed_at && /Initials(?:\s|&nbsp;)*<span class="ph">\[__\]/.test(patch.html), 'B1  a page served before this build (name + signature only) still signs, exactly as before', JSON.stringify(r.j));
  ok(!calls.some(c => c.u.includes('api.resend.com') && /retail7@example\.com/.test(String(c.body)) && /Your signed/.test(String(c.body))),
    'B1  ...and with no address typed nobody is emailed a copy — the agreement\'s own Email line is never used unasked');
  const staff1 = calls.filter(c => c.u.includes('api.resend.com')).map(c => JSON.parse(c.body)).find(x => /Signed:/.test(x.subject || ''));
  ok(staff1 && /left no email for a signed copy/.test(staff1.html), 'B1  ...and the rep is told to hand the client a copy', staff1 ? '' : 'no staff email');
  r = await runSign({ t: TOKEN, sig: SIG, name: 'X', email: 'not-an-address' }, AGR);
  ok(r.s === 400, 'B2  a malformed copy address is refused before anything is saved', r.s);
  calls.length = 0; patch = null;
  r = await runSign({ t: TOKEN, role: 'cobuyer', sig: SIG, name: 'Sample Co Buyer', email: 'co@example.com' }, AGR_BUYER_SIGNED);
  ok(r.s === 200 && patch && !patch.signed_at && /class="sigslot signed" data-sig="cobuyer"/.test(patch.html) && !calls.some(c => /\/projects\?id=/.test(c.u) && c.m === 'PATCH'),
    'B3  a co-buyer signing later stamps only the co-buyer row: no signed_at, no stage move', JSON.stringify({ s: r.s, signedAt: patch && patch.signed_at }));
  r = await runSign({ t: TOKEN, role: 'cobuyer', sig: SIG, name: 'Nobody' }, AGR.replace(/<span class="sigslot" data-sig="buyer">[\s\S]*?<\/span><\/span>/, '<span class="sigslot signed" data-sig="buyer"><img alt="b"></span>'));
  ok(r.s === 409, 'B4  no co-buyer named → no co-buyer signature', r.s);
  calls.length = 0;
  globalThis.fetch = async (u, o) => { u = String(u); if (u.includes('/docs/')) throw new Error('offline'); return csStub(AGR)(u, o); };
  { process.env.RESEND_API_KEY = 're_test'; const mod = await importFresh('clientsign.js'); const res = { s: 0, j: null, status(c) { this.s = c; return this; }, json(j) { this.j = j; return this; } };
    try { await mod.default({ method: 'POST', body: { t: TOKEN, sig: SIG, name: 'Sample Retail Seven', email: 'retail7@example.com' } }, res); } catch (e) { res.s = 599; }
    const mine2 = calls.filter(c => c.u.includes('api.resend.com')).map(c => JSON.parse(c.body)).find(x => (x.to || []).join() === 'retail7@example.com');
    ok(res.s === 200 && res.j && res.j.copy === 'sent' && mine2 && mine2.attachments.length === 1 && /Cardinal_Roofing_Contract\.pdf#page=3/.test(mine2.html),
      'B5  if the PDF cannot be fetched the copy still goes, with the Terms + Notices linked', JSON.stringify(res.j)); }
}

/* ═══ C · senddoc: an emailed agreement carries its printed master ═══ */
if (AGR) {
  const send = async (html, title) => { const calls = [];
    globalThis.fetch = async (u, o) => { u = String(u); calls.push({ u, body: o && o.body });
      if (u.includes('/auth/v1/user')) return J({ email: 'theo@cardinalrenovations.net', user_metadata: { full_name: 'Theo' } });
      if (u.includes('/docs/Cardinal_Roofing_Contract.pdf')) return { ok: true, status: 200, arrayBuffer: async () => PDF_BYTES };
      return J({ id: 'e1' }); };
    process.env.RESEND_API_KEY = 're_test';
    const mod = await importFresh('senddoc.js'); const res = { s: 0, j: null, status(c) { this.s = c; return this; }, json(j) { this.j = j; return this; } };
    try { await mod.default({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { to: 'retail7@example.com', title, html, clientName: 'Sample Retail Seven' } }, res); } catch (e) { res.s = 599; res.j = { error: e.message }; }
    const mail = calls.filter(c => c.u.includes('api.resend.com')).map(c => JSON.parse(c.body))[0] || null;
    return { res, mail }; };
  let { res, mail } = await send(AGR, 'Contract — Roofing — Sample Retail Seven');
  const att = mail ? mail.attachments || [] : [];
  const attHtml = att[0] ? Buffer.from(att[0].content, 'base64').toString('utf8') : '';
  ok(res.s === 200 && att.length === 2 && /Notice of Cancellation\.pdf$/.test(att[1] && att[1].filename) && /Your Terms and Conditions and both Notice of Cancellation copies/.test(mail.html),
    'C1  Email to client on an agreement attaches the Terms + both Notices PDF and says so', JSON.stringify({ s: res.s, a: att.map(a => a.filename) }));
  ok(/https:\/\/app\.cardinalroster\.com\/docs\/Cardinal_Roofing_Contract\.pdf#page=3/.test(attHtml) && !/Company Documents &#8594;/.test(attHtml) && att[0] && !/  /.test(att[0].filename),
    'C2  ...the attached agreement links the master instead of the staff menu path, and its file name has no double spaces', att[0] && att[0].filename);
  ({ res, mail } = await send(EST, 'Estimate — Sample Retail Seven'));
  ok(res.s === 200 && mail && mail.attachments.length === 1 && Buffer.from(mail.attachments[0].content, 'base64').toString('utf8') === EST, 'C3  an estimate goes out exactly as before (one attachment, untouched)');
}
{
  const blk = (f) => { const s = fs.readFileSync(path.join(API, f), 'utf8'); const i = s.indexOf('/* D (contracts + client documents judges)'); const j = s.indexOf('const INIT_RX', i); return i === -1 || j === -1 ? '' : s.slice(i, s.indexOf('\n', j)); };
  const a = blk('share.js'), b = blk('clientsign.js'), c = blk('senddoc.js');
  ok(a.length > 500 && a === b && b === c, 'C4  KEEP IN SYNC: the printed-master block is byte-identical in share.js, clientsign.js and senddoc.js', [a.length, b.length, c.length].join('/'));
}
await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nGATE D ${fails.length ? 'RED' : 'GREEN'} — ${pass} passed, ${fails.length} failed`);
if (fails.length) console.log('failed:\n  ' + fails.join('\n  '));
process.exit(fails.length ? 1 : 0);
