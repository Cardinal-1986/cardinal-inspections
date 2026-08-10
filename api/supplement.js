// /api/supplement.js — The Supplement Desk's engine (build 667).
// Reads a carrier's Scope of Loss and finds what is MISSING; drafts the
// carrier-facing supplement letter. Serves supplement.html (the Desk) only.
//
// THE HONESTY CORE — read before touching the prompt or the PACK:
// The model is never allowed to cite building code from its own recall. It may
// only point at entries in PACK below, by id — and the citation STRING the
// caller sees is copied server-side from the pack, never taken from model
// text. PACK is extracted from Cardinal's own Supplement Templates page
// (index.html, the Resource Library, ~L5867-6212): 21 Ohio-specific templates
// the company already stands behind. harness_667 pins every citation in this
// file to that page — the pack cannot drift from the library.
//
// Theo's rules (9-10 Aug 2026, recorded): ADMIN-ONLY (route-enforced below,
// not just UI); QUANTITIES-ONLY letters — no dollar amounts, the carrier
// prices per their own Xactimate list (output is scanned; a $ raises
// dollar_flag for the human, it is never silently edited); nothing sends
// itself (this route drafts; sending is the Desk's explicit tap through
// /api/senddoc).
//
// Modes: analyze (scope PDF + measurements -> gap items) · draft (ticked
// items -> letter with [[PHOTOS:id]] tokens; the model NEVER sees photo bytes
// or URLs — the Desk substitutes signed <img> at send time) · read_response
// (501 until the response build).
//
// Env: GEMINI_API_KEY (required), OPENAI_API_KEY (optional second rung).

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];
const MAX_BYTES = 12 * 1024 * 1024;
const TIME_BUDGET_MS = 45000;   /* 60s maxDuration, 15s headroom (the 662 rule) */

/* Same SSRF bound as api/sol.js: a caller-supplied URL may point ONLY at this
   project's Supabase storage — prefix test on the parsed origin. */
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

/* ── THE PACK ────────────────────────────────────────────────────────────────
   Extracted from the Supplement Templates page. `citation` is the exact string
   the letter may carry; null means the basis is manufacturer/policy/observed
   damage and the letter argues from that, not from code. `qty` names which
   measurement fields compute the quantity server-side (qty_src:'meas'); items
   without one take the model's proposal (qty_src:'model') for the human to
   edit. `sample` is the template's own carrier-facing wording, trimmed. */
const PACK = [
  { id: 'ice_barrier', group: 'code', citation: 'RCO R905.1.2', basis: 'code',
    title: 'Ice barrier — extension to wall line', qty: ['eave'], unit: 'LF',
    when: 'Scope shows ice & water only at the drip edge (~3 ft) instead of extending 24 in past the exterior wall line measured along the slope; 36 in up-slope on pitches >= 8:12.',
    sample: 'Per RCO R905.1.2, ice barrier is required to extend from the eave edge to at least 24 inches inside the exterior wall line, measured along the slope. The current scope provides only a 3-foot strip at the eave, which does not meet code.' },
  { id: 'drip_edge', group: 'code', citation: 'RCO R905.2.8.5', basis: 'code',
    title: 'Drip edge — all eaves and rakes', qty: ['eave', 'rake'], unit: 'LF',
    when: 'Scope excludes new drip edge on a full re-roof, or includes eaves only.',
    sample: 'Per RCO R905.2.8.5, drip edge is required at both eaves and rakes of shingle roofs on all new installations.' },
  { id: 'low_slope_underlayment', group: 'code', citation: 'RCO R905.1.1', basis: 'code',
    title: 'Double-layer underlayment on low slope', qty: null, unit: 'SQ',
    when: 'One or more slopes between 2:12 and 4:12 (porches, dormers, additions) and the scope specs single-layer underlayment.',
    sample: 'Per RCO R905.1.1 and Table R905.1.1(2), underlayment on slopes of 2:12 up to less than 4:12 must be installed in two layers, or self-adhering underlayment throughout.' },
  { id: 'ventilation', group: 'code', citation: 'RCO R806', basis: 'code',
    title: 'Attic ventilation to code', qty: ['ridge'], unit: 'LF',
    when: 'Existing ventilation is non-compliant (blocked soffit, gable-only, unbalanced or undersized net free area) and the scope excludes correction as betterment.',
    sample: 'Per RCO R806, attic ventilation must provide net free area of 1/150 of the ventilated space, reducible to 1/300 in a balanced ridge-and-soffit configuration. Reinstalling the existing non-compliant system on the new roof would violate code. Ordinance & Law coverage applies if included in the policy.' },
  { id: 'enhanced_fastening', group: 'code', citation: 'RCO R905.2.5', basis: 'code',
    title: 'Enhanced fastening / six-nail installation', qty: ['sq'], unit: 'SQ',
    when: 'The specified shingle line requires 6-nail installation for its wind warranty and the scope specifies standard 4-nail.',
    sample: 'Per RCO R905.2.5, six-nail installation is required in high-wind zones or where manufacturer specifications require it; the specified shingle line requires it to qualify for its wind warranty.' },
  { id: 'starter_accessories', group: 'code', citation: 'RCO R905.2', basis: 'manufacturer',
    title: 'Manufacturer starter strip & accessory system', qty: ['eave'], unit: 'LF',
    when: 'Scope specifies generic starter (or omits it) instead of the manufacturer accessories the system warranty requires.',
    sample: 'The system warranty on the specified shingle line requires the full manufacturer accessory kit — starter, underlayment, hip & ridge, ice barrier — from the same manufacturer. Mixing accessories voids the enhanced warranty the homeowner is paying for.' },
  { id: 'decking', group: 'structural', citation: 'RCO R908.3', extra: 'RCO R803', basis: 'code',
    title: 'Decking replacement (discovered at tear-off)', qty: null, unit: 'SF',
    when: 'Deteriorated sheathing discovered during tear-off; carrier calls it maintenance or pre-existing.',
    sample: 'Per RCO R908.3 a re-cover over unsound decking is prohibited, and per RCO R803 sheathing must be structurally sound. Deck replacement is code-required; if the policy includes Ordinance & Law coverage this work falls under it. Documentation photos with a scale reference are attached.' },
  { id: 'tear_off', group: 'structural', citation: 'RCO R908.3', basis: 'code',
    title: 'Full tear-off required by code', qty: ['sq'], unit: 'SQ',
    when: 'Two or more existing layers, or a deteriorated first layer, and the scope specifies a recover/overlay.',
    sample: 'Per RCO R908.3, roof recover is not permitted where the existing roof has two or more applications, or where the existing covering is water-soaked or deteriorated. A recover is not code-compliant on this roof.' },
  { id: 'matching_slope', group: 'matching', citation: 'OAC 3901-1-54(I)(1)(b)', basis: 'code',
    title: 'Line-of-sight mismatch — full slope replacement', qty: null, unit: 'SQ',
    when: 'Partial replacement approved but the repair cannot produce a reasonably comparable appearance (weathering, discontinued color, line-of-sight with adjacent slopes).',
    sample: 'Per OAC 3901-1-54(I)(1)(b), when a replaced item will not match the quality, color or size of the item suffering the loss, the insurer shall replace as much of the item as necessary to result in a reasonably comparable appearance.' },
  { id: 'discontinued_shingle', group: 'matching', citation: 'OAC 3901-1-54(I)(1)(b)', basis: 'code',
    title: 'Discontinued shingle — full roof replacement', qty: ['sq'], unit: 'SQ',
    when: 'The exact shingle line is discontinued with no comparable replacement; carrier offers partial or single-slope.',
    sample: 'The existing shingle line is discontinued (manufacturer confirmation attached); no comparable replacement exists, so partial replacement cannot produce the reasonably comparable appearance OAC 3901-1-54(I)(1)(b) requires.' },
  { id: 'spatter_endorsement', group: 'matching', citation: 'OAC 3901-1-54(I)(1)(b)', basis: 'code',
    title: 'Spatter with matching endorsement', qty: null, unit: 'SQ',
    when: 'Hail spatter without functional damage, and the policy carries a matching endorsement. Does NOT apply where a cosmetic-damage exclusion exists.',
    sample: 'The policy includes a matching endorsement; under it, the obligation to produce uniform appearance requires replacement of the affected slopes even where individual impacts do not affect function.' },
  { id: 'discontinued_siding', group: 'matching', citation: 'OAC 3901-1-54(I)(1)(b)', basis: 'code',
    title: 'Discontinued siding colour — full elevation', qty: null, unit: 'SQ',
    when: 'Damage confined to part of an elevation, partial repair scoped, and the panel profile/gauge/colour is discontinued (supplier confirmation in writing). Ask only for elevations you can defend by line of sight.',
    sample: 'The damaged siding is discontinued per the supplier’s written confirmation (attached); a partial repair cannot produce a reasonably comparable appearance as required by OAC 3901-1-54(I)(1)(b), because no available panel matches the existing profile and weathered colour.' },
  { id: 'repairability', group: 'matching', citation: 'OAC 3901-1-54(I)(1)(b)', basis: 'code',
    title: 'Repairability — brittle shingles / repair not feasible', qty: null, unit: 'SQ',
    when: 'A repair is approved but surrounding shingles fail a brittle test, manufacturer guidance does not support repair, or an ITEL report shows no matching product — the repair cannot restore pre-loss condition or a reasonably comparable appearance.',
    sample: 'The approved repair cannot be completed without damaging the surrounding shingles — a brittle test shows adjacent shingles fracturing when lifted (documentation attached), and the ITEL report confirms no matching product is available. Per OAC 3901-1-54(I)(1)(b) the replacement must produce a reasonably comparable appearance; please revise the scope from repair to replacement.' },
  { id: 'step_counter_flashing', group: 'flashing', citation: 'RCO R905.2.8', extra: 'RCO R903.2', basis: 'code',
    title: 'Step & counter flashing (no reuse)', qty: null, unit: 'LF',
    when: 'Scope excludes new step/counter flashing or specifies reusing existing.',
    sample: 'Per RCO R905.2.8, flashings must be corrosion-resistant, sized and installed to prevent water intrusion, integrated shingle-by-shingle at sidewalls. Reusing existing step flashing during tear-off is not code-compliant: removal typically damages the flashing and its integration with the underlayment.' },
  { id: 'skylight_kit', group: 'flashing', citation: 'RCO R905.2.8', basis: 'manufacturer',
    title: 'Skylight flashing kit', qty: null, unit: 'EA',
    when: 'New roofing scoped but the manufacturer skylight flashing kit excluded.',
    sample: 'The skylight manufacturer’s warranty requires new flashing with any new roof, and existing kits are typically damaged during tear-off, leaving them short of RCO R905.2.8 water-intrusion requirements.' },
  { id: 'cricket', group: 'flashing', citation: 'RCO R903.2.1', basis: 'code',
    title: 'Chimney cricket / saddle', qty: null, unit: 'EA',
    when: 'A chimney more than 30 inches wide (perpendicular to the ridge) lacks a cricket, or the existing one has failed.',
    sample: 'Per RCO R903.2.1, saddles are required on the ridge side of any chimney more than 30 inches wide. The chimney on this property exceeds that width.' },
  { id: 'pipe_boots', group: 'flashing', citation: 'RCO R905.2.8', basis: 'code',
    title: 'Pipe boot replacement', qty: null, unit: 'EA',
    when: 'New roofing scoped but new pipe boots for existing penetrations excluded; existing boots UV-degraded.',
    sample: 'Reusing degraded boots on a new roof produces failures within the warranty period; per RCO R905.2.8, flashings must be sized and installed to prevent water intrusion.' },
  { id: 'kickout', group: 'flashing', citation: 'RCO R903.2.1', basis: 'code',
    title: 'Kickout / roof-to-wall diverter', qty: null, unit: 'EA',
    when: 'A roof-to-wall run terminates without a diverter; scope carries step flashing but nothing at the bottom of the run. Photograph the wall below first — staining or soft trim is related damage for the same filing.',
    sample: 'Per RCO R903.2.1, flashing is required at wall and roof intersections, and a flashing shall be installed to divert water away where the eave of a sloped roof intersects a vertical sidewall. Reinstalling the roof without one leaves a known code deficiency directing runoff behind the cladding.' },
  { id: 'siding_trim', group: 'related', citation: null, basis: 'scope-consistency',
    title: 'Siding & trim (same storm event)', qty: null, unit: 'SQ',
    when: 'The storm that damaged the roof also hit siding, wraps, band boards or trim; scope covers the roof only. Evidence: test-square hit counts per elevation, wide + close photos.',
    sample: 'The storm event that damaged the roof also produced documented damage to the affected elevations, contemporaneous with the roof loss; test-square hit counts and photographs are attached.' },
  { id: 'gutters', group: 'related', citation: null, basis: 'scope-consistency',
    title: 'Gutters & downspouts', qty: null, unit: 'LF',
    when: 'Gutters/downspouts dented or dislodged in the same event (hail dents in the trough; wind-dislodged straps and elbows).',
    sample: 'The gutters show documented damage contemporaneous with the storm event; photographs of the distribution across elevations are attached. Aluminum coil colour to match existing.' },
  { id: 'hvac_fins', group: 'related', citation: null, basis: 'scope-consistency',
    title: 'HVAC condenser fin damage', qty: null, unit: 'EA',
    when: 'Hail flattened the condenser coil fins on the storm-track side. Cardinal documents and refers to a licensed HVAC contractor; it does not price the repair.',
    sample: 'The outdoor condenser has documented hail damage to the coil fins matching the storm-track direction; fin repair or coil replacement is required to restore heat-transfer efficiency, per a licensed HVAC contractor’s assessment.' },
  { id: 'screens_wraps', group: 'related', citation: null, basis: 'scope-consistency',
    title: 'Screens & window wraps', qty: null, unit: 'EA',
    when: 'Torn/punctured screens; hail-dented aluminum window wraps and cap flashings.',
    sample: 'The property has damaged screens and dented aluminum window wrap contemporaneous with the storm event; each damaged item is photographed and attached.' },
];
const PACK_BY_ID = {};
PACK.forEach(p => { PACK_BY_ID[p.id] = p; });

/* quantities the measurements can answer are computed HERE, not by the model —
   arithmetic is not something to ask a language model to get right. */
function measQty(entry, meas) {
  if (!entry || !entry.qty || !meas) return null;
  let total = 0, any = false;
  for (const k of entry.qty) {
    const v = Number(meas[k]);
    if (v > 0) { total += v; any = true; }
  }
  return any ? Math.round(total * 10) / 10 : null;
}

/* THE ENFORCEMENT. The model proposes gaps by pack_id; everything a letter
   could misquote is overwritten from the pack. An unknown pack_id survives as
   an observation (basis scope-consistency, no citation, low confidence) —
   uncited is better than wrong, in code and not just in the prompt. */
function enforceGaps(raw, meas) {
  const out = [];
  (Array.isArray(raw) ? raw : []).forEach((g, i) => {
    if (!g || typeof g !== 'object') return;
    const entry = g.pack_id ? PACK_BY_ID[String(g.pack_id)] : null;
    const item = {
      id: 'g' + (i + 1),
      item: String(g.item || (entry && entry.title) || '').slice(0, 160),
      why: String(g.why || '').slice(0, 500),
      basis: entry ? entry.basis : 'scope-consistency',
      pack_id: entry ? entry.id : null,
      citation: entry ? entry.citation : null,
      qty: null, unit: (entry && entry.unit) || String(g.unit || '').slice(0, 8) || null,
      qty_src: null,
      confidence: entry ? (['high', 'medium', 'low'].indexOf(g.confidence) >= 0 ? g.confidence : 'medium') : 'low',
      wants_photo: g.wants_photo !== false,
      photos: [], included: false,
      carrier: { decision: null, note: '', decided_at: null }, rebuttal: null
    };
    if (!item.item) return;
    const mq = entry ? measQty(entry, meas) : null;
    if (mq !== null) { item.qty = mq; item.qty_src = 'meas'; }
    else if (Number(g.qty) > 0) { item.qty = Number(g.qty); item.qty_src = 'model'; }
    out.push(item);
  });
  return out;
}

/* ── auth: session, then ADMIN (Theo's pick, enforced at the route) ────────── */
async function requireAdmin(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Sign in required' }); return null; }
  const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
  });
  if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return null; }
  const user = await who.json();
  if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return null; }
  const adm = await fetch(SUPABASE_URL + '/rest/v1/rpc/is_cardinal_admin', {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token,
               'Content-Type': 'application/json' },
    body: '{}'
  });
  const isAdmin = adm.ok ? await adm.json() : false;
  if (isAdmin !== true) {
    res.status(403).json({ error: 'The Supplement Desk is admin-only.' });
    return null;
  }
  return user;
}

/* ── the second rung, PDFs as file parts (the 661 fix, copied) ─────────────── */
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
      body: JSON.stringify({
        model: 'gpt-4o-mini', max_tokens: 4096,
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
  } catch (e) { return geminiRes; }
}

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
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const body = req.body || {};
    const mode = String(body.mode || '');
    if (mode === 'read_response') {
      res.status(501).json({ error: 'Carrier-response reading arrives with the next build of the Desk.' });
      return;
    }
    if (mode !== 'analyze' && mode !== 'draft') {
      res.status(400).json({ error: 'Unknown mode — analyze or draft.' });
      return;
    }

    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key) { res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' }); return; }

    const T0 = Date.now();
    const elapsed = () => Date.now() - T0;

    /* ── intake: the scope PDF, inline or via bounded storage URL ─────────── */
    let docBytes = 0;
    let scopeB64 = null, scopeMime = 'application/pdf';
    if (mode === 'analyze') {
      const s = body.scope || {};
      if (s.url) {
        const safe = storageUrlOrNull(s.url);
        if (!safe) { res.status(400).json({ error: 'That link is not a Cardinal storage URL' }); return; }
        let doc;
        try { doc = await fetch(safe); } catch (e) { res.status(502).json({ error: 'Could not fetch the scope from storage' }); return; }
        if (!doc.ok) { res.status(410).json({ error: 'The scope link has expired or was refused — reopen the claim and try again' }); return; }
        const buf = Buffer.from(await doc.arrayBuffer());
        if (!buf.length) { res.status(502).json({ error: 'The stored scope came back empty' }); return; }
        if (buf.length > MAX_BYTES) { res.status(413).json({ error: 'That scope is ' + (buf.length / 1048576).toFixed(1) + ' MB; the reader caps at 12 MB.' }); return; }
        docBytes = buf.length;
        scopeB64 = buf.toString('base64');
        scopeMime = (doc.headers.get && doc.headers.get('content-type') || s.mime || 'application/pdf').split(';')[0].trim() || 'application/pdf';
      } else if (typeof s.file === 'string' && s.file) {
        if (s.file.length > MAX_BYTES * 1.4) { res.status(413).json({ error: 'File too large (12 MB cap)' }); return; }
        scopeB64 = s.file;
        scopeMime = String(s.mime || 'application/pdf');
        docBytes = Math.floor(s.file.replace(/=+$/, '').length * 3 / 4);
      } else {
        res.status(400).json({ error: 'analyze needs the scope — {file,mime} or {url}' });
        return;
      }
    }

    const meas = body.meas || {};
    const claim = body.claim || {};
    /* 669: the claim's iTel lab report, when one is on file. FACTS the desk
       read from itel_lab_reports — verdict, matching product, mismatch notes,
       control number — so a repairability or no-match gap arrives with its
       evidence already named. The model receives a one-line summary, never
       the report itself. */
    const itel = body.itel && typeof body.itel === 'object' ? body.itel : null;
    const filingType = ['partial_denial', 'backend', 'pwi_coc'].indexOf(body.filing_type) >= 0
      ? body.filing_type : 'partial_denial';

    /* the pack as the model sees it: ids and when-to-flag only. It never sees
       citation strings to mangle — those are copied server-side. */
    const packMenu = PACK.map(p => '- ' + p.id + ': ' + p.title + ' — flag when: ' + p.when).join('\n');

    const DISCIPLINE =
      'You may ONLY reference the checklist entries above, by their id. Never ' +
      'quote a building-code section number in any text field — the system ' +
      'attaches the correct citation from its own library. If you are not ' +
      'certain an entry applies, do not claim it — a wrong claim to a carrier ' +
      'is worse than a missing one. Findings that match no entry may still be ' +
      'reported with pack_id null when the scope itself is internally ' +
      'inconsistent (an item priced but its obvious counterpart absent).';

    let parts, wantShape;
    if (mode === 'analyze') {
      const measLine = ['sq', 'pitch', 'ridge', 'hip', 'valley', 'eave', 'rake']
        .map(k => k + '=' + (meas[k] == null || meas[k] === '' ? '?' : meas[k])).join(', ');
      parts = [
        { inline_data: { mime_type: scopeMime, data: scopeB64 } },
        { text:
          'You are reviewing an insurance carrier’s Scope of Loss for a roofing/exterior ' +
          'claim in OHIO, on behalf of the contractor. Find what the scope is MISSING. ' +
          'Checklist of recognized supplement grounds:\n' + packMenu + '\n\n' +
          DISCIPLINE + '\n\n' +
          'Property measurements (linear feet / squares; ? = unknown): ' + measLine + '. ' +
          (itel ? 'An ITEL lab report is ON FILE for this claim: control #' +
            String(itel.control_number || '?') + ', verdict: ' + String(itel.verdict || '?') +
            (itel.match_product ? ', closest match: ' + String(itel.match_product) : ', no matching product listed') +
            (itel.mismatch_notes ? ', notes: ' + String(itel.mismatch_notes).slice(0, 200) : '') +
            '. Where repairability or matching applies, reference this report in the why field. ' : '') +
          'Claim: carrier ' + String(claim.carrier || '?') + ', claim # ' + String(claim.claim_number || '?') + '. ' +
          'Filing type: ' + filingType + '.\n\n' +
          'Read every line item and total in the document. For each ground that genuinely ' +
          'applies, emit one gap. Do not invent quantities — leave qty null unless the ' +
          'document itself states one.\n\n' +
          'Respond with ONLY raw JSON: {"gaps":[{"pack_id": string or null, "item": string, ' +
          '"why": string (cite what the SCOPE says or omits, page refs welcome), ' +
          '"qty": number or null, "unit": string or null, "confidence": "high"|"medium"|"low", ' +
          '"wants_photo": boolean}], "scope_summary": string}' }
      ];
      wantShape = 'gaps';
    } else {
      /* draft: no PDF, no photos — items in, letter out */
      const items = Array.isArray(body.items) ? body.items.filter(i => i && i.item) : [];
      if (!items.length) { res.status(400).json({ error: 'draft needs at least one included item' }); return; }
      const itemLines = items.map(i => {
        const entry = i.pack_id ? PACK_BY_ID[i.pack_id] : null;
        return '- ' + i.item +
          (i.qty ? ' — ' + i.qty + ' ' + (i.unit || '') : '') +
          (entry && entry.citation ? ' [cite: ' + entry.citation + ']' : '') +
          (entry ? '\n  library wording to adapt: ' + entry.sample : '') +
          (i.why ? '\n  ground: ' + i.why : '') +
          '\n  photo token: [[PHOTOS:' + i.id + ']]';
      }).join('\n');
      parts = [
        { text:
          'Write a professional supplement request letter (HTML body only — <p>, <ul>, ' +
          '<li>, <b>; no <html> or <head>) from Cardinal Roofing & Renovations, Dayton ' +
          'Ohio, to the insurance adjuster below. Ohio claim.\n\n' +
          'Adjuster: ' + String(claim.adjuster_name || 'Claims Department') + ' (' + String(claim.carrier || '') + ')\n' +
          'Claim #: ' + String(claim.claim_number || '') + ' · Insured: ' + String(claim.homeowner || '') + ' · Property: ' + String(claim.address || '') + '\n' +
          'Filing type: ' + filingType + '\n\nItems (use the exact citations given — never any other code reference):\n' + itemLines + '\n\n' +
          'HARD RULES:\n' +
          '- NO dollar amounts anywhere. Quantities and units only; ask the carrier to ' +
          'price each item per their own Xactimate line list at current local pricing.\n' +
          '- Where a photo token is given, place it on its own line after that item’s ' +
          'paragraph, exactly as written — the system replaces it with the photographs.\n' +
          '- Cite ONLY the [cite: ...] strings provided, verbatim. No other section numbers.\n' +
          '- Firm, factual, courteous. No filler.\n\n' +
          'Respond with ONLY raw JSON: {"subject": string, "letter_html": string}' }
      ];
      wantShape = 'letter';
    }

    /* ── the ladder: models x json-mode, 503/429 pause, budget-guarded ────── */
    let ans = null, via = 'gemini', lastBody = null, lastText = '';
    outer:
    for (const model of GEMINI_MODELS) {
      for (const jsonMode of [true, false]) {
        if (elapsed() > TIME_BUDGET_MS) break outer;
        let r = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
          { method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: jsonMode
                ? { maxOutputTokens: 8192, temperature: 0.2, responseMimeType: 'application/json' }
                : { maxOutputTokens: 8192, temperature: 0.2 }
            }) });
        if (!r.ok && (r.status === 503 || r.status === 429)) {
          await new Promise(s => setTimeout(s, 1200));
          continue;   /* same model, no-json attempt; then next model */
        }
        if (!r.ok) r = await aiFallback(parts, r);
        const j = await r.json();
        lastBody = j;
        if (!r.ok) continue;
        via = r._via === 'openai' ? 'openai' : 'gemini';
        const cand = (j.candidates || [])[0] || {};
        lastText = ((cand.content || {}).parts || []).map(p => p.text || '').join('')
          .replace(/```json|```/g, '').trim();
        const parsed = parseObj(lastText);
        if (parsed) { ans = parsed; break outer; }
      }
    }

    if (!ans) {
      const u = (lastBody && lastBody.usageMetadata) || {};
      res.status(502).json({
        error: 'The analyst could not produce a usable answer.' +
          ' [' + [via,
            docBytes ? 'doc ' + (docBytes / 1048576).toFixed(1) + ' MB' : null,
            u.promptTokenCount != null ? 'in ' + u.promptTokenCount + ' tok' : null,
            'reply ' + lastText.length + ' chars',
            (elapsed() / 1000).toFixed(1) + 's'].filter(Boolean).join(' · ') + ']',
        detail: lastText.slice(0, 300)
      });
      return;
    }

    if (wantShape === 'gaps') {
      const gaps = enforceGaps(ans.gaps, meas);
      res.status(200).json({
        ok: true, gaps,
        scope_summary: String(ans.scope_summary || '').slice(0, 600),
        diag: { via, docBytes, ms: elapsed() }
      });
    } else {
      const letter = String(ans.letter_html || '');
      /* quantities-only is Theo's rule: a dollar in the draft is FLAGGED for
         the human, never silently edited out — the letter is his to fix. */
      const dollar_flag = /\$\s*\d/.test(letter.replace(/\[\[PHOTOS:[^\]]+\]\]/g, ''));
      res.status(200).json({
        ok: true,
        subject: String(ans.subject || 'Supplement Request — Claim ' + (claim.claim_number || '')).slice(0, 160),
        letter_html: letter,
        dollar_flag,
        diag: { via, ms: elapsed() }
      });
    }
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
