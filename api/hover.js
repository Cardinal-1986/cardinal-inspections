// /api/hover.js
// Vercel serverless function — receives the raw text of a Hover measurement
// report PDF and returns structured exterior measurements. Uses the same
// GEMINI_API_KEY as the other functions.
//
// 674: it now returns the ROOF block as well as siding. It was siding-only
// because its only caller was the siding material order — so a 31-page Hover
// "Complete Measurements" report could sit on a job while the app insisted it
// had no squares, pitch or eave length. The roof keys deliberately match
// /api/roofr's, so one merge in the app serves both sources. The siding keys
// are unchanged and in the same order: the material-order caller reads exactly
// what it read before.

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
        content.push({ type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + inl.data } });
      }
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
    return { ok: true, status: 200, _via: 'openai', json: async () => ({
      candidates: [{ content: { parts: [{ text: String(t) }] } }]
    }) };
  } catch (e) {
    return geminiRes;
  }
}

/* AUTH — build 1013. This route had NO session gate: anyone who knew the path
   could POST arbitrary text and bill inference to GEMINI_API_KEY (and, via the
   505 fallback, OPENAI_API_KEY) — the exact class already closed on
   summarize/organize/caption, missed here. Same gate as api/sol.js; the client
   half is window.aiHeaders(), which already existed for exactly this.
   SUPABASE_ANON_KEY is the publishable key and safe to ship. */
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ---- auth first (1013): an anonymous caller learns nothing, spends nothing ----
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'Sign in required' }); return; }
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
    const user = await who.json();
    if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return; }
  } catch (e) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length < 40) {
      res.status(400).json({ error: 'No PDF text provided' });
      return;
    }

    const prompt =
      'You are parsing the text of a Hover exterior measurement report. Hover reports ' +
      'cover the ROOF, the SIDING, or both ("Complete Measurements"). Extract whichever ' +
      'are present. ' +
      'The text below was extracted page by page (pages are marked "--- PAGE N ---").\n\n' +
      'Extract the following values. Use numbers only (no units). ' +
      'If a value is not present in the text, use null. Do NOT guess or invent numbers.\n' +
      /* 674: the ROOF block, written against a REAL Hover "Complete
         Measurements" report rather than from memory. Key names match what the
         app already consumes from /api/roofr so one merge serves both sources.

         ⚠ LENGTHS COME BACK AS PRINTED, NOT AS DECIMALS. Hover writes
         118' 9". Asked to "use numbers only", a model returns 118.9 — which is
         wrong by 0.15 ft and looks entirely reasonable on a carrier letter.
         The app converts feet-and-inches itself (ftIn), deterministically. Do
         not ask the model to do arithmetic; this project refuses AI arithmetic
         in the Supplement Desk for exactly this reason. */
      'LENGTHS: copy the value EXACTLY as printed, including the foot and inch ' +
      'marks — "118\' 9\"", not 118.9 and not 118.75. The app converts them. ' +
      'AREAS and COUNTS: plain numbers, no units.\n' +
      '- area_sqft: total roof area in square feet. On a Hover report this is the ' +
      '"Roof Facets" Area on the ROOF SUMMARY page (zero-waste). Number.\n' +
      '- squares: that area divided by 100, if you are confident; otherwise null — ' +
      'the app derives it from area_sqft.\n' +
      '- facet_count: the "Roof Facets" Total (a count of planes). Number.\n' +
      '- pitch: the PREDOMINANT pitch as written, e.g. "9/12" — the row of the ' +
      '"Roof Pitch" table with the largest Area or Percentage. Text.\n' +
      '- pitch_breakdown: EVERY row of the "Roof Pitch" table, as ' +
      '[{"pitch":"9/12","area_sqft":1360,"percent":81.19}, ...]. Low-slope and ' +
      'steep sections are priced differently, so do not collapse this to one pitch.\n' +
      '- ridge_hip_lf: the "Ridges / Hips" Length. Hover reports these COMBINED. ' +
      'Return the combined value here and leave ridge_lf and hip_lf null — do NOT ' +
      'split them, there is no basis in the report for a split.\n' +
      '- ridge_lf: ridge length ONLY if the report states ridges separately from hips\n' +
      '- hip_lf: hip length ONLY if stated separately\n' +
      '- valley_lf: the "Valleys" Length\n' +
      '- eave_lf: the "Eaves" Length\n' +
      '- rake_lf: the "Rakes" Length\n' +
      '- drip_edge_lf: the "Drip Edge/Perimeter" Length (usually eaves + rakes)\n' +
      '- flashing_lf: the "Flashing" Length\n' +
      '- step_flashing_lf: the "Step Flashing" Length\n' +
      /* the SIDING block, pointed at Hover's actual SUMMARY-page labels. The
         old wording described the fields in the abstract, which on a real
         report leaves the model choosing between four plausible "siding area"
         totals that differ by 500 sqft. */
      '- siding_area_sqft: the "Facades" row, Siding column, from the Areas table. ' +
      'NOT the Total row (which adds openings and trim) and NOT a waste-adjusted figure.\n' +
      '- siding_waste_zero_sqft: "SIDING WASTE TOTALS" -> "Siding & Trim Only" -> Zero Waste area\n' +
      '- openings_count: the Openings Quantity, Siding column\n' +
      '- opening_perimeter_lf: the Openings "Total Perimeter", Siding column\n' +
      '- outside_corner_lf: Corners -> "Outside Length", Siding column\n' +
      '- inside_corner_lf: Corners -> "Inside Length", Siding column\n' +
      '- base_length_lf: Trim -> "Level Starter", Siding column\n' +
      '- soffit_area_sqft: the Roofline table Soffit Area column, ALL rows added ' +
      'together (level frieze board + sloped frieze board). Number.\n' +
      '- fascia_lf: the Roofline table, "Eaves Fascia" plus "Rakes Fascia" Length. ' +
      'If both are present give them added together, as printed feet-and-inches ' +
      'is not possible here — so give this one as a decimal number of feet.\n' +
      '- shutter_qty: Accessories -> "Shutter Qty", Siding column\n' +
      '- vent_qty: Accessories -> "Vents Qty", Siding column\n' +
      '- stories: number of stories as an integer if stated\n\n' +
      'A roof-only report has null for every siding field, and a siding-only report ' +
      'has null for every roof field. That is expected — report what is there and ' +
      'null for the rest. Never carry a siding number into a roof field: the ' +
      'SUMMARY page and the ROOF SUMMARY page both have an "Eaves" figure and ' +
      'they mean different things.\n\n' +
      'Respond with ONLY raw JSON, no markdown fences, exactly these keys.\n\n' +
      'REPORT TEXT:\n' + text.slice(0, 50000);

    let geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 }
        })
      }
    );
    /* 505: Google refusing is no longer the end of the road. */
    if (!geminiRes.ok) geminiRes = await aiFallback([{ text: prompt }], geminiRes);

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      res.status(502).json({ error: 'AI request failed', detail: detail.slice(0, 300) });
      return;
    }
    const data = await geminiRes.json();
    const raw = (((data.candidates || [])[0] || {}).content || {}).parts
      ?.map(p => p.text || '').join('') || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(clean); }
    catch (e) {
      res.status(502).json({ error: 'Could not parse measurements', detail: clean.slice(0, 200) });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
