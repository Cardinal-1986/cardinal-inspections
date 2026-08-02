/* Build 583 gate — the pills are gone, the way out is not.
   Runs the SHIPPED RL view + IIFE + every stylesheet, and creates the four
   lazily-built pills the way their own modules do, so the CSS is tested
   against elements that really exist. */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const src = fs.readFileSync('/home/user/cardinal-inspections/index.html', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };
const rl = (() => {
  const k = src.indexOf('function showPage('); const start = src.lastIndexOf('(function(', k);
  let d = 0, i = src.indexOf('{', src.indexOf(')', start));
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && --d === 0) break; }
  return src.slice(start, src.indexOf(';', i) + 1);
})();
const styles = [];
for (let i = 0; ;) { const a = src.indexOf('<style', i); if (a < 0) break;
  const o = src.indexOf('>', a), b = src.indexOf('</style>', o); if (b < 0) break;
  styles.push(src.slice(o + 1, b)); i = b + 8; }
const vs = src.indexOf('<div id="resourceLibraryView"');
const view = (() => { let d = 0; const tag = /<\/?div\b/g; tag.lastIndex = vs;
  for (let m; (m = tag.exec(src)); ) { d += m[0][1] === '/' ? -1 : 1;
    if (d === 0) return src.slice(vs, m.index + src.slice(m.index).indexOf('>') + 1); } })();

const PILLS = ['cr-rltoc-btn','cr-nachi-mgr-btn','cr-rlhome-btn','cr-rltheme-btn','rlAskBtn'];

(async () => {
  const b = await chromium.launch();
  for (const [w, h, tag] of [[390, 844, 'phone'], [1280, 900, 'desktop']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.route('**/ai-field-manual.html', r => r.fulfill({ status: 200, contentType: 'text/html',
      body: '<!doctype html><title>book</title><body style="margin:0;background:#111;color:#eee">'
          + '<p style="padding:20px">BOOK TEXT</p>' }));
    await p.setContent(`<html><head>${styles.map(s => `<style>${s}</style>`).join('')}</head>` +
      `<body class="viewing-rl cr-is-admin" data-crm="retail" style="margin:0">${view}</body></html>`,
      { waitUntil: 'load' });
    await p.evaluate(() => { document.getElementById('resourceLibraryView').style.display = 'block'; });
    /* the four lazy pills, built the way their modules build them */
    await p.evaluate(ids => ids.forEach(id => {
      if (document.getElementById(id)) return;
      const el = document.createElement('button'); el.id = id; el.textContent = id;
      document.body.appendChild(el);
    }), PILLS);
    await p.evaluate(rl);

    /* --- on the LANDING the pills must still be there --- */
    const onLanding = await p.evaluate(ids => ids.filter(id =>
      getComputedStyle(document.getElementById(id)).display !== 'none'), PILLS);
    ok(`${tag}: pills still work outside the book`, onLanding.length >= 3, onLanding.join(',') || 'none visible');

    await p.click('[data-rlgoto="ai_book"]');
    await p.waitForTimeout(180);

    /* Measure at scroll-top. The header is position:sticky (as it is on every
       other Library page), so once the pane is scrolled it pins over the frame
       BY DESIGN — asserting otherwise fails a correct layout. What matters is
       that it takes its own space in normal flow rather than floating over the
       text the way the pills did. */
    await p.evaluate(() => { document.getElementById('resourceLibraryView').scrollTop = 0; window.scrollTo(0, 0); });
    await p.waitForTimeout(60);
    const r = await p.evaluate(ids => {
      const shown = ids.filter(id => getComputedStyle(document.getElementById(id)).display !== 'none');
      const hdr = document.querySelector('#resourceLibraryView .ins-header');
      const back = document.getElementById('rlBackBtn');
      const fr = document.getElementById('rlBookFrame');
      const bb = back.getBoundingClientRect(), fb = fr.getBoundingClientRect();
      return {
        shown,
        atBook: document.body.classList.contains('rl-at-book'),
        hdrDisplay: getComputedStyle(hdr).display,
        hdrSticky: getComputedStyle(hdr).position === 'sticky',
        hdrH: Math.round(hdr.getBoundingClientRect().height),
        backW: Math.round(bb.width), backH: Math.round(bb.height),
        title: (document.querySelector('.ins-title') || {}).textContent,
        /* the back control must be ABOVE the frame, not on top of it */
        backClearsFrame: bb.bottom <= fb.top + 1,
        geo: `back.bottom=${Math.round(bb.bottom)} frame.top=${Math.round(fb.top)}`,
        overscroll: Math.round(document.documentElement.scrollHeight - document.documentElement.clientHeight),
        frameH: Math.round(fb.height),
      };
    }, PILLS);

    ok(`${tag}: body carries rl-at-book`, r.atBook);
    ok(`${tag}: all five pills hidden on the book`, r.shown.length === 0, r.shown.join(','));
    ok(`${tag}: the Library header is back`, r.hdrDisplay === 'flex', r.hdrDisplay);
    ok(`${tag}: with a real back button`, r.backW > 10 && r.backH > 10, `${r.backW}x${r.backH}`);
    ok(`${tag}: titled for the book`, r.title === 'The AI Field Manual', r.title);
    ok(`${tag}: at rest the header sits ABOVE the frame, not over it`, r.backClearsFrame, r.geo);
    ok(`${tag}: and it is sticky, like every other Library page`, r.hdrSticky, r.hdrSticky);
    /* the frame keeps its 100dvh. An earlier attempt made it flex-sized, which
       collapsed it to 150px because showLibrary() sets #resourceLibraryView's
       display INLINE and that beats any stylesheet rule. Overscroll is
       pre-existing and out of scope here. */
    ok(`${tag}: the frame still fills the pane`, r.frameH > h * 0.9, r.frameH + 'px of ' + h);

    /* the back button actually leaves the book */
    await p.click('#rlBackBtn');
    await p.waitForTimeout(160);
    const after = await p.evaluate(() => ({
      landing: !!document.querySelector('#rlLanding.rl-pageActive'),
      atBook: document.body.classList.contains('rl-at-book'),
      /* #cr-rlhome-btn is deliberately hidden ON the landing — there is
         nowhere for it to go — so it is not part of this check. */
      pillsBack: ['cr-rltoc-btn','cr-nachi-mgr-btn','cr-rltheme-btn','rlAskBtn']
        .filter(id => getComputedStyle(document.getElementById(id)).display !== 'none'),
    }));
    ok(`${tag}: back returns to the landing`, after.landing);
    ok(`${tag}: rl-at-book is cleared`, !after.atBook);
    ok(`${tag}: and the pills come back`, after.pillsBack.length >= 3, after.pillsBack.join(',') || 'none');
    await p.close();
  }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
