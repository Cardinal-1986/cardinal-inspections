/* The claims detail screen, rendered in a real engine.

   Theo reported three things on it that a grep cannot settle:
     · the page scrolls SIDEWAYS
     · empty fields render as giant white boxes with dashed borders, and the
       claims module's own CSS says only "muted italic text" — so something
       else is winning
     · the JOB tab shows nothing

   jsdom cannot answer "which rule won". Chromium can. Every <style> block in
   the artifact is injected so specificity is decided the way the browser
   decides it, and the markup is the shape the module's own kv() emits.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_claimpane.js [index.html]  */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SHOT = '/tmp/claude-0/-home-user-cardinal-inspections/3ac7871b-c7bb-57ef-a128-b9d51a347bf8/scratchpad/';
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const CSS = (() => {
  const out = []; let i = 0;
  while ((i = SRC.indexOf('<style', i)) !== -1) {
    const s = SRC.indexOf('>', i) + 1, e = SRC.indexOf('</style>', s);
    if (e === -1) break; out.push(SRC.slice(s, e)); i = e;
  }
  return out.join('\n');
})();

/* the shape the module's own kv() emits, and the wrapper renderDetail() uses */
const kv = (l, v, empty) =>
  `<div class="cr-c-info-item"><div class="lbl">${l}</div>` +
  `<div class="val ${v ? '' : 'empty'}">${v || empty}</div></div>`;

const MARKUP = `
<div id="cr-claims-mount">
  <div class="cr-c-app">
    <div class="cr-c-back" data-act="back">← Back to Claims</div>
    <div class="cr-c-eyebrow">CARDINAL ROOFING &amp; RENOVATIONS · CLAIM</div>
    <h1 class="cr-c-title">Adam Gunn</h1>
    <div class="cr-c-rule"></div>
    <div class="cr-c-facts">
      <div class="cr-c-fact"><div class="lbl">Property</div>
        <div class="val">9222 Arlington Rd, Brookville, OH 45309, USA, Brookeville, OH 45309</div></div>
      <div class="cr-c-fact"><div class="lbl">Status</div><div class="val">FILED</div></div>
      <div class="cr-c-fact"><div class="lbl">Carrier · Claim #</div>
        <div class="val">Allstate Vehicle and Property Insurance Company · 0802889162</div></div>
      <div class="cr-c-fact"><div class="lbl">Date of Loss</div><div class="val">Jul 22, 2025</div></div>
    </div>
    <div class="cr-c-tabs detail">
      <button class="cr-c-tab">Settle</button><button class="cr-c-tab on">Client</button>
      <button class="cr-c-tab">Job</button><button class="cr-c-tab">Contract</button>
      <button class="cr-c-tab">Documents</button><button class="cr-c-tab">iTel</button>
      <button class="cr-c-tab">Record</button>
    </div>
    <div class="cr-c-pane">
      <div class="cr-c-info">
        ${kv('Policy Number', '000826751113', 'Not set')}
        ${kv('Filed', '', 'Not set')}
        ${kv('Approved', '', 'Not yet')}
        ${kv('Cause of Loss', '', 'Not set')}
        ${kv('Coverage Type', 'RCV', 'Not set')}
      </div>
    </div>
  </div>
</div>`;

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  for (const [label, w] of [['phone 390', 390], ['phone 430', 430]]) {
    const p = await br.newPage({ viewport: { width: w, height: 900 } });
    await p.setContent('<!doctype html><html><head><style>' + CSS +
      '</style></head><body style="margin:0">' + MARKUP + '</body></html>',
      { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(500);

    const r = await p.evaluate(() => {
      const de = document.documentElement;
      const emptyEl = document.querySelector('.cr-c-info-item .val.empty');
      const cs = emptyEl ? getComputedStyle(emptyEl) : null;
      const b = emptyEl ? emptyEl.getBoundingClientRect() : null;
      /* what is actually wider than the viewport? */
      const over = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > de.clientWidth + 1 || r.right > de.clientWidth + 1) {
          over.push({
            what: (el.tagName.toLowerCase() +
                   (el.id ? '#' + el.id : '') +
                   (el.className && typeof el.className === 'string'
                     ? '.' + el.className.trim().split(/\s+/).join('.') : '')).slice(0, 70),
            w: Math.round(r.width), right: Math.round(r.right)
          });
        }
      });
      return {
        scrollW: de.scrollWidth, clientW: de.clientWidth,
        emptyBg: cs ? cs.backgroundColor : null,
        emptyBorder: cs ? cs.borderStyle + ' ' + cs.borderWidth + ' ' + cs.borderColor : null,
        emptyH: b ? Math.round(b.height) : null,
        emptyPad: cs ? cs.padding : null,
        emptyAlign: cs ? cs.textAlign : null,
        over: over.slice(0, 8)
      };
    });

    await p.screenshot({ path: SHOT + 'claimpane-' + w + '.png', fullPage: true });
    await p.close();

    console.log('\n── ' + label + ' ──');
    console.log('  page: scrollWidth ' + r.scrollW + ' vs viewport ' + r.clientW +
      (r.scrollW > r.clientW ? '   ← SCROLLS SIDEWAYS by ' + (r.scrollW - r.clientW) + 'px' : ''));
    if (r.over.length) {
      console.log('  wider than the viewport:');
      r.over.forEach(o => console.log('    ' + o.what + '  w=' + o.w + ' right=' + o.right));
    }
    console.log('  an EMPTY field renders as: bg=' + r.emptyBg + ' border=' + r.emptyBorder +
      ' height=' + r.emptyH + 'px pad=' + r.emptyPad + ' align=' + r.emptyAlign);

    ok(label + ': the claim screen does not scroll sideways',
      r.scrollW <= r.clientW + 1, r.scrollW + ' > ' + r.clientW);
    ok(label + ': an empty field is text, not a giant box',
      r.emptyH !== null && r.emptyH < 40, r.emptyH + 'px tall');
    ok(label + ': …and it has no filled background',
      r.emptyBg === 'rgba(0, 0, 0, 0)' || r.emptyBg === 'transparent', r.emptyBg);
  }

  await br.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
