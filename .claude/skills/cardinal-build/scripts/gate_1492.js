// jsdom gate for build 1492: Crews › Invoices tab, check photos + check↔invoice links, reader files crew bills,
// job Costs counts a bill once. Boots the REAL file and drives the real CardinalCrews / CardinalCrewInvoice / CardinalJobPay.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const file = process.argv[2] || '../index_v1492.html';
const html = fs.readFileSync(file, 'utf8');
const vc = new VirtualConsole();
const T = {
  crews: [{ id: 'cF', name: 'Sam Sample', legal_name: 'Sample Gutter Co', trade: 'Gutters', archived: false }],
  crew_docs: [], crew_notes: [], pricing_items: [], crew_rates: [], punch_items: [], crew_work_orders: [], collections: [], commissions: [], draws: [], job_costs: [],
  crew_payments: [
    { id: 'pay1', crew_id: 'cF', amount: 3965.25, method: 'check', reference: 'Chase check #2100', paid_on: '2026-01-05', memo: 'Lonsdale', project_id: 'pL' },
    { id: 'pay2', crew_id: 'cF', amount: 4103.5, method: 'check', reference: 'Chase check #1610', paid_on: '2026-01-20', memo: '', project_id: null }],
  crew_invoices: [
    { id: 'inv1', crew_id: 'cF', project_id: 'pL', invoice_number: '447171', invoice_date: '2025-12-31', total: 3965.25, pay_status: 'auto' },
    { id: 'inv2', crew_id: 'cF', project_id: 'pS', invoice_number: '236828', invoice_date: '2026-11-06', total: 810, pay_status: 'auto', file_bucket: 'crew-docs', file_path: 'invoices/2026-11/a-inv.jpg', file_name: 'a-inv.jpg' },
    { id: 'inv3', crew_id: 'cF', project_id: 'pS', invoice_number: '236844', invoice_date: '2026-11-23', total: 561, pay_status: 'auto' },
    { id: 'inv4', crew_id: 'cF', project_id: 'pR', invoice_number: '236822', invoice_date: '2026-10-30', total: 4626, pay_status: 'auto' },
    { id: 'inv5', crew_id: 'cF', project_id: null, invoice_number: '529214', invoice_date: '2025-09-15', total: 1163.5, pay_status: 'unknown', job_address: '4003 Old Riverside Dr, Dayton' },
    { id: 'inv6', crew_id: 'cF', project_id: 'pX', invoice_number: '236828', invoice_date: '2026-11-07', total: 810, pay_status: 'auto' }],
  crew_payment_invoices: [{ payment_id: 'pay1', invoice_id: 'inv1', amount: 3965.25 }]
};
const writes = [], uploads = [], removed = [];
function builder(name) {
  const q = { name, f: [], op: 'select' };
  const b = {
    select() { return b; }, order() { return b; }, not() { return b; }, single() { return b; },
    eq(k, v) { q.f.push(['eq', k, v]); return b; }, in(k, v) { q.f.push(['in', k, v]); return b; },
    insert(row) { q.op = 'insert'; q.row = row; writes.push({ t: name, op: 'insert', row }); return b; },
    update(row) { q.op = 'update'; q.row = row; writes.push({ t: name, op: 'update', row, q }); return b; },
    delete() { q.op = 'delete'; writes.push({ t: name, op: 'delete', q }); return b; },
    then(res, rej) {   /* like supabase-js: a real promise, so .then().then() chains */
      let payload;
      if (q.op === 'insert') { const rows = Array.isArray(q.row) ? q.row : [q.row]; payload = { data: rows.map((r, i) => Object.assign({ id: 'new' + i }, r)), error: null }; }
      else if (q.op !== 'select') payload = { data: [], error: null };
      else { let rows = (T[name] || []).slice(); q.f.forEach(([o, k, v]) => { rows = rows.filter(r => o === 'eq' ? r[k] === v : v.indexOf(r[k]) !== -1); }); payload = { data: rows, error: null }; }
      return Promise.resolve(payload).then(res, rej);
    }
  };
  return b;
}
const storage = { from: bk => ({
  upload: async (k, f, o) => { uploads.push({ bk, k }); return { data: { path: k }, error: null }; },
  remove: async a => { removed.push({ bk, a }); return { error: null }; },
  download: async () => ({ data: null, error: { message: 'x' } }),
  createSignedUrl: async p => ({ data: { signedUrl: 'https://signed/' + p }, error: null }),
  createSignedUrls: async ps => ({ data: ps.map(p => ({ path: p, signedUrl: 'https://signed/' + p })), error: null }) }) };
const supa = { from: builder, storage, auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } };
let isAdmin = true;
const dom = new JSDOM(html, {
  runScripts: 'dangerously', url: 'https://app.cardinalroster.com/', virtualConsole: vc, pretendToBeVisual: true,
  beforeParse(w) {
    Object.defineProperty(w.HTMLElement.prototype, 'offsetParent', { get() { return this.parentNode; } });
    Object.defineProperty(w, 'supa', { value: supa, writable: false });
    Object.defineProperty(w, 'sb', { value: supa, writable: false });
    w.scrollTo = () => {};
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    w.fetch = async (u) => String(u).includes('/api/crew-invoice')
      ? { ok: true, json: async () => ({ ok: true, invoice: { crew_name: 'Sample Gutter Co', invoice_number: '236900', invoice_date: '2026-11-26', job_address: '1901 E Social Row Rd', customer_name: '', job_ref: '', lines: [{ description: 'Gutter', amount: 500 }], subtotal: 500, tax: null, total: 500, notes: '' } }) }
      : { ok: false, json: async () => ({}) };
  }
});
const w = dom.window;
let fails = 0;
const check = (l, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + l); if (!ok) fails++; };
const tick = ms => new Promise(r => setTimeout(r, ms));
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
setTimeout(async () => {
  try {
    w.cacheProjects = [{ id: 'pL', name: 'Alexandru Mihai', stage: 'Closed', address: '502 Lonsdale Ave' }, { id: 'pS', name: '1901 E Social Row Rd', stage: 'Completed', address: '1901 E Social Row Rd' },
      { id: 'pR', name: 'Lee Example', stage: 'Lost', address: '7986 Lost Lane Ct' }, { id: 'pX', name: 'Other job', stage: 'Approved', address: '1 Main' }];
    w.currentUser = { email: 'theo@cardinalrenovations.net' };
    w.isAdminUser = () => isAdmin; w.isProductionUser = () => false; w.isFieldUser = () => false;
    w.commFullAccess = () => true; w.commAdmin = () => isAdmin;
    w.crAsk = async () => true; w.crTell = () => {};
    await w.CardinalCrews.open(); await tick(150);
    const v = w.document.getElementById('crewsView');
    const tabs = [...v.querySelectorAll('[data-tab]')].map(t => t.getAttribute('data-tab'));
    check('Invoices tab sits after Jobs, before Labor Rates', tabs.join(',') === 'profile,compliance,jobs,invoices,rates,payments,notes');
    click(v.querySelector('[data-tab="invoices"]')); await tick(100);
    const stat = lbl => { const s = [...v.querySelectorAll('.crw-istat')].find(x => x.querySelector('small').textContent === lbl); return s && s.querySelector('b').textContent; };
    check('stats: Invoiced $11,935.75 · Paid $3,965.25 · Open $6,807.00 · Not linked $1,163.50',
      stat('Invoiced') === '$11,935.75' && stat('Paid') === '$3,965.25' && stat('Open') === '$6,807.00' && stat('Not linked') === '$1,163.50');
    const rows = [...v.querySelectorAll('.crw-irow')];
    const rowOf = n => rows.find(r => r.querySelector('.crw-i1 b').textContent === '#' + n);
    check('6 invoice rows, newest first as loaded', rows.length === 6);
    check('Lonsdale is Paid (linked check), 529214 is Not linked', rowOf('447171').querySelector('.crw-ist').matches('.paid') && rowOf('529214').querySelector('.crw-ist').matches('.unk'));
    check('flag: second bill on the Social Row job', /Another bill on this job \(#236828\)/.test(rowOf('236844').textContent));
    check('flag: bill on a job marked Lost', /This job is marked Lost/.test(rowOf('236822').textContent));
    check('flag: same invoice # and amount twice', rows.filter(r => /Same invoice # and amount entered twice/.test(r.textContent)).length === 2);
    const th = rows.find(r => r.querySelector('img[data-thumb]'));
    check('thumbnail filled with a signed crew-docs URL and opens the original', th && th.querySelector('img').src === 'https://signed/invoices/2026-11/a-inv.jpg' && th.querySelector('.crw-ith').getAttribute('data-open') === 'invoices/2026-11/a-inv.jpg');
    // attach a photo to #236844
    const pin = rowOf('236844').querySelector('input[data-invphoto]');
    Object.defineProperty(pin, 'files', { value: [new w.File(['x'], 'social.jpg', { type: 'image/jpeg' })] });
    pin.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(100);
    const upd = writes.find(x => x.t === 'crew_invoices' && x.op === 'update' && x.row.file_path);
    check('Add photo: uploads to crew-docs/invoices/ and links it to the bill', uploads.some(u => u.bk === 'crew-docs' && /^invoices\/\d{4}-\d{2}\/[\w.\-]+-social\.jpg$/.test(u.k)) && upd && upd.row.file_bucket === 'crew-docs' && upd.q.f.some(f => f[2] === 'inv3'));
    // Payments: what each check pays, and linking
    click(v.querySelector('[data-tab="payments"]')); await tick(100);
    check('check #2100 shows it pays #447171', /Pays #447171/.test(v.textContent));
    click(v.querySelector('[data-linkpay="pay2"]')); await tick(50);
    const picks = [...v.querySelectorAll('[data-lnk]')].map(b => b.getAttribute('data-lnk'));
    check('picker lists only unpaid bills from this crew', picks.indexOf('inv1') === -1 && picks.indexOf('inv4') !== -1 && picks.length === 5);
    v.querySelector('[data-lnk="inv4"]').checked = true;
    const before = writes.length;
    click(v.querySelector('[data-linksave="pay2"]')); await tick(50);
    check('over the check amount is refused', writes.length === before && /more than the check/.test(v.querySelector('[data-linkmsg]').textContent));
    v.querySelector('[data-lnk="inv4"]').checked = false;
    v.querySelector('[data-lnk="inv5"]').checked = true; v.querySelector('[data-lnk="inv2"]').checked = true;
    click(v.querySelector('[data-linksave="pay2"]')); await tick(100);
    const ins = writes.find(x => x.t === 'crew_payment_invoices' && x.op === 'insert');
    check('links saved with each bill\'s amount', ins && ins.row.length === 2 && ins.row.every(r => r.payment_id === 'pay2') && ins.row.find(r => r.invoice_id === 'inv5').amount === 1163.5 && ins.row.find(r => r.invoice_id === 'inv2').amount === 810);
    check('linked bills switch to pay_status auto', writes.some(x => x.t === 'crew_invoices' && x.op === 'update' && x.row.pay_status === 'auto'));
    // check photo
    const cin = v.querySelector('input[data-payphoto="pay2"]');
    Object.defineProperty(cin, 'files', { value: [new w.File(['x'], 'check1610.jpg', { type: 'image/jpeg' })] });
    cin.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(100);
    check('check photo goes to crew-docs/checks/ and onto the payment', uploads.some(u => /^checks\//.test(u.k)) && writes.some(x => x.t === 'crew_payments' && x.op === 'update' && /^checks\//.test(x.row.file_path || '')));
    // reader files a crew bill
    w.CardinalCrewInvoice.open({ pid: 'pS', crewId: 'cF' }); await tick(100);
    const fi = w.document.getElementById('ci-file');
    Object.defineProperty(fi, 'files', { value: [new w.File(['%PDF'], 'new.pdf', { type: 'application/pdf' })] });   /* jsdom cannot decode photos; a PDF takes the storage-path route */
    fi.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(600);
    const csel = w.document.getElementById('ci-crewid');
    check('review card offers "File under crew" with Sample Gutter Co chosen', !!csel && csel.value === 'cF');
    click(w.document.querySelector('[data-ci-apply]')); await tick(150);
    const bill = writes.find(x => x.t === 'crew_invoices' && x.op === 'insert');
    check('Apply files the bill in crew_invoices (not job_costs)', bill && bill.row.crew_id === 'cF' && bill.row.project_id === 'pS' && bill.row.total === 500 && bill.row.source === 'reader' && bill.row.file_bucket === 'crew-docs' && !writes.some(x => x.t === 'job_costs' && x.op === 'insert'));
    // job Costs: Lonsdale = bill once, not bill + linked check
    w.CardinalJobPay.html({ id: 'pL' }, { total: 10000, paid: 0, balance: 10000 }); await tick(150);
    const out = w.CardinalJobPay.html({ id: 'pL' }, { total: 10000, paid: 0, balance: 10000 });
    const m = /<span>Costs<\/span><b>([^<]+)<\/b>/.exec(out);
    check('job Costs counts Lonsdale once ($3,965.25), not bill + linked check', m && m[1] === '$3,965.25');
    // non-admin: no Invoices tab
    isAdmin = false; await w.CardinalCrews.reload(); await tick(50);
    check('non-admin does not get the Invoices tab', !v.querySelector('[data-tab="invoices"]'));
  } catch (e) { check('harness ran without throwing: ' + e.message, false); }
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
}, 4000);
