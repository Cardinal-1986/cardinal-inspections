/* audit_design.mjs — the DESIGN audit. Not a correctness gate.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS, AND HOW IT DIFFERS FROM sentinel.js
 *
 * The sentinel asks "is anything BROKEN" — contrast below a floor, a box
 * shorter than its image, a rule that never wins. Every one of its checks is
 * arithmetic with a pass/fail line, and it deliberately holds no opinions.
 *
 * This asks a different question: "does this app read as ONE product?" That
 * has no pass/fail line. What it has is DISPERSION — how many distinct type
 * sizes actually paint, how many card grounds, how many corner radii. A
 * design system is a small set of values used often. Its absence shows up as
 * a long tail of values used once each, and a long tail is measurable even
 * though "good design" is not.
 *
 * So this prints DISTRIBUTIONS, not verdicts. The judgement stays with a
 * person; the counting does not.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY IT WALKS A REAL BROWSER RATHER THAN READING THE CSS
 *
 * The same trap that has bitten every rig on this project (CLAUDE.md, and
 * sentinel.js's header lists four variants of it): concatenating the 135
 * <style> blocks is NOT the app's CSS. Several are print/report stylesheets
 * living inside template strings that set :root{--ink:#1b1b1b} for an 11pt
 * document. A design audit built on a stylesheet parse would report the
 * contract template's Times New Roman as one of the app's typefaces and
 * count an 11pt body size in the type scale.
 *
 * It also would not know which rules WIN. Two font-size declarations for the
 * same element are one type size on screen, and only the browser knows which.
 *
 * So: load the document, walk what actually painted, read getComputedStyle.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IS DELIBERATELY EXCLUDED, AND WHY (settled decisions — see OPEN_ITEMS)
 *
 *   - Surfaces that are single-theme ON PURPOSE. The Showcase (#cr-show,
 *     574+) and OC Colors (#cr-occ, 615+) are "Blackout" — client-facing
 *     presentation surfaces deliberately outside both app themes. Counting
 *     their palette as app dispersion reports a decision as a defect. They
 *     are harvested but TAGGED, so they can be read separately.
 *   - Print/report templates. They are 11pt documents for paper and share
 *     nothing with the screen system by design.
 *
 * Two more fences this must not trip, both settled by Theo:
 *   - Gradient TEXT is gone (37 sites, build 685). Do not report it back.
 *   - Semantic colours (stage dots, urgency red, CRM badges, status spines)
 *     are fixed in both themes ON PURPOSE and must not be tokenised.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *   node audit_design.mjs <file.html>
 *        [--setup a.js,b.js] [--themes default,rb-light]
 *        [--viewports 390x844,1194x834] [--json out.json]
 *
 * ⚠ Without --setup it only ever sees the login screen, and a sweep of a
 *   login form reports a tidy little system and means nothing by it.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const ARGS = process.argv.slice(2);
const FILE = ARGS.find(a => !a.startsWith('--')) || 'index.html';
const flag = (n, d) => { const i = ARGS.indexOf('--' + n); return i >= 0 ? ARGS[i + 1] : d; };

const SETUP = flag('setup', '');
const THEMES = flag('themes', 'default,rb-light').split(',').map(s => s.trim()).filter(Boolean);
const VIEWPORTS = flag('viewports', '390x844,1194x834').split(',').map(s => {
  const [w, h] = s.split('x').map(Number); return { w, h };
});
const OUT = flag('json', '');

if (!existsSync(FILE)) { console.error('audit_design: no such file: ' + FILE); process.exit(2); }
const HTML = readFileSync(FILE, 'utf8');

const SETUP_JS = SETUP.split(',').map(s => s.trim()).filter(Boolean)
  .map(p => { if (!existsSync(p)) { console.error('audit_design: --setup not found: ' + p); process.exit(2); }
              return readFileSync(p, 'utf8'); })
  .join('\n;\n');

/* ── the probe ───────────────────────────────────────────────────────────
   Runs in the page. Returns one record per VISIBLE element that paints
   something a designer would call a decision: text, a ground, a border, a
   radius, a shadow.

   Attribution matters more than the raw numbers. "There are 41 font sizes"
   is not actionable; "cr-crew-styles alone contributes 9 of them, 6 used
   once" is. So every record carries the nearest enclosing <script id> /
   <style id> module mount it can find. */
const PROBE = `(() => {
  const px = v => { const n = parseFloat(v); return isNaN(n) ? null : Math.round(n * 100) / 100; };

  /* Which module owns this node? Walk up for the nearest id that looks like
     a Cardinal module mount, else the nearest id at all. A record with no
     owner is worse than useless — it cannot be acted on. */
  const owner = el => {
    let n = el, hops = 0;
    while (n && n !== document.body && hops++ < 40) {
      if (n.id) {
        if (/^(cr-|acx|ins|sol|landing|main|resource|crews|tab-)/i.test(n.id)) return n.id;
      }
      n = n.parentElement;
    }
    n = el; hops = 0;
    while (n && n !== document.body && hops++ < 40) { if (n.id) return n.id; n = n.parentElement; }
    return '(body)';
  };

  /* Blackout surfaces are single-theme BY DESIGN (Showcase 574+, OC Colors
     615+). Tag rather than drop, so they can be read on their own terms. */
  const blackout = el => !!el.closest('#cr-show, #cr-occ');

  const out = [];
  const all = document.body ? document.body.querySelectorAll('*') : [];
  let scanned = 0, capped = 0;

  /* ⚠ A CAP THAT DOES NOT SAY SO IS A LIE. This was a bare 6000-element break
     with nothing recording that it fired — silent truncation reads as "covered
     everything" when it did not, which is the project's own no-silent-caps rule
     (and the shape of the coverage check that shrank 15 → 14 and stayed green).
     Now it counts what it skipped and the harness prints it. Measured on the
     25-screen walk: the largest single run kept 343 records, so this has never
     bitten — but "implausible" is not "measured", and now it cannot bite quietly. */
  const CAP = 12000;
  for (const el of all) {
    if (scanned > CAP) { capped++; continue; }
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'HEAD' || tag === 'TEMPLATE') continue;
    /* An iframe's contents are a different document (contracts, the field
       manual). Not this system. */
    if (tag === 'IFRAME' || el.closest('iframe')) continue;

    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (parseFloat(cs.opacity) === 0) continue;

    /* ⚠ A CLOSED DRAWER STILL HAS A FULL-SIZE RECT. #navMenu sits at
       transform:translateX(-320px), pointer-events:none — shut, by the app's
       own mechanism — and getBoundingClientRect happily reports 320x844. The
       first run of this probe harvested the whole closed menu as if it were
       painting, on every screen, and its light-era inks went into the counts.
       Measured, not assumed: rect x = -320, width 320, so x + width = 0.

       Filter HORIZONTALLY only. Content below the fold is real design a user
       scrolls to; content pushed off the left or right edge is a drawer, a
       carousel slide or an off-canvas panel, and is not on screen. Dropping
       everything outside the viewport vertically would throw away most of
       every long page. */
    if (r.right <= 0 || r.left >= window.innerWidth) continue;
    scanned++;

    /* Does this element carry its OWN text, rather than inheriting a box
       around children? Only own-text elements are type decisions. */
    let ownText = '';
    for (const n of el.childNodes) if (n.nodeType === 3) ownText += n.nodeValue;
    ownText = ownText.trim();

    const rec = {
      tag,
      owner: owner(el),
      blackout: blackout(el),
      cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 80),
      w: Math.round(r.width), h: Math.round(r.height),
    };

    if (ownText.length) {
      rec.text = true;
      rec.fs = px(cs.fontSize);
      rec.fw = cs.fontWeight;
      rec.ff = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
      rec.lh = cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight);
      rec.ls = cs.letterSpacing === 'normal' ? '0' : px(cs.letterSpacing) + '';
      rec.tt = cs.textTransform;
      rec.color = cs.color;
      rec.len = ownText.length;
    }

    const bg = cs.backgroundColor, bi = cs.backgroundImage;
    const paints = (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || (bi && bi !== 'none');
    if (paints) {
      rec.bg = bg;
      if (bi && bi !== 'none') rec.bgi = bi.slice(0, 120);
      /* Radius as the four corners, normalised. A "card" with 4 different
         radii is a different decision from one with a single value. */
      const rr = [cs.borderTopLeftRadius, cs.borderTopRightRadius,
                  cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px);
      rec.radius = rr.every(v => v === rr[0]) ? rr[0] : rr.join('/');
      rec.shadow = cs.boxShadow === 'none' ? null : cs.boxShadow.slice(0, 100);
      rec.pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px).join('/');
    }

    const bw = px(cs.borderTopWidth);
    if (bw > 0) { rec.bw = bw; rec.bc = cs.borderTopColor; }

    if (cs.display === 'flex' || cs.display === 'grid') {
      const g = px(cs.gap);
      if (g !== null && g > 0) rec.gap = g;
    }

    if (rec.text || rec.bg || rec.bw || rec.gap != null) out.push(rec);
  }
  return { scanned, capped, records: out };
})()`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());

const harvest = [];
const runNotes = [];

for (const theme of THEMES) {
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('https://design.test/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u) || /image/i.test(r.request().headers().accept || ''))
      return r.fulfill({ status: 200, contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    return r.fulfill({ status: 200, body: '' });
  });

  /* Same theme mechanics as the sentinel, and for the same reason: the CRM
     themes ITSELF at boot from its own localStorage key, so setting the
     attribute alone gives you a dark sweep under a light label. The setup
     file translates __sentinelTheme into the app's key. */
  if (theme !== 'default')
    await page.addInitScript(
      `window.__sentinelTheme = ${JSON.stringify(theme)};` +
      `(function put(){ var r = document.documentElement;` +
      `  if (r) { r.setAttribute('data-theme', ${JSON.stringify(theme)}); return; }` +
      `  new MutationObserver(function(_, o){ if (document.documentElement) { o.disconnect(); put(); } })` +
      `    .observe(document, { childList: true }); })();`);
  if (SETUP_JS) await page.addInitScript(SETUP_JS);

  try {
    await page.goto('https://design.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
  } catch (e) {
    runNotes.push(`LOAD FAILED ${theme} ${vp.w}: ${e.message}`);
    await ctx.close(); continue;
  }

  const stateNames = await page.evaluate(`(window.__sentinelStates || []).map(s => s.name)`).catch(() => []);
  const states = stateNames.length ? stateNames : [null];
  if (!stateNames.length) runNotes.push(`⚠ ${theme} ${vp.w}px — NO STATES: this is the login screen only`);

  for (let si = 0; si < states.length; si++) {
    if (states[si] !== null) {
      try {
        await page.evaluate(`Promise.resolve(window.__sentinelStates[${si}].run())`);
        await page.waitForTimeout(400);
      } catch (e) {
        runNotes.push(`state "${states[si]}" threw @${theme} ${vp.w}px: ${String(e.message).split('\n')[0]}`);
        continue;
      }
    }
    let res;
    try { res = await page.evaluate(PROBE); }
    catch (e) { runNotes.push(`probe threw @${states[si]} ${theme} ${vp.w}px: ${e.message}`); continue; }
    if (res.capped)
      runNotes.push(`⚠ CAP HIT on "${states[si]}" @${theme} ${vp.w}px — ${res.capped} elements skipped. `
                  + `The counts below UNDERSTATE this screen. Raise CAP in the probe and re-run.`);
    for (const rec of res.records)
      harvest.push({ ...rec, screen: states[si] || 'login', theme, vw: vp.w });
  }
  await ctx.close();
}
}
await browser.close();

/* ── analysis ────────────────────────────────────────────────────────────
   Everything below counts DISTINCT USED values and their long tails. The
   single most useful column is "used once": a value that appears exactly
   once across every screen is, almost always, a decision nobody made twice
   on purpose. */

const tally = (rows, keyfn) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyfn(r); if (k === null || k === undefined || k === '') continue;
    if (!m.has(k)) m.set(k, { n: 0, owners: new Set(), screens: new Set() });
    const e = m.get(k); e.n++; e.owners.add(r.owner); e.screens.add(r.screen);
  }
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
};

const app = harvest.filter(r => !r.blackout);
const text = app.filter(r => r.text);
const boxes = app.filter(r => r.bg);

const report = { file: FILE, themes: THEMES, viewports: VIEWPORTS.map(v => v.w + 'x' + v.h),
                 totalRecords: harvest.length, appRecords: app.length,
                 blackoutRecords: harvest.length - app.length, runNotes,
                 screens: [...new Set(harvest.map(r => r.screen))] };

const section = (title, rows) => {
  const once = rows.filter(([, e]) => e.n === 1).length;
  return { title, distinct: rows.length, usedOnce: once,
           top: rows.slice(0, 14).map(([k, e]) => ({ v: k, n: e.n, owners: e.owners.size,
                                                     where: [...e.owners].slice(0, 3).join(', ') })),
           tail: rows.filter(([, e]) => e.n <= 2)
                     .map(([k, e]) => ({ v: k, n: e.n, where: [...e.owners].slice(0, 2).join(', ') })) };
};

report.type      = section('font-size (px)',   tally(text,  r => r.fs));
report.weight    = section('font-weight',      tally(text,  r => r.fw));
report.family    = section('font-family',      tally(text,  r => r.ff));
report.radius    = section('border-radius',    tally(boxes, r => r.radius));
report.ground    = section('background-color', tally(boxes, r => r.bg));
report.ink       = section('text color',       tally(text,  r => r.color));
report.shadow    = section('box-shadow',       tally(boxes, r => r.shadow));
report.gap       = section('flex/grid gap',    tally(app,   r => r.gap));
report.padding   = section('padding',          tally(boxes, r => r.pad));
report.border    = section('border colour',    tally(app.filter(r => r.bw), r => r.bc));
report.letterSp  = section('letter-spacing',   tally(text,  r => r.ls));

/* Per-module dispersion: which module contributes the most one-off values?
   That is the actionable ranking — it names where to spend a build. */
const byOwner = new Map();
for (const r of app) {
  if (!byOwner.has(r.owner)) byOwner.set(r.owner, { fs: new Set(), radius: new Set(), bg: new Set(), n: 0 });
  const e = byOwner.get(r.owner); e.n++;
  if (r.fs != null) e.fs.add(r.fs);
  if (r.radius != null) e.radius.add(r.radius);
  if (r.bg) e.bg.add(r.bg);
}
report.modules = [...byOwner.entries()]
  .map(([k, e]) => ({ owner: k, records: e.n, sizes: e.fs.size, radii: e.radius.size, grounds: e.bg.size,
                      spread: e.fs.size + e.radius.size + e.bg.size }))
  .sort((a, b) => b.spread - a.spread).slice(0, 25);

if (OUT) { writeFileSync(OUT, JSON.stringify({ report, harvest }, null, 1)); }

/* ── print ─────────────────────────────────────────────────────────────── */
const bar = n => '█'.repeat(Math.min(40, Math.max(1, Math.round(n))));
console.log('\n════ DESIGN AUDIT — ' + FILE);
console.log('screens: ' + report.screens.join(', '));
console.log(`themes: ${THEMES.join(', ')}  ·  widths: ${VIEWPORTS.map(v => v.w).join(', ')}`);
console.log(`records: ${harvest.length} total, ${app.length} app, ${report.blackoutRecords} on Blackout surfaces (excluded from the counts)`);
if (runNotes.length) { console.log('\n⚠ RUN NOTES'); runNotes.forEach(n => console.log('   ' + n)); }

for (const key of ['type', 'weight', 'family', 'radius', 'ground', 'ink', 'shadow', 'gap', 'padding', 'border', 'letterSp']) {
  const s = report[key];
  console.log(`\n── ${s.title}: ${s.distinct} distinct, ${s.usedOnce} used exactly once`);
  s.top.slice(0, 10).forEach(t => console.log(`   ${String(t.v).padEnd(28)} ${String(t.n).padStart(5)}  ${bar(Math.log2(t.n + 1) * 3)}  ${t.where}`));
  if (s.distinct > 10) console.log(`   … ${s.distinct - 10} more`);
}

console.log('\n── modules by spread (sizes + radii + grounds)');
report.modules.slice(0, 14).forEach(m =>
  console.log(`   ${m.owner.padEnd(26)} ${String(m.records).padStart(5)} recs  ${String(m.sizes).padStart(3)} sizes  ${String(m.radii).padStart(3)} radii  ${String(m.grounds).padStart(3)} grounds`));

if (OUT) console.log('\nfull harvest → ' + OUT);
console.log('');
