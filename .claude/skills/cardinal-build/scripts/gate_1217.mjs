/* gate_1217.mjs — the estimate builder: dark chrome, paper document.
 *
 *   node gate_1217.mjs [path/to/index.html]   the build must be GREEN
 *   node gate_1217.mjs <the 1216 artifact>    the control: RED
 *
 * Theo's pick (b): the frame joins the app, the estimate stays the colour it
 * prints on.
 *
 * ⚠ SECTION B IS THE CLAIM AND IT IS A SWEEP, NOT A SPOT CHECK. Flipping the
 * ground broke thirteen text nodes from three inks; asserting on those three by
 * name would pass the day a fourteenth appears. B measures EVERY text node in
 * the view against its composited ground and requires zero below floor.
 *
 * ⚠ SECTION E EXISTS BECAUSE TWO OF MY EDITS WERE A SILENT NO-OP. After
 * repointing the two outline buttons the sweep still measured rgb(200,32,46)
 * and rgb(47,125,74) — values neither edited rule contains. A later block
 * out-specifies both, so the edits parsed, balanced and never applied: build
 * 481's class. E asserts the COMPUTED colour, which is the only thing a
 * losing rule cannot fake.
 *
 * ⚠ And section C is the other half of (b): it would be easy to "fix" this
 * screen by taking the whole thing dark, which is option (a) and NOT what was
 * picked. C asserts the document blocks are still paper.
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(here, '../../../..');
const FILE = resolve(process.argv[2] || resolve(ROOT, 'index.html'));
const APP = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(resolve(here, 'sentinel_setup_cardinal.js'), 'utf8');
const MOCK = readFileSync(resolve(here, 'e2e_mock_supa.js'), 'utf8');
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));

let fails = 0, checks = 0;
const ok = (c, m, x) => { checks++;
  console.log((c ? '  ok   ' : '  FAIL ') + m + (x !== undefined ? '  — ' + x : ''));
  if (!c) fails++; return c; };
setTimeout(() => { console.log('\nGATE 1217 TIMEOUT'); process.exit(3); }, 420000).unref();

const READ = function () {
  const px = c => { const m = String(c).match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1] : null; };
  const over = (f, b) => { const a = f[3]; return [0,1,2].map(i => f[i]*a + b[i]*(1-a)).concat([1]); };
  const lum = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return .2126*f(c[0]) + .7152*f(c[1]) + .0722*f(c[2]); };
  const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((p,q)=>q-p); return (x+.05)/(y+.05); };
  /* ⚠ AN ANCESTOR WALK THAT READS ONLY backgroundColor CANNOT SEE A GRADIENT,
     and this view's top bar paints one. The first version of this gate walked
     straight through that bar to the page behind it and scored its cream
     heading at 1.04:1 — seven failures that were all one blind spot. Every
     ground an ancestor actually paints is collected, gradient stops included,
     and the ink is scored against the WORST of them. */
  const stops = bi => { const out = [];
    if (!bi || bi === 'none') return out;
    const re = /rgba?\([^)]*\)/g; let m;
    while ((m = re.exec(bi))) { const c = px(m[0]); if (c && c[3] > 0.05) out.push(c); }
    return out; };
  const ground = el => { let acc = [255,255,255,1], st = [];
    for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n);
      const c = px(cs.backgroundColor); const g = stops(cs.backgroundImage);
      if (g.length) st.push(g);
      if (c && c[3] > 0) st.push([c]);
      if ((c && c[3] >= 0.999) || g.some(x => x[3] >= 0.999)) break; }
    /* every combination is overkill; the worst single stack is what matters, so
       resolve with the darkest and the lightest stop at each layer and keep both */
    const build = pick => { let a = [255,255,255,1];
      for (let i = st.length-1; i >= 0; i--) a = over(pick(st[i]), a); return a; };
    const byLum = (arr, want) => arr.slice().sort((p,q)=>lum(p)-lum(q))[want === 'min' ? 0 : arr.length-1];
    return [build(l => byLum(l,'min')), build(l => byLum(l,'max'))]; };
  const name = el => { let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + el.className.trim().split(/\s+/).slice(0,2).join('.');
    return s; };
  const bgOf = sel => { const e = document.querySelector(sel);
    return e ? getComputedStyle(e).backgroundColor : null; };
  const colOf = sel => { const e = document.querySelector(sel);
    return e ? getComputedStyle(e).color : null; };

  const view = document.getElementById('cr-est-view');
  if (!view || getComputedStyle(view).display === 'none') return { missing: true };
  const bad = [];
  let measured = 0;
  view.querySelectorAll('*').forEach(el => {
    const t = (el.textContent || '').trim(); if (!t || el.children.length) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const fg = px(cs.color); if (!fg) return;
    const gs = ground(el);
    const size = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight,10) || 400;
    const floor = (size >= 24 || (size >= 18.66 && w >= 700)) ? 3 : 4.5;
    /* scored against the WORST ground the element actually sits on */
    const rr = Math.round(Math.min(...gs.map(bg => ratio(over(fg,bg), bg))) * 100) / 100;
    measured++;
    if (rr < floor) bad.push(name(el) + ' "' + t.slice(0,18) + '" ' + cs.color + ' ' + rr + ':1 < ' + floor);
  });
  const vs = getComputedStyle(view);
  return {
    viewBg: vs.backgroundColor, viewLum: Math.round(lum(px(vs.backgroundColor))*1000)/1000,
    bodyBg: bgOf('#cr-est-view .cr-est-body'),
    navBg:  bgOf('#cr-est-view .cr-est-nav'),
    paper: { client: bgOf('.cr-est-clientcard'), totals: bgOf('.cr-est-totals'),
             empty: bgOf('.cr-est-empty-items') },
    btnCustom: colOf('.cr-est-items-head .add-custom'),
    btnAbc:    colOf('.cr-est-items-head .add-abc'),
    label:     colOf('#cr-est-view .cr-est-body label'),
    tok: ['--estc-viewbg','--estc-bg','--estc-ink','--estc-dim','--estc-red','--estc-green',
          '--estc-panel','--estc-well','--estc-line']
         .reduce((o,k) => (o[k] = vs.getPropertyValue(k).trim(), o), {}),
    measured, bad
  };
};

console.log('gate_1217 on ' + FILE + '\n');
let browser = null;
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);
  const read = {};
  for (const theme of ['dark', 'rb-light']) {
    const ctx = await browser.newContext({ viewport:{ width:1440, height:980 }, serviceWorkers:'block' });
    const page = await ctx.newPage();
    await page.route('**/*', async (route) => {
      const u = route.request().url(), rt = route.request().resourceType();
      if (u === 'https://app.cardinalroster.com/')
        return route.fulfill({ status:200, contentType:'text/html; charset=utf-8', body: APP });
      if (u.includes('@supabase/supabase-js'))
        return route.fulfill({ status:200, contentType:'application/javascript', body: MOCK });
      if (u.includes('chart') || u.includes('papaparse'))
        return route.fulfill({ status:200, contentType:'application/javascript',
          body:'window.Chart=function(){this.destroy=function(){}};window.Chart.defaults={};window.Papa={};' });
      if (u.startsWith('https://app.cardinalroster.com/') && rt === 'image')
        return route.fulfill({ status:200, body:'' });
      if (u.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status:200, body:'' });
      return route.abort();
    });
    page.on('dialog', d => d.accept());
    await page.addInitScript(MOCK);
    await page.addInitScript(SETUP);
    await page.goto('https://app.cardinalroster.com/', { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(3000);
    try { await page.evaluate(async () => {
      const st = (window.__sentinelStates || []).find(s => s.name === 'estbuilder');
      if (st) await st.run();
    }); } catch (_) {}
    await page.waitForTimeout(900);
    /* theme written and measured in ONE turn — the app restores it otherwise */
    read[theme] = await page.evaluate(([t, fn]) => {
      if (t === 'rb-light') document.documentElement.setAttribute('data-theme','rb-light');
      else document.documentElement.removeAttribute('data-theme');
      return (new Function('return (' + fn + ')'))().call(null);
    }, [theme, READ.toString()]);
    await ctx.close();
  }

  const d = read.dark, l = read['rb-light'];
  console.log('A  the builder opened and the frame went dark');
  ok(!d.missing, 'the view is open', d.missing ? 'NOT OPEN' : d.measured + ' text nodes measured');
  ok(!d.missing && d.viewLum < 0.05, '  · the page behind the estimate is dark',
     d.viewBg + ' luminance ' + d.viewLum);
  ok(!d.missing && d.navBg === 'rgb(20, 22, 25)', '  · and the jump list came with it', String(d.navBg));

  console.log('\nB  EVERY TEXT NODE IN THE VIEW CLEARS ITS FLOOR — the whole claim');
  ok((d.bad || []).length === 0, 'nothing below floor after the ground moved',
     (d.bad || []).length ? d.bad.join(' | ') : d.measured + ' node(s) measured, 0 failing');

  console.log('\nC  THE ESTIMATE IS STILL PAPER — this is (b), not (a)');
  /* ⚠ ASSERTED AS "LIGHT", NOT AS ONE HEX. The first version demanded the
     #f4f2f1 that `cr-est-styles` sets — and a later block out-specifies it with
     plain white, so a correct build failed three checks for painting paper a
     slightly different paper. The claim is that these blocks did NOT go dark. */
  const lumOf = s => { const m = String(s).match(/[\d.]+/g); if (!m) return -1;
    const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*f(+m[0]) + 0.7152*f(+m[1]) + 0.0722*f(+m[2]); };
  for (const [k, v] of Object.entries(d.paper || {}))
    ok(lumOf(v) > 0.75, 'the ' + k + ' block is still paper, not dark',
       String(v) + ' luminance ' + Math.round(lumOf(v)*1000)/1000);

  console.log('\nD  THE TWO SILENT NO-OPS — asserted by COMPUTED colour, not by rule text');
  ok(d.btnCustom === 'rgb(240, 138, 144)', 'the + Custom ink actually computes to the chrome red',
     String(d.btnCustom));
  ok(d.btnAbc === 'rgb(52, 211, 153)', 'the + ABC Supply ink actually computes to the chrome green',
     String(d.btnAbc));
  ok(d.label === 'rgb(168, 176, 186)', 'the field labels actually compute to the chrome dim',
     String(d.label));

  console.log('\nE  LIGHT IS BYTE-IDENTICAL');
  const want = { '--estc-viewbg':'#fdfcf7', '--estc-bg':'#F4F4F5', '--estc-ink':'#2c2c2c',
                 '--estc-dim':'#475569', '--estc-red':'#8f1620', '--estc-green':'#2a6b3c',
                 '--estc-panel':'#FFFFFF', '--estc-well':'#F1F5F9', '--estc-line':'#E2E8F0' };
  for (const [k, v] of Object.entries(want))
    ok(((l.tok || {})[k] || '') === v, 'light ' + k + ' is still ' + v, String((l.tok||{})[k]));
  ok(l.navBg === 'rgb(255, 255, 255)', 'light: the jump list is porcelain again', String(l.navBg));
} catch (e) {
  console.log('GATE ERROR: ' + String((e && e.message) || e).slice(0, 300));
  fails++;
} finally { if (browser) { try { await browser.close(); } catch (_) {} } }

console.log('');
ok(checks >= 19, 'coverage floor: ' + checks + ' checks ran (>= 19)');
console.log('\n' + (fails === 0 ? `GATE 1217 GREEN — ${checks} checks passed`
                                : `GATE 1217 RED — ${fails} of ${checks} failed`));
process.exit(fails === 0 ? 0 : 1);
