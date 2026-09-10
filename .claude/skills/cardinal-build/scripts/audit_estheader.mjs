/* audit_estheader.mjs — AUDIT PROBE: how tall is the estimate builder's header
 * on a phone, and what does hiding each candidate actually buy?
 *
 *   node audit_estheader.mjs [path/to/index.html]
 *
 * OPEN_ITEMS records "the estimate builder's phone header is now 150px tall
 * (52px before)" as a 1205 side-effect, and proposes hiding the two controls
 * `.cr-est-phonebar` already carries. Before shipping one CSS rule on the
 * strength of that sentence, MEASURE: the row count, every button in the row,
 * and the height with each candidate set hidden.
 *
 * ⚠ Hiding, never removing. `cr-epub`'s injectButton() returns early unless
 * head.querySelector('[data-act="save"]') exists, and `cr-e2c` anchors on
 * #cr-epub-btn or that same Save button. A display:none element is still found
 * by querySelector; a deleted one is not. Asserted here, not assumed.
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

/* the candidate hides, each expressed the way a CSS rule would express it */
const CANDIDATES = [
  { label: 'nothing hidden (as shipped)',            sels: [] },
  { label: 'Save only',                              sels: ['[data-act="save"]'] },
  { label: 'Publish only',                           sels: ['#cr-epub-btn'] },
  { label: 'Save + Publish  (the OPEN_ITEMS pick)',  sels: ['[data-act="save"]', '#cr-epub-btn'] },
  { label: 'Save + Publish + Duplicate',             sels: ['[data-act="save"]', '#cr-epub-btn', '[data-act="dup"]'] },
];

const PROBE = function (arg) {
  const head = document.querySelector('#cr-est-view .cr-est-head');
  if (!head) return { missing: true };
  const hidden = [];
  for (const sel of arg.sels) {
    head.querySelectorAll(sel).forEach(el => { hidden.push(el); el.style.display = 'none'; });
  }
  const r = head.getBoundingClientRect();
  /* ⚠ Cluster tops into BANDS. Grouping by exact top counted the baseline-
     aligned estnum span as its own row and reported 4 where a person sees 3.
     A row count that does not match the picture is not a row count. */
  const boxes = [];
  for (const el of head.children) {
    if (el.style.display === 'none') continue;
    const b = el.getBoundingClientRect();
    if (!b.width && !b.height) continue;
    boxes.push({ id: el.id || el.getAttribute('data-act') || el.tagName.toLowerCase(),
                 text: (el.textContent || '').trim().slice(0, 18),
                 top: b.top, w: Math.round(b.width), h: Math.round(b.height) });
  }
  const bands = [];
  for (const b of boxes.slice().sort((x, y) => x.top - y.top)) {
    const last = bands[bands.length - 1];
    if (last && Math.abs(b.top - last.top) <= 14) { last.items.push(b); }
    else bands.push({ top: b.top, items: [b] });
  }
  const saveFound = !!head.querySelector('[data-act="save"]');
  const epubFound = !!document.getElementById('cr-epub-btn');
  const e2cFound  = !!document.getElementById('cr-e2c-btn');
  const barPubOk  = !!document.querySelector('#cr-est-view [data-act="bar-publish"]');
  const barSaveOk = !!document.querySelector('#cr-est-view [data-act="bar-save"]');
  hidden.forEach(el => { el.style.display = ''; });
  return { missing: false, height: Math.round(r.height), hid: hidden.length,
           bands: bands.map(bd => bd.items.map(i => i.text || i.id)),
           boxes, saveFound, epubFound, e2cFound, barPubOk, barSaveOk,
           bodyPadBottom: getComputedStyle(document.querySelector('#cr-est-view .cr-est-body')).paddingBottom };
};

let browser = null;
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);
  for (const vp of [{ w: 390, h: 844, name: 'iPhone 390' }, { w: 760, h: 900, name: 'the rule boundary 760' }]) {
    console.log('\n================ ' + vp.name + ' (' + vp.w + 'x' + vp.h + ') ================');
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
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
    const st = await page.evaluate(async () => {
      const s = (window.__sentinelStates || []).find(x => x.name === 'estbuilder');
      if (!s) return 'no estbuilder state';
      try { await s.run(); } catch (e) { return 'threw: ' + e.message; }
      await new Promise(r => setTimeout(r, 1200));
      return 'ok';
    });
    if (st !== 'ok') { console.log('  [estbuilder] ' + st); await ctx.close(); continue; }

    let first = true;
    for (const c of CANDIDATES) {
      const r = await page.evaluate(PROBE, { sels: c.sels }).catch(e => ({ err: String(e.message).slice(0, 90) }));
      if (!r || r.err) { console.log('  probe error: ' + (r && r.err)); continue; }
      if (r.missing) { console.log('  header not on screen'); break; }
      if (first) {
        console.log('  the row as shipped, in DOM order:');
        for (const b of r.boxes)
          console.log('      ' + String(Math.round(b.top)).padStart(4) + 'px  ' +
                      String(b.w).padStart(4) + 'x' + String(b.h).padStart(3) + '  ' +
                      String(b.id).padEnd(19) + '  "' + b.text + '"');
        console.log('  body padding-bottom: ' + r.bodyPadBottom +
                    '   phonebar save/publish present: ' + r.barSaveOk + '/' + r.barPubOk);
        first = false;
        console.log('');
      }
      console.log('  ' + c.label.padEnd(36) + ' hid ' + r.hid +
                  '  height ' + String(r.height).padStart(4) + 'px' +
                  '  rows ' + r.bands.length +
                  '  anchors save/epub/e2c ' + [r.saveFound, r.epubFound, r.e2cFound].map(x => x ? 'y' : 'N').join('/'));
      r.bands.forEach((bd, i) => console.log('        row ' + (i + 1) + ': ' + bd.join(' | ')));
    }
    await ctx.close();
  }
} catch (e) {
  console.log('PROBE ERROR: ' + String((e && e.message) || e).slice(0, 300));
} finally { if (browser) { try { await browser.close(); } catch (_) {} } }
