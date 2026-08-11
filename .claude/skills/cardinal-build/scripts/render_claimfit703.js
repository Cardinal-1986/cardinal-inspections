/* render_claimfit703.js — builds 702 and 703.

   702 — the address under the map, scored in all TWELVE combinations of the
   app's theme switches. This app has three, and the bug was that .dbaddr read
   one while its card was painted by another:

       ink    .dbaddr -> var(--rbe-ink)    <html data-theme="rb-light">
       ground .acxsec -> var(--ct-surface) <body data-rltheme="siren|docket">

   Two switches that move independently, so a single-combination check passes
   while the screen is unreadable. Insurance measured 1.38:1 one way round and
   1.00:1 the other — the same colour twice, which is what Theo photographed.
   The matrix is the gate; anything less would have shipped green.

   703 — the claim screen must not slide sideways. styleMounts() sets
   `overflow-y:auto` INLINE and nothing else, and CSS coerces overflow-x to
   auto rather than allow `visible` beside a non-visible value. So the fix has
   to be checked as a PAIR:

       the mount           scrollWidth === clientWidth   (it cannot slide)
       the wide table      scrollWidth  >  clientWidth   (it still scrolls)

   Assert only the first and a build that CLIPPED the table would pass while
   eating a column of real money. Assert only the second and the screen keeps
   bouncing. Both, or neither is worth anything.

   Driving the real module, not a mock: window.supa is a GETTER with no setter,
   so a plain assignment silently no-ops and the stub never lands. It has to be
   redefined with Object.defineProperty.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_claimfit703.js [index.html]
   Point it at 701 as the negative control.                                    */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const SRC = fs.readFileSync(FILE, 'utf8');
const lum = c => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return .2126 * s[0] + .7152 * s[1] + .0722 * s[2]; };
const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); };
const parse = c => { const m = (c || '').match(/[\d.]+/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null; };

const CARD = '<div class="acxsec"><div class="acxbody"><div style="margin-top:9px;">' +
  '<span class="dbaddr">&#128205; 9222 Arlington Rd, Brookville, OH 45309</span></div></div></div>';

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

  // ---------- 702: the twelve-cell contrast matrix ----------
  console.log('\n702 — .dbaddr against its OWN card, every theme combination');
  for (const crm of ['insurance', 'community', 'retail']) {
    for (const app of ['dark', 'light']) {
      for (const rl of ['siren', 'docket']) {
        const p = await br.newPage({ viewport: { width: 393, height: 900 } });
        await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
        await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(600);
        const R = await p.evaluate(({ html, crm, app, rl }) => {
          document.body.classList.remove('claim-insurance', 'claim-community');
          if (crm === 'insurance') document.body.classList.add('claim-insurance');
          if (crm === 'community') document.body.classList.add('claim-community');
          document.body.setAttribute('data-rltheme', rl);
          if (app === 'light') document.documentElement.setAttribute('data-theme', 'rb-light');
          else document.documentElement.removeAttribute('data-theme');
          const host = document.getElementById('projectView') || document.body;
          host.style.display = 'block';
          const holder = document.createElement('div'); holder.innerHTML = html; host.appendChild(holder);
          const el = holder.querySelector('.dbaddr');
          /* SNAPSHOT the value. getComputedStyle returns a LIVE object and every
             property empties the moment the node is detached — read it after
             holder.remove() and the whole matrix reports blank inks. */
          const ink = getComputedStyle(el).color;
          let stops = null, tag = null, n = el;
          while (n && n !== document.documentElement) {
            const s = getComputedStyle(n), bc = s.backgroundColor, bi = s.backgroundImage || '';
            // a gradient is a background-IMAGE; reading backgroundColor alone
            // sails past a card that paints one and scores the page behind it
            const g = bi.match(/rgba?\([^)]+\)/g) || [];
            if (g.length) { stops = g; tag = (n.className || n.tagName).toString().slice(0, 16); break; }
            if (bc && bc !== 'rgba(0, 0, 0, 0)' && !/,\s*0\)$/.test(bc)) { stops = [bc]; tag = (n.className || n.tagName).toString().slice(0, 16); break; }
            n = n.parentElement;
          }
          holder.remove();
          return { ink, stops, tag };
        }, { html: CARD, crm, app, rl });
        const ink = parse(R.ink);
        const rs = (R.stops || []).map(g => ratio(ink, parse(g))).filter(x => !isNaN(x));
        const worst = rs.length ? Math.min(...rs) : null;
        ok(worst !== null && worst >= 4.5,
          `${crm}/${app}/${rl}: ${R.ink} on ${R.tag} — ${worst ? worst.toFixed(2) : '?'}:1`);
        await p.close();
      }
    }
  }

  // ---------- 703: the claim screen holds still ----------
  console.log('\n703 — the claim screen, with Adam Gunn\'s real row shapes');
  const p = await br.newPage({ viewport: { width: 393, height: 900 } });
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  const errors = [];
  p.on('pageerror', e => errors.push(String(e).slice(0, 140)));
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);

  const C = await p.evaluate(async () => {
    const CLAIM = { id: '11111111-2222-3333-4444-555555555555', homeowner_name: 'Adam Gunn',
      property_address: '9222 Arlington Rd, Brookville, OH 45309, USA, Brookeville, OH 45309',
      status: 'filed', carrier: 'Allstate Vehicle and Property Insurance Company',
      claim_number: '0802889162', date_of_loss: '2025-07-22', cause_of_loss: null,
      approved_rcv: 22397.63, approved_acv: 14164.81, approved_depreciation: 8232.82,
      deductible: 1500, deductible_waived: false };
    const DATA = { insurance_claims: [CLAIM],
      insurance_payments: [
        { id: 'p1', claim_id: CLAIM.id, kind: 'acv', amount: 14164.81, received_date: '2025-08-01', deposited_date: '2025-08-06', check_number: '0802889162' },
        { id: 'p2', claim_id: CLAIM.id, kind: 'depreciation', amount: 8232.82, received_date: '2025-09-14', deposited_date: '2025-09-15', check_number: '1140277318' }],
      insurance_supplements: [{ id: 'sp1', claim_id: CLAIM.id, amount_requested: 4210.55, amount_approved: 0, filed_at: '2025-09-20', status: 'pending', description: 'Drip edge, ice and water barrier, two layers tear-off' }],
      claim_upgrades: [{ id: 'u1', claim_id: CLAIM.id, label: 'Upgrade to Duration BROWNWOOD architectural shingle', amount: 1875.40, sort_order: 1 }],
      claim_money: [{ claim_id: CLAIM.id, first_scope_rcv: 22397.63, approved_rcv: 22397.63, recovered: 0, lift_pct: 0 }],
      scope_reads: [{ id: 's1', claim_id: CLAIM.id, created_at: '2025-08-02T14:00:00Z', rcv: 22397.63, acv: 14164.81, depreciation: 8232.82, source: 'Allstate Vehicle and Property Insurance Company estimate PDF' }] };
    function qb(table) {
      const rows = (DATA[table] || []).slice();
      const api = { select: () => api, eq: () => api, order: () => api, limit: () => api, in: () => api,
        maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
        single: () => Promise.resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'none' } }),
        then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej) };
      return api;
    }
    // a GETTER with no setter: plain assignment no-ops and the stub never lands
    Object.defineProperty(window, 'supa', { value: { from: qb }, configurable: true, writable: true });
    await window.CardinalClaims.openOne(CLAIM.id);
    await new Promise(r => setTimeout(r, 700));

    const m = document.getElementById('cr-claims-mount');
    const app = m && m.querySelector('.cr-c-app');
    const wide = [];
    m.querySelectorAll('*').forEach(e => {
      const cs = getComputedStyle(e), over = e.scrollWidth - e.clientWidth;
      if (over > 1 && e.clientWidth > 0 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll' &&
          cs.overflowX !== 'hidden' && cs.overflowX !== 'clip') {
        wide.push({ cls: (e.className || e.tagName).toString().slice(0, 30), over });
      }
    });
    const scrollers = [...m.querySelectorAll('.cr-c-xscroll')]
      .map(e => ({ cw: e.clientWidth, sw: e.scrollWidth, ox: getComputedStyle(e).overflowX,
                   obx: getComputedStyle(e).overscrollBehaviorX }));
    return {
      rendered: !!(m && m.querySelector('.cr-c-title')),
      mountOX: getComputedStyle(m).overflowX, mountOY: getComputedStyle(m).overflowY,
      mountCW: m.clientWidth, mountSW: m.scrollWidth,
      appCW: app ? app.clientWidth : null, appSW: app ? app.scrollWidth : null,
      wide, scrollers, tables: m.querySelectorAll('.cr-c-table,.cr-c-upg').length,
      wrapped: m.querySelectorAll('.cr-c-xscroll > table').length
    };
  });

  ok(C.rendered, 'the claim detail renders — a layout gate must prove the screen is alive');
  ok(C.mountOY === 'auto', `it still scrolls VERTICALLY (overflow-y ${C.mountOY})`);
  ok(C.mountOX === 'hidden', `and no longer sideways (overflow-x ${C.mountOX}, was auto by coercion)`);
  ok(C.mountSW === C.mountCW,
    `the screen cannot slide: mount scrollWidth ${C.mountSW} === clientWidth ${C.mountCW}`);
  ok(C.appSW === C.appCW, `.cr-c-app fits too (${C.appSW} / ${C.appCW})`);
  ok(C.wide.length === 0,
    `nothing overflows without a scroller of its own (${C.wide.map(w => w.cls + ' +' + w.over).join(', ') || 'none'})`);

  /* the other half: the wide table must still be REACHABLE. A build that
     clipped it would satisfy every assertion above. */
  ok(C.tables > 0 && C.wrapped === C.tables,
    `every table sits in its own scroller (${C.wrapped}/${C.tables})`);
  const scrolling = C.scrollers.filter(s => s.sw > s.cw);
  ok(scrolling.length > 0,
    `and the one too wide for a phone scrolls rather than being cut off (${scrolling.map(s => s.sw + '>' + s.cw).join(', ') || 'NONE — content lost'})`);
  ok(C.scrollers.every(s => s.ox === 'auto'), 'the wrappers scroll on the x axis');
  ok(C.scrollers.every(s => s.obx === 'contain'),
    'and contain the gesture, so a swipe at the end does not back out of the screen (697)');

  // the modal must still cover the screen — overflow-x:hidden must not clip it
  const M = await p.evaluate(() => {
    const m = document.getElementById('cr-claims-mount');
    const bg = document.createElement('div');
    bg.className = 'cr-c-modal-bg'; bg.innerHTML = '<div class="cr-c-modal">x</div>';
    m.appendChild(bg);
    const r = bg.getBoundingClientRect();
    const out = { w: Math.round(r.width), h: Math.round(r.height), vis: getComputedStyle(bg).display };
    bg.remove();
    return out;
  });
  ok(M.w >= 393 && M.h >= 800,
    `a modal still covers the screen — position:fixed is not clipped by the mount (${M.w}x${M.h})`);

  ok(errors.length === 0, `nothing throws (${errors.slice(0, 2).join(' | ') || 'none'})`);

  // source-level: the wrappers are real markup, not a stylesheet trick
  ok((SRC.match(/<div class="cr-c-xscroll"><table/g) || []).length === 4,
    'all four tables are wrapped at their emit sites');

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
