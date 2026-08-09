/* Build 641 — the insurance card group on a client profile actually renders.
   Build 639 fixed one of these four; this proves the other three.

   ⚠️ THIS CANNOT BE A JSDOM HARNESS, AND THAT IS THE WHOLE POINT.
   The question is a cascade question: does a renderer's inline
   `mount.style.display='block'` beat `#tab-overview > *:not(...){display:none
   !important;}`? It does NOT — an !important stylesheet declaration outranks a
   NORMAL inline style; only an inline !important would win. jsdom will not tell
   you that, and neither will reading the code. Chromium does.

   That is how three live insurance cards sat invisible since build 406: each
   renderer dutifully set display:block, every build, and the rule overrode it.

   The rule and the child list are LIFTED FROM THE ARTIFACT, never retyped, so
   pointing this at the previous build is a real negative control:

       node render_inscards.js                      # current tree  -> GREEN
       node render_inscards.js /path/to/prev.html   # build 639     -> RED (3 fails)

   Usage: node render_inscards.js [path-to-index.html]                        */
const fs = require('fs');
const { chromium } = require('playwright-core');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const H = fs.readFileSync(FILE, 'utf8');

const RULE = (H.match(/#tab-overview > \*[^{]*\{display:none !important;\}/) || [])[0];
if (!RULE) { console.log('RED — the #tab-overview rule is not in this artifact'); process.exit(1); }
console.log('artifact : ' + FILE);
console.log('rule     : ' + RULE + '\n');

/* The real children, read out of the real markup — including which of them ship
   with an inline display:none, because that is half of what is being tested. */
const container = (() => {
  const i = H.indexOf('id="tab-overview"');
  const start = H.lastIndexOf('<div', i);
  let d = 0, k = start;
  while (k < H.length) {
    if (H.startsWith('<div', k)) d++;
    else if (H.startsWith('</div>', k)) { d--; if (!d) return H.slice(start, k + 6); }
    k++;
  }
  return '';
})();
const KIDS = [];
{
  let depth = 0, k = 0;
  while (k < container.length) {
    if (container.startsWith('<div', k)) {
      depth++;
      if (depth === 2) {
        const tag = container.slice(k, container.indexOf('>', k) + 1);
        const m = /id="([^"]+)"/.exec(tag);
        if (m) KIDS.push({ id: m[1], inline: /display:\s*none/.test(tag) });
      }
    } else if (container.startsWith('</div>', k)) depth--;
    k++;
  }
}
console.log('children found in markup: ' + KIDS.map(k => k.id).join(', ') + '\n');

/* Exactly what the shipped renderers do at runtime on an INSURANCE project. */
const RENDERER_SHOWS = ['insCard', 'insDocsCard', 'insItelCard', 'leadCard'];

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><html><head><style>\n${RULE}\n</style></head><body>\n<div id="tab-overview">\n` +
    KIDS.map(k => `<div id="${k.id}"${k.inline ? ' style="display:none"' : ''}>x</div>`).join('\n') +
    `\n</div></body></html>`);

  /* ⚠️ #cr-pp-mount is NOT in the markup — the punch card creates it at runtime
     and inserts it as a SIBLING of insCard, so it becomes a direct child of
     #tab-overview and needs the exemption the 604 comment gives it. Reproduce
     that, or this harness asserts on an element that does not exist and reports
     a false RED against a correct build — which is exactly what it did first
     time. Same anchor order as the shipped code. */
  await page.evaluate(() => {
    const anchor = document.getElementById('insCard') || document.getElementById('solCard');
    if (anchor && anchor.parentNode) {
      const host = document.createElement('div');
      host.id = 'cr-pp-mount';
      host.textContent = 'x';
      anchor.parentNode.insertBefore(host, anchor.nextSibling);
    }
  });

  await page.evaluate((ids) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'block';        // what the renderers really do
    }
  }, RENDERER_SHOWS);

  const PROBE = KIDS.map(k => k.id).concat(['cr-pp-mount']);
  const seen = await page.evaluate((ids) => {
    const o = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      o[id] = el ? { d: getComputedStyle(el).display, h: el.getBoundingClientRect().height } : null;
    }
    return o;
  }, PROBE);

  console.log('after the renderers set display:block —');
  for (const id of PROBE) {
    const v = seen[id];
    console.log(`   ${id.padEnd(14)} ${v ? v.d.padEnd(6) : '(absent)'} ${v ? String(v.h).padStart(4) + 'px' : ''}`
      + (id === 'cr-pp-mount' ? '   (injected at runtime, as the app does)' : ''));
  }

  const vis = id => seen[id] && seen[id].d === 'block' && seen[id].h > 0;
  const gone = id => !seen[id] || (seen[id].d === 'none' && seen[id].h === 0);

  console.log('\n── the three cards 639 left behind (641) ──');
  ok('insCard renders — the claim panel', vis('insCard'), seen.insCard && seen.insCard.d);
  ok('insDocsCard renders — Insurance Documents, upload + list', vis('insDocsCard'), seen.insDocsCard && seen.insDocsCard.d);
  ok('insItelCard renders — iTel (build 406, never once shown)', vis('insItelCard'), seen.insItelCard && seen.insItelCard.d);

  console.log('\n── what must not have changed ──');
  ok('solCard still renders (the 639 fix)', vis('solCard'));
  ok('acxMount — the Keeper profile — still renders', vis('acxMount'));
  ok('cr-pp-mount still renders', vis('cr-pp-mount'));
  /* leadCard is the genuine pre-Keeper card acxMount replaced. It still RUNS —
     that is how the four renderers above are called — but must stay invisible,
     or the old profile reappears underneath the new one. */
  ok('leadCard stays hidden even though its renderer sets display:block', gone('leadCard'),
     seen.leadCard && seen.leadCard.d);
  ok('genuinely-retired children stay hidden',
     gone('jaGrid') && gone('contactRow') && gone('locRow') && gone('stageBanner'));

  console.log('\n── the rule has not become a general unhide ──');
  ok('exactly six exemptions', (RULE.match(/:not\(/g) || []).length === 6,
     (RULE.match(/:not\(/g) || []).length);

  await browser.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
