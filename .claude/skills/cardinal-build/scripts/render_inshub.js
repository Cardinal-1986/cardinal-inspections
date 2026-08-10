/* Build 675 — Insurance Clients at the top of the insurance hub.

   This is a LAYOUT change, and this project's rule is that a CSS rule can
   parse, balance and never apply — only a real engine sees it. jsdom returns
   rgba(0,0,0,0) for shorthand var() and cannot lay out a grid. So this runs in
   CHROMIUM and asserts POSITION, not markup order.

   The markup is LIFTED FROM THE ARTIFACT — the real innerHTML expression is
   sliced out and evaluated with stub data — never retyped, so pointing this at
   an older build genuinely tests that build. That is also what makes the
   POSITIONAL DIFFERENTIAL honest: the previous artifact is rendered by the
   same code path, in the same engine, at the same width, and the two sets of
   coordinates are compared. "It moved up" is then a measurement, not a claim.

   Usage: node render_inshub.js [index.html] [previous-index.html]
   Point argv[2] at 674 as the negative control — must go red.               */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const IDX = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const PREVF = process.argv[3] ? path.resolve(process.argv[3]) : null;

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };
function red(why) {
  console.log('  ✗ ' + IDX + ': ' + why);
  console.log('\nRENDER: RED (this artifact predates 675)');
  process.exit(1);
}

/* pull the hub's stylesheet and its real innerHTML expression out of an
   artifact. Used for BOTH the live file and the previous one — one extractor,
   so a difference in the numbers is a difference in the app. */
function extract(file) {
  const src = fs.readFileSync(file, 'utf8');
  const styles = []; let i = 0;
  while ((i = src.indexOf('<style', i)) !== -1) {
    const s = src.indexOf('>', i) + 1, e = src.indexOf('</style>', s);
    if (e === -1) break;
    styles.push(src.slice(s, e)); i = e;
  }
  const a = src.indexOf("host.innerHTML =\n'<div class=\"cr-cth-wrap\">");
  if (a < 0) return null;
  const start = src.indexOf('=', a) + 1;
  const end = src.indexOf("'</div></div>';", start);
  if (end < 0) return null;
  return { css: styles.join('\n'), tpl: src.slice(start, end + "'</div></div>'".length) };
}

/* render one artifact at one width and measure it */
async function measure(br, art, w, theme, shot) {
  const p = await br.newPage({ viewport: { width: w, height: 844 } });
  /* The host has to BE the real one. 21 of the hub's rules are scoped
     `#cardinalTruthView .cr-cth-…`, and the page ground comes from
     `#cardinalTruthView .ins-body.cr-cth` — render into a bare <div> and those
     never apply, so the picture is not the app's. */
  await p.setContent('<!doctype html><html' + (theme === 'light' ? ' data-theme="rb-light"' : '') +
    '><head><style>' + art.css + '</style></head><body style="margin:0">' +
    '<div id="cardinalTruthView"><div class="ins-body cr-cth" id="host"></div></div></body></html>');

  const r = await p.evaluate(({ tpl }) => {
    /* stub only the DATA the template interpolates; the MARKUP is the
       artifact's own. The two stub heights below stand in for the pipeline
       rail and the carrier list, which are rendered elsewhere — they are
       IDENTICAL across both artifacts, so they cancel in the differential. */
    const d = { total: 5, denied: 1, acvReleased: 35116, dedDue: 2500, dedCount: 2 };
    const usd = n => '$' + Number(n || 0).toLocaleString();
    const esc = s => String(s == null ? '' : s);
    const owed = 28727, owedClaims = 1, avg = 0, stats = null;
    const chaseHtml = '<div class="cr-cth-chaseempty">Nothing waiting on a carrier right now.</div>';
    const railHtml = '<div style="height:420px">rail</div>';
    const carrierHtml = '<div style="height:120px">carriers</div>';
    const calHtml = '<div style="height:120px">week</div>';
    // eslint-disable-next-line no-new-func
    const html = new Function('d', 'usd', 'esc', 'owed', 'owedClaims', 'avg', 'stats',
      'chaseHtml', 'railHtml', 'carrierHtml', 'calHtml', 'return (' + tpl + ');')(
        d, usd, esc, owed, owedClaims, avg, stats, chaseHtml, railHtml, carrierHtml, calHtml);
    document.getElementById('host').innerHTML = html;

    const q = s => document.querySelector(s);
    const box = e => e ? e.getBoundingClientRect() : null;
    const top = e => { const b = box(e); return b ? Math.round(b.top + window.scrollY) : null; };
    /* the lead button in 675; ABSENT in 674 — that absence is the control */
    const leadWrap = q('.cr-cth-tools.lead');
    const lead = q('.cr-cth-tools.lead button[data-go="clients"]');
    const tools = q('.cr-cth-tools:not(.lead)');
    const lb = box(lead), lw = box(leadWrap);
    /* the hub is a GRID: at wide widths b1 and b2 sit side by side, so
       "above the pipeline" is only a meaningful question in single-column
       layout. Measure the column count instead of assuming one. */
    const grid = q('.cr-cth-grid');
    const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 1;
    return {
      columns: cols,
      hasLead: !!lead,
      leadText: lead ? lead.innerText.replace(/\s+/g, ' ').trim() : null,
      leadTop: top(lead),
      leadWidth: lb ? Math.round(lb.width) : null,
      /* full width means spanning its OWN grid container, not the page wrap —
         b1 has padding, so comparing to the wrap measures the padding */
      leadContainerWidth: lw ? Math.round(lw.width) : null,
      chaseTop: top(q('.cr-cth-chase')),
      railTop: top(q('.cr-cth-rail')),
      toolsTop: top(tools),
      statsTop: top(q('.cr-cth-stats')),
      statsBottom: (() => { const b = box(q('.cr-cth-stats')); return b ? Math.round(b.bottom + window.scrollY) : null; })(),
      wrapWidth: Math.round(box(q('.cr-cth-wrap')).width),
      clientsButtons: document.querySelectorAll('[data-go="clients"]').length,
      toolButtons: tools ? tools.querySelectorAll('button').length : 0,
      toolGos: tools ? [...tools.querySelectorAll('[data-go]')].map(b => b.dataset.go) : [],
      chaseInTools: !!(tools && tools.querySelector('.cr-cth-chase')),
      overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      docHeight: document.documentElement.scrollHeight
    };
  }, { tpl: art.tpl });

  /* the hub's cards enter at opacity:0 with a staggered crCthRise animation
     (up to .68s of delay). Shoot before that settles and every card is
     invisible — which looked like a rendering bug the first time round. */
  await p.waitForTimeout(1400);
  if (shot) await p.screenshot({ path: SHOT + shot, fullPage: true });
  await p.close();
  return r;
}

(async () => {
  const live = extract(IDX);
  if (!live) red('could not slice the hub innerHTML expression');
  if (live.tpl.indexOf('cr-cth-tools lead') < 0) red('no lead button in the hub template');

  const prevArt = PREVF ? extract(PREVF) : null;
  if (PREVF && !prevArt) {
    console.log('  ✗ could not slice the hub out of the previous artifact: ' + PREVF);
    process.exit(1);
  }

  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const results = {};
  /* "default" is deliberately NOT called "dark": Cardinal Claims grounds on
     its own --ct-* palette, which is light in both states, so labelling the
     un-stamped run "dark" would print a false line. The pair still matters —
     it proves rb-light does not move the layout. */
  const PHONE = 'phone 390 default';
  for (const [label, w, theme] of [[PHONE, 390, 'default'], ['phone 390 rb-light', 390, 'light'],
                                   ['iPad 1194 rb-light', 1194, 'light'], ['desktop 1600 rb-light', 1600, 'light']]) {
    results[label] = await measure(br, live, w, theme, 'inshub-' + w + '-' + theme + '.png');
  }
  /* the previous build, same engine, same width, same stub data */
  const PREV = prevArt ? await measure(br, prevArt, 390, 'default', 'inshub-prev-390.png') : null;
  await br.close();

  console.log('\n── the swap, measured in a real engine ──');
  for (const [label, r] of Object.entries(results)) {
    const probs = [];
    if (!r.hasLead) probs.push('no lead button');
    /* the swap itself — true in any layout */
    if (r.chaseTop == null || r.leadTop >= r.chaseTop) probs.push('lead is not above the chase list');
    if (r.toolsTop == null || r.leadTop >= r.toolsTop) probs.push('lead is not above the Tools grid');
    /* "above the pipeline" only means something when they share a column */
    if (r.columns === 1 && (r.railTop == null || r.leadTop >= r.railTop))
      probs.push('single-column: lead is not above the pipeline');
    /* full width = spans its own grid, i.e. both columns */
    if (r.leadWidth < r.leadContainerWidth - 2)
      probs.push('lead does not span both columns (' + r.leadWidth + ' of ' + r.leadContainerWidth + ')');
    if (r.overflowsX) probs.push('page scrolls sideways');
    console.log((probs.length ? '  ✗ ' : '  ✓ ') + label + '  ' + r.columns + '-col' +
      '  lead@' + r.leadTop + 'px  rail@' + r.railTop + 'px  chase@' + r.chaseTop +
      'px  span ' + r.leadWidth + '/' + r.leadContainerWidth);
    if (probs.length) { fail++; console.log('      ' + probs.join(' · ')); } else pass++;
  }

  const phone = results[PHONE];
  console.log('\n── the thing Theo actually complained about ──');
  /* NOT an absolute "above the fold" claim: this render has no app chrome
     (status bar, header, search, nav tabs — several hundred px on his phone),
     so any viewport-relative promise from here would be a number I cannot
     stand behind. What IS measurable is the SWAP — where the button sits now
     versus where the chase list sat before, both measured, same engine. */
  if (PREV) {
    console.log('  (previous artifact: ' + PREVF + ')');
    console.log('  674: chase@' + PREV.chaseTop + '  clients tile@' + PREV.toolsTop +
      '+  page ' + PREV.docHeight + 'px');
    console.log('  675: lead@' + phone.leadTop + '  chase@' + phone.chaseTop +
      '  page ' + phone.docHeight + 'px');
    ok('674 really did put the chase list in the top slot (the control is a control)',
      PREV.chaseTop != null && PREV.chaseTop < 700 && !PREV.hasLead,
      'chase@' + PREV.chaseTop + ', hasLead=' + PREV.hasLead);
    ok('the lead button now sits where the chase list used to, to within a few px',
      Math.abs(phone.leadTop - PREV.chaseTop) < 40,
      'lead now @' + phone.leadTop + ' vs chase was @' + PREV.chaseTop);
    ok('…and the chase list moved DOWN by a real distance, not a nudge',
      phone.chaseTop - PREV.chaseTop > 400,
      'chase ' + PREV.chaseTop + ' → ' + phone.chaseTop);
    ok('…while the figures above the swap did not move',
      PREV.statsTop != null && phone.statsTop === PREV.statsTop,
      'stats top ' + PREV.statsTop + ' → ' + phone.statsTop);
    /* The page is TALLER, and that is the honest cost of the swap: seven tiles
       in a two-column grid still needs four rows, so moving one tile out of
       Tools freed no height there, while the new lead button adds a full-width
       row. Bounded, named, and not hidden behind an absolute-value window. */
    ok('the page grew by about one button row and no more — nothing was duplicated',
      phone.docHeight > PREV.docHeight && phone.docHeight - PREV.docHeight < 130,
      'page height ' + PREV.docHeight + ' → ' + phone.docHeight +
      '  (+' + (phone.docHeight - PREV.docHeight) + 'px)');
  } else {
    ok('the previous artifact was supplied for the positional differential', false,
      'pass it as argv[3] — this is not being skipped silently');
  }
  ok('the button sits directly under the figures, nothing wedged between',
    phone.statsBottom != null && phone.leadTop - phone.statsBottom < 40,
    'stats end @' + phone.statsBottom + ', button @' + phone.leadTop);
  ok('Insurance Clients is above the chase list in the hub now',
    phone.leadTop < phone.chaseTop, 'lead ' + phone.leadTop + ' vs chase ' + phone.chaseTop);
  ok('the chase list still exists — moved, not deleted', phone.chaseTop != null);
  ok('…and sits below the pipeline now', phone.columns === 1 && phone.chaseTop > phone.railTop,
    phone.columns + '-col, chase ' + phone.chaseTop + ' vs rail ' + phone.railTop);
  ok('…and is still ABOVE the Tools grid, not buried at the end',
    phone.chaseTop < phone.toolsTop, 'chase ' + phone.chaseTop + ' vs tools ' + phone.toolsTop);
  ok('the button says how many claims are in there',
    /5 claims, searchable/.test(phone.leadText), phone.leadText);
  ok('there are exactly TWO clients doors — the tool tile MOVED, it was not copied',
    phone.clientsButtons === 2, phone.clientsButtons + ' (1 lead + 1 "All claims" in the rail terminal)');
  /* 679 added the Supplement Desk here, so a pinned count of 7 goes red on a
     correct build. Assert what actually matters — that every destination the
     grid had BEFORE is still in it — which survives the next addition too. */
  {
    const WAS = ['sol', 'library', 'board', 'supplements', 'insresources', 'adjusters', 'claims'];
    const missing = WAS.filter(g => !phone.toolGos.includes(g));
    ok('the Tools grid kept every destination it had', missing.length === 0,
      'missing: ' + missing.join(', '));
    ok('…and the tile count matches what is in it', phone.toolButtons === phone.toolGos.length,
      phone.toolButtons + ' buttons vs ' + phone.toolGos.length + ' data-go');
  }
  ok('the chase list did not land inside the Tools grid', phone.chaseInTools === false);

  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') + '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
