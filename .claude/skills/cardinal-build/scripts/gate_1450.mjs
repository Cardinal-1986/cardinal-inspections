#!/usr/bin/env node
/* gate_1450 — obsidian instead of navy (Theo, 13 Nov 2026: "keep what we currently have and just
 * change the colors", then grey, "darker maybe glass style", "Try obsidian" — pick A). Same layout and drawer.
 *
 *   A  dark home: page #09090C, cards #15161C under the obsidian face, pipeline well and top bar #0B0B0E
 *   B  dark desktop: the drawer rail is #0B0B0E and nothing on the home screen still paints navy
 *      (any of the ten navy grounds 1449 painted, as a colour or a gradient stop)
 *   C  dark client page: client card, money row and Job Menu tiles are #15161C
 *   D  light is untouched: page, home cards and the drawer read exactly what they read before
 *   E  scope: the --bg token rule is dark + retail only (not light, not Claims, not Community)
 *   F  obsidian: a home card paints 545's sheen (#2c2d36 at the top-left) and stands on its real shadow
 *
 *   node gate_1450.mjs [index.html]      must be RED on build 1449
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
const APP  = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(ROOT, 'index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' +
              readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 260) : ''));
  cond ? pass++ : fail++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

const PAGE = 'rgb(9, 9, 12)', RAIL = 'rgb(11, 11, 14)', BOX = 'rgb(21, 22, 28)';

async function load(width, light, client) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await page.addInitScript(SETUP);
  if (light) await page.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await page.goto('https://cardinal.test/', { waitUntil: 'domcontentloaded' });
  await wait(3800);
  if (client) { await page.evaluate(() => { const ps = window.cacheProjects || []; const r = ps.find(x => x.crm === 'retail') || ps[0]; if (r) window.openProject(r.id); }); await wait(2000); }
  const v = await page.evaluate(() => {
    const el = sel => document.querySelector(sel);
    const bg = sel => { const e = el(sel); return e ? getComputedStyle(e).backgroundColor : null; };
    const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
    /* the 1449 navy family, exactly: 0A0E16 0D1220 0F1521 141B27 141C29 111927 1A2434 223047 33496A 161d2a */
    const NAVY = ['10,14,22', '13,18,32', '15,21,33', '20,27,39', '20,28,41', '17,25,39', '26,36,52', '34,48,71', '51,73,106', '22,29,42'];
    const navy = c => { const m = rgb(c); return m.length >= 3 && (m[3] === undefined || m[3] > .5) && NAVY.includes(m.slice(0, 3).join(',')); };
    const hits = [];
    const scope = el('#mainView');
    const els = [document.body, el('.site'), el('#cr-lnav'), ...(scope ? scope.querySelectorAll('*') : [])].filter(Boolean);
    for (const e of els) {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(e);
      if (navy(cs.backgroundColor)) hits.push((e.id || e.className || e.tagName) + ' ' + cs.backgroundColor);
      const st = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).find(navy); if (st) hits.push((e.id || e.className || e.tagName) + ' grad ' + st);
    }
    const card = el('#mainView .pipecard');
    return {
      theme: document.documentElement.getAttribute('data-theme') || 'dark',
      body: getComputedStyle(document.body).backgroundColor, site: bg('.site'), card: bg('#mainView .pipecard'),
      cardBgi: card ? getComputedStyle(card).backgroundImage : null, cardSh: card ? getComputedStyle(card).boxShadow : null,
      well: bg('#pipeRow'), nav: bg('#cr-lnav'),
      projinfo: bg('#projectView .projinfo'), money: bg('#projectView #dbMoneyRow') || bg('#projectView .dbmoney'), jabox: bg('#projectView .jabox'),
      hits: [...new Set(hits)],
    };
  });
  await ctx.close();
  return v;
}

const home = await load(1440, false, false);
ok(home.theme !== 'rb-light' && home.body === PAGE && home.card === BOX && home.well === RAIL && home.site === RAIL,
   'A  dark home: page, cards, pipeline well and top bar are the 1450 obsidians', { body: home.body, card: home.card, well: home.well, site: home.site });
ok(home.nav === RAIL && home.hits.length === 0, 'B  dark desktop: drawer rail is #0B0B0E and no navy is left on the home screen', { nav: home.nav, navy: home.hits.slice(0, 6) });

const cli = await load(1440, false, true);
ok(cli.projinfo === BOX && cli.jabox === BOX && cli.money === BOX, 'C  dark client page: client card, money row and Job Menu tiles are #15161C', { projinfo: cli.projinfo, jabox: cli.jabox, money: cli.money });

const lt = await load(1440, true, false);
ok(lt.theme === 'rb-light' && lt.body === 'rgb(247, 247, 247)' && lt.card === 'rgb(255, 255, 255)' && lt.nav !== RAIL,
   'D  light is untouched: #f7f7f7 page, white cards, the drawer keeps its light ground', { body: lt.body, card: lt.card, nav: lt.nav });

const m = HTML.match(/([^{}]*)\{\s*--bg:#09090C; --nv-card1:/);
const sel = m ? m[1].trim().split('\n').pop() : '';
ok(/:root:not\(\[data-theme="rb-light"\]\)/.test(sel) && /:not\(\.claim-insurance\)/.test(sel) && /:not\(\.claim-community\)/.test(sel),
   'E  the obsidian page ground is scoped to dark retail only', sel || 'no --bg:#09090C token rule');

ok(/radial-gradient/.test(home.cardBgi || '') && /rgb\(44, 45, 54\)/.test(home.cardBgi || '') && /0px 10px 24px/.test(home.cardSh || '') && /inset/.test(home.cardSh || ''),
   'F  obsidian: a home card paints the 545 sheen and stands on its shadow', { bgi: (home.cardBgi || '').slice(0, 90), sh: home.cardSh });

await browser.close();
console.log(`GATE 1450 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
