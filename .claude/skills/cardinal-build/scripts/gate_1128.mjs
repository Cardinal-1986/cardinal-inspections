/* gate_1128.mjs — the two mute levels are two levels again, in BOTH themes.
 *
 * 1127 raised --rbe-mute2 to clear the 4.5 floor and landed on the value
 * --rbe-mute already held, because --rbe-mute was itself the dimmest grey that
 * clears the floor on the binding ground. Two names, one colour. 1128 lifts the
 * brighter level to make room instead of dimming the quieter one back.
 *
 * ⚠ This gate checks BOTH themes, because 1127's light half was skipped on the
 * strength of a render that walked ONE screen and found nothing using mute2.
 * Ten screens find three, and one of them — the punch-out description — was
 * still at 3.22:1 in light after 1127 "fixed" it in dark. A single-screen render
 * is not a theme audit.
 *
 * Scores against the COMPOSITED ground and COMPOSITES ALPHA — a translucent wash
 * must be blended with what is behind it, not scored at full strength. Getting
 * that wrong reported a mute label on a 6%-opacity gold hero at 1.57:1 when the
 * truth is 6.97:1 (BUG_CLASSES 80).
 *
 * Negative control: point it at 1127 -> RED (dark levels identical; light mute2
 * under floor), without crashing.
 *   node gate_1128.mjs [file.html]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);
const FLOOR = 4.5, STEP = 1.15;   /* under 1.15x two greys read as one colour */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const b = await chromium.launch();

const PROBE = `(theme) => {
  const L = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); };
  const RAT = (a,b) => { let x=L(a), y=L(b); if(x<y){const t=x;x=y;y=t;} return (x+0.05)/(y+0.05); };
  const px = s => { s = String(s).trim();
    /* ⚠ A TOKEN's value is a hex string (#b8bec6); a computed colour is
       rgb(...) or color(srgb ...). The first cut of this gate fed hex to an
       rgb() regex, got null, and matched ZERO elements in both themes - it
       reported 0 rather than passing, which is the only reason it was caught.
       ⚠ And this comment lives inside a TEMPLATE LITERAL: a backtick here ends
       the string and the file stops parsing. No backticks in PROBE. */
    const h = s.match(/^#([0-9a-f]{6})$/i);
    if (h) return [0,2,4].map(i => parseInt(h[1].slice(i,i+2),16));
    const h3 = s.match(/^#([0-9a-f]{3})$/i);
    if (h3) return [0,1,2].map(i => parseInt(h3[1][i]+h3[1][i],16));
    const m = s.match(/color\\(srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)/);
    if (m) return [Math.round(+m[1]*255), Math.round(+m[2]*255), Math.round(+m[3]*255)];
    const r = s.match(/(\\d+(\\.\\d+)?)[,\\s]+(\\d+(\\.\\d+)?)[,\\s]+(\\d+(\\.\\d+)?)/);
    return r ? [+r[1],+r[3],+r[5]] : null; };
  const al = s => { const m = String(s).match(/rgba\\([^)]*,\\s*([\\d.]+)\\s*\\)/); return m ? +m[1] : 1; };
  const base = theme === 'rb-light' ? [255,255,255] : [9,9,12];
  /* composite the stack: translucent layers blend, an opaque one ends the walk */
  const ground = el => { let n = el; const layers = [];
    while (n && n !== document.documentElement) { const cs = getComputedStyle(n);
      const bi = cs.backgroundImage || '';
      if (bi && bi !== 'none') { const stops = bi.match(/rgba?\\([^)]+\\)/g) || [];
        let opq = false;
        for (const s of stops) { const c = px(s); if (c) { layers.push({c, a: al(s)}); if (al(s) >= 1) opq = true; } }
        if (opq) break; }
      const so = px(cs.backgroundColor);
      if (so && !/rgba\\(0, 0, 0, 0\\)/.test(cs.backgroundColor)) {
        const a = al(cs.backgroundColor); layers.push({c: so, a});
        if (a >= 1) break; }
      n = n.parentElement; }
    layers.push({c: base, a: 1});
    let acc = null;
    for (let i = layers.length - 1; i >= 0; i--)
      acc = acc ? [0,1,2].map(k => Math.round(layers[i].a*layers[i].c[k] + (1-layers[i].a)*acc[k]))
                : layers[i].c;
    return acc; };
  const cs0 = getComputedStyle(document.documentElement);
  const tok = n => px(cs0.getPropertyValue(n).trim());
  const M1 = tok('--rbe-mute'), M2 = tok('--rbe-mute2');
  const near = (fg,t) => t && Math.abs(fg[0]-t[0])+Math.abs(fg[1]-t[1])+Math.abs(fg[2]-t[2]) <= 4;
  const out = { mute: cs0.getPropertyValue('--rbe-mute').trim(),
                mute2: cs0.getPropertyValue('--rbe-mute2').trim(), m1: [], m2: [] };
  for (const el of document.querySelectorAll('*')) {
    const bx = el.getBoundingClientRect(); if (bx.width < 1 || bx.height < 1) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); const fg = px(cs.color); if (!fg) continue;
    const which = near(fg, M1) ? 'm1' : near(fg, M2) ? 'm2' : null; if (!which) continue;
    const g = ground(el);
    out[which].push({ r: +RAT(fg, g).toFixed(2), g: 'rgb('+g.join(',')+')',
                      t: (el.textContent||'').trim().slice(0,24), size: cs.fontSize });
  }
  return out; }`;

const STATES = ['client','punch','nav','leads','clientdir','album','production','feed','estlibrary','lineitems'];

async function sweep(theme){
  const p = await b.newPage({ viewport:{ width:390, height:844 } });
  for (const f of ['sentinel_setup_cardinal.js','e2e_mock_supa.js'])
    await p.addInitScript(readFileSync(S + f, 'utf8'));
  await p.goto(URL_, { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(2600);
  const agg = { mute:null, mute2:null, m1:[], m2:[] };
  for (const st of STATES) {
    const r = await p.evaluate(async ({ st, theme, PROBE }) => {
      if (theme) document.documentElement.setAttribute('data-theme', theme);
      else document.documentElement.removeAttribute('data-theme');
      const s = (window.__sentinelStates || []).find(x => x.name === st);
      if (s) { try { await s.run(); } catch(e) {} }
      if (theme) document.documentElement.setAttribute('data-theme', theme);
      await new Promise(r => setTimeout(r, 800));
      return (new Function('return ' + PROBE)())(theme);
    }, { st, theme, PROBE }).catch(() => null);
    if (!r) continue;
    agg.mute = r.mute; agg.mute2 = r.mute2;
    agg.m1.push(...r.m1); agg.m2.push(...r.m2);
  }
  await p.close();
  return agg;
}

for (const [label, theme] of [['DARK', null], ['LIGHT', 'rb-light']]) {
  console.log('\n── ' + label + ' ──');
  const a = await sweep(theme);
  ok(!!(a.mute && a.mute2), label + ': both tokens resolve (' + a.mute + ' / ' + a.mute2 + ')');
  ok(a.mute && a.mute2 && a.mute.toLowerCase() !== a.mute2.toLowerCase(),
     'THE TWO LEVELS ARE DIFFERENT COLOURS — ' + a.mute + ' vs ' + a.mute2);
  ok(a.m1.length > 0, '  · elements painted --rbe-mute render (' + a.m1.length + ')');
  ok(a.m2.length > 0, '  · elements painted --rbe-mute2 render (' + a.m2.length + ')');
  for (const [n, rows] of [['--rbe-mute', a.m1], ['--rbe-mute2', a.m2]]) {
    if (!rows.length) continue;
    const w = rows.slice().sort((x,y) => x.r - y.r)[0];
    ok(w.r >= FLOOR, '  · every ' + n + ' element clears ' + FLOOR + ' — worst ' +
       w.r + ':1 on ' + w.g + ' ("' + w.t + '", ' + w.size + ')');
  }
  /* the step has to be visible, not merely non-zero */
  if (a.m1.length && a.m2.length) {
    const w1 = Math.min(...a.m1.map(x => x.r)), w2 = Math.min(...a.m2.map(x => x.r));
    ok(w1 / w2 >= STEP, '  · and the levels are VISIBLY apart — ' + (w1/w2).toFixed(2) +
       'x on the shared worst ground (needs >= ' + STEP + 'x)');
  }
}

await b.close();
console.log('\n' + (fail ? 'RED — ' + fail + ' failed, ' + pass + ' passed'
                         : 'GREEN — all ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
