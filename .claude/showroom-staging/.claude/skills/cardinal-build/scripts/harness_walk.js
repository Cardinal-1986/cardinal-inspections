/* Build 579 harness — The Walk, running the SHIPPED cr-show-script text.
 *
 * Not a re-implementation: the module is sliced out of index.html and executed,
 * so what is proved here is what deployed.
 *
 * WHAT THIS COVERS: the data contracts, which is where this feature can fail
 * silently and expensively — what reaches /api/detect, what reaches the
 * database, and what a non-admin can do. The review screen's whole point is
 * that a person filters the model, so "a rejected finding is absent from the
 * saved payload" is the single most important assertion in the file.
 *
 * WHAT THIS DOES NOT COVER, stated rather than implied:
 *   - the live Gemini/OpenAI call. No network path from here.
 *   - dragging a box. jsdom does no layout, so getBoundingClientRect() is all
 *     zeros and the gesture can never start. Geometry is proved in Chromium by
 *     render_showcase.js instead.
 *   - colour. var() inside a shorthand comes back rgba(0,0,0,0) here.
 */
const fs = require('fs');
/* ⚠ REPO ROOT, NOT A HARDCODED ABSOLUTE PATH. These harnesses carried
   an absolute path to one particular machine baked in — the sandbox they were
   written in. They ran perfectly there and are unrunnable anywhere else,
   which stayed invisible for as long as nothing else ever ran them. The first
   real CI run found it in 27 seconds: harness_tray reads three .sql files by
   absolute path UNCONDITIONALLY, so on the runner it fell 57 passes -> 4 and
   the ratchet went red on the pass count. Resolved from the repo instead. */
const CR_ROOT = require('./script_paths.cjs').ROOT + '/';
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || CR_ROOT + 'index.html';
const HTML = fs.readFileSync(FILE, 'utf8');
let fails = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '  → ' + extra : '')); }
}

/* ⚠ MODULE TEXT COMES FROM module_source.cjs, NOT FROM A BLOCK SLICE.
   This gate used to cut its module out of index.html by `<script id="cr-show-script">`.
   That stops working the instant the module becomes an external file, which is
   what the Showroom relocation does — and it stops working SILENTLY, handing
   the gate an empty string so every assertion fails for a reason the output
   never names. The resolver finds the module inline today and in the file it is
   relocated to tomorrow, and returns byte-identical text either way. */
const MS = require('./module_source.cjs');
const MODULE_JS  = MS.moduleText(HTML, 'showcase.js',  { htmlPath: FILE, missing: 'throw' });
const MODULE_CSS = MS.moduleText(HTML, 'showcase.css', { htmlPath: FILE, missing: 'throw' });

/* Negative control, stated rather than crashed. Run against a pre-579 artifact
   there is no walk tab to click and every test would die on a null deref at the
   first querySelector — a crash stops at the first problem instead of showing
   all of them, and reads like an environment fault rather than a clean red. */
if (!/function renderWalkTab\(/.test(MODULE_JS)) {
  console.log('\nRED — this artifact has no Walk tab (pre-579). Nothing to exercise.');
  process.exit(1);
}
if (!/function renderPresent\(/.test(MODULE_JS)) {
  console.log('\nRED — this artifact has no present mode (pre-584). The Spotlight');
  console.log('assertions would null-deref; failing cleanly instead.');
  process.exit(1);
}

/* ── fixtures shaped like the real tables ───────────────────────────────── */
const WALKS = [
  { id: 'aaaa1111-2222-3333-4444-555555555555', title: '4212 Wilmington Pike — hail',
    address: '4212 Wilmington Pike', city: 'Dayton', trade: 'roof',
    published: true, sort_order: 0, created_by: 'theo@cardinalrenovations.net' },
  { id: 'bbbb1111-2222-3333-4444-555555555555', title: 'Oakwood re-roof',
    address: '18 Far Hills Ave', city: 'Oakwood', trade: 'roof',
    published: false, sort_order: 1, created_by: 'theo@cardinalrenovations.net' }
];
const SHOTS = [
  { id: 'ssss1111-0000-0000-0000-000000000001', walk_id: WALKS[0].id, sort_order: 0,
    path: 'walks/aaaa1111-2222-3333-4444-555555555555/s1.jpg', source: 'phone',
    findings: [], reviewed_at: null, reviewed_by: null },
  { id: 'ssss1111-0000-0000-0000-000000000002', walk_id: WALKS[0].id, sort_order: 1,
    path: 'walks/aaaa1111-2222-3333-4444-555555555555/s2.jpg', source: 'job',
    origin_photo_id: 'pppp1111-0000-0000-0000-000000000001',
    findings: [{ defect: 'hail_impact', severity: 'crit', label: 'Impact bruising, south slope',
                 box: { x: 0.31, y: 0.42, w: 0.18, h: 0.14 }, confidence: 0.82, edited: false }],
    reviewed_at: '2026-08-02T10:00:00Z', reviewed_by: 'theo@cardinalrenovations.net' },
  { id: 'ssss1111-0000-0000-0000-000000000003', walk_id: WALKS[0].id, sort_order: 2,
    path: 'walks/aaaa1111-2222-3333-4444-555555555555/s3.jpg', source: 'phone',
    findings: [], reviewed_at: '2026-08-02T10:05:00Z', reviewed_by: 'theo@cardinalrenovations.net' }
];

/* What api/detect.js really answers with — including the two shapes that matter:
   a defect key this build has never heard of, and a dropped count. */
const DETECT_REPLY = {
  findings: [
    { defect: 'hail_impact', severity: 'crit', label: 'Impact bruising',
      note: 'Granule loss with a soft centre', box: { x: 0.30, y: 0.40, w: 0.20, h: 0.15 }, confidence: 0.82 },
    { defect: 'nail_pop', severity: 'warn', label: 'Nail pop',
      box: { x: 0.62, y: 0.20, w: 0.06, h: 0.06 }, confidence: 0.44 },
    { defect: 'brand_new_defect_key', severity: 'ok', label: 'Something new',
      box: { x: 0.10, y: 0.70, w: 0.10, h: 0.10 }, confidence: null }
  ],
  quality: 'ok', quality_note: '', dropped: 3, via: 'gemini-3.6-flash',
  vocab: { severities: ['crit', 'warn', 'ok'], defects: ['hail_impact', 'nail_pop'] }
};

function makeSupa(state) {
  const table = t => ({
    walks: state.walks, walk_shots: state.shots,
    projects: state.projects || [], project_photos: state.jobPhotos || [],
    showcase_pairs: [], workmanship_pairs: []
  })[t] || [];

  return {
    from(t) {
      let payload = null, op = 'select';
      const q = {
        select() { return q; }, order() { return q; }, eq() { return q; }, limit() { return q; },
        insert(row) { op = 'insert'; payload = row; state.inserts.push({ table: t, row }); return q; },
        update(row) { op = 'update'; payload = row; state.updates.push({ table: t, row }); return q; },
        delete() { op = 'delete'; state.deletes.push({ table: t }); return q; },
        then(res) {
          if (state.refuseWrites && op !== 'select') {
            // How RLS actually refuses: no error, no rows.
            return Promise.resolve({ data: [], error: null }).then(res);
          }
          const data = op === 'select' ? table(t) : [{ id: (payload && payload.id) || 'x' }];
          return Promise.resolve({ data, error: null }).then(res);
        }
      };
      return q;
    },
    storage: {
      from() {
        return {
          upload: async (path) => { state.uploads.push(path); return { error: null }; },
          download: async (path) => {
            state.downloads.push(path);
            return { data: new state.w.Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' }), error: null };
          }
        };
      }
    },
    auth: { getUser: async () => ({ data: { user: { email: 'theo@cardinalrenovations.net' } } }) }
  };
}

async function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM('<!doctype html><html><body></body></html>',
    { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;

  /* Deep-clone the fixtures per boot. They were shared by reference at first
     and three tests went red for it: a successful save in the accept/reject
     block stamped reviewed_at onto the SHOTS object, so two later boots opened
     an already-reviewed shot and never auto-detected. The failures looked like
     app bugs and were entirely the harness's — "test data that lies
     convincingly", straight off the bug-class list. */
  const clone = x => JSON.parse(JSON.stringify(x));
  const state = {
    w, walks: clone(opts.walks || WALKS), shots: clone(opts.shots || SHOTS),
    projects: clone(opts.projects || []), jobPhotos: clone(opts.jobPhotos || []),
    inserts: [], updates: [], deletes: [], uploads: [], downloads: [], detects: [],
    refuseWrites: !!opts.refuseWrites, warns: [], confirmCalls: []
  };

  /* shrink() runs for real — it is on the path to the AI and to storage, and
     stubbing it would mean the size actually sent is never proved. jsdom has no
     canvas and no image decoder, so both are faked at the DOM level rather than
     the module level: the SHIPPED shrink() still executes. */
  const realCreate = w.document.createElement.bind(w.document);
  w.document.createElement = function (tag) {
    if (String(tag).toLowerCase() !== 'canvas') return realCreate(tag);
    const c = realCreate('div');
    c.width = 0; c.height = 0;
    c.getContext = () => ({ drawImage() {}, imageSmoothingEnabled: false, imageSmoothingQuality: '' });
    c.toBlob = (cb) => cb(new w.Blob([new Uint8Array([9, 9, 9])], { type: 'image/jpeg' }));
    return c;
  };
  w.URL.createObjectURL = () => 'blob:fake';
  w.URL.revokeObjectURL = () => {};
  Object.defineProperty(w, 'Image', {
    value: function () {
      const o = { naturalWidth: 4000, naturalHeight: 3000, onload: null, onerror: null };
      Object.defineProperty(o, 'src', { set() { setTimeout(() => o.onload && o.onload(), 0); } });
      return o;
    }, writable: false
  });

  Object.defineProperty(w, 'supa', { value: makeSupa(state), writable: false });
  Object.defineProperty(w, 'is_admin', { value: () => opts.admin !== false, writable: false });
  w.signedPhotoMap = async (paths) => {
    const out = {}; paths.forEach(p => { out[p] = 'https://signed.example/' + p; }); return out;
  };
  w.aiHeaders = async () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer tok' });
  w.fetch = async (url, init) => {
    if (String(url).slice(0, 5) === 'data:') {
      return { ok: true, blob: async () => new w.Blob([new Uint8Array([7])], { type: 'image/jpeg' }) };
    }
    state.detects.push({ url: String(url), body: JSON.parse((init && init.body) || '{}'),
                         headers: (init && init.headers) || {} });
    if (opts.detectFails) return { ok: false, status: 502, json: async () => ({ error: 'AI request failed' }) };
    return { ok: true, status: 200, json: async () => (opts.detectReply || DETECT_REPLY) };
  };
  w.hideAllViews = () => {}; w.navSetView = () => {}; w.showHome = () => {};
  w.openReportsView = () => {}; w.alert = () => {};
  // A spy, not a stub — build 580's whole point is WHETHER confirm() is asked,
  // not just what it answers. state.confirmReturn controls the simulated click.
  state.confirmReturn = opts.confirmReturn !== false;
  w.confirm = (msg) => { state.confirmCalls.push(msg); return state.confirmReturn; };
  w.console = Object.assign({}, console, { warn: (...a) => state.warns.push(a.join(' ')) });

  w.eval(MODULE_JS);
  return { w, d: w.document, state };
}
const settle = (ms) => new Promise(r => setTimeout(r, ms || 40));
const clickTab = (d, name) => d.querySelector(`[data-tab="${name}"]`).click();

(async () => {
  /* ── 1 · the tab strip ─────────────────────────────────────────────────── */
  console.log('\n── the tab strip ──');
  {
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    const el = h.d.getElementById('cr-show');
    const tabs = [...el.querySelectorAll('[data-tab]')].map(b => b.dataset.tab);
    ok('three tabs: showcase, work, walk', tabs.join(',') === 'showcase,work,walk', tabs.join(','));
    ok('The Walk is its own tab', /The Walk/.test(el.textContent));
    /* Theo asked for a third tab, not a fourth. Inspections stays a link out to
       the reports list that already exists — building a second one is the
       duplicate-feature class this project keeps paying for. */
    ok('Inspections is still a LINK, not a tab',
      !!el.querySelector('[data-act="reports"]') && tabs.indexOf('reports') === -1);
    ok('the reports link still hands off to openReportsView',
      /window\.openReportsView\(\)/.test(MODULE_JS));
  }

  /* ── 2 · the walk list ─────────────────────────────────────────────────── */
  console.log('\n── the walk list ──');
  {
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    const el = h.d.getElementById('cr-show');
    ok('both walks listed', el.querySelectorAll('[data-walk]').length === 2,
       el.querySelectorAll('[data-walk]').length);
    ok('an unpublished walk is marked Draft', /Draft/.test(el.textContent));
    ok('admin can start a walk', !!el.querySelector('[data-act="waddwalk"]'));
    ok('the address is shown with privacy off', /4212 Wilmington Pike/.test(el.textContent));
  }

  /* ── 3 · privacy, because the homeowner holds the tablet ───────────────── */
  console.log('\n── privacy ──');
  {
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    const el = h.d.getElementById('cr-show');
    el.querySelector('[data-act="priv"]').click(); await settle();
    ok('privacy REMOVES the street address from the DOM', !/4212 Wilmington Pike/.test(el.textContent));
    ok('privacy keeps the city', /Dayton/.test(el.textContent));
    /* A title carrying the number would leak the address through the heading,
       so a numeric title falls back to a project code rather than being shown. */
    ok('a title containing the street number is masked too', !/4212/.test(el.textContent));
  }

  /* ── 4 · permissions — the real fence is RLS, this is the UI half ──────── */
  console.log('\n── permissions ──');
  {
    const h = await boot({ admin: false });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    const el = h.d.getElementById('cr-show');
    ok('a rep still SEES the walks', el.querySelectorAll('[data-walk]').length === 2);
    ok('a rep gets no "start a walk"', !el.querySelector('[data-act="waddwalk"]'));
    el.querySelector('[data-walk]').click(); await settle();
    ok('a rep can open a walk', el.querySelectorAll('[data-shot]').length === 3,
       el.querySelectorAll('[data-shot]').length);
    ok('a rep gets no add/publish/remove controls',
      !el.querySelector('[data-act="wphone"]') && !el.querySelector('[data-act="wjob"]') &&
      !el.querySelector('[data-act="wpub"]') && !el.querySelector('[data-act="wdelwalk"]'));
    /* A correct refusal must not render as a broken screen — the crew_rates rule. */
    ok('and the screen is not an error', /Wilmington|walk/i.test(el.textContent));
  }

  /* ── 5 · shot states read at a glance ──────────────────────────────────── */
  console.log('\n── shot states ──');
  {
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    const el = h.d.getElementById('cr-show');
    const shots = [...el.querySelectorAll('[data-shot]')];
    ok('three shots', shots.length === 3, shots.length);
    ok('unreviewed reads "Not checked"',
      shots[0].classList.contains('new') && /Not checked/.test(shots[0].textContent));
    ok('reviewed with findings reads the count',
      shots[1].classList.contains('hits') && /1 finding\b/.test(shots[1].textContent),
      shots[1].textContent.trim());
    /* "Nothing found" and "not looked at yet" are very different facts to put
       in front of a client, so they must not share a badge. */
    ok('reviewed with none reads "Nothing found", not "Not checked"',
      shots[2].classList.contains('done') && /Nothing found/.test(shots[2].textContent),
      shots[2].textContent.trim());
  }

  /* ── 6 · THE AI CONTRACT ───────────────────────────────────────────────── */
  console.log('\n── what actually reaches /api/detect ──');
  {
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[0].click();   // unreviewed → auto-detects
    await settle(200);

    const call = h.state.detects[0];
    ok('the route was called', !!call && call.url === '/api/detect', call && call.url);
    /* api/detect.js hands `image` straight to Gemini as inline_data.data, which
       must be BARE base64. /api/caption is passed a full data: URL, so copying
       that call verbatim would fail at the model, not at the fetch — the shape
       of bug that ships looking fine. */
    ok('image is BARE base64, not a data: URL',
      call && typeof call.body.image === 'string' && call.body.image.slice(0, 5) !== 'data:',
      call && String(call.body.image).slice(0, 24));
    ok('mime is sent separately', call && call.body.mime === 'image/jpeg', call && call.body.mime);
    ok('session token is attached', call && /Bearer/.test(call.headers.Authorization || ''));
    ok('the bytes came from storage.download, not a public URL',
      h.state.downloads.length === 1, JSON.stringify(h.state.downloads));
    ok('nothing was fetched from the dead public photo URLs',
      !h.state.detects.some(c => /object\/public/.test(c.url)));
  }

  /* ── 7 · what the answer becomes on screen ─────────────────────────────── */
  console.log('\n── the model answer, rendered ──');
  {
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[0].click(); await settle(200);
    const el = h.d.getElementById('cr-show');

    ok('a box per finding', el.querySelectorAll('[data-box]').length === 3,
       el.querySelectorAll('[data-box]').length);
    ok('a row per finding', el.querySelectorAll('[data-fnd]').length === 3);
    /* Resolution independence: the stored value is a fraction and the style is
       a percentage, so one row is correct on a phone and at 1180px. */
    const b0 = el.querySelector('[data-box="0"]');
    /* Assert on the UNIT and the value, not the literal string the module
       wrote: CSSOM normalises '30.000%' to '30%' on the way back out, which is
       not the module changing its mind about anything. */
    ok('boxes are positioned in PERCENT, not pixels',
      /%$/.test(b0.style.left) && /%$/.test(b0.style.width) &&
      Math.abs(parseFloat(b0.style.left) - 30) < 0.01 &&
      Math.abs(parseFloat(b0.style.width) - 20) < 0.01,
      b0.style.left + ' / ' + b0.style.width);
    ok('severity drives the box class', b0.classList.contains('crit'), b0.className);
    /* dropped is information a person reviewing evidence should have. */
    ok('the dropped count is surfaced, not swallowed',
      /3 proposals had no usable location/.test(el.textContent));
    /* An unknown defect key must RENDER, not vanish. The route already coerces
       to 'other'; a second silent filter here would hide a real finding. */
    ok('an unheard-of defect key still renders',
      /brand new defect key/.test(el.textContent), 'not found in body text');
    ok('vocabulary skew is warned about once',
      h.state.warns.some(x => /vocabulary differs/.test(x)), JSON.stringify(h.state.warns));
  }

  /* ── 8 · THE CONTRACT: only what a human kept is saved ──────────────────── */
  console.log('\n── accept / reject, then save ──');
  {
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[0].click(); await settle(200);
    const el = h.d.getElementById('cr-show');

    // Reject the middle one, and downgrade the first.
    el.querySelector('[data-drop="1"]').click(); await settle();
    ok('rejecting removes it from the working set',
      el.querySelectorAll('[data-fnd]').length === 2, el.querySelectorAll('[data-fnd]').length);
    const sev = el.querySelector('[data-sev="0"]');
    sev.value = 'warn';
    sev.dispatchEvent(new h.w.Event('change')); await settle();

    el.querySelector('[data-act="rsave"]').click(); await settle(120);

    const up = h.state.updates.filter(u => u.table === 'walk_shots').pop();
    ok('the shot row was updated', !!up);
    const kept = up && up.row.findings;
    ok('exactly the two kept findings were written', kept && kept.length === 2, kept && kept.length);
    /* The whole feature in one assertion: the model proposed three, a person
       kept two, and the database holds two. Nothing records the rejected one,
       because "reviewed" is what the presence of a finding MEANS. */
    ok('the rejected finding is absent — not flagged, absent',
      kept && !kept.some(f => f.defect === 'nail_pop'), JSON.stringify(kept && kept.map(f => f.defect)));
    ok('the severity change was persisted', kept && kept[0].severity === 'warn', kept && kept[0].severity);
    ok('a hand-changed finding is marked edited', kept && kept[0].edited === true);
    ok('reviewed_by is the signed-in email',
      up && up.row.reviewed_by === 'theo@cardinalrenovations.net', up && up.row.reviewed_by);
    ok('reviewed_at was stamped', !!(up && up.row.reviewed_at));
    ok('boxes are saved as FRACTIONS, never pixels',
      kept && kept.every(f => f.box.x <= 1 && f.box.y <= 1 && f.box.w <= 1 && f.box.h <= 1),
      JSON.stringify(kept && kept[0].box));
    ok('no signed URL was written onto the row',
      up && !JSON.stringify(up.row).includes('signed.example'));
  }

  /* ── 9 · reopening a reviewed shot ─────────────────────────────────────── */
  console.log('\n── reopening ──');
  {
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[1].click(); await settle(120);
    const el = h.d.getElementById('cr-show');
    ok('opens on the SAVED set, not a blank overlay',
      el.querySelectorAll('[data-fnd]').length === 1, el.querySelectorAll('[data-fnd]').length);
    /* Re-asking is a deliberate button, never automatic: a reviewed shot must
       not silently lose a person's decisions on a second visit. */
    ok('it did NOT re-ask the model on its own', h.state.detects.length === 0, h.state.detects.length);
    ok('the button offers to ask again', /Ask again/.test(el.textContent));
    ok('editing the saved copy does not mutate the loaded row',
      /JSON\.parse\(JSON\.stringify\(f\)\)/.test(MODULE_JS));
  }

  /* ── build 580 · the review screen warns before it discards work ────────── */
  console.log('\n── unsaved-work guard ──');
  {
    // Untouched: opening a shot and immediately leaving costs nothing, so no
    // confirm should fire at all — a guard that nags on every visit is worse
    // than no guard.
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[1].click(); await settle(120);   // pre-reviewed, 1 finding
    h.d.getElementById('cr-show').querySelector('[data-act="rback"]').click(); await settle();
    ok('leaving an UNTOUCHED review asks nothing', h.state.confirmCalls.length === 0,
       JSON.stringify(h.state.confirmCalls));
    ok('Back actually left', !h.d.getElementById('cr-show').querySelector('[data-act="rback"]'));
  }
  {
    // Rejecting a finding is a decision. Cancelling the confirm must keep the
    // review screen open with that decision intact, not discard it anyway.
    const h = await boot({ confirmReturn: false });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[1].click(); await settle(120);
    let el = h.d.getElementById('cr-show');
    el.querySelector('[data-drop="0"]').click(); await settle();
    ok('rejecting a finding is dirty', el.querySelectorAll('[data-fnd]').length === 0);
    el.querySelector('[data-act="rback"]').click(); await settle();
    ok('Back asks before discarding a rejection', h.state.confirmCalls.length === 1,
       h.state.confirmCalls);
    ok('cancelling the confirm keeps the review screen open',
      !!h.d.getElementById('cr-show').querySelector('[data-act="rback"]'));
    ok('and the rejection is still there, not silently reapplied',
      h.d.getElementById('cr-show').querySelectorAll('[data-fnd]').length === 0);
  }
  {
    // Same finding, this time the user confirms — the discard actually happens.
    const h = await boot({ confirmReturn: true });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[1].click(); await settle(120);
    let el = h.d.getElementById('cr-show');
    el.querySelector('[data-drop="0"]').click(); await settle();
    el.querySelector('[data-act="rback"]').click(); await settle();
    ok('confirming the discard actually leaves',
      !h.d.getElementById('cr-show').querySelector('[data-act="rback"]'));
  }
  {
    // Re-classifying severity is a decision too, and Ask Again carries the
    // SAME risk as Back — both must be guarded, not just one of them.
    const h = await boot({ confirmReturn: false });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[1].click(); await settle(120);
    let el = h.d.getElementById('cr-show');
    const sev = el.querySelector('[data-sev="0"]');
    sev.value = 'ok';
    sev.dispatchEvent(new h.w.Event('change')); await settle();
    el.querySelector('[data-act="rdetect"]').click(); await settle();
    ok('Ask again asks before discarding a re-classification',
      h.state.confirmCalls.length === 1, h.state.confirmCalls);
    ok('and does NOT call the model when cancelled', h.state.detects.length === 0,
       h.state.detects.length);
  }
  {
    // Asking the AI for the FIRST time, and asking again with nothing touched,
    // must never be gated — there is nothing of the user's to lose either way.
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[0].click(); await settle(200);   // unreviewed, auto-detects
    ok('the first detect asked nothing', h.state.confirmCalls.length === 0);
    h.d.getElementById('cr-show').querySelector('[data-act="rdetect"]').click(); await settle(200);
    ok('asking again with nothing touched still asks nothing',
      h.state.confirmCalls.length === 0, JSON.stringify(h.state.confirmCalls));
    ok('but it DID call the model both times', h.state.detects.length === 2, h.state.detects.length);
  }
  {
    // Nudging a box is a drag, not a click — confirm only that stop() marks it
    // dirty, since jsdom does no layout and the gesture itself is Chromium's
    // job (render_showcase.js).
    /* 585 rewrote stop() to be draw-aware; the move/resize branch must still
       end with the dirty mark. Anchored on the branch, not the whole shape. */
    ok('a finished drag marks the review dirty',
      /drag = null; review\.dirty = true; repaint\(\);/.test(MODULE_JS));
  }

  /* ── build 586 · The Lens ──────────────────────────────────────────────── */
  console.log('\n── the lens ──');
  {
    // Pinch/pan are Chromium's to prove. jsdom proves the contracts: the
    // lens opens on the FULL rendition (not the -d display copy), boxes ride
    // inside the world as fractions, and close removes the layer.
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[1].click(); await settle(120);
    const el = h.d.getElementById('cr-show');
    ok('the review bar has an expand button', !!el.querySelector('[data-act="rlens"]'));
    el.querySelector('[data-act="rlens"]').click(); await settle();
    const lens = el.querySelector('.cr-sh-lens');
    ok('the lens opened', !!lens);
    const img = lens && lens.querySelector('.w img');
    ok('it loads the FULL rendition, not the display copy',
      img && img.getAttribute('src').includes('/s2.jpg') && !img.getAttribute('src').includes('-d.jpg'),
      img && img.getAttribute('src'));
    ok('the finding boxes ride inside the world',
      lens && lens.querySelectorAll('.cr-sh-ln-box').length === 1);
    const box = lens && lens.querySelector('.cr-sh-ln-box');
    ok('boxes are fraction-positioned', box && /%$/.test(box.style.left) &&
      Math.abs(parseFloat(box.style.left) - 31) < 0.01, box && box.style.left);
    lens.querySelector('.cr-sh-ln-x').click(); await settle();
    ok('close removes the layer', !el.querySelector('.cr-sh-lens'));
    ok('the lens never touched the scroll lock', h.d.body.style.overflow === '');
  }
  {
    // The other two ways in. This harness stubs workmanship_pairs empty, so
    // the live Hall of Fame tap is Chromium's to prove (render_showcase has
    // real fixtures); here the markup contracts are pinned instead.
    ok('Hall of Fame photographs carry the lens hook in their markup',
      /data-lens=\\?"' \+ esc\(path\)/.test(MODULE_JS) || MODULE_JS.includes('data-lens="\' + esc(path)'));
    ok('the slider expand opens what the phase dock is showing',
      MODULE_JS.includes("(img && img.dataset.path) || p.after_path"));
    ok('the dock keeps the shown path current for the expand button',
      MODULE_JS.includes('img.dataset.path = wantPath'));
  }

  /* ── build 585 · Chalk — hand-drawn marks ──────────────────────────────── */
  console.log('\n── hand-drawn marks ──');
  {
    // The drawing gesture needs layout (Chromium's job). What jsdom CAN prove
    // is the contracts: provenance survives a save, Ask again keeps human
    // marks, and the classify sheet drives the working set correctly.
    const HUMAN_SHOT = {
      id: 'ssss1111-0000-0000-0000-00000000000h', walk_id: WALKS[0].id, sort_order: 0,
      path: 'walks/aaaa1111-2222-3333-4444-555555555555/h1.jpg', source: 'phone',
      findings: [
        { defect: 'other', severity: 'warn', label: 'Soft decking, hand-marked',
          box: { x: 0.5, y: 0.5, w: 0.2, h: 0.2 }, confidence: null, edited: true, source: 'human' },
        { defect: 'hail_impact', severity: 'crit', label: 'AI mark',
          box: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 }, confidence: 0.8, edited: false, source: 'ai' }
      ],
      reviewed_at: '2026-08-02T12:00:00Z', reviewed_by: 'theo@cardinalrenovations.net'
    };
    const h = await boot({ shots: [HUMAN_SHOT] });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[0].click(); await settle(120);
    const el = h.d.getElementById('cr-show');
    ok('+ Mark damage button present', !!el.querySelector('[data-act="rmark"]'));
    ok('a hand-drawn mark reopens like any other',
      el.querySelectorAll('[data-fnd]').length === 2);

    // Ask again: the AI's mark is replaced by the fresh proposals, the
    // hand-drawn one SURVIVES — the model has no standing to erase it.
    el.querySelector('[data-act="rdetect"]').click(); await settle(200);
    const rows = [...el.querySelectorAll('[data-fnd]')].map(x => x.textContent);
    ok('Ask again kept the hand-drawn mark',
      rows.some(t => /Soft decking, hand-marked/.test(t)), JSON.stringify(rows.map(t => t.slice(0, 30))));
    ok('and replaced the AI marks with fresh proposals',
      !rows.some(t => /^AI mark/.test(t)) && rows.length === 1 + DETECT_REPLY.findings.length,
      rows.length);

    // Save: provenance must survive the field-by-field rebuild.
    el.querySelector('[data-act="rsave"]').click(); await settle(120);
    const up = h.state.updates.filter(u => u.table === 'walk_shots').pop();
    const saved = up && up.row.findings;
    ok('saved findings carry source', saved && saved.every(f => f.source === 'ai' || f.source === 'human'),
      saved && JSON.stringify(saved.map(f => f.source)));
    ok('the hand-drawn mark saved as human',
      saved && saved.filter(f => f.source === 'human').length === 1);
    ok('a hand-drawn mark has no fabricated confidence',
      saved && saved.find(f => f.source === 'human').confidence === null);
  }
  {
    // Arming toggles; the confirm guard covers the new decision the moment
    // a mark is kept (dirty), same as every other decision.
    const h = await boot({ confirmReturn: false });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[1].click(); await settle(120);
    const el = h.d.getElementById('cr-show');
    el.querySelector('[data-act="rmark"]').click(); await settle();
    ok('arming sets the crosshair state',
      el.querySelector('[data-rev]').classList.contains('arming'));
    el.querySelector('[data-act="rmark"]').click(); await settle();
    ok('tapping again disarms', !el.querySelector('[data-rev]').classList.contains('arming'));
    // Drive the sheet directly (the gesture itself is Chromium's to prove):
    ok('classify sheet is absent until a box is drawn', !el.querySelector('.cr-sh-clsheet'));
  }

  /* ── build 584 · Spotlight — present mode ──────────────────────────────── */
  console.log('\n── present mode ──');
  {
    // The fixture walk has exactly one reviewed shot WITH findings (shot 2),
    // one reviewed with none (shot 3) and one unreviewed (shot 1) — so the
    // show must have exactly ONE step. That the other two are excluded IS the
    // 579 contract doing the filtering.
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    const el = h.d.getElementById('cr-show');
    ok('Present button appears when a walk has reviewable content',
      !!el.querySelector('[data-act="present"]'));
    el.querySelector('[data-act="present"]').click(); await settle();
    ok('presenting class set on the module root', el.classList.contains('presenting'));
    ok('exactly one step — unreviewed and empty shots are excluded',
      /1 \/ 1/.test(el.querySelector('.cr-sh-pr-n').textContent),
      el.querySelector('.cr-sh-pr-n').textContent);
    ok('the caption is the finding, never the address',
      /Impact bruising, south slope/.test(el.textContent) &&
      !el.querySelector('.cr-sh-pres').textContent.includes('4212 Wilmington'),
      'address leaked into the present layer');
    const ring = el.querySelector('.cr-sh-pr-ring');
    ok('ring is fraction-positioned in percent',
      /%$/.test(ring.style.left) && Math.abs(parseFloat(ring.style.left) - 31) < 0.01,
      ring.style.left);
    ok('severity drives the ring colour', /229, 72, 77|#E5484D/i.test(ring.style.borderColor),
      ring.style.borderColor);
    ok('the veil is centred on the box',
      /at 40\.00% 49\.00%/.test(el.querySelector('.cr-sh-pr-veil').style.background),
      el.querySelector('.cr-sh-pr-veil').style.background.slice(0, 80));
    // forward past the last step ends the show and lands back on the walk
    el.querySelector('[data-prgo="1"]').click(); await settle();
    ok('advancing past the last step ends the show', !el.classList.contains('presenting'));
    ok('and lands back on the walk, not a dead screen',
      el.querySelectorAll('[data-shot]').length === 3);
  }
  {
    // Sales presents the walk Theo reviewed — the button must NOT be
    // admin-gated, and module close() must end the show for hideAllViews.
    const h = await boot({ admin: false });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    const el = h.d.getElementById('cr-show');
    ok('a rep gets the Present button too', !!el.querySelector('[data-act="present"]'));
    el.querySelector('[data-act="present"]').click(); await settle();
    ok('rep is presenting', el.classList.contains('presenting'));
    h.w.CardinalShowcase.close(); await settle();
    ok('module close() ends the show (the hideAllViews path)',
      !el.classList.contains('presenting'));
    ok('presenting never touched the global scroll lock', h.d.body.style.overflow === '');
  }
  {
    // A walk with nothing reviewed offers no Present button at all.
    const h = await boot({ shots: [SHOTS[0]] });   // unreviewed only
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    ok('no reviewable content, no Present button',
      !h.d.getElementById('cr-show').querySelector('[data-act="present"]'));
  }

  /* ── 10 · an RLS refusal is a silent 204 ───────────────────────────────── */
  console.log('\n── refusals are surfaced ──');
  {
    const h = await boot({ refuseWrites: true });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[0].click(); await settle(200);
    const el = h.d.getElementById('cr-show');
    el.querySelector('[data-act="rsave"]').click(); await settle(120);
    /* No error and no rows is how PostgREST refuses under RLS. Trusting .error
       alone reports success on a write that never happened. */
    ok('a refused save says so instead of looking fine',
      /admin only/i.test(el.textContent), el.textContent.slice(0, 120));
    ok('the shot is NOT marked reviewed after a refused save',
      !h.state.shots[0].reviewed_at);
  }

  /* ── 11 · the AI failing is not a broken screen ────────────────────────── */
  console.log('\n── the AI is down ──');
  {
    const h = await boot({ detectFails: true });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[0].click(); await settle(200);
    const el = h.d.getElementById('cr-show');
    ok('the failure is stated plainly', /could not read this photograph/.test(el.textContent));
    ok('the photograph still renders', !!el.querySelector('[data-rev] img'));
    ok('and you can still mark it up by hand later', !!el.querySelector('[data-act="rdetect"]'));
  }

  /* ── 12 · a shot the model says is unreadable ──────────────────────────── */
  console.log('\n── a poor photograph ──');
  {
    const h = await boot({ detectReply: {
      findings: [], quality: 'poor', quality_note: 'Too dark to read the slope', dropped: 0,
      vocab: { severities: ['crit','warn','ok'], defects: [] } } });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelectorAll('[data-shot]')[0].click(); await settle(200);
    const el = h.d.getElementById('cr-show');
    /* "too dark to read" and "no damage" are opposite conclusions and must never
       render the same way. */
    ok('an unreadable photo says so, and says why',
      /hard to read/.test(el.textContent) && /Too dark to read the slope/.test(el.textContent));
    ok('it is NOT reported as "nothing found"', !/marked nothing/.test(el.textContent));
  }

  /* ── 13 · pulling photographs off a job ────────────────────────────────── */
  console.log('\n── from a job ──');
  {
    const h = await boot({
      projects: [{ id: 'proj-1', name: 'Dan Thompson', address: '77 Elm St' }],
      jobPhotos: [
        { id: 'ph-1', project_id: 'proj-1', storage_path: 'projects/proj-1/a.jpg', data: 'https://x/object/public/photos/projects/proj-1/a.jpg' },
        { id: 'ph-2', project_id: 'proj-1', storage_path: null, data: 'data:image/jpeg;base64,AAAA' }
      ]
    });
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    h.d.querySelector('[data-walk]').click(); await settle();
    h.d.querySelector('[data-act="wjob"]').click(); await settle(80);
    const form = h.d.getElementById('cr-show-form');
    ok('the picker opened', form && form.classList.contains('open'));
    form.querySelector('[data-proj]').click(); await settle(80);
    /* MEASURED: 183 of 196 project_photos rows carry a storage_path and 13 are
       inline data: URIs with no storage object. Both are real photographs. A
       picker that only understood paths would drop one photo in fifteen and
       look like it worked. */
    ok('BOTH a stored photo and an inline data: photo are offered',
      form.querySelectorAll('[data-jp]').length === 2, form.querySelectorAll('[data-jp]').length);

    form.querySelector('[data-jp="0"]').click();
    form.querySelector('[data-jp="1"]').click(); await settle(40);
    form.querySelector('[data-jadd]').click(); await settle(250);

    ok('both were copied into walks/, not referenced',
      h.state.uploads.length >= 2 && h.state.uploads.every(p => p.slice(0, 6) === 'walks/'),
      JSON.stringify(h.state.uploads.slice(0, 3)));
    const ins = h.state.inserts.filter(i => i.table === 'walk_shots');
    ok('two shots were inserted', ins.length === 2, ins.length);
    ok('they record where they came from',
      ins.every(i => i.row.source === 'job'), JSON.stringify(ins.map(i => i.row.source)));
    ok('and which job photo, so provenance survives',
      ins.map(i => i.row.origin_photo_id).sort().join(',') === 'ph-1,ph-2',
      JSON.stringify(ins.map(i => i.row.origin_photo_id)));
    ok('the path lives under the walk', ins.every(i => i.row.path.indexOf('walks/' + WALKS[0].id) === 0));
  }

  /* ── build 591 · promoting a job to a Showcase pair ─────────────────────
     These live in the WALK harness on purpose: 591 shares the walk's picker
     rather than forking it, and §13 above is the regression that proves it —
     if §13 ever needs editing to keep these green, the picker got forked. */
  console.log('\n── from a job → a pair (591) ──');

  const JOB1 = [{ id: 'proj-9', name: 'Klepinger', address: '3800 klepinger rd  dayton ohio46416' }];
  /* Two stored + one inline, because 13 of 196 real rows have no storage object
     and a pair built from one of those must still work. */
  const JOBPH = [
    { id: 'ph-a', project_id: 'proj-9', storage_path: 'projects/proj-9/a.jpg', data: null },
    { id: 'ph-b', project_id: 'proj-9', storage_path: 'projects/proj-9/b.jpg', data: null },
    { id: 'ph-c', project_id: 'proj-9', storage_path: null, data: 'data:image/jpeg;base64,AAAA' }
  ];
  const openPicker = async (h) => {
    h.w.CardinalShowcase.open(); await settle();
    h.d.querySelector('[data-act="addjob"]').click(); await settle(80);
    const form = h.d.getElementById('cr-show-form');
    form.querySelector('[data-proj]').click(); await settle(90);
    return form;
  };

  {
    /* The entry point — and note showcase_pairs is [] in this harness, so this
       is the EMPTY state. With zero pairs in production that is the only
       surface that matters on day one. */
    const h = await boot({ projects: JOB1, jobPhotos: JOBPH });
    h.w.CardinalShowcase.open(); await settle();
    const el = h.d.getElementById('cr-show');
    ok('From a job is offered with ZERO pairs — the day-one surface',
      !!el.querySelector('[data-act="addjob"]'));
    ok('and it sits beside Add a pair', !!el.querySelector('[data-act="add"]'));
  }
  {
    const h = await boot({ projects: JOB1, jobPhotos: JOBPH, admin: false });
    h.w.CardinalShowcase.open(); await settle();
    ok('a non-admin never sees it',
      !h.d.getElementById('cr-show').querySelector('[data-act="addjob"]'));
  }
  {
    const h = await boot({ projects: JOB1, jobPhotos: JOBPH });
    h.w.CardinalShowcase.open(); await settle();
    h.w.CardinalShowcase.close(false); await settle();
    h.w.CardinalShowcase.open({ showroom: true }); await settle();
    ok('and the showroom never sees it either',
      !h.d.getElementById('cr-show').querySelector('[data-act="addjob"]'));
  }
  {
    /* The picker must open from the Showcase tab with NO walk selected. In 590
       openJobPicker returned early on !curWalk, so this is the negative
       control for the whole shared-picker change. */
    const h = await boot({ projects: JOB1, jobPhotos: JOBPH });
    const form = await openPicker(h);
    ok('the picker opens with no walk selected', form.classList.contains('open'));
    ok('all three photographs are offered, inline one included',
      form.querySelectorAll('[data-jp]').length === 3, form.querySelectorAll('[data-jp]').length);
    ok('two slots are shown, not a tick', form.querySelectorAll('[data-jslot]').length === 2);
    ok('Use these starts disabled', form.querySelector('[data-jadd]').hasAttribute('disabled'));

    form.querySelector('[data-jp="1"]').click(); await settle(20);
    ok('one slot filled is still not enough',
      form.querySelector('[data-jadd]').hasAttribute('disabled'));
    ok('the pick is labelled with the WORD, not a tick',
      /before/i.test(form.querySelector('[data-jp="1"] .rl').textContent),
      form.querySelector('[data-jp="1"] .rl').textContent);

    form.querySelector('[data-jp="0"]').click(); await settle(20);
    ok('both filled enables it', !form.querySelector('[data-jadd]').hasAttribute('disabled'));
    ok('the second pick reads AFTER',
      /after/i.test(form.querySelector('[data-jp="0"] .rl').textContent));
    ok('unpicked tiles go inert once both slots are full',
      form.querySelector('[data-jp="2"]').className.indexOf('dim') !== -1,
      form.querySelector('[data-jp="2"]').className);

    /* The cap. A third tap must change nothing — on a touch grid a stray thumb
       must not be able to steal a role. */
    form.querySelector('[data-jp="2"]').click(); await settle(20);
    ok('a third tap changes nothing', !form.querySelector('[data-jp="2"] .rl'));

    form.querySelector('[data-jslot="before"]').click(); await settle(20);
    ok('tapping a slot clears only that slot',
      !form.querySelector('[data-jp="1"] .rl') && !!form.querySelector('[data-jp="0"] .rl'));
  }
  {
    /* THE assertion for the role model. Tap tile 1 FIRST, then tile 0 — so tap
       order and index order disagree. before.jpg must carry tile 1. This fails
       against any Object.keys(chosen) implementation, which enumerates
       integer-like keys ascending and would silently swap the two. */
    const h = await boot({ projects: JOB1, jobPhotos: JOBPH });
    const form = await openPicker(h);
    form.querySelector('[data-jp="1"]').click();
    form.querySelector('[data-jp="0"]').click(); await settle(20);
    form.querySelector('[data-jadd]').click(); await settle(300);

    ok('the pair form opened', !!h.d.querySelector('[data-f="address"]'));
    const dls = h.state.downloads;
    ok('before was fetched first — role order, not tap order and not index order',
      dls[0] === 'projects/proj-9/b.jpg', JSON.stringify(dls));

    /* prefill, and the guess shown with what it was guessed from */
    ok('the street is prefilled',
      h.d.querySelector('[data-f="address"]').value === '3800 klepinger rd',
      h.d.querySelector('[data-f="address"]').value);
    ok('the city is peeled off and title-cased',
      h.d.querySelector('[data-f="city"]').value === 'Dayton',
      h.d.querySelector('[data-f="city"]').value);
    /* The three file inputs would otherwise read 'No file chosen' beside two
       photographs that ARE chosen — and anything attached to them would be
       silently ignored, because savePair prefers the carried files. */
    ok('the photographs it carried are shown, not three empty file pickers',
      h.d.querySelectorAll('#cr-show-form .cr-sh-from figure').length === 2 &&
      [...h.d.querySelectorAll('#cr-show-form input[type=file]')]
        .every(i => i.style.display === 'none'),
      h.d.querySelectorAll('#cr-show-form .cr-sh-from figure').length);
    ok('and they are labelled with their roles',
      /BEFORE/i.test(h.d.querySelector('#cr-show-form .cr-sh-from').textContent) &&
      /AFTER/i.test(h.d.querySelector('#cr-show-form .cr-sh-from').textContent));
    ok('neither field is locked',
      !h.d.querySelector('[data-f="address"]').hasAttribute('readonly') &&
      !h.d.querySelector('[data-f="city"]').hasAttribute('disabled'));
    ok('and the raw source string is on screen, so the guess is auditable',
      h.d.getElementById('cr-show-form').textContent.indexOf('3800 klepinger rd  dayton ohio46416') !== -1);

    h.d.querySelector('[data-act="save"]').click(); await settle(400);
    const ins = h.state.inserts.filter(i => i.table === 'showcase_pairs');
    ok('one pair was inserted', ins.length === 1, ins.length);
    ok('it records the job it came from', ins[0] && ins[0].row.project_id === 'proj-9',
      ins[0] && ins[0].row.project_id);
    const ups = h.state.uploads;
    ok('the bytes went to showcase/, never walks/',
      ups.length >= 4 && ups.every(p => p.slice(0, 9) === 'showcase/'), JSON.stringify(ups));
    ok('full AND display renditions for both photos',
      ups.filter(p => /before\.jpg$/.test(p)).length === 1 &&
      ups.filter(p => /before-d\.jpg$/.test(p)).length === 1, JSON.stringify(ups));
  }
  {
    /* An inline data: photo can carry a role too — the 13-of-196 population,
       re-proved on the new path rather than assumed from the walk's. */
    const h = await boot({ projects: JOB1, jobPhotos: JOBPH });
    const form = await openPicker(h);
    form.querySelector('[data-jp="2"]').click();   // the inline one
    form.querySelector('[data-jp="0"]').click(); await settle(20);
    form.querySelector('[data-jadd]').click(); await settle(300);
    h.d.querySelector('[data-act="save"]').click(); await settle(400);
    ok('a pair built from an inline data: photo saves',
      h.state.inserts.filter(i => i.table === 'showcase_pairs').length === 1);
    ok('and only ONE storage download was needed for it',
      h.state.downloads.length === 1, JSON.stringify(h.state.downloads));
  }
  {
    /* THE LEAK. closeForm() only removes a class, so files carried from a
       promoted job would still be in `pending` when the ordinary form next
       opens — and savePair prefers pending. Without `pending = null` at the top
       of openForm() this saves the PREVIOUS job's photographs under the new
       pair's name, silently. Nothing else in this file catches it. */
    const h = await boot({ projects: JOB1, jobPhotos: JOBPH });
    const form = await openPicker(h);
    form.querySelector('[data-jp="0"]').click();
    form.querySelector('[data-jp="1"]').click(); await settle(20);
    form.querySelector('[data-jadd]').click(); await settle(300);
    h.d.querySelector('[data-act="save"]').click(); await settle(400);
    const afterPromote = h.state.uploads.length;

    h.d.getElementById('cr-show').querySelector('[data-act="add"]').click(); await settle(60);
    ok('the ordinary form renders real file inputs again',
      !!h.d.querySelector('input[type="file"][data-f="before"]'));
    h.d.querySelector('[data-act="save"]').click(); await settle(200);
    ok('with no files chosen it REFUSES rather than reusing the last job’s',
      h.state.uploads.length === afterPromote &&
      /before and an after/i.test(h.d.querySelector('[data-err]').textContent),
      h.d.querySelector('[data-err]').textContent);
  }
  {
    /* Cancel mid-flight. The biggest real job has 45 photos and signing them is
       a genuine round trip, so this is the moment somebody taps Cancel. Before
       591 the resumed function wrote to a nulled jobPick and threw where nobody
       saw it. */
    const h = await boot({ projects: JOB1, jobPhotos: JOBPH });
    const rejections = [];
    h.w.addEventListener('unhandledrejection', e => rejections.push(String(e.reason)));
    h.w.CardinalShowcase.open(); await settle();
    h.d.querySelector('[data-act="addjob"]').click(); await settle(80);
    const form = h.d.getElementById('cr-show-form');
    form.querySelector('[data-proj]').click();          // do NOT settle — cancel mid-load
    form.querySelector('[data-act="cancel"]').click();
    await settle(200);
    ok('cancelling mid-load closes cleanly', !form.classList.contains('open'));
    ok('and throws nothing into the void', rejections.length === 0, JSON.stringify(rejections));
    h.d.querySelector('[data-act="addjob"]').click(); await settle(90);
    ok('and the picker still opens afterwards', form.classList.contains('open'));
  }
  {
    /* splitAddr against the REAL twelve job addresses, by executing the SHIPPED
       function text rather than a re-implementation. A comma split scores 1/12
       on this table — that is this block's negative control. */
    const m = MODULE_JS.indexOf('function splitAddr(');
    const end = MODULE_JS.indexOf('\n}', m) + 2;
    const splitAddr = new Function(MODULE_JS.slice(m, end) + '; return splitAddr;')();
    const REAL = [
      ['3710 west third Dayton Ohio 45417', '3710 west third', 'Dayton'],
      ['231 Delaware  Ave Dayton Ohio 46405', '231 Delaware Ave', 'Dayton'],
      ['4115 Shenandoah dr Dayton Ohio 46417', '4115 Shenandoah dr', 'Dayton'],
      ['948 Huron Ave Dayton Ohio 46402', '948 Huron Ave', 'Dayton'],
      ['948 Huron', '948 Huron', ''],
      ['3800 klepinger rd  dayton ohio46416', '3800 klepinger rd', 'Dayton'],
      ['5241 rucks rd Dayton Ohio 46417', '5241 rucks rd', 'Dayton'],
      ['1668 Wesleyan rd Dayton Ohio 46406', '1668 Wesleyan rd', 'Dayton'],
      ['2299 Adrian cr Dayton Ohio 45439', '2299 Adrian cr', 'Dayton'],
      ['3431blocker dr Dayton Ohio 45420', '3431blocker dr', 'Dayton'],
      ['449 Harriet, Dayton, OH 45417', '449 Harriet', 'Dayton'],
      ['921 Testing Way', '921 Testing Way', '']
    ];
    let right = 0, wrong = [];
    REAL.forEach(([raw, wantA, wantC]) => {
      const g = splitAddr(raw);
      if (g.address === wantA && g.city === wantC) right++;
      else wrong.push(raw + ' -> ' + JSON.stringify(g));
    });
    ok('all twelve real job addresses split correctly', right === 12, wrong);
    ok('ten of them yield a city; the two with none stay EMPTY rather than guessing',
      REAL.filter(r => splitAddr(r[0]).city).length === 10);
    ok('the zip is never used as the city — Indiana zips sit on Dayton rows here',
      !/\d{5}/.test(REAL.map(r => splitAddr(r[0]).city).join('')));
  }

  /* ── 14 · the invariants this module must not break ────────────────────── */
  console.log('\n── invariants ──');
  {
    const h = await boot({});
    h.w.CardinalShowcase.open(); await settle();
    clickTab(h.d, 'walk'); await settle();
    ok('still no 14th writer of the global scroll lock',
      h.d.body.style.overflow === '' && !/body\.style\.overflow\s*=/.test(MODULE_JS));
    ok('shown by CLASS, not display',
      h.d.getElementById('cr-show').classList.contains('open'));
    /* This module declares no --sh-* token at all, like Crews. A bare var()
       would therefore be permanently transparent, not merely fragile — the
       448-449 class by construction. */
    const bare = (MODULE_CSS.match(/var\(--sh-[a-z0-9-]+\s*\)/g) || []);
    ok('every --sh-* reference carries a literal fallback', bare.length === 0, JSON.stringify(bare));
    ok('the export still merges rather than replaces',
      /window\.CardinalShowcase\s*=\s*Object\.assign\(window\.CardinalShowcase\s*\|\|\s*\{\}/.test(MODULE_JS));
    ok('reload resets the walk state too',
      /walksLoaded = false;[\s\S]{0,80}curWalk = null/.test(MODULE_JS));
    /* Circles are an overlay. If The Walk's pipeline ever gains a canvas that
       composites a box onto the photograph, the original stops being evidence.
       SCOPE THE SLICE: this once ran to end-of-module and went red the moment
       587 added the share-card renderer — a different feature that uses canvas
       legitimately and never touches finding boxes. The Walk's own code ends
       where the 584 Spotlight section begins. */
    const wStart = MODULE_JS.indexOf('The Walk (579)');
    const wEnd = MODULE_JS.indexOf('Spotlight — present mode (584)');
    const walkPart = MODULE_JS.slice(wStart, wEnd === -1 ? undefined : wEnd);
    ok('the walk slice was actually captured', walkPart.length > 5000, walkPart.length);
    ok('The Walk never draws onto the image itself',
      !/toBlob|getContext/.test(walkPart), 'a canvas appeared in the walk code');
  }

  console.log('\n' + '─'.repeat(58));
  console.log((fails === 0 ? 'GREEN' : 'RED') + ` — ${passes} passed, ${fails} failed`);
  console.log('NOT covered: the live AI call, box dragging (no layout in jsdom —');
  console.log('proved in Chromium by render_showcase.js), and colour.');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
