/* Build 671 — the Desk, made honest.

   Nine defects in 667-670, found by a 13-agent audit and each re-verified by
   hand before it was touched. This harness EXECUTES the repaired functions
   rather than reading them, because every one of these bugs was invisible to a
   text assertion — the copy path and the print path both "handled photos", and
   only running them shows one lying.

   Usage: node harness_671.js [index.html] [api/supplement.js] [supplement.html]
   Point all three at build 670 as the negative control — must go red.        */
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

/* Preserve `async`. fileSupplement is an async function; slicing from
   'function NAME(' drops the keyword, and `new Function` then compiles a
   non-async body containing `await` — a SyntaxError that looks like an app
   fault and is entirely the harness's. */
function fnText(src, name) {
  let i = src.indexOf('async function ' + name + '(');
  if (i < 0) i = src.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') { d++; started = true; }
    else if (src[j] === '}') { d--; if (started && d === 0) return src.slice(i, j + 1); }
  }
  return null;
}
const ESC = s => String(s == null ? '' : s).replace(/[<>&"']/g,
  c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));

(async function () {

console.log('\n── the letter stops claiming photographs it does not have (EXECUTED) ──');
{
  const sub = fnText(DESK, 'substitutePhotoTokens');
  ok('substitutePhotoTokens() exists — ONE substitution, not two', !!sub);
  /* Scope this to CODE. The string '[photographs attached]' survives in the
     comment that explains the fix — asserting on the file finds the fix's own
     documentation and calls a correct repair broken. Assert on the CALL SHAPE
     that carried the bug instead. */
  ok('…and the old unconditional copy substitution is gone from the code',
    !/letterRaw\(\)\.replace\(\s*\/\\\[\\\[PHOTOS/.test(DESK) &&
    !/replace\([^)]*,\s*'\[photographs attached\]'\s*\)/.test(DESK));
  if (sub) {
    const S = { gaps: [
      { id: 'g1', item: 'Drip edge', photos: [{ path: 'a.jpg' }, { path: 'b.jpg' }] },
      { id: 'g2', item: 'Ice barrier', photos: [] },
      { id: 'g3', item: 'Ventilation' }               /* no photos key at all */
    ] };
    const run = new Function('S', sub + '\nreturn substitutePhotoTokens;')(S);
    const LETTER = '<p>One [[PHOTOS:g1]]</p><p>Two [[PHOTOS:g2]]</p><p>Three [[PHOTOS:g3]]</p>';

    /* the COPY resolver, exactly as the page composes it */
    const copied = run(LETTER, g => '<div>[' + g.photos.length + ' photograph' +
      (g.photos.length === 1 ? '' : 's') + ' attached]</div>');
    ok('a gap WITH photographs still says so, and says how many',
      /2 photographs attached/.test(copied), copied);
    ok('a gap with an EMPTY photo list contributes nothing to the copied letter',
      !/\[\[PHOTOS:g2\]\]/.test(copied) && copied.indexOf('Two </p>') > -1, copied);
    ok('a gap with NO photos key at all contributes nothing either',
      !/\[\[PHOTOS:g3\]\]/.test(copied) && copied.indexOf('Three </p>') > -1, copied);
    ok('THE 670 BUG IS GONE: a zero-photograph letter never says photographs are attached',
      (function () {
        const none = run('<p>x [[PHOTOS:g2]]</p>', g => '<div>attached</div>');
        return !/attached/i.test(none) && !/photograph/i.test(none);
      })());

    /* the PRINT resolver — the path that was already correct, still correct */
    const printed = run(LETTER, g => '<div>' + g.photos.map(p => '<img src="' + p.path + '">').join('') + '</div>');
    ok('print and copy now agree: both emit nothing for a photo-less gap',
      !/\[\[PHOTOS:g2\]\]/.test(printed) && (printed.match(/<img/g) || []).length === 2);
    ok('an unknown token id is dropped rather than left in the letter',
      run('<p>[[PHOTOS:g99]]</p>', () => 'X') === '<p></p>');
  }
}

console.log('\n── the enclosure the letter promises is now real (EXECUTED) ──');
{
  const app = fnText(DESK, 'codeAppendix');
  ok('codeAppendix() exists', !!app);
  const sel = fnText(DESK, 'clSelected');
  if (app && sel) {
    const LETTERS = [{
      id: 'b', jurisdiction: 'Brookville', level: 'city',
      official_name: 'B. Official', official_title: 'Chief Building Official',
      department: 'Division of Building Regulations', letter_date: '2026-08-01',
      topic: 'Re-cover over cedar shake will not be permitted',
      holding: 'A permit will not issue for a roof covering applied over the existing cedar shake.',
      rco_sections: ['RCO R908.3'], storage_path: 'code-letters/x.pdf'
    }];
    const mk = (codeLetters, picked) => new Function('S', 'esc', 'fmtDate',
      sel + '\n' + app + '\nreturn codeAppendix;')(
        { codeLetters, clPicked: picked }, ESC, d => String(d || ''));

    ok('NO letter ticked → no appendix at all, so the letter claims no enclosure',
      mk(LETTERS, {})('') === '');
    const out = mk(LETTERS, { b: true })('');
    ok('a ticked letter produces an appendix', out.length > 0 && /Appendix/.test(out));
    ok('…carrying the official\'s sentence VERBATIM (the code_letters rule)',
      out.indexOf('A permit will not issue for a roof covering applied over the existing cedar shake.') > -1);
    ok('…naming the jurisdiction, the official and the date',
      /Brookville/.test(out) && /Chief Building Official/.test(out) && /2026-08-01/.test(out));
    ok('…and the state section it ENFORCES, not a citation of its own',
      /Enforcing RCO R908\.3/.test(out) && !/per RCO/i.test(out));
    ok('…and says the signed original follows, since the scan is not inlined',
      /Signed original follows/.test(out));
    ok('the appendix escapes its inputs', (function () {
      const evil = [Object.assign({}, LETTERS[0], { topic: '<script>x</script>' })];
      return mk(evil, { b: true })('').indexOf('<script>') === -1;
    })());
    ok('the route no longer instructs the model to claim a copy is ENCLOSED',
      !/state that a copy is enclosed/.test(API) &&
      /reproduced in the appendix to/.test(API));
  }
}

console.log('\n── filing twice no longer files twice (EXECUTED) ──');
{
  const fn = fnText(DESK, 'fileSupplement');
  ok('fileSupplement() extracted', !!fn);
  if (fn) {
    async function drive(insertResult) {
      const btn = { disabled: false, textContent: 'File it' };
      const calls = { inserts: 0, alerts: [], loads: 0, steps: [] };
      const els = {
        fileBtn: btn, filingType: { value: 'partial_denial' },
        subjEdit: { value: 'Subject' }, letterEdit: { innerHTML: '<p>x</p>' }
      };
      const S = { claim: { id: 'c1' }, letter: { subject: 's' }, user: { email: 'theo@x' },
        gaps: [{ id: 'g1', item: 'Drip edge', included: true }], scopeDoc: null,
        codeLetters: [], clPicked: {} };
      const sb = { from: () => ({ insert: () => { calls.inserts++; return {
        select: () => ({ single: async () => insertResult }) }; } }) };
      const sandbox = new Function('S', 'sb', 'el', 'alert', 'step', 'loadFilings',
        'letterRaw', 'clSelected', 'esc', 'calls',
        fn + '\nreturn fileSupplement;')(
          S, sb, id => els[id], m => calls.alerts.push(m),
          n => calls.steps.push(n), () => { calls.loads++; },
          () => '<p>letter</p>', () => [], ESC, calls);
      await sandbox();
      return { btn, calls, S };
    }

    const good = await drive({ data: { id: 'row-1' }, error: null });
    ok('a successful file inserts exactly one row', good.calls.inserts === 1, good.calls.inserts);
    ok('THE 668 BUG IS GONE: the button stays DISABLED after a successful file',
      good.btn.disabled === true, 'disabled=' + good.btn.disabled);
    ok('…and says so, so a second tap is obviously not a second filing',
      /Filed/.test(good.btn.textContent), good.btn.textContent);
    ok('…the inserted id is retained for the send writeback 672 will need',
      good.S.filedId === 'row-1', good.S.filedId);
    ok('…and it advanced to the filed step', good.calls.steps.indexOf(4) > -1);

    const bad = await drive({ data: null, error: { message: 'boom' } });
    ok('a FAILED file re-enables the button so it can be retried',
      bad.btn.disabled === false);
    ok('…and does not advance the step or claim success',
      bad.calls.steps.indexOf(4) === -1 && !/Filed\./.test((bad.calls.alerts[0] || '')));
    ok('…and retains no id', !bad.S.filedId);

    const rls = await drive({ data: null, error: { message: 'new row violates row-level security policy' } });
    ok('an RLS refusal is explained as the record refusing, not as a bug',
      /the record refusing/.test(rls.calls.alerts[0] || ''), rls.calls.alerts[0]);
  }
}

console.log('\n── an admin who can open the Desk but see nothing is told why ──');
{
  const fn = fnText(DESK, 'explainEmpty');
  ok('explainEmpty() exists', !!fn);
  if (fn) {
    const run = async (rpcResult) => {
      const el0 = { innerHTML: '' };
      const sb = { rpc: async () => rpcResult };
      await new Function('sb', 'el', 'esc', fn + '\nreturn explainEmpty;')(
        sb, () => el0, ESC)();
      return el0.innerHTML;
    };
    const notFull = await run({ data: false, error: null });
    ok('a non-full-access admin is told the RECORD is refusing, not that there are none',
      /No claims are visible to this sign-in/.test(notFull) &&
      /not an empty database/.test(notFull), notFull.slice(0, 90));
    ok('…and is told who does have access, so it is actionable',
      /assigned rep/.test(notFull) && /Theo, Joan, Curtis and Scottie/.test(notFull));
    const full = await run({ data: true, error: null });
    ok('a full-access user with a genuinely empty database gets the plain message',
      /No claims with a linked job yet/.test(full));
    const broke = await run({ data: null, error: { message: 'nope' } });
    ok('if the question itself fails, it falls back rather than guessing',
      /No claims with a linked job yet/.test(broke));
  }
}

console.log('\n── the smaller repairs, each verified against its own failure ──');
{
  ok('the ROW-level pill vocabulary now exists (submitted/draft/withdrawn)',
    /\.pill\.submitted\{/.test(DESK) && /\.pill\.draft\{/.test(DESK) && /\.pill\.withdrawn\{/.test(DESK));
  ok('…and the CLAIM-level one is untouched',
    /\.pill\.filed\{/.test(DESK) && /\.pill\.approved\{/.test(DESK) &&
    /\.pill\.partial\{/.test(DESK) && /\.pill\.denied\{/.test(DESK));
  ok('submitted reads as live-and-waiting (the same amber as a filed claim)',
    /\.pill\.submitted\{ color:var\(--sd-warn\)/.test(DESK));

  ok('created_by never falls back to a sentinel RLS cannot accept',
    DESK.indexOf("|| 'desk'") === -1 && (DESK.match(/created_by: \(S\.user && S\.user\.email\) \|\| null/g) || []).length === 2,
    (DESK.match(/created_by: \(S\.user && S\.user\.email\) \|\| null/g) || []).length);

  ok('PWI / COC cannot be chosen while both prompts draft a supplement REQUEST',
    /<option value="pwi_coc" disabled>/.test(DESK));
  ok('…and says why rather than vanishing', /needs its own build/.test(DESK));
  ok('the other two filing types are still selectable',
    /<option value="partial_denial">/.test(DESK) && /<option value="backend">/.test(DESK));

  ok('cr-cth now selects the column its own chase list reads', (function () {
    const i = SRC.indexOf('<script id="cr-cth-script"'), j = SRC.indexOf('</script>', i);
    const blk = SRC.slice(i, j);
    return /from\('insurance_claims'\)[\s\S]{0,400}supplement_filed_at/.test(blk) &&
           blk.indexOf('daysSince(c.supplement_filed_at)') > -1;
  })());
}

console.log('\n── the mirror is deterministic (SQL shipped beside the page) ──');
{
  const SQL = (() => { try { return fs.readFileSync('/home/user/cardinal-inspections/supplement_mirror_tiebreak.sql', 'utf8'); } catch (_) { return ''; } })();
  ok('supplement_mirror_tiebreak.sql is in the repo', SQL.length > 0);
  ok('…the ORDER BY has a total, deterministic tiebreak',
    /updated_at\s+desc,?\s*\n?\s*id\s+desc/.test(SQL.replace(/\s+/g, m => m.includes('\n') ? '\n' : ' ')) ||
    (/updated_at  desc/.test(SQL) && /id          desc/.test(SQL)));
  ok('…the rest of the function is unchanged (still invoker-rights, no SECURITY DEFINER)',
    !/security definer/i.test(SQL.split('-- ── A NOTE')[0]));
  /* Strip the comment prefixes and fold whitespace before matching — the
     sentence wraps across lines, and a pattern that cannot cross a newline
     reports a present claim as absent (CLAUDE.md's own [^;\n]* trap). */
  const FLAT = SQL.replace(/^\s*--\s?/gm, '').replace(/\s+/g, ' ');
  ok('…and the SECURITY DEFINER proposal is recorded as a REJECTED false positive, with the test',
    /BYTE-IDENTICAL USING expressions/.test(FLAT) && /claims visible = 0 of 5/.test(FLAT));
  ok('…the one genuine looseness found is recorded rather than silently patched',
    /does NOT check that the claim is visible/.test(SQL));
}

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 671 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 671; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:671,/.test(SRC));
  ok('…and names them as mine rather than as weather',
    /all of them mine/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
