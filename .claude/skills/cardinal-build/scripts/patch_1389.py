"""Build 1389 — "→ Contract" makes the trade's Construction Agreement (the 22 Oct estimate-to-payment run;
Theo: "All 3"). generate() in cr-e2c always used CONTRACT_TEMPLATE, the generic SERVICE CONTRACT: no
Project Specifications, no signature slots of its own, no Right to Cancel — and it was titled
"Contract — <client>" with no trade. Now it reads the trade off the estimate (title, sections, line
names and descriptions) and the job's trades: one trade → that agreement (CONTRACT_TYPES, the same three
the client page's + New contract offers); none or several → the shared question sheet asks Roofing /
Siding / Gutters / General service contract. The estimate's scope goes into the agreement's Notes box,
the price and deposit through the same fillContractMoney() every contract uses, and the title is
"Contract — <Trade> — <client>" so the Trade column can read it. The general service contract is still
there, by choice, and still says it carries no Notice of Cancellation (1388)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""async function generate(est, project){
var missing = [];
if(typeof window.CONTRACT_TEMPLATE !== 'string') missing.push('CONTRACT_TEMPLATE');""",
"""/* 1389: which agreement. One trade on the estimate or the job -> that trade's Construction Agreement;
   none or several -> ask. 'service' is the general SERVICE CONTRACT, kept as a deliberate choice. */
var TRADE_RE = { roof: /\\b(roof|roofing|shingles?|tear[- ]?off|ridge|underlayment|ice\\s*&?\\s*water|decking|starter)\\b/i,
                 siding: /\\b(siding|soffit|fascia|hardie|vinyl|lap siding|house ?wrap)\\b/i,
                 gutters: /\\b(gutters?|downspouts?|leaf ?guard)\\b/i };
function tradesOf(est, project){
var txt = [est.title, est.notes].concat((Array.isArray(est.line_items) ? est.line_items : []).map(function(l){
return [l && l.name, l && l.description, l && l.sec].join(' ');
})).join(' ');
var found = {};
Object.keys(TRADE_RE).forEach(function(k){ if(TRADE_RE[k].test(txt)) found[k] = 1; });
if(!Object.keys(found).length){
try{
var ck = typeof window.parseCkAll === 'function' ? window.parseCkAll(project) : {};
[].concat(ck.trades || [], ck.trade ? [ck.trade] : [], ck.work_type ? [ck.work_type] : []).forEach(function(t){
Object.keys(TRADE_RE).forEach(function(k){ if(TRADE_RE[k].test(String(t || ''))) found[k] = 1; });
});
}catch(_){}
}
return Object.keys(found);
}
async function pickAgreement(est, project){
var types = window.CONTRACT_TYPES || {};
var hits = tradesOf(est, project).filter(function(k){ return types[k]; });
if(hits.length === 1) return hits[0];
if(typeof window.crAsk !== 'function') return hits[0] || 'roof';
var choice = await window.crAsk('Which agreement is this?\\n\\n' +
(hits.length ? 'This estimate covers more than one trade. Pick the agreement to sign; make a second one for the other trade.'
             : 'The estimate does not say which trade it is.'),
{ choices: [ { id:'roof', label:'Roofing Construction Agreement' },
             { id:'siding', label:'Siding Construction Agreement' },
             { id:'gutters', label:'Gutter Construction Agreement' },
             { id:'service', label:'General service contract', hint:'No Notice of Cancellation \\u2014 not for a sale made at the home' } ] });
return (typeof choice === 'string' && (choice === 'service' || types[choice])) ? choice : null;
}
async function generate(est, project){
var kind = await pickAgreement(est, project);
if(!kind) return null;
var trade = kind !== 'service' ? (window.CONTRACT_TYPES || {})[kind] : null;
var missing = [];
if(!trade && typeof window.CONTRACT_TEMPLATE !== 'string') missing.push('CONTRACT_TEMPLATE');""")

one("""var tpl = window.prefillUserInfo(window.prefillClientInfo(window.CONTRACT_TEMPLATE, project));
var scopeHtml = buildScopeHtml(est);
var openTag  = '<' + 'div class="descbox">';
var closeTag = '<' + '/div>';
var scopeRe = /[<]div class="descbox">[<]span class="ph">\\[Describe the work[\\s\\S]*?[<]\\/span>[<]\\/div>/;
if(scopeRe.test(tpl)){""",
"""var tpl = window.prefillUserInfo(window.prefillClientInfo(trade ? trade.tpl() : window.CONTRACT_TEMPLATE, project));
var scopeHtml = buildScopeHtml(est);
var openTag  = '<' + 'div class="descbox">';
var closeTag = '<' + '/div>';
var scopeRe = /[<]div class="descbox">[<]span class="ph">\\[Describe the work[\\s\\S]*?[<]\\/span>[<]\\/div>/;
/* 1389: a trade agreement has no "Describe the work" box; the estimate's scope goes in its Notes box */
var notesBox = openTag + '<span class="ph">[notes]</span>' + closeTag;
if(trade && tpl.indexOf(notesBox) !== -1){
tpl = tpl.replace(notesBox, openTag + scopeHtml + closeTag);
}else if(scopeRe.test(tpl)){""")

one("""var title = 'Contract \\u2014 ' + ((project && (project.name || project.client_name)) || 'Client');""",
"""var title = 'Contract \\u2014 ' + (trade ? trade.label + ' \\u2014 ' : '') + ((project && (project.name || project.client_name)) || 'Client');""")

one("""if(window.supa && est.id){
try{
await window.supa.from('estimates')
.update({ contract_doc_id: docId }).eq('id', est.id);""",
"""_lastKind = kind;   /* 1389: what handleClick says depends on which agreement was made */
if(window.supa && est.id){
try{
await window.supa.from('estimates')
.update({ contract_doc_id: docId }).eq('id', est.id);""")

one("""async function handleClick(){
var btn = document.getElementById('cr-e2c-btn');""",
"""var _lastKind = null;
async function handleClick(){
var btn = document.getElementById('cr-e2c-btn');""")

one("""crTell('Contract created from ' + (est.estimate_number || 'the estimate') + '.\\n\\n' +
'Scope and payment schedule are prefilled. Review the terms, then have the ' +
'client sign \\u2014 in person or by share link.\\n\\n' +
'This is the general Service Contract and it does not carry the Notice of Cancellation. ' +
'For a sale made at the home, use the Roofing, Siding or Gutter Construction Agreement.');""",
"""var _tr = _lastKind && _lastKind !== 'service' ? (window.CONTRACT_TYPES || {})[_lastKind] : null;
crTell((_tr ? _tr.label + ' Construction Agreement' : 'Contract') + ' created from ' + (est.estimate_number || 'the estimate') + '.\\n\\n' +
'The scope is in the Notes box and the price and deposit are filled in. Review it, then have the ' +
'client sign \\u2014 in person or by share link.' +
(_tr ? ' The Right to Cancel and the printed Notice of Cancellation go with this agreement.'
     : '\\n\\nThis is the general Service Contract and it does not carry the Notice of Cancellation. ' +
       'For a sale made at the home, use the Roofing, Siding or Gutter Construction Agreement.'));""")

one(">v2026-10-22 build 1388<", ">v2026-10-22 build 1389<")
one("""  { b: 1388, d:'2026-10-22',""",
"""  { b: 1389, d:'2026-10-22', t:'\\u2192 Contract makes the right agreement', s:'Making a contract from an estimate now makes the Roofing, Siding or Gutter Construction Agreement \\u2014 the one with the specifications page, the signature boxes and the Right to Cancel \\u2014 instead of the general service contract. It reads the trade off the estimate; if the estimate covers more than one trade, or none, it asks which. The estimate\\u2019s scope goes into the Notes box, and the price and deposit are filled in. The general service contract is still one of the choices.' },
  { b: 1388, d:'2026-10-22',""")
pl.write_atomic(path, s)
print('ok 1389')
