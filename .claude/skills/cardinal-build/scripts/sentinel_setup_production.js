/* sentinel_setup_production.js — the PRODUCTION-side walk, populated.
 * Load order: sentinel_setup_cardinal.js, THIS, e2e_mock_supa.js.
 * (Same convention as sentinel_setup_estimates.js — this file extends the base
 * seed and REPLACES __sentinelStates with production-audit states.)
 *
 * Adds what the base seed lacks for a full board sweep (24 Aug 2026 audit):
 *  - a kind:'job' appointment (schedFor reads ONLY kind 'job' — 766's truth),
 *    so the Scheduled box holds a real date instead of everything reading
 *    "Needs a date";
 *  - a project with checklist.materials_ordered_at (the Ordered box);
 *  - a second Approved project with nothing ordered (Needs-ordered x2);
 *  - SOP steps on i1 (the punch card's checklist renders + the note gate);
 *  - a Completed-stage project (closed-repairs history).
 * Personas ride the base setup's ?as= param (curtis / scottie / nick). */
(function () {
  'use strict';
  if (!window.__SEED__) { throw new Error('production setup: __SEED__ missing — order the setup files cardinal,THIS,mock'); }

  function ck(extra) {
    var base = { lead_source: 'Referral' };
    for (var k in (extra || {})) base[k] = extra[k];
    return JSON.stringify(base);
  }
  function dayKey(offset) {
    var d = new Date(Date.now() + (offset || 0) * 86400000);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  window.__SEED__.projects.push(
    { id: 'p4', name: 'Harold Bench', address: '212 Wayne Ave', city: 'Dayton', state: 'OH', zip: '45410',
      stage: 'Approved', created_by: 'theo@cardinalrenovations.net', sales_rep: 'nick@cardinalrenovations.net',
      checklist: ck({ materials_ordered_at: '2026-08-20T14:00:00Z', materials_ordered_by: 'curtis@cardinalrenovations.net' }),
      phone: '937-555-0101', email: null, crm: 'retail',
      created_at: '2026-08-08T10:00:00Z', updated_at: '2026-08-20T14:00:00Z', stage_since: '2026-08-14T10:00:00Z' },
    { id: 'p5', name: 'Dena Whitmore', address: '48 Creekside Ct', city: 'Kettering', state: 'OH', zip: '45429',
      stage: 'Approved', created_by: 'joan@cardinalrenovations.net', sales_rep: null,
      checklist: ck(null), phone: null, email: 'dena@example.com', crm: 'retail',
      created_at: '2026-08-12T10:00:00Z', updated_at: '2026-08-21T10:00:00Z', stage_since: '2026-08-18T10:00:00Z' },
    { id: 'p6', name: 'Ray & Alma Fitch', address: '990 Shroyer Rd', city: 'Dayton', state: 'OH', zip: '45419',
      stage: 'Completed', created_by: 'theo@cardinalrenovations.net', sales_rep: null,
      checklist: ck(null), phone: '937-555-0122', email: null, crm: 'retail',
      created_at: '2026-07-20T10:00:00Z', updated_at: '2026-08-15T10:00:00Z', stage_since: '2026-08-15T10:00:00Z' }
  );

  /* the REAL schedule: appointments of kind 'job'. p2 (already stage
     Scheduled) gets its install date two days out; keys match what the
     appointments table holds (appt_date/appt_time per the app's readers,
     `when` kept for the base rows' shape). */
  window.__SEED__.appointments.push(
    { id: 'a3', project_id: 'p2', kind: 'job', appt_date: dayKey(2), appt_time: '08:30',
      when: new Date(Date.now() + 2 * 86400000).toISOString(), note: 'Tear-off + install',
      created_by: 'theo@cardinalrenovations.net' }
  );

  /* SOP steps on i1 so the card's checklist + note-gated ticking render */
  (function () {
    var i1 = (window.__SEED__.punch_items || []).filter(function (r) { return r.id === 'i1'; })[0];
    if (i1) {
      i1.template = 'roofing';
      /* the app's step shape is { t, d, req, note, by, at } — `d` is the tick
         (tickStep flips s.d), req gates the tick behind a written note */
      i1.steps = [
        { t: 'Photograph the damage before touching anything', d: true, note: 'Two overview shots taken', by: 'curtis@cardinalrenovations.net', at: '2026-08-23T14:00:00Z' },
        { t: 'Match shingle color and pull stock', d: false, req: true, note: '' },
        { t: 'Replace damaged shingles, seal exposed nails', d: false, note: '' }
      ];
    }
  })();

  var PAUSE = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 420); }); };
  function leaveLanding() {
    ['landingView', 'loginView'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) { e.style.display = 'none'; if (e.classList) e.classList.remove('open'); }
    });
  }
  function closeAll() {
    document.body.classList.remove('cr-drawer-open', 'cr-drawer-lift');
    var m = document.getElementById('navMenu');
    if (m) m.classList.remove('open', 'show');
    try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {}
  }

  window.__sentinelStates = [
    { name: 'prodhome', run: async function () {
        leaveLanding(); closeAll();
        if (!window.CardinalProduction) throw new Error('CardinalProduction missing');
        await window.CardinalProduction.open();
        await PAUSE(700); } },
    { name: 'prodcal', run: async function () {
        leaveLanding(); closeAll();
        await window.CardinalProduction.open();
        await PAUSE(500);
        var go = document.querySelector('#cr-pb [data-go="cal"]');
        if (!go) throw new Error('[data-go="cal"] not rendered');
        go.click(); await PAUSE(600); } },
    { name: 'prodbox', run: async function () {
        leaveLanding(); closeAll();
        await window.CardinalProduction.open();
        await PAUSE(500);
        var b = document.querySelector('#cr-pb [data-box]');
        if (!b) throw new Error('no [data-box] tile rendered');
        b.click(); await PAUSE(600); } },
    { name: 'punchcard', run: async function () {
        leaveLanding(); closeAll();
        if (!window.CardinalPunchCard) throw new Error('CardinalPunchCard missing');
        await window.CardinalPunchCard.open('i1', { back: 'production' });
        await PAUSE(800); } },
    { name: 'punchlist', run: async function () {
        leaveLanding(); closeAll();
        if (typeof window.openPunchView !== 'function') throw new Error('openPunchView missing');
        window.openPunchView(); await PAUSE(800); } },
    { name: 'dispatch', run: async function () {
        leaveLanding(); closeAll();
        if (!window.CardinalDispatch) throw new Error('CardinalDispatch missing');
        await window.CardinalDispatch.open(); await PAUSE(800); } }
  ];
})();
