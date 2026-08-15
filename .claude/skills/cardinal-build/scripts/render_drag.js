#!/usr/bin/env node
/* render_drag.js — a drag is a box, a press is a tap, and never both.
 *
 *   NODE_PATH=$(npm root -g) node render_drag.js [path-to-visualizer-html]
 *
 * WHY THIS EXISTS
 *
 * Theo, 15 Aug: "if i tap the bottom right siding it masks the whole house,
 * otherwise i have to tap all the other pieces of siding individually."
 *
 * 832 answers that by letting a rep DRAG a box, which states the extent a
 * single point cannot. The gesture is deliberately additive — press and
 * release is still a tap, and still runs the path that was already proven.
 *
 * That overlap is the whole risk, and it is not visible in the code: a drag
 * ends with a `click` event too, so without a guard one drag queues a box AND
 * a tap. Two jobs, two masks, one of them the whole-house answer the box
 * existed to avoid. jsdom cannot see it — it needs a real pointer sequence
 * through a real browser.
 *
 * Asserts, at iPad and desktop widths:
 *   - a drag queues exactly ONE job, and it is a _box
 *   - the box is normalised 0..1 and ordered (x0<x1, y0<y1) whichever way the
 *     drag was made, including right-to-left and bottom-to-top
 *   - a plain press queues exactly ONE job, and it is a _points
 *   - the rubber band is visible mid-drag and gone afterwards
 *   - a drag shorter than DRAG_MIN is treated as a tap, not a box
 *
 * Point it at a previous build to see it go red.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || path.join(__dirname, '../../../../visualizer/index.html');
const isControl = !!process.argv[2];
const VIEWPORTS = [
  { name: 'iPad 1194', width: 1194, height: 834 },
  { name: 'desktop 1680', width: 1680, height: 1050 }
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
window.__drag = { set chosenShot(v){chosenShot=v;}, tapSurfaces: tapSurfaces, sb: sb };`);
}

(async () => {
  const tmp = path.join(path.dirname(SRC), '__drag_probe.html');
  fs.writeFileSync(tmp, hooked(fs.readFileSync(SRC, 'utf8')));

  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); }

  const fails = [];
  let ran = 0;
  const ok = (n, c, d) => { ran++; if (!c) fails.push(n + (d ? '  — ' + d : '')); };

  async function fresh(pg) {
    await pg.evaluate(() => {
      window.__jobs = [];
      window.__drag.sb.from = function (t) {
        return { insert: function (row) {
          window.__jobs.push(row.selections);
          // Resolve with an ERROR on purpose. A never-resolving promise leaves
          // tapBusy latched true, and every gesture after the first is then
          // refused by the guard at the top of dragStart/tapAt -- which made
          // this harness report the PRODUCT as broken when it was the fake.
          // An error is the one reply that releases tapBusy without starting
          // the poll loop.
          return { select: function () { return { maybeSingle: function () {
            return Promise.resolve({ data: null, error: { message: 'probe' } });
          } }; } };
        } };
      };
      window.__drag.chosenShot = { storage_path: 'p.jpg' };
      const sel = document.getElementById('vzProject');
      if (!sel.value) { const o = document.createElement('option'); o.value = 'p1'; sel.appendChild(o); sel.value = 'p1'; }
    });
    await pg.evaluate(() => document.getElementById('vzTap').click());
    await pg.waitForTimeout(150);
  }

  try {
    for (const vp of VIEWPORTS) {
      const pg = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await pg.route('**/supabase-js*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
      await pg.goto('file://' + tmp);
      await pg.waitForTimeout(250);
      await pg.evaluate(async () => {
        const im = document.getElementById('vzRegImg');
        await new Promise(res => { im.onload = res;
          im.src = 'data:image/svg+xml;base64,' + btoa(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">' +
            '<rect width="1600" height="1200" fill="#456"/></svg>'); });
      });
      await fresh(pg);
      const box = await pg.locator('#vzRegDots').boundingBox();
      const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

      // ── a left-to-right drag ────────────────────────────────────────────
      let a = at(0.30, 0.30), b = at(0.60, 0.55);
      await pg.mouse.move(a.x, a.y);
      await pg.mouse.down();
      await pg.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 });
      const mid = await pg.evaluate(() => {
        const el = document.getElementById('vzRegBand');
        return el ? getComputedStyle(el).display : 'missing';
      });
      await pg.mouse.move(b.x, b.y, { steps: 6 });
      await pg.mouse.up();
      await pg.waitForTimeout(200);

      let jobs = await pg.evaluate(() => window.__jobs);
      const tag = vp.name;
      ok(tag + ': the band is visible mid-drag', mid === 'block', 'display ' + mid);
      ok(tag + ': a drag queues exactly one job', jobs.length === 1,
        'queued ' + jobs.length + ' — ' + JSON.stringify(jobs));
      ok(tag + ': a drag queues a _box, not a tap',
        jobs.length === 1 && !!jobs[0]._box && !jobs[0]._points, JSON.stringify(jobs[0]));
      if (jobs[0] && jobs[0]._box) {
        const bx = jobs[0]._box;
        ok(tag + ': the box is normalised 0..1', bx.every(v => v >= 0 && v <= 1), JSON.stringify(bx));
        ok(tag + ': the box is ordered', bx[0] < bx[2] && bx[1] < bx[3], JSON.stringify(bx));
        ok(tag + ': the box matches where the drag was',
          Math.abs(bx[0] - 0.30) < 0.03 && Math.abs(bx[1] - 0.30) < 0.03 &&
          Math.abs(bx[2] - 0.60) < 0.03 && Math.abs(bx[3] - 0.55) < 0.03, JSON.stringify(bx));
      }
      const after = await pg.evaluate(() => {
        const el = document.getElementById('vzRegBand');
        return el ? getComputedStyle(el).display : 'missing';
      });
      ok(tag + ': the band is cleared after the drag', after === 'none', 'display ' + after);

      // ── a RIGHT-TO-LEFT, bottom-to-top drag must order the same ─────────
      await fresh(pg);
      a = at(0.70, 0.65); b = at(0.40, 0.35);
      await pg.mouse.move(a.x, a.y); await pg.mouse.down();
      await pg.mouse.move(b.x, b.y, { steps: 8 }); await pg.mouse.up();
      await pg.waitForTimeout(200);
      jobs = await pg.evaluate(() => window.__jobs);
      ok(tag + ': a backwards drag still queues one _box',
        jobs.length === 1 && !!jobs[0]._box, JSON.stringify(jobs));
      if (jobs[0] && jobs[0]._box) {
        const bx = jobs[0]._box;
        ok(tag + ': a backwards drag is ordered too', bx[0] < bx[2] && bx[1] < bx[3], JSON.stringify(bx));
      }

      // ── a plain press is still a tap ────────────────────────────────────
      await fresh(pg);
      const c = at(0.50, 0.45);
      await pg.mouse.click(c.x, c.y);
      await pg.waitForTimeout(200);
      jobs = await pg.evaluate(() => window.__jobs);
      ok(tag + ': a press queues exactly one job', jobs.length === 1,
        'queued ' + jobs.length + ' — ' + JSON.stringify(jobs));
      ok(tag + ': a press queues _points, not a box',
        jobs.length === 1 && !!jobs[0]._points && !jobs[0]._box, JSON.stringify(jobs[0]));

      // ── a tiny wobble is a tap, not a box ───────────────────────────────
      await fresh(pg);
      const d = at(0.45, 0.40);
      await pg.mouse.move(d.x, d.y); await pg.mouse.down();
      await pg.mouse.move(d.x + 3, d.y + 2, { steps: 2 }); await pg.mouse.up();
      await pg.waitForTimeout(200);
      jobs = await pg.evaluate(() => window.__jobs);
      ok(tag + ': a 3px wobble stays a tap',
        jobs.length === 1 && !!jobs[0]._points, JSON.stringify(jobs));

      await pg.close();
    }
  } finally {
    await browser.close();
    fs.unlinkSync(tmp);
  }

  console.log('\nrender_drag — ' + path.basename(SRC) + (isControl ? '   [negative control]' : ''));
  console.log('  ' + (ran - fails.length) + '/' + ran + ' pass');
  if (fails.length) {
    console.log('\n  FAILED:');
    fails.forEach(f => console.log('    - ' + f));
    if (isControl) console.log('\n  RED, as a control should be.');
  }
  process.exit(fails.length && !isControl ? 1 : 0);
})();
