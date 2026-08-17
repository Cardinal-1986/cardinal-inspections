/* Build 864 gate — loads the SHIPPED sw.js in a mock ServiceWorker env and drives
 * synthetic fetch/message events to prove offline-read caching behaves:
 *  - Supabase REST GET online: returns live response AND caches it
 *  - same GET offline (network throws): returns the cached response
 *  - GET offline with no cache: returns a 503 (app treats as read failure)
 *  - Supabase AUTH GET: never cached (passes through, no respondWith)
 *  - non-GET: skipped
 *  - message {cr-clear-data-cache}: deletes the data cache
 */
import { readFileSync } from 'fs';
const SW = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/sw.js', 'utf8');

// ---- mock CacheStorage ----
function makeCache(){ const m = new Map(); return {
  put: async (req, res) => { m.set(typeof req==='string'?req:req.url, res); },
  match: async (req) => m.get(typeof req==='string'?req:req.url) || undefined,
  addAll: async () => {}, _m: m }; }
const buckets = new Map();
globalThis.caches = {
  open: async (name) => { if(!buckets.has(name)) buckets.set(name, makeCache()); return buckets.get(name); },
  match: async (req) => { for (const c of buckets.values()){ const h = await c.match(req); if(h) return h; } return undefined; },
  delete: async (name) => buckets.delete(name),
  keys: async () => [...buckets.keys()],
};
// ---- mock self / clients / location ----
const handlers = {};
globalThis.self = {
  addEventListener: (t, fn) => { (handlers[t] = handlers[t] || []).push(fn); },
  skipWaiting: () => {}, clients: { claim: async()=>{}, matchAll: async()=>[] },
  registration: { showNotification: ()=>{} },
  location: { origin: 'https://app.cardinalroster.com' },
};
globalThis.clients = self.clients;
// ---- controllable fetch ----
let NET = null; // set per scenario
globalThis.fetch = (req) => NET(req);
// mkResponse
function mkRes(body, { ok=true, status=200, headers={} } = {}){
  const H = new Map(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v]));
  return { ok, status, headers: { get:(k)=>H.get(k.toLowerCase())||null }, clone(){ return mkRes(body,{ok,status,headers}); }, _body: body };
}
globalThis.Response = function(body, init){ return mkRes(body, { ok:(init&&init.status?init.status<400:true), status:(init&&init.status)||200, headers:(init&&init.headers)||{} }); };

// load the shipped SW (registers handlers via self.addEventListener)
eval(SW);
const onFetch = (handlers.fetch||[])[0] || (()=>{});
const onMessage = (handlers.message||[])[0] || (()=>{});

function fire(request){
  let answered; const waits = [];
  const ev = { request, respondWith:(p)=>{ answered = p; }, waitUntil:(p)=>waits.push(p) };
  onFetch(ev);
  return { answered, waits };
}
const REST = 'https://yipslubcptjoarblzbpl.supabase.co/rest/v1/punch_items?select=*';
const AUTH = 'https://yipslubcptjoarblzbpl.supabase.co/auth/v1/user';

let pass=0, fail=0; const ok=(l,c,x)=>{ c?(pass++,console.log('  PASS '+l)):(fail++,console.log('  FAIL '+l+(x!==undefined?' -> '+JSON.stringify(x):''))); };

// 1) online REST GET: live + cached
NET = async () => mkRes('[{"id":"pi1"}]', { ok:true, status:200 });
let r = fire({ method:'GET', url:REST, mode:'cors' });
let out = await r.answered;
ok('online REST GET returns the live response', out && out._body === '[{"id":"pi1"}]');
await new Promise(r=>setTimeout(r,20)); // let fire-and-forget put settle
const dataCache = await caches.open('cardinal-data-v1');
ok('online REST GET was cached in the data bucket', !!(await dataCache.match({url:REST})));

// 2) offline REST GET with cache hit -> cached response
NET = async () => { throw new TypeError('Load failed'); };
r = fire({ method:'GET', url:REST, mode:'cors' });
out = await r.answered;
ok('offline REST GET returns the cached read', out && out._body === '[{"id":"pi1"}]');

// 3) offline REST GET, no cache -> 503
r = fire({ method:'GET', url:REST+'&never=seen', mode:'cors' });
out = await r.answered;
ok('offline REST GET with no cache returns 503', out && out.status === 503, out && out.status);

// 4) AUTH GET is never cached (handler returns without respondWith)
NET = async () => mkRes('{"user":1}', { ok:true });
r = fire({ method:'GET', url:AUTH, mode:'cors' });
ok('AUTH GET is not intercepted (stays live)', r.answered === undefined);
await new Promise(r=>setTimeout(r,10));
ok('AUTH GET was NOT cached', !(await dataCache.match({url:AUTH})));

// 5) non-GET skipped
r = fire({ method:'PATCH', url:REST, mode:'cors' });
ok('non-GET is skipped (no respondWith)', r.answered === undefined);

// 6) clear-data-cache message wipes the bucket
ok('data bucket exists before clear', buckets.has('cardinal-data-v1'));
let mwaits=[]; onMessage({ data:{ type:'cr-clear-data-cache' }, waitUntil:(p)=>mwaits.push(p) });
await Promise.all(mwaits);
ok('logout message clears the data cache', !buckets.has('cardinal-data-v1'));

console.log('\n'+(fail===0?'GREEN':'RED')+' — '+pass+' passed, '+fail+' failed');
process.exit(fail===0?0:1);
