/* Reproduce the startup flash Theo recorded.

   Serves the REAL index.html over HTTP (not file://, so the browser streams it
   the way it does in production), throttles the connection and the CPU to
   something phone-like, and screenshots every 150ms from navigation start.
   Also records, at each tick, which top-level view containers are present and
   what their computed display is — so the filmstrip says WHY, not just WHAT. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = '/home/user/cardinal-inspections';
const OUT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/film';
const TICK = 150, TICKS = 40;

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
               '.png': 'image/png', '.PNG': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
               '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('no');
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(8731, r));
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();

  /* phone-ish: throttle CPU and the network. Theo's recording is 5G at one bar,
     which is bandwidth-poor and latency-heavy, not offline. */
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150,
    downloadThroughput: 1.5 * 1024 * 1024 / 8,   // ~1.5 Mbps
    uploadThroughput: 750 * 1024 / 8,
  });

  const log = [];
  p.on('console', m => { if (m.type() === 'error') log.push('console.error: ' + m.text().slice(0, 200)); });
  p.on('pageerror', e => log.push('pageerror: ' + String(e).slice(0, 300)));

  const t0 = Date.now();
  p.goto('http://127.0.0.1:8731/index.html', { waitUntil: 'commit' }).catch(() => {});

  const frames = [];
  for (let i = 0; i < TICKS; i++) {
    const t = Date.now() - t0;
    let shot = null, state = null;
    try {
      shot = await p.screenshot({ path: path.join(OUT, String(i).padStart(2, '0') + '-' + t + 'ms.png') });
      state = await p.evaluate(() => {
        const vis = [];
        /* every element that is actually painting something a user can see */
        document.querySelectorAll('body > *, body > * > *').forEach(el => {
          if (!el.id && !el.className) return;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || r.height < 4) return;
          if (r.top > innerHeight || r.bottom < 0) return;
          vis.push((el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]) +
            '[' + Math.round(r.top) + '..' + Math.round(r.bottom) + ']');
        });
        /* how much of the document has arrived */
        return {
          ready: document.readyState,
          styles: document.querySelectorAll('style').length,
          scripts: document.querySelectorAll('script').length,
          bodyKids: document.body ? document.body.children.length : 0,
          docHeight: document.documentElement.scrollHeight,
          visible: vis.slice(0, 14),
          /* is any emoji actually painted right now? */
          emoji: (document.body ? document.body.innerText : '')
            .match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu)?.slice(0, 20).join('') || ''
        };
      });
    } catch (_) { /* navigation in flight */ }
    frames.push({ i, t, state });
    await p.waitForTimeout(TICK);
    if (state && state.ready === 'complete' && i > 8) break;
  }

  console.log('t(ms)  ready      styles scripts kids  docH   emoji painted');
  for (const f of frames) {
    const s = f.state;
    if (!s) { console.log(String(f.t).padStart(5) + '  (navigating)'); continue; }
    console.log(String(f.t).padStart(5) + '  ' + s.ready.padEnd(10) +
      String(s.styles).padStart(5) + String(s.scripts).padStart(7) +
      String(s.bodyKids).padStart(6) + String(s.docHeight).padStart(7) + '  ' + s.emoji);
  }
  console.log('\nvisible boxes over time:');
  for (const f of frames) if (f.state && f.state.visible.length)
    console.log(String(f.t).padStart(5) + 'ms  ' + f.state.visible.join(' '));
  if (log.length) { console.log('\npage errors:'); log.slice(0, 10).forEach(l => console.log('  ' + l)); }

  await br.close();
  server.close();
  console.log('\nframes in ' + OUT);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
