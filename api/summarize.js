// /api/summarize.js
// Vercel serverless function — takes the photo captions already entered in a
// report and drafts the "Overall Condition Assessment" paragraph.
//
// Uses the same GEMINI_API_KEY environment variable as /api/caption.js —
// no extra setup needed if you've already configured that one.
//
// This is a DRAFT only. It's meant to be reviewed and edited by the inspector
// before the report is sent — especially the repair-vs-replacement call,
// which carries real liability and should reflect the inspector's judgment.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

/* Only signed-in Cardinal users may spend the Gemini key.
   This route previously had no session check at all: anyone who knew the path
   could POST to it and bill inference to GEMINI_API_KEY. Same gate as
   /api/analyze.js, which was already doing this correctly. */
async function requireSession(req, res){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Sign in required' }); return null; }
  try {
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return null; }
    const user = await who.json();
    if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return null; }
    if (!isStaff(user.email)) { res.status(403).json({ error: 'Cardinal staff only' }); return null; }
    return user;
  } catch (e) {
    res.status(401).json({ error: 'Could not verify session' });
    return null;
  }
}

/* 502: the second rung. gemini-3.5-flash 503s "high demand" roughly one call in
   four and takes 6-14s when it answers; gpt-4o-mini answers the same server in
   0.6s. Measured via /api/ai-status, not assumed.

   Returns GEMINI'S OWN RESPONSE SHAPE so every existing call site reads it
   unchanged - no caller has to learn there is a second provider. Never throws:
   on total failure it returns the Gemini response (or null) and the caller's
   existing error path handles it exactly as before.

   Copied from caption.js, which has had this ladder for a long time. Not
   factored into a shared module on purpose: no route in this repo imports a
   sibling file, check.yml is syntax-only and could not catch a bundling failure,
   and the blast radius would be every AI route at once. */
async function aiFallback(parts, geminiRes) {
  const oaKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!oaKey) return geminiRes;
  try {
    const content = [];
    (parts || []).forEach(p => {
      if (p && typeof p.text === 'string') content.push({ type: 'text', text: p.text });
      else if (p && p.inlineData) content.push({
        type: 'image_url',
        image_url: { url: 'data:' + p.inlineData.mimeType + ';base64,' + p.inlineData.data }
      });
    });
    if (!content.length) return geminiRes;
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + oaKey },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1200, messages: [{ role: 'user', content }] })
    });
    if (!r || !r.ok) return geminiRes;
    const d = await r.json();
    const t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    if (!t) return geminiRes;
    /* Gemini's shape, so nothing downstream changes. */
    return { ok: true, status: 200, _via: 'openai', json: async () => ({
      candidates: [{ content: { parts: [{ text: String(t) }] } }]
    }) };
  } catch (e) {
    return geminiRes;
  }
}

import { isStaff } from './_staff.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ---- Only signed-in Cardinal users may spend credits ----
  const _user = await requireSession(req, res);
  if (!_user) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  try {
    const { captions, section, checklist } = req.body || {};
    const list = Array.isArray(captions) ? captions.filter(Boolean) : [];

    /* 1070: the nine property facts the rep already recorded on the checklist.
       The browser builds this from CK_REPORT_MAP, which holds property facts
       only — no client name, no address, no coordinates. This function
       re-imposes that independently, because a request body is not a trust
       boundary: at most 12 entries, and both halves length-capped. A caller
       that sends something else gets it truncated, not forwarded. */
    const facts = [];
    if (checklist && typeof checklist === 'object' && !Array.isArray(checklist)) {
      for (const k of Object.keys(checklist).slice(0, 12)) {
        const v = checklist[k];
        if (v == null || v === '') continue;
        facts.push(String(k).slice(0, 40).trim() + ': ' + String(v).slice(0, 200).trim());
      }
    }

    /* Either source alone is enough to draft from. Before 1070 this refused
       whenever captions were empty, which meant a rep who had finished the
       checklist and not yet captioned a photo got a 400 instead of a draft. */
    if (list.length === 0 && facts.length === 0) {
      res.status(400).json({
        error: 'Nothing to draft from yet — fill in the site checklist, or add at least one photo with a caption.'
      });
      return;
    }

    const secName = section ? String(section).slice(0, 100) : '';

    /* 1070: name the grounding honestly. A prompt that says "based only on the
       photo observations below" when there are none, and then supplies a fact
       table instead, is inviting the model to fill the gap by invention —
       which is the one thing a report narrative must never do. */
    const sources = list.length && facts.length
      ? 'the photo observations and the property facts below'
      : (list.length ? 'the photo observations below' : 'the property facts below');
    const evidence =
      (facts.length ? 'Property facts recorded on site:\n' + facts.map(f => '- ' + f).join('\n') + '\n\n' : '') +
      (list.length ? 'Photo observations:\n' + list.map((c, i) => `${i + 1}. ${c}`).join('\n') : '');

    const prompt = secName
      ? ('You are a professional roof inspector writing the body narrative for the "' + secName + '" ' +
         'section of an inspection report, based only on ' + sources + '. ' +
         'Write 2-4 factual, specific sentences in precise roofing terms describing what was ' +
         'observed in this section. Use the property facts for context where they are relevant to ' +
         'this section and leave them out where they are not. ' +
         'Do not invent details not supported by what you were given, ' +
         'do not repeat the section title, and do not make repair-vs-replacement calls here. ' +
         'No preamble, just the sentences.\n\n' + evidence)
      : ('You are a professional roof inspector drafting the "Overall Condition Assessment" ' +
         'paragraph of an inspection report, based only on ' + sources + '. ' +
         'Write one factual, specific paragraph (4-6 sentences) covering: general wear, ' +
         'granule loss (if relevant), fastener condition, brittleness, remaining serviceable ' +
         'life, and whether repair or full replacement is recommended. Ground the wear and the ' +
         'remaining-life estimate in the recorded age, layer count, pitch and decking where those ' +
         'are given. Do not invent details not supported by what you were given. ' +
         'No preamble, just the paragraph.\n\n' + evidence);

    let via = 'gemini-3.5-flash';
    let geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    /* 502: Google refusing is no longer the end of the road. */
    if (!geminiRes.ok) {
      geminiRes = await aiFallback([{ text: prompt }], geminiRes);
      if (geminiRes && geminiRes._via === 'openai') via = 'gpt-4o-mini';
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(502).json({ error: 'Gemini request failed', detail: errText });
      return;
    }

    const data = await geminiRes.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!summary) {
      res.status(502).json({ error: 'Gemini returned no text' });
      return;
    }

    /* 1072: which model actually answered, and which one was asked first.
       The pair is the point — a client can tell the intended path from a
       fallback without knowing this route's ladder, and the ladders are not
       uniform. Copied from api/detect.js, which has reported the model NAME
       since it shipped and is the shape the others should have had. */
    res.status(200).json({ summary, via, via_primary: 'gemini-3.5-flash' });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
