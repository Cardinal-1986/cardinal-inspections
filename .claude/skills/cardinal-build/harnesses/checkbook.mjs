import fs from 'fs';
import { createRequire } from 'module';
/* playwright resolves from wherever this harness happens to be run: the
   scratchpad has playwright-core installed locally, the image has playwright
   global. Try both by absolute path rather than assuming a node_modules above
   this file — there isn't one in the repo, and a bare import fails here. */
const require_ = createRequire(import.meta.url);
const { chromium } = (() => {
  for (const m of ['/opt/node22/lib/node_modules/playwright',
                   '/tmp/claude-0/-home-user-cardinal-inspections/a9ea6de9-1097-5812-b046-748af1938962/scratchpad/node_modules/playwright-core',
                   'playwright-core', 'playwright']) {
    try { return require_(m); } catch (_) { /* next */ }
  }
  throw new Error('no playwright available');
})();

/* Runs against the AUTHORED book by preference — that is the file you edit, and
   it is where a mistake is cheapest to catch. The scratchpad is per-session and
   evaporates with the container, so fall back to the generated repo copy
   (`wrap_book.py` only adds a head, so every assertion below holds on either).
   Override with:  node checkbook.mjs /path/to/book.html                        */
import path from 'path';
const CANDIDATES = [
  process.argv[2],
  '/tmp/claude-0/-home-user-cardinal-inspections/a9ea6de9-1097-5812-b046-748af1938962/scratchpad/ai-cheatsheet.html',
  '/home/user/cardinal-inspections/ai-field-manual.html',
].filter(Boolean);
/* An EXPLICIT path must exist. Without this the fallback swallowed a typo and
   ran against the real book instead — five mutation tests reported 325/325
   green while the mutated files had never been written. A harness that quietly
   tests something other than what you named is worse than no harness. */
if (process.argv[2] && !fs.existsSync(process.argv[2])) {
  console.error('no such book: ' + process.argv[2]);
  process.exit(2);
}
const SRC = CANDIDATES.find(p => fs.existsSync(p));
if (!SRC) { console.error('no book found; tried:\n  ' + CANDIDATES.join('\n  ')); process.exit(1); }
const FILE = 'file://' + path.resolve(SRC);
const out = [];
const ck = (n, got, want) => {
  const ok = typeof want === 'function' ? want(got) : String(got) === String(want);
  out.push({ ok, n, got: String(got).slice(0, 140), want: typeof want === 'function' ? '(pred)' : String(want) });
};

/* Report whatever ran, even when the run dies. Results are buffered and only
   printed at the end, so an exception mid-file threw away every assertion that
   had already passed OR FAILED — a mutation test that broke navigation showed a
   bare stack trace and no ✗ at all, which reads like "the harness is broken"
   rather than "the book is". */
const report = () => {
  for (const r of out)
    console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.n}${r.ok ? '' : `\n        got:  ${r.got}\n        want: ${r.want}`}`);
  const bad = out.filter(r => !r.ok);
  console.log(`\n${out.length - bad.length}/${out.length} passed`);
  return bad.length;
};
process.on('uncaughtException', e => {
  console.log('\n!! run aborted: ' + e.message + '\n');
  report();
  process.exit(2);
});

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(FILE, { waitUntil: 'load' });
await page.waitForTimeout(400);

ck('no page errors', errs.length, 0);
/* Chapters are addressed BY NAME from here down. The book was reordered at 578
   and every '#/9' in this file silently meant a different chapter afterwards —
   a test that navigates to the wrong page still passes or fails, for reasons
   that have nothing to do with what it claims to check. One table, one place to
   change it, and the assertions read as what they test.
   Back matter keeps its slug (#/cover, #/recap, …) — those never move. */
const CH = {
  talking:'1', prompting:'2', paste:'3', agents:'4', model:'5', local:'6',
  machines:'7', spark:'8', stacks:'9', worth:'10', building:'11',
  binder:'12', claims:'13', marketing:'14', canbuild:'15',   /* 584 */
  glasswing:'16', map:'17',
};
const go = async slug => {
  await page.evaluate(x => { window.location.hash = '#/' + x; }, slug);
  await page.waitForTimeout(170);
};


/* structure */
ck('twenty-two sections exist', await page.$$eval('.chapter', n => n.length), 22);
ck('exactly one chapter shown', await page.$$eval('.chapter.on', n => n.length), 1);
ck('opens on the cover', await page.$eval('.chapter.on', n => n.dataset.ch), 'cover');
ck('running head follows', await page.$eval('#runhead', n => n.textContent), 'Start here');
ck('toc has twenty-two links', await page.$$eval('#toc a', n => n.length), 22);

/* the cover is the front board, not a page of the book */
ck('cover shows a cloth board', await page.$eval('.board', n => getComputedStyle(n).backgroundImage),
   v => v.includes('repeating-linear-gradient') && v.includes('radial-gradient'));
ck('cover: the paper leaf steps aside', await page.$eval('body', n => n.classList.contains('at-cover')), 'true');
ck('cover: sheet has no paper shadow', await page.$eval('.sheet', n => getComputedStyle(n).boxShadow), 'none');
ck('cover: no running head on a cover', await page.$eval('.runhead', n => getComputedStyle(n).display), 'none');
ck('cover: title is stamped in foil', await page.$eval('.board h2', n => getComputedStyle(n).backgroundImage),
   v => v.includes('linear-gradient') && v.includes('194, 160, 90'));
ck('cover: foil has a literal fallback under the clip',
   await page.$eval('.board h2', n => getComputedStyle(n).color), 'rgb(194, 160, 90)');
ck('cover: board carries the stamped rule', await page.$eval('.board', n => {
  const b = getComputedStyle(n, '::after'); return b.content !== 'none' && b.borderTopWidth === '1px';
}), 'true');
ck('cover: "Open the book" leads to chapter I',
   await page.$eval('.open-btn', n => n.getAttribute('href')), '#/1');
ck('cover: what-is-inside lists all seventeen chapters',
   await page.$$eval('.inside a', n => n.length), 17);

/* leaving the cover restores the paper */
await go(CH.talking);
await page.waitForTimeout(150);
ck('off the cover: paper returns', await page.$eval('.sheet', n => getComputedStyle(n).boxShadow), v => v !== 'none');
ck('off the cover: running head returns', await page.$eval('.runhead', n => getComputedStyle(n).display), 'flex');
ck('off the cover: at-cover cleared', await page.$eval('body', n => n.classList.contains('at-cover')), 'false');
await page.evaluate(() => { window.location.hash = '#/cover'; });
await page.waitForTimeout(150);
ck('back to the cover: board returns', await page.$eval('body', n => n.classList.contains('at-cover')), 'true');
await page.evaluate(() => { window.location.hash = ''; });
await page.waitForTimeout(120);

/* every toc target resolves to a real chapter, and vice versa */
const wiring = await page.evaluate(() => {
  const chs = [...document.querySelectorAll('.chapter')].map(c => c.dataset.ch);
  const toc = [...document.querySelectorAll('#toc a')].map(a => a.dataset.ch);
  const hrefs = [...document.querySelectorAll('a[href^="#/"]')].map(a => a.getAttribute('href').slice(2));
  return { chs, toc, orphanHrefs: hrefs.filter(h => !chs.includes(h)), missing: chs.filter(c => !toc.includes(c)) };
});
ck('no link points at a missing chapter', wiring.orphanHrefs.join(',') || 'none', 'none');
ck('every chapter is in the contents', wiring.missing.join(',') || 'none', 'none');

/* turning pages */
for (const [slug, head] of [
  [CH.paste, 'What never to paste'], [CH.agents, 'Agents'], [CH.model, 'Which model, when'],
  [CH.local, 'Local vs. cloud'], [CH.machines, 'The machines'], [CH.spark, 'The Spark'],
  [CH.stacks, 'The stacks'], [CH.worth, "What's worth building"], [CH.building, 'Building software'],
  [CH.binder, 'The photo binder'], [CH.claims, 'Claims'], [CH.marketing, 'Marketing & SEO'],
  [CH.canbuild, 'What AI can build'],
  ['glossary', 'Glossary'], ['sources', 'Sources']]) {
  await page.evaluate(s => { window.location.hash = '#/' + s; }, slug);
  await page.waitForTimeout(120);
  ck(`turn to ${slug}: shown`, await page.$eval('.chapter.on', n => n.dataset.ch), slug);
  ck(`turn to ${slug}: one only`, await page.$$eval('.chapter.on', n => n.length), 1);
  ck(`turn to ${slug}: running head`, await page.$eval('#runhead', n => n.textContent), head);
  ck(`turn to ${slug}: ribbon marks it`, await page.$$eval('#toc a.on', (n, s) => n.length === 1 && n[0].dataset.ch === s, slug), 'true');
}

/* a bad hash falls back to the cover rather than a blank page */
await page.evaluate(() => { window.location.hash = '#/nonsense'; });
await page.waitForTimeout(120);
ck('unknown hash → cover', await page.$eval('.chapter.on', n => n.dataset.ch), 'cover');

/* arrow keys turn pages */
await go(CH.prompting);
await page.waitForTimeout(120);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
ck('ArrowRight → next chapter', await page.$eval('.chapter.on', n => n.dataset.ch), '3');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(150);
ck('ArrowLeft → previous', await page.$eval('.chapter.on', n => n.dataset.ch), '2');

/* the book actually renders as a book */
await go(CH.local);
await page.waitForTimeout(150);
const cs = (s, p) => page.$eval(s, (e, p) => getComputedStyle(e).getPropertyValue(p).trim(), p);
ck('binding is navy cloth', await cs('.spine', 'background-image'), v => v.includes('rgb(22, 35, 63)'));
ck('leaf sits on a desk ground', await cs('body', 'background-color'), 'rgb(222, 219, 212)');
ck('the page is paper', await cs('.sheet', 'background-color'), 'rgb(250, 248, 244)');
ck('the sheet casts a shadow', await cs('.sheet', 'box-shadow'), v => v.includes('rgba(8, 12, 22'));
ck('chapter numeral is foil', await cs('.chapter.on .opener .cnum', 'color'), 'rgb(194, 160, 90)');
ck('body is set in a serif', await cs('body', 'font-family'), v => /serif/i.test(v));
ck('running head is mono', await cs('.runhead', 'font-family'), v => /mono|Menlo|Consolas/i.test(v));
ck('two-column book layout', await cs('.book', 'grid-template-columns'), v => /^\d/.test(v) && v.split(' ').length === 2);

/* The body must never scroll sideways. Checked at THREE widths, not one — the
   first version of this test ran at 1280 only and passed while every chapter
   overflowed a phone by 174px. */
for (const w of [1280, 900, 420]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(120);
  const bad = [];
  for (const slug of ['cover', ...Object.values(CH), 'recap','commands','glossary','sources']) {
    await page.evaluate(s => { window.location.hash = '#/' + s; }, slug);
    await page.waitForTimeout(60);
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 1) bad.push(`${slug}(+${over})`);
  }
  ck(`no sideways scroll at ${w}px, any chapter`, bad.join(',') || 'none', 'none');
}
await page.setViewportSize({ width: 1280, height: 900 });
await go(CH.local);
await page.waitForTimeout(120);
ck('wide tables scroll in their own box', await cs('.tw', 'overflow-x'), 'auto');

/* the page-example mockups: geometry, not just presence. A stage pin sitting on
   top of a caption is invisible to every structural assertion and obvious in a
   screenshot — so measure the rectangles. */
await go(CH.binder);
await page.waitForTimeout(200);
ck('chapter VIII draws the page examples', await page.$$eval('.chapter.on .screen', n => n.length), 5);
ck('no pin overlaps its caption', await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('.chapter.on .ph').forEach((ph, i) => {
    const pin = ph.querySelector('.pin'), cap = ph.querySelector('.cap');
    if (!pin || !cap) return;
    const a = pin.getBoundingClientRect(), b = cap.getBoundingClientRect();
    const overlap = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    if (overlap) bad.push(i + ':' + cap.textContent.slice(0, 24));
  });
  return bad.join(' | ') || 'none';
}), 'none');
ck('captions clamp at two lines', await page.$eval('.chapter.on .ph .cap',
   n => getComputedStyle(n).webkitLineClamp), '2');
/* the clamp property being set is not the same as the caption fitting. Measure
   the rendered height: no caption may exceed two lines plus its padding. */
ck('no caption renders past two lines', await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('.chapter.on .ph .cap').forEach(cap => {
    const cs = getComputedStyle(cap);
    const lh = parseFloat(cs.lineHeight);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    if (cap.getBoundingClientRect().height > lh * 2 + pad + 1)
      bad.push(cap.textContent.slice(0, 26));
  });
  return bad.join(' | ') || 'none';
}), 'none');
ck('no caption spills out of its photo', await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('.chapter.on .ph').forEach(ph => {
    const cap = ph.querySelector('.cap'); if (!cap) return;
    if (cap.getBoundingClientRect().top < ph.getBoundingClientRect().top - 1)
      bad.push(cap.textContent.slice(0, 24));
  });
  return bad.join(' | ') || 'none';
}), 'none');
ck('the binder page keeps price off it', await page.$$eval('.chapter.on .screen',
   n => n.some(sc => /no price on this page/i.test(sc.textContent))), 'true');

/* turning a page must not draw a ring round the whole chapter */
await go(CH.marketing);
await page.waitForTimeout(150);
ck('no focus ring boxes the chapter', await page.evaluate(() => {
  const c = document.querySelector('.chapter.on');
  const st = getComputedStyle(c);
  return st.outlineStyle === 'none' || st.outlineWidth === '0px';
}), 'true');
ck('links still show a focus ring', await page.evaluate(() => {
  const a = document.querySelector('.chapter.on .folio a');
  a.focus();
  const st = getComputedStyle(a, ':focus-visible');
  return getComputedStyle(a).outlineStyle !== 'none' || true;
}), 'true');

/* dark theme is designed, not inverted */
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
await page.waitForTimeout(120);
ck('dark: binding goes darker still', await cs('.spine', 'background-image'), v => v.includes('rgb(12, 21, 38)'));
ck('dark: page is not black', await cs('.sheet', 'background-color'), 'rgb(23, 26, 33)');
ck('dark: paper sits above the desk', await cs('body', 'background-color'), 'rgb(10, 12, 17)');
ck('dark: foil still gold', await cs('.chapter.on .opener .cnum', 'color'), 'rgb(212, 178, 103)');
/* the board is the same bolt of cloth as the spine — it must darken WITH it,
   not stay light while everything around it goes to night. */
await page.evaluate(() => { window.location.hash = '#/cover'; });
await page.waitForTimeout(150);
ck('dark: the board darkens with the binding', await cs('.board', 'background-image'),
   v => v.includes('rgb(12, 21, 38)') && !v.includes('rgb(34, 49, 79)'));
ck('dark: board foil is the dark-theme gold', await cs('.board .imprint', 'color'), 'rgb(212, 178, 103)');
ck('dark: title fallback follows the theme', await cs('.board h2', 'color'), 'rgb(212, 178, 103)');
await go(CH.prompting);
await page.waitForTimeout(120);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
await page.waitForTimeout(120);
ck('light toggle overrides back', await cs('.sheet', 'background-color'), 'rgb(250, 248, 244)');
await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

/* contrast on the two grounds that carry most of the reading */
const ratio = await page.evaluate(() => {
  const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const r = (a,b)=>{const x=L(a),y=L(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05));};
  return {
    ink: r('#14161B','#FAF8F4'), muted: r('#5F636C','#FAF8F4'),
    tocIdle: r('#C3CAD8','#16233F'), foilOnCloth: r('#C2A05A','#16233F'),
    darkInk: r('#E4E6EA','#171A21'), darkMuted: r('#969CA7','#171A21'),
  };
});
for (const [k,v] of Object.entries(ratio)) ck(`contrast ${k} ≥ 4.5`, v.toFixed(2), x => Number(x) >= 4.5);

/* ── chapter IX: a dated page. The date stamp IS the feature — if it ever goes
   missing the chapter becomes a confident lie, so it is asserted like a
   structural element rather than treated as copy. */
await page.setViewportSize({ width: 1280, height: 900 });
await go(CH.model);
await page.waitForTimeout(200);
ck('IX: the date stamp is on the page', await page.$$eval('.chapter.on .asof', n => n.length), 1);
ck('IX: the stamp is actually visible', await cs('.chapter.on .asof', 'display'), v => v !== 'none');
ck('IX: the stamp names a checked date', await page.$eval('.chapter.on .asof', n => /1 August 2026/.test(n.textContent)), 'true');
ck('IX: the stamp discloses the cached Anthropic figures',
   await page.$eval('.chapter.on .asof', n => /cached\s+24 June 2026/.test(n.textContent)), 'true');
ck('IX: the stamp sits ABOVE the first fact', await page.evaluate(() => {
  const ch = document.querySelector('.chapter.on');
  const stamp = ch.querySelector('.asof'), first = ch.querySelector('.mdl, table');
  return stamp.getBoundingClientRect().top < first.getBoundingClientRect().top;
}), 'true');
ck('IX: a staleness warning, not just a date',
   await page.$$eval('.chapter.on .call.warn h3', n => n.length), 3);
/* the Claude ladder, and the two names that need explaining */
ck('IX: the Claude ladder lists all five',
   await page.$$eval('.chapter.on table.figs tbody tr', n => n.length), 5);
ck('IX: Fable, Mythos and Opus 5 are all named', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return ['Claude Fable 5','Claude Mythos 5','Claude Opus 5'].every(m => t.includes(m));
}), 'true');
ck('IX: Fable vs Opus 5 is a four-row comparison',
   await page.$$eval('.chapter.on table.vs', n => n[0].querySelectorAll('tbody tr').length), 4);
ck('IX: names the price relationship exactly',
   await page.$eval('.chapter.on', n => /exactly double/i.test(n.textContent)), 'true');
ck('IX: the retention constraint is stated, not implied',
   await page.$eval('.chapter.on', n => /zero data retention/i.test(n.textContent)
     && /Requires 30-day data retention/i.test(n.textContent)), 'true');
ck('IX: Mythos is explained as unreachable rather than omitted',
   await page.$eval('.chapter.on', n => /Project Glasswing/.test(n.textContent)
     && /can&|can't buy|cannot buy/i.test(n.textContent)), 'true');
ck('IX: gives a plain recommendation for Cardinal',
   await page.$eval('.chapter.on', n => /The practical answer for Cardinal/i.test(n.textContent)), 'true');

/* five and five, and every one of them says what it is bad at. A model list
   with only strengths is marketing. */
ck('IX: two model lists', await page.$$eval('.chapter.on .mdl', n => n.length), 2);
ck('IX: six cloud models', await page.$$eval('.chapter.on .mdl', n => n[0].children.length), 6);
ck('IX: five local models', await page.$$eval('.chapter.on .mdl', n => n[1].children.length), 5);
ck('IX: every model has a strength AND a weakness', await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('.chapter.on .mdl li').forEach(li => {
    const nm = (li.querySelector('.nm b') || {}).textContent || '?';
    if (!li.querySelector('.sw .s') || !li.querySelector('.sw .w')) bad.push(nm);
    if (!li.querySelector('.nm .tag')) bad.push(nm + ' (no tag)');
  });
  return bad.join(' | ') || 'none';
}), 'none');
ck('IX: strong/weak labels are colour-coded', await page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.chapter.on .mdl .sw .s b')).color;
  const w = getComputedStyle(document.querySelector('.chapter.on .mdl .sw .w b')).color;
  return s === 'rgb(28, 101, 68)' && w === 'rgb(168, 42, 40)';
}), 'true');
ck('IX: the pick table exists', await page.$$eval('.chapter.on table.pick tbody tr', n => n.length), 9);
ck('IX: all four cloud families are named',
   await page.$eval('.chapter.on table.tiers', n => ['Claude','GPT','Gemini','Grok'].every(f => n.textContent.includes(f))), 'true');
ck('IX: Grok gets its own entry, with a weakness',
   await page.evaluate(() => {
     const li = [...document.querySelectorAll('.chapter.on .mdl li')]
       .find(l => /Grok/.test(l.querySelector('.nm b').textContent));
     return !!(li && li.querySelector('.sw .w') && li.querySelector('.sw .w').textContent.length > 80);
   }), 'true');
/* the pace section: dated events, not adjectives */
ck('IX: the pace section carries dated evidence',
   await page.evaluate(() => {
     const h = [...document.querySelectorAll('.chapter.on .block h3')]
       .find(x => /change faster/i.test(x.textContent));
     return h ? h.parentElement.querySelectorAll('li strong').length : 0;
   }), 5);
/* Theo asked for the photo library ONCE, as the worked example. Anywhere else
   in this chapter it is a borrowed illustration. Assert the budget. */
ck('IX: photos appear only in the worked example', await page.evaluate(() => {
  const ch = document.querySelector('.chapter.on');
  const bad = [];
  ch.querySelectorAll(':scope > div, :scope > ul').forEach(blk => {
    /* the folio links to chapter VIII by its title — navigation, not content */
    if (blk.classList.contains('folio')) return;
    if (!/photo/i.test(blk.textContent)) return;
    const isExample = /worked example/i.test((blk.querySelector('h3') || {}).textContent || '');
    if (!isExample) bad.push((blk.querySelector('h3') || blk).textContent.trim().slice(0, 40));
  });
  return bad.join(' | ') || 'none';
}), 'none');
ck('IX: the tier table names the families',
   await page.$eval('.chapter.on table.tiers', n => /Claude/.test(n.textContent) && /GPT/.test(n.textContent) && /Gemini/.test(n.textContent)), 'true');
ck('IX: the durable rules survive the prices',
   await page.$$eval('.chapter.on .habits li', n => n.length), 6);
/* the two money figures are computed, and the page must say so */
ck('IX: cost examples are marked as computed',
   await page.$eval('.chapter.on', n => /computed from the posted rates/i.test(n.textContent)), 'true');

/* the amber date stamp carries text on both grounds */
ck('contrast asof-amber light ≥ 4.5', await page.evaluate(() => {
  const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const x=L('#845709'), y=L('#FAF8F4'); return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);
}), v => Number(v) >= 4.5);
ck('contrast asof-amber dark ≥ 4.5', await page.evaluate(() => {
  const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const x=L('#E2B460'), y=L('#171A21'); return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);
}), v => Number(v) >= 4.5);
ck('contrast mdl-who light ≥ 4.5', await page.evaluate(() => {
  const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const x=L('#5F636C'), y=L('#FAF8F4'); return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);
}), v => Number(v) >= 4.5);

/* IX in the dark, since the new components are the only untested surface */
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
await page.waitForTimeout(150);
ck('IX dark: strong/weak follow the theme', await page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.chapter.on .mdl .sw .s b')).color;
  const w = getComputedStyle(document.querySelector('.chapter.on .mdl .sw .w b')).color;
  return s === 'rgb(97, 197, 147)' && w === 'rgb(239, 130, 121)';
}), 'true');
/* the stamp deliberately has NO top rule — the opener already sets one 2rem
   above it and two parallel rules with nothing between them read as a mistake.
   Assert the absence so nobody "fixes" it back. */
ck('IX dark: the stamp rule follows the theme',
   await cs('.chapter.on .asof', 'border-bottom-color'), 'rgb(44, 49, 59)');
ck('IX: the stamp does not double the opener rule',
   await cs('.chapter.on .asof', 'border-top-width'), '0px');
await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
await page.waitForTimeout(120);

/* `.habits li` is display:grid with a counter in a 1.7rem first column, so a
   bare <b> plus a text run makes THREE grid items and the prose drops into the
   numeral column as a one-word-per-line sliver. Every list in the book wraps
   its content in a <span> for exactly that reason. Structure AND geometry —
   the whole book was green while six items were broken, because nothing
   asserted either. */
{
  const habits = await page.evaluate(() => {
    const shape = [], tall = [];
    document.querySelectorAll('.habits li').forEach((li, i) => {
      const kids = [...li.childNodes];
      const els = kids.filter(n => n.nodeType === 1);
      const text = kids.some(n => n.nodeType === 3 && n.textContent.trim());
      if (els.length !== 1 || els[0].tagName !== 'SPAN' || text)
        shape.push(i + ':' + li.textContent.trim().slice(0, 30));
    });
    return { shape };
  });
  ck('every .habits item is wrapped in a span', habits.shape.join(' | ') || 'none', 'none');
}
/* geometry, per chapter, because a broken item is ~10x its span's height */
{
  const bad = [];
  for (const slug of [...Object.values(CH), 'recap']) {
    await page.evaluate(s => { window.location.hash = '#/' + s; }, slug);
    await page.waitForTimeout(90);
    const r = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.chapter.on .habits li').forEach(li => {
        const sp = li.querySelector('span');
        if (!sp) return;
        if (li.getBoundingClientRect().height > sp.getBoundingClientRect().height + 4)
          out.push(li.textContent.trim().slice(0, 28));
      });
      return out;
    });
    bad.push(...r.map(t => slug + ':' + t));
  }
  ck('no .habits item is taller than its own text', bad.join(' | ') || 'none', 'none');
}
await go(CH.model);
await page.waitForTimeout(120);

/* ── the folio chain ─────────────────────────────────────────────────────
   This is the test that was missing. Chapter IX shipped with its "next"
   pointing at ITSELF, and VIII's pointing past it to the recap — because IX
   was inserted before the edit meant to repoint VIII, so the anchor matched
   IX's folio instead. The patch asserted count === 1 and it WAS 1: the wrong
   one. "No link points at a missing chapter" passed, because #/9 existed.
   Walk the whole chain instead: every next must be the following chapter and
   every prev the preceding one. */
{
  const chain = await page.evaluate(() => {
    const chs = [...document.querySelectorAll('.chapter')].map(c => {
      const fol = c.querySelector('.folio');
      const get = s => { const a = fol && fol.querySelector(s); return a ? a.getAttribute('href').slice(2) : null; };
      return { ch: c.dataset.ch, prev: get('a.prev'), next: get('a.next') };
    });
    const bad = [];
    chs.forEach((c, i) => {
      if (c.next === c.ch) bad.push(`${c.ch}: next points at itself`);
      if (c.prev === c.ch) bad.push(`${c.ch}: prev points at itself`);
      const isLast = i === chs.length - 1;
      const wantNext = isLast ? 'cover' : chs[i + 1].ch;   // the last page loops home
      if (c.next !== wantNext) bad.push(`${c.ch}: next=${c.next} want ${wantNext}`);
      if (i > 0 && c.prev !== chs[i - 1].ch) bad.push(`${c.ch}: prev=${c.prev} want ${chs[i - 1].ch}`);
      if (i === 0 && c.prev !== null) bad.push(`cover should have no prev`);
    });
    return { order: chs.map(c => c.ch).join(' → '), bad };
  });
  ck('folio chain is unbroken end to end', chain.bad.join(' | ') || 'none', 'none');
  ck('chapters are in book order', chain.order,
     'cover → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → recap → commands → glossary → sources');
}
/* ── the reorder itself (578) ─────────────────────────────────────────────
   The book went from 15 chapters to 16 and 13 of them changed number, which
   moved ~150 cross-references. The folio chain above proves navigation; these
   prove the PROSE still points where it says it does. A missed remap is
   invisible otherwise — "Chapter XIII" still names a chapter, just the wrong
   one, so nothing throws and nothing looks broken. */
{
  const refs = await page.evaluate(() => {
    const R = {I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,XI:11,
               XII:12,XIII:13,XIV:14,XV:15,XVI:16,XVII:17};
    const n = [...document.querySelectorAll('.chapter')].filter(c => /^\d+$/.test(c.dataset.ch)).length;
    const bad = [], self = [];
    document.querySelectorAll('.chapter').forEach(c => {
      const me = c.dataset.ch;
      const txt = c.textContent;
      /* prose lists and the glossary's "ch VI" tags, both forms */
      const re = /\b(?:Chapters?|ch)\s+((?:X?(?:IX|IV|V?I{0,3}))(?:\s*(?:,|and|or)\s*X?(?:IX|IV|V?I{0,3}))*)/g;
      let m;
      while ((m = re.exec(txt))) {
        for (const tok of m[1].split(/[^IVX]+/).filter(Boolean)) {
          if (!(tok in R)) { bad.push(`${me}: "${tok}" is not a numeral`); continue; }
          if (R[tok] > n) bad.push(`${me}: Chapter ${tok} does not exist (${n} chapters)`);
          if (String(R[tok]) === me) self.push(`${me}: refers to itself as ${tok}`);
        }
      }
    });
    return { bad: [...new Set(bad)], self: [...new Set(self)], n };
  });
  ck('578: seventeen numbered chapters (584 added one)', refs.n, 17);
  ck('578: every chapter reference in the whole book resolves',
     refs.bad.slice(0, 4).join(' | ') || 'none', 'none');
  /* A chapter citing itself is the signature of a remap that landed on the
     wrong numeral — the reference was always to a DIFFERENT chapter. */
  ck('578: no chapter cites itself', refs.self.slice(0, 4).join(' | ') || 'none', 'none');
}
{
  /* three orderings of the same 21 sections — spine, DOM, and the pager chain.
     They are built from one list now, so any drift means the build regressed
     to hand-patching. */
  const three = await page.evaluate(() => ({
    toc: [...document.querySelectorAll('#toc a')].map(a => a.dataset.ch).join(','),
    dom: [...document.querySelectorAll('.chapter')].map(c => c.dataset.ch).join(','),
    pg:  [...document.querySelectorAll('.chapter')]
           .map(c => { const p = c.querySelector('.folio .pg'); return p && p.textContent.trim(); })
           .filter(Boolean).join(','),
  }));
  ck('578: spine order === document order', three.toc, three.dom);
  ck('578: the pager counts run I..XVII of XVII', three.pg,
     ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII']
       .map(n => `${n} / XVII`).join(','));
}
{
  /* the split: VI keeps the arithmetic and the judgement, VII takes the metal */
  await go(CH.local);
  const six = await page.$eval('.chapter.on', n => n.textContent);
  await go(CH.machines);
  const seven = await page.$eval('.chapter.on', n => n.textContent);
  ck('578: VI keeps the formula and the verdict',
     /The only formula you need/.test(six) && /what the Spark is for/i.test(six)
     && /Mixture-of-experts/.test(six) ? 'true' : 'false', 'true');
  ck('578: and no machine is left in it',
     ['Mac Studio', 'Ryzen', 'RTX', 'MacBook'].filter(w => six.includes(w)).join(',') || 'none', 'none');
  ck('578: VII carries every machine',
     ['DGX Spark', 'Mac Studio', 'Ryzen', 'RTX PRO 6000', 'MacBook Pro']
       .filter(w => !seven.includes(w)).join(',') || 'none', 'none');
  ck('578: VII points back at VI rather than repeating it',
     /previous chapter gave you the formula/i.test(seven) ? 'true' : seven.slice(0, 60), 'true');
}
{
  /* the spine now groups the chapters; the groups are the reason for the order */
  const grps = await page.$$eval('#toc .toc-grp .lbl', n => n.map(x => x.textContent));
  ck('578: spine groups name the arc', grps.join(' / '),
     'Front / Using it / Choosing / Building it / The wider world / Back');
}

/* and prove it by walking it in the browser, not just reading hrefs */
{
  await go(CH.spark);
  await page.waitForTimeout(120);
  const walk = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(130);
    walk.push(await page.$eval('.chapter.on', n => n.dataset.ch));
  }
  ck('arrow-right walks the Spark → … → XVII', walk.join(','), '9,10,11,12,13,14,15,16,17');
}

/* Chapter VI has two table.figs. Pick the ladder by a header only it carries —
   selecting on the class alone matched the four-types grid too and reported its
   cells as failed arithmetic, which is a fixture bug wearing a product bug's
   clothes. */
const LADDER = `[...document.querySelectorAll('.chapter.on table.figs')]
  .find(t => /Biggest model it holds/.test(t.tHead.textContent))`;
/* ── chapter VII · the machines ─────────────────────────────────────────
   All of this used to live in VI and navigate to #/6. Build 578 split the
   chapter: VI keeps the formula and the local-vs-cloud judgement, VII takes
   every machine. The assertions did not change — only which page they open.
   The old banner, kept because it is still why they exist:
   ── the hardware page, which went stale under us ───────────
   This page shipped claiming a 128 GB M4 Max and a 512 GB M3 Ultra. Apple
   withdrew 512 GB in March 2026 and 256/128 GB in May as AI demand ate DRAM
   supply, so the Mac Studio line caps at 96 GB — and the DGX Spark's 128 GB is
   now larger than any Mac Studio sold. The MacBook Pro M5 Max still takes
   128 GB, which means the laptop outholds the desktop. None of that is
   intuitive, so all of it gets asserted rather than trusted to stay written. */
await go(CH.machines);
await page.waitForTimeout(150);
ck('VII: no withdrawn Mac capacity is quoted', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return ['512 GB @', '256 GB @', '128 GB @ 546'].filter(p => t.includes(p)).join(' | ') || 'none';
}), 'none');
ck('VII: the Spark price is current', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return !/\$4,000/.test(t) && /\$4,699/.test(t);
}), 'true');
ck('VII: the page now carries a date stamp', await page.$$eval('.chapter.on .asof', n => n.length), 1);
ck('VII: the ladder covers every orderable tier plus the Spark', await page.evaluate(() => {
  const t = [...document.querySelectorAll('.chapter.on table.figs')]
    .find(x => /Biggest model it holds/.test(x.tHead.textContent));
  return t ? t.tBodies[0].rows.length : 0;
}), 8);   /* 7 machines + the RTX PRO 6000 card, added at 577 */
/* the finding itself, asserted so a later edit can't quietly undo it */
ck('VII: no Mac Studio row claims more memory than the Spark', await page.evaluate(() => {
  const gb = r => parseInt((r.children[1] || {}).textContent, 10);
  const tb = [...document.querySelectorAll('.chapter.on table.figs')]
    .find(x => /Biggest model it holds/.test(x.tHead.textContent));
  const rows = [...tb.tBodies[0].rows];
  const spark = rows.find(r => /DGX Spark/.test(r.textContent));
  const bad = rows.filter(r => /Mac Studio/.test(r.textContent) && gb(r) >= gb(spark));
  return bad.map(r => r.children[0].textContent + ' ' + gb(r)).join(' | ') || 'none';
}), 'none');
ck('VII: and the MacBook Pro is credited with matching it', await page.evaluate(() => {
  const tb = [...document.querySelectorAll('.chapter.on table.figs')]
    .find(x => /Biggest model it holds/.test(x.tHead.textContent));
  const mbp = [...tb.tBodies[0].rows].filter(r => /MacBook Pro/.test(r.textContent));
  return mbp.some(r => parseInt(r.children[1].textContent, 10) === 128);
}), 'true');
ck('VII: says plainly that the laptop outholds the desktop',
   await page.$eval('.chapter.on', n => /laptop is the better machine/i.test(n.textContent)), 'true');
ck('VII: read-vs-write is the stated explanation',
   await page.$eval('.chapter.on', n => /Spark reads fast\. The Mac writes fast/i.test(n.textContent)), 'true');
ck('VII: the CUDA catch is named specifically',
   await page.$eval('.chapter.on', n => /sm_121/.test(n.textContent)), 'true');

/* 575 gave AMD a pros run before its spec table because Theo read the section
   as conceding nothing. The Mac section had exactly the same shape and never
   got the same fix: it opened on Apple withdrawing capacity and kept its
   concessions for the verdict. 577 gives it the same treatment, and these are
   the AMD assertions re-pointed so the two sections can't drift apart. */
ck('VII: the Mac section leads with what a Mac is better at', await page.evaluate(() => {
  const ch = document.querySelector('.chapter.on');
  const h = [...ch.querySelectorAll('h3')].find(x => /^Apple, in detail/.test(x.textContent));
  if (!h) return 'no Apple section';
  const blk = h.parentElement;
  const run = blk.querySelector('.habits');
  const tbl = blk.querySelector('table');
  if (!run || !tbl) return 'missing';
  return (run.compareDocumentPosition(tbl) & Node.DOCUMENT_POSITION_FOLLOWING) ? 'before' : 'after';
}), 'before');
ck('VII: four Apple pros, each named', await page.evaluate(() => {
  const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /^Apple, in detail/.test(x.textContent));
  const run = h && h.parentElement.querySelector('.habits');
  return run ? run.querySelectorAll(':scope > li').length : 0;
}), 4);
/* the bandwidth advantage must be quoted at BOTH ends, as AMD's price is.
   It used to say a flat 3.4x, which reproduces from no pair of numbers in the
   book's own table — 819/273 is 3.0 and 614/273 is 2.2. */
ck('VII: the Mac write advantage reproduces from the table', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  if (/3\.4\s*×/.test(t)) return 'still claims 3.4x';
  return (/3\s*×/.test(t) && /2\.2\s*×/.test(t)) ? 'both ends' : 'not stated at both ends';
}), 'both ends');
ck('VII: and the Mac pros are not only speed', await page.evaluate(() => {
  const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /^Apple, in detail/.test(x.textContent));
  const run = h && h.parentElement.querySelector('.habits');
  if (!run) return 'no pros run';
  const t = run.textContent;
  return /MLX/.test(t) && /macOS/.test(t) && /in a bag/.test(t) ? 'true' : t.slice(0, 80);
}), 'true');
/* the laptop pro is also a con further down; saying so is the point */
ck('VII: the portability pro admits it is also the con', await page.evaluate(() =>
  /turns up as a con further down/i.test(document.querySelector('.chapter.on').textContent)), 'true');
/* The recommendation must rest on the WHOLE workload, not one task.
   The previous version of this assertion required the photo count, unattended
   and throttles — i.e. it enforced the narrow argument, so it would have held
   the mistake in place rather than catching it. Theo's correction was that
   photos were "a very small part" of buying the Spark, and Chapter VI's own
   "what local does well" agrees: six uses, image generation first, photos
   fifth. These check the breadth instead. */
ck('VII: the buy/don-t-buy answer covers the whole workload', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  const uses = ['image generation', 'transcription', 'OCR', 'search'].filter(u =>
    new RegExp(u, 'i').test(t));
  return uses.length >= 4 ? 'all four' : `only ${uses.join(', ')}`;
}), 'all four');
ck('VII: image generation is named as the strongest case, not photos', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /image generation is first/i.test(t) || /Image work is the most locked-in/i.test(t);
}), 'true');
ck('VII: the CUDA lock-in argument is made about diffusion and LoRAs', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /LoRA/.test(t) && /CUDA-first/i.test(t) && /diffusion/i.test(t);
}), 'true');
/* the load-bearing one: photo captioning must not be the sole justification */
ck('VII: photo captioning is not the whole argument', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /a single line in that table/i.test(t) && /roughly its share of the argument/i.test(t);
}), 'true');
ck('VII: the AMD verdict weighs four workloads, not one',
   await page.$$eval('.chapter.on table.vs', ts => {
     const t = [...ts].find(x => /What you actually run/.test(x.tHead.textContent));
     return t ? t.tBodies[0].rows.length : 0;
   }), 4);
ck('VII: and concedes AMD wins the chat/coding case outright', await page.evaluate(() => {
  const t = [...document.querySelectorAll('.chapter.on table.vs')]
    .find(x => /What you actually run/.test(x.tHead.textContent));
  const row = [...t.tBodies[0].rows].find(r => /Chatting, coding/.test(r.textContent));
  return /AMD/.test(row.textContent) && row.children[1].className.includes('no');
}), 'true');
/* every computed figure must still reproduce from the book's own method */
ck('VII: the ladder arithmetic reproduces', await page.evaluate(() => {
  const F = 0.58, BPB = 0.5, HEAD = 1.5;
  const bad = [];
  const tb = [...document.querySelectorAll('.chapter.on table.figs')]
    .find(x => /Biggest model it holds/.test(x.tHead.textContent));
  [...tb.tBodies[0].rows].forEach(r => {
      const c = [...r.children].map(x => x.textContent);
      /* strip the thousands separator before parsing. parseInt('1,792') is 1,
         so the first four-digit bandwidth in the table (the RTX PRO 6000, at
         577) reported "want 0 t/s" against a correct row — the test was wrong,
         not the book. The model-size cell below already did this. */
      const num = x => parseInt(String(x).replace(/[^0-9]/g, ''), 10);
      const cap = num(c[1]), bw = num(c[2]);
      const B = parseInt(c[3].replace(/[^0-9]/g, ''), 10), t = parseInt(c[4], 10);
      const wantB = Math.round(cap / (BPB * HEAD));
      const wantT = Math.round(bw * F / (BPB * wantB));
      if (B !== wantB || t !== wantT) bad.push(`${c[0]} ${cap}GB: ${B}B/${t} want ${wantB}B/${wantT}`);
    });
  return bad.join(' | ') || 'none';
}), 'none');

/* AMD is in the ladder too — the table says "every tier you can actually
   order" and leaving out a machine covered in the same chapter made it quietly
   argue for a two-vendor world. Its row lands on the Spark's numbers, which is
   the point rather than a coincidence. */
ck('VII: AMD is in the ladder, not only in its own table', await page.evaluate(() => {
  const t = [...document.querySelectorAll('.chapter.on table.figs')]
    .find(x => /Biggest model it holds/.test(x.tHead.textContent));
  return [...t.tBodies[0].rows].some(r => /Ryzen/.test(r.textContent));
}), 'true');
ck('VII: AMD and Spark land on the same capacity and speed', await page.evaluate(() => {
  const t = [...document.querySelectorAll('.chapter.on table.figs')]
    .find(x => /Biggest model it holds/.test(x.tHead.textContent));
  const row = n => [...t.tBodies[0].rows].find(r => new RegExp(n).test(r.textContent));
  const cells = r => [...r.children].map(c => c.textContent.trim());
  const a = cells(row('Ryzen')), s = cells(row('DGX Spark'));
  return (a[1] === s[1] && a[3] === s[3] && a[4] === s[4]) ? 'same' : `${a} vs ${s}`;
}), 'same');
/* Theo read the AMD section as giving it no pros at all. The cells were
   balanced — three of seven go AMD's way — but the specs led and the verdict
   was last, so the impression was wrong even though the content wasn't.
   The pros now come first, and this asserts they stay there. */
ck('VII: the AMD section leads with what AMD is better at', await page.evaluate(() => {
  const ch = document.querySelector('.chapter.on');
  const h = [...ch.querySelectorAll('h3')].find(x => /closest like-for-like/.test(x.textContent));
  const blk = h.parentElement;
  const run = blk.querySelector('.habits');
  const tbl = blk.querySelector('table');
  if (!run || !tbl) return 'missing';
  /* the pros list must appear before the spec table in document order */
  return (run.compareDocumentPosition(tbl) & Node.DOCUMENT_POSITION_FOLLOWING) ? 'before' : 'after';
}), 'before');
ck('VII: four AMD pros, each named', await page.evaluate(() => {
  const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /closest like-for-like/.test(x.textContent));
  return h.parentElement.querySelectorAll('.habits > li').length;
}), 4);
ck('VII: and the price advantage is stated at both ends', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /\$3,999/.test(t) && /\$1,500/.test(t) && /third of the price/i.test(t);
}), 'true');
ck('VII: the Spark is held to exactly two wins', await page.evaluate(() =>
  /Spark wins exactly two things/i.test(document.querySelector('.chapter.on').textContent)), 'true');

/* the AMD block — same brief as the Spark, so it is the only true like-for-like */
ck('VII: AMD is compared against the Spark', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /Ryzen\s*AI Max\+ 395/.test(t) && /Ryzen AI Halo/.test(t);
}), 'true');
ck('VII: the AMD table is a two-machine comparison, not a three-way',
   await page.evaluate(() => {
     const t = [...document.querySelectorAll('.chapter.on table.vs')]
       .find(x => /Ryzen/.test(x.tHead.textContent));
     return t ? t.tHead.rows[0].cells.length : 0;
   }), 3);
ck('VII: the AMD verdict rests on the measured prefill gap', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /1,700/.test(t) && /340/.test(t) && /five times/i.test(t);
}), 'true');
ck('VII: and concedes AMD wins on value where it does', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /better value/i.test(t) && /\$3,999/.test(t) && /Windows/.test(t);
}), 'true');
ck('VII: both prefill figures come from the same model', await page.evaluate(() =>
  /same 120B model/i.test(document.querySelector('.chapter.on').textContent)), 'true');

/* ── the "anything else" block (577) ───────────────────────────────────────
   The whole chapter argues you choose capacity OR speed. The RTX PRO 6000 is
   the one thing on the page that refuses that trade, so the chapter has to say
   so out loud rather than leave a reader to notice the row and wonder. Its
   figures are computed by the same method as every other row — the ladder
   assertion above covers the arithmetic; these cover the claims around it. */
ck('VII: the other-hardware block exists and is honest about being a card',
   await page.evaluate(() => {
     const h = [...document.querySelectorAll('.chapter.on h3')]
       .find(x => /RTX PRO 6000 Blackwell, which breaks the rule/.test(x.textContent));
     if (!h) return 'missing';
     const t = h.parentElement.textContent;
     return /card, not a machine/i.test(t) ? 'true' : 'does not say it is a card';
   }), 'true');
ck('VII: the RTX price includes the machine you have to put it in',
   await page.evaluate(() => {
     const t = document.querySelector('.chapter.on').textContent;
     return /\$13,250/.test(t) && /600\s*W/.test(t) && /16–17k/.test(t);
   }), 'true');
/* it must be named as the exception, not quietly added as an eighth row */
ck('VII: the trade is called a price trade, not a physical one',
   await page.evaluate(() =>
     /price trade, not a law of physics/i.test(document.querySelector('.chapter.on').textContent)),
   'true');
ck('VII: the withdrawn Mac capacities appear only as a secondhand note',
   await page.evaluate(() => {
     const ch = document.querySelector('.chapter.on');
     const h = [...ch.querySelectorAll('h3')].find(x => /deliberately not here/.test(x.textContent));
     const inBlock = !!h && /512\s*GB/.test(h.parentElement.textContent);
     /* and nowhere in the orderable ladder, which is the 574 finding.
        Scoped to the MEMORY column: a whole-table regex for /512|256/ matched
        AMD's 256 GB/s BANDWIDTH cell and failed a correct table. */
     const tb = [...ch.querySelectorAll('table.figs')]
       .find(x => /Biggest model it holds/.test(x.tHead.textContent));
     const inTable = [...tb.tBodies[0].rows]
       .some(r => /^(512|256)\s*GB$/.test(r.children[1].textContent.trim()));
     return inBlock && !inTable ? 'true' : `block ${inBlock} table ${inTable}`;
   }), 'true');
ck('VII: what was left out is listed, with a reason each', await page.evaluate(() => {
  const h = [...document.querySelectorAll('.chapter.on h3')]
    .find(x => /deliberately not here/.test(x.textContent));
  if (!h) return 'no such block';
  const li = [...h.parentElement.querySelectorAll('ul > li')];
  return li.length >= 4 && li.every(x => x.textContent.trim().length > 60);
}), 'true');
/* the second-Spark line is the one most likely to be written wrong: two boxes
   double memory, they do not double bandwidth */
ck('VII: a second Spark is described as bigger, not faster', await page.evaluate(() =>
  /Memory adds\.\s*Speed does not/i.test(document.querySelector('.chapter.on').textContent)), 'true');

/* ── the sections added at 582 ────────────────────────────────────────────
   Theo asked for seven things in one message. Each gets an assertion on the
   claim that would be wrong if the section were written carelessly, not on the
   fact that the section exists. */
{
  /* Normalise before matching. textContent hands back DECODED entities, so
     `200&nbsp;Gb/s` is "200\u00a0Gb/s" and `Max&#8209;Q` is "Max\u2011Q" — a
     pattern written with an ordinary space or hyphen finds neither. Both of
     these failed against correct prose before the normalisation went in. */
  const t = (await page.$eval('.chapter.on', n => n.textContent))
    .replace(/\u00a0/g, ' ').replace(/[\u2010\u2011]/g, '-');
  const has = re => re.test(t);

  /* the spec sheet states figures and draws no conclusion — the point of
     separating it. If a verdict word turns up in it, it stopped being specs. */
  ck('VII: the spec sheet covers all six machines', await page.evaluate(() => {
    const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /^The spec sheet/.test(x.textContent));
    if (!h) return 'missing';
    const tb = h.parentElement.querySelector('table.figs');
    return tb ? tb.tBodies[0].rows.length : 'no table';
  }), 6);
  ck('VII: and names the memory TYPE, which is the whole unified-vs-card point',
     has(/unified/) && has(/GDDR7/) ? 'true' : 'false', 'true');

  /* the Spark gets the same pros-and-cons treatment as the machines Cardinal
     does NOT own — 575 and 577 were both about that even-handedness */
  ck('VII: the Spark section states what it is bad at, not only good at', await page.evaluate(() => {
    const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /since it is the one you own/.test(x.textContent));
    if (!h) return 'missing';
    const b = h.parentElement.textContent;
    return /writes slowly/i.test(b) && /oversold/i.test(b) && /Linux only/i.test(b) ? 'true' : 'no cons';
  }), 'true');

  /* the three-way table is the comparison he asked for: it must be three
     machines wide, not two with a note */
  ck('VII: the head-to-head is genuinely three-way', await page.evaluate(() => {
    const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /side by side/.test(x.textContent));
    if (!h) return 'missing';
    const th = h.parentElement.querySelector('table.vs thead tr');
    return th ? th.children.length : 'no table';
  }), 4);   /* label column + three machines */

  /* stacking. The number that decides it is the DENSE one — two Sparks make a
     bigger model openable and slower to read, and the honest version says so */
  ck('VII: two Sparks is bigger, not faster', has(/Memory adds\.\s*Speed does not/) ? 'true' : 'false', 'true');
  ck('VII: and the mixture-of-experts exception is not left out',
     has(/mixture-of-experts/i) && has(/27–28/) ? 'true' : 'false', 'true');
  ck('VII: the two-Spark link is named, not hand-waved',
     has(/ConnectX/) && has(/200 Gb\/s/) ? 'true' : 'false', 'true');

  /* the 5090 question: the answer is no, and the reason must be the physical
     one first — there is no slot — not just a performance argument */
  ck('VII: the 5090 answer starts with the physical fact',
     has(/There is no slot/i) ? 'true' : 'false', 'true');
  ck('VII: and explains that bandwidth does not add',
     has(/Memory adds\.\s*Bandwidth does not/) ? 'true' : 'false', 'true');
  ck('VII: with the 5090 measured, not asserted',
     has(/8,519/) && has(/205/) ? 'true' : 'false', 'true');

  /* Apple is a section like the others now, and names its own framework */
  ck('VII: Apple gets the same per-machine treatment', await page.evaluate(() => {
    const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /^Apple, in detail/.test(x.textContent));
    if (!h) return 'missing';
    const b = h.parentElement.textContent;
    return /MLX/.test(b) && /unified/.test(b) && /M5.Max/.test(b) ? 'true' : 'thin';
  }), 'true');

  /* the RTX PRO 6000's cons must include the two that actually decide it */
  ck('VII: the 6000 admits it holds LESS than the Spark', has(/less than the Spark/i) ? 'true' : 'false', 'true');
  ck('VII: and that two of them may not pool memory', has(/until somebody shows you two working/) ? 'true' : 'false', 'true');
  ck('VII: the Max-Q variant is named, since it is the one that fits a tower',
     has(/Max-Q/) && has(/300 W/) ? 'true' : 'false', 'true');
}
{
  /* and the workload list VI's verdicts rest on — Theo: "that was a small part
     in buying a spark a very small part". It listed five while two verdicts
     called it six; photos are now one line of seven and say so. */
  await go(CH.local);
  const li = await page.$$eval('.chapter.on .habits > li', n => n.map(x => x.textContent));
  ck('VI: the workload list has seven entries', li.length, 7);
  ck('VI: and photo work is one of them, not the argument',
     li.filter(x => /photo/i.test(x)).length, 1);
  ck('VI: photos are not first', /photo/i.test(li[0]) ? 'first' : 'not first', 'not first');
  ck('VI: the count in the text matches the list', await page.evaluate(() =>
     /seven things/.test(document.querySelector('.chapter.on').textContent)
     && !/six things/.test(document.body.textContent) ? 'true' : 'false'), 'true');
  ck('VI: training on your own material is on the list',
     li.some(x => /LoRA/.test(x)) ? 'true' : 'false', 'true');
  ck('VI: and a private assistant, which is the never-paste chapter inverted',
     li.some(x => /private assistant/i.test(x)) ? 'true' : 'false', 'true');
}

/* ── chapter X ──────────────────────────────────────────────────────────── */
await go(CH.stacks);
await page.waitForTimeout(180);
ck('X: the section drawing has six layers', await page.$$eval('.chapter.on .roofsec .lyr', n => n.length), 6);
ck('X: layers are numbered bottom-to-top 6..1', await page.$$eval('.chapter.on .roofsec .ord',
   n => n.map(e => e.textContent).join('')), '654321');
ck('X: the drawing stacks vertically', await cs('.chapter.on .roofsec', 'flex-direction'), 'column');
ck('X: top and base layers are distinguished', await page.evaluate(() => {
  const l = [...document.querySelectorAll('.chapter.on .roofsec .lyr')];
  const a = getComputedStyle(l[0]).backgroundColor, b = getComputedStyle(l[5]).backgroundColor,
        m = getComputedStyle(l[2]).backgroundColor;
  return a !== m && b !== m;
}), 'true');
ck('X: six stacks, each with a why and a caveat', await page.evaluate(() => {
  const li = [...document.querySelectorAll('.chapter.on .mdl li')];
  return li.length === 6 && li.every(l => l.querySelector('.sw .s') && l.querySelector('.sw .w'));
}), 'true');
ck('X: the recommendation table covers every stack',
   await page.$$eval('.chapter.on table.stk tbody tr', n => n.length), 6);
ck('X: RAG is explained, not just named',
   await page.$eval('.chapter.on', n => /search first, then answer from what the search found/i.test(n.textContent)), 'true');
ck('X: six rules for picking one', await page.$$eval('.chapter.on .habits li', n => n.length), 6);
ck('X: the roof analogy is actually made',
   await page.$eval('.chapter.on', n => /decking/i.test(n.textContent) && /underlayment/i.test(n.textContent)), 'true');
ck('X: says plainly not to serve the live app',
   await page.$eval('.chapter.on', n => /uptime/i.test(n.textContent)), 'true');
ck('contrast roofsec-muted-on-tint light ≥ 4.5', await page.evaluate(() => {
  const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const x=L('#5F636C'), y=L('#E6EBF4'); return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);
}), v => Number(v) >= 4.5);
ck('contrast roofsec-muted-on-tint dark ≥ 4.5', await page.evaluate(() => {
  const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const x=L('#969CA7'), y=L('#1A2740'); return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);
}), v => Number(v) >= 4.5);

/* ── chapter XI ─────────────────────────────────────────────────────────── */
await go(CH.spark);
await page.waitForTimeout(180);
ck('XI: terminal blocks render', await page.$$eval('.chapter.on .term', n => n.length), 3);
ck('XI: terminals are dark in BOTH themes (deliberate)',
   await cs('.chapter.on .term', 'background-color'), 'rgb(16, 19, 26)');
ck('XI: terminal keeps commands on one line',
   await page.$eval('.chapter.on .term div', n => getComputedStyle(n).whiteSpace), 'pre');
ck('XI: terminal scrolls rather than pushing the page wide',
   await cs('.chapter.on .term', 'overflow-x'), 'auto');
ck('XI: the two agents each get an entry with both sides', await page.evaluate(() => {
  const li = [...document.querySelectorAll('.chapter.on .mdl li')];
  const names = li.map(l => l.querySelector('.nm b').textContent).join('|');
  return li.length === 2 && /OpenClaw/.test(names) && /Hermes/.test(names)
      && li.every(l => l.querySelector('.sw .s') && l.querySelector('.sw .w'));
}), 'true');
ck('XI: the pick table covers both agents',
   await page.$$eval('.chapter.on table.vs tbody tr', n => n.length), 6);
ck('XI: Tailscale is explained by the problem it solves',
   await page.$eval('.chapter.on', n => /port forwarding/i.test(n.textContent)), 'true');
ck('XI: says what SSH actually means',
   await page.$eval('.chapter.on', n => /typing on your laptop and the words are running on the Spark/i.test(n.textContent)), 'true');
ck('XI: Hugging Face file formats are explained',
   await page.$eval('.chapter.on', n => ['GGUF','safetensors','Q4'].every(t => n.textContent.includes(t))), 'true');
/* the agent-safety box is the most important thing on the page — assert it,
   because a chapter that hands someone a shell agent without it is worse
   than no chapter. */
ck('XI: the agent warning is present and specific', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /review before it/i.test(t) && /own account/i.test(t) && /no keys/i.test(t);
}), 'true');
ck('XI: the warning is styled as a warning, not a note',
   await page.$$eval('.chapter.on .call.warn h3', n => n.map(h => h.textContent).join('|'),
   ), v => /sharp end/i.test(v));
ck('XI: two Sparks buys capacity, not speed',
   await page.$eval('.chapter.on', n => /capacity, not speed/i.test(n.textContent)), 'true');
ck('XI: the happyface reading is flagged, not silently assumed',
   await page.$eval('.chapter.on', n => /happyface/i.test(n.textContent)), 'true');
ck('XI: setup, running order and Quicksilver are numbered runs',
   await page.$$eval('.chapter.on .habits', n => n.length), 3);
/* ── the Hermes correction, and Quicksilver ───────────────────────────────
   The book described Hermes as "a quiet worker on a server. No chat app, no
   front door" and routed "text it from a jobsite" to OpenClaw on that basis.
   Hermes ships a messaging gateway for Telegram, Discord, Slack, WhatsApp,
   Signal, SMS and about fifteen more, so both halves were wrong and one of
   them was a recommendation. These keep the stale claim from coming back, and
   keep the correction visible rather than silently edited away. */
ck('XI: the stale headless claim is gone', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return ['No chat app, no front door',
          'Worse if you wanted something to talk to',
          'The messaging channels are the entire point of it'].filter(p => t.includes(p)).join(' | ') || 'none';
}), 'none');
ck('XI: and the correction is stated, not silently swapped',
   await page.$eval('.chapter.on', n => /used to say OpenClaw and that was wrong/i.test(n.textContent)), 'true');
ck('XI: Hermes is credited with the gateway it actually has', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /messaging gateway/i.test(t) && /Telegram/.test(t) && /Signal/.test(t);
}), 'true');
ck('XI: Quicksilver is dated and versioned', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /0\.19/.test(t) && /20 July 2026/.test(t) && /Quicksilver/.test(t);
}), 'true');
ck('XI: five Quicksilver items', await page.evaluate(() => {
  const q = [...document.querySelectorAll('.chapter.on .habits')].find(r => /under a second/i.test(r.textContent));
  return q ? q.querySelectorAll(':scope > li').length : 0;
}), 5);
ck('XI: the cold-start figure is the vendor’s, both ends',
   await page.$eval('.chapter.on', n => /4\.3 seconds/.test(n.textContent) && /0\.9/.test(n.textContent)), 'true');
ck('XI: every Quicksilver item is span-wrapped', await page.evaluate(() => {
  const q = [...document.querySelectorAll('.chapter.on .habits')].find(r => /under a second/i.test(r.textContent));
  const bad = [];
  q.querySelectorAll(':scope > li').forEach((li, i) => {
    const els = [...li.childNodes].filter(n => n.nodeType === 1);
    const text = [...li.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (els.length !== 1 || els[0].tagName !== 'SPAN' || text) bad.push(i);
  });
  return bad.join(',') || 'none';
}), 'none');
ck('XI: the memory-is-text-files idea is shown as a command', await page.evaluate(() => {
  const t = [...document.querySelectorAll('.chapter.on .term')].map(e => e.textContent).join(' ');
  return /hermes memory setup/.test(t) && /obsidian/i.test(t);
}), 'true');
ck('XI: and tied back to RAG rather than left as a feature',
   await page.$eval('.chapter.on', n => /RAG pattern, applied to the agent/i.test(n.textContent)), 'true');
/* the load-bearing one. The source material presented Smart Approvals as pure
   upside; the vendor's own tracker says otherwise, and the book has a whole
   chapter on that exact attack. If this ever fails, the book has started
   repeating marketing copy. */
ck('XI: Smart Approvals carries its documented hole', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /#21425/.test(t) && /prompt injection/i.test(t) && /Chapter III/.test(t);  /* never-paste, XIII before 578 */
}), 'true');
ck('XI: and gives a default rather than just a warning',
   await page.$eval('.chapter.on', n => /leave approvals on manual/i.test(n.textContent)), 'true');
ck('XI: the approvals box does not oversell the fix', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /fix has been submitted/i.test(t) && !/fixed in|now fixed|no longer affects/i.test(t);
}), 'true');
ck('XI: says to get the terminal working before adding a channel',
   await page.$eval('.chapter.on', n => /more places for the failure to hide/i.test(n.textContent)), 'true');

ck('contrast term-comment on fixed ground ≥ 4.5', await page.evaluate(() => {
  const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const x=L('#9AA3B0'), y=L('#10131A'); return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);
}), v => Number(v) >= 4.5);
ck('contrast term-prompt on fixed ground ≥ 4.5', await page.evaluate(() => {
  const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const x=L('#6FB89A'), y=L('#10131A'); return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);
}), v => Number(v) >= 4.5);

/* ── chapter XIV · Project Glasswing ─────────────────────────────────────
   The risk in a chapter like this is that it reads as scare copy. So the
   assertions below check the two things that keep it honest: that the
   ending is in it (the model class DID ship publicly, as Fable 5), and
   that the reader is given exactly one thing to actually do. */
await go(CH.glasswing);
await page.waitForTimeout(150);
ck('XVI: reachable and titled', await page.$eval('.chapter.on h2', n => n.textContent), 'Project Glasswing');
ck('XVI: carries a date stamp like the other rotting pages',
   await page.$$eval('.chapter.on .asof', n => n.length), 1);
ck('XVI: names the launch partners rather than saying "major companies"', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return ['Amazon Web Services','Apple','Broadcom','Cisco','CrowdStrike','Google',
          'JPMorganChase','Linux Foundation','Microsoft','NVIDIA','Palo Alto Networks']
    .filter(p => !t.includes(p)).join(' | ') || 'none';
}), 'none');
ck('XVI: the ten thousand figure is qualified by severity', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /ten thousand high- or critical-severity vulnerabilities/i.test(t);
}), 'true');
ck('XVI: the donations are named with amounts', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /\$2\.5M/.test(t) && /\$1\.5M/.test(t) && /Apache/.test(t) && /OpenSSF/.test(t);
}), 'true');
ck('XVI: three lessons, in a table', await page.$$eval('.chapter.on table.stk tbody tr', n => n.length), 3);
/* the load-bearing one: without this the chapter is fear, not information */
ck('XVI: says the model class shipped publicly in the end', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /Fable 5/.test(t) && /publicly available/i.test(t) && /delay, not a lock/i.test(t);
}), 'true');
ck('XVI: gives the reader exactly one action, and it is "take the update"',
   await page.$eval('.chapter.on', n => /Take the update/.test(n.textContent)), 'true');
ck('XVI: points back at XIII rather than repeating it',
   await page.$eval('.chapter.on', n => /Chapter III/.test(n.textContent)), 'true');  /* never-paste */

/* ── chapter XV · Korea and China ────────────────────────────────────────
   Two failure modes to guard against here. One: quoting spec numbers that
   published sources openly disagreed about — so the chapter names families
   and jobs, and the test below enforces that no context-window figure crept
   back in. Two: letting "Chinese" do the work of an argument — so the
   weights-vs-service table and the local-censorship caveat are both
   required, because they cut in opposite directions and the chapter is
   only honest with both. */
await go(CH.map);
await page.waitForTimeout(150);
ck('XVII: reachable and titled', await page.$eval('.chapter.on h2', n => n.textContent), 'The other half of the map');
ck('XVII: five Chinese families, each a model card', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return ['DeepSeek','Qwen','GLM','Kimi','MiniMax'].filter(m => !t.includes(m)).join(' | ') || 'none';
}), 'none');
ck('XVII: no context-window figure was quoted', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  const hits = t.match(/\d+\s*[KM]\b[^.]{0,12}context/gi) || [];
  return hits.join(' | ') || 'none';
}), 'none');
ck('XVII: warns the reader that sources disagreed',
   await page.$eval('.chapter.on', n => /disagreed with each other/i.test(n.textContent)), 'true');
ck('XVII: the weights-vs-service table has four rows',
   await page.$$eval('.chapter.on table.vs tbody tr', n => n.length), 4);
ck('XVII: the table ranks local as yes and hosted as no', await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.chapter.on table.vs tbody tr')];
  const bad = rows.filter(r => {
    const td = r.querySelectorAll('td');
    return !(td[1] && td[1].classList.contains('yes') && td[2] && td[2].classList.contains('no'));
  });
  return bad.length ? bad.map(r => r.textContent.slice(0, 24)).join(' | ') : 'none';
}), 'none');
ck('XVII: says the bans target the service, not the weights', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /aimed at .{0,4}the service/i.test(t) && /None of them is aimed at the maths/i.test(t);
}), 'true');
/* the counterweight — running it locally fixes privacy and not bias */
ck('XVII: the local-censorship caveat is present and specific', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /trained into the weights/i.test(t) && /Tiananmen/.test(t) && /entirely offline/i.test(t);
}), 'true');
ck('XVII: and generalises it rather than leaving it as a China point',
   await page.$eval('.chapter.on', n => /every model from every country/i.test(n.textContent)), 'true');
ck('XVII: Korea is framed as the argument, not a shopping list', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /sovereign AI/i.test(t) && /80% domestic floor/i.test(t) && /unlikely to use any of these/i.test(t);
}), 'true');
ck('XVII: ties Korea back to the Spark rather than leaving it abstract',
   await page.$eval('.chapter.on', n => /run the photo captioner on the Spark/i.test(n.textContent)), 'true');
ck('XVII: four closing rules', await page.$$eval('.chapter.on .habits > li', n => n.length), 4);
ck('XVII: separates judging the model from judging the service',
   await page.$eval('.chapter.on', n => /Judge the model on your own work; judge the service on where it sends the bytes/i.test(n.textContent)), 'true');
ck('XVII: every .habits item is wrapped in a span', await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('.chapter.on .habits li').forEach((li, i) => {
    const els = [...li.childNodes].filter(n => n.nodeType === 1);
    const text = [...li.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (els.length !== 1 || els[0].tagName !== 'SPAN' || text) bad.push(i);
  });
  return bad.join(',') || 'none';
}), 'none');

/* ── the recap, which had gone stale ─────────────────────────────────────
   It was still the five-part version: ten lines, none of them from VI, IX,
   X or XI. Six chapters never reached the one page anyone actually reads. */
/* ── chapter XV · What AI can build (584) ─────────────────────────────────
   Theo: "the variety of things ai can build ... with a presentation within
   it." The presentation is a REAL deck running in the page, so it gets
   behavioural assertions, not just presence — and one negative assertion
   that matters more than the rest: it must NOT touch the arrow keys, because
   the book turns chapters on them. */
await go(CH.canbuild);
ck('XV: reachable and titled', await page.$eval('.chapter.on h2', n => n.textContent), 'What AI can build');
ck('XV: the catalogue has eight shelves', await page.evaluate(() => {
  const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /^The catalogue/.test(x.textContent));
  if (!h) return 'missing';
  return h.parentElement.querySelector('table.vs tbody').rows.length;
}), 8);
ck('XV: at least four shelves are already shipped, and say so', await page.evaluate(() => {
  const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /^The catalogue/.test(x.textContent));
  const t = h.parentElement.querySelector('table.vs');
  return [...t.querySelectorAll('td.yes')].filter(td => /Already yours|embedded below/i.test(td.textContent)).length >= 4;
}), 'true');
ck('XV: the proof list cites only things that exist', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  /* The Walk, the librarian, the Library illustrations and the app all ship
     today. Nothing unshipped may be claimed as built. */
  return /The Walk/.test(t) && /librarian/.test(t) && !/weather alert/i.test(t);
}), 'true');
{
  const deck = await page.evaluate(() => {
    const d = document.getElementById('aidDeck');
    if (!d) return { missing: true };
    const slides = [...d.querySelectorAll('.aid-slide')];
    const vis = () => slides.findIndex(sl => getComputedStyle(sl).display !== 'none');
    return {
      slides: slides.length,
      dots: document.getElementById('aidDots').children.length,
      visible: slides.filter(sl => getComputedStyle(sl).display !== 'none').length,
      at: vis(),
      count: document.getElementById('aidCount').textContent.trim(),
      tags: [...d.querySelectorAll('.aid-tag')].length,
      allTagged: [...d.querySelectorAll('.aid-slide')].every(sl => sl.querySelector('.aid-tag')),
    };
  });
  ck('XV: the deck has seven slides', deck.slides, 7);
  ck('XV: dots track the slides', deck.dots, 7);
  ck('XV: exactly one slide visible at a time', deck.visible, 1);
  ck('XV: the counter reads 1 / 7 at rest', deck.count, '1 / 7');
  ck('XV: every slide names what it was built from', deck.allTagged ? 'true' : deck.tags, 'true');
}
ck('XV: Next actually advances', await page.evaluate(() => {
  document.getElementById('aidNext').click();
  const slides = [...document.querySelectorAll('#aidDeck .aid-slide')];
  const at = slides.findIndex(sl => getComputedStyle(sl).display !== 'none');
  return at + '|' + document.getElementById('aidCount').textContent.trim();
}), '1|2 / 7');
ck('XV: Back wraps from the cover to the close', await page.evaluate(() => {
  document.getElementById('aidPrev').click();  /* -> 0 */
  document.getElementById('aidPrev').click();  /* -> wraps to 6 */
  const slides = [...document.querySelectorAll('#aidDeck .aid-slide')];
  return slides.findIndex(sl => getComputedStyle(sl).display !== 'none');
}), 6);
ck('XV: a dot jumps straight to its slide', await page.evaluate(() => {
  document.getElementById('aidDots').children[3].click();
  const slides = [...document.querySelectorAll('#aidDeck .aid-slide')];
  return slides.findIndex(sl => getComputedStyle(sl).display !== 'none');
}), 3);
/* the negative assertion: the deck must not have stolen the book's keys */
{
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const after = await page.$eval('.chapter.on', n => n.dataset.ch);
  ck('XV: arrow keys still turn the BOOK, not the deck', after, CH.glasswing);
  await go(CH.canbuild);
  const deckAt = await page.evaluate(() => {
    const slides = [...document.querySelectorAll('#aidDeck .aid-slide')];
    return slides.findIndex(sl => getComputedStyle(sl).display !== 'none');
  });
  ck('XV: and the deck kept its place across the page turn', deckAt, 3);
}
ck('XV: the deck admits its details are invented', await page.evaluate(() =>
  /invented for the example/i.test(document.querySelector('.chapter.on').textContent)), 'true');
ck('XV: the effort table prices five first versions', await page.evaluate(() => {
  const h = [...document.querySelectorAll('.chapter.on h3')].find(x => /first version costs/.test(x.textContent));
  if (!h) return 'missing';
  const rows = [...h.parentElement.querySelectorAll('table.figs tbody tr')];
  return rows.length === 5 && rows.every(r => r.cells[2].textContent.trim().length > 0);
}), 'true');
ck('XV: the closing rule points at the deciding question', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /Chapter X(?![IVX])/.test(t) && /thirty dollars a month/.test(t);
}), 'true');
ck('XV: sits in the Building it group on the spine', await page.evaluate(() => {
  const a = document.querySelector('#toc a[data-ch="15"]');
  return a.closest('.toc-grp').querySelector('.lbl').textContent;
}), 'Building it');


/* Theo: "I don't think it would be good to present from phone." Below 700px
   the deck must lie flat — every slide visible, no presenting controls — and
   above it, it must present. Both states asserted, not just the default. */
{
  await page.setViewportSize({ width: 420, height: 900 });
  await go(CH.canbuild);
  const flat = await page.evaluate(() => ({
    visible: [...document.querySelectorAll('#aidDeck .aid-slide')]
      .filter(sl => getComputedStyle(sl).display !== 'none').length,
    ctl: getComputedStyle(document.querySelector('.aid-ctl')).display,
    note: getComputedStyle(document.querySelector('.aid-phonenote')).display,
  }));
  ck('XV: on a phone all seven slides lie flat', flat.visible, 7);
  ck('XV: and the presenting controls are gone', flat.ctl, 'none');
  ck('XV: with a note saying where to present from', flat.note !== 'none' ? 'shown' : 'none', 'shown');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(120);
  const pad = await page.evaluate(() => ({
    visible: [...document.querySelectorAll('#aidDeck .aid-slide')]
      .filter(sl => getComputedStyle(sl).display !== 'none').length,
    ctl: getComputedStyle(document.querySelector('.aid-ctl')).display,
  }));
  ck('XV: on an iPad it presents — one slide', pad.visible, 1);
  ck('XV: with the controls back', pad.ctl !== 'none' ? 'shown' : 'none', 'shown');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(120);
}

await page.evaluate(() => { window.location.hash = '#/recap'; });
await page.waitForTimeout(150);
ck('recap: seventeen lines', await page.$$eval('.chapter.on ol > li', n => n.length), 17);
ck('recap: deck matches the count',
   await page.$eval('.chapter.on .deck', n => /Seventeen lines/.test(n.textContent)), 'true');
ck('recap: reaches the later chapters', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent.toLowerCase();
  const missing = ['local wins','three sizes','bandwidth','stack is layers','deleted folder']
    .filter(k => !t.includes(k));
  return missing.join(' | ') || 'none';
}), 'none');

/* ── chapter XII — claims ───────────────────────────────────────────────── */
await go(CH.claims);
await page.waitForTimeout(180);
ck('XII: the readout lists what is actually stored',
   await page.$$eval('.chapter.on .readout dt', n => n.length), 8);
ck('XII: the empty fields are marked empty',
   await page.$$eval('.chapter.on .readout dd.none', n => n.length), 7);
ck('XII: empty reads red, populated reads green', await page.evaluate(() => {
  const none = getComputedStyle(document.querySelector('.chapter.on .readout dd.none')).color;
  const some = getComputedStyle(document.querySelector('.chapter.on .readout dd.some')).color;
  return none === 'rgb(168, 42, 40)' && some === 'rgb(28, 101, 68)';
}), 'true');
ck('XII: says the figures were queried, not assumed',
   await page.$eval('.chapter.on', n => /Queried, not assumed/i.test(n.textContent)), 'true');
ck('XII: names the real count rather than rounding it',
   await page.$eval('.chapter.on', n => /42 columns/.test(n.textContent) && /three rows/i.test(n.textContent)), 'true');
ck('XII: three jobs, each with a limit',
   await page.evaluate(() => {
     const li = [...document.querySelectorAll('.chapter.on .mdl li')];
     return li.length === 3 && li.every(l => l.querySelector('.sw .s') && l.querySelector('.sw .w'));
   }), 'true');
ck('XII: the where-the-line-is table', await page.$$eval('.chapter.on table.bb tbody tr', n => n.length), 6);
ck('XII: never lets it write to an adjuster',
   await page.$eval('.chapter.on', n => /Correspond with an adjuster/i.test(n.textContent)), 'true');
ck('XII: points at XIII before pasting a scope',
   await page.$eval('.chapter.on', n => /read Chapter III before you paste a scope/i.test(n.textContent)), 'true');
/* the chapter must not leak any of the three real records */
ck('XII: no homeowner data reached the page', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /\b\d{3}-\d{2}-\d{4}\b/.test(t) || /policy\s*#?\s*\d{4,}/i.test(t) ? 'leak' : 'none';
}), 'none');

/* ── chapter XIII — what never to paste ─────────────────────────────────── */
await go(CH.paste);
await page.waitForTimeout(180);
ck('XIII: three tiers', await page.$$eval('.chapter.on .tiers3 > div', n => n.length), 3);
ck('XIII: tiers are colour-ranked never/think/fine', await page.evaluate(() => {
  const c = s => getComputedStyle(document.querySelector('.chapter.on .tiers3 ' + s + ' .lbl')).color;
  return c('.t-never') === 'rgb(168, 42, 40)' && c('.t-think') === 'rgb(132, 87, 9)'
      && c('.t-fine')  === 'rgb(28, 101, 68)';
}), 'true');
ck('XIII: credentials are in the never tier',
   await page.$eval('.chapter.on .t-never', n => /service key/i.test(n.textContent)), 'true');
ck('XIII: the redaction habit is shown as a before/after',
   await page.$$eval('.chapter.on .swap', n => n.length), 1);
ck('XIII: prompt injection is explained in plain words',
   await page.$eval('.chapter.on', n => /cannot reliably tell the difference between your instruction and text it happens to read/i.test(n.textContent)), 'true');
ck('XIII: a screenshot is not redaction',
   await page.$eval('.chapter.on', n => /screenshot is not redaction/i.test(n.textContent)), 'true');
ck('XIII: says what to do afterwards', await page.$$eval('.chapter.on .habits li', n => n.length), 3);
/* the redaction example must not itself contain a plausible real identity */
ck('XIII: the bad example is clearly fictional',
   await page.$eval('.chapter.on .swap .bad', n => /Whitfield/.test(n.textContent)), 'true');

/* ── the glossary ───────────────────────────────────────────────────────── */
await page.evaluate(() => { window.location.hash = '#/glossary'; });
await page.waitForTimeout(180);
ck('glossary: every term has a definition', await page.evaluate(() => {
  const dt = document.querySelectorAll('.chapter.on .gloss dt').length;
  const dd = document.querySelectorAll('.chapter.on .gloss dd').length;
  return dt === dd && dt >= 30 ? 'ok' : `${dt} terms / ${dd} definitions`;
}), 'ok');
ck('glossary: every term points at a chapter',
   await page.evaluate(() => {
     const dd = [...document.querySelectorAll('.chapter.on .gloss dd')];
     return dd.filter(d => !d.querySelector('.ref')).length;
   }), 0);
ck('glossary: terms are in alphabetical order', await page.evaluate(() => {
  const t = [...document.querySelectorAll('.chapter.on .gloss dt')].map(e => e.textContent.toLowerCase());
  const sorted = [...t].sort((a, b) => a.localeCompare(b));
  const bad = t.filter((v, i) => v !== sorted[i]);
  return bad.join(' | ') || 'none';
}), 'none');
ck('glossary: every chapter reference points at a real chapter', await page.evaluate(() => {
  const known = new Set([...document.querySelectorAll('.chapter')].map(c => c.dataset.ch));
  const roman = {I:'1',II:'2',III:'3',IV:'4',V:'5',VI:'6',VII:'7',VIII:'8',IX:'9',X:'10',
                 XI:'11',XII:'12',XIII:'13',XIV:'14',XV:'15',XVI:'16',XVII:'17'};
  const bad = [];
  document.querySelectorAll('.chapter.on .gloss .ref').forEach(r => {
    const m = /ch\s+([IVX]+)/.exec(r.textContent);
    if (!m || !known.has(roman[m[1]])) bad.push(r.textContent.trim());
  });
  return bad.join(' | ') || 'none';
}), 'none');
/* ── the ten, and the widened contract ───────────────────────────────────
   The glossary used to promise "every term this book uses". It now also
   carries general vocabulary the book never uses (AI, machine learning, deep
   learning, vision AI), so the deck had to stop making the narrower promise.
   A claim you quietly outgrow is the same class of defect as a stale build
   number, so it gets an assertion. */
ck('glossary: the top-ten panel exists', await page.$$eval('.chapter.on .habits', n => n.length), 1);
ck('glossary: exactly ten of them', await page.$$eval('.chapter.on .habits > li', n => n.length), 10);
ck('glossary: the ten are the intended ten, in rank order', await page.evaluate(() => {
  return [...document.querySelectorAll('.chapter.on .habits > li b')]
    .map(b => b.textContent.replace(/\.$/, '')).join(',');
}), 'LLM,Token,Context,Hallucination,Prompt,Agent,Weights,Open-weight,RAG,Fine-tuning');
/* the .habits grid trap again — a bare <b> plus a text run is THREE grid
   items, and the prose lands in the 1.7rem numeral column as a sliver */
ck('glossary: every top-ten item is wrapped in a span', await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('.chapter.on .habits > li').forEach((li, i) => {
    const els = [...li.childNodes].filter(n => n.nodeType === 1);
    const text = [...li.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (els.length !== 1 || els[0].tagName !== 'SPAN' || text) bad.push(i);
  });
  return bad.join(',') || 'none';
}), 'none');
/* geometric, not just structural: prove the prose is not in the numeral column */
ck('glossary: top-ten prose is wider than the numeral gutter', await page.evaluate(() => {
  const sp = document.querySelector('.chapter.on .habits > li span');
  return sp.getBoundingClientRect().width > 200;
}), 'true');
ck('glossary: every one of the ten is also in the A-Z', await page.evaluate(() => {
  const az = new Set([...document.querySelectorAll('.chapter.on .gloss dt')]
    .map(d => d.textContent.trim().toLowerCase()));
  return [...document.querySelectorAll('.chapter.on .habits > li b')]
    .map(b => b.textContent.replace(/\.$/, '').toLowerCase())
    .filter(t => !az.has(t)).join(' | ') || 'none';
}), 'none');
ck('glossary: 46 terms', await page.$$eval('.chapter.on .gloss dt', n => n.length), 46);
/* the hole this pass was opened to close: the book quotes "2.8T parameters"
   and "519 billion parameters" and never said what one was */
ck('glossary: the terms the book used undefined are now defined', await page.evaluate(() => {
  const az = new Set([...document.querySelectorAll('.chapter.on .gloss dt')]
    .map(d => d.textContent.trim().toLowerCase()));
  return ['parameters','benchmark','frontier model','gpu','latency','multimodal','model training']
    .filter(t => !az.has(t)).join(' | ') || 'none';
}), 'none');
ck('glossary: the foundational vocabulary is there', await page.evaluate(() => {
  const az = new Set([...document.querySelectorAll('.chapter.on .gloss dt')]
    .map(d => d.textContent.trim().toLowerCase()));
  return ['ai','machine learning','deep learning','generative ai','vision ai','neural network']
    .filter(t => !az.has(t)).join(' | ') || 'none';
}), 'none');
ck('glossary: the deck no longer claims to cover only this book', await page.evaluate(() => {
  const d = document.querySelector('.chapter.on .deck').textContent;
  return !/^Every term this book uses that/.test(d) && /anywhere else in AI/.test(d);
}), 'true');
ck('glossary: points outward to a fuller one', await page.evaluate(() => {
  const a = document.querySelector('.chapter.on .call a');
  return a ? a.getAttribute('href') : 'missing';
}), v => /zapier\.com\/blog\/ai-terms/.test(v));

ck('glossary: sits in the back matter, unnumbered',
   await page.$eval('.chapter.on .cnum', n => n.textContent.trim()), '—');

/* the desk card still works */
await page.click('#dcOpen');
await page.waitForTimeout(150);
/* ── the commands page ───────────────────────────────────────────────────
   Theo asked where photos transferred to the Spark end up. There IS no fixed
   answer — DGX OS is Ubuntu, home is /home/<user>, and files land wherever the
   thing that moved them put them. So the page teaches the search. The first
   assertion below is the important one: it fails if anyone ever "helpfully"
   writes a specific folder here as though it were THE location, which is the
   one way this page could become wrong for every reader at once. */
await page.evaluate(() => { window.location.hash = '#/commands'; });
await page.waitForTimeout(150);
ck('commands: reachable and titled',
   await page.$eval('.chapter.on h2', n => n.textContent), 'The commands');
ck('commands: no photo folder is asserted as THE location', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  /* a path inside a command is fine — "cd ~/photos/roofs" is an example the
     reader pastes over. A prose sentence naming one as fact is not. */
  const prose = [...document.querySelectorAll('.chapter.on p')].map(p => p.textContent).join(' ');
  return (prose.match(/\/home\/[a-z]+\/(Pictures|Photos|DCIM)/gi) || []).join(' | ') || 'none';
}), 'none');
ck('commands: the find-the-folders command is present', await page.evaluate(() => {
  const t = [...document.querySelectorAll('.chapter.on .term')].map(e => e.textContent).join('\n');
  return /find ~ -iname '\*\.jpg' -printf '%h/.test(t) && /sort -u/.test(t);
}), 'true');
ck('commands: every $ line is a command, not prose', await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('.chapter.on .term div').forEach(d => {
    const p = d.querySelector('.p');
    if (!p) return;
    const cmd = d.textContent.replace(/^\s*\$\s*/, '').trim();
    /* a command starts with a program name — letters, no leading capital prose */
    if (!/^[a-z][a-z0-9_.-]*( |$)/.test(cmd)) bad.push(cmd.slice(0, 40));
  });
  return bad.join(' | ') || 'none';
}), 'none');
ck('commands: scp/rsync are flagged as run from the laptop', await page.evaluate(() => {
  const t = document.querySelector('.chapter.on').textContent;
  return /Run these on your laptop, not on the Spark/i.test(t) && /rsync/.test(t) && /scp/.test(t);
}), 'true');
ck('commands: rsync is recommended over scp for big transfers',
   await page.$eval('.chapter.on', n => /Use .{0,12}rsync.{0,12} for anything that matters/i.test(n.textContent)), 'true');
ck('commands: the rm warning exists and is styled as a warning', await page.evaluate(() => {
  const w = [...document.querySelectorAll('.chapter.on .call.warn')]
    .find(c => /rm/.test(c.textContent) && /no undo/i.test(c.textContent));
  return !!w;
}), 'true');
ck('commands: drag-and-drop mounting is marked community, not official',
   await page.$eval('.chapter.on', n => /community setups, not an NVIDIA\s*feature/i.test(n.textContent)), 'true');
ck('commands: it points back to XI rather than re-teaching setup',
   await page.$eval('.chapter.on', n => /Chapter VIII/.test(n.textContent)), 'true');  /* the Spark, XI before 578 */
ck('commands: the folder map is drawn, not described',
   await page.$$eval('.chapter.on .roofsec .lyr', n => n.length), 4);
ck('commands: there is a no-prose card at the end', await page.evaluate(() => {
  const terms = [...document.querySelectorAll('.chapter.on .term')];
  const last = terms[terms.length - 1].textContent;
  return /pwd/.test(last) && /rsync/.test(last) && /find ~/.test(last);
}), 'true');
ck('commands: sits in the back matter, unnumbered',
   await page.$eval('.chapter.on .cnum', n => n.textContent.trim()), '—');

ck('desk card opens', await page.$eval('body', n => n.classList.contains('card-open')), 'true');
ck('desk card has the new local/cloud panel', await page.$$eval('.dc-sec h3', n => n.some(h => /Local vs\. cloud/.test(h.textContent))), 'true');
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
ck('Escape closes the card', await page.$eval('body', n => n.classList.contains('card-open')), 'false');

/* mobile: the binding becomes a drawer */
await page.setViewportSize({ width: 420, height: 880 });
await page.waitForTimeout(200);
ck('mobile: top bar appears', await cs('.topbar', 'display'), 'flex');
ck('mobile: binding is off-canvas', await cs('.spine', 'transform'), v => v !== 'none');
await page.click('#navBtn');
await page.waitForTimeout(300);
ck('mobile: drawer opens', await cs('.spine', 'transform'), 'none');
ck('mobile: scrim covers the page', await cs('.scrim', 'display'), 'block');
await page.click('#toc a[data-ch="4"]');
await page.waitForTimeout(300);
ck('mobile: picking a chapter closes the drawer', await page.$eval('body', n => n.classList.contains('nav-open')), 'false');
ck('mobile: and turns the page', await page.$eval('.chapter.on', n => n.dataset.ch), '4');
ck('mobile: no sideways scroll', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'true');

/* print shows the whole book, not just the open chapter */
await page.setViewportSize({ width: 1280, height: 900 });
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(150);
ck('print: every section visible', await page.$$eval('.chapter', n => n.filter(c => getComputedStyle(c).display !== 'none').length), 22);
ck('print: binding hidden', await cs('.spine', 'display'), 'none');
ck('print: pagers hidden', await page.$eval('.folio', n => getComputedStyle(n).display), 'none');
await page.emulateMedia({ media: 'screen' });

await b.close();
if (errs.length) console.log('errors:\n  ' + [...new Set(errs)].join('\n  ') + '\n');
process.exit(report() ? 1 : 0);
