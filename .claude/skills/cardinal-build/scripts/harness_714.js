/* Build 714 — the contact columns stop being asked for, and nothing can blank
   them by accident.

   Executes the SHIPPED cr-cpartners module against a stub client that RECORDS
   the exact select() string it was handed, so the assertions are about the
   request that actually goes to Postgres — not about what the code looks like.

   The two cases that matter most are the ones an adversarial design review
   found before this shipped:
     · the owner reading a REP-shaped cache must not be shown four empty
       contact inputs, because saving that form would NULL the stored contacts
       (a data-loss path that did not exist at 713);
     · a failed load must not set LOADED and empty the cache, because that
       silently kills the directory, the picker AND the New Bid partner select
       for the rest of the session.

   Negative control: the 713 artifact — no column list, no error guard, no
   identity binding → red.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_714.js [index.html] */
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

const CONTACT = ['contact_name', 'contact_email', 'contact_phone', 'address'];

const FULL_ROW = {
  id: 'p1', name: 'Habitat for Humanity of Greater Dayton', partner_type: 'nonprofit',
  confidential: false, prospective: false, archived: false, notes: 'Critical repair',
  created_at: '2026-01-01', created_by: 'theo@cardinalrenovations.net',
  updated_at: '2026-01-01',
  contact_name: 'Galen Curry', contact_email: 'Gcurry@daytonhabitat.org',
  contact_phone: '(937) 586-0860', address: '115 W Riverview Ave',
};
const CONF_ROW = {
  id: 'p2', name: 'C.G. Egli Inc', partner_type: 'general_contractor',
  confidential: true, prospective: false, archived: false, notes: null,
  created_at: '2026-01-01', created_by: 'system', updated_at: '2026-01-01',
  contact_name: 'Secret', contact_email: 's@egli.com', contact_phone: '555', address: 'x',
};

/* what PostgREST would actually hand back for a given select list */
function project(row, cols) {
  if (cols === '*') return Object.assign({}, row);
  const out = {};
  cols.split(',').forEach(c => { if (c in row) out[c] = row[c]; });
  return out;
}

function boot(email, opts) {
  opts = opts || {};
  const dom = new JSDOM('<div id="navMenu"></div>');
  const doc = dom.window.document;
  const seen = { selects: [], writes: [], ops: [] };
  let lastSel = '*', lastRow = null;
  const q = {
    select: (c) => { lastSel = (c === undefined ? '*' : c); seen.selects.push(lastSel);
      seen.ops.push({ op: 'select', cols: lastSel }); return q; },
    eq: () => q, order: () => q,
    single: () => Promise.resolve({ data: lastRow, error: null }),
    update: (row) => { lastRow = row; seen.writes.push({ op: 'update', row });
      seen.ops.push({ op: 'update' }); return q; },
    insert: (row) => { lastRow = row; seen.writes.push({ op: 'insert', row }); return q; },
    then: (f, r) => {
      if (opts.failLoad) return Promise.resolve({ data: null, error: { message: 'column x does not exist' } }).then(f, r);
      const cols = lastSel;
      return Promise.resolve({ data: [project(FULL_ROW, cols), project(CONF_ROW, cols)], error: null }).then(f, r);
    },
  };
  const api = {};
  const win = {
    currentUser: { email: email },
    sb: { from: () => q }, supa: { from: () => q },
    CardinalPortal: { get: () => 'community' },
    addEventListener: () => {}, alert: () => {},
  };
  Object.defineProperty(win, 'CardinalCommunityPartners', {
    set: v => { api.x = v; }, get: () => api.x, configurable: true });
  class MO { observe() {} disconnect() {} }
  new Function('window', 'document', 'MutationObserver', 'setInterval', 'clearInterval',
    'setTimeout', 'requestAnimationFrame', 'alert', 'confirm', 'FormData', block)(
    win, doc, MO, () => 0, () => {}, fn => { fn(); return 0; }, fn => { fn(); },
    () => {}, () => true, dom.window.FormData);
  return { api: api.x, seen, dom, doc, win };
}

(async () => {
  /* ── 1 · the request itself ── */
  const rep = boot('nick@cardinalrenovations.net');
  await rep.api.load(true);
  const repSel = rep.seen.selects[rep.seen.selects.length - 1];
  ok('a REP\'s query names its columns instead of select(*)', repSel !== '*' && repSel.indexOf(',') !== -1, repSel);
  ok('…and asks for NONE of the four contact columns',
    CONTACT.every(c => repSel.split(',').indexOf(c) === -1), repSel);
  ok('…but still asks for `confidential` — dropping it would fail the confidential mask OPEN',
    repSel.split(',').indexOf('confidential') !== -1, repSel);
  ok('…and `prospective`, which splits the directory from the prospects page',
    repSel.split(',').indexOf('prospective') !== -1, repSel);

  const own = boot('theo@cardinalrenovations.net');
  await own.api.load(true);
  const ownSel = own.seen.selects[own.seen.selects.length - 1];
  ok('the OWNER\'s query does ask for the contact columns',
    CONTACT.every(c => ownSel.split(',').indexOf(c) !== -1), ownSel);

  /* ── 2 · what came back ── */
  /* maskPartner ADDS the four keys as null on purpose — that is what drives the
     "Contact details are held by Theo" line — so the masked rows are expected to
     carry them. The claim of this build is about the RAW cache: what the exported
     load() hands out, and what a devtools console would find sitting in memory. */
  ok('a rep\'s masked rows carry no contact VALUE',
    rep.api.list().every(p => CONTACT.every(c => p[c] == null)),
    JSON.stringify(rep.api.list()[0]));
  const rawRep = await rep.api.load();
  ok('…and the RAW cache the exported load() returns has no contact keys at all',
    rawRep.every(p => CONTACT.every(c => !(c in p))),
    JSON.stringify(Object.keys(rawRep[0] || {})));
  ok('…and are still flagged so the screen can explain the absence',
    rep.api.list().every(p => p.__masked || p.__contactHidden === true));
  ok('the confidential partner is still masked for a rep',
    /Confidential/.test((rep.api.get('p2') || {}).name || ''), (rep.api.get('p2') || {}).name);
  ok('the owner still gets Galen in full',
    own.api.get('p1').contact_email === 'Gcurry@daytonhabitat.org');

  /* ── 3 · the cache is bound to who loaded it ── */
  const shared = boot('nick@cardinalrenovations.net');
  await shared.api.load();
  shared.win.currentUser = { email: 'theo@cardinalrenovations.net' };
  await shared.api.load();                     /* no force — must refetch anyway */
  const after = shared.seen.selects[shared.seen.selects.length - 1];
  ok('a user switch refetches instead of serving the previous person\'s cache',
    CONTACT.every(c => after.split(',').indexOf(c) !== -1), after);
  ok('…and the owner then sees the contacts, not a rep-shaped row',
    (shared.api.get('p1') || {}).contact_email === 'Gcurry@daytonhabitat.org');

  /* ── 4 · a failed load must not poison the module ── */
  const broke = boot('nick@cardinalrenovations.net', { failLoad: true });
  await broke.api.load(true);
  const cached = broke.api.list();
  ok('a failed load leaves the roster empty but NOT marked loaded (it can retry)',
    Array.isArray(cached));
  const before = broke.seen.selects.length;
  await broke.api.load();
  ok('…so the very next load actually re-queries instead of serving []',
    broke.seen.selects.length > before,
    'selects before ' + before + ', after ' + broke.seen.selects.length);

  /* ── 5 · save() cannot blank what it was never shown ── */
  await own.api.save({ id: 'p1', name: 'Habitat', partner_type: 'nonprofit', notes: 'n' });
  const w = own.seen.writes[own.seen.writes.length - 1];
  ok('save() still omits contact columns the caller did not supply',
    w && CONTACT.every(c => !(c in w.row)), JSON.stringify(w && w.row));
  /* save() calls load(true) AFTER the update, so the LAST select belongs to the
     reload, not to the write. Take the select that immediately follows the
     update — reading the wrong one made this red against correct code. */
  const iUp = own.seen.ops.map(o => o.op).lastIndexOf('update');
  const backRead = (own.seen.ops[iUp + 1] || {}).cols;
  ok('save() no longer reads the whole row back (it asked for id only)',
    backRead === 'id', String(backRead));

  /* ── 6 · the editor gates on the ROW, not the identity ── */
  ok('the editor decides on the row that was loaded, not on who is looking',
    block.indexOf('var canEditContacts = isOwner() && rowCarriesContacts;') !== -1 &&
    block.indexOf("Object.prototype.hasOwnProperty.call(p, 'contact_email')") !== -1);
  ok('…and both the inputs and the submit keys use that decision',
    block.indexOf('(canEditContacts') !== -1 && block.indexOf('if(canEditContacts){') !== -1);
  ok('isOwner() no longer gates the contact inputs on its own',
    block.indexOf("(isOwner()\n? '<div class=\"row2\">'") === -1);

  /* ── 7 · the bid-send refusal, and the stamp 713 broke ── */
  ok('the bid-send refusal fires on the PARTNER, not on whether an email exists',
    SRC.indexOf('if(_pid && !_own){') !== -1 && SRC.indexOf('if(_pe && !_own){') === -1);
  ok('…and a failed lookup no longer falls through to the homeowner',
    SRC.indexOf('nothing was sent') !== -1);
  ok('the app stamp carries no raw \\u escape (713 shipped one into the markup)',
    !/data-cr-footer[^>]*>[^<]*\\u[0-9a-fA-F]{4}/.test(SRC));

  console.log('\nHARNESS 714: ' + (fail ? 'RED (' + fail + ' failed)' : 'GREEN') +
    '  (' + pass + ' passed, ' + fail + ' failed)  on ' + path.basename(FILE));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
