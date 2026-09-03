#!/usr/bin/env node
/* gate_1198 — light header icon surfaces follow their inks.
 * The hamburger and search marks are currentColor SVGs. Build 1197 gave them
 * light-mode navy ink but let Retail's higher-specificity dark button gradient
 * win, producing navy-on-navy controls. This gate requires ink, surface and
 * border in the same winning ID-scoped rule. The 1197 control must go red.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '../../../..');
const app = process.argv[2] || path.join(root, 'index.html');
const html = fs.readFileSync(app, 'utf8');
let pass = 0, fail = 0;
function ok(name, condition, detail = ''){
  console.log((condition ? '  PASS  ' : '  FAIL  ') + name + (detail ? ' → ' + detail : ''));
  condition ? pass++ : fail++;
}
ok('Build stamp is 1198', html.includes('v2026-09-03 build 1198'));
ok('Changelog names the header-icon change', html.includes("{ b: 1198,"));
const rule = html.match(/:root\[data-theme="rb-light"\] #cr-hd2-bar \.cr-ib\s*\{([\s\S]*?)\}/);
ok('Winning light-mode icon rule exists once', (html.match(/:root\[data-theme="rb-light"\] #cr-hd2-bar \.cr-ib\s*\{/g) || []).length === 1);
ok('Winning rule sets the icon ink', !!rule && /color\s*:\s*var\(--hin/.test(rule[1]));
ok('Winning rule sets a light button surface', !!rule && /background\s*:\s*color-mix\(/.test(rule[1]));
ok('Winning rule sets the button border', !!rule && /border-color\s*:/.test(rule[1]));
ok('Menu and search use currentColor SVGs',
   html.includes("window.CardinalIcons.get('menu')") && html.includes("window.CardinalIcons.get('search')") &&
   html.includes('stroke="currentColor"'));
ok('Filled + button keeps its later explicit override',
   /:root\[data-theme="rb-light"\] #cr-hd2-bar #addProjectBtn[\s\S]{0,260}background:var\(--hac/.test(html));
ok('Abandoned Retail restyle is absent', !html.includes('cr-retail-hub-1198-styles'));

/* Let Chromium resolve the real cascade. Scripts are removed before loading so
   this remains an offline style test; their template styles cannot leak into
   the document, which is the same trap the standing sentinel documents. */
let chromium;
try { chromium = createRequire(import.meta.url)('playwright').chromium; }
catch (_) { ok('Chromium cascade check can start', false, 'playwright is missing'); }
if (chromium) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const inert = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    await page.setContent(inert, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const styles = await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'rb-light');
      document.body.setAttribute('data-crm-head', 'retail');
      let bar = document.getElementById('cr-hd2-bar');
      if (!bar) {
        bar = document.createElement('div'); bar.id = 'cr-hd2-bar';
        document.body.appendChild(bar); // cr-hd2-script normally builds this shell
      }
      bar.style.display = 'flex';
      const nav = document.getElementById('navBtn');
      if (nav) {
        nav.className = 'cr-ib menu';
        bar.appendChild(nav); // cr-hd2-script's existing class + relocation
      }
      if (!document.getElementById('cr-hd2-lens')) {
        const lens = document.createElement('button');
        lens.id = 'cr-hd2-lens'; lens.className = 'cr-ib';
        bar.appendChild(lens); // cr-hd2-script's existing idempotent creation
      }
      return ['navBtn', 'cr-hd2-lens'].map(id => {
        const el = document.getElementById(id);
        if (!el) return { id, missing: true };
        el.style.display = '';
        const s = getComputedStyle(el);
        return { id, color: s.color, backgroundColor: s.backgroundColor,
                 backgroundImage: s.backgroundImage, borderColor: s.borderColor };
      });
    });
    for (const s of styles) {
      ok(`${s.id} exists in the rendered header`, !s.missing);
      ok(`${s.id} light surface wins the cascade`, !s.missing && s.backgroundImage === 'none' &&
         s.backgroundColor !== 'rgba(0, 0, 0, 0)',
         s.missing ? 'missing' : `${s.color} on ${s.backgroundColor}; image ${s.backgroundImage}`);
    }
  } finally { await browser.close(); }
}
console.log(fail ? `GATE 1198 RED — ${fail} failure(s)` : `GATE 1198 GREEN — ${pass}/${pass} checks`);
process.exit(fail ? 1 : 0);
