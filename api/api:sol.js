/**
 * api/sol.js — Scope of Loss extractor
 * v2026-07-24
 *
 * WHAT CHANGED
 *   The old version only accepted the file base64-encoded inside the JSON
 *   body. Vercel caps an inbound request body at 4.5 MB and base64 inflates
 *   by a third, so anything over roughly 3.1 MB came back as HTTP 413.
 *
 *   This version also accepts { url } — the client uploads to Supabase
 *   Storage first and sends a link. The fetch then happens server-side,
 *   where that cap doesn't apply, so a 20 MB scope is fine.
 *
 *   The old { file, mime } path still works, so nothing that hasn't been
 *   updated breaks.
 *
 * REQUEST
 *   { url: "https://...signed-url..." }          preferred
 *   { file: "<base64>", mime: "application/pdf" } legacy, small files only
 *
 * RESPONSE
 *   { extracted: { ...fields... } }
 *
 * ENV
 *   GEMINI_API_KEY   AQ.-format key, sent as the x-goog-api-key HEADER
 *   OPENAI_API_KEY   fallback
 */

const GEMINI_MODEL = 'gemini-3.5-flash';
const MAX_BYTES = 20 * 1024 * 1024;

// The client renders exactly these fields, so the model is told to return
// exactly these keys. Anything renamed here has to be renamed there too.
const SCHEMA_PROMPT = `
You are reading an insurance Scope of Loss / adjuster's estimate for a
roofing contractor. Extract what is actually printed. Never guess, never
infer, never carry a number over from a different line. If a field is not
present, return null for it.

Return ONLY a JSON object, no markdown fences, no commentary:

{
  "insured_name":   "the named insured / homeowner",
  "loss_location":  "the property address where the loss occurred",
  "carrier":        "insurance company name",
  "policy_number":  "policy number",
  "claim_number":   "claim number",
  "date_of_loss":   "date of loss as printed",
  "coverage_type":  "RCV, ACV, or whatever is stated",
  "ord_law":        "ordinance and law coverage amount or percentage if stated",
  "deductible":     "deductible amount as a number, no currency symbol",
  "totals": {
    "rcv": "replacement cost value total as a number",
    "acv": "actual cash value total as a number"
  },
  "adjuster": {
    "name":  "adjuster name",
    "phone": "adjuster phone",
    "email": "adjuster email"
  },
  "summary": "one sentence describing the scope of work"
}

Money must be plain numbers: 18450.72 not "$18,450.72".
The mailing address and the loss location are often different — take the
loss location.
`.trim();

function jsonOut(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/** Pull the file down and hand back base64 + mime. */
async function fetchAsBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not fetch the file (HTTP ${r.status})`);

  const len = Number(r.headers.get('content-length') || 0);
  if (len && len > MAX_BYTES) {
    throw new Error(`That file is ${(len / 1024 / 1024).toFixed(1)} MB. The limit is 20 MB.`);
  }

  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    throw new Error(`That file is ${(buf.length / 1024 / 1024).toFixed(1)} MB. The limit is 20 MB.`);
  }

  let mime = (r.headers.get('content-type') || '').split(';')[0].trim();
  if (!mime || mime === 'application/octet-stream') {
    mime = /\.pdf(\?|$)/i.test(url) ? 'application/pdf' : 'image/jpeg';
  }
  return { b64: buf.toString('base64'), mime };
}

function stripFences(t) {
  return String(t || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
}

async function callGemini(b64, mime) {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const body = {
    contents: [{
      parts: [
        { text: SCHEMA_PROMPT },
        { inline_data: { mime_type: mime, data: b64 } },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 2048 },
  };

  // AQ.-format keys must go in the header, not ?key=
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    }
  );

  if (r.status === 503) {
    // Capacity spike — one retry is usually enough
    await new Promise((s) => setTimeout(s, 1500));
    return callGemini(b64, mime);
  }
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Gemini ${r.status}: ${t.slice(0, 200)}`);
  }

  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return JSON.parse(stripFences(text));
}

async function callOpenAI(b64, mime) {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  if (mime === 'application/pdf') {
    throw new Error('The OpenAI fallback cannot read PDFs — photograph the pages instead');
  }

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: SCHEMA_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
        ],
      }],
    }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`OpenAI ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return JSON.parse(stripFences(j?.choices?.[0]?.message?.content || ''));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonOut(res, 405, { error: 'POST only' });

  try {
    const { url, file, mime } = req.body || {};
    let b64, type;

    if (url) {
      const got = await fetchAsBase64(url);
      b64 = got.b64;
      type = got.mime;
    } else if (file) {
      b64 = file;
      type = mime || 'application/pdf';
    } else {
      return jsonOut(res, 400, { error: 'Send either { url } or { file, mime }' });
    }

    let extracted;
    try {
      extracted = await callGemini(b64, type);
    } catch (ge) {
      console.warn('[sol] Gemini failed, trying OpenAI:', ge.message);
      try {
        extracted = await callOpenAI(b64, type);
      } catch (oe) {
        return jsonOut(res, 502, {
          error: 'Could not read the document',
          detail: `${ge.message} | fallback: ${oe.message}`,
        });
      }
    }

    return jsonOut(res, 200, { extracted: extracted || {} });
  } catch (e) {
    return jsonOut(res, 500, { error: 'Extraction failed', detail: String(e.message || e) });
  }
}
