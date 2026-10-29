/* gate_G.mjs [index.html] — Builder G: audit items #7 #11 #16 #17 #22 #23 #24, measured in Chromium.
 *
 *   NODE_PATH=<jsd>/node_modules:$(npm root -g) node gate_G.mjs [index.html]
 *
 * Everything here is a MEASUREMENT of the running app — hit-tests with elementFromPoint, what is
 * visible, which toasts fired, what the mock database recorded — never a grep of the source.
 * Every group is wrapped so a crash on an old tree becomes a NAMED failure (BUG_CLASSES 37), and
 * every group has a control the old tree passes, so a red is the defect and not the rig.
 *
 * Negative control: point it at base1428.html — each item goes RED by name, no crash.
 * theo / joan / rep boot through gate_1403_lib; curtis / scottie through gate_1400_lib.
 */
import fs from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
if (!fs.existsSync(FILE)) { console.log('gate_G: no such file ' + FILE); process.exit(2); }
process.env.APPFILE = FILE;
const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const L3 = await import(S + 'gate_1403_lib.mjs');
const L0 = await import(S + 'gate_1400_lib.mjs');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 540000);

let fails = 0, passes = 0; const red = [];
const ok = (c, name, info) => { if (c) { passes++; console.log('  ok   ' + name); } else { fails++; red.push(name); console.log('  FAIL ' + name + (info ? '  :: ' + String(info).slice(0, 400) : '')); } };
async function group(title, fn) {
  console.log('\n── ' + title);
  try { await fn(); } catch (e) { fails++; red.push(title + ' (crashed)'); console.log('  FAIL ' + title + ' crashed: ' + String(e && e.message || e).split('\n')[0].slice(0, 300)); }
}
const LIGHT = "try{localStorage.setItem('cardinal.theme.rb','1')}catch(e){}";
const DARK = "try{localStorage.setItem('cardinal.theme.rb','0')}catch(e){}";
const pause = (p, ms) => p.waitForTimeout(ms);
const ev = async (p, fn, arg) => { try { return await p.evaluate(fn, arg); } catch (e) { return 'EVERR ' + String(e.message).split('\n')[0].slice(0, 160); } };
/* the element at the centre of `sel` (first visible match) — is it the element itself or inside it? */
const onTop = (p, sel) => ev(p, (sel) => {
  const el = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  if (!el) return { found: false };
  const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 40);
  const h = document.elementFromPoint(x, y);
  const owner = h ? (h.closest('[id]') || {}).id : null;
  return { found: true, top: !!h && (el === h || el.contains(h)), under: owner };
}, sel);
const toasts = p => ev(p, () => [...document.querySelectorAll('#crToasts .crt')].filter(e => e.getBoundingClientRect().height > 0).map(e => e.className.replace('crt ', '') + ':' + e.textContent.replace('×', '').trim().slice(0, 90)));
const clearToasts = p => ev(p, () => document.querySelectorAll('#crToasts > *').forEach(e => e.remove()));
const shown = (p, id) => ev(p, (id) => { const e = document.getElementById(id); if (!e) return false; const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && e.getClientRects().length > 0 && e.getBoundingClientRect().height > 0; }, id);
const ratio = `window.__ratio=function(a,b){function L(c){var m=c.match(/[\\d.]+/g).map(Number);var r=[m[0],m[1],m[2]].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*r[0]+0.7152*r[1]+0.0722*r[2];}var x=L(a),y=L(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};`;

/* ════════ #7 — + New over Production board / Punch & Repairs / Crew Dispatch (curtis, installed) ════════ */
await group('#7  + New on the production screens (curtis, installed app)', async () => {
  const { browser, page } = await L0.boot('curtis');
  await ev(page, () => document.body.classList.add('standalone')); await pause(page, 400);
  const OPEN = { board: () => window.CardinalProduction.open(), punch: () => window.openPunchView(), disp: () => window.CardinalDispatch.open() };
  for (const nm of ['board', 'punch', 'disp']) {
    await ev(page, OPEN[nm]); await pause(page, 1100);
    const base = await ev(page, () => ({ pb: !!document.querySelector('#cr-pb.open'), dp: !!document.querySelector('#cr-disp.open'), pv: getComputedStyle(document.getElementById('punchView')).display !== 'none' }));
    await page.tap('#pwaNew', { timeout: 3000 }).catch(() => {}); await pause(page, 500);
    const hits = await ev(page, () => { const m = document.getElementById('newMenu'); if (!m || getComputedStyle(m).display === 'none') return null;
      return [...m.querySelectorAll('.navopt')].filter(b => b.getBoundingClientRect().height > 0).map(b => { const q = b.getBoundingClientRect(); const h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { t: b.textContent.trim(), ok: !!h && (b === h || b.contains(h)), under: h ? ((h.closest('[id]') || {}).id) : '' }; }); });
    ok(Array.isArray(hits) && hits.length >= 3 && hits.every(h => h.ok), `#7 ${nm}: every + New option is on top of the screen (hit-test)`, JSON.stringify(hits));
    /* choose Contact: the client form must be the thing on screen, over the view */
    await ev(page, () => { const b = document.querySelector('#newMenu [data-new="contact"]'); if (b && b.getBoundingClientRect().height) b.click(); }); await pause(page, 600);
    const pf = await onTop(page, '#projModal .projform, #projModal form, #projModal > div');
    ok(pf.found && pf.top, `#7 ${nm}: + New → Contact opens the client form ON TOP (hit-test)`, JSON.stringify(pf));
    await ev(page, () => { const c = document.getElementById('pfCancel'); if (c) c.click(); else document.getElementById('projModal').style.display = 'none'; }); await pause(page, 300);
    /* choose Task: the day sheet on top, the production screen still open underneath, no retail home */
    await page.tap('#pwaNew', { timeout: 3000 }).catch(() => {}); await pause(page, 400);
    await ev(page, () => { const b = document.querySelector('#newMenu [data-new="task"]'); if (b && b.getBoundingClientRect().height) b.click(); }); await pause(page, 700);
    const ap = await onTop(page, '#apptModal > div');
    const after = await ev(page, () => ({ pb: !!document.querySelector('#cr-pb.open'), dp: !!document.querySelector('#cr-disp.open'), pv: getComputedStyle(document.getElementById('punchView')).display !== 'none', home: getComputedStyle(document.getElementById('mainView')).display !== 'none' && !!document.querySelector('#mainView .pipecard') && document.getElementById('mainView').getBoundingClientRect().height > 0 }));
    ok(ap.found && ap.top, `#7 ${nm}: + New → Task opens the day sheet ON TOP (hit-test)`, JSON.stringify(ap));
    ok(after.pb === base.pb && after.dp === base.dp && after.pv === base.pv, `#7 ${nm}: + New → Task keeps the production screen open underneath`, JSON.stringify({ base, after }));
    await ev(page, () => { const c = document.getElementById('apptClose'); if (c) c.click(); }); await pause(page, 300);
    await ev(page, () => { try { window.CardinalDispatch.close(); } catch (e) {} try { window.CardinalProduction.close(); } catch (e) {} try { document.getElementById('punchView').style.display = 'none'; } catch (e) {} });
    await pause(page, 300);
  }
  /* control: the header + New still opens and works on the plain home screen for an admin is covered in #11's boot */
  await browser.close();
});

/* ════════ #11 — Escape and Back close the topmost sheet (theo, phone) ════════ */
await group('#11 Escape / Back close the topmost pop-up sheet (theo, phone)', async () => {
  const { browser, page } = await L3.boot('theo', { instr: false, seed: DARK });
  await ev(page, () => window.openProject('R1')); await pause(page, 1400);
  const where = () => ev(page, () => ({ proj: getComputedStyle(document.getElementById('projectView')).display !== 'none', home: getComputedStyle(document.getElementById('mainView')).display !== 'none', view: history.state && history.state.view, len: history.length }));
  const payOpen = () => ev(page, () => { const m = document.getElementById('cr-pay-modal'); return !!(m && m.classList.contains('open') && getComputedStyle(m).display !== 'none'); });
  const openPay = () => ev(page, () => { const b = [...document.querySelectorAll('button')].filter(x => x.offsetParent && /^Record payment$/i.test(x.textContent.trim())); if (b.length) { b[0].click(); return true; } return false; });
  ok(await openPay() === true, '#11 rig: the Record payment button exists on R1');
  await pause(page, 700);
  ok(await payOpen(), '#11 rig: Record payment opened');
  await page.keyboard.press('Escape'); await pause(page, 400);
  ok(!(await payOpen()), '#11 Escape closes Record payment');
  await openPay(); await pause(page, 700);
  const w0 = await where();
  await ev(page, () => history.back()); await pause(page, 1200);
  const w1 = await where();
  ok(!(await payOpen()), '#11 Back closes Record payment', JSON.stringify(w1));
  ok(w1.proj && !w1.home && w1.view === w0.view, '#11 Back leaves the page underneath where it was (still the client)', JSON.stringify({ w0, w1 }));
  await ev(page, () => { const m = document.getElementById('cr-pay-modal'); if (m) m.classList.remove('open'); });
  /* the day sheet (apptModal) — Escape */
  await ev(page, () => { const d = new Date(); window.openApptDay(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')); }); await pause(page, 400);
  ok(await shown(page, 'apptModal'), '#11 rig: the day sheet opened');
  await page.keyboard.press('Escape'); await pause(page, 300);
  ok(!(await shown(page, 'apptModal')), '#11 Escape closes the day sheet');
  /* the lead form — Escape */
  await ev(page, () => window.openLeadForm()); await pause(page, 500);
  ok(await shown(page, 'leadFormModal'), '#11 rig: the lead form opened');
  await page.keyboard.press('Escape'); await pause(page, 300);
  ok(!(await shown(page, 'leadFormModal')), '#11 Escape closes the lead form');
  /* regression: 1341's client form, Escape + Back — each Back test starts on a fresh client page, so one
     red cannot cascade into the controls after it */
  const fresh = async () => { await ev(page, () => { try { window.hideAllViews(); } catch (e) {} window.openProject('R1'); }); await pause(page, 1200); };
  await fresh();
  await ev(page, () => window.openProjModal(null)); await pause(page, 500);
  await page.keyboard.press('Escape'); await pause(page, 300);
  ok(!(await shown(page, 'projModal')), '#11 control: Escape still closes the client form (1341)');
  await fresh();
  await ev(page, () => window.openProjModal(null)); await pause(page, 500);
  const w2 = await where();
  await ev(page, () => history.back()); await pause(page, 1200);
  const w3 = await where();
  ok(!(await shown(page, 'projModal')) && w3.view === w2.view && w3.proj, '#11 control: Back still closes the client form and stays (1341)', JSON.stringify({ w2, w3 }));
  /* regression: crAsk — Escape (its own) and Back */
  await ev(page, () => { window.__askR = 'pending'; window.crAsk('Gate question?').then(v => { window.__askR = v; }); }); await pause(page, 400);
  await page.keyboard.press('Escape'); await pause(page, 300);
  const a1 = await ev(page, () => ({ r: window.__askR, open: !!document.querySelector('#crAsk.open') }));
  ok(a1.r === false && !a1.open, '#11 control: Escape still answers crAsk "no"', JSON.stringify(a1));
  await fresh();
  await ev(page, () => { window.__askR = 'pending'; window.crAsk('Gate question?').then(v => { window.__askR = v; }); }); await pause(page, 400);
  const w4 = await where();
  await ev(page, () => history.back()); await pause(page, 1200);
  const a2 = await ev(page, () => ({ r: window.__askR, open: !!document.querySelector('#crAsk.open') }));
  const w5 = await where();
  ok(a2.r === false && !a2.open && w5.view === w4.view && w5.proj, '#11 Back answers crAsk "no" and the page stays', JSON.stringify({ a2, w4, w5 }));
  /* control: with NO sheet open, Back still navigates (full-screen views keep their Back) */
  await ev(page, () => { const a = document.getElementById('crAsk'); if (a && a.classList.contains('open')) { const b = a.querySelector('button'); if (b) b.click(); } });
  await fresh();
  await ev(page, () => window.openLeadsView()); await pause(page, 900);
  await ev(page, () => history.back()); await pause(page, 1300);
  const w6 = await where();
  ok(w6.proj, '#11 control: with no sheet open Back still walks back (leads → the client)', JSON.stringify(w6));
  /* the drawer is a sheet too: Back closes it and leaves the page (its backdrop drops a frame late) */
  await ev(page, () => window.openClientsDirectory()); await pause(page, 800);
  await ev(page, () => document.getElementById('navBtn').click()); await pause(page, 600);
  const d0 = await ev(page, () => ({ drawer: document.getElementById('navMenu').style.display, view: history.state && history.state.view }));
  await ev(page, () => history.back()); await pause(page, 1300);
  const d1 = await ev(page, () => ({ drawer: document.getElementById('navMenu').style.display, view: history.state && history.state.view, clients: getComputedStyle(document.getElementById('clientsView')).display !== 'none' }));
  ok(d0.drawer === 'block' && d1.drawer !== 'block' && d1.view === d0.view && d1.clients, '#11 Back with the drawer open closes the drawer and the page stays', JSON.stringify({ d0, d1 }));
  /* control: a sheet that records its OWN history entry (Suppliers) still leaves on ONE Back — closing
     it and stepping forward would leave a dead entry and a second Back that does nothing */
  await ev(page, () => window.showHome()); await pause(page, 700);
  await ev(page, () => window.CardinalABC && window.CardinalABC.open()); await pause(page, 900);
  const s0 = await ev(page, () => ({ abc: getComputedStyle(document.getElementById('cr-abc')).display !== 'none', view: history.state && history.state.view }));
  await ev(page, () => history.back()); await pause(page, 1300);
  const s1 = await ev(page, () => ({ abc: getComputedStyle(document.getElementById('cr-abc')).display !== 'none', view: history.state && history.state.view, home: getComputedStyle(document.getElementById('mainView')).display !== 'none' }));
  ok(s0.abc && s0.view === 'suppliers' && !s1.abc && s1.view !== 'suppliers' && s1.home, '#11 control: one Back leaves Suppliers (its own history entry) for home', JSON.stringify({ s0, s1 }));
  await browser.close();
});

/* ════════ #16b — the Front Door: a close button, Escape, ink in both themes ════════ */
await group('#16b the Front Door closes (theo)', async () => {
  for (const [theme, pre] of [['dark', DARK], ['light', LIGHT]]) {
    const { browser, page } = await L3.boot('theo', { instr: false, seed: pre });
    await page.evaluate(ratio);
    const th = await ev(page, () => document.documentElement.getAttribute('data-theme'));
    ok(theme === 'dark' ? th !== 'rb-light' : th === 'rb-light', `#16b rig: ${theme} set through localStorage (data-theme=${th})`);
    const isOpen = () => ev(page, () => !!(window.CardinalFrontDoor && window.CardinalFrontDoor.isOpen()));
    await ev(page, () => window.CardinalFrontDoor.open()); await pause(page, 500);
    ok(await isOpen(), `#16b rig: Front Door opened (${theme})`);
    const x = await ev(page, () => { const f = document.getElementById('cr-fd'); const b = f && [...f.querySelectorAll('button,[role=button]')].find(e => /^(close|cancel)/i.test(e.getAttribute('aria-label') || '') || /^(✕|×|close|done)$/i.test(e.textContent.trim()));
      if (!b) return null; const r = b.getBoundingClientRect(); const col = getComputedStyle(b).color;
      let g = b, bg = null; while (g) { const c = getComputedStyle(g).backgroundColor; if (!/rgba\(0, 0, 0, 0\)/.test(c) && !/, 0\)$/.test(c)) { bg = c; break; } g = g.parentElement; }
      const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { w: Math.round(r.width), h: Math.round(r.height), col, bg, cr: bg ? window.__ratio(col, bg) : 0, top: !!h && (b === h || b.contains(h)) }; });
    ok(!!x, `#16b the Front Door has a close button (${theme})`, JSON.stringify(x));
    if (x) {
      ok(x.w >= 44 && x.h >= 44 && x.top, `#16b the close button is a 44px tap target, on top (${theme})`, JSON.stringify(x));
      ok(x.cr >= 4.5, `#16b the close button ink clears 4.5:1 (${theme}) — ${x.cr.toFixed(2)}:1`, JSON.stringify(x));
      await ev(page, () => { const f = document.getElementById('cr-fd'); const b = [...f.querySelectorAll('button')].find(e => /^close/i.test(e.getAttribute('aria-label') || '')); if (b) b.click(); }); await pause(page, 300);
      ok(!(await isOpen()), `#16b tapping it closes the Front Door (${theme})`);
    }
    await ev(page, () => window.CardinalFrontDoor.open()); await pause(page, 400);
    await page.keyboard.press('Escape'); await pause(page, 400);
    ok(!(await isOpen()), `#16b Escape closes the Front Door (${theme})`);
    await browser.close();
  }
});

/* ════════ #16a — Switch portal keeps your place ════════ */
await group('#16a Switch portal from Community (theo, phone)', async () => {
  const { browser, page } = await L3.boot('theo', { instr: false });
  const S = () => ev(page, () => ({ crm: document.body.dataset.crm, fd: !!(window.CardinalFrontDoor && window.CardinalFrontDoor.isOpen()), tick: (document.querySelector('#cr-fd .fdrow[aria-current="true"]') || {}).getAttribute ? document.querySelector('#cr-fd .fdrow[aria-current="true"]').getAttribute('data-fd') : null }));
  await ev(page, () => window.CardinalFrontDoor.open()); await pause(page, 600);
  await page.locator('#cr-fd [data-fd="community"]').tap({ timeout: 3000 }).catch(() => {}); await pause(page, 900);
  const s0 = await S();
  ok(s0.crm === 'community' && !s0.fd, '#16a rig: in Community after the Front Door pick', JSON.stringify(s0));
  await ev(page, () => document.getElementById('navBtn').click()); await pause(page, 500);
  await ev(page, () => { const s = [...document.querySelectorAll('#navMenu .navsec')].find(x => /daily/i.test(x.textContent)); if (s && s.getAttribute('aria-expanded') !== 'true') s.click(); }); await pause(page, 400);
  let tapped = false; try { await page.locator('#navMenu .navopt[data-nav="landing"]').tap({ timeout: 3000 }); tapped = true; } catch (e) {}
  await pause(page, 1000);
  const s1 = await S();
  ok(tapped, '#16a rig: the Switch portal row was tapped');
  ok(s1.fd, '#16a Switch portal opens the Front Door', JSON.stringify(s1));
  ok(s1.crm === 'community', '#16a …and the page underneath stays Community (was dropped to Retail)', JSON.stringify(s1));
  ok(s1.tick === s1.crm, '#16a …and the picker ticks the portal you are actually in', JSON.stringify(s1));
  await page.keyboard.press('Escape'); await pause(page, 600);
  const s2 = await S();
  ok(!s2.fd && s2.crm === 'community', '#16a dismissing the picker leaves you in Community', JSON.stringify(s2));
  await browser.close();
});

/* ════════ #16c — a rep's drawer counts what the rep can see ════════ */
await group('#16c drawer section counts (rep, phone)', async () => {
  const { browser, page } = await L3.boot('rep', { instr: false });
  await ev(page, () => document.getElementById('navBtn').click()); await pause(page, 500);
  for (let i = 0; i < 14; i++) { const n = await ev(page, () => { const s = [...document.querySelectorAll('#navMenu .navsec[aria-expanded=false]')].filter(x => getComputedStyle(x).display !== 'none')[0]; if (!s) return 0; s.click(); return 1; }); if (!n) break; await pause(page, 150); }
  const secs = await ev(page, () => { const out = []; let cur = null;
    [...document.getElementById('navMenu').children].forEach(el => {
      if (el.classList.contains('navsec')) { cur = { sec: el.textContent.trim().slice(0, 18), shown: getComputedStyle(el).display !== 'none', badge: el.getAttribute('data-crcount'), visible: 0 }; out.push(cur); return; }
      if (!cur || !el.classList.contains('navopt')) return;
      if (getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0) cur.visible++; });
    return out.filter(s => s.shown); });
  ok(Array.isArray(secs) && secs.length >= 4, '#16c rig: the rep drawer has headings', JSON.stringify(secs));
  if (Array.isArray(secs)) for (const s of secs) ok(String(s.visible) === String(s.badge), `#16c "${s.sec}" counts ${s.badge} and shows ${s.visible}`, JSON.stringify(s));
  if (Array.isArray(secs)) ok(secs.every(s => s.visible > 0), '#16c no visible heading is empty for a rep', JSON.stringify(secs.filter(s => !s.visible)));
  await browser.close();
});

/* ════════ #16d — Tools offers a rep only doors that open ════════ */
await group('#16d Tools doors (rep vs theo)', async () => {
  for (const who of ['rep', 'theo']) {
    const { browser, page } = await L3.boot(who, { instr: false, desktop: true });
    await ev(page, () => { window.__G_T = []; const o = window.crTell; window.crTell = function (m, k) { window.__G_T.push(String(m)); return o.apply(this, arguments); }; });
    const items = await ev(page, () => { const dd = document.querySelector('#crBanner [data-dd="tools"]'); dd.click(); return [...dd.querySelectorAll('[data-go]')].filter(e => e.getBoundingClientRect().height > 0).map(e => e.getAttribute('data-go')); });
    await ev(page, () => document.body.click());
    const doors = ['walk', 'itellab', 'medmig'];
    if (who === 'theo') { ok(Array.isArray(items) && doors.every(d => items.includes(d)), '#16d control: theo still has Field Walkthrough, iTel Lab Results and Migrate Legacy Photos', JSON.stringify(items)); await browser.close(); continue; }
    ok(Array.isArray(items) && items.length >= 6, '#16d rig: the rep Tools menu opens', JSON.stringify(items));
    const refused = [];
    for (const go of (Array.isArray(items) ? items : [])) {
      if (['selfcheck', 'whatsnew', 'feedback'].includes(go) && !doors.includes(go)) { /* opening is harmless; still tapped below */ }
      await ev(page, (go) => { window.__G_T = []; const dd = document.querySelector('#crBanner [data-dd="tools"]'); dd.click(); const el = dd.querySelector('[data-go="' + go + '"]'); if (el) el.click(); }, go);
      await pause(page, 450);
      const t = await ev(page, () => window.__G_T.slice());
      if (Array.isArray(t) && t.some(m => /admin only/i.test(m))) refused.push(go);
      await ev(page, () => { document.querySelectorAll('#crToasts > *,.cr-medmig-bg').forEach(e => e.remove()); try { window.hideAllViews(); window.showHome(); } catch (e) {} });
      await page.keyboard.press('Escape'); await pause(page, 150);
    }
    ok(refused.length === 0, '#16d no Tools door answers a rep "Admin only."', JSON.stringify(refused));
    ok(Array.isArray(items) && !doors.some(d => items.includes(d)), '#16d the three admin doors are not offered to a rep', JSON.stringify(items));
    await browser.close();
  }
});

/* ════════ #17 — the field account (scottie, installed) ════════ */
await group('#17 the field account (scottie, gate_1400_lib)', async () => {
  const { browser, page } = await L0.boot('scottie');
  await ev(page, () => document.body.classList.add('standalone')); await pause(page, 300);
  ok(await ev(page, () => document.body.classList.contains('cr-field')), '#17 rig: scottie is a field account (body.cr-field)');
  const w0 = await ev(page, () => (window.__WRITES__ || []).length);
  await ev(page, () => window.CardinalDispatch.open()); await pause(page, 1500);
  const hd = await ev(page, () => ({ crm: document.body.dataset.crm, head: document.body.dataset.crmHead, title: (document.querySelector('#brandTitle') || {}).textContent }));
  ok(hd.crm === 'production' && !/retail/i.test(hd.title || ''), '#17 Crew Dispatch is a Production screen, not "Retail"', JSON.stringify(hd));
  const chip = await ev(page, () => { const j = [...document.querySelectorAll('#cr-disp .job[data-pid]')].find(e => e.getBoundingClientRect().height > 0); return j ? j.getAttribute('data-pid') : null; });
  ok(!!chip, '#17 rig: Dispatch shows a job chip', chip);
  if (chip) {
    await clearToasts(page);
    await page.tap('#cr-disp .job[data-pid="' + chip + '"] .nm', { timeout: 3000 }).catch(() => ev(page, (c) => document.querySelector('#cr-disp .job[data-pid="' + c + '"] .nm').click(), chip));
    await pause(page, 1300);
    const t = await toasts(page);
    const st = await ev(page, () => ({ pk: !!document.querySelector('#cr-pk.open'), disp: !!document.querySelector('#cr-disp.open'), crm: document.body.dataset.crm }));
    const pkTop = st.pk ? await onTop(page, '#cr-pk') : { top: false };
    ok(Array.isArray(t) && !t.some(x => /^err/.test(x)), '#17 tapping a Dispatch job gives no red error', JSON.stringify(t));
    ok(st.pk ? pkTop.top : (Array.isArray(t) && t.some(x => /^info/.test(x))), '#17 …it opens that job\'s punch card on top (or says plainly there is none)', JSON.stringify({ st, pkTop, t }));
    ok(st.disp, '#17 …and Dispatch is still there underneath (he keeps his place)', JSON.stringify(st));
    if (st.pk) {
      const money = await ev(page, () => /\$\s?\d/.test(document.getElementById('cr-pk').innerText));
      ok(money === false, '#17 the punch card shows him no dollar figure (production sees no money)');
      await ev(page, () => { try { window.CardinalPunchCard.close(); } catch (e) {} }); await pause(page, 300);
    }
  }
  /* Dispatch stays read-only for him (1416): nothing he tapped wrote a crew booking */
  const wo = await ev(page, (w0) => (window.__WRITES__ || []).slice(w0).filter(w => /crew_work_orders/.test(w.table || '')).length, w0);
  ok(wo === 0, '#17 Dispatch stayed read-only — no crew_work_orders write', wo);
  await ev(page, () => { try { window.CardinalDispatch.close(); } catch (e) {} }); await pause(page, 600);
  /* the board's Today rows: the third way into a job */
  await clearToasts(page);
  const dj = await ev(page, () => { const b = [...document.querySelectorAll('#cr-pb [data-job]')].find(e => e.getBoundingClientRect().height > 0); if (!b) return null; b.click(); return b.getAttribute('data-job'); });
  await pause(page, 1100);
  if (dj) { const t2 = await toasts(page); ok(Array.isArray(t2) && !t2.some(x => /^err/.test(x)), '#17 the board\'s job row gives no red error', JSON.stringify(t2)); await ev(page, () => { try { window.CardinalPunchCard.close(); } catch (e) {} }); }
  else ok(true, '#17 (no job row on his board in this seed)');
  /* Quick jump: not his door */
  await ev(page, () => document.getElementById('navBtn').click()); await pause(page, 600);
  const dr = await ev(page, () => { const out = []; let cur = null;
    [...document.getElementById('navMenu').children].forEach(el => {
      if (el.classList.contains('navsec')) { cur = { sec: el.textContent.trim().slice(0, 18), shown: getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0, rows: 0 }; out.push(cur); return; }
      if (cur && el.classList.contains('navopt') && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0) cur.rows++; });
    const qj = document.getElementById('cr-nav-palette-hint');
    return { empty: out.filter(s => s.shown && !s.rows).map(s => s.sec), shownSecs: out.filter(s => s.shown).map(s => s.sec + ':' + s.rows), qj: !!(qj && qj.getBoundingClientRect().height > 0) }; });
  ok(dr.empty && dr.empty.length === 0, '#17 his drawer shows no heading with nothing under it', JSON.stringify(dr));
  ok(dr.shownSecs && dr.shownSecs.some(x => /^production:3/i.test(x)), '#17 control: his Production heading and its three rows are still there', JSON.stringify(dr));
  ok(dr.qj === false, '#17 Quick jump (every row of which refuses him) is not offered', JSON.stringify(dr));
  await ev(page, () => { document.getElementById('navMenu').style.display = 'none'; try { window.CardinalPalette.open(); } catch (e) {} }); await pause(page, 400);
  const pal = await ev(page, () => !!document.querySelector('.cr-pal-bg'));
  ok(pal === false, '#17 ⌘K does not open the palette for him either');
  await browser.close();
});

/* ════════ #22 + #23 — sheets and the tab bar (theo, installed) ════════ */
await group('#22 #23 the day sheet and the Undo message vs the tab bar (theo, installed)', async () => {
  const { browser, page } = await L3.boot('theo', { instr: false, seed: "(function(){var S=window.__SEED__; if(!S) return; var d=new Date(Date.now()-86400000).toISOString(); S.projects.push({id:'L9',name:'Sample Retail Lead',address:'9 Test Rd',city:'Dayton',state:'OH',zip:'45405',stage:'Lead',crm:'retail',created_by:'theo@cardinalrenovations.net',checklist:JSON.stringify({lead:{claim_type:'retail'}}),created_at:d,updated_at:d,stage_since:d});})();" });
  await ev(page, () => document.body.classList.add('standalone')); await pause(page, 400);
  await page.tap('#pwaSched', { timeout: 3000 }).catch(() => {}); await pause(page, 1100);
  const opened = await ev(page, () => { const c = [...document.querySelectorAll('#boardView .bday')].find(e => /today/i.test(e.textContent) && e.getBoundingClientRect().height > 0) || [...document.querySelectorAll('#boardView .bday')].find(e => e.getBoundingClientRect().height > 0); if (!c) return false; c.click(); return true; });
  await pause(page, 800);
  ok(opened && await shown(page, 'apptModal'), '#22 rig: the Schedule Board day sheet is open');
  await page.tap('#pwaJobs', { timeout: 3000 }).catch(() => {}); await pause(page, 1000);
  const after = await ev(page, () => { const h = document.elementFromPoint(195, 400); const m = document.getElementById('apptModal'); return { sheet: getComputedStyle(m).display !== 'none', underSheet: !!(h && m.contains(h)), leads: getComputedStyle(document.getElementById('leadsView')).display !== 'none' }; });
  ok(!after.sheet && !after.underSheet, '#22 tapping Jobs closes the day sheet instead of changing the page under it', JSON.stringify(after));
  ok(after.leads, '#22 …and Jobs still opens Leads & Jobs', JSON.stringify(after));
  /* #23 the stage-move Undo */
  await ev(page, () => window.openProject('L9')); await pause(page, 1400);
  const w0 = await ev(page, () => (window.__WRITES__ || []).length);
  const fw = await ev(page, () => { const b = document.getElementById('dbStgFwd'); if (!b) return false; b.click(); return true; });
  await pause(page, 600);
  const undo = await ev(page, () => { const u = document.querySelector('.cr-undo-toast'); return !!(u && u.getBoundingClientRect().height > 0); });
  ok(fw && undo, '#23 rig: a stage move showed the Undo message', JSON.stringify({ fw, undo }));
  const cov = await ev(page, () => ['pwaJobs', 'pwaNew', 'pwaSched'].map(id => { const b = document.getElementById(id); if (!b) return id + ':none'; const q = b.getBoundingClientRect(); const h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return id + ':' + (b.contains(h) ? 'OK' : 'UNDER .' + String(h && h.className).slice(0, 24)); }));
  ok(Array.isArray(cov) && cov.every(c => /:OK$/.test(c)), '#23 the Undo message leaves Jobs, + New and Schedule tappable', JSON.stringify(cov));
  const ut = await ev(page, () => { const u = document.querySelector('.cr-undo-toast'); const n = document.getElementById('pwaNav'); if (!u || !n) return null; return { ub: Math.round(u.getBoundingClientRect().bottom), nt: Math.round(n.getBoundingClientRect().top) }; });
  ok(ut && ut.ub <= ut.nt, '#23 the Undo message sits above the tab bar', JSON.stringify(ut));
  /* the move is deferred behind the Undo window: once it runs out the stage write must land */
  await pause(page, 6000);
  const wrote = await ev(page, (w0) => (window.__WRITES__ || []).slice(w0).filter(w => /projects/.test(w.table || '') && /stage/.test(JSON.stringify(w.payload || {}))).length, w0);
  ok(wrote > 0, '#23 control: the stage write still lands when the Undo window closes', JSON.stringify({ wrote }));
  await browser.close();
});

/* ════════ #24 — the desktop rail's light icons tell rows apart the way dark does ════════ */
await group('#24 rail icons, light vs dark (theo, desktop 1280)', async () => {
  const sets = {};
  for (const [theme, pre] of [['dark', DARK], ['light', LIGHT]]) {
    const { browser, page } = await L3.boot('theo', { instr: false, desktop: true, seed: pre });
    const th = await ev(page, () => document.documentElement.getAttribute('data-theme'));
    ok(theme === 'dark' ? th !== 'rb-light' : th === 'rb-light', `#24 rig: ${theme} set through localStorage (data-theme=${th})`);
    sets[theme] = await ev(page, () => [...document.querySelectorAll('#cr-lnav .lnav-item')].filter(e => e.getBoundingClientRect().height > 0).map(e => {
      const svg = [...e.querySelectorAll('.lnav-ic svg')].find(s => getComputedStyle(s).display !== 'none' && s.getBoundingClientRect().width > 0);
      /* the glyph's SHAPE, from the browser's own geometry: a "stack" is a glyph whose every mark is a
         flat horizontal bar or line (getBBox height <= 3 of 24) — the hamburger-like icon the audit saw */
      let kind = 'none';
      if (svg) { const bb = [...svg.querySelectorAll('path,circle,rect,ellipse,line,polyline')].map(n => { try { return n.getBBox(); } catch (x) { return null; } }).filter(Boolean);
        kind = !bb.length ? 'empty' : (bb.every(b => b.height <= 3 && b.width >= 5) ? 'stack' : 'shape'); }
      return { k: e.getAttribute('data-k'), t: e.textContent.trim(), g: svg ? svg.innerHTML : '', kind }; }));
    await browser.close();
  }
  const D = Array.isArray(sets.dark) ? sets.dark : [], Lt = Array.isArray(sets.light) ? sets.light : [];
  ok(D.length > 10 && Lt.length === D.length, '#24 rig: the rail rendered in both themes', D.length + ' / ' + Lt.length);
  const dk = {}; D.forEach(r => { dk[r.k] = r.g; });
  const clash = [];
  for (let i = 0; i < Lt.length; i++) for (let j = i + 1; j < Lt.length; j++) {
    const a = Lt[i], b = Lt[j];
    if (a.g && a.g === b.g && dk[a.k] !== dk[b.k]) clash.push(a.t + ' = ' + b.t);
  }
  ok(clash.length === 0, '#24 light draws no two rows alike that dark draws apart', JSON.stringify(clash));
  const dkind = {}; D.forEach(r => { dkind[r.k] = r.kind; });
  const three = Lt.filter(r => ['clients', 'leadsjobs', 'estimates'].includes(r.k));
  ok(three.length === 3 && three.filter(r => r.kind === 'stack').length <= 1, '#24 light: of Clients, Leads & Jobs and Estimates at most one is a line stack (as in dark)', JSON.stringify(three.map(r => r.t + ':' + r.kind + '/dark ' + dkind[r.k])));
  const lone = Lt.filter(r => r.kind === 'stack' && dkind[r.k] !== 'stack').map(r => r.t);
  ok(lone.length === 0, '#24 light draws no row as a line stack that dark draws as a picture', JSON.stringify(lone));
});

console.log('\n' + (fails ? 'RED — gate_G: ' + fails + ' fail, ' + passes + ' pass\n  ' + red.join('\n  ') : 'GREEN — gate_G: all ' + passes + ' pass'));
process.exit(fails ? 1 : 0);
