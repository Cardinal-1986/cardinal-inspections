/* gate_1428 — uploading a signed contract asks to move the job to Approved (Theo, 29 Oct: "yes").
 *   U1  a Prospect job: the upload ends on "Move <name> to Approved?" with Move to Approved / Not yet,
 *       and nothing is written or sent before the answer
 *   U2  Move to Approved: the stage is written Approved (setStage), Curtis gets the APPROVED schedule +
 *       order materials alert ONCE, the 1427 "not yet Approved" notice is NOT also sent, the toast says so
 *   U3  Not yet: no stage write, and the 1427 notice goes to Curtis and the office exactly as before
 *   U4  a job already Approved: no question and no notice
 *   U5  an estimate upload asks nothing
 * Arg: [index.html] -> negative control (1427 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot, log } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 300000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + String(d).slice(0, 260) : '')); c ? pass++ : fail++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SEED = `(function(){ var S=window.__SEED__; var r=S.projects.find(function(p){return p.id==='R1';});
  S.projects.push(Object.assign({}, r, { id:'R7', name:'Sample Retail Seven', stage:'Prospect', address:'7 Pine St' }));
  S.projects.push(Object.assign({}, r, { id:'R8', name:'Sample Retail Eight', stage:'Prospect', address:'8 Pine St' }));
  S.projects.push(Object.assign({}, r, { id:'R9', name:'Sample Retail Nine', stage:'Approved', address:'9 Pine St' })); })();`;
const askState = (page) => page.evaluate(() => { const a = document.getElementById('crAsk');
  return { open: !!(a && a.classList.contains('open')), text: a ? a.innerText.replace(/\s+/g, ' ').trim() : '',
    go: a ? (a.querySelector('.askgo') || {}).textContent : '', no: a ? (a.querySelector('.askno') || {}).textContent : '' }; });
const writes = (page, id) => page.evaluate((id) => (window.__WRITES__ || []).filter(x => x.table === 'projects' && x.payload && x.payload.stage &&
  JSON.stringify(x).indexOf(id) !== -1).map(x => x.payload.stage), id);
async function upload(page, id, kind) {
  await page.evaluate((id) => { try { hideAllViews(); } catch (e) {} openProject(id); }, id); await sleep(1400);
  await page.evaluate((k) => { showTab('contracts'); document.getElementById(k === 'est' ? 'pUploadEstimateBtn' : 'pUploadContractBtn').click(); }, kind); await sleep(700);
  await page.fill('#ctUpAmt', '14250');
  if (kind !== 'est') await page.fill('#ctUpDate', '2026-10-28');
  await page.setInputFiles('#ctUpFile', { name: 'signed.png', mimeType: 'image/png', buffer: PNG });
  await page.click('#ctUpGo'); await sleep(2600);
}
const notes = (n0) => log.slice(n0).filter(l => /^API POST \/api\/notify/.test(l));
const toasts = (page) => page.evaluate(() => [...document.querySelectorAll('#crToasts *')].map(e => e.textContent).join(' | '));
try {
  const { browser, page } = await boot('theo', { instr: false, seed: SEED });
  try {
    /* U1 + U2: Prospect -> Move to Approved */
    let n0 = log.length;
    await upload(page, 'R7', 'contract');
    let a = await askState(page);
    ok(a.open && /^Move Sample Retail Seven to Approved\?/.test(a.text) && a.go === 'Move to Approved' && a.no === 'Not yet',
      'U1  a Prospect job: the upload asks "Move Sample Retail Seven to Approved?" — Move to Approved / Not yet', JSON.stringify(a));
    ok((await writes(page, 'R7')).length === 0 && notes(n0).length === 0, 'U1  ...and nothing is written or sent before the answer',
      JSON.stringify({ w: await writes(page, 'R7'), n: notes(n0).length }));
    if (a.open) { await page.click('#crAsk .askgo'); await sleep(2200); }
    const w7 = await writes(page, 'R7'); const n7 = notes(n0);
    const st7 = await page.evaluate(() => { const p = cacheProjects.find(x => x.id === 'R7'); return p && p.stage; });
    ok(st7 === 'Approved' && w7.includes('Approved'), 'U2  Move to Approved writes the stage Approved', JSON.stringify({ st7, w7 }));
    ok(n7.filter(l => /APPROVED/.test(l) && /schedule/.test(l) && /curtis@cardinalrenovations\.net/.test(l)).length === 1,
      'U2  ...Curtis gets the APPROVED schedule + order materials alert once', n7.join(' | ') || 'none');
    ok(!n7.some(l => /not yet Approved/.test(l)), 'U2  ...and not the "not yet Approved" notice as well', n7.join(' | '));
    const t7 = await toasts(page);
    ok(/The job is Approved/.test(t7), 'U2  ...and the toast says the job is Approved', t7);

    /* U3: Prospect -> Not yet */
    n0 = log.length;
    await upload(page, 'R8', 'contract');
    a = await askState(page);
    if (a.open) { await page.click('#crAsk .askno'); await sleep(2200); }
    const w8 = await writes(page, 'R8'); const n8 = notes(n0);
    const st8 = await page.evaluate(() => { const p = cacheProjects.find(x => x.id === 'R8'); return p && p.stage; });
    ok(a.open && st8 === 'Prospect' && w8.length === 0, 'U3  Not yet leaves the job at Prospect, no stage write', JSON.stringify({ open: a.open, st8, w8 }));
    ok(n8.some(l => /Signed contract uploaded/.test(l) && /not yet Approved/.test(l) && /curtis@cardinalrenovations\.net/.test(l)) && !n8.some(l => /APPROVED \\u2014|APPROVED —/.test(l)),
      'U3  ...and Curtis and the office get the "not yet Approved" notice, as in 1427', n8.join(' | ') || 'none');

    /* U4: already Approved */
    n0 = log.length;
    await upload(page, 'R9', 'contract');
    a = await askState(page);
    ok(!a.open && notes(n0).length === 0 && (await writes(page, 'R9')).length === 0, 'U4  a job already Approved: no question, no notice, no write', JSON.stringify({ a, n: notes(n0).length }));
    if (a.open) { await page.click('#crAsk .askno'); await sleep(500); }

    /* U5: estimate upload */
    n0 = log.length;
    await page.evaluate(() => { const p = cacheProjects.find(x => x.id === 'R8'); if (p) p.stage = 'Prospect'; });
    await upload(page, 'R8', 'est');
    a = await askState(page);
    ok(!a.open, 'U5  an estimate upload asks nothing', JSON.stringify(a));
    if (a.open) { await page.click('#crAsk .askno'); await sleep(500); }

    const errs = log.filter(l => /PAGEERROR/.test(l));
    ok(errs.length === 0, 'U6  no page errors', errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
} catch (e) { ok(false, 'run crashed', String(e.message || e).split('\n')[0].slice(0, 200)); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
