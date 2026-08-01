/* Gate for 524 — deleting an estimate.
 *
 * Runs the SHIPPED cr-est-script, not a re-implementation: the block is lifted
 * out of index.html and evaluated, then driven through its own exported
 * openEditor() / refreshSavedList() / deleteEstimate().
 *
 * The assertion that matters most is #4. `estimates` is RLS'd and PostgREST
 * answers a delete that matches no visible row with 204 and NO error, which is
 * byte-identical to success from the client's side. If deleteEstimate() ever
 * stops asking for the deleted ids back, the button becomes a lie that says
 * "done" and changes nothing. That is the whole reason this build ships a SQL
 * policy alongside it.
 */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2];
const html = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; fails.push(n); console.log('  ✗ ' + n + (x !== undefined ? '  <<< ' + JSON.stringify(x) : '')); }
};
const block = (id) => {
  const o = html.indexOf('<script id="' + id + '">');
  return html.slice(html.indexOf('>', o) + 1, html.indexOf('</script>', o));
};
const settle = () => new Promise(r => setTimeout(r, 40));
const until = async (f, n = 40) => { for (let i = 0; i < n; i++) { if (f()) return true; await settle(); } return false; };

/* ---- a Supabase stand-in that can be told to REFUSE the way RLS does ---- */
function makeSupa(rows, mode) {
  const calls = [];
  const q = (table) => {
    const st = { table, op: null, eq: {}, sel: null };
    const api = {
      select: (c) => { st.sel = c; return api; },
      eq: (k, v) => { st.eq[k] = v; return api; },
      order: () => api, limit: () => api, in: () => api,
      delete: () => { st.op = 'delete'; return api; },
      update: (p) => { st.op = 'update'; st.payload = p; return api; },
      insert: (p) => { st.op = 'insert'; st.payload = p; return api; },
      single: async () => ({ data: rows[0] || null, error: null }),
      maybeSingle: async () => ({ data: rows[0] || null, error: null }),
      then: (res) => {
        calls.push(JSON.parse(JSON.stringify(st)));
        if (st.op === 'delete') {
          if (mode === 'error') return res({ data: null, error: { message: 'boom' } });
          /* RLS refusal: 204, no error, zero rows - the trap */
          if (mode === 'rls-blocked') return res({ data: [], error: null });
          const i = rows.findIndex(r => r.id === st.eq.id);
          const gone = i >= 0 ? rows.splice(i, 1) : [];
          return res({ data: gone.map(r => ({ id: r.id })), error: null });
        }
        return res({ data: rows.slice(), error: null });
      },
    };
    return api;
  };
  return { client: { from: (t) => q(t) }, calls };
}

async function boot(mode, rows) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="projectView">' +
    '<button id="pNewEstimateBtn">New</button></div></body></html>',
    { pretendToBeVisual: true, runScripts: 'outside-only' });
  const w = dom.window;
  const { client, calls } = makeSupa(rows, mode);
  const seen = { confirms: [], alerts: [], audits: [] };
  Object.assign(w, {
    currentProject: { id: 'j1', name: 'Minnie Marsh', address: '3710 West Third' },
    confirm: (m) => { seen.confirms.push(m); return seen.answer !== false; },
    alert: (m) => { seen.alerts.push(m); },
    auditLog: (a, m, p) => { seen.audits.push([a, m, p]); },
  });
  Object.defineProperty(w, 'supa', { value: client, writable: false, configurable: true });
  w.eval('(function(){' + block('cr-est-script') + '})()');
  await until(() => w.CardinalEstimates && w.CardinalEstimates.deleteEstimate);
  return { w, calls, seen, dom };
}

(async () => {
  const EST = () => ([
    { id: 'e1', estimate_number: 'EST-1042', title: 'Roof replacement', status: 'draft', total: 14200, project_id: 'j1', photos: [], line_items: [] },
    { id: 'e2', estimate_number: 'EST-1043', title: 'Gutters', status: 'sent', total: 2100, project_id: 'j1', photos: [], line_items: [] },
  ]);

  console.log('\n== 1. it is exported, once, and there is one delete path ==');
  {
    const { w } = await boot('ok', EST());
    ok('CardinalEstimates.deleteEstimate is exported',
      typeof w.CardinalEstimates.deleteEstimate === 'function');
    const b = block('cr-est-script');
    ok('exactly one .delete() against estimates in the module  [' +
      (b.match(/from\('estimates'\)[\s\S]{0,40}?\.delete\(\)/g) || []).length + ']',
      (b.match(/from\('estimates'\)[\s\S]{0,40}?\.delete\(\)/g) || []).length === 1);
    ok('window.CardinalEstimates is merged, never plainly assigned',
      /window\.CardinalEstimates\s*=\s*Object\.assign/.test(b));
  }

  console.log('\n== 2. the saved list offers it, and the row click still opens ==');
  {
    const { w } = await boot('ok', EST());
    const slot = w.document.createElement('div');
    slot.id = 'cr-est-saved-slot'; slot.className = 'cr-est-saved-list';
    w.document.getElementById('projectView').appendChild(slot);
    await w.CardinalEstimates.refreshSavedList('j1');
    await until(() => slot.querySelectorAll('.cr-est-saved-row').length === 2);
    const rowsEl = slot.querySelectorAll('.cr-est-saved-row');
    ok('both estimates rendered  [' + rowsEl.length + ']', rowsEl.length === 2);
    const dels = slot.querySelectorAll('.rowdel');
    ok('every row carries a delete control  [' + dels.length + ']', dels.length === 2);
    ok('...each addressing its own estimate',
      Array.from(dels).map(d => d.dataset.del).join() === 'e1,e2',
      Array.from(dels).map(d => d.dataset.del));
    ok('the control sits INSIDE the row, so it must stop propagation',
      dels[0].closest('.cr-est-saved-row') === rowsEl[0]);
    ok('the row itself still opens the editor', typeof rowsEl[0].onclick === 'function');
  }

  console.log('\n== 3. a confirmed delete really deletes, and reports it ==');
  {
    const { w, calls, seen } = await boot('ok', EST());
    const slot = w.document.createElement('div');
    slot.id = 'cr-est-saved-slot'; slot.className = 'cr-est-saved-list';
    w.document.getElementById('projectView').appendChild(slot);
    await w.CardinalEstimates.refreshSavedList('j1');
    await until(() => slot.querySelectorAll('.rowdel').length === 2);

    const out = await w.CardinalEstimates.deleteEstimate('e1', { label: 'Roof replacement', projectId: 'j1' });
    ok('it asked first  [' + (seen.confirms[0] || '').slice(0, 44) + '…]', seen.confirms.length === 1);
    ok('...naming the estimate, not just "this"', /Roof replacement/.test(seen.confirms[0] || ''));
    ok('...and saying it cannot be undone', /cannot be undone/i.test(seen.confirms[0] || ''));
    ok('it returned true', out === true);
    ok('no alert on the happy path  [' + seen.alerts.length + ']', seen.alerts.length === 0, seen.alerts);
    const d = calls.filter(c => c.op === 'delete');
    ok('one delete, against estimates, keyed by id  [' + JSON.stringify(d[0] && d[0].eq) + ']',
      d.length === 1 && d[0].table === 'estimates' && d[0].eq.id === 'e1', d);
    ok('it asked for the deleted ids back — the RLS no-op guard  [' + (d[0] && d[0].sel) + ']',
      !!d[0] && d[0].sel === 'id', d[0]);
    ok('it wrote an audit entry  [' + JSON.stringify(seen.audits[0]) + ']',
      seen.audits.length === 1 && seen.audits[0][0] === 'estimate_delete', seen.audits);
    await until(() => slot.querySelectorAll('.cr-est-saved-row').length === 1);
    ok('the list refreshed to one row  [' + slot.querySelectorAll('.cr-est-saved-row').length + ']',
      slot.querySelectorAll('.cr-est-saved-row').length === 1);
    ok('...and the surviving row is the other estimate',
      (slot.querySelector('.rowdel') || {}).dataset.del === 'e2');
  }

  console.log('\n== 4. THE ONE THAT MATTERS — RLS refuses, 204 and no error ==');
  {
    const rows = EST();
    const { w, seen } = await boot('rls-blocked', rows);
    const out = await w.CardinalEstimates.deleteEstimate('e1', { label: 'Roof replacement', projectId: 'j1' });
    ok('it returned false rather than claiming success', out === false);
    ok('it told the user  [' + (seen.alerts[0] || '').slice(0, 52) + '…]', seen.alerts.length === 1, seen.alerts);
    ok('...and explained it is a permission thing, not a crash',
      /you can delete estimates you created/i.test(seen.alerts[0] || ''), seen.alerts[0]);
    ok('nothing was actually removed  [' + rows.length + ']', rows.length === 2);
    ok('no audit entry was written for a delete that did not happen',
      seen.audits.length === 0, seen.audits);
  }

  console.log('\n== 5. declining, and a real error ==');
  {
    const { w, calls, seen } = await boot('ok', EST());
    seen.answer = false;
    const out = await w.CardinalEstimates.deleteEstimate('e1', {});
    ok('saying no deletes nothing', out === false && calls.filter(c => c.op === 'delete').length === 0);
    ok('...and does not alert', seen.alerts.length === 0, seen.alerts);
  }
  {
    const rows = EST();
    const { w, seen } = await boot('error', rows);
    const out = await w.CardinalEstimates.deleteEstimate('e1', {});
    ok('a database error returns false', out === false);
    ok('...and surfaces the message  [' + (seen.alerts[0] || '') + ']',
      /Could not delete/.test(seen.alerts[0] || ''), seen.alerts);
    ok('...leaving the row alone  [' + rows.length + ']', rows.length === 2);
  }

  console.log('\n== 6. the editor button exists only once there is something to delete ==');
  {
    const b = block('cr-est-script');
    ok('Delete is rendered only when s.id is set',
      /\(s\.id \? '<button class="danger" data-act="del"/.test(b));
    ok('...and wire() guards it, unlike its unconditional neighbours',
      /var delBtn = view\.querySelector\('\[data-act="del"\]'\);\s*\n?if\(delBtn\)/.test(b));
    ok('the row control stops propagation before the row opens the editor',
      /ev\.stopPropagation\(\);/.test(b));
    ok('deleting the open estimate closes the editor', /if\(state && state\.id === id\)\{ close\(\); \}/.test(b));
  }

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('failed:\n  - ' + fails.join('\n  - ')); process.exit(1); }
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
