/* gate_1424 — estimates and invoicing after judges #2 (Estimates) and #5 (Invoicing & payments).
 *  E1  the job's measurements (checklist.meas) carry into the estimate: template, Library, assemblies
 *  E2  the unsaved-changes sheet: the filled choice saves, Discard is red words, Keep editing cancels
 *  E3  a line's ▲ ▼ ✕ are 44px, ✕ stands apart, Remove has an Undo, every change marks the draft unsaved
 *  E4  Qty / Unit / Price each are labelled and 44px
 *  E5  a published estimate is one card in the builder's words; Mark sent / unsent moves the estimate;
 *      Edit estimate opens the builder
 *  E7  a printed estimate carries its totals once, after the last line
 *  E8  Good / Better / Best: Generate waits for two estimates
 *  E9  the Estimates tab has ONE red button
 *  I1  the invoice pill answers the invoice's state (Overdue / Draft / Partly paid / ...), never "Deposit Paid"
 *  I2  "Remove this payment" stays behind ⋯
 *  I3  a recorded payment's confirmation is a success toast that clears itself
 *  I4  a Community job priced by its signed contract shows that value
 *  I5  the invoice carries Cardinal's address, phone and where to mail a check; one INVOICE heading
 *  I6  a contract-only invoice line describes the work
 *  I7  one red Record payment per job page   I8  AR sub-lines wrap   I9  the home A/R card counts the other boards
 * Arg: [index.html] -> negative control (b1422 must go RED with named failures, no crash). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot, log } = await import('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/gate_1403_lib.mjs');
import fs from 'fs';
import { execFileSync } from 'child_process';
const DIR = (await import('os')).tmpdir();   /* 1424: the print PDF is a throwaway */
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 420000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + String(d).slice(0, 220) : '')); c ? pass++ : fail++; };
const crash = (sect, e) => ok(false, sect + ' crashed', (e && e.message || String(e)).split('\n')[0].slice(0, 180));

/* R2: a retail prospect with Roofr measurements; a Library with roofing, gutter and siding lines */
const SEED = `(function(){ var S=window.__SEED__; if(!S) return;
 function iso(d){ return new Date(Date.now()+d*86400000).toISOString(); }
 S.projects.push({ id:'R2', name:'Sample Prospect Two', address:'40 Maple Ave', city:'Kettering', state:'OH', zip:'45429', stage:'Prospect', crm:'retail',
   created_by:'rep@cardinalrenovations.net', sales_rep:'rep@cardinalrenovations.net', phone:'9375550177', email:'prospect2@example.com',
   checklist: JSON.stringify({lead:{claim_type:'retail',assigned:['rep@cardinalrenovations.net']}, po:2006, meas:{sq:'24.3', pitch:'6/12', ridge:'42', eave:'132', source:'Roofr'}}), created_at:iso(-6), updated_at:iso(-1), stage_since:iso(-1) });
 S.estimate_line_items = [
  { id:'oc', name:'Owens Corning Preferred Roofing System', description:'Remove existing layers, install synthetic underlayment, ice & water shield, Duration shingles', default_price:525, category:'Roofing', unit:'SQ', active:true, sort_order:1 },
  { id:'dk', name:'Decking replacement (per sheet)', description:'7/16 OSB', default_price:85, category:'Roofing', unit:'EA', active:true, sort_order:3 },
  { id:'g6', name:'6" K-Style Seamless Gutters & Downspouts', description:'Aluminum', default_price:15, category:'Gutters', unit:'LF', active:true, sort_order:5 },
  { id:'sd', name:'Mastic vinyl siding', description:'Carvedwood', default_price:650, category:'Siding', unit:'SQ', active:true, sort_order:6 } ];
 S.estimates = S.estimates || []; S.inspection_reports = S.inspection_reports || [];
})();`;
const NOINV = `(function(){ var S=window.__SEED__; if(!S) return; S.inspection_reports = S.inspection_reports.filter(function(r){ return !/^inv/.test(r.id); }); })();`;

const T = async (page, f, ...a) => { try { return await page.evaluate(f, ...a); } catch (e) { return { __err: e.message.split('\n')[0] }; } };
async function tryClick(page, sel, why, opt = {}) {
  try { await page.click(sel, Object.assign({ timeout: 3500 }, opt)); return true; }
  catch (e) { ok(false, why + ' (could not tap ' + sel + ')', e.message.split('\n')[0].slice(0, 120)); return false; }
}
const lines = page => T(page, () => { const s = window.CardinalEstimates && window.CardinalEstimates.currentState(); return s ? s.line_items.map(l => ({ n: l.name, q: l.qty, u: l.unit, keys: Object.keys(l) })) : null; });
async function openTemplate(page) {
  await T(page, () => openProject('R2')); await page.waitForTimeout(1400);
  await T(page, () => showTab('estimates')); await page.waitForTimeout(700);
  await page.click('#pNewEstimateBtn'); await page.waitForTimeout(300);
  await page.click('#pEstMenu .estopt[data-tpl="roof"]'); await page.waitForTimeout(1500);
}

/* ═══════════════════ A · the builder, a rep on a phone ═══════════════════ */
{
  const { browser, page } = await boot('rep', { instr: false, seed: SEED });
  try {
    await T(page, () => { try { window.CardinalFrontDoor && window.CardinalFrontDoor.close(); } catch (_) {} });
    await openTemplate(page);
    /* E8 — Good / Better / Best before any estimate is saved */
    try {
      const o = await T(page, () => { const b = document.getElementById('cr-gbb-btn'); return b ? b.textContent.trim() : null; });
      ok(o && /Good/.test(o), 'E8a the header button says what it builds (Good / Better / Best)', o);
      await T(page, () => { const b = document.getElementById('cr-gbb-btn'); b && b.click(); }); await page.waitForTimeout(1300);
      const g = await T(page, () => { const go = document.querySelector('#cr-gbb-pick [data-act="gbbp-go"]'); return go ? go.disabled : null; });
      ok(g === true, 'E8b with fewer than two estimates Generate is off', String(g));
      await T(page, () => { const x = document.querySelector('#cr-gbb-pick [data-act="gbbp-x"]'); x && x.click(); });
    } catch (e) { crash('E8', e); }
    /* E1 */
    try {
      let L = await lines(page);
      ok(L && L[0] && L[0].u === 'SQ' && Number(L[0].q) === 24.3, 'E1a From a template: the Roofing line opens at the job\'s 24.3 SQ', JSON.stringify(L && L[0] && [L[0].q, L[0].u]));
      const hint = await T(page, () => (document.querySelector('#cr-est-view .cr-est-lineitem .cr-est-meashint') || {}).textContent || '');
      ok(/24\.3 SQ from Roofr/.test(hint), 'E1b the line says where its squares came from', hint);
      await page.click('#cr-est-view button[data-act="add-lib"]'); await page.waitForTimeout(700);
      await page.click('#cr-est-picker .p-item[data-id="g6"]'); await page.waitForTimeout(500);
      await page.click('#cr-est-view button[data-act="add-lib"]'); await page.waitForTimeout(500);
      await page.click('#cr-est-picker .p-item[data-id="sd"]'); await page.waitForTimeout(500);
      L = await lines(page);
      const g = (L || []).find(l => /Gutters/.test(l.n)), sd = (L || []).find(l => /siding/.test(l.n));
      ok(g && Number(g.q) === 132, 'E1c + From Library: a Gutters LF line opens at the 132 LF of eaves', JSON.stringify(g && g.q));
      ok(sd && Number(sd.q) === 1, 'E1d a siding SQ line never takes the ROOF squares', JSON.stringify(sd && sd.q));
      await page.click('#cr-est-view button[data-act="add-assembly"]'); await page.waitForTimeout(900);
      const asm = await T(page, () => { const v = id => { const c = document.querySelector('#cr-est-picker .asm-card[data-aid="' + id + '"]'); const i = c && c.querySelector('.asm-sq'); return i ? i.value : null; };
        return { roof: v('def-roof-oc'), metal: v('def-roof-metal'), siding: v('def-siding'), note: ((document.querySelector('#cr-est-picker .asm-card[data-aid="def-roof-oc"] .asm-meas') || {}).textContent || '') }; });
      ok(asm.roof === '24.3' && !asm.metal && !asm.siding, 'E1e the whole-roof assembly\'s Squares box holds 24.3; the porch-accent and siding boxes stay empty', JSON.stringify(asm));
      ok(/Roofr/.test(asm.note), 'E1f the assembly card says the numbers came from Roofr', asm.note);
      await page.click('#cr-est-picker .asm-card[data-aid="def-roof-oc"] .asm-insert'); await page.waitForTimeout(500);
      await page.click('#cr-est-view button[data-act="add-assembly"]'); await page.waitForTimeout(700);
      await page.click('#cr-est-picker .asm-card[data-aid="def-gutter"] .asm-insert'); await page.waitForTimeout(500);
      L = await lines(page);
      const f = re => (L || []).find(l => re.test(l.n)) || {};
      ok(Number(f(/ridge vent/i).q) === 42 && Number(f(/Drip edge/).q) === 132 && Number(f(/Duration architectural/).q) === 26.73,
        'E1g the roof assembly takes ridge 42 LF, eaves 132 LF and 24.3 SQ + 10% = 26.73 (rounded)', JSON.stringify([f(/ridge vent/i).q, f(/Drip edge/).q, f(/Duration architectural/).q]));
      ok(Number(f(/\.032 aluminum/).q) === 132 && Number(f(/hangers/).q) === 66, 'E1h the gutter assembly takes 132 LF of eaves, hangers every 24in (66)', JSON.stringify([f(/\.032 aluminum/).q, f(/hangers/).q]));
      ok((L || []).every(l => !l.keys.some(k => ['from', 'per', 'meas'].includes(k))), 'E1i no measurement bookkeeping rides onto a saved line', JSON.stringify((L || []).map(l => l.keys.filter(k => ['from', 'per', 'meas'].includes(k))).flat()));
    } catch (e) { crash('E1', e); }
    /* E3 / E4 */
    try {
      const m = await T(page, () => { const row = document.querySelector('#cr-est-view .cr-est-lineitem'); row.scrollIntoView({ block: 'center' });
        const R = s => { const e = row.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, aria: e.getAttribute('aria-label') }; };
        return { up: R('[data-act="move-up"]'), dn: R('[data-act="move-down"]'), del: R('[data-act="del-line"]'), qty: R('[data-lf="qty"]'), unit: R('[data-lf="unit"]'), price: R('[data-lf="unit_price"]'),
          labels: [...row.querySelectorAll('.pricing label span')].map(s => s.textContent.trim().toUpperCase()) }; });
      const big = b => b && b.w >= 44 && b.h >= 44;
      ok(big(m.up) && big(m.dn) && big(m.del), 'E3a a line\'s ▲ ▼ ✕ are each at least 44x44', JSON.stringify([m.up, m.dn, m.del].map(b => b && [Math.round(b.w), Math.round(b.h)])));
      ok(m.del && m.dn && (m.del.x - m.dn.r) >= 8, 'E3b ✕ stands clear of ▼ (≥ 8px)', m.del && m.dn ? Math.round(m.del.x - m.dn.r) + 'px' : 'missing');
      ok(m.qty && m.price && m.unit && m.qty.h >= 44 && m.price.h >= 44 && m.unit.h >= 44, 'E4a Qty / Unit / Price each are 44px tall', JSON.stringify([m.qty, m.unit, m.price].map(b => b && Math.round(b.h))));
      ok(m.qty && m.qty.aria && m.price && m.price.aria && m.unit && m.unit.aria, 'E4b each number field has an aria-label', JSON.stringify([m.qty && m.qty.aria, m.unit && m.unit.aria, m.price && m.price.aria]));
      ok(JSON.stringify(m.labels) === JSON.stringify(['QTY', 'UNIT', 'PRICE EACH']), 'E4c the words QTY · UNIT · PRICE EACH stay above the numbers', JSON.stringify(m.labels));
      const n0 = ((await lines(page)) || []).length;
      const first = ((await lines(page)) || [])[0];
      await T(page, () => document.querySelector('#cr-est-view .cr-est-lineitem [data-act="del-line"]').click()); await page.waitForTimeout(400);
      const u = await T(page, () => { const t = document.querySelector('.cr-undo-toast'); if (!t) return null; const b = t.querySelector('.btn').getBoundingClientRect(); const bar = document.querySelector('#cr-est-view .cr-est-phonebar'); const br = bar && bar.getBoundingClientRect();
        return { txt: t.innerText.replace(/\n/g, ' '), bh: b.height, bottom: t.getBoundingClientRect().bottom, barTop: br ? br.top : null }; });
      ok(u && /Removed/.test(u.txt), 'E3c Remove offers an Undo toast', u ? u.txt : 'no toast');
      ok(u && u.bh >= 44, 'E3d the Undo button is 44px tall', u ? Math.round(u.bh) : 'no toast');
      ok(u && u.barTop != null && u.bottom <= u.barTop + 0.5, 'E3e the toast sits above the Save / Email / Publish bar', u ? JSON.stringify([Math.round(u.bottom), Math.round(u.barTop)]) : 'no toast');
      if (u && !(await tryClick(page, '.cr-undo-toast .btn', 'E3f the Undo button is reachable (not under another toast)'))) await T(page, () => document.querySelector('.cr-undo-toast .btn').click());
      await page.waitForTimeout(400);
      const L2 = (await lines(page)) || [];
      ok(L2.length === n0 && L2[0] && first && L2[0].n === first.n, 'E3f Undo puts the line back where it was', JSON.stringify([n0, L2.length, L2[0] && L2[0].n.slice(0, 24)]));
    } catch (e) { crash('E3/E4', e); }
    /* E2 — a removed line alone must make Close ask (it used to mark nothing) */
    try {
      await T(page, () => { const v = document.getElementById('cr-est-view'); v.querySelector('.cr-est-body').scrollTop = 0; });
      await page.click('#cr-est-view [data-act="close"]'); await page.waitForTimeout(500);
      const a = await T(page, () => { const n = document.getElementById('crAsk'); if (!n || !n.classList.contains('open')) return null;
        return [...n.querySelectorAll('button')].filter(b => b.offsetParent).map(b => ({ t: b.innerText.split('\n')[0].trim(), bg: getComputedStyle(b).backgroundColor, cls: b.className })); });
      ok(!!a, 'E2a Close with unsaved changes asks first (an Undo-restored line counts as a change)', a ? '' : 'closed silently');
      const filled = (a || []).filter(b => !/rgba\(0, 0, 0, 0\)|rgb\(34, 38, 43\)|rgb\(247, 247, 248\)|rgb\(242, 242, 242\)/.test(b.bg));
      ok(filled.length === 1 && /^Save and close$/.test(filled[0].t), 'E2b the one filled button is "Save and close", not the one that discards', JSON.stringify(filled.map(b => b.t)));
      ok((a || []).some(b => /^Discard changes$/.test(b.t)) && (a || []).some(b => /^Keep editing$/.test(b.t)), 'E2c the other two say Discard changes and Keep editing', JSON.stringify((a || []).map(b => b.t)));
      if (a) {
        const W0 = await T(page, () => (window.__WRITES__ || []).length);
        if (await tryClick(page, '#crAsk .askprime', 'E2d Save and close')) {
          await page.waitForTimeout(1500);
          const r = await T(page, (n) => ({ w: (window.__WRITES__ || []).slice(n).filter(x => x.table === 'estimates').map(x => x.op), open: document.getElementById('cr-est-view').classList.contains('open') }), W0);
          ok(r.w && r.w.includes('insert') && r.open === false, 'E2d Save and close saves the estimate, then closes', JSON.stringify(r));
        } else { await T(page, () => { const b = document.querySelector('#crAsk .askno'); b && b.click(); }); await page.waitForTimeout(300); await T(page, () => window.CardinalEstimates && window.CardinalEstimates.close()); }
      }
    } catch (e) { crash('E2', e); }
    /* E5 / E6 — publish, then the profile's Estimates tab */
    try {
      await openTemplate(page);
      /* a red toast that never clears can sit over the phone bar (E10): that is a named failure, and the
         publish still runs so the rest of E5 reports instead of crashing (BUG_CLASSES 37) */
      if(!(await tryClick(page, '#cr-est-view [data-act="bar-publish"]', 'E10 Publish on the phone bar is not under a stuck toast'))) await T(page, () => document.querySelector('#cr-est-view [data-act="bar-publish"]').click());
      await page.waitForTimeout(3200);
      const chip = await T(page, () => (document.getElementById('edClientChip') || {}).innerText || '');
      const pubNum = await T(page, () => ((document.getElementById('reportTitle') || {}).value || '').match(/EST-\d{4}-\d+/) ? ((document.getElementById('reportTitle') || {}).value || '').match(/EST-\d{4}-\d+/)[0] : null);
      /* the send chooser's Not now, then the back chip -- dispatched, so a stuck toast over them cannot
         stall the walk (E10 already reports a covered control) */
      await T(page, () => { const b = [...document.querySelectorAll('#crAsk .askno')].find(x => x.offsetParent); if (b) b.click(); });
      await page.waitForTimeout(600);
      await T(page, () => { const c = document.getElementById('edClientChip'); if (c) c.click(); }); await page.waitForTimeout(1600);
      await T(page, () => showTab('estimates')); await page.waitForTimeout(1500);
      const tab = await T(page, (num) => { const t = document.getElementById('tab-estimates'); const d = document.getElementById('estDocsMount');
        return { copies: num ? t.innerText.split(num).length - 1 : -1, saved: [...t.querySelectorAll('#cr-est-saved-slot .cr-est-saved-row')].map(r => r.innerText.replace(/\n/g, ' ')).filter(x => num && x.indexOf(num) !== -1), docs: d.querySelectorAll('tbody tr').length, doc: d.innerText }; }, pubNum);
      ok(!!pubNum && tab.copies === 1 && tab.saved.length === 0 && tab.docs === 1, 'E5a the published estimate shows ONCE on the Estimates tab', JSON.stringify({ pubNum, copies: tab.copies, saved: tab.saved, docs: tab.docs }));
      ok(/\bDRAFT\b/.test(tab.doc) && !/\bUNSENT\b/.test(tab.doc), 'E5b its card speaks the builder\'s words (DRAFT, not UNSENT)', (tab.doc.match(/DRAFT|UNSENT|SENT/g) || []).join(','));
      ok(tab.docs >= 1 && !/\bID [0-9a-f]{8}\b/.test(tab.doc) && !/@cardinalrenovations\.net/.test(tab.doc), 'E5c the card carries no internal id or raw email', (tab.doc.match(/ID [0-9a-f]{8}|\S+@cardinalrenovations\.net/) || [''])[0]);
      let W = await T(page, () => (window.__WRITES__ || []).length);
      if (await tryClick(page, '#estDocsMount button[data-act="toggle"]', 'E5d Mark sent')) {
        await page.waitForTimeout(2500);
        const r = await T(page, n => ({ w: (window.__WRITES__ || []).slice(n).filter(x => x.table === 'estimates').map(x => JSON.stringify(x.payload)), txt: document.getElementById('estDocsMount').innerText }), W);
        ok(r.w.some(x => /"status":"sent"/.test(x)) && /\bSENT\b/.test(r.txt) && !/\bDRAFT\b/.test(r.txt), 'E5d Mark sent on the card moves the ESTIMATE to Sent too', JSON.stringify(r.w));
        W = await T(page, () => (window.__WRITES__ || []).length);
        await page.click('#estDocsMount button[data-act="toggle"]').catch(() => {}); await page.waitForTimeout(2500);
        const r2 = await T(page, n => ({ w: (window.__WRITES__ || []).slice(n).filter(x => x.table === 'estimates').map(x => JSON.stringify(x.payload)), txt: document.getElementById('estDocsMount').innerText }), W);
        ok(r2.w.some(x => /"status":"draft"/.test(x)) && /\bDRAFT\b/.test(r2.txt), 'E5e Mark unsent takes a Sent estimate back to Draft', JSON.stringify(r2.w));
      }
      if (await tryClick(page, '#estDocsMount button[data-act="estedit"]', 'E5f Edit estimate')) {
        await page.waitForTimeout(1500);
        const b = await T(page, () => { const s = window.CardinalEstimates.currentState(); return { open: document.getElementById('cr-est-view').classList.contains('open'), num: s && s.estimate_number }; });
        ok(b.open && /^EST-2026-/.test(b.num || ''), 'E5f Edit estimate opens the builder on that estimate', JSON.stringify(b));
        await T(page, () => window.CardinalEstimates.close());
      }
    } catch (e) { crash('E5/E6', e); }
    /* E9 — the Estimates tab's buttons */
    try {
      const btn = await T(page, () => ['pNewEstimateBtn', 'cr-est-new-btn', 'pUploadEstimateBtn'].map(id => { const b = document.getElementById(id); if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b); return { id, h: Math.round(r.height), red: /rgb\(200, 32, 46\)/.test(cs.backgroundColor) }; }));
      ok(btn.every(Boolean) && btn[0].red && !btn[1].red && !btn[2].red, 'E9a From a template is the one red button', JSON.stringify(btn));
      ok(btn.every(b => b && b.h >= 44), 'E9b all three are 44px tall', JSON.stringify(btn.map(b => b && b.h)));
    } catch (e) { crash('E9', e); }
    /* E7 — print a 12-line estimate to PDF and read it back */
    try {
      const html = await T(page, () => { const P = window.CardinalEstimatePublish; if (!P) return null;
        const li = []; for (let i = 0; i < 12; i++) li.push({ name: 'Line ' + (i + 1) + ' roofing work', description: 'Remove and replace with a long enough description to take some room on the page so the table runs past one Letter page. '.repeat(2), qty: 2, unit: 'SQ', unit_price: 500 + i });
        return P.buildDocHtml({ estimate_number: 'EST-2026-0999', title: 'Estimate', line_items: li, itemized: true, subtotal: 0, discount: 0, total: 0, deposit_pct: 30, deposit_amount: 0, valid_through: '2026-11-28', created_at: new Date().toISOString(), photos: [] }, (window.cacheProjects || []).find(p => p.id === 'R2'), {}); });
      if (!html || html.__err) ok(false, 'E7 the estimate document could not be built', JSON.stringify(html));
      else {
        ok(/\(937\) 555-0177/.test(html), 'E11 the client\'s phone prints as (937) 555-0177', (String(html).match(/9375550177|\(937\) 555-0177/) || ['none'])[0]);
        const p2 = await page.context().newPage();
        await p2.setContent(html, { waitUntil: 'load' });
        const pdf = await p2.pdf({ format: 'Letter', printBackground: true });
        await p2.close();
        fs.writeFileSync(DIR + '/gateE_est.pdf', pdf);
        const pages = execFileSync('pdftotext', ['-layout', DIR + '/gateE_est.pdf', '-']).toString().split('\f').filter(s => s.trim());
        const withSub = pages.map((t, i) => /SUBTOTAL/i.test(t) ? i + 1 : 0).filter(Boolean);
        const lastLine = pages.map((t, i) => /Line 12 roofing/.test(t) ? i + 1 : 0).filter(Boolean)[0];
        ok(pages.length >= 2 && withSub.length === 1 && withSub[0] >= lastLine, 'E7 the printed totals appear once, after the last line', JSON.stringify({ pages: pages.length, subtotalOn: withSub, line12On: lastLine }));
      }
    } catch (e) { crash('E7', e); }
  } catch (e) { crash('A', e); } finally { await browser.close(); }
}

/* ═══════════════════ B · the builder on a desktop: the name field stops short of the controls ═══════════════════ */
{
  const { browser, page } = await boot('rep', { instr: false, desktop: true, seed: SEED });
  try {
    await openTemplate(page);
    const d = await T(page, () => { const row = document.querySelector('#cr-est-view .cr-est-lineitem'); const n = row.querySelector('.name-input').getBoundingClientRect(), u = row.querySelector('[data-act="move-up"]').getBoundingClientRect(), x = row.querySelector('[data-act="del-line"]').getBoundingClientRect();
      return { nameR: n.right, upL: u.left, h: [u.height, x.height] }; });
    ok(d.nameR <= d.upL && d.h.every(h => h >= 44), 'E3g desktop: 44px controls, and the name field ends before them', JSON.stringify(d));
  } catch (e) { crash('B', e); } finally { await browser.close(); }
}

/* ═══════════════════ C · money, Theo on a phone ═══════════════════ */
{
  const { browser, page } = await boot('theo', { instr: false });
  try {
    await T(page, () => { try { window.CardinalFrontDoor && window.CardinalFrontDoor.close(); } catch (_) {} });
    /* I1 / I8 — AR */
    try {
      await T(page, () => window.openAR()); await page.waitForTimeout(1500);
      const ar = await T(page, () => [...document.querySelectorAll('#cr-ar-view .crar-row')].map(r => ({ nm: r.querySelector('.crar-nm').innerText.replace(/\n/g, ' '), pill: (r.querySelector('.crar-pill') || {}).textContent || '', ws: getComputedStyle(r.querySelector('.crar-addr')).whiteSpace })));
      const P = re => ((ar || []).find(x => re.test(x.nm)) || {}).pill;
      ok(P(/Retail One/) === 'Overdue', 'I1a AR: the 40-day sent invoice reads Overdue', P(/Retail One/));
      ok(P(/Occupant Two/) === 'Draft', 'I1b AR: the invoice nobody sent reads Draft', P(/Occupant Two/));
      ok(P(/Insured Two/) === 'Partly paid', 'I1c AR: a sent, part-paid invoice reads Partly paid', P(/Insured Two/));
      ok(!(ar || []).some(x => /Deposit Paid/i.test(x.pill)), 'I1d no row wears "Deposit Paid"', JSON.stringify((ar || []).map(x => x.pill)));
      ok((ar || []).length && (ar || []).every(x => x.ws !== 'nowrap'), 'I8 AR sub-lines wrap instead of cutting the paid figure', JSON.stringify((ar || []).map(x => x.ws)));
      await T(page, () => window.CardinalAR.close());
    } catch (e) { crash('I1/I8', e); }
    /* I1 job cards, I2, I7 */
    try {
      await T(page, () => openProject('I1')); await page.waitForTimeout(2200);
      const c1 = await T(page, () => { const c = document.querySelector('#projectView .crji-card'); return c ? { t: c.querySelector('.crji-ttl').innerText, pill: !!c.querySelector('.crji-ttl .crar-pill') } : null; });
      ok(c1 && /No invoice yet/.test(c1.t) && !c1.pill, 'I1e the job card shows no status pill beside "No invoice yet"', JSON.stringify(c1));
      await T(page, () => openProject('R1')); await page.waitForTimeout(2400);
      const c2 = await T(page, () => { const c = document.querySelector('#projectView .crji-card'); return c ? ((c.querySelector('.crar-pill') || {}).textContent || '') : null; });
      ok(c2 === 'Overdue', 'I1f R1\'s job card says Overdue, the same word as AR', c2);
      const a0 = await T(page, () => [...document.querySelectorAll('#projectView .crjp-acts2')].map(a => Math.round(a.getBoundingClientRect().height)));
      ok(Array.isArray(a0) && a0.length > 0 && a0.every(h => h === 0), 'I2a "Remove this payment" is hidden until ⋯ is tapped', JSON.stringify(a0));
      if (await tryClick(page, '#projectView .crjp-card [data-crjp-more]', 'I2b ⋯')) {
        await page.waitForTimeout(300);
        const a1 = await T(page, () => [...document.querySelectorAll('#projectView .crjp-acts2')].map(a => Math.round(a.getBoundingClientRect().height)));
        await page.click('#projectView .crjp-card [data-crjp-more]').catch(() => {}); await page.waitForTimeout(300);
        const a2 = await T(page, () => [...document.querySelectorAll('#projectView .crjp-acts2')].map(a => Math.round(a.getBoundingClientRect().height)));
        ok(Array.isArray(a1) && a1.some(h => h >= 44) && Array.isArray(a2) && a2.every(h => h === 0), 'I2b ⋯ opens it and a second ⋯ closes it', JSON.stringify([a1, a2]));
      }
      const pf = await T(page, () => { const b = document.querySelector('#projectView .crjp-card .crjp-foot [data-arpay]'); return b ? getComputedStyle(b).backgroundColor : 'none'; });
      ok(pf !== 'none' && !/rgb\(200, 32, 46\)/.test(pf), 'I7 the Payments card\'s Record payment is an outline under the Invoice card\'s red one', pf);
    } catch (e) { crash('I1/I2/I7', e); }
    /* I3 — record a payment from AR */
    try {
      await T(page, () => window.openAR()); await page.waitForTimeout(1500);
      await T(page, () => { const b = document.querySelector('#cr-ar-view [data-arpay]'); b && b.click(); }); await page.waitForTimeout(700);
      await page.fill('#crpay-amt', '1000');
      await T(page, () => document.getElementById('crpay-save').click()); await page.waitForTimeout(1500);
      const t0 = await T(page, () => [...document.querySelectorAll('#crToasts .crt')].map(t => t.className + '|' + t.textContent).filter(s => /Recorded/.test(s)));
      ok(Array.isArray(t0) && t0.length === 1 && /\bok\b/.test(t0[0]), 'I3a "Recorded $1,000" is a success toast, not a red error', JSON.stringify(t0));
      await page.waitForTimeout(4600);
      const t1 = await T(page, () => [...document.querySelectorAll('#crToasts .crt')].filter(t => /Recorded/.test(t.textContent)).length);
      ok(t1 === 0, 'I3b it clears itself', String(t1));
      await T(page, () => window.CardinalAR.close());
    } catch (e) { crash('I3', e); }
    /* I4 — a Community job priced by its signed contract */
    try {
      await T(page, () => openProject('C2')); await page.waitForTimeout(2500);
      const m = await T(page, () => { const e = document.querySelector('#cr-cc .cc2-money'); return e ? e.innerText.replace(/\n/g, ' | ') : null; });
      ok(m && /Job Value \| \$6,000/.test(m) && /Balance Due \| \$4,000/.test(m), 'I4 C2\'s header reads Job Value $6,000 and Balance $4,000, as AR does', m);
    } catch (e) { crash('I4', e); }
    /* I9 — the home A/R card */
    try {
      await T(page, () => { try { showHome(); } catch (_) {} try { document.body.setAttribute('data-crm', 'retail'); } catch (_) {} try { renderOps(); } catch (_) {} });
      await page.waitForTimeout(800);
      const h = await T(page, () => (document.getElementById('arWrap') || {}).innerText || '');
      ok(/on the other boards/.test(h), 'I9 the home A/R card says what the other boards owe', String(h).replace(/\n/g, ' ').slice(0, 140));
    } catch (e) { crash('I9', e); }
  } catch (e) { crash('C', e); } finally { await browser.close(); }
}

/* ═══════════════════ D · a contract-only invoice, Theo on a desktop ═══════════════════ */
{
  const { browser, page } = await boot('theo', { instr: false, desktop: true, seed: NOINV });
  try {
    /* I5 — the template itself */
    try {
      const t = await T(page, () => { const h = prefillUserInfo(prefillClientInfo(INVOICE_TEMPLATE, (window.cacheProjects || []).find(p => p.id === 'R1'))); return h; });
      const txt = String(t).replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
      ok(/5735 Webster Street, Dayton, Ohio 45414/.test(txt) && /\(937\) 576-6753/.test(txt), 'I5a the invoice carries Cardinal\'s address and phone', (txt.match(/5735[^.]{0,60}/) || ['none'])[0]);
      ok(/mail them to 5735 Webster Street/.test(txt) && !/contact our office/i.test(txt), 'I5b it says where to mail a check, and gives the number instead of "contact our office"', (txt.match(/(Make checks|Checks payable)[^.]{0,120}/) || [''])[0]);
      ok(!/secthead">INVOICE</.test(String(t)) && /Invoice #<\/td><td><b>\[INV_NUM\]/.test(String(t)), 'I5c one INVOICE heading; the number sits in the Bill To table', (String(t).match(/secthead">INVOICE<|Invoice #<\/td>[^<]{0,4}<td[^>]*>/) || [''])[0]);
    } catch (e) { crash('I5', e); }
    /* I6 — Create invoice on R1 (signed contract, no estimate) */
    try {
      await T(page, () => openProject('R1')); await page.waitForTimeout(2400);
      const W0 = await T(page, () => (window.__WRITES__ || []).length);
      await T(page, () => { const b = document.querySelector('#projectView [data-inv-gen]'); b && b.click(); }); await page.waitForTimeout(4000);
      const docs = await T(page, n => (window.__WRITES__ || []).slice(n).filter(x => x.table === 'inspection_reports' && x.payload && typeof x.payload.html === 'string').map(x => x.payload.html), W0);
      const last = (docs || []).slice(-1)[0] || '';
      const items = (last.match(/<!--invlines-->[\s\S]*?<!--\/invlines-->/) || [''])[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      ok(/per the signed agreement dated/.test(items) && !/Contract — Sample Retail One/.test(items), 'I6 the contract-only invoice line describes the work, not "Contract — <client>"', items.slice(0, 160));
      ok(/5735 Webster Street/.test(last) && /Invoice #<\/td><td><b>2005-1<\/b>/.test(last), 'I5d the created invoice carries the letterhead and its number (2005-1) in the Bill To table', (last.match(/Invoice #<\/td>.{0,40}/) || ['none'])[0]);
    } catch (e) { crash('I6', e); }
  } catch (e) { crash('D', e); } finally { await browser.close(); }
}

const errs = log.filter(l => /PAGEERROR/.test(l));
ok(errs.length === 0, 'no page errors on any run', errs.slice(0, 3).join(' || '));
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
