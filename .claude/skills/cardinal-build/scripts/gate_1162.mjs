/* gate_1162 — The Appointment closes: Options & Sign on the tablet.
 *
 *  1. STEPS floor grows to seven; the two new stops are pane steps.
 *  2. The SHIPPED module drives both steps against mocked docs:
 *     - Options finds the newest 'Roof Options…' row, mints a token
 *       through window.db.update (the 731 convention, one token per
 *       document ever), and iframes /api/share?t=<token>.
 *     - Options with NO sheet says so honestly, with the recipe.
 *     - Sign lists the docs, and the 1149 rule is structural: the
 *       signature page opens only for the document that was PICKED,
 *       one at a time, the list hidden while one is open.
 *     - A doc with no signature block warns review-only BEFORE the
 *       frame; a signed one badges Signed.
 *     - docSignable mirrors api/share.js: SIGN_RX, SLOT_RX, and the
 *       data-clientsigned stamp — asserted against real fixtures of
 *       all four shapes.
 *  3. An existing share_token is reused — db.update NOT called.
 *  4. Pick clears the doc cache (docs from job A must never show at
 *     job B's table).
 *
 * Negative control: argv[2] = the previous artifact. Must go RED.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const FILE = process.argv[2] || 'index.html';
const src  = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };

const blk = (tag, id) => {
  const a = src.indexOf(`<${tag} id="${id}"`);
  if (a < 0) return '';
  const b = src.indexOf(`</${tag}>`, a);
  return b < 0 ? '' : src.slice(a, b);
};
const js  = blk('script', 'cr-appt-script');
const css = blk('style',  'cr-appt-styles');

/* ── 1 · shape ─────────────────────────────────────────────── */
for (const id of ['pick', 'roof', 'good', 'why', 'house', 'options', 'sign'])
  ok('STEPS floor: ' + id, new RegExp("id:'" + id + "'").test(js));
ok('doc frame leaves the rail zone clear (92px)',
   /\.ap-doc\{[^}]*margin:4px 0 92px/.test(css));
ok('still writes NO scroll lock', !/style\.overflow/.test(js));

/* ── 2 · drive the shipped module ──────────────────────────── */
{
  const calls = [];
  const gbbHtml  = '<html><body>options sheet <span class="gbb-box"></span></body></html>';
  const estHtml  = '<div class="line"></div><div class="lbl">Client Acceptance &nbsp;|&nbsp; Date</div>';
  const planHtml = '<html><body>a labor rate schedule, nothing to sign</body></html>';
  const docRows = [
    { id: 'd3', title: 'Labor Rate Schedule',            share_token: null,   signed_at: null, status: 'draft' },
    { id: 'd2', title: 'Estimate — Kim Lawson',          share_token: 'tokE', signed_at: null, status: 'sent'  },
    { id: 'd1', title: 'Roof Options — Kim Lawson',      share_token: null,   signed_at: null, status: 'draft' },
  ];
  const htmlById = { d1: gbbHtml, d2: estHtml, d3: planHtml };
  const mkQuery = table => {
    const q = { _eq: {} };
    for (const m of ['select', 'order', 'limit'])
      q[m] = () => q;
    q.eq = (k, v) => { q._eq[k] = v; calls.push(table + '.eq:' + k + '=' + v); return q; };
    q.single = () => ({ then: (res, rej) =>
      Promise.resolve({ data: { html: htmlById[q._eq.id] || '' } }).then(res, rej) });
    q.then = (res, rej) => {
      let data = [];
      if (table === 'projects') data = [{ id: 'p1', name: 'Kim Lawson', stage: 'Approved' }];
      if (table === 'inspection_reports') data = docRows;
      if (table === 'design_renders') data = [];
      return Promise.resolve({ data }).then(res, rej);
    };
    return q;
  };
  const supaMock = { from: t => mkQuery(t),
    storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }),
                              createSignedUrl:  () => Promise.resolve({ data: {} }) }) } };
  const body = js.slice(js.indexOf('>') + 1);
  const dom = new JSDOM('<!doctype html><html><head>' + css + '</style></head><body>' +
    '<div id="cr-show"><button data-tab="work"></button></div>' +
    '<script>' + body + '<\/script></body></html>', { runScripts: 'dangerously' });
  const w = dom.window;
  Object.defineProperty(w, 'supa', { value: supaMock, writable: false });
  w.db = { update: (id, fields) => { calls.push('db.update:' + id + ':' + Object.keys(fields).join(','));
    const r = docRows.find(x => x.id === id); if (r && fields.share_token) r.share_token = fields.share_token;
    return Promise.resolve(); } };
  w.crypto.randomUUID = () => 'uuid-fixed';
  w.CardinalShowcase = { openForProject(){}, open(){}, close(){} };
  w.CardinalWhy = { open(){}, close(){} };
  w.CardinalColors = { open(){}, close(){} };
  w.hideAllViews = () => {};
  const step = async () => new Promise(r => setTimeout(r, 420));
  (async () => {
    await w.CardinalAppointment.open();
    await step();
    const pane = w.document.getElementById('cr-appt');
    const rail = w.document.getElementById('cr-appt-rail');
    pane.querySelector('.ap-job').click();      /* pick Kim */
    await step();
    /* 1191 grew STEPS to eleven (discovery in front); 1194 added Findings
       at 5, so Options/Sign now sit at 10,11 of twelve */
    ok('rail carries twelve stops', rail.querySelectorAll('.ar-step').length === 12,
       'n=' + rail.querySelectorAll('.ar-step').length);

    /* jump to Options (index 10). Guarded so an older control
       REPORTS red instead of crashing — BUG_CLASSES 37. */
    const chip = ix => { const b = rail.querySelectorAll('.ar-step')[ix];
      if (b) b.click(); else ok('chip ' + ix + ' exists', false, 'rail has ' +
        rail.querySelectorAll('.ar-step').length + ' chips'); };
    chip(10);
    await step();
    ok('Options minted a token through db.update (731 convention)',
       calls.includes('db.update:d1:share_token'), calls.join(' | '));
    let fr = pane.querySelector('.ap-doc iframe');
    ok('Options iframes /api/share with the minted token',
       !!fr && fr.getAttribute('src') === '/api/share?t=uuid-fixed',
       fr && fr.getAttribute('src'));
    ok('Options picked the Roof Options row, not another doc',
       pane.textContent.includes('Your options'));

    /* Sign step (index 11) */
    chip(11);
    await step();
    const items = pane.querySelectorAll('[data-slot="doclist"] .ap-job');
    ok('Sign lists all three documents', items.length === 3, 'n=' + items.length);
    ok('no iframe before a document is PICKED (the 1149 rule)',
       !pane.querySelector('.ap-doc iframe'));

    /* pick the signable estimate — existing token must be REUSED */
    const before = calls.filter(c => c.startsWith('db.update:d2')).length;
    items[1].click();
    await step();
    fr = pane.querySelector('.ap-doc iframe');
    ok('the picked document opens on its own token',
       !!fr && fr.getAttribute('src') === '/api/share?t=tokE', fr && fr.getAttribute('src'));
    ok('an existing share_token is reused — db.update NOT called',
       calls.filter(c => c.startsWith('db.update:d2')).length === before);
    ok('the list is hidden while one document is open (one at a time)',
       pane.querySelector('[data-slot="doclist"]').style.display === 'none');
    ok('exactly ONE document frame is open', pane.querySelectorAll('.ap-doc iframe').length === 1);

    /* back to the list, open the unsignable one */
    pane.querySelector('[data-ap-doc="back"]').click();
    await step();
    pane.querySelectorAll('[data-slot="doclist"] .ap-job')[0].click();
    await step();
    ok('a doc with no signature block warns review-only',
       pane.textContent.includes('no signature block'));
    ok('…and still opens for review',
       !!pane.querySelector('.ap-doc iframe'));

    /* docSignable fixtures, via behaviour above + the raw fn */
    const fnAt = js.indexOf('function docSignable');
    const fnSrc = js.slice(fnAt, js.indexOf('\n}', fnAt) + 2);
    const docSignable = new Function('return (' + fnSrc + ')')();
    ok('docSignable: Client Acceptance form signs', docSignable(estHtml) === true);
    ok('docSignable: buyer sigslot signs',
       docSignable('<td class="sigslot" data-sig="buyer"></td>') === true);
    ok('docSignable: already-signed does NOT re-offer',
       docSignable(estHtml + '<i data-clientsigned="1"></i>') === false);
    ok('docSignable: a plain document does not sign', docSignable(planHtml) === false);

    /* pick clears the doc cache */
    ok('pick clears the doc cache', /renders = \[\]; docs = null;/.test(js));

    console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
    process.exit(fail ? 1 : 0);
  })().catch(e => { console.log('  FAIL  harness crashed -> ' + e.message);
    console.log('\n  ' + pass + ' pass, ' + (fail + 1) + ' fail'); process.exit(1); });
}
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);
