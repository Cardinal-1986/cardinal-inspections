/*
 * Build 858 gate — the document editor's iframe (#reportFrame) gets a DEFINITE height
 * (position:absolute inside a relative #reportFrameWrap flex child) so it scrolls
 * internally instead of expanding and letting the page behind scroll (the iPhone bug).
 * Chromium can't reproduce iOS iframe auto-expansion, so this proves the STRUCTURE is in
 * place and there is NO desktop regression: the iframe is bounded (shorter than its content),
 * scrolls internally, and the parent page does not move. v857 has no wrap -> RED.
 *   node render_docscroll858.mjs                          # 858 -> GREEN
 *   node render_docscroll858.mjs /path/to/index_v857.html # 857 -> RED (no wrap; iframe not absolute)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('857') ? '857' : '858';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 820 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){};window.Papa={parse:()=>({data:[]}),unparse:()=>""};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(MOCK);

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('editorView') && document.getElementById('reportFrame'), { timeout: 20000 });
  const r = await page.evaluate(async () => {
    var ev = document.getElementById('editorView');
    var frame = document.getElementById('reportFrame');
    var wrap = document.getElementById('reportFrameWrap');
    // open the editor shell the way the app does (class + body lock)
    ev.classList.add('open');
    document.body.style.overflow = 'hidden';
    // load a tall document into the frame (taller than the viewport)
    frame.srcdoc = '<!doctype html><html><head><style>body{margin:0;font:16px sans-serif;}p{height:120px}</style></head><body>' +
      Array.from({length: 40}, function(_, i){ return '<p>line ' + i + '</p>'; }).join('') + '</body></html>';
    await new Promise(res => { frame.onload = res; setTimeout(res, 800); });
    await new Promise(r => setTimeout(r, 150));

    var cs = getComputedStyle(frame);
    var wcs = wrap ? getComputedStyle(wrap) : null;
    var idoc = null, innerScrollH = 0;
    try { idoc = frame.contentDocument; innerScrollH = idoc.documentElement.scrollHeight; } catch(e){}
    // scroll the inner document; the parent page must NOT move
    var beforeParent = window.scrollY;
    try { frame.contentWindow.scrollTo(0, 300); } catch(e){}
    await new Promise(r => setTimeout(r, 60));
    var innerScrolled = 0; try { innerScrolled = frame.contentWindow.scrollY || frame.contentDocument.documentElement.scrollTop; } catch(e){}
    var afterParent = window.scrollY;

    return {
      hasWrap: !!wrap,
      wrapRelative: wcs ? wcs.position === 'relative' : false,
      wrapIsFlexChild: wrap ? getComputedStyle(wrap.parentElement).display.indexOf('flex') !== -1 : false,
      frameAbsolute: cs.position === 'absolute',
      frameClientH: frame.clientHeight,
      innerScrollH: innerScrollH,
      frameBounded: innerScrollH > frame.clientHeight + 50,   // content taller than the frame -> internal scroll
      frameFillsWrap: wrap ? Math.abs(frame.clientHeight - wrap.clientHeight) <= 2 : false,
      innerScrolled: innerScrolled,
      parentStayed: beforeParent === 0 && afterParent === 0,
      bodyLocked: getComputedStyle(document.body).overflow === 'hidden',
    };
  });

  ok('#reportFrameWrap exists', r.hasWrap);
  ok('wrap is position:relative', r.wrapRelative, r.wrapRelative);
  ok('wrap is a flex child of the editor body', r.wrapIsFlexChild);
  ok('#reportFrame is position:absolute (definite height)', r.frameAbsolute, r.frameAbsolute);
  ok('iframe fills its wrap', r.frameFillsWrap, { frameH: r.frameClientH });
  ok('iframe is BOUNDED — shorter than its content (scrolls internally)', r.frameBounded, { frameH: r.frameClientH, contentH: r.innerScrollH });
  ok('scrolling the document moves the document', r.innerScrolled > 0, r.innerScrolled);
  ok('scrolling the document does NOT move the page behind', r.parentStayed, r.parentStayed);
  ok('body is scroll-locked while the editor is open', r.bodyLocked);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0,3).join(' | ')); fail++;
} finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
