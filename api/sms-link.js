// api/sms-link.js — text a client their secure pay link via the company's Twilio
// Messaging Service (the "Send via Company SMS" button in the Invoices & Payments
// block). Company-logged, A2P-compliant sending, as opposed to the rep's own
// phone (the sms: link) or email.
//
// POST { project_id, url }  — the caller (staff) has already minted the pay link
// (/api/share?t=<token>) and passes it as `url`. The homeowner's phone is read
// SERVER-SIDE from projects.phone using the caller's own token, so a rep can only
// text a number on a job they can already see (RLS), and no arbitrary number can
// be dialed through this route.
//
// Reuses the exact Twilio config + error mapping as api/notify.js. Best-effort:
// missing TWILIO_* keys answer { ok:false, reason:'sms_not_configured' }, never a
// crash. Needs TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + (TWILIO_MESSAGING_SERVICE_SID
// or TWILIO_FROM).
const SUPA_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPA_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';

// E.164 for Twilio — free-form projects.phone in, +1XXXXXXXXXX out, '' if unusable.
function normPhone(p){
  if(!p) return '';
  var s = String(p).trim();
  if(s.charAt(0) === '+'){ var t = s.slice(1).replace(/[^\d]/g, ''); return t ? '+' + t : ''; }
  var d = s.replace(/[^\d]/g, '');
  if(d.length === 10) return '+1' + d;
  if(d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return '';
}

// describe a credential's SHAPE without revealing it (mirrors notify.js)
function twShape(raw, wantPrefix, wantLen){
  var s = String(raw == null ? '' : raw), t = s.trim();
  if(!t) return 'not set';
  var bits = [];
  if(s !== t) bits.push('has stray whitespace');
  if(wantPrefix && t.slice(0, 2).toUpperCase() !== wantPrefix)
    bits.push('starts "' + t.slice(0, 2) + '", expected "' + wantPrefix + '"');
  if(wantLen && t.length !== wantLen) bits.push(t.length + ' chars, expected ' + wantLen);
  return bits.length ? bits.join('; ') : 'looks right';
}

async function requireSession(req, res){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if(!token){ res.status(401).json({ ok:false, error:'Sign in required' }); return null; }
  try{
    const who = await fetch(SUPA_URL + '/auth/v1/user', {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token }
    });
    if(!who.ok){ res.status(401).json({ ok:false, error:'Invalid session' }); return null; }
    const user = await who.json();
    if(!user || !user.email){ res.status(401).json({ ok:false, error:'Invalid session' }); return null; }
    user._token = token;
    return user;
  }catch(e){
    res.status(401).json({ ok:false, error:'Could not verify session' });
    return null;
  }
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ ok:false, error:'POST only' }); return; }
  const caller = await requireSession(req, res);
  if(!caller) return;

  // trim the Twilio config once (a pasted newline must not corrupt the auth header)
  var twSidRaw = process.env.TWILIO_ACCOUNT_SID, twTokRaw = process.env.TWILIO_AUTH_TOKEN;
  var twSid = String(twSidRaw || '').trim(), twTok = String(twTokRaw || '').trim();
  var twMsgSvc = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
  var twFrom = String(process.env.TWILIO_FROM || '').trim();
  if(!(twSid && twTok && (twMsgSvc || twFrom))){
    res.status(200).json({ ok:false, reason:'sms_not_configured',
      error:'Company texting is not set up yet (Twilio keys are missing in the server settings).' });
    return;
  }

  try{
    var body = req.body || {};
    var projectId = String(body.project_id || '').trim();
    var url = String(body.url || '').trim();
    if(!projectId || !/^https?:\/\//i.test(url)){
      res.status(400).json({ ok:false, error:'Missing project or pay link.' }); return;
    }

    // read the phone SERVER-SIDE with the caller's token — RLS scopes this to a
    // job they can see, so no arbitrary number can be texted through this route.
    var pq = SUPA_URL + '/rest/v1/projects?select=id,name,phone&id=eq.' +
      encodeURIComponent(projectId) + '&limit=1';
    var pr = await fetch(pq, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + caller._token } });
    var rows = await pr.json();
    if(!Array.isArray(rows) || !rows.length){
      res.status(403).json({ ok:false, error:'That job is not visible to you, or does not exist.' }); return;
    }
    var to = normPhone(rows[0].phone);
    if(!to){
      res.status(200).json({ ok:false, reason:'no_phone',
        error:'No usable mobile number is on file for this client — add one on the job first.' });
      return;
    }
    var first = String(rows[0].name || '').trim().split(/\s+/)[0] || 'there';
    var smsBody = ('Hi ' + first + ', here’s your invoice from Cardinal Roofing — review it and pay securely here: ' + url).slice(0, 320);

    var twUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(twSid) + '/Messages.json';
    var twAuth = 'Basic ' + Buffer.from(twSid + ':' + twTok).toString('base64');
    var params = { To: to, Body: smsBody };
    if(twMsgSvc) params.MessagingServiceSid = twMsgSvc; else params.From = twFrom;
    var sr = await fetch(twUrl, { method:'POST',
      headers: { Authorization: twAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString() });

    if(sr.ok){ res.status(200).json({ ok:true, texted:1 }); return; }

    // map the common Twilio failures to plain English (mirrors notify.js)
    var raw = await sr.text(), tc = 0, tm = '';
    try{ var tj = JSON.parse(raw); tc = Number(tj.code) || 0; tm = String(tj.message || ''); }catch(_){}
    var msg;
    if(sr.status === 401 || tc === 20003){
      msg = 'Twilio rejected the credentials (20003). Account SID: ' + twShape(twSidRaw, 'AC', 34) +
            '. Auth token: ' + twShape(twTokRaw, '', 32) + '. Fix in Vercel, then redeploy.';
    }else if(tc === 21606 || tc === 21659 || tc === 21660){
      msg = 'Twilio will not send from that sender (' + tc + '). Check the number is in the Messaging Service sender pool.';
    }else if(tc === 21610){
      msg = 'That number replied STOP and is opted out (21610).';
    }else if(tc === 21211 || tc === 21614){
      msg = 'Twilio rejected the recipient number (' + tc + ') — check the client’s phone on the job.';
    }else{
      msg = 'HTTP ' + sr.status + (tc ? ' (' + tc + ')' : '') + (tm ? ' ' + tm : '');
    }
    res.status(200).json({ ok:false, reason:'twilio_error', error:msg });
  }catch(err){
    res.status(200).json({ ok:false, error: String((err && err.message) || err) });
  }
}
