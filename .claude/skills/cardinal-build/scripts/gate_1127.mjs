/* gate_1127.mjs — the three real INK findings from the 195-finding sweep triage.
 *
 * Theo picked "ship all three" after the triage. What the triage found:
 *   · 120 OVERRIDDEN + 44 DEAD  — the cascade working; the tool itself
 *     deprioritises OVERRIDDEN as "just the cascade"
 *   · 27 TRUNCATED              — not defects, coverage warnings about its own cap
 *   ·  1 FLOOR                  — FALSE POSITIVE: #acxTrBtn renders 183x44px; the
 *                                 check asserts the min-width DECLARATION wins,
 *                                 and parseFloat('auto') is 0
 *   ·  3 INK                    — real, and this gate holds them
 *
 * ⚠ The punch one was NOT a one-element bug. `.pu-m` takes its colour from
 * --rbe-mute2, a token with 21 consumers that was under the 4.5 floor on EVERY
 * dark ground (4.21 page / 3.05 card). The sweep reported the single consumer
 * that happened to render. So this gate checks the TOKEN on two real grounds,
 * not just the one element — the .viewhead lesson: ask who else uses it.
 *
 * Scores against the COMPOSITED ground (walks ancestors for a painted colour),
 * because background-color alone sails past a card that paints a gradient.
 *
 * Negative control: point it at 1126 -> RED on all three, without crashing.
 *   node gate_1127.mjs [file.html]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const FLOOR = 4.5;   /* every element here is 11px — none qualifies as large text */

const b = await chromium.launch();

async function open(state){
  const p = await b.newPage({ viewport:{ width:390, height:844 } });
  for (const f of ['sentinel_setup_cardinal.js','e2e_mock_supa.js'])
    await p.addInitScript(readFileSync(S + f, 'utf8'));
  await p.goto(URL_, { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(async (st) => {
    const s = (window.__sentinelStates || []).find(x => x.name === st);
    if (s) { try { await s.run(); } catch(e) {} }
  }, state).catch(() => {});
  await p.waitForTimeout(1400);
  return p;
}

/* one measuring function, injected, so every number in this gate comes from the
   same instrument */
const MEASURE = `(sel) => {
  const L = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); };
  const RAT = (a,b) => { let x=L(a), y=L(b); if(x<y){const t=x;x=y;y=t;} return (x+0.05)/(y+0.05); };
  const px = s => { const m=String(s).match(/(\\d+(\\.\\d+)?)[,\\s]+(\\d+(\\.\\d+)?)[,\\s]+(\\d+(\\.\\d+)?)/);
    return m?[+m[1],+m[3],+m[5]]:null; };
  /* Collect EVERY ground an ancestor actually paints - the solid colour AND
     every stop of any gradient - and score against the WORST. Reading only
     backgroundColor and stopping at the first hit sails straight past a card
     that paints a linear-gradient and reports the page behind it, which is how
     a first cut of this gate scored the punch line on rgb(9,9,12) when the
     sweep had it on rgb(38,42,49). Same trap the doc set records twice. */
  const alpha = s => { const m = String(s).match(/rgba\\([^)]*,\\s*([\\d.]+)\\s*\\)/); return m ? +m[1] : 1; };
  const grounds = el => { let n = el; const out = [];
    while (n && n !== document.documentElement) { const cs = getComputedStyle(n);
      let opaque = false;
      const bi = cs.backgroundImage || '';
      if (bi && bi !== 'none') {
        const stops = bi.match(/rgba?\\([^)]+\\)/g) || [];
        for (const s of stops) { const c = px(s); if (c) { out.push(c); if (alpha(s) >= 1) opaque = true; } }
      }
      const solid = px(cs.backgroundColor);
      if (solid && !/rgba\\(0, 0, 0, 0\\)/.test(cs.backgroundColor)) {
        out.push(solid); if (alpha(cs.backgroundColor) >= 1) opaque = true;
      }
      /* STOP at the first fully opaque paint. Anything above it is covered and
         cannot affect what the eye sees. Walking past it scored the estimate
         picker's labels against the page ground two levels up, behind an opaque
         #eef1f4 card and a 0.55 scrim, and turned a correct 4.83:1 into 3.63:1.
         Stopping too EARLY is the opposite error: reading only backgroundColor
         skips .pu-card's gradient entirely and reports the page. Collect every
         stop at each level, then stop once something opaque has been painted. */
      if (opaque) return out;
      n = n.parentElement; }
    out.push([9,9,12]);
    return out; };
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const bx = el.getBoundingClientRect(); if (bx.width < 1 || bx.height < 1) continue;
    const cs = getComputedStyle(el); const fg = px(cs.color); if (!fg) continue;
    const gs = grounds(el);
    let worst = gs[0], wr = RAT(fg, gs[0]);
    for (const g of gs) { const r = RAT(fg, g); if (r < wr) { wr = r; worst = g; } }
    out.push({ text:(el.textContent||'').trim().slice(0,22), fg:cs.color,
               g:'rgb('+worst.join(',')+')', ratio:+wr.toFixed(2), size:cs.fontSize });
  }
  return out;
}`;

/* ── 1 + 2. the two trade labels, on the picker's own light card ────────── */
{
  const p = await open('estlibrary');
  const rows = await p.evaluate(new Function('return ' + MEASURE)(), 'span.cn').catch(() => []);
  ok(rows.length > 0, 'the estimate library renders its category headers (' + rows.length + ')');
  const worst = rows.slice().sort((a,b) => a.ratio - b.ratio)[0];
  for (const want of ['Roofing','Gutters']) {
    const r = rows.find(x => x.text === want);
    if (!r) { ok(false, want + ' header not found on screen (control tree?)'); continue; }
    ok(r.ratio >= FLOOR, want + ' header is readable — ' + r.ratio + ':1 on ' + r.g +
       ' (floor ' + FLOOR + ', ' + r.size + ')');
  }
  /* the whole family, not just the two that were reported */
  ok(worst && worst.ratio >= FLOOR,
     'EVERY trade header clears the floor, not only the two the sweep named — worst is "' +
     (worst && worst.text) + '" at ' + (worst && worst.ratio) + ':1');
  await p.close();
}

/* ── 3. the token, on two real grounds ─────────────────────────────────── */
{
  const p = await open('punch');
  const rows = await p.evaluate(new Function('return ' + MEASURE)(), '.pu-m').catch(() => []);
  ok(rows.length > 0, 'the punch card renders its description line (' + rows.length + ')');
  const w = rows.slice().sort((a,b) => a.ratio - b.ratio)[0];
  ok(w && w.ratio >= FLOOR,
     'the punch-out description is readable — ' + (w && w.ratio) + ':1 on ' + (w && w.g) +
     ' (was 3.05:1; this is the screen read on a roof)');
  await p.close();
}
{
  const p = await open('client');
  const rows = await p.evaluate(new Function('return ' + MEASURE)(), '.kpcar').catch(() => []);
  if (rows.length) {
    const w = rows.sort((a,b) => a.ratio - b.ratio)[0];
    ok(w.ratio >= FLOOR, 'the SECOND consumer of the same token also clears it — .kpcar ' +
       w.ratio + ':1 on ' + w.g + ' (was 4.21:1, and the sweep never named it)');
  } else ok(true, '.kpcar not on screen in this state — skipped, not failed');
  /* the token itself, read from the cascade rather than from any one element */
  const tok = await p.evaluate(() => ({
    mute:  getComputedStyle(document.documentElement).getPropertyValue('--rbe-mute').trim(),
    mute2: getComputedStyle(document.documentElement).getPropertyValue('--rbe-mute2').trim() }));
  ok(tok.mute2.toLowerCase() === '#9aa0a8',
     'the dark --rbe-mute2 is the measured value (' + tok.mute2 + ')');
  /* ⚠ SUPERSEDED BY 1128, and left here rather than deleted so the reversal is
     legible. 1127 asserted mute === mute2 on dark, because --rbe-mute was then
     the dimmest grey clearing 4.5 on the binding ground and nothing dimmer could
     be readable — so the floor beat the hierarchy and the collapse was recorded
     as a decision. 1128 took the third option neither of us had costed: LIFT the
     brighter level instead of dimming the quieter one, which makes room beneath
     it. Both now clear the floor AND read as two levels. What this gate should
     assert is therefore the opposite, and gate_1128.mjs owns the ladder. */
  ok(tok.mute.toLowerCase() !== tok.mute2.toLowerCase(),
     'mute and mute2 are two colours again (' + tok.mute + ' vs ' + tok.mute2 +
     ') — 1127 collapsed them, 1128 restored the step by lifting mute');
  await p.close();
}

/* ── the light twin was deliberately NOT changed; prove it is still there ─ */
{
  const src = readFileSync(FILE, 'utf8');
  /* ⚠ 1127 asserted the light twin stayed #6b6b6b/#8a8a8a, on the grounds that a
     light render found NOTHING using mute2. That render walked ONE screen. Swept
     across ten, light mute2 has three consumers — and one is the punch-out
     description, still at 3.22:1 in light after 1127 "fixed" it in dark. Light
     mute was failing too, at 4.35:1 on a cream ground. 1128 fixed both. The
     lesson kept here: a single-screen render is not a theme audit. */
  ok(/--rbe-mute:#585858;--rbe-mute2:#6e6e6e;/.test(src),
     'the LIGHT pair is fixed too (1128) — 1127 skipped it on a one-screen render ' +
     'that wrongly concluded nothing used it');
}

await b.close();
console.log('\n' + (fail ? 'RED — ' + fail + ' failed, ' + pass + ' passed'
                         : 'GREEN — all ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
