/* gate_1481 — Sun clears its own 7:1 on the Production day sky and the punch card (Theo, option 1).
 *   A  Sun, the day sky: "Production", the date and the eyebrow each read >= 7:1 against the sky they sit on
 *   B  Sun, rain over a day sky keeps white words on its dark sky (the rule must not paint black on #14171c)
 *   C  Sun, snow over a day sky: dark words, >= 7:1 on its pale sky
 *   D  Light, the day sky: the words are what they were (#0b1a2c / #1c3048) — Sun only
 *   E  Sun, the green Close button (Curtis, a card that is ready): its word and its sub-line >= 7:1
 *   F  Sun, the On site band: "Not checked in", On site and stale each >= 7:1 on the band
 *   G  Light and Dark: the Close button keeps #1b7d49 and the band its 1462 inks — Sun only
 * Arg: [index.html] -> negative control (1480 must go RED on A, E and F).
 * The day is pinned (GATE_NOW 15:00) so the sky is the day sky; the sky's attributes are also set by hand
 * for B and C, which no clock can choose. */
process.env.GATE_NOW = process.env.GATE_NOW || '2026-11-15T15:00:00';
import { APP } from './gate_env.mjs';
process.env.APPFILE = process.argv[2] || APP;
const { boot } = await import('./gate_1400_lib.mjs');

let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 240) : '')); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const theme = t => `try{localStorage.setItem('cardinal.theme.rb',${JSON.stringify(t)});}catch(e){}`;

/* contrast, in the page: an element's ink against a given ground */
const RATIO = `(ink, bg) => { const p = c => { const m = c.match(/[\\d.]+/g).map(Number); return m.slice(0, 3); };
  const L = c => { const [r, g, b] = p(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const a = L(ink), b = L(bg); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; }`;

async function board(t) {
  const { browser, page } = await boot('curtis', { init: theme(t) });
  await page.evaluate(() => { ['landingView','loginView'].forEach(id => { const e = document.getElementById(id); if (e) { e.style.display = 'none'; e.classList.remove('open'); } }); window.CardinalProduction.open(); });
  await page.waitForFunction(() => !!document.querySelector('#cr-pb.open .pbsky'), null, { timeout: 15000, polling: 150 }).catch(() => {});
  await sleep(900);
  return { browser, page };
}
/* set the sky's hour and weather by hand, then read the three inks against the colour the sky paints */
const SKY = `((o) => { const R = (${RATIO}); const s = document.querySelector('#cr-pb .pbsky'); if (!s) return { err: 'no .pbsky' };
  s.setAttribute('data-sky', o.sky); if (o.wx) s.setAttribute('data-wx', o.wx); else s.removeAttribute('data-wx');
  const bg = getComputedStyle(s).backgroundColor; const q = sel => { const e = s.querySelector(sel); if (!e) return null; const c = getComputedStyle(e).color; return { ink: c, r: R(c, bg) }; };
  return { sun: document.documentElement.getAttribute('data-cr-sun'), bg, h1: q('h1'), mon: q('.pbmon'), sub: q('.pbsub') }; })`;

/* ── A, B, C: Sun on the board ── */
{
  const { browser, page } = await board('sun');
  try {
    const hour = await page.evaluate(() => { const s = document.querySelector('#cr-pb .pbsky'); return s && s.dataset.sky; });
    ok(hour === 'day', 'the pinned 3 pm board draws the day sky', hour);
    const a = await page.evaluate(`(${SKY})({ sky: 'day' })`);
    ok(a.sun === '1' && a.h1 && a.mon && a.sub && a.h1.r >= 7 && a.mon.r >= 7 && a.sub.r >= 7,
       'A  Sun, day sky: title, date and eyebrow each >= 7:1', a);
    const b = await page.evaluate(`(${SKY})({ sky: 'day', wx: 'rain' })`);
    ok(b.h1 && b.h1.ink === 'rgb(255, 255, 255)' && b.h1.r >= 7 && b.mon.r >= 7, 'B  Sun, rain over a day sky: white words on the dark sky, >= 7:1', b);
    const c = await page.evaluate(`(${SKY})({ sky: 'day', wx: 'snow' })`);
    ok(c.h1 && c.h1.r >= 7 && c.mon.r >= 7 && c.sub.r >= 7, 'C  Sun, snow over a day sky: >= 7:1 on its pale sky', c);
  } finally { await browser.close(); }
}
/* ── D: Light, untouched ── */
{
  const { browser, page } = await board('1');
  try {
    const d = await page.evaluate(`(${SKY})({ sky: 'day' })`);
    ok(d.sun !== '1' && d.h1 && d.h1.ink === 'rgb(11, 26, 44)' && d.mon.ink === 'rgb(28, 48, 72)',
       'D  Light, day sky: the words are what they were (#0b1a2c / #1c3048)', d);
  } finally { await browser.close(); }
}

/* the punch card, Curtis, i6 (a card that is ready to close) */
async function card(t) {
  const { browser, page } = await boot('curtis', { init: theme(t) });
  await page.evaluate(() => { ['landingView','loginView'].forEach(id => { const e = document.getElementById(id); if (e) { e.style.display = 'none'; e.classList.remove('open'); } });
    try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {} window.CardinalPunchCard.open('i6', { back: 'production' }); });
  await page.waitForFunction(() => !!document.querySelector('#cr-pk .pkslot'), null, { timeout: 15000, polling: 150 }).catch(() => {});
  await sleep(900);
  const m = await page.evaluate(`(() => { const R = (${RATIO});
    const cl = document.querySelector('#cr-pk .pkclose.ready'); const band = document.querySelector('#cr-pk.open .pkvis');
    const out = { sun: document.documentElement.getAttribute('data-cr-sun') };
    if (cl) { const cs = getComputedStyle(cl), b = cl.querySelector('b'); out.close = { bg: cs.backgroundColor, word: R(cs.color, cs.backgroundColor), sub: b ? R(getComputedStyle(b).color, cs.backgroundColor) : null }; }
    if (band) { const bg = getComputedStyle(band).backgroundColor; out.band = { bg };
      /* the three states share the band; draw each once inside it and read the ink the cascade gives it */
      for (const k of ['pkvnone', 'pkvon', 'pkvstale']) { let e = band.querySelector('.' + k), made = false;
        if (!e) { e = document.createElement('span'); e.className = k; e.textContent = 'x'; band.appendChild(e); made = true; }
        const c = getComputedStyle(e).color; out.band[k] = { ink: c, r: R(c, bg) }; if (made) e.remove(); } }
    return out; })()`);
  await browser.close();
  return m;
}
{
  const s = await card('sun');
  ok(s.sun === '1' && s.close && s.close.word >= 7 && s.close.sub >= 7, 'E  Sun, the green Close button: its word and sub-line >= 7:1', s.close || 'no .pkclose.ready');
  ok(s.band && ['pkvnone', 'pkvon', 'pkvstale'].every(k => s.band[k].r >= 7), 'F  Sun, the On site band: Not checked in, On site and stale each >= 7:1', s.band || 'no .pkvis');
  const l = await card('1');
  ok(l.sun !== '1' && l.close && l.close.bg === 'rgb(27, 125, 73)' && l.band && l.band.pkvnone.ink === 'rgb(79, 86, 96)',
     'G  Light: the Close button keeps #1b7d49 and the band its 1462 grey #4f5660', { close: l.close, none: l.band && l.band.pkvnone });
  const k = await card('0');
  ok(k.sun !== '1' && k.close && k.close.bg === 'rgb(27, 125, 73)', 'G  Dark: the Close button keeps #1b7d49', k.close);
}

console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
