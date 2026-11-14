#!/usr/bin/env node
/* gate_1460 — Punch: two people on one card no longer overwrite each other's checklist.
 *
 * Curtis opens a card. Before he touches it, somebody else's step lands on the server (written
 * straight to the store, as a second phone would). Curtis then picks a checklist template.
 *   A  his write does NOT overwrite the other person's step — it is still on the server
 *   B  his card now shows the other person's step, and he is told why
 *   C  with nobody else in the way, his change saves as before (no false alarm)
 *
 *   node gate_1460.mjs [index.html]      must be RED on build 1459
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PW = process.env.PW_CORE || (existsSync('/opt/node22/lib/node_modules/playwright/index.js') ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');
const { chromium } = require(PW);
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(HERE, '../../../../index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, n, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')); c ? pass++ : fail++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
async function card(other) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  /* ⚠ The mock store hands back its OWN row objects, so the app editing its copy silently edited
     "the server" too — no real database does that, and it made this gate unable to tell a fixed card
     from a broken one. Reads of punch_items come back as copies here, as they do from Supabase. */
  await p.addInitScript(() => {
    const cc = window.supabase && window.supabase.createClient; if (!cc) return;
    window.supabase.createClient = function () {
      const c = cc.apply(this, arguments), f = c.from.bind(c);
      c.from = function (t) {
        const q = f(t); if (t !== 'punch_items') return q;
        const px = new Proxy(q, { get(o, k) {
          if (k === 'then') return (res, rej) => o.then(r => { try { return JSON.parse(JSON.stringify(r)); } catch (e) { return r; } }).then(res, rej);
          const v = o[k]; return typeof v === 'function' ? (...a) => { const out = v.apply(o, a); return out === o ? px : out; } : v;
        } });
        return px;
      };
      return c;
    };
  });
  await p.goto('https://cardinal.test/?as=curtis', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1000);
  await p.evaluate(() => { const r = document.querySelector('#punchView .pl-row[data-pu="i4"]'); if (r) r.click(); }); await wait(1200);
  /* the other phone: a step written straight to the server, behind Curtis's card */
  /* awaited INSIDE the page: the mock's query is a thenable that only runs when awaited, and
     handing it back to Playwright un-awaited let it land after Curtis's save (the gate's first draft) */
  if (other) { await p.evaluate(async () => { await window.supa.from('punch_items').update({ steps: [{ t: 'Scottie: seal the vent boot', d: true }] }).eq('id', 'i4'); }); await wait(300); }
  await p.evaluate(() => { const t = document.querySelector('#cr-pk [data-tpl]'); if (t) t.click(); }); await wait(1600);
  const v = await p.evaluate(async () => {
    const r = await window.supa.from('punch_items').select('steps').eq('id', 'i4').single();
    const ck = document.getElementById('pkSecCk');
    const toast = [...document.querySelectorAll('.crtell, .cr-tell, [role="alert"], [role="status"]')].map(e => e.textContent).join(' | ');
    return { server: (r.data && r.data.steps || []).map(s => s.t), card: ck ? ck.textContent.replace(/\s+/g, ' ').slice(0, 200) : null, toast: toast.slice(0, 200) };
  });
  return { p, v, close: () => ctx.close() };
}
{
  const { v, close } = await card(true);
  ok(v.server.length === 1 && /Scottie: seal the vent boot/.test(v.server[0]), 'A  the other person\'s step is still on the server', v.server);
  ok(/Scottie: seal the vent boot/.test(v.card || '') && !/Window repair/.test(v.card || '') && /someone else changed this card/.test(v.toast || ''),
     'B  Curtis\'s card now shows it (not the refused template), and he is told why', { card: v.card, toast: v.toast });
  await close();
}
{
  const { v, close } = await card(false);
  ok(v.server.length > 1, 'C  with nobody in the way the template saves as before', v.server.slice(0, 3));
  await close();
}
await browser.close();
console.log(`GATE 1460 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
