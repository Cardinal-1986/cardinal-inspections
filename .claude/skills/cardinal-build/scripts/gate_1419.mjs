/* gate_1419 — a draft stays on its own job.
 *   A  a note half-typed on job A is NOT in the box when job B's thread opens
 *   B  going back to A brings A's draft back; B's own draft is kept too
 *   C  Send on A saves on A and clears the box
 *   D  a thread changed mid-save: the tag alert names the job the note was SENT on, and the
 *      newly opened job's draft is not wiped by the save that finished behind it
 * Arg: [index.html] -> negative control (1418 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const { browser, page } = await boot('theo', { instr: false });
try {
  const [A, B] = await page.evaluate(() => (window.cacheProjects || []).slice(0, 2).map(p => ({ id: p.id, name: p.name })));
  ok(!!A && !!B && A.id !== B.id, 'rig: two jobs to switch between', JSON.stringify([A, B]));
  await page.evaluate(() => {
    window.__NOTIFY__ = [];
    const f = window.fetch.bind(window);
    window.fetch = function (u, o) { try { if (/\/api\/notify/.test(String(u))) window.__NOTIFY__.push(JSON.parse((o && o.body) || '{}')); } catch (e) {} return f(u, o); };
  });
  const thread = async (p) => { await page.evaluate(id => openProject(id), p.id); await page.waitForTimeout(900); await page.evaluate(() => openCommunications()); await page.waitForTimeout(700); };
  const box = () => page.evaluate(() => document.getElementById('chatText').value);
  const saved = (id, re) => page.evaluate(async ({ id, re }) => { const r = await window.supa.from('projects').select('checklist').eq('id', id).single(); return new RegExp(re).test((r.data || {}).checklist || ''); }, { id, re });

  await thread(A);
  await page.fill('#chatText', 'DRAFT-A tear-off starts Monday');
  await thread(B);
  ok(await box() === '', 'A  job A\'s half-typed note is not in job B\'s box', JSON.stringify(await box()));
  await page.fill('#chatText', 'DRAFT-B gutters next');
  await thread(A);
  ok(await box() === 'DRAFT-A tear-off starts Monday', 'B  back on A, A\'s draft is restored', JSON.stringify(await box()));
  await thread(B);
  ok(await box() === 'DRAFT-B gutters next', 'B  B kept its own draft', JSON.stringify(await box()));

  await thread(A);
  await page.click('#chatSend'); await page.waitForTimeout(1500);
  ok(await saved(A.id, 'DRAFT-A tear-off') && !(await saved(B.id, 'DRAFT-A')), 'C  Send on A saves the note on A, not B');
  ok(await box() === '', 'C  and clears the box', JSON.stringify(await box()));
  await thread(B); await thread(A);
  ok(await box() === '', 'C  a sent draft does not come back', JSON.stringify(await box()));

  /* D: slow the save, switch threads while it is in flight */
  await page.evaluate(() => {
    const c = window.supa, from = c.from.bind(c);
    c.from = function (t) { const q = from(t); if (t === 'projects') { const up = q.update; q.update = function (v) { const r = up.call(this, v); const th = r.then; r.then = function (a, b) { return new Promise(res => setTimeout(res, 1800)).then(() => th.call(r, a, b)); }; return r; }; } return q; };
  });
  await page.fill('#chatText', 'MIDSAVE @curtis check the valley flashing');
  await page.click('#chatSend');
  await page.waitForTimeout(150);
  await thread(B);
  const bBefore = await box();
  await page.waitForTimeout(3500);
  ok(await box() === bBefore && bBefore === 'DRAFT-B gutters next', 'D  the save that finished behind job B did not wipe B\'s box', JSON.stringify([bBefore, await box()]));
  const n = await page.evaluate(() => window.__NOTIFY__.filter(x => /MIDSAVE/.test(JSON.stringify(x))));
  const js = JSON.stringify(n);
  ok(n.length === 1 && js.includes(A.name) && !js.includes(B.name) && js.includes('/' + A.id + '/comms'),
     'D  the tag alert names and links job A, the job it was sent on', js.slice(0, 220));
} catch (e) { ok(false, 'run crashed', e.message.split('\n')[0].slice(0, 160)); }
finally { await browser.close(); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
