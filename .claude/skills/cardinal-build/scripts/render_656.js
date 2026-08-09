/* Build 656 — Theo's three, verified.

   ⚠️ TWO OF THESE CANNOT BE JSDOM ASSERTIONS, WHICH IS THE POINT.
   "Does the tab row move when you scroll it sideways?" and "how many rows
   does the chip strip take at 375px?" are layout questions. jsdom resolves
   neither — it has no layout engine, and .cr-c-tabs was BOTH position:sticky
   and overflow-x:auto, a combination whose whole symptom is geometric.

   Everything measured here is LIFTED FROM THE ARTIFACT — the CSS rules, the
   label map, the tab list, the strip builder — never retyped, so pointing
   this at the previous build is a real negative control:

       node render_656.js                        # current  -> GREEN
       node render_656.js /path/to/prev_655.html # build 655 -> RED

   Usage: node render_656.js [path-to-index.html]                            */
const fs = require('fs');
const { chromium } = require('playwright-core');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const H = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function rule(re) { const m = H.match(re); return m ? m[0] : ''; }

console.log('artifact : ' + FILE + '\n');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  // ── 1. the claim tab strip must not move vertically when scrolled sideways ──
  console.log('── the claim tab strip: scroll sideways, stay put ──');
  {
    const css = [
      rule(/\.cr-c-tabs \{[^}]*\}/),
      rule(/\.cr-c-tab \{[^}]*\}/),
      rule(/\.cr-c-tab\.active \{[^}]*\}/),
      rule(/#cr-claims-mount \.cr-c-tabwrap \{ position: sticky[^}]*\}/),
      rule(/#cr-claims-mount \.cr-c-tabs\.detail \{ position: static[^}]*\}/),
      rule(/#cr-claims-mount \.cr-c-tabs\.detail \{ position: sticky[^}]*\}/), // 655 shape
    ].filter(Boolean).join('\n');

    // the real tab list, lifted from the artifact
    const tabsSrc = (H.match(/const CR_TABS = \[[\s\S]*?\]\];/) || [''])[0];
    const wrapped = H.includes('<div class="cr-c-tabwrap"><div class="cr-c-tabs detail">');
    ok('the strip is wrapped in a separate sticky element', wrapped);

    const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
    const labels = [...tabsSrc.matchAll(/\['[a-z]+','([A-Za-z]+)'\]/g)].map(m => m[1]);
    ok('tab labels lifted from the artifact', labels.length >= 6, labels.join(','));
    const strip = '<div class="cr-c-tabs detail">' +
      labels.map((l, i) => `<div class="cr-c-tab${i === 1 ? ' active' : ''}">${l}</div>`).join('') + '</div>';
    const inner = wrapped ? '<div class="cr-c-tabwrap">' + strip + '</div>' : strip;

    /* The mount is its OWN scroll container — styleMounts() sets
       position:fixed; inset:0; overflow-y:auto on it inline (index.html
       ~L22833). A first draft of this harness scrolled `window` and read a
       false red: in the real app the page never scrolls, the mount does.
       Reproduce that exactly or the sticky assertion is fiction. */
    await page.setContent(
      '<html><head><style>' +
      ':root{--cr-border:#2a2a32;--cr-muted:#8b8b96;--cr-red:#e5484d;--cr-bg:#16161B;}' +
      'html,body{margin:0;height:100%;background:#16161B;color:#fff;overflow:hidden;}' +
      '#cr-claims-mount{position:fixed;inset:0;overflow-y:auto;z-index:200;}' +
      '.filler{height:2000px;}' + css +
      '</style></head><body><div id="cr-claims-mount">' +
      '<div style="height:220px">header</div>' + inner +
      '<div class="filler">pane</div></div></body></html>');

    const m = await page.evaluate(() => {
      const s = document.querySelector('.cr-c-tabs.detail');
      const before = Math.round(s.getBoundingClientRect().top);
      s.scrollLeft = 200;                       // swipe the strip sideways
      const after = Math.round(s.getBoundingClientRect().top);
      const cs = getComputedStyle(s);
      const wrapEl = document.querySelector('.cr-c-tabwrap');
      return {
        before, after, drift: Math.abs(after - before),
        stripPos: cs.position,
        stripScrolls: s.scrollWidth > s.clientWidth,
        wrapPos: wrapEl ? getComputedStyle(wrapEl).position : '(no wrapper)',
        scrolled: s.scrollLeft,
      };
    });
    ok('the strip still scrolls sideways (the tabs are still reachable)', m.stripScrolls && m.scrolled > 0, JSON.stringify(m));
    ok('scrolling it sideways moves it 0px vertically', m.drift === 0, m.drift + 'px drift');
    ok('the SCROLLING element is no longer the sticky one', m.stripPos === 'static', m.stripPos);
    ok('a wrapper carries the sticky instead', m.wrapPos === 'sticky', m.wrapPos);

    // and it must still actually stick when the MOUNT scrolls (not the window)
    const stick = await page.evaluate(async () => {
      const mount = document.getElementById('cr-claims-mount');
      mount.scrollTop = 400;
      await new Promise(r => requestAnimationFrame(r));
      const w = document.querySelector('.cr-c-tabwrap') || document.querySelector('.cr-c-tabs.detail');
      return { top: Math.round(w.getBoundingClientRect().top), scrolled: mount.scrollTop };
    });
    ok('the mount really scrolled (guards a false green from a short page)', stick.scrolled === 400, JSON.stringify(stick));
    ok('it still sticks to the top of the scrolling mount (top ≈ 0)', Math.abs(stick.top) <= 1, stick.top);
    await page.close();
  }

  // ── 2. the Invoiced chip is short enough to keep the strip at 3 rows ──
  console.log('\n── the insurance stage-filter chips ──');
  {
    const shortMap = H.includes("var INS_STAGE_LABEL_SHORT = { 'Invoiced':'Awaiting Depreciation' };");
    ok('a SHORT twin exists beside the full map', shortMap);
    ok('the chip strip reads through insStageLabel(s, true)',
      H.includes("var lbl = insStageLabel(s, true);"));
    ok('the rail keeps the FULL wording (it has the room and needs the precision)',
      H.includes("'Invoiced':'Awaiting Depreciation / Supplements'"));

    const css = [rule(/\.ins-stgfilter\{[^}]*\}/), rule(/\.ins-hstat\{[^}]*\}/),
                 rule(/\.ins-hstat\.on\{[^}]*\}/), rule(/\.ins-hstat b\{[^}]*\}/)].join('\n');
    // build the chip labels the way the app does: full map, short override
    const full = {}; const fm = H.match(/var INS_STAGE_LABEL = \{[\s\S]*?\};/);
    for (const m of (fm ? fm[0].matchAll(/'([A-Za-z]+)':'([^']+)'/g) : [])) full[m[1]] = m[2];
    const shortOv = {}; const sm = H.match(/var INS_STAGE_LABEL_SHORT = \{[\s\S]*?\};/);
    for (const m of (sm ? sm[0].matchAll(/'([A-Za-z]+)':'([^']+)'/g) : [])) shortOv[m[1]] = m[2];
    const SHOWN = ['Approved', 'Scheduled', 'Completed', 'Invoiced', 'Closed', 'Lost']; // IC_SKIP drops Lead/Prospect/OnHold

    for (const w of [375, 390]) {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      await page.setContent('<html><head><style>body{margin:0;padding:0 14px;background:#0f1720;}' +
        ':root{--ct-line:#2a3542;--ct-red:#c8202e;}' + css + '</style></head><body>' +
        '<div class="ins-stgfilter"><span class="ins-hstat on">All stages</span>' +
        SHOWN.map(s => '<span class="ins-hstat">' + (shortOv[s] || full[s] || s) + ' <b>3</b></span>').join('') +
        '</div></body></html>');
      const m = await page.evaluate(() => {
        const chips = [...document.querySelectorAll('.ins-hstat')];
        const inv = chips.find(c => /Awaiting/.test(c.textContent));
        return {
          rows: new Set(chips.map(c => Math.round(c.getBoundingClientRect().top))).size,
          invW: inv ? Math.round(inv.getBoundingClientRect().width) : 0,
          invText: inv ? inv.textContent.trim() : '',
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      ok(`${w}px: the strip fits in 3 rows (655 took 4)`, m.rows <= 3, m.rows + ' rows');
      ok(`${w}px: the Invoiced chip reads "${m.invText}" and is ${m.invW}px`, m.invText === 'Awaiting Depreciation 3', m.invText);
      ok(`${w}px: nothing overflows sideways`, !m.overflow);
      await page.close();
    }
  }

  await browser.close();
  console.log('\n' + (fail ? 'RED' : 'GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
