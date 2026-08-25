/* audit_design_shots.mjs — capture the walked screens as PNGs.
 *
 * Counting tells you the type scale has fourteen steps in a 6px range. It
 * cannot tell you whether the app LOOKS like one product. For that somebody
 * has to look, and on this project the thing that has root-caused more than
 * reasoning has is a screenshot.
 *
 * Same setup and same walk as audit_design.mjs, so the pictures and the
 * numbers describe the same renders.
 *
 *   node audit_design_shots.mjs index.html --out DIR [--theme default]
 *        [--viewport 390x844] [--only home,client,production]
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ARGS = process.argv.slice(2);
const FILE = ARGS.find(a => !a.startsWith('--')) || 'index.html';
const flag = (n, d) => { const i = ARGS.indexOf('--' + n); return i >= 0 ? ARGS[i + 1] : d; };
const OUT = flag('out', 'shots');
const THEME = flag('theme', 'default');
const [VW, VH] = flag('viewport', '390x844').split('x').map(Number);
const ONLY = flag('only', '').split(',').map(s => s.trim()).filter(Boolean);

const HTML = readFileSync(FILE, 'utf8');
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(join('.claude/skills/cardinal-build/scripts', f), 'utf8')).join('\n;\n');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url();
  if (u.startsWith('https://shot.test/'))
    return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
  /* A mid-grey placeholder rather than a 1x1 transparent pixel: a photo slot
     that renders as nothing reads as a layout bug in the screenshot, and I
     would then spend a round chasing my own fixture. */
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
    return r.fulfill({ status: 200, contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
            '<rect width="400" height="300" fill="#3a3a42"/>' +
            '<text x="200" y="155" fill="#8a8a95" font-family="sans-serif" font-size="20" ' +
            'text-anchor="middle">photo</text></svg>' });
  /* ⚠ ABORT fonts, do not fulfil them empty. An empty 200 for a .woff2 is a
     font the browser can neither parse nor give up on, and page.screenshot()
     blocks on "waiting for fonts to load" until its 30s timeout — which reads
     exactly like a hung app. Aborting makes the face fall back immediately,
     which is also what a real device does when the CDN is unreachable. */
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(u) || /fonts\.(googleapis|gstatic)\.com/.test(u))
    return r.abort();
  return r.fulfill({ status: 200, body: '' });
});
if (THEME !== 'default')
  await page.addInitScript(
    `window.__sentinelTheme=${JSON.stringify(THEME)};` +
    `(function put(){var r=document.documentElement;` +
    ` if(r){r.setAttribute('data-theme',${JSON.stringify(THEME)});return;}` +
    ` new MutationObserver(function(_,o){if(document.documentElement){o.disconnect();put();}})` +
    `  .observe(document,{childList:true});})();`);
await page.addInitScript(SETUP);
await page.goto('https://shot.test/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);

/* ⚠ page.screenshot() HANGS on this app and the error blames the wrong thing.
   It reports "waiting for fonts to load" and times out at 30s — but the app
   declares no @font-face, issues zero font requests, and document.fonts
   reports status 'loaded' with size 0. Fonts are not involved. Playwright's
   own stability wait is what never settles, on a page that repaints
   continuously (three clocks, plus the module observers).

   CDP's Page.captureScreenshot does not wait for stability and returns in
   ~90ms. It is the right instrument here precisely because a design audit
   wants the screen AS IT IS, mid-life, not a quiesced version of it that the
   user never sees. Measured both ways before switching. */
const cdp = await ctx.newCDPSession(page);
const shoot = async (f) => {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(f, Buffer.from(data, 'base64'));
};

const names = await page.evaluate(`(window.__sentinelStates || []).map(s => s.name)`);
let n = 0;
for (let i = 0; i < names.length; i++) {
  if (ONLY.length && !ONLY.includes(names[i])) continue;
  try { await page.evaluate(`Promise.resolve(window.__sentinelStates[${i}].run())`); }
  catch (e) { console.log(`  ${names[i]}: THREW — ${String(e.message).split('\n')[0]}`); continue; }
  await page.waitForTimeout(500);
  const f = join(OUT, `${String(i).padStart(2, '0')}-${names[i]}-${THEME}-${VW}.png`);
  await shoot(f);
  console.log('  ' + f);
  n++;
}
await browser.close();
console.log(`\n${n} screens → ${OUT}`);
