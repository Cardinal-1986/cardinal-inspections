/* Build 672 — send from the desk.

   The named risk is REGRESSION, not the new feature: api/senddoc.js has two
   shipped callers that email homeowners, and this build reaches into it. So the
   back-compat test is DIFFERENTIAL — the exact payloads index.html sends today
   are driven through BOTH the 671 handler and the 672 handler, and the JSON
   that reaches Resend is compared field by field. Anything that differs is a
   regression by definition, with no judgement involved.

   Usage:
     node harness_672.js [index.html] [api/senddoc.js] [supplement.html] [prev-senddoc.js]

   Point the first three at build 671 as the negative control — must go red.
   The 4th argument is the PREVIOUS senddoc; without it the differential test
   says so and is skipped rather than silently passing.                       */
const fs = require('fs');
const path = require('path');

/* file:// needs an ABSOLUTE path — a relative argv value becomes
   file://api/senddoc.js, whose "host" is `api`, and node rejects it. */
const abs = p => (p ? path.resolve(p) : p);

const IDX = abs(process.argv[2]) || '/home/user/cardinal-inspections/index.html';
const SENDF = abs(process.argv[3]) || '/home/user/cardinal-inspections/api/senddoc.js';
const DESKF = abs(process.argv[4]) || '/home/user/cardinal-inspections/supplement.html';
const PREVF = abs(process.argv[5]) || null;
const SRC = fs.readFileSync(IDX, 'utf8');
const SEND = fs.readFileSync(SENDF, 'utf8');
const DESK = fs.readFileSync(DESKF, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

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

/* drive a senddoc handler and capture exactly what it hands to Resend */
async function driveSend(handlerPath, body, opts) {
  opts = opts || {};
  const mod = await import('file://' + handlerPath + '?v=' + Date.now() + Math.random());
  const handler = mod.default;
  const keyWas = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-resend-key';
  const seen = { resend: null, adminAsked: false };
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      if (opts.badSession) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ id: 'u1',
        email: 'theo@cardinalrenovations.net', user_metadata: { full_name: 'Theo Dorion' } }) };
    }
    if (u.includes('is_cardinal_admin')) {
      seen.adminAsked = true;
      return { ok: true, status: 200, json: async () => opts.admin !== false };
    }
    if (u.includes('api.resend.com')) {
      seen.resend = JSON.parse(init.body);
      return { ok: true, status: 200, text: async () => '', json: async () => ({ id: 'm1' }) };
    }
    return { ok: false, status: 404, text: async () => 'no', json: async () => ({}) };
  };
  const res = { code: null, body: null,
    status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await handler({ method: 'POST', headers: { authorization: 'Bearer t' }, body }, res);
  global.fetch = realFetch;
  if (keyWas === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = keyWas;
  return { res, seen };
}

/* the two payloads index.html actually sends today, transcribed from source */
const CALLER1 = { to: 'client@example.com', clientName: 'Adam Gunn',
  propertyLine: 'This covers work at 9222 Arlington Rd.', title: 'Roof Inspection Report',
  html: '<p>doc</p>', shareUrl: 'https://app.cardinalroster.com/s/abc' };
const CALLER2 = { to: 'client@example.com', clientName: 'Adam Gunn',
  propertyLine: 'This covers work at 9222 Arlington Rd.', title: 'Estimate',
  html: '<p>est</p>' };

(async function () {

console.log('\n── back-compat, proved DIFFERENTIALLY against the previous handler ──');
{
  if (!PREVF || !fs.existsSync(PREVF)) {
    ok('the previous senddoc was supplied for the differential test', false,
      'pass it as argv[5] — this test cannot run without it, and is NOT being skipped silently');
  } else {
    for (const [name, payload] of [['caller 1 (report/invoice)', CALLER1], ['caller 2 (AI estimate)', CALLER2]]) {
      const before = (await driveSend(PREVF, payload)).seen.resend;
      const after = (await driveSend(SENDF, payload)).seen.resend;
      ok(name + ' still reaches the mailer at all', !!before && !!after);
      if (before && after) {
        const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
        const diffs = keys.filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
        ok(name + ': the Resend payload is BYTE-IDENTICAL to 671', diffs.length === 0,
          diffs.map(k => k + ': ' + JSON.stringify(before[k]) + ' → ' + JSON.stringify(after[k])).join(' | '));
      }
    }
    /* the specific trap: folding subject into title would rename caller 2's
       attachment, whose title is the literal 'Estimate' */
    const c2 = (await driveSend(SENDF, CALLER2)).seen.resend;
    ok('caller 2\'s attachment is still Estimate.html — subject did NOT fold into title',
      c2 && c2.attachments && c2.attachments[0].filename === 'Estimate.html',
      c2 && c2.attachments && c2.attachments[0].filename);
    ok('…and neither existing caller is asked for admin', (await driveSend(SENDF, CALLER1)).seen.adminAsked === false);
  }
}

console.log('\n── the carrier variant ──');
{
  const CARRIER = { to: 'claims@claims.allstate.com', variant: 'carrier',
    subject: 'Supplement request — Adam Gunn — claim 0123',
    title: 'Supplement request', clientName: 'Shawn F',
    propertyLine: 'Adam Gunn — 9222 Arlington Rd  ·  Claim 0123',
    html: '<p>the letter</p>' };

  const good = await driveSend(SENDF, CARRIER);
  ok('an admin can send to a carrier', good.res.code === 200, good.res.code + ' ' + JSON.stringify(good.res.body));
  ok('…the admin gate WAS consulted', good.seen.adminAsked === true);
  ok('…the subject is the one the Desk composed, verbatim',
    good.seen.resend.subject === 'Supplement request — Adam Gunn — claim 0123', good.seen.resend.subject);
  ok('…the body is the CARRIER body, not the homeowner one',
    /supplement request attached/.test(good.seen.resend.html) &&
    !/Hi Shawn F/.test(good.seen.resend.html) && !/Questions\? Just reply/.test(good.seen.resend.html));
  ok('…and it states quantities-only in the mail itself',
    /Quantities are stated; pricing is not/.test(good.seen.resend.html));
  ok('…the letter rides as the attachment, named from title',
    good.seen.resend.attachments[0].filename === 'Supplement request.html' &&
    Buffer.from(good.seen.resend.attachments[0].content, 'base64').toString('utf8') === '<p>the letter</p>');

  const denied = await driveSend(SENDF, CARRIER, { admin: false });
  ok('a NON-admin is refused, and nothing is sent',
    denied.res.code === 403 && denied.seen.resend === null, denied.res.code);
  ok('…with a reason that names the rule', /admin-only/.test((denied.res.body || {}).error || ''));

  const rt = await driveSend(SENDF, Object.assign({}, CARRIER, { replyTo: 'claims@cardinalrenovations.net' }));
  ok('replyTo routes a carrier reply to a monitored mailbox',
    rt.seen.resend.reply_to === 'claims@cardinalrenovations.net');
  const noRt = await driveSend(SENDF, CARRIER);
  ok('…and defaults to the sender when absent',
    noRt.seen.resend.reply_to === 'theo@cardinalrenovations.net');
}

console.log('\n── the guards ──');
{
  const arr = await driveSend(SENDF, Object.assign({}, CALLER1, { to: ['a@b.c', 'd@e.f'] }));
  ok('an ARRAY recipient is refused with 400, not passed through as [[a,b]]',
    arr.res.code === 400 && arr.seen.resend === null, arr.res.code);
  const blank = await driveSend(SENDF, Object.assign({}, CALLER1, { to: '   ' }));
  ok('a whitespace-only recipient is refused', blank.res.code === 400 && blank.seen.resend === null);
  const noHtml = await driveSend(SENDF, { to: 'a@b.c', title: 'X' });
  ok('a missing body is still refused', noHtml.res.code === 400);
  const bad = await driveSend(SENDF, CALLER1, { badSession: true });
  ok('an invalid session is 401 and sends nothing',
    bad.res.code === 401 && bad.seen.resend === null);
  ok('…and that 401 is JSON, because auth now runs inside the try',
    bad.res.body && typeof bad.res.body.error === 'string');
}

console.log('\n── the Desk: the send control, EXECUTED through its four states ──');
{
  const fn = fnText(DESK, 'syncSend');
  ok('syncSend() exists', !!fn);
  if (fn) {
    const run = (S) => {
      const els = { sendBtn: { disabled: false, textContent: '' }, sendNote: { textContent: '' } };
      new Function('S', 'el', fn + '\nsyncSend();')(S, id => els[id]);
      return els;
    };
    const claim = { adjuster_email: 'claims@claims.allstate.com' };

    const notFiled = run({ claim: claim, filedId: null, sent: false });
    ok('not filed → send is disabled and says why',
      notFiled.sendBtn.disabled === true && /File the supplement first/.test(notFiled.sendNote.textContent));

    const noAddr = run({ claim: { adjuster_email: null }, filedId: 'r1', sent: false });
    ok('no adjuster address → REFUSES rather than guessing one',
      noAddr.sendBtn.disabled === true && /will not guess one/.test(noAddr.sendNote.textContent));
    ok('…and tells you what to do about it, so a refusal is not a broken screen',
      /Add the address you actually have/.test(noAddr.sendNote.textContent));

    const ready = run({ claim: claim, filedId: 'r1', sent: false });
    ok('filed + an address → send is live and NAMES the recipient before the tap',
      ready.sendBtn.disabled === false &&
      ready.sendNote.textContent.indexOf('claims@claims.allstate.com') > -1, ready.sendNote.textContent);

    const sent = run({ claim: claim, filedId: 'r1', sent: true });
    ok('already sent → permanently disabled, and says a sent letter is a record',
      sent.sendBtn.disabled === true && /Sent/.test(sent.sendBtn.textContent) &&
      /record, not a draft/.test(sent.sendNote.textContent));
  }
}

console.log('\n── the mailed packet: only what actually resolved is claimed ──');
{
  const fn = fnText(DESK, 'renderForSend');
  const sub = fnText(DESK, 'substitutePhotoTokens');
  const app = fnText(DESK, 'codeAppendix');
  const sel = fnText(DESK, 'clSelected');
  ok('renderForSend() exists', !!fn);
  if (fn && sub && app && sel) {
    const build = (signed) => {
      const S = { gaps: [
          { id: 'g1', item: 'Drip edge', photos: [{ path: 'a.jpg' }, { path: 'b.jpg' }] },
          { id: 'g2', item: 'Ice barrier', photos: [] }
        ], codeLetters: [], clPicked: {} };
      const sb = { storage: { from: () => ({ createSignedUrls: async (paths) => ({
        data: paths.map(p => signed ? { signedUrl: 'https://s/' + p + '?token=x' } : {}) }) }) } };
      return new Function('S', 'sb', 'esc', 'fmtDate', 'letterRaw', 'EXHIBIT_TTL',
        sub + '\n' + sel + '\n' + app + '\n' + fn + '\nreturn renderForSend;')(
          S, sb, ESC, d => String(d || ''),
          () => '<p>A [[PHOTOS:g1]]</p><p>B [[PHOTOS:g2]]</p>', 31536000);
    };
    const okPacket = await build(true)();
    ok('photographs that signed are embedded, and counted',
      okPacket.resolved === 2 && (okPacket.html.match(/<img/g) || []).length === 2, okPacket.resolved);
    ok('a gap with no photographs contributes nothing to the mailed letter',
      !/\[\[PHOTOS:g2\]\]/.test(okPacket.html));

    const failPacket = await build(false)();
    ok('photographs that FAILED to sign are not claimed — count is honest, not optimistic',
      failPacket.resolved === 0 && !/<img/.test(failPacket.html), failPacket.resolved);
    ok('…and no empty <div> is left asserting an exhibit block',
      !/<div><\/div>/.test(failPacket.html));

    ok('the exhibit TTL is a named constant, one year, with its reasoning',
      /var EXHIBIT_TTL = 31536000;/.test(DESK) && /1 year, in seconds/.test(DESK));
    ok('…and is deliberately NOT the 10-year document TTL',
      DESK.indexOf('315360000') === -1);
  }
}

console.log('\n── the honest ordering: mail leaves before the row is written ──');
{
  const fn = fnText(DESK, 'recordSend');
  ok('recordSend() is a SEPARATE function, so a failed write can retry without re-sending', !!fn);
  if (fn) {
    const drive = async (updateResult) => {
      const els = { sendBtn: { disabled: true, textContent: '', onclick: 'X' },
                    sendNote: { textContent: '', innerHTML: '' } };
      const calls = { updates: [], loads: 0 };
      const sb = { from: () => ({ update: (patch) => { calls.updates.push(patch); return {
        eq: () => ({ select: () => ({ single: async () => updateResult }) }) }; } }) };
      await new Function('S', 'sb', 'el', 'esc', 'letterRaw', 'syncSend', 'loadFilings', 'calls',
        fn + '\nreturn recordSend;')(
          { filedId: 'r1', claim: { id: 'c1' } }, sb, id => els[id], ESC,
          () => '<p>tokens [[PHOTOS:g1]]</p>', () => {}, () => { calls.loads++; }, calls)(
            'claims@claims.allstate.com', 'Subj', '<p>with urls</p>');
      return { els, calls };
    };

    const good = await drive({ data: { id: 'r1' }, error: null });
    ok('a successful send records sent_at and sent_to',
      good.calls.updates[0].sent_at && good.calls.updates[0].sent_to === 'claims@claims.allstate.com');
    ok('THE ARCHIVE IS WHAT WAS MAILED, captured at SEND time not at file time',
      Object.prototype.hasOwnProperty.call(good.calls.updates[0], 'letter_html'));
    ok('…and it stores TOKENS, never the live signed URLs (they expire)',
      /\[\[PHOTOS:/.test(good.calls.updates[0].letter_html) &&
      !/https:\/\/s\//.test(good.calls.updates[0].letter_html) &&
      !/with urls/.test(good.calls.updates[0].letter_html));
    ok('…the control ends disabled and reading Sent', good.els.sendBtn.disabled === true &&
      /Sent/.test(good.els.sendBtn.textContent));
    ok('…and the filings list is refreshed', good.calls.loads === 1);

    const bad = await drive({ data: null, error: { message: 'connection reset' } });
    ok('a FAILED writeback after a successful send is LOUD, never a swallowed catch',
      /WAS SENT/.test(bad.els.sendNote.innerHTML), bad.els.sendNote.innerHTML.slice(0, 80));
    ok('…it names the address the mail actually went to',
      bad.els.sendNote.innerHTML.indexOf('claims@claims.allstate.com') > -1);
    ok('…and carries the real error rather than a generic apology',
      /connection reset/.test(bad.els.sendNote.innerHTML));
    ok('…the retry is offered, and is a SAVE, not a second send',
      bad.els.sendBtn.disabled === false &&
      /Retry saving the record/.test(bad.els.sendBtn.textContent) &&
      typeof bad.els.sendBtn.onclick === 'function' &&
      /it will not send a second email/.test(bad.els.sendNote.innerHTML));
  }
}

console.log('\n── filed and SENT are two different facts ──');
{
  ok('the filings query asks for sent_at / sent_to',
    /select\('id, filing_type[^']*sent_at, sent_to'\)/.test(DESK));
  ok('…and a filing that never left says so', /not sent/.test(DESK));
  ok('…a sent one shows the date, and the address on hover',
    /'sent ' \+\s*\n?\s*esc\(fmtDate\(f\.sent_at\)\)/.test(DESK) || /sent ' \+/.test(DESK));
  ok('the sent pill has a rule (the 671 vocabulary lesson, applied on the way in)',
    /\.pill\.sent\{/.test(DESK));
  ok('the UI no longer promises send in a future build',
    !/Send-from-desk arrives in the next build/.test(DESK) && !/\(next build\) sent/.test(DESK));
  ok('nothing sends itself — send is wired to an explicit click and nothing else',
    /el\('sendBtn'\)\.addEventListener\('click', sendLetter\)/.test(DESK) &&
    !/sendLetter\(\)\s*;?\s*$/m.test(DESK.replace(/async function sendLetter[\s\S]*/, '')));
}

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 672 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 672; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:672,/.test(SRC));
  ok('…and states the ordering limit rather than hiding it',
    /the email leaves before the record saves/.test(SRC));
  ok('senddoc is NOT in vercel.json functions (it hands nothing to a model)', (function () {
    try { const v = JSON.parse(fs.readFileSync('/home/user/cardinal-inspections/vercel.json', 'utf8'));
      return !Object.keys(v.functions || {}).some(k => /senddoc/.test(k)); } catch (_) { return false; }
  })());
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
