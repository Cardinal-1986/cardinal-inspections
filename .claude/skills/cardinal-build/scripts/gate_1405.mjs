/* gate_1405 — inspection reports on paper, the Supplement Desk, api/supplement.js.
 *   A  a report opened from a list is not filled (or saved) with the last-open client's checklist
 *   B  print numbering skips the Contents heading; the print fix caps the cover; Save as PDF compacts
 *   C  Desk: a claim opened while the previous one is still loading shows only its own photos / docs / iTel
 *   D  Desk: a drafted letter's script does not run; an inline-data photo is not offered as evidence
 *   E  route: all-503 Gemini tries the OpenAI backup; a non-JSON error body is not shown as parser text
 * Args: [index.html] [supplement.html] [api/supplement.js] -> negative control (1404 trees must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
process.env.DESKFILE = process.argv[3] || '/home/user/cardinal-inspections/supplement.html';
const ROUTE = process.argv[4] || '/home/user/cardinal-inspections/api/supplement.js';
import fs from 'fs';
const SRC = fs.readFileSync(process.env.APPFILE, 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 280000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const tryDo = async (why, f) => { try { return await f(); } catch (e) { ok(false, why + ' (crashed)', e.message.split('\n')[0].slice(0, 140)); return null; } };

/* A, B — the app */
{
  const { boot } = await import('./gate_1403_lib.mjs');
  const seed = `(function(){ var s=window.__SEED__; var p=s.projects.find(function(x){return x.id==='I1'});
   var c=JSON.parse(p.checklist); Object.assign(c,{structure:'ALPHA-STRUCTURE house',age:'19',pitch:'6/12',layers:'2 Layers'}); p.checklist=JSON.stringify(c); })();`;
  const { browser, page } = await boot('theo', { instr: false, desktop: true, seed });
  try {
    await tryDo('A', async () => {
      const p1 = await page.evaluate(async () => {
        __SEED__.inspection_reports.push({ id: 'rpI2', project_id: 'I2', title: 'Report — Sample Insured Two', status: 'unsent', html: REPORT_TEMPLATE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'theo@cardinalrenovations.net' });
        await reload(); openProject('I1'); await new Promise(r => setTimeout(r, 1500));
        openList('inspections'); await new Promise(r => setTimeout(r, 500));
        await openEditor('rpI2'); await new Promise(r => setTimeout(r, 2000));
        await closeEditor(); await new Promise(r => setTimeout(r, 800));
        return /ALPHA-STRUCTURE/.test(__SEED__.inspection_reports.find(r => r.id === 'rpI2').html);
      });
      ok(!p1, 'A  another client’s checklist is not written into a report opened from the list', 'persisted=' + p1);
    });
    await tryDo('B1', async () => {
      const nums = await page.evaluate(() => {
        const d = document.implementation.createHTMLDocument('r'); d.documentElement.innerHTML = REPORT_TEMPLATE;
        compactForPrint(d);
        return [...d.querySelectorAll('h2.sec')].filter(h => !h.getAttribute('data-emptysec')).slice(0, 3)
          .map(h => (h.querySelector('.num') || {}).textContent + ' ' + h.textContent.replace(/\s+/g, ' ').trim().slice(0, 24));
      });
      const firstNumbered = nums.find(x => /^\d/.test(x)) || '';
      ok(/^1\b/.test(firstNumbered) && !/^\d/.test(nums[0] || '') , 'B1 the Contents heading is not numbered; the first section is 1', JSON.stringify(nums));
    });
  } finally { await browser.close(); }
}
{
  ok(/'\.cover\{min-height:226mm !important;\}'/.test(SRC), 'B2 print caps the cover so it fits one Letter page');
  const i = SRC.indexOf("document.getElementById('dlBtn').addEventListener('click'"), blk = SRC.slice(i, i + 1400);
  ok(/compactForPrint\(_dd\)/.test(blk) && /restorePrintMarks\(_dd\)/.test(blk), 'B3 Save as PDF compacts like Print');
}

/* C, D — the Desk */
{
  const { boot } = await import('./gate_1405_desk.mjs');
  await tryDo('C', async () => {
    const { browser, page } = await boot();
    try {
      await page.evaluate(() => { window.__SLOW__ = { project_photos: 1500, itel_lab_reports: 1500, inspection_reports: 1500 }; });
      await page.click('.claimrow[data-id^="cA"]'); await page.waitForTimeout(200);
      await page.evaluate(() => { window.__SLOW__ = {}; });
      await page.click('#backBtn'); await page.waitForTimeout(200);
      await page.click('.claimrow[data-id^="cB"]'); await page.waitForTimeout(2500);
      const r = await page.evaluate(() => ({ photos: S.photos.map(p => p.storage_path || p.id), kv: document.getElementById('deskKv').innerText, scopes: [...document.querySelectorAll('input[name=scopeDoc]')].map(i => i.value) }));
      ok(!r.photos.some(p => /pA|phA/.test(p)) && !/ITEL-A/.test(r.kv) && !r.scopes.includes('rA'), 'C  claim B shows none of claim A’s photos, scope or iTel', JSON.stringify(r).slice(0, 200));
    } finally { await browser.close(); }
  });
  await tryDo('D', async () => {
    const gaps = [{ id: 'g1', item: 'Drip edge', why: 'omitted', basis: 'code', pack_id: 'drip_edge', citation: 'RCO R905.2.8.5', qty: 200, unit: 'LF', qty_src: 'meas', confidence: 'high', photos: [], included: false }];
    const letter = '<p>Dear adjuster.</p>[[PHOTOS:g1]]<img src=x onerror="window.__xss=(window.__xss||0)+1">';
    const { browser, page } = await boot({ apiPlan: { 'supplement:analyze': { status: 200, body: { ok: true, gaps, scope_summary: 's' } }, 'supplement:draft': { status: 200, body: { ok: true, subject: 'Supp', letter_html: letter, dollar_flag: false, cite_flag: [] } } } });
    try {
      await page.click('.claimrow[data-id^="cA"]'); await page.waitForTimeout(800);
      await page.click('#analyzeBtn'); await page.waitForTimeout(800);
      await page.click('.gap[data-id="g1"] .phbtn'); await page.waitForTimeout(200);
      const offered = await page.evaluate(() => [...document.querySelectorAll('#photoGrid .ph')].map(p => p.getAttribute('data-key')));
      ok(!offered.some(k => /^row:/.test(k)) && offered.includes('pA/one.jpg'), 'D1 only stored photos are offered as evidence', JSON.stringify(offered));
      await page.click('#photoGrid .ph[data-key="pA/one.jpg"]'); await page.click('#phDone');
      await page.check('.gap[data-id="g1"] .inc');
      await page.click('#draftBtn'); await page.waitForTimeout(800);
      await page.click('#printBtn'); await page.waitForTimeout(1500);
      const x = await page.evaluate(() => ({ xss: window.__xss || 0, print: window.__printLog }));
      ok(x.xss === 0, 'D2 a drafted letter’s script never runs (editor or print)', 'ran ' + x.xss);
      const real = x.print.length ? x.print[0].complete.filter((c, i) => /supabase\.co/.test(x.print[0].srcs[i])) : [];
      ok(real.length >= 1 && real.every(Boolean), 'D3 print waits for the letter’s photos to load', JSON.stringify(real));
    } finally { await browser.close(); }
  });
}

/* E — the route */
{
  const handler = (await import(ROUTE)).default;
  process.env.GEMINI_API_KEY = 'stubkey'; process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'stub';
  let plan = [], oaCalls = 0;
  globalThis.fetch = async (url) => {
    url = String(url);
    if (url.endsWith('/auth/v1/user')) return { ok: true, json: async () => ({ email: 'theo@example.com' }) };
    if (url.includes('is_cardinal_admin')) return { ok: true, json: async () => true };
    if (url.includes('generativelanguage')) { const p = plan.shift() || { status: 503 };
      return { ok: p.status === 200, status: p.status, json: async () => { if (p.raw) return JSON.parse(p.raw); return { candidates: [{ content: { parts: [{ text: p.text || '{}' }] } }] }; } }; }
    if (url.includes('openai')) { oaCalls++; return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"subject":"s","letter_html":"<p>oa</p>"}' } }] }) }; }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const run = async (body, p) => { plan = p; oaCalls = 0; const res = { code: 0, body: null, status(c) { res.code = c; return res; }, json(b) { res.body = b; return res; } };
    await handler({ method: 'POST', headers: { authorization: 'Bearer x' }, body }, res); return res; };
  const items = [{ id: 'g1', item: 'Underlayment', pack_id: 'low_slope_underlayment', qty: 3, unit: 'SQ' }];
  process.env.OPENAI_API_KEY = 'oa';
  const r1 = await run({ mode: 'draft', items }, [{ status: 503 }, { status: 503 }, { status: 503 }, { status: 503 }, { status: 503 }, { status: 503 }]);
  ok(r1.code === 200 && oaCalls >= 1, 'E1 every Gemini rung 503 → the OpenAI backup answers', r1.code + ' oa=' + oaCalls);
  delete process.env.OPENAI_API_KEY;
  const r2 = await run({ mode: 'draft', items }, [{ status: 500, raw: '<html>' }, { status: 500, raw: '<html>' }, { status: 500, raw: '<html>' }, { status: 500, raw: '<html>' }]);
  ok(!/Unexpected token|not valid JSON/.test(JSON.stringify(r2.body || {})), 'E2 a non-JSON error body is not shown as parser text', r2.code + ' ' + JSON.stringify(r2.body).slice(0, 100));
}

console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
