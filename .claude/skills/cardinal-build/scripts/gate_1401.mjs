/* gate_1401 — an office day on insurance, Community and money. Seed: gate_1401_seed.js (sample names only).
 *   A  the claim strip on an insurance job counts the job's own payments
 *   B  Claims hub: Deductibles due nets the homeowner's payments; Owed by carriers nets the deductible;
 *      the chase list shows what is left
 *   C  Owner Review does not flag "Deductible not collected" when the homeowner paid it
 *   D  Money In & Commissions is readable on an insurance job (≥ 4.5:1)
 *   E  Invoices & AR's text/email greet through invHello
 *   F  Community Partners: Habitat first, and Owed is the balance after payments
 * Arg: [index.html] -> negative control (1400 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot, go, txt, portal2, tapSel } = await import('./gate_1401_lib.mjs');
import fs from 'fs';
const SRC = fs.readFileSync(process.env.APPFILE, 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 300000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const tryDo = async (why, f) => { try { return await f(); } catch (e) { ok(false, why + ' (crashed)', e.message.split('\n')[0].slice(0, 120)); return null; } };

{
  const { browser, page } = await boot('theo');
  try {
    /* A */
    await page.evaluate(id => { try { CardinalFrontDoor.close(); } catch (_) {} openProject(id); }, 'I1');
    await page.waitForTimeout(3000);
    const ins = await page.evaluate(() => { const e = document.querySelector('.cr-claimstrip'); return e ? e.innerText.replace(/\s+/g, ' ') : 'NONE'; });
    ok(/Received \$9,500/.test(ins) && !/ACV Paid/.test(ins), 'A  claim strip counts the job’s payments ($9,000 carrier + $500 homeowner)', ins.slice(0, 160));

    /* D */
    await tryDo('D', async () => {
      await page.getByText('Money In & Commissions').filter({ visible: true }).first().click();
      await page.waitForTimeout(1500);
      const worst = await page.evaluate(() => {
        const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
        const ground = el => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const a = b.match(/[\d.]+/g); if (a && (a.length < 4 || Number(a[3]) > .5)) return b; } return 'rgb(255,255,255)'; };
        const tab = document.getElementById('tab-commissions');
        if (!tab || tab.offsetParent === null) return { r: 0, why: 'tab not shown' };
        let w = { r: 99 };
        tab.querySelectorAll('h4, b, td, th, label, span, .btn.ghost, button.ghost').forEach(e => {
          if (!e.offsetParent || !(e.textContent || '').trim() || e.closest('.btn:not(.ghost)')) return;
          const c1 = lum(getComputedStyle(e).color), c2 = lum(ground(e));
          const r = (Math.max(c1, c2) + .05) / (Math.min(c1, c2) + .05);
          if (r < w.r) w = { r: Math.round(r * 100) / 100, why: (e.textContent || '').trim().slice(0, 30) };
        });
        return w;
      });
      ok(worst.r >= 4.5, 'D  Money In & Commissions reads ≥ 4.5:1 on an insurance job', JSON.stringify(worst));
    });

    /* B */
    await page.evaluate(async () => {
      const S = __SEED__;
      S.collections.push({ id: 'k6', project_id: 'I2', amount: 2000, source: 'insurance', type: 'final', method: 'check', collected_at: '2026-10-20', created_at: new Date().toISOString() });
      S.collections.push({ id: 'k7', project_id: 'I2', amount: 1000, source: 'homeowner', type: 'final', method: 'check', collected_at: '2026-10-20', created_at: new Date().toISOString() });
      S.estimates.push({ id: 'eC2', project_id: 'C2', estimate_number: 'EST-2026-0102', status: 'accepted', total: 6000, archived: false, line_items: [], created_by: 'joan@cardinalrenovations.net', created_at: new Date(Date.now() - 40 * 864e5).toISOString() });
      await reload();
    });
    await page.waitForTimeout(1500);
    await tryDo('B', async () => {
      await go(page, 'Cardinal Truth');
      const t = await txt(page, '#cardinalTruthView');
      const owed = (t.match(/OWED BY CARRIERS ¶ (\$[\d,]+)/i) || [])[1];
      const ded = (t.match(/DEDUCTIBLES DUE ¶ (\$[\d,]+)/i) || [])[1];
      const chase = t.slice(t.search(/CHASE LIST/i));
      /* I1: $1,000 less $500 paid · I2: paid in full → $500. I2: ACV $6,000 − $1,000 deductible = $5,000 first check;
         $8,000 paid clears the $3,000 depreciation, $1,000 supplement left. */
      ok(ded === '$500', 'B1 Deductibles due nets the homeowner’s payments', String(ded));
      ok(owed === '$1,000', 'B2 Owed by carriers does not count the deductible as the carrier’s', String(owed));
      ok(!/\$4,000/.test(chase), 'B3 the chase list shows what the carrier has left', chase.slice(0, 200));
    });

    /* F */
    await tryDo('F', async () => {
      await portal2(page, 'Community');
      await tapSel(page, '.cc-door[data-pane="partners"]', 'partners');
      await page.waitForTimeout(800);
      const p = await txt(page, '#communityHubView');
      const iH = p.search(/Habitat for Humanity/), iA = p.search(/Aardvark Housing Fund/);
      ok(iH >= 0 && iA >= 0 && iH < iA, 'F1 Habitat sorts first on Partners', p.slice(0, 220));
      const aBlk = p.slice(iA, iA + 260);
      ok(!/\$6,000/.test(aBlk.split(/Habitat|Brookside/)[0]) || /\$4,000/.test(aBlk), 'F2 a partner’s Owed nets its payments', aBlk);
    });
  } finally { await browser.close(); }
}

/* C — Owner Review with I2 Completed and its deductible paid by the homeowner */
{
  const { browser, page } = await boot('theo&v=ded');
  try {
    await page.waitForTimeout(20000);
    const rv = await page.evaluate(() => (window.__WRITES__ || []).filter(w => w.table === 'owner_reviews').map(w => JSON.stringify(w.payload)));
    ok(!rv.some(x => /I2/.test(x) && /Deductible not collected/.test(x)), 'C  a deductible paid through Record payment is not flagged uncollected', rv.join(' | ').slice(0, 200));
  } finally { await browser.close(); }
}

/* E — the greeting goes through invHello (a Community invoice is for the funding partner) */
{
  const i = SRC.indexOf('<script id="cr-ar-script">'), blk = SRC.slice(i, SRC.indexOf('</script>', i));
  const sms = /var body = invHello\(prT\) \+ ', here’s your invoice/.test(blk);
  const mail = /var body = invHello\(prE\) \+ ',\\n\\nHere is your invoice/.test(blk);
  ok(sms && mail && !/'Hi ' \+ firstName\(pr[TE]\)/.test(blk), 'E  Invoices & AR greets through invHello', JSON.stringify([sms, mail]));
}

console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
