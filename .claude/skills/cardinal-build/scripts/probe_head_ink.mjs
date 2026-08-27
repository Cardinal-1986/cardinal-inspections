/* probe_head_ink.mjs — what colour does the Insurance header ACTUALLY compute to?

   Build 1089 repoints `body[data-crm-head="insurance"] .site` at a new dark-chrome
   palette declared in the siren block only. Two things have to be proved, and
   neither can be settled by reading CSS:

     1. siren really goes #1a0e0d — a var() fallback chain resolves at computed-value
        time, and an undeclared token silently makes the whole declaration invalid.
     2. docket is BYTE-IDENTICAL to the previous build. The promise made to Theo was
        "light mode unchanged"; the only honest way to keep it is to render both
        builds in light and diff the numbers.

   ⚠ The theme lives in localStorage, not just the attribute. cr-lib-script's tick()
   re-stamps document.body from `cardinalRLTheme` every 600ms, so setting the
   attribute alone is reverted within a second and the probe silently reads DOCKET
   twice. Set the key, then wait past a tick before reading.

   usage: node probe_head_ink.mjs <file.html> <docket|siren>
*/
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2];
const THEME = process.argv[3] === 'siren' ? 'siren' : 'docket';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.addInitScript((t) => { try { localStorage.setItem('cardinalRLTheme', t); } catch (e) {} }, THEME);
/* an absolute path must NOT be prefixed with cwd - every other render script here
   assumes a repo-relative argument and silently builds `/repo//tmp/...`, which
   fails as ERR_FILE_NOT_FOUND and reads like a missing artifact rather than a
   bad join. Negative-control trees live outside the repo, so this matters. */
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);
await p.goto(URL_, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

const names = await p.evaluate('(window.__sentinelStates||[]).map(s=>s.name)');
const i = names.indexOf('insclients');
if (i < 0) { console.log(JSON.stringify({ error: 'no insclients state', have: names })); await b.close(); process.exit(1); }
try { await p.evaluate('Promise.resolve(window.__sentinelStates[' + i + '].run())'); }
catch (e) { console.log(JSON.stringify({ error: 'state threw', msg: String(e.message).split('\n')[0] })); }
/* past one tick (600ms) so the theme re-stamp has settled, and past skin(), which
   is observer-driven rather than called inline */
await p.waitForTimeout(1400);

const out = await p.evaluate(() => {
  const g = (sel, prop) => { const e = document.querySelector(sel);
    return e ? getComputedStyle(e).getPropertyValue(prop).trim() : '(absent)'; };
  const hd = document.querySelector('header.site');
  return {
    rltheme: document.body.getAttribute('data-rltheme'),
    crmHead: document.body.dataset.crmHead || '(unset)',
    header_bg: hd ? getComputedStyle(hd).backgroundColor : '(absent)',
    header_bgimg: hd ? getComputedStyle(hd).backgroundImage : '(absent)',
    htint: hd ? getComputedStyle(hd).getPropertyValue('--htint').trim() : '(absent)',
    hbg: hd ? getComputedStyle(hd).getPropertyValue('--hbg').trim() : '(absent)',
    /* ⚠ READ THE FILL, NOT JUST `color`. -webkit-text-fill-color wins over color
       for painted text, and this title carries both. Reading `color` alone once
       had me telling Theo the title was --hac when --hin is what paints it. */
    title_color: g('#cr-hd2-mid #brandTitle h1', 'color'),
    title_fill: g('#cr-hd2-mid #brandTitle h1', '-webkit-text-fill-color'),
    iconbtn_color: g('#cr-hd2-bar .cr-ib', 'color'),
    iconbtn_border: g('#cr-hd2-bar .cr-ib', 'border-top-color'),
    primary_bg: g('#cr-hd2-bar .cr-ib.primary', 'background-color'),
    primary_ink: g('#cr-hd2-bar .cr-ib.primary', 'color'),
    search_bg: g('#cr-hd2-bar #headSearch', 'background-color'),
    meta_theme: (document.querySelector('meta[name=theme-color]') || {}).content || '(absent)',
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
