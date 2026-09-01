/* gate_1161 — The Appointment: a conductor over existing surfaces.
 *
 *  1. Hub tile (executed visionHtml, admin and non-admin) + dispatch +
 *     hideAllViews registration, with the six prior tiles surviving.
 *  2. The SHIPPED module runs in a jsdom realm against a mocked supa and
 *     mocked Cardinal modules, and the whole running order is driven:
 *     picker paints -> pick calls openForProject({showroom:true}) ->
 *     good clicks the showcase's own [data-tab="work"] -> why calls
 *     CardinalWhy.open -> house queries design_renders (approved only,
 *     this project only) and paints the wall from ONE createSignedUrls
 *     round trip. end() closes and hides.
 *  3. openForProject now takes (pr, opts), passes opts to open(), and
 *     re-asserts tab='walk' after a showroom open.
 *  4. STEPS floor: the five known stops exist (a shrinking-coverage test
 *     is the recorded failure mode — assert the minimum set).
 *  5. No scroll lock; rail is NOT in hideAllViews (chrome), pane IS.
 *
 * Negative control: argv[2] = the previous artifact. Must go RED.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const FILE = process.argv[2] || 'index.html';
const src  = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };

const blk = (tag, id) => {
  const a = src.indexOf(`<${tag} id="${id}"`);
  if (a < 0) return '';
  const b = src.indexOf(`</${tag}>`, a);
  return b < 0 ? '' : src.slice(a, b);
};
const js  = blk('script', 'cr-appt-script');
const css = blk('style',  'cr-appt-styles');
ok('module + styles exist', js.length > 3000 && css.length > 1500,
   'js=' + js.length + ' css=' + css.length);
ok('exported once via Object.assign',
   (src.match(/window\.CardinalAppointment\s*=/g) || []).length === 1 &&
   /Object\.assign\(\s*window\.CardinalAppointment\s*\|\|/.test(js));
ok('writes NO scroll lock', !/style\.overflow/.test(js));

/* ── 1 · doors + hideAllViews ──────────────────────────────────
   1190 retired the Vision hub: visionHtml() and its tiles are GONE, and
   staying gone is now the assertion (inverted, not deleted — the 1190
   pattern). The doors that remain are the Front Door's `appt` case and
   the 1187 ?open=appt deep link. */
{
  ok('visionHtml() stays retired (1190)', src.indexOf('\nfunction visionHtml(') === -1);
  ok('the hub markup is never emitted (.cr-vh is the tell)',
     !src.includes("class=\"cr-vh\""));
  ok('?open=appt door survives', src.includes("appt: function(){ return window.CardinalAppointment; }"));
  ok('dispatch routes appt',
     /if\(d === 'appt'\)\{[\s\S]{0,120}CardinalAppointment\.open\(\)/.test(src));
  const hv = src.indexOf('function hideAllViews');
  let fn = '';
  if (hv > -1) {
    const open = src.indexOf('{', hv);
    let d = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') d++;
      else if (src[i] === '}') { d--; if (!d) { fn = src.slice(hv, i + 1); break; } }
    }
  }
  ok('pane registered in hideAllViews, DISPLAY lever',
     /_apt\s*\)\s*_apt\.style\.display\s*=\s*'none'/.test(fn));
  ok('rail is NOT in hideAllViews (chrome, like #pwaNav)', !fn.includes('cr-appt-rail'));
  for (const id of ['cr-why', 'cr-occ', 'cr-fin', 'cr-show'])
    ok('hideAllViews still clears ' + id, fn.includes(id));
}

/* ── 3 · openForProject extension ──────────────────────────── */
ok('openForProject takes (pr, opts)', src.includes('function openForProject(pr, opts){'));
ok('openForProject passes opts to open()', /open\(opts\);\s*\n\s*if\(opts && opts\.showroom\) tab = 'walk';/.test(src));

/* ── 4 · STEPS floor (1191 added the four discovery stops) ─── */
for (const id of ['pick', 'welcome', 'whynow', 'priorities', 'plans',
                  'roof', 'good', 'why', 'house'])
  ok('STEPS floor: ' + id, new RegExp("id:'" + id + "'").test(js));

/* ── 2 · drive the shipped module ──────────────────────────── */
{
  const calls = [];
  const rows = { projects: [{ id: 'p1', name: 'Kim Lawson', stage: 'Approved' },
                            { id: 'p2', name: 'Bob Roof', stage: 'Lead' }],
                 renders:  [{ id: 'r1', title: 'Duration Onyx', render_path: 'visualizer/a.jpg',
                              preview_path: 'visualizer/a-p.jpg', approved: true }] };
  const mkQuery = table => {
    const q = { _t: table, _eq: {} };
    for (const m of ['select', 'order', 'limit'])
      q[m] = (...a) => { calls.push(table + '.' + m + ':' + JSON.stringify(a)); return q; };
    q.eq = (k, v) => { q._eq[k] = v; calls.push(table + '.eq:' + k + '=' + v); return q; };
    q.then = (res, rej) => {
      let data = [];
      if (table === 'projects') data = rows.projects;
      if (table === 'design_renders') data = rows.renders;
      return Promise.resolve({ data }).then(res, rej);
    };
    return q;
  };
  const supaMock = {
    from: t => mkQuery(t),
    storage: { from: b => ({
      createSignedUrls: (paths, ttl) => { calls.push('signMany:' + paths.join(',') + '@' + ttl);
        return Promise.resolve({ data: paths.map(p => ({ path: p, signedUrl: 'https://x/' + p })) }); },
      createSignedUrl: (p, ttl) => Promise.resolve({ data: { signedUrl: 'https://x/' + p } }),
    }) },
  };
  const body = js.slice(js.indexOf('>') + 1);
  const dom = new JSDOM(
    '<!doctype html><html><head>' + css + '</style></head><body>' +
    '<div id="cr-show" class="open"><button data-tab="work"></button></div>' +
    '<script>' + body + '<\/script></body></html>',
    { runScripts: 'dangerously' });
  const w = dom.window;
  Object.defineProperty(w, 'supa', { value: supaMock, writable: false });
  w.CardinalShowcase = { openForProject: (pr, opts) => calls.push('show.ofp:' + pr.id + ':' + JSON.stringify(opts)),
                         open: o => calls.push('show.open:' + JSON.stringify(o)),
                         close: () => calls.push('show.close') };
  w.CardinalWhy    = { open: () => calls.push('why.open'), close: () => calls.push('why.close') };
  w.CardinalColors = { open: () => calls.push('occ.open'), close: () => calls.push('occ.close') };
  w.hideAllViews   = () => calls.push('hideAll');
  const t0 = w.document.querySelector('#cr-show [data-tab="work"]');
  t0.addEventListener('click', () => calls.push('tab.work.click'));

  const step = async () => new Promise(r => setTimeout(r, 460));
  (async () => {
    ok('module exported in realm', !!w.CardinalAppointment);
    await w.CardinalAppointment.open();
    await step();
    const pane = w.document.getElementById('cr-appt');
    const rail = w.document.getElementById('cr-appt-rail');
    ok('open(): pane shown by DISPLAY', pane && pane.style.display === 'block');
    ok('open(): rail on', rail && rail.classList.contains('on'));
    ok('open(): hideAllViews ran first', calls.includes('hideAll'));
    ok('picker painted both jobs',
       pane.querySelectorAll('.ap-job').length === 2,
       'n=' + pane.querySelectorAll('.ap-job').length);
    ok('rail: steps beyond Job disabled before a pick',
       [...rail.querySelectorAll('.ar-step')].slice(1).every(b => b.disabled));

    /* pick the first job -> 1191: discovery first. Welcome paints; the
       roof does NOT open until its own stop. */
    pane.querySelector('.ap-job').click();
    await step();
    ok('pick -> Welcome paints (discovery before the roof)',
       pane.style.display === 'block' && /Let’s look at your roof/.test(pane.textContent));
    ok('pick did NOT open the showroom yet',
       !calls.some(c => c.startsWith('show.ofp:')));
    ok('rail names the client', rail.textContent.includes('Kim Lawson'));

    /* jump to Roof (index 5). Chip access is guarded so the 1190 control
       (7 chips) REPORTS red instead of crashing — BUG_CLASSES 37. */
    const chip = ix => { const b = rail.querySelectorAll('.ar-step')[ix];
      if (b) b.click(); else ok('chip ' + ix + ' exists', false, 'rail has ' +
        rail.querySelectorAll('.ar-step').length + ' chips'); };
    chip(5);
    await step();
    ok('roof -> openForProject with showroom',
       calls.some(c => c === 'show.ofp:p1:{"showroom":true}'), calls.join(' | '));
    ok('roof step hides the pane', pane.style.display === 'none');

    /* next -> good: clicks the showcase's own tab */
    rail.querySelector('[data-ap="next"]').click();
    await step();
    ok('good step clicks [data-tab="work"]', calls.includes('tab.work.click'));

    /* next -> why */
    rail.querySelector('[data-ap="next"]').click();
    await step();
    ok('why step calls CardinalWhy.open', calls.includes('why.open'));

    /* next -> house: renders wall */
    rail.querySelector('[data-ap="next"]').click();
    await step();
    ok('house queries design_renders scoped to project AND approved',
       calls.includes('design_renders.eq:project_id=p1') &&
       calls.includes('design_renders.eq:approved=true'));
    ok('one signed round trip for the wall',
       calls.filter(c => c.startsWith('signMany:')).length === 1,
       calls.filter(c => c.startsWith('signMany:')).join(' | '));
    ok('wall painted the render card',
       pane.querySelectorAll('.ap-card').length === 1 &&
       pane.textContent.includes('Duration Onyx'));
    ok('Colors is a side door on the house step',
       !!pane.querySelector('[data-ap-open="colors"]'));
    /* 1162 grew STEPS past house, so "house is last" went stale — the
       CONTRACT is that the final stop, whichever it is, has no dead-end
       forward. Walk to the last rail step and assert there. */
    const stepsAll = rail.querySelectorAll('.ar-step');
    stepsAll[stepsAll.length - 1].click();
    await step();
    ok('Next is dead on the LAST step (no dead-end forward)',
       rail.querySelector('[data-ap="next"]').disabled);
    chip(8);                      /* back to house for the walk below */
    await step();

    /* back works */
    rail.querySelector('[data-ap="back"]').click();
    await step();
    ok('back returns to why', calls.filter(c => c === 'why.open').length === 2);

    /* end closes everything */
    rail.querySelector('[data-ap="end"]').click();
    await step();
    ok('end(): rail off + pane hidden',
       !rail.classList.contains('on') && pane.style.display === 'none');
    ok('end() closed the modules through their own doors',
       calls.includes('show.close') && calls.includes('why.close'));

    console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
    process.exit(fail ? 1 : 0);
  })().catch(e => { console.log('  FAIL  harness crashed -> ' + e.message);
    console.log('\n  ' + pass + ' pass, ' + (fail + 1) + ' fail'); process.exit(1); });
}
/* watchdog — a hung boot must read as a failure, not a pass */
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);
