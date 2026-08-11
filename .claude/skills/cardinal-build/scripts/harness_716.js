/* Gate for build 716 — the Templates button must open templates, not the AI screen.
 *
 * Runs the SHIPPED cr-eaf-script block in real Chromium against the estimates
 * mount, and drives the actual click path: Templates -> client picker -> pick ->
 * client profile on the Estimates tab with the template menu open.
 *
 * Negative control — MUST go red on build 715:
 *   node harness716.js index.html          -> PASS
 *   node harness716.js index_prev715.html  -> FAIL
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
  return src.slice(s, src.indexOf('</script>', s));
}

(async () => {
  const src = fs.readFileSync(ART, 'utf8');
  const code = block(src, 'cr-eaf-script');
  console.log(`artifact : ${path.basename(ART)}`);
  console.log(`cr-eaf-script extracted: ${code.length} chars`);
  if (code.length < 3000) throw new Error('extractor captured too little — refusing to assert');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));

  // The real controls from the shipped list template, plus the profile bits the
  // hand-off targets (#pEstMenu with its six data-tpl options, #tab-estimates).
  await page.setContent(`<!doctype html><html><body>
    <div id="cr-estimates-mount" style="display:block;">
      <div class="cr-actions">
        <button class="cr-btn primary" data-act="new-ai">AI Estimate</button>
        <button class="cr-btn" data-act="new-manual">+ New</button>
        <button class="cr-btn" data-act="templates">Templates</button>
      </div>
    </div>
    <div id="projectView" style="display:none"></div>
    <div id="tab-estimates" style="display:none">
      <span id="pEstWrap">
        <button class="btn" id="pNewEstimateBtn">+ New estimate</button>
        <div id="pEstMenu" style="display:none;">
          <button class="estopt" data-tpl="roof">Roofing estimate</button>
          <button class="estopt" data-tpl="siding">Mastic vinyl siding</button>
          <button class="estopt" data-tpl="windows">Replacement vinyl windows</button>
          <button class="estopt" data-tpl="andersen">Andersen windows</button>
          <button class="estopt" data-tpl="gutters">Seamless gutters</button>
          <button class="estopt" data-tpl="general">General repair estimate</button>
        </div>
      </span>
    </div>
  </body></html>`);

  await page.evaluate(() => {
    window.__calls = { openAI: 0, openList: 0, openProject: [], showTab: [] };
    window.cacheProjects = [
      { id: 'p-1', name: 'Alma Reyes',  address: '12 Elm St, Dayton, OH',  updated_at: '2026-08-10' },
      { id: 'p-2', name: 'Bruno Katz',  address: '9 Oak Ave, Kettering, OH', updated_at: '2026-08-09' },
    ];
    window.CardinalEstimates = {
      openAI: () => { window.__calls.openAI++; },
      open:   () => { window.__calls.openList++; },
    };
    // openProject is asynchronous in effect on the real app; mimic that so the
    // module's poll is genuinely exercised rather than satisfied instantly.
    window.openProject = (id) => {
      window.__calls.openProject.push(id);
      setTimeout(() => { window.currentProject = { id, name: 'picked' }; }, 220);
    };
    window.showTab = (t) => { window.__calls.showTab.push(t); };
  });

  await page.addScriptTag({ content: code });
  await page.waitForTimeout(300);

  const res = await page.evaluate(async () => {
    const out = {};
    const mount = document.getElementById('cr-estimates-mount');
    const tplBtn = mount.querySelector('[data-act="templates"]');
    out.hasTemplatesBtn = !!tplBtn;

    tplBtn.click();
    await new Promise(r => setTimeout(r, 250));
    out.openAIAfterTemplates = window.__calls.openAI;
    out.pickerShown = !!mount.querySelector('[data-cr-eaf-tplpick]');
    out.rowCount = mount.querySelectorAll('[data-tplpick]').length;
    const _full = (mount.textContent || '').replace(/\s+/g, ' ').trim();
    out.namesTemplates = /Roofing/.test(_full) && /Gutters/.test(_full);
    out.pickerText = _full.slice(0, 120);

    // search narrows the list
    const q = mount.querySelector('[data-tplq]');
    if (q) {
      q.value = 'bruno';
      q.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      out.rowsAfterSearch = mount.querySelectorAll('[data-tplpick]').length;
      q.value = '';
      q.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
    }

    // pick a client -> should open the profile and land on Estimates with the menu
    const row = mount.querySelector('[data-tplpick="p-2"]');
    out.rowFound = !!row;
    if (row) {
      row.click();
      await new Promise(r => setTimeout(r, 900));
    }
    out.openedProject = window.__calls.openProject.slice();
    out.tabs = window.__calls.showTab.slice();
    out.menuOpen = getComputedStyle(document.getElementById('pEstMenu')).display === 'block';
    out.templateOptions = document.querySelectorAll('#pEstMenu .estopt[data-tpl]').length;
    out.mountHidden = getComputedStyle(mount).display === 'none';
    out.openAITotal = window.__calls.openAI;
    return out;
  });

  await browser.close();

  let fails = 0;
  const check = (name, ok, detail) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail !== undefined ? ' — ' + detail : ''}`);
    if (!ok) fails++;
  };

  console.log('assertions:');
  check('Templates button present', res.hasTemplatesBtn);
  check('Templates does NOT open the AI screen', res.openAITotal === 0, `openAI called ${res.openAITotal}x`);
  check('Templates opens a client picker', res.pickerShown);
  check('picker lists the clients', res.rowCount === 2, `${res.rowCount} rows`);
  check('picker names the templates in its copy', res.namesTemplates === true, res.pickerText);
  check('search narrows the list', res.rowsAfterSearch === 1, `${res.rowsAfterSearch} row(s) for "bruno"`);
  check('picking a client opens that profile', res.openedProject.join(',') === 'p-2', res.openedProject.join(',') || 'none');
  check('lands on the Estimates tab', res.tabs.indexOf('estimates') !== -1, res.tabs.join(',') || 'none');
  check('template menu is open on arrival', res.menuOpen === true);
  check('all six trade templates reachable', res.templateOptions === 6, `${res.templateOptions} options`);
  check('estimates mount stood down', res.mountHidden === true);
  check('no page errors', errs.length === 0, errs.join(' | ') || 'none');

  clearTimeout(WATCHDOG);
  console.log(fails === 0 ? '\nPASS' : `\nFAIL (${fails})`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { clearTimeout(WATCHDOG); console.error('HARNESS ERROR:', e.message); process.exit(2); });
