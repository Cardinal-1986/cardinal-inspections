/* Which surfaces silently inherit the global 44px dashed panel?

   `.empty` in this file means TWO things:
     · a standalone EMPTY-STATE PANEL — `<div class="empty">No estimates yet.</div>`
       — 16 of these, and the global rule at the top of <head> is theirs.
     · a MODIFIER on a value — `<div class="val empty">Not set</div>` — meaning
       "this field has no value".

   The global rule is unscoped, so the second kind inherits the first kind's
   background, 2px dashed border, 44px padding and centred text. The module
   rules that were written for them only ever set `color` and `font-style`, so
   they never reset any of that — this is not a specificity fight, it is a
   name collision where the two rules do not even mention the same properties.

   This script does NOT guess which surfaces are affected. It finds every CSS
   selector in the artifact where `.empty` sits on a compound (i.e. a modifier,
   not a bare panel), rebuilds that selector's ancestor chain as real elements,
   and asks Chromium what the leaf actually computes. jsdom cannot answer this.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_emptyclass.js [index.html]
   Point it at the previous build as the negative control.                    */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* every <style> block, in document order — the cascade depends on it */
const CSS = (() => {
  const out = []; let i = 0;
  while ((i = SRC.indexOf('<style', i)) !== -1) {
    const s = SRC.indexOf('>', i) + 1, e = SRC.indexOf('</style>', s);
    if (e === -1) break; out.push(SRC.slice(s, e)); i = e;
  }
  return out.join('\n');
})();

/* Find selectors where `empty` is a MODIFIER: something immediately before the
   `.empty` that is part of the same compound (no space). `.empty{` on its own,
   or `#x .empty{`, is the panel and is not our business. */
function modifierSelectors(css) {
  const out = [];
  const re = /(^|[},])\s*([^{}]{0,160}?)\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const sel = m[2].trim();
    if (!sel || sel.startsWith('@')) continue;
    if (sel.indexOf('.empty') === -1 && sel.indexOf('.novalue') === -1) continue;
    for (const one of sel.split(',')) {
      const s = one.trim();
      /* compound test: the char before `.empty` is not whitespace and not the
         start of the selector */
      const at = s.indexOf('.empty') !== -1 ? s.indexOf('.empty') : s.indexOf('.novalue');
      if (at <= 0) continue;
      const before = s[at - 1];
      if (before === ' ' || before === '>' || before === '+' || before === '~') continue;
      if (/\.empty[\w-]/.test(s)) continue;          /* .empty-items etc. */
      out.push(s);
    }
  }
  return [...new Set(out)];
}

/* turn "#cr-claims-mount .cr-c-info-item .val.empty" into a real element tree */
function buildFor(sel) {
  const parts = sel.split(/\s+/).filter(Boolean);
  let openTags = '', closeTags = '';
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const id = (p.match(/#([\w-]+)/) || [])[1];
    const classes = (p.match(/\.([\w-]+)/g) || []).map(c => c.slice(1));
    const tag = (p.match(/^([a-zA-Z]+)/) || [])[1] || 'div';
    const leaf = i === parts.length - 1;
    openTags += '<' + tag +
      (id ? ' id="' + id + '"' : '') +
      (classes.length ? ' class="' + classes.join(' ') + '"' : '') +
      (leaf ? ' data-probe="1"' : '') + '>';
    closeTags = '</' + tag + '>' + closeTags;
  }
  return openTags + 'Not set' + closeTags;
}

(async () => {
  const SELS = modifierSelectors(CSS);
  console.log('`.empty` / `.novalue` used as a MODIFIER in ' + SELS.length + ' selector(s):');
  SELS.forEach(s => console.log('    ' + s));

  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await br.newPage({ viewport: { width: 390, height: 900 } });

  const body = SELS.map((s, i) =>
    '<section data-i="' + i + '">' + buildFor(s) + '</section>').join('\n');

  await p.setContent('<!doctype html><html><head><style>' + CSS +
    '</style></head><body style="margin:0">' + body + '</body></html>',
    { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(300);

  const res = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('section').forEach(sec => {
      const el = sec.querySelector('[data-probe]');
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      out.push({
        i: Number(sec.dataset.i),
        bg: cs.backgroundColor,
        border: cs.borderTopStyle + ' ' + cs.borderTopWidth,
        padTop: parseFloat(cs.paddingTop),
        padLeft: parseFloat(cs.paddingLeft),
        align: cs.textAlign,
        h: Math.round(r.height)
      });
    });
    return out;
  });

  await p.close();
  await br.close();

  /* THE FINGERPRINT, not a vibe. The first draft of this script keyed on
     "padding >= 40 OR text-align:center" and reported 16 of 16 broken — a
     false red, because .cr-claimstrip, .cr-bidstrip, .payrow and .poPfx all
     centre their own text and set their own padding on purpose. The global
     rule's literal declaration is `padding:44px 24px` with `2px dashed`, and
     nothing else in the artifact sets that pair. Match THAT. */
  const inheritsPanel = r => r.padTop === 44 && r.padLeft === 24;

  /* …and separate the two meanings, because one of them is legitimate:
     `.cr-photo.empty` is a genuine empty PHOTO SLOT — it declares
     `border-style:dashed` and leans on the global rule for the rest. It is a
     panel and should stay one. A `.val` / `.v` is a FIELD VALUE and must never
     be one. That distinction is the build. */
  const isValue = s => /\.(val|v)\.(empty|novalue)/.test(s);

  console.log('\n── what each modifier actually computes ──');
  const broken = [];
  for (const r of res) {
    const sel = SELS[r.i];
    const inh = inheritsPanel(r);
    const bad = inh && isValue(sel);
    console.log('  ' + (bad ? 'BROKEN ' : inh ? 'panel  ' : 'text   ') + sel);
    console.log('         bg=' + r.bg + ' border=' + r.border +
      ' pad=' + r.padTop + '/' + r.padLeft + ' align=' + r.align + ' h=' + r.h + 'px');
    if (bad) broken.push(sel);
  }

  console.log('\n' + broken.length + ' of ' + SELS.length +
    ' modifier surfaces are a FIELD VALUE rendering as the empty-state panel.');

  /* The assertion. A field value must not be a 44px-padded dashed panel. */
  ok('no field value inherits the empty-state panel',
    broken.length === 0, broken.join(' | '));

  /* A rename must not be able to hide a surface FROM this script — both names
     are scanned above, so the six renamed value surfaces are still measured,
     they just have to come back as text now. Assert they were seen at all. */
  const seenValues = SELS.filter(isValue).length;
  ok('the field-value surfaces are still being measured after the rename',
    seenValues >= 6, seenValues + ' scanned');

  /* …and the panel must still work for the surfaces that legitimately want it,
     so a fix that simply deleted the global rule goes red here. */
  const photo = res.find(r => SELS[r.i] === '.cr-photo.empty');
  ok('the empty PHOTO SLOT still gets its dashed panel',
    !!photo && photo.border.indexOf('dashed') === 0,
    photo ? photo.border : 'selector not found');

  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); process.exit(1); });
