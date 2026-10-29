/* gate_A — judge 16 (colour / buttons / text), builder A. Every assertion is a
 * MEASUREMENT in Chromium, in the theme it is about, and most are made in BOTH.
 *   T  Insurance follows the app theme: unset key -> siren in a dark app, docket
 *      in a light one; the one toggle writes BOTH keys, from either portal
 *   S  the siren surfaces that become the default: claim card, money ring,
 *      Balance Due, comms Back + @chips — contrast in siren AND docket
 *   I  islands: Reports chips (+ a visible selected state), document-type chips,
 *      the Deposit Paid pill — dark grounds in dark, shipped values in light
 *   K  inks / sizes: CSV, count, Assigned, Select, avatar initials, other-month
 *      days, the tile money, the Invoiced stage chip, the editor's <small>s
 *   H  one identity hue per CRM: pill dot, client-list name, rail segment, header +
 *   M  the desktop menu popover is the drawer's dark, not white
 *   P  the light pipeline is the flat strip (no spheres, no repeated letter)
 *   F  no Georgia on on-screen Insurance / Community headings or client names
 *   (+ the sweep's own finds: map placeholder, chat empty line, filter counts,
 *    menu footer, pipeline-card initial, the Resource Library's Siren accent)
 *   X  Estimates discard 44x44 + danger ink; Community chart button 44; the
 *      Community profile's 16px gutter; "Switch portal" in the normal rail ink
 * Arg: [index.html] -> negative control (b1415 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot, log } = await import('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 420000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };

/* in-page measuring kit: composite every ground an element sits on (colour AND
   every gradient stop, skipping border-box layers of the gradient-border idiom)
   and return the WORST ratio. Installed once per page. */
const KIT = () => {
  if (window.__J) return;
  const parse = c => { const k = String(c).match(/color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)/); if (k) return { r: +k[1] * 255, g: +k[2] * 255, b: +k[3] * 255, a: k[4] != null ? +k[4] : 1 }; const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const split = s => { const o = []; let d = 0, c = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(x => x.trim()); };
  function grounds(el) {
    const layers = []; let e = el;
    while (e) { const cs = getComputedStyle(e); const bc = parse(cs.backgroundColor); const stops = [];
      if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) { const im = split(cs.backgroundImage), cl = split(cs.backgroundClip || 'border-box'); const co = i => cl[i % cl.length] || 'border-box'; const inner = im.some((g, i) => g.includes('gradient') && co(i) !== 'border-box');
        im.forEach((g, i) => { if (!g.includes('gradient') || (inner && co(i) === 'border-box')) return; for (const m of (g.match(/(rgba?|color)\([^)]+\)/g) || [])) { const p = parse(m); if (p) stops.push(p); } }); }
      layers.push({ bc, stops }); if (bc && bc.a >= 0.99 && !stops.length) break; if (stops.length && stops.every(s => s.a >= 0.99)) break; e = e.parentElement; }
    let bases = [{ r: 9, g: 9, b: 12, a: 1 }];
    for (let i = layers.length - 1; i >= 0; i--) { const L = layers[i]; let nb = bases.map(b => (L.bc && L.bc.a > 0) ? over(L.bc, b) : b); if (L.stops.length) { const o = []; for (const b of nb) for (const s of L.stops) o.push(over(s, b)); nb = o; } bases = nb.slice(0, 24); }
    return bases;
  }
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; let e = el; while (e && e !== document.documentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden') return false; e = e.parentElement; } return true; };
  const own = el => { let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent; return t.trim(); };
  window.__J = {
    vis, hex, lum: c => lum(parse(c)),
    q: sel => [...document.querySelectorAll(sel)].find(vis) || null,
    text: (t, scope) => [...(scope ? document.querySelectorAll(scope + ' *') : document.querySelectorAll('body *'))].find(e => own(e) === t && vis(e)) || null,
    ink: el => { if (!el) return null; const cs = getComputedStyle(el); const fg = parse(cs.color); let w = 99, g0 = null; for (const g of grounds(el)) { const f = fg.a < 1 ? over(fg, g) : fg; const q = ratio(f, g); if (q < w) { w = q; g0 = g; } } return { r: +w.toFixed(2), fg: hex(fg), bg: hex(g0), fs: parseFloat(cs.fontSize) }; },
    bg: el => { const c = parse(getComputedStyle(el).backgroundColor); return c && c.a > 0.05 ? hex(c) : 'transparent'; },
    box: el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), right: Math.round(innerWidth - r.right) }; },
    ff: el => getComputedStyle(el).fontFamily
  };
};
const go = async (page, js, wait = 1300) => { await page.evaluate(async js => { try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {} try { await eval(js); } catch (e) { console.log('OPENERR ' + e.message); } }, js); await page.waitForTimeout(wait); await page.evaluate(KIT); };
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const R = (x, floor) => !!x && x.r >= floor;
const __lumHex = h => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; const n = parseInt(h.slice(1), 16); return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255); };  /* the COMPOSITED ground, not the raw rgba */
const fmt = x => x ? x.r + ':1 (' + x.fg + ' on ' + x.bg + ', ' + x.fs + 'px)' : 'NOT FOUND';
const LIGHT = "try{localStorage.setItem('cardinal.theme.rb','1')}catch(e){}";

async function session(label, opts, body) {
  let b;
  try { b = await boot('theo', opts); b.page.setDefaultTimeout(6000); await b.page.evaluate(KIT); await body(b.page); }
  catch (e) { ok(false, label + ' crashed', e.message.split('\n')[0].slice(0, 160)); }
  finally { if (b) await Promise.race([b.browser.close(), new Promise(r => setTimeout(r, 4000))]); }
}

/* ─────────────── 1. phone, DARK app, no insurance key stored ─────────────── */
await session('dark-390', { instr: false }, async page => {
  await go(page, "openProject('I1')", 1800);
  let s = await ev(page, () => ({ rl: document.body.getAttribute('data-rltheme'), crm: document.body.dataset.crm, key: localStorage.getItem('cardinalRLTheme') }));
  ok(s.crm === 'insurance' && s.rl === 'siren' && s.key === null, 'T  dark app, key unset → Insurance opens in Siren (dark)', JSON.stringify(s));
  const card = await ev(page, () => { const c = __J.q('.cr-xl-card'); if (!c) return null; return { bg: __J.bg(c), lum: __J.lum(getComputedStyle(c).backgroundColor), title: __J.ink(c.querySelector('.cr-xl-title')), sub: __J.ink(c.querySelector('.cr-xl-sub')), eb: __J.ink(c.querySelector('.cr-xl-eyebrow')), st: __J.ink(c.querySelector('.cr-xl-status')), cta: __J.ink(c.querySelector('.cr-xl-cta')) }; });
  ok(card && card.lum < 0.05, 'S  siren claim card is a dark surface, not #ffffff', card && card.bg);
  for (const k of ['title', 'sub', 'eb', 'st', 'cta']) ok(card && R(card[k], 4.5), 'S  siren claim card ' + k + ' ≥ 4.5', card && fmt(card[k]));
  const ring = await ev(page, () => __J.ink(__J.q('.dbringin'))); ok(R(ring, 4.5), 'S  siren money ring % ≥ 4.5 (was 1.63)', fmt(ring));
  const due = await ev(page, () => __J.ink(__J.q('b.db-due'))); ok(R(due, 4.5), 'S  siren Balance Due ≥ 4.5 (was 3.18-3.51)', fmt(due));
  const nm = await ev(page, () => { const e = __J.q('#projName .heroNm'); return e && __J.ff(e); }); ok(nm && !/georgia/i.test(nm), 'F  Insurance client name is sans', nm);
  const h1 = await ev(page, () => { const e = __J.q('#brandTitle h1'); return e && __J.ff(e); }); ok(h1 && !/georgia/i.test(h1), 'F  Insurance header title is sans', h1);
  const plus = await ev(page, () => { const b = __J.q('#addProjectBtn'); return b && { bg: __J.bg(b), ink: __J.ink(b) }; });
  ok(plus && plus.bg === '#2dd4bf' && R(plus.ink, 3), 'H  Insurance header + is the teal identity hue (dark), ink ≥ 3', JSON.stringify(plus));

  const map = await ev(page, () => __J.ink(__J.q('#dbMap .axnote'))); ok(!map || R(map, 4.5), 'S  siren map placeholder note ≥ 4.5 (was 2.09) — absent when a map image loads', fmt(map));
  const pwa = await ev(page, () => { document.body.classList.add('standalone'); const b = document.querySelector('#pwaNew b'); const out = b ? __J.bg(b) : null; document.body.classList.remove('standalone'); return out; });
  ok(pwa === '#2dd4bf', 'H  installed-phone + (bottom bar) wears the insurance hue too', pwa);

  await go(page, "showResourceLibrary()", 1500);
  const rl = await ev(page, () => ({ th: document.body.getAttribute('data-rltheme'), ask: __J.ink(__J.q('#rlAskBtn')) }));
  ok(rl.th === 'siren' && R(rl.ask, 4.5), 'S  the Resource Library follows too (Siren) and Ask / File ≥ 4.5 (was 3.91)', rl.th + ' ' + fmt(rl.ask));

  await go(page, "openProject('I1'); setTimeout(()=>openCommunications(),600)", 1600);
  const back = await ev(page, () => __J.ink(__J.q('#commsBackBtn'))); ok(R(back, 4.5), 'S  siren comms Back ≥ 4.5', fmt(back));
  const chip = await ev(page, () => __J.ink(__J.q('#chatTagRow .chipbtn'))); ok(R(chip, 4.5), 'S  siren @mention chip ≥ 4.5 (was 2.16)', fmt(chip));
  const vh = await ev(page, () => { const e = __J.q('#commsView .viewhead'); return e && __J.ff(e); }); ok(vh && !/georgia/i.test(vh), 'F  Communications heading is sans', vh);
  /* 1417's read-only claim-note tag and "will notify" line, inked for a cream box.
     A real tag needs claim_notes rows the shared seed does not carry, so a tag is
     mounted in the REAL thread (same classes the renderer writes) and measured there. */
  const tag = await ev(page, () => { const t = document.getElementById('chatThread'); if (!t) return null; const d = document.createElement('div'); d.className = 'chatmsg sys'; d.setAttribute('data-src', 'claim_notes'); d.innerHTML = '<span class="bub"><span class="chattag">Carrier chase</span>gate note</span>'; t.appendChild(d); const r = __J.ink(d.querySelector('.chattag')); d.remove(); return r; });
  ok(R(tag, 4.5), 'S  siren claim-note tag ("Carrier chase") ≥ 4.5 (1417 ink was 2.31)', fmt(tag));
  const will = await ev(page, () => { const w = document.getElementById('chatWill'); if (!w) return 'none'; w.textContent = 'Will notify Curtis'; const a = __J.ink(w); w.classList.add('warn'); const b = __J.ink(w); w.classList.remove('warn'); w.textContent = ''; return { a, b }; });
  ok(will === 'none' || (R(will.a, 4.5) && R(will.b, 4.5)), 'S  siren "will notify" line and its warning ≥ 4.5 (1417 inks were 3.21 / 2.20)', will === 'none' ? 'not on this base' : fmt(will.a) + ' | ' + fmt(will.b));

  /* the toggle, from INSURANCE: both keys, both themes */
  await go(page, "openProject('I1')", 1500);
  await ev(page, () => window.CardinalRBTheme.toggle()); await page.waitForTimeout(900);
  s = await ev(page, () => ({ rb: localStorage.getItem('cardinal.theme.rb'), rl: localStorage.getItem('cardinalRLTheme'), app: document.documentElement.getAttribute('data-theme'), body: document.body.getAttribute('data-rltheme') }));
  ok(s.rl === 'docket' && s.rb === '1' && s.app === 'rb-light' && s.body === 'docket', 'T  toggle on Insurance writes BOTH keys (docket + rb light) and the app follows', JSON.stringify(s));
  const card2 = await ev(page, () => { const c = __J.q('.cr-xl-card'); return c && { title: __J.ink(c.querySelector('.cr-xl-title')), st: __J.ink(c.querySelector('.cr-xl-status')), eb: __J.ink(c.querySelector('.cr-xl-eyebrow')) }; });
  for (const k of ['title', 'st', 'eb']) ok(card2 && R(card2[k], 4.5), 'S  docket claim card ' + k + ' ≥ 4.5', card2 && fmt(card2[k]));
  const ring2 = await ev(page, () => __J.ink(__J.q('.dbringin'))); ok(R(ring2, 4.5), 'S  docket money ring % ≥ 4.5', fmt(ring2));
  const due2 = await ev(page, () => __J.ink(__J.q('b.db-due'))); ok(R(due2, 4.5), 'S  docket Balance Due ≥ 4.5', fmt(due2));
  const plusL = await ev(page, () => { const b = __J.q('#addProjectBtn'); return b && { bg: __J.bg(b), ink: __J.ink(b) }; });
  ok(plusL && plusL.bg === '#0f766e' && R(plusL.ink, 4.5), 'H  Insurance header + is the deep teal in light, white ≥ 4.5', JSON.stringify(plusL));
  /* and back, from RETAIL */
  await go(page, "showHome()", 1200);
  await ev(page, () => window.CardinalRBTheme.toggle()); await page.waitForTimeout(900);
  s = await ev(page, () => ({ rb: localStorage.getItem('cardinal.theme.rb'), rl: localStorage.getItem('cardinalRLTheme'), app: document.documentElement.getAttribute('data-theme') || 'dark', body: document.body.getAttribute('data-rltheme') }));
  ok(s.rb === '0' && s.rl === 'siren' && s.app === 'dark' && s.body === 'siren', 'T  toggle on Retail writes BOTH keys (rb dark + siren)', JSON.stringify(s));

  await go(page, 'showHome()', 1400);
  const av = await ev(page, () => [...document.querySelectorAll('.tmav.tmini')].filter(__J.vis).map(e => __J.ink(e)));
  ok(av.length > 0 && av.every(x => R(x, 4.5)), 'K  avatar initials ≥ 4.5 (SO was 2.50)', av.map(fmt).join(' | '));
  const money = await ev(page, () => [...document.querySelectorAll('.actbox b')].filter(__J.vis).map(e => __J.ink(e)));
  ok(money.length > 0 && money.every(x => R(x, x.fs >= 18.66 ? 3 : 4.5)), 'K  dark tile money ≥ floor at 18px (was 4.47)', money.slice(0, 3).map(fmt).join(' | '));
  const plusR = await ev(page, () => __J.bg(__J.q('#addProjectBtn'))); ok(plusR === '#c8202e', 'H  Retail header + is #c8202e', plusR);

  await go(page, 'openClientsDirectory()', 1500);
  const cd = await ev(page, () => { const out = {}; for (const c of document.querySelectorAll('.cd-card')) { if (!__J.vis(c)) continue; const n = c.querySelector('.cd-name'); const tag = (c.querySelector('.cd-crmtag') || {}).textContent || ''; out[tag.trim() || c.getAttribute('data-proj')] = { c: n && getComputedStyle(n).color, ink: __J.ink(n) }; } const inv = __J.text('Invoiced', '#cliList'); return { out, inv: __J.ink(inv) }; });
  const want = { retail: 'rgb(239, 107, 107)', insurance: 'rgb(45, 212, 191)', community: 'rgb(52, 211, 153)' };
  const seen = Object.entries(cd.out);
  for (const [crm, rgb] of Object.entries(want)) { const hit = seen.find(([k, v]) => v.c === rgb); ok(!!hit && R(hit[1].ink, 4.5), 'H  client-list name in the ' + crm + ' identity hue, ≥ 4.5', hit ? fmt(hit[1].ink) : JSON.stringify(seen.map(([k, v]) => v.c))); }
  ok(R(cd.inv, 4.5), 'K  dark "Invoiced" stage chip ≥ 4.5 (was 4.04)', fmt(cd.inv));

  await go(page, 'openReportsView()', 1500);
  const rp = await ev(page, () => { const chips = [...document.querySelectorAll('#rptRange .hstat')].filter(__J.vis); const off = chips.find(c => !c.classList.contains('on')), on = chips.find(c => c.classList.contains('on')); return { offBg: off && __J.bg(off), offLum: off && __J.lum(getComputedStyle(off).backgroundColor), off: __J.ink(off), on: __J.ink(on), onBg: on && __J.bg(on), plus: __J.bg(__J.q('#addProjectBtn')) }; });
  ok(rp.offLum < 0.05 && R(rp.off, 4.5), 'I  Reports chips are dark in dark, ≥ 4.5 (were #f3ecea)', rp.offBg + ' ' + fmt(rp.off));
  ok(rp.onBg === '#c8202e' && R(rp.on, 4.5), 'I  the selected Reports chip shows (#c8202e + white)', rp.onBg + ' ' + fmt(rp.on));
  ok(rp.plus === '#c8202e', 'H  Reports has no orange + of its own (Retail hue)', rp.plus);

  await go(page, "openProject('R1'); setTimeout(()=>showTab('contracts'),500)", 1500);
  const tc = await ev(page, () => { const e = __J.q('#contractDocsMount .tchip'); return e && { lum: __J.lum(getComputedStyle(e).backgroundColor), bg: getComputedStyle(e).backgroundColor, ink: __J.ink(e) }; });
  ok(tc && tc.ink && __lumHex(tc.ink.bg) < 0.05 && R(tc.ink, 4.5), 'I  Contract chip is a tint on the dark row, ≥ 4.5 (was pale blue)', tc && (tc.bg + ' ' + fmt(tc.ink)));
  await go(page, "openProject('R1'); setTimeout(()=>window.scrollTo(0,700),500)", 1500);
  const dp = await ev(page, () => { const e = __J.text('Deposit Paid') || __J.q('.crar-pill'); return e && { lum: __J.lum(getComputedStyle(e).backgroundColor), ink: __J.ink(e) }; });
  ok(dp && dp.ink && __lumHex(dp.ink.bg) < 0.05 && R(dp.ink, 4.5), 'I  Deposit Paid pill is a tint on the dark card, ≥ 4.5 (was cream)', dp && fmt(dp.ink));

  await go(page, "openProject('R1'); setTimeout(()=>openCommunications(),600)", 1600);
  const ce = await ev(page, () => __J.ink(__J.q('.chatempty'))); ok(R(ce, 4.5), 'K  empty-thread line on the cream chat box ≥ 4.5 (was 3.05)', fmt(ce));

  await go(page, "openProject('C1')", 1600);
  const cmap = await ev(page, () => __J.ink(__J.q('#dbMap .axnote'))); ok(!cmap || R(cmap, 4.5), 'S  Community map placeholder note ≥ 4.5 in dark (was 1.52)', fmt(cmap));
  const cc = await ev(page, () => { const n = __J.q('#cr-cc .cc2-name .nm b') || __J.q('#cr-cc .nm b'); const el = __J.q('#cr-cc'); const kids = el ? [...el.querySelectorAll('*')].filter(e => __J.vis(e) && e.getBoundingClientRect().width > 40) : []; const minL = Math.min(...kids.map(e => e.getBoundingClientRect().left)); const maxR = Math.max(...kids.map(e => e.getBoundingClientRect().right)); return { ff: n && __J.ff(n), left: Math.round(minL), right: Math.round(innerWidth - maxR), h1: __J.ff(__J.q('#brandTitle h1')), plus: __J.bg(__J.q('#addProjectBtn')) }; });
  ok(cc.ff && !/georgia/i.test(cc.ff), 'F  Community client name is sans', cc.ff);
  ok(!/georgia/i.test(cc.h1 || 'georgia'), 'F  Community header title is sans', cc.h1);
  ok(cc.left >= 16 && cc.right >= 16, 'X  Community profile has a 16px side gutter at 390', 'left ' + cc.left + ' right ' + cc.right);
  ok(cc.plus === '#34d399', 'H  Community header + is #34d399', cc.plus);
  await go(page, 'window.CardinalCommunityHub.show()', 1500);
  const an = await ev(page, () => { const b = __J.q('.cc-analytics'); return b && __J.box(b); });
  ok(an && an.w >= 44 && an.h >= 44, 'X  Community hub chart button ≥ 44×44 (was 34)', JSON.stringify(an));

  await go(page, 'window.CardinalEstimates.open()', 1800);
  const del = await ev(page, () => { const b = __J.q('.cre-del'); return b && { box: __J.box(b), ink: __J.ink(b), op: getComputedStyle(b).opacity, name: b.getAttribute('aria-label') }; });
  ok(del && del.box.w >= 44 && del.box.h >= 44, 'X  Estimates discard × is 44×44 (was 24×22)', del && JSON.stringify(del.box));
  ok(del && +del.op === 1 && R(del.ink, 3) && del.ink.fg === '#e35c63', 'X  discard × wears the danger ink in dark (#e35c63, full opacity)', del && (fmt(del.ink) + ' op ' + del.op));
  ok(del && !!del.name, 'X  discard × has an accessible name', del && del.name);
  const asked = await ev(page, async () => { let q = null; const o = window.crAsk; window.crAsk = m => { q = m; return Promise.resolve(false); }; try { const b = __J.q('.cre-del'); b.click(); await new Promise(r => setTimeout(r, 200)); } finally { window.crAsk = o; } return q; });
  ok(!!asked && /Discard/i.test(asked), 'X  discard still asks before it acts', String(asked).slice(0, 60));

  await go(page, "window.openEditor('ctR1')", 1800);
  const sm = await ev(page, () => ['#edClientChip small', '#editorSentDate'].map(s => { const e = __J.q(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; }));
  ok(sm.every(x => x !== null && x >= 11), 'K  editor chip + sent date ≥ 11px (were 9.17 / 10.83)', sm.join(' / '));
});

/* ─────────────── 2. phone, LIGHT app ─────────────── */
await session('light-390', { instr: false, seed: LIGHT }, async page => {
  await go(page, "openProject('I1')", 1800);
  const s = await ev(page, () => ({ rl: document.body.getAttribute('data-rltheme'), app: document.documentElement.getAttribute('data-theme') }));
  ok(s.rl === 'docket' && s.app === 'rb-light', 'T  light app, key unset → Insurance opens in Docket', JSON.stringify(s));
  const st = await ev(page, () => __J.ink(__J.q('.cr-xl-status'))); ok(R(st, 4.5), 'S  docket "Approved" chip ≥ 4.5 (was 4.46)', fmt(st));
  await go(page, 'showHome()', 1500);
  const pipe = await ev(page, () => { const c = [...document.querySelectorAll('#pipeRow .pcirc')].filter(__J.vis); const n = __J.q('#pipeRow .pcount'), l = __J.q('#pipeRow .plabel'); return { n: c.length, maxH: Math.max(...c.map(e => e.getBoundingClientRect().height)), fs: Math.max(...c.map(e => parseFloat(getComputedStyle(e).fontSize))), img: c.map(e => getComputedStyle(e).backgroundImage).filter(x => x !== 'none').length, count: __J.ink(n), label: __J.ink(l) }; });
  ok(pipe.n >= 4 && pipe.maxH <= 4 && pipe.fs === 0 && pipe.img === 0, 'P  light pipeline: spheres flatten to a 3px stage rule, no gloss, no letter', JSON.stringify({ n: pipe.n, h: pipe.maxH, fs: pipe.fs, gloss: pipe.img }));
  ok(R(pipe.count, 4.5) && R(pipe.label, 4.5), 'P  light pipeline count / label ≥ 4.5', fmt(pipe.count) + ' | ' + fmt(pipe.label));
  const pci = await ev(page, () => [...document.querySelectorAll('.pcbadge .pcini')].filter(__J.vis).map(__J.ink));
  ok(pci.every(x => R(x, 4.5)), 'K  light pipeline-card initial ≥ 4.5 (was 4.48)', pci.slice(0, 2).map(fmt).join(' | ') || 'none on screen');
  const money = await ev(page, () => [...document.querySelectorAll('.actbox b')].filter(__J.vis).map(e => __J.ink(e)));
  ok(money.length > 0 && money.every(x => R(x, x.fs >= 18.66 ? 3 : 4.5)), 'K  light tile money ≥ 4.5 at 18px (was 3.79)', money.slice(0, 3).map(fmt).join(' | '));
  const av = await ev(page, () => [...document.querySelectorAll('.tmav.tmini')].filter(__J.vis).map(e => __J.ink(e)));
  ok(av.length > 0 && av.every(x => R(x, 4.5)), 'K  avatar initials ≥ 4.5 in light', av.map(fmt).join(' | '));
  await go(page, 'openReportsView()', 1500);
  const rp = await ev(page, () => { const off = [...document.querySelectorAll('#rptRange .hstat')].find(c => __J.vis(c) && !c.classList.contains('on')); return { bg: off && __J.bg(off), ink: __J.ink(off), plus: __J.bg(__J.q('#addProjectBtn')) }; });
  ok(rp.bg === '#f3ecea' && R(rp.ink, 4.5), 'I  light Reports chips keep the shipped #f3ecea, ≥ 4.5', rp.bg + ' ' + fmt(rp.ink));
  ok(rp.plus === '#c8202e', 'H  light Reports + is the Retail hue (was #915d07 orange)', rp.plus);
  await go(page, "openProject('R1'); setTimeout(()=>showTab('contracts'),500)", 1500);
  const tc = await ev(page, () => { const e = __J.q('#contractDocsMount .tchip'); return e && { bg: __J.bg(e), ink: __J.ink(e) }; });
  ok(tc && tc.bg === '#e8f0fb' && R(tc.ink, 4.5), 'I  light Contract chip keeps the shipped value, ≥ 4.5', tc && (tc.bg + ' ' + fmt(tc.ink)));
  await go(page, 'window.CardinalCommunityHub.show()', 1500);
  const plusC = await ev(page, () => { const b = __J.q('#addProjectBtn'); return b && { bg: __J.bg(b), ink: __J.ink(b) }; });
  ok(plusC && plusC.bg === '#047857' && R(plusC.ink, 4.5), 'H  light Community + is the deep emerald, white ≥ 4.5', JSON.stringify(plusC));
  await go(page, 'window.CardinalEstimates.open()', 1800);
  const del = await ev(page, () => { const b = __J.q('.cre-del'); return b && __J.ink(b); });
  ok(R(del, 3) && del.fg === '#8f1620', 'X  light discard × wears the light danger ink (#8f1620)', fmt(del));
});

/* ─────────────── 3. desktop, DARK ─────────────── */
await session('dark-1366', { instr: false, desktop: true }, async page => {
  await page.setViewportSize({ width: 1366, height: 768 }); await go(page, 'showHome()', 1500);
  const k = await ev(page, () => ({ csv: __J.ink(__J.q('#cr-csv-clients')), count: __J.ink(__J.q('#countLabel')), asg: __J.ink(__J.text('Assigned', '#cr-rf-wrap')), sel: __J.ink(__J.q('#cr-bulk-toggle')) }));
  for (const [n, x] of Object.entries(k)) ok(R(x, 4.5), 'K  dark home history ' + n + ' ≥ 4.5', fmt(x));
  const h = await ev(page, () => { const dot = document.querySelector('#cbCrm b[data-crm-go="community"] i'); const seg = __J.q('#cr-lnav .lnav-crm button.on'); return { dot: dot && __J.bg(dot), seg: seg && __J.bg(seg), segInk: __J.ink(seg) }; });
  ok(h.dot === '#34d399', 'H  Community portal-pill dot is #34d399 (was #8ad0f5)', h.dot);
  ok(h.seg === '#c8202e' && R(h.segInk, 4.5), 'H  Retail rail segment is #c8202e (was #3e6ca8), white ≥ 4.5', h.seg + ' ' + fmt(h.segInk));
  const sp = await ev(page, () => { const a = __J.q('#cr-lnav .lnav-item[data-k="switchportal"] .lnav-tx'), b = __J.q('#cr-lnav .lnav-item[data-k="clients"] .lnav-tx') || [...document.querySelectorAll('#cr-lnav .lnav-item .lnav-tx')].find(e => __J.vis(e) && /Clients/.test(e.textContent)); return { a: a && getComputedStyle(a).color, b: b && getComputedStyle(b).color }; });
  ok(sp.a && sp.a === sp.b, 'X  "Switch portal" wears the normal rail ink (was gold #f0c651)', JSON.stringify(sp));
  await go(page, 'openClientsDirectory()', 1500);
  const fc = await ev(page, () => [...document.querySelectorAll('.cd-frow .c')].filter(__J.vis).map(__J.ink));
  ok(fc.length > 0 && fc.every(x => R(x, 4.5)), 'K  dark client-directory filter counts ≥ 4.5 (were 3.50)', fc.slice(0, 2).map(fmt).join(' | '));
  await go(page, 'showHome()', 1200);
  await ev(page, () => { const m = document.getElementById('navMenu'); m.style.display = 'block'; m.style.top = '6px'; m.style.left = '0px'; });
  await page.waitForTimeout(400);
  const m = await ev(page, () => { const n = document.getElementById('navMenu'); const o = [...n.querySelectorAll('.navopt')].filter(__J.vis); const s = [...n.querySelectorAll('.navsec')].filter(__J.vis); return { lum: __J.lum(getComputedStyle(n).backgroundColor), bg: __J.bg(n), worst: o.map(__J.ink).sort((a, b) => a.r - b.r)[0], sec: s.map(__J.ink).sort((a, b) => a.r - b.r)[0], fs: o.length && parseFloat(getComputedStyle(o[0]).fontSize), n: o.length }; });
  ok(m.lum < 0.05, 'M  desktop menu popover is dark in dark (was #ffffff)', m.bg);
  ok(m.n > 3 && R(m.worst, 4.5) && R(m.sec, 4.5), 'M  every visible menu row / section head ≥ 4.5', fmt(m.worst) + ' | ' + fmt(m.sec));
  ok(m.fs >= 15, 'M  menu rows are 15px (were 13px)', m.fs);
});

/* ─────────────── 4. desktop, LIGHT ─────────────── */
await session('light-1366', { instr: false, desktop: true, seed: LIGHT }, async page => {
  await page.setViewportSize({ width: 1366, height: 768 }); await go(page, 'showHome()', 1500);
  const k = await ev(page, () => ({ csv: __J.ink(__J.q('#cr-csv-clients')), count: __J.ink(__J.q('#countLabel')), asg: __J.ink(__J.text('Assigned', '#cr-rf-wrap')), sel: __J.ink(__J.q('#cr-bulk-toggle')), csvFg: getComputedStyle(__J.q('#cr-csv-clients')).color, other: [...document.querySelectorAll('.teamcal .minical .calgrid .day.other')].filter(__J.vis).map(__J.ink)[0] }));
  for (const n of ['csv', 'count', 'asg', 'sel']) ok(R(k[n], 4.5), 'K  light home history ' + n + ' ≥ 4.5', fmt(k[n]));
  ok(k.csvFg === 'rgb(143, 22, 32)', 'K  light CSV keeps the shipped #8f1620', k.csvFg);
  ok(R(k.other, 4.5), 'K  light other-month calendar days ≥ 4.5 (were 1.63)', fmt(k.other));
  const h = await ev(page, () => { const seg = __J.q('#cr-lnav .lnav-crm button.on'); return { seg: seg && __J.bg(seg), ink: __J.ink(seg) }; });
  ok(h.seg === '#c8202e' && R(h.ink, 4.5), 'H  light Retail rail segment #c8202e, white ≥ 4.5', h.seg + ' ' + fmt(h.ink));
  await go(page, 'openClientsDirectory()', 1500);
  const fc = await ev(page, () => [...document.querySelectorAll('.cd-frow .c')].filter(__J.vis).map(__J.ink));
  ok(fc.length > 0 && fc.every(x => R(x, 4.5)), 'K  light client-directory filter counts ≥ 4.5 (were 3.13)', fc.slice(0, 2).map(fmt).join(' | '));
  await go(page, 'showHome()', 1200);
  await ev(page, () => { const m = document.getElementById('navMenu'); m.style.display = 'block'; m.style.top = '6px'; m.style.left = '0px'; });
  await page.waitForTimeout(400);
  const ft = await ev(page, () => __J.ink(__J.q('#navMenu [data-cr-footer]'))); ok(R(ft, 4.5), 'M  light desktop popover footer (build stamp) ≥ 4.5 (was 2.31)', fmt(ft));
  const m = await ev(page, () => { const n = document.getElementById('navMenu'); const o = [...n.querySelectorAll('.navopt')].filter(__J.vis); const s = [...n.querySelectorAll('.navsec')].filter(__J.vis); return { bg: __J.bg(n), worst: o.map(__J.ink).sort((a, b) => a.r - b.r)[0], sec: s.map(__J.ink).sort((a, b) => a.r - b.r)[0] }; });
  ok(m.bg === '#ffffff' && R(m.worst, 4.5) && R(m.sec, 4.5), 'M  light desktop popover stays white, rows and section heads ≥ 4.5', m.bg + ' ' + fmt(m.worst) + ' | ' + fmt(m.sec));
});

const errs = log.filter(l => /PAGEERROR/.test(l));
ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' || ').slice(0, 300));
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
