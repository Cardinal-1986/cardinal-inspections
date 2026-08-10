/* The WHOLE progressive-render sequence, not just the first frame.

   Screenshot-only sampling (no page.evaluate during capture — evaluate is slow
   under CPU throttling and was what collapsed the first filmstrip's timeline).
   Frames are hashed and only DISTINCT states are kept, so what comes out is the
   list of things a user actually sees on the way up.

   Usage: node filmstrip2.js [index.html]                                     */
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright-core');

const ROOT = '/home/user/cardinal-inspections';
const ART = path.resolve(process.argv[2] || ROOT + '/index.html');
const OUT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/film2';
const TICK = 350, MAX = 90;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
               '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '/index.html') {
    res.writeHead(200, { 'content-type': MIME['.html'] });
    return fs.createReadStream(ART).pipe(res);        // serve the artifact under test
  }
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('no');
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(8732, r));
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();

  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 120,
    downloadThroughput: 1.2 * 1024 * 1024 / 8, uploadThroughput: 600 * 1024 / 8,
  });

  const t0 = Date.now();
  p.goto('http://127.0.0.1:8732/index.html', { waitUntil: 'commit' }).catch(() => {});

  const seen = new Map();
  let lastHash = '', settled = 0;
  for (let i = 0; i < MAX; i++) {
    const t = Date.now() - t0;
    let buf = null;
    try { buf = await p.screenshot(); } catch (_) {}
    if (buf) {
      const h = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
      if (h !== lastHash) {
        settled = 0;
        if (!seen.has(h)) {
          const name = String(seen.size).padStart(2, '0') + '-' + t + 'ms.png';
          fs.writeFileSync(path.join(OUT, name), buf);
          seen.set(h, { t, name });
        }
        lastHash = h;
      } else if (++settled >= 6) break;    // 2.1s with no visual change = done
    }
    await p.waitForTimeout(TICK);
  }

  console.log('DISTINCT painted states, in order:');
  for (const [h, v] of seen) console.log('  ' + String(v.t).padStart(6) + 'ms  ' + v.name);
  console.log('\n' + seen.size + ' distinct frames in ' + OUT);

  await br.close();
  server.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
