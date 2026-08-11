/* Gate for build 716 — AI Estimate must reach the client, and carry them to the API.
 *
 * Runs the SHIPPED cr-estimates-script block plus the SHIPPED <template> elements,
 * both extracted verbatim from the artifact, in real Chromium. window.supa and
 * fetch are stubbed so the module's own code path runs unmodified and we can read
 * the exact JSON body it would POST to /api/estimate.
 *
 * Negative control — MUST go red on build 715:
 *   node harness_716.js index.html          -> PASS
 *   node harness_716.js index_prev715.html  -> FAIL
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ART = process.argv[2] || 'index.html';
const WATCHDOG = setTimeout(() => { console.error('GATE TIMEOUT'); process.exit(2); }, 60000);

function block(src, id) {
  const open = src.indexOf(`<script id="${id}">`);
  if (open === -1) throw new Error(`no <script id="${id}">`);
  const s = src.indexOf('>', open) + 1;
  const e = src.indexOf('</script>', s);
  return src.slice(s, e);
}
function template(src, id) {
  const open = src.indexOf(`<template id="${id}">`);
  if (open === -1) throw new Error(`no <template id="${id}">`);
  const e = src.indexOf('</template>', open);
  return src.slice(open, e + '</template>'.length);
}
/* Pull one function out of the artifact by brace-matching, so the payload proof
   executes the SHIPPED generateEstimate() rather than a re-implementation of it. */
function func(src, signature) {
  const i = src.indexOf(signature);
  if (i === -1) throw new Error(`no ${signature}`);
  let depth = 0, started = false;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    const ch = src[k];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) return src.slice(i, k + 1); }
  }
  throw new Error('unbalanced braces extracting ' + signature);
}

(async () => {
  const src = fs.readFileSync(ART, 'utf8');
  const code = block(src, 'cr-estimates-script');
  const tplCreate = template(src, 'cr-tmpl-ai-create');
  const tplList = template(src, 'cr-tmpl-list');
  console.log(`artifact : ${path.basename(ART)}`);
  console.log(`module   : ${code.length} chars · templates ${tplCreate.length}+${tplList.length}`);
  if (code.length < 20000) throw new Error('extractor captured too little — refusing to assert');

  // Profile markup assertions come straight off the artifact text.
  const hasProfileBtn = /id="pAiEstimateBtn"/.test(src);
  const wiredToOpener = /pAiEstimateBtn[\s\S]{0,400}crOpenEstimates\(currentProject\)/.test(src);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));

  // A real origin, not about:blank — the module stores its session in
  // localStorage, which an opaque origin denies.
  const HTML = `<!doctype html><html><body>
    <div id="cr-estimates-mount" style="display:none;"></div>
    ${tplList}
    ${tplCreate}
  </body></html>`;
  await page.route('http://cardinal.harness/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
  await page.goto('http://cardinal.harness/');

  const genSrc = func(src, 'async function generateEstimate()');
  console.log(`generateEstimate extracted: ${genSrc.length} chars`);
  if (genSrc.length < 200) throw new Error('generateEstimate extract too small');

  await page.evaluate((gs) => {
    window.__genSrc = gs;
    window.supa = {
      auth: { getSession: async () => ({ data: { session: { access_token: 't0ken' } } }) },
      from: () => ({
        select: function () { return this; }, order: function () { return this; },
        eq: function () { return this; }, limit: async () => ({ data: [], error: null }),
        single: async () => ({ data: null, error: null }),
        update: function () { return this; }, insert: function () { return this; },
      }),
    };
    window.cacheProjects = [];
    window.__posted = [];
    window.fetch = async (url, opts) => {
      window.__posted.push({ url: String(url), body: JSON.parse((opts && opts.body) || '{}') });
      return { ok: true, json: async () => ({ id: 'fake-est', estimate: {} }) };
    };
  }, genSrc);

  await page.addScriptTag({ content: code });

  const res = await page.evaluate(async () => {
    const out = {};
    const CE = window.CardinalEstimates;
    out.hasOpenAI = !!(CE && typeof CE.openAI === 'function');

    // 1. Open the builder for a specific client, the way the profile button does.
    CE.openAI({ id: 'proj-123', name: 'ZZ Client', address: '100 Test Ave, Dayton, OH',
                phone: '937-555-0142', email: 'zz@example.com' });
    await new Promise(r => setTimeout(r, 250));

    const mount = document.getElementById('cr-estimates-mount');
    const banner = mount.querySelector('[data-cr-forclient]');
    out.bannerExists = !!banner;
    out.bannerOn = !!(banner && banner.classList.contains('on'));
    out.bannerText = banner ? banner.textContent.replace(/\s+/g, ' ').trim() : '';

    // 2. Drive the module's own generate path and capture what it POSTs.
    //    Reach the session through the module's own localStorage record.
    const keys = Object.keys(localStorage).filter(k => k.indexOf('cardinal.ai_estimate.') === 0);
    out.sessionKeys = keys.length;
    const sess = keys.length ? JSON.parse(localStorage.getItem(keys[keys.length - 1])) : null;
    out.sessionProjectId = sess ? (sess.project_id || null) : null;
    out.sessionClientName = sess && sess.client ? sess.client.name : null;

    // The payload proof runs the SHIPPED generateEstimate() (extracted by brace
    // matching, injected below as __genSrc) against the session the module just
    // created — the real function, real session, captured payload. Driving the
    // photo-upload UI instead would test the file picker, not this change.
    if (sess) {
      const runGen = new Function('state', 'api', 'MIN_PHOTOS', 'clearSessionFromLS', `
        ${window.__genSrc}
        return generateEstimate();
      `);
      const liveSession = Object.assign({}, sess, {
        photos: [1, 2, 3, 4].map(i => ({ status: 'uploaded', url: 'https://cdn/p' + i + '.jpg' })),
        description: 'Full tear-off with new underlayment and ridge vent on a ranch.',
      });
      const captured = [];
      const fakeApi = async (path, body) => { captured.push({ url: path, body }); return { id: 'fake' }; };
      try {
        await runGen({ session: liveSession }, fakeApi, 4, () => {});
        out.genOk = true;
      } catch (e) { out.genError = String(e.message || e); }
      captured.forEach(c => window.__posted.push(c));
    }
    out.posted = window.__posted;

    // 3. Regression guard: showList wires new-ai straight to onclick, so the
    //    handler receives a MouseEvent as argument 1. It must not explode.
    CE.open();
    await new Promise(r => setTimeout(r, 200));
    const aiBtn = document.querySelector('#cr-estimates-mount [data-act="new-ai"]');
    out.listRendered = !!aiBtn;
    if (aiBtn) {
      aiBtn.click();
      await new Promise(r => setTimeout(r, 250));
      const b2 = document.querySelector('#cr-estimates-mount [data-cr-forclient]');
      out.eventPathOk = !!document.querySelector('#cr-estimates-mount [data-tmpl]');
      out.eventPathBannerOff = !!(b2 && !b2.classList.contains('on'));
    }
    return out;
  });

  await browser.close();

  let fails = 0;
  const check = (name, ok, detail) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail !== undefined ? ' — ' + detail : ''}`);
    if (!ok) fails++;
  };

  const est = (res.posted || []).find(p => p.url.indexOf('/api/estimate') !== -1);

  console.log('assertions:');
  check('profile carries an AI Estimate button', hasProfileBtn);
  check('profile button opens it for the current client', wiredToOpener);
  check('openAI accepts a project', res.hasOpenAI);
  check('session records project_id', res.sessionProjectId === 'proj-123', String(res.sessionProjectId));
  check('session records the client', res.sessionClientName === 'ZZ Client', String(res.sessionClientName));
  check('AI screen names the client', res.bannerOn && /ZZ Client/.test(res.bannerText), res.bannerText || '(empty)');
  check('shipped generateEstimate() ran', res.genOk === true, res.genError || 'ok');
  check('POSTed to /api/estimate', !!est, est ? est.url : '(no call captured)');
  check('payload carries project_id', !!est && est.body.project_id === 'proj-123',
        est ? JSON.stringify(est.body.project_id) : 'n/a');
  check('payload carries client name', !!est && est.body.client && est.body.client.name === 'ZZ Client',
        est && est.body.client ? est.body.client.name : 'n/a');
  check('payload keeps template + photos + description',
        !!est && !!est.body.template && (est.body.photo_urls || []).length === 4 && !!est.body.description);
  check('list-button click path still works (Event as arg 1)', res.listRendered && res.eventPathOk);
  check('unbound session shows no client banner', res.eventPathBannerOff !== false);
  check('no page errors', errs.length === 0, errs.join(' | ') || 'none');

  clearTimeout(WATCHDOG);
  console.log(fails === 0 ? '\nPASS' : `\nFAIL (${fails})`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { clearTimeout(WATCHDOG); console.error('HARNESS ERROR:', e.message); process.exit(2); });
