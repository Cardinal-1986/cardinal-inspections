/* render_1070 — where "Draft narrative" actually lands, on a phone and on a
 * desktop, rendered from the REAL app rather than a mock.
 *
 * The point of the picture: the drafter used to be a small button injected
 * after the summary heading, which is ~1,900px down inside section 7 of the
 * report. On a phone that is a scroll nobody makes. Shot 1 is the More drawer
 * with the new row in it; shot 2 is the same control in the desktop toolbar;
 * shot 3 is where the button USED to be the only way in, for comparison.
 *
 * Same two traps as render_report_editor.mjs, and for the same reasons:
 * CDP Page.captureScreenshot (page.screenshot() waits on document.fonts.ready
 * in every frame and the report template links webfonts that never resolve),
 * and a real viewport (an @media query keys off the window, not a div).
 *
 *   node render_1070.mjs [index.html] [out-prefix]
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = process.argv[3] || '/tmp/claude-0/-home-user-cardinal-inspections/19de3f5f-c337-5d4a-bfbe-8000821667e1/scratchpad/r1070';
const HTML = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const SETUP = ['sentinel_setup_cardinal.js','e2e_mock_supa.js']
  .map(f => readFileSync(join(HERE,f),'utf8')).join('\n;\n');

const OPEN = `(() => {
  window.currentProject = { id:'p1', name:'Gardner', checklist: JSON.stringify({
    structure:'Single-family residence, detached garage',
    rooftype:'Asphalt shingles \\u2014 field, hip and ridge',
    decking:'1\\u00d76 plank decking, gapped', attic:'Yes',
    method:'Visual, non-invasive; roof accessed directly',
    age:'19', layers:'2', pitch:'6/12', condition:'Deteriorated \\u2014 active granule loss'
  })};
  const ev = document.getElementById('editorView');
  ev.classList.add('open'); ev.setAttribute('aria-hidden','false');
  document.getElementById('reportTitle').value = 'Chris Gardner \\u2014 Hyer Street, New Carlisle, OH 45344';
  const cc = document.getElementById('edClientChip');
  cc.style.display=''; cc.textContent = '1076: Chris Gardner';
  const rc = document.getElementById('edRepChip'); rc.style.display=''; rc.textContent = 'REP \\u00b7 Theo';
  for (const id of ['sigBtn','rccBtn','sortBtn','fillChipBtn']) {
    const b = document.getElementById(id); if (b) b.style.display = 'inline-block';
  }
  const f = document.getElementById('reportFrame');
  const d = f.contentDocument;
  d.open(); d.write(window.REPORT_TEMPLATE || ''); d.close();
  if (typeof wireSummaryDraftButton === 'function') { try { wireSummaryDraftButton(d); } catch(e){} }
  /* the real re-sync, so the facts table shows what the AI is now handed */
  try {
    const cl = getChecklist(window.currentProject);
    const n = resyncChecklist(d, cl);
    const t = document.getElementById('fillChipTxt');
    if (t) { t.textContent = (51-n) + ' to fill'; t.parentElement.style.borderColor='#2a6b3c'; }
  } catch(e){}
  if (typeof window.draftGate === 'function') window.draftGate();
  return true;
})()`;

const SCROLL_TO_SUMMARY = `(() => {
  const d = document.getElementById('reportFrame').contentDocument;
  const h = d.querySelector('[data-cardinal-summary-heading]');
  if (h) h.scrollIntoView({ block:'start' });
  return !!h;
})()`;

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(()=>chromium.launch());

async function shot(name, width, steps) {
  const ctx = await browser.newContext({ viewport:{width,height:844}, deviceScaleFactor:2 });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://pv.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML});
    return r.fulfill({status:200,body:''});
  });
  await page.addInitScript(`try{Object.defineProperty(document,'fonts',{value:{ready:Promise.resolve(),
    check:()=>true,load:()=>Promise.resolve([]),addEventListener(){},status:'loaded'},configurable:true});}catch(e){}`);
  await page.addInitScript(SETUP);
  await page.goto('https://pv.test/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1100);
  await page.evaluate(OPEN);
  await page.waitForTimeout(500);
  for (const st of steps) {
    if (typeof st === 'string' && st.startsWith('CLICK:')) { await page.click(st.slice(6)); }
    else await page.evaluate(st);
    await page.waitForTimeout(300);
  }
  const file = `${OUT}_${name}.png`;
  const cdp = await ctx.newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format:'png' });
  writeFileSync(file, Buffer.from(data,'base64'));
  console.log('  wrote', file);
  await ctx.close();
}

await shot('phone_drawer',   390,  ['CLICK:#edMoreBtn']);
await shot('phone_indoc',    390,  [SCROLL_TO_SUMMARY]);
await shot('desktop_toolbar',1440, []);
await browser.close();
console.log('done');
