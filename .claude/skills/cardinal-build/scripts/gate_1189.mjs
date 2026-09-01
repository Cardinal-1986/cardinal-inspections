#!/usr/bin/env node
/* gate_1189 — the Pop-Up Roof launcher reaches THE BOOK, not a 200.
 *
 *   node gate_1189.mjs [cardinal-index.html] [showroom-index.html]
 *   node gate_1189.mjs --control     drive the PREVIOUS build; MUST go red
 *
 * WHY THIS GATE EXISTS. Build 1187 pointed three Pop-Up Roof links at
 * https://presentation.cardinalroster.com/ because vercel.json says that host
 * rewrites "/" to /popup.html. I read the config and never fetched the URL.
 * In production the rewrite does not fire: the bare host returns the
 * 5,446,039-byte CRM titled "Cardinal Client Resources"; /popup.html on the
 * same host returns the 269,247-byte book. The link looked canonical, resolved,
 * answered 200 — and served the wrong document.
 *
 * So this gate refuses both of the things that let 1187 through:
 *   · a URL is not checked for SHAPE. It is FETCHED, and the document that
 *     comes back must be titled "The Pop-Up Roof".
 *   · the intercept reproduces PRODUCTION AS MEASURED, not as configured:
 *     "/" on that host answers with the CRM, exactly as it does live. A build
 *     that points at the bare host therefore lands on the CRM here too, and
 *     fails — which is precisely what --control demonstrates on 1188.
 *
 * The click is a real click on the real launcher control, target="_blank" and
 * all, and the assertion is made against the page that ACTUALLY OPENS.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(existsSync('/opt/node22/lib/node_modules/playwright/index.js')
  ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');

const HERE = dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const CONTROL = process.argv.includes('--control');
const APP  = args[0] || resolve(HERE, '../../../../index.html');
const SHOWDIR = '/home/user/cardinal-showroom';
const SHOW = args[1] || join(SHOWDIR, 'index.html');

const HTML  = readFileSync(APP, 'utf8');
const SHTML = readFileSync(SHOW, 'utf8');
const POPUP = readFileSync(resolve(HERE, '../../../../popup.html'), 'utf8');
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']
  .map(p => readFileSync(resolve(HERE, p), 'utf8')).join('\n;\n');
const SSETUP = readFileSync(join(SHOWDIR, '.claude/skills/cardinal-build/scripts/sentinel_setup_showroom.js'), 'utf8');

/* Production's OWN answer, measured 31 Aug 2026 with curl, not inferred from
   vercel.json. Short stand-in for the 5.4 MB CRM — the TITLE is the whole
   point, because the title is what tells the two documents apart. */
const CRM_AT_BARE_HOST =
  '<!doctype html><title>Cardinal Client Resources</title>' +
  '<body><h1>Cardinal CRM</h1><p>This is what the bare presentation host really serves.</p>';
const BARE = 'https://presentation.cardinalroster.com/';
const BOOK = 'https://presentation.cardinalroster.com/popup.html';

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  → ' + detail : ''));
  cond ? pass++ : fail++;
};
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const browser = await chromium.launch();

async function ctxFor(which) {
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    const html = b => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: b });
    /* the two production answers, as measured */
    if (u === BARE || u === BARE + '?' ) return html(CRM_AT_BARE_HOST);
    if (u.startsWith(BOOK))             return html(POPUP);
    if (u.startsWith('https://cardinal.test/'))  return html(HTML);
    if (u.startsWith('https://showroom.test/')) {
      const p = new URL(u).pathname;
      if (p === '/' || p === '/index.html') return html(SHTML);
      const f = join(SHOWDIR, p.replace(/^\/+/, ''));
      if (existsSync(f) && !f.includes('..'))
        return r.fulfill({ status: 200,
          contentType: /\.css$/.test(f) ? 'text/css' : 'application/javascript',
          body: readFileSync(f, 'utf8') });
      return r.fulfill({ status: 404, body: '' });
    }
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    return r.fulfill({ status: 200, body: '' });
  });
  await ctx.addInitScript(which === 'showroom' ? SSETUP : SETUP);
  return ctx;
}

/* Click the control for real and assert on the document that OPENS.
   target="_blank" means the destination arrives as a new page, so the popup
   event is the evidence — not a fetch we made ourselves from the href. */
async function clickAndRead(page, ctx, selector, label) {
  /* ⚠ NEVER THROWS. BUG_CLASSES 37: a control that dies with an exception
     reads as "proved nothing", not as red, and this project has been bitten
     by it five times in one session. Every failure is RECORDED and returned. */
  try {
    const el = await page.$(selector);
    if (!el) return { found: false, label };
    const href = await el.getAttribute('href');
    const vis = await el.isVisible().catch(() => false);
    if (!vis) return { found: true, visible: false, opened: false, href };
    const [opened] = await Promise.all([
      ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null),
      el.click().catch(e => { throw e; })
    ]);
    if (!opened) return { found: true, visible: true, opened: false, href };
    await opened.waitForLoadState('domcontentloaded').catch(() => {});
    const out = { found: true, visible: true, opened: true, url: opened.url(),
                  title: await opened.title().catch(() => ''), href };
    await opened.close();
    return out;
  } catch (e) {
    return { found: true, error: String(e).split('\n')[0], label };
  }
}

/* For a link whose CONTAINER is not shown on this host — the ordinary
   landing's pane has been retired on ordinary hosts since 1165/1188 — the
   honest proof is the href plus a real fetch of it. Stated as what it is: a
   destination proof, not a reachability proof. Still a fetch, never a shape
   check: the document that comes back must be the book. */
async function fetchAndRead(ctx, url) {
  try {
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    const out = { url: p.url(), title: await p.title().catch(() => '') };
    await p.close();
    return out;
  } catch (e) { return { error: String(e).split('\n')[0] }; }
}

console.log('gate_1189 ' + (CONTROL ? '(CONTROL — the click proofs MUST fail)' : '') +
            '\n  app:      ' + APP + '\n  showroom: ' + SHOW + '\n');

/* ── 1 · Cardinal, the ordinary landing ────────────────────────────────── */
{
  const ctx = await ctxFor('cardinal');
  const page = await ctx.newPage();
  await page.goto('https://cardinal.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const r = await clickAndRead(page, ctx, 'a.cr-lr-book', 'landing');
  ok('1a the ordinary landing still HAS a Pop-Up Roof link', r.found, r.error || '');
  ok('1b it names popup.html explicitly', r.href === BOOK, r.href || '(none)');
  /* ⚠ Its container is NOT shown on an ordinary host — #landingView has been
     retired there since 1165/1188 — so there is no click to make. Recorded
     rather than staged: forcing a retired pane visible would be testing a
     configuration no user can reach. The destination is proved by fetching
     the href the link actually carries. */
  const f = await fetchAndRead(ctx, r.href || BARE);
  ok('1c that href FETCHES THE BOOK (container retired on this host, so no click)',
     f.title === 'The Pop-Up Roof', JSON.stringify(f));
  await ctx.close();
}

/* ── 2 · Cardinal, the Vision hub tile — RETIRED AT 1190 ──────────────── */
{
  /* ⚠ INVERTED, NOT DELETED. The Vision hub went with the Showroom cutover:
     ?vision=1 painted a door to a hostname this file no longer serves. The
     tile it used to carry cannot be clicked because it no longer exists, so
     the honest check is that it is GONE — and that nothing resurrected it
     pointing at the bare host. The ordinary landing's link (check 1) and the
     Showroom launcher (check 3) are where the destination is proved now. */
  const ctx = await ctxFor('cardinal');
  const page = await ctx.newPage();
  await page.goto('https://cardinal.test/?vision=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const hub = await page.evaluate(() => ({
    tiles: document.querySelectorAll('a.cr-vh-tile, .cr-vh').length,
    bare : [...document.querySelectorAll('a[href]')]
             .filter(a => a.getAttribute('href') === 'https://presentation.cardinalroster.com/').length
  }));
  ok('2a the Vision hub is gone under ?vision=1', hub.tiles === 0, JSON.stringify(hub));
  ok('2b nothing resurrected a bare-host link', hub.bare === 0, String(hub.bare));
  await ctx.close();
}

/* ── 3 · the Showroom launcher ─────────────────────────────────────────── */
{
  const ctx = await ctxFor('showroom');
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await page.goto('https://showroom.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  /* sign in through the app's own submit handler, as its setup file does */
  await page.evaluate(() => {
    document.getElementById('srEmail').value = 'theo@cardinalrenovations.net';
    document.getElementById('srPass').value = 'sentinel';
    document.getElementById('srForm').dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true }));
  }).catch(() => {});
  await page.waitForTimeout(1800);
  const drew = await page.$$eval('[data-sr-tile]', els => els.map(e => e.dataset.srTile));
  ok('3a the launcher really drew its tiles', drew.length >= 4, drew.join(',') || '(none)');
  const r = await clickAndRead(page, ctx, '[data-sr-tile="popup"]', 'showroom');
  ok('3b the Showroom still HAS a Pop-Up Roof tile', r.found && !r.error, r.error || '');
  ok('3b2 and it is actually visible to a tap', r.visible === true);
  ok('3c it names popup.html explicitly', r.href === BOOK, r.href || '(none)');
  ok('3d clicking it OPENS THE BOOK', r.opened && r.title === 'The Pop-Up Roof',
     JSON.stringify({ url: r.url, title: r.title }));
  ok('3e no page error', errs.length === 0, errs[0] || '');
  await ctx.close();
}

/* ── 4 · nothing anywhere still points at the bare host ────────────────── */
{
  /* ⚠ prose-proof. Both trees now carry COMMENTS naming the bare host to
     explain why it is wrong, so a raw substring count would fail a correct
     tree. Assert on the two forms a LINK takes and nothing else. */
  const badHref = new RegExp('href\\s*[:=]\\s*[\'"]' + BARE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"]', 'g');
  for (const [name, src] of [['index.html', HTML], ['showroom/index.html', SHTML]]) {
    const hits = src.match(badHref) || [];
    ok('4 ' + name + ' has no link to the bare host', hits.length === 0, hits.join(' · '));
  }
  /* 1190: was 2 — the hub tile and the ordinary landing's link. The hub is
     retired, so ONE remains. Asserted exactly, not >=, so losing the last one
     is still red. */
  ok('4 index.html links the book once, by path',
     (HTML.match(new RegExp('href="' + BOOK + '"', 'g')) || []).length === 1,
     String((HTML.match(new RegExp('href="' + BOOK + '"', 'g')) || []).length));
  ok('4 the Showroom links the book once, by path',
     SHTML.includes("href: '" + BOOK + "'"));
}

await browser.close();
console.log('\n' + (fail ? 'RED' : 'GREEN') + '  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
