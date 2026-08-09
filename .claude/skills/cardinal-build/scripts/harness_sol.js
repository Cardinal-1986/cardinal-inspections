/* Build 643 — /api/sol accepts a storage LINK, not just inline base64.

   Theo: "scope is still not uploading for Gunn." index.html has always uploaded
   anything over 3.1 MB to photos/scopes/… and POSTed { url }; this route only
   read `file`, answered 400 "No file", and the client showed "the extractor
   doesn't accept links yet — deploy the updated api/sol.js." The server half was
   never written.

   This executes the SHIPPED handler with a stubbed global fetch — it is not a
   re-implementation. Auth, storage and Gemini are all stubbed at the fetch
   boundary, so the module's own control flow is what is under test.

   ⚠️ THE SSRF CASES ARE THE POINT. Fetching a caller-supplied URL server-side is
   an open proxy unless bounded. A signed-in user must not be able to make this
   route read 169.254.169.254, or localhost, or any host that merely *contains*
   the storage prefix.

       node harness_sol.js                      # current  -> GREEN
       node harness_sol.js /path/to/old/sol.js  # main@641 -> RED on the link cases

   Usage: node harness_sol.js [path-to-api/sol.js]                             */
const path = require('path');
const url = require('url');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/api/sol.js';

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const SUPA = 'https://yipslubcptjoarblzbpl.supabase.co';
const STORAGE = SUPA + '/storage/v1/';
const SIGNED = STORAGE + 'object/sign/photos/scopes/1754700000-ab12cd-scope.pdf?token=eyJhbGc';

/* A fake response good enough for the handler's own reads. */
const R = (status, body, headers) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => (headers || {})[String(k).toLowerCase()] || null },
  json: async () => body,
  arrayBuffer: async () => (body instanceof Buffer ? body : Buffer.from(String(body || ''))),
});

const GEMINI_OK = {
  candidates: [{ content: { parts: [{ text: JSON.stringify({
    carrier: 'State Farm', policy_number: null, claim_number: 'X-1', date_of_loss: null,
    adjuster: { name: null, phone: null, email: null }, deductible: null,
    coverage_type: 'RCV', ord_law: null, insured_name: 'Adam Gunn',
    property_address: null, totals: { rcv: 1, acv: 1, depreciation: 0, net_claim: 1 },
    summary: 'scope',
  }) }] } }],
};

/* Records what the handler asked the outside world for. */
function makeFetch(opts) {
  const seen = { urls: [], geminiBody: null };
  globalThis.fetch = async (u, init) => {
    const s = String(u);
    seen.urls.push(s);
    if (s.indexOf('/auth/v1/user') >= 0) {
      return opts.badSession ? R(401, {}) : R(200, { email: 'theo@cardinalrenovations.net' });
    }
    if (s.indexOf('generativelanguage.googleapis.com') >= 0) {
      seen.geminiBody = JSON.parse(init.body);
      return R(200, GEMINI_OK);
    }
    if (s.indexOf('api.openai.com') >= 0) return R(500, {});
    // anything else is the storage (or attacker-supplied) fetch
    if (opts.storageStatus && opts.storageStatus !== 200) return R(opts.storageStatus, {});
    return R(200, opts.storageBody !== undefined ? opts.storageBody : Buffer.from('%PDF-1.4 fake'),
             { 'content-type': opts.storageType || 'application/pdf' });
  };
  return seen;
}

function makeRes() {
  const out = { code: 0, body: null };
  return {
    status(c) { out.code = c; return this; },
    json(b) { out.body = b; return this; },
    _out: out,
  };
}

(async () => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
  let handler;
  try {
    const mod = await import(url.pathToFileURL(path.resolve(FILE)).href + '?t=' + Date.now());
    handler = mod.default;
  } catch (e) {
    console.log('  FAIL could not import the handler → ' + e.message);
    process.exit(1);
  }

  const call = async (body, opts) => {
    const seen = makeFetch(opts || {});
    const res = makeRes();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body }, res);
    return { ...res._out, seen };
  };

  console.log('\n── the link path (643) ──');
  {
    const r = await call({ url: SIGNED }, {});
    ok('a signed storage link is accepted', r.code === 200, r.code + ' ' + JSON.stringify(r.body).slice(0, 90));
    ok('...the file was actually fetched from storage',
      r.seen.urls.some(u => u === SIGNED));
    ok('...and its bytes reached Gemini as base64 inline_data', (() => {
      const p = r.seen.geminiBody && r.seen.geminiBody.contents[0].parts[0];
      return !!(p && p.inline_data && p.inline_data.data ===
        Buffer.from('%PDF-1.4 fake').toString('base64'));
    })());
    ok('...with the stored object’s own content type', (() => {
      const p = r.seen.geminiBody && r.seen.geminiBody.contents[0].parts[0];
      return !!(p && p.inline_data && p.inline_data.mime_type === 'application/pdf');
    })());
    ok('...and the extraction comes back', r.body && r.body.extracted &&
      r.body.extracted.insured_name === 'Adam Gunn');
  }

  console.log('\n── SSRF: a caller-supplied URL is bounded to Cardinal storage ──');
  const BLOCKED = [
    ['AWS instance metadata', 'http://169.254.169.254/latest/meta-data/'],
    ['localhost', 'http://127.0.0.1:3000/admin'],
    ['another host carrying the prefix in its query', 'https://evil.test/?x=' + STORAGE],
    ['a subdomain-suffix lookalike', 'https://yipslubcptjoarblzbpl.supabase.co.evil.test/storage/v1/x'],
    ['userinfo before an attacker host', 'https://yipslubcptjoarblzbpl.supabase.co@evil.test/storage/v1/x'],
    ['plain http to the right host', 'http://yipslubcptjoarblzbpl.supabase.co/storage/v1/x'],
    ['the right host but the auth API', SUPA + '/auth/v1/admin/users'],
    ['not a URL at all', 'javascript:alert(1)'],
  ];
  /* ⚠️ "400 and never fetched" alone does NOT discriminate: a build that does not
     understand `url` at all refuses everything with "No file" and scores full
     marks here, which is exactly what the first version of this harness did
     against main@641. Require the refusal to be ABOUT THE LINK, so these cases
     can only pass on a build that actually looked at the URL and rejected it. */
  for (const [name, bad] of BLOCKED) {
    const r = await call({ url: bad }, {});
    const aboutTheLink = r.code === 400 && /link/i.test((r.body && r.body.error) || '');
    const neverFetched = !r.seen.urls.some(u => u === bad);
    ok('refused as a bad link, and never fetched: ' + name, aboutTheLink && neverFetched,
      'code ' + r.code + ' ' + ((r.body && r.body.error) || '') + (neverFetched ? '' : ' AND IT FETCHED IT'));
  }

  console.log('\n── failure modes say something actionable ──');
  {
    const r = await call({ url: SIGNED }, { storageStatus: 403 });
    ok('an expired/refused signed link is not reported as an AI failure',
      r.code === 410 && /expired|refused/i.test(r.body.error), r.code + ' ' + (r.body && r.body.error));
  }
  {
    const big = Buffer.alloc(13 * 1024 * 1024, 0x41);
    const r = await call({ url: SIGNED }, { storageBody: big });
    ok('an oversized file is refused with its real size named',
      r.code === 413 && /13\.0 MB/.test(r.body.error), r.code + ' ' + (r.body && r.body.error));
    ok('...and it never reached Gemini', r.seen.geminiBody === null);
  }
  {
    const r = await call({ url: SIGNED }, { storageBody: Buffer.alloc(0) });
    ok('an empty object is not sent on as a valid document',
      r.code === 502 && /empty/i.test(r.body.error), r.code + ' ' + (r.body && r.body.error));
  }

  console.log('\n── what must not have regressed ──');
  {
    const r = await call({ file: Buffer.from('%PDF-1.4 inline').toString('base64'), mime: 'application/pdf' }, {});
    ok('the inline base64 path still works', r.code === 200 && r.body.extracted, r.code);
    ok('...and it does NOT fetch storage',
      !r.seen.urls.some(u => u.indexOf('/storage/v1/') >= 0));
  }
  {
    const r = await call({}, {});
    ok('an empty body is still 400 No file', r.code === 400, r.code);
  }
  {
    const seen = makeFetch({});
    const res = makeRes();
    await handler({ method: 'POST', headers: {}, body: { url: SIGNED } }, res);
    ok('no token is 401 before anything is fetched',
      res._out.code === 401 && !seen.urls.some(u => u === SIGNED), res._out.code);
  }
  {
    const r = await call({ url: SIGNED }, { badSession: true });
    ok('an invalid session is 401, and storage is never read',
      r.code === 401 && !r.seen.urls.some(u => u === SIGNED), r.code);
  }

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
