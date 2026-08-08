/* Build 634 — the Community Partners directory must not crash on a masked row,
   and a stack trace must not render as a job note.

   THE BUG THIS EXISTS TO PREVENT COMING BACK:
   renderDirectory() rendered Edit/Archive behind `p.__masked ? '' : …` and then
   wired them unconditionally. For anyone outside ADMIN_EMAILS / PROD_EMAILS —
   i.e. the sales reps — querySelector returned null and the throw aborted the
   whole forEach, so the masked row AND EVERY ROW AFTER IT lost its handlers
   while the list still looked completely normal. Two of ten live partners are
   confidential, so this fired every single time, for those users.

   ⚠️ The static assertions below are the WEAKER half. The section that matters
   EXECUTES the shipped maskIfConfidential/list/renderDirectory under jsdom as
   both a privileged user and a rep, and asks the DOM what actually got wired.
   A regex is satisfied by an `if(x)` that guards the wrong thing.

   635 closed the other half of the same class, and the section at the very
   bottom is the one that matters: it TAKES THE TAP. renderProspects rendered
   Edit unconditionally and its handler calls getRaw() — the deliberately
   UNMASKED lookup — so a rep saw "Confidential Partner" in the list and one tap
   opened the real name, email, phone and notes. Asserting the button is absent
   is not enough; the test clicks it and reads the form.

   Usage: node harness_partners.js [path-to-index.html] */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const H = fs.readFileSync(FILE, 'utf8');
const blk = id => { const i = H.indexOf(`<script id="${id}">`);
  return H.slice(H.indexOf('>', i) + 1, H.indexOf('</script>', i)); };
const CP = blk('cr-cpartners-script');
const CC = blk('cr-cc-script');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* Brace-match, never slice to the next landmark — a slice that overruns sweeps
   up neighbours and fails correct code (BUG_CLASSES class 15). */
const body = (src, sig) => {
  const i = src.indexOf(sig); if (i === -1) return '';
  let d = 0; const j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  return '';
};

console.log('\n── the guard, and the one it was copied from ──');
const rd = body(CP, 'function renderDirectory(host){');
ok('renderDirectory was found and brace-matched', rd.length > 400, rd.length + ' chars');
ok('neither handler is attached without checking the button exists',
  !/row\.querySelector\('\[data-act="(edit|archive)"\]'\)\.onclick/.test(rd),
  'an unguarded querySelector().onclick survived');
ok('both buttons are guarded, not just the one that threw',
  /if\(eBtn\) eBtn\.onclick/.test(rd) && /if\(aBtn\) aBtn\.onclick/.test(rd));
/* The rows still render exactly as before — this build changed WIRING only. */
ok('the masked row still renders no buttons (markup unchanged)',
  /\(p\.__masked\s*\n?\s*\?\s*''/.test(rd) && /<button data-act="edit">Edit<\/button>/.test(rd));
/* renderProspects is the shape this was copied from. If someone "tidies" it
   away, the next person has no local convention to copy. */
const rp = body(CP, 'function renderProspects(host){');
ok('renderProspects still guards the same way — the convention survives',
  /var b = row\.querySelector\('\[data-act="edit"\]'\);/.test(rp) && /if\(b\) b\.onclick/.test(rp));

console.log('\n── 635: the prospects list masks too ──');
/* prospects() ALWAYS masked — that half was already right and must stay right.
   Asserted because a "fix" that dropped it would make everything below moot. */
ok('prospects() still runs every row through the mask',
  /return \(CACHE \|\| \[\]\)\.filter\(function\(p\)\{ return !!p\.prospective; \}\)\.map\(maskIfConfidential\);/.test(CP));
ok('the Edit button is hidden on a masked prospect, same ternary as the directory',
  /\(p\.__masked \? '' : '<button data-act="edit">Edit<\/button>'\)/.test(rp) &&
  !/'<div class="btns"><button data-act="edit">Edit<\/button><\/div>'/.test(CP));
/* A control that is silently absent reads as broken. The chip explains it. */
ok('a confidential prospect carries the CONFIDENTIAL chip, so the absence is explained',
  /var lockChip = p\.confidential/.test(rp));
ok('...and it is the SAME chip the directory uses, not a second design',
  (CP.match(/\\uD83D\\uDD12 CONFIDENTIAL<\/span>/g) || []).length === 2 &&
  (CP.match(/var lockChip = p\.confidential/g) || []).length === 2);

console.log('\n── 635: the fence under the UI ──');
/* getRaw() is the unmask, and openEditor calls it on EVERY id it is handed —
   so the mask was only ever as strong as its callers. This is the boundary. */
const oe = body(CP, 'function openEditor(partner){');
ok('openEditor refuses to unmask for a non-privileged caller',
  /if\(raw && raw\.confidential && !isPrivileged\(\)\)\{/.test(oe) &&
  !/if\(partner && partner\.id\) partner = getRaw\(partner\.id\) \|\| partner;/.test(CP));
/* A silent return is itself a dead button (class 16) — it must say why. */
ok('it says why rather than doing nothing',
  /alert\('That partner is confidential/.test(oe));
ok('an admin is untouched — the refusal is gated on isPrivileged, nothing else',
  /!isPrivileged\(\)/.test(oe) && !/ADMIN_EMAILS/.test(oe));

console.log('\n── the PROPERTIES directory is deliberately NOT guarded ──');
/* Its two buttons are unconditional, so a guard could not fix anything today
   and would turn a future regression from a loud crash into a silently dead
   button — class 16, the worse failure. Assert it stayed untouched. */
const props = body(H, 'function renderDirectory(host, partnerId){');
ok('it still wires without a guard, on purpose',
  /row\.querySelector\('\[data-act="edit"\]'\)\.onclick = function\(\)\{ openEditor\(partnerId, get\(id\)\); \};/.test(props));
ok('...which is only safe because its buttons are unconditional',
  /'<button data-act="edit">Edit<\/button>' \+/.test(props) && !/__masked/.test(props));

console.log('\n── diagnostics are not job activity ──');
ok('the thread skips client_error, via a named list like IC_SKIP / PIPE_SKIP',
  /var THREAD_SKIP = \{ client_error:1 \};/.test(CC));
ok('the filter runs at LOAD, so events.length cannot churn the render key',
  /events = \(r\.data \|\| \[\]\)\.filter\(function\(e\)\{ return !THREAD_SKIP\[e\.type\]; \}\);/.test(CC) &&
  !/events = r\.data \|\| \[\];/.test(CC));
/* The row is NOT deleted and the stamp is NOT removed: the Team audit log reads
   the same table and should still show every error, with the job it happened on. */
ok('capture() still stamps the project — fixed at the consumer, not the source',
  /project_id: currentProjectId\(\),/.test(H));
ok('the Team audit log is still unfiltered, deliberately',
  /\.from\('audit_events'\)\.select\('at,email,type,detail,project_id'\)\.order\('at'/.test(H));

console.log('\n── EXECUTED: what actually gets wired, as an admin and as a rep ──');
/* This is the section that matters. The bug shipped past everything a regex
   could check, because the code existed and threw at runtime. */
const CONF_ID = 'p-conf', OPEN_ID = 'p-open';
function run(email) {
  const dom = new JSDOM('<!doctype html><body><div class="cr-cp-shell">' +
    '<div class="cr-cp-bd"></div></div></body>');
  const d = dom.window.document;
  const host = d.querySelector('.cr-cp-shell');

  const code = `
    var CACHE = [
      { id:'${OPEN_ID}', name:'Habitat for Humanity', partner_type:'nonprofit',
        contact_name:'Dana', contact_phone:'555', confidential:false, prospective:false },
      { id:'${CONF_ID}', name:'SECRET GC LLC', partner_type:'general_contractor',
        contact_name:'Ray', contact_phone:'556', confidential:true, prospective:false }
    ];
    var ADMIN_EMAILS = ['theo@cardinalrenovations.net','joan@cardinalrenovations.net'];
    var PROD_EMAILS  = ['curtis@cardinalrenovations.net','scottie@cardinalrenovations.net'];
    function currentEmailLower(){ return '${email}'; }
    function esc(s){ return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    var OPENED = [];
    function openEditor(p){ OPENED.push(p); }
    async function archive(){}
    async function openDirectory(){}
    ${body(CP, 'function isPrivileged(){')}
    ${body(CP, 'var MASK_NAMES = {').replace(/^var MASK_NAMES = /, 'var MASK_NAMES = ')};
    ${body(CP, 'function maskIfConfidential(p){')}
    function list(){ return (CACHE || []).map(maskIfConfidential); }
    function get(id){
      var p = (CACHE || []).filter(function(x){ return x.id === id; })[0] || null;
      return maskIfConfidential(p);
    }
    ${body(CP, 'function renderDirectory(host){')}
    renderDirectory(host);
    return { OPENED: OPENED, privileged: isPrivileged() };
  `;
  try {
    const out = new Function('host', 'document', code)(host, d);
    return { d, out, threw: null };
  } catch (e) {
    return { d, out: null, threw: e.message };
  }
}

for (const [who, email] of [['admin', 'theo@cardinalrenovations.net'],
                            ['rep  ', 'clarkie022@gmail.com']]) {
  const { d, out, threw } = run(email);
  ok(`${who}: renderDirectory completes without throwing`, threw === null, threw);
  if (threw) continue;

  const rows = [...d.querySelectorAll('.cr-cp-row')];
  ok(`${who}: both partners still render — masking hides data, not the row`,
    rows.length === 2, rows.length);

  const conf = rows.find(r => r.dataset.id === CONF_ID);
  const open = rows.find(r => r.dataset.id === OPEN_ID);
  const wired = el => !!(el && typeof el.onclick === 'function');

  /* THE REGRESSION THAT MATTERS: the row AFTER the masked one must still work.
     The old code threw mid-forEach and left it dead while it looked fine. */
  ok(`${who}: the ordinary partner's Edit IS wired`,
    wired(open && open.querySelector('[data-act="edit"]')));
  ok(`${who}: the ordinary partner's Archive IS wired`,
    wired(open && open.querySelector('[data-act="archive"]')));

  if (out.privileged) {
    ok(`${who}: sees the real name and gets buttons on the confidential partner`,
      /SECRET GC LLC/.test(conf.textContent) &&
      wired(conf.querySelector('[data-act="edit"]')));
  } else {
    /* Masking is the point of the feature — assert it still holds, or a "fix"
       that simply rendered the buttons would pass everything above. */
    ok(`${who}: the confidential name is NOT in the DOM`,
      !/SECRET GC LLC/.test(d.body.textContent), conf && conf.textContent.trim());
    ok(`${who}: the masked row shows the placeholder name instead`,
      /Confidential GC Partner/.test(conf.textContent));
    ok(`${who}: the masked row has NO buttons to wire`,
      conf.querySelectorAll('[data-act]').length === 0);
  }
}


console.log('\n── EXECUTED: the prospects tap, which is where the leak was ──');
/* Asserting the button is absent is NOT enough — that is the mistake 632 taught.
   This renders the real renderProspects, finds the confidential row, TAKES THE
   TAP, and reads what openEditor was actually handed. On 634 the form fills with
   the real name and email; on 635 there is no button, and the fence refuses even
   if something reaches openEditor another way. */
const SECRET = 'Ohio Valley Restoration LLC', SECRET_MAIL = 'ray@ovr-example.com';
function runProspects(email) {
  const dom = new JSDOM('<!doctype html><body><div class="cr-cp-shell">' +
    '<div class="cr-cp-bd"></div></div></body>');
  const d = dom.window.document;
  const host = d.querySelector('.cr-cp-shell');
  /* openEditor's real head, cut at the form markup: everything past the fence is
     irrelevant here and would drag in the whole module. */
  const oeHead = (() => {
    const b = body(CP, 'function openEditor(partner){');
    return b.slice(b.indexOf('{') + 1, b.indexOf('var p = partner ||'));
  })();
  const code = `
    var CACHE = [
      { id:'pr-open', name:'Miami Valley Housing', partner_type:'nonprofit',
        prospective:true, confidential:false, contact_name:'Dana',
        contact_phone:'555', contact_email:'dana@example.org', notes:'called them' },
      { id:'pr-conf', name:${JSON.stringify(SECRET)}, partner_type:'general_contractor',
        prospective:true, confidential:true, contact_name:'Ray Secret',
        contact_phone:'556', contact_email:${JSON.stringify(SECRET_MAIL)},
        notes:'do not circulate' }
    ];
    var ADMIN_EMAILS = ['theo@cardinalrenovations.net','joan@cardinalrenovations.net'];
    var PROD_EMAILS  = ['curtis@cardinalrenovations.net','scottie@cardinalrenovations.net'];
    function currentEmailLower(){ return '${email}'; }
    function esc(s){ return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    var OPENED = [], ALERTS = [];
    function alert(m){ ALERTS.push(String(m)); }
    ${body(CP, 'function isPrivileged(){')}
    ${body(CP, 'var MASK_NAMES = {')};
    ${body(CP, 'function maskIfConfidential(p){')}
    function prospects(){
      return (CACHE || []).filter(function(p){ return !!p.prospective; }).map(maskIfConfidential);
    }
    function getRaw(id){
      return (CACHE || []).filter(function(x){ return x.id === id; })[0] || null;
    }
    function openEditor(partner){ ${oeHead} OPENED.push(partner); }
    ${body(CP, 'function renderProspects(host){')}
    renderProspects(host);
    return { OPENED: OPENED, ALERTS: ALERTS, privileged: isPrivileged(),
             direct: function(){ openEditor({ id:'pr-conf' }); return OPENED[OPENED.length-1]; } };
  `;
  try {
    return { d, out: new Function('host', 'document', code)(host, d), threw: null };
  } catch (e) { return { d, out: null, threw: e.message }; }
}

for (const [who, email] of [['admin', 'theo@cardinalrenovations.net'],
                            ['rep  ', 'clarkie022@gmail.com']]) {
  const { d, out, threw } = runProspects(email);
  ok(`${who}: renderProspects runs`, threw === null, threw);
  if (threw) continue;

  const rows = [...d.querySelectorAll('.cr-cp-row')];
  const conf = rows.find(r => r.dataset.id === 'pr-conf');
  ok(`${who}: both prospects render — masking hides data, not the row`,
    rows.length === 2, rows.length);

  const btn = conf && conf.querySelector('[data-act="edit"]');
  if (btn && typeof btn.onclick === 'function') btn.onclick();      /* TAKE THE TAP */
  const tapped = out.OPENED[out.OPENED.length - 1];
  const leaked = o => !!o && (o.name === SECRET || o.contact_email === SECRET_MAIL);

  if (out.privileged) {
    ok(`${who}: can still tap Edit on a confidential prospect`, !!btn);
    ok(`${who}: and is handed the REAL row — that is what the feature is for`,
      leaked(tapped));
    ok(`${who}: no refusal shown`, out.ALERTS.length === 0, out.ALERTS.join(' | '));
  } else {
    ok(`${who}: the secret name is NOT in the list`,
      !d.body.textContent.includes(SECRET), conf && conf.textContent.trim());
    ok(`${who}: the CONFIDENTIAL chip explains the missing button`,
      /CONFIDENTIAL/.test(conf.textContent));
    ok(`${who}: there is no Edit button to tap`, !btn);
    ok(`${who}: having tapped it, nothing unmasked was handed over`,
      !leaked(tapped), tapped && JSON.stringify(tapped).slice(0, 110));
    /* The fence itself, called directly — this is what holds if a future caller
       reaches openEditor without going through the list. */
    ok(`${who}: openEditor refuses even when called directly, and says why`,
      !leaked(out.direct()) && out.ALERTS.some(a => /confidential/i.test(a)),
      out.ALERTS.join(' | '));
  }
}

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
