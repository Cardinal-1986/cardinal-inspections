/* Build 711 — the Community hub's Clients tab: filters, and opening first.

   Renders the REAL hub in Chromium against a stubbed cacheProjects that
   mirrors the live spread (16 community jobs at Lead across 5 partners and
   3 reps), then drives the real filter machinery: open the funnel, pick a
   partner, apply, and check the list actually narrows — and that the
   All-bids table narrows with it (shared state, one funnel).

   Also checks the two things Theo asked about: Clients is the opening tab,
   and the mystery em-dash is gone from partner rows.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_ch2filters.js [index.html] */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const PARTNERS = [['Habitat for Humanity', 6], ['Dayton Home Repair Network', 4],
  ['Kitty Hawk Realty', 2], ['ReBuild', 2], [null, 2]];
const REPS = ['theo@cardinalrenovations.net', 'jerry@cardinalrenovations.net', 'greg@cardinalrenovations.net'];

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await br.newPage({ viewport: { width: 390, height: 1400 } });
  p.on('pageerror', () => {});
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);

  await p.evaluate(({ PARTNERS, REPS }) => {
    window.currentUser = { email: 'theo@cardinalrenovations.net' };
    const rows = []; let n = 0;
    PARTNERS.forEach(([name, count]) => {
      for (let i = 0; i < count; i++) {
        n++;
        rows.push({ id: 'j' + n, name: 'Client ' + n, address: n + ' Test St, Dayton OH',
          stage: 'Lead', created_by: REPS[n % REPS.length],
          created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z',
          checklist: JSON.stringify({ lead: { claim_type: 'community',
            partner_name: name || undefined, homeowner_name: 'HO ' + n,
            bid_due_at: '2026-08-2' + (n % 9) } }) });
      }
    });
    window.cacheProjects = rows;
    const v = document.getElementById('communityHubView');
    if (v) v.style.display = 'block';
    if (window.CardinalCommunityHub && window.CardinalCommunityHub.show) window.CardinalCommunityHub.show();
  }, { PARTNERS, REPS });
  await p.waitForTimeout(1400);

  const first = await p.evaluate(() => {
    const h = document.getElementById('cr-ch2');
    if (!h) return { missing: true };
    const tabs = Array.from(h.querySelectorAll('.tabbar [data-pane]'))
      .map(b => b.textContent.trim() + (b.classList.contains('on') ? '*' : ''));
    const openPane = (h.querySelector('[data-pane].on[data-pane]') || {}).dataset;
    const cli = h.querySelector('div[data-pane="clients"]');
    return { tabs,
      openPaneClass: Array.from(h.querySelectorAll('div[data-pane]')).filter(d => d.classList.contains('on')).map(d => d.dataset.pane),
      clientRows: cli ? cli.querySelectorAll('.cc-tbl tbody tr').length : -1,
      hasBar: !!(cli && cli.querySelector('.cc-bar')),
      shown: cli && cli.querySelector('.cc-bar .shown') ? cli.querySelector('.cc-bar .shown').textContent.trim() : null,
      dashes: Array.from((h.querySelector('div[data-pane="partners"]') || document.createElement('div'))
        .querySelectorAll('.pc .cc-money, .pc > div > .cc-money'))
        .filter(e => e.textContent.indexOf('\u2014') !== -1).length,
    };
  });
  if (first.missing) { ok('the hub rendered', false); await br.close(); process.exit(1); }

  console.log('tabs:', JSON.stringify(first.tabs), '| open:', JSON.stringify(first.openPaneClass));
  ok('tab order is Clients, Bids, Partners',
    first.tabs[0].startsWith('Clients') && first.tabs[1].startsWith('Bids') && first.tabs[2].startsWith('Partners'),
    JSON.stringify(first.tabs));
  ok('Clients is the tab that opens', first.tabs[0].endsWith('*') && first.openPaneClass.indexOf('clients') !== -1,
    JSON.stringify(first.openPaneClass));
  ok('the Clients list shows all 16 to start', first.clientRows === 16, first.clientRows);
  ok('a filter + sort bar sits above the client list', first.hasBar);
  ok('no mystery em-dash on a partner ROW (other dashes in the pane are legitimate)',
    first.dashes === 0, first.dashes + ' money-dashes');

  /* drive the REAL filter: funnel → Bill to → Habitat → Apply */
  const after = await p.evaluate(async () => {
    const h = document.getElementById('cr-ch2');
    const cli = h.querySelector('div[data-pane="clients"]');
    /* guarded: on an artifact with no bar on this tab the negative control
       must report a red, not crash */
    const funnel = cli && cli.querySelector('.cc-bar [data-ch="filter"]');
    if (!funnel) return { err: 'no filter bar on the Clients tab' };
    funnel.click();
    await new Promise(r => setTimeout(r, 120));
    const cat = Array.from(h.querySelectorAll('[data-cat]')).find(e => /Bill to/i.test(e.textContent));
    if (!cat) return { err: 'no Bill to category' };
    cat.click();
    await new Promise(r => setTimeout(r, 120));
    const opt = Array.from(h.querySelectorAll('[data-opt]')).find(e => /Habitat/i.test(e.textContent));
    if (!opt) return { err: 'no Habitat option', vals: Array.from(h.querySelectorAll('[data-opt]')).map(e => e.textContent.trim()).slice(0, 8) };
    opt.click();
    await new Promise(r => setTimeout(r, 100));
    const apply = h.querySelector('[data-ch="apply"]');
    if (!apply) return { err: 'no apply' };
    apply.click();
    await new Promise(r => setTimeout(r, 400));
    const h2 = document.getElementById('cr-ch2');
    const cli2 = h2.querySelector('div[data-pane="clients"]');
    const bids2 = h2.querySelector('div[data-pane="bids"]');
    return {
      clientRows: cli2.querySelectorAll('.cc-tbl tbody tr').length,
      shown: cli2.querySelector('.cc-bar .shown') ? cli2.querySelector('.cc-bar .shown').textContent.trim() : null,
      funnelLit: !!cli2.querySelector('.cc-bar [data-ch="filter"].on'),
      bidRows: bids2 ? bids2.querySelectorAll('.cc-tbl tbody tr').length : -1,
    };
  });
  if (after.err) { ok('the funnel opened the shared picker', false, JSON.stringify(after)); }
  else {
    console.log('after filter:', JSON.stringify(after));
    ok('filtering to Habitat narrows the client list to its 6', after.clientRows === 6, after.clientRows);
    ok('…the bar reports "6 of 16"', /6 of 16/.test(after.shown || ''), after.shown);
    ok('…the funnel lights up as active', after.funnelLit === true);
    ok('…and the All-bids table narrows with it (one shared filter)',
      after.bidRows === 6, after.bidRows);
  }

  await p.evaluate(() => { const b = document.querySelector('#cr-ch2 div[data-pane="clients"] .cc-bar'); if (b) b.scrollIntoView({ block: 'start' }); });
  await p.waitForTimeout(150);
  await p.screenshot({ path: SHOT + 'ch2-clients.png', clip: { x: 0, y: 0, width: 390, height: 760 } });
  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
