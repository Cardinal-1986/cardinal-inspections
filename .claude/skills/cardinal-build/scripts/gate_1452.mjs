#!/usr/bin/env node
/* gate_1452 — Punch: saves that tell the truth (the punch audit's group 2).
 *
 *   A  two saves at once: with the write slowed down, toggling Urgent and then sending a message
 *      both reach the database (the second was DROPPED before 1452 while the card said "Saved")
 *   B  a refused save: the message goes back in the box and the card does not say "Saved on the job"
 *   C  a failed load: the list says it could not load and offers Try again — not "No punch work yet"
 *   D  photos keep their labels: with Overview / Close-up / Cleanup filled, removing the Close-up
 *      leaves the Close-up slot empty and the Cleanup photo still under Cleanup
 *
 *   node gate_1452.mjs [index.html]      must be RED on build 1451
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

/* every punch_items read fails, as a dropped connection does */
const FAILREAD = () => {
  const cc = window.supabase && window.supabase.createClient; if (!cc) return;
  window.supabase.createClient = function () {
    const c = cc.apply(this, arguments); const f = c.from.bind(c);
    c.from = function (t) {
      if (t !== 'punch_items') return f(t);
      const bad = { data: null, error: { message: 'Failed to fetch' } };
      const q = new Proxy({}, { get: (o, k) => k === 'then' ? (res, rej) => Promise.resolve(bad).then(res, rej) : () => q });
      return q;
    };
    return c;
  };
};

async function load(width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  if (opts.failRead) await p.addInitScript(FAILREAD);
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  if (opts.prep) { try { await p.evaluate(opts.prep); } catch (e) {} }
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'punch').run(); }); } catch (e) {}
  await wait(1200);
  return { p, close: () => ctx.close() };
}
const openCard = async (p, id) => { try { await p.evaluate(i => { const r = document.querySelector('#punchView .pl-row[data-pu="' + i + '"]'); if (r) r.click(); }, id); } catch (e) {} await wait(1200); };
const writesTo = (p) => p.evaluate(() => (window.__WRITES__ || []).filter(w => w && (w.table === 'punch_items' || w.t === 'punch_items')).map(w => JSON.stringify(w.payload || w.p || w)));

/* A: two saves at once */
{
  const { p, close } = await load(390);
  await openCard(p, 'i4');
  const r = await p.evaluate(async () => {
    const P = window.CardinalPunch; const orig = P.update;
    P.update = async function () { await new Promise(r => setTimeout(r, 700)); return orig.apply(this, arguments); };
    const urg = document.querySelector('#cr-pk [data-act="urg"]');
    if (urg) urg.click(); else { /* no Urgent control: start a slow save another way */ P.update('i4', { priority: 'high' }); }
    /* the first save re-renders the card, so find the box and Send AFTER it */
    const box = document.querySelector('#cr-pk [data-f="msg"]'); const send = document.querySelector('#cr-pk [data-act="send"]');
    if (!box || !send) return { err: 'no message box', urg: !!urg };
    box.value = 'gate1452 second save'; send.click();
    await new Promise(r => setTimeout(r, 2600));
    return { urg: !!urg };
  });
  const w = await writesTo(p);
  ok(w.some(x => /gate1452 second save/.test(x)), 'A  two saves at once: the message is written, not dropped', { r, writes: w.length, last: w.slice(-2) });
  await close();
}
/* B: a refused save */
{
  const { p, close } = await load(390);
  await openCard(p, 'i4');
  const b = await p.evaluate(async () => {
    window.CardinalPunch.update = async function () { return { ok: false, error: 'write refused' }; };
    const box = document.querySelector('#cr-pk [data-f="msg"]'); const send = document.querySelector('#cr-pk [data-act="send"]');
    if (!box || !send) return { err: 'no message box' };
    box.value = 'gate1452 refused'; send.click();
    await new Promise(r => setTimeout(r, 1500));
    const nb = document.querySelector('#cr-pk [data-f="msg"]');
    return { box: nb && nb.value, card: (document.querySelector('#cr-pk') || {}).textContent || '' };
  });
  ok(b.box === 'gate1452 refused' && !/Saved on the job/.test(b.card || ''), 'B  refused: the words go back in the box, no "Saved on the job"',
     { box: b.box, saidSaved: /Saved on the job/.test(b.card || ''), err: b.err });
  await close();
}
/* C: a failed load */
{
  const { p, close } = await load(390, { failRead: true });
  const c = await p.evaluate(() => { const e = document.querySelector('#puList .pu-empty'); return { txt: e && e.textContent, retry: !!document.querySelector('#puList [data-pureload]') }; });
  ok(/Could not load/.test(c.txt || '') && c.retry && !/No punch work yet/.test(c.txt || ''), 'C  failed load: says so and offers Try again', c);
  await close();
}
/* D: photos keep their labels */
{
  const prep = () => window.supa.from('punch_items').update({ photos: ['ov', 'cu', 'cl'].map(n => ({ u: 'https://example.invalid/' + n + '.jpg', by: 'curtis@cardinalrenovations.net', at: new Date().toISOString() })) }).eq('id', 'i4');
  const { p, close } = await load(390, { prep });
  await openCard(p, 'i4');
  await p.evaluate(() => { const b = document.querySelector('#cr-pk .pkslotwrap:nth-child(2) [data-rmphoto]'); if (b) b.click(); });
  await wait(500);
  /* the app's own confirm sheet (crAsk) — press its Remove */
  await p.evaluate(() => { const g = document.querySelector('.askgo'); if (g) g.click(); });
  await wait(1500);
  const d = await p.evaluate(() => [...document.querySelectorAll('#cr-pk .pkslot')].slice(0, 3).map(b => {
    const im = b.querySelector('img'); return { label: (b.querySelector('.sl') || {}).textContent, src: im ? im.getAttribute('data-src') : null };
  }));
  ok(d.length === 3 && /ov\.jpg/.test(d[0].src || '') && !d[1].src && /cl\.jpg/.test(d[2].src || ''), 'D  removing the Close-up leaves Cleanup under Cleanup', d);
  await close();
}
await browser.close();
console.log(`GATE 1452 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
