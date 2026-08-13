/* Build 712 — the partner directory as a REP, rendered by the real module.

   harness_712 proves the data is stripped. This answers the other half, which
   assertions cannot: does the screen READ as a deliberate refusal, or as a
   broken row? The house rule on this project is that a correct refusal must
   never render as a failure — and the 628 lesson is that only a picture
   catches meaning.

   Loads the real document, hands the SHIPPED cr-cpartners module a stubbed
   client with the live-shaped roster, opens the real directory as
   nick@ and as theo@, and measures the italic "held by Theo" line against the
   worst ground an ancestor actually paints — per LAYER, top layer first — in
   BOTH themes.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_712.js [index.html] */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

/* the negative-control run writes screenshots too — tag them with the artifact
   or it silently overwrites the live ones, and you review the wrong picture */
const TAG = path.basename(FILE) === 'index.html' ? '' : '-' + path.basename(FILE, '.html');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* the live roster shape, names as they actually stand after the 11 Aug record fix */
const ROWS = [
  { id: 'p1', name: 'Habitat for Humanity of Greater Dayton', partner_type: 'nonprofit',
    confidential: false, prospective: false, archived: false,
    contact_name: 'Galen Curry', contact_email: 'Gcurry@daytonhabitat.org',
    contact_phone: '(937) 586-0860', address: '115 W Riverview Ave, Dayton OH',
    notes: 'Critical Home Repair. Galen is the bid contact.' },
  { id: 'p2', name: 'Dayton Home Repair Network', partner_type: 'nonprofit',
    confidential: false, prospective: false, archived: false,
    contact_name: 'Sam Field', contact_email: 'sam@dhrn.org',
    contact_phone: '(937) 222-1111', address: null, notes: null },
  { id: 'p3', name: 'Kitty Hawk Realty', partner_type: 'property_manager',
    confidential: false, prospective: false, archived: false,
    contact_name: 'Dana Post', contact_email: 'dana@kittyhawk.com',
    contact_phone: '(937) 333-2222', address: '1 Kitty Hawk Dr', notes: null },
];

const MEASURE = `(() => {
  const px = s => (s.match(/[\\d.]+/g) || []).map(Number);
  function bgLayers(cs) {
    const layers = [];
    const img = cs.backgroundImage;
    if (img && img !== 'none') {
      let depth = 0, cur = ''; const parts = [];
      for (const ch of img) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim()) parts.push(cur);
      for (const part of parts) {
        const stops = [];
        (part.match(/rgba?\\([^)]+\\)/g) || []).forEach(s => {
          const v = px(s);
          if (v.length >= 3) stops.push({ rgb: v.slice(0, 3), a: v.length === 4 ? v[3] : 1, css: s });
        });
        if (stops.length) layers.push(stops);
      }
    }
    const c = px(cs.backgroundColor);
    if (c.length >= 3 && !(c.length === 4 && c[3] === 0))
      layers.push([{ rgb: c.slice(0, 3), a: c.length === 4 ? c[3] : 1, css: cs.backgroundColor }]);
    return layers;
  }
  function grounds(el) {
    const layers = []; let covered = false;
    for (let n = el; n && n.nodeType === 1 && !covered; n = n.parentElement) {
      for (const layer of bgLayers(getComputedStyle(n))) {
        layers.push(layer);
        if (layer.every(s => s.a >= 1)) { covered = true; break; }
      }
    }
    let cands = [{ rgb: [255, 255, 255], css: '#fff(fallthrough)' }];
    for (let i = layers.length - 1; i >= 0; i--) {
      const next = [];
      for (const st of layers[i]) for (const under of cands)
        next.push({ rgb: st.rgb.map((v, k) => Math.round(v * st.a + under.rgb[k] * (1 - st.a))),
          css: st.a < 1 ? st.css + ' over ' + under.css : st.css });
      cands = next.slice(0, 12);
    }
    return cands;
  }
  const lum = ([r, g, b]) => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);

  const rows = Array.from(document.querySelectorAll('.cr-cp-row'));
  const held = rows.map(r => Array.from(r.querySelectorAll('span'))
      .find(s => /held by Theo/.test(s.textContent))).filter(Boolean);
  const measured = held.slice(0, 1).map(el => {
    const cs = getComputedStyle(el);
    const ink = px(cs.color);
    let worst = null;
    for (const g of grounds(el)) {
      const r = ratio(ink.slice(0, 3), g.rgb);
      if (!worst || r < worst.r) worst = { r, css: g.css };
    }
    return { ink: cs.color, ground: worst.css, ratio: Number(worst.r.toFixed(2)),
      size: parseFloat(cs.fontSize), style: cs.fontStyle };
  })[0] || null;

  /* a leak is a leak wherever it lands, so that check stays page-wide; what the
     rep CAN see must be scoped to the shell, or an empty screen reads as a pass
     off some other page's text (it did, on the first run) */
  const text = document.body.textContent.replace(/\\s+/g, ' ');
  const shell = document.querySelector('.cr-cp-shell');
  const inShell = shell ? shell.textContent.replace(/\\s+/g, ' ') : '';
  return {
    rowCount: rows.length,
    heldCount: held.length,
    measured: measured,
    leaks: ['Gcurry@daytonhabitat.org', 'sam@dhrn.org', 'dana@kittyhawk.com',
      'Galen Curry', 'Dana Post', '(937) 586-0860', '115 W Riverview Ave']
      .filter(s => text.indexOf(s) !== -1),
    saysNoEmail: inShell.indexOf('no public email') !== -1,
    namesVisible: ['Habitat for Humanity of Greater Dayton', 'Kitty Hawk Realty']
      .filter(s => inShell.indexOf(s) !== -1).length,
    /* the directory groups by partner type and has never shown notes — asserting
       on notes here would fail correct code (the first run did) */
    groupsVisible: ['Non-profits', 'Property Managers']
      .filter(s => inShell.indexOf(s) !== -1).length,
  };
})()`;

async function openAs(p, email) {
  await p.evaluate(({ email, ROWS }) => {
    document.querySelectorAll('.cr-cp-wrap, .cr-cp-shell, [data-cr-cp-shell]').forEach(e => e.remove());
    window.currentUser = { email: email };
    const q = {
      select: () => q, eq: () => q, order: () => q,
      then: (f, r) => Promise.resolve({ data: ROWS.slice(), error: null }).then(f, r),
    };
    /* cr-shim defines window.supa as a GETTER over window.sb (:23686), so
       assigning window.supa silently does nothing — sb is the real seam */
    window.sb = { from: () => q };
    return window.CardinalCommunityPartners.load(true)
      .then(() => window.CardinalCommunityPartners.openDirectory());
  }, { email, ROWS });
  await p.waitForTimeout(500);
}

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await br.newPage({ viewport: { width: 390, height: 1100 } });
  p.on('pageerror', () => {});
  await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
  await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);

  for (const [label, theme] of [['dark', null], ['light', 'rb-light']]) {
    await p.evaluate(t => {
      if (t) document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
    }, theme);

    await openAs(p, 'nick@cardinalrenovations.net');
    const rep = await p.evaluate(MEASURE);
    console.log('\n── ' + label + ' · signed in as a REP ──');
    console.log('   ' + JSON.stringify(rep.measured));

    ok(label + ' · the directory painted its rows', rep.rowCount >= 3, rep.rowCount);
    ok(label + ' · not one contact address, name or phone reached the page',
      rep.leaks.length === 0, JSON.stringify(rep.leaks));
    ok(label + ' · every partner row says who holds the contact',
      rep.heldCount >= 3, rep.heldCount + ' of ' + rep.rowCount);
    ok(label + ' · it never claims there is no email (there is one — it is not theirs)',
      rep.saysNoEmail === false);
    ok(label + ' · the rep can still see WHO they bid for, grouped by type',
      rep.namesVisible === 2 && rep.groupsVisible === 2,
      JSON.stringify({ names: rep.namesVisible, groups: rep.groupsVisible }));
    ok(label + ' · the refusal line clears the 4.5:1 body-text floor',
      rep.measured && rep.measured.ratio >= 4.5,
      rep.measured ? rep.measured.ratio + ':1 (' + rep.measured.ink + ' on ' + rep.measured.ground + ')' : 'not measured');
    ok(label + ' · …and is set in italic, so it reads as a note rather than a value',
      !!rep.measured && rep.measured.style === 'italic', rep.measured && rep.measured.style);

    await p.screenshot({ path: SHOT + 'p712-rep-' + label + TAG + '.png',
      clip: { x: 0, y: 0, width: 390, height: 780 } });

    /* the Edit button is still on a rep's row (it always has been — they may
       correct a name or the programme notes). That makes the EDITOR the
       highest-risk surface in this build: it is the one place that used to be
       handed the raw row. Drive the real button, not the export. */
    const ed = await p.evaluate(() => {
      const btn = document.querySelector('.cr-cp-row [data-act="edit"]');
      if (!btn) return { err: 'no Edit button on a rep row' };
      btn.click();
      const form = document.querySelector('.cr-cp-shell');
      const t = form ? form.textContent.replace(/\s+/g, ' ') : '';
      return {
        inputs: Array.from(document.querySelectorAll('.cr-cp-shell input,\
 .cr-cp-shell textarea')).map(i => i.name || i.type),
        explains: t.indexOf('Contact details are held by Theo') !== -1,
        leaks: ['Galen Curry', 'Gcurry@daytonhabitat.org', '(937) 586-0860',
          '115 W Riverview Ave'].filter(s => t.indexOf(s) !== -1),
      };
    });
    if (ed.err) ok(label + ' · a rep can reach the editor', false, ed.err);
    else {
      ok(label + ' · the editor shows a rep NO contact input',
        !ed.inputs.some(n => /contact_|^address$/.test(n)), JSON.stringify(ed.inputs));
      ok(label + ' · …carries none of the values in a field either',
        ed.leaks.length === 0, JSON.stringify(ed.leaks));
      ok(label + ' · …and says why the fields are absent', ed.explains === true);
      if (theme === null)
        await p.screenshot({ path: SHOT + 'p712-rep-editor' + TAG + '.png',
          clip: { x: 0, y: 0, width: 390, height: 780 } });
    }

    await openAs(p, 'theo@cardinalrenovations.net');
    const own = await p.evaluate(MEASURE);
    /* the directory subtitle is contact_name · contact_phone — it has never
       painted the email or the postal address, so 3 of the 7 leak strings is
       the correct owner-side number, not a partial pass */
    ok(label + ' · the OWNER still gets the contacts on the same screen',
      own.leaks.length === 3 && own.heldCount === 0,
      JSON.stringify({ shown: own.leaks, held: own.heldCount }));
    if (theme === null)
      await p.screenshot({ path: SHOT + 'p712-owner-dark' + TAG + '.png',
        clip: { x: 0, y: 0, width: 390, height: 780 } });
  }

  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
