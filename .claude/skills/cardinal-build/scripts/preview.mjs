/* preview.mjs — labelled before/after contact sheet for a VISUAL build.

   CLAUDE.md: "Preview visual changes before shipping — labelled options, dark
   and light, desktop and mobile, then build the pick." That instruction has been
   unfollowable, because every screenshot in this harness timed out.

   ⚠ THE ROOT CAUSE, and it is not the fonts. Playwright's screenshot waits on
   `document.fonts.ready`, which per spec cannot resolve until the DOCUMENT has
   finished loading. The old harnesses answered every non-app request with
   `fulfill({status:200, body:''})` — no content-type — so an <img> request never
   completed, readyState stuck at "interactive" forever, and fonts.ready stayed
   pending. Measured: readyState "interactive", fonts.status "loaded",
   fonts.size 0, 0 running animations, 62 rAF ticks/sec — a perfectly healthy
   page that could not be photographed. Serving by resourceType() with a REAL
   1x1 PNG for images takes the same shot in 67ms.
   The app has ZERO @font-face rules and ZERO webfont URLs, so "wait for fonts"
   was never about fonts here. Do not "fix" this by disabling the font wait.

   ⚠ AND THE PREVIEW TRAP CLAUDE.md ALREADY RECORDS: `@media (max-width:560px)`
   keys off the BROWSER WINDOW, not the frame a preview draws in. Three iframes
   side by side all resolve their media queries against the outer window, so a
   preview grid confidently shows a phone layout that is really a desktop one.
   Therefore width comes ONLY from setViewportSize — one capture per width — and
   theme comes ONLY from the same data-theme attribute the app's own toggle
   writes. The sheet then lays out PNGs whose queries and tokens were already
   resolved, in a real engine, at capture time.

   Usage:
     node preview.mjs --before <file.html> --after <file.html> \
                      --surface <name> [--surface <name>...] \
                      [--widths 390,1194,1680] [--themes dark,light] \
                      [--out <dir>]

   Surfaces are named recipes in SURFACES below; each is a function that drives
   the app to the screen you want and returns a clip rect (or null for the fold).
   Add one rather than passing selectors on the command line — a recipe that
   lands on the wrong screen should fail once, in here, not silently per build. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PNG1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

function arg(name, dflt){
  const i = process.argv.indexOf('--'+name);
  return i === -1 ? dflt : process.argv[i+1];
}
function argAll(name){
  const out=[];
  process.argv.forEach((a,i)=>{ if(a === '--'+name) out.push(process.argv[i+1]); });
  return out;
}

/* ── surface recipes ─────────────────────────────────────────────────────── */
const SURFACES = {
  /* the community job card — the money frame. One screenshot carries the
     job-menu labels, the pin strip and the tab bar together. */
  'community-card': async (page) => {
    await page.evaluate(async () => {
      if (typeof window.openProject === 'function' && window.__crSeedCommunity)
        await window.__crSeedCommunity();
      const lv = document.getElementById('landingView'); if (lv) lv.style.display = 'none';
    });
    return '#cr-cc';
  },
  'community-hub': async (page) => {
    await page.evaluate(async () => {
      try { if (window.CardinalCommunityHub && window.CardinalCommunityHub.show)
              await window.CardinalCommunityHub.show(); } catch(e){}
      const lv = document.getElementById('landingView'); if (lv) lv.style.display = 'none';
    });
    return '#cr-ch2';
  },
  'punch': async (page) => {
    await page.evaluate(async () => {
      if (typeof window.openPunchView === 'function') await window.openPunchView();
      const lv = document.getElementById('landingView'); if (lv) lv.style.display = 'none';
    });
    return '#punchView .pu-wrap';
  },
  /* a raw type specimen: every selector the build touched, rendered in place.
     Used when the real screen needs data the harness cannot seed. */
  'type-specimen': async (page, opts) => {
    await page.evaluate((sels) => {
      const lv = document.getElementById('landingView'); if (lv) lv.style.display = 'none';
      let host = document.getElementById('__prevSpec');
      if (!host) { host = document.createElement('div'); host.id = '__prevSpec'; document.body.prepend(host); }
      host.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:auto;padding:16px;'
        + 'background:var(--ccm-card,#161918);color:var(--ccm-ink,#f2f4f3)';

      /* ⚠ A rule like `#cr-cc .cc-jmb .l` needs the WHOLE ancestor chain to
         match. Hanging one flat div with class="l" inside #cr-cc matches
         nothing, and the specimen then shows the unstyled default in BOTH
         columns — a preview that cannot show a difference. Build the chain. */
      function build(sel, text){
        const parts = sel.trim().split(/\s+/).filter(p => p && p !== '>');
        let rootEl = null, cur = null;
        for (const part of parts){
          const tagM = part.match(/^([a-zA-Z][\w-]*)/);
          const tag  = tagM ? tagM[1] : 'div';
          const el = document.createElement(tag);
          const idM = part.match(/#([\w-]+)/);
          if (idM) el.id = idM[1];
          (part.match(/\.([\w-]+)/g) || []).forEach(c => el.classList.add(c.slice(1)));
          if (!rootEl) rootEl = el; else cur.appendChild(el);
          cur = el;
        }
        if (cur) cur.textContent = text;
        return rootEl;
      }

      /* ⚠ The constructed chain starts with the REAL id — `#cr-cc` — and the
         app hides that element until the card opens, so every sample inherited
         display:none and the first sheet came out blank under every caption.
         A preview that cannot show a difference proves nothing. Un-hide the
         chain after it is in the document, recording where we had to. */
      function reveal(root){
        const forced = [];
        let el = root, depth = 0;
        while (el){
          const cs = getComputedStyle(el);
          if (cs.display === 'none'){ el.style.setProperty('display','block','important'); forced.push('display'); }
          if (cs.visibility === 'hidden'){ el.style.setProperty('visibility','visible','important'); forced.push('visibility'); }
          if (parseFloat(cs.opacity) === 0){ el.style.setProperty('opacity','1','important'); forced.push('opacity'); }
          /* ⚠ #cr-cc is a FULL-SCREEN view — position:fixed; inset:0. Reused as
             a specimen ancestor, all 28 samples stacked on top of each other at
             the top of the sheet and only the last one was visible. Put the
             chain back in flow. Type is what this specimen measures, and none
             of that depends on positioning. */
          if (cs.position !== 'static'){
            el.style.setProperty('position','static','important');
            el.style.setProperty('inset','auto','important');
            forced.push('position');
          }
          if (depth === 0){
            el.style.setProperty('width','auto','important');
            el.style.setProperty('height','auto','important');
            el.style.setProperty('max-height','none','important');
            el.style.setProperty('overflow','visible','important');
            el.style.setProperty('background','transparent','important');
            el.style.setProperty('padding','0','important');
            el.style.setProperty('margin','0','important');
            el.style.setProperty('border','0','important');
          }
          el = el.firstElementChild; depth++;
        }
        return forced;
      }

      host.innerHTML = '';
      for (const s of sels){
        const row = document.createElement('div');
        row.style.cssText = 'padding:6px 0;border-bottom:1px solid rgba(128,128,128,.22)';
        const cap = document.createElement('div');
        cap.style.cssText = 'font:400 9px ui-monospace,Menlo,monospace;opacity:.5;margin-bottom:3px';
        cap.textContent = s.sel + (s.declared ? '   \u2192 ' + s.declared : '');
        row.appendChild(cap);
        const built = build(s.sel, s.text || 'Habitat for Humanity \u00b7 Bill to');
        if (built) row.appendChild(built);
        host.appendChild(row);
        /* ⚠ reveal() AFTER the row is in the document. getComputedStyle on a
           DETACHED node returns empty strings, so `cs.display === 'none'` was
           never true and the first repair silently did nothing — the sheet came
           back just as blank and just as confident. */
        if (built) reveal(built);
      }
    }, opts.specimen || []);
    return '#__prevSpec';
  },
};

/* ── capture ─────────────────────────────────────────────────────────────── */
async function capture(browser, file, surface, width, theme, outPath, opts){
  const APP = readFileSync(file, 'utf8');
  const page = await browser.newPage({ viewport:{ width, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message)));

  /* Serve by RESOURCE TYPE. An image answered with an empty body never
     completes, and the document then never reaches readyState "complete" —
     see the header. This is the whole fix. */
  await page.route('**/*', r => {
    const u = r.request().url(), rt = r.request().resourceType();
    if (u.startsWith('https://sentinel.test/') && /sentinel\.test\/?(\?|$)/.test(u))
      return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:APP });
    if (rt === 'image' || /\.(png|jpe?g|gif|webp|ico|svg)(\?|$)/i.test(u))
      return r.fulfill({ status:200, contentType:'image/png', body:PNG1x1 });
    if (rt === 'stylesheet') return r.fulfill({ status:200, contentType:'text/css', body:'' });
    if (rt === 'script')     return r.fulfill({ status:200, contentType:'application/javascript', body:'' });
    return r.fulfill({ status:200, contentType:'text/plain', body:'' });
  });

  const setup = join(HERE, 'sentinel_setup_cardinal.js');
  if (existsSync(setup)) {
    let s = readFileSync(setup, 'utf8');
    const mock = join(HERE, 'e2e_mock_supa.js');
    if (existsSync(mock)) s += '\n;\n' + readFileSync(mock, 'utf8');
    await page.addInitScript(s);
  }

  await page.goto('https://sentinel.test/?as=theo', { waitUntil:'domcontentloaded' });
  /* theme is the SAME attribute the app's own toggle writes — never a filter
     or a wrapper class, which would not flip a single token */
  await page.evaluate(t => {
    if (t === 'light') document.documentElement.setAttribute('data-theme','rb-light');
    else document.documentElement.removeAttribute('data-theme');
  }, theme);
  await page.waitForTimeout(1800);

  let sel = null, why = '';
  try { sel = await SURFACES[surface](page, opts); }
  catch(e){ why = 'recipe threw: ' + e.message; }

  await page.waitForTimeout(600);
  let clip = null, found = false;
  if (sel) {
    clip = await page.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return null;
      return { x:Math.max(0,Math.round(r.x)), y:Math.max(0,Math.round(r.y)),
               width:Math.round(Math.min(r.width, window.innerWidth)),
               height:Math.round(Math.min(r.height, 2400)) };
    }, sel);
    found = !!clip;
  }
  let ok = true, note = why;
  try {
    await page.screenshot({ path: outPath, clip: clip || undefined,
                            fullPage: false, animations:'disabled', timeout: 20000 });
  } catch(e){ ok = false; note = 'screenshot: ' + String(e.message).split('\n')[0]; }
  await page.close();
  return { ok, found, note, errs: errs.length };
}

/* ── main ────────────────────────────────────────────────────────────────── */
const before = arg('before'), after = arg('after');
if (!before || !after){ console.error('need --before and --after'); process.exit(2); }
const surfaces = argAll('surface');
if (!surfaces.length){ console.error('need at least one --surface; known: ' + Object.keys(SURFACES).join(', ')); process.exit(2); }
for (const s of surfaces) if (!SURFACES[s]){ console.error('unknown surface: ' + s); process.exit(2); }
const widths = String(arg('widths','390,1194,1680')).split(',').map(Number);
const themes = String(arg('themes','dark,light')).split(',');
const outDir = arg('out', join(process.cwd(), 'preview'));
const specFile = arg('specimen');
const opts = { specimen: specFile ? JSON.parse(readFileSync(specFile,'utf8')) : [] };
mkdirSync(outDir, { recursive:true });

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const rows = [];
for (const surface of surfaces)
  for (const w of widths)
    for (const th of themes)
      for (const [label, file] of [['before', before], ['after', after]]) {
        const name = `${surface}_${w}_${th}_${label}.png`;
        const res = await capture(browser, file, surface, w, th, join(outDir, name), opts);
        rows.push({ surface, w, th, label, name, ...res });
        console.log(`  ${res.ok ? (res.found ? 'ok  ' : 'ok* ') : 'FAIL'} ${name}` +
                    (res.note ? '   ' + res.note : '') + (res.errs ? `   (${res.errs} page errors)` : ''));
      }
await browser.close();

/* the sheet: PNGs whose media queries and tokens were resolved at capture time */
const groups = [];
for (const surface of surfaces) for (const w of widths) for (const th of themes)
  groups.push({ surface, w, th,
    b: rows.find(r=>r.surface===surface&&r.w===w&&r.th===th&&r.label==='before'),
    a: rows.find(r=>r.surface===surface&&r.w===w&&r.th===th&&r.label==='after') });

const html = `<title>Preview — ${basename(before)} vs ${basename(after)}</title>
<style>
:root{--bg:#101216;--card:#191d23;--edge:#2a3038;--ink:#e9ecef;--mute:#8b939d;--acc:#f5a623}
body{margin:0;background:var(--bg);color:var(--ink);font:400 14px/1.5 'Segoe UI',Arial,sans-serif}
h1{font:800 22px 'Segoe UI',Arial,sans-serif;margin:0 0 4px}
.wrap{padding:26px 22px 70px;max-width:1500px;margin:0 auto}
.sub{color:var(--mute);font-size:13px;margin-bottom:26px}
.grp{margin:30px 0 0;border:1px solid var(--edge);border-radius:12px;background:var(--card);overflow:hidden}
.gh{padding:11px 16px;border-bottom:1px solid var(--edge);display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.gh b{font-size:14px}
.chip{font:600 10.5px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;
      padding:3px 8px;border-radius:20px;border:1px solid var(--edge);color:var(--mute)}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--edge)}
@media (max-width:760px){.pair{grid-template-columns:1fr}}
.cell{background:var(--card);padding:14px}
.cell h3{margin:0 0 10px;font:700 11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}
.cell.after h3{color:var(--acc)}
img{max-width:100%;display:block;border:1px solid var(--edge);border-radius:6px;background:#000}
.miss{color:#e8545e;font:600 12px ui-monospace,monospace}
</style>
<div class="wrap">
<h1>Before / after</h1>
<div class="sub">Each frame captured at its own viewport width in a real engine, theme set with the app's own <code>data-theme</code> attribute. Media queries and tokens were resolved at capture time, not by this page.</div>
${groups.map(g => `<div class="grp">
  <div class="gh"><b>${g.surface}</b><span class="chip">${g.w}px</span><span class="chip">${g.th}</span></div>
  <div class="pair">
    <div class="cell"><h3>before</h3>${g.b && g.b.ok ? `<img src="${g.b.name}" alt="">` : `<div class="miss">${(g.b&&g.b.note)||'not captured'}</div>`}</div>
    <div class="cell after"><h3>after</h3>${g.a && g.a.ok ? `<img src="${g.a.name}" alt="">` : `<div class="miss">${(g.a&&g.a.note)||'not captured'}</div>`}</div>
  </div></div>`).join('\n')}
</div>`;
writeFileSync(join(outDir,'index.html'), html);
const failed = rows.filter(r=>!r.ok).length, unclipped = rows.filter(r=>r.ok && !r.found).length;
console.log(`\n${rows.length} frames, ${failed} failed, ${unclipped} fell back to the viewport (surface not found)`);
console.log('sheet: ' + join(outDir,'index.html'));
process.exit(failed ? 1 : 0);
