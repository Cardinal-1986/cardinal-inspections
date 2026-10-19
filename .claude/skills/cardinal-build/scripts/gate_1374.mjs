// gate_1374 — the address in the client band (Theo: "see the address and tap it without having to scroll").
// phone, retail client with an address:
//  1 the address line shows in the band, on the first screen, above the stage bar
//  2 it reads the job's address and its link is the directions link (mapsUrl), opening a new tab
//  3 it is a 44px tap target and a tap at its centre lands on it (nothing paints over it)
//  4 Email / Text / Call are still there, one per channel the client has
//  5 its ink clears 4.5:1 on the band in dark AND light
// a client with no address draws no line; wide screen: the band (and so the line) stays hidden
// node gate_1374.mjs [index.html]   (1373 = RED)
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
async function open(w, h, theme) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (theme) await p.addInitScript('window.__sentinelTheme = ' + JSON.stringify(theme) + ';');
  await p.addInitScript(SETUP);
  await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2600);
  return { ctx, p };
}
// a retail job with an address, and one we strip of its address
const PICK = `(() => { const crm = x => { try { return (window.CardinalHeader && CardinalHeader.crmOf) ? CardinalHeader.crmOf(x) : null; } catch (e) { return null; } };
  const rs = cacheProjects.filter(x => x.address && !/insurance|community/i.test(String(x.claim_type || x.crm || '')));
  return (rs[0] || cacheProjects.find(x => x.address) || {}).id; })()`;
const READ = `(() => {
  const lum = c => { const m = c.match(/[\\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const ratio = (a, b2) => { const x = lum(a), y = lum(b2); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const bar = document.getElementById('cr-namebar'), a = bar && bar.querySelector('.nb-addr'), t = a && a.querySelector('.nb-addr-t');
  const stage = document.querySelector('#acxMount > [data-cr-ord="stage"]');
  if (!a) return { has: false, barShown: !!(bar && getComputedStyle(bar).display !== 'none') };
  const r = a.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { has: true, shown: r.width > 0 && r.height > 0 && getComputedStyle(a).display !== 'none', top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
    stageTop: stage ? Math.round(stage.getBoundingClientRect().top) : null, text: t ? t.textContent : '', href: a.getAttribute('href'), target: a.getAttribute('target'),
    hitOk: !!(hit && a.contains(hit)), icos: [...bar.querySelectorAll('.nb-ico')].map(e => e.getAttribute('data-cr-act')),
    ink: ratio(getComputedStyle(t).color, getComputedStyle(bar).backgroundColor), pin: ratio(getComputedStyle(a.querySelector('svg')).color, getComputedStyle(bar).backgroundColor),
    vh: innerHeight };
})()`;
{
  const { ctx, p } = await open(390, 844);
  const id = await p.evaluate(PICK);
  ok(!!id, 'fixture: a job with an address exists', id);
  await p.evaluate(i => openProject(i), id); await p.waitForTimeout(1800);
  const pr = await p.evaluate(() => ({ address: currentProject.address, email: !!currentProject.email, tel: !!String(currentProject.phone || '').replace(/[^0-9+]/g, ''), maps: mapsUrl(currentProject.address) }));
  const r = await p.evaluate(READ);
  ok(r.has && r.shown, '1: the address line shows in the band', JSON.stringify({ has: r.has, shown: r.shown }));
  ok(r.has && r.bottom <= r.vh && (r.stageTop == null || r.bottom <= r.stageTop + 1), '1: on the first screen, above the stage bar', JSON.stringify({ bottom: r.bottom, stage: r.stageTop, vh: r.vh }));
  ok(r.has && r.text === pr.address, '2: it reads the job\'s address', r.text);
  ok(r.has && r.href === pr.maps && r.target === '_blank', '2: one tap opens directions in a new tab', r.href);
  ok(r.has && r.h >= 44 && r.hitOk, '3: a 44px target nothing paints over', JSON.stringify({ h: r.h, hit: r.hitOk }));
  const want = [pr.email && 'email', pr.tel && 'text', pr.tel && 'call'].filter(Boolean);
  ok(r.has && JSON.stringify(r.icos) === JSON.stringify(want), '4: Email / Text / Call unchanged', JSON.stringify(r.icos));
  ok(r.has && r.ink >= 4.5 && r.pin >= 3, '5: dark: address ink clears 4.5:1, pin 3:1', r.has && r.ink.toFixed(2) + ' / ' + r.pin.toFixed(2));
  await p.evaluate(() => { currentProject.address = ''; openProject(currentProject.id); }); await p.waitForTimeout(1500);
  const n = await p.evaluate(() => ({ addr: (cacheProjects.find(x => x.id === currentProject.id) || {}).address, line: !!document.querySelector('#cr-namebar .nb-addr') }));
  ok(n.addr ? true : n.line === false, 'no address, no line', JSON.stringify(n));
  await ctx.close();
}
{
  const { ctx, p } = await open(390, 844, 'rb-light');
  await p.evaluate(i => openProject(i), await p.evaluate(PICK)); await p.waitForTimeout(1800);
  const l = await p.evaluate(READ), th = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  ok(th === 'rb-light', 'fixture: light theme is on', th);
  ok(l.has && l.ink >= 4.5 && l.pin >= 3, '5: light: address ink clears 4.5:1, pin 3:1', l.has && l.ink.toFixed(2) + ' / ' + l.pin.toFixed(2));
  await ctx.close();
}
{
  const { ctx, p } = await open(1280, 900);
  const id = await p.evaluate(PICK);
  await p.evaluate(i => openProject(i), id); await p.waitForTimeout(1800);
  const r = await p.evaluate(() => { const bar = document.getElementById('cr-namebar'); return !bar || getComputedStyle(bar).display === 'none'; });
  ok(r, 'wide screen: the band stays hidden, desktop unchanged', r);
  await ctx.close();
}
await b.close();
console.log(fail ? 'GATE 1374 RED — ' + fail + ' failing' : 'GATE 1374 GREEN');
process.exit(fail ? 1 : 0);
