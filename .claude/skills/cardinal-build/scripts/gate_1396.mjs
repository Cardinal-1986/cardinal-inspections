/* gate_1396 — three audit bugs: refused Advance offers no review text; Sales Numbers counts the 1st; Supplement Desk reads storage-backed scopes.
 * Args: [index.html] [supplement.html] -> negative control (1395 + old supplement must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { execFileSync } from 'child_process';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const { waitAppReady, settle } = await import(HERE + 'gate_ready.mjs');
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SUP = process.argv[3] || '/home/user/cardinal-inspections/supplement.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
const iso = d => new Date(Date.now() + d * 86400000).toISOString();
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }, { email: 'rep@cardinalrenovations.net', name: 'Sample Rep', role: 'production' }],
  projects: [{ id:'j1', name:'Sample Client', stage:'Scheduled', address:'1 Main St', phone:'9375550100', checklist: JSON.stringify({ lead:{ claim_type:'retail' }, work_type:'Roofing' }), created_at: iso(-30), updated_at: iso(-30) }],
  inspection_reports: [], project_photos: [], collections: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [], job_costs: [], crew_payments: [], draws: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){};window.Papa={};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(([seed]) => { window.__SEED__ = seed; window.__AS__ = { email:'rep@cardinalrenovations.net', name:'Sample Rep' }; }, [SEED]);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await waitAppReady(page); await page.waitForTimeout(1500); await settle(page);
const r = await page.evaluate(async () => {
  try { window.CardinalFrontDoor.close(); } catch (_) {}
  openProject('j1'); await new Promise(r => setTimeout(r, 2000));
  const pr = cacheProjects.find(x => x.id === 'j1');
  acxAdvance(pr);
  await new Promise(r => setTimeout(r, 2500));
  const sheet = document.getElementById('cr-inst-sheet');
  return { stage: pr.stage, sheetOpen: !!(sheet && sheet.classList.contains('open')), why: (document.getElementById('inWhy')||{}).textContent,
           reviewAsk: /Job completed!/.test(document.body.innerText), writes: (window.__WRITES__||[]).filter(w=>w.table==='projects').length };
});
ok(r.stage !== 'Completed' && !r.reviewAsk, 'A  refused Advance to Completed offers no review request', JSON.stringify(r));
await browser.close();
/* B — snTime, extracted from the shipped file, in Dayton's zone */
const m = APP_HTML.match(/function snTime\(v\)\{[^\n]*\}/);
const js = m[0] + '; var start = new Date(2026, 9, 1); console.log(JSON.stringify([snTime("2026-10-01") >= start.getTime(), snTime("2026-01-01") >= new Date(2026, 0, 1).getTime(), snTime("2026-10-02T09:00:00") > start.getTime()]));';
const out = JSON.parse(execFileSync('node', ['-e', js], { env: Object.assign({}, process.env, { TZ: 'America/New_York' }) }).toString());
ok(out[0] && out[1] && out[2], 'B  a payment collected on the 1st counts in This month / Jan 1 in This year (Dayton time)', JSON.stringify(out));
/* C — Supplement Desk reads a storage-backed scope */
const SH = fs.readFileSync(SUP, 'utf8');
ok(/!\(pay\.data \|\| pay\.path\)/.test(SH) && /storage\.from\(pay\.bucket \|\| 'job-files'\)\.download\(pay\.path\)/.test(SH), 'C  Desk accepts {bucket,path} documents and downloads them');
{ const _b = Number((/var SD_BUILD = (\d+);/.exec(SH) || [])[1]); ok(_b >= 1396 && new RegExp('>build ' + _b + '<').test(SH), 'C  Desk stamp bumped (1396 or later, one stamp in both places)'); }   /* 1405: was pinned to 1396 */
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
