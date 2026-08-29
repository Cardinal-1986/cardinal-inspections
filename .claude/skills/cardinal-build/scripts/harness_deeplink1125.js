/* harness_deeplink1125.js — Build 1125: a punch-out alert carries a link that
   opens the punch-out.

   Curtis (project manager), via Theo: a punch-out text should be tappable and
   land on the punch-out instead of leaving you to hunt for it.

   This drives the SHIPPED /api/notify handler — imported, not re-implemented —
   with fetch stubbed, and reads the ACTUAL Twilio form body. That is the only
   way to prove the thing that matters: the link is IN THE TEXT MESSAGE. An SMS
   has no hyperlink, so a url that rides only in the JSON is a url nobody can
   tap, and every gate would still be green.

   It also holds the two things that would quietly ruin it:
     · a caller-supplied ABSOLUTE url must be refused — this string is sent to a
       phone, so accepting one makes the route a link-relay;
     · the 320-char cap must never truncate the link itself.

   Negative control: build 1124 sends url:'/' from every call site and never
   puts it in the SMS → RED.
   Usage: node harness_deeplink1125.js [repo-root] */
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || path.resolve(__dirname, '../../../..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const notifySrc = fs.readFileSync(path.join(ROOT, 'api/notify.js'), 'utf8');
let fails = 0, checks = 0;
function ok(c, m){ checks++; console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }

/* ── the artifact: is a link even being sent? ─────────────────────────── */
if(!/function punchLink\(/.test(html)){
  console.log('  ✗ FAIL punchLink() is absent (negative control)');
  console.log('\nRED — Build 1125 deep-link code absent');
  process.exit(1);
}
ok(/function punchLink\(pid\)\{ return pid \? \('#p\/' \+ encodeURIComponent\(pid\) \+ '\/punch'\) : '\/'; \}/.test(html),
   'punchLink() builds #p/<id>/punch, the route the hash router already knows');
ok(/if\(\(m = \/\^#p\\\/\(\[\^\\\/\]\+\)\(\?:\\\/\(\[a-z\]\+\)\)\?\$\/\.exec\(h\)\)\) st = \{ v:'project'/.test(html) ||
   /#p\\\/\(\[\^\\\/\]\+\)\(\?:\\\/\(\[a-z\]\+\)\)\?/.test(html),
   'and that route is the one __tryRestoreFromHash parses (id + tab)');

ok(/function notifyTeam\(to, subject, bodyHtml, url\)\{/.test(html),
   'notifyTeam takes an optional url');
ok(/url: \(url \|\| '\/'\)/.test(html),
   "and forwards it, defaulting to '/' so the other call sites are untouched");

/* every punch-out notification must carry one — six of them */
const calls = (html.match(/punchLink\(/g) || []).length;
ok(calls === 7, 'all six punch-out notifications pass punchLink() (' + (calls - 1) + ' calls + the definition)');
for (const [label, re] of [
  ['filed / assigned (production board)', /'<p>' \+ esc\(title\) \+ '<\/p>',\s*\n\s*punchLink\(pid\)\)/],
  ['nobody assigned → production',        /esc\(title\) \+ '<\/p>',\s*\n\s*punchLink\(pid\)\)/],
  ['extra scope flagged',                 /Filed against the punch-out[\s\S]{0,80}punchLink\(it\.project_id\)\)/],
  ['a comment that tags you',             /esc\(text\) \+ '<\/p>',\s*\n\s*punchLink\(it\.project_id\)\)/],
  ['assigned, from the punch card',       /fmtSchedule[\s\S]{0,90}punchLink\(it\.project_id\)\)/],
  ['closed → the office',                 /steps\.<\/p>',\s*\n\s*punchLink\(it\.project_id\)\)/]
]) ok(re.test(html), '  · ' + label);

/* ── the route: is the link in the TEXT? ─────────────────────────────── */
ok(/var _tail = absUrl \? \('\\n' \+ absUrl\) : '';/.test(notifySrc),
   'notify.js appends the link after the message is trimmed, not inside the slice');

(async function(){
  const sent = [];   /* every outbound request the handler makes */
  const realFetch = globalThis.fetch;
  globalThis.fetch = async function(url, opts){
    const u = String(url);
    sent.push({ url:u, opts:opts || {} });
    if(u.indexOf('/auth/v1/user') !== -1)
      return { ok:true, json: async () => ({ email:'theo@cardinalrenovations.net' }) };
    if(u.indexOf('push_subs') !== -1)  return { ok:true, json: async () => [] };
    if(u.indexOf('team_profiles') !== -1)
      return { ok:true, json: async () => [{ email:'curtis@cardinalrenovations.net', phone:'937-555-0142' }] };
    if(u.indexOf('api.twilio.com') !== -1) return { ok:true, json: async () => ({ sid:'SM1' }) };
    return { ok:true, json: async () => ({}), text: async () => '' };
  };
  process.env.TWILIO_ACCOUNT_SID = 'ACtest';
  process.env.TWILIO_AUTH_TOKEN  = 'toktest';
  process.env.TWILIO_FROM        = '+19375550100';
  /* ⚠ The route needs both of these or it returns 500 and sends NOTHING —
     no push, no email, no SMS. That is the route's own behaviour, not the
     harness's: webpush is required before any channel runs, and a missing
     VAPID_PRIVATE_KEY short-circuits the same way. `web-push` is in
     api/package.json (Vercel installs it); locally, run
         npm install --no-save web-push
     if this gate reports "push library unavailable". */
  process.env.VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'x'.repeat(43);

  let handler;
  try{
    const mod = await import('file://' + path.join(ROOT, 'api/notify.js'));
    handler = mod.default;
  }catch(e){
    ok(false, 'api/notify.js imports — ' + (e.message || e) +
       '  (run: npm install --no-save web-push)');
    console.log('\nRED — could not load the route');
    process.exit(1);
  }

  async function call(body){
    sent.length = 0;
    let out = null;
    const res = { status(){ return this; }, json(v){ out = v; return this; } };
    await handler({ method:'POST', headers:{ authorization:'Bearer tok',
      host:'app.cardinalroster.com' }, body }, res);
    const tw = sent.find(x => x.url.indexOf('api.twilio.com') !== -1);
    const form = tw ? new URLSearchParams(tw.opts.body) : null;
    return { out, sms: form ? form.get('Body') : null };
  }

  /* 1. the real thing */
  const a = await call({ emails:['curtis@cardinalrenovations.net'],
    title:'New punch-out: 4" too long',
    body:'Theo Dorion filed a punch-out at Jarrett Chenalt: 4" too long',
    url:'#p/abc-123/punch' });
  ok(a.sms != null, 'a text is sent');
  ok(a.sms && a.sms.indexOf('https://app.cardinalroster.com/#p/abc-123/punch') !== -1,
     'AND THE LINK IS IN THE TEXT — ' + JSON.stringify(a.sms));
  ok(a.sms && /New punch-out/.test(a.sms), 'the message itself still reads as before');
  ok(a.out && a.out.texted === 1, 'the route reports it sent (' + (a.out && a.out.texted) + ')');

  /* 2. a caller-supplied absolute url must NOT become a link we send */
  const b = await call({ emails:['curtis@cardinalrenovations.net'], title:'Hi', body:'x',
    url:'https://evil.example.com/phish' });
  ok(b.sms && b.sms.indexOf('evil.example.com') === -1,
     'an ABSOLUTE url from the caller is refused, not texted — ' + JSON.stringify(b.sms));
  const c = await call({ emails:['curtis@cardinalrenovations.net'], title:'Hi', body:'x',
    url:'//evil.example.com/phish' });
  ok(c.sms && c.sms.indexOf('evil.example.com') === -1,
     'and so is a protocol-relative one');

  /* 3. the cap must never eat the link */
  const long = 'x'.repeat(600);
  const d = await call({ emails:['curtis@cardinalrenovations.net'],
    title:'New punch-out', body:long, url:'#p/abc-123/punch' });
  ok(d.sms && d.sms.indexOf('https://app.cardinalroster.com/#p/abc-123/punch') !== -1,
     'a very long punch-out title cannot truncate the link (' + (d.sms || '').length + ' chars)');
  ok(d.sms && d.sms.length <= 320, 'and the message still respects the 320 cap');

  /* 4. the old callers are untouched */
  const e = await call({ emails:['curtis@cardinalrenovations.net'], title:'Cardinal test alert', body:'hello' });
  ok(e.sms === 'Cardinal test alert: hello',
     'a caller that sends no url gets exactly the old text — ' + JSON.stringify(e.sms));

  globalThis.fetch = realFetch;

  const FLOOR = 18;
  ok(checks >= FLOOR, 'coverage floor: ' + checks + ' checks ran (>= ' + FLOOR + ')');
  console.log(fails ? ('\nRED — ' + fails + ' of ' + checks + ' failed')
                    : ('\nGREEN — all ' + checks + ' Build 1125 assertions passed'));
  process.exit(fails ? 1 : 0);
})();
