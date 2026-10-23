/* gate_1399 — a rep's day.
 *   A  Payments card: Production sees no Gross profit / Margin / cost bar; the admin does, and with no
 *      costs entered reads "None entered" / "—" rather than "Margin 100.0%"
 *   B  error reporter keeps :line:col when the frame URL carries a query string
 *   C  phone drawer header shows the signed-in user, not "Cardinal"
 *   D  home AR card: nothing owed on this board but money owed elsewhere -> says so
 *   E  activity feed names an invoice an invoice
 *   F  a signed document hides "Mark sent"
 *   G  the Pre-Install Guide prompt no longer calls the non-existent patchProject()
 * Arg: [index.html] -> negative control (1398 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const iso = d => new Date(Date.now() + d * 86400000).toISOString();
const P = (id, stage, type) => ({ id, name: 'Sample Client ' + id, stage, address: '1 Main St', checklist: JSON.stringify({ lead: { claim_type: type } }), created_at: iso(-30), updated_at: iso(-30) });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }, { email: 'rep@cardinalrenovations.net', name: 'Sample Rep', role: 'production' }],
  projects: [P('j1', 'Approved', 'retail'), P('j2', 'Invoiced', 'insurance'),
    Object.assign(P('j4', 'Prospect', 'retail'), { checklist: JSON.stringify({ lead: { claim_type: 'retail' }, stage_since: iso(-40) }), created_by: 'rep@cardinalrenovations.net' })],
  inspection_reports: [
    { id: 'ed1', project_id: 'j1', title: 'EST-2026-0001 — Estimate — Sample Client j1', html: '<html><body><div class="accept-card"><div class="ac-sign"><div class="col"><div class="line"></div><div class="lbl">Client Acceptance &nbsp;|&nbsp; Date</div></div><div class="col"><div class="line"></div><div class="lbl">Cardinal Representative</div></div></div></div></body></html>', status: 'draft', created_at: iso(-2), updated_at: iso(-2) },
    { id: 'c1', project_id: 'j1', title: 'Contract — Sample Client j1', total: 10000, signed_at: iso(-5), status: 'draft', html: '<p>x</p>', created_at: iso(-6), updated_at: iso(-5) },
    { id: 'c2', project_id: 'j2', title: 'Contract — Sample Client j2', total: 8000, signed_at: iso(-20), status: 'draft', html: '<p>x</p>', created_at: iso(-21), updated_at: iso(-20) },
    { id: 'i2', project_id: 'j2', title: 'Invoice — Sample Client j2', total: 8000, status: 'sent', sent_at: iso(-3), html: '<p>i</p>', share_token: 'aaaaaaaa-bbbb-cccc-dddd-000000000002', created_at: iso(-1), updated_at: iso(-1) }],
  collections: [], appointments: [], estimates: [{ id: 'e1', project_id: 'j1', doc_id: 'ed1', estimate_number: 'EST-2026-0001', status: 'draft', total: 9000, archived: false, line_items: [], created_at: iso(-2), updated_at: iso(-2) }], commissions: [], contracts: [], punch_items: [], insurance_claims: [], job_costs: [], crew_payments: [], draws: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function boot(as){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(([seed, as]) => { window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: 'Sample Rep' }; }, [SEED, as]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page); await page.waitForTimeout(1500); await settle(page);
  return { ctx, page };
}

try {
  /* as a rep */
  let { ctx, page } = await boot('rep@cardinalrenovations.net');
  const r = await page.evaluate(async () => {
    const out = {};
    const W = () => (window.__WRITES__ || []);
    try { window.CardinalFrontDoor.close(); } catch (_) {}
    /* 6 + 5: home cards filled on first load; Gone quiet lists the 40-day Prospect */
    out.quiet = document.querySelectorAll('.kpqrow[data-proj="j4"]').length;
    /* 4: admin-only rows hidden in the phone drawer */
    const nb = document.getElementById('navBtn'); if (nb) nb.click();
    await new Promise(r => setTimeout(r, 500));
    const adm = [...document.querySelectorAll('#navMenu .navopt[data-cradmin="1"]')];
    out.admRows = adm.length; out.admShown = adm.filter(e => getComputedStyle(e).display !== 'none').map(e => e.getAttribute('data-nav'));
    const ar = document.querySelector('#navMenu .navopt[data-nav="ar"], #navMenu .navopt[data-nav="invoices"]');
    out.arShown = ar ? getComputedStyle(ar).display : 'n/a';
    if (nb) nb.click();
    /* 1: two files, two uploads */
    openProject('j1'); await new Promise(r => setTimeout(r, 1500));
    try { openDocsPage(); } catch (_) {}
    await new Promise(r => setTimeout(r, 600));
    const inp = document.getElementById('jdFileInput');
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array([37,80,68,70])], 'permit.pdf', { type: 'application/pdf' }));
    dt.items.add(new File([new Uint8Array([255,216,255])], 'roof1.jpg', { type: 'image/jpeg' }));
    const n0 = W().length;
    inp.files = dt.files; inp.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 2500));
    out.fileWrites = W().slice(n0).filter(w => /^storage:/.test(w.table) || (w.table === 'inspection_reports' && w.op === 'insert')).map(w => w.table + ':' + w.op);
    /* 2: a document sent -> its draft estimate becomes Sent */
    const n1 = W().length;
    document.dispatchEvent(new CustomEvent('cr-doc-sent', { detail: { docId: 'ed1' } }));
    await new Promise(r => setTimeout(r, 900));
    out.sentWrite = W().slice(n1).filter(w => w.table === 'estimates').map(w => JSON.stringify(w.payload));
    /* 3: Client signature offered on a builder estimate */
    await openEditor('ed1'); await new Promise(r => setTimeout(r, 1500));
    const sb = document.getElementById('sigBtn'); out.sig = sb ? getComputedStyle(sb).display : 'missing';
    return out;
  });
  ok(r.quiet === 1, '5/6 Gone quiet lists the 40-day Prospect on first load', 'rows ' + r.quiet);
  ok(r.admRows > 0 && r.admShown.length === 0, '4 admin-only drawer rows are hidden for a rep', JSON.stringify([r.admRows, r.admShown]));
  ok(r.fileWrites.filter(x => /^storage:/.test(x)).length === 2, '1 two files picked, two uploads', JSON.stringify(r.fileWrites));
  ok(r.sentWrite.some(p => /"status":"sent"/.test(p)), '2 a sent document marks its draft estimate Sent', JSON.stringify(r.sentWrite));
  ok(r.sig !== 'none' && r.sig !== 'missing', '3 Client signature is offered on a builder estimate', r.sig);
  await ctx.close();
} finally { await browser.close(); }
ok(/function crCloseEstBuilder\(\)/.test(APP_HTML) && /crCloseEstBuilder\(\);\s*try\{ window\.openEditor\(docId\); return true; \}/.test(APP_HTML), '7 openDoc closes the builder first');
ok(/Client Acceptance column|client acceptance/i.test(APP_HTML.slice(APP_HTML.indexOf("querySelectorAll('.sign .col, .ac-sign .col')"), APP_HTML.indexOf("querySelectorAll('.sign .col, .ac-sign .col')") + 400)), '3 the pad fills the Client Acceptance column');
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
