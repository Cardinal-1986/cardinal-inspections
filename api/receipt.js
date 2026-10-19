// api/receipt.js — build 1336. A payment receipt, texted AND emailed (Theo's pick 4C).
//
// Two callers, one sender:
//   • POST /api/receipt { collection_id }  — staff, signed in. Record payment's "Send a receipt"
//     tick box (on by default, pick 4.2B). The row is read with the CALLER's token first, so RLS
//     decides whether they may see it; the send then uses the service role.
//   • sendReceipt({ externalRef })         — imported by api/pay-webhook.js after it records a
//     NEW online payment. Never on a redelivered event: the webhook's 409 path does not call it.
//
// Who it goes to: the homeowner on file (projects.phone / projects.email). A carrier's check
// (source 'insurance') sends nothing — the carrier paid, not the homeowner. Community jobs bill a
// funding partner whose address is not on the job, so they send nothing yet (OPEN_ITEMS).
// The balance is owedOn()'s, imported from api/pay.js, so a receipt can never disagree with the
// pay link. Each channel is best-effort; the answer says what went and why anything did not.
//
// Needs SUPABASE_SERVICE_ROLE_KEY. TWILIO_* for the text and RESEND_API_KEY for the email are each
// optional — a missing one skips that channel and says so.
import { isStaff } from './_staff.js';
import { owedOn, homeOwedOn } from './pay.js';

const SUPA_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPA_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';
const ID_RX = /^[0-9a-f-]{20,60}$/i;

function normPhone(p){
  if(!p) return '';
  var s = String(p).trim();
  if(s.charAt(0) === '+'){ var t = s.slice(1).replace(/[^\d]/g, ''); return t ? '+' + t : ''; }
  var d = s.replace(/[^\d]/g, '');
  if(d.length === 10) return '+1' + d;
  if(d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return '';
}
const esc = s => String(s == null ? '' : s).replace(/[<>&"']/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' }[c]));
const usd = n => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
function methodLabel(c){
  var m = String(c.method || '').toLowerCase(), ref = '';
  var mm = /#\s*([A-Za-z0-9-]{1,20})/.exec(String(c.notes || '')); if(mm) ref = mm[1];
  var base = m === 'ach' ? 'Bank transfer' : m === 'card' ? 'Card' : m === 'cash' ? 'Cash' : m === 'check' ? 'Check' : (m ? m[0].toUpperCase() + m.slice(1) : 'Payment');
  return base + (ref ? ' ' + ref : '');
}
function dayLabel(d){
  var t = Date.parse(String(d || '') + (String(d || '').length === 10 ? 'T12:00:00Z' : ''));
  return new Date(isFinite(t) ? t : Date.now()).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', timeZone:'America/New_York' });
}

/* exported for the webhook and the gate */
export function receiptText(first, c, balance){
  var s = 'Hi ' + first + ', Cardinal Roofing received your ' + usd(c.amount) + ' payment (' + methodLabel(c).toLowerCase() + ') on ' + dayLabel(c.collected_at) + '.';
  if(balance != null) s += balance > 0.005 ? ' Balance remaining: ' + usd(balance) + '.' : ' Your balance is paid in full.';
  return (s + ' Thank you!').slice(0, 320);
}
export function receiptHtml(pr, c, money){
  var no = 'R-' + String(c.id || '').replace(/-/g, '').slice(0, 6).toUpperCase();
  var td = 'padding:6px 0;border-bottom:1px solid #e6e6e6';
  var row = function(k, v, bold){
    return '<tr><td style="' + td + '">' + (bold ? '<b>' + k + '</b>' : k) + '</td>'
      + '<td style="' + td + ';text-align:right">' + (bold ? '<b>' + v + '</b>' : v) + '</td></tr>';
  };
  var rows = row('Date', esc(dayLabel(c.collected_at))) + row('Method', esc(methodLabel(c)))
    + row('Job', esc(pr.address || pr.name || ''));
  if(money){
    rows += row('Job total', usd(money.total)) + row('Paid to date', usd(money.paid))
      + row('Balance remaining', usd(Math.max(0, money.balance)), true);
  }
  var first = String(pr.name || '').trim().split(/\s+/)[0] || 'there';
  return '<div style="font-family:\'Segoe UI\',Arial,sans-serif;color:#1b1b1b;max-width:520px">'
    + '<h2 style="margin:0 0 2px;font-size:20px">Payment received</h2>'
    + '<div style="color:#555;font-size:13px">Cardinal Roofing &amp; Renovations · Dayton, OH</div>'
    + '<div style="font-size:26px;font-weight:800;color:#047857;margin:14px 0 2px">' + usd(c.amount) + '</div>'
    + '<div style="color:#555">Thank you, ' + esc(first) + '.</div>'
    + '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">' + rows + '</table>'
    + '<div style="color:#555;font-size:12px">Receipt ' + esc(no) + ' · keep for your records · 5735 Webster St, Dayton OH 45414 · 937.576.6753</div></div>';
}

async function svcGet(srk, path){
  const r = await fetch(SUPA_URL + '/rest/v1/' + path, { headers: { apikey: srk, Authorization: 'Bearer ' + srk } });
  if(!r.ok) throw new Error('lookup failed: ' + path.split('?')[0] + ' ' + r.status);
  return r.json();
}

/* The one sender. Returns { ok, texted, emailed, skipped:[reasons] }. Never throws. */
export async function sendReceipt(opts){
  const out = { ok:false, texted:false, emailed:false, skipped:[] };
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!srk){ out.skipped.push('server not configured'); return out; }
  try{
    const q = opts.collectionId ? 'id=eq.' + encodeURIComponent(opts.collectionId) : 'external_ref=eq.' + encodeURIComponent(opts.externalRef || '');
    const c = (await svcGet(srk, 'collections?select=id,project_id,amount,collected_at,method,notes,source,type&' + q + '&limit=1'))[0];
    if(!c){ out.skipped.push('payment not found'); return out; }
    if(String(c.source || '') === 'insurance'){ out.skipped.push('a carrier payment'); out.ok = true; return out; }
    const pr = (await svcGet(srk, 'projects?select=id,name,phone,email,address,checklist&id=eq.' + c.project_id + '&limit=1'))[0];
    if(!pr){ out.skipped.push('job not found'); return out; }
    var ck = {}; try{ ck = typeof pr.checklist === 'string' ? JSON.parse(pr.checklist || '{}') : (pr.checklist || {}); }catch(_){}
    var ct = String((ck.lead && ck.lead.claim_type) || ck.claim_type || '').toLowerCase();
    if(ct === 'community'){ out.skipped.push('a community job (the funding partner pays)'); out.ok = true; return out; }
    // the balance, exactly as the pay link computes it
    var money = null;
    try{
      const sbH = { apikey: srk, Authorization: 'Bearer ' + srk };
      // the job's newest invoice (its stored total is owedOn's fallback for a job with no signed contract)
      const inv = (await svcGet(srk, 'inspection_reports?select=id,title,total,project_id&project_id=eq.' + c.project_id
        + '&title=ilike.invoice*&order=created_at.desc&limit=1'))[0];
      // 1378: on an insurance job the homeowner's balance is their part (null when the contract has none: no balance line)
      const o = ct === 'insurance' ? (inv ? await homeOwedOn(sbH, inv) : null)
              : await owedOn(sbH, inv || { title:'Invoice', project_id:c.project_id, total:0 });
      if(o && o.totalCents > 0) money = { total:o.totalCents / 100, paid:o.paidCents / 100, balance:o.cents / 100 };
    }catch(_m){ money = null; }   // a failed read leaves the balance OFF the receipt, never wrong on it
    const first = String(pr.name || '').trim().split(/\s+/)[0] || 'there';

    // the text
    const sid = String(process.env.TWILIO_ACCOUNT_SID || '').trim(), tok = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
    const svc = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim(), from = String(process.env.TWILIO_FROM || '').trim();
    const to = normPhone(pr.phone);
    if(!to) out.skipped.push('no mobile number on the job');
    else if(!(sid && tok && (svc || from))) out.skipped.push('company texting is not set up');
    else{
      const params = { To:to, Body:receiptText(first, c, money ? money.balance : null) };
      if(svc) params.MessagingServiceSid = svc; else params.From = from;
      const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(sid) + '/Messages.json', { method:'POST',
        headers: { Authorization:'Basic ' + Buffer.from(sid + ':' + tok).toString('base64'), 'Content-Type':'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString() });
      if(r.ok) out.texted = true; else out.skipped.push('the text did not send (HTTP ' + r.status + ')');
    }
    // the email
    const rk = process.env.RESEND_API_KEY, em = String(pr.email || '').trim();
    if(!em || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) out.skipped.push('no email on the job');
    else if(!rk) out.skipped.push('email is not set up');
    else{
      const r2 = await fetch('https://api.resend.com/emails', { method:'POST',
        headers: { 'Content-Type':'application/json', Authorization:'Bearer ' + rk },
        body: JSON.stringify({ from: process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>',
          to:[em], reply_to:'Admin@cardinalrenovations.net',
          subject:'Payment received — ' + usd(c.amount) + ' · Cardinal Roofing', html:receiptHtml(pr, c, money) }) });
      if(r2.ok) out.emailed = true; else out.skipped.push('the email did not send (HTTP ' + r2.status + ')');
    }
    out.ok = true;
    return out;
  }catch(e){ out.skipped.push(String((e && e.message) || e)); return out; }
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ ok:false, error:'POST only' }); return; }
  const auth = req.headers.authorization || '', token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if(!token){ res.status(401).json({ ok:false, error:'Sign in required' }); return; }
  let user;
  try{
    const w = await fetch(SUPA_URL + '/auth/v1/user', { headers: { apikey:SUPA_KEY, Authorization:'Bearer ' + token } });
    user = w.ok ? await w.json() : null;
  }catch(_){ user = null; }
  if(!user || !user.email){ res.status(401).json({ ok:false, error:'Invalid session' }); return; }
  if(!isStaff(user.email)){ res.status(403).json({ ok:false, error:'Staff only' }); return; }
  const id = String((req.body || {}).collection_id || '').trim();
  if(!ID_RX.test(id)){ res.status(400).json({ ok:false, error:'Missing payment' }); return; }
  // RLS decides whether THIS person may see the payment
  try{
    const v = await fetch(SUPA_URL + '/rest/v1/collections?select=id&id=eq.' + encodeURIComponent(id) + '&limit=1',
      { headers: { apikey:SUPA_KEY, Authorization:'Bearer ' + token } });
    const rows = v.ok ? await v.json() : [];
    if(!Array.isArray(rows) || !rows.length){ res.status(403).json({ ok:false, error:'That payment is not visible to you.' }); return; }
  }catch(_){ res.status(502).json({ ok:false, error:'Could not check the payment' }); return; }
  const out = await sendReceipt({ collectionId:id });
  res.status(200).json(out);
}
