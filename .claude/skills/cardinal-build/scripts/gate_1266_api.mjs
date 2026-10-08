/* gate_1266_api.mjs — the SHIPPED api/inspect-assist.js, driven with stubs.
   npm is unreachable from the build container, so the SDK import is replaced by a
   recording fake (gate_1199's approach) and global fetch answers the session check.
     1  no token → 401; a non-staff session → 403; never reaches the model
     2  only this project's storage URLs reach the model; anything else is dropped
     3  model claude-opus-5-5, structured output, the fallback beta; chat at effort
        low, write at medium
     4  a 400 on the fallback beta is retried once without it
     5  write: photo ids the model invents, or repeats, are dropped; life_estimate is
        "" unless life_by is "ai"
     6  a refusal and a cut-off answer are 502s that say so
   usage: node gate_1266_api.mjs [path/to/inspect-assist.js]
*/
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { tmpdir } from 'os';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../api/inspect-assist.js');
let fails = [], passes = 0;
function need(name, ok, detail){ if(ok){ passes++; console.log('  PASS  ' + name); } else { fails.push(name); console.log('  FAIL  ' + name + (detail !== undefined ? '  → ' + detail : '')); } }

let srcText = '';
try { srcText = readFileSync(FILE, 'utf8'); } catch (e) { console.log('  FAIL  the route exists → ' + e.message); console.log('GATE 1266 API RED — 0 passed, 1 failed'); process.exit(1); }
const stubbed = srcText
  .replace("import Anthropic from '@anthropic-ai/sdk';", 'const Anthropic = globalThis.__FakeAnthropic;')
  .replace("import { isStaff } from './_staff.js';", "const isStaff = (e) => /@cardinalrenovations\\.net$/.test(String(e||''));");
const dir = mkdtempSync(join(tmpdir(), 'g1266-'));
const modPath = join(dir, 'route.mjs');
writeFileSync(modPath, stubbed);

const SB = 'https://yipslubcptjoarblzbpl.supabase.co';
let sessionEmail = 'nick@cardinalrenovations.net';
globalThis.fetch = async (u) => ({ ok: !!sessionEmail, json: async () => ({ email: sessionEmail }) });
const seen = []; let script = [];
class FakeErr extends Error { constructor(status, m){ super(m); this.status = status; } }
function streamer(kind){ return (params) => { seen.push({ kind, params }); const step = script.shift() || {};
  return { finalMessage: async () => { if (step.throw) throw new FakeErr(step.throw, 'stub ' + step.throw);
    return { stop_reason: step.stop || 'end_turn', content: [{ type: 'text', text: JSON.stringify(step.out || {}) }] }; } }; }; }
globalThis.__FakeAnthropic = class { constructor(){ this.messages = { stream: streamer('plain') }; this.beta = { messages: { stream: streamer('beta') } }; } };
process.env.ANTHROPIC_API_KEY = 'test-key-not-real';

let mod;
try { mod = await import(pathToFileURL(modPath).href); } catch (e) { console.log('  FAIL  module loads → ' + e.message); console.log('GATE 1266 API RED'); process.exit(1); }
const handler = mod.default;
function call(body, auth = 'Bearer t'){ return new Promise(async res => {
  const r = { _s: 200, status(s){ this._s = s; return this; }, json(j){ res({ status: this._s, body: j }); } };
  await handler({ method: 'POST', headers: auth ? { authorization: auth } : {}, body }, r); }); }
const good = (id) => ({ id, url: SB + '/storage/v1/object/sign/photos/projects/p1/' + id + '.jpg?token=x' });

/* 1 */
seen.length = 0;
const r401 = await call({ mode: 'chat' }, '');
sessionEmail = 'stranger@gmail.com'; const r403 = await call({ mode: 'chat' }); sessionEmail = 'nick@cardinalrenovations.net';
need('1  no token → 401, a non-staff session → 403, and the model is never called', r401.status === 401 && r403.status === 403 && seen.length === 0, JSON.stringify([r401.status, r403.status, seen.length]));

/* 2 + 3 */
seen.length = 0; script = [{ out: { reply: 'How long has it leaked?', ready: false } }];
const rc = await call({ mode: 'chat', photos: [good('a'), { id: 'evil', url: 'https://example.com/x.jpg' }, { id: 'b', url: SB + '/storage/v1/object/public/photos/p/b.jpg' }], facts: { Pitch: '6/12' }, history: [{ role: 'me', text: 'leaks in the bedroom' }] });
const p0 = (seen[0] || {}).params || {};
const imgs = (((p0.messages || [])[0] || {}).content || []).filter(b => b.type === 'image').map(b => b.source.url);
need('2  only this project’s storage URLs reach the model', imgs.length === 2 && imgs.every(u => u.startsWith(SB + '/storage/v1/object/')), JSON.stringify(imgs));
need('3  claude-opus-5-5, the fallback beta, structured output, chat at effort low', seen[0] && seen[0].kind === 'beta' && p0.model === 'claude-opus-5-5' && JSON.stringify(p0.betas) === '["server-side-fallback-2026-07-01"]' && p0.fallbacks === 'default' && p0.output_config && p0.output_config.effort === 'low' && p0.output_config.format.type === 'json_schema', JSON.stringify({ k: seen[0] && seen[0].kind, m: p0.model, e: p0.output_config }));
need('3  …the reply comes back', rc.status === 200 && rc.body.reply === 'How long has it leaked?' && rc.body.ready === false, JSON.stringify(rc));
const txt = (((p0.messages || [])[0] || {}).content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
need('3  …the facts and the rep’s words are in the turn', txt.includes('"Pitch":"6/12"') && txt.includes('Rep: leaks in the bedroom'), txt.slice(-200));

/* 4 */
seen.length = 0; script = [{ throw: 400 }, { out: { reply: 'ok', ready: true } }];
const r4 = await call({ mode: 'chat' });
need('4  a 400 on the fallback beta is retried once, without it', r4.status === 200 && seen.length === 2 && seen[0].kind === 'beta' && seen[1].kind === 'plain', JSON.stringify(seen.map(s => s.kind)));

/* 5 */
seen.length = 0;
script = [{ out: { summary: 'S', sections: [{ num: 5, narrative: 'N' }], photos: [{ id: 'a', section: 5, caption: 'c', severity: 'high' }, { id: 'zzz', section: 5, caption: 'invented', severity: 'high' }, { id: 'a', section: 6, caption: 'again', severity: 'mon' }], recommendations: ['R1'], life_estimate: 'About 2 years' } }];
const r5 = await call({ mode: 'write', photos: [good('a')], sections: [{ num: 5, name: 'Roof Surface' }], life_by: 'rule' });
need('5  write at effort medium', ((seen[0] || {}).params || {}).output_config && seen[0].params.output_config.effort === 'medium', JSON.stringify(((seen[0] || {}).params || {}).output_config));
need('5  invented and repeated photo ids are dropped', r5.status === 200 && JSON.stringify(r5.body.photos) === '[{"id":"a","section":5,"caption":"c","severity":"high"}]', JSON.stringify(r5.body.photos));
need('5  life_estimate is "" unless life_by is "ai"', r5.body.life_estimate === '', JSON.stringify(r5.body.life_estimate));

/* 6 */
script = [{ stop: 'refusal' }]; const r6a = await call({ mode: 'chat' });
script = [{ stop: 'max_tokens' }]; const r6b = await call({ mode: 'write' });
need('6  a refusal and a cut-off answer are 502s that say so', r6a.status === 502 && /declined/.test(r6a.body.error) && r6b.status === 502 && /cut off/.test(r6b.body.error), JSON.stringify([r6a, r6b]));

console.log((fails.length ? 'GATE 1266 API RED' : 'GATE 1266 API GREEN') + ' — ' + passes + ' passed, ' + fails.length + ' failed');
process.exit(fails.length ? 1 : 0);
