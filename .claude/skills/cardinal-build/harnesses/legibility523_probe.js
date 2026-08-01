/* Legibility probe, v2 — with the mounts corrected.
 *
 * v1 reported 30+ failures on the estimates templates. All of them were MINE:
 * each module's --cr-* palette is declared on its OWN mount
 * (#cr-estimates-mount, #cr-pricing-mount, #cr-claims-mount), and v1 cloned the
 * templates into the page instead, so every `color: var(--cr-muted)` resolved
 * to nothing and the elements inherited the body's #1b1b1b. Textbook "scope the
 * assertion, then read what it captured".
 *
 * v2 mounts each surface where the module mounts it, and drives the real
 * estimate editor through its own exported openEditor()/refreshSavedList().
 */
const { chromium } = require('playwright');
const FILE = process.argv[2];
const THEMES = ['dark', 'rb-light'];

const box = (title, body, footer) =>
  '<div class="box"><div class="hd"><h3>' + title + '</h3>' +
  '<span class="count">3 imported</span>' +
  '<button class="x" type="button">✕</button></div>' +
  '<div class="bd">' + body + '</div>' +
  (footer ? '<div class="ft">' + footer + '</div>' : '') + '</div>';

const CI = {
  'quick-inspect · pick': box('📷 Import a client',
    '<p class="lede">Open the customer in AccuLynx and photograph the screen. The name, address, ' +
    'phones, email and notes get read off it — you check them before anything is saved.</p>' +
    '<button class="shoot" type="button"><span class="i">📷</span>' +
    '<span><b>Take a photo</b><small>Point at the customer screen</small></span></button>' +
    '<button class="shoot pick2" type="button"><span class="i">🖼</span>' +
    '<span><b>Choose a screenshot</b><small>From the photo library</small></span></button>'),
  'quick-inspect · busy': box('📷 Reading the screen',
    '<div class="busy"><div class="sp"></div>Reading the record…<br>Usually about ten seconds.</div>'),
  'quick-inspect · review': box('📷 Check the details',
    '<label>Client name <span class="req">*</span></label><input type="text" value="Minnie Marsh">' +
    '<label>Property address</label><input type="text" value="3710 West Third">' +
    '<div class="row2"><div><label>Phone</label><input type="text" value="937-555-0134"></div>' +
    '<div><label>Email</label><input type="text" value="m@example.com"></div></div>' +
    '<label>Notes</label><textarea>Anything worth carrying over</textarea>' +
    '<label>Also read off the screen</label>' +
    '<div class="found"><div>Job #: <b>24-1180</b></div>' +
    '<div>Stage: <span class="miss">not found</span></div></div>' +
    '<div class="dupe"><b>Minnie Marsh</b> is already in the directory at a matching name or ' +
    'address. Importing again would give you two.<br>' +
    '<button type="button">Open the existing one</button></div>',
    '<button class="cancel" type="button">Skip</button>' +
    '<button class="save" type="button">Save &amp; next</button>'),
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const all = {};

  for (const theme of THEMES) {
    const c = await b.newContext({ viewport: { width: 430, height: 1400 }, deviceScaleFactor: 2 });
    await c.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    const p = await c.newPage(); p.on('pageerror', () => {});
    await p.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3200);

    /* drive the REAL estimate editor with a locked mock, the oc514 pattern */
    await p.evaluate(() => {
      const rows = [{
        id: 'e1', estimate_number: 'EST-1042', title: 'Roof replacement — 26 sq', status: 'draft',
        total: 14200, project_id: 'j1', photos: [], line_items: [
          { id: 'l1', name: 'Tear-off', desc: 'Remove two layers', qty: 26, unit: 'SQ', price: 78, total: 2028 },
          { id: 'l2', name: 'Owens Corning Duration', desc: 'Architectural shingle', qty: 26, unit: 'SQ', price: 310, total: 8060 },
        ],
      }];
      const q = { select: () => q, eq: () => q, order: () => q, limit: () => q, in: () => q,
                  single: async () => ({ data: rows[0], error: null }),
                  maybeSingle: async () => ({ data: rows[0], error: null }),
                  then: (r) => r({ data: rows, error: null }) };
      Object.defineProperty(window, 'supa', { value: { from: () => q, auth: { getUser: async () => ({ data: { user: { email: 'theo@cardinalrenovations.net' } } }) } }, writable: false, configurable: true });
      window.currentProject = { id: 'j1', name: 'Minnie Marsh', address: '3710 West Third', checklist: '{}' };
    });

    const found = await p.evaluate(async ({ ci, theme }) => {
      if (theme === 'rb-light') document.documentElement.setAttribute('data-theme', 'rb-light');
      document.body.classList.remove('claim-insurance', 'claim-community');
      const surfaces = {};
      const show = (el) => { if (el) { el.style.display = 'block'; el.style.position = 'static'; } };

      /* Quick Inspect — #cr-ci IS its real host, so it was right in v1 */
      let host = document.getElementById('cr-ci');
      if (!host) { host = document.createElement('div'); host.id = 'cr-ci'; document.body.appendChild(host); }
      host.classList.add('open'); show(host);
      Object.keys(ci).forEach(name => {
        const d = document.createElement('div');
        d.setAttribute('data-surface', name); d.innerHTML = ci[name];
        host.appendChild(d); surfaces[name] = d;
      });

      /* estimates + pricing templates, each into ITS OWN mount — the fix */
      const MOUNT = {
        'cr-tmpl-list': 'cr-estimates-mount',
        'cr-tmpl-ai-create': 'cr-estimates-mount',
        'cr-tmpl-ai-output': 'cr-estimates-mount',
        'cr-tmpl-pricing': 'cr-pricing-mount',
      };
      for (const [tid, mid] of Object.entries(MOUNT)) {
        const t = document.getElementById(tid);
        let m = document.getElementById(mid);
        if (!t) continue;
        if (!m) { m = document.createElement('div'); m.id = mid; document.body.appendChild(m); }
        show(m);
        const w = document.createElement('div');
        w.setAttribute('data-surface', 'estimates · ' + tid.replace('cr-tmpl-', ''));
        w.appendChild(t.content.cloneNode(true));
        m.appendChild(w);
        surfaces['estimates · ' + tid.replace('cr-tmpl-', '')] = w;
      }

      /* the estimate EDITOR and the saved list, rendered by the shipped module */
      try {
        let slot = document.getElementById('cr-est-saved-slot');
        /* injectOnProfile() gives the slot this class, and .cr-est-saved-list .head
           is the only rule that colours the header. A bare div made v2 report
           1.15:1 on text that is really #6b6b6b. Second scoping false positive. */
        if (!slot) {
          slot = document.createElement('div'); slot.id = 'cr-est-saved-slot';
          /* NOT inside #cr-ci - that overlay is a dark scrim, and leaving the
             slot in it measured the light theme's ink against a dark ground
             that only exists in this harness. It lives on the client page. */
          const pv2 = document.getElementById('projectView') || document.body;
          pv2.style.display = 'block'; pv2.appendChild(slot);
        }
        slot.className = 'cr-est-saved-list';
        show(slot);
        if (window.CardinalEstimates && window.CardinalEstimates.refreshSavedList) {
          await window.CardinalEstimates.refreshSavedList('j1');
        }
        slot.setAttribute('data-surface', 'estimates · saved list (client page)');
        surfaces['estimates · saved list (client page)'] = slot;

        if (window.CardinalEstimates && window.CardinalEstimates.openEditor) {
          window.CardinalEstimates.openEditor(window.currentProject, {
            id: 'e1', estimate_number: 'EST-1042', title: 'Roof replacement — 26 sq',
            status: 'draft', total: 14200, project_id: 'j1', photos: [],
            line_items: [{ id: 'l1', name: 'Tear-off', desc: 'Remove two layers', qty: 26, unit: 'SQ', price: 78, total: 2028 }],
          });
          await new Promise(r => setTimeout(r, 500));
          const v = document.getElementById('cr-est-view');
          if (v && v.textContent.trim()) {
            show(v); v.setAttribute('data-surface', 'estimates · editor');
            surfaces['estimates · editor'] = v;
          }
        }
      } catch (e) { surfaces['__editorError'] = null; window.__ee = String(e); }

      /* ---- contrast arithmetic ---- */
      const parse = (s) => { const m = String(s).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
      const over = (f, g) => ({ r: f.r * f.a + g.r * (1 - f.a), g: f.g * f.a + g.g * (1 - f.a), b: f.b * f.a + g.b * (1 - f.a), a: 1 });
      const srgb = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const lum = (c) => 0.2126 * srgb(c.r) + 0.7152 * srgb(c.g) + 0.0722 * srgb(c.b);
      const ratio = (a, z) => { const x = lum(a), y = lum(z), hi = Math.max(x, y), lo = Math.min(x, y); return (hi + 0.05) / (lo + 0.05); };
      /* A gradient's painted colour is NOT backgroundColor - that reads
         transparent, so a naive walker skips to the ancestor and invents a
         ground. v2 reported "Edit Estimate" at 1.12:1 that way; it actually
         sits on .cr-est-head's dark gradient. So: pull every colour stop out
         of the gradient and treat each as a candidate ground, then keep the
         WORST ratio. Pessimistic, but never fictional. */
      const stopsOf = (s) => {
        const out = []; const clipped = [];
        const re2 = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/g;
        let m;
        while ((m = re2.exec(s))) out.push({ r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] });
        return out;
      };
      const groundOf = (el) => {
        let cur = el, stack = [], grads = [];
        while (cur && cur !== document.documentElement) {
          const cs = getComputedStyle(cur);
          if (cs.backgroundImage && cs.backgroundImage !== 'none') {
            const st = stopsOf(cs.backgroundImage).filter(c => c.a > 0);
            if (st.length) { grads = st; break; }   /* an opaque gradient IS the ground */
          }
          const col = parse(cs.backgroundColor);
          if (col && col.a > 0) { stack.push(col); if (col.a === 1) break; }
          cur = cur.parentElement;
        }
        let out = { r: 255, g: 255, b: 255, a: 1 };
        for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
        return { bg: out, grads };
      };
      const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
      const out = []; const clipped = [];
      Object.keys(surfaces).forEach(name => {
        const root = surfaces[name]; if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('*').forEach(el => {
          const own = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
          const val = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.value;
          if (!own && !val) return;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
          /* Gradient-CLIPPED text: the gradient is the ink, not the ground, and
             `color` is only the no-clip fallback. Measuring it as ground made
             the Estimates title read 2.17:1 when it is painted in the gradient.
             Third false-positive class today - flag, do not fail. */
          if (/text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '') ||
              (cs.webkitTextFillColor && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.webkitTextFillColor))) {
            clipped.push(name + '  ' + el.tagName.toLowerCase() + '  \u201c' + (el.textContent || '').trim().slice(0, 34) + '\u201d');
            return;
          }
          const fgRaw = parse(cs.color); if (!fgRaw) return;
          const { bg, grads } = groundOf(el);
          const cands = grads.length ? grads.map(g => over(g, bg)) : [bg];
          const size = parseFloat(cs.fontSize), weight = +cs.fontWeight || 400;
          const floor = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3.0 : 4.5;
          let r = Infinity, ground = bg;
          for (const cnd of cands) {
            const rr = ratio(over(fgRaw, cnd), cnd);
            if (rr < r) { r = rr; ground = cnd; }
          }
          const fg = over(fgRaw, ground), grad = grads.length > 0;
          r = +r.toFixed(4);
          if (r < floor) out.push({ surface: name,
            sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
            text: (el.textContent || val || '').trim().slice(0, 40),
            fg: hex(fg), bg: hex(ground), grad, px: size, w: weight, ratio: +r.toFixed(2), floor });
        });
      });
      return { out, clipped, surfaces: Object.keys(surfaces), err: window.__ee || null };
    }, { ci: CI, theme });

    all[theme] = found;
    await c.close();
  }
  await b.close();

  let total = 0;
  for (const theme of THEMES) {
    const { out, clipped, surfaces, err } = all[theme];
    console.log('\n════ ' + theme + ' ════   surfaces measured: ' + surfaces.join(' | ') + (err ? '\n  editor error: ' + err : ''));
    const rows = out.sort((a, z) => a.ratio - z.ratio);
    let last = '';
    for (const r of rows) {
      if (r.surface !== last) { console.log('\n  ' + r.surface); last = r.surface; }
      console.log('    %s  %s on %s  %spx/%s  %s %s',
        (String(r.ratio) + ':1').padStart(8), r.fg, r.bg, r.px, r.w,
        (r.sel + ' ').padEnd(34).slice(0, 34), '“' + r.text + '”' + (r.grad ? ' [gradient]' : ''));
    }
    console.log('\n  ' + rows.length + ' under the floor');
    if (clipped && clipped.length) console.log('  (' + clipped.length + ' gradient-clipped text nodes skipped: ' + clipped.slice(0,4).join(' · ') + ')');
    total += rows.length;
  }
  console.log('\n' + total + ' failing pairs across both themes');
})().catch(e => { console.error('PROBE ERROR', e); process.exit(2); });
