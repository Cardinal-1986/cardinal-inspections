// gate_1023.mjs — proves the contract "N to fill" chip label clears the 4.5:1
// body-text floor on its own .btn.dark (#555) ground (build 1023, finding 17).
//
// Reads the TWO shipped facts and computes the ratio itself (self-contained WCAG
// 2.x; no dependency on contrast.py):
//   ground  = the background of .btn.dark (the chip is <button class="btn dark">)
//   label   = refreshFillChip's `btn.style.color = n ? <toFill> : <allFilled>`
// Asserts both states clear 4.5:1, and that the old failing inks are gone.
//
// Usage:
//   node gate_1023.mjs                 # working tree -> GREEN
//   node gate_1023.mjs <index.html>    # build-1022 copy -> RED (2.12:1 / 3.19:1)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const INDEX = process.argv[2] || path.join(REPO, 'index.html');
const src = fs.readFileSync(INDEX, 'utf8');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [R, G, B] = [f(r), f(g), f(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function ratio(a, b) {
  const la = lum(hexToRgb(a)), lb = lum(hexToRgb(b));
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// ground: .btn.dark{background:#555;}
let ground = null;
{
  const m = src.match(/\.btn\.dark\s*\{\s*background:\s*(#[0-9a-fA-F]{3,6})/);
  if (!m) fails.push('[extract] .btn.dark background not found');
  else ground = m[1];
}

// label: refreshFillChip -> btn.style.color = n ? '<toFill>' : '<allFilled>';
let toFill = null, allFilled = null;
{
  const at = src.indexOf('function refreshFillChip()');
  const seg = at === -1 ? '' : src.slice(at, at + 900);
  const m = seg.match(/btn\.style\.color\s*=\s*n\s*\?\s*'(#[0-9a-fA-F]{3,6})'\s*:\s*'(#[0-9a-fA-F]{3,6})'/);
  if (!m) fails.push('[extract] refreshFillChip label color line not found');
  else { toFill = m[1]; allFilled = m[2]; }
}

if (ground && toFill && allFilled) {
  const FLOOR = 4.5;
  const rTo = ratio(toFill, ground), rAll = ratio(allFilled, ground);
  ok(rTo >= FLOOR, `[to-fill] ${toFill} on ${ground} = ${rTo.toFixed(2)}:1, below the ${FLOOR}:1 body floor`);
  ok(rAll >= FLOOR, `[all-filled] ${allFilled} on ${ground} = ${rAll.toFixed(2)}:1, below the ${FLOOR}:1 body floor`);
  // the two old failing inks must be gone from this line
  ok(toFill.toLowerCase() !== '#e35c63', '[regress] to-fill must not be the old #e35c63 (2.12:1)');
  ok(allFilled.toLowerCase() !== '#6cb98f', '[regress] all-filled must not be the old #6cb98f (3.19:1)');
  if (!fails.length) console.error(`  (measured: to-fill ${rTo.toFixed(2)}:1, all-filled ${rAll.toFixed(2)}:1 on ${ground})`);
}

if (fails.length) {
  console.error('RED — gate_1023 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1023: the fill-count chip label clears 4.5:1 on its #555 ground in both states.');
