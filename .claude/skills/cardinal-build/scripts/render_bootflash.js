/* Build 676 — the app must not open on a screen of scattered emoji.

   TWO experiments, because one alone would prove the wrong thing.

   A. THE CASCADE, deterministically. The bug is a document-order bug: the
      #crBanner markup is parsed ~48,000 lines before the stylesheet that lays
      it out. So this builds the MID-PARSE state exactly — only the <style>
      blocks that appear before </head>, plus the real banner markup — and asks
      Chromium what display resolves to. Then it builds the FULL state, every
      style block, and asks again. The fix is only correct if the answer is
      'none' in the first and 'flex' in the second: hidden while loading,
      normal once loaded. A timing-based test could not tell those apart.

   B. THE REAL FIRST PAINT. Serves the artifact over HTTP at a throttled rate
      and screenshots the first frame, then reads the text actually painted.
      This is the experiment that reproduced Theo's screenshot in the first
      place, so it is the one that proves it is gone.

   Both halves are lifted from the artifact — style blocks and markup are
   sliced out, never retyped — so pointing this at build 675 genuinely tests
   675, and it must go RED there.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_bootflash.js [index.html]
   Point it at 675 as the negative control.                                   */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = '/home/user/cardinal-inspections';
const ART = path.resolve(process.argv[2] || ROOT + '/index.html');
const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const SRC = fs.readFileSync(ART, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* every <style> block, in document order, tagged with whether it is in <head> */
const HEAD_END = SRC.indexOf('</head>');
if (HEAD_END < 0) { console.log('no </head>'); process.exit(1); }
const STYLES = [];
{
  let i = 0;
  while ((i = SRC.indexOf('<style', i)) !== -1) {
    const s = SRC.indexOf('>', i) + 1, e = SRC.indexOf('</style>', s);
    if (e === -1) break;
    STYLES.push({ css: SRC.slice(s, e), inHead: i < HEAD_END });
    i = e;
  }
}
const HEAD_CSS = STYLES.filter(b => b.inHead).map(b => b.css).join('\n');
const ALL_CSS = STYLES.map(b => b.css).join('\n');

/* the banner markup, sliced from the artifact */
const NAV = (() => {
  const a = SRC.indexOf('<nav id="crBanner"');
  if (a < 0) return null;
  const e = SRC.indexOf('</nav>', a);
  return e < 0 ? null : SRC.slice(a, e + 6);
})();

console.log('── the artifact ──');
ok('the banner markup was found', !!NAV);
ok('there are style blocks in <head> and after it',
  STYLES.some(b => b.inHead) && STYLES.some(b => !b.inHead),
  STYLES.filter(b => b.inHead).length + ' in head, ' + STYLES.filter(b => !b.inHead).length + ' after');
if (!NAV) process.exit(1);

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const navEmoji = (NAV.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).match(EMOJI_RE) || []);
ok('the banner markup really does carry the emoji Theo saw', navEmoji.length >= 8,
  navEmoji.length + ': ' + navEmoji.join(''));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
               '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '/index.html') {
    res.writeHead(200, { 'content-type': MIME['.html'] });
    return fs.createReadStream(ART).pipe(res);
  }
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  /* ── A. the cascade, at two points in the parse ───────────────────────── */
  async function resolve(css, label) {
    const p = await br.newPage({ viewport: { width: 390, height: 844 } });
    await p.setContent('<!doctype html><html><head><style>' + css +
      '</style></head><body style="margin:0">' + NAV + '</body></html>');
    const r = await p.evaluate(() => {
      const el = document.getElementById('crBanner');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return {
        display: cs.display, visibility: cs.visibility,
        height: Math.round(b.height),
        painted: (el.innerText || '').match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu)?.join('') || ''
      };
    });
    await p.screenshot({ path: SHOT + 'bootflash-' + label + '.png' });
    await p.close();
    return r;
  }

  console.log('\n── A. what the cascade resolves to, mid-parse vs loaded ──');
  const midParse = await resolve(HEAD_CSS, 'midparse');
  const loaded = await resolve(ALL_CSS, 'loaded');
  console.log('  mid-parse (head styles only): display=' + midParse.display +
    ' height=' + midParse.height + ' emoji="' + midParse.painted + '"');
  console.log('  fully loaded (all styles)   : display=' + loaded.display +
    ' height=' + loaded.height + ' emoji="' + loaded.painted + '"');

  ok('MID-PARSE the banner is hidden — this is the whole fix',
    midParse.display === 'none', 'display=' + midParse.display);
  ok('…so it paints nothing at all while the app loads',
    midParse.height === 0, midParse.height + 'px tall');
  ok('LOADED the banner is back, laid out as a flex row',
    loaded.display === 'flex', 'display=' + loaded.display);
  ok('…and is a real, visible strip once its stylesheet has arrived',
    loaded.height > 20, loaded.height + 'px tall');
  /* NOT "the two states differ" — that was the first draft and it passed on
     the 675 control too, because block !== flex. It has to say that the head
     rule HIDES and that the later rule UNDOES it. */
  ok('the fix is CASCADE — hidden during parse, and never hidden once loaded',
    midParse.display === 'none' && loaded.display !== 'none',
    midParse.display + ' → ' + loaded.display);

  /* ── B. the real first paint ──────────────────────────────────────────── */
  console.log('\n── B. the first frame a phone actually paints ──');
  await new Promise(r => server.listen(8733, r));
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 120,
    downloadThroughput: 1.2 * 1024 * 1024 / 8, uploadThroughput: 600 * 1024 / 8,
  });

  p.goto('http://127.0.0.1:8733/index.html', { waitUntil: 'commit' }).catch(() => {});

  /* Sample at the DETERMINISTIC moment: the first tick at which #crBanner
     exists in the DOM but the document has not finished loading. Sampling on
     "any style block has parsed" was the first draft and it PASSED against the
     675 control — it caught the page at styles=1, before the nav markup had
     even arrived, and reported no emoji because there was no nav yet. A test
     that goes green on the broken artifact is worse than one that goes red. */
  let first = null;
  for (let i = 0; i < 400 && !first; i++) {
    try {
      const r = await p.evaluate(() => {
        const el = document.getElementById('crBanner');
        return {
          navPresent: !!el,
          emoji: (document.body ? document.body.innerText : '')
            .match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu)?.join('') || '',
          styles: document.querySelectorAll('style').length,
          ready: document.readyState
        };
      });
      if (r.navPresent && r.ready === 'loading') first = r;
      else if (r.ready === 'complete') { first = r; first.tooLate = true; }
    } catch (_) {}
    if (!first) await p.waitForTimeout(40);
  }
  /* Screenshot LAST and never let it decide the result: mid-load, Playwright's
     screenshot waits for webfonts and times out at 30s. The assertion below
     reads the DOM, not the picture, so a missing picture must not fail the run. */
  try { await p.screenshot({ path: SHOT + 'bootflash-firstpaint.png', timeout: 4000 }); }
  catch (_) { console.log('  (no first-paint picture — screenshot blocked on fonts mid-load)'); }
  await p.close();
  await ctx.close();
  server.close();

  if (!first) {
    ok('the first paint was sampled', false, 'never got a readable frame');
  } else {
    console.log('  sampled with the nav in the DOM: readyState=' + first.ready +
      ' styles=' + first.styles + '/' + STYLES.length + ' emoji="' + first.emoji + '"');
    ok('the sample landed mid-load, with the banner parsed and the app still loading',
      first.navPresent && !first.tooLate,
      first.tooLate ? 'missed the window — page finished loading first' : 'nav absent');
    ok('the app does NOT open on a screen of emoji', first.emoji === '',
      'painted: ' + first.emoji);
    ok('…and it really was still loading, not already finished',
      first.styles < STYLES.length, first.styles + ' of ' + STYLES.length + ' style blocks parsed');
  }

  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); try { server.close(); } catch (_) {} process.exit(1); });
