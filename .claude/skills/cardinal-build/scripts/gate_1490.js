// jsdom gate for build 1489: crew invoice reader → review card → one job_costs row
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const file = process.argv[2] || '../index_v1490.html';
const html = fs.readFileSync(file, 'utf8');
const vc = new VirtualConsole();
const realErrors = [];
vc.on('jsdomError', e => { const m = String(e && e.message || e); if (!/Not implemented|canvas|scrollTo|matchMedia|getContext/i.test(m)) realErrors.push(m.slice(0, 160)); });
const inserts = [], selects = [], posts = [], refreshed = [];
let existingCosts = [];
function table(name) {
  const q = { name, filters: [] };
  const api = {
    select() { return api; }, eq(k, v) { q.filters.push([k, v]); return api; },
    insert(row) { inserts.push({ name, row }); q.ins = row; if (insertFailOnFile && row.file_path) q.fail = true; return api; },
    then(res) {
      if (q.ins) return q.fail ? res({ data: null, error: { message: 'column "file_bucket" of relation "job_costs" does not exist' } }) : res({ data: [{ id: 'new1' }], error: null });
      selects.push(q); return res({ data: name === 'job_costs' ? existingCosts : [], error: null });
    }
  };
  return api;
}
const uploads = [], removed = [], downloads = [];
let insertFailOnFile = false;
const storage = { from: b => ({ upload: async (k, f, o) => { uploads.push({ b, k, f, o }); return { data: { path: k }, error: null }; }, remove: async a => { removed.push({ b, a }); return { error: null }; }, download: async p => { downloads.push({ b, p }); return { data: new Blob(['x'], { type: 'application/pdf' }), error: null }; } }) };
const supa = { storage, from: table, auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } };
const invoice = { crew_name: 'Francisco Gutters', invoice_number: '4411', invoice_date: '2026-11-20', job_address: '8952 Salem Rd, Lewisburg', customer_name: 'Pat Sample', job_ref: '',
  lines: [{ description: 'Seamless gutter 6in', qty: 120, unit: 'LF', rate: 8, amount: 960 }, { description: 'Leaf guard', qty: 120, unit: 'LF', rate: 3, amount: 360 }], subtotal: 1320, tax: null, total: 1320, notes: '' };
const projects = [
  { id: 'pA', name: 'Pat Sample', stage: 'Completed', address: '8952 Salem Rd, Lewisburg OH', city: 'Lewisburg', created_at: '2026-10-01T00:00:00Z', checklist: '{"po":1401}' },
  { id: 'pB', name: 'Someone Else', stage: 'Lead', address: '100 Main St, Dayton OH', city: 'Dayton', created_at: '2026-10-02T00:00:00Z', checklist: '{"po":1402}' },
];
let isOffice = true;
const dom = new JSDOM(html, {
  runScripts: 'dangerously', url: 'https://app.cardinalroster.com/', virtualConsole: vc, pretendToBeVisual: true,
  beforeParse(w) {
    Object.defineProperty(w.HTMLElement.prototype, 'offsetParent', { get() { return this.parentNode; } });
    Object.defineProperty(w, 'supa', { value: supa, writable: false });
    Object.defineProperty(w, 'sb', { value: supa, writable: false });
    w.scrollTo = () => {};
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    w.fetch = async (url, o) => {
      if (String(url).indexOf('/api/crew-invoice') !== -1) { posts.push(JSON.parse(o.body)); return { ok: true, json: async () => ({ ok: true, invoice, via: 'test' }) }; }
      return { ok: false, json: async () => ({}) };
    };
  }
});
const w = dom.window;
let fails = 0;
const check = (label, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) fails++; };
const tick = ms => new Promise(r => setTimeout(r, ms));
setTimeout(async () => {
  try {
    w.cacheProjects = projects;
    w.currentUser = { email: 'theo@cardinalrenovations.net' };
    w.commFullAccess = () => isOffice;
    w.CardinalJobPay = Object.assign(w.CardinalJobPay || {}, { refresh: pid => refreshed.push(pid) });
    check('module exported', w.CardinalCrewInvoice && typeof w.CardinalCrewInvoice.open === 'function');
    // matcher on its own
    const mt = w.CardinalCrewInvoice.matchJob(invoice);
    check('matcher picks the Salem Rd job by address', mt && mt.p.id === 'pA');
    check('matcher refuses a weak match', w.CardinalCrewInvoice.matchJob({ job_address: '5 Nowhere Ln', customer_name: 'Zed' }) === null);
    // the Costs tab button is drawn by the REAL builder: prove the markup string is in the shipped file
    check('Costs tab draws the button for office only', html.includes("(office ? '<button type=\"button\" class=\"crji-btn\" data-crinv-open=\"' + E(pid) + '\">Read crew invoice</button>' : '')"));
    // open from hash entry (no job preselected)
    w.CardinalCrewInvoice.open({});
    const m = w.document.getElementById('cr-crinv');
    check('sheet opens with the picker', m && m.matches('.on') && !!w.document.getElementById('ci-file'));
    // drive read() through the real change handler with a fake PDF
    const fileInput = w.document.getElementById('ci-file');
    const f = new w.File(['%PDF-1.4 test'], 'inv.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileInput, 'files', { value: [f] });
    fileInput.dispatchEvent(new w.Event('change', { bubbles: true }));
    await tick(400);
    check('1490: original saved to crew-docs under invoices/YYYY-MM/', uploads.length === 1 && uploads[0].b === 'crew-docs' && /^invoices\/\d{4}-\d{2}\/[\w.\-]+$/.test(uploads[0].k) && uploads[0].k.endsWith('-inv.pdf'));
    check('1490: PDF read by storage path, no file in the body', posts.length === 1 && posts[0].mime === 'application/pdf' && posts[0].storage_path === uploads[0].k && !posts[0].file);
    check('review card shows the matched job selected', w.document.getElementById('ci-job').value === 'pA' && /Matched by address/.test(w.document.getElementById('ci-box').textContent));
    check('fields prefilled from the invoice', w.document.getElementById('ci-crew').value === 'Francisco Gutters' && w.document.getElementById('ci-no').value === '4411' && w.document.getElementById('ci-amt').value === '1320' && w.document.getElementById('ci-date').value === '2026-11-20');
    check('both lines listed, nothing saved yet', w.document.querySelectorAll('.ci-line').length === 2 && inserts.length === 0);
    // duplicate guard: an existing cost mentions #4411
    existingCosts = [{ id: 'c0', description: 'Crew invoice #4411 · Francisco Gutters' }];
    w.document.querySelector('[data-ci-apply]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await tick(200);
    check('duplicate invoice # warns and does not save', inserts.length === 0 && /already has a cost for invoice 4411/.test(w.document.getElementById('ci-box').textContent));
    // edit the total, apply again (second tap after the warning saves)
    const amt = w.document.getElementById('ci-amt'); amt.value = '1,320.00'; amt.dispatchEvent(new w.Event('change', { bubbles: true }));
    w.document.querySelector('[data-ci-apply]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await tick(200);
    const row = inserts[0] && inserts[0].row;
    check('one job_costs row inserted', inserts.length === 1 && inserts[0].name === 'job_costs');
    check('row shape matches the Costs tab (labor, company, no reimburse)', row && row.project_id === 'pA' && row.kind === 'labor' && row.amount === 1320 && row.paid_by === 'company' && row.reimburse === false && row.spent_on === '2026-11-20' && row.created_by === 'theo@cardinalrenovations.net');
    check('description names invoice # and crew', row && row.description === 'Crew invoice #4411 · Francisco Gutters');
    check('1490: cost linked to the original file', row && row.file_bucket === 'crew-docs' && row.file_path === uploads[0].k && row.file_name === 'inv.pdf');
    check('1490: an applied upload is NOT removed', removed.length === 0);
    check('sheet closed and the job card refreshed', !m.matches('.on') && refreshed.join() === 'pA');
    // 1490: read then Cancel -> the unapplied upload is removed
    w.CardinalCrewInvoice.open({ pid: 'pA' });
    let fi2 = w.document.getElementById('ci-file');
    Object.defineProperty(fi2, 'files', { value: [new w.File(['%PDF'], 'c.pdf', { type: 'application/pdf' })] });
    fi2.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(400);
    w.document.querySelector('[data-ci-close]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    check('1490: Cancel removes the unapplied original', removed.length === 1 && removed[0].b === 'crew-docs' && removed[0].a[0] === uploads[1].k);
    // 1490: SQL not run yet -> cost still saved without the link
    insertFailOnFile = true; existingCosts = [];
    w.CardinalCrewInvoice.open({ pid: 'pA' });
    fi2 = w.document.getElementById('ci-file');
    Object.defineProperty(fi2, 'files', { value: [new w.File(['%PDF'], 'd.pdf', { type: 'application/pdf' })] });
    fi2.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(400);
    const before = inserts.length;
    w.document.querySelector('[data-ci-apply]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await tick(300);
    check('1490: missing columns -> retried without the link and saved', inserts.length === before + 2 && !inserts[inserts.length - 1].row.file_path && !w.document.getElementById('cr-crinv').matches('.on'));
    insertFailOnFile = false;
    // 1490: View invoice opens the original from crew-docs
    w.open = () => ({ closed: false, location: '', close() {} });
    w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
    const vb = w.document.createElement('button'); vb.setAttribute('data-crinv-view', 'invoices/2026-11/z-inv.pdf'); vb.setAttribute('data-crinv-bucket', 'crew-docs'); w.document.body.appendChild(vb);
    vb.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await tick(100);
    check('1490: View invoice downloads the original from crew-docs', downloads.length === 1 && downloads[0].b === 'crew-docs' && downloads[0].p === 'invoices/2026-11/z-inv.pdf');
    const vb2 = w.document.createElement('button'); vb2.setAttribute('data-crinv-view', 'x/y.pdf'); vb2.setAttribute('data-crinv-bucket', 'job-files'); w.document.body.appendChild(vb2);
    vb2.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await tick(100);
    check('1490: any other bucket is ignored', downloads.length === 1);
    check('1490: Costs row draws View invoice only for crew-docs files, office only', html.includes("if(r.k === 'cost' && r.raw && r.raw.file_path && r.raw.file_bucket === 'crew-docs' && isOffice()){"));
    // non-office login: refused before any upload
    isOffice = false;
    w.CardinalCrewInvoice.open({ pid: 'pB' });
    check('non-office sees "office only" and no picker', /office only/.test(w.document.getElementById('ci-box').textContent) && !w.document.getElementById('ci-file'));
    // escaping: hostile invoice text never becomes markup
    isOffice = true;
    invoice.crew_name = '<img src=x onerror=1>'; invoice.notes = '<b>bold</b>'; invoice.lines = [{ description: '<script>x</script>', amount: 1 }];
    w.CardinalCrewInvoice.open({ pid: 'pA' });
    const fi = w.document.getElementById('ci-file');
    Object.defineProperty(fi, 'files', { value: [new w.File(['%PDF'], 'b.pdf', { type: 'application/pdf' })] });
    fi.dispatchEvent(new w.Event('change', { bubbles: true }));
    await tick(400);
    const box = w.document.getElementById('ci-box');
    check('invoice text is escaped (no img/b/script elements)', !box.querySelector('img,b,script') && w.document.getElementById('ci-crew').value === '<img src=x onerror=1>');
  } catch (e) { check('harness ran without throwing: ' + e.message, false); }
  if (realErrors.length) console.log('boot errors (not failing):', realErrors.slice(0, 4));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
}, 4000);
