/* gate_1228.mjs — build 1228: a client's CompanyCam job in its Photo Album.

   Theo, 2 Oct: "1c, 2a ... as long as they are assigned or create that
   companycam/crm lead they can link and have access". Then, from the preview:
   "1" — and a screenshot of the picker's Search button running off the card.
   Real Chromium render, /api/companycam-job answered by a stub (the route's
   own permission rules are test_companycam_job.mjs):
     A. NOT LINKED: the section shows, with a Link button ≥44px.
     B. PICKER: suggestions render, and NOTHING inside the card runs past its
        right edge (the screenshot bug); tapping Link saves and shows photos.
     C. LINKED: 12 tiles, "Show all" beyond, every image https.
     D. SAFE: a caption carrying markup renders as text; a javascript: URL
        never becomes an <img src> or an <a href>.
     E. Inspection Photos mode does not show the section.
   390 + 1440 × both themes. ⚠ RED on 1227 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1228.mjs [file.html]
*/
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const artifact = resolve(process.argv[2] || resolve(here, '../../../../index.html'));
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require_(existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright');
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 560000).unref();

const PX = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const photos = Array.from({ length: 20 }, (_, i) => ({ id: 'p' + i, thumb: 'https://static.companycam.com/t' + i + '.jpeg', full: 'https://static.companycam.com/f' + i + '.jpeg', at: '2026-04-21T19:00:00Z', caption: '', by: 'Crew' }));
photos[0].caption = '<img src=x onerror="window.__pwned=1">pwn';
photos[1].thumb = 'javascript:window.__pwned=2'; photos[1].full = 'javascript:window.__pwned=3';
const SUGGEST = { ok: true, admin: true, suggestions: [
  { id: '80195365', name: '807 Browning Ave', address: '807 Browning Ave, Dayton, OH', count: 357, latest: '2026-04-21T19:36:52Z', match: true },
  { id: '7', name: 'A very long CompanyCam job name that goes on (2019 gutters and downspouts)', address: '807 Browning Ave', count: 14, latest: '2019-06-02T15:00:00Z', match: true }] };

const browser = await launchChromium(chromium);
for (const theme of ['dark', 'rb-light']) for (const vw of [390, 1440]) {
  const at = (theme === 'dark' ? 'dark' : 'light') + ' @' + vw;
  console.log('\n── ' + at + ' ' + '─'.repeat(40));
  const p = await browser.newPage({ viewport: { width: vw, height: 900 } });
  let linked = false;
  await p.route('**/api/companycam-job', route => {
    const b = JSON.parse(route.request().postData() || '{}');
    const reply = b.action === 'suggest' ? SUGGEST
      : linked ? { ok: true, linked: true, job: { id: '80195365', name: '807 Browning Ave', address: '807 Browning Ave' }, total: 357, photos }
      : { ok: true, linked: false, photos: [] };
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply) });
  });
  await p.route('https://static.companycam.com/**', r => r.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from(PX.split(',')[1], 'base64') }));
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(() => { const s = (window.__sentinelStates || []).find(s => s.name === 'album'); return s && s.run(); }).catch(() => {});
  await p.waitForTimeout(2000);
  const probe = () => p.evaluate(() => {
    const el = document.getElementById('galJobCc');
    if (!el || !el.getClientRects().length) return { shown: false };
    const cr = el.getBoundingClientRect();
    const over = [...el.querySelectorAll('*')].filter(e => e.getClientRects().length)
      .filter(e => e.getBoundingClientRect().right > cr.right + 1 || e.getBoundingClientRect().left < cr.left - 1)
      .map(e => (e.tagName + '.' + (e.className || '')).slice(0, 40));
    const btn = el.querySelector('[data-gjc="link"]');
    return { shown: true, over, linkH: btn ? Math.round(btn.getBoundingClientRect().height) : 0,
      sugs: el.querySelectorAll('.gjc-sug').length, tiles: el.querySelectorAll('.gjc-grid a').length,
      all: !!el.querySelector('[data-gjc="all"]'),
      badSrc: [...el.querySelectorAll('img')].filter(i => !/^https:\/\//.test(i.getAttribute('src') || '')).length,
      badHref: [...el.querySelectorAll('a')].filter(a => !/^https:\/\//.test(a.getAttribute('href') || '')).length,
      injected: el.querySelectorAll('img[onerror]').length, pwned: window.__pwned || 0, text: el.innerText };
  }).catch(e => ({ err: String(e) }));
  let r = await probe();
  if (r.err || !r.shown) { ok(false, at + ' — the CompanyCam section shows in the album', r.err || 'not shown'); await p.close(); continue; }
  ok(r.linkH >= 44, at + ' — A: not linked, with a Link button ≥44px', r.linkH + 'px');
  await p.evaluate(() => document.querySelector('#galJobCc [data-gjc="link"]').click()); await p.waitForTimeout(800);
  r = await probe();
  ok(r.sugs === 2, at + ' — B: the picker lists the suggested jobs', r.sugs + ' rows');
  ok(!r.over.length, at + ' — B: nothing in the picker runs past the card edge', r.over.length ? r.over.join(', ') : 'none');
  linked = true;
  await p.evaluate(() => document.querySelector('#galJobCc [data-gjc="pick"]').click()); await p.waitForTimeout(1500);
  r = await probe();
  ok(r.tiles === 12 && r.all, at + ' — B/C: Link saves, then 12 photos show with "Show all"', r.tiles + ' tiles · show-all ' + r.all);
  ok(!r.over.length, at + ' — C: nothing in the linked card runs past its edge', r.over.length ? r.over.join(', ') : 'none');
  await p.evaluate(() => document.querySelector('#galJobCc [data-gjc="all"]').click()); await p.waitForTimeout(800);
  r = await probe();
  ok(r.tiles === 19, at + ' — C: "Show all" shows the rest (the javascript: one dropped)', r.tiles + ' tiles');
  ok(r.badSrc === 0 && r.badHref === 0, at + ' — D: every image and link is https', 'src ' + r.badSrc + ' · href ' + r.badHref);
  ok(r.injected === 0 && !r.pwned, at + ' — D: a caption carrying markup stays text', 'injected ' + r.injected + ' · pwned ' + r.pwned);
  const saved = await p.evaluate(() => { try { return parseCkAll(currentProject).cc_project_id; } catch (e) { return 'err'; } });
  ok(saved === '80195365', at + ' — the link is saved on the client', String(saved));
  await p.evaluate(() => { try { openGalleryMode('insp'); } catch (e) {} }); await p.waitForTimeout(1200);
  r = await probe();
  ok(!r.shown, at + ' — E: Inspection Photos does not show the section');
  await p.close();
}
await browser.close();
console.log('\n' + (fail ? 'GATE 1228 RED' : 'GATE 1228 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
