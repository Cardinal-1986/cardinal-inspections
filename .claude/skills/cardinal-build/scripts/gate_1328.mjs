/* gate_1328 — the document editor never saves a blank page over a real document.
 *   A  open doc A fully, close it (normal save) — A keeps its content
 *   B  open doc B and close it IMMEDIATELY (before the frame loads) — no blank write lands on B
 *   C  reopen B and close it immediately again (the previous close left a blank frame AND a stale
 *      onload) — still no blank write
 *   D  open B, let it load, edit, close — the edit IS saved (the guard does not eat real saves)
 * Arg: [index.html] -> negative control (1327: must go RED on B/C, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 180000);
const BODY = n => '<!DOCTYPE html><html><head><title>' + n + '</title></head><body><h1>Estimate ' + n + '</h1>' +
  '<table class="items"><tr><td>Roof replacement</td><td>$5,000.00</td></tr></table>' + '<p>' + 'x'.repeat(4000) + '</p></body></html>';
const P = { id: 'p1', name: 'Client One', stage: 'Prospect', address: '1 Main St', phone: '9375550100', email: 'c@example.com',
  checklist: '{}', created_at: '2026-08-01T12:00:00Z', updated_at: new Date().toISOString() };
const D = id => ({ id, project_id: 'p1', title: 'EST-2026-09' + id + ' — Estimate — Client One', total: 5000, html: BODY(id), status: 'sent',
  created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P], inspection_reports: [D('a'), D('b')],
  document_versions: [], collections: [], owner_reviews: [], estimates: [], insurance_claims: [],
  appointments: [], commissions: [], contracts: [], punch_items: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); page.on('dialog', d => d.accept());
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = JSON.parse(JSON.stringify(seed)); }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await waitAppReady(page);
await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
await page.waitForTimeout(900);
await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
await page.waitForTimeout(500); await settle(page);

/* writes to one document since mark n0: [{len, blank}] */
const run = (id, fast, edit) => page.evaluate(async ([id, fast, edit]) => {
  const n0 = (window.__WRITES__ || []).length;
  let err = '';
  try {
    await reload();
    const fr = document.getElementById('reportFrame');
    if (fast && !fr.__hooked) {
      /* the race exactly as it happens on a phone: openEditor has handed the frame its new
         document (srcdoc set, `current` set) but the frame has not loaded it yet — and the
         user leaves. Close at THAT instant. */
      const proto = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc');
      Object.defineProperty(fr, 'srcdoc', { configurable: true, get() { return proto.get.call(this); },
        set(v) { proto.set.call(this, v);
          if (v && window.__closeNow) { window.__closeNow = false;
            try { __histLock = true; } catch (_) {}
            window.__closeP = closeEditor(); try { __histLock = false; } catch (_) {} } } });
      fr.__hooked = true;
    }
    window.__closeNow = !!fast;
    const p = openEditor(id);
    if (fast) { await p; await window.__closeP; await new Promise(r => setTimeout(r, 600)); }
    if (!fast) { await p; await new Promise(r => setTimeout(r, 1200)); }
    if (edit) {
      const d = document.getElementById('reportFrame').contentDocument;
      const h = d && d.querySelector('h1'); if (h) h.textContent = 'Estimate EDITED';
    }
    /* the app's own direct-close route (edClientChip): close now, not via history.back() */
    if (!fast) {
      try { __histLock = true; } catch (_) {}
      await closeEditor();
      try { __histLock = false; } catch (_) {}
    }
    await new Promise(r => setTimeout(r, 400));
  } catch (e) { err = String(e && e.message || e); }
  const w = (window.__WRITES__ || []).slice(n0).filter(x => x.table === 'inspection_reports' && x.payload && typeof x.payload.html === 'string');
  return { err, writes: w.map(x => ({ len: x.payload.html.length,
    blank: !/<body[^>]*>[\s\S]*\S[\s\S]*<\/body>/i.test(x.payload.html), edited: /EDITED/.test(x.payload.html) })) };
}, [id, fast, edit]);

const A = await run('a', false, false);
ok(!A.err && A.writes.length >= 1 && A.writes.every(w => !w.blank), 'A  open fully, close — the save keeps the document', JSON.stringify(A));
const B = await run('b', true, false);
ok(!B.err && B.writes.every(w => !w.blank), 'B  close before it loads — no blank page written', JSON.stringify(B));
const C = await run('b', true, false);
ok(!C.err && C.writes.every(w => !w.blank), 'C  again, after a blank frame + stale onload — still no blank page', JSON.stringify(C));
const Dd = await run('b', false, true);
ok(!Dd.err && Dd.writes.some(w => w.edited && !w.blank), 'D  open fully, edit, close — the edit IS saved', JSON.stringify(Dd));

await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1328: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
