// gate_1365 — the installed app's phone bar: ‹ Back · Home · Jobs · + · Schedule · Menu.
// A  phone, installed: Back + five tabs show; Forward and Library are gone from the bar; the bar is still the ~64px
//    every clearance in the app is built on; every tab is >=44px and its label reads >=4.5:1 on the bar
// B  the header's + and menu are hidden there (they live in the bar)
// C  real taps: Home / Jobs / Schedule open their screens and light their tab; + opens the New menu ABOVE the bar;
//    Menu opens the menu
// D  a client page lights Jobs; Back still goes back
// E  a field user keeps Back, Home, Menu only
// F  an installed iPad and a phone browser tab are unchanged (no tabs; header + and menu shown)
// G  Self Check finds no unreachable + / menu / forward-or-Home
// node gate_1365.mjs [index.html]   (1364 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
async function open(w, h, standalone, field) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2600);
  await p.evaluate(([s, f]) => { if (s) document.body.classList.add('standalone'); if (f) document.body.classList.add('cr-field');
    try { window.CardinalHeader.goHome(); } catch (_) {} }, [standalone, field]);
  await p.waitForTimeout(700);
  return { ctx, p };
}
const LUM = `(c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])})`;
const STATE = `(() => {
  const P = s => (/rgba?\\(([^)]+)\\)/.exec(s||'')||[0,'0,0,0'])[1].split(',').map(parseFloat);
  const L = ${LUM};
  const vis = id => { const e = document.getElementById(id); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const nav = document.getElementById('pwaNav'), nr = nav ? nav.getBoundingClientRect() : null;
  const tabs = [...document.querySelectorAll('#pwaNav .pwatab')].filter(t => t.getBoundingClientRect().width > 0);
  /* the bar ground: its gradient's darkest-to-lightest stops; score the label against the worst */
  const cs = nav ? getComputedStyle(nav) : null;
  const grounds = cs ? (cs.backgroundImage.match(/rgba?\\([^)]+\\)/g) || [cs.backgroundColor]).map(P) : [];
  const ratio = el => { const ink = P(getComputedStyle(el).color); return Math.min.apply(null, grounds.map(g => { const a = L(ink), c = L(g); return (Math.max(a, c) + .05) / (Math.min(a, c) + .05); })); };
  return { navH: nr ? Math.round(nr.height) : 0, navShown: !!(nr && nr.height),
    tabs: tabs.map(t => ({ k: t.getAttribute('data-tab'), h: Math.round(t.getBoundingClientRect().height), on: t.classList.contains('on'), ratio: +ratio(t.querySelector('span')).toFixed(2) })),
    back: vis('pwaBack'), fwd: vis('pwaFwd'), lib: vis('pwaLib'), hdrMenu: vis('navBtn'), hdrPlus: vis('addProjectBtn'),
    lit: (tabs.find(t => t.classList.contains('on')) || { getAttribute: () => '' }).getAttribute('data-tab') };
})()`;
const tap = async (p, sel) => { if (!(await p.locator(sel).count())) return false; const bx = await p.locator(sel).boundingBox({ timeout: 3000 }).catch(() => null); if (!bx) return false; await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(700); return true; };
const viewOn = (p, id) => p.evaluate(i => { const e = document.getElementById(i); return !!(e && getComputedStyle(e).display !== 'none'); }, id);

/* phone, installed */
{
  const { ctx, p } = await open(390, 844, true, false);
  let s = await p.evaluate(STATE);
  const keys = s.tabs.map(t => t.k).join(',');
  ok(s.navShown && s.back && keys === 'home,jobs,new,sched,menu' && !s.fwd && !s.lib, 'A: Back + Home, Jobs, +, Schedule, Menu; no Forward / Library', JSON.stringify({ keys, back: s.back, fwd: s.fwd, lib: s.lib }));
  ok(s.navH >= 56 && s.navH <= 66, 'A: the bar keeps the ~64px every clearance is built on', s.navH);
  ok(s.tabs.length === 5 && s.tabs.every(t => t.h >= 44), 'A: every tab is at least 44px tall', JSON.stringify(s.tabs.map(t => t.h)));
  ok(s.tabs.length === 5 && s.tabs.every(t => t.ratio >= 4.5), 'A: every label reads >=4.5:1 on the bar', JSON.stringify(s.tabs.map(t => t.ratio)));
  ok(!s.hdrMenu && !s.hdrPlus, 'B: the header + and menu are hidden (they are in the bar)', JSON.stringify({ m: s.hdrMenu, p: s.hdrPlus }));
  ok(s.lit === 'home', 'C: on Home, Home is lit', s.lit);
  await tap(p, '#pwaJobs'); s = await p.evaluate(STATE);
  ok(await viewOn(p, 'leadsView') && s.lit === 'jobs', 'C: Jobs opens the jobs list and lights Jobs', s.lit);
  await tap(p, '#pwaSched'); s = await p.evaluate(STATE);
  ok(await viewOn(p, 'boardView') && s.lit === 'sched', 'C: Schedule opens the Schedule Board and lights Schedule', s.lit);
  await tap(p, '#pwaBack'); await p.waitForTimeout(600);
  ok(await viewOn(p, 'leadsView'), 'D: Back goes back to the jobs list');
  await tap(p, '#pwaHome'); s = await p.evaluate(STATE);
  ok(await viewOn(p, 'mainView') && s.lit === 'home', 'C: Home goes home and lights Home', s.lit);
  await tap(p, '#pwaNew');
  const nm = await p.evaluate(() => { const m = document.getElementById('newMenu'), n = document.getElementById('pwaNav'); if (!m) return null;
    const r = m.getBoundingClientRect(), nr = n.getBoundingClientRect(); return { shown: getComputedStyle(m).display !== 'none' && r.height > 0, bottom: Math.round(r.bottom), top: Math.round(r.top), navTop: Math.round(nr.top), items: m.querySelectorAll('button, a, [data-new]').length, clear: [...m.querySelectorAll('button, a, [data-new]')].every(it => { const q = it.getBoundingClientRect(); if (!q.height) return true; const h = document.elementFromPoint(q.right - 12, q.top + q.height / 2); return !!(h && (it === h || it.contains(h) || m.contains(h))); }) }; });
  ok(nm && nm.shown && nm.bottom <= nm.navTop && nm.top >= 0 && nm.items > 0 && nm.clear, '+ opens the New menu above the bar, fully on screen, nothing floating over it', JSON.stringify(nm));
  await p.mouse.click(200, 300); await p.waitForTimeout(400);
  await p.evaluate(() => { const m = document.getElementById('newMenu'); if (m) m.style.display = 'none'; });
  await tap(p, '#pwaMenu');
  const mn = await p.evaluate(() => { const m = document.getElementById('navMenu'); return !!(m && getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().height > 100); });
  ok(mn, 'C: Menu opens the menu');
  await p.evaluate(() => { const m = document.getElementById('navMenu'), bd = document.getElementById('navBackdrop'); if (m) m.style.display = 'none'; if (bd) bd.style.display = 'none'; });
  await p.evaluate(() => { try { window.openProject(window.cacheProjects[0].id); } catch (_) {} }); await p.waitForTimeout(1500);
  /* 1420: this was p.mouse.click(200, 400) — a "neutral" tap at a fixed point, which since 1417 lands on the
     job menu's full-width Communication tile and opens the thread. The tap is only there to wake the bar's
     repaint, so it is now a click on the page's own ground, which is the same wake with no control under it. */
  await p.evaluate(() => { const v = document.getElementById('projectView'); if (v) v.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await p.waitForTimeout(300);
  s = await p.evaluate(STATE);
  ok(s.lit === 'jobs', 'D: a client page lights Jobs', s.lit);
  const sc = await p.evaluate(async () => { try { window.CardinalHeader.goHome(); } catch (_) {} await new Promise(r => setTimeout(r, 500));
    const sc = window.CardinalSelfCheck; if (!sc || !sc.here) return null; const prev = console.log; console.log = () => {}; let bad; try { bad = await sc.here(); } finally { console.log = prev; }
    return (bad || []).filter(r => /add \(\+\)|menu|forward/i.test(r.label)).map(r => r.label + ': ' + r.why); });
  ok(Array.isArray(sc) && sc.length === 0, 'G: Self Check finds the + / menu / forward-or-Home reachable', JSON.stringify(sc));
  await ctx.close();
}
/* field user */
{
  const { ctx, p } = await open(390, 844, true, true);
  const s = await p.evaluate(STATE);
  ok(s.back && s.tabs.map(t => t.k).join(',') === 'home,menu', 'E: a field user keeps Back, Home and Menu only', JSON.stringify(s.tabs.map(t => t.k)));
  await ctx.close();
}
/* iPad, installed */
{
  const { ctx, p } = await open(1024, 1366, true, false);
  const s = await p.evaluate(STATE);
  ok(s.navShown && s.tabs.length === 0 && s.back && s.fwd && s.hdrMenu && s.hdrPlus, 'F: an installed iPad keeps Back / Forward and the header + and menu', JSON.stringify(s));
  await ctx.close();
}
/* phone browser */
{
  const { ctx, p } = await open(390, 844, false, false);
  const s = await p.evaluate(STATE);
  ok(!s.navShown && s.hdrMenu && s.hdrPlus, 'F: a phone browser tab is unchanged (no bar, header + and menu)', JSON.stringify({ nav: s.navShown, m: s.hdrMenu, p: s.hdrPlus }));
  await ctx.close();
}
await b.close();
console.log(fail ? 'GATE 1365 RED — ' + fail + ' failing' : 'GATE 1365 GREEN');
