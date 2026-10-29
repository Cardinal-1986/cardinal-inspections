/* gate_1413 — posting a message never erases a teammate's.
 *   A  job thread: another device posts + sets a field after this one opened the job; posting keeps BOTH
 *      messages and the other device's field, and the thread shows the teammate's note
 *   B  a job save (saveCkPatch) keeps another device's field
 *   C  CardinalPunch.update with a stale comments list keeps the server's messages
 *   D  crMergeComments: union, de-duplicated, oldest first; same message kept once
 * Arg: [index.html] -> negative control (1412 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const SEED = `window.__SEED__.punch_items = [{ id:'PI1', project_id:'R1', title:'Gutter reseal', status:'open', comments:[], created_at:new Date().toISOString() }];`;
const { browser, page } = await boot('joan', { instr: false, seed: SEED });
page.setDefaultTimeout(6000);
const other = async (mut) => page.evaluate(async (m) => {
  const r = await window.supa.from('projects').select('checklist').eq('id', 'R1').single();
  const ck = JSON.parse(JSON.stringify(JSON.parse(r.data.checklist || '{}')));
  if (m === 'post') ck.comments = (ck.comments || []).concat([{ by: 'curtis@cardinalrenovations.net', name: 'Curtis', at: new Date().toISOString(), text: 'CURTIS-FIELD: rotted decking' }]);
  ck.FIELD_MARK = 'other-device-' + m;
  await window.supa.from('projects').update({ checklist: JSON.stringify(ck) }).eq('id', 'R1');
}, mut);
const server = () => page.evaluate(async () => { const r = await window.supa.from('projects').select('checklist').eq('id', 'R1').single(); const ck = JSON.parse(r.data.checklist); return { thread: (ck.comments || []).map(c => c.text), mark: ck.FIELD_MARK || '(gone)' }; });
try {
  await page.evaluate(() => openProject('R1')); await page.waitForTimeout(1500);
  /* a real client holds its OWN copy of the row (the mock shares one object) */
  const detach = () => page.evaluate(() => { const c = JSON.parse(JSON.stringify(window.currentProject)); window.currentProject = c; currentProject = c; const i = cacheProjects.findIndex(p => p.id === c.id); cacheProjects[i] = c; });
  await detach();
  await page.evaluate(() => openCommunications()); await page.waitForTimeout(400);
  await other('post');
  await page.fill('#chatText', 'JOAN: add it to the change order'); await page.click('#chatSend'); await page.waitForTimeout(900);
  const a = await server();
  ok(a.thread.some(t => /CURTIS-FIELD/.test(t)) && a.thread.some(t => /JOAN:/.test(t)), 'A  both messages survive the post', JSON.stringify(a.thread));
  ok(a.mark === 'other-device-post', 'A  the other device\'s field survives the post', a.mark);
  const shown = await page.evaluate(() => document.getElementById('chatThread').innerText);
  ok(/CURTIS-FIELD/.test(shown), 'A  the thread now shows the teammate\'s note');
  await detach();
  await other('save');
  await page.evaluate(() => saveCkPatch({ gutter_lf: 123 })); await page.waitForTimeout(500);
  const b = await server();
  ok(b.mark === 'other-device-save', 'B  saveCkPatch keeps another device\'s field', b.mark);
  /* C — the punch write path */
  await page.evaluate(async () => { if (window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload(); });
  await page.waitForTimeout(600);
  await page.evaluate(async () => { await window.supa.from('punch_items').update({ comments: [{ by: 'curtis@x', name: 'Curtis', at: '2026-10-29T10:00:00Z', text: 'CREW-NOTE' }] }).eq('id', 'PI1'); });
  const c = await page.evaluate(async () => {
    const r = await window.CardinalPunch.update('PI1', { comments: [{ by: 'joan@x', name: 'Joan', at: '2026-10-29T10:01:00Z', text: 'OFFICE-NOTE' }] });
    const s = await window.supa.from('punch_items').select('comments').eq('id', 'PI1').single();
    return { ok: r && r.ok, texts: (s.data.comments || []).map(x => x.text) };
  });
  ok(c.texts.includes('CREW-NOTE') && c.texts.includes('OFFICE-NOTE'), 'C  a punch-out keeps both the crew note and the office note', JSON.stringify(c));
  const d = await page.evaluate(() => {
    if (typeof window.crMergeComments !== 'function') return null;
    const x = { at: '2026-01-01T00:00:01Z', by: 'a', text: 'one' }, y = { at: '2026-01-01T00:00:02Z', by: 'b', text: 'two' }, z = { at: '2026-01-01T00:00:00Z', by: 'c', text: 'zero' };
    return window.crMergeComments([x, z], [x, y]).map(c => c.text).join(',');
  });
  ok(d === 'zero,one,two', 'D  union, once each, oldest first', String(d));
} catch (e) { ok(false, 'crashed', e.message.split('\n')[0].slice(0, 160)); }
finally { await browser.close(); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
