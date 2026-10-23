"""Build 1406 — roles, search and the Community bid path (23 Oct 2026 audit, round 10).
1. api/abc.js checked only for a session: with public signup on, any self-registered account could read Cardinal's
   ABC account pricing, accounts, branches and order history lists. It now requires Cardinal staff (isStaff, the
   check 1016 put on 13 other routes) before any action.
2. Crews was offered to sales reps (an empty list and a live "+ New crew") though only full access can read or
   write it (crews_schema RLS): the menu row is hidden and open() refuses for anyone but admin / production.
3. A Community job with NO funding partner attached defaulted the bid email to the occupant; a partner with no
   contact email still defaulted to the occupant too. The first refuses ("attach the funding partner first"); the
   second leaves the address blank.
4. Search could not find O’Brien typed with a phone's curly apostrophe (or "obrien"), José as "jose", a phone
   number typed with its leading 1 / +1, or "PO 3001". One fold (crFold / crSearchQ) is applied to every search
   haystack and query: header search, Home, Leads & Jobs, the client directory, the client lens and Insurance
   Clients.
5. Community Partners: the directory and the header search now put Habitat first; the header search labelled
   every non-nonprofit partner "Property manager" (general contractors included)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
A = sys.argv[2] if len(sys.argv) > 2 else 'api/abc.js'
s = open(P, encoding='utf-8').read(); a = open(A, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)

# 1
a = one(a, """  if (!email) { res.status(401).json({ error: 'Invalid session' }); return false; }
  if (!FULL_ONLY.has(action)) return true;               // any signed-in staff""",
"""  if (!email) { res.status(401).json({ error: 'Invalid session' }); return false; }
  /* 1406: a session is not staff — public signup is on, so a self-registered account reached Cardinal's
     ABC pricing. The same check 1016 put on the AI routes and senddoc. */
  if (!isStaff(email)) { res.status(403).json({ error: 'Cardinal staff only' }); return false; }
  if (!FULL_ONLY.has(action)) return true;               // any signed-in staff""")
a = one(a, "/* Hardcoded full-access set, same as is_full_access() in SQL", "import { isStaff } from './_staff.js';   // 1406\n\n/* Hardcoded full-access set, same as is_full_access() in SQL")

# 2
s = one(s, """hideOpt('ownerreview');   /* 1322: admins only */
hideOpt('laborrates');""",
"""hideOpt('ownerreview');   /* 1322: admins only */
hideOpt('laborrates');
/* 1406: Crews is full-access in the database (theo, joan, curtis) — a rep saw an empty list and a dead "+ New crew" */
if(!(typeof isProductionUser === 'function' && isProductionUser() && !(typeof isFieldUser === 'function' && isFieldUser()))) hideOpt('crews');""")
s = one(s, """async function open(){
  var v = view();
  if(!v) return;
  /* 570: every other full-screen opener in this app clears the decks first —""",
"""async function open(){
  var v = view();
  if(!v) return;
  /* 1406: the crew tables are full access only — anyone else is refused here, not shown an empty, dead screen */
  try{
    var _adm = typeof window.isAdminUser === 'function' ? window.isAdminUser() : (typeof isAdminUser === 'function' && isAdminUser());
    var _prd = typeof window.isProductionUser === 'function' ? window.isProductionUser() : (typeof isProductionUser === 'function' && isProductionUser());
    var _fld = typeof window.isFieldUser === 'function' && window.isFieldUser();
    if(!_adm && !(_prd && !_fld)){ if(typeof window.crTell === 'function') window.crTell('Crews are managed by the office and Production.'); return; }
  }catch(_cg){}
  /* 570: every other full-screen opener in this app clears the decks first —""")

# 3
s = one(s, """        if(_pid && !_own){
          crTell('Bids to ' + _pnm + ' are sent by Theo \\u2014 their address is not shared.\\n\\n' +
                'Save the bid and let him know it is ready.');
          return;
        }""",
"""        if(_pid && !_own){
          crTell('Bids to ' + _pnm + ' are sent by Theo \\u2014 their address is not shared.\\n\\n' +
                'Save the bid and let him know it is ready.');
          return;
        }
        /* 1406: no partner attached — the default was the OCCUPANT's address. A Community bid goes to the funder. */
        if(!_pid){
          crTell('This Community job has no funding partner attached. Attach the partner on the job first \\u2014 the bid goes to them, not the homeowner.');
          return;
        }
        toDflt = '';   /* 1406: never the occupant, even when the partner has no address on file */""")

# 4 — one fold for every search
s = one(s, """function phoneForms(v){""",
"""/* 1406: one fold for every search box — lower case, accents off (José → jose), apostrophes off (a phone types
   O’Brien with a curly one; "obrien" finds it too). crSearchQ also reads a phone number typed with its leading
   1 / +1 as its ten digits, and "PO 3001" as 3001. */
function crFold(v){
  return String(v == null ? '' : v).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[\\u2018\\u2019\\u02bc'`]/g, '');
}
function crSearchQ(v){
  var raw = String(v == null ? '' : v).trim();
  if(/^[\\d\\s().+\\-]+$/.test(raw)){
    var dg = raw.replace(/\\D/g, '');
    if(dg.length === 11 && dg.charAt(0) === '1') return dg.slice(1);
    if(dg.length === 10) return dg;
  }
  var po = /^p\\.?\\s*o\\.?\\s*#?\\s*(\\d+)$/i.exec(raw);
  if(po) return po[1];
  return crFold(raw);
}
window.crFold = crFold; window.crSearchQ = crSearchQ;
function phoneForms(v){""")
s = one(s, """  var q = searchText.trim().toLowerCase();
  var _base = q ? cacheProjects : boardProjects();
  var projs = _base.filter(function(pr){
    if(!q) return ['Closed','Lost'].indexOf(normStage(pr.stage)) === -1; /* archived/lost: off the board */
    var hay = [pr.name, pr.address, pr.phone, phoneHay(pr), pr.email, poOf(pr) ? '#' + poOf(pr) + ' ' + poOf(pr) : ''].join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;""",
"""  var q = searchText.trim() ? crSearchQ(searchText) : '';   /* 1406 */
  var _base = q ? cacheProjects : boardProjects();
  var projs = _base.filter(function(pr){
    if(!q) return ['Closed','Lost'].indexOf(normStage(pr.stage)) === -1; /* archived/lost: off the board */
    var hay = crFold([pr.name, pr.address, pr.phone, phoneHay(pr), pr.email, poOf(pr) ? '#' + poOf(pr) + ' ' + poOf(pr) : ''].join(' '));
    return hay.indexOf(q) !== -1;""")
s = one(s, """  var q = document.getElementById('ljSearch').value.trim().toLowerCase();
  if(q){
    var ck = parseCkAll(p);
    var hay = [p.name, p.address, p.phone, phoneHay(p), p.email, ck.po ? '#'+ck.po : ''].join(' ').toLowerCase();""",
"""  var q = document.getElementById('ljSearch').value.trim();
  q = q ? crSearchQ(q) : '';   /* 1406 */
  if(q){
    var ck = parseCkAll(p);
    var hay = crFold([p.name, p.address, p.phone, phoneHay(p), p.email, ck.po ? '#'+ck.po+' '+ck.po : ''].join(' '));""")
s = one(s, """  return [pr.name, pr.address, pr.phone, phoneHay(pr), pr.email, pr.created_by,
    poOf(pr) ? '#' + poOf(pr) + ' ' + poOf(pr) : ''].join(' ').toLowerCase();""",
"""  return crFold([pr.name, pr.address, pr.phone, phoneHay(pr), pr.email, pr.created_by,
    poOf(pr) ? '#' + poOf(pr) + ' ' + poOf(pr) : ''].join(' '));   /* 1406: folded */""")
s = one(s, """  var q = (document.getElementById('cliFilter').value || '').trim().toLowerCase();
  if(q && crClientHay(pr).indexOf(q) === -1) return false;""",
"""  var q = (document.getElementById('cliFilter').value || '').trim();
  q = q ? crSearchQ(q) : '';   /* 1406 */
  if(q && crClientHay(pr).indexOf(q) === -1) return false;""")
s = one(s, """function crHsMatches(q){
  q = String(q || '').trim().toLowerCase();
  if(q.length < 2) return { hits: [], total: 0 };""",
"""function crHsMatches(q){
  q = String(q || '').trim();
  if(q.length < 2) return { hits: [], total: 0 };
  q = crSearchQ(q);   /* 1406 */""")
s = one(s, """  var q = (filterInput && filterInput.value || '').trim().toLowerCase();
  var list = insClients.slice().sort(""",
"""  var q = (filterInput && filterInput.value || '').trim();
  q = q ? crSearchQ(q) : '';   /* 1406 */
  var list = insClients.slice().sort(""")
s = one(s, """    var hay = crClientHay(pr) + ' ' +
      [I.carrier, I.claim_number, I.policy_number, adj.name, adj.phone]
        .join(' ').toLowerCase();""",
"""    var hay = crClientHay(pr) + ' ' +
      crFold([I.carrier, I.claim_number, I.policy_number, adj.name, adj.phone].join(' '));   /* 1406 */""")
# header search
s = one(s, """function search(q){
q = String(q || '').toLowerCase().trim();
if(!q) return { clients:[], docs:[], partners:[] };""",
"""function search(q){
q = String(q || '').trim();
if(!q) return { clients:[], docs:[], partners:[] };
var _fold = window.crFold || function(x){ return String(x || '').toLowerCase(); };   /* 1406 */
q = window.crSearchQ ? window.crSearchQ(q) : q.toLowerCase();""")
s = one(s, """((p.location && p.location.street) || '')).toLowerCase();
if(s.indexOf(q) !== -1){""",
"""((p.location && p.location.street) || ''));
s = _fold(s);   /* 1406 */
if(s.indexOf(q) !== -1){""")
s = one(s, """if(String(r.title || '').toLowerCase().indexOf(q) !== -1){
docs.push(""", """if(_fold(r.title).indexOf(q) !== -1){
docs.push(""")
s = one(s, """all.forEach(function(p){
if(String(p.name || '').toLowerCase().indexOf(q) !== -1){
partners.push(p);
}
});
partners = partners.slice(0, 5);""",
"""all.forEach(function(p){
if(_fold(p.name).indexOf(q) !== -1){
partners.push(p);
}
});
/* 1406: Habitat sorts first in every partner list */
partners.sort(function(a, b){ var ha = /habitat/i.test(a.name || ''), hb = /habitat/i.test(b.name || ''); return ha === hb ? 0 : (ha ? -1 : 1); });
partners = partners.slice(0, 5);""")
s = one(s, """var hay = ((it.title || '') + ' ' + ((pr && pr.name) || '')).toLowerCase();
if(hay.indexOf(q) !== -1){
punch.push(""", """var hay = _fold((it.title || '') + ' ' + ((pr && pr.name) || ''));
if(hay.indexOf(q) !== -1){
punch.push(""")
# 5
s = one(s, """'<div class="m">' + esc(p.partner_type === 'nonprofit' ? 'Non-profit' : 'Property manager') + '</div>' +""",
"""'<div class="m">' + esc(p.partner_type === 'nonprofit' ? 'Non-profit' : (p.partner_type === 'general_contractor' ? 'General contractor' : 'Property manager')) + '</div>' +   /* 1406 */""")
s = one(s, """function renderDirectory(host){
/* Prospects are shown by openProspects(), not here. */
var listRows = list().filter(function(p){ return !p.prospective; });""",
"""function renderDirectory(host){
/* Prospects are shown by openProspects(), not here. */
var listRows = list().filter(function(p){ return !p.prospective; });
/* 1406: Habitat sorts first in every partner list (stable — the rest keep their order) */
listRows = listRows.map(function(p, i){ return { p:p, i:i }; }).sort(function(x, y){
var hx = /habitat/i.test(x.p.name || ''), hy = /habitat/i.test(y.p.name || '');
return hx === hy ? x.i - y.i : (hx ? -1 : 1); }).map(function(x){ return x.p; });""")

s = one(s, ">v2026-10-23 build 1405<", ">v2026-10-23 build 1406<")
s = one(s, """  { b: 1405, d:'2026-10-23',""",
"""  { b: 1406, d:'2026-10-23', t:'Search, Crews and Community bids', s:'Search now finds names typed without accents or with a phone\\u2019s curly apostrophe (O\\u2019Brien, Jose), phone numbers typed with a leading 1, and \\u201cPO 3001\\u201d. Crews is shown only to the office and Production, who can use it. A Community bid on a job with no funding partner attached is refused instead of defaulting to the homeowner. Habitat is first in the partner directory, and general contractors are labelled correctly in search. Behind the scenes, the ABC Supply connection now answers Cardinal staff only.' },
  { b: 1405, d:'2026-10-23',""")
pl.write_atomic(P, s); pl.write_atomic(A, a)
print('ok 1406')
