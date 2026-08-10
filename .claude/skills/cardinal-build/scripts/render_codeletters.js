/* Build 670 — a picture of the Code Authority card.

   The 628 lesson: 347 green assertions could not catch that an amber BAR in a
   checkbox reads as "excluded" rather than "picked". Gates prove structure;
   only a render proves meaning. Here the meaning under test is the difference
   between a letter that covers THIS jurisdiction and one that does not — it
   has to be legible at a glance, in both themes, without relying on colour
   alone (the row also says "this jurisdiction" in words).

   Usage: node render_codeletters.js [supplement.html]                       */
const fs = require('fs');
const { chromium } = require('playwright-core');

const F = process.argv[2] || '/home/user/cardinal-inspections/supplement.html';
const H = fs.readFileSync(F, 'utf8');

const cssOf = h => { const o = []; let i = 0;
  while ((i = h.indexOf('<style', i)) !== -1) {
    const s = h.indexOf('>', i) + 1, e = h.indexOf('</style>', s);
    if (e === -1) break; o.push(h.slice(s, e)); i = e; } return o.join('\n'); };

/* The negative control is an artifact where none of this exists. Say that
   plainly and exit red, rather than dying at module load with a stack trace —
   a crash is an absence of information, not a result (the 662 lesson). */
function red(why) {
  console.log('  ✗ ' + F + ': ' + why);
  console.log('\nRENDER: RED (this artifact predates 670)');
  process.exit(1);
}
if (H.indexOf('<div class="sd-card" id="codeCard">') < 0) red('no #codeCard in the page');

/* the shipped renderer, lifted whole */
const fnText = (src, name) => {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) red('no function ' + name + '() in the page');
  let d = 0, started = false;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') { d++; started = true; }
    else if (src[j] === '}') { d--; if (started && d === 0) return src.slice(i, j + 1); }
  }
  throw new Error('unbalanced ' + name);
};
const RENDER = ['normPlace', 'clHere', 'renderCodeLetters', 'clSelected', 'clNote']
  .map(n => fnText(H, n)).join('\n');

/* the card markup, lifted whole from the page */
const CARD = (() => {
  const a = H.indexOf('<div class="sd-card" id="codeCard">');
  const b = H.indexOf('<div class="sd-card" id="gapsCard"');
  if (a < 0 || b < 0) red('the codeCard markup could not be sliced');
  return H.slice(a, b);
})();

const FIXTURE = [
  { id: 'b', jurisdiction: 'Brookville', level: 'city', applies_to: ['brookville', 'brookeville'],
    official_name: 'B. Official', official_title: 'Chief Building Official',
    department: 'Division of Building Regulations', letter_date: '2026-08-01',
    topic: 'Re-cover over cedar shake will not be permitted',
    holding: 'A permit will not issue for a roof covering applied over the existing cedar shake; the existing covering must be removed to the deck.',
    rco_sections: ['RCO R908.3'], local_amendment: null },
  { id: 'a', jurisdiction: 'Dayton', level: 'city', applies_to: ['dayton'],
    official_name: 'A. Official', official_title: 'CBO', department: 'Building Inspection',
    letter_date: '2026-01-05', topic: 'Attic ventilation at re-roof',
    holding: 'Net free ventilating area must be brought to code at the time of re-roof.',
    rco_sections: ['RCO R806'], local_amendment: null },
  { id: 'c', jurisdiction: 'Ohio Board of Building Standards', level: 'state', applies_to: [],
    letter_date: '2025-03-03', topic: 'Residential code is statewide',
    holding: 'The Residential Code of Ohio applies uniformly; local departments administer it.',
    rco_sections: [], local_amendment: null }
];

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const out = {};
  for (const theme of ['dark', 'light']) {
    for (const [w, wname] of [[1194, 'iPad 1194'], [390, 'phone 390']]) {
      const p = await br.newPage({ viewport: { width: w, height: 1000 } });
      /* the Desk themes on data-theme, NOT data-mode — data-mode is the app's
         landing-page toggle and does nothing here. Getting this wrong renders
         two identical dark runs and calls one of them "light". */
      await p.setContent('<!doctype html><html' + (theme === 'light' ? ' data-theme="light"' : '') +
        '><head><style>' + cssOf(H) + '</style></head><body><div id="appView" style="display:block">' +
        '<div style="max-width:940px;margin:0 auto;padding:18px;">' + CARD + '</div></div></body></html>');
      await p.evaluate(({ render, fixture }) => {
        window.S = { place: 'Brookeville', codeLetters: fixture, clPicked: { b: true } };
        window.esc = s => String(s == null ? '' : s).replace(/[<>&"']/g,
          c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
        window.fmtDate = d => d ? new Date(d).toLocaleDateString('en-US',
          { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
        window.el = id => document.getElementById(id);
        (new Function('S', 'esc', 'fmtDate', 'el', render + '\nrenderCodeLetters();'))
          (window.S, window.esc, window.fmtDate, window.el);
      }, { render: RENDER, fixture: FIXTURE });

      const r = await p.evaluate(() => {
        const rows = [...document.querySelectorAll('#codeList .cl')];
        const cs = e => getComputedStyle(e);
        /* compare a MARKED row against an UNMARKED one. Comparing rows[0] to
           rows[1] finds two greens and calls the design broken — the statewide
           letter is legitimately marked too, because it legitimately applies. */
        const marked = rows.find(x => x.classList.contains('here'));
        const plain = rows.find(x => !x.classList.contains('here'));
        return {
          rendered: rows.length,
          order: rows.map(x => x.getAttribute('data-cl')),
          markedCount: rows.filter(x => x.classList.contains('here')).length,
          firstBorder: marked ? cs(marked).borderTopColor : null,
          otherBorder: plain ? cs(plain).borderTopColor : null,
          bordersDiffer: !!marked && !!plain && cs(marked).borderTopColor !== cs(plain).borderTopColor,
          marksInWords: rows.filter(x => /this jurisdiction|applies here/i.test(x.textContent)).length,
          /* a statewide letter applies here, but it was not written FOR here —
             saying "this jurisdiction" on it overclaims */
          stateOverclaims: rows.some(x => x.getAttribute('data-cl') === 'c' &&
            /this jurisdiction/i.test(x.textContent)),
          ticked: rows.filter(x => x.querySelector('input').checked).map(x => x.getAttribute('data-cl')),
          cardWidth: Math.round(document.getElementById('codeCard').getBoundingClientRect().width),
          overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          note: document.getElementById('codeNote').textContent,
          holdingClipped: rows.some(x => { const h = x.querySelector('.hold');
            return h && h.scrollHeight > h.clientHeight + 1; }),
          inkOnGround: (() => { const h = rows[0] && rows[0].querySelector('.hold');
            return h ? cs(h).color + ' on ' + cs(rows[0]).backgroundColor : null; })()
        };
      });
      out[theme + ' · ' + wname] = r;
      await p.screenshot({ path: '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/codecard-' + theme + '-' + w + '.png', fullPage: true });
      await p.close();
    }
  }
  await br.close();

  let bad = 0;
  for (const [k, r] of Object.entries(out)) {
    const problems = [];
    if (r.rendered !== 3) problems.push('rendered ' + r.rendered + ' of 3');
    if (r.order[0] !== 'b') problems.push('sort: ' + r.order.join(','));
    if (!r.bordersDiffer) problems.push('matching row not visually distinct');
    if (r.markedCount !== 2) problems.push('marked ' + r.markedCount + ' of 2 (Brookville + statewide)');
    if (r.marksInWords < 1) problems.push('no words carry the match — colour alone');
    if (r.stateOverclaims) problems.push('a statewide letter is labelled "this jurisdiction"');
    if (r.ticked.join() !== 'b') problems.push('ticks: ' + r.ticked.join(','));
    if (r.overflowsX) problems.push('page scrolls sideways');
    if (r.holdingClipped) problems.push('the official\'s sentence is clipped');
    console.log((problems.length ? '  ✗ ' : '  ✓ ') + k + '  width ' + r.cardWidth +
      '  border ' + r.firstBorder + ' vs ' + r.otherBorder + '  ' + r.inkOnGround);
    if (problems.length) { bad++; console.log('      ' + problems.join(' · ')); }
  }
  console.log('\n  note reads: ' + out['dark · iPad 1194'].note);
  console.log('\nRENDER: ' + (bad ? 'PROBLEMS in ' + bad + ' view(s)' : 'OK in all 4 views'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
