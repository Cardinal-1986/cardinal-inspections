// api/estimate.js
// ─────────────────────────────────────────────────────────────
// AI Estimate generator — v2, pricing catalog from Supabase
//
// CHANGES vs v1:
//   • Hardcoded CATALOG removed — now fetched from `pricing_items`
//     table (managed via the Pricing Catalog UI in the app)
//   • Only enabled=true items are included in the prompt
//   • Rate history preserved: the AI never sees disabled items,
//     and disabled items still exist in the table so historical
//     estimates that reference them keep rendering correctly
//
// ES MODULE — api/package.json has "type":"module".
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

export const config = {
  maxDuration: 60,
  regions: ['iad1'],
};

const GEMINI_KEY   = (process.env.GEMINI_API_KEY || '').trim();
const OPENAI_KEY   = (process.env.OPENAI_API_KEY || '').trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash'];
const RETRY_WAIT_MS = 1200;
const GEMINI_URL    = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const ROSTER_DOMAIN = '@cardinalrenovations.net';

const TAX_RATE = 0.075;
const DEFAULT_CONCEALED = 'Additional decking replacement, if required after tear-off, is billed at $85 per 4×8 sheet and documented by written change order prior to installation.';
const ORC_3DAY = '3-Day Rescission (ORC §1345.23(B)(2)): Homeowner has the right to cancel this transaction within three business days of signing. Two copies of the 3-Day Notice of Cancellation accompany the executed contract.';

// ═══ Catalog: fetch enabled items from Supabase ═══════════════
async function loadCatalog(supa, template) {
  const { data, error } = await supa
    .from('pricing_items')
    .select('sku, category, name, description, unit, rate')
    .eq('template', template)
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Catalog load failed: ${error.message}`);
  if (!data?.length) throw new Error(`No enabled ${template} items in pricing_items — enable some in Pricing Catalog`);

  const catalog = {};
  for (const row of data) {
    catalog[row.sku] = {
      cat: row.category,
      name: row.name,
      unit: row.unit,
      rate: Number(row.rate),
      sub: row.description || undefined,
    };
  }
  return catalog;
}

// ═══ Prompt ══════════════════════════════════════════════════
function buildPrompt(template, catalog, description) {
  const skuList = Object.entries(catalog)
    .map(([sku, s]) => `  ${sku.padEnd(16)} · ${s.cat.padEnd(20)} · $${s.rate.toFixed(2)}/${s.unit} · ${s.name}`)
    .join('\n');

  return `
You are Cardinal Roofing & Renovations' estimating assistant. You will analyze photos of a job and a description written by the sales rep, then produce a structured JSON estimate.

TEMPLATE: ${template}

CATALOG — use these SKUs only; do NOT invent prices or names:
${skuList}

RULES:
1. Return ONLY valid JSON matching the schema — no prose, no markdown, no code fences.
2. Every line item MUST reference a SKU from the catalog. Only qty is yours to pick.
3. "ai_analysis" describes what you SAW in each photo — one sentence per photo, referenced by photo_index (0-based).
4. "scope_summary" is 2–3 short paragraphs of plain-language explanation for the homeowner.
5. If photos or description mention insurance (State Farm, Allstate, storm claim, hail, adjuster), set "insurance_contingency" with a short note.
6. Deposit defaults to 50% on signing unless the rep says otherwise.
7. Quantities: estimate from what you can see. If unsure, err LOW — Cardinal prefers to change-order UP than refund.
8. For roofing: if you see plank decking with gaps, ALWAYS include osb_overlay if it's in the catalog. If you see missing kick-outs at roof-to-wall transitions, include kickout. Balance ridge_vent with the roof size.

SCHEMA:
{
  "scope_summary": "string",
  "ai_analysis": [ { "photo_index": 0, "observation": "string" } ],
  "line_items": [ { "sku": "string", "qty": number, "notes": "string?" } ],
  "deposit": { "percentage": 50, "notes": "string" },
  "valid_days": 30,
  "insurance_contingency": "string?"
}

REP'S DESCRIPTION:
${description}
`.trim();
}

// ═══ Gemini call ═════════════════════════════════════════════
async function callGemini(model, prompt, photoParts) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }, ...photoParts] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      maxOutputTokens: 4096,
    },
  };
  const r = await fetch(GEMINI_URL(model), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errTxt = await r.text().catch(() => '');
    throw new Error(`Gemini ${model} → ${r.status} ${errTxt.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error(`Gemini ${model} → empty response`);
  return text;
}

// ═══ OpenAI fallback ═════════════════════════════════════════
async function callOpenAI(prompt, photoUrls) {
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You output only valid JSON per the schema in the user message. No prose, no code fences.' },
      { role: 'user', content: [
          { type: 'text', text: prompt },
          ...photoUrls.map(url => ({ type: 'image_url', image_url: { url } })),
      ]},
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${OPENAI_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errTxt = await r.text().catch(() => '');
    throw new Error(`OpenAI → ${r.status} ${errTxt.slice(0, 200)}`);
  }
  const data = await r.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ═══ Fetch photo → Gemini inline_data ════════════════════════
async function fetchPhotoAsInline(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Photo fetch ${r.status}: ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 4_500_000) console.warn(`[estimate] large photo ${buf.length}B`);
  const mime = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
  return { inline_data: { mime_type: mime, data: buf.toString('base64') } };
}

// ═══ Price AI's line items against catalog ═══════════════════
function priceLineItems(rawItems, catalog) {
  const items = rawItems.map((li) => {
    const sku = catalog[li.sku];
    if (!sku) throw new Error(`Unknown or disabled SKU from AI: "${li.sku}"`);
    const qty = Number(li.qty);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Bad qty for ${li.sku}: ${li.qty}`);
    const amount = +(sku.rate * qty).toFixed(2);
    return {
      sku: li.sku,
      category: sku.cat,
      name: sku.name,
      sub: sku.sub || null,
      qty,
      unit: sku.unit,
      rate: sku.rate,
      amount,
      notes: li.notes || null,
    };
  });
  const subtotal = +items.reduce((s, i) => s + i.amount, 0).toFixed(2);
  const tax = +(subtotal * TAX_RATE).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  return { items, subtotal, tax, total };
}

// ═══ HANDLER ═════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return res.status(401).json({ error: 'No session' });

  const supa = createClient(SUPABASE_URL, SUPABASE_SRV, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userRes, error: authErr } = await supa.auth.getUser(jwt);
  if (authErr || !userRes?.user) return res.status(401).json({ error: 'Invalid session' });
  const userEmail = userRes.user.email || '';
  if (!userEmail.endsWith(ROSTER_DOMAIN)) return res.status(403).json({ error: 'Not on the roster' });

  const { template, photo_urls, description, client, project_id } = req.body || {};
  if (!['roofing', 'siding', 'windows'].includes(template)) {
    return res.status(400).json({ error: 'template must be roofing|siding|windows' });
  }
  if (!Array.isArray(photo_urls) || photo_urls.length < 4 || photo_urls.length > 8) {
    return res.status(400).json({ error: 'photo_urls must be 4–8 items' });
  }
  if (!description || description.trim().length < 20) {
    return res.status(400).json({ error: 'description must be ≥ 20 chars' });
  }

  const t0 = Date.now();

  // ── 1. Load catalog from DB (only enabled items) ──────────
  let catalog;
  try {
    catalog = await loadCatalog(supa, template);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  // ── 2. Fetch photos ──────────────────────────────────────
  let photoParts;
  try {
    photoParts = await Promise.all(photo_urls.map(fetchPhotoAsInline));
  } catch (e) {
    return res.status(400).json({ error: 'Photo fetch failed', detail: e.message });
  }

  // ── 3. Build prompt ──────────────────────────────────────
  const prompt = buildPrompt(template, catalog, description);

  // ── 4. Retry ladder ──────────────────────────────────────
  let rawJson = null, modelUsed = null, lastErr = null;
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    try {
      rawJson = await callGemini(GEMINI_MODELS[i], prompt, photoParts);
      modelUsed = GEMINI_MODELS[i];
      break;
    } catch (e) {
      lastErr = e;
      console.warn(`[estimate] ${GEMINI_MODELS[i]} failed: ${e.message}`);
      if (i === 0) await new Promise((r) => setTimeout(r, RETRY_WAIT_MS));
    }
  }
  if (!rawJson) {
    try {
      rawJson = await callOpenAI(prompt, photo_urls);
      modelUsed = 'openai:gpt-4o-mini';
    } catch (e) {
      return res.status(502).json({ error: 'All AI providers failed', detail: `${lastErr?.message || ''} | ${e.message}` });
    }
  }

  // ── 5. Parse ─────────────────────────────────────────────
  let ai;
  try {
    ai = JSON.parse(rawJson);
  } catch {
    return res.status(502).json({ error: 'AI returned invalid JSON', raw_preview: rawJson.slice(0, 500) });
  }

  // ── 6. Price ────────────────────────────────────────────
  let priced;
  try {
    priced = priceLineItems(ai.line_items || [], catalog);
  } catch (e) {
    return res.status(502).json({ error: 'Pricing failed', detail: e.message, ai });
  }

  // ── 7. Deposit + validity ────────────────────────────────
  const depositPct = Math.min(Math.max(ai.deposit?.percentage ?? 50, 10), 90);
  const depositAmt = +(priced.total * (depositPct / 100)).toFixed(2);
  const balance    = +(priced.total - depositAmt).toFixed(2);
  const validDays  = Math.min(Math.max(ai.valid_days || 30, 7), 90);
  const validThrough = new Date(Date.now() + validDays * 86400000).toISOString().slice(0, 10);

  const estimate = {
    generated_at: new Date().toISOString(),
    generated_by: userEmail,
    model_used:   modelUsed,
    latency_ms:   Date.now() - t0,
    template,
    project_id:   project_id || null,

    scope_summary: ai.scope_summary || '',
    ai_analysis:   Array.isArray(ai.ai_analysis) ? ai.ai_analysis : [],
    line_items:    priced.items,
    subtotal:      priced.subtotal,
    tax_rate:      TAX_RATE,
    tax:           priced.tax,
    total:         priced.total,
    deposit: {
      percentage: depositPct,
      amount:     depositAmt,
      balance,
      notes:      ai.deposit?.notes || 'Due at contract execution',
    },
    valid_days:                validDays,
    valid_through:             validThrough,
    insurance_contingency:     ai.insurance_contingency || null,
    concealed_conditions_note: DEFAULT_CONCEALED,
    orc_3day_notice:           ORC_3DAY,

    client:     client || null,
    photo_urls,
    description,

    // Snapshot which SKUs were available at generation time — for audit/reproducibility
    catalog_snapshot: Object.keys(catalog),
  };

  // ── 8. Persist ────────────────────────────────────────────
  const { data: saved, error: saveErr } = await supa
    .from('ai_estimates')
    .insert({
      created_by:  userEmail,
      project_id:  project_id || null,
      template,
      description,
      photo_urls,
      estimate,
      status:       'draft',
      model_used:   modelUsed,
    })
    .select('id, created_at')
    .single();

  if (saveErr) console.warn('[estimate] save failed:', saveErr.message);

  return res.status(200).json({
    id: saved?.id || null,
    created_at: saved?.created_at || null,
    estimate,
  });
}
