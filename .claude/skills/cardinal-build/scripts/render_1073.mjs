/* render_1073 — the bake-off, rendered from the real page.
 *
 * Stubs supabase + /api/bakeoff so the screens can be driven without a session
 * or a single AI call. The MARKUP AND CSS ARE THE REAL ONES — only the data is
 * fake, which is the line the project's other render rigs hold.
 *
 *   node render_1073.mjs [bakeoff.html] [out-prefix]
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const HTML = readFileSync(process.argv[2] || 'bakeoff.html', 'utf8');
const OUT  = process.argv[3] || '/tmp/claude-0/-home-user-cardinal-inspections/19de3f5f-c337-5d4a-bfbe-8000821667e1/scratchpad/bake';

const A1 = `Cracked pipe boot on the rear slope, centre-left of frame — the rubber collar has
split all the way round the vent. High confidence.

Granule loss across the field shingles in the lower third, exposing the mat in
several places. Medium confidence.

Two lifted shingle tabs at the ridge line, upper right. Medium confidence.`;
const A2 = `1. Deteriorated pipe flashing (centre of image) — high
2. Shingle granule loss, general field — medium
3. Possible nail pops along the course above the vent — low`;
const A3 = `The photograph shows a residential asphalt shingle roof. There appears to be
some wear. Recommend a full inspection by a qualified professional to determine
the extent of any damage.`;

const STUB = `
window.supabase = { createClient: () => ({
  auth: {
    getSession: async () => ({ data: { session: { access_token:'t', user:{ email:'theo@cardinalrenovations.net' } } } }),
    signInWithPassword: async () => ({}), signOut: async () => ({})
  },
  from: () => ({ select: () => ({ not: () => ({ order: () => ({ limit: async () => ({
    data: Array.from({length:37}, (_,i) => ({ id:'p'+i, storage_path:'jobs/1076/IMG_'+(4100+i)+'.jpg',
      project_id:'j1', created_at:'2026-08-2'+(i%9) })) }) }) }) }) }),
  storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: SHOT } }) }) }
}) };
window.fetch = async (u, o) => {
  const b = JSON.parse(o.body);
  if (b.mode === 'probe') return { ok:true, json: async () => ({ candidates: [
    { id:'gemini-3.6-flash', vendor:'google',    available:true,  why:'' },
    { id:'gemini-3.5-flash', vendor:'google',    available:true,  why:'' },
    { id:'gpt-4o-mini',      vendor:'openai',    available:true,  why:'' },
    { id:'claude-opus-5',    vendor:'anthropic', available:false, why:'ANTHROPIC_API_KEY not set' }
  ] }) };
  return { ok:true, json: async () => ({ answers: [
    { model:'gemini-3.6-flash', vendor:'google', ok:true, text:${JSON.stringify(A1)}, ms:4120 },
    { model:'gemini-3.5-flash', vendor:'google', ok:true, text:${JSON.stringify(A2)}, ms:2880 },
    { model:'gpt-4o-mini', vendor:'openai', ok:true, text:${JSON.stringify(A3)}, ms:1640 }
  ], image_bytes: 402113, ms: 4310, near_budget:false }) };
};`;

/* a plausible roof photograph, drawn — no client's real roof in a screenshot */
const SHOT = 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
<rect width="900" height="600" fill="#6b7a86"/><rect y="330" width="900" height="270" fill="#4a4f55"/>
<polygon points="60,340 450,120 840,340" fill="#3b3f45"/>
<g stroke="#33373d" stroke-width="2">${Array.from({length:14},(_,i)=>`<line x1="60" y1="${340-i*15}" x2="840" y2="${340-i*15}"/>`).join('')}</g>
<ellipse cx="520" cy="255" rx="26" ry="17" fill="#23262a"/><ellipse cx="520" cy="248" rx="16" ry="10" fill="#15171a"/>
<path d="M498 252 q22 -14 44 2" stroke="#8a5a3a" stroke-width="4" fill="none"/>
<rect x="300" y="285" width="120" height="42" fill="#4b5157" opacity=".55"/>
<text x="450" y="580" font-family="Arial" font-size="15" fill="#c8ccd2" text-anchor="middle">illustrative frame — not a client photograph</text></svg>`).toString('base64');

const br = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(()=>chromium.launch());
async function shot(name, width, steps) {
  const ctx = await br.newContext({ viewport:{ width, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://bk.test/')
    ? r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status:200, body:'' }));
  await p.addInitScript('const SHOT=' + JSON.stringify(SHOT) + ';' + STUB);
  await p.goto('https://bk.test/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(900);
  for (const s of steps) {
    if (s.startsWith('CLICK:')) await p.click(s.slice(6)); else await p.evaluate(s);
    await p.waitForTimeout(450);
  }
  const cdp = await ctx.newCDPSession(p);
  const { data } = await cdp.send('Page.captureScreenshot', { format:'png' });
  writeFileSync(`${OUT}_${name}.png`, Buffer.from(data,'base64'));
  console.log('  wrote', `${OUT}_${name}.png`);
  await ctx.close();
}

await shot('setup', 390, []);
await shot('run',   390, ['CLICK:#startBtn']);
await shot('run_desktop', 1194, ['CLICK:#startBtn']);
await shot('done',  390, [`(()=>{ S.run={ started:'2026-08-26T02:40:00Z', build:BK_BUILD,
  models:['gemini-3.6-flash','gemini-3.5-flash','gpt-4o-mini'],
  at:10, shots:[['gemini-3.6-flash',4100],['gemini-3.6-flash',3980],['gpt-4o-mini',1500],
   ['gemini-3.6-flash',4300],['gemini-3.5-flash',2700],['gemini-3.6-flash',4050],
   ['gpt-4o-mini',1620],['gemini-3.6-flash',4210],['gemini-3.5-flash',2910],
   ['gemini-3.6-flash',4180]].map(function(v,i){ return { id:'p'+i, path:'jobs/1076/IMG_'+(4100+i)+'.jpg',
     vote:v[0], order:null, times:[{m:'gemini-3.6-flash',ms:4150,ok:true},
       {m:'gemini-3.5-flash',ms:2850,ok:true},{m:'gpt-4o-mini',ms:1580,ok:true}] }; }) };
  finish(); })()`]);
await br.close();
