/* render_state.mjs — a picture of any sentinel state, at any width, in either
   theme, with an optional patch injected first.

   This exists because the disposable render scripts on this project keep being
   rewritten: render_showcase, render_dbaddr, render_solcard, render_inscards,
   _clip. They all do the same four things — boot with the setup files, run a
   named state, optionally inject a variant, take a picture. The states are the
   part that varies, and those already live in sentinel_setup_cardinal.js.

   ⚠ p.screenshot() HANGS on several of this app's screens, and it is not slow
   rendering — the app runs standing rAF clocks (three of them, correctly, since
   567/569), so Playwright's stability wait never settles. CDP captures the
   frame as-is and waits for nothing.

   usage:
     node render_state.mjs <file.html> <state> <out.png> [390x844] [light|dark] [patch.js]
*/
import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE  = process.argv[2] || 'index.html';
const STATE = process.argv[3];
const OUT   = process.argv[4] || '/tmp/state.png';
const [VW, VH] = (process.argv[5] || '390x844').split('x').map(Number);
const THEME = (process.argv[6] || 'dark').toLowerCase();
const PATCH = process.argv[7];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: VW, height: VH } });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.goto('file://' + process.cwd() + '/' + FILE, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
if (THEME === 'light') {
  await p.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'rb-light');
    document.documentElement.setAttribute('data-mode', 'light');
  });
  await p.waitForTimeout(400);
}
const names = await p.evaluate('(window.__sentinelStates||[]).map(s=>s.name)');
const i = names.indexOf(STATE);
if (i < 0) { console.log(JSON.stringify({ error: 'no such state', have: names })); await b.close(); process.exit(1); }
try { await p.evaluate('Promise.resolve(window.__sentinelStates[' + i + '].run())'); }
catch (e) { console.log(JSON.stringify({ error: 'state threw', msg: String(e.message).split('\n')[0] })); }
await p.waitForTimeout(1000);
if (PATCH && existsSync(PATCH)) { await p.evaluate(readFileSync(PATCH, 'utf8')); await p.waitForTimeout(500); }

/* the same strip measurement probe_crowding.mjs uses, so a picture and a number
   always come from the same run */
const m = await p.evaluate(() => {
  const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    if (!/flex/.test(cs.display)) continue;
    const kids = [...el.children].filter(vis);
    if (kids.length < 3) continue;
    const pill = k => { const c = getComputedStyle(k);
      return c.whiteSpace === 'nowrap' && parseFloat(c.flexShrink) === 0; };
    if (kids.filter(pill).length < kids.length * 0.8) continue;
    out.push({ el: el.id ? '#' + el.id : '.' + (el.className || '').toString().trim().split(/\s+/)[0],
      chips: kids.length, rows: new Set(kids.map(k => Math.round(k.getBoundingClientRect().top))).size,
      h: Math.round(el.getBoundingClientRect().height) });
  }
  return { strips: out, sideScroll: document.documentElement.scrollWidth > innerWidth + 1 };
});
console.log(JSON.stringify(m));
const cdp = await p.context().newCDPSession(p);
const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
await b.close();
