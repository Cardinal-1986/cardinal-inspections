/* module_source.cjs — "give me the text of module X", wherever it lives.
 *
 * WHY. Ten gates sliced Showcase and OC Colors out of index.html by block id,
 * each with its own copy of the same four lines under five different names
 * (`slice`, `block`, `blockOf`, `sl`, `blk`, plus two raw indexOf pairs). Every
 * one of them stops working the moment either module becomes an external file —
 * which is what the Showroom relocation does (SHOWROOM_EXTRACTION_SPIKE.md).
 *
 * Ten seams is ten places to fix and ten chances to fix nine. This is the one
 * seam: gates ask for a module by NAME, and this decides where it lives.
 *
 * HOW IT LOCATES A MODULE, in order:
 *   1. an explicit override (opts.from, or CARDINAL_MODULE_<NAME>_<KIND>) —
 *      what fixtures and the relocation gate use;
 *   2. the INLINE block by id — today's answer, unchanged;
 *   3. an EXTERNAL file the artifact itself references — for js, the local
 *      <script src> files; for css, the local <link rel=stylesheet> files —
 *      picking the one whose text carries the module's signature.
 *
 * ⚠ STEP 3 FOLLOWS THE ARTIFACT, IT DOES NOT GUESS A FILENAME. The gate reads
 * what the page actually loads. A hardcoded `showroom/showcase.js` would pass
 * while the page loaded something else entirely — the gate would be testing a
 * file nobody ships. Identity comes from a signature in the text, so renaming
 * the file cannot silently point a gate at the wrong module.
 *
 * ⚠ JS AND CSS ARE SCANNED THROUGH DIFFERENT TAGS, WHICH IS WHAT KEEPS THE
 * SIGNATURES HONEST. `--sh-` appears 181 times in cr-show-styles and 4 times in
 * cr-show-script (inside var() fallbacks in strings), so as a bare text
 * signature it is ambiguous. It is not ambiguous when only <link rel=stylesheet>
 * files are considered. Measured, not assumed.
 *
 * MISSING BEHAVIOUR IS THE CALLER'S, and it deliberately varies: gate_1076,
 * harness_showcase, harness_walk and harness_colors THROW; gate_983 handles a
 * null and reports red. `opts.missing` preserves each one rather than imposing
 * a single policy on gates whose failure semantics were chosen on purpose.
 */
const fs = require('fs');
const path = require('path');
const P = require('./script_paths.cjs');

/* Descriptors. `sig` identifies the module's TEXT wherever it lives; `id` is
   where it lives today. Both are needed: the id for the inline case, the
   signature for the relocated one. */
const MODULES = {
  'showcase.js':  { id: 'cr-show-script', tag: 'script', kind: 'js',
                    sig: /window\.CardinalShowcase\s*=/ },
  /* ⚠ `--sh-x:` WOULD HAVE BEEN WRONG, AND IT PASSED A SELFTEST BEFORE BEING
     MEASURED. cr-show-styles contains ZERO `--sh-` declarations — all 182 hits
     are `var(--sh-x,#literal)` references, because that module pins every
     colour with a literal fallback instead of declaring tokens. A fixture I
     wrote by hand had a declaration in it, so the signature looked fine and
     found nothing in production. Test against production shapes, not
     convenient fixtures — enforced now by the signature-matrix selftest below. */
  'showcase.css': { id: 'cr-show-styles', tag: 'style',  kind: 'css',
                    sig: /var\(\s*--sh-/i },
  'colors.js':    { id: 'cr-occ-script',  tag: 'script', kind: 'js',
                    sig: /window\.CardinalColors\s*=/ },
  'colors.css':   { id: 'cr-occ-styles',  tag: 'style',  kind: 'css',
                    sig: /--occ-[a-z0-9-]+\s*:/i },
  /* The Showroom's one image utility. It does NOT exist in Cardinal — there
     `shrink()` still lives inside cr-show-script — so a lookup returns null
     there and every caller falls back to the module's own text unchanged.
     That is what lets ONE gate assert on the image pipeline in both trees
     instead of forking into a Cardinal copy and a Showroom copy. */
  'showroom.images': { id: '__showroom_images__', tag: 'script', kind: 'js',
                       sig: /window\.CardinalShowroomImages\s*=/, notInApp: true },
};

function inlineBlock(html, d, includeOpenTag) {
  const open = `<${d.tag} id="${d.id}">`;
  const i = html.indexOf(open);
  if (i === -1) return null;
  const j = html.indexOf(`</${d.tag}>`, i);
  if (j === -1) return null;
  return html.slice(includeOpenTag ? i : i + open.length, j);
}

function externalBlock(html, d, htmlPath) {
  if (!htmlPath) return null;
  const cands = d.kind === 'js'
    ? P.externalRefs(html).map(r => r.src)
    : P.stylesheetRefs(html).map(r => r.href);
  for (const u of cands) {
    if (P.isRemote(u)) continue;                 // somebody else's server
    const f = P.existingLocal(u, htmlPath);
    if (!f) continue;                            // check_external_scripts reports this
    const text = fs.readFileSync(f, 'utf8');
    if (d.sig.test(text)) return { text, file: f };
  }
  return null;
}

/**
 * @param html      the artifact's text
 * @param name      a key of MODULES, e.g. 'showcase.js'
 * @param opts.htmlPath        path the html came from — REQUIRED to follow an
 *                             external reference; without it only inline works
 * @param opts.from            explicit file, bypassing resolution (fixtures)
 * @param opts.includeOpenTag  keep the `<script id=...>` in the returned text,
 *                             which two harnesses' assertions depend on
 * @param opts.missing         'null' (default) | 'throw'
 * @returns the module text, or null
 */
function moduleText(html, name, opts = {}) {
  const d = MODULES[name];
  if (!d) throw new Error('module_source: unknown module "' + name + '"');

  const envKey = 'CARDINAL_MODULE_' + name.replace(/[.-]/g, '_').toUpperCase();
  const from = opts.from || process.env[envKey];
  let text = null, where = null;

  if (from) {
    if (!fs.existsSync(from)) throw new Error(`module_source: ${name} override not found: ${from}`);
    text = fs.readFileSync(from, 'utf8'); where = 'override:' + from;
  }
  if (text == null) {
    const inl = inlineBlock(html, d, !!opts.includeOpenTag);
    if (inl != null) { text = inl; where = 'inline:' + d.id; }
  }
  if (text == null && opts.htmlPath) {
    const ext = externalBlock(html, d, opts.htmlPath);
    if (ext) {
      text = opts.includeOpenTag ? `<${d.tag} id="${d.id}">` + ext.text : ext.text;
      where = 'external:' + path.relative(P.ROOT, ext.file);
    }
  }

  if (text == null) {
    if (opts.missing === 'throw') {
      throw new Error(`module_source: ${name} not found — no inline <${d.tag} id="${d.id}"> ` +
                      `and no referenced local file matching ${d.sig}`);
    }
    return null;
  }
  lastWhere[name] = where;
  return text;
}

const lastWhere = {};
/** Where the last successful lookup found it — for a gate that wants to say so. */
const foundIn = name => lastWhere[name] || null;

module.exports = { MODULES, moduleText, foundIn };

/* ------------------------------------------------------------------ selftest
 * Proves the resolver finds a module in BOTH homes, and — the part that matters
 * — that it FAILS when the module is genuinely absent instead of returning an
 * empty string. An empty string is the vacuous-pass hazard: every `.includes()`
 * assertion in a gate goes false and the gate reports a wall of honest-looking
 * failures whose real cause is that it never found the module at all.
 *   Run: node module_source.cjs --selftest
 */
if (require.main === module && process.argv[2] === '--selftest') {
  const os = require('os');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-self-'));
  const cases = [];
  const ok = (c, m) => cases.push([!!c, m]);
  const mk = (name, files, html) => {
    const dir = path.join(d, name); fs.mkdirSync(dir, { recursive: true });
    for (const [f, b] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), b);
    const p = path.join(dir, 'page.html'); fs.writeFileSync(p, html); return p;
  };
  const JS  = 'var a=1;\nwindow.CardinalShowcase = Object.assign(window.CardinalShowcase||{},{open:function(){}});\n';
  /* ⚠ PRODUCTION SHAPE, NOT A CONVENIENT ONE. The real cr-show-styles declares
     no tokens at all — every colour is `var(--sh-x,#literal)`. A fixture with
     `--sh-ink:#fff` in it is what let a wrong signature look correct. */
  const CSS = '#cr-show{background:var(--sh-bg,#050607);color:var(--sh-ink,#fff);}\n';

  /* 1 — inline, today's shape */
  {
    const p = mk('inline', {}, `<script id="cr-show-script">${JS}</script>\n<style id="cr-show-styles">${CSS}</style>`);
    const h = fs.readFileSync(p, 'utf8');
    ok(moduleText(h, 'showcase.js', { htmlPath: p }) === JS, 'inline js found, byte-exact');
    ok(/^inline:/.test(foundIn('showcase.js')), 'and reports where: ' + foundIn('showcase.js'));
    ok(moduleText(h, 'showcase.css', { htmlPath: p }) === CSS, 'inline css found, byte-exact');
  }

  /* 2 — RELOCATED: the block is gone and the page references files instead.
     This is the whole point of the change; it must return identical text. */
  {
    const p = mk('reloc', { 'showcase.js': JS, 'showcase.css': CSS },
      '<link rel="stylesheet" href="showcase.css">\n<script src="showcase.js"></script>');
    const h = fs.readFileSync(p, 'utf8');
    ok(moduleText(h, 'showcase.js', { htmlPath: p }) === JS, 'RELOCATED js found via <script src>');
    ok(/^external:/.test(foundIn('showcase.js')), 'and reports where: ' + foundIn('showcase.js'));
    ok(moduleText(h, 'showcase.css', { htmlPath: p }) === CSS, 'RELOCATED css found via <link rel=stylesheet>');
  }

  /* 3 — the signature does the identifying, so the right file wins among several */
  {
    const p = mk('many', { 'a.js': 'var other=1;\n', 'showcase.js': JS, 'z.js': 'var z=2;\n' },
      '<script src="a.js"></script><script src="showcase.js"></script><script src="z.js"></script>');
    ok(moduleText(fs.readFileSync(p, 'utf8'), 'showcase.js', { htmlPath: p }) === JS,
       'picks the file carrying the signature, not the first <script src>');
  }

  /* 4 — a <link> that is not a stylesheet must not be mistaken for the CSS */
  {
    const p = mk('preload', { 'showcase.css': CSS },
      '<link rel="preload" as="style" href="showcase.css">');
    ok(moduleText(fs.readFileSync(p, 'utf8'), 'showcase.css', { htmlPath: p }) === null,
       'a rel=preload link is NOT treated as the stylesheet');
  }

  /* 5 — ABSENT. The hazard: silently returning '' makes every assertion in a
     gate fail for a reason the output never names. */
  {
    const p = mk('gone', {}, '<p>nothing here</p>');
    const h = fs.readFileSync(p, 'utf8');
    const r = moduleText(h, 'showcase.js', { htmlPath: p });
    ok(r === null, 'a missing module returns null, never an empty string');
    let threw = null;
    try { moduleText(h, 'showcase.js', { htmlPath: p, missing: 'throw' }); } catch (e) { threw = e; }
    ok(threw && /not found/.test(threw.message), 'missing:"throw" throws, naming the module');
    ok(threw && /cr-show-script/.test(threw.message), 'and names the block id it looked for');
  }

  /* 6 — a remote CDN src must never be fetched or read */
  {
    const p = mk('cdn', {}, '<script src="https://cdn.example.com/showcase.js"></script>');
    ok(moduleText(fs.readFileSync(p, 'utf8'), 'showcase.js', { htmlPath: p }) === null,
       'a remote src is skipped, not fetched');
  }

  /* 7 — includeOpenTag parity: two harnesses slice from the `<script id=...>`
     itself and their assertions see that prefix. It must survive relocation. */
  {
    const inl = mk('tagi', {}, `<script id="cr-show-script">${JS}</script>`);
    const rel = mk('tagr', { 'showcase.js': JS }, '<script src="showcase.js"></script>');
    const a = moduleText(fs.readFileSync(inl, 'utf8'), 'showcase.js', { htmlPath: inl, includeOpenTag: true });
    const b = moduleText(fs.readFileSync(rel, 'utf8'), 'showcase.js', { htmlPath: rel, includeOpenTag: true });
    ok(a.startsWith('<script id="cr-show-script">'), 'includeOpenTag keeps the tag inline');
    ok(a === b, 'and the relocated text is IDENTICAL to the inline text, tag included');
  }

  /* 8 — an explicit override beats everything, which is how fixtures break a
     module on purpose without touching the artifact */
  {
    const p = mk('over', {}, `<script id="cr-show-script">${JS}</script>`);
    const alt = path.join(d, 'alt.js'); fs.writeFileSync(alt, 'var broken=');
    ok(moduleText(fs.readFileSync(p, 'utf8'), 'showcase.js', { htmlPath: p, from: alt }) === 'var broken=',
       'opts.from overrides an inline block');
    let threw = false;
    try { moduleText(fs.readFileSync(p, 'utf8'), 'showcase.js', { from: path.join(d, 'nope.js') }); }
    catch (_) { threw = true; }
    ok(threw, 'and a missing override throws rather than silently falling back');
  }

  /* 9 — ⚠ THE SIGNATURE MATRIX, AGAINST THE REAL SHIPPED BLOCKS. Every case
     above uses fixtures I wrote, and a fixture I wrote is exactly how the
     showcase.css signature came to be wrong: it matched `--sh-x:`, which does
     not occur even once in the real stylesheet. This case takes the four blocks
     out of the actual artifact and requires each signature to match ITS OWN
     module and NO other. It is the only check here that can catch a signature
     that is merely plausible. */
  {
    const app = path.join(P.ROOT, 'index.html');
    if (!fs.existsSync(app)) {
      ok(false, 'signature matrix: index.html not found — cannot validate against production shapes');
    } else {
      const html = fs.readFileSync(app, 'utf8');
      const texts = {};
      for (const [n, d] of Object.entries(MODULES)) texts[n] = inlineBlock(html, d, false);
      for (const [n, d] of Object.entries(MODULES)) {
        /* ⚠ A DESCRIPTOR THAT IS NOT IN CARDINAL IS ASSERTED ABSENT, NEVER
           SKIPPED. showroom.images exists only in the Showroom; skipping it
           here would mean a descriptor that silently stops being checked, and
           its signature could then start colliding with a real module without
           anything noticing. So: prove it is absent, and still prove its
           signature does not match anything that IS here. */
        if (d.notInApp) {
          const wrong = Object.keys(MODULES).filter(o => o !== n && texts[o] != null && d.sig.test(texts[o]));
          ok(texts[n] == null, `${n} is correctly ABSENT from index.html (Showroom-only)`);
          ok(wrong.length === 0,
             `and its signature still matches no Cardinal module` + (wrong.length ? ` — COLLIDES WITH ${wrong.join(', ')}` : ''));
          continue;
        }
        if (texts[n] == null) { ok(false, `signature matrix: ${n} block missing from index.html`); continue; }
        ok(d.sig.test(texts[n]), `signature for ${n} matches the REAL shipped block`);
        const collides = Object.keys(MODULES).filter(o => o !== n && texts[o] != null && d.sig.test(texts[o]));
        ok(collides.length === 0,
           `and matches no other module` + (collides.length ? ` — COLLIDES WITH ${collides.join(', ')}` : ''));
      }
    }
  }

  fs.rmSync(d, { recursive: true, force: true });
  let fail = 0;
  for (const [good, msg] of cases) { console.log(`  ${good ? 'ok  ' : 'FAIL'} ${msg}`); if (!good) fail++; }
  console.log(`SELFTEST ${fail ? 'FAIL' : 'PASS'} (${cases.length - fail}/${cases.length})`);
  process.exit(fail ? 1 : 0);
}
