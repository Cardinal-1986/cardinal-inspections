/* gate_1416.mjs — Production, after judge 14 (and judge 16's Production rows). Chromium.
 *
 *   node gate_1416.mjs [index.html]      (NODE_PATH as for the other gates)
 *
 * Personas ride gate_1400_lib (sentinel_setup_cardinal + sentinel_setup_production +
 * gate_1400_seed): curtis = production, scottie = field, theo = admin (controls).
 * Widths: 390x844 with body.standalone (the installed phone), 1366x768, 1920x1080.
 *
 *   A  phone, Curtis — the board
 *      A1 + Add / Full calendar chips and the back chevron are a VISIBLE 44 (j16 m15)
 *      A2 one sans heading, one colour: no Georgia, no red "duction" span (j14 p14)
 *      A3 a Today row sits above the fold and opens today's sheet with all 3 items (j14 m9)
 *      A4 a punch row leads with its task and shows it whole, on up to two lines (j14 m9)
 *      A5 a list's subtitle is not its title again (j14 p14)
 *      A6 Mark ordered offers "Ordered — Undo"; 44px Undo, above the tab bar; Undo clears it (j14 m11)
 *      A7 the Schedule tab opens Production's calendar on today (all 3 items), lit — not the Schedule Board (j14 M3)
 *      A8 Crews opens over the retail chrome and its × returns to the board, not the retail home (j14 M3)
 *      A9 Dispatch: a 7-day strip that pans the board (tray and strips hold still); tags say "None booked", not "free";
 *         Back returns to the board (j14 m10, M3)
 *      A10 punch card: + Add step has no outset border and 14px sides (j14 p12); step × is 44 wide (j14 m8)
 *      A11 the note gate is a field in the card — no window.prompt; Save writes the note and ticks (j14 m8)
 *      A12 an untagged message says nobody was notified (j14 m4)
 *      A13 a crew work order's stored <title> is "Work Order — trade — crew"; the editor chip says PRODUCTION (j14 p13)
 *   B  phone, Scottie — Dispatch is read-only (no arming, no form, says why); no Open job on his card (j14 M2, m7)
 *   C  phone, Theo — CONTROLS: Schedule Board, Crews, Dispatch arming and the REP chip are untouched
 *   D  1366x768 and 1920x1080, Curtis — full calendar is a real two-column grid, month flush left,
 *      day >= 360px (j14 M1); four boxes fill their row, labels unclipped (j14 m6); the Punch List WHEN
 *      cell never prints over CREW (j14 m5); Punch & Repairs heading: no emoji, sans (j14 p14);
 *      the chips are 44 on a desktop too (j16 m15)
 *
 * Negative control: point it at b1415 — it must go RED, named, without crashing.
 */
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
process.env.APPFILE = FILE;
const LIBDIR = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
/* gate_1400_lib always opens a 390 mobile context; for the desktop widths the
   context options are swapped at newContext() time, so every width rides the
   SAME boot (mock, seeds, routes, personas). */
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const _launch = chromium.launch.bind(chromium);
let DESK = null;
chromium.launch = async (o) => {
  const b = await _launch(o);
  const nc = b.newContext.bind(b);
  b.newContext = (opts) => nc(DESK ? { viewport: DESK } : opts);
  return b;
};
const lib = await import(LIBDIR + 'gate_1400_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 420000);

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
/* BUG_CLASSES 37: a control tree missing a symbol must report RED, not crash */
async function chk(name, fn) { try { await fn(); } catch (e) { ok(false, name + ' (threw)', String(e.message || e).split('\n')[0].slice(0, 160)); } }
async function boot(as, size) {
  DESK = size || null;
  const r = await lib.boot(as, {});
  DESK = null;
  r.page.setDefaultTimeout(5000);
  if (!size) await r.page.evaluate(() => document.body.classList.add('standalone'));
  await r.page.waitForTimeout(400);
  return r;
}
const wait = (p, ms) => p.waitForTimeout(ms);
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel);
const ensureBoard = p => p.evaluate(async () => {
  const b = document.getElementById('cr-pb');
  if (!b || !b.classList.contains('open')) window.CardinalProduction.open();
  await new Promise(r => setTimeout(r, 700));
  /* back to the home pane */
  for (let i = 0; i < 3 && !document.querySelector('#cr-pb .pbtiles'); i++) {
    const bk = document.querySelector('#cr-pb .pbback'); if (bk) bk.click(); await new Promise(r => setTimeout(r, 500));
    if (!document.getElementById('cr-pb').classList.contains('open')) { window.CardinalProduction.open(); await new Promise(r => setTimeout(r, 700)); }
  }
});
const shown = (p, id) => p.evaluate(i => { const e = document.getElementById(i); if (!e) return false; const cs = getComputedStyle(e); return cs.display !== 'none' && e.getClientRects().length > 0; }, id);

/* ───────────────────────────── A  phone, Curtis ───────────────────────────── */
{
  console.log('A  phone 390 (installed), Curtis');
  const { browser, page } = await boot('curtis');
  try {
    await ensureBoard(page);
    await chk('A1', async () => {
      const m = await page.evaluate(() => ({
        chips: [...document.querySelectorAll('#cr-pb .pbchip')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim(), Math.round(r.width), Math.round(r.height)]; }),
        back: (() => { const r = document.querySelector('#cr-pb .pbback').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() }));
      ok(m.chips.length >= 2 && m.chips.every(c => c[1] >= 44 && c[2] >= 44), 'A1 the + Add / Full calendar chips are a visible 44', JSON.stringify(m.chips));
      ok(m.back[0] >= 44 && m.back[1] >= 44, 'A1 the back chevron is a visible 44x44', JSON.stringify(m.back));
    });
    await chk('A2', async () => {
      const h = await page.evaluate(() => { const h = document.querySelector('#cr-pb h1'); return { ff: getComputedStyle(h).fontFamily, spans: h.querySelectorAll('span').length, t: h.textContent }; });
      ok(!/georgia|times/i.test(h.ff) && h.spans === 0 && h.t === 'Production', 'A2 the heading is sans and one colour', JSON.stringify(h));
    });
    await chk('A3', async () => {
      const t = await page.evaluate(() => {
        const b = document.querySelector('#cr-pb .pbtoday'), nav = document.getElementById('pwaNav').getBoundingClientRect();
        if (!b) return null; const r = b.getBoundingClientRect();
        return { text: b.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), navTop: Math.round(nav.top) };
      });
      ok(t && t.bottom <= t.navTop && t.h >= 44 && /today/i.test(t.text) && /punch-out/.test(t.text), 'A3 a 44px Today row sits above the fold and names what today holds', JSON.stringify(t));
      await click(page, '#cr-pb .pbtoday'); await wait(page, 800);
      const s = await page.evaluate(() => { const m = document.getElementById('cr-pb-modal'); return m ? { open: m.classList.contains('open'), mode: m.getAttribute('data-mode'), n: m.querySelectorAll('.pbev').length } : null; });
      ok(s && s.open && s.mode === 'day' && s.n >= 3, 'A3 it opens today\'s sheet with all three items', JSON.stringify(s));
      await click(page, '#cr-pb-modal .pbdx'); await wait(page, 500);
    });
    await chk('A4', async () => {
      await page.evaluate(() => { const r = document.getElementById('pbDayRule'); if (r) r.scrollIntoView(); });
      await wait(page, 300);
      const ev = await page.evaluate(() => [...document.querySelectorAll('#cr-pb .pbev')].map(e => { const b = e.querySelector('.tx b'); return { t: b.textContent, sw: b.scrollWidth, cw: b.clientWidth, sh: b.scrollHeight, ch: b.clientHeight }; }));
      const tarp = ev.find(e => /Tarp over rear slope/.test(e.t));
      ok(tarp && /^Tarp over rear slope/.test(tarp.t), 'A4 the punch row leads with its task', JSON.stringify(tarp));
      ok(ev.length >= 3 && ev.every(e => e.sw <= e.cw + 1 && e.sh <= e.ch + 1), 'A4 every agenda title is shown whole (no ellipsis)', JSON.stringify(ev.map(e => [e.t.slice(0, 24), e.sw, e.cw, e.sh, e.ch])));
    });
    await chk('A5', async () => {
      await click(page, '#cr-pb [data-box="needs"]'); await wait(page, 700);
      const l = await page.evaluate(() => ({ h: (document.querySelector('#cr-pb h1') || {}).textContent, s: (document.querySelector('#cr-pb .pbsub') || {}).textContent }));
      ok(l.h && l.s && l.h.trim().toLowerCase() !== l.s.trim().toLowerCase() && /\d/.test(l.s), 'A5 the list subtitle says what is in it, not its title again', JSON.stringify(l));
    });
    await chk('A6', async () => {
      const pid = await page.evaluate(() => { const b = document.querySelector('#cr-pb [data-ord]'); if (!b) return null; const id = b.getAttribute('data-ord'); b.click(); return id; });
      await wait(page, 1500);
      const t = await page.evaluate(() => {
        const e = document.querySelector('.cr-undo-toast'); if (!e) return null;
        const b = e.querySelector('.btn'), r = e.getBoundingClientRect(), br = b.getBoundingClientRect(), nav = document.getElementById('pwaNav').getBoundingClientRect();
        return { text: e.textContent, tagged: e.classList.contains('pbundo'), btnH: Math.round(br.height), bottom: Math.round(r.bottom), navTop: Math.round(nav.top), ink: getComputedStyle(b).color };
      });
      ok(t && /Ordered/.test(t.text) && /Undo/i.test(t.text), 'A6 Mark ordered offers "Ordered — Undo"', JSON.stringify(t));
      ok(t && t.btnH >= 44 && t.bottom <= t.navTop, 'A6 the Undo is 44 tall and sits above the tab bar', JSON.stringify(t));
      const before = await page.evaluate(async (id) => { const r = await window.supa.from('projects').select('checklist').eq('id', id).single(); return JSON.parse(r.data.checklist || '{}').materials_ordered_at || ''; }, pid);
      await click(page, '.cr-undo-toast .btn'); await wait(page, 1500);
      const after = await page.evaluate(async (id) => { const r = await window.supa.from('projects').select('checklist').eq('id', id).single(); return JSON.parse(r.data.checklist || '{}').materials_ordered_at || ''; }, pid);
      ok(!!pid && !!before && after === '', 'A6 Undo takes the mark back off', JSON.stringify({ pid, before, after }));
    });
    await chk('A7', async () => {
      await ensureBoard(page);
      await page.locator('#pwaSched').click({ timeout: 4000 }); await wait(page, 1300);
      const s = await page.evaluate(() => ({
        cal: !!document.querySelector('#cr-pb.open .pbcalw'),
        board: (() => { const b = document.getElementById('boardView'); return !!(b && getComputedStyle(b).display !== 'none'); })(),
        lit: (document.querySelector('#pwaNav .pwatab.on') || { getAttribute: () => '' }).getAttribute('data-tab'),
        items: document.querySelectorAll('#cr-pb .pbsheet .pbev').length,
        day: (document.querySelector('#cr-pb .pbsheet .pbrule') || {}).textContent || '' }));
      ok(s.cal && !s.board, 'A7 Schedule opens Production\'s calendar, not the retail Schedule Board', JSON.stringify(s));
      ok(s.items >= 3 && s.lit === 'sched', 'A7 it lands on today with all three items, and Schedule is lit', JSON.stringify(s));
    });
    await chk('A8', async () => {
      await ensureBoard(page);
      await click(page, '#cr-pb [data-hub="crews"]'); await wait(page, 1500);
      const c = await page.evaluate(() => { const v = document.getElementById('crewsView'); const hit = document.elementFromPoint(200, 22);
        return { shown: !!(v && getComputedStyle(v).display !== 'none'), z: v && getComputedStyle(v).zIndex, covers: !!(v && hit && v.contains(hit)), hit: hit && (hit.id || hit.className || hit.tagName) }; });
      ok(c.shown && c.covers, 'A8 Crews opens over the retail header and nav row', JSON.stringify(c));
      await click(page, '#crewsView [data-act="close"]'); await wait(page, 1200);
      const a = await page.evaluate(() => ({ board: !!document.querySelector('#cr-pb.open'), home: (() => { const m = document.getElementById('mainView'); return !!(m && getComputedStyle(m).display !== 'none'); })() }));
      ok(a.board && !a.home, 'A8 its × goes back to the Production board, not the retail home', JSON.stringify(a));
    });
    await chk('A9', async () => {
      await ensureBoard(page);
      await click(page, '#cr-pb [data-hub="dispatch"]'); await wait(page, 1600);
      const d = await page.evaluate(() => {
        const dd = [...document.querySelectorAll('#cr-disp .dspdays .dd')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.height), e.textContent]; });
        const cf = [...document.querySelectorAll('#cr-disp .crewc .cf')].map(e => e.textContent.trim());
        return { dd, cf };
      });
      ok(d.dd.length === 7 && d.dd.every(x => x[0] >= 0 && x[1] <= 390 && x[2] >= 44), 'A9 all seven days are named on screen, each a 44px target', JSON.stringify(d.dd.map(x => x.slice(0, 3))));
      ok(d.cf.length > 0 && !d.cf.some(t => /^free\b/i.test(t)) && d.cf.some(t => /^none booked/i.test(t)), 'A9 the crew tags say "None booked", never "free"', JSON.stringify(d.cf));
      await click(page, '#cr-disp .dspdays .dd[data-dday="5"]'); await wait(page, 1100);
      const v = await page.evaluate(() => { const sc = document.querySelector('#cr-disp .dspscroll').getBoundingClientRect(); const rail = document.querySelector('#cr-disp .dcol .c.rail').getBoundingClientRect();
        const hd = document.querySelectorAll('#cr-disp .dcol .c')[6].getBoundingClientRect(); return { left: Math.round(hd.left), right: Math.round(hd.right), from: Math.round(rail.right), to: Math.round(sc.right) }; });
      ok(v.left >= v.from - 2 && v.right <= v.to + 2, 'A9 tapping the sixth day pans the board to it', JSON.stringify(v));
      const k = await page.evaluate(() => { const sc = document.querySelector('#cr-disp .dspscroll').getBoundingClientRect();
        const t = document.querySelector('#cr-disp .drail .rl .t').getBoundingClientRect(), b = document.querySelector('#cr-disp .dband .bl').getBoundingClientRect();
        return { scL: Math.round(sc.left), scR: Math.round(sc.right), tray: [Math.round(t.left), Math.round(t.right)], strip: [Math.round(b.left), Math.round(b.right)] }; });
      ok(k.tray[0] >= k.scL - 1 && k.tray[1] <= k.scR + 1 && k.strip[0] >= k.scL - 1 && k.strip[0] < k.scR - 60, 'A9 panned, the Needs-a-crew tray and the trade strip stay on screen', JSON.stringify(k));
      await click(page, '#cr-disp .dspback'); await wait(page, 1200);
      const a = await page.evaluate(() => ({ board: !!document.querySelector('#cr-pb.open'), home: (() => { const m = document.getElementById('mainView'); return !!(m && getComputedStyle(m).display !== 'none'); })() }));
      ok(a.board && !a.home, 'A9 Back from Dispatch returns to the board, not the retail home', JSON.stringify(a));
    });
    await chk('A10-12', async () => {
      await page.evaluate(() => { window.__PROMPTS__ = 0; window.prompt = function(){ window.__PROMPTS__++; return 'via prompt'; }; });
      await page.evaluate(() => window.CardinalPunchCard.open('i1')); await wait(page, 1400);
      const a = await page.evaluate(() => { const b = document.querySelector('#cr-pk .pkadd'); const cs = b && getComputedStyle(b); const x = document.querySelector('#cr-pk [data-delstep]'); const xr = x && x.getBoundingClientRect();
        return { bl: cs && cs.borderLeftWidth, br: cs && cs.borderRightWidth, bb: cs && cs.borderBottomWidth, pl: cs && cs.paddingLeft, x: xr && [Math.round(xr.width), Math.round(xr.height)] }; });
      ok(a.bl === '0px' && a.br === '0px' && a.bb === '0px' && a.pl === '14px', 'A10 + Add step: no outset border, 14px sides', JSON.stringify(a));
      ok(a.x && a.x[0] >= 44 && a.x[1] >= 44, 'A10 the step × is 44 square', JSON.stringify(a.x));
      const idx = await page.evaluate(() => [...document.querySelectorAll('#cr-pk .pkck')].findIndex(r => r.querySelector('.req')));
      const d0 = await page.evaluate(() => document.querySelectorAll('#cr-pk .pkck.d').length);
      await page.evaluate(i => document.querySelectorAll('#cr-pk .pkck')[i].querySelector('.bx').click(), idx); await wait(page, 700);
      const f = await page.evaluate(() => { const t = document.querySelector('#cr-pk [data-f="stepnote"]'); return { prompts: window.__PROMPTS__, field: !!(t && t.getClientRects().length), ticked: document.querySelectorAll('#cr-pk .pkck.d').length, focus: document.activeElement === t }; });
      ok(idx >= 0 && f.prompts === 0 && f.field && f.ticked === d0, 'A11 the note gate opens a field in the card (no prompt), and ticks nothing yet', JSON.stringify(Object.assign({ idx, d0 }, f)));
      if (f.field) { await page.fill('#cr-pk [data-f="stepnote"]', 'Soft decking about a foot in at the gable'); await click(page, '#cr-pk [data-notesave]'); await wait(page, 1200); }
      const g = await page.evaluate(() => ({ ticked: document.querySelectorAll('#cr-pk .pkck.d').length, note: [...document.querySelectorAll('#cr-pk .pkck .note')].map(n => n.textContent).join('|'), field: !!document.querySelector('#cr-pk [data-f="stepnote"]'),
        wrote: (window.__WRITES__ || []).some(w => w.table === 'punch_items' && /Soft decking/.test(JSON.stringify(w.payload || {}))) }));
      ok(g.ticked === d0 + 1 && /Soft decking/.test(g.note) && !g.field && g.wrote, 'A11 Save writes the note and ticks the step', JSON.stringify(g));
      await page.fill('#cr-pk [data-f="msg"]', 'Running 20 min late'); await click(page, '#cr-pk [data-act="send"]'); await wait(page, 1300);
      const o = await page.evaluate(() => (document.querySelector('#cr-pk .pkout') || {}).textContent || '');
      ok(/nobody was notified/i.test(o) && /@/.test(o), 'A12 an untagged message says nobody was notified, and how to tag', o);
      await page.evaluate(() => window.CardinalPunchCard.close());
    });
    await chk('A13', async () => {
      const n0 = await page.evaluate(() => (window.__WRITES__ || []).length);
      await page.evaluate(() => window.openWorkOrderPicker(window.cacheProjects.find(p => p.id === 'p7'))); await wait(page, 1500);
      await click(page, '#woGo'); await wait(page, 3500);
      const w = await page.evaluate((n0) => { const ins = (window.__WRITES__ || []).slice(n0).filter(x => x.table === 'inspection_reports' && x.payload && x.payload.html);
        const h = ins.length ? String(ins[ins.length - 1].payload.html) : ''; const t = (h.match(/<title>[^<]*<\/title>/) || [''])[0];
        return { title: t, row: ins.length ? ins[ins.length - 1].payload.title : null, chip: (document.getElementById('edRepChip') || {}).textContent || '' }; }, n0);
      ok(/^<title>Work Order — \w+ — /.test(w.title) && !/Estimate/.test(w.title), 'A13 the work order document is titled for what it is', JSON.stringify(w));
      ok(/^PRODUCTION/.test(w.chip), 'A13 the editor chip names Curtis as Production, not REP', w.chip);
    });
  } finally { await browser.close(); }
}

/* ───────────────────────────── B  phone, Scottie ───────────────────────────── */
{
  console.log('B  phone 390 (installed), Scottie — field');
  const { browser, page } = await boot('scottie');
  try {
    await chk('B1', async () => {
      await page.evaluate(() => window.CardinalDispatch.open()); await wait(page, 1600);
      const r0 = await page.evaluate(() => ({ uch: document.querySelectorAll('#cr-disp .uch').length, grip: document.querySelectorAll('#cr-disp .job .mv').length,
        hint: (document.querySelector('#cr-disp .drail .rl .s') || {}).textContent || '', note: (document.querySelector('#cr-disp .dspnote') || {}).textContent || '' }));
      await click(page, '#cr-disp .uch'); await wait(page, 700);
      const r1 = await page.evaluate(() => ({ armed: document.querySelectorAll('#cr-disp .uch.armed').length, arm: document.getElementById('cr-disp').classList.contains('arm'),
        toast: (document.getElementById('crToasts') || {}).textContent || '' }));
      await click(page, '#cr-disp .dlane .dcell.demp'); await wait(page, 1300);
      const r2 = await page.evaluate(() => ({ disp: document.getElementById('cr-disp').classList.contains('open'), form: !!document.getElementById('woGo') && getComputedStyle(document.getElementById('tskModal')).display !== 'none' }));
      ok(r0.uch > 0 && r1.armed === 0 && !r1.arm, 'B1 a Needs-a-crew chip does not arm for a field user', JSON.stringify([r0.uch, r1]));
      ok(r2.disp && !r2.form, 'B1 a day tap leaves Dispatch up and opens no work-order form', JSON.stringify(r2));
      ok(/Curtis/.test(r0.hint) && /Curtis/.test(r1.toast) && /read-only/i.test(r0.note), 'B1 the board says booking is Curtis\'s (hint, tap, footer)', JSON.stringify({ hint: r0.hint, toast: r1.toast.slice(0, 90) }));
      ok(r0.grip === 0, 'B1 no move grips for a field user', String(r0.grip));
      await page.evaluate(() => window.CardinalDispatch.close()); await wait(page, 600);
    });
    await chk('B2', async () => {
      await page.evaluate(() => window.CardinalPunchCard.open('i1')); await wait(page, 1300);
      const n = await page.evaluate(() => document.querySelectorAll('#cr-pk [data-act="job"]').length);
      ok(n === 0, 'B2 the field card has no Open job button', String(n));
    });
  } finally { await browser.close(); }
}

/* ───────────────────────────── C  phone, Theo — controls ───────────────────── */
{
  console.log('C  phone 390 (installed), Theo — admin CONTROLS (must hold on both trees)');
  const { browser, page } = await boot('theo');
  try {
    await chk('C1', async () => {
      await page.locator('#pwaSched').click({ timeout: 4000 }); await wait(page, 1300);
      ok(await shown(page, 'boardView') && !(await page.evaluate(() => !!document.querySelector('#cr-pb.open .pbcalw'))), 'C1 an admin\'s Schedule tab still opens the Schedule Board');
    });
    await chk('C2', async () => {
      await page.evaluate(() => window.CardinalCrews.open()); await wait(page, 1500);
      const { z, top } = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('crewsView')); return { z: c.zIndex, top: parseFloat(c.top) }; });
      await click(page, '#crewsView [data-act="close"]'); await wait(page, 1000);
      ok(z !== '9400' && top > 0 && await shown(page, 'mainView'), 'C2 an admin\'s Crews is unchanged (under the header, × goes home)', JSON.stringify({ z, top }));
    });
    await chk('C3', async () => {
      await page.evaluate(() => window.CardinalDispatch.open()); await wait(page, 1600);
      await click(page, '#cr-disp .uch'); await wait(page, 600);
      ok(await page.evaluate(() => document.querySelectorAll('#cr-disp .uch.armed').length === 1), 'C3 an admin still arms a Needs-a-crew chip');
      await page.evaluate(() => window.CardinalDispatch.close());
    });
  } finally { await browser.close(); }
}

/* ───────────────────────────── D  desktop, Curtis ──────────────────────────── */
for (const [w, h] of [[1366, 768], [1920, 1080]]) {
  console.log(`D  desktop ${w}x${h}, Curtis`);
  const { browser, page } = await boot('curtis', { width: w, height: h });
  try {
    await ensureBoard(page);
    await chk('D-tiles', async () => {
      const t = await page.evaluate(() => { const row = document.querySelector('#cr-pb .pbtiles').getBoundingClientRect(); const tiles = [...document.querySelectorAll('#cr-pb .pbtile')];
        const last = tiles[tiles.length - 1].getBoundingClientRect();
        const clip = tiles.flatMap(e => [...e.querySelectorAll('.l, .s')]).filter(k => k.scrollWidth > k.clientWidth + 1 || k.scrollHeight > k.clientHeight + 1).map(k => k.textContent.trim());
        return { n: tiles.length, unused: Math.round(row.right - last.right), w: tiles.map(e => Math.round(e.getBoundingClientRect().width)), clip }; });
      ok(t.n === 4 && t.unused <= 2, `D ${w}: the four boxes fill their row`, JSON.stringify(t));
      ok(t.clip.length === 0, `D ${w}: no box label or sub-line is clipped`, JSON.stringify(t.clip));
      const c = await page.evaluate(() => [...document.querySelectorAll('#cr-pb .pbchip, #cr-pb .pbback')].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().height)));
      ok(c.length >= 3 && c.every(x => x >= 44), `D ${w}: chips and chevron are 44 here too`, JSON.stringify(c));
    });
    await chk('D-crews', async () => {
      await ensureBoard(page);
      await click(page, '#cr-pb [data-hub="crews"]'); await wait(page, 1500);
      const c = await page.evaluate(() => { const v = document.getElementById('crewsView'); const a = document.elementFromPoint(innerWidth / 2, 30), b = document.elementFromPoint(100, 300);
        return { header: !!(v && a && v.contains(a)), rail: !!(v && b && v.contains(b)) }; });
      ok(c.header && c.rail, `D ${w}: Crews covers the retail header and the left rail`, JSON.stringify(c));
      await click(page, '#crewsView [data-act="close"]'); await wait(page, 1200);
      ok(await page.evaluate(() => !!document.querySelector('#cr-pb.open .pbtiles')), `D ${w}: and its × lands back on the board`);
    });
    await chk('D-cal', async () => {
      await ensureBoard(page);   /* on the control tree Crews' × leaves the board — measure a REAL calendar, never a hidden one */
      await page.evaluate(() => { const b = [...document.querySelectorAll('#cr-pb .pbchip')].find(e => /Full calendar/i.test(e.textContent)); b.click(); }); await wait(page, 1300);
      const g = await page.evaluate(() => { const wrap = document.querySelector('#cr-pb .pbwrap'), cs = getComputedStyle(wrap), wr = wrap.getBoundingClientRect();
        const cal = document.querySelector('#cr-pb .pbcal').getBoundingClientRect(), sh = document.querySelector('#cr-pb .pbsheet').getBoundingClientRect();
        const evs = [...document.querySelectorAll('#cr-pb .pbsheet .pbev')].map(e => Math.round(e.getBoundingClientRect().width));
        return { emptyLeft: Math.round(cal.left - (wr.left + parseFloat(cs.paddingLeft))), cal: Math.round(cal.width), sheet: Math.round(sh.width), side: cal.right <= sh.left, evs }; });
      ok(g.cal > 0 && g.emptyLeft >= -1 && g.emptyLeft <= 4 && g.side, `D ${w}: the month starts at the board's left edge, the day beside it`, JSON.stringify(g));
      ok(g.sheet >= 360 && g.cal > g.sheet && g.evs.every(x => x >= 300), `D ${w}: the day is >= 360px and its cards are not squeezed`, JSON.stringify(g));
    });
    await chk('D-punch', async () => {
      await page.evaluate(() => window.openPunchView()); await wait(page, 1600);
      const o = await page.evaluate(() => { const rows = [...document.querySelectorAll('#punchView .pl-row')].filter(r => r.getClientRects().length);
        const bad = rows.map(r => { const s = r.querySelector('.pl-wh small'), c = r.querySelector('.pl-cr'); if (!s || !c || !s.textContent.trim()) return null;
          const sr = s.getBoundingClientRect(), cr = c.getBoundingClientRect(); return sr.right > cr.left + 0.5 ? s.textContent.trim() + ' @' + Math.round(sr.right - cr.left) : null; }).filter(Boolean);
        const onsite = rows.some(r => /On site since/.test(r.textContent));
        const t = document.querySelector('#punchView .pu-title'); return { rows: rows.length, onsite, bad, title: t && t.textContent, ff: t && getComputedStyle(t).fontFamily }; });
      ok(o.rows > 0 && o.bad.length === 0, `D ${w}: the Punch List WHEN cell never prints over CREW` + (o.onsite ? ' (an on-site row is in the list)' : ''), JSON.stringify(o.bad));
      ok(o.title === 'Punch & Repairs' && !/georgia|times/i.test(o.ff || ''), `D ${w}: Punch & Repairs heading — no emoji, sans`, JSON.stringify([o.title, o.ff]));
    });
  } finally { await browser.close(); }
}

const errs = lib.log.filter(l => /PAGEERROR/.test(l));
ok(errs.length === 0, 'no page errors across the run', errs.slice(0, 3).join(' | '));
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
