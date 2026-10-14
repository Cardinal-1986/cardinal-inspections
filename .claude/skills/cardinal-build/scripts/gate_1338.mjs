// gate_1338 — audit W8 + R8.
//   W8: api/sms-link.js texts only Cardinal's own pay link (/api/share?t=…), rebuilt from its parts.
//   R8: an insurance job waiting on the carrier is not homeowner-overdue, gets no Remind, and is
//       not in the overdue total; a Closed claim's deductible is not "due".
// node gate_1338.mjs [index.html] [api/sms-link.js]   (point at 1337 for the negative control)
import fs from 'node:fs';
const root = new URL('../../../../', import.meta.url);
const html = fs.readFileSync(process.argv[2] || new URL('index.html', root), 'utf8');
const sms = fs.readFileSync(process.argv[3] || new URL('api/sms-link.js', root), 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };

console.log('A · W8 — the company text sends only our pay link');
let own = null;
const a = sms.indexOf('const OWN_HOSTS');
const b = sms.indexOf('export default async function handler');
if (a > 0 && b > a) { try { own = new Function(sms.slice(a, b).replace('export function', 'function') + '\nreturn ownPayLink;')(); } catch (e) { ok(false, 'ownPayLink parses', e.message); } }
ok(!!own, 'ownPayLink() exists');
ok(/url = ownPayLink\(url, req\);\s*\n\s*if\(!url\)/.test(sms), 'the handler routes the posted url through it and refuses an empty answer');
if (own) {
  const req = { headers: { host: 'cardinal-preview.vercel.app' } };
  const T = 'abcDEF123_-xyz';
  ok(own('https://app.cardinalroster.com/api/share?t=' + T, req) === 'https://app.cardinalroster.com/api/share?t=' + T, 'production pay link passes unchanged');
  ok(own('https://cardinal-preview.vercel.app/api/share?t=' + T, req) !== '', 'this deployment\'s own host passes (previews keep working)');
  ok(own('https://evil.example.com/api/share?t=' + T, req) === '', 'a foreign host is refused');
  ok(own('https://app.cardinalroster.com/login?t=' + T, req) === '', 'another path on our host is refused');
  ok(own('http://app.cardinalroster.com/api/share?t=' + T, req) === '', 'plain http is refused');
  ok(own('https://app.cardinalroster.com/api/share?t=<script>', req) === '', 'a token with junk in it is refused');
  ok(own('https://u:p@app.cardinalroster.com/api/share?t=' + T, req) === '', 'credentials in the URL are refused');
  const extra = own('https://app.cardinalroster.com/api/share?t=' + T + '&next=https://evil.example.com', req);
  ok(extra === 'https://app.cardinalroster.com/api/share?t=' + T, 'extra query params are dropped, not texted', extra);
}

console.log('B · R8 — carrier money in A/R');
const ar = html.slice(html.indexOf('<script id="cr-ar-script">'));
const ri = ar.indexOf('function rowHtml(x){');
let rowHtml = null;
if (ri > 0) {
  const re = ar.indexOf('\n  function render(){', ri);
  const IC = "var IC_CASH='',IC_SMS='',IC_LINK='',IC_MAIL='',IC_MORE='';";
  const stubs = "var esc2=function(s){return String(s)};var money=function(n){return '$'+n};var pill=function(){return ''};var shortDate=function(){return 'Oct 1'};";
  try { rowHtml = new Function(IC + stubs + ar.slice(ri, re) + '\nreturn rowHtml;')(); } catch (e) { ok(false, 'rowHtml parses', e.message); }
}
if (rowHtml) {
  const inv = { status: 'sent', sent_at: '2026-09-01' };
  const fin = { balance: 4000, paid: 0, value: 4000 };
  const home = rowHtml({ pr: { id: 'p1', name: 'H' }, inv, fin, st: {}, age: 45 });
  const carr = rowHtml({ pr: { id: 'p2', name: 'C' }, inv, fin, st: {}, age: 45, carrier: true });
  ok(/crar-row od/.test(home) && /data-artext="p1">Remind/.test(home), 'control: a 45-day homeowner balance is overdue with Remind');
  ok(!/crar-row od/.test(carr) && !/crar-age od/.test(carr), 'a 45-day carrier balance is NOT painted overdue');
  ok(!/data-artext/.test(carr), 'a carrier row offers no text to the homeowner (no Remind, no Text link)');
  ok(/data-aropen="p2"/.test(carr) && (carr.match(/data-aropen/g) || []).length === 1, 'its main button opens the job, once');
  ok(/Waiting on the carrier/.test(carr), 'the row says it is waiting on the carrier');
}
ok(/var carrier = s === 'Invoiced' && \(typeof projClaimType === 'function'\) && projClaimType\(pr\) === 'insurance';/.test(ar), 'arList tags only insurance jobs at Invoiced');
ok(/if\(x\.age > 30 && !x\.carrier\)\{ overdue \+= x\.fin\.balance/.test(ar), 'the overdue total leaves carrier money out');
ok(/\(x\.carrier \? carrierRows : buckets\[bucketOf\(x\.age\)\]\)\.push\(x\)/.test(ar) && /<b>Waiting on the carrier<\/b>/.test(ar), 'carrier rows get their own group, not an aging bucket');

console.log('C · R8 — claims hub deductibles');
ok(/if\(st !== 'Closed' && !c\.deductible_waived && Number\(c\.deductible\) > 0\)\{/.test(html), 'a Closed claim no longer counts toward deductibles due');
ok(/>v2026-10-\d\d build (\d+)<button/.test(html) && Number(html.match(/>v2026-10-\d\d build (\d+)<button/)[1]) >= 1338, 'app stamp is 1338 or later');

console.log(fail ? 'RED — gate_1338: ' + fail + ' fail' : 'GREEN — gate_1338: all pass');
process.exit(fail ? 1 : 0);
