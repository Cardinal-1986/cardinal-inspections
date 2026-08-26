#!/usr/bin/env node
/* gate_1083 — the ask sheet.
 *
 * 88 confirm() boxes became window.crAsk(), a bottom sheet returning a
 * Promise<boolean>. This drives the REAL sheet in Chromium: a Promise you
 * cannot resolve is worse than the grey box it replaced.
 *
 * ⚠ Every check below answers "does the user get out of this?" — yes, no,
 *   Escape, and a tap on the scrim. A confirm replacement that can strand
 *   somebody mid-answer is the one failure that must not ship.
 *
 * Run against 1082 as the negative control; it must go RED.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TARGET = resolve(process.argv[2] || 'index.html');
if (!existsSync(TARGET)) { console.error('gate_1083: no such file'); process.exit(2); }
let pass = 0, fail = 0;
const is = (c, n, m) => { c ? pass++ : fail++; console.log(`  ${c ? '✓' : '✗'} ${n}${m ? ' → ' + m : ''}`); };

const src = readFileSync(TARGET, 'utf8');
console.log('gate_1083 — the ask sheet\n  file: ' + TARGET + '\n');

console.log('A. source');
is(src.includes('id="cr-ask-script"'), 'A1 the sheet module is present');
/* ⚠ COUNT IN CODE, NOT IN THE FILE. The first version of this check used a
   bare regex over the whole source and reported 7 — six of which are PROSE:
   four pre-existing comments explaining the old behaviour, and two in this
   very module's own banner. The app was right and the gate was wrong. Strip
   comments and strings the way the project's Python lexer does.
   ⚠ This stripper is CRUDER than jslex_count.py — no regex-literal or nested
   template handling — so on the CONTROL it prints ~62 where the real figure
   is 88. That does not weaken the assertion (=== 1 either holds or it does
   not), and on the artifact both instruments independently agree on 1, but
   do not quote the control's number as a measurement. */
function codeOnly(js) {
  let out = '', i = 0, n = js.length;
  while (i < n) {
    const c = js[i], d = js[i + 1];
    if (c === '/' && d === '*') { const e = js.indexOf('*!/'.replace('!',''), i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '/' && d === '/') { const e = js.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n && js[i] !== q) { if (js[i] === '\\') i++; i++; }
      i++; out += '""'; continue;
    }
    out += c; i++;
  }
  return out;
}
let inCode = 0, outsideModule = 0;
for (const m of src.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (/src=/.test(m[1])) continue;
  const hits = (codeOnly(m[2]).match(/(?<![.\w])(?:window\.)?confirm\(/g) || []).length;
  inCode += hits;
  if (hits && !/id="cr-ask-script"/.test(m[1])) outsideModule += hits;
}
is(inCode === 1, 'A2 exactly one executable confirm( remains — the fallback', `${inCode} in CODE`);
is(outsideModule === 0, 'A2b no call site still calls the browser box', `${outsideModule} outside the module`);
is(/await crAsk\(/.test(src), 'A3 call sites await the sheet');
/* the no-14th-writer rule: this module must not touch the global scroll lock */
const mod = /<script id="cr-ask-script">([\s\S]*?)<\/script>/.exec(src);
is(mod && !/body\.style\.overflow/.test(mod[1]),
   'A4 the sheet does NOT write the global scroll lock (no 14th writer)');
const stamp = /v\d{4}-\d\d-\d\d build (\d+)/.exec(src);
is(stamp && +stamp[1] >= 1083, 'A5 app stamp is 1083+', stamp ? 'build ' + stamp[1] : 'none');

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', () => {});
await page.goto('file://' + TARGET, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(2500);

console.log('\nB. the sheet, driven for real');
const exists = await page.evaluate(() => typeof window.crAsk === 'function');
is(exists, 'B1 window.crAsk is a function');
if (!exists) { await browser.close(); console.log('\nRED — sheet absent'); process.exit(1); }

/* every answer path, each resolved by a real interaction */
const R = await page.evaluate(async () => {
  const out = {};
  const ask = (msg, o) => window.crAsk(msg, o);
  const el  = () => document.getElementById('crAsk');
  const tap = (sel) => { const n = el().querySelector(sel); n && n.click(); };

  let p = ask('Delete this photo from the gallery?');
  await new Promise(r => setTimeout(r, 60));
  out.opened = !!(el() && el().classList.contains('open'));
  out.verb   = (el().querySelector('.askgo').textContent || '').trim();
  out.danger = !el().querySelector('.askgo').classList.contains('plain');
  tap('.askgo'); out.yes = await p;

  p = ask('Delete this row?');
  await new Promise(r => setTimeout(r, 60));
  tap('.askno'); out.no = await p;

  p = ask('Delete this task?');
  await new Promise(r => setTimeout(r, 60));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  out.esc = await p;

  p = ask('Delete this file for everyone?');
  await new Promise(r => setTimeout(r, 60));
  el().click();                       /* the scrim itself */
  out.scrim = await p;

  p = ask('Switch to the other template?');
  await new Promise(r => setTimeout(r, 60));
  out.plainVerb  = (el().querySelector('.askgo').textContent || '').trim();
  out.plainTone  = el().querySelector('.askgo').classList.contains('plain');
  tap('.askno'); await p;

  /* a message carrying its own consequence line after a blank line */
  p = ask('Discard this estimate?\n\nIt leaves the list but is kept on the record.');
  await new Promise(r => setTimeout(r, 60));
  out.why = (el().querySelector('.askwhy').textContent || '').trim();
  tap('.askno'); await p;

  out.closed = !el().classList.contains('open');
  return out;
});

is(R.opened === true,  'B2 the sheet opens');
is(R.yes   === true,   'B3 the affirmative resolves TRUE',  String(R.yes));
is(R.no    === false,  'B4 cancel resolves FALSE',          String(R.no));
is(R.esc   === false,  'B5 Escape resolves FALSE',          String(R.esc));
is(R.scrim === false,  'B6 a tap on the scrim resolves FALSE — never yes', String(R.scrim));
is(R.closed === true,  'B7 the sheet closes itself after answering');

console.log('\nC. the words');
is(R.verb === 'Delete',   'C1 the verb comes from the message', `"${R.verb}" not "OK"`);
is(R.danger === true,     'C2 a destructive question is red');
is(R.plainTone === true,  'C3 a non-destructive one is NOT red', `verb "${R.plainVerb}"`);
is(/kept on the record/.test(R.why || ''), 'C4 a consequence line survives', `"${(R.why||'').slice(0,44)}"`);

await browser.close();
console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
