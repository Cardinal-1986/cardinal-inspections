/* gate_1220.mjs — a REAL Chromium render of build 1220's three changes.

     A. Lead is bright lemon (#FFE600) wherever it is a STAGE marker: the
        pipeline strip (dark), the pipeline sphere (light), STAGE_COLORS, and the
        STAGE_INK text twin, which must still clear the 5.27:1 the old mustard
        twin held — .dbstage paints white text on it.
     B. Rep names and job numbers are soft white (#DCE3EC) in DARK, scored against
        the ground they actually composite over. Light keeps its reds, asserted
        unchanged, because "the dark fix broke light" is half of this project's
        colour bugs.
     C. The calendar + Accounts Receivable row (.opsrow) is ONE column on a phone
        at every text size, "Accounts Receivable" sits on one line at Normal, and
        the calendar does not spill out of its card at Larger. Desktop keeps two
        columns.

   ⚠ Written to go RED on 1218 rather than crash (BUG_CLASSES 37): every probe is
   guarded and returns a value the assertion can read.

   usage:  node gate_1220.mjs [file.html]      (default: the repo's index.html)
*/
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../../../..');
const artifact = resolve(process.argv[2] || resolve(root, 'index.html'));
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require_(existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright');
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 600000).unref();

/* contrast — arithmetic. ⚠ Chromium reports color-mix()/modern colours as
   `color(srgb r g b)` on a 0-1 scale; reading that with a 0-255 parser hands
   back a confident wrong ratio (gate_1114 learned it first). Parse both. */
const rgb = s => {
  s = String(s || '');
  const c = /color\(\s*srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/.exec(s);
  if (c) return [c[1], c[2], c[3]].map(v => Math.round(Math.min(1, Math.max(0, +v)) * 255));
  const m = /(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)/.exec(s);
  return m ? [+m[1], +m[2], +m[3]] : null;
};
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const same = (a, b) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= 2);

/* The first OPAQUE ground behind an element. Within one element the
   background-image composites over its own background-color, so a gradient
   stop is collected before the colour; an ancestor behind an opaque ground is
   not reached. Worst stop wins. */
const PROBE_GROUND = `(el) => {
  const P = s => { const m = /(-?[\\d.]+)[,\\s]+(-?[\\d.]+)[,\\s]+(-?[\\d.]+)(?:[,\\s/]+([\\d.]+))?/.exec(s||''); return m ? [+m[1],+m[2],+m[3], m[4]===undefined?1:+m[4]] : null; };
  const grounds = [];
  for (let x = el; x; x = x.parentElement) {
    const cs = getComputedStyle(x);
    const stops = (cs.backgroundImage.match(/rgba?\\([^)]*\\)/g) || []).map(P).filter(Boolean);
    stops.forEach(s => grounds.push(s));
    const bc = P(cs.backgroundColor);
    if (bc && bc[3] > 0.95) { grounds.push(bc); break; }
  }
  return grounds.map(g => g.slice(0,3));
}`;

const S = here + '/';
async function open(browser, { theme, width, size }) {
  const p = await browser.newPage({ viewport: { width, height: 900 } });
  await p.addInitScript(([t, z]) => {
    window.__sentinelTheme = t;
    try { if (z && z !== 'md') localStorage.setItem('cr-textsize', z); else localStorage.removeItem('cr-textsize'); } catch (e) {}
  }, [theme, size]);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
    await p.addInitScript(readFileSync(S + f, 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  return p;
}

const browser = await launchChromium(chromium);
const LEMON = hex('#FFE600'), SOFT = hex('#DCE3EC');

/* ── A + B, both themes, phone width ───────────────────────────────────── */
for (const theme of ['dark', 'rb-light']) {
  const tag = theme === 'dark' ? 'dark' : 'light';
  console.log('\n── ' + tag + ' @390 ' + '─'.repeat(40));
  const p = await open(browser, { theme, width: 390, size: 'md' });
  const r = await p.evaluate(`(() => {
    const out = {};
    const c = document.querySelector('#pipeRow .pipebtn[data-stg="Lead"] .pcirc');
    out.lead = c ? { bg: getComputedStyle(c).backgroundColor, img: getComputedStyle(c).backgroundImage } : null;
    out.sc = typeof STAGE_COLORS !== 'undefined' ? STAGE_COLORS.Lead : null;
    out.ink = typeof STAGE_INK !== 'undefined' ? STAGE_INK.Lead : null;
    return out;
  })()`).catch(e => ({ err: String(e) }));
  if (r.err) { ok(false, tag + ' — page probe threw', r.err); await p.close(); continue; }

  if (theme === 'dark') {
    ok(r.lead && same(rgb(r.lead.bg), LEMON), 'dark — the Lead pipeline strip is lemon #FFE600', r.lead && r.lead.bg);
  } else {
    ok(r.lead && /255,\s*230,\s*0/.test(r.lead.img), 'light — the Lead sphere shading is built on lemon', r.lead && r.lead.img.slice(0, 90));
  }
  ok(r.sc === '#FFE600', tag + " — STAGE_COLORS.Lead is '#FFE600'", r.sc);
  const twin = r.ink ? ratio(hex(r.ink), [255, 255, 255]) : 0;
  ok(twin >= 5.27, tag + ' — the STAGE_INK Lead twin still clears 5.27:1 on white (white text sits on it in .dbstage)',
     (r.ink || 'missing') + ' = ' + twin.toFixed(2) + ':1');

  /* B: Leads list — rep names (.ljrep) and job numbers (.ljpo) */
  await p.evaluate(() => { try { openLeadsView(); } catch (e) {} });
  await p.waitForTimeout(1500);
  const names = await p.evaluate(`(() => {
    const ground = ${PROBE_GROUND};
    const take = sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length)
      .slice(0, 4).map(e => ({ t: e.textContent.trim(), ink: getComputedStyle(e).color, op: +getComputedStyle(e).opacity, g: ground(e) }));
    return { rep: take('#leadsView .ljrep'), po: take('#leadsView .ljpo') };
  })()`).catch(e => ({ err: String(e) }));
  if (names.err) { ok(false, tag + ' — leads probe threw', names.err); await p.close(); continue; }
  ok(names.rep.length > 0 && names.po.length > 0, tag + ' — the Leads list renders rep names and job numbers (coverage floor)',
     names.rep.length + ' rep · ' + names.po.length + ' job no.');
  for (const [k, list] of [['rep name', names.rep], ['job number', names.po]]) {
    if (!list.length) continue;
    const e = list[0], ink = rgb(e.ink);
    if (theme === 'dark') {
      ok(same(ink, SOFT), 'dark — ' + k + ' "' + e.t + '" is soft white #DCE3EC', e.ink);
      /* opacity .9 on .ljpo: score the ink as the eye sees it, blended over the ground */
      const worst = Math.min(...e.g.map(g => {
        const seen = ink ? ink.map((v, i) => v * e.op + g[i] * (1 - e.op)) : [0, 0, 0];
        return ratio(seen, g);
      }));
      ok(worst >= 4.5, 'dark — ' + k + ' clears 4.5:1 on its composited ground', worst.toFixed(2) + ':1');
    } else {
      const want = k === 'rep name' ? hex('#c8202e') : hex('#8f1620');
      ok(same(ink, want), 'light — ' + k + ' is UNCHANGED (' + (k === 'rep name' ? '#c8202e' : '#8f1620') + ')', e.ink);
    }
  }
  await p.close();
}

/* ── C: the dashboard row, phone at every size + desktop ───────────────── */
for (const [width, size] of [[390, 'md'], [390, 'lg'], [390, 'xl'], [1194, 'md']]) {
  const at = '@' + width + ' ' + size;
  console.log('\n── layout ' + at + ' ' + '─'.repeat(36));
  const p = await open(browser, { theme: 'dark', width, size });
  const r = await p.evaluate(`(() => {
    const row = document.querySelector('.opsrow');
    if (!row) return { missing: true };
    const cols = getComputedStyle(row).gridTemplateColumns.trim().split(/\\s+/).length;
    const t = document.querySelector('#arCard .pipetitle');
    let lines = null;
    if (t) { const lh = parseFloat(getComputedStyle(t).lineHeight) || parseFloat(getComputedStyle(t).fontSize) * 1.25;
      lines = Math.round(t.getBoundingClientRect().height / lh); }
    const cal = document.querySelector('.prodcal');
    return { cols, lines, calSpill: cal ? cal.scrollWidth - cal.clientWidth : null };
  })()`).catch(e => ({ err: String(e) }));
  if (r.err || r.missing) { ok(false, at + ' — .opsrow probe', r.err || 'no .opsrow'); await p.close(); continue; }
  if (width < 600) {
    ok(r.cols === 1, at + ' — calendar and receivables stack (one column)', r.cols + ' column(s)');
    ok(r.calSpill !== null && r.calSpill <= 1, at + ' — the calendar stays inside its card', 'spill ' + r.calSpill + 'px');
    if (size === 'md') ok(r.lines === 1, at + ' — "Accounts Receivable" sits on one line', r.lines + ' line(s)');
  } else {
    ok(r.cols === 2, at + ' — desktop keeps them side by side', r.cols + ' column(s)');
  }
  await p.close();
}

await browser.close();
console.log('\n' + (fail ? 'GATE 1220 RED' : 'GATE 1220 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
