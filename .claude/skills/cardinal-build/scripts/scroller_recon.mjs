/* scroller_recon — which of the app's hidden-scrollbar scrollers does the
   sentinel walk actually REACH, and at what size?

   The CLIPPED probe can only report a scroller it renders. Silence from a
   scroller that never entered the DOM is not a pass — it is an unmeasured
   surface, and it reads identically to a clean one in the report. This prints
   the difference.

   node scroller_recon.mjs <artifact> --setup a.js,b.js --viewports 390x844,...
*/
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('recon: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : (argv[i + 1] || d); };
const VIEWPORTS = opt('viewports', '390x844,1194x834,1440x900')
  .split(',').map(s => { const [w, h] = s.split('x').map(Number); return { w, h }; });
const SETUP_JS = opt('setup', '').split(',').map(s => s.trim()).filter(Boolean)
  .map(p => { if (!existsSync(p)) { console.error('setup not found: ' + p); process.exit(2); } return readFileSync(p, 'utf8'); })
  .join('\n;\n');

const SELECTORS = [
  '#cr-claims-mount .cr-c-tabs.detail', '#cr-pae-tabs', '.cd-crmbar', '.cr-cth-tabs',
  '.cr-ic-chips', '.cr-lil-tabs', '.cr-ped-row', '.cr-sf-tabs', '.cr-sh-tabs',
  '.ljchips', '.pu-tabs'
];

const MEASURE = `(() => {
  const SEL = ${JSON.stringify(SELECTORS)};
  const out = {};
  for (const sel of SEL) {
    let els = [];
    try { els = Array.from(document.querySelectorAll(sel)); } catch (e) { out[sel] = { err: String(e) }; continue; }
    if (!els.length) { out[sel] = { present: 0 }; continue; }
    out[sel] = { present: els.length, boxes: els.map(el => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height),
               disp: cs.display, vis: cs.visibility,
               ox: cs.overflowX, sw: cs.scrollbarWidth,
               scrollW: el.scrollWidth, clientW: el.clientWidth,
               over: el.scrollWidth - el.clientWidth,
               kids: el.children.length,
               hidden: (function(){
                 var out = [], box = el.getBoundingClientRect();
                 for (var i = 0; i < el.children.length; i++) {
                   var k = el.children[i].getBoundingClientRect();
                   if (k.right > box.left + el.clientWidth + 0.5)
                     out.push((el.children[i].textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26));
                 }
                 return out;
               })() };
    }) };
  }
  return out;
})()`;

const APP = readFileSync(FILE, 'utf8');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  .catch(() => chromium.launch());

/* worst overflow per (selector, viewport) — a "best" single row hides the
   viewport where a strip actually clips, and one number per selector is what
   made this look like nine unreachable surfaces instead of seven defects. */
const worst = {};  /* selector -> { vp -> {over, box, tag, hidden} } */
const seen  = {};  /* selector -> Set of state@vp where it had a real box */

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await page.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    return r.fulfill({ status: 200, body: '' });
  });
  if (SETUP_JS) await page.addInitScript(SETUP_JS);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  const names = await page.evaluate(`(window.__sentinelStates || []).map(s => s.name)`).catch(() => []);
  for (let i = 0; i < names.length; i++) {
    let threw = null;
    try { await page.evaluate(`Promise.resolve(window.__sentinelStates[${i}].run())`); await page.waitForTimeout(350); }
    catch (e) { threw = String(e.message).split('\n')[0]; }
    if (threw) { console.log(`  ! ${vp.w}px ${names[i]} THREW: ${threw}`); continue; }
    const res = await page.evaluate(MEASURE);
    for (const sel of SELECTORS) {
      const r = res[sel];
      if (!r || !r.present) continue;
      for (const box of (r.boxes || [])) {
        if (box.w <= 2 || box.h <= 2) continue;      /* not painted here */
        const tag = `${names[i]}@${vp.w}`;
        (seen[sel] = seen[sel] || new Set()).add(tag);
        const bucket = worst[sel] = worst[sel] || {};
        const cur = bucket[vp.w];
        if (!cur || box.over > cur.over) bucket[vp.w] = { over: box.over, box, tag, hidden: box.hidden };
      }
    }
  }
  await ctx.close();
  if (errs.length) console.log(`  page errors @${vp.w}: ${errs.slice(0, 3).join(' | ')}`);
}
await browser.close();

console.log('\n=== REACH ===');
let unreached = 0, sized = 0, clipping = 0;
for (const sel of SELECTORS) {
  const bucket = worst[sel];
  if (!bucket) { console.log(`  UNREACHED   ${sel}`); unreached++; continue; }
  sized++;
  const vps = Object.keys(bucket).map(Number).sort((a, b) => a - b);
  const bad = vps.filter(w => bucket[w].over > 1);
  if (bad.length) clipping++;
  console.log(`  ${bad.length ? 'CLIPPING' : 'CLEAN   '}    ${sel}`);
  for (const w of vps) {
    const b = bucket[w];
    const x = b.box;
    console.log(`      ${String(w).padStart(4)}px  ${String(x.w)}x${x.h} kids=${x.kids}` +
      `  scrollW=${x.scrollW} clientW=${x.clientW}  over=${b.over}` +
      `  ${x.sw === 'none' ? 'silent' : 'bar:' + x.sw}  [${b.tag}]` +
      (b.over > 1 && (b.hidden || []).length ? `  off-edge: ${b.hidden.join(' | ')}` : ''));
  }
  const s = [...(seen[sel] || [])];
  console.log(`      painted in ${s.length} render(s): ${s.slice(0, 6).join(', ')}${s.length > 6 ? ' …' : ''}`);
}
console.log(`\n${sized} measured / ${unreached} unreached of ${SELECTORS.length} — ${clipping} clipping`);
