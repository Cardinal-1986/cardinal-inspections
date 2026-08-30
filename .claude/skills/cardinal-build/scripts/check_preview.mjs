/* Prove the preview actually paints. A preview that renders an empty
   frame looks like a working page with a dark rectangle in it. */
import fs from 'node:fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
const FILE = process.argv[2];
const html = fs.readFileSync(FILE, 'utf8');
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1400,height:1000} });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await p.route('**/*', r => r.request().url().startsWith('https://pv.test/')
  ? r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html})
  : r.fulfill({status:200,body:''}));
await p.goto('https://pv.test/', { waitUntil:'domcontentloaded' });
await p.waitForTimeout(1400);
let pass=0, fail=0;
const ok=(n,c,d)=>{ if(c){pass++;console.log('  PASS  '+n);} else {fail++;console.log('  FAIL  '+n+(d?'  -> '+d:''));} };
ok('no page errors', errs.length===0, errs.join(' | '));
const frames = p.frames().filter(f => f !== p.mainFrame());
ok('all 8 device frames present', frames.length === 8, 'n=' + frames.length);
let empty = [], texts = [];
for (const f of frames) {
  const n = await f.evaluate(() => (document.body.innerText||'').trim().length).catch(()=>0);
  texts.push(n);
  if (n < 40) empty.push(n);
}
ok('every frame paints real text', empty.length === 0, 'chars per frame: ' + texts.join(', '));
/* the things that are actually new must be visible somewhere */
const all = (await Promise.all(frames.map(f =>
  f.evaluate(() => document.body.innerText || '').catch(()=>'')))).join('\n');
for (const [label, needle] of [
  ['Pop-Up Roof tile', 'Pop-Up Roof'],
  ['Why Cardinal tile', 'Why Cardinal'],
  ['Presentations tile', 'Presentations'],
  ['Colors tile', 'Colors'],
  ['Designer tile', 'Designer'],
  ['Studio tile (admin frame)', 'Studio'],
  ['warranty ladder', 'Preferred Protection'],
  ['ORC cancellation right', '1345.23'],
  ['magnetic sweep', 'magnetic sweep'],
]) ok('preview shows: ' + label, all.includes(needle));
ok('Platinum is NOT shown', !/platinum/i.test(all));
console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
await b.close();
process.exit(fail?1:0);
