#!/usr/bin/env node
/* render_tapbox.js — the tap overlay must be the same box as the photograph.
 *
 *   NODE_PATH=$(npm root -g) node render_tapbox.js [path-to-visualizer-html]
 *
 * WHY THIS EXISTS
 *
 * 827 shipped "Tap surfaces". It worked in the sense that every guard passed,
 * the crosshair appeared and the handler was bound — and tapping the
 * photograph still did nothing, because `#vzRegDots` (the click target, and
 * the box tap coordinates are normalised against) was 1194x636 while
 * `#vzRegImg` was 1194x672.
 *
 * `.wrap` is a flex item. Without being told otherwise it STRETCHES to the
 * flex line rather than hugging the image inside it, so the overlays — both
 * `inset:0` of `.wrap` — cover a different rectangle from the picture. Two
 * failures fall out of that, and the second is the silent one:
 *
 *   1. Any tap outside the overlay lands on the <img> and is simply lost.
 *   2. Any tap INSIDE it is normalised against the wrong height, so the mask
 *      comes back from a spot the rep did not touch — which looks like SAM 2
 *      being wrong rather than the page being wrong.
 *
 * The circles drawn by drawRegions() are positioned in the same box, so they
 * were mispositioned by the same amount. That is why this is a gate and not a
 * comment: it is invisible in the markup, invisible in jsdom, and it needs a
 * real engine at more than one viewport to see.
 *
 * Checks, at five viewports including Theo's 1194px iPad and an ultrawide:
 *   - the overlay and the photograph are the same size, to within a pixel
 *   - they share an origin
 *   - the element on top at the centre of the photograph is the overlay
 *   - the element on top NEAR THE BOTTOM EDGE is still the overlay
 *
 * Point it at a previous build to see it go red.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || path.join(__dirname, '../../../../visualizer/index.html');
const VIEWPORTS = [
  { name: 'iPad 1194 (Theo)', width: 1194, height: 834 },
  { name: 'iPad portrait', width: 834, height: 1194 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'laptop', width: 1440, height: 900 },
  { name: 'ultrawide', width: 2560, height: 1080 }
];

const SUPA_STUB = `window.supabase={createClient:function(){
  var q={select:function(){return q;},insert:function(){return q;},eq:function(){return q;},
         order:function(){return q;},limit:function(){return q;},
         single:function(){return Promise.resolve({data:null,error:null});},
         maybeSingle:function(){return Promise.resolve({data:null,error:null});},
         then:function(f){return Promise.resolve({data:[],error:null}).then(f);}};
  return {from:function(){return q;},
          auth:{getSession:function(){return Promise.resolve({data:{session:null}});},
                onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}};}},
          storage:{from:function(){return {createSignedUrl:function(){
            return Promise.resolve({data:{signedUrl:''},error:null});}};}}};}};`;

/* The page is one strict-mode IIFE, so nothing it defines is reachable from
   outside. Rather than re-implement any of it, splice a read-only hook in
   just before the IIFE closes and drive the SHIPPED functions. */
function hooked(src) {
  const anchor = 'window.CardinalVisualizer = { comboKey: comboKey, roofPrompt: roofPrompt };';
  if (src.indexOf(anchor) === -1) throw new Error('hook anchor not found — did the IIFE tail change?');
  return src.replace(anchor, anchor + `
window.__hook = { get regionJob(){return regionJob;}, set chosenShot(v){chosenShot=v;},
                  tapSurfaces: tapSurfaces };`);
}

(async () => {
  const raw = fs.readFileSync(SRC, 'utf8');
  const tmp = path.join(path.dirname(SRC), '__tapbox_probe.html');
  fs.writeFileSync(tmp, hooked(raw));

  const isControl = process.argv[2] && !process.argv[2].endsWith('visualizer/index.html');
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); }

  const fails = [];
  let ran = 0;
  const ok = (name, cond, detail) => { ran++; if (!cond) fails.push(name + (detail ? '  — ' + detail : '')); };

  try {
    for (const vp of VIEWPORTS) {
      const pg = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await pg.route('**/supabase-js*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
      await pg.goto('file://' + tmp);
      await pg.waitForTimeout(250);

      await pg.evaluate(() => {
        window.__hook.chosenShot = { storage_path: 'probe.jpg' };
        const sel = document.getElementById('vzProject');
        const o = document.createElement('option'); o.value = 'p1';
        sel.appendChild(o); sel.value = 'p1';
        const im = document.getElementById('vzRegImg');
        // 3:2, a common camera aspect, so a stretch mismatch is visible.
        im.src = 'data:image/svg+xml;base64,' + btoa(
          '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">' +
          '<rect width="1200" height="800" fill="#456"/></svg>');
      });
      await pg.waitForTimeout(250);
      await pg.evaluate(() => document.getElementById('vzTap').click());
      await pg.waitForTimeout(250);

      const m = await pg.evaluate(() => {
        const d = document.getElementById('vzRegDots').getBoundingClientRect();
        const i = document.getElementById('vzRegImg').getBoundingClientRect();
        const at = (x, y) => { const e = document.elementFromPoint(x, y); return e ? e.id || e.tagName : null; };
        return {
          d: { w: d.width, h: d.height, x: d.x, y: d.y },
          i: { w: i.width, h: i.height, x: i.x, y: i.y },
          centre: at(i.x + i.width / 2, i.y + i.height / 2),
          nearBottom: at(i.x + i.width / 2, i.y + i.height - 4),
          nearTop: at(i.x + i.width / 2, i.y + 4)
        };
      });
      const tag = vp.name;
      ok(tag + ': overlay width matches the photograph', Math.abs(m.d.w - m.i.w) <= 1,
        `overlay ${Math.round(m.d.w)} vs photo ${Math.round(m.i.w)}`);
      ok(tag + ': overlay height matches the photograph', Math.abs(m.d.h - m.i.h) <= 1,
        `overlay ${Math.round(m.d.h)} vs photo ${Math.round(m.i.h)}`);
      ok(tag + ': overlay shares the photograph origin',
        Math.abs(m.d.x - m.i.x) <= 1 && Math.abs(m.d.y - m.i.y) <= 1,
        `overlay ${Math.round(m.d.x)},${Math.round(m.d.y)} vs photo ${Math.round(m.i.x)},${Math.round(m.i.y)}`);
      ok(tag + ': the overlay is on top at the centre', m.centre === 'vzRegDots', 'got ' + m.centre);
      ok(tag + ': the overlay is on top near the bottom edge', m.nearBottom === 'vzRegDots',
        'got ' + m.nearBottom + ' — taps there are lost');
      ok(tag + ': the overlay is on top near the top edge', m.nearTop === 'vzRegDots', 'got ' + m.nearTop);

      await pg.close();
    }
  } finally {
    await browser.close();
    fs.unlinkSync(tmp);
  }

  console.log('\nrender_tapbox — ' + path.basename(SRC) + (isControl ? '   [negative control]' : ''));
  console.log('  ' + (ran - fails.length) + '/' + ran + ' pass');
  if (fails.length) {
    console.log('\n  FAILED:');
    fails.forEach(f => console.log('    - ' + f));
    console.log(isControl ? '\n  RED, as a control should be.' : '');
  }
  process.exit(fails.length && !isControl ? 1 : 0);
})();
