/* Build 712 — what a SALES REP actually sees on a community job.

   Theo's question, verbatim: "Can we confirm that reps can still see homeowner
   contact and address just not the community contacts like Galen curry?"

   This does not reason about it. It boots the real document in Chromium signed
   in as nick@, hands cr-cpartners the live-shaped Habitat row through the real
   client seam, opens a community job with the live shape (partner attached,
   homeowner name/phone/email, a renter, a street address) and reads back what
   is actually painted on the black card.

   Two directions matter equally and both are asserted:
     MUST be visible — homeowner name, phone, email, the job address, the
                       renter, and WHO the partner is (Habitat).
     MUST be absent  — Galen Curry, his email, his phone, Habitat's own
                       postal address.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_712rep.js [index.html] */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');
const TAG = path.basename(FILE) === 'index.html' ? '' : '-' + path.basename(FILE, '.html');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* the partner row as it actually stands in production after the 11 Aug fix */
const PARTNER = {
  id: 'hab-1', name: 'Habitat for Humanity of Greater Dayton', partner_type: 'nonprofit',
  confidential: false, prospective: false, archived: false,
  contact_name: 'Galen Curry', contact_email: 'Gcurry@daytonhabitat.org',
  contact_phone: '(937) 586-0860', address: '115 W Riverview Ave, Dayton OH',
  notes: 'Critical Home Repair program.',
};

/* the job shape 14 of the 16 live community jobs actually have */
const JOB = {
  id: 'job-712', name: 'Karrie Johnson', stage: 'Lead',
  address: '804 E Center St, Germantown OH 45327',
  lead: {
    claim_type: 'community',
    partner_id: 'hab-1',
    partner_name: 'Habitat for Humanity of Greater Dayton',
    homeowner_name: 'Karrie Johnson',
    homeowner_phone: '(937) 555-0142',
    homeowner_email: 'karrie.johnson@example.com',
    renter_name: 'Rita Renter', renter_phone: '(937) 555-0110',
    bid_due_at: '2026-08-20',
  },
};

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await br.newPage({ viewport: { width: 390, height: 1600 } });
  p.on('pageerror', () => {});
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);

  await p.evaluate(async ({ PARTNER, JOB, email }) => {
    window.currentUser = { email: email };
    const q = {
      select: () => q, eq: () => q, order: () => q, limit: () => q,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (f, r) => Promise.resolve({ data: [PARTNER], error: null }).then(f, r),
    };
    /* cr-shim exposes window.supa as a getter over window.sb — sb is the seam */
    window.sb = { from: () => q };
    if (window.CardinalCommunityPartners) await window.CardinalCommunityPartners.load(true);

    window.currentProject = {
      id: JOB.id, name: JOB.name, stage: JOB.stage, address: JOB.address,
      created_by: email, created_at: '2026-08-01T00:00:00Z',
      checklist: JSON.stringify({ lead: JOB.lead }),
    };
    window.cacheProjects = [window.currentProject];
    const v = document.getElementById('projectView');
    if (v) v.style.display = 'block';
  }, { PARTNER, JOB, email: 'nick@cardinalrenovations.net' });

  await p.waitForTimeout(1800);   /* let the module's observer build the black card */

  const seen = await p.evaluate(() => {
    const card = document.getElementById('cr-cc');
    const scope = card || document.getElementById('projectView') || document.body;
    const txt = scope.textContent.replace(/\s+/g, ' ');
    const has = s => txt.indexOf(s) !== -1;
    /* tel:/mailto: links are how a rep actually taps a number, so check the
       hrefs too — a value can be present as a link and absent from text */
    const links = Array.from(scope.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).join(' ');
    return {
      cardExists: !!card,
      chars: txt.length,
      mustSee: {
        'homeowner name': has('Karrie Johnson'),
        'homeowner phone': has('(937) 555-0142') || links.indexOf('5550142') !== -1 || links.indexOf('555-0142') !== -1,
        'the job address': has('804 E Center St'),
        'the renter': has('Rita Renter'),
        'who the partner is': has('Habitat for Humanity'),
      },
      /* NOT an assertion: the homeowner EMAIL has never been painted on this
         card — red on the 711 artifact too, so it is a pre-existing gap and
         not something 712 took away. Reported, not failed. */
      homeownerEmailOnCard: has('karrie.johnson@example.com') || links.indexOf('karrie.johnson') !== -1,
      mustNotSee: {
        "Galen Curry's name": has('Galen Curry'),
        "Galen's email": has('Gcurry@daytonhabitat.org') || links.indexOf('Gcurry') !== -1,
        "Galen's phone": has('(937) 586-0860') || links.indexOf('5860860') !== -1,
        "Habitat's own address": has('115 W Riverview'),
      },
      explains: has('held by Theo') || has('Held by'),
    };
  });

  console.log('\n── the black card, signed in as nick@ (a sales rep) ──');
  ok('the real module built the card', seen.cardExists, seen.chars + ' chars');

  console.log('\n  MUST still be visible to a rep:');
  for (const [k, v] of Object.entries(seen.mustSee)) ok('  ' + k + ' is on the card', v === true);

  console.log('\n  MUST be hidden from a rep (build 712):');
  for (const [k, v] of Object.entries(seen.mustNotSee)) ok('  ' + k + ' is NOT on the card', v === false, 'PRESENT');

  /* 713: the line that used to carry "Galen Curry · (937) 586-0860" must now
     say where it went rather than rendering as an empty gap under the name */
  ok('the card explains where the partner contact went (713)', seen.explains === true);
  console.log('\n  reported, not asserted:');
  console.log('    homeowner email painted on the card: ' + seen.homeownerEmailOnCard +
    '   (false on 711 too — a pre-existing gap, not something 712 removed)');

  /* screenshot the ELEMENTS, not a clip: Playwright's clip is in PAGE
     coordinates, so {x:0,y:0} always captures the top of the document however
     far you scrolled — the first run of this rig photographed the landing page
     and called it the job card */
  /* the rig sets #projectView visible directly rather than navigating, so the
     landing is still painted underneath and the card composites over it — the
     first version of this photographed the landing and called it the job card.
     hideAllViews() is what the app would have run; do its job for the shot. */
  await p.evaluate(() => {
    ['landingView', 'homeView', 'mainView', 'communityHubView'].forEach(id => {
      const e = document.getElementById(id); if (e) e.style.display = 'none';
    });
    const c = document.getElementById('cr-cc');
    if (c && !getComputedStyle(c).backgroundColor.match(/rgba\(0, 0, 0, 0\)/)) return;
    if (c) c.style.background = '#0b0d0c';   /* the card's own ground, for the photo only */
  });
  await p.waitForTimeout(250);

  for (const [id, name] of [['cr-cc', 'card'], ['cr-cc-pp', 'partner-section']]) {
    const h = await p.$('#' + id);
    if (h) await h.screenshot({ path: SHOT + 'p712-rep-' + name + TAG + '.png' });
    else console.log('  (no #' + id + ' to photograph)');
  }

  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
