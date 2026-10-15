// api/assistant.js — build 1327. The owner's assistant (Theo, 12 Oct 2026: "a personal
// assistant ai for owner only as a tab app wide ... that knows everything about this crm";
// picks 1A floating Ask button, 2C "anything you could change by hand", 3B Owner Review is
// Theo's only; and "Create one for Joan, only read and write").
//
//   POST { history: [{ role:'user'|'ai', text }], question }
//     → { reply, proposals: null | { summary, changes:[{ table, action, id, values, label }] } }
//
// WHO: Theo (two logins) and Joan only, checked here, server-side. Everyone else gets a 403.
//
// HOW IT READS: one tool, db_select, run through PostgREST WITH THE CALLER'S OWN JWT. Row level
// security therefore decides what it can see — exactly what that person can see by hand. Owner
// tables (owner_*, Owner Review) are refused for anyone but Theo (pick 3B), here, before the
// query is built, so RLS is not the only fence.
//
// HOW IT WRITES: it does NOT. The model can only PROPOSE (propose_changes); the loop stops and
// the proposals go back to the browser, which shows them as a card. Nothing changes until the
// person taps Approve, and then the browser applies them with the person's own session — the
// same RLS, the same refusals, the same audit trail as doing it by hand.
//
// Model: claude-opus-5-5 with the server-side refusal fallback (as inspect-assist). Needs
// ANTHROPIC_API_KEY. 60s maxDuration in vercel.json.

import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();
const MODEL = 'claude-opus-5-5';
const DEADLINE_MS = 54000;     // whole request; Vercel stops us at 60s
const CALL_MAX_MS = 45000;     // one model call, at most
const MIN_CALL_MS = 8000;      // less than this left: answer with what we have instead of starting a call
const MAX_STEPS = 8;           // tool rounds per question

/* the people this route serves, and what kind */
export const PEOPLE = {
  'theo@cardinalrenovations.net':  { name: 'Theo', owner: true },
  'theodorion1986@gmail.com':      { name: 'Theo', owner: true },
  'joan@cardinalrenovations.net':  { name: 'Joan', owner: false },
};

/* What the assistant may read and propose changes to, and the columns it can name. Measured
   against the live schema 12 Oct 2026. Left out on purpose: backups, audit/session logs, push
   keys, the CompanyCam mirror (60k rows of metadata), Studio and its private photo tables (GPS),
   the Visualizer, and library/manual content. */
export const SCHEMA = {
  projects: 'id,name,address,phone,email,notes,created_by,created_at,updated_at,checklist,stage,sales_rep,street,city,state,zip,reminders_muted',
  appointments: 'id,title,appt_date,appt_time,project_id,notes,created_by,created_at,kind',
  estimates: 'id,project_id,estimate_number,title,status,line_items,subtotal,discount,total,deposit_pct,deposit_amount,valid_days,valid_through,notes,archived,created_at,updated_at,created_by',
  inspection_reports: 'id,title,status,sent_at,created_at,updated_at,created_by,project_id,total,signed_at',
  document_versions: 'id,document_id,version,reason,title,status,total,sent_at,signed_at,created_by,created_at',
  contracts: 'id,created_at,updated_at,created_by,project_id,template,contract_number,total,status,sent_at,contractor_signed_at,homeowner_signed_at,voided_at,void_reason',
  collections: 'id,project_id,collected_at,amount,type,source,notes,created_by,created_at,finance_company,method,external_ref',
  commissions: 'id,project_id,rep_email,amount,basis,status,paid_on,method,reference,memo,created_at,created_by,collection_id,rate_pct,paid_by,project_name',
  draws: 'id,rep_email,project_id,project_name,amount,status,paid_at,paid_by,repaid_at,notes,created_at,created_by',
  insurance_claims: 'id,created_at,updated_at,created_by,project_id,homeowner_name,property_address,carrier,claim_number,policy_number,date_of_loss,cause_of_loss,adjuster_name,adjuster_phone,adjuster_email,adjuster_company,approved_rcv,approved_acv,approved_depreciation,approved_at,deductible,deductible_waived,our_estimate_total,status,filed_at,closed_at,notes,supplement_status,supplement_filed,supplement_approved,first_scope_rcv,cost_incurred,coverage_type',
  insurance_payments: 'id,created_at,created_by,claim_id,kind,amount,received_date,deposited_date,check_number,payer,notes',
  insurance_supplements: 'id,created_at,updated_at,created_by,claim_id,filed_at,reason,items,amount_requested,status,responded_at,amount_approved,notes',
  claim_notes: 'id,claim_id,body,internal,created_at,created_by',
  claim_upgrades: 'id,claim_id,name,detail,amount,sort_order,created_at,created_by',
  carrier_adjusters: 'id,carrier,name,phone,email,kind,difficulty,notes',
  punch_items: 'id,project_id,title,detail,kind,priority,status,assigned_to,created_by,created_at,done_at,done_by,scheduled_at,comments,steps,template,scheduled_time,hold_reason,hold_until,hold_note,callback_cause,orig_crew_name,truck',
  crews: 'id,name,legal_name,trade,contact_name,contact_phone,contact_email,address,notes,archived',
  crew_notes: 'id,crew_id,body,at,by',
  crew_work_orders: 'id,wo_number,crew_id,project_id,status,sent_at,sent_to,scope,amount,scheduled_on,completed_on,created_at,created_by',
  crew_payments: 'id,crew_id,work_order_id,project_id,amount,method,reference,paid_on,memo,created_at,created_by',
  crew_rates: 'id,crew_id,pricing_item_id,custom_name,custom_unit,rate',
  crew_docs: 'id,crew_id,kind,file_name,issued_on,expires_on,policy_number,carrier',
  community_partners: 'id,name,partner_type,contact_name,contact_email,contact_phone,address,notes,archived,confidential,prospective',
  community_contacts: 'id,project_id,kind,name,phone,email,notes',
  community_properties: 'id,partner_id,address,unit,owner_name,owner_phone,owner_email,notes,archived',
  payment_reminders: 'id,project_id,report_id,sent_at,channel,sent_to,ok,detail',
  pricing_items: 'id,template,sku,category,name,description,unit,rate,sort_order,enabled',
  team_profiles: 'email,name,title,phone,role',
  materials: 'id,category,manufacturer,product_line,color_name,status',
  oc_colors: 'id,name,family,product_line,status,hidden',
  project_photos: 'id,project_id,created_by,created_at,section,caption',
  audit_events: 'id,at,email,type,detail,project_id',
  /* Theo only (pick 3B, and the Owner Console's own fence) */
  owner_reviews: 'id,project_id,client_name,rep_email,source,rule,reason,notes,trail,status,created_by,created_at,updated_at,resolved_at,resolved_by',
  owner_review_rules: 'rule,enabled,updated_at,updated_by',
  owner_tasks: 'id,title,note,done,done_at,position,created_by,created_at',
  owner_items: 'id,kind,title,note,due_date,recur,remind,remind_days,done_at,created_by,created_at',
  owner_reminders: 'id,text,remind_on,repeat,notify,done_at,created_by,created_at',
  owner_ledger: 'id,kind,party,party_type,note,opened_on,settled_at,created_by,created_at',
  owner_ledger_txns: 'id,ledger_id,direction,amount,txn_date,note,created_by,created_at',
};
const OWNER_ONLY = /^owner_/;
/* never written by the assistant: audit history, and the JSON blob that holds a job's whole
   lead sheet (one wrong merge would wipe it — those edits stay by hand) */
const NO_WRITE_TABLES = new Set(['audit_events', 'document_versions', 'payment_reminders', 'team_profiles']);
const NO_WRITE_COLUMNS = { projects: ['checklist', 'id', 'created_at', 'created_by'] };

export function tablesFor(person) {
  return Object.keys(SCHEMA).filter(t => person.owner || !OWNER_ONLY.test(t));
}

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

export const RULES = [
  'You are the assistant inside the Cardinal Roofing & Renovations app (Dayton, Ohio). You work for the owner, Theo, or the office manager, Joan.',
  'You can look up anything in the app with db_select, and you can propose changes with propose_changes. You never change anything yourself: a proposal is shown to the person as a card and only happens if they tap Approve.',
  '',
  'The business:',
  '- Three lines of work, by projects.checklist.lead.claim_type: retail (homeowner pays), insurance (a carrier claim; the homeowner pays the deductible and any upgrades), community (a partner such as Habitat for Humanity of Greater Dayton pays for work on someone else\'s house).',
  '- Job stages, in order: Lead, Prospect, OnHold, Approved, Scheduled, Completed, Invoiced, Closed; Lost is a dead job. projects.stage holds it; checklist.stage_since says since when.',
  '- Owens Corning shingles throughout. Crews are subcontractors (crews, crew_work_orders, crew_payments).',
  '- People and their roles are in team_profiles (admin, production, field, sales). Theo owns the company; Joan runs the office.',
  '',
  'Money, the way the app counts it:',
  '- A job\'s value is its SIGNED contracts (inspection_reports whose title starts "Contract", with signed_at set and total > 0) plus checklist.manual_value, plus SIGNED change orders (title starts "Change Order"). With no signed contract it falls back to the best estimate.',
  '- Paid is the collections table for that job (amount). If a job has no collections rows, older jobs may carry payments inside checklist.payments.',
  '- Balance = value − paid. Insurance money detail: insurance_claims (approved_rcv, deductible, deductible_waived) and insurance_payments (kind, amount).',
  '- Invoices are inspection_reports titled "Invoice …". Estimates live in the estimates table (status, total).',
  '',
  'How to answer:',
  '- Short and plain. Lead with the answer and the number. Money as $12,345.67.',
  '- Name every job you mention as a link the app can open: [Client Name](job:PROJECT_UUID).',
  '- Look before you answer. Never guess a number, a name or a date; if the records do not say, say that.',
  '- Query narrowly (select only the columns you need, filter, limit). Large text columns cost time.',
  '- When asked to change something, read the current row first, then call propose_changes with exactly the change, and a one-line plain-English label per change. Say in your reply what you proposed and that it needs their Approve. Never say it is done.',
  '- To move a job to a new stage, update projects.stage only; the app writes the stage date itself. projects.checklist cannot be changed from here; say so and point them to the job page.',
  '- If a request is unclear or would change many records, ask one short question first.',
].join('\n');

export function toolsFor(person) {
  const tables = tablesFor(person);
  return [
    {
      name: 'db_select',
      description: 'Read rows from one table of the Cardinal app, as the signed-in person (their permissions apply). Returns JSON rows.',
      input_schema: {
        type: 'object',
        properties: {
          table: { type: 'string', enum: tables },
          select: { type: 'string', description: 'Comma-separated columns. Default: the useful columns.' },
          filters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                column: { type: 'string' },
                op: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'is', 'in'] },
                value: { type: 'string', description: 'For ilike use %text%. For is use null/true/false. For in use a,b,c.' },
              },
              required: ['column', 'op', 'value'],
              additionalProperties: false,
            },
          },
          order: { type: 'string', description: 'column.asc or column.desc' },
          limit: { type: 'integer', minimum: 1, maximum: 200 },
        },
        required: ['table'],
        additionalProperties: false,
      },
    },
    {
      name: 'propose_changes',
      description: 'Propose changes for the person to approve. Nothing is changed until they tap Approve. Use only after reading the current rows.',
      input_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'One line: what these changes do.' },
          changes: {
            type: 'array',
            minItems: 1,
            maxItems: 25,
            items: {
              type: 'object',
              properties: {
                table: { type: 'string', enum: tables },
                action: { type: 'string', enum: ['insert', 'update', 'delete'] },
                id: { type: 'string', description: 'Row id, for update and delete.' },
                values: { type: 'object', description: 'Columns to set, for insert and update.' },
                label: { type: 'string', description: 'Plain English, e.g. "Record a $2,000 deposit for Susan Townsend".' },
              },
              required: ['table', 'action', 'label'],
              additionalProperties: false,
            },
          },
        },
        required: ['summary', 'changes'],
        additionalProperties: false,
      },
    },
  ];
}

const OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'is', 'in']);
const COL = /^[a-z_][a-z0-9_]*$/;

/* Build the PostgREST query for db_select. Exported for the gate. Throws on anything outside
   the person's tables or the table's columns. */
export function selectUrl(person, input) {
  const t = String(input && input.table || '');
  if (!tablesFor(person).includes(t)) throw new Error('That table is not available here: ' + t);
  const allowed = SCHEMA[t].split(',');
  const sel = String(input.select || '').split(',').map(s => s.trim()).filter(Boolean);
  const cols = sel.length ? sel.filter(c => allowed.includes(c)) : allowed.filter(c => !['checklist', 'line_items', 'comments', 'steps', 'trail', 'items'].includes(c));
  if (!cols.length) throw new Error('None of those columns exist on ' + t + '. Columns: ' + SCHEMA[t]);
  const q = ['select=' + encodeURIComponent(cols.join(','))];
  for (const f of (Array.isArray(input.filters) ? input.filters : []).slice(0, 10)) {
    const c = String(f && f.column || ''), op = String(f && f.op || '');
    if (!COL.test(c) || !allowed.includes(c)) throw new Error('No column ' + c + ' on ' + t);
    if (!OPS.has(op)) throw new Error('Bad filter op ' + op);
    let v = String(f.value == null ? '' : f.value);
    if (op === 'in') v = '(' + v.split(',').map(x => '"' + x.trim().replace(/"/g, '') + '"').join(',') + ')';
    q.push(encodeURIComponent(c) + '=' + op + '.' + encodeURIComponent(v));
  }
  if (input.order) {
    const m = /^([a-z_][a-z0-9_]*)\.(asc|desc)$/.exec(String(input.order));
    if (m && allowed.includes(m[1])) q.push('order=' + m[1] + '.' + m[2] + '.nullslast');
  }
  q.push('limit=' + Math.max(1, Math.min(200, Number(input.limit) || 50)));
  return SUPABASE_URL + '/rest/v1/' + t + '?' + q.join('&');
}

/* Keep a proposal to what the person may do; drop anything else with a reason. Exported for the gate. */
export function cleanProposals(person, input) {
  const tables = tablesFor(person);
  const out = [], dropped = [];
  for (const c of (Array.isArray(input && input.changes) ? input.changes : []).slice(0, 25)) {
    const t = String(c && c.table || ''), a = String(c && c.action || '');
    const why = !tables.includes(t) ? 'table not available' : NO_WRITE_TABLES.has(t) ? 'that table is not changed from here'
      : !['insert', 'update', 'delete'].includes(a) ? 'unknown action'
      : (a !== 'insert' && !String(c.id || '').trim()) ? 'no row id'
      : (a !== 'delete' && (!c.values || typeof c.values !== 'object' || !Object.keys(c.values).length)) ? 'nothing to set' : '';
    if (why) { dropped.push(clip(c && c.label, 120) + ' (' + why + ')'); continue; }
    const allowed = SCHEMA[t].split(','), banned = NO_WRITE_COLUMNS[t] || ['id', 'created_at', 'created_by'];
    let values = null;
    if (a !== 'delete') {
      values = {};
      for (const k of Object.keys(c.values)) if (allowed.includes(k) && !banned.includes(k)) values[k] = c.values[k];
      if (!Object.keys(values).length) { dropped.push(clip(c.label, 120) + ' (those columns cannot be changed from here)'); continue; }
    }
    out.push({ table: t, action: a, id: a === 'insert' ? null : clip(c.id, 80), values, label: clip(c.label, 200) || (a + ' ' + t) });
  }
  return { summary: clip(input && input.summary, 300), changes: out, dropped };
}

async function whoIs(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { status: 401, error: 'Sign in required' };
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
    if (!r.ok) return { status: 401, error: 'Invalid session' };
    const u = await r.json();
    const email = String(u && u.email || '').trim().toLowerCase();
    const person = PEOPLE[email];
    if (!person) return { status: 403, error: 'The assistant is for Theo and Joan only' };
    return { person: Object.assign({ email }, person), token };
  } catch (e) { return { status: 401, error: 'Could not verify session' }; }
}

async function runSelect(person, token, input) {
  const url = selectUrl(person, input);
  const r = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
  const body = await r.text();
  if (!r.ok) throw new Error('Read failed (' + r.status + '): ' + clip(body, 300));
  return body.length > 60000 ? body.slice(0, 60000) + '\n…cut off at 60,000 characters; query more narrowly.' : body;
}

/* 504 fix (15 Oct 2026): the deadline was only checked BEFORE a step, and each call had its own
   45s timeout plus an SDK retry, so a step starting at 40s ran Vercel past 60s and the browser got
   a bare HTTP 504. Every call now gets only what is left of the whole-request budget. */
function ask(client, system, tools, messages, withFallbacks, timeout) {
  const params = { model: MODEL, max_tokens: 16000, output_config: { effort: 'medium' }, system, tools, messages };
  const opts = { timeout, maxRetries: 0 };
  const stream = withFallbacks
    ? client.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, opts)
    : client.messages.stream(params, opts);
  return stream.finalMessage();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const who = await whoIs(req);
  if (!who.person) { res.status(who.status).json({ error: who.error }); return; }
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' }); return; }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const question = clip(body.question, 4000).trim();
  if (!question) { res.status(400).json({ error: 'Ask something' }); return; }

  const person = who.person, started = Date.now();
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const system = [
    { type: 'text', text: RULES, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: 'You are talking to ' + person.name + ' (' + person.email + '). Today is ' + today + ' (Eastern).' +
      (person.owner ? '' : ' Owner-only records (Owner Review, the Owner Console) are not available in this conversation.') },
  ];
  const tools = toolsFor(person);
  const messages = [];
  for (const m of (Array.isArray(body.history) ? body.history : []).slice(-20)) {
    const text = clip(m && m.text, 6000).trim(); if (!text) continue;
    const role = m.role === 'ai' ? 'assistant' : 'user';
    if (!messages.length && role === 'assistant') continue;
    if (messages.length && messages[messages.length - 1].role === role) messages[messages.length - 1].content += '\n\n' + text;
    else messages.push({ role, content: text });
  }
  if (messages.length && messages[messages.length - 1].role === 'user') messages[messages.length - 1].content += '\n\n' + question;
  else messages.push({ role: 'user', content: question });

  const client = new Anthropic({ apiKey, maxRetries: 0 });
  const left = () => Math.min(CALL_MAX_MS, DEADLINE_MS - (Date.now() - started));
  let fallbacks = true, proposals = null, usage = { input: 0, output: 0, cache_read: 0 };
  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      if (left() < MIN_CALL_MS) break;
      let msg;
      try { msg = await ask(client, system, tools, messages, fallbacks, left()); }
      catch (e) {
        if (fallbacks && e && e.status === 400 && left() >= MIN_CALL_MS) { fallbacks = false; msg = await ask(client, system, tools, messages, false, left()); }
        else if (step > 0 && e && typeof e.status !== 'number') break;   // ran out of time mid-lookup: answer below, not a 502
        else throw e;
      }
      const u = msg.usage || {};
      usage.input += u.input_tokens || 0; usage.output += u.output_tokens || 0; usage.cache_read += u.cache_read_input_tokens || 0;
      if (msg.stop_reason === 'refusal') { res.status(200).json({ reply: 'I can’t help with that one.', proposals: null }); return; }
      if (msg.stop_reason === 'max_tokens') { res.status(200).json({ reply: 'That answer ran long and was cut off. Ask for less at once.', proposals: null }); return; }
      messages.push({ role: 'assistant', content: msg.content });   // append-only: thinking blocks go back unchanged
      const uses = msg.content.filter(b => b.type === 'tool_use');
      const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
      if (msg.stop_reason !== 'tool_use' || !uses.length) {
        console.log('[assistant]', person.email, 'steps', step + 1, 'ms', Date.now() - started, JSON.stringify(usage));
        res.status(200).json({ reply: text || (proposals ? '' : 'No answer came back. Try again.'), proposals, usage });
        return;
      }
      const results = [];
      for (const b of uses) {
        if (b.name === 'db_select') {
          try { results.push({ type: 'tool_result', tool_use_id: b.id, content: await runSelect(person, who.token, b.input) }); }
          catch (e) { results.push({ type: 'tool_result', tool_use_id: b.id, content: String(e && e.message || e), is_error: true }); }
        } else if (b.name === 'propose_changes') {
          const p = cleanProposals(person, b.input);
          if (p.changes.length) proposals = { summary: p.summary, changes: (proposals ? proposals.changes : []).concat(p.changes).slice(0, 25) };
          results.push({ type: 'tool_result', tool_use_id: b.id,
            content: (p.changes.length ? p.changes.length + ' change(s) shown to ' + person.name + ' for approval. Not applied yet.' : 'Nothing was proposed.') +
              (p.dropped.length ? ' Left out: ' + p.dropped.join('; ') : '') + ' Now reply in one or two sentences.' });
        } else {
          results.push({ type: 'tool_result', tool_use_id: b.id, content: 'Unknown tool', is_error: true });
        }
      }
      messages.push({ role: 'user', content: results });
    }
    res.status(200).json({ reply: proposals ? 'Here is what I would change.' : 'That took too long to look up. Ask a narrower question.', proposals, usage });
  } catch (err) {
    const status = err && typeof err.status === 'number' ? err.status : 0;
    res.status(502).json({ error: 'The assistant could not answer', detail: clip((err && err.message) || err, 300),
                           retryable: status === 429 || status >= 500 || status === 0 });
  }
}
