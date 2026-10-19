// gate_1375 — Location, Assigned To and Google Reviews fold on a phone (Theo: "1 3 4"). Job Details stays open.
// phone, retail:
//  1 each of the three is one row with a fold button; its body is hidden; Job Details is shown
//  2 the rows carry their summary: the street, the rep's name
//  3 a tap opens it (body shown, aria-expanded) and a second tap closes it
//  4 the whole row is the tap target (a tap on the TITLE toggles) and it is >= 44px
//  5 an open Location's pencil still takes its own tap
//  6 open state is per job: another job opens folded
//  7 the summary ink clears 4.5:1, dark and light
//  8 settled, nothing keeps writing (no repaint loop)
// wide screen: no fold buttons, every section shown
// node gate_1375.mjs [index.html]   (1374 = RED)
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
const PICK = `(cacheProjects.find(x => x.address) || cacheProjects[0]).id`;
const OTHER = `(cacheProjects.find(x => x.id !== currentProject.id) || {}).id`;
const STATE = `(() => {
  const V = e => { if (!e) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden'; };
  const m = document.getElementById('acxMount'), q = s => m.querySelector(s);
  const btn = k => q('.cr-fold[data-cr-fold-key="' + k + '"]');
  const bodies = { loc: q(':scope > [data-cr-ord="loc"]'), asg: q(':scope > .acxassignsec'), rv: q(':scope > .rvcard > .rvbody') };
  const out = { jd: V(q(':scope > [data-cr-ord="jd"]')) };
  for (const k of ['loc', 'asg', 'rv']) { const bt = btn(k), hd = bt && bt.parentElement, r = hd && hd.getBoundingClientRect();
    out[k] = { btn: V(bt), body: V(bodies[k]), exp: bt && bt.getAttribute('aria-expanded'), sum: bt ? (bt.querySelector('.cr-fold-s') || {}).textContent : null, rowH: r ? Math.round(r.height) : 0 }; }
  return out; })()`;
const LUM = `const lum = c => { const m = c.match(/[\\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const ground = e => { for (; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const a = c.match(/[\\d.]+/g); if (a && (a.length < 4 || +a[3] > 0.5)) return c; } return 'rgb(255,255,255)'; };
  const ratio = e => { const x = lum(getComputedStyle(e).color), y = lum(ground(e)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };`;
const INK = `(() => { ${LUM} return [...document.querySelectorAll('#acxMount .cr-fold')].map(b => +ratio(b.querySelector('.cr-fold-s') || b).toFixed(2)); })()`;
{
  const { ctx, p } = await open(390, 844);
  await p.evaluate(i => openProject(i), await p.evaluate(PICK)); await p.waitForTimeout(1800);
  const pr = await p.evaluate(() => ({ street: currentProject.address ? String(currentProject.address).split(',')[0] : 'No address yet', rep: ((document.querySelector('#acxMount .acxassignsec .dbrep b') || {}).textContent || '').trim() }));
  let s = await p.evaluate(STATE);
  ok(['loc', 'asg', 'rv'].every(k => s[k].btn && !s[k].body && s[k].exp === 'false'), '1: Location, Assigned To, Reviews folded to one row', JSON.stringify(s));
  ok(s.jd === true, '1: Job Details stays open', s.jd);
  ok(s.loc.sum === pr.street && s.asg.sum === pr.rep && pr.rep !== '', '2: rows show the street and the rep', JSON.stringify([s.loc.sum, s.asg.sum]));
  ok(['loc', 'asg', 'rv'].every(k => s[k].rowH >= 44), '4: each row is >= 44px', JSON.stringify(['loc', 'asg', 'rv'].map(k => s[k].rowH)));
  // a tap on the row's TITLE (its left edge), by coordinates — the user does not aim at the chevron
  // a missing button records nothing here: the assertions after the tap go red (class 37: a control must not crash)
  const tapTitle = async k => { const pt = await p.evaluate(k => { const bt = document.querySelector('#acxMount .cr-fold[data-cr-fold-key="' + k + '"]'); if (!bt) return null; const h = bt.parentElement; h.scrollIntoView({ block: 'center' }); const r = h.getBoundingClientRect(); return { x: r.left + 40, y: r.top + r.height / 2 }; }, k); if (!pt) return; await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(250); };
  for (const k of ['loc', 'asg', 'rv']) await tapTitle(k);
  s = await p.evaluate(STATE);
  ok(['loc', 'asg', 'rv'].every(k => s[k].body && s[k].exp === 'true'), '3/4: a tap on each title opens it', JSON.stringify(s));
  const pen = await p.evaluate(() => { const e = document.getElementById('acxEdit2'); if (!e) return 'no-pencil'; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(h && (h === e || e.contains(h))); });
  ok(pen === true, '5: the open Location\'s pencil takes its own tap', pen);
  for (const k of ['loc', 'asg', 'rv']) await tapTitle(k);
  s = await p.evaluate(STATE);
  ok(['loc', 'asg', 'rv'].every(k => !s[k].body && s[k].exp === 'false'), '3: a second tap closes it', JSON.stringify(s));
  await tapTitle('loc');
  const other = await p.evaluate(OTHER);
  await p.evaluate(i => openProject(i), other); await p.waitForTimeout(1500);
  s = await p.evaluate(STATE);
  ok(other && s.loc.btn && !s.loc.body && s.loc.exp === 'false', '6: another job opens folded', JSON.stringify(s.loc));
  const ink = await p.evaluate(INK);
  ok(ink.length === 3 && ink.every(r => r >= 4.5), '7: dark: summary ink clears 4.5:1', JSON.stringify(ink));
  const writes = await p.evaluate(() => new Promise(res => { let n = 0; const mo = new MutationObserver(l => { n += l.length; }); mo.observe(document.getElementById('projectView'), { subtree: true, childList: true, attributes: true, characterData: true }); setTimeout(() => { mo.disconnect(); res(n); }, 1500); }));
  ok(writes === 0, '8: settled page writes nothing', writes);
  await ctx.close();
}
{
  const { ctx, p } = await open(390, 844, 'rb-light');
  await p.evaluate(i => openProject(i), await p.evaluate(PICK)); await p.waitForTimeout(1800);
  const th = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const ink = await p.evaluate(INK);
  ok(th === 'rb-light' && ink.length === 3 && ink.every(r => r >= 4.5), '7: light: summary ink clears 4.5:1', JSON.stringify({ th, ink }));
  await ctx.close();
}
{
  const { ctx, p } = await open(1280, 900);
  await p.evaluate(i => openProject(i), await p.evaluate(PICK)); await p.waitForTimeout(1800);
  const s = await p.evaluate(STATE);
  ok(['loc', 'asg', 'rv'].every(k => !s[k].btn && s[k].body) && s.jd, 'wide screen: nothing folds', JSON.stringify(s));
  await ctx.close();
}
await b.close();
console.log(fail ? 'GATE 1375 RED — ' + fail + ' failing' : 'GATE 1375 GREEN');
process.exit(fail ? 1 : 0);
