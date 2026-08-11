/* Build 712 — partner contact details are the owner's alone.

   Executes the SHIPPED cr-cpartners module (whole IIFE) twice: once signed in
   as theo@ (the owner) and once as a sales rep, and compares what each is
   handed by every read path. Then drives the two paths a read mask does NOT
   cover — the editor (which upgrades to getRaw) and save() (which could blank
   the stored contacts).

   Negative control: the 711 artifact — the rep sees everything → red.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_712.js [index.html] */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const open_ = SRC.indexOf('<script id="cr-cpartners-script">');
ok('cr-cpartners-script found', open_ !== -1);
const close_ = SRC.indexOf('<\/script>', open_);
const block = SRC.slice(open_ + '<script id="cr-cpartners-script">'.length, close_);
console.log('  (sliced ' + block.length + ' chars of shipped module)');

const ROWS = [
  { id: 'p1', name: 'Habitat for Humanity', partner_type: 'nonprofit', confidential: false,
    prospective: false, archived: false, contact_name: 'Critical Repair Dept — Galen Curry',
    contact_email: 'Gcurry@daytonhabitat.org', contact_phone: '(937) 965-7684',
    address: '115 W Riverview Ave', notes: 'Critical repair program' },
  { id: 'p2', name: 'C.G. Egli Inc', partner_type: 'general_contractor', confidential: true,
    prospective: false, archived: false, contact_name: 'Secret Person',
    contact_email: 'secret@egli.com', contact_phone: '555', address: 'x', notes: 'n' },
  { id: 'p3', name: 'City of Dayton', partner_type: 'nonprofit', confidential: false,
    prospective: true, archived: false, contact_name: 'Emily Crow',
    contact_email: 'emily.crow@daytonohio.gov', contact_phone: '(937) 333-3333',
    address: null, notes: 'STRUCTURAL AND EXTERIOR ONLY' },
];

function boot(email) {
  const dom = new JSDOM('<div id="navMenu"></div>');
  const doc = dom.window.document;
  const saves = [];
  /* the shipped load() chains .order() TWICE and save() ends .select().single(),
     so every builder method has to return the builder and the builder itself has
     to be awaitable */
  let lastRow = null;
  const q = {
    select: () => q, eq: () => q, order: () => q,
    single: () => Promise.resolve({ data: lastRow, error: null }),
    update: (row) => { lastRow = row; saves.push({ op: 'update', row: row }); return q; },
    insert: (row) => { lastRow = row; saves.push({ op: 'insert', row: row }); return q; },
    then: (f, r) => Promise.resolve({ data: ROWS.slice(), error: null }).then(f, r),
  };
  const api = {};
  const win = {
    currentUser: { email: email },
    supa: { from: () => q }, sb: { from: () => q },
    CardinalPortal: { get: () => 'community' },
    addEventListener: () => {},
    alert: () => {},
  };
  Object.defineProperty(win, 'CardinalCommunityPartners', {
    set: v => { api.x = v; }, get: () => api.x, configurable: true });
  class MO { observe() {} disconnect() {} }
  new Function('window', 'document', 'MutationObserver', 'setInterval', 'clearInterval',
    'setTimeout', 'requestAnimationFrame', 'alert', 'confirm', 'FormData',
    block)(
    win, doc, MO, () => 0, () => {}, fn => { fn(); return 0; }, fn => { fn(); },
    () => {}, () => true, dom.window.FormData);
  return { api: api.x, saves, dom, doc, win };
}

(async () => {
  /* the module loads its CACHE asynchronously from the stubbed client */
  const owner = boot('theo@cardinalrenovations.net');
  const rep = boot('nick@cardinalrenovations.net');
  const joan = boot('joan@cardinalrenovations.net');
  ok('the module exported its API', !!(owner.api && owner.api.get && owner.api.list));
  ok('isOwner is exported for the other modules to ask',
    typeof owner.api.isOwner === 'function');
  await owner.api.load(); await rep.api.load(); await joan.api.load();

  /* ── 1 · the five read paths ── */
  const oh = owner.api.get('p1'), rh = rep.api.get('p1'), jh = joan.api.get('p1');
  ok('OWNER still sees Habitat\'s contact name, email and phone',
    oh.contact_name && oh.contact_email === 'Gcurry@daytonhabitat.org' && oh.contact_phone,
    JSON.stringify({ n: oh.contact_name, e: oh.contact_email }));
  ok('a REP gets no contact name, email, phone or address',
    !rh.contact_name && !rh.contact_email && !rh.contact_phone && !rh.address,
    JSON.stringify({ n: rh.contact_name, e: rh.contact_email, p: rh.contact_phone }));
  ok('…but still sees WHO the partner is, and its programme notes',
    rh.name === 'Habitat for Humanity' && rh.partner_type === 'nonprofit' && !!rh.notes,
    JSON.stringify({ name: rh.name, notes: rh.notes }));
  ok('…and is flagged so the screen can explain the absence', rh.__contactHidden === true);
  ok('JOAN is treated as everyone else here — Theo picked theo@ only',
    !jh.contact_email && jh.name === 'Habitat for Humanity', JSON.stringify({ e: jh.contact_email }));

  ok('list() hides contacts from a rep', rep.api.list().every(p => !p.contact_email));
  ok('byType() hides contacts from a rep', rep.api.byType('nonprofit').every(p => !p.contact_email));
  /* prospects() is module-internal — the fifth read path is only reachable
     through the screen it paints, so drive that screen rather than assert a
     tautology about list() */
  await rep.api.openProspects(); await owner.api.openProspects();
  const repPros = rep.doc.body.innerHTML, ownPros = owner.doc.body.innerHTML;
  ok('the prospects SCREEN paints no contact for a rep (the fifth read path)',
    repPros.indexOf('emily.crow@daytonohio.gov') === -1 &&
    repPros.indexOf('937) 333-3333') === -1 &&
    repPros.indexOf('Emily Crow') === -1 &&
    /City of Dayton/.test(repPros),
    repPros.length + ' chars painted');
  ok('…and says who holds them instead of claiming there are none',
    repPros.indexOf('Contact details are held by Theo') !== -1 &&
    repPros.indexOf('no public email') === -1);
  ok('…while the OWNER\'s prospects screen still carries the address',
    ownPros.indexOf('emily.crow@daytonohio.gov') !== -1);
  ok('list() still gives the OWNER everything', owner.api.list().some(p => p.contact_email === 'Gcurry@daytonhabitat.org'));

  /* ── 2 · the confidential partner keeps its stronger mask ── */
  const rc = rep.api.get('p2');
  ok('a CONFIDENTIAL partner still hides its NAME too, for a rep',
    /Confidential/.test(rc.name) && rc.__masked === true, rc.name);
  const oc = owner.api.get('p2');
  ok('…and the owner still sees it in full', oc.name === 'C.G. Egli Inc' && !!oc.contact_email);

  /* ── 3 · getRaw is still the deliberate bypass, unchanged ── */
  ok('getRaw stays the single documented bypass (not routed through the mask)',
    block.indexOf('function getRaw(id){') !== -1 &&
    /function getRaw\(id\)\{[\s\S]{0,220}?return[^\n]*\|\| null;/.test(block));

  /* ── 4 · save() cannot blank what the form never showed ── */
  await owner.api.save({ id: 'p1', name: 'Habitat for Humanity', partner_type: 'nonprofit',
    notes: 'edited by a rep' });                 /* no contact_* keys at all */
  const r1 = owner.saves[owner.saves.length - 1];
  ok('save() omits the contact columns when the caller never supplied them',
    r1 && !('contact_name' in r1.row) && !('contact_email' in r1.row) &&
    !('contact_phone' in r1.row) && !('address' in r1.row), JSON.stringify(r1 && r1.row));
  ok('…while still writing the fields it WAS given', r1 && r1.row.notes === 'edited by a rep');
  await owner.api.save({ id: 'p1', name: 'Habitat', partner_type: 'nonprofit',
    contact_email: 'new@x.org', notes: 'n' });
  const r2 = owner.saves[owner.saves.length - 1];
  ok('an owner edit DOES write the contact column', r2 && r2.row.contact_email === 'new@x.org');

  /* ── 5 · pattern-checked: the editor and the bid email ── */
  /* 714 replaced the raw isOwner() gate at this site with canEditContacts,
     which is `isOwner() && rowCarriesContacts` — strictly stronger, because a
     row that never carried the columns can no longer be blanked by anyone.
     The INTENT of this 712 assertion is unchanged (a non-owner sees no contact
     inputs); only the identifier moved, so the pattern moves with it rather
     than the app being bent back to satisfy a stale test. */
  ok('the editor renders the contact inputs only for the owner',
    /\(canEditContacts\s*\n\?\s*'<div class="row2">'/.test(block) &&
    /var canEditContacts = isOwner\(\) && rowCarriesContacts;/.test(block) &&
    block.indexOf('Contact details are held by Theo and are not shown here') !== -1);
  ok('the editor no longer hands a non-owner the raw row',
    block.indexOf('partner = (raw ? (isOwner() ? raw : maskPartner(raw)) : partner);') !== -1 &&
    block.indexOf('partner = raw || partner;') === -1);
  ok('the bid email refuses for a non-owner instead of falling back to the homeowner',
    /Bids to ' \+ _pnm \+ ' are sent by Theo/.test(SRC) &&
    SRC.indexOf('CardinalCommunityPartners.isOwner()') !== -1);

  console.log('\nHARNESS 712: ' + (fail ? 'RED (' + fail + ' failed)' : 'GREEN') +
    '  (' + pass + ' passed, ' + fail + ' failed)  on ' + path.basename(FILE));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
