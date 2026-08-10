/* Build 670 — the Code Authority register: building-official letters, as they come.

   Theo: "Can you add building official letters as they come? Also, would
   city/county codes do the same?"

   The second question decides the first. Ohio's RCO is adopted statewide and
   administered locally — a city has no competing roofing code, it has the
   office that issues the permit. So a letter is EVIDENCE beside an RCO
   citation, never a citation of its own, and it belongs to the JURISDICTION
   rather than the claim.

   The load-bearing tests here are the ones that EXECUTE:
     · placeOf() against the real production address shapes, including the row
       that misspells its own city ("Brookville … Brookeville");
     · renderCodeLetters() in jsdom, proving the parse SORTS and never filters,
       and that nothing arrives pre-ticked;
     · the real route handler, proving a letter reaches the prompt and that its
       absence leaves no trace.

   Usage: node harness_670.js [index.html] [api/supplement.js] [supplement.html]
   Point all three at build 669 as the negative control — must go red.        */
const fs = require('fs');

const IDX = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APIF = process.argv[3] || '/home/user/cardinal-inspections/api/supplement.js';
const DESKF = process.argv[4] || '/home/user/cardinal-inspections/supplement.html';
const SRC = fs.readFileSync(IDX, 'utf8');
const API = fs.readFileSync(APIF, 'utf8');
const DESK = fs.readFileSync(DESKF, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* brace-match a top-level function out of the shipped page so the assertions
   run the REAL text, not a re-implementation of it */
function fnText(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') { d++; started = true; }
    else if (src[j] === '}') { d--; if (started && d === 0) return src.slice(i, j + 1); }
  }
  return null;
}

(async function () {

console.log('\n── the library grows first (the honesty core\'s order of operations) ──');
{
  ok('the Supplement Templates page carries the Building Official Letter card',
    /Building Official Letter &mdash; the Jurisdiction&rsquo;s Own Position/.test(SRC));
  ok('…and states the thing that decides the design: Ohio has ONE residential code',
    /<b>Ohio has one residential code\.<\/b>[\s\S]{0,400}adopted statewide by the Board of Building Standards/.test(SRC));
  ok('…so the letter is explicitly NOT a second citation',
    /<b>not a second citation<\/b>[\s\S]{0,200}keep citing the RCO section/.test(SRC));
  ok('…it tells you how to actually get one, in writing, signed',
    /Ask for it in writing on letterhead, signed, with the official&rsquo;s title/.test(SRC));
  ok('…and says why it is filed by jurisdiction: you only get it once',
    /it answers every future job there &mdash; you only get it once/.test(SRC));

  /* the 667 pin, re-run: every citation the pack can attach must occur
     verbatim in the library page. A new library card must not break it. */
  const cites = new Set([...API.matchAll(/citation: '([^']+)'/g)].map(m => m[1])
    .concat([...API.matchAll(/extra: '([^']+)'/g)].map(m => m[1])));
  const lib = new Set([...SRC.matchAll(/<span class="rl-cite[^"]*">([^<]+)<\/span>/g)].map(m => m[1]));
  const missing = [...cites].filter(c => !lib.has(c));
  ok('the pack↔library pin STILL holds', missing.length === 0, 'missing: ' + missing.join(', '));
  ok('…and no new pack entry was invented for this — a letter is evidence, not a ground',
    !/id: 'code_letter|id: 'building_official/.test(API));
}

console.log('\n── the address parse, EXECUTED against real production shapes ──');
{
  const placeOf = fnText(DESK, 'placeOf');
  const normPlace = fnText(DESK, 'normPlace');
  ok('placeOf() and normPlace() are in the shipped page', !!placeOf && !!normPlace);
  if (placeOf && normPlace) {
    const run = new Function(placeOf + '\n' + normPlace + '\nreturn { placeOf, normPlace };')();
    /* every one of these is a real projects.address value read from the live DB */
    const cases = [
      ['9222 Arlington Rd, Brookville, OH 45309, USA, Brookeville, OH 45309', 'Brookville'],
      ['221 Marathon Ave, Dayton, OH 45405, USA, Dayton, OH 45405', 'Dayton'],
      ['7310 cedar knolls dr, Huber heights, OH 45424', 'Huber heights'],
      ['4508 Sydenham Dr, Englewood, OH 45322', 'Englewood'],
      ['1630 E 5th St, Dayton, OH 45403-2304', 'Dayton'],
      ['1049 Cicillion Ave', ''],
      ['', '']
    ];
    const wrong = cases.filter(c => run.placeOf(c[0]) !== c[1])
      .map(c => JSON.stringify(c[0]) + ' → ' + JSON.stringify(run.placeOf(c[0])) + ' want ' + JSON.stringify(c[1]));
    ok('every real address shape parses to the right city (7 cases, incl. the doubled row)',
      wrong.length === 0, wrong.join(' | '));
    ok('…the FIRST city wins, so the row that misspells itself still reads Brookville',
      run.placeOf('9222 Arlington Rd, Brookville, OH 45309, USA, Brookeville, OH 45309') === 'Brookville');
    ok('an address with no city yields empty, not a guess', run.placeOf('1049 Cicillion Ave') === '');
    ok('normPlace folds case and punctuation so "Huber Heights" ≡ "huber heights"',
      run.normPlace('Huber Heights') === run.normPlace('huber heights') &&
      run.normPlace('Huber Heights') === 'huberheights');
  }
}

console.log('\n── the register renders: SORTS, never filters, never pre-ticks (jsdom) ──');
{
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><div id="codeList"></div><div id="codeNote"></div>');
  const doc = dom.window.document;

  const parts = ['normPlace', 'clHere', 'renderCodeLetters', 'clSelected', 'clNote']
    .map(n => fnText(DESK, n));
  ok('all five register functions are in the shipped page', parts.every(Boolean),
    parts.map((p, i) => p ? '' : ['normPlace','clHere','renderCodeLetters','clSelected','clNote'][i]).filter(Boolean).join(','));

  if (parts.every(Boolean)) {
    const LETTERS = [
      { id: 'a', jurisdiction: 'Dayton', level: 'city', applies_to: ['dayton'],
        official_name: 'A. Official', official_title: 'CBO', department: 'Building Inspection',
        letter_date: '2026-01-05', topic: 'Ventilation', holding: 'Old and elsewhere.', rco_sections: ['RCO R806'] },
      { id: 'b', jurisdiction: 'Brookville', level: 'city', applies_to: ['brookville', 'brookeville'],
        official_name: 'B. Official', official_title: 'Chief Building Official', department: 'Div. of Building',
        letter_date: '2026-08-01', topic: 'Re-cover over cedar shake', holding: 'A permit will not issue.',
        rco_sections: ['RCO R908.3'] },
      { id: 'c', jurisdiction: 'Ohio Board of Building Standards', level: 'state', applies_to: [],
        letter_date: '2025-03-03', topic: 'Statewide', holding: 'Statewide position.', rco_sections: [] }
    ];
    const S = { place: 'Brookeville', codeLetters: LETTERS, clPicked: {} };
    const sandbox = new Function('S', 'document', 'esc', 'fmtDate',
      'const el = id => document.getElementById(id);\n' +
      parts.join('\n') + '\n' +
      'return { renderCodeLetters, clHere, clSelected, clNote };')(
        S, doc,
        s => String(s == null ? '' : s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])),
        d => String(d || ''));

    sandbox.renderCodeLetters();
    const rows = [...doc.getElementById('codeList').querySelectorAll('.cl')];
    ok('ALL letters render — the parse is a sort hint, never a filter', rows.length === 3, rows.length);
    ok('…the matching jurisdiction sorts FIRST', rows[0] && rows[0].getAttribute('data-cl') === 'b',
      rows.map(r => r.getAttribute('data-cl')).join(','));
    ok('…and is marked as this jurisdiction', rows[0] && rows[0].classList.contains('here'));
    ok('…a letter for another town still renders, unmarked (persuasive where not binding)',
      rows.some(r => r.getAttribute('data-cl') === 'a' && !r.classList.contains('here')));
    ok('NOTHING arrives pre-ticked — the 666 rule holds here too',
      rows.every(r => !r.querySelector('input').checked) && sandbox.clSelected().length === 0);
    ok('the misspelled address still matches via applies_to (brookeville → Brookville)',
      sandbox.clHere(LETTERS[1]) === true);
    ok('a statewide letter always applies', sandbox.clHere(LETTERS[2]) === true);
    ok('an unrelated town does not', sandbox.clHere(LETTERS[0]) === false);
    ok('the note says what is ticked and that nothing attaches itself',
      /None ticked/.test(doc.getElementById('codeNote').textContent),
      doc.getElementById('codeNote').textContent);

    /* tick one, re-render: the choice survives and clSelected reports it */
    S.clPicked['b'] = true;
    sandbox.renderCodeLetters();
    ok('a ticked letter stays ticked across a re-render and reaches clSelected()',
      sandbox.clSelected().length === 1 && sandbox.clSelected()[0].id === 'b');

    /* no city parsed → non-state letters are simply unmarked, never hidden */
    S.place = ''; S.clPicked = {};
    sandbox.renderCodeLetters();
    const rows2 = [...doc.getElementById('codeList').querySelectorAll('.cl')];
    ok('an unparseable address hides nothing — all three still render', rows2.length === 3, rows2.length);
    ok('…and only the statewide letter is marked', sandbox.clHere(LETTERS[1]) === false &&
      sandbox.clHere(LETTERS[2]) === true);
  }
}

console.log('\n── the route, driven for real: a letter reaches the analyst ──');
{
  let handler = null;
  try { handler = (await import('file://' + APIF + '?v=' + Date.now())).default; } catch (e) {}
  ok('handler imports', typeof handler === 'function');
  if (handler) {
    const keyWas = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.OPENAI_API_KEY;
    async function drive(body) {
      const seen = { prompt: '' };
      const realFetch = global.fetch;
      global.fetch = async (url, init) => {
        const u = String(url);
        if (u.includes('/auth/v1/user')) return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'theo@cardinalrenovations.net' }) };
        if (u.includes('is_cardinal_admin')) return { ok: true, status: 200, json: async () => true };
        if (u.includes('generativelanguage')) {
          const sent = JSON.parse(init.body);
          seen.prompt = sent.contents[0].parts.map(p => p.text || '').join('\n');
          return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'STOP',
            content: { parts: [{ text: '{"gaps":[],"scope_summary":"s","subject":"x","letter_html":"<p>y</p>"}' }] } }] }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };
      const r = { code: null, body: null, status(c){ this.code = c; return this; }, json(b){ this.body = b; return this; } };
      await handler({ method: 'POST', headers: { authorization: 'Bearer t' }, body }, r);
      global.fetch = realFetch;
      return { seen, r };
    }
    const LETTER = {
      id: 'b', jurisdiction: 'Brookville', level: 'city',
      official_name: 'B. Official', official_title: 'Chief Building Official',
      letter_date: '2026-08-01', topic: 'Re-cover over cedar shake',
      holding: 'A permit will not issue for a roof covering applied over the existing cedar shake.',
      rco_sections: ['RCO R908.3']
    };
    const BASE = { mode: 'analyze', scope: { file: 'QUJD', mime: 'application/pdf' },
      meas: { eave: 120 }, claim: { carrier: 'Allstate' } };

    const withL = (await drive(Object.assign({}, BASE, { code_letters: [LETTER] }))).seen;
    ok('the letter reaches the analyze prompt, named by jurisdiction and official',
      /letter of the Brookville building official/.test(withL.prompt) &&
      /Chief Building Official/.test(withL.prompt), withL.prompt.slice(0, 0) || undefined);
    ok('…with its own sentence verbatim, and the sections it ENFORCES',
      /A permit will not issue for a roof covering applied over the existing cedar shake\./.test(withL.prompt) &&
      /enforcing RCO R908\.3/.test(withL.prompt));
    ok('…and the discipline that keeps it evidence, not a citation',
      /Never quote a code section out of a letter/.test(withL.prompt));
    ok('…framed as what the jurisdiction will PERMIT',
      /cannot fund an installation the jurisdiction will not permit/.test(withL.prompt));

    const noL = (await drive(BASE)).seen;
    ok('no letters on file → not a word about them in the prompt',
      !/building official/i.test(noL.prompt));

    /* draft mode: the exhibit label is composed server-side and copied */
    const dr = (await drive({ mode: 'draft', claim: { carrier: 'Allstate' },
      items: [{ id: 'g1', item: 'Full tear-off', pack_id: 'tear_off' }],
      code_letters: [LETTER] })).seen;
    ok('the drafted letter is told to enclose the exhibit, by an exact server-composed phrase',
      /accompany this request as exhibits/.test(dr.prompt) &&
      /the letter of the Brookville building official \(B\. Official, Chief Building Official\), dated 2026-08-01/.test(dr.prompt));
    ok('…and told again not to present it as a citation of its own',
      /do not present one as a citation of its own/.test(dr.prompt));
    const drNo = (await drive({ mode: 'draft', claim: {},
      items: [{ id: 'g1', item: 'Full tear-off', pack_id: 'tear_off' }] })).seen;
    ok('draft with no letters says nothing about exhibits', !/as exhibits/.test(drNo.prompt));

    /* bounds: a hostile payload cannot blow up the prompt */
    const huge = (await drive(Object.assign({}, BASE, { code_letters:
      Array.from({ length: 40 }, (_, i) => Object.assign({}, LETTER, { id: 'x' + i,
        holding: 'H'.repeat(4000), jurisdiction: 'J'.repeat(500) })) }))).seen;
    ok('the register is bounded — at most 6 letters reach the prompt',
      (huge.prompt.match(/building official/g) || []).length <= 8,
      (huge.prompt.match(/building official/g) || []).length);
    ok('…and each holding is truncated, not passed whole', !/H{500}/.test(huge.prompt));
    const junk = (await drive(Object.assign({}, BASE, {
      code_letters: [null, 'nope', {}, { jurisdiction: 'X' }, { holding: 'Y' }] }))).seen;
    ok('malformed rows are dropped rather than half-rendered',
      !/building official/i.test(junk.prompt));

    if (keyWas === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = keyWas;
  }
}

console.log('\n── the Desk: loads, sends, files ──');
{
  ok('the register is read with named columns, bounded, newest first',
    /from\('code_letters'\)/.test(DESK) && /\.limit\(200\)/.test(DESK) &&
    /order\('letter_date', \{ ascending: false/.test(DESK));
  ok('a refusal or an empty register is not an error — the card just stays empty',
    /catch\(_\)\{\}/.test(DESK.slice(DESK.indexOf('async function loadCodeLetters'),
      DESK.indexOf('async function loadCodeLetters') + 900)));
  ok('the ticked letters ride into the analysis', /code_letters: clSelected\(\),/.test(DESK));
  ok('…and into the draft', (DESK.match(/code_letters: clSelected\(\),/g) || []).length === 2,
    (DESK.match(/code_letters: clSelected\(\),/g) || []).length);
  ok('the filed row records which letters rode along',
    /code_letter_ids: clSelected\(\)\.map\(function\(l\)\{ return l\.id; \}\),/.test(DESK));
  ok('filing a letter refuses without the official\'s own sentence',
    /a paraphrase is not evidence/.test(DESK));
  ok('…and records who vouched for it', /verified_by: \(S\.user && S\.user\.email\)/.test(DESK));
  ok('the scan goes to its own storage prefix', /'code-letters\/'/.test(DESK));
  ok('the card explains the one-code point where it is used, not only in the library',
    /Ohio has <b>one<\/b> residential code/.test(DESK));
  ok('every field the form writes exists on the table', (function () {
    const want = ['jurisdiction','level','applies_to','official_name','official_title','department',
      'contact','letter_date','topic','holding','rco_sections','local_amendment','storage_path',
      'source_url','verified_by','verified_at','created_by'];
    const ins = DESK.slice(DESK.indexOf("from('code_letters').insert({"));
    return want.every(k => ins.indexOf(k + ':') > -1);
  })());
}

console.log('\n── the migration ships beside the code ──');
{
  const SQL = (() => { try { return fs.readFileSync('/home/user/cardinal-inspections/code_letters.sql', 'utf8'); } catch (_) { return ''; } })();
  ok('code_letters.sql is in the repo', SQL.length > 0);
  ok('…RLS: everyone signed in reads, only admin writes',
    /for select using \(auth\.role\(\) = 'authenticated'\)/.test(SQL) &&
    /for all using \(public\.is_cardinal_admin\(\)\) with check \(public\.is_cardinal_admin\(\)\)/.test(SQL));
  ok('…the holding is documented as verbatim-never-paraphrased',
    /verbatim\. Never paraphrased/.test(SQL));
  ok('…applies_to is documented as a sort hint that never filters',
    /Sort hint only\. Never a filter and never an auto-attach/.test(SQL));
  ok('…and the filing carries which letters rode along',
    /add column if not exists code_letter_ids uuid\[\] not null default '\{\}'/.test(SQL));
}

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 670 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 670; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:670,/.test(SRC));
  ok('…and answers the second half of the question in the user\'s own terms',
    /Ohio has ONE residential code/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
