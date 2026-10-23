/* gate_1395 — the Community header fits a phone: at 390px the title is not truncated and the pill row is
 * one line; retail's row is one line too. Arg: [index.html] -> negative control (1394 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const APP = fs.readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 150000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  for (const light of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    await p.route('**/*', r => { const u = r.request().url(); if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html', body: APP });
      if (u.includes('supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
      if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, body: '{}' }); return r.abort(); });
    await p.addInitScript(l => { window.__SEED__ = { projects: [], team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }] };
      try { if (l) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {} }, light);
    await p.addInitScript(MOCK);
    await p.goto('https://app.cardinalroster.com/'); await waitAppReady(p); await settle(p);
    const m = await p.evaluate(async () => {
      try { CardinalFrontDoor.close(); } catch (_) {}
      const meas = () => { const nb = document.getElementById('crBanner'); const h = document.querySelector('#cr-hd2-bar #brandTitle h1');
        const tops = new Set([...nb.children].filter(e => e.getClientRects().length && !/cbsrch|cbcrm/.test(e.className)).map(e => Math.round(e.getBoundingClientRect().top)));
        return { rows: tops.size, trunc: !!h && h.scrollWidth > h.clientWidth + 1, title: h && h.textContent }; };
      const ret = meas();
      document.body.dataset.crm = 'community'; window.CardinalCommunityHub.show(); await new Promise(r => setTimeout(r, 1500));
      return { ret, com: meas() };
    });
    const th = light ? 'light' : 'dark';
    ok(m.com.rows === 1, 'Community ' + th + ': the pill row is one line at 390px', JSON.stringify(m.com));
    ok(!m.com.trunc, 'Community ' + th + ': the title is not truncated', JSON.stringify(m.com));
    ok(m.ret.rows === 1 && !m.ret.trunc, 'Retail ' + th + ': unchanged — one row, title whole', JSON.stringify(m.ret));
    await ctx.close();
  }
} finally { await b.close(); }
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
