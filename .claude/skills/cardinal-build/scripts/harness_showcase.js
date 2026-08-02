/* Build 574 harness — exercises the SHIPPED cr-show-script text.
 *
 * Not a re-implementation: the module source is sliced out of index.html and
 * executed, so what is proved here is what deployed. Mocks are locked with
 * defineProperty because the app's async boot has nulled window.supa under a
 * harness before.
 *
 * jsdom cannot prove colour — var() inside a shorthand comes back rgba(0,0,0,0).
 * Everything asserted below is structural. Theo's eyes remain the visual gate.
 */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync('/home/user/cardinal-inspections/index.html', 'utf8');
let fails = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}

/* ── slice the shipped module out of the artifact ───────────────────────── */
function block(id, tag) {
  const open = `<${tag} id="${id}">`;
  const i = HTML.indexOf(open);
  if (i === -1) throw new Error('block not found: ' + id);
  const j = HTML.indexOf(`</${tag}>`, i);
  return HTML.slice(i + open.length, j);
}
const MODULE_JS = block('cr-show-script', 'script');
const MODULE_CSS = block('cr-show-styles', 'style');

console.log('\n── slice ──');
ok('module script sliced', MODULE_JS.length > 8000, MODULE_JS.length + ' chars');
ok('module css sliced', MODULE_CSS.length > 2000, MODULE_CSS.length + ' chars');

/* ── production-shaped fixtures ─────────────────────────────────────────── */
const PAIRS = [
  { id: '11111111-2222-3333-4444-555555555555', address: '123 Main St', city: 'Dayton',
    trade: 'roof', material: 'Owens Corning Duration — Onyx Black', completed_on: '2025-11-04',
    before_path: 'showcase/a/before.jpg', build_path: 'showcase/a/build.jpg',
    after_path: 'showcase/a/after.jpg', score: 98, published: true, sort_order: 0 },
  { id: '66666666-7777-8888-9999-000000000000', address: '45 Oakwood Ave', city: 'Kettering',
    trade: 'siding', material: 'James Hardie — Iron Gray', completed_on: '2025-08-19',
    before_path: 'showcase/b/before.jpg', build_path: null,
    after_path: 'showcase/b/after.jpg', score: 92, published: true, sort_order: 1 }
];

function makeSupa(rows, workRows) {
  return {
    from(table) {
      const data = table === 'workmanship_pairs' ? (workRows || []) : rows;
      const q = {
        select() { return q; },
        order() { return q; },
        eq() { return q; },
        insert() { return q; },
        update() { return q; },
        delete() { return q; },
        then(res) { return Promise.resolve({ data, error: null }).then(res); }
      };
      return q;
    },
    storage: { from() { return { upload: async () => ({ error: null }) }; } }
  };
}

async function boot({ admin, rows, workRows }) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>',
    { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;

  // Lock the mocks — the app's boot has nulled window.supa under a harness before.
  Object.defineProperty(w, 'supa', { value: makeSupa(rows, workRows), writable: false });
  Object.defineProperty(w, 'is_admin', { value: () => admin, writable: false });

  const signCalls = [];
  w.signedPhotoMap = async (paths) => {
    signCalls.push(paths.slice());
    const out = {};
    paths.forEach(p => { out[p] = 'https://signed.example/' + p + '?token=abc'; });
    return out;
  };
  let hideCalls = 0, navViews = [], homeCalls = 0, reportCalls = 0;
  w.openReportsView = () => { reportCalls++; };
  w.hideAllViews = () => { hideCalls++; };
  w.navSetView = (v) => { navViews.push(v); };
  w.showHome = () => { homeCalls++; };
  w.confirm = () => true;

  w.eval(MODULE_JS);
  return {
    w, d: w.document,
    stats: () => ({ hideCalls, navViews, homeCalls, signCalls, reportCalls })
  };
}
const settle = () => new Promise(r => setTimeout(r, 30));

(async () => {
  /* ── 1 · export surface ──────────────────────────────────────────────── */
  console.log('\n── export surface ──');
  {
    const { w } = await boot({ admin: true, rows: PAIRS });
    const api = w.CardinalShowcase;
    ok('window.CardinalShowcase exists', !!api);
    ok('open/close/reload exported',
      api && typeof api.open === 'function' && typeof api.close === 'function'
         && typeof api.reload === 'function');
    // Object.assign merge, not plain assignment — a later module must survive.
    ok('export merges rather than replaces',
      /window\.CardinalShowcase\s*=\s*Object\.assign\(window\.CardinalShowcase\s*\|\|\s*\{\}/.test(MODULE_JS));
  }

  /* ── 2 · open: overlay, hideAllViews, history ────────────────────────── */
  console.log('\n── open ──');
  {
    const h = await boot({ admin: true, rows: PAIRS });
    h.w.CardinalShowcase.open();
    await settle();
    const el = h.d.getElementById('cr-show');
    ok('#cr-show created', !!el);
    ok('shown by CLASS not display', el && el.classList.contains('open') && !el.style.display,
       el ? `class=${el.className} display=${el.style.display || '(none set)'}` : '');
    ok('called hideAllViews', h.stats().hideCalls === 1, 'calls=' + h.stats().hideCalls);
    ok('recorded history as "showcase"', h.stats().navViews.includes('showcase'),
       JSON.stringify(h.stats().navViews));
    // The scroll-lock rule: this module must NOT become the 14th writer.
    ok('did NOT write body.style.overflow', h.d.body.style.overflow === '',
       'overflow=' + JSON.stringify(h.d.body.style.overflow));
    ok('module source contains no body.style.overflow write',
       !/body\.style\.overflow\s*=/.test(MODULE_JS));
  }

  /* ── 3 · pairs render, signed for display only ───────────────────────── */
  console.log('\n── pairs ──');
  {
    const h = await boot({ admin: true, rows: PAIRS });
    h.w.CardinalShowcase.open();
    await settle();
    const el = h.d.getElementById('cr-show');
    const cmp = el.querySelector('[data-cmp]');
    ok('comparison built', !!cmp);
    const before = el.querySelector('[data-role="before"]');
    const after = el.querySelector('[data-role="after"]');
    ok('before + after images present', !!before && !!after);
    ok('images use SIGNED urls', after && after.getAttribute('src').startsWith('https://signed.example/'),
       after ? after.getAttribute('src').slice(0, 40) : '');
    ok('before pane carries the clip class', before && before.classList.contains('bf'));
    ok('divider handle present', !!el.querySelector('[data-hd]'));
    ok('address shown when privacy off', el.textContent.includes('123 Main St'));
    ok('card grid rendered for 2 pairs', el.querySelectorAll('[data-pick]').length === 2,
       'cards=' + el.querySelectorAll('[data-pick]').length);

    // The never-mutate rule: signing must not write back onto the row objects.
    ok('row objects NOT mutated by signing',
      PAIRS[0].before_path === 'showcase/a/before.jpg' &&
      !('url' in PAIRS[0]) && !('signedUrl' in PAIRS[0]));

    // build_path absent on pair 2 → its dock button must be disabled
    el.querySelector('[data-pick="1"]').click();
    await settle();
    const buildBtn = el.querySelector('[data-ph="build"]');
    ok('build button disabled when no build photo', buildBtn && buildBtn.hasAttribute('disabled'));
  }

  /* ── 4 · privacy mode REMOVES the address ────────────────────────────── */
  console.log('\n── privacy ──');
  {
    const h = await boot({ admin: true, rows: PAIRS });
    h.w.CardinalShowcase.open();
    await settle();
    const el = h.d.getElementById('cr-show');
    ok('address present before toggle', el.textContent.includes('123 Main St'));
    el.querySelector('[data-act="priv"]').click();
    await settle();
    ok('overlay marked private', el.classList.contains('priv'));
    // Must be GONE from the DOM, not merely hidden — a homeowner holding the
    // tablet can select hidden text.
    ok('address REMOVED from the DOM, not just hidden', !el.textContent.includes('123 Main St'),
       'still found in textContent');
    ok('second address gone too', !el.textContent.includes('45 Oakwood Ave'));
    ok('city retained for context', el.textContent.includes('Dayton'));
    ok('project number substituted', /Project C-/.test(el.textContent));
  }

  /* ── 5 · admin gate ──────────────────────────────────────────────────── */
  console.log('\n── permissions ──');
  {
    const admin = await boot({ admin: true, rows: PAIRS });
    admin.w.CardinalShowcase.open();
    await settle();
    const ael = admin.d.getElementById('cr-show');
    ok('admin sees Add a pair', !!ael.querySelector('[data-act="add"]'));
    ok('admin sees Publish', !!ael.querySelector('[data-act="pub"]'));
    ok('admin sees Remove', !!ael.querySelector('[data-act="del"]'));

    const rep = await boot({ admin: false, rows: PAIRS });
    rep.w.CardinalShowcase.open();
    await settle();
    const rel = rep.d.getElementById('cr-show');
    ok('non-admin sees NO Add', !rel.querySelector('[data-act="add"]'));
    ok('non-admin sees NO Publish', !rel.querySelector('[data-act="pub"]'));
    ok('non-admin sees NO Remove', !rel.querySelector('[data-act="del"]'));
    ok('non-admin still sees the transformation', !!rel.querySelector('[data-cmp]'));
    ok('non-admin still sees the cards', rel.querySelectorAll('[data-pick]').length === 2);
  }

  /* ── 6 · empty state ─────────────────────────────────────────────────── */
  console.log('\n── empty state ──');
  {
    const h = await boot({ admin: false, rows: [] });
    h.w.CardinalShowcase.open();
    await settle();
    const el = h.d.getElementById('cr-show');
    ok('empty state rendered', !!el.querySelector('.cr-sh-empty'));
    ok('no comparison when empty', !el.querySelector('[data-cmp]'));
    ok('rep empty copy names Theo', /Theo/.test(el.textContent));

    const a = await boot({ admin: true, rows: [] });
    a.w.CardinalShowcase.open();
    await settle();
    ok('admin empty state offers Add', !!a.d.getElementById('cr-show').querySelector('[data-act="add"]'));
  }

  /* ── 7 · close ───────────────────────────────────────────────────────── */
  console.log('\n── close ──');
  {
    const h = await boot({ admin: true, rows: PAIRS });
    h.w.CardinalShowcase.open();
    await settle();
    const el = h.d.getElementById('cr-show');
    h.w.CardinalShowcase.close(false);
    ok('close removes the open class', !el.classList.contains('open'));
    ok('close(false) does not bounce home', h.stats().homeCalls === 0);
    h.w.CardinalShowcase.open();
    await settle();
    h.w.CardinalShowcase.close();
    ok('close() default returns home', h.stats().homeCalls === 1);
    ok('close leaves overflow untouched', h.d.body.style.overflow === '');
  }

  /* ── 8 · integration points in the artifact ──────────────────────────── */
  console.log('\n── integration (artifact text) ──');
  {
    ok('registered in hideAllViews array',
      /\{ id:'cr-show', api:window\.CardinalShowcase \}\]\.forEach/.test(HTML));
    ok('navRestore has a showcase case',
      /case 'showcase':\s*if\(window\.CardinalShowcase\) window\.CardinalShowcase\.open\(\); break;/.test(HTML));
    ok('Sales Floor has the entry button', /data-go="showcase"/.test(HTML));
    ok('Sales Floor handler routes it',
      /if\(d === 'showcase' && window\.CardinalShowcase\)\{/.test(HTML));
    ok('handler closes SF before opening (no stacked overlays)',
      /if\(d === 'showcase' && window\.CardinalShowcase\)\{\s*\nclose\(false\); window\.CardinalShowcase\.open\(\); return;/.test(HTML));
    ok('#cr-show joined the shared 572 desktop rule',
      /body\.cr-lnav-on #cr-sf,\s*\nbody\.cr-lnav-on #cr-pb,\s*\nbody\.cr-lnav-on #cr-show,/.test(HTML));
    ok('desktop measure added', /body\.cr-lnav-on \.cr-sh-wrap\{ max-width:1180px !important; \}/.test(HTML));
    ok('CHANGELOG entry for 574', /\{ b:574,/.test(HTML));
    /* Self-computing, not a hardcoded number: a literal here is read off an
       already-patched tree and goes stale on the very next build -- it did,
       one build later. This form also catches the real bug class, which is a
       stamp and a CHANGELOG that disagree about what shipped. */
    const stamp = (HTML.match(/data-cr-footer[^>]*>v2026-\d\d-\d\d build (\d+)/) || [])[1];
    const newestEntry = Math.max(...[...HTML.matchAll(/\{ b:(\d+),/g)].map(m => +m[1]));
    ok('app stamp exists and is numeric', !!stamp, String(stamp));
    ok('app stamp matches the newest CHANGELOG entry',
      Number(stamp) === newestEntry, `stamp=${stamp} newest CHANGELOG=${newestEntry}`);

    // Rules the module must obey, asserted against its own shipped text.
    ok('every --sh- reference carries a literal fallback',
      (MODULE_CSS.match(/var\(--sh-[a-z0-9-]+\)/g) || []).length === 0,
      JSON.stringify((MODULE_CSS.match(/var\(--sh-[a-z0-9-]+\)/g) || []).slice(0, 4)));
    /* Storage paths, never CompanyCam CDN links — so a curated pair outlives the
       vendor. Asserted on BEHAVIOUR, not on the word: a first pass grepped for
       /companycam/i and went red on the design comment that explains the rule,
       and on the form copy that tells Theo the same thing. Comments and strings
       lie in both directions — the file's own lesson, earned here. */
    ok('CompanyCam CDN columns never referenced',
      !/thumb_url|preview_url/.test(MODULE_JS));
    ok('saved row takes its paths from the upload, not from any url',
      /before_path: paths\.before/.test(MODULE_JS) &&
      /after_path: paths\.after/.test(MODULE_JS) &&
      /build_path: paths\.build \|\| null/.test(MODULE_JS));
    ok('uploads land under showcase/ in the private photos bucket',
      /var base = 'showcase\/' \+ id \+ '\/'/.test(MODULE_JS) &&
      /storage\.from\('photos'\)\.upload\(path/.test(MODULE_JS));
    ok('delete proves itself with .select(\'id\')',
      /\.delete\(\)\.eq\('id', p\.id\)\.select\('id'\)/.test(MODULE_JS));
    ok('insert checks rows, not just .error',
      /!ins\.data \|\| !ins\.data\.length/.test(MODULE_JS));
    ok('trade vocabulary matches EST_TYPES exactly',
      /var TRADES = \['roof','siding','windows','andersen','gutters','general'\]/.test(MODULE_JS));
  }


  /* ── 9 · release (build 575) ─────────────────────────────────────────── */
  console.log('\n── release ──');
  {
    const CLEARED = [{ ...PAIRS[0], release_on: '2025-11-14', release_by: 'M. Alvarez' }];
    const h = await boot({ admin: true, rows: CLEARED });
    h.w.CardinalShowcase.open();
    await settle();
    const el = h.d.getElementById('cr-show');
    const b = el.querySelector('.cr-sh-rel-b');
    ok('cleared pair shows a release badge', !!b && b.classList.contains('ok'),
       b ? b.className : 'no badge');
    ok('badge names who gave it', b && b.textContent.includes('M. Alvarez'), b && b.textContent);

    const u = await boot({ admin: true, rows: [PAIRS[1]] });
    u.w.CardinalShowcase.open();
    await settle();
    const ub = u.d.getElementById('cr-show').querySelector('.cr-sh-rel-b');
    ok('pair with no release is marked, not left blank', !!ub && ub.classList.contains('no'));
    ok('unreleased wording is "In-app only"', ub && /In-app only/.test(ub.textContent), ub && ub.textContent);

    // The form must offer the fields, and refuse a date with no name.
    const f = await boot({ admin: true, rows: [] });
    f.w.CardinalShowcase.open();
    await settle();
    f.d.getElementById('cr-show').querySelector('[data-act="add"]').click();
    await settle();
    const form = f.d.getElementById('cr-show-form');
    ok('form offers the release checkbox', !!form.querySelector('[data-f="has_release"]'));
    ok('form offers release date + name',
      !!form.querySelector('[data-f="release_on"]') && !!form.querySelector('[data-f="release_by"]'));
    ok('save refuses a ticked release with no name',
      /Who gave the release\?/.test(MODULE_JS) &&
      /if\(!rby\) throw new Error/.test(MODULE_JS));
    ok('release defaults to today only when the box is ticked',
      /if\(relBox && relBox\.checked\)\{/.test(MODULE_JS));
    ok('unticked pair sends no release columns at all',
      !/release_on: get\('release_on'\) \|\| new Date/.test(MODULE_JS.split('if(relBox && relBox.checked){')[0]));
  }


  /* ── 10 · Hall of Fame (build 576) ───────────────────────────────────── */
  console.log('\n── hall of fame ──');
  const WORK = [{
    id: 'w1', title: 'High-nailing', trade: 'roof',
    lesson: 'Nails above the line pin nothing.',
    bad_path: 'workmanship/w1/bad.jpg', bad_caption: '3 nails, 35 mm high.',
    good_path: 'workmanship/w1/good.jpg', good_caption: 'Four fasteners through both courses.',
    published: true
  }];
  {
    const h = await boot({ admin: false, rows: PAIRS, workRows: WORK });
    h.w.CardinalShowcase.open();
    await settle();
    const el = h.d.getElementById('cr-show');
    ok('tab strip rendered', el.querySelectorAll('[data-tab]').length === 2);
    ok('showcase is the tab on open', !!el.querySelector('[data-tab="showcase"].on'));
    ok('Inspections is a LINK, not a third tab',
      !el.querySelector('[data-tab="inspections"]') && !!el.querySelector('[data-act="reports"]'));

    el.querySelector('[data-tab="work"]')?.click();
    await settle(); await settle();
    ok('switching to Hall of Fame renders a comparison', !!el.querySelector('.cr-sh-wk'));
    ok('both sides render', el.querySelectorAll('.cr-sh-side').length === 2);
    ok('bad side is marked bad', !!el.querySelector('.cr-sh-side.bad'));
    ok('good side is marked good', !!el.querySelector('.cr-sh-side.good'));
    const imgs = [...el.querySelectorAll('.cr-sh-side img')];
    ok('both images signed', imgs.length === 2 && imgs.every(i => i.getAttribute('src').startsWith('https://signed.example/')),
       imgs.map(i => i.getAttribute('src').slice(0, 28)).join(' | '));
    ok('the lesson line shows', el.textContent.includes('Nails above the line pin nothing.'));
    ok('non-admin sees no Add', !el.querySelector('[data-act="waddc"]'));
    ok('non-admin sees no remove', !el.querySelector('[data-wdel]'));
  }
  {
    const h = await boot({ admin: true, rows: PAIRS, workRows: WORK });
    h.w.CardinalShowcase.open();
    await settle();
    const el = h.d.getElementById('cr-show');
    el.querySelector('[data-tab="work"]')?.click();
    await settle(); await settle();
    ok('admin sees Add a comparison', !!el.querySelector('[data-act="waddc"]'));
    ok('admin sees remove', !!el.querySelector('[data-wdel]'));
    el.querySelector('[data-act="waddc"]')?.click();
    await settle();
    const form = h.d.getElementById('cr-show-form') || h.d.createElement('div');
    ok('form asks for both photographs',
      !!form.querySelector('[data-f="bad"]') && !!form.querySelector('[data-f="good"]'));
    ok('form asks for a title and a lesson',
      !!form.querySelector('[data-f="title"]') && !!form.querySelector('[data-f="lesson"]'));
  }
  {
    const h = await boot({ admin: true, rows: PAIRS, workRows: [] });
    h.w.CardinalShowcase.open();
    await settle();
    const el = h.d.getElementById('cr-show');
    el.querySelector('[data-tab="work"]')?.click();
    await settle(); await settle();
    ok('empty Hall of Fame still offers Add', !!el.querySelector('[data-act="waddc"]'));
    ok('empty state shown', !!el.querySelector('.cr-sh-empty'));

    // The link must CLOSE the showcase before handing off — two full-screen
    // overlays open at once is the trap 570-572 spent three builds on.
    el.querySelector('[data-act="reports"]')?.click();
    await settle();
    ok('Inspections link closed the showcase', !el.classList.contains('open'));
    ok('Inspections link opened the EXISTING reports view', h.stats().reportCalls === 1);
  }
  {
    ok('save refuses a comparison with no title',
      /if\(!title\) return showErr/.test(MODULE_JS));
    ok('save refuses a comparison missing a photograph',
      /if\(!fb \|\| !fg\) return showErr/.test(MODULE_JS));
    ok('work delete proves itself with .select(\'id\')',
      /from\('workmanship_pairs'\)\.delete\(\)\.eq\('id', id\)\.select\('id'\)/.test(MODULE_JS));
    ok('work uploads land under workmanship/',
      /var base = 'workmanship\/' \+ id \+ '\/'/.test(MODULE_JS));
    ok('Hall of Fame never reads a client record',
      !/projects|inspection_reports|companycam/i.test(MODULE_JS.split('function openWorkForm()')[1] || ''));
  }

  console.log('\n' + '─'.repeat(58));
  console.log((fails === 0 ? 'GREEN' : 'RED') + ` — ${passes} passed, ${fails} failed`);
  console.log('jsdom proves structure only. Colour and layout are Theo\'s eyes.');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
