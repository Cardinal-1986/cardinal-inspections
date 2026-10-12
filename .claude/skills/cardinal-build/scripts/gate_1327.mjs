/* gate_1327 — the assistant (Theo's 1A 2C 3B, plus Joan's). Two halves.
 * SERVER (api/assistant.js, imported with a stub SDK so the real tool loop runs on scripted replies):
 *   S1  only Theo's two logins and Joan's get in: a rep is 403, no token is 401
 *   S2  reads: Joan cannot read owner tables (3B), unknown tables/columns refused, filters encoded,
 *       the read goes out WITH THE CALLER'S OWN TOKEN (their permissions, not a service key)
 *   S3  proposals are cleaned: projects.checklist never written, audit history never written,
 *       Joan's owner-table proposals dropped, update/delete need an id
 *   S4  the loop: read → propose → reply; assistant content (thinking blocks too) goes back
 *       unchanged; the refusal fallback is on; the rules are cached; NOTHING is written server-side
 *   S5  a refusal comes back as a polite line, not an error
 * BROWSER (index.html):
 *   B1  the Ask button shows for Theo and Joan, 48px tall, never for a rep
 *   B2  a named job is a tappable link that opens the job
 *   B3  a proposal shows as a card (a delete in red); Cancel changes nothing
 *   B4  Approve applies with the person's session: stage via setStage, the insert, an Activity line each
 * Arg: [index.html] -> negative control (1326: browser half must go RED, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 220000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

/* ---------------- server ---------------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate1327-'));
const api = path.join(tmp, 'api');
fs.mkdirSync(path.join(api, 'node_modules', '@anthropic-ai', 'sdk'), { recursive: true });
fs.copyFileSync('/home/user/cardinal-inspections/api/assistant.js', path.join(api, 'assistant.js'));
fs.writeFileSync(path.join(api, 'package.json'), JSON.stringify({ type: 'module' }));
fs.writeFileSync(path.join(api, 'node_modules/@anthropic-ai/sdk/package.json'), JSON.stringify({ name: '@anthropic-ai/sdk', version: '0.0.0-stub', type: 'module', main: 'index.js' }));
/* the stub SDK: hands back globalThis.__SCRIPT__ replies in order, records every request */
fs.writeFileSync(path.join(api, 'node_modules/@anthropic-ai/sdk/index.js'), `
function stream(p){ (globalThis.__REQS__ = globalThis.__REQS__ || []).push(JSON.parse(JSON.stringify(p)));
  const r = (globalThis.__SCRIPT__ || []).shift(); return { finalMessage: async () => { if (!r) throw new Error('script ran out'); return r; } }; }
export default class Anthropic { constructor(){ this.messages = { stream }; this.beta = { messages: { stream } }; } }
`);
process.env.ANTHROPIC_API_KEY = 'dummy';
const SB = 'https://yipslubcptjoarblzbpl.supabase.co';
const seen = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url), h = opts.headers || {};
  seen.push({ url: u, auth: h.Authorization || h.authorization, method: opts.method || 'GET' });
  const tok = String(h.Authorization || '').replace('Bearer ', '');
  if (u.startsWith(SB + '/auth/v1/user')) {
    const map = { 'tok-theo': 'theo@cardinalrenovations.net', 'tok-joan': 'joan@cardinalrenovations.net', 'tok-nick': 'nick@cardinalrenovations.net' };
    return map[tok] ? { ok: true, status: 200, json: async () => ({ email: map[tok] }) } : { ok: false, status: 401, json: async () => ({}) };
  }
  if (u.startsWith(SB + '/rest/v1/')) return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'p-1', name: 'Dana Test', stage: 'Approved' }]) };
  return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
};
const mod = await import('file://' + path.join(api, 'assistant.js'));
const call = async (tok, body) => { let code = 0, out = null;
  const res = { status(c){ code = c; return this; }, json(b){ out = b; return this; } };
  await mod.default({ method: 'POST', headers: tok ? { authorization: 'Bearer ' + tok } : {}, body }, res); return { code, out }; };
try {
  const a = await call('tok-nick', { question: 'hi' }), b = await call('', { question: 'hi' });
  ok(a.code === 403 && b.code === 401, 'S1  a rep is refused (403) and no token is refused (401)', JSON.stringify({ rep: a.code, none: b.code }));
  const theo = { owner: true }, joan = { owner: false };
  let joanOwner = false; try { mod.selectUrl(joan, { table: 'owner_reviews' }); joanOwner = true; } catch (e) {}
  let badCol = false; try { mod.selectUrl(theo, { table: 'projects', filters: [{ column: 'secret', op: 'eq', value: 'x' }] }); badCol = true; } catch (e) {}
  let badTable = false; try { mod.selectUrl(theo, { table: 'push_subs' }); badTable = true; } catch (e) {}
  const u = mod.selectUrl(theo, { table: 'projects', filters: [{ column: 'name', op: 'ilike', value: '%dana%' }, { column: 'stage', op: 'in', value: 'Completed,Invoiced' }], order: 'updated_at.desc', limit: 5 });
  const tu = mod.selectUrl(theo, { table: 'owner_reviews' });
  ok(!joanOwner && !badCol && !badTable && /name=ilike\.%25dana%25/.test(u) && /stage=in\.%28%22Completed%22%2C%22Invoiced%22%29|stage=in\.\("Completed","Invoiced"\)/.test(decodeURIComponent(u).replace(/x/g,'x')) && !/checklist/.test(decodeURIComponent(u.split('&')[0])) && /owner_reviews/.test(tu),
     'S2  reads: Joan cannot read owner tables; unknown table/column refused; filters encoded; checklist not read by default', JSON.stringify({ joanOwner, badCol, badTable, u: u.slice(0, 220) }));
  const p1 = mod.cleanProposals(theo, { summary: 's', changes: [
    { table: 'projects', action: 'update', id: 'p-1', values: { stage: 'Completed', checklist: '{}' }, label: 'Move' },
    { table: 'projects', action: 'update', id: 'p-1', values: { checklist: '{}' }, label: 'Wipe sheet' },
    { table: 'audit_events', action: 'delete', id: 'a1', label: 'Erase history' },
    { table: 'collections', action: 'insert', values: { project_id: 'p-1', amount: 2000, type: 'deposit' }, label: 'Deposit' },
    { table: 'collections', action: 'delete', label: 'No id' } ] });
  const p2 = mod.cleanProposals(joan, { summary: 's', changes: [{ table: 'owner_reviews', action: 'update', id: 'r1', values: { status: 'dismissed' }, label: 'Dismiss' }] });
  ok(p1.changes.length === 2 && !('checklist' in p1.changes[0].values) && p1.changes[0].values.stage === 'Completed' && p1.changes[1].table === 'collections' && p1.changes[1].id === null
     && p1.dropped.length === 3 && p2.changes.length === 0,
     'S3  proposals cleaned: checklist never written, audit history never written, update/delete need an id, Joan cannot touch owner tables', JSON.stringify({ kept: p1.changes, dropped: p1.dropped, joan: p2 }));
  globalThis.__REQS__ = []; seen.length = 0;
  globalThis.__SCRIPT__ = [
    { stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: 'thinking', thinking: '', signature: 'SIG1' }, { type: 'tool_use', id: 't1', name: 'db_select', input: { table: 'projects', filters: [{ column: 'name', op: 'ilike', value: '%dana%' }] } }] },
    { stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: 'tool_use', id: 't2', name: 'propose_changes', input: { summary: 'Move Dana to Completed', changes: [{ table: 'projects', action: 'update', id: 'p-1', values: { stage: 'Completed' }, label: 'Move Dana Test to Completed' }] } }] },
    { stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: 'text', text: 'I proposed moving [Dana Test](job:p-1) to Completed. Tap Approve.' }] } ];
  const r4 = await call('tok-theo', { question: 'Move Dana to completed', history: [{ role: 'user', text: 'hi' }, { role: 'ai', text: 'hello' }] });
  const R = globalThis.__REQS__, last = R[R.length - 1] || {};
  const reads = seen.filter(x => x.url.includes('/rest/v1/'));
  const back = (last.messages || []).find(m => m.role === 'assistant' && Array.isArray(m.content) && m.content.some(b => b.type === 'thinking' && b.signature === 'SIG1'));
  const toolRes = (last.messages || []).flatMap(m => Array.isArray(m.content) ? m.content : []).find(b => b.type === 'tool_result' && b.tool_use_id === 't1');
  ok(r4.code === 200 && /Approve/.test(r4.out.reply) && r4.out.proposals && r4.out.proposals.changes.length === 1 && reads.length === 1 && reads[0].auth === 'Bearer tok-theo'
     && reads.every(x => x.method === 'GET') && !!back && !!toolRes && /Dana Test/.test(toolRes.content)
     && R.length === 3 && R[0].fallbacks === 'default' && (R[0].betas || []).includes('server-side-fallback-2026-07-01') && R[0].system[0].cache_control && R[0].model === 'claude-opus-5-5',
     'S4  the loop: reads with Theo\'s own token, proposes, replies; thinking goes back unchanged; fallback on; rules cached; nothing written server-side',
     JSON.stringify({ code: r4.code, reply: r4.out && r4.out.reply, reqs: R.length, reads: reads.map(x => x.auth), back: !!back, fb: R[0] && R[0].fallbacks }));
  globalThis.__SCRIPT__ = [{ stop_reason: 'refusal', usage: {}, content: [] }];
  const r5 = await call('tok-joan', { question: 'x' });
  ok(r5.code === 200 && /can.t help/i.test(r5.out.reply), 'S5  a refusal comes back as a polite line', JSON.stringify(r5));
} catch (e) { ok(false, 'server half crashed', String(e && e.stack || e).slice(0, 300)); }

/* ---------------- browser ---------------- */
const PID = '11111111-2222-3333-4444-555555555555';
const REP = 'nick@cardinalrenovations.net';
const ASKED = [], ANSWERS = [];
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }, { email: 'joan@cardinalrenovations.net', name: 'Joan Hunt', role: 'admin', title: 'Office' }, { email: REP, name: 'Rep', role: 'sales', title: 'Sales' }],
  projects: [{ id: PID, name: 'Dana Test', stage: 'Approved', address: '1 Main St', phone: '', email: '', sales_rep: REP, checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }],
  inspection_reports: [], collections: [], estimates: [], audit_events: [], appointments: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [], owner_reviews: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function boot(as, light){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.type() === 'prompt' ? d.accept('Price check') : d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/assistant')) { const b = JSON.parse(route.request().postData() || '{}'); ASKED.push(b); const r = ANSWERS.shift() || { reply: 'ok', proposals: null }; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) }); }
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(([seed, as, light]) => {
    window.__SEED__ = JSON.parse(JSON.stringify(seed)); if (as) window.__AS__ = { email: as, name: as.split('@')[0] };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
  await page.waitForTimeout(900);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.waitForTimeout(500); await settle(page);
  return { ctx, page };
}


const fab = page => page.evaluate(() => { const f = document.getElementById('cr-ai-fab'); if (!f) return null; const cs = getComputedStyle(f); return { shown: cs.display !== 'none', h: Math.round(f.getBoundingClientRect().height) }; });
try {
  let { ctx, page } = await boot(null, false);
  await page.waitForTimeout(3500);
  const T = await fab(page);
  await ctx.close();
  ({ ctx, page } = await boot('joan@cardinalrenovations.net', false)); await page.waitForTimeout(3500);
  const J = await fab(page); await ctx.close();
  ({ ctx, page } = await boot(REP, false)); await page.waitForTimeout(3500);
  const N = await fab(page); await ctx.close();
  ok(!!T && T.shown && T.h >= 44 && !!J && J.shown && (!N || !N.shown), 'B1  the Ask button shows for Theo and Joan (44px+), never for a rep', JSON.stringify({ theo: T, joan: J, rep: N }));

  ({ ctx, page } = await boot(null, false)); await page.waitForTimeout(3500);
  ANSWERS.push({ reply: 'Your newest job is [Dana Test](job:' + PID + ').', proposals: null });
  ANSWERS.push({ reply: 'Proposed two changes. Tap Approve.', proposals: { summary: 'Close out Dana', changes: [
      { table: 'projects', action: 'update', id: PID, values: { stage: 'Completed' }, label: 'Move Dana Test to Completed' },
      { table: 'appointments', action: 'delete', id: 'ap1', label: 'Remove the old appointment' } ] } });
  ANSWERS.push({ reply: 'Again: tap Approve.', proposals: { summary: 'Close out Dana', changes: [
      { table: 'projects', action: 'update', id: PID, values: { stage: 'Completed' }, label: 'Move Dana Test to Completed' },
      { table: 'collections', action: 'insert', id: null, values: { project_id: PID, amount: 2000, type: 'deposit', collected_at: '2026-10-12' }, label: 'Record a $2,000 deposit' } ] } });
  const ask = q => page.evaluate(async q => { const t = document.getElementById('aiText'), b = document.getElementById('aiSend'); if (!t || !b) return ''; t.value = q; b.click(); await new Promise(r => setTimeout(r, 900)); const l = document.getElementById('aiLog'); return l ? l.innerText : ''; }, q);
  await page.evaluate(() => { const f = document.getElementById('cr-ai-fab'); if (f) f.click(); });
  await page.waitForTimeout(300);
  await ask('newest job?');
  const B2 = await page.evaluate(async pid => { const b = document.querySelector('#aiLog [data-ai-job]'); const had = !!b; if (b) b.click(); await new Promise(r => setTimeout(r, 1200));
    const sh = document.getElementById('cr-ai-sheet'); return { had, opened: !!(window.currentProject && currentProject.id === pid), closed: !!sh && !sh.classList.contains('open') }; }, PID);
  ok(B2.had && B2.opened && B2.closed && ASKED[0] && ASKED[0].question === 'newest job?', 'B2  a named job is a link; tapping it closes the sheet and opens the job', JSON.stringify(B2));
  await page.evaluate(() => window.CardinalAssistant && window.CardinalAssistant.open()); await page.waitForTimeout(300);
  await ask('close out dana');
  const B3 = await page.evaluate(async () => { const n0 = (window.__WRITES__ || []).length; const card = document.getElementById('aiCard');
    const red = !!document.querySelector('#aiCard li.del'); const items = card ? card.querySelectorAll('li').length : 0;
    const c = document.querySelector('[data-ai-cancel]'); if (c) c.click(); await new Promise(r => setTimeout(r, 400));
    return { card: !!card, items, red, gone: !document.getElementById('aiCard'), wrote: (window.__WRITES__ || []).length - n0, said: /nothing was changed/i.test((document.getElementById('aiLog') || {}).innerText || '') }; });
  ok(B3.card && B3.items === 2 && B3.red && B3.gone && B3.wrote === 0 && B3.said, 'B3  a proposal shows as a card (delete in red); Cancel changes nothing', JSON.stringify(B3));
  await ask('close out dana again');
  const B4 = await page.evaluate(async pid => { const n0 = (window.__WRITES__ || []).length; const a = document.querySelector('[data-ai-approve]'); if (a) a.click();
    await new Promise(r => setTimeout(r, 2200)); const w = (window.__WRITES__ || []).slice(n0);
    return { stage: w.some(x => x.table === 'projects' && x.op === 'update' && x.payload && x.payload.stage === 'Completed'),
             ins: w.some(x => x.table === 'collections' && x.op === 'insert' && x.payload && Number(x.payload.amount) === 2000),
             audit: w.filter(x => x.table === 'audit_events' && x.op === 'insert' && x.payload && /Via the assistant/.test(x.payload.detail || '')).length,
             done: /Done:/.test((document.getElementById('aiLog') || {}).innerText || ''), card: !!document.getElementById('aiCard') }; }, PID);
  ok(B4.stage && B4.ins && B4.audit === 2 && B4.done && !B4.card, 'B4  Approve applies with the person\'s session: stage via setStage, the insert, one Activity line each', JSON.stringify(B4));
  ok(ASKED[1] && Array.isArray(ASKED[1].history) && ASKED[1].history.some(m => m.role === 'ai' && /Dana Test/.test(m.text)), 'B5  the conversation travels with each question', JSON.stringify((ASKED[1] || {}).history || null).slice(0, 200));
  await ctx.close();
} catch (e) { ok(false, 'browser half crashed', String(e && e.stack || e).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1327: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
