/* Build 706 — Partner & Property on the black Community card.

   Executes the SHIPPED ppSync (brace-matched out of the artifact, run via
   new Function). Not a re-implementation.

   What must hold:
     · the section renders the partner via the MASKED roster path (get()),
       chips Confidential/Prospect, hides the contact line when masked
     · the legacy bare-`partner` job (2 live rows) shows its name instead of
       blanking; a job with nothing shows "None attached"
     · Properties opens the directory WITH the partner id (CR-COM-006)
     · the CR-COM-019 guard: a picker callback that lands after the open job
       CHANGED writes nothing and says so; same job → write + refresh()
     · Clear asks first; a declined confirm writes nothing
     · the property line resolves address/unit/owner after load(), and a
       dangling property_id says "Unknown property", never a blank

   Negative control: the 705 artifact has no ppSync — this goes red.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_706.js [index.html] */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const at = SRC.indexOf('function ppSync(){');
ok('shipped ppSync found in the artifact', at !== -1);
let i = SRC.indexOf('{', at), depth = 0, end = -1;
for (; i < SRC.length && i !== -1; i++) {
  if (SRC[i] === '{') depth++;
  else if (SRC[i] === '}') { depth--; if (!depth) { end = i + 1; break; } }
}
ok('ppSync brace-matched', end !== -1);
if (end === -1) { console.log('\nHARNESS 706: RED — cannot slice'); process.exit(1); }
const code = SRC.slice(at, end);
console.log('  (sliced ' + code.length + ' chars of shipped code)');

const escFn = s => String(s).replace(/[&<>"']/g,
  m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const flush = () => new Promise(r => setTimeout(r, 0));

/* one scenario = fresh DOM + fresh mocks + fresh compiled ppSync */
function build(opts) {
  const dom = new JSDOM('<div id="cr-cc-pp"></div>');
  const doc = dom.window.document;
  const calls = { setPartner: [], setProp: [], openDir: [], refresh: 0, alerts: [], confirms: 0, pickPartnerCb: null, pickPropCb: null };
  const win = {
    currentProject: opts.project,
    CardinalCommunityPartners: {
      partnerIdForProject: pr => (opts.lead.partner_id || null),
      get: id => (opts.partner && opts.partner.id === id ? opts.partner : null),
      pickPartner: cb => { calls.pickPartnerCb = cb; },
      setPartnerForProject: (pr, id) => { calls.setPartner.push({ prId: pr.id, id }); return Promise.resolve(true); },
      load: () => Promise.resolve(),
    },
    CardinalCommunityProperties: {
      load: pid => { calls.loadedFor = pid; return Promise.resolve(); },
      list: pid => opts.properties || [],
      pickProperty: (pid, cb) => { calls.pickPropCb = cb; calls.pickPropPid = pid; },
      setPropertyForProject: (pr, id) => { calls.setProp.push({ prId: pr.id, id }); return Promise.resolve(true); },
      openDirectory: pid => { calls.openDir.push(pid); },
    },
    CardinalCommunityJob: { refresh: () => { calls.refresh++; } },
  };
  const ppSync = new Function('document', 'window', 'esc', 'lead', 'isCommunity', 'alert', 'confirm', 'Promise', 'setTimeout',
    '"use strict";\n' + code + '\nreturn ppSync;')(
    doc, win, escFn, () => opts.lead, () => true,
    m => calls.alerts.push(m), () => { calls.confirms++; return opts.confirmAnswer !== false; },
    Promise, setTimeout);
  return { doc, win, calls, ppSync, box: () => doc.getElementById('cr-cc-pp') };
}

(async () => {
  /* ── scenario 1: full house — masked confidential prospect partner, property, renter ── */
  let s = build({
    project: { id: 'job-1' },
    lead: { partner_id: 'p1', property_id: 'prop-9', renter_name: 'Rita Renter', renter_phone: '555-0110' },
    partner: { id: 'p1', name: 'Confidential Property Manager', __masked: true, prospective: true, contact_name: null, contact_phone: null },
    properties: [{ id: 'prop-9', address: '12 Oak St', unit: 'B', owner_name: 'Olive Owner' }],
  });
  s.ppSync(); await flush();
  let html = s.box().innerHTML;
  ok('partner name renders via the masked get()', html.includes('Confidential Property Manager'));
  ok('Confidential and Prospect chips render', html.includes('>Confidential</span>') && html.includes('>Prospect</span>'));
  ok('no contact line when the roster masked it', !html.includes('null') && !/ppv[^>]*>[^<]*<small>[^R]/.test(html.split('Property')[0]));
  ok('renter line shows (CR-COM-016 display half)', html.includes('Renter · Rita Renter · 555-0110'));
  ok('property resolves to address · unit + owner after load()',
    s.box().querySelector('[data-pp-prop]').innerHTML.includes('12 Oak St · B') &&
    s.box().querySelector('[data-pp-prop]').innerHTML.includes('Olive Owner'),
    s.box().querySelector('[data-pp-prop]').innerHTML);
  ok('buttons: Change / Properties / Clear / property-Change all present',
    !!s.box().querySelector('[data-pp="partner"]') && !!s.box().querySelector('[data-pp="props"]') &&
    !!s.box().querySelector('[data-pp="clearp"]') && !!s.box().querySelector('[data-pp="property"]'));

  s.box().querySelector('[data-pp="props"]').onclick();
  ok('Properties opens the directory WITH the partner id (CR-COM-006)',
    s.calls.openDir.length === 1 && s.calls.openDir[0] === 'p1', JSON.stringify(s.calls.openDir));

  /* ── the 019 guard, same job: write + refresh ── */
  s.box().querySelector('[data-pp="partner"]').onclick();
  ok('Change opens the partner picker', typeof s.calls.pickPartnerCb === 'function');
  s.calls.pickPartnerCb({ id: 'p2' }); await flush();
  ok('same job still open → setPartnerForProject(job-1, p2)',
    s.calls.setPartner.length === 1 && s.calls.setPartner[0].prId === 'job-1' && s.calls.setPartner[0].id === 'p2',
    JSON.stringify(s.calls.setPartner));
  ok('…and the card is refreshed (signature() cannot see partner changes)', s.calls.refresh === 1, s.calls.refresh);

  /* ── the 019 guard, job changed while the picker sat open: DROP ── */
  s.box().querySelector('[data-pp="partner"]').onclick();
  s.win.currentProject = { id: 'job-OTHER' };
  s.calls.pickPartnerCb({ id: 'p3' }); await flush();
  ok('job changed mid-pick → the write is DROPPED', s.calls.setPartner.length === 1, JSON.stringify(s.calls.setPartner));
  ok('…and the user is told', s.calls.alerts.length === 1 && /no longer open/.test(s.calls.alerts[0]), s.calls.alerts.join('|'));

  /* ── property picker: guard wired the same way ── */
  s.win.currentProject = { id: 'job-1' };
  s.ppSync(); await flush();
  s.box().querySelector('[data-pp="property"]').onclick();
  ok('property picker receives the partner id', s.calls.pickPropPid === 'p1', s.calls.pickPropPid);
  s.calls.pickPropCb({ id: 'prop-2' }); await flush();
  ok('same job → setPropertyForProject(job-1, prop-2) + refresh',
    s.calls.setProp.length === 1 && s.calls.setProp[0].id === 'prop-2' && s.calls.refresh === 2,
    JSON.stringify(s.calls.setProp) + ' refresh=' + s.calls.refresh);

  /* ── Clear: confirm gate ── */
  s.calls.confirmAnswer = undefined;
  s.box().querySelector('[data-pp="clearp"]').onclick(); await flush();
  ok('Clear confirms then writes null', s.calls.confirms === 1 &&
    s.calls.setPartner.length === 2 && s.calls.setPartner[1].id === null, JSON.stringify(s.calls.setPartner));
  let s2 = build({ project: { id: 'j' }, lead: { partner_id: 'p1' },
    partner: { id: 'p1', name: 'X' }, confirmAnswer: false });
  s2.ppSync(); await flush();
  s2.box().querySelector('[data-pp="clearp"]').onclick(); await flush();
  ok('a declined confirm writes nothing', s2.calls.confirms === 1 && s2.calls.setPartner.length === 0);

  /* ── legacy bare-partner shape (2 live jobs) ── */
  let s3 = build({ project: { id: 'j3' }, lead: { partner: 'Old Bare Name Co' } });
  s3.ppSync(); await flush();
  html = s3.box().innerHTML;
  ok('legacy bare `partner` still shows its name (CR-COM-008 shape)', html.includes('Old Bare Name Co'));
  ok('…with Attach (no id → no Properties/Clear)', html.includes('Attach partner') &&
    !s3.box().querySelector('[data-pp="props"]') && !s3.box().querySelector('[data-pp="clearp"]'));
  ok('…and the property row explains itself', html.includes('Attach a partner to choose a property.'));

  /* ── nothing at all ── */
  let s4 = build({ project: { id: 'j4' }, lead: {} });
  s4.ppSync(); await flush();
  ok('no partner → "None attached"', s4.box().innerHTML.includes('None attached'));

  /* ── dangling property_id ── */
  let s5 = build({ project: { id: 'j5' }, lead: { partner_id: 'p1', property_id: 'gone' },
    partner: { id: 'p1', name: 'Real Partner' }, properties: [] });
  s5.ppSync(); await flush();
  ok('dangling property_id → "Unknown property", not a blank',
    s5.box().querySelector('[data-pp-prop]').innerHTML.includes('Unknown property'),
    s5.box().querySelector('[data-pp-prop]').innerHTML);

  console.log('\nHARNESS 706: ' + (fail ? 'RED (' + fail + ' failed)' : 'GREEN') +
    '  (' + pass + ' passed, ' + fail + ' failed)  on ' + path.basename(FILE));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
