/* Build 707 — the work-order module, repaired in both directions + host mode.

   Executes the ENTIRE shipped cr-wo-script IIFE (sliced between its script
   tags) against jsdom + mocks, then drives it through its real export and
   real DOM events. Not a re-implementation.

   What must hold (all of it RED on the 706 artifact):
     · render(host) into the black card's box shows REAL entries parsed from
       the checklist STRING (706 rendered empty forever)
     · upload: storage → patchProjectCk({work_orders:[new,…]}) with NO raw
       projects.update and NO throw (706 threw TypeError after the upload)
     · storage failure → no checklist write at all
     · delete: record FIRST (patchProjectCk, entry matched by PATH), storage
       remove second; a declined confirm writes nothing
     · after upload the module re-renders into the SAME host (lastHost)
     · non-admin → the host is emptied
     · labels carry no emoji; the accept list has no .doc/.docx

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_707.js [index.html] */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const open_ = SRC.indexOf('<script id="cr-wo-script">');
ok('cr-wo-script block found', open_ !== -1);
const close_ = SRC.indexOf('<\/script>', open_);
const code = SRC.slice(open_ + '<script id="cr-wo-script">'.length, close_);
console.log('  (sliced ' + code.length + ' chars of shipped module)');

function build(opts) {
  const dom = new JSDOM('<div id="host"></div><div class="cr-bidstrip"></div>');
  const doc = dom.window.document;
  const log = [];   /* ordered event log: 'upload','patch','rawupdate','remove' */
  const calls = { patches: [], alerts: [], confirms: 0, opens: [] };
  const pr = { id: 'job-7', checklist: JSON.stringify(opts.ck || {}) };
  const win = {
    currentProject: pr,
    currentUser: { email: opts.email || 'theo@cardinalrenovations.net' },
    projClaimType: () => 'community',
    parseCkAll: p => { try { return JSON.parse(p.checklist || '{}'); } catch (e) { return {}; } },
    patchProjectCk: async (p, patch) => {
      log.push('patch'); calls.patches.push(JSON.parse(JSON.stringify(patch)));
      const all = JSON.parse(p.checklist || '{}');
      Object.keys(patch).forEach(k => { all[k] = patch[k]; });
      p.checklist = JSON.stringify(all);
    },
    auditLog: () => {},
    open: u => { calls.opens.push(u); return {}; },
    supa: {
      storage: { from: () => ({
        upload: async () => { log.push('upload'); return opts.uploadFails ? { error: { message: 'boom' } } : { error: null }; },
        remove: async () => { log.push('remove'); return opts.removeFails ? { error: { message: 'gone' } } : { error: null }; },
        createSignedUrl: async () => ({ error: null, data: { signedUrl: 'https://x/y' } }),
        createSignedUrls: async () => ({ error: null, data: [] }),
      }) },
      from: () => ({ update: () => { log.push('rawupdate'); return { eq: async () => ({ error: null }) }; } }),
    },
  };
  const exportsBox = {};
  Object.defineProperty(win, 'CardinalWorkOrders', {
    set: v => { exportsBox.api = v; }, get: () => exportsBox.api, configurable: true });
  new Function('window', 'document', 'setInterval', 'clearInterval', 'setTimeout',
    'alert', 'confirm', 'signedPhotoMap',
    code)(
    win, doc, () => 0, () => {}, (fn) => { fn(); },
    m => calls.alerts.push(String(m)),
    () => { calls.confirms++; return opts.confirmAnswer !== false; },
    async () => ({}));
  return { dom, doc, win, pr, log, calls, api: exportsBox.api, host: doc.getElementById('host') };
}
const flush = () => new Promise(r => setTimeout(r, 0));

(async () => {
  const CK = { lead: { claim_type: 'community' }, work_orders: [
    { name: 'KH-Order-12.pdf', path: 'work_orders/job-7/1_KH.pdf', uploaded_by: 'theo@cardinalrenovations.net', uploaded_at: '2026-08-11T01:00:00Z', size: 5000, type: 'application/pdf' },
    { name: 'Punchlist.pdf', path: 'work_orders/job-7/2_PL.pdf', uploaded_by: 'joan@cardinalrenovations.net', uploaded_at: '2026-08-10T01:00:00Z', size: 900, type: 'application/pdf' },
  ] };

  /* ── 1 · host render parses the STRING checklist and shows real entries ── */
  let s = build({ ck: CK });
  ok('module exported CardinalWorkOrders', !!(s.api && s.api.render && s.api.canSee));
  s.api.render(s.host); await flush();
  let items = s.host.querySelectorAll('.cr-wo-item');
  ok('render(host) mounts the section INTO the host', !!s.host.querySelector('.cr-wo-section'));
  ok('the list shows the 2 real entries parsed from the STRING checklist', items.length === 2, items.length);
  ok('an item names its file with uploader + date meta',
    items[0] && items[0].textContent.includes('KH-Order-12.pdf') && items[0].textContent.includes('theo'));
  const sect = s.host.querySelector('.cr-wo-section').innerHTML;
  ok('no emoji in the section (settled rule)', !/[\uD83C-\uDBFF]/.test(sect));
  ok('accept list has no .doc/.docx (bucket refuses Word mimes)',
    !sect.includes('.doc') && sect.includes('.pdf'));

  /* ── 2 · upload: storage → patchProjectCk, no raw update, no throw ── */
  const input = s.host.querySelector('[data-wo-file]');
  Object.defineProperty(input, 'files', { value: [{ name: 'New Order #3.pdf', size: 777, type: 'application/pdf' }], configurable: true });
  await input.onchange(); await flush();
  ok('upload made NO raw projects.update and threw nothing',
    !s.log.includes('rawupdate') && s.calls.alerts.length === 0, JSON.stringify({ log: s.log, alerts: s.calls.alerts }));
  ok('upload wrote through patchProjectCk with the new entry FIRST',
    s.calls.patches.length === 1 && s.calls.patches[0].work_orders.length === 3 &&
    s.calls.patches[0].work_orders[0].name === 'New Order #3.pdf' &&
    s.calls.patches[0].work_orders[0].path.startsWith('work_orders/job-7/'),
    JSON.stringify(s.calls.patches[0] && s.calls.patches[0].work_orders.map(w => w.name)));
  ok('order: storage upload happened BEFORE the checklist write',
    s.log.indexOf('upload') !== -1 && s.log.indexOf('upload') < s.log.indexOf('patch'), s.log.join(','));
  ok('after upload the module re-rendered into the SAME host (3 items)',
    s.host.querySelectorAll('.cr-wo-item').length === 3, s.host.querySelectorAll('.cr-wo-item').length);

  /* ── 3 · storage failure → no checklist write ── */
  let s2 = build({ ck: CK, uploadFails: true });
  s2.api.render(s2.host); await flush();
  const in2 = s2.host.querySelector('[data-wo-file]');
  Object.defineProperty(in2, 'files', { value: [{ name: 'x.pdf', size: 1, type: 'application/pdf' }], configurable: true });
  await in2.onchange(); await flush();
  ok('a storage failure writes NO checklist entry and tells the user',
    s2.calls.patches.length === 0 && s2.calls.alerts.length === 1 && /Upload failed/.test(s2.calls.alerts[0]),
    JSON.stringify(s2.calls.alerts));

  /* ── 4 · delete: record first, matched by path; storage second ── */
  let s3 = build({ ck: CK });
  s3.api.render(s3.host); await flush();
  s3.host.querySelectorAll('.cr-wo-item')[1].querySelector('[data-act="delete"]').onclick(); await flush(); await flush();
  ok('delete confirmed once, wrote through patchProjectCk', s3.calls.confirms === 1 && s3.calls.patches.length === 1);
  ok('the PATH-matched entry went, the other stayed',
    s3.calls.patches[0].work_orders.length === 1 && s3.calls.patches[0].work_orders[0].name === 'KH-Order-12.pdf',
    JSON.stringify(s3.calls.patches[0] && s3.calls.patches[0].work_orders.map(w => w.name)));
  ok('order: the RECORD went before the storage object',
    s3.log.indexOf('patch') !== -1 && s3.log.indexOf('patch') < s3.log.indexOf('remove'), s3.log.join(','));

  let s4 = build({ ck: CK, confirmAnswer: false });
  s4.api.render(s4.host); await flush();
  s4.host.querySelectorAll('.cr-wo-item')[0].querySelector('[data-act="delete"]').onclick(); await flush();
  ok('a declined confirm deletes nothing', s4.calls.patches.length === 0 && !s4.log.includes('remove'));

  /* ── 5 · storage-remove failure tolerated (record already gone) ── */
  let s5 = build({ ck: CK, removeFails: true });
  s5.api.render(s5.host); await flush();
  s5.host.querySelectorAll('.cr-wo-item')[0].querySelector('[data-act="delete"]').onclick(); await flush(); await flush();
  ok('a failed storage remove still completes the delete (pennies-orphan stance)',
    s5.calls.patches.length === 1 && s5.calls.alerts.length === 0, JSON.stringify(s5.calls.alerts));

  /* ── 6 · non-admin: host emptied ── */
  let s6 = build({ ck: CK, email: 'nick@cardinalrenovations.net' });
  s6.api.render(s6.host); await flush();
  ok('a sales rep gets an EMPTY host (module gate holds in host mode)',
    s6.host.innerHTML === '' && s6.api.canSee() === false, s6.host.innerHTML.slice(0, 60));

  console.log('\nHARNESS 707: ' + (fail ? 'RED (' + fail + ' failed)' : 'GREEN') +
    '  (' + pass + ' passed, ' + fail + ' failed)  on ' + path.basename(FILE));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
