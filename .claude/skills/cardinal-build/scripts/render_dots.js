#!/usr/bin/env node
/* render_dots.js — a region's circle must sit on that region.
 *
 *   NODE_PATH=$(npm root -g) node render_dots.js [path-to-visualizer-html]
 *
 * WHY THIS EXISTS
 *
 * Theo, 15 Aug: "there is no circles just highlights". Both are built in the
 * same loop of drawRegions(), so the difference was never whether the data
 * arrived — it was how each is POSITIONED:
 *
 *   - the highlight is a full-frame mask PNG. It aligns itself. Always right.
 *   - the circle is arithmetic on the region's `box`, and needs to know what
 *     frame those numbers are in.
 *
 * The worker fits every photograph into FLUX's band (~1280px) BEFORE masking,
 * so its boxes are in that frame. The browser was dividing by the DISPLAYED
 * photograph's natural width — the untouched original. On a 4032px phone shot
 * that is a 3.15x error: circles that belonged at 53%/28% rendered at 17%/9%,
 * three of them stacked in a 25px cluster in the top-left corner over the
 * trees. On a SMALL source the same arithmetic throws them off-screen the
 * other way. `regionJob._w` was read for this and written by nothing, ever.
 *
 * So this gate does not check that a circle EXISTS — that always passed. It
 * checks that each circle lands inside the region it represents, which is the
 * only property a rep can actually see.
 *
 * Run at several source sizes, because the bug is a RATIO: a source that
 * happens to match the segmentation frame passes even when the code is wrong.
 * That is why 1280x960 is in the list — it is the negative control's control.
 *
 * Point it at a previous build to see it go red.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || path.join(__dirname, '../../../../visualizer/index.html');
const isControl = !!process.argv[2];

/* The worker's segmentation frame, and the masks Theo's taps really produced. */
const FRAME = { w: 1280, h: 960 };
const REGIONS = {
  r01: { path: 'm1.png', pct: 12.31, box: [369, 116, 980, 427] },
  r02: { path: 'm2.png', pct: 0.75, box: [694, 129, 877, 245] },
  r03: { path: 'm3.png', pct: 0.24, box: [691, 175, 724, 248] },
  _frame: FRAME
};

/* Source sizes the browser might be showing. The ratio is what matters. */
const SOURCES = [
  { name: 'phone original 4032x3024', w: 4032, h: 3024 },
  { name: 'segmentation-sized 1280x960', w: 1280, h: 960 },
  { name: 'small source 400x300', w: 400, h: 300 }
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

function hooked(src) {
  const anchor = 'window.CardinalVisualizer = { comboKey: comboKey, roofPrompt: roofPrompt };';
  if (src.indexOf(anchor) === -1) throw new Error('hook anchor not found');
  return src.replace(anchor, anchor + `
window.__dots = { set chosenShot(v){chosenShot=v;}, get regionJob(){return regionJob;},
  set regionPick(v){regionPick=v;}, set labelledMasks(v){labelledMasks=v;},
  drawRegions: drawRegions, tapSurfaces: tapSurfaces };`);
}

(async () => {
  const tmp = path.join(path.dirname(SRC), '__dots_probe.html');
  fs.writeFileSync(tmp, hooked(fs.readFileSync(SRC, 'utf8')));

  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); }

  const fails = [];
  let ran = 0;
  const ok = (n, c, d) => { ran++; if (!c) fails.push(n + (d ? '  — ' + d : '')); };

  try {
    for (const s of SOURCES) {
      const pg = await browser.newPage({ viewport: { width: 1194, height: 834 } });
      await pg.route('**/supabase-js*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
      await pg.goto('file://' + tmp);
      await pg.waitForTimeout(250);

      const m = await pg.evaluate(async (arg) => {
        const H = window.__dots;
        H.chosenShot = { storage_path: 'p.jpg' };
        const sel = document.getElementById('vzProject');
        const o = document.createElement('option'); o.value = 'p1';
        sel.appendChild(o); sel.value = 'p1';
        const im = document.getElementById('vzRegImg');
        await new Promise(res => {
          im.onload = res;
          im.src = 'data:image/svg+xml;base64,' + btoa(
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + arg.s.w + '" height="' + arg.s.h +
            '"><rect width="' + arg.s.w + '" height="' + arg.s.h + '" fill="#456"/></svg>');
        });
        H.tapSurfaces();
        H.regionJob.masks = arg.regions;
        H.regionPick = { 'p.jpg': { roof: ['r01'], siding: ['r02'], windows: ['r03'] } };
        H.labelledMasks = { 'p.jpg': { r01: 'm1.png', r02: 'm2.png', r03: 'm3.png' } };
        H.drawRegions();

        const dots = document.getElementById('vzRegDots');
        const dr = dots.getBoundingClientRect();
        return {
          tints: document.getElementById('vzRegTint').children.length,
          dots: { w: dr.width, h: dr.height },
          buttons: [].slice.call(dots.children).map(el => ({
            id: el.dataset.region,
            leftPct: parseFloat(el.style.left),
            topPct: parseFloat(el.style.top)
          }))
        };
      }, { s, regions: REGIONS });

      const tag = s.name;
      ok(tag + ': a circle exists for every region', m.buttons.length === 3,
        'got ' + m.buttons.length);
      ok(tag + ': the highlights still render', m.tints === 3, 'got ' + m.tints);

      for (const b of m.buttons) {
        const box = REGIONS[b.id].box;
        // Where the circle SHOULD be, as a percentage of the painted image:
        // the box centre expressed in the worker's own frame.
        const wantL = 100 * ((box[0] + box[2]) / 2) / FRAME.w;
        const wantT = 100 * ((box[1] + box[3]) / 2) / FRAME.h;
        ok(tag + ' ' + b.id + ': circle sits at its region centre',
          Math.abs(b.leftPct - wantL) < 1.5 && Math.abs(b.topPct - wantT) < 1.5,
          'at ' + b.leftPct.toFixed(1) + '%,' + b.topPct.toFixed(1) +
          '% — should be ' + wantL.toFixed(1) + '%,' + wantT.toFixed(1) + '%');
        // And inside its own bounding box, which is what "on the thing I
        // tapped" actually means to a rep.
        ok(tag + ' ' + b.id + ': circle is inside its own box',
          b.leftPct >= 100 * box[0] / FRAME.w && b.leftPct <= 100 * box[2] / FRAME.w &&
          b.topPct >= 100 * box[1] / FRAME.h && b.topPct <= 100 * box[3] / FRAME.h,
          'circle ' + b.leftPct.toFixed(1) + '%,' + b.topPct.toFixed(1) + '%');
      }
      await pg.close();
    }
  } finally {
    await browser.close();
    fs.unlinkSync(tmp);
  }

  console.log('\nrender_dots — ' + path.basename(SRC) + (isControl ? '   [negative control]' : ''));
  console.log('  ' + (ran - fails.length) + '/' + ran + ' pass');
  if (fails.length) {
    console.log('\n  FAILED:');
    fails.forEach(f => console.log('    - ' + f));
    if (isControl) console.log('\n  RED, as a control should be.');
  }
  process.exit(fails.length && !isControl ? 1 : 0);
})();
