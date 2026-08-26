/* render_report_editor — previews of the inspection-report editor, rendered
 * from the REAL app.
 *
 * WHY IT IS NOT A MOCK PAGE
 *   CLAUDE.md: "Mock previews must be driven by the same toggle they demo —
 *   @media (max-width) keys off the browser WINDOW, not the preview frame."
 *   A phone-shaped div inside a 1440px window renders desktop CSS and looks
 *   convincing. So this loads the real index.html at a real 390x844 viewport,
 *   opens the real #editorView, and writes the real REPORT_TEMPLATE into the
 *   real #reportFrame. What you see is what ships.
 *
 * ⚠ TWO TRAPS, BOTH OF WHICH COST A RUN
 *
 * 1. page.screenshot() HANGS HERE. It waits for document.fonts.ready in every
 *    frame, and the report template links webfonts that never resolve behind
 *    a route stub — aborting those requests makes it worse, because an aborted
 *    font leaves the promise pending forever. Use CDP Page.captureScreenshot,
 *    which returns the screen as it is in ~90ms. Same reason
 *    audit_design_shots.mjs uses it.
 *
 * 2. A PREVIEW MUST SHOW THE THING IT DEMONSTRATES. The first run captured the
 *    top of the document for every variant, including the one whose whole
 *    point is the Property Facts table 1,500px further down — so the "after"
 *    shot was identical to the "before" and proved nothing. SCROLL_TO_FACTS
 *    exists for that.
 *
 * ⚠ AND ONE CONSTRAINT ON THE VARIANTS THEMSELVES
 *   Short placeholder labels MUST keep their square brackets. fillBlanks()
 *   matches /^\[[^\]]*\]$/ and compactForPrint() strips on charAt(0)==='[',
 *   so a bare word would silently break both the "N to fill" counter and the
 *   rule that unfilled placeholders never print. Shorten the CONTENTS, keep
 *   the brackets.
 *
 *   node render_report_editor.mjs [index.html] [out-prefix]
 *
 * The RESYNC variant fills the nine checklist-backed fields with PLAUSIBLE
 * values to show the mechanism. It is a demonstration, not a measurement —
 * the real count depends on how much of the checklist is filled in. */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = process.argv[3] || '/tmp/claude-0/-home-user-cardinal-inspections/19de3f5f-c337-5d4a-bfbe-8000821667e1/scratchpad/preview';
const HTML = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const SETUP = ['sentinel_setup_cardinal.js','e2e_mock_supa.js']
  .map(f => readFileSync(join(HERE,f),'utf8')).join('\n;\n');

/* ---- the three variants, as functions run inside the page ---------------- */
const OPEN_EDITOR = `(() => {
  const ev = document.getElementById('editorView');
  ev.classList.add('open'); ev.setAttribute('aria-hidden','false');
  document.getElementById('reportTitle').value = 'Chris Gardner — Hyer Street, New Carlisle, OH 45344';
  const cc = document.getElementById('edClientChip');
  cc.style.display=''; cc.textContent = '1076: Chris Gardner';
  const rc = document.getElementById('edRepChip');
  rc.style.display=''; rc.textContent = 'REP · Theo';
  const lg = document.getElementById('editorLogo');
  if (lg) { lg.style.display=''; lg.src = document.querySelector('img[src*="cardinal"]')?.src || ''; }
  for (const id of ['sigBtn','rccBtn','sortBtn','fillChipBtn']) {
    const b = document.getElementById(id); if (b) b.style.display = 'inline-block';
  }
  const t = document.getElementById('fillChipTxt');
  if (t) { t.textContent = '51 to fill'; t.parentElement.style.borderColor = '#c8202e'; }
  const f = document.getElementById('reportFrame');
  const d = f.contentDocument;
  d.open(); d.write(window.REPORT_TEMPLATE || '<p>no template</p>'); d.close();
  return true;
})()`;

/* VARIANT 1A — three primaries in the bar, the rest behind a drawer */
const DRAWER_A = `(() => {
  const KEEP = ['saveBtn','printBtn','fillChipBtn'];
  const bar  = document.querySelector('#editorView .edbtns');
  const rest = [...bar.querySelectorAll('button')].filter(b => !KEEP.includes(b.id) && b.style.display !== 'none');
  const more = document.createElement('button');
  more.className = 'btn dark'; more.id = '__more';
  more.innerHTML = '<span class="bl">\\u22EF More</span>';
  bar.appendChild(more);
  const dr = document.createElement('div'); dr.id='__drawer';
  dr.style.cssText = 'position:fixed;left:10px;right:10px;bottom:10px;z-index:400;background:#fff;'
    + 'border:1px solid #c9c2bf;border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,.28);'
    + 'overflow:hidden;display:none;';
  rest.forEach(b => {
    const row = document.createElement('div');
    row.style.cssText='padding:14px 16px;border-bottom:1px solid #eee;font:700 14px \\'Segoe UI\\',Arial,sans-serif;color:#1b1b1b;';
    row.textContent = b.textContent.trim(); dr.appendChild(row); b.style.display='none';
  });
  document.body.appendChild(dr);
  window.__toggleDrawer = () => { dr.style.display = dr.style.display==='none' ? 'block' : 'none'; };
  bar.style.gridTemplateColumns = '1fr 1fr';
  return rest.length;
})()`;

/* VARIANT 1B — one compact icon row, nothing wraps */
const DRAWER_B = `(() => {
  const KEEP = ['saveBtn','printBtn','fillChipBtn'];
  const bar  = document.querySelector('#editorView .edbtns');
  [...bar.querySelectorAll('button')].forEach(b => { if(!KEEP.includes(b.id)) b.style.display='none'; });
  const more = document.createElement('button');
  more.className='btn dark'; more.innerHTML='<span class="bl">\\u22EF</span>';
  bar.appendChild(more);
  bar.style.display='flex'; bar.style.gridTemplateColumns=''; bar.style.flexWrap='nowrap';
  bar.style.gap='6px';
  [...bar.querySelectorAll('button')].forEach(b=>{ b.style.flex='1 1 auto'; b.style.whiteSpace='nowrap'; });
  more.style.flex='0 0 auto';
  return true;
})()`;

/* VARIANT 6 — short bracketed labels; brackets KEPT so fillBlanks() and
   compactForPrint() still recognise an unfilled field */
const SHORT_PH = `(() => {
  const MAP = {
    '[e.g. Single-family residence with masonry chimney, covered front porch, detached garage]':'[Structure]',
    '[e.g. Asphalt shingles \\u2014 field, hip, and ridge]':'[Roof covering]',
    '[e.g. Gable roof with front dormer and porch roof]':'[Roof style]',
    '[e.g. 1\\u00d78 nominal plank (board) decking, gapped]':'[Decking]',
    '[e.g. Accessible \\u2014 decking, framing, insulation observed]':'[Attic access]',
    '[e.g. Visual, non-invasive; roof surface accessed directly]':'[Method]',
    '[Age \\u2014 from checklist]':'[Age]',
    '[Layers \\u2014 from checklist]':'[Layers]',
    '[Pitch \\u2014 from checklist]':'[Pitch]',
    '[Condition \\u2014 from checklist]':'[Condition]',
  };
  const d = document.getElementById('reportFrame').contentDocument;
  let n = 0;
  d.querySelectorAll('.ph').forEach(el => {
    const t = (el.textContent||'').trim();
    if (MAP[t]) { el.setAttribute('title', t.replace(/^\\[|\\]$/g,'')); el.textContent = MAP[t]; n++; }
  });
  return n;
})()`;

/* VARIANT 2 — what the re-synced report looks like: the 9 checklist fields filled */
const RESYNC = `(() => {
  const V = { '[Age]':'19 years (estimated)', '[Layers]':'2', '[Pitch]':'6/12',
              '[Condition]':'Deteriorated \\u2014 active granule loss',
              '[Decking]':'1\\u00d76 plank decking, gapped',
              '[Structure]':'Single-family residence, detached garage',
              '[Roof covering]':'Asphalt shingles \\u2014 field, hip and ridge',
              '[Attic access]':'Accessible \\u2014 decking and ventilation inspected',
              '[Method]':'Visual, non-invasive; roof accessed directly' };
  const d = document.getElementById('reportFrame').contentDocument;
  let n=0;
  d.querySelectorAll('.ph').forEach(el => {
    const t=(el.textContent||'').trim();
    if (V[t]) { el.className='fill'; el.style.background='none'; el.textContent=V[t]; n++; }
  });
  const t2 = document.getElementById('fillChipTxt');
  if (t2) { t2.textContent = (51-n) + ' to fill'; t2.parentElement.style.borderColor='#2a6b3c'; }
  return n;
})()`;


/* scroll the report to the Property Facts table — option 6 lives there, and a
   preview that does not show the thing it demonstrates is not a preview */
const SCROLL_TO_FACTS = `(() => {
  const d = document.getElementById('reportFrame').contentDocument;
  let el = null;
  d.querySelectorAll('td,th,h2,h3').forEach(n => {
    if (!el && /Roof Decking|Estimated Roof Age|Property Facts/i.test(n.textContent||'')) el = n;
  });
  if (el) el.scrollIntoView({block:'start'});
  return !!el;
})()`;

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(()=>chromium.launch());

async function shot(name, theme, steps) {
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u=r.request().url();
    if(u.startsWith('https://pv.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML});
    /* fulfil rather than abort: an aborted font leaves document.fonts.ready
       pending forever and page.screenshot() waits on it. */
    return r.fulfill({status:200,body:''});
  });
  /* belt and braces — the app links Google Fonts, which never resolve here */
  await page.addInitScript(`try{Object.defineProperty(document,'fonts',{value:{ready:Promise.resolve(),
    check:()=>true,load:()=>Promise.resolve([]),addEventListener(){},status:'loaded'},configurable:true});}catch(e){}`);
  if(theme!=='default') await page.addInitScript(
    `window.__sentinelTheme=${JSON.stringify(theme)};(function put(){var r=document.documentElement;`+
    ` if(r){r.setAttribute('data-theme',${JSON.stringify(theme)});return;}`+
    ` new MutationObserver(function(_,o){if(document.documentElement){o.disconnect();put();}}).observe(document,{childList:true});})();`);
  await page.addInitScript(SETUP);
  await page.goto('https://pv.test/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1100);
  await page.evaluate(OPEN_EDITOR);
  await page.waitForTimeout(400);
  for (const st of steps) { await page.evaluate(st); await page.waitForTimeout(200); }
  const file = `${OUT}_${name}_${theme==='default'?'dark':'light'}.png`;
  /* CDP, not page.screenshot(): Playwright waits for document.fonts.ready in
     EVERY frame, and the report template links webfonts that never resolve
     behind this route stub. CDP returns the screen as it is, in ~90ms. This is
     the same reason audit_design_shots.mjs uses it. */
  const cdp = await ctx.newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format:'png' });
  writeFileSync(file, Buffer.from(data,'base64'));
  console.log('  wrote', file);
  await ctx.close();
}

for (const theme of ['default','rb-light']) {
  await shot('0-before',    theme, []);
  await shot('1A-drawer',   theme, [DRAWER_A]);
  await shot('1A-open',     theme, [DRAWER_A, `window.__toggleDrawer()`]);
  await shot('1B-onerow',   theme, [DRAWER_B]);
  await shot('6-before',    theme, [SCROLL_TO_FACTS]);
  await shot('6-labels',    theme, [SHORT_PH, SCROLL_TO_FACTS]);
  await shot('ALL',         theme, [DRAWER_A, SHORT_PH, RESYNC, SCROLL_TO_FACTS]);
  await shot('ALL-top',     theme, [DRAWER_A, SHORT_PH, RESYNC]);
}
await browser.close();
