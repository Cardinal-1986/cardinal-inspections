/* gate_1441 — round-1 leftovers: menus, icons and questions (builder A1's slice, made on build 1438).
 *
 *   A  P01.03   a rep's Tools menu shows neither Reports nor Settings (the rep's drawer hides both);
 *               an admin's still shows both
 *   B  P01.08   Self Check sits above the drawer footer for a rep; a run leaves history.length and
 *               history.state as they were, and Back afterwards does not land on Production / Sales Floor
 *   C  P01.14 / P06.03   every drawer row an account can see carries a drawn glyph, no emoji, and no two
 *               visible rows share a glyph (theo in Retail / Community / Insurance, Curtis); the banner's
 *               Production menu draws Crew Dispatch and Schedule Board differently
 *   D  P06.08 / J15.10   the Library's TOC / Manage / Ask buttons, the "+ New contract" menu and the
 *               profile Appointments rows hold no emoji, and the drawn ones carry an svg
 *   E  J15.02   the drawer's Production label starts where its siblings' labels start (390, 1536)
 *   F  J15.03 / P06.05   rail rows, the header +, the Community job-menu tiles inherit the app font;
 *               the tile counts are that font with tabular figures
 *   G  P08.06   day sheet: drawn calendar in the title, no emoji in Type, each row names its kind,
 *               the Type select is wide enough for its label (Normal and Larger)
 *   H  P08.12   Punch & Repairs: a drawn search glyph and no emoji; the hint fits its box at
 *               Normal / Large / Larger / Sun / Sun + Larger
 *   I  P10.07   idle on Home as a rep: no data-cradmin or style writes on the drawer rows hideOpt() hides
 *   J  P12.02   the three success toasts pass 'ok'
 *   K  P12.09   no crAsk question falls back to "Continue" (TypeScript AST over every inline script);
 *               the client page's stage arrow asks "Advance", not "Continue"
 *   L  J16.06 (V5)  the drawer's pressed Text size / Appearance buttons follow the portal colour, and
 *               white on them is >= 4.5:1, in dark, light and Sun. RETAIL stays red (#c8202e): the rail's
 *               slate for Retail is a colour call held for Theo, so this asserts red there
 *
 *   NODE_OPTIONS="--require .../block_supa.cjs" node gate_1441.mjs [artifact]
 * Default artifact: the repo index.html. On build 1440 this gate must go RED.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || resolve(HERE, '../../../../index.html'));
process.env.APPFILE = FILE;
const L = await import(resolve(HERE, 'gate_1403_lib.mjs'));
const HTML = readFileSync(FILE, 'utf8');
setTimeout(() => { console.log('  ✗ FAIL gate timed out'); process.exit(1); }, 900000);

let passes = 0; const fails = [];
function ok(c, msg, det) { if (c) passes++; else fails.push(msg); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + msg + (det !== undefined ? '  — ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 260) : '')); }
const seedFor = (theme, text, who) => `try{localStorage.setItem('cardinal.theme.rb','${theme}');${text ? `localStorage.setItem('cr-textsize','${text}');` : ''}localStorage.setItem('cr-push-nudge-dismissed','1');}catch(e){}`
  + (who === 'curtis' ? "window.__AS__={email:'curtis@cardinalrenovations.net',name:'Curtis'};" : '');
async function boot(who, o = {}) {
  const r = await L.boot(who === 'curtis' ? 'x' : who, { instr: false, desktop: !!o.desktop, seed: seedFor(o.theme || '0', o.text, who) });
  if (o.width) await r.page.setViewportSize({ width: o.width, height: o.height || 900 });
  await r.page.waitForTimeout(1200);
  await r.page.evaluate(() => { ['landingView', 'loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; }); try { const fd = document.getElementById('cr-fd'); if (fd) fd.style.display = 'none'; } catch (e) {} });
  return r;
}
const EMO = '\\p{Extended_Pictographic}';
/* open the drawer (or the desktop popover) and unfold every folded section */
const openDrawer = page => page.evaluate(async () => {
  const m = document.getElementById('navMenu');
  if (m.style.display !== 'block') { const b = document.getElementById('navBtn'); if (b) b.click(); }
  await new Promise(r => setTimeout(r, 500));
  [...m.querySelectorAll('.navsec')].forEach(s => { if (s.getAttribute('aria-expanded') === 'false') s.click(); });
  await new Promise(r => setTimeout(r, 400));
  return m.style.display;
});
const closeDrawer = page => page.evaluate(() => { const m = document.getElementById('navMenu'); if (m) m.style.display = 'none'; const bd = document.getElementById('navBackdrop'); if (bd) bd.style.display = 'none'; });
const drawerRows = page => page.evaluate(EMO => {
  const re = new RegExp(EMO, 'u'), m = document.getElementById('navMenu');
  return [...m.querySelectorAll(':scope > .navopt')].filter(el => el.id !== 'signOutBtn').map(el => {
    const sv = el.querySelector('svg'), q = el.getBoundingClientRect();
    return { t: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 34), shown: getComputedStyle(el).display !== 'none' && q.height > 0,
             svg: !!sv, glyph: sv ? sv.innerHTML : '', emoji: re.test(el.textContent) };
  });
}, EMO);
function contrast(a, b) {
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const Lm = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const x = Lm(a), y = Lm(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function rgbOf(s) {
  let m = /rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/.exec(s); if (m) return [+m[1], +m[2], +m[3]];
  m = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(s); if (m) return [m[1] * 255, m[2] * 255, m[3] * 255];
  return null;
}
const pressed = page => page.evaluate(() => [...document.querySelectorAll('#navMenu .cr-ts button[aria-pressed="true"]')].map(b => {
  const cs = getComputedStyle(b); return { t: b.textContent.trim(), bg: cs.backgroundColor, fg: cs.color };
}));

console.log('gate_1441 on ' + FILE);
try {
  /* ───────────────────────────── rep, phone, dark: A B I */
  {
    const { browser, page } = await boot('rep');
    console.log('\nI  P10.07 idle on Home (rep)');
    await page.evaluate(() => window.showHome && window.showHome()); await page.waitForTimeout(1200);
    const idle = await page.evaluate(async () => {
      const recs = { cradmin: 0, style: 0 };
      const mo = new MutationObserver(l => l.forEach(r => { if (r.target.closest && r.target.closest('#navMenu') && r.target.hasAttribute('data-cradmin')) recs[r.attributeName === 'style' ? 'style' : 'cradmin']++; }));
      mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-cradmin', 'style'] });
      await new Promise(r => setTimeout(r, 4500)); mo.disconnect();
      return Object.assign(recs, { hidden: document.querySelectorAll('#navMenu [data-cradmin="1"]').length });
    });
    ok(idle.hidden >= 4, 'I  the rows hideOpt() hides are still hidden and marked', idle.hidden);
    ok(idle.cradmin === 0, 'I  no data-cradmin rewrites in 4.5s idle', idle);
    ok(idle.style === 0, 'I  no style rewrites on those rows in 4.5s idle', idle);

    console.log('\nA  P01.03 the rep\'s Tools menu');
    const tools = await page.evaluate(async () => {
      const t = document.querySelector('#crBanner .cbdd[data-dd="tools"]'); if (!t) return { err: 'no Tools menu' };
      t.click(); await new Promise(r => setTimeout(r, 300));
      const items = [...t.querySelectorAll('.cbi')].filter(i => getComputedStyle(i).display !== 'none').map(i => i.getAttribute('data-go'));
      document.body.click(); return { items };
    });
    ok(!tools.err && !tools.items.includes('reports'), 'A  rep: Tools shows no Reports', tools.items || tools.err);
    ok(!tools.err && !tools.items.includes('settings'), 'A  rep: Tools shows no Settings', tools.items || tools.err);
    ok(!tools.err && tools.items.length >= 6, 'A  rep: Tools still has its other doors (>= 6)', (tools.items || []).length);
    const drawerHides = await page.evaluate(() => ['reports', 'settings'].map(k => { const e = document.querySelector('#navMenu .navopt[data-nav="' + k + '"]'); return !e || getComputedStyle(e).display === 'none'; }));
    ok(drawerHides.every(Boolean), 'A  rep: the drawer hides the same two (the rule Tools now matches)', drawerHides);

    console.log('\nB  P01.08 Self Check (rep)');
    const pos = await page.evaluate(() => { const m = document.getElementById('navMenu'), b = document.getElementById('cr-nav-selfcheck'), f = m && m.querySelector('[data-cr-footer]');
      if (!b || !f) return { err: !b ? 'no row' : 'no footer' };
      return { beforeFooter: !!(b.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING), prev: (b.previousElementSibling && b.previousElementSibling.textContent || '').trim().slice(0, 24) }; });
    ok(!pos.err && pos.beforeFooter, 'B  rep: the Self Check row is above the build-stamp footer', pos);
    const h0 = await page.evaluate(() => ({ len: history.length, st: JSON.stringify(history.state) }));
    await openDrawer(page);
    await page.evaluate(() => document.getElementById('cr-nav-selfcheck').click());
    let ran = true;
    await page.waitForFunction(() => { const p = document.getElementById('cr-sc-panel'); return p && p.classList.contains('open') && p.style.visibility !== 'hidden' && !/Opening each screen/.test(p.textContent); }, null, { timeout: 45000 }).catch(() => { ran = false; });
    await page.waitForTimeout(400);
    const h1 = await page.evaluate(() => ({ len: history.length, st: JSON.stringify(history.state), sum: ((document.querySelector('#cr-sc-panel .sum') || {}).textContent || '').trim() }));
    ok(ran && !!h1.sum, 'B  the run finished and painted its result', h1.sum);
    ok(h1.len === h0.len, 'B  a run adds no history entries', { before: h0.len, after: h1.len });
    ok(h1.st === h0.st, 'B  history.state is the one the run started on', { before: h0.st, after: h1.st });
    await page.evaluate(() => { const c = [...document.querySelectorAll('#cr-sc-panel button')].find(b => /close/i.test(b.textContent)); c && c.click(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.openClientsDirectory && window.openClientsDirectory()); await page.waitForTimeout(700);
    await page.evaluate(() => history.back()); await page.waitForTimeout(1400);
    const back = await page.evaluate(() => ({ st: history.state && history.state.view, crm: document.body.dataset.crm, pb: !!document.querySelector('#cr-pb.open'), sf: !!document.querySelector('#cr-sf.open') }));
    ok(back.st === JSON.parse(h0.st).view && !back.pb && !back.sf && back.crm !== 'production' && back.crm !== 'sales', 'B  Back after a run returns to where the run started, not into a screen it opened', back);
    await browser.close();
  }

  /* ───────────────────────────── theo, phone, dark: A C D E G K L */
  const LAB = {};
  {
    const { browser, page } = await boot('theo');
    console.log('\nA  P01.03 an admin\'s Tools menu (control)');
    const tools = await page.evaluate(async () => { const t = document.querySelector('#crBanner .cbdd[data-dd="tools"]'); t.click(); await new Promise(r => setTimeout(r, 300));
      const items = [...t.querySelectorAll('.cbi')].filter(i => getComputedStyle(i).display !== 'none').map(i => i.getAttribute('data-go')); document.body.click(); return items; });
    ok(tools.includes('reports') && tools.includes('settings'), 'A  admin: Tools still shows Reports and Settings', tools);
    const prodMenu = await page.evaluate(() => { const g = k => { const e = document.querySelector('#crBanner .cbi[data-go="' + k + '"] svg'); return e ? e.innerHTML : null; }; return { d: g('dispatch'), s: g('schedule'), p: g('prodboard') }; });
    ok(prodMenu.d && prodMenu.s && prodMenu.d !== prodMenu.s, 'C  banner Production menu: Crew Dispatch and Schedule Board are drawn differently', !!prodMenu.d);

    console.log('\nC  P01.14 / P06.03 drawer glyphs (theo)');
    for (const crm of ['retail', 'community', 'insurance']) {
      await page.evaluate(c => { try { if (c === 'community') window.CardinalCommunityHub.show(); else if (c === 'insurance') window.showCardinalTruth(); else window.showHome(); } catch (e) {} }, crm);
      await page.waitForTimeout(900);
      await openDrawer(page);
      const rows = await drawerRows(page), vis = rows.filter(r => r.shown);
      const head = await page.evaluate(() => document.body.dataset.crmHead || document.body.dataset.crm);
      ok(vis.length >= 20, `C  ${crm}: the drawer drew its rows (crm-head ${head})`, vis.length);
      const bare = vis.filter(r => !r.svg || r.emoji).map(r => r.t);
      ok(bare.length === 0, `C  ${crm}: every visible row is a drawn glyph with no emoji`, bare.join(' | ') || 'none');
      const by = {}; vis.forEach(r => { (by[r.glyph] = by[r.glyph] || []).push(r.t); });
      const dup = Object.values(by).filter(a => a.length > 1).map(a => a.join(' = '));
      ok(dup.length === 0, `C  ${crm}: no two visible rows share a glyph`, dup.join(' ; ') || 'none');
      if (crm === 'retail') { const anyEmo = rows.filter(r => r.emoji).map(r => r.t); ok(anyEmo.length === 0, 'C  no drawer row anywhere carries an emoji (shown or folded away by portal)', anyEmo.join(' | ') || 'none'); }
      /* L, dark */
      const pr = await pressed(page);
      LAB['dark:' + head] = pr;
      await closeDrawer(page);
    }

    console.log('\nE  J15.02 the Production row lines up (390)');
    {
      await page.evaluate(() => window.showHome()); await page.waitForTimeout(600); await openDrawer(page);
      const x = await page.evaluate(() => {
        const tx = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (n.textContent.trim()) { const r = document.createRange(); r.selectNodeContents(n); const q = r.getClientRects()[0]; return q ? Math.round(q.left * 10) / 10 : null; } } return null; };
        const rows = [...document.querySelectorAll('#navMenu > .navopt')].filter(e => e.getBoundingClientRect().height > 0 && e.querySelector('svg'));
        const p = document.getElementById('cr-nav-production');
        const sib = ['clients', 'leads', 'board'].map(k => tx(document.querySelector('#navMenu .navopt[data-nav="' + k + '"]')));
        return { prod: p ? tx(p) : null, sib, n: rows.length };
      });
      ok(x.prod != null && x.sib.every(v => v != null && Math.abs(v - x.prod) <= 1), 'E  390: "Production" starts within 1px of Clients / Leads / Schedule', x);
      await closeDrawer(page);
    }

    console.log('\nD  P06.08 / J15.10 leftover emoji');
    {
      const ct = await page.evaluate(EMO => { const re = new RegExp(EMO, 'u'); return [...document.querySelectorAll('#pContractMenu .estopt')].map(b => ({ t: b.textContent.trim(), e: re.test(b.textContent) })); }, EMO);
      ok(ct.length === 3 && ct.every(c => !c.e), 'D  "+ New contract" menu: three rows, no emoji', ct.map(c => c.t));
      const today = await page.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
      await page.evaluate(t => { window.cacheAppts.push(
        { id: 'gA1a', appt_date: t, appt_time: '09:00:00', title: 'Tear-off day', kind: 'job', project_id: 'R1', notes: 'two layers', created_by: 'theo@cardinalrenovations.net' },
        { id: 'gA1b', appt_date: t, appt_time: '11:00:00', title: 'Shingles', kind: 'drop', project_id: 'R1', notes: null, created_by: 'theo@cardinalrenovations.net' },
        { id: 'gA1c', appt_date: t, appt_time: '15:00:00', title: 'Walk the roof', kind: 'appt', project_id: null, notes: null, created_by: 'theo@cardinalrenovations.net' }); }, today);
      await page.evaluate(() => window.openProject('R1')); await page.waitForTimeout(1200);
      const ap = await page.evaluate(EMO => { const re = new RegExp(EMO, 'u'); try { renderApptsPage(); } catch (e) { return { err: e.message }; }
        return [...document.querySelectorAll('#apMount .tskrow')].map(r => ({ svg: !!r.querySelector('span svg'), e: re.test(r.textContent), t: r.textContent.trim().slice(0, 30) })); }, EMO);
      ok(Array.isArray(ap) && ap.length >= 2 && ap.every(r => r.svg && !r.e), 'D  profile Appointments rows (R1 has two): a drawn kind glyph, no emoji', ap);

      console.log('\nG  P08.06 Schedule day sheet');
      await page.evaluate(() => { try { window.showHome(); } catch (e) {} }); await page.waitForTimeout(500);
      const g = await page.evaluate(async ([t, EMO]) => {
        const re = new RegExp(EMO, 'u'); openApptDay(t); await new Promise(r => setTimeout(r, 400));
        const title = document.getElementById('apptDayTitle');
        const opts = [...document.querySelectorAll('#apptKind option')].map(o => o.textContent);
        const rows = [...document.querySelectorAll('#apptList .apptrow small')].map(s => s.textContent.trim());
        const sel = document.getElementById('apptKind'), cs = getComputedStyle(sel), cv = document.createElement('canvas').getContext('2d');
        cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        const need = Math.ceil(cv.measureText(sel.options[sel.selectedIndex].textContent).width) + 24;
        const out = { tSvg: !!title.querySelector('svg'), tEmo: re.test(title.textContent), title: title.textContent.trim().slice(0, 40), optEmo: opts.filter(o => re.test(o)), rows, need, have: sel.clientWidth };
        document.getElementById('apptModal').style.display = 'none'; return out;
      }, [today, EMO]);
      ok(g.tSvg && !g.tEmo, 'G  the title is a drawn calendar, no emoji', g.title);
      ok(g.optEmo.length === 0, 'G  the Type options carry no emoji', g.optEmo);
      ok(g.rows.length === 3 && /^Job\b/.test(g.rows[0]) && /^Material Drop\b/.test(g.rows[1]) && /^Appointment\b/.test(g.rows[2]), 'G  each row names its kind first', g.rows);
      ok(g.need <= g.have, 'G  Normal: the Type select is wide enough for "Appointment"', { need: g.need, have: g.have });
    }

    console.log('\nF  390: the Community job menu keeps the page gutter with the app font');
    {
      await page.evaluate(() => window.openProject('C1')); await page.waitForTimeout(1600);
      const jm = await page.evaluate(() => { const t = [...document.querySelectorAll('#cr-cc .cc-jmb')]; if (!t.length) return { err: 'no tiles' };
        const r = Math.min(...t.map(b => innerWidth - b.getBoundingClientRect().right)), l = Math.min(...t.map(b => b.getBoundingClientRect().left));
        return { left: Math.round(l * 10) / 10, right: Math.round(r * 10) / 10, cut: [...document.querySelectorAll('#cr-cc .cc-jmb .l')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent.trim()), ff: getComputedStyle(t[0]).fontFamily }; });
      ok(!jm.err && jm.left >= 16 && jm.right >= 15.5 && jm.cut.length === 0, 'F  390: tiles inside the 16px gutter, no label cut', jm);
    }

    console.log('\nK  P12.09 the stage arrow asks with a verb');
    {
      await page.evaluate(() => window.openProject('R1')); await page.waitForTimeout(1200);
      const k = await page.evaluate(async () => {
        const a = document.querySelector('#stageBanner .stgarrow[data-dir="1"]'); if (!a) return { err: 'no forward arrow' };
        a.click(); await new Promise(r => setTimeout(r, 500));
        const n = document.getElementById('crAsk'); if (!n || !n.classList.contains('open')) return { err: 'no sheet' };
        const go = n.querySelector('.askgo').textContent, q = n.querySelector('.askq').textContent; n.querySelector('.askno').click(); return { go, q };
      });
      ok(!k.err && k.go === 'Advance', 'K  "Advance to …?" offers Advance, not Continue', k);
    }

    console.log('\nD  the Resource Library buttons');
    {
      await page.evaluate(() => { try { window.showResourceLibrary(); } catch (e) {} }); await page.waitForTimeout(1800);
      const lb = await page.evaluate(EMO => { const re = new RegExp(EMO, 'u'); return ['cr-rltoc-btn', 'cr-nachi-mgr-btn', 'rlAskBtn'].map(id => { const b = document.getElementById(id); return b ? { id, e: re.test(b.textContent), svg: !!b.querySelector('svg'), t: b.textContent.trim() } : { id, missing: true }; }); }, EMO);
      lb.forEach(b => ok(!b.missing && !b.e && b.svg, `D  Library #${b.id}: drawn, no emoji`, b));
    }
    await browser.close();
  }

  /* ───────────────────────────── theo light + Sun: L */
  for (const theme of ['1', 'sun']) {
    const { browser, page } = await boot('theo', { theme });
    for (const crm of ['retail', 'community', 'insurance']) {
      await page.evaluate(c => { try { if (c === 'community') window.CardinalCommunityHub.show(); else if (c === 'insurance') window.showCardinalTruth(); else window.showHome(); } catch (e) {} }, crm);
      await page.waitForTimeout(800); await openDrawer(page);
      const head = await page.evaluate(() => (document.body.dataset.crmHead || document.body.dataset.crm) + (document.documentElement.getAttribute('data-cr-sun') ? '+sun' : ''));
      LAB[(theme === '1' ? 'light:' : 'sun:') + head] = await pressed(page);
      await closeDrawer(page);
    }
    await browser.close();
  }
  /* ───────────────────────────── Curtis, phone, dark: C L */
  {
    const { browser, page } = await boot('curtis', { theme: '0' });
    /* he boots onto the Production board: the production portal, measured there first */
    await page.evaluate(() => { try { window.CardinalProduction.open(); } catch (e) {} }); await page.waitForTimeout(900);
    await openDrawer(page);
    LAB['dark:' + await page.evaluate(() => document.body.dataset.crmHead || document.body.dataset.crm)] = await pressed(page);
    await closeDrawer(page);
    await page.evaluate(() => { try { window.CardinalProduction && window.CardinalProduction.close && window.CardinalProduction.close(false); } catch (e) {} try { window.showHome(); } catch (e) {} });
    await page.waitForTimeout(800); await openDrawer(page);
    const rows = await drawerRows(page), vis = rows.filter(r => r.shown);
    const head = await page.evaluate(() => document.body.dataset.crmHead || document.body.dataset.crm);
    ok(vis.length >= 12, `C  Curtis: the drawer drew its rows (crm-head ${head})`, vis.length);
    ok(vis.every(r => r.svg && !r.emoji), 'C  Curtis: every visible row is drawn, no emoji', vis.filter(r => !r.svg || r.emoji).map(r => r.t).join(' | ') || 'none');
    const by = {}; vis.forEach(r => { (by[r.glyph] = by[r.glyph] || []).push(r.t); });
    const dup = Object.values(by).filter(a => a.length > 1).map(a => a.join(' = '));
    ok(dup.length === 0, 'C  Curtis: no two visible rows share a glyph', dup.join(' ; ') || 'none');
    await browser.close();
  }

  console.log('\nL  J16.06 the drawer\'s pressed toggles follow the portal');
  {
    /* 1441: retail stays on the red fallback (#c8202e) — the slate change is held for Theo */
    const want = { retail: [200, 32, 46], insurance: [200, 32, 46], community: [4, 120, 87], production: [150, 86, 12] };
    for (const k of Object.keys(LAB)) {
      const [mode, head] = k.split(':'); const crm = head.replace('+sun', '');
      const p = LAB[k];
      ok(p.length === 2, `L  ${k}: two pressed toggles found`, p.map(x => x.t));
      const ratios = p.map(x => { const a = rgbOf(x.bg), b = rgbOf(x.fg); return a && b ? Math.round(contrast(a, b) * 100) / 100 : 0; });
      ok(ratios.every(r => r >= 4.5), `L  ${k}: label on the pressed fill >= 4.5:1`, { ratios, bg: p.map(x => x.bg) });
      if (mode !== 'sun' && want[crm]) {
        const got = rgbOf(p[0] && p[0].bg);
        ok(!!got && got.every((v, i) => Math.abs(v - want[crm][i]) <= 1), `L  ${k}: the fill is the ${crm} portal colour`, p[0] && p[0].bg);
      }
    }
    ok(['dark:retail', 'dark:community', 'dark:insurance', 'dark:production'].every(k => LAB[k]) && Object.keys(LAB).some(k => k.startsWith('sun:')) && Object.keys(LAB).some(k => k.startsWith('light:')), 'L  measured in dark (four portals, Production as Curtis), light and Sun', Object.keys(LAB));
  }

  /* ───────────────────────────── theo, desktop: E F */
  {
    const { browser, page } = await boot('theo', { desktop: true, width: 1536 });
    console.log('\nF  J15.03 / P06.05 fonts (1536)');
    await page.evaluate(() => window.showHome()); await page.waitForTimeout(900);
    const rail = await page.evaluate(() => { const h = document.getElementById('cr-lnav'); const it = h ? [...h.querySelectorAll('.lnav-item')].filter(e => e.getBoundingClientRect().height > 0) : [];
      return { n: it.length, host: h ? getComputedStyle(h).fontFamily : null, odd: it.filter(e => getComputedStyle(e).fontFamily !== getComputedStyle(h).fontFamily).length, sample: it[0] ? getComputedStyle(it[0]).fontFamily : null }; });
    ok(rail.n >= 8 && rail.odd === 0, 'F  every rail row inherits the rail\'s font', rail);
    await page.evaluate(() => window.openProject('C1')); await page.waitForTimeout(1600);
    const f = await page.evaluate(() => {
      const a = document.getElementById('addProjectBtn'); const ap = a && a.getBoundingClientRect().width ? { me: getComputedStyle(a).fontFamily, up: getComputedStyle(a.parentElement).fontFamily } : null;
      const l = document.querySelector('#cr-cc .cc-jmb .l'), n = document.querySelector('#cr-cc .cc-jmb .n'), cc = document.getElementById('cr-cc');
      return { ap, l: l && getComputedStyle(l).fontFamily, n: n && getComputedStyle(n).fontFamily, num: n && getComputedStyle(n).fontVariantNumeric, cc: cc && getComputedStyle(cc).fontFamily, tiles: document.querySelectorAll('#cr-cc .cc-jmb').length };
    });
    ok(!!f.ap && f.ap.me === f.ap.up, 'F  the header + inherits the header\'s font', f.ap);
    ok(f.tiles >= 4 && f.l === f.cc, 'F  Community job-menu tile labels inherit the page font', { l: f.l, page: f.cc, tiles: f.tiles });
    ok(!!f.n && f.n === f.cc && /tabular-nums/.test(f.num || ''), 'F  the tile counts: the page font, tabular figures', { n: f.n, num: f.num });

    console.log('\nE  J15.02 the Production row lines up (1536 popover)');
    await page.evaluate(() => window.showHome()); await page.waitForTimeout(700);
    const st = await openDrawer(page);
    const x = await page.evaluate(() => {
      const tx = el => { if (!el) return null; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (n.textContent.trim()) { const r = document.createRange(); r.selectNodeContents(n); const q = r.getClientRects()[0]; return q ? Math.round(q.left * 10) / 10 : null; } } return null; };
      return { prod: tx(document.getElementById('cr-nav-production')), sib: ['clients', 'leads', 'board'].map(k => tx(document.querySelector('#navMenu .navopt[data-nav="' + k + '"]'))) };
    });
    ok(st === 'block' && x.prod != null && x.sib.every(v => v != null && Math.abs(v - x.prod) <= 1), 'E  1536: "Production" starts within 1px of its siblings', Object.assign({ open: st }, x));
    await browser.close();
  }

  /* ───────────────────────────── Punch & Repairs at four text steps: H; the day sheet at Larger: G */
  console.log('\nH  P08.12 Punch & Repairs');
  for (const [lab, o] of [['Normal', {}], ['Large', { text: 'lg' }], ['Larger', { text: 'xl' }], ['Sun', { theme: 'sun' }], ['Sun + Larger', { theme: 'sun', text: 'xl' }]]) {
    const { browser, page } = await boot('theo', o);
    const r = await page.evaluate(async EMO => {
      const re = new RegExp(EMO, 'u'); await window.openPunchView(); await new Promise(r => setTimeout(r, 900));
      const box = document.querySelector('#punchView .pu-srch'), inp = document.getElementById('puSearch'), cs = getComputedStyle(inp);
      const cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const need = Math.ceil(cv.measureText(inp.placeholder).width), have = inp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return { svg: !!box.querySelector('svg'), emo: re.test(box.textContent), need, have, ph: inp.placeholder, text: document.documentElement.getAttribute('data-cr-text'), sun: document.documentElement.getAttribute('data-cr-sun') };
    }, EMO);
    if (lab === 'Normal') ok(r.svg && !r.emo, 'H  the search box draws its glyph, no emoji', r);
    if (lab === 'Large' || lab === 'Larger') ok(r.text === o.text, `H  ${lab}: the text size is actually set`, r.text);
    if (lab.startsWith('Sun')) ok(r.sun === '1', `H  ${lab}: Sun is actually on`, r.sun);
    ok(r.need <= r.have, `H  ${lab}: the search hint fits its box`, { need: r.need, have: r.have, ph: r.ph });
    if (lab === 'Larger') {
      const g = await page.evaluate(() => { const d = new Date(), t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        try { window.showHome(); } catch (e) {} openApptDay(t); const sel = document.getElementById('apptKind'), cs = getComputedStyle(sel), cv = document.createElement('canvas').getContext('2d');
        cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; const need = Math.ceil(cv.measureText(sel.options[sel.selectedIndex].textContent).width) + 24; return { need, have: sel.clientWidth }; });
      ok(g.need <= g.have, 'G  Larger: the Type select is wide enough for "Appointment"', g);
    }
    await browser.close();
  }

  /* ───────────────────────────── static: J K */
  console.log('\nJ  P12.02 success toasts pass \'ok\'');
  for (const [re, lab] of [[/crTell\('Uploaded ' \+ list\.length \+ ' work orders\.'(, 'ok')?\)/, 'Uploaded N work orders.'],
                           [/crTell\('Imported ' \+ newSeries[\s\S]{0,200}?take over\.'(, 'ok')?\)/, 'Imported N new series…'],
                           [/crTell\('Texted the pay link to ' \+ \(pr\.name \|\| 'the client'\) \+ '\.'(, 'ok')?\)/, 'Texted the pay link…']]) {
    const m = re.exec(HTML);
    ok(!!m && !!m[1], `J  "${lab}" passes 'ok'`, m ? m[0].slice(-40) : 'call not found');
  }
  console.log('\nK  P12.09 no question falls back to "Continue"');
  {
    const ts = require(execSync('npm root -g').toString().trim() + '/typescript');
    const VERBS = ['delete', 'remove', 'discard', 'clear', 'archive', 'reset', 'overwrite', 'replace', 'send', 'email', 'switch', 'move', 'close', 'mark', 'log', 'download', 'finish'];
    const leadVerb = msg => { const m = /^\s*[^\w]*([A-Za-z]+)/.exec(String(msg || '')); return m && VERBS.includes(m[1].toLowerCase().replace(/ing$/, '')); };
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi; let m; let total = 0; const fall = [];
    while ((m = re.exec(HTML))) {
      const sf = ts.createSourceFile('x.js', m[1], ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      const visit = n => {
        if (ts.isCallExpression(n) && n.arguments.length) {
          const c = n.expression, name = ts.isIdentifier(c) ? c.text : (ts.isPropertyAccessExpression(c) && c.name.text === 'crAsk' ? 'crAsk' : null);
          if (name && /^(crAsk|ask|_ask|jpAsk)$/.test(name)) {
            total++;
            let x = n.arguments[0]; while (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.PlusToken) x = x.left;
            const lead = (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) ? x.text : null;
            const opt = n.arguments[1] ? n.arguments[1].getText() : '';
            if (lead != null && !/\b(verb|choices)\s*:/.test(opt) && !leadVerb(lead.split(/\n\s*\n/)[0])) fall.push(lead.slice(0, 40));
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    ok(total >= 100, 'K  the parse found the crAsk calls (>= 100)', total);
    ok(fall.length === 0, 'K  no crAsk question with a verbless lead and no verb option', fall.length + ': ' + fall.slice(0, 8).join(' | '));
  }
} catch (e) { ok(false, 'gate threw: ' + String(e && e.message || e).split('\n')[0].slice(0, 220)); }
const total = passes + fails.length;
if (total < 70) { fails.push(`only ${total} checks ran (floor 70)`); console.log(`  ✗ FAIL only ${total} checks ran (floor 70)`); }
console.log(`\n${fails.length ? 'GATE 1441 RED' : 'GATE 1441 GREEN'} — ${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
