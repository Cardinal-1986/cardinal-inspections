#!/usr/bin/env node
/* gate_1451 — Punch: finishing a job (the punch audit's group 1).
 *
 *   A  list: a job the crew said is finished sits under "Ready to close · 1", reads "Finished"
 *   B  list: the headline counts it ("1 ready to close")
 *   C  desktop rail: Needs attention has "Ready to close 1"
 *   D  boss card on a phone: the Close button rides in a fixed dock at the bottom of the screen,
 *      the in-flow copy is hidden, and it says who finished the job
 *   E  crew card on a phone, already told Curtis: the dock holds a "Curtis has been told" receipt,
 *      not a button (it used to post the same message again)
 *   F  crew card with no steps: the empty checklist says Curtis adds them
 *   G  desktop: no dock; the Close button stays in the right column
 *
 *   node gate_1451.mjs [index.html]      must be RED on build 1450
 *   PW_CORE=<playwright-core path>  PW_CHROMIUM=<browser exe>   (local runs)
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PW = process.env.PW_CORE || (existsSync('/opt/node22/lib/node_modules/playwright/index.js') ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');
const { chromium } = require(PW);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const APP = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(ROOT, 'index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : ''));
  cond ? pass++ : fail++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

/* i5 (Curtis, on site today) gets five photos and the crew's "finished" message */
const FINISH = () => {
  const P = Array.from({ length: 5 }, (_, i) => ({ url: 'https://example.invalid/p' + i + '.jpg', by: 'curtis@cardinalrenovations.net', at: new Date().toISOString() }));
  const C = [{ by: 'curtis@cardinalrenovations.net', name: 'Curtis', at: new Date().toISOString(), text: 'Finished — ready for Curtis to close.', flag: 'askclose' }];
  return window.supa.from('punch_items').update({ photos: P, comments: C }).eq('id', 'i5');
};

async function load(width, who) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=' + who, { waitUntil: 'domcontentloaded' });
  await wait(3800);
  try { await p.evaluate(FINISH); } catch (e) {}
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1200);
  return { p, close: () => ctx.close() };
}
const openCard = async (p, id) => { try { await p.evaluate(i => { const r = document.querySelector('#punchView .pl-row[data-pu="' + i + '"]'); if (r) r.click(); }, id); } catch (e) {} await wait(1200); };

/* A–C: boss, list, desktop and phone */
{
  const { p, close } = await load(1440, 'theo');
  const v = await p.evaluate(() => {
    const L = document.getElementById('puList'); if (!L) return {};
    const grp = [...L.querySelectorAll('.pl-grp')].map(g => g.textContent.trim());
    const rg = [...L.querySelectorAll('.pl-grp')].find(g => /ready to close/i.test(g.textContent));
    let row = null; if (rg) { let n = rg.nextElementSibling; while (n && n.classList.contains('pl-cols')) n = n.nextElementSibling; row = n; }
    const rail = [...document.querySelectorAll('#punchView [data-pufocus="ready"]')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
    return { grp, rowId: row && row.getAttribute('data-pu'), rowWhen: row && (row.querySelector('.pl-wh') || {}).textContent,
      readyCls: !!(rg && rg.classList.contains('ready')), sub: (document.getElementById('puSub') || {}).textContent, rail };
  });
  ok(v.grp && v.grp.some(t => /^Ready to close · 1$/i.test(t)) && v.rowId === 'i5' && /Finished/.test(v.rowWhen || '') && v.readyCls,
     'A  list: the finished job sits under "Ready to close · 1" and reads Finished', v);
  ok(/1 ready to close/.test(v.sub || ''), 'B  headline counts it', v.sub);
  ok((v.rail || []).some(t => /Ready to close\s*1/.test(t)), 'C  desktop rail: Ready to close 1', v.rail);
  /* G: desktop card — no dock, Close in the right column */
  await openCard(p, 'i5');
  /* 1455 moved the desk card into a side panel whose Close rides in the same dock, so this asks
     only what 1451 promised on a desk: ONE Close showing, and it says who finished the job */
  const g = await p.evaluate(() => {
    const vis = [...document.querySelectorAll('#cr-pk .pkclose')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; });
    return { shown: vis.length, txt: vis[0] && vis[0].textContent };
  });
  ok(g.shown === 1 && /says it.s finished/.test(g.txt || ''), 'G  desktop: one Close showing, says who finished it', g);
  await close();
}
/* D: boss card on a phone */
{
  const { p, close } = await load(390, 'theo');
  await openCard(p, 'i5');
  const d = await p.evaluate(() => {
    const dk = document.querySelector('#cr-pk .pkdock'); const b = dk && dk.querySelector('.pkclose');
    const inflow = document.querySelector('#cr-pk .pksplit .pkclose');
    const r = b && b.getBoundingClientRect();
    return { dockPos: dk && getComputedStyle(dk).position, btnBottom: r && Math.round(r.bottom), vh: innerHeight, btnTag: b && b.tagName,
      txt: b && b.textContent, inflow: inflow ? getComputedStyle(inflow).display : null };
  });
  ok(d.dockPos === 'fixed' && d.btnBottom > d.vh - 40 && d.btnBottom <= d.vh && d.inflow === 'none' && d.btnTag === 'BUTTON' && /says it.s finished/.test(d.txt || ''),
     'D  phone, boss: Close rides at the bottom of the screen, in-flow copy hidden, says who finished', d);
  await close();
}
/* E, F: crew (Scottie) on a phone */
{
  const { p, close } = await load(390, 'scottie');
  await openCard(p, 'i5');
  const e = await p.evaluate(() => {
    const b = document.querySelector('#cr-pk .pkdock .pkclose');
    return { tag: b && b.tagName, cls: b && b.className, txt: b && b.textContent, act: b && b.getAttribute('data-act') };
  });
  ok(e.tag === 'DIV' && /sent/.test(e.cls || '') && /Curtis has been told/.test(e.txt || '') && !e.act, 'E  phone, crew already told Curtis: a receipt, not a button', e);
  try { await p.evaluate(() => { const b = document.querySelector('#cr-pk [data-act="back"]'); if (b) b.click(); }); } catch (x) {}
  await wait(800);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (x) {}
  await wait(800);
  await openCard(p, 'i4');
  const f = await p.evaluate(() => { const s = document.getElementById('pkSecCk'); return s ? s.textContent.replace(/\s+/g, ' ').trim() : null; });
  ok(/Curtis adds them/.test(f || ''), 'F  crew, empty checklist: says Curtis adds the steps', f);
  await close();
}
await browser.close();
console.log(`GATE 1451 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
