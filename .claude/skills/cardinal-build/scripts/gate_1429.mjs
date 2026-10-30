/* gate_H.mjs [index.html] — Builder H's items, measured in Chromium (gate_1403_lib rig, 390x844 phone).
   GREEN on the patched tree; RED with named failures (and no crash) on base1428.
   Every check names its meta-report item. INFO lines are measurements of items that do not
   reproduce on 1428 (#25, #28) and are printed, not counted.
   NODE_PATH=<scratch>/jsd/node_modules:$(npm root -g) node gate_H.mjs H1.html */
import path from 'path';
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
process.env.APPFILE = FILE;
const L = await import('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/gate_1403_lib.mjs');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 420000).unref();

let pass = 0; const fails = [];
const need = (id, cond, detail = '') => { const ok = !!cond; console.log((ok ? '  PASS  ' : '  FAIL  ') + id + (detail ? '  → ' + detail : '')); if (ok) pass++; else fails.push(id); return ok; };
const info = (id, detail) => console.log('  INFO  ' + id + '  → ' + detail);
async function tryDo(id, fn){ try { return await fn(); } catch (e) { need(id + ' (did not crash)', false, String(e && e.message || e).split('\n')[0].slice(0, 160)); return null; } }

/* in-page helpers: WCAG contrast over the composited ground */
const HELP = `(function(){
  function P(c){ var m = String(c).match(/[\\d.]+/g) || [0,0,0]; return { r:+m[0], g:+m[1], b:+m[2], a: m.length > 3 ? +m[3] : 1 }; }
  function over(f, b){ var a = f.a; return { r:f.r*a + b.r*(1-a), g:f.g*a + b.g*(1-a), b:f.b*a + b.b*(1-a), a:1 }; }
  function lum(c){ return [c.r,c.g,c.b].map(function(v){ v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }).reduce(function(s,v,i){ return s + v*[0.2126,0.7152,0.0722][i]; }, 0); }
  function ratio(a, b){ var x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
  /* every ground an element and its ancestors paint (colour AND gradient stops), composited down to the first opaque one */
  function grounds(el){
    var out = [], chain = [];
    for (var g = el; g && g.nodeType === 1; g = g.parentElement) chain.push(g);
    var base = { r:255, g:255, b:255, a:1 };
    for (var i = chain.length - 1; i >= 0; i--){ var cs = getComputedStyle(chain[i]); var bc = P(cs.backgroundColor); if (bc.a > 0) base = over(bc, base); }
    for (var j = 0; j < chain.length; j++){
      var im = getComputedStyle(chain[j]).backgroundImage;
      if (im && im !== 'none'){ (im.match(/rgba?\\([^)]+\\)/g) || []).forEach(function(s){ out.push(over(P(s), base)); }); break; }
      var bc2 = P(getComputedStyle(chain[j]).backgroundColor); if (bc2.a > 0){ out.push(base); break; }
    }
    if (!out.length) out.push(base);
    return out;
  }
  window.__inkH = function(el){
    if (!el) return null; var cs = getComputedStyle(el); var ink = P(cs.color); var op = +cs.opacity;
    var gs = grounds(el);
    return Math.min.apply(null, gs.map(function(g){ var i = ink; if (op < 1) i = over({ r:ink.r, g:ink.g, b:ink.b, a: ink.a*op }, g); else if (ink.a < 1) i = over(ink, g); return ratio(i, g); }));
  };
  window.__emojiH = function(s){ return /\\p{Extended_Pictographic}/u.test(String(s || '')); };
})();`;

const SEED = `(function(){ var S = window.__SEED__; if(!S) return;
  var d = new Date(Date.now() - 86400000).toISOString(); var t = new Date();
  var dk = t.getFullYear() + '-' + ('0'+(t.getMonth()+1)).slice(-2) + '-' + ('0'+t.getDate()).slice(-2);
  function lead(id, src){ return { id:id, name:'Sample Source ' + id, address:'7 Test Rd', city:'Dayton', state:'OH', zip:'45405', stage:'Lead', crm:'retail',
    created_by:'theo@cardinalrenovations.net', checklist: JSON.stringify({ lead:{ claim_type:'retail' }, lead_source: src }), created_at:d, updated_at:d, stage_since:d }; }
  S.projects.push(lead('LS1', 'Door Knocking'), lead('LS2', 'AccuLynx import'), lead('LS3', 'Door knock'));
  S.appointments.push({ id:'aH1', project_id:'R1', kind:'appointment', title:'Tear-off', appt_date:dk, appt_time:'08:00', created_at:new Date().toISOString(), created_by:'theo@cardinalrenovations.net' });
  S.punch_items.push({ id:'pkH1', project_id:'R1', title:'Callback: drip at skylight', detail:null, kind:'callback', priority:'normal', status:'open', assigned_to:null,
    created_by:'theo@cardinalrenovations.net', created_at:d, scheduled_at:null, scheduled_time:null, photos:[], comments:[], steps:[], template:null, visits:[] });
})();`;
const THEME = t => `try{ localStorage.setItem('cardinal.theme.rb', '${t === 'light' ? '1' : '0'}'); }catch(e){}`;
const dialog = d => (d.type() === 'prompt' ? d.accept('Check the flashing') : d.accept());

/* ── #13 + #34 (contract viewer), measured in each theme ─────────────────── */
async function contract(page, theme){
  await page.evaluate(() => { openProject('R1'); setTimeout(function(){ window.openContractEditor({ project_id:'R1', status:'draft' }); }, 700); });
  await page.waitForTimeout(3800);   /* the Ask button re-reads the screen on a 3s timer */
  const m = await page.evaluate(() => {
    const v = document.getElementById('cr-ce-view'); if (!v || !v.classList.contains('open')) return null;
    const h1 = v.querySelector('.ce-header h1'), eb = v.querySelector('.ce-header .ce-eyebrow');
    const btns = [...v.querySelectorAll('.ce-actions button')].map(b => { const r = b.getBoundingClientRect();
      const pts = [[r.left + r.width/2, r.top + r.height/2], [r.right - 4, r.top + 4], [r.right - 4, r.bottom - 4]];
      const covered = pts.some(([x, y]) => { const e = document.elementFromPoint(x, y); return !(e && (b === e || b.contains(e))); });
      return { t: b.textContent.trim(), h: Math.round(r.height), ink: +window.__inkH(b).toFixed(2), emoji: window.__emojiH(b.textContent), svg: !!b.querySelector('svg.cri'), covered }; });
    v.scrollTop = v.scrollHeight; const bar = v.querySelector('.ce-actions').getBoundingClientRect();
    const cards = [...v.querySelectorAll('.ce-card')]; const last = cards[cards.length - 1];
    return { theme: document.documentElement.getAttribute('data-theme') || 'dark', h1: +window.__inkH(h1).toFixed(2), eb: +window.__inkH(eb).toFixed(2), btns,
             lastClear: last ? Math.round(bar.top - last.getBoundingClientRect().bottom) : null };
  });
  if (!need(`#13 ${theme}: the contract viewer opens`, m, 'openContractEditor')) return;
  need(`#13 ${theme}: the "Contract" title reads >= 4.5:1 on its header (worst gradient stop)`, m.h1 >= 4.5, m.h1 + ':1 (theme ' + m.theme + ')');
  need(`#13 ${theme}: the eyebrow reads >= 4.5:1`, m.eb >= 4.5, m.eb + ':1');
  const sign = m.btns.find(b => /sign/i.test(b.t));
  need(`#13 ${theme}: Sign is >= 44px tall`, sign && sign.h >= 44, sign ? sign.h + 'px' : 'no Sign button');
  const low = m.btns.filter(b => b.h < 44);
  need(`#13 ${theme}: every action-bar button is >= 44px tall`, m.btns.length >= 5 && !low.length, low.map(b => b.t + ' ' + b.h).join(', ') || m.btns.length + ' buttons');
  const dim = m.btns.filter(b => b.ink < 4.5);
  need(`#13 ${theme}: every action-bar label reads >= 4.5:1 on the bar`, !dim.length, dim.map(b => b.t + ' ' + b.ink).join(', ') || 'min ' + Math.min(...m.btns.map(b => b.ink)));
  const cov = m.btns.filter(b => b.covered);
  need(`#13 ${theme}: nothing sits on an action button (centre + right corners hit the button)`, !cov.length, cov.map(b => b.t).join(', ') || 'clear');
  need(`#13 ${theme}: the last card clears the bar at full scroll`, m.lastClear !== null && m.lastClear >= 0, m.lastClear + 'px');
  if (theme === 'dark'){
    const em = m.btns.filter(b => b.emoji);
    need('#34 contract bar: no emoji in the action buttons', !em.length, em.map(b => b.t).join(' | ') || m.btns.map(b => b.t).join(' | '));
    need('#34 contract bar: Print/Download/Mark sent/Sign carry a drawn glyph', m.btns.filter(b => /print|download|mark sent|sign/i.test(b.t)).every(b => b.svg), m.btns.map(b => b.t + (b.svg ? '+svg' : '')).join(' | '));
  }
  await page.evaluate(() => { try { window.closeContractEditor(); } catch (e) {} });
  await page.waitForTimeout(300);
}

/* ═══ boot A — dark, theo ═══════════════════════════════════════════════════ */
{
  const { browser, page } = await L.boot('theo', { instr:false, seed: THEME('dark') + '\n' + SEED, dialog });
  await page.evaluate(HELP);
  await tryDo('#13 dark', () => contract(page, 'dark'));

  /* ── #18 lead source ─────────────────────────────────────────────────── */
  await tryDo('#18', async () => {
    const W0 = await page.evaluate(() => (window.__WRITES__ || []).length);
    const read = async (id) => { await page.evaluate(i => openProject(i), id); await page.waitForTimeout(1300);
      return page.evaluate(() => { const e = document.getElementById('acxSrc'); if (!e) return null; const o = e.options[e.selectedIndex];
        return { value: e.value, shown: o ? o.textContent : null, opts: [...e.options].map(x => x.value).filter(Boolean) }; }); };
    const a = await read('LS1'), b = await read('LS2'), c = await read('LS3');
    need('#18 a lead stored "Door Knocking" (the New Lead form\'s spelling) shows a source, not "—"', a && a.value && a.shown !== '—', JSON.stringify(a && { value: a.value, shown: a.shown }));
    need('#18 an imported "AccuLynx import" shows as stored', b && b.shown === 'AccuLynx import', JSON.stringify(b && { value: b.value, shown: b.shown }));
    need('#18 a lead stored "Door knock" still shows "Door knock"', c && c.shown === 'Door knock', JSON.stringify(c && c.shown));
    const ld = await page.evaluate(() => [...document.querySelectorAll('#ldSource option')].map(o => o.value).filter(Boolean));
    const chips = await page.evaluate(() => [...document.querySelectorAll('#pfSourceChips .pf-chip')].map(x => x.getAttribute('data-src')));
    const pageList = c ? c.opts : [];
    const same = JSON.stringify([...ld].sort()) === JSON.stringify([...pageList].sort());
    need('#18 the New Lead form and the client page offer the same lead sources', ld.length > 0 && same,
         'New Lead only: ' + JSON.stringify(ld.filter(x => !pageList.includes(x))) + ' · client page only: ' + JSON.stringify(pageList.filter(x => !ld.includes(x))));
    need('#18 every Add-project chip is a New Lead option too (one vocabulary)', chips.length === 8 && chips.every(x => ld.includes(x)), 'missing: ' + JSON.stringify(chips.filter(x => !ld.includes(x))));
    /* opening a job with no PO writes the checklist back (the PO, a pre-existing write): the stored
       lead_source must come back EXACTLY as it was -- display maps it, nothing rewrites it */
    const W1 = await page.evaluate(n => (window.__WRITES__ || []).slice(n).filter(w => w.table === 'projects' && w.payload && w.payload.checklist).map(w => {
      const f = (w.filters || []).find(x => x.col === 'id'); let src; try { src = JSON.parse(w.payload.checklist).lead_source; } catch (e) { src = '(unparsed)'; }
      return { id: f && f.val, src }; }), W0);
    const STORED = { LS1: 'Door Knocking', LS2: 'AccuLynx import', LS3: 'Door knock' };
    const changed = W1.filter(x => STORED[x.id] !== undefined && x.src !== STORED[x.id]);
    /* the reports bucket one source as one, whichever spelling stored it (read-only) */
    const rp = await page.evaluate(async () => { try { openReportsView(); } catch (e) { return { err: String(e) }; } await new Promise(r => setTimeout(r, 900));
      const sel = document.getElementById('rptSource'); if (!sel) return { err: 'no #rptSource' };
      const opts = [...sel.options].map(o => o.value).filter(Boolean);
      sel.value = 'Door knock'; let ids = [];
      try { ids = rptFilteredProjects().map(p => p.id).filter(id => /^LS/.test(id)); } catch (e) { return { opts, err: String(e) }; }
      sel.value = ''; return { opts, ids }; });
    need('#18 Reports list "Door knock" once, not beside "Door Knocking"', rp.opts && rp.opts.includes('Door knock') && !rp.opts.includes('Door Knocking'), JSON.stringify(rp.opts));
    need('#18 ... and filtering on it finds both spellings\' leads', rp.ids && rp.ids.includes('LS1') && rp.ids.includes('LS3'), JSON.stringify(rp.ids || rp.err));
    await page.evaluate(() => { try { showHome(); } catch (e) {} });
    need('#18 drawing the client page rewrites no stored lead source', !changed.length, changed.length ? JSON.stringify(changed) : W1.length + ' checklist write(s), every lead_source as stored');
  });

  /* ── #19 checklist ───────────────────────────────────────────────────── */
  await tryDo('#19', async () => {
    await page.evaluate(() => openProject('R1')); await page.waitForTimeout(1200);
    await page.evaluate(() => showTab('inspections')); await page.waitForTimeout(700);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#tab-inspections button')].find(x => /new inspection report/i.test(x.textContent)); b && b.click(); });
    await page.waitForTimeout(800);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#insgSheet button')].filter(x => x.offsetParent && x.textContent.trim() === 'Next'); b.length && b[b.length - 1].click(); });
    await page.waitForTimeout(700);
    const marks = await page.evaluate(() => {
      const labs = [...document.querySelectorAll('#insgSheet label.ig-f')];
      const starred = labs.filter(l => l.querySelector('.cr-req')).map(l => l.getAttribute('data-f'));
      const areq = [...document.querySelectorAll('#insgSheet [aria-required="true"]')].map(e => e.id);
      /* the star sits on the label's own line: same row as the label text */
      const rows = labs.filter(l => l.querySelector('.cr-req')).every(l => { const s = l.querySelector('.cr-req').getBoundingClientRect(), c = l.querySelector('select,input').getBoundingClientRect(); return s.bottom <= c.top + 1; });
      return { starred, areq, rows, n: labs.length };
    });
    const REQ = ['method','structure','rooftype','layers','decking','pitch','age','condition','attic'];
    need('#19 all 9 required roof questions carry the required mark', REQ.every(k => marks.starred.includes(k)) && marks.starred.length === REQ.length, 'starred ' + marks.starred.length + ': ' + marks.starred.join(','));
    need('#19 and aria-required on each control', REQ.every(k => marks.areq.includes('insg_' + k)), marks.areq.length + ' aria-required');
    need('#19 the mark sits with its label, above the control', marks.starred.length > 0 && marks.rows, String(marks.rows));
    await page.evaluate(() => { const b = [...document.querySelectorAll('#insgSheet button')].filter(x => x.offsetParent && /save and start report/i.test(x.textContent)); b.length && b[b.length - 1].click(); });
    await page.waitForTimeout(900);
    const f = await page.evaluate(() => {
      const e = document.getElementById('insgErr'); const r = e && e.getBoundingClientRect();
      const ae = document.activeElement, ar = ae && ae.getBoundingClientRect();
      const hit = ar ? document.elementFromPoint(ar.left + ar.width / 2, ar.top + ar.height / 2) : null;
      const btn = [...document.querySelectorAll('#insgSheet button')].find(x => /save and start report/i.test(x.textContent)); const br = btn && btn.getBoundingClientRect();
      return { text: e ? e.textContent.trim() : null, top: r && Math.round(r.top), bottom: r && Math.round(r.bottom), vh: innerHeight, shown: !!(r && r.height > 0),
               aboveBtn: !!(r && br && r.bottom <= br.top + 1), ink: e ? +window.__inkH(e).toFixed(2) : 0,
               active: ae && ae.id, activeIn: !!(ar && ar.top >= 0 && ar.bottom <= innerHeight), activeHit: !!(hit && ae && (hit === ae || ae.contains(hit))),
               invalid: [...document.querySelectorAll('#insgSheet [aria-invalid="true"]')].map(x => x.id) };
    });
    need('#19 a refused save says what is missing', /Still needed for the roof/.test(f.text || ''), JSON.stringify(f.text));
    need('#19 ... where it can be seen (inside the 844px screen, above the buttons)', f.shown && f.top >= 0 && f.bottom <= f.vh && f.aboveBtn, 'top=' + f.top + ' bottom=' + f.bottom + ' vh=' + f.vh);
    need('#19 ... readable (>= 4.5:1)', f.ink >= 4.5, f.ink + ':1');
    need('#19 the first missing field is focused, on screen, and not under the footer', f.active === 'insg_method' && f.activeIn && f.activeHit, JSON.stringify({ active: f.active, in: f.activeIn, hit: f.activeHit }));
    need('#19 every missing field is marked invalid', REQ.every(k => f.invalid.includes('insg_' + k)), f.invalid.length + ' marked');
    const cleared = await page.evaluate(() => { const s = document.getElementById('insg_method'); if (!s) return null; const was = s.classList.contains('cr-bad');
      s.value = s.options[1].value; s.dispatchEvent(new Event('change', { bubbles: true })); return { was, now: s.classList.contains('cr-bad') }; });
    need('#19 answering a marked field clears its mark', cleared && cleared.was && !cleared.now, JSON.stringify(cleared));
    /* look-alike: fill every required answer and the save goes through */
    const go = await page.evaluate(async () => {
      const set = (k, v) => { const e = document.getElementById('insg_' + k); if (!e) return; if (v == null) v = e.options[1].value; e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
      ['method','structure','rooftype','layers','decking','pitch','condition','attic'].forEach(k => set(k)); set('age', '12');
      const n0 = (window.__WRITES__ || []).length;
      const b = [...document.querySelectorAll('#insgSheet button')].find(x => /save and start report/i.test(x.textContent)); b && b.click();
      await new Promise(r => setTimeout(r, 900));
      return { wrote: (window.__WRITES__ || []).slice(n0).filter(w => w.table === 'projects').length, err: (document.getElementById('insgErr') || {}).textContent || '' };
    });
    need('#19 (look-alike) all answered: the save goes through', go.wrote > 0, JSON.stringify(go));
    await page.evaluate(() => { const s = document.getElementById('insgSheet'); if (s) s.classList.remove('open'); });
  });

  /* ── #25 / #28 do not reproduce on 1428: measured, printed, not counted ── */
  await tryDo('#25/#28 info', async () => {
    await page.evaluate(() => openProject('R1')); await page.waitForTimeout(1100);
    await page.evaluate(() => showTab('estimates')); await page.waitForTimeout(700);
    info('#25 Estimates tab (dark)', JSON.stringify(await page.evaluate(() => ['pNewEstimateBtn','cr-est-new-btn','pUploadEstimateBtn'].map(id => { const b = document.getElementById(id); if (!b) return id + ':none'; const cs = getComputedStyle(b); return b.textContent.trim() + ' ' + Math.round(b.getBoundingClientRect().height) + 'px ' + cs.backgroundColor; }))));
    await page.evaluate(() => showTab('inspections')); await page.waitForTimeout(600);
    info('#28 Inspections tab', JSON.stringify(await page.evaluate(() => { const m = document.getElementById('inspDocsMount'); const h = m ? [...m.querySelectorAll('h3')].map(x => x.textContent.trim()) : []; const first = m && m.querySelector('table, .doctable, .empty'); return { headings: h, inspectionListHasInvoice: first ? /Invoice/.test(first.textContent) : null }; })));
  });

  /* ── #27 punch-out composer ─────────────────────────────────────────── */
  await tryDo('#27', async () => {
    await page.evaluate(() => { try { showHome(); } catch (e) {} }); await page.waitForTimeout(500);
    await page.evaluate(() => window.CardinalProduction.newPunch(null)); await page.waitForTimeout(1200);
    const h = await page.evaluate(() => { const s = document.querySelector('#cr-pb-modal [data-f="project"]'); return s ? { val: s.value, first: s.options[0] && s.options[0].textContent.trim() } : null; });
    need('#27 + New punch-out from Home preselects no job', h && h.val === '', JSON.stringify(h));
    const w = await page.evaluate(async () => { const n0 = (window.__WRITES__ || []).length; const m = document.getElementById('cr-pb-modal');
      m.querySelector('[data-f="title"]').value = 'Reattach gutter'; m.querySelector('[data-act="save"]').click(); await new Promise(r => setTimeout(r, 700));
      return (window.__WRITES__ || []).slice(n0).filter(x => x.table === 'punch_items').map(x => x.payload && x.payload.project_id); });
    need('#27 ... so "Add it" without a job files nothing', w.length === 0, 'punch_items written for: ' + JSON.stringify(w));
    await page.evaluate(() => { const m = document.getElementById('cr-pb-modal'); if (m) m.classList.remove('open'); openProject('R1'); }); await page.waitForTimeout(1300);
    await page.evaluate(() => window.CardinalProduction.newPunch(null)); await page.waitForTimeout(1200);
    const r = await page.evaluate(() => { const s = document.querySelector('#cr-pb-modal [data-f="project"]'); return s ? s.value : null; });
    need('#27 + New punch-out while on a client page opens on THAT job (an Invoiced one)', r === 'R1', JSON.stringify(r));
    await page.evaluate(() => { const m = document.getElementById('cr-pb-modal'); if (m) m.classList.remove('open'); });
  });

  /* ── #32 the two "OK = ..." prompts ─────────────────────────────────── */
  const askNow = () => page.evaluate(() => { const n = document.getElementById('crAsk'); if (!n) return null; const vis = n.getBoundingClientRect().height > 0 && getComputedStyle(n).display !== 'none';
    return { vis, q: (n.querySelector('.askq') || {}).textContent, why: (n.querySelector('.askwhy') || {}).textContent, go: (n.querySelector('.askgo') || {}).textContent, no: (n.querySelector('.askno') || {}).textContent }; });
  const askAnswer = (yes) => page.evaluate(y => { const b = document.querySelector('#crAsk ' + (y ? '.askgo' : '.askno')); b && b.click(); }, yes);
  await tryDo('#32 punch step', async () => {
    await page.evaluate(() => window.CardinalPunchCard.open('pkH1')); await page.waitForTimeout(1500);
    await page.evaluate(() => { const b = document.querySelector('[data-act="addstep"]'); b && b.click(); }); await page.waitForTimeout(900);
    const a = await askNow();
    need('#32 punch card "+ Add step": the question shows', a && a.vis, JSON.stringify(a));
    need('#32 ... with no "OK =" over buttons that do not say OK', a && !/OK\s*=/.test((a.q || '') + (a.why || '')), JSON.stringify(a && (a.q + ' / ' + a.why)));
    need('#32 ... and buttons that say what happens', a && a.go === 'Require a note' && a.no === 'No note needed', JSON.stringify(a && [a.go, a.no]));
    await askAnswer(true); await page.waitForTimeout(800);
    const st = await page.evaluate(() => (window.__WRITES__ || []).filter(w => w.table === 'punch_items' && w.payload && w.payload.steps).map(w => w.payload.steps).pop());
    need('#32 ... and "Require a note" still means a note is required', st && st.length && st[st.length - 1].req === true, JSON.stringify(st));
    await page.evaluate(() => { try { window.CardinalPunchCard.close(); } catch (e) {} });
  });
  await tryDo('#32 gallery', async () => {
    await page.evaluate(() => openProject('LS3')); await page.waitForTimeout(1100);   /* a job with no Roofing checklist on file */
    await page.evaluate(() => { const m = document.getElementById('galXferMenu'); if (!m) return; const b = document.createElement('button'); b.className = 'estopt'; b.setAttribute('data-doc', '__new__'); b.textContent = 'New report'; m.appendChild(b); b.click(); });
    await page.waitForTimeout(900);
    const a = await askNow();
    need('#32 gallery → new report with no checklist: the question shows', a && a.vis, JSON.stringify(a));
    need('#32 ... with no "OK ="', a && !/OK\s*=/.test((a.q || '') + (a.why || '')), JSON.stringify(a && (a.q + ' / ' + a.why)));
    need('#32 ... and its buttons name both answers', a && a.go === 'Create it anyway' && a.no === 'Do the checklist first', JSON.stringify(a && [a.go, a.no]));
    await askAnswer(false); await page.waitForTimeout(700);
    await page.evaluate(() => { const v = document.getElementById('ckModal') || document.getElementById('checklistModal'); if (v) v.style.display = 'none'; });
  });

  /* ── #33 Activity feed ──────────────────────────────────────────────── */
  await tryDo('#33', async () => {
    await page.evaluate(() => { try { showHome(); } catch (e) {} try { renderActivity(); } catch (e) {} }); await page.waitForTimeout(500);
    const a = await page.evaluate(() => { const t = (document.getElementById('actFeed') || {}).innerText || ''; const row = t.split('\n').find(l => /Tear-off/.test(l)) || '';
      const t2 = new Date(); const want = fmtDay(t2.getFullYear() + '-' + ('0'+(t2.getMonth()+1)).slice(-2) + '-' + ('0'+t2.getDate()).slice(-2));
      return { raw: /\b\d{4}-\d{2}-\d{2}\b/.test(t), row, want, has: row.indexOf(want) !== -1 }; });
    need('#33 the Activity feed prints no raw YYYY-MM-DD', a.row && !a.raw, JSON.stringify(a.row));
    need('#33 the appointment row carries the app\'s own day format', a.has, 'want "' + a.want + '" in ' + JSON.stringify(a.row));
  });

  /* ── #34 Quick Inspection Who tabs + the Supplement card ─────────────── */
  await tryDo('#34 QI', async () => {
    await page.evaluate(() => { qiFreshStart(); }); await page.waitForTimeout(700);
    await page.fill('#qiAddrInp', '5 Pine St Dayton OH').catch(() => {});
    await page.evaluate(() => { const b = document.getElementById('qiMapNext'); b && b.click(); }); await page.waitForTimeout(700);
    const q = await page.evaluate(() => ['qiTabExist', 'qiTabNew'].map(id => { const e = document.getElementById(id); return e ? { id, t: e.textContent.trim(), emoji: window.__emojiH(e.textContent), svg: !!e.querySelector('svg.cri'), shown: e.getBoundingClientRect().height > 0, ink: +window.__inkH(e).toFixed(2), h: Math.round(e.getBoundingClientRect().height) } : { id, missing: true }; }));
    need('#34 Quick Inspection Who tabs: no emoji', q.every(x => !x.missing && !x.emoji), JSON.stringify(q.map(x => x.t)));
    need('#34 ... a drawn glyph on each', q.every(x => x.svg), JSON.stringify(q.map(x => x.id + ':' + x.svg)));
    need('#34 ... still readable and 44px (gate_1423\'s 1.22 -> 5.7 fix intact)', q.every(x => x.ink >= 4.5 && x.h >= 44), JSON.stringify(q.map(x => x.ink + ':1 ' + x.h + 'px')));
    const pins = await page.evaluate(() => ['qiLocBtn', 'qiWhoAddr'].map(id => { const e = document.getElementById(id); return e ? { id, t: e.textContent.trim(), emoji: window.__emojiH(e.textContent), svg: !!e.querySelector('svg.cri') } : { id, missing: true }; }));
    need('#34 ... and the two pins on the same screens (My location, the Who sheet address) are drawn, not emoji', pins.every(x => !x.missing && !x.emoji && x.svg), JSON.stringify(pins.map(x => x.t)));
    need('#34 ... the address line still reads the address', (pins[1] || {}).t === '5 Pine St Dayton OH', JSON.stringify((pins[1] || {}).t));
    await page.evaluate(() => { const m = document.getElementById('qiWhoModal'); if (m) m.style.display = 'none'; try { qiClose && qiClose(); } catch (e) {} });
  });
  await tryDo('#34 Supplement', async () => {
    await page.evaluate(() => openProject('I1')); await page.waitForTimeout(1800);
    /* 1432: the Supplement card is retired (Theo: "Retire card"), so its heading's glyph has nothing to check */
    const s = await page.evaluate(() => ({ mount: !!document.getElementById('cr-sp-mount') }));
    need('#34 the Supplement card is retired (1432), so no emoji is left on it', !s.mount, JSON.stringify(s));
  });

  /* ── #26 a lead with no address (last: it opens the New Lead form) ───── */
  await tryDo('#26', async () => {
    const save = (f) => page.evaluate(async (f) => {
      window.openLeadForm(); await new Promise(r => setTimeout(r, 400));
      const n0 = (window.__WRITES__ || []).length;
      for (const k of Object.keys(f)){ const e = document.getElementById(k); if (e) e.value = f[k]; }
      const pi = document.querySelector('#ldPhones .ldrow input'); if (pi) pi.value = '937-555-0134';
      const r = document.querySelector('input[name="ldClaimType"][value="retail"]'); if (r) r.checked = true;
      const so = document.getElementById('ldSource'); if (so) so.value = so.options[1] ? so.options[1].value : '';
      document.getElementById('ldSave').click(); await new Promise(r => setTimeout(r, 1200));
      return { err: (document.getElementById('ldError') || {}).textContent || '', addr: (window.__WRITES__ || []).slice(n0).filter(w => w.table === 'projects' && w.op === 'insert').map(w => w.payload.address) };
    }, f);
    const a = await save({ ldFirst: 'Phone', ldLast: 'Inn' });
    need('#26 a phone-in lead with no address stores no ", , OH"', a.addr.length === 1 && !/^[\s,]*,/.test(a.addr[0]) && a.addr[0].trim() === '', JSON.stringify(a));
    const b = await save({ ldFirst: 'Desk', ldLast: 'Lead', ldStreet: '9 Test Rd', ldCity: 'Dayton', ldZip: '45402' });
    need('#26 (look-alike) a full address is stored exactly as before', b.addr[0] === '9 Test Rd, Dayton, OH 45402', JSON.stringify(b));
  });
  const errs = L.log.filter(l => /PAGEERROR/.test(l));
  need('no page errors in boot A', !errs.length, errs.slice(0, 3).join(' | '));
  await browser.close();
}

/* ═══ boot B — light, theo (the real way: localStorage, not the attribute) ═══ */
{
  const n0 = L.log.length;
  const { browser, page } = await L.boot('theo', { instr:false, seed: THEME('light') + '\n' + SEED, dialog });
  await page.evaluate(HELP);
  await tryDo('#13 light', () => contract(page, 'light'));
  await tryDo('#25 info light', async () => {
    await page.evaluate(() => openProject('R1')); await page.waitForTimeout(1100);
    await page.evaluate(() => showTab('estimates')); await page.waitForTimeout(700);
    info('#25 Estimates tab (light)', JSON.stringify(await page.evaluate(() => ['pNewEstimateBtn','cr-est-new-btn','pUploadEstimateBtn'].map(id => { const b = document.getElementById(id); if (!b) return id + ':none'; const cs = getComputedStyle(b); return b.textContent.trim() + ' ' + Math.round(b.getBoundingClientRect().height) + 'px ' + cs.backgroundColor + ' ink ' + window.__inkH(b).toFixed(2); }))));
  });
  const errs = L.log.slice(n0).filter(l => /PAGEERROR/.test(l));
  need('no page errors in boot B', !errs.length, errs.slice(0, 3).join(' | '));
  await browser.close();
}

console.log('\n' + path.basename(FILE) + ': ' + (fails.length ? 'gate_H RED  ' + pass + ' pass / ' + fails.length + ' fail' : 'gate_H GREEN  ' + pass + '/' + pass));
fails.forEach(f => console.log('  ✗ ' + f));
process.exit(fails.length ? 1 : 0);
