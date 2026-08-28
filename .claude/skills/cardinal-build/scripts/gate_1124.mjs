/* gate_1124.mjs — the favourite star on a client profile: does tapping it SHOW
   anything, and is it big enough to hit?

   ⚠ THIS BUG WAS INVISIBLE TO EVERY GATE WE HAD, and the reason is the lesson.
   The click always worked. toggleFav() ran, the checklist was written, the
   client really was favourited, and #favStar — 0x0 on a phone, inside a card
   the client-profile rebuild hides — flipped to a lit star nobody could see.
   The band's own star was built ONCE from #favStar's class at render time and
   never repainted, so the screen said nothing and Theo reported "can't click
   the star to favorite."

   A jsdom harness cannot see any of that: it cannot lay the band out, cannot
   hit-test, and would have happily reported the handler wired and the data
   written. Both halves of this gate need an engine —
     1. tap the star the way a thumb does, and assert the GLYPH changes;
     2. measure the reachable hit area outward from its centre, and assert the
        pencil and PO chip next to it did not lose their own taps to it.

   ⚠ Written to go RED on 1123 rather than crash (BUG_CLASSES 37): on 1123 the
   star is present and clickable, it simply never changes — so every probe is
   guarded and the control reports a real failure rather than dying.

   usage:  node gate_1124.mjs <file.html>
*/
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.goto(URL_, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2600);

const opened = await p.evaluate(async () => {
  const s = (window.__sentinelStates || []).find(x => x.name === 'client');
  if (!s) return 'no client state in the setup file';
  try { await s.run(); return 'ok'; } catch (e) { return String(e.message || e); }
});
ok(opened === 'ok', 'a client profile opens (' + opened + ')');
await p.waitForTimeout(1200);

const present = await p.evaluate(() => {
  const bar = document.getElementById('cr-namebar');
  const star = document.querySelector('#cr-namebar .nb-star');
  return { bar: !!bar, shown: bar ? getComputedStyle(bar).display : null, star: !!star,
           glyph: star ? star.textContent.trim() : null };
});
ok(present.bar && present.shown !== 'none', 'the client name band renders at 390px');
ok(present.star, 'it has a favourite star');

/* ── 1. the bug itself: a tap must CHANGE something you can see ───────── */
const before = await p.evaluate(() => {
  const s = document.querySelector('#cr-namebar .nb-star');
  return s ? { cls:s.className, glyph:s.textContent.trim(), pressed:s.getAttribute('aria-pressed') } : null;
});
let clickErr = null;
try { await p.click('#cr-namebar .nb-star', { timeout: 4000 }); }
catch (e) { clickErr = String(e.message || e).split('\n')[0]; }
await p.waitForTimeout(1000);
const after = await p.evaluate(() => {
  const s = document.querySelector('#cr-namebar .nb-star');
  const hero = document.getElementById('favStar');
  return {
    cls: s ? s.className : null, glyph: s ? s.textContent.trim() : null,
    pressed: s ? s.getAttribute('aria-pressed') : null,
    heroGlyph: hero ? hero.textContent.trim() : null,
    heroOn: hero ? hero.className.indexOf('on') !== -1 : null,
    isFav: (typeof isFav === 'function' && window.currentProject) ? isFav(window.currentProject) : null
  };
});
ok(!clickErr, 'the star is clickable' + (clickErr ? ' — ' + clickErr : ''));
ok(after.isFav === true, 'tapping it really does favourite the client (the data changed)');
ok(after.heroOn === true, 'and the hero star agrees');
ok(before && after.glyph !== before.glyph,
   'THE BAND STAR CHANGES — "' + (before && before.glyph) + '" → "' + after.glyph + '"');
ok(after.cls && after.cls.indexOf('on') !== -1, 'and it carries the lit class (' + after.cls + ')');
ok(after.pressed === 'true', 'aria-pressed says it is on, so it is not silent to a screen reader');

/* it has to come back off, or it is a one-way switch */
await p.click('#cr-namebar .nb-star').catch(() => {});
await p.waitForTimeout(1000);
const back = await p.evaluate(() => {
  const s = document.querySelector('#cr-namebar .nb-star');
  return { glyph:s.textContent.trim(), cls:s.className,
           isFav: (typeof isFav === 'function' && window.currentProject) ? isFav(window.currentProject) : null };
});
ok(back.isFav === false && back.cls.indexOf('on') === -1 && back.glyph === before.glyph,
   'tapping again turns it back off, glyph and all (' + back.glyph + ')');

/* ── 2. the reason a thumb missed it ──────────────────────────────────── */
const hit = await p.evaluate(() => {
  const star = document.querySelector('#cr-namebar .nb-star');
  const r = star.getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const reach = (dx, dy) => { let d = 0;
    for (let i = 1; i <= 40; i++) { const e = document.elementFromPoint(cx + dx * i, cy + dy * i);
      if (e === star || star.contains(e)) d = i; else break; }
    return d; };
  const own = sel => { const el = document.querySelector(sel); if (!el) return 'missing';
    const b = el.getBoundingClientRect();
    const h = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return !!(h && (h === el || el.contains(h))); };
  return { glyphW:Math.round(r.width), glyphH:Math.round(r.height),
           left:reach(-1,0), right:reach(1,0), up:reach(0,-1), down:reach(0,1),
           pencil:own('#cr-namebar .nb-pen'), po:own('#cr-namebar .nb-po'),
           name:!!document.querySelector('#cr-namebar .nb-nm') };
});
const w = hit.left + hit.right + 1, h = hit.up + hit.down + 1;
ok(w >= 40 && h >= 40,
   'the reachable tap area is ' + w + '×' + h + 'px, not the ' + hit.glyphW + '×' + hit.glyphH +
   'px glyph — the 592/1076 44px rule');
/* the fix must not pay for itself out of its neighbours' pockets */
ok(hit.pencil === true, 'the edit pencil below it still receives its own taps');
ok(hit.po === true, 'and so does the PO chip');

await b.close();
console.log('\n' + (fail ? 'RED — ' + fail + ' failed, ' + pass + ' passed'
                         : 'GREEN — all ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
