// /api/sol.js
// AI Scope of Loss reader — extracts structured insurance info from an adjuster's
// PDF or scanned image. Gated by the caller's Supabase session, same as analyze.js.
//
// Env vars needed:
//   GEMINI_API_KEY  — the paid Gemini key (same one analyze.js uses)
//
// Request body, EITHER shape:
//   { file: <base64 payload>, mime: "application/pdf" | "image/..." }   small files, sent inline
//   { url:  <Supabase storage URL> }                                     large files (643)
//
// 643: the URL shape is what index.html has been sending all along for anything
// over 3.1 MB. It uploads to photos/scopes/… , makes a 600-second signed URL and
// POSTs { url }. This route only ever read `file`, so it answered 400 "No file"
// and the client showed "the extractor doesn't accept links yet — deploy the
// updated api/sol.js." That message was an honest placeholder for a server half
// that was never written. Adam Gunn's scope is the file that found it.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';
const MODEL = 'gemini-3.5-flash';
const MAX_BYTES = 12 * 1024 * 1024;   // 12 MB raw cap; base64 is ~16 MB

/* 643 — THE ONLY PLACE A CALLER-SUPPLIED URL MAY POINT.
   Fetching a URL the caller chose is server-side request forgery unless it is
   bounded. A signed-in user could otherwise hand this route an internal address
   and read the response through the error body. This route exists to read a
   scope the CLIENT JUST UPLOADED, so the bound is exact: this project's Supabase
   storage, nothing else. Not a substring test — a prefix test on the parsed
   origin, so "https://evil.test/?x=https://yipslub…supabase.co/storage/v1/"
   cannot pass. */
const STORAGE_PREFIX = SUPABASE_URL + '/storage/v1/';

function storageUrlOrNull(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  if (u.protocol !== 'https:') return null;
  if (u.origin !== new URL(SUPABASE_URL).origin) return null;
  if (!raw.startsWith(STORAGE_PREFIX)) return null;
  return raw;
}

/* 505: the second rung, same as 502 elsewhere. gemini-3.5-flash 503s "high
   demand" in spells - measured at roughly one call in four this afternoon - and
   this route had NO fallback, so it simply failed while OpenAI sat idle at 0.6s.

   Returns GEMINI'S OWN response shape, so the call site below reads it unchanged.
   Never throws: on any failure it hands back the original Gemini response and the
   existing error path behaves exactly as before.

   Handles BOTH part spellings: inlineData/mimeType (most routes) and
   inline_data/mime_type (sol.js). Missing that would have shipped a silently
   text-only fallback for the one route whose whole job is reading a document. */
async function aiFallback(parts, geminiRes) {
  const oaKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!oaKey) return geminiRes;
  try {
    const content = [];
    (parts || []).forEach(p => {
      if (!p) return;
      if (typeof p.text === 'string') { content.push({ type: 'text', text: p.text }); return; }
      const inl = p.inlineData || p.inline_data;
      if (inl) {
        const mime = inl.mimeType || inl.mime_type || 'image/jpeg';
        const dataUrl = 'data:' + mime + ';base64,' + inl.data;
        /* 661: A PDF IS NOT AN image_url. Chat Completions reads a PDF only
           through a `file` content part; handed one as image_url it answers
           400 and this rung falls straight back to the Gemini error. So for
           the ONE route whose whole job is reading a PDF, the fallback has
           never once worked — it has been decorative since 505.
           ⚠ I could not exercise this shape from the sandbox (no OpenAI key
           here). It is guarded the same way the rest of aiFallback is: any
           non-ok answer returns the original Gemini response, so a wrong
           guess costs exactly what today already costs. */
        if (mime.indexOf('pdf') >= 0) {
          content.push({ type: 'file', file: { filename: 'scope.pdf', file_data: dataUrl } });
        } else {
          content.push({ type: 'image_url', image_url: { url: dataUrl } });
        }
      }
    });
    if (!content.length) return geminiRes;
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + oaKey },
      /* 659: 1200 truncated the same way Gemini's 1024 did, and this rung had no
         JSON discipline at all. Both rungs now answer in JSON and have room. */
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content }]
      })
    });
    if (!r || !r.ok) return geminiRes;
    const d = await r.json();
    const t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    if (!t) return geminiRes;
    return { ok: true, status: 200, _via: 'openai', json: async () => ({
      candidates: [{ content: { parts: [{ text: String(t) }] } }]
    }) };
  } catch (e) {
    return geminiRes;
  }
}

/* 661 — WHICH failure, in the sentence the user actually sees.

   659 replaced a raw model dump with a written sentence, which was right, and
   in the same move made the failure undiagnosable: "could not turn this
   document into fields" is the answer for a blocked prompt, an empty reply, a
   refusal in prose and a reply that simply had no JSON in it. Four causes, one
   sentence, and `detail` no longer reaches the screen.

   So the sentence carries a short labelled tail. It is not the 659 dump coming
   back: no model text, fixed length, and every number in it is one a screenshot
   can carry.

     [gemini · finish STOP · in 48210 tok · out 0 tok · reply 0 chars]

   promptTokenCount is the load-bearing one. A 4.8 MB scope should ingest as
   tens of thousands of tokens; a few hundred means the document never reached
   the model at all, and no amount of prompt work would have helped. */
function readerDiag(via, body, cand, text, ms, note, docBytes) {
  const u = (body && body.usageMetadata) || {};
  const bits = [via];
  const blocked = body && body.promptFeedback && body.promptFeedback.blockReason;
  if (blocked) bits.push('blocked ' + blocked);
  else bits.push('finish ' + (cand.finishReason || 'none'));
  /* 663: the number that makes `in N tok` interpretable, and it is deliberately
     printed IMMEDIATELY BEFORE it — the pair is meant to be read as one
     sentence. A small ingest alone is ambiguous: EITHER the document never
     arrived, or it arrived whole and was not read. Different bugs, different
     code. `doc` is what this route held in its hand after fetching, so
     `doc 4.8 MB · in 400 tok` (we had it, the model did not take it) and
     `doc 0.0 MB · in 400 tok` (it never got here) stop looking the same. */
  if (docBytes) bits.push('doc ' + (docBytes / 1048576).toFixed(1) + ' MB');
  if (u.promptTokenCount != null) bits.push('in ' + u.promptTokenCount + ' tok');
  if (u.candidatesTokenCount != null) bits.push('out ' + u.candidatesTokenCount + ' tok');
  bits.push('reply ' + String(text || '').length + ' chars');
  /* 662: a slow model that answered and an instant refusal look identical
     without this. It is also the only number that says whether the platform
     duration is the ceiling being hit. */
  if (ms != null) bits.push((ms / 1000).toFixed(1) + 's');
  if (note) bits.push(note);
  return ' [' + bits.join(' \u00b7 ') + ']';
}

/* Only an OBJECT counts as parsed. A model that answers `"unreadable"` produces
   valid JSON that is not a result, and 659's shape guard caught that AFTER the
   retry point — too late to try the other way. */
function parseObj(t) {
  if (!t) return null;
  try { const v = JSON.parse(t); if (v && typeof v === 'object') return v; } catch (e) {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a !== -1 && b > a) {
    try { const v = JSON.parse(t.slice(a, b + 1)); if (v && typeof v === 'object') return v; } catch (e2) {}
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    // ---- 1) auth ----
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'Sign in required' }); return; }
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
    const user = await who.json();
    if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return; }

    // ---- 2) validate ----
    const body = req.body || {};
    let { file, mime } = body;
    /* 663: how many bytes of document this route ended up holding, whichever
       door it came through. Set on both paths below; 0 means "never got one". */
    let docBytes = 0;

    /* 643: the stored-file path. index.html uploads anything over 3.1 MB to
       photos/scopes/… and sends the signed URL instead of 16 MB of base64. */
    if (!file && body.url) {
      const safeUrl = storageUrlOrNull(body.url);
      if (!safeUrl) {
        res.status(400).json({ error: 'That link is not a Cardinal storage URL' });
        return;
      }
      let doc;
      try {
        doc = await fetch(safeUrl);
      } catch (e) {
        res.status(502).json({ error: 'Could not fetch the uploaded file' });
        return;
      }
      /* A signed URL lasts 600s. If the read took longer than the extraction
         queue, say so plainly rather than reporting "AI request failed". */
      if (!doc.ok) {
        res.status(doc.status === 400 || doc.status === 401 || doc.status === 403 ? 410 : 502)
           .json({ error: doc.status === 200 ? 'Could not fetch the uploaded file'
                        : 'The upload link has expired or was refused — try the upload again' });
        return;
      }
      const buf = Buffer.from(await doc.arrayBuffer());
      docBytes = buf.length;                    /* 663: the exact fetched size */
      if (buf.length > MAX_BYTES) {
        res.status(413).json({
          error: 'That file is ' + (buf.length / 1048576).toFixed(1) +
                 ' MB. The reader handles up to ' + (MAX_BYTES / 1048576) +
                 ' MB — split it and upload the scope pages only.'
        });
        return;
      }
      if (!buf.length) { res.status(502).json({ error: 'The uploaded file came back empty' }); return; }
      file = buf.toString('base64');
      /* Trust the stored object's own content type over anything in the body. */
      mime = mime || (doc.headers.get('content-type') || 'application/pdf').split(';')[0].trim();
    }

    if (!file || typeof file !== 'string') { res.status(400).json({ error: 'No file' }); return; }
    /* the inline door never touches a Buffer, so derive it: base64 carries 3
       bytes in every 4 characters. Close enough to tell 4.8 MB from 0.0 MB,
       which is the only question this number has to answer. */
    if (!docBytes) docBytes = Math.floor(file.replace(/=+$/, '').length * 3 / 4);
    if (file.length > MAX_BYTES * 1.4) { res.status(413).json({ error: 'File too large (12 MB cap)' }); return; }
    const mt = (mime || 'application/pdf').toLowerCase();
    const isPdf = mt.indexOf('pdf') >= 0;
    const isImage = mt.indexOf('image/') === 0;
    if (!isPdf && !isImage) { res.status(400).json({ error: 'Unsupported file type — send PDF or image' }); return; }

    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key) { res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' }); return; }

    // ---- 3) prompt ----
    const prompt =
      'You are extracting insurance claim information from a Scope of Loss document ' +
      '(often produced by an insurance adjuster after inspecting a roof claim). ' +
      'The document may be a PDF or scanned image. Read carefully. Extract only ' +
      'values that are clearly present. Do not invent values. Use null for ' +
      'missing fields.\n\n' +
      /* 646: the claim table has had an adjuster_company column and rendered it
         on screen since the claims module shipped, but nothing ever filled it —
         no input on the form, and this prompt never asked. */
      /* 658, Theo: "These can be called different things like code upgrades,
         code coverage, building codes etc." The prompt named the field and
         nothing else, so a scope plainly carrying code-upgrade coverage could
         read as nothing at all. Name the aliases, and make the tri-state
         explicit: an absent mention is null, NEVER false. */
      'Ordinance & Law coverage pays for work required by current building code ' +
      'that the original construction did not include. Carriers name it many ways: ' +
      'ordinance or law, law and ordinance, ordinance and law, code upgrade, ' +
      'code coverage, code compliance, building code coverage, building ordinance, ' +
      'and on some forms Coverage D or an endorsement number. Treat any of these ' +
      'as the same thing.\n\n' +
      'Set ord_law TRUE only if the document affirmatively shows such coverage ' +
      '(a line item, a limit, an endorsement). Set it FALSE only if the document ' +
      'explicitly states there is none \u2014 for example "no ordinance or law coverage ' +
      'applies". If the document simply does not mention it, set it to NULL. Do not ' +
      'guess, and never use false to mean "not mentioned".\n\n' +
      /* 660, Theo, reading the estimate 658's reader missed: "In insurance
         estimates, Ordinance and Law is typically categorized under Building
         Codes (Coverage BC)." 658 taught the PROSE names and none of them
         appear on an Xactimate scope — the coverage is a CATEGORY CODE with
         its own subtotal and summary page, not an endorsement line. */
      'MOST IMPORTANT: on an Xactimate-style estimate this coverage appears as a ' +
      'COVERAGE CATEGORY, not as a sentence. The category is coded "BC" and reads ' +
      '"BC-Building Codes" or "Building Codes", with its own line in the coverage ' +
      'breakdown and often a dedicated "Summary for BC-Building Codes" page. ' +
      'A BC category with a non-zero total IS ordinance & law coverage \u2014 set ' +
      'ord_law true and put the category name in ord_law_basis.\n\n' +
      'That category carries TWO totals and they are different numbers: the ' +
      'Item Total (replacement cost of the code work) goes in ord_law_rcv, and ' +
      'the ACV / Net Total goes in ord_law_acv. Report both when both are shown. ' +
      'Do NOT assume the ACV is the smaller one \u2014 on some carriers sales tax on ' +
      'code items makes the ACV total exceed the item total. Copy what is printed.\n\n' +
      'ord_law_limit is a DIFFERENT thing: the policy endorsement cap, often ' +
      'expressed as a percentage of Coverage A. Only fill it if the document ' +
      'states such a cap. Never put a scope subtotal there.\n\n' +
      'Code-driven line items support a yes but are not the number: ice & water ' +
      'barrier, radiant-barrier or upgraded sheathing, drip edge, and EPA ' +
      'Lead-Safe Work Practice allowances on homes built before 1978. If you see ' +
      'these but no BC category, still set ord_law true and say so in ' +
      'ord_law_basis, leaving the amounts null.\n\n' +
      'Put the document\u2019s OWN wording in ord_law_basis, verbatim and short ' +
      '(for example "BC-Building Codes", "Code Upgrade Coverage" or ' +
      '"Ordinance or Law - Coverage D"). Leave the amounts null when ord_law ' +
      'is not true.\n\n' +
      /* 680: this route never asked for the cause, so the claim screen's
         "Cause of Loss" sat empty on every claim unless somebody typed it, and
         index.html's mapping for it (which has always existed) was reading a
         key that never arrived. The vocabulary below is NOT free text — it
         mirrors the seven options in the claim form's select, and a value
         outside that list simply fails to match and fills nothing. Returning
         the wrong one of the seven is worse than returning null, hence the
         instruction to leave it null when the document does not say. */
      'cause_of_loss must be exactly ONE of these seven tokens and nothing ' +
      'else: hail, wind, wind_hail, fire, water, tree_impact, other. Use ' +
      'wind_hail only when the document names BOTH wind and hail as the peril. ' +
      'Scope line items are evidence: a scope full of shingle replacement with ' +
      'test squares and hits-per-square is hail; one full of tarping, blown-off ' +
      'shingles and ridge cap is wind. If the document does not state a peril ' +
      'and the line items do not clearly show one, return null — do not ' +
      'guess, and never invent an eighth token.\n\n' +
      'For adjuster.company give the adjusting firm or catastrophe team named on ' +
      'the document \u2014 for example a carrier\u2019s national catastrophe team, or an ' +
      'independent adjusting company. Do not repeat the carrier name on its own.\n\n' +
      'Respond with ONLY raw JSON, no markdown fences, no preamble, in exactly this shape:\n' +
      '{\n' +
      '  "carrier": string or null,\n' +
      '  "policy_number": string or null,\n' +
      '  "claim_number": string or null,\n' +
      '  "date_of_loss": "YYYY-MM-DD" or null,\n' +
      '  "cause_of_loss": one of "hail" "wind" "wind_hail" "fire" "water" "tree_impact" "other", or null,\n' +
      '  "adjuster": {\n' +
      '    "name": string or null,\n' +
      '    "company": string or null,\n' +
      '    "phone": string or null,\n' +
      '    "email": string or null\n' +
      '  },\n' +
      '  "deductible": number or null,\n' +
      '  "coverage_type": "RCV" or "ACV" or null,\n' +
      '  "ord_law": true or false or null,\n' +
      '  "ord_law_basis": string or null,\n' +
      '  "ord_law_rcv": number or null,\n' +
      '  "ord_law_acv": number or null,\n' +
      '  "ord_law_limit": number or null,\n' +
      '  "insured_name": string or null,\n' +
      '  "property_address": string or null,\n' +
      '  "totals": {\n' +
      '    "rcv": number or null,\n' +
      '    "acv": number or null,\n' +
      '    "depreciation": number or null,\n' +
      '    "net_claim": number or null\n' +
      '  },\n' +
      '  "summary": "one sentence describing what this document is and its top-line finding"\n' +
      '}\n\n' +
      'If the document is not a Scope of Loss / claim summary, set every field to null ' +
      'and put a note explaining what the document appears to be in the summary field.';

    // ---- 4) call Gemini ----
    const _parts = [
      { inline_data: { mime_type: mt, data: file } },
      { text: prompt }
    ];

    /* 661: ONE attempt, written once, so the retry below is the SAME call with
       one field changed rather than a second pipeline beside the first. The 647
       banner in index.html forbids a sixth /api/sol caller for exactly this
       reason; the same discipline applies inside the route. */
    /* 662: THE FUNCTION HAS A CLOCK ON IT.
       `vercel.json` carried no `functions` block until this build, so every
       route ran on the platform default (10s Hobby / 15s Pro). A multimodal
       read of a multi-page scope does not fit that, and 661's retry made it
       two of them back to back — so the retry could turn a 502 carrying the
       diagnosis into a platform 504, and the client would show "HTTP 504"
       instead of the sentence the retry exists to produce. maxDuration is now
       60, and this guard holds even if that config is ever lost: the budget is
       what THIS function may spend, not what the platform allows. */
    const T0 = Date.now();
    const TIME_BUDGET_MS = 45000;   /* 60s cap, 15s of headroom to answer in */
    const elapsed = () => Date.now() - T0;

    /* 663: the diagnosis is assembled in ONE place. It had four call sites and
       every new field had to be threaded through all four by hand — which is
       how a field ends up on three of them. */
    const diag = (att, note) =>
      readerDiag(att.via, att.body, att.cand, att.text, elapsed(), note, docBytes);

    async function askGemini(jsonMode) {
      const t = Date.now();
      let r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ parts: _parts }],
            /* 659: Theo's scope came back as "Could not read that scope:"
               followed by RAW MODEL OUTPUT, cut off mid-word — three times,
               three cut points. The model had read the document correctly each
               time and was being TRUNCATED at 1024 tokens, because it narrates
               page by page before emitting the JSON. The budget is no longer a
               cliff a five-page scope falls off.
               ⚠ 661: responseMimeType is now the FIRST attempt, not the only
               one. It is what stops the narration — and it arrived in the same
               build after which the failure changed shape, so it is also the
               prime suspect. jsonMode false is the pre-659 request with 659's
               budget: narration is affordable now. */
            generationConfig: jsonMode
              ? { maxOutputTokens: 8192, temperature: 0.1, responseMimeType: 'application/json' }
              : { maxOutputTokens: 8192, temperature: 0.1 }
          })
        }
      );
      /* 505: BEFORE the body is read - a Response can only be consumed once, and
         the fallback returns a different object with its own json(). */
      if (!r.ok) r = await aiFallback(_parts, r);
      const body = await r.json();
      const cand = (body && body.candidates ? body.candidates : [])[0] || {};
      let text = ((cand.content || {}).parts || []).map(p => p.text || '').join('');
      text = String(text || '').replace(/```json|```/g, '').trim();
      return { ok: !!r.ok, via: r._via === 'openai' ? 'openai' : 'gemini', body, cand, text,
               ms: Date.now() - t };
    }

    let a = await askGemini(true);
    if (!a.ok) {
      res.status(502).json({
        /* the carrier's own message is the only unbounded string that reaches
           this field, and solRead() slices the whole thing at 250 — an 800-char
           Google error would push the diagnosis straight off the end, in the one
           case where it is most wanted. Cap the quote, never the diagnosis. */
        error: String((a.body && a.body.error && a.body.error.message) || 'AI request failed').slice(0, 150) +
               diag(a),
        detail: JSON.stringify(a.body).slice(0, 500)
      });
      return;
    }

    let parsed = parseObj(a.text);

    /* 659: a truncation is its own answer and retrying makes it worse — without
       the JSON constraint the model narrates, which is what filled the budget in
       the first place. Report it and stop. */
    if (!parsed && a.cand.finishReason === 'MAX_TOKENS') {
      res.status(502).json({
        error: 'The reader ran out of room before it finished this scope. ' +
               'It is a long document \u2014 try uploading just the scope and totals pages.' +
               diag(a)
      });
      return;
    }

    /* 661: THE RETRY. One extra call, only on the failure path.
       662: and only if it can FINISH. The test is not "is there time left" but
       "would a second call as long as the first still land inside the budget" —
       the first attempt's own duration is the best estimate of the second's.
       Starting one it cannot finish trades a diagnosis for a 504. */
    let skipped = '';
    if (!parsed) {
      if (elapsed() + a.ms < TIME_BUDGET_MS) {
        const b = await askGemini(false);
        if (b.ok) {
          const p2 = parseObj(b.text);
          if (p2) parsed = p2;
          /* nothing usable either way: report whichever attempt actually said
             something, because "it answered in words" and "it answered nothing"
             are different problems and only one of them is about the prompt. */
          if (!parsed && !a.text && b.text) a = b;
        }
      } else {
        skipped = 'no 2nd try (time)';
      }
    }

    if (!parsed) {
      const blocked = a.body && a.body.promptFeedback && a.body.promptFeedback.blockReason;
      let msg;
      if (blocked) {
        msg = 'The reader refused this document \u2014 the AI would not answer on it.';
      } else if (!a.text) {
        msg = 'The reader answered with nothing at all. The document may be too large ' +
              'for one pass \u2014 try the scope and totals pages on their own.';
      } else {
        msg = 'The reader answered in words instead of fields. It may not be a scope of ' +
              'loss, or the pages may be images the text did not come through on.';
      }
      /* 662: a second channel that does not depend on a screenshot. The model's
         reply can name a homeowner and an address, so it is capped and it is the
         only thing logged — never the document bytes, never a key. Vercel's
         function log is team-only; this is Cardinal's own data either way, and
         the same 300 characters already travel to the client as `detail`. */
      console.error('[sol] unreadable reply', JSON.stringify({
        via: a.via, finish: a.cand.finishReason || null,
        blocked: (a.body && a.body.promptFeedback && a.body.promptFeedback.blockReason) || null,
        usage: (a.body && a.body.usageMetadata) || null,
        ms: elapsed(), skipped: skipped || null, docBytes: docBytes, chars: a.text.length,
        head: a.text.slice(0, 500)
      }));
      res.status(502).json({
        error: msg + diag(a, skipped),
        detail: a.text.slice(0, 300)
      });
      return;
    }

    res.status(200).json({ extracted: parsed, model: MODEL });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
