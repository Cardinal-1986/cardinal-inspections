/* Build 562 gate — the AI Field Manual as its own Resource Library section.
 *
 * Everything below runs the SHIPPED code: the real #resourceLibraryView markup,
 * the real stylesheets, and the real RL IIFE (showPage, the data-rlgoto map,
 * parentOf, the back button) lifted out of index.html by brace-matching. No
 * re-implementation — a harness seeded from my own assumption would validate
 * fiction, which is the mistake this project has already paid for three times.
 *
 * Four things actually matter here and each gets a proof:
 *   1. The book is reachable — a real click on the landing card opens it.
 *   2. The book is NOT in the TOC. Theo asked for that explicitly, so it is a
 *      requirement, not a detail. Asserted against the shipped TOC array.
 *   3. The 252 KB iframe is not fetched until the page is first opened, and
 *      its src is never re-set afterwards (that would throw away the reader's
 *      place in the book every time they came back).
 *   4. The iframe actually fills the pane. A full-bleed frame that computes to
 *      zero height parses, balances and gates green while showing nothing.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const APP = '/home/user/cardinal-inspections/index.html';
const PREV = '/tmp/claude-0/-home-user-cardinal-inspections/a9ea6de9-1097-5812-b046-748af1938962/scratchpad/index_v561.html';

const src = fs.readFileSync(APP, 'utf8');

/* Extract the RL IIFE from index.html on every run by brace-matching, rather
   than reading a copy saved beside the harness. The saved copy went stale the
   moment showPage() gained one more line, and the harness then reported
   bodyClass:"" against an app that was actually correct — a fixture bug that
   reads exactly like a product bug. Self-extraction cannot drift. */
const rl = (() => {
  const k = src.indexOf('function showPage(');
  const start = src.lastIndexOf('(function(', k);
  let d = 0, i = src.indexOf('{', src.indexOf(')', start));
  for (; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}' && --d === 0) break;
  }
  const out = src.slice(start, src.indexOf(';', i) + 1);
  if (!/function showPage\(/.test(out) || !/var parentOf/.test(out))
    throw new Error('RL IIFE extraction missed');
  return out;
})();

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

/* every stylesheet, so geometry is the real cascade and not a guess */
const styles = [];
for (let i = 0; ;) {
  const a = src.indexOf('<style', i); if (a < 0) break;
  const o = src.indexOf('>', a), b = src.indexOf('</style>', o); if (b < 0) break;
  styles.push(src.slice(o + 1, b)); i = b + 8;
}

/* the shipped RL view, verbatim.
   Sliced by DIV DEPTH, not by a marker comment. The first attempt ended the
   slice at the first `</div>\n\n    <!--`, which is the close of the landing
   — so the whole book page fell outside the fixture and four assertions failed
   against a file that was actually correct. Depth-matching cannot do that. */
const vs = src.indexOf('<div id="resourceLibraryView"');
const view = (() => {
  let d = 0, i = vs;
  const tag = /<\/?div\b/g; tag.lastIndex = vs;
  for (let m; (m = tag.exec(src)); ) {
    d += m[0][1] === '/' ? -1 : 1;
    if (d === 0) return src.slice(vs, m.index + src.slice(m.index).indexOf('>') + 1);
    i = m.index;
  }
  throw new Error('unbalanced #resourceLibraryView');
})();

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });

  /* the iframe must not really fetch 252 KB in the harness; stub the response
     so we are testing WHEN src is set, not what the book renders */
  await p.route('**/ai-field-manual.html', r =>
    r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>book</title><p>stub' }));

  await p.setContent(
    `<html><head>${styles.map(s => `<style>${s}</style>`).join('')}</head>` +
    `<body data-crm="retail" style="margin:0">${view}</body></html>`, { waitUntil: 'load' });
  /* open the Library the way the app opens it. The view ships display:none and
     showLibrary() sets display:'block' — without that every click times out on
     an invisible element, which reads exactly like a broken card. */
  await p.evaluate(() => { document.getElementById('resourceLibraryView').style.display = 'block'; });
  await p.evaluate(rl);

  /* ── 1. the section exists, and exactly once ───────────────────────── */
  const shape = await p.evaluate(() => ({
    pages: document.querySelectorAll('#rlPageAIBook').length,
    isRlPage: !!document.querySelector('#rlPageAIBook.rl-page'),
    title: (document.getElementById('rlPageAIBook') || {}).getAttribute
      ? document.getElementById('rlPageAIBook').getAttribute('data-rltitle') : null,
    cards: document.querySelectorAll('[data-rlgoto="ai_book"]').length,
    frames: document.querySelectorAll('#rlBookFrame').length,
    activeAtBoot: !!document.querySelector('#rlPageAIBook.rl-pageActive'),
    landingActive: !!document.querySelector('#rlLanding.rl-pageActive'),
  }));
  ok('the book page exists exactly once', shape.pages === 1, 'got ' + shape.pages);
  ok('it is a real .rl-page', shape.isRlPage);
  ok('it carries a title for the header', shape.title === 'The AI Field Manual', shape.title);
  ok('exactly one landing card points at it', shape.cards === 1, 'got ' + shape.cards);
  ok('exactly one iframe', shape.frames === 1, 'got ' + shape.frames);
  ok('the book is NOT showing at boot', !shape.activeAtBoot);
  ok('the landing is', shape.landingActive);

  /* ── 2. NOT in the TOC — the explicit requirement ──────────────────── */
  const tocBlock = src.slice(src.indexOf('<script id="cr-rltoc-script">'),
                             src.indexOf('</script>', src.indexOf('<script id="cr-rltoc-script">')));
  const tocArr = tocBlock.slice(tocBlock.indexOf('var TOC = ['),
                                tocBlock.indexOf('];', tocBlock.indexOf('var TOC = [')));
  ok('the book is absent from the TOC array', !/rlPageAIBook|AI Field Manual/i.test(tocArr));
  ok('nothing registers it via addSection',
     !/addSection\([^)]*(rlPageAIBook|AI Field Manual)/i.test(src));
  /* self-computing: the TOC must be byte-identical to the previous build,
     which is a stronger claim than any count I could hardcode (and my first
     attempt hardcoded 25 when it was 26 — the number was read off nothing). */
  const prev = fs.readFileSync(PREV, 'utf8');
  const prevToc = (() => {
    const a = prev.indexOf('<script id="cr-rltoc-script">');
    const blk = prev.slice(a, prev.indexOf('</script>', a));
    return blk.slice(blk.indexOf('var TOC = ['), blk.indexOf('];', blk.indexOf('var TOC = [')));
  })();
  ok('the TOC array is byte-identical to build 561', tocArr === prevToc,
     tocArr.length + ' vs ' + prevToc.length + ' chars');

  /* ── 3. lazy load: src empty until opened, set once, never re-set ──── */
  const before = await p.$eval('#rlBookFrame', n => n.getAttribute('src'));
  ok('iframe has no src before the page is opened', before === null || before === '', String(before));

  await p.click('[data-rlgoto="ai_book"]');
  await p.waitForTimeout(120);

  const after = await p.evaluate(() => ({
    active: !!document.querySelector('#rlPageAIBook.rl-pageActive'),
    landing: !!document.querySelector('#rlLanding.rl-pageActive'),
    src: document.getElementById('rlBookFrame').getAttribute('src'),
    header: (document.querySelector('.ins-title') || {}).textContent,
  }));
  ok('clicking the card opens the book', after.active);
  ok('and closes the landing', !after.landing);
  ok('the iframe now points at the book', after.src === '/ai-field-manual.html', after.src);
  ok('the header names it', /AI Field Manual/.test(after.header || ''), after.header);

  /* leave and come back — src must not be re-set */
  await p.evaluate(() => window._rlShowPage('rlLanding'));
  await p.waitForTimeout(60);
  await p.evaluate(() => {
    const f = document.getElementById('rlBookFrame');
    f.setAttribute('data-was', f.getAttribute('src'));
  });
  await p.click('[data-rlgoto="ai_book"]');
  await p.waitForTimeout(120);
  const again = await p.$eval('#rlBookFrame', n => ({ src: n.getAttribute('src'), was: n.getAttribute('data-was') }));
  ok('re-opening does not reload the frame (keeps your place)', again.src === again.was, again.src + ' vs ' + again.was);

  /* ── 4. geometry — a zero-height frame gates green and shows nothing ─ */
  const box = await p.evaluate(() => {
    const f = document.getElementById('rlBookFrame');
    const r = f.getBoundingClientRect();
    const pg = document.getElementById('rlPageAIBook').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), pw: Math.round(pg.width),
             pad: getComputedStyle(document.getElementById('rlPageAIBook')).padding,
             border: getComputedStyle(f).borderTopWidth };
  });
  ok('the frame has real height', box.h > 500, box.h + 'px');
  ok('the frame fills the width', box.w >= box.pw - 2, box.w + ' of ' + box.pw);
  ok('full-bleed: the page gives up its padding', box.pad === '0px', box.pad);
  ok('no iframe border', box.border === '0px', box.border);

  /* ── 5. back from the book lands on the landing, not a hub ─────────── */
  const backSel = await p.evaluate(() => {
    const bb = document.querySelector('#resourceLibraryView .ins-hbtn, #resourceLibraryView [class*=back]');
    return bb ? bb.className : null;
  });
  await p.evaluate(() => window._rlShowPage('rlPageAIBook'));
  await p.waitForTimeout(60);
  const parentOk = /rlPageAIBook:\s*'rlLanding'/.test(src);
  ok('parentOf sends back to the landing', parentOk);

  /* ── 6. the lone card uses the app's OWN single-card mechanism ──────
     The first attempt invented .rl-boxgrid-one, unprefixed, and it lost to
     `#resourceLibraryView .rl-boxgrid` (1,1,0) at every width above 380px —
     the same defeat build 481 took with .lb-ccfile. A screenshot caught it;
     none of the structural assertions could. The app already had .rl-single,
     correctly scoped and used twice, so the repair was to delete mine rather
     than out-specify it. This asserts the convention, not my preference. */
  ok('the card grid uses the existing .rl-single, not a new class',
     /class="rl-boxgrid rl-single">\s*<button class="rl-box" data-rlgoto="ai_book"/.test(src));
  ok('no invented single-card class survives', !/rl-boxgrid-one/.test(src));
  for (const w of [390, 800, 1280]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.evaluate(() => window._rlShowPage('rlLanding'));
    await p.waitForTimeout(60);
    const g = await p.evaluate(() => {
      const c = document.querySelector('[data-rlgoto="ai_book"]');
      const gr = c.closest('.rl-boxgrid');
      return { cols: getComputedStyle(gr).gridTemplateColumns,
               card: Math.round(c.getBoundingClientRect().width),
               grid: Math.round(gr.getBoundingClientRect().width) };
    });
    ok(`at ${w}px the card fills its row (one column)`,
       !/ /.test(g.cols.trim()) && g.card >= g.grid - 2, g.cols + ' card=' + g.card + ' grid=' + g.grid);
  }

  /* ── 7. no sideways scroll on a phone, with the book open ──────────── */
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => window._rlShowPage('rlPageAIBook'));
  await p.waitForTimeout(80);
  const sideways = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1);
  ok('no sideways scroll with the book open at 390px', !sideways);

  /* ── 8. the served file must be a real standalone document ──────────
     The authored book is an artifact FRAGMENT — the artifact host supplies
     <!doctype>, <head> and <meta charset>. Copied to the repo root as-is it
     served with no charset, the browser guessed, and every em-dash rendered
     as â€" and every middot as Â·. Nothing structural caught it; a screenshot
     did. scripts/wrap_book.py generates the served file now, and these hold
     it to that. */
  const BOOK = '/home/user/cardinal-inspections/ai-field-manual.html';
  const raw = fs.readFileSync(BOOK, 'latin1');   /* read as bytes, deliberately */
  const doc = fs.readFileSync(BOOK, 'utf8');
  ok('the served book declares a doctype', /^<!doctype html>/i.test(doc.trim()));
  ok('and a utf-8 charset', /<meta charset="utf-8">/i.test(doc));
  ok('and a viewport, so the phone layout engages', /name="viewport"/.test(doc));
  ok('charset comes before any content byte',
     doc.indexOf('<meta charset') < doc.indexOf('<style'), 'charset must be early');
  ok('exactly one document', (doc.match(/<html/gi) || []).length === 1);
  ok('the head closes before the body', doc.indexOf('</head>') < doc.indexOf('<body'));
  ok('the title is inside the head', doc.indexOf('<title>') < doc.indexOf('</head>'));
  /* the actual regression, spelled out: these byte sequences are what a
     utf-8 em-dash and middot look like when decoded as latin-1 */
  ok('no mojibake in the served bytes', !/Ã¢â‚¬|Ã‚Â·/.test(raw));
  ok('the em-dash survives as one character', /A field manual — prompting/.test(doc));
  ok('the book still carries every section',
     (doc.match(/<section class="chapter[^"]*" data-ch="/g) || []).length === 21,
     (doc.match(/<section class="chapter[^"]*" data-ch="/g) || []).length + ' sections');
  /* 578 split the hardware half of VI into its own chapter and reordered the
     book. Assert the SHIPPED file carries the new chapter and the new count —
     wrap_book.py regenerates this file, and a stale regeneration is invisible
     otherwise: the old book parses, balances and serves perfectly well. */
  ok('the served book carries the machines chapter',
     /data-ch="7"[^>]*>[\s\S]{0,400}<h2>The machines<\/h2>/.test(doc));
  ok('and the reordered spine, not the old one',
     /<span class="lbl">Choosing<\/span>/.test(doc) && /<span class="lbl">The wider world<\/span>/.test(doc));
  /* the commands page has to survive the wrap — its content is mostly inside
     .term blocks, which is exactly the sort of thing an over-eager escape would
     mangle without failing anything structural */
  ok('the served book carries the commands page',
     /data-ch="commands"/.test(doc) && /find ~ -iname/.test(doc));
  ok('and its shell redirection survived intact', /printf '%h\\n'/.test(doc));
  /* it has to be SERVED for the iframe to load — so it must not be ignored */
  const vi = fs.readFileSync('/home/user/cardinal-inspections/.vercelignore', 'utf8');
  ok('ai-field-manual.html is not excluded from the deploy',
     !/^\s*ai-field-manual\.html\s*$/m.test(vi));

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
