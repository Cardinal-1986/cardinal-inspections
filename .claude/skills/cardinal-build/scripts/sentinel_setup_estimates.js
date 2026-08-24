/* sentinel_setup_estimates.js — the POPULATED manual-estimates walk.
 *
 *   node sentinel.js index.html \
 *        --setup sentinel_setup_cardinal.js,sentinel_setup_estimates.js,e2e_mock_supa.js \
 *        --themes default,rb-light --viewports 390x844,1194x834
 *
 * Runs AFTER sentinel_setup_cardinal.js (it extends that file's __SEED__ — the
 * base walk seeds estimates:[] deliberately, so the estimates screens it sweeps
 * are the EMPTY states) and BEFORE e2e_mock_supa.js (the mock reads __SEED__ at
 * its own execution time — the same ordering trap the cardinal setup's banner
 * records). It REPLACES __sentinelStates with five estimates-only states:
 * eslist (Menu → Estimates, four statuses incl. accepted + declined),
 * esteditor (the obsidian builder on an itemized draft), estlibrary (the
 * Add-from-Library sheet), estpreview (the publish preview), estprofile
 * (the client tab with BOTH product lists — table estimates and a published
 * estimate document).
 *
 * Written for the 23 Aug 2026 manual-estimates audit
 * (docs/CR_MANUAL_ESTIMATES_AUDIT_2026-08.md) — the run that found the Total
 * at 1.98:1. Keep it beside the sentinel: these five screens carry the app's
 * money and had never been swept populated. */
(function () {
  'use strict';
  if (!window.__SEED__) { throw new Error('est_audit_setup: __SEED__ missing — order the setup files cardinal,THIS,mock'); }

  var P1 = { name: 'Mark Diamond', address: '7990 Germantown Pike' };
  var LINES3 = [
    { name: 'Architectural shingles, installed', description: 'OC Duration per square, incl. synthetic underlayment and starter.', qty: 32, unit: 'SQ', unit_price: 385, amount: 12320, library_id: 'l1' },
    { name: 'Tear-off, one layer', description: 'Remove and haul one layer of three-tab.', qty: 32, unit: 'SQ', unit_price: 65, amount: 2080, library_id: 'l2' },
    { name: 'Drip edge to code, all eaves and rakes', description: 'ORC / local amendment.', qty: 116, unit: 'LF', unit_price: 3.1, amount: 359.6, library_id: 'l11' }
  ];
  window.__SEED__.estimates = [
    { id: 'e1', project_id: 'p1', estimate_number: 'EST-2026-0896', title: 'Roof Replacement — Mark Diamond',
      status: 'accepted', line_items: LINES3.slice(0, 2), photos: [], itemized: true,
      subtotal: '14400.00', discount: '0.00', total: '14400.00', deposit_pct: 0, deposit_amount: '0.00',
      valid_days: 30, valid_through: '2026-09-15', notes: 'Includes ridge vent cut-in.', payment_instructions: 'A 30% deposit is due at contract signing.',
      archived: false, created_at: '2026-08-18T14:00:00Z', updated_at: '2026-08-21T09:00:00Z',
      created_by: 'theo@cardinalrenovations.net', doc_id: 'd1', contract_doc_id: null, projects: P1 },
    { id: 'e2', project_id: 'p1', estimate_number: 'EST-2026-0902', title: 'Gutter Replacement — Mark Diamond',
      status: 'sent', line_items: [{ name: 'Seamless gutters, whole house', description: '6" K-style, .032 aluminium.', amount: 3150 }], photos: [], itemized: false,
      subtotal: '3150.00', discount: '0.00', total: '3150.00', deposit_pct: 30, deposit_amount: '945.00',
      valid_days: 30, valid_through: '2026-09-12', notes: '', payment_instructions: '',
      archived: false, created_at: '2026-08-13T10:00:00Z', updated_at: '2026-08-14T10:00:00Z',
      created_by: 'theo@cardinalrenovations.net', doc_id: null, contract_doc_id: null, projects: P1 },
    { id: 'e3', project_id: 'p2', estimate_number: 'EST-2026-0907', title: 'Siding — Kathy May',
      status: 'draft', line_items: LINES3, photos: [], itemized: true,
      subtotal: '14759.60', discount: '359.60', total: '14400.00', deposit_pct: 30, deposit_amount: '4320.00',
      valid_days: 30, valid_through: '2026-09-20', notes: '', payment_instructions: '',
      archived: false, created_at: '2026-08-20T10:00:00Z', updated_at: '2026-08-20T10:00:00Z',
      created_by: 'theo@cardinalrenovations.net', doc_id: null, contract_doc_id: null, projects: { name: 'Kathy May', address: '145 Rosemont Blvd' } },
    { id: 'e4', project_id: 'p2', estimate_number: 'EST-2026-0910', title: 'Repair — Kathy May',
      status: 'declined', line_items: [{ name: 'Chimney flashing, step and counter', qty: 1, unit: 'LS', unit_price: 850, amount: 850 }], photos: [], itemized: true,
      subtotal: '850.00', discount: '0.00', total: '850.00', deposit_pct: 30, deposit_amount: '255.00',
      valid_days: 30, valid_through: '2026-09-01', notes: '', payment_instructions: '',
      archived: false, created_at: '2026-08-10T10:00:00Z', updated_at: '2026-08-11T10:00:00Z',
      created_by: 'theo@cardinalrenovations.net', doc_id: null, contract_doc_id: null, projects: { name: 'Kathy May', address: '145 Rosemont Blvd' } }
  ];
  window.__SEED__.inspection_reports = [
    { id: 'd1', project_id: 'p1', project_name: 'Mark Diamond', title: 'EST-2026-0896 — Roof Replacement — Mark Diamond',
      html: '<!doctype html><html><body><p>doc</p></body></html>', status: 'sent',
      created_at: '2026-08-18T15:00:00Z', updated_at: '2026-08-21T09:05:00Z', sent_at: '2026-08-18T16:00:00Z',
      created_by: 'theo@cardinalrenovations.net' }
  ];

  function pause(ms) { return new Promise(function (r) { setTimeout(r, ms || 420); }); }
  function leaveLanding() {
    ['landingView', 'loginView'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) { e.style.display = 'none'; if (e.classList) e.classList.remove('open'); }
    });
  }
  function closeDrawer() {
    document.body.classList.remove('cr-drawer-open', 'cr-drawer-lift');
    var m = document.getElementById('navMenu');
    if (m) m.classList.remove('open', 'show');
  }
  function closeAll() {
    closeDrawer();
    try { if (window.CardinalLineItems && window.CardinalLineItems.close) window.CardinalLineItems.close(); } catch (e) {}
    try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {}
    var pk = document.getElementById('cr-est-picker');
    if (pk) pk.classList.remove('open');
    var pv = document.getElementById('cr-epub-preview');
    if (pv) pv.classList.remove('open');
  }
  function myEstRow(id) {
    return (window.__SEED__.estimates || []).filter(function (r) { return r.id === id; })[0] || null;
  }
  function proj(id) {
    return (window.cacheProjects || []).filter(function (p) { return p.id === id; })[0] || null;
  }

  window.__sentinelStates = [
    { name: 'eslist', run: async function () {
        leaveLanding(); closeAll();
        if (typeof window.crOpenEstimates === 'function') window.crOpenEstimates();
        else if (window.CardinalEstimates && window.CardinalEstimates.open) window.CardinalEstimates.open();
        else throw new Error('no estimates opener');
        await pause(900); } },
    { name: 'esteditor', run: async function () {
        leaveLanding(); closeAll();
        var row = myEstRow('e3');
        var p = proj('p2') || { id: 'p2', name: 'Kathy May', address: '145 Rosemont Blvd' };
        if (!window.CardinalEstimates || !window.CardinalEstimates.openEditor) throw new Error('openEditor missing');
        window.CardinalEstimates.openEditor(p, row);
        await pause(900); } },
    { name: 'estlibrary', run: async function () {
        leaveLanding(); closeAll();
        var row = myEstRow('e3');
        var p = proj('p2') || { id: 'p2', name: 'Kathy May', address: '145 Rosemont Blvd' };
        window.CardinalEstimates.openEditor(p, row);
        await pause(700);
        var b = document.querySelector('#cr-est-view [data-act="add-lib"]');
        if (!b) throw new Error('add-lib button not found');
        b.click(); await pause(700); } },
    { name: 'estpreview', run: async function () {
        leaveLanding(); closeAll();
        var row = myEstRow('e1');
        var p = proj('p1') || { id: 'p1', name: 'Mark Diamond', address: '7990 Germantown Pike' };
        window.CardinalEstimates.openEditor(p, row);
        await pause(900); /* epub injects its buttons via a rAF-coalesced observer */
        var b = document.getElementById('cr-epub-preview-btn');
        if (!b) throw new Error('preview button was not injected');
        b.click();
        await pause(1200);
        var pv = document.getElementById('cr-epub-preview');
        if (!pv || !pv.classList.contains('open')) throw new Error('preview did not open'); } },
    { name: 'estprofile', run: async function () {
        leaveLanding(); closeAll();
        if (typeof openProject !== 'function') throw new Error('openProject missing');
        openProject('p1'); await pause(800);
        if (typeof showTab === 'function') showTab('estimates');
        await pause(900); } }
  ];
})();
