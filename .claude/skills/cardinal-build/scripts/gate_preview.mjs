import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const FILE = 'file:///home/user/cardinal-inspections/docs/landing_retail_previews.html';
const DIRS = ['1','2','3','4'], THEMES = ['dark','light'], WIDTHS = ['phone','desk'];
let fail = 0, checks = 0;
const bad = [];
function say(ok, msg){ checks++; if(!ok){ fail++; bad.push(msg); } }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto(FILE);

// probe injected BY PATH. It lived in a template literal until this run, where
// every \\( collapsed to ( , the rgba() regex broke, every channel parsed NaN,
// and `NaN < worst` is false -- so the check passed EVERYTHING. A gate that
// cannot fail is worse than no gate (BUG_CLASSES 37).
await page.addScriptTag({ path: 'preview_probe.js' });
say(await page.evaluate(() => {
  const p = window.__probe; if(typeof p !== 'function') return false;
  const r = p(); return r.texts > 0 && r.ink.every(x => Number.isFinite(x.r));
}), 'probe returned non-finite ratios -- the rgba parse is broken');


for (const d of DIRS){
  await page.click(`#segDir button[data-d="${d}"]`);
  for (const t of THEMES){
    await page.click(`#segT button[data-t="${t}"]`);
    for (const w of WIDTHS){
      await page.click(`#segW button[data-w="${w}"]`);
      const r = await page.evaluate(() => window.__probe());
      const tag = `D${d}/${t}/${w}`;
      say(r.texts > 25, `${tag}: only ${r.texts} text elements scored — probe likely blind`);
      say(!r.overflow, `${tag}: page scrolls sideways`);
      say(r.ink.length === 0, `${tag}: ${r.ink.length} ink below floor -> ` +
        r.ink.map(x=>`${x.r}:1 (need ${x.floor}) ${x.fs}px "${x.t}"`).join(' | '));
      say(r.small.length === 0, `${tag}: ${r.small.length} sub-floor -> ${r.small.join(' | ')}`);
      console.log(`${tag}  texts=${r.texts} controls=${r.ctrls} ink_fail=${r.ink.length} small=${r.small.length}`);
    }
  }
}

// the toggles must actually drive the frames (a control that cannot fail is worse than none)
await page.click('#segT button[data-t="light"]');
const litOK = await page.evaluate(()=> [...document.querySelectorAll('.shell')].every(s=>s.getAttribute('data-t')==='light'));
say(litOK, 'theme toggle did not reach every shell');
await page.click('#segW button[data-w="desk"]');
const wOK = await page.evaluate(()=> [...document.querySelectorAll('.shell')].every(s=>s.getAttribute('data-w')==='desk'));
say(wOK, 'width toggle did not reach every shell');
const mq = await page.evaluate(()=> [...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}})
  .filter(r=>r.type===4).map(r=>r.conditionText||r.media.mediaText));
say(mq.length===0, 'preview uses @media for frames: '+JSON.stringify(mq));

console.log('\n' + (fail? `RED  ${fail}/${checks} failed` : `GREEN  ${checks}/${checks}`));
bad.forEach(b=>console.log('  ✗ '+b));
await browser.close();
process.exit(fail?1:0);
