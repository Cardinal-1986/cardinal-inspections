/* harness_remind1156.js — Build 1156: automatic payment reminders.

   Drives the SHIPPED api/remind.js handler — imported, not re-implemented —
   with fetch stubbed, and reads the ACTUAL Twilio form bodies. That is the only
   proof of the thing that matters here: the right client, and ONLY the right
   client, gets the right text. The fixture set puts one job on every rung of
   the skip ladder; the assertions then check who was texted, who was skipped,
   and what the summary said.

   After the green run, three MUTATION CONTROLS strip one guard each from a
   copy of the route (the retail filter, the cap, the auth check) and expect
   the leak to become visible — a harness that has never been seen to fail
   proves nothing.

   Usage: node harness_remind1156.js [repo-root]   */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(process.argv[2] || path.resolve(__dirname, '../../../..'));
const ROUTE = path.join(ROOT, 'api/remind.js');
const routeSrc = fs.readFileSync(ROUTE, 'utf8');

let fails = 0, checks = 0;
function ok(c, m){ checks++; console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }

const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);

/* ── fixtures: one project per rung of the skip ladder ─────────────────── */
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
const ck  = t => JSON.stringify({ lead: { claim_type: t } });
const PH  = { P_OK: '937-555-0101', P_COM: '937-555-0102', P_INS: '937-555-0103',
  P_MUTED: '937-555-0104', P_PAID: '937-555-0105', P_RECENT: '937-555-0106',
  P_SOON: '937-555-0107', P_CAP: '937-555-0108', P_WEEK: '937-555-0109',
  P_NOPHONE: '', P_NOTOK: '937-555-0111', P_PROC: '937-555-0112', P_OPTOUT: '937-555-0113' };
const ALL = Object.keys(PH);

const PROJECTS = ALL.map(id => ({
  id, name: id === 'P_OK' ? 'Alder Property' : (id + ' Client'),
  phone: PH[id],
  checklist: id === 'P_COM' ? ck('community') : (id === 'P_INS' ? ck('insurance') : ck('')),
  reminders_muted: id === 'P_MUTED'
}));
const INVOICES = ALL.map(id => ({
  id: 'doc-' + id, project_id: id, title: 'Invoice — ' + id, status: 'sent',
  total: 9200, sent_at: id === 'P_SOON' ? daysAgo(1) : daysAgo(6), created_at: daysAgo(7),
  share_token: id === 'P_NOTOK' ? null : ('tok-' + id)
}));
const CONTRACTS = ALL.map(id => ({ project_id: id, title: 'Contract — ' + id, total: 9200, signed_at: daysAgo(30) }));
const COLLECTIONS = [
  { project_id: 'P_OK',     amount: 4600, collected_at: daysAgo(20).slice(0,10), created_at: daysAgo(20) },
  { project_id: 'P_PAID',   amount: 9200, collected_at: daysAgo(10).slice(0,10), created_at: daysAgo(10) },
  { project_id: 'P_RECENT', amount: 1000, collected_at: daysAgo(1).slice(0,10),  created_at: daysAgo(1) }
];
const REMLOG = []
  .concat([0,1,2,3].map(i => ({ project_id: 'P_CAP', sent_at: daysAgo(8 + i * 7), ok: true })))
  .concat([{ project_id: 'P_WEEK', sent_at: daysAgo(2), ok: true }]);

/* ── the fetch stub: routes every outbound request the handler makes ───── */
let sent = [], logged = [], patched = [], stripeAsked = [];
let ENABLED = true;   /* the 1157 master switch: true/false = row value, null = row missing */
function installFetch(){
  sent = []; logged = []; patched = []; stripeAsked = [];
  globalThis.fetch = async function(url, opts){
    const u = String(url); opts = opts || {};
    const method = (opts.method || 'GET').toUpperCase();
    if(u.indexOf('api.stripe.com/v1/payment_intents/search') !== -1){
      stripeAsked.push(u);
      const proc = decodeURIComponent(u).indexOf("'P_PROC'") !== -1;
      return { ok: true, json: async () => ({ data: proc ? [{ id: 'pi_1', status: 'processing' }] : [] }) };
    }
    if(u.indexOf('api.twilio.com') !== -1){
      const form = new URLSearchParams(opts.body || '');
      const rec = { to: form.get('To'), body: form.get('Body'), from: form.get('From'), svc: form.get('MessagingServiceSid') };
      sent.push(rec);
      if(rec.to === '+19375550113'){  // P_OPTOUT replied STOP
        return { ok: false, status: 400, text: async () => JSON.stringify({ code: 21610, message: 'unsubscribed recipient' }) };
      }
      return { ok: true, json: async () => ({ sid: 'SM1' }) };
    }
    if(u.indexOf('/rest/v1/payment_reminders') !== -1 && method === 'POST'){
      logged.push(JSON.parse(opts.body)[0]);
      return { ok: true, json: async () => ({}), text: async () => '' };
    }
    if(u.indexOf('/rest/v1/projects') !== -1 && method === 'PATCH'){
      patched.push({ url: u, body: JSON.parse(opts.body) });
      return { ok: true, json: async () => ({}), text: async () => '' };
    }
    if(u.indexOf('/rest/v1/app_settings') !== -1)
      return { ok: true, json: async () => (ENABLED === null ? [] : [{ value: ENABLED }]) };
    if(u.indexOf('/rest/v1/inspection_reports') !== -1 && u.indexOf('status=eq.sent') !== -1)
      return { ok: true, json: async () => INVOICES };
    if(u.indexOf('/rest/v1/inspection_reports') !== -1 && u.indexOf('project_id=in.') !== -1)
      return { ok: true, json: async () => CONTRACTS };
    if(u.indexOf('/rest/v1/projects') !== -1)
      return { ok: true, json: async () => PROJECTS };
    if(u.indexOf('/rest/v1/collections') !== -1)
      return { ok: true, json: async () => COLLECTIONS };
    if(u.indexOf('/rest/v1/payment_reminders') !== -1)
      return { ok: true, json: async () => REMLOG.slice().sort((a,b) => (a.sent_at < b.sent_at ? 1 : -1)) };
    return { ok: true, json: async () => ([]), text: async () => '' };
  };
}

function setEnv(){
  process.env.CRON_SECRET = 'testsecret';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk-test';
  process.env.TWILIO_ACCOUNT_SID = 'ACtest';
  process.env.TWILIO_AUTH_TOKEN = 'toktest';
  process.env.TWILIO_FROM = '+19375550100';
  delete process.env.TWILIO_MESSAGING_SERVICE_SID;
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
}

async function call(handler, { auth, query } = {}){
  let code = 0, out = null;
  const res = { status(c){ code = c; return this; }, json(v){ out = v; return this; }, send(v){ out = v; return this; } };
  await handler({ method: 'GET', headers: auth === undefined ? {} : { authorization: auth }, query: query || {} }, res);
  return { code, out };
}

(async function(){
  installFetch(); setEnv();
  let handler;
  try{ handler = (await import('file://' + ROUTE)).default; }
  catch(e){ ok(false, 'api/remind.js imports — ' + (e.message || e)); console.log('\nRED'); process.exit(1); }

  /* 1 ── the door is fail-closed */
  const noSecret = process.env.CRON_SECRET; delete process.env.CRON_SECRET;
  let r = await call(handler, { auth: 'Bearer whatever' });
  ok(r.code === 401 && sent.length === 0, 'CRON_SECRET unset → 401, nothing sent (fail-closed)');
  process.env.CRON_SECRET = noSecret;
  r = await call(handler, {});
  ok(r.code === 401 && sent.length === 0, 'no Authorization header → 401');
  r = await call(handler, { auth: 'Bearer wrong' });
  ok(r.code === 401 && sent.length === 0, 'wrong secret → 401');

  /* 2 ── dry run: reports, never texts */
  installFetch();
  r = await call(handler, { auth: 'Bearer testsecret', query: { dry: '1' } });
  ok(r.code === 200 && r.out && r.out.ok === true && r.out.dry === true, 'dry run answers 200 ok');
  ok(sent.length === 0 && logged.length === 0, 'dry run sends nothing and logs nothing');
  ok(r.out.checked === ALL.length, 'dry run checked all ' + ALL.length + ' invoiced jobs (' + r.out.checked + ')');
  const wt = (r.out.would_text || []).map(x => x.project_id).sort().join(',');
  ok(wt === 'P_OK,P_OPTOUT,P_PROC', 'dry eligibility = P_OK, P_OPTOUT, P_PROC (Stripe is asked at send time) — got ' + wt);

  /* 3 ── the real run: who got texted, who got skipped */
  installFetch();
  r = await call(handler, { auth: 'Bearer testsecret' });
  ok(r.code === 200 && r.out && r.out.ok === true, 'live run answers 200 ok');
  const tos = sent.map(s => s.to).sort().join(',');
  ok(tos === '+19375550101,+19375550113', 'ONLY P_OK and P_OPTOUT are dialed — got ' + tos);
  ok(r.out.sent === 1, 'summary says 1 delivered (P_OPTOUT failed 21610) — got ' + r.out.sent);
  const sk = r.out.skipped || {};
  ok(sk.not_retail === 2, 'community + insurance both skipped as not_retail (' + sk.not_retail + ')');
  ok(sk.muted === 1, 'muted job skipped (' + sk.muted + ')');
  ok(sk.paid === 1, 'paid-in-full job skipped (' + sk.paid + ')');
  ok(sk.recent_payment === 1, 'a payment 1 day old pauses reminding (' + sk.recent_payment + ')');
  ok(sk.too_soon === 2, 'sent-1d-ago and reminded-2d-ago both wait (' + sk.too_soon + ')');
  ok(sk.capped === 1, '4 delivered reminders caps the job (' + sk.capped + ')');
  ok(sk.no_phone === 1 && sk.no_token === 1, 'no-phone and no-token skipped (' + sk.no_phone + '/' + sk.no_token + ')');
  ok(sk.processing === 1, 'the in-flight ACH job is skipped after asking Stripe (' + sk.processing + ')');
  ok(stripeAsked.length === 3, 'Stripe is asked once per otherwise-eligible job (' + stripeAsked.length + ')');

  /* 4 ── the message itself */
  const msg = sent.find(s => s.to === '+19375550101');
  ok(!!msg, 'P_OK got a text');
  ok(/^Hi Alder, it’s Cardinal Roofing & Renovations — a friendly reminder that your invoice has a balance of \$4,600\.00\./.test(msg.body),
     'the approved copy opens with the first name and the exact-cents balance — ' + JSON.stringify(msg.body.slice(0, 90)));
  ok(msg.body.indexOf('https://app.cardinalroster.com/api/share?t=tok-P_OK') !== -1, 'AND THE PAY LINK IS IN THE TEXT');
  ok(msg.body.indexOf('bank transfer or card') !== -1, 'bank transfer is named before card (the fee steer)');
  ok(msg.body.indexOf('call or text us back') !== -1, 'the reply invitation is present');
  ok(msg.body.length <= 320, 'message stays within 2 SMS segments (' + msg.body.length + ' chars)');
  ok(msg.from === '+19375550100', 'sent from the company number (TWILIO_FROM fallback path)');

  /* 5 ── the log and the STOP auto-mute */
  ok(logged.length === 2, 'both attempts are logged (' + logged.length + ')');
  const lOK = logged.find(l => l.project_id === 'P_OK'), lNO = logged.find(l => l.project_id === 'P_OPTOUT');
  ok(lOK && lOK.ok === true && lOK.report_id === 'doc-P_OK' && lOK.channel === 'sms', 'the delivered send logs ok:true with its report');
  ok(lNO && lNO.ok === false && /21610/.test(lNO.detail || ''), 'the STOP reply logs ok:false with the 21610 detail');
  ok(patched.length === 1 && /P_OPTOUT/.test(patched[0].url) && patched[0].body.reminders_muted === true,
     'a STOP reply auto-mutes the job so it is never attempted again');

  /* 6 ── sms unconfigured: reports instead of crashing */
  installFetch();
  delete process.env.TWILIO_ACCOUNT_SID;
  r = await call(handler, { auth: 'Bearer testsecret' });
  ok(r.code === 200 && r.out && r.out.ok === false && r.out.reason === 'sms_not_configured' && sent.length === 0,
     'missing Twilio keys → sms_not_configured, nothing dialed');
  setEnv();

  /* 7 ── the master switch (1157): off means off, missing means off */
  installFetch(); ENABLED = false;
  r = await call(handler, { auth: 'Bearer testsecret' });
  ok(r.code === 200 && r.out && r.out.ok === true && r.out.enabled === false && r.out.reason === 'disabled',
     'switch OFF → the live run answers disabled');
  ok(sent.length === 0 && logged.length === 0 && stripeAsked.length === 0, 'and dials, logs and asks NOTHING');
  installFetch();
  r = await call(handler, { auth: 'Bearer testsecret', query: { dry: '1' } });
  ok(r.out && r.out.enabled === false && (r.out.would_text || []).length === 3,
     'a dry run still previews eligibility while OFF (' + ((r.out||{}).would_text || []).length + ') — the preview works before the switch is ever flipped');
  ok(sent.length === 0, 'and still texts nobody');
  installFetch(); ENABLED = null;
  r = await call(handler, { auth: 'Bearer testsecret' });
  ok(r.out && r.out.enabled === false && sent.length === 0, 'a MISSING settings row reads as OFF — the feature ships dark');
  ENABLED = true;

  /* ── MUTATION CONTROLS: strip a guard, expect the leak to show ───────── */
  async function mutate(name, from, to, leakTest){
    const mSrc = routeSrc.replace(from, to);
    if(mSrc === routeSrc){ ok(false, 'control "' + name + '" — mutation did not apply (anchor drifted)'); return; }
    const mPath = path.join(os.tmpdir(), 'remind_mut_' + name + '_' + Date.now() + '.mjs');
    fs.writeFileSync(mPath, mSrc);
    const mh = (await import('file://' + mPath)).default;
    installFetch(); setEnv();
    const rr = await call(mh, { auth: name === 'auth' ? 'Bearer wrong' : 'Bearer testsecret' });
    ok(leakTest(rr), 'CONTROL fires: without the ' + name + ' guard the leak is visible');
    fs.unlinkSync(mPath);
  }
  await mutate('retail',
    "if (crmTypeOf(p) !== 'retail') { skipped.not_retail++; continue; }", '',
    () => sent.some(s => s.to === '+19375550102' || s.to === '+19375550103'));
  await mutate('cap',
    "if (okSends.length >= MAX_OK || lg.length >= MAX_ATTEMPTS) { skipped.capped++; continue; }", '',
    () => sent.some(s => s.to === '+19375550108'));
  ENABLED = false;
  await mutate('master',
    "if (!enabled && !dry) { res.status(200).json({ ok: true, enabled: false, reason: 'disabled', checked: 0, eligible: 0, sent: 0, skipped: skipped }); return; }", '',
    () => sent.length > 0);
  ENABLED = true;
  await mutate('auth',
    "if (auth !== 'Bearer ' + secret) { res.status(401).json({ ok: false, error: 'Unauthorized' }); return; }", '',
    (rr) => rr.code === 200 && sent.length > 0);

  const FLOOR = 38;
  ok(checks >= FLOOR, 'coverage floor: ' + checks + ' checks ran (>= ' + FLOOR + ')');
  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' of ' + checks + ' failed')
                    : ('\nGREEN — all ' + checks + ' Build 1156 route assertions passed'));
  process.exit(fails ? 1 : 0);
})();
