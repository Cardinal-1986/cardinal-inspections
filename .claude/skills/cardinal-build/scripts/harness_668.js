/* Build 668 — the Supplement Desk page (supplement.html).

   check_build.py cannot see a standalone page (the 627 convention), so this
   harness is its gate: every inline script parses, the security posture is
   present, the letter's token round-trip is EXECUTED, and the pure logic
   (letterRaw's token restoration, the filing row shape) runs in jsdom against
   the shipped source.

   Usage: node harness_668.js [supplement.html] [index.html]
   Point index.html at the previous build as the negative control — it must go
   red (no hub card, no stamp). */
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');

const PAGE = process.argv[2] || '/home/user/cardinal-inspections/supplement.html';
const IDX = process.argv[3] || '/home/user/cardinal-inspections/index.html';
let SRC = '';
try { SRC = fs.readFileSync(PAGE, 'utf8'); } catch (e) {}
const APP = fs.readFileSync(IDX, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

(async function () {

console.log('\n── the page exists and every inline script PARSES ──');
{
  ok('supplement.html exists at the repo root', !!SRC, PAGE);
  const blocks = [...SRC.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  ok('it carries inline scripts', blocks.length >= 2, blocks.length);
  let bad = 0;
  blocks.forEach((b, i) => {
    const p = path.join(os.tmpdir(), 'sd-' + i + '.js');
    fs.writeFileSync(p, b);
    try { execSync('node --check ' + p, { stdio: 'pipe' }); } catch (e) { bad++; }
    fs.unlinkSync(p);
  });
  ok('every inline script passes node --check (the 627 convention)', bad === 0, bad + ' failed');
  ok('script/style tags balance', SRC.split('<script').length === SRC.split('</script').length &&
    SRC.split('<style').length === SRC.split('</style').length);
}

console.log('\n── the security posture, in the artifact ──');
{
  ok('robots noindex (an internal tool, like studio)', /name="robots" content="noindex, nofollow"/.test(SRC));
  ok('its own sign-in (the standalone origin never inherits the app session)',
    /signInWithPassword/.test(SRC) && /getSession\(\)/.test(SRC));
  ok('the UI gate is the ADMIN rpc, and a non-admin is signed OUT, not just blocked',
    /rpc\('is_cardinal_admin'\)/.test(SRC) && /admin-only/.test(SRC) &&
    /signOut\(\)[\s\S]{0,40}showLogin\(\)/.test(SRC));
  ok('only the publishable anon key appears (never a service key)',
    /sb_publishable_/.test(SRC) && !/service_role/i.test(SRC) && !/sb_secret/i.test(SRC));
  ok('the desk never calls /api/sol (the 647 five-callers fence)', !/\/api\/sol/.test(SRC));
  ok('…its engine is /api/supplement', /fetch\('\/api\/supplement'/.test(SRC));
  ok('big scopes go storage-first (the 643 path), small ones inline',
    /3 \* 1024 \* 1024/.test(SRC) && /createSignedUrl\(spath, 600\)/.test(SRC));
}

console.log('\n── the letter\'s token round-trip, EXECUTED ──');
{
  /* extract the two shipped functions and run them against a real DOM */
  const deco = SRC.match(/function decorateTokens\(html\)\{[\s\S]*?\n\}/);
  const raw = SRC.match(/function letterRaw\(\)\{[\s\S]*?\n\}/);
  ok('decorateTokens + letterRaw extracted', !!deco && !!raw);
  if (deco && raw) {
    const dom = new JSDOM('<div id="letterEdit" contenteditable="true"></div>', { runScripts: 'outside-only' });
    const w = dom.window;
    w.eval('function esc(s){ return String(s == null ? "" : s).replace(/[<>&"\']/g, function(c){' +
      'return {"<":"&lt;",">":"&gt;","&":"&amp;",\'"\':"&quot;","\'":"&#39;"}[c]; }); }\n' +
      'function el(id){ return document.getElementById(id); }\n' +
      deco[0] + '\n' + raw[0] + '\nwindow.__d = decorateTokens; window.__r = letterRaw;');
    const letter = '<p>Per RCO R905.2.8.5, drip edge…</p><p>[[PHOTOS:g1]]</p><p>More text.</p>';
    w.document.getElementById('letterEdit').innerHTML = w.__d(letter);
    ok('a token renders as a visible non-editable pill while editing',
      /data-phtoken="g1"/.test(w.document.getElementById('letterEdit').innerHTML) &&
      /contenteditable="false"/.test(w.document.getElementById('letterEdit').innerHTML));
    const stored = w.__r();
    ok('letterRaw restores the RAW token for storage — no pill markup at rest',
      /\[\[PHOTOS:g1\]\]/.test(stored) && !/data-phtoken/.test(stored), stored.slice(0, 120));
    ok('…and the prose around it survives the round trip',
      /drip edge/.test(stored) && /More text\./.test(stored));
  }
  ok('the STORED letter carries tokens, never signed URLs (signing happens at print/send)',
    /letter_html: letterRaw\(\)/.test(SRC) && /createSignedUrls\(allPaths, 3600\)/.test(SRC));
}

console.log('\n── the filing row speaks the schema ──');
{
  ok('the row carries filing_type from the visible select', /filing_type: el\('filingType'\)\.value/.test(SRC));
  ok('…all three of Theo\'s filings are offered',
    /partial_denial/.test(SRC) && /"backend"|'backend'|value="backend"/.test(SRC) && /pwi_coc/.test(SRC));
  ok('the full reviewed item set is stored (ticks and all), not just the included',
    /items: S\.gaps,/.test(SRC));
  ok('created_by is set (the column is NOT NULL — learned live at 667)',
    /created_by: \(S\.user && S\.user\.email\)/.test(SRC));
  ok('status is submitted on file — the ask is live and the TRIGGER mirrors it',
    /status: 'submitted',/.test(SRC));
  ok('scope_ref points at the document, never carries line items',
    /scope_ref: S\.scopeDoc \? \{ report_row_id/.test(SRC));
  ok('the scope doc LIST omits the html payload column (the 649 lesson)',
    /select\('id, title, created_at'\)\s*\n?\s*\.eq\('project_id', pid\)\.ilike\('title', 'Insurance Doc%'\)/.test(SRC));
  /* RE-KEYED AT 672 (BUG_CLASSES §15). This asserted the literal copy
     "Send-from-desk arrives in the next build" — a TEMPORARY fact, pinned as
     if it were the invariant, so it went red the moment send shipped exactly
     as planned. The durable rule is Theo's: NOTHING SENDS ITSELF. Assert that
     instead — send exists only behind an explicit click, and no code path
     calls sendLetter() on its own. This now survives 672 and still fails if
     anyone ever wires an automatic send. */
  /* [^)]* cannot cross the ')' in `setTimeout(function(){ sendLetter(); })`,
     so the obvious auto-send slipped straight through the first version of
     this check — mutation-tested, not assumed. Bounded [\s\S] instead.
     Both mutants are proven red: a timer-driven send, and a sendLetter that
     exists without the click wiring. */
  ok('nothing sends itself — no auto-send, no send-on-file, no scheduled send',
    !/setTimeout\([\s\S]{0,200}?sendLetter/.test(SRC) &&
    !/setInterval\([\s\S]{0,200}?sendLetter/.test(SRC) &&
    (!/sendLetter/.test(SRC) ||
      /el\('sendBtn'\)\.addEventListener\('click', sendLetter\)/.test(SRC)));
}

console.log('\n── the app side (index.html) ──');
{
  ok('the insurance hub carries the Desk card as a plain <a>',
    /<a class="ins-card" href="\/supplement\.html"/.test(APP));
  ok('…named Supplement Desk, marked admin-only',
    /Supplement Desk<\/div>/.test(APP) && /drafts the response letter with your photos and measurements\. Admin only\./.test(APP));
  ok('the app stamp is at 668 or later',
    (function(){ var m = APP.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 668; })(),
    (APP.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records both builds', /\{ b:668,/.test(APP) && /\{ b:667,/.test(APP));
  const vig = fs.readFileSync('/home/user/cardinal-inspections/.vercelignore', 'utf8');
  ok('.vercelignore DECLARES the page ships (house discipline)',
    /supplement\.html DELIBERATELY SHIPS/.test(vig));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
