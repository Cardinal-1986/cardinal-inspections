// api/inspect-assist.js — build 1266. The inspection report assistant (Theo, 8 Oct
// 2026): step 2 of the guided "New inspection report". The rep ticks photos, talks
// to the assistant, then taps Write report; the browser drops the answer into the
// report template it already uses.
//
//   POST { mode:'chat',  photos, facts, trades, general, history, life_by }
//     → { reply, ready }
//   POST { mode:'write', photos, facts, trades, general, history, life_by, sections }
//     → { summary, sections:[{num,narrative}], photos:[{id,section,caption,severity}],
//         recommendations:[str], life_estimate }
//   POST { mode:'edit', instruction, blocks:[{id,kind,where,text}] }      (1267)
//     → { reply, edits:[{id,text}] } — only ids that were sent come back
//
// Claude, not Gemini: Theo's call ("Claude"), and the same reason the librarian
// moved (806) — one model that sees the photos and holds the conversation.
//
// Photos arrive as SIGNED STORAGE URLS, never bytes: 16 phone photos as data URLs
// would blow Vercel's request-body limit, and Claude fetches a URL image itself.
// Only this project's own Supabase storage URLs are accepted, so the route cannot
// be pointed at an arbitrary address.
//
// Same staff gate as every AI route (api/_staff.js). Needs ANTHROPIC_API_KEY.

import Anthropic from '@anthropic-ai/sdk';
import { isStaff } from './_staff.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

const MODEL = 'claude-opus-5-5';
const MAX_PHOTOS = 16;
/* 60s maxDuration in vercel.json; leave headroom for one fast transport retry. */
const REQ_TIMEOUT_MS = 52000;
const MAX_RETRIES = 1;

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

/* Only this project's storage, signed or public, in the photos bucket. */
export function okPhotoUrl(u){
  const s = String(u || '');
  return s.startsWith(SUPABASE_URL + '/storage/v1/object/sign/photos/') ||
         s.startsWith(SUPABASE_URL + '/storage/v1/object/public/photos/');
}

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

export const RULES = [
  'You help a Cardinal Roofing & Renovations rep (Dayton, Ohio) turn a site visit into an inspection report.',
  'The rep gives you checked photos, the checklist answers, and notes in the chat.',
  'How to write:',
  '- Plain, specific, professional language a homeowner can read. No sales talk, no prices.',
  '- A caption says only what that photo shows. Never name a side, a room or an elevation the rep did not name.',
  '- Anything the rep told you goes in as fact. If the rep says the homeowner said it, write "Homeowner reports ...".',
  '- Anything you only see in a photo is worded carefully ("appears to", "consistent with").',
  '- Never invent measurements, ages, brands, counts or causes. If you do not know, leave it out.',
  '- Cardinal installs Owens Corning. Do not name another manufacturer unless the rep did.',
  '- If something is bad but outside what was inspected, still recommend it and say it was outside this inspection.',
  '- Recommendations are concrete scope items, each tied to a finding.',
].join('\n');

const CHAT_SHAPE = [
  'This is the chat before the report is written. Reply in one to three short sentences.',
  'Ask ONE question at a time about what the photos cannot show (leaks reported, how long, what the homeowner wants, anything hidden).',
  'Do not repeat the checklist back. When you have enough to write a good report, say so and set ready to true.',
].join('\n');

const WRITE_SHAPE = [
  'Write the report now.',
  '- summary: one paragraph, the overall condition and whether repair or replacement is recommended.',
  '- sections: a short narrative for each listed section number that has something to say. Skip sections with nothing.',
  '- photos: every photo id you were given, each placed in ONE of the listed section numbers, with a one-sentence caption and a severity:',
  '  high (needs action now), mod (should be addressed), mon (monitor), none (context only).',
  '- recommendations: the scope items, most important first.',
  '- life_estimate: only when asked for one; a short range such as "About 3–5 years of service life left", or "" otherwise.',
].join('\n');

const EDIT_SHAPE = [
  'The report is already written. The rep wants it changed. You get the report\'s editable parts, each with an id.',
  '- Change ONLY what the rep asks for. Return the full new text of each part you change; leave every other part out.',
  '- A part with empty text is an unfilled blank; fill it only if the rep asks for something that belongs there.',
  '- If the rep gives a new fact, put it in the part where it belongs.',
  '- reply: one short sentence saying what you changed, or why you changed nothing.',
].join('\n');
const EDIT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['reply', 'edits'],
  properties: { reply: { type: 'string' }, edits: { type: 'array', items: { type: 'object', additionalProperties: false,
    required: ['id', 'text'], properties: { id: { type: 'string' }, text: { type: 'string' } } } } }
};
/* The edit turn: the instruction and the report's parts. No photos, no facts —
   the parts already carry them. */
export function buildEditContent(body){
  const blocks = (Array.isArray(body.blocks) ? body.blocks : []).slice(0, 60).map(b => ({
    id: clip(b && b.id, 10), kind: clip(b && b.kind, 30), where: clip(b && b.where, 80), text: clip(b && b.text, 2500) }));
  const text = 'The rep asks: ' + clip(body.instruction, 1500) + '\n' +
    'Report parts (JSON): ' + JSON.stringify(blocks);
  return { content: [{ type: 'text', text }], blockIds: blocks.map(b => b.id) };
}

const CHAT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['reply', 'ready'],
  properties: { reply: { type: 'string' }, ready: { type: 'boolean' } }
};
const WRITE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['summary', 'sections', 'photos', 'recommendations', 'life_estimate'],
  properties: {
    summary: { type: 'string' },
    sections: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['num', 'narrative'], properties: { num: { type: 'integer' }, narrative: { type: 'string' } } } },
    photos: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['id', 'section', 'caption', 'severity'],
      properties: { id: { type: 'string' }, section: { type: 'integer' }, caption: { type: 'string' },
                    severity: { type: 'string', enum: ['high', 'mod', 'mon', 'none'] } } } },
    recommendations: { type: 'array', items: { type: 'string' } },
    life_estimate: { type: 'string' }
  }
};

/* Build the one user turn: the photos (each labelled with its id), then the
   facts, then the conversation so far. Exported so the gate can check it
   without a network call. */
export function buildContent(body, mode){
  const photos = (Array.isArray(body.photos) ? body.photos : []).filter(p => p && okPhotoUrl(p.url)).slice(0, MAX_PHOTOS);
  const content = [];
  photos.forEach(p => {
    content.push({ type: 'text', text: 'Photo id=' + clip(p.id, 60) });
    content.push({ type: 'image', source: { type: 'url', url: String(p.url) } });
  });
  const facts = {};
  const f = body.facts && typeof body.facts === 'object' ? body.facts : {};
  Object.keys(f).slice(0, 40).forEach(k => { facts[clip(k, 40)] = clip(f[k], 300); });
  const trades = (Array.isArray(body.trades) ? body.trades : []).map(t => clip(t, 30)).slice(0, 10);
  const hist = (Array.isArray(body.history) ? body.history : []).slice(-30)
    .map(m => (m && m.role === 'ai' ? 'Assistant: ' : 'Rep: ') + clip(m && m.text, 1500)).join('\n');
  let text = 'Inspected: ' + (body.general ? 'General inspection' + (trades.length ? ', ' : '') : '') + (trades.join(', ') || (body.general ? '' : 'not stated')) + '\n' +
    'Checklist answers (JSON): ' + JSON.stringify(facts) + '\n' +
    (photos.length ? photos.length + ' photo(s) above.' : 'No photos were checked.') + '\n' +
    (hist ? 'Conversation so far:\n' + hist + '\n' : 'No conversation yet.\n');
  if (mode === 'write') {
    const secs = (Array.isArray(body.sections) ? body.sections : []).slice(0, 12)
      .map(s => clip(s && s.num, 4) + ' = ' + clip(s && s.name, 80)).join('; ');
    text += 'Report sections that hold photos: ' + (secs || '3..8') + '.\n' +
      (body.life_by === 'ai' ? 'Give a life_estimate for the roof.\n' : 'Leave life_estimate as "".\n');
  }
  content.push({ type: 'text', text });
  return { content, photoIds: photos.map(p => clip(p.id, 60)) };
}

function textOf(msg) {
  return (msg && Array.isArray(msg.content) ? msg.content : [])
    .filter(b => b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text).join('').trim();
}

async function askClaude(client, system, content, schema, effort, withFallbacks) {
  const params = {
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort, format: { type: 'json_schema', schema } },
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content }],
  };
  /* Server-side refusal fallback: a declined request is re-run on a fallback
     model inside the same call. If this account or SDK rejects the beta, the
     caller retries once without it. */
  const stream = withFallbacks
    ? client.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, { timeout: REQ_TIMEOUT_MS })
    : client.messages.stream(params, { timeout: REQ_TIMEOUT_MS });
  return await stream.finalMessage();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const user = await requireSession(req, res);
  if (!user) return;
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' }); return; }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const mode = body.mode === 'write' ? 'write' : body.mode === 'edit' ? 'edit' : 'chat';
  let content, photoIds = [], blockIds = [];
  if (mode === 'edit') {
    if (!String(body.instruction || '').trim()) { res.status(400).json({ error: 'Say what to change' }); return; }
    ({ content, blockIds } = buildEditContent(body));
  } else {
    ({ content, photoIds } = buildContent(body, mode));
  }
  const system = RULES + '\n\n' + (mode === 'write' ? WRITE_SHAPE : mode === 'edit' ? EDIT_SHAPE : CHAT_SHAPE);
  const schema = mode === 'write' ? WRITE_SCHEMA : mode === 'edit' ? EDIT_SCHEMA : CHAT_SCHEMA;
  const effort = mode === 'chat' ? 'low' : 'medium';

  const client = new Anthropic({ apiKey, maxRetries: MAX_RETRIES });
  let msg;
  try {
    try { msg = await askClaude(client, system, content, schema, effort, true); }
    catch (e) {
      if (e && e.status === 400) msg = await askClaude(client, system, content, schema, effort, false);
      else throw e;
    }
  } catch (err) {
    const status = err && typeof err.status === 'number' ? err.status : 0;
    res.status(502).json({ error: 'The assistant could not answer', detail: clip((err && err.message) || err, 400),
                           retryable: status === 429 || status >= 500 || status === 0 });
    return;
  }
  if (msg && msg.stop_reason === 'refusal') { res.status(502).json({ error: 'The assistant declined that one', retryable: false }); return; }
  if (msg && msg.stop_reason === 'max_tokens') { res.status(502).json({ error: 'The answer ran long and was cut off — try fewer photos', retryable: true }); return; }

  let out;
  try { out = JSON.parse(textOf(msg)); }
  catch (e) { res.status(502).json({ error: 'The assistant returned something unreadable', retryable: true }); return; }

  if (mode === 'chat') {
    res.status(200).json({ reply: clip(out.reply, 2000), ready: !!out.ready });
    return;
  }
  if (mode === 'edit') {
    const done = new Set();
    const edits = (Array.isArray(out.edits) ? out.edits : []).filter(e => {
      const id = clip(e && e.id, 10);
      if (!blockIds.includes(id) || done.has(id) || !String(e.text || '').trim()) return false;
      done.add(id); return true;
    }).map(e => ({ id: clip(e.id, 10), text: clip(e.text, 3000) }));
    res.status(200).json({ reply: clip(out.reply, 600), edits });
    return;
  }
  /* Keep only photos we sent, each once. */
  const seen = new Set();
  const photos = (Array.isArray(out.photos) ? out.photos : []).filter(p => {
    const id = clip(p && p.id, 60);
    if (!photoIds.includes(id) || seen.has(id)) return false;
    seen.add(id); return true;
  }).map(p => ({ id: clip(p.id, 60), section: Number(p.section) || 0, caption: clip(p.caption, 400),
                 severity: ['high', 'mod', 'mon'].includes(p.severity) ? p.severity : 'none' }));
  res.status(200).json({
    summary: clip(out.summary, 3000),
    sections: (Array.isArray(out.sections) ? out.sections : []).slice(0, 12)
      .map(s => ({ num: Number(s && s.num) || 0, narrative: clip(s && s.narrative, 2500) })),
    photos,
    recommendations: (Array.isArray(out.recommendations) ? out.recommendations : []).slice(0, 15).map(r => clip(r, 500)),
    life_estimate: body.life_by === 'ai' ? clip(out.life_estimate, 200) : ''
  });
}
