/* gate_1423 — inspections after judge 4 (Inspections) and judge 11's inspection-report items.
 * Real Chromium through gate_1403_lib's boot() (the seeded mock; no Supabase, no network).
 *
 *   QI  Quick Inspection (phone): the Who sheet reads, its tabs say which is open, the client search finds a
 *       comma-less address and never dead-ends; captions sit on two clean rows; Finish files the photos into
 *       Inspection Photos, says so without a red error, and "Start the report" opens the guide with the walk's
 *       photos checked and its note in the chat; the guided sheet does not run wider than the phone.
 *   PL  "Start without AI": no native prompt, the guide's title, the checked photos placed with no chip.
 *   SH  a NEW report's stored document opens at the phone's width (its own viewport; old ones need api/share.js).
 *   AI  "Write report" (stubbed assistant): each photo wears its own severity; HIGH/MODERATE photos are rows
 *       in the Summary of Findings; the phone toolbar folds while the assistant is open and while the document
 *       is scrolled down, and opens again; the assistant fits the screen and its header folds it; "N to fill"
 *       skips Contents page numbers and empty photo boxes; the how-to panel folds after the first time; the
 *       banner is one line.
 *   LS  the client's Inspections list keeps invoices out of the reports and under their own heading; the
 *       no-checklist question's words match its buttons.
 *   PR  print (desktop iframe path AND the iPhone host path): the cover stays on page 1 and Contents starts
 *       page 2; signature lines keep their labels; the findings header keeps its first row (swept); an empty
 *       "Overall Condition Assessment" heading does not print; MODERATE ink clears 4.5:1.
 *
 *   node gate_1423.mjs [index.html]      GREEN on the build, RED with named failures on b1422.
 */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot, log } = await import('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/gate_1403_lib.mjs');
import fs from 'fs';
import { execSync } from 'child_process';
const F = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';   /* 1423: fixtures live beside the gate; output goes to the OS temp dir */
const TMP = (await import('os')).tmpdir() + '/';
const IMG = [0, 1, 2].map(i => F + 'fixtures/roof_synth_1423_' + i + '.jpg');   /* synthetic test roofs, not customer photos */
const OUT = TMP + 'gate_1423_out/gate_' + String(process.env.APPFILE).split('/').pop().replace(/\W+/g, '_') + '/';
fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 900000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + String(d).slice(0, 300) : '')); c ? pass++ : fail++; };
const shot = async (page, n) => { if (process.env.SHOTS) { try { await page.screenshot({ path: OUT + n + '.png' }); } catch (e) {} } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tryDo(why, fn) { try { return await fn(); } catch (e) { ok(false, why + ' (could not run)', (e.message || String(e)).split('\n')[0]); return undefined; } }
const LOGO = fs.readFileSync('/home/user/cardinal-inspections/cardinal-report-logo.png');
const seedPhotos = () => {
  const imgs = IMG.map(f => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64'));
  const caps = ['Ground shots — all elevations', 'Pipe boots & penetrations', 'Valleys'];
  const rows = imgs.map((d, i) => ({ id: 'ph' + i, project_id: 'R1', data: d, caption: caps[i], created_by: 'theo@cardinalrenovations.net', created_at: new Date(Date.now() - (5 - i) * 60000).toISOString() }));
  return `(function(){ var S=window.__SEED__; if(!S) return; S.project_photos=${JSON.stringify(rows)}; })();`;
};
const AI = { ok: true, reply: 'Noted.', summary: 'An aging asphalt roof with localized damage at the plumbing penetrations.',
  sections: [{ num: 5, narrative: 'Granule loss across the south slope.' }, { num: 6, narrative: 'Two pipe boots are cracked.' }],
  recommendations: ['Replace the two cracked pipe boots now.', 'Plan a replacement within 2-3 years.'],
  photos: [{ id: 'ph0', section: 5, caption: 'Granule loss on the south slope', severity: 'mon' },
           { id: 'ph1', section: 6, caption: 'Cracked pipe boot, north slope', severity: 'high' },
           { id: 'ph2', section: 8, caption: 'Valley wear at the rear dormer', severity: 'mod' }] };

/* contrast of an element's ink against the first opaque ground behind it (composited), in its own page */
const INK = () => {
  window.__ink = function (el) {
    const rgb = s => { const m = (s || '').match(/[\d.]+/g) || []; return m.map(Number); };
    const lum = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    let bg = [255, 255, 255], stack = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0)) { stack.push(c); if (c[3] === undefined || c[3] >= 1) break; } }
    for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i], a = c[3] === undefined ? 1 : c[3]; bg = [0, 1, 2].map(k => c[k] * a + bg[k] * (1 - a)); }
    const cs = getComputedStyle(el); const fill = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color;
    const ink = rgb(fill); const a = ink[3] === undefined ? 1 : ink[3]; const comp = [0, 1, 2].map(k => ink[k] * a + bg[k] * (1 - a));
    const x = lum(comp), y = lum(bg); return Math.round((Math.max(x, y) + .05) / (Math.min(x, y) + .05) * 100) / 100;
  };
};

async function fillChecklist(page) {
  for (let k = 0; k < 3; k++) await page.evaluate(() => { document.querySelectorAll('#insgSheet select').forEach(x => { if (!x.multiple && !x.value && x.options.length > 1) { x.selectedIndex = Math.min(2, x.options.length - 1); x.dispatchEvent(new Event('change', { bubbles: true })); } }); });
  await page.evaluate(() => { document.querySelectorAll('#insgSheet input:not([type=checkbox])').forEach(i => { if (!i.value) { i.value = '14'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } }); });
  await page.evaluate(() => document.querySelector('#insgSheet [data-ig="save"]').click());
  await sleep(2000);
}
async function guideToStep3(page, checkAll) {
  await page.evaluate(() => { openProject('R1'); }); await sleep(2000);
  await page.evaluate(() => { showTab('inspections'); document.getElementById('pNewReportBtn').click(); }); await sleep(700);
  await page.evaluate(() => document.querySelector('#insgSheet [data-ig="next"]').click()); await sleep(500);
  await fillChecklist(page);
  if (checkAll) for (let k = 0; k < 3; k++) { await page.evaluate(k => { const t = document.querySelectorAll('#insgSheet .ig-ph')[k]; if (t && !t.classList.contains('on')) t.click(); }, k); await sleep(120); }
}
const lastHtml = page => page.evaluate(() => {
  const w = (window.__WRITES__ || []).filter(x => x.table === 'inspection_reports' && x.payload && (x.payload.html || (Array.isArray(x.payload) && x.payload[0] && x.payload[0].html)));
  const l = w[w.length - 1]; if (!l) return ''; const p = Array.isArray(l.payload) ? l.payload[0] : l.payload; return p.html || '';
});

/* ================================================================== QI */
async function scenarioQI() {
  const { browser, page } = await boot('theo', { instr: false });
  try {
    await page.evaluate(INK);
    await page.evaluate(() => { qiFreshStart(); }); await sleep(900);
    await page.fill('#qiAddrInp', '5 Pine St Dayton OH');
    await page.click('#qiMapNext'); await sleep(700);
    await shot(page, 'qi_who');
    const ink = await page.evaluate(() => ['qiTabExist', 'qiTabNew', 'qiFinClose'].map(id => [id, window.__ink(document.getElementById(id))]));
    ink.forEach(([id, r]) => ok(r >= 4.5, `QI-1  Who sheet: #${id} reads (>= 4.5:1)`, r + ':1'));
    const tabs0 = await page.evaluate(() => [document.getElementById('qiTabExist').getAttribute('aria-pressed'), document.getElementById('qiTabNew').getAttribute('aria-pressed')]);
    await tryDo('QI-2 tab', () => page.click('#qiTabNew'));
    const tabs1 = await page.evaluate(() => ({ p: [document.getElementById('qiTabExist').getAttribute('aria-pressed'), document.getElementById('qiTabNew').getAttribute('aria-pressed')],
      bg: [getComputedStyle(document.getElementById('qiTabExist')).backgroundColor, getComputedStyle(document.getElementById('qiTabNew')).backgroundColor], pane: getComputedStyle(document.getElementById('qiNewPane')).display }));
    ok(tabs0[0] === 'true' && tabs0[1] === 'false' && tabs1.p[0] === 'false' && tabs1.p[1] === 'true' && tabs1.bg[0] !== tabs1.bg[1] && tabs1.pane === 'block',
      'QI-2  the open tab is marked, and looks different from the other', JSON.stringify({ tabs0, tabs1 }));
    await tryDo('QI-2 back', () => page.click('#qiTabExist'));
    const found = await page.evaluate(() => ({ q: document.getElementById('qiCliSearch').value, hit: !!document.querySelector('#qiCliList [data-qicli="R1"]'), n: document.querySelectorAll('#qiCliList [data-qicli]').length }));
    ok(found.hit, 'QI-3  "5 Pine St Dayton OH" (no commas) finds the client at 5 Pine St', JSON.stringify(found));
    await page.fill('#qiCliSearch', 'Zzyzx Qqq'); await sleep(300);
    const nm = await page.evaluate(() => ({ n: document.querySelectorAll('#qiCliList [data-qicli]').length, txt: document.getElementById('qiCliList').innerText.slice(0, 120) }));
    ok(nm.n > 0, 'QI-4  a search that matches nobody shows everyone, not a dead end', JSON.stringify(nm));
    const nmInk = await page.evaluate(() => { const e = document.querySelector('#qiCliList .subnote'); return e ? window.__ink(e) : null; });
    ok(nmInk === null || nmInk >= 4.5, 'QI-4b the "no match" line reads on the white card', nmInk);
    await page.fill('#qiCliSearch', '5 Pine'); await sleep(300);
    await page.click('[data-qicli="R1"]'); await sleep(700);
    await page.setInputFiles('#qiPickInput', [IMG[0], IMG[1]]); await sleep(3000);
    await shot(page, 'qi_stream');
    const cap = await page.evaluate(() => [...document.querySelectorAll('#qiStream .qicap')].map(c => {
      const btn = c.querySelector('[data-qiai]'); const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n, rects = -1;
      while ((n = walker.nextNode())) { const m = /\d{1,2}:\d\d\s?[AP]M/.exec(n.textContent); if (m) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); rects = new Set([...r.getClientRects()].map(x => Math.round(x.top))).size; } }
      const em = c.querySelector('em'), lab = c.firstElementChild;
      const labLine = lab && em ? Math.abs(em.getBoundingClientRect().top - lab.getBoundingClientRect().top) < 20 : false;
      return { timeLines: rects, btnFs: btn ? parseFloat(getComputedStyle(btn).fontSize) : 0, labLine };
    }));
    ok(cap.length === 2 && cap.every(c => c.timeLines === 1), 'QI-5  the photo time stays on one line', JSON.stringify(cap));
    ok(cap.length === 2 && cap.every(c => c.btnFs >= 13 && c.labLine), 'QI-5b Analyze is 13px+ and the ✓ sits on the label line', JSON.stringify(cap));
    await page.fill('#qiNoteInp', 'Two cracked boots on the north slope'); await page.click('#qiNoteBtn'); await sleep(300);
    await page.click('#qiFinishBtn'); await sleep(900);
    await page.evaluate(() => { const b = document.querySelector('#crAsk.open .askgo'); if (b) b.click(); }); await sleep(5500);
    const end = await page.evaluate(() => {
      const errs = [...document.querySelectorAll('.crt.err')].map(t => t.innerText);
      const ask = document.querySelector('#crAsk.open');
      const pr = cacheProjects.find(p => p.id === 'R1'); let ins = []; try { ins = JSON.parse(pr.checklist || '{}').insp_photos || []; } catch (e) {}
      return { errs, ask: ask ? ask.innerText : '', go: ask ? (ask.querySelector('.askgo') || {}).textContent : '', ins, gal: (document.getElementById('inspGalN') || {}).textContent };
    });
    await shot(page, 'qi_finish');
    ok(!end.errs.some(t => /Photo Gallery|transfer the gallery/i.test(t)), 'QI-6  Finish ends without the red "Photo Gallery" error toast', JSON.stringify(end.errs));
    ok(/Photo Album/.test(end.ask) && /Start the report/.test(end.go || ''), 'QI-7  Finish says where the photos went (Photo Album) and offers "Start the report"', JSON.stringify({ ask: end.ask.slice(0, 200), go: end.go }));
    ok(end.ins.length === 2, 'QI-8  the walk\'s 2 photos joined Inspection Photos (the gallery on Inspections stops reading 0)', JSON.stringify(end.ins));
    await page.evaluate(() => { const b = document.querySelector('#crAsk.open .askgo'); if (b) b.click(); }); await sleep(1200);
    const g = await page.evaluate(() => ({ open: !!document.querySelector('#insgSheet.open'), gal: (document.getElementById('inspGalN') || {}).textContent }));
    ok(g.open && g.gal === '2', 'QI-9  "Start the report" opens the guide on this client, and the Inspections gallery reads 2', JSON.stringify(g));
    if (g.open) {
      await page.evaluate(() => document.querySelector('#insgSheet [data-ig="next"]').click()); await sleep(500);
      await page.evaluate(() => document.querySelector('#insgSheet [data-ig="skip"]').click()); await sleep(2000);
      const s3 = await page.evaluate(() => ({ lab: (document.getElementById('insgPicN') || {}).textContent, chat: (document.getElementById('insgChat') || {}).innerText || '', on: document.querySelectorAll('#insgSheet .ig-ph.on').length }));
      await shot(page, 'qi_guide3');
      ok(/2 of 16 checked/.test(s3.lab || '') && s3.on === 2, 'QI-10 the guide opens with the walk\'s 2 photos checked', JSON.stringify(s3));
      ok(/Two cracked boots on the north slope/.test(s3.chat), 'QI-11 the walk\'s note is in the guide\'s chat', s3.chat.slice(0, 160));
    } else { ok(false, 'QI-10 the guide opens with the walk\'s photos checked', 'guide did not open'); ok(false, 'QI-11 the walk\'s note is in the guide\'s chat', 'guide did not open'); }
  } finally { await browser.close(); }
}

/* ================================================================== PL */
async function scenarioPlain() {
  const prompts = [];
  const { browser, page } = await boot('theo', { instr: false, seed: seedPhotos(), dialog: d => { if (d.type() === 'prompt') prompts.push(d.message()); d.type() === 'prompt' ? d.accept(d.defaultValue()) : d.accept(); } });
  try {
    await guideToStep3(page, true);
    const ov = await page.evaluate(() => { const s = document.getElementById('insgSheet'); return { sw: s.scrollWidth, cw: s.clientWidth, picked: (document.getElementById('insgPicN') || {}).textContent }; });
    ok(ov.sw <= ov.cw, 'GS-1  the guided sheet\'s photos step is no wider than the 390px phone', JSON.stringify(ov));
    await shot(page, 'pl_step3');
    const before = prompts.length;
    await page.evaluate(() => document.querySelector('#insgSheet [data-ig="plain"]').click()); await sleep(5000);
    ok(prompts.length === before, 'PL-1  "Start without AI" raises no native prompt', JSON.stringify(prompts));
    const t = await page.evaluate(() => { const w = (window.__WRITES__ || []).filter(x => x.table === 'inspection_reports' && x.op === 'insert'); const l = w[w.length - 1]; const p = l && (Array.isArray(l.payload) ? l.payload[0] : l.payload); return p ? p.title : null; });
    ok(t === 'Sample Retail One — 5 Pine St', 'PL-2  it takes the guide\'s title', t);
    const html = await lastHtml(page);
    const r = await page.evaluate(h => { const d = new DOMParser().parseFromString(h, 'text/html'); const seed = (window.__SEED__.project_photos || []).map(p => p.data);
      const placed = [...d.querySelectorAll('.fig .frame img')].filter(i => seed.indexOf(i.getAttribute('src')) !== -1);
      return { placed: placed.length, chips: placed.map(i => { const t = i.parentElement.querySelector('.tag .chip'); return t ? t.textContent : ''; }) }; }, html);
    ok(r.placed === 3, 'PL-3  the 3 checked photos are in the report', JSON.stringify(r));
    ok(r.placed === 3 && r.chips.every(c => !c), 'PL-4  photos with no rating carry no (sample) priority chip', JSON.stringify(r.chips));
    /* the stored document, opened on the phone the way the share link and a downloaded copy are */
    const sp = await page.context().newPage();
    await sp.setContent(html, { waitUntil: 'load' }); await sleep(400);
    const v = await sp.evaluate(() => { const sc = (window.visualViewport && window.visualViewport.scale) || 1;
      const cells = [...document.querySelectorAll('table.facts td, table.concerns td')].filter(e => e.offsetParent);
      const px = cells.map(e => parseFloat(getComputedStyle(e).fontSize) * sc);
      return { w: innerWidth, scale: Math.round(sc * 100) / 100, minTablePx: Math.round(Math.min(...px) * 10) / 10, sw: document.documentElement.scrollWidth }; });
    await sp.close();
    ok(v.w <= 400 && v.minTablePx >= 11, 'SH-1  a new report opened on a phone lays out at the phone\'s width, tables readable (>= 11px on screen)', JSON.stringify(v));
  } finally { await browser.close(); }
}

/* ================================================================== AI */
async function scenarioAI() {
  const { browser, page } = await boot('theo', { instr: false, seed: seedPhotos(), apiBody: AI, dialog: d => d.type() === 'prompt' ? d.accept(d.defaultValue()) : d.accept() });
  try {
    await guideToStep3(page, true);
    await page.evaluate(() => document.querySelector('#insgSheet [data-ig="write"]').click()); await sleep(7000);
    const html = await lastHtml(page);
    const r = await page.evaluate(h => {
      const d = new DOMParser().parseFromString(h, 'text/html'); const seed = {}; (window.__SEED__.project_photos || []).forEach(p => { seed[p.data] = p.id; });
      const chips = {}; [...d.querySelectorAll('.fig .frame img')].forEach(i => { const id = seed[i.getAttribute('src')]; if (!id) return; const t = i.parentElement.querySelectorAll('.tag .chip'); chips[id] = [...t].map(x => x.className.replace('chip', '').trim()).join('+'); });
      const rows = [...d.querySelectorAll('table.concerns tr')].filter(tr => !tr.querySelector('th')).map(tr => ({ t: tr.innerText.replace(/\s+/g, ' ').trim(), c: (tr.querySelector('.pr .chip') || {}).className || '' }));
      return { chips, rows };
    }, html);
    ok(r.chips.ph0 === 'mon' && r.chips.ph1 === 'high' && r.chips.ph2 === 'mod', 'AI-1  each placed photo wears the severity the assistant gave it (mon / high / mod), never the template\'s sample HIGH', JSON.stringify(r.chips));
    const has = (txt, cls) => r.rows.some(x => x.t.indexOf(txt) !== -1 && x.c.indexOf(cls) !== -1);
    ok(has('Cracked pipe boot, north slope', 'high') && has('Valley wear at the rear dormer', 'mod'), 'AI-2  HIGH and MODERATE photos are rows in the Summary of Findings', JSON.stringify(r.rows));
    ok(!r.rows.some(x => /Granule loss on the south slope/.test(x.t)) && !r.rows.some(x => /\[Area — e\.g\./.test(x.t)), 'AI-3  a MONITOR photo adds no row, and the template\'s sample rows are gone', JSON.stringify(r.rows));
    /* editor on the phone, assistant open */
    await shot(page, 'ai_assist');
    const m1 = await page.evaluate(() => { const ap = document.getElementById('assistantPanel'); const tb = document.querySelector('#editorView .toolbar').getBoundingClientRect();
      const vis = [...ap.querySelectorAll('*')].filter(e => e.offsetParent && getComputedStyle(e).display !== 'none' && e.tagName !== 'INPUT');
      const bad = vis.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.bottom > innerHeight + 0.5 || r.right > innerWidth + 0.5) && !e.closest('.assist-msgs'); }).map(e => (e.id || e.className) + ':' + Math.round(e.getBoundingClientRect().bottom));
      const send = document.getElementById('assistSend').getBoundingClientRect(); const msgs = ap.querySelector('.assist-msgs').getBoundingClientRect();
      return { open: ap.classList.contains('open'), tb: Math.round(tb.height), bad, send: [Math.round(send.right), Math.round(send.bottom)], msgs: Math.round(msgs.height), vh: innerHeight }; });
    ok(m1.open && m1.bad.length === 0 && m1.send[1] <= m1.vh, 'AI-4  the assistant fits the phone: input and send button fully on screen', JSON.stringify(m1));
    ok(m1.msgs >= 60, 'AI-5  the assistant\'s messages get room (>= 60px)', JSON.stringify(m1));
    ok(m1.tb <= 80, 'AI-6  with the assistant open, the phone toolbar is one row (<= 80px)', JSON.stringify(m1));
    await page.evaluate(() => { const h = document.querySelector('#assistantPanel .assist-head'); if (h) h.click(); }); await sleep(300);
    const m2 = await page.evaluate(() => Math.round(document.getElementById('assistantPanel').getBoundingClientRect().height));
    await page.evaluate(() => { const h = document.querySelector('#assistantPanel .assist-head'); if (h) h.click(); }); await sleep(300);
    const m3 = await page.evaluate(() => Math.round(document.getElementById('assistantPanel').getBoundingClientRect().height));
    ok(m2 <= 60 && m3 > 200, 'AI-7  tapping the assistant\'s header folds it to one line and back', JSON.stringify({ folded: m2, open: m3 }));
    await page.evaluate(() => document.getElementById('assistantClose').click()); await sleep(400);
    const m4 = await page.evaluate(() => Math.round(document.querySelector('#editorView .toolbar').getBoundingClientRect().height));
    await page.evaluate(() => document.getElementById('reportFrame').contentWindow.scrollTo(0, 900)); await sleep(700);
    const m5 = await page.evaluate(() => ({ tb: Math.round(document.querySelector('#editorView .toolbar').getBoundingClientRect().height), fr: Math.round(document.getElementById('reportFrame').getBoundingClientRect().height), vh: innerHeight,
      save: (() => { const b = document.getElementById('saveBtn').getBoundingClientRect(); return b.width > 0 && b.height >= 40; })() }));
    await shot(page, 'ai_scrolled');
    await page.evaluate(() => document.getElementById('reportFrame').contentWindow.scrollTo(0, 700)); await sleep(700);
    await shot(page, 'ai_folded');
    const m6 = await page.evaluate(() => Math.round(document.querySelector('#editorView .toolbar').getBoundingClientRect().height));
    ok(m4 > 200, 'AI-8  closing the assistant opens the full toolbar again', m4);
    ok(m5.tb <= 80 && m5.save && m5.fr >= 0.8 * m5.vh, 'AI-9  scrolling down the document folds the phone toolbar to one row (Save still there) and the document gets the screen', JSON.stringify(m5));
    ok(m6 > 200, 'AI-10 scrolling back up opens the toolbar again', m6);
    const fb = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; const l = fillBlanks(d);
      return { n: l.length, toc: l.filter(e => e.closest('.toc-row')).length, empty: l.filter(e => e.closest('.fig') && !e.closest('.fig').querySelector('.frame img')).length, chip: (document.getElementById('fillChipTxt') || {}).textContent }; });
    ok(fb.toc === 0 && fb.empty === 0 && fb.n > 0, 'AI-11 "N to fill" no longer counts Contents page numbers or empty photo boxes', JSON.stringify(fb));
    const ho1 = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; const h = d.querySelector('.howto'); const hi = d.querySelector('[data-cardinal-hint]');
      return { howto: h ? Math.round(h.getBoundingClientRect().height) : -1, hint: hi ? Math.round(hi.getBoundingClientRect().height) : -1 }; });
    ok(ho1.hint > 0 && ho1.hint <= 40, 'AI-12 the editing banner is one line on a phone', JSON.stringify(ho1));
    /* re-open the same document: the how-to panel is folded now that this device has seen it */
    const id = await page.evaluate(() => (window.__WRITES__ || []).filter(x => x.table === 'inspection_reports' && x.op === 'insert').map(x => x.result && x.result.id).pop() || null);
    await page.evaluate(async () => { await closeEditor(); }); await sleep(800);
    const rid = await page.evaluate(() => { const r = cacheRows.filter(x => x.project_id === 'R1' && /5 Pine St/.test(x.title || '')); return r.length ? r[r.length - 1].id : null; });
    await page.evaluate(async rid => { await openEditor(rid); }, rid || id); await sleep(2500);
    const ho2 = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; const h = d.querySelector('.howto'); return h ? Math.round(h.getBoundingClientRect().height) : -1; });
    await shot(page, 'ai_howto_folded');
    await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; const h = d.querySelector('.howto h4'); if (h) h.click(); }); await sleep(300);
    await shot(page, 'ai_howto_open');
    const ho3 = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; const h = d.querySelector('.howto'); return h ? Math.round(h.getBoundingClientRect().height) : -1; });
    ok(ho1.howto > 200 && ho2 > 0 && ho2 <= 60 && ho3 > 200, 'AI-13 the how-to panel shows the first time, folds to its heading after that, and its heading opens it', JSON.stringify({ first: ho1.howto, again: ho2, tapped: ho3, rid }));
  } finally { await browser.close(); }
}

/* ================================================================== LS */
async function scenarioList() {
  const { browser, page } = await boot('theo', { instr: false, desktop: true });
  try {
    await page.evaluate(() => { openProject('R1'); }); await sleep(1800);
    await page.evaluate(() => { showTab('inspections'); }); await sleep(800);
    const r = await page.evaluate(() => { const m = document.getElementById('inspDocsMount'); const head = m.querySelector('h3');
      /* the reports part is everything in the mount BEFORE an own heading (all of it when there is none) */
      const first = [...m.children].slice(0, head ? [...m.children].indexOf(head) : undefined).map(e => e.innerText).join('\n');
      const after = head ? (head.nextElementSibling || {}).innerText || '' : '';
      return { first: first.slice(0, 200), head: head ? head.textContent : '', after: after.slice(0, 200), empty: !!m.querySelector('.empty') }; });
    await shot(page, 'ls_tab');
    ok(!/Invoice — Sample Retail One/.test(r.first), 'LS-1  the client\'s Inspection Reports list does not list the invoice as a report', JSON.stringify(r));
    ok(/Invoice/.test(r.head) && /Invoice — Sample Retail One/.test(r.after), 'LS-2  the invoice keeps a heading of its own there', JSON.stringify(r));
    await page.evaluate(() => { createReportFrom(REPORT_TEMPLATE, 'Report', true); }); await sleep(900);
    const a = await page.evaluate(() => { const n = document.querySelector('#crAsk.open'); return n ? { t: n.innerText, go: n.querySelector('.askgo').textContent, no: n.querySelector('.askno').textContent } : null; });
    ok(!!a && !/OK =|Cancel =/.test(a.t) && /anyway/i.test(a.go) && /checklist/i.test(a.no), 'LS-3  the no-checklist question\'s words match its buttons', JSON.stringify(a));
    await page.evaluate(() => { const b = document.querySelector('#crAsk.open .askno'); if (b) b.click(); }); await sleep(400);
  } finally { await browser.close(); }
}

/* ================================================================== PR */
const pdfPages = (file) => { const n = +execSync(`pdfinfo ${file} | grep Pages | awk '{print $2}'`).toString().trim(); const t = []; for (let i = 1; i <= n; i++) t.push(execSync(`pdftotext -f ${i} -l ${i} -layout ${file} -`).toString()); return t; };
const pageOf = (t, s) => t.findIndex(x => x.includes(s)) + 1;
async function scenarioPrint() {
  const { browser, ctx, page } = await boot('theo', { instr: false, desktop: true });
  try {
    await ctx.route('**/cardinal-report-logo.png', r => r.fulfill({ status: 200, contentType: 'image/png', body: LOGO }));
    await page.evaluate(() => openProject('R1')); await sleep(1500);
    await page.evaluate(() => { window.crAsk = function () { return Promise.resolve(true); }; });
    await page.evaluate(() => createReportFrom(REPORT_TEMPLATE, 'Report', true, { title: 'Roof Inspection — Sample Retail One' })); await sleep(2500);
    /* a FULL report: cover photo, every photo box, every field filled; markers inside the two signature lines */
    await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument;
      function img(label, hue) { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = `hsl(${hue},25%,45%)`; g.fillRect(0, 0, 800, 600); g.fillStyle = '#fff'; g.font = 'bold 48px sans-serif'; g.fillText(label, 40, 320); return c.toDataURL('image/jpeg', 0.7); }
      d.querySelectorAll('.fig .frame').forEach((f, i) => { [...f.childNodes].forEach(c => { if (!(c.classList && c.classList.contains('tag'))) c.remove(); }); const im = d.createElement('img'); im.src = img('Photo ' + (i + 1), (i * 37) % 360); f.appendChild(im); });
      d.querySelectorAll('.cap .ph').forEach(p => { p.className = 'fill'; p.textContent = 'Close-up of a lifted shingle tab on the south slope; nail head exposed.'; });
      d.querySelectorAll('p.ph').forEach(p => { p.className = 'fill'; p.textContent = 'The roof covering shows widespread granule loss with exposed mat at the ridges and hips. Several tabs are creased from wind. Full replacement is recommended.'; });
      let n = 0; d.querySelectorAll('.cover-meta .ph, table.facts .ph, table.concerns .ph').forEach(p => { p.className = 'fill'; p.textContent = 'Sample value ' + (++n); });
      /* a long address that wraps, the way real ones do */
      const ad = d.querySelector('.cover-meta td:not(.k) span, .cover-meta td:not(.k)'); if (ad) ad.textContent = '12345 Sample Hollow Ridge Road, Apartment 12B, Dayton, OH 45405';
      const cover = d.querySelector('.cover-photo'); if (cover) { cover.innerHTML = ''; const im = d.createElement('img'); im.src = img('Front elevation', 200); cover.appendChild(im); }
      d.querySelectorAll('.sign .line').forEach((l, i) => { l.textContent = 'SIGLINE' + i; }); });
    const html = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; ensurePrintFix(d); compactForPrint(d); const h = '<!DOCTYPE html>\n' + d.documentElement.outerHTML; restorePrintMarks(d); return h; });
    const p = await ctx.newPage();
    /* a <base> on the app origin so the cover logo (35.8mm at 230px) really loads — a broken logo measures 8mm */
    await p.setContent(html.replace('<head>', '<head><base href="https://app.cardinalroster.com/">'), { waitUntil: 'load' }); await sleep(600);
    await p.setViewportSize({ width: 703, height: 1000 }); await p.emulateMedia({ media: 'print' });
    const cov = await p.evaluate(() => { const px = 96 / 25.4, c = document.querySelector('.cover'), lg = document.querySelector('.cover-logo');
      return { mm: Math.round(c.getBoundingClientRect().height / px), logo: lg ? Math.round(lg.getBoundingClientRect().height / px) : -1, logoLoaded: !!(lg && lg.naturalWidth) }; });
    ok(cov.logoLoaded && cov.mm <= 225, 'PR-0  the printed cover (real logo, a two-line address) is <= 225mm of the 237mm page', JSON.stringify(cov));
    await p.emulateMedia({ media: null }); await p.setViewportSize({ width: 1280, height: 900 });   /* null, not 'screen': page.pdf() honours an emulated screen */
    await p.pdf({ path: OUT + 'desk.pdf', format: 'Letter', printBackground: true, preferCSSPageSize: true });
    const t = pdfPages(OUT + 'desk.pdf');
    if (process.env.SHOTS) { try { execSync(`pdftoppm -r 45 -png ${OUT}desk.pdf ${OUT}desk`); execSync(`pdftoppm -r 45 -png ${OUT}host.pdf ${OUT}host`); } catch (e) {} }
    const dk = { pages: t.length, prop: pageOf(t, 'Property Address'), insp: pageOf(t, 'Inspector'), cont: pageOf(t, 'Contents'), line: pageOf(t, 'SIGLINE0'), lbl: pageOf(t, 'Client Acknowledgment') };
    ok(dk.prop === 1 && dk.insp === 1 && dk.cont === 2, 'PR-1  desktop print: the whole cover is page 1 and Contents starts page 2', JSON.stringify(dk));
    ok(dk.line > 0 && dk.line === dk.lbl, 'PR-2  desktop print: the signature lines and their labels share a page', JSON.stringify(dk));
    await p.emulateMedia({ media: 'print' }); await p.evaluate(INK);
    const mod = await p.evaluate(() => [...document.querySelectorAll('.chip.mod')].filter(e => e.offsetParent).map(e => window.__ink(e)));
    ok(mod.length > 0 && mod.every(r => r >= 4.5), 'PR-3  MODERATE chips clear 4.5:1 in print', JSON.stringify(mod));
    /* the iPhone / iPad path: the document printed from a host on the app page */
    await page.evaluate(() => { window.__crPrintHost = true; window.print = function () {}; });
    await page.evaluate(() => { const fr = document.getElementById('reportFrame'); const d = fr.contentDocument; compactForPrint(d); window.CardinalPrint.doc(d, fr.contentWindow); restorePrintMarks(d); });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: OUT + 'host.pdf', format: 'Letter', printBackground: true, preferCSSPageSize: true });
    await page.emulateMedia({ media: null });
    const h = pdfPages(OUT + 'host.pdf');
    const hk = { pages: h.length, prop: pageOf(h, 'Property Address'), insp: pageOf(h, 'Inspector'), cont: pageOf(h, 'Contents'), line: pageOf(h, 'SIGLINE0'), lbl: pageOf(h, 'Client Acknowledgment') };
    ok(hk.prop === 1 && hk.insp === 1 && hk.cont === 2, 'PR-4  iPhone print path: the whole cover is page 1 and Contents starts page 2', JSON.stringify(hk));
    ok(hk.line > 0 && hk.line === hk.lbl, 'PR-5  iPhone print path: the signature lines and their labels share a page', JSON.stringify(hk));
    /* a blank summary: its heading must not print alone */
    const orphan = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; const sh = d.querySelector('[data-cardinal-summary-heading]');
      let p = sh.nextElementSibling; while (p && p.tagName !== 'P') p = p.nextElementSibling; const was = p.textContent, cls = p.className;
      p.className = 'ph'; p.textContent = '[Summarize the overall condition.]'; compactForPrint(d);
      const hidden = !!sh.getAttribute('data-emptyblock'); p.className = cls; p.textContent = was; compactForPrint(d); const back = !sh.getAttribute('data-emptyblock'); restorePrintMarks(d); return { hidden, back }; });
    ok(orphan.hidden && orphan.back, 'PR-6  an empty "Overall Condition Assessment" heading does not print alone (and prints once filled)', JSON.stringify(orphan));
    /* the findings header and the signature block, swept down the page so every position near a page foot is tried */
    const head = html.slice(0, html.indexOf('<body'));
    const tbl = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; const t = d.querySelector('table.concerns'); return t ? t.outerHTML : ''; });
    const sign = await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument; const s = d.querySelector('.sign'); return s ? s.outerHTML : ''; });
    const q = await ctx.newPage();
    const orphHead = [], splitSign = [];
    for (let mm = 150; mm <= 236; mm += 4) {
      const body = `<body><h3 data-cardinal-summary-heading style="display:none"></h3><div style="height:${mm}mm"></div><h2 class="sec"><span class="num">2</span>Summary of Findings</h2>${tbl}<div style="height:30mm"></div><p>NEXTBLOCK</p></body></html>`;
      await q.setContent(head + body, { waitUntil: 'load' });
      await q.pdf({ path: OUT + 'sw.pdf', format: 'Letter', printBackground: true, preferCSSPageSize: true });
      const s = pdfPages(OUT + 'sw.pdf'); const ph = pageOf(s, 'Priority'), pr = pageOf(s, 'Sample value');
      if (ph && pr && ph !== pr) orphHead.push(mm);
      const body2 = `<body><h3 data-cardinal-summary-heading style="display:none"></h3><div style="height:${mm}mm"></div>${sign}</body></html>`;
      await q.setContent(head + body2, { waitUntil: 'load' });
      await q.pdf({ path: OUT + 'sw2.pdf', format: 'Letter', printBackground: true, preferCSSPageSize: true });
      const s2 = pdfPages(OUT + 'sw2.pdf'); const l = pageOf(s2, 'SIGLINE0'), b = pageOf(s2, 'Client Acknowledgment');
      if (l && b && l !== b) splitSign.push(mm);
    }
    ok(orphHead.length === 0, 'PR-7  swept 150–236mm down the page: the findings header never sits alone at a page foot', 'orphaned at ' + JSON.stringify(orphHead) + 'mm');
    ok(splitSign.length === 0, 'PR-8  swept 150–236mm: a signature line never prints on a different page from its label', 'split at ' + JSON.stringify(splitSign) + 'mm');
  } finally { await browser.close(); }
}

for (const [name, fn] of [['QI', scenarioQI], ['PL', scenarioPlain], ['AI', scenarioAI], ['LS', scenarioList], ['PR', scenarioPrint]]) {
  try { console.log('— ' + name); await fn(); }
  catch (e) { ok(false, name + ' scenario crashed', (e.message || String(e)).split('\n')[0].slice(0, 200)); }
}
const pe = log.filter(l => /PAGEERROR/.test(l));
ok(pe.length === 0, 'no page errors in any scenario', pe.slice(0, 3).join(' | '));
console.log((fail ? 'RED' : 'GREEN') + `  gate_1423 ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
