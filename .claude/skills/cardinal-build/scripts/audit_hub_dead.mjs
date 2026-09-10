/* audit_hub_dead.mjs — AUDIT PROBE: the Production hub's rules that never win.
 *
 *   node audit_hub_dead.mjs [path/to/index.html]
 *
 * The sentinel reports "X never wins on any of the N elements it matches" but
 * does not say WHAT beat it. That distinction decides the fix:
 *
 *   - beaten by a deliberate later rule  -> the loser is cruft, delete it
 *   - beaten by a source-order accident  -> the INTENDED value is not rendering
 *
 * So for each finding this prints the declared value, the COMPUTED value, and
 * the rule that actually won, measured in Chromium on the real screen.
 *
 * ⚠ Theme matters. A light-theme value losing in a dark sweep is correct, not
 * dead — which is why the sentinel run that produced these findings (dark only)
 * cannot by itself call them cruft. Every check here is run in BOTH themes.
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(here, '../../../..');
const FILE = resolve(process.argv[2] || resolve(ROOT, 'index.html'));
const APP = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(resolve(here, 'sentinel_setup_cardinal.js'), 'utf8');
const MOCK = readFileSync(resolve(here, 'e2e_mock_supa.js'), 'utf8');
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
setTimeout(() => { console.log('PROBE TIMEOUT'); process.exit(3); }, 300000).unref();

/* the six the audit surfaced, each with the screen it lives on and the
   property the sentinel said never wins */
const CASES = [
  { state: 'production', sel: '#cr-pb h1',                   prop: 'font-size',  want: '26px'   },
  { state: 'production', sel: '#cr-pb .pbmonth .pbday',      prop: 'min-height', want: '44px',
    note: 'KNOWN + INTENDED since 1206 — desktop keeps 78px. Must NOT be "fixed".' },
  { state: 'dispatch',   sel: '#cr-disp .job .t',            prop: 'font-size',  want: '12px'   },
  { state: 'dispatch',   sel: '#cr-disp .job .a',            prop: 'font-size',  want: '11px'   },
  { state: 'dispatch',   sel: '#cr-disp .dspwk button',      prop: 'width',      want: '26px'   },
  { state: 'punch',      sel: '.pu-tab',                     prop: 'font-size',  want: '13.5px' },
  { state: 'punch',      sel: '.pu-srch input',              prop: 'font-size',  want: '13px'   },
  { state: 'punch',      sel: '.pu-age',                     prop: 'color',      want: 'rgb(201, 143, 22)' },
];

/* Ask the browser which rule actually wins a property on an element, by
   walking document.styleSheets and keeping the highest-specificity match that
   declares it — the same approach the sentinel's DEAD check uses, because a
   regex over the file cannot answer it. */
const WINNER = function (arg) {
  const sel = arg.sel, prop = arg.prop;
  const el = document.querySelector(sel);
  if (!el) return { missing: true };
  const spec = (s) => {
    let a = 0, b = 0, c = 0;
    s.replace(/#[\w-]+/g, () => { a++; return ''; })
     .replace(/\.[\w-]+|\[[^\]]+\]|:[a-z-]+(\([^)]*\))?/gi, () => { b++; return ''; })
     .replace(/\b[a-z][\w-]*/gi, () => { c++; return ''; });
    return a * 10000 + b * 100 + c;
  };
  const hits = [];
  const walk = (rules, media) => {
    for (const r of rules || []) {
      /* ⚠ FIXED: only descend into a media block that ACTUALLY MATCHES. The
         first version walked inactive blocks too, so a @media(max-width:430px)
         rule was reported as the "winner" of a property at 1194px while the
         COMPUTED value said otherwise. The computed value was always right;
         the attribution was not. Same family as the sentinel's own DEAD trap. */
      if (r.media) { let on = true; try { on = matchMedia(r.media.mediaText).matches; } catch (e) {}
        if (on) walk(r.cssRules, r.media.mediaText); continue; }
      if (!r.selectorText) { if (r.cssRules) walk(r.cssRules, media); continue; }
      const v = r.style && r.style.getPropertyValue(prop);
      if (!v) continue;
      for (const one of r.selectorText.split(',')) {
        const t = one.trim();
        let m = false; try { m = el.matches(t); } catch (e) {}
        if (m) hits.push({ sel: t, val: v.trim(), spec: spec(t),
                           imp: r.style.getPropertyPriority(prop) === 'important', media: media || '' });
      }
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules, ''); } catch (e) {} }
  hits.sort((x, y) => (x.imp - y.imp) || (x.spec - y.spec));
  const win = hits[hits.length - 1] || null;
  return { missing: false, n: document.querySelectorAll(sel).length,
           computed: getComputedStyle(el).getPropertyValue(prop).trim(),
           winner: win, contenders: hits.length };
};

let browser = null;
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);
  for (const theme of ['default', 'rb-light']) {
    console.log('\n================ THEME: ' + theme + ' ================');
    const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 },
      colorScheme: theme === 'rb-light' ? 'light' : 'dark' });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    if (theme !== 'default') {
      await page.addInitScript(() => {
        try { localStorage.setItem('cr-rbtheme', 'rb-light'); } catch (e) {}
        document.addEventListener('DOMContentLoaded', () => {
          try { document.documentElement.setAttribute('data-theme', 'rb-light'); } catch (e) {}
        });
      });
    }
    await page.route('**/*', async (route) => {
      const u = route.request().url(), rt = route.request().resourceType();
      if (u === 'https://app.cardinalroster.com/')
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
      if (u.includes('@supabase/supabase-js'))
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
      if (u.includes('chart.js') || u.includes('papaparse'))
        return route.fulfill({ status: 200, contentType: 'application/javascript',
          body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
      if (u.startsWith('https://app.cardinalroster.com/api/'))
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (rt === 'font') return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
      if (rt === 'media') return route.abort();
      if (u.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
      return route.abort();
    });
    await page.addInitScript(MOCK);
    await page.addInitScript(SETUP);
    await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    if (theme !== 'default')
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light'));

    let last = null;
    for (const c of CASES) {
      if (c.state !== last) {
        const okState = await page.evaluate(async (name) => {
          const s = (window.__sentinelStates || []).find(x => x.name === name);
          if (!s) return 'no state ' + name;
          try { await s.run(); } catch (e) { return 'threw: ' + e.message; }
          await new Promise(r => setTimeout(r, 900));
          return 'ok';
        }, c.state);
        if (okState !== 'ok') { console.log('\n  [' + c.state + '] ' + okState); }
        last = c.state;
      }
      const r = await page.evaluate(WINNER, { sel: c.sel, prop: c.prop })
        .catch(e => ({ err: String(e.message).slice(0, 90) }));
      console.log('\n  ' + c.sel + '  { ' + c.prop + ': ' + c.want + ' }');
      if (c.note) console.log('      ⚠ ' + c.note);
      if (!r || r.err) { console.log('      probe error: ' + (r && r.err)); continue; }
      if (r.missing) { console.log('      element not on screen in this state'); continue; }
      console.log('      elements: ' + r.n + '   COMPUTED: ' + r.computed +
                  (r.computed === c.want ? '   ← the declared value DOES win' : '   ← declared value does NOT win'));
      if (r.winner)
        console.log('      winner:   ' + r.winner.sel + '  { ' + c.prop + ': ' + r.winner.val + ' }' +
                    (r.winner.imp ? ' !important' : '') +
                    (r.winner.media ? '   @media ' + r.winner.media : '') +
                    '   (spec ' + r.winner.spec + ', ' + r.contenders + ' contenders)');
    }
    await ctx.close();
  }
} catch (e) {
  console.log('PROBE ERROR: ' + String((e && e.message) || e).slice(0, 300));
} finally { if (browser) { try { await browser.close(); } catch (_) {} } }
