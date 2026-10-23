/* gate_1406 — roles, search, the Community bid path (seed gate_1406_seed.js, sample names only).
 *   A  api/abc.js refuses a signed-in account that is not Cardinal staff
 *   B  Crews is not offered to, and does not open for, a sales rep; it opens for Production
 *   C  a Community bid on a job with no funding partner is refused (never defaults to the occupant)
 *   D  search folds accents / curly apostrophes, reads +1 phone numbers and "PO 3001"
 *   E  partner lists put Habitat first; a general contractor is labelled so in search
 * Args: [index.html] [api/abc.js] -> negative control (1405 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const ABC = process.argv[3] || '/home/user/cardinal-inspections/api/abc.js';
import fs from 'fs';
const { boot } = await import('./gate_1403_lib.mjs');
const seed = fs.readFileSync(new URL('./gate_1406_seed.js', import.meta.url), 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 280000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const tryDo = async (why, f) => { try { return await f(); } catch (e) { ok(false, why + ' (crashed)', e.message.split('\n')[0].slice(0, 140)); return null; } };

/* A */
await tryDo('A', async () => {
  const mod = await import(ABC);
  const call = async (email) => {
    globalThis.fetch = async (url) => { url = String(url);
      if (url.endsWith('/auth/v1/user')) return { ok: true, json: async () => ({ email }) };
      return { ok: false, status: 599, json: async () => ({}), text: async () => '' }; };
    const res = { code: 0, body: null, status(c) { res.code = c; return res; }, json(b) { res.body = b; return res; }, setHeader() {}, send(b) { res.body = b; return res; }, end() { return res; } };
    await mod.default({ method: 'POST', headers: { authorization: 'Bearer x' }, body: { action: 'priceItems', items: [] }, query: {} }, res);
    return res;
  };
  const out = await call('stranger@example.com'), staff = await call('rep@cardinalrenovations.net');
  ok(out.code === 403, 'A1 a signed-in non-staff account is refused ABC pricing', out.code + ' ' + JSON.stringify(out.body).slice(0, 80));
  ok(!(staff.code === 403 && /staff/i.test(JSON.stringify(staff.body))) && staff.code !== 401, 'A2 staff still get past the gate', staff.code + ' ' + JSON.stringify(staff.body).slice(0, 80));
});

/* B */
for (const as of ['rep', 'curtis']) {
  await tryDo('B ' + as, async () => {
    const { browser, page } = await boot(as, { seed, desktop: true, instr: false });
    try {
      const r = await page.evaluate(async () => {
        const opt = document.querySelector('#navMenu .navopt[data-go="crews"], #navMenu [data-nav="crews"], #navMenu .navopt[data-opt="crews"]');
        const shown = opt ? getComputedStyle(opt).display !== 'none' : null;
        try { await window.CardinalCrews.open(); } catch (_) {}
        await new Promise(r => setTimeout(r, 900));
        const v = document.getElementById('crewsView');
        return { shown, open: !!(v && getComputedStyle(v).display !== 'none') };
      });
      if (as === 'rep') ok(r.open === false && r.shown !== true, 'B1 Crews is not offered to, and does not open for, a sales rep', JSON.stringify(r));
      else ok(r.open === true, 'B2 Crews still opens for Production', JSON.stringify(r));
    } finally { await browser.close(); }
  });
}

/* C, D, E */
{
  const { browser, page } = await boot('theo', { seed, desktop: true, instr: false });
  try {
    await tryDo('C', async () => {
      await page.evaluate(async () => { try { await window.openProject('C4'); } catch (e) {} }); await page.waitForTimeout(1500);
      await page.evaluate(async () => { try { await openEditor('bidC4'); } catch (e) {} }); await page.waitForTimeout(1500);
      await page.evaluate(() => { window.priceOkToSend = async () => true; const b = document.getElementById('emailDocBtn'); if (b) b.click(); });
      await page.waitForTimeout(2500);
      const vals = await page.evaluate(() => [...document.querySelectorAll('input,textarea')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.value));
      ok(!vals.some(v => /occupant4@example\.com/.test(v)), 'C  a Community bid with no partner never defaults to the occupant', JSON.stringify(vals.filter(v => /@/.test(v))));
      await page.evaluate(() => { try { closeEditor(); } catch (_) {} });
    });
    await tryDo('D', async () => {
      const r = await page.evaluate(() => {
        const ids = q => window.CardinalSearch.search(q).clients.map(c => c.id);
        return { curly: ids('o’brien'), plain: ids('obrien'), jose: ids('jose'), plus1: ids('+1 937 555 0177'), one: ids('19375550177'), po: ids('po 3001'), dash: ids('937-555-0177') };
      });
      ok(r.curly.includes('R2') && r.plain.includes('R2'), 'D1 O’Brien is found with a curly apostrophe and with none', JSON.stringify([r.curly, r.plain]));
      ok(r.jose.includes('R3'), 'D2 José is found as "jose"', JSON.stringify(r.jose));
      ok(r.plus1.includes('R2') && r.one.includes('R2') && r.dash.includes('R2'), 'D3 a phone typed with its leading 1 / +1 is found', JSON.stringify([r.plus1, r.one, r.dash]));
      ok(r.po.includes('R2'), 'D4 "PO 3001" is found', JSON.stringify(r.po));
      const home = await page.evaluate(() => { try { CardinalFrontDoor.close(); } catch (_) {} try { showHome(); } catch (_) {} const b = document.getElementById('searchBox'); b.value = 'jose'; b.dispatchEvent(new Event('input', { bubbles: true })); return new Promise(r => setTimeout(() => r(document.getElementById('countLabel').textContent), 400)); });
      ok(/^1 /.test(home), 'D5 the Home search folds too', home);
    });
    await tryDo('E', async () => {
      const r = await page.evaluate(async () => { const C = window.CardinalCommunityPartners; await C.load(true);
        return { pal: window.CardinalSearch.search('a').partners.map(x => x.name), }; });
      ok(/habitat/i.test(r.pal[0] || ''), 'E1 header search puts Habitat first', JSON.stringify(r.pal));
      await page.evaluate(() => window.CardinalCommunityPartners.openDirectory()); await page.waitForTimeout(1200);
      const dir = await page.evaluate(() => [...document.querySelectorAll('.cr-cp-row .n')].map(e => e.textContent.trim()));
      ok(/habitat/i.test(dir[0] || ''), 'E2 the partner directory puts Habitat first', JSON.stringify(dir.slice(0, 3)));
      await page.evaluate(() => { const v = document.querySelector('#cr-cp-view, .cr-cp-shell'); window.CardinalSearch.open(); const i = document.querySelector('.cr-srch-inp'); i.value = 'acme'; i.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(400);
      const lab = await page.evaluate(() => (document.querySelector('.cr-srch-results') || {}).innerText || '');
      ok(/General contractor/.test(lab) && !/Acme Builders GC\s*\n?\s*Property manager/.test(lab), 'E3 a general contractor is labelled so in search', lab.replace(/\n/g, ' | ').slice(0, 120));
    });
  } finally { await browser.close(); }
}
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
