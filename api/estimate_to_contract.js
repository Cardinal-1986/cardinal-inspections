// api/estimate_to_contract.js
// ─────────────────────────────────────────────────────────────
// Convert-to-Contract handoff.
//   Input:  { ai_estimate_id? } OR { project_id }  (exactly one)
//   Output: full contract JSON + persisted row in `contracts`
//
// Effects:
//   1. Insert one row into `contracts`
//   2. Flip source estimate → status='converted', contract_id=<new>
//   3. Write an audit_events row
//   4. Return the hydrated contract so the frontend can open it in
//      the iframe editor (index.html renders it into the
//      Cardinal_Roofing_Contract HTML template)
//
// Idempotent: if source estimate already has contract_id, we return
// the existing contract instead of creating a duplicate.
//
// ES MODULE — api/package.json has "type":"module".
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30, regions: ['iad1'] };

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const ROSTER_DOMAIN = '@cardinalrenovations.net';

// ── Cardinal contractor block (goes into every contract) ────
const CONTRACTOR = {
  name:    'Cardinal Roofing & Renovations, LLC',
  address: '5735 Webster Street, Dayton, OH 45414',
  phone:   '937.576.6753',
  email:   'Admin@cardinalrenovations.net',
  website: 'app.cardinalroster.com',
};

// ── Warranty defaults by contract type ──────────────────────
const WARRANTIES = {
  roofing:  'Owens Corning Total Protection Roofing System — TruDefinition Duration shingles with SureNail Technology, ProEdge hip & ridge, WeatherLock ice & water barrier, synthetic underlayment, starter strip and VentSure ventilation. Cardinal Roofing & Renovations is an Owens Corning Roofing Preferred Contractor; where a qualifying system is installed Cardinal will register the Preferred Protection Limited Warranty (limited lifetime material coverage plus 10 years of workmanship coverage) within 60 days of completion. Shingle wind coverage is 130 mph per the TruDefinition Duration limited warranty. Manufacturer warranty terms are set by Owens Corning and govern; a copy is provided at completion.',
  siding:   'Manufacturer warranty per siding product spec (typically limited lifetime). Cardinal Roofing & Renovations workmanship warranty: 5 years on installation.',
  windows:  'Manufacturer warranty per window product spec (typically limited lifetime glass seal, 20-year frame). Cardinal Roofing & Renovations workmanship warranty: 5 years on installation and capping.',
};

const ORC_3DAY = `NOTICE OF CANCELLATION — Ohio Revised Code §1345.23(B)(2)
You, the Buyer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. See the attached Notice of Cancellation form for an explanation of this right.`;

// ── Business-day math for cancellation deadline ─────────────
function addBusinessDays(fromDate, days) {
  const d = new Date(fromDate);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;  // skip Sun/Sat
  }
  return d;
}

// ── Contract-number generator: CRC-{estId4}-{seq} ───────────
async function nextContractNumber(supa, sourceId, template) {
  const prefix = { roofing: 'CRC', siding: 'CSC', windows: 'CWC' }[template] || 'CTR';
  const short = (sourceId || '').replace(/-/g, '').slice(0, 4).toUpperCase();
  // Count prior contracts derived from this source (should be 0 in the happy path)
  const { count } = await supa
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .or(`source_ai_estimate_id.eq.${sourceId},source_project_id.eq.${sourceId}`);
  const seq = String.fromCharCode(65 + (count || 0)); // A, B, C, ...
  return `${prefix}-${short}-${seq}`;
}

// ── Build contract JSON from an estimate payload ────────────
function buildContract({ estimate, homeowner, propertyAddress, template, sourceIds, overrides }) {
  const today = new Date();
  const cancellationDeadline = addBusinessDays(today, 3);

  return {
    // Meta
    contract_number: null,             // filled by caller
    contract_date:   today.toISOString().slice(0, 10),
    contract_type:   template,

    // Parties
    contractor: CONTRACTOR,
    homeowner:  {
      name:    homeowner?.name    || '',
      address: homeowner?.address || propertyAddress,
      phone:   homeowner?.phone   || '',
      email:   homeowner?.email   || '',
    },
    property_address: propertyAddress,

    // Scope (from estimate)
    scope_summary: estimate.scope_summary,
    line_items:    estimate.line_items,

    // Money
    subtotal: estimate.subtotal,
    tax_rate: estimate.tax_rate,
    tax:      estimate.tax,
    total:    estimate.total,

    // Payment schedule
    deposit: {
      percentage: estimate.deposit.percentage,
      amount:     estimate.deposit.amount,
      due:        'On contract execution',
      notes:      estimate.deposit.notes || null,
    },
    balance: {
      amount: estimate.deposit.balance,
      due:    'On substantial completion and final walkthrough',
    },

    // Timing (overridable by caller)
    start_date_target:              overrides?.start_date_target             || 'Weather permitting; within 30 days of signing',
    substantial_completion_target:  overrides?.substantial_completion_target || 'Within 3 working days of start; concealed-condition change orders excepted',

    // Terms
    concealed_conditions_note: estimate.concealed_conditions_note,
    insurance_contingency:     estimate.insurance_contingency,
    warranty:                  WARRANTIES[template],
    additional_notes:          overrides?.additional_notes || null,

    // 3-Day Rescission (ORC §1345.23(B)(2))
    orc_3day_notice:        ORC_3DAY,
    cancellation_deadline:  cancellationDeadline.toISOString().slice(0, 10),

    // Photos referenced (carry forward from estimate)
    photo_urls: estimate.photo_urls || [],

    // Signature slots — filled at signing time
    contractor_signature:  null,
    contractor_signed_at:  null,
    contractor_signer:     null,
    homeowner_signature:   null,
    homeowner_signed_at:   null,

    // Provenance
    source_ai_estimate_id:  sourceIds.ai_estimate_id  || null,
    source_project_id:      sourceIds.project_id      || null,
  };
}

// ═══ HANDLER ═════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // 1. Session gate
  const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return res.status(401).json({ error: 'No session' });

  const supa = createClient(SUPABASE_URL, SUPABASE_SRV, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userRes, error: authErr } = await supa.auth.getUser(jwt);
  if (authErr || !userRes?.user) return res.status(401).json({ error: 'Invalid session' });
  const userEmail = userRes.user.email || '';
  if (!userEmail.endsWith(ROSTER_DOMAIN)) return res.status(403).json({ error: 'Not on the roster' });

  // 2. Validate input
  const { ai_estimate_id, project_id, homeowner, property_address, overrides } = req.body || {};
  if (!ai_estimate_id && !project_id) return res.status(400).json({ error: 'ai_estimate_id or project_id required' });
  if (ai_estimate_id && project_id)   return res.status(400).json({ error: 'Provide exactly one of ai_estimate_id / project_id' });

  // 3. Load the source estimate
  let estimate, template, sourceProjectId, sourceRow, contractNumberSeed;
  if (ai_estimate_id) {
    const { data, error } = await supa
      .from('ai_estimates')
      .select('id, template, estimate, status, project_id, contract_id, created_by')
      .eq('id', ai_estimate_id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'AI estimate not found' });

    // Idempotency check
    if (data.contract_id) {
      const { data: existing } = await supa
        .from('contracts')
        .select('id, contract, contract_number')
        .eq('id', data.contract_id)
        .single();
      return res.status(200).json({ id: existing?.id, contract: existing?.contract, existed: true });
    }
    // Ownership: allow if creator, project-assigned rep, or full-access
    const canConvert = data.created_by === userEmail || await canUserAccessProject(supa, userEmail, data.project_id);
    if (!canConvert) return res.status(403).json({ error: 'Not authorized on this estimate' });

    estimate = data.estimate;
    template = data.template;
    sourceProjectId = data.project_id;
    sourceRow = data;
    contractNumberSeed = data.id;
  } else {
    const { data: proj, error } = await supa
      .from('projects')
      .select('id, created_by, client_name, address, estimate, contract_id')
      .eq('id', project_id)
      .single();
    if (error || !proj)      return res.status(404).json({ error: 'Project not found' });
    if (!proj.estimate)      return res.status(400).json({ error: 'Project has no estimate to convert' });

    // Idempotency
    if (proj.contract_id) {
      const { data: existing } = await supa
        .from('contracts')
        .select('id, contract, contract_number')
        .eq('id', proj.contract_id)
        .single();
      return res.status(200).json({ id: existing?.id, contract: existing?.contract, existed: true });
    }
    const canConvert = proj.created_by === userEmail || await canUserAccessProject(supa, userEmail, proj.id);
    if (!canConvert) return res.status(403).json({ error: 'Not authorized on this project' });

    estimate = proj.estimate;
    template = proj.estimate.template || 'roofing';  // manual might not carry template — default
    sourceProjectId = proj.id;
    sourceRow = proj;
    contractNumberSeed = proj.id;

    // Backfill homeowner / property from project if caller didn't pass
    if (!homeowner)         req.body.homeowner = { name: proj.client_name };
    if (!property_address)  req.body.property_address = proj.address;
  }

  // Sanity: the estimate object must at minimum have totals + line_items
  if (!estimate?.line_items?.length || estimate.total == null) {
    return res.status(400).json({ error: 'Estimate is missing line_items or total' });
  }

  // 4. Build contract JSON
  const contract = buildContract({
    estimate,
    homeowner:        req.body.homeowner,
    propertyAddress:  req.body.property_address || estimate.client?.address || sourceRow.address || '',
    template,
    sourceIds: { ai_estimate_id, project_id: sourceProjectId },
    overrides,
  });

  contract.contract_number = await nextContractNumber(supa, contractNumberSeed, template);

  // 5. Insert contract row
  const { data: inserted, error: insErr } = await supa
    .from('contracts')
    .insert({
      created_by:              userEmail,
      project_id:              sourceProjectId,
      source_ai_estimate_id:   ai_estimate_id || null,
      source_project_id:       project_id     || null,
      template,
      contract_number:         contract.contract_number,
      contract,          // jsonb
      status:                  'draft',
      total:                   contract.total,
    })
    .select('id, created_at, contract_number')
    .single();

  if (insErr) return res.status(500).json({ error: 'Contract insert failed', detail: insErr.message });

  // 6. Flip source status → converted, link contract_id
  if (ai_estimate_id) {
    await supa
      .from('ai_estimates')
      .update({
        status:       'converted',
        contract_id:  inserted.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', ai_estimate_id);
  } else {
    await supa
      .from('projects')
      .update({ contract_id: inserted.id })
      .eq('id', project_id);
  }

  // 7. Audit row (best-effort)
  supa.from('audit_events').insert({
    actor_email: userEmail,
    kind:        'estimate_converted_to_contract',
    payload: {
      contract_id:       inserted.id,
      contract_number:   inserted.contract_number,
      source_type:       ai_estimate_id ? 'ai_estimate' : 'project_manual',
      source_id:         ai_estimate_id || project_id,
      total:             contract.total,
      template,
    },
  }).then(() => {}).catch(e => console.warn('audit insert failed:', e.message));

  // 8. Return the fully hydrated contract
  return res.status(200).json({
    id:               inserted.id,
    created_at:       inserted.created_at,
    contract_number:  inserted.contract_number,
    contract,
    existed:          false,
  });
}

// ── Helper: full-access OR project owner OR assigned rep ────
async function canUserAccessProject(supa, userEmail, projectId) {
  if (!projectId) return true; // no project context = allow if creator
  const { data: proj } = await supa
    .from('projects')
    .select('created_by, checklist')
    .eq('id', projectId)
    .single();
  if (!proj) return false;
  if (proj.created_by === userEmail) return true;

  // Check assignment (per project doc: lead.assigned[0] in checklist JSON)
  const assigned = proj.checklist?.lead?.assigned?.[0];
  if (assigned === userEmail) return true;

  // Fallback to admin/production membership
  const admins = [
    'theo@cardinalrenovations.net',
    'joan@cardinalrenovations.net',
    'curtis@cardinalrenovations.net',
    'scottie@cardinalrenovations.net',
  ];
  return admins.includes(userEmail);
}
