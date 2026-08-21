/* gate_960.mjs — the cron routes fail CLOSED (21 Aug 2026).

   api/digest.js and api/commissions-digest.js guarded with
       if (secret && req.headers.authorization !== `Bearer ${secret}`)
   which is no guard at all when CRON_SECRET is unset — and it was unset on the
   live site, so both were answering anybody who knew the URL. Both now refuse
   when the secret is missing, matching api/companycam-sync.js.

   Driven in-process with a fake req/res and `fetch` replaced by a counting
   stub, so THE PROOF IS THAT NOTHING LEFT THE BOX: a route that gets past the
   guard reaches Supabase, so `fetch calls === 0` is what "it refused" means
   here. Nothing is sent, nothing is contacted, no network is touched.

     per route (digest, commissions-digest):
       a  no secret configured        -> 401, detail names CRON_SECRET, 0 fetches
       b  secret set, no header       -> 401 'Bad cron secret',        0 fetches
       c  secret set, wrong header    -> 401 'Bad cron secret',        0 fetches
       d  secret set, right header    -> gets PAST the guard (not 401)
       f  production-shaped env, no secret -> STILL refused, still 0 fetches
          (the case that measures the defect: the old code went to work here)
     plus:
       e  companycam-sync still refuses with no secret (the model, unchanged)

   Usage: node gate_960.mjs [dirWithApiRoutes]
   Point it at a directory holding the PREVIOUS api/*.js as the negative
   control: every 'a' case must FAIL there, because that is the whole defect. */
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(process.argv[2] || join(HERE, '../../../../api'));
const LABEL = process.argv[3] || 'SHIPPED';

let fails = [], passes = 0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name + (detail ? ' — ' + detail : '')); }

const SECRET = 'test-cron-secret-value';
const realFetch = globalThis.fetch;
let fetchCalls = 0;
globalThis.fetch = async function(){ fetchCalls++; return { ok:false, status:500, text:async()=>'', json:async()=>({}) }; };

function res(){
  const r = { code:null, body:null, ended:false };
  r.status = function(c){ r.code = c; return r; };
  r.json   = function(b){ r.body = b; r.ended = true; return r; };
  r.send   = function(b){ r.body = b; r.ended = true; return r; };
  r.setHeader = function(){ return r; };
  r.end    = function(){ r.ended = true; return r; };
  return r;
}
function req(auth){ return { method:'GET', url:'/', query:{}, headers: auth ? { authorization:auth } : {} }; }

async function drive(file, envSecret, auth, extraEnv){
  const before = { ...process.env };
  if(envSecret === null) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = envSecret;
  /* the service key is deliberately absent: a request that gets PAST the guard
     stops at the next check instead of trying to do the job. */
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.RESEND_API_KEY;
  /* companycam-sync checks its API key BEFORE the cron guard, so reaching its
     guard at all needs those present. Aiming the assertion at a 500 the route
     raises two checks earlier would have proved nothing about the door. */
  if(extraEnv) Object.assign(process.env, extraEnv);
  fetchCalls = 0;
  const r = res();
  let threw = null;
  try{
    const mod = await import(pathToFileURL(file).href);
    await mod.default(req(auth), r);
  }catch(e){ threw = String(e && e.message || e); }
  process.env = before;
  return { code:r.code, body:r.body, fetches:fetchCalls, threw };
}

const ROUTES = [
  { id:'digest',             file: join(DIR, 'digest.js') },
  { id:'commissions-digest', file: join(DIR, 'commissions-digest.js') }
];

for(const rt of ROUTES){
  if(!existsSync(rt.file)){ need('a/'+rt.id+' route file exists', false, rt.file + ' not found'); continue; }

  const a = await drive(rt.file, null, null);
  need('a/'+rt.id+' no secret configured -> refused, nothing sent',
       a.code === 401 && a.fetches === 0 && /CRON_SECRET/i.test(JSON.stringify(a.body || '')),
       'HTTP ' + a.code + ' · ' + JSON.stringify(a.body) + ' · ' + a.fetches + ' fetch(es)' + (a.threw ? ' · threw ' + a.threw : ''));

  const b = await drive(rt.file, SECRET, null);
  need('b/'+rt.id+' secret set, no header -> refused',
       b.code === 401 && b.fetches === 0,
       'HTTP ' + b.code + ' · ' + JSON.stringify(b.body) + ' · ' + b.fetches + ' fetch(es)');

  const c = await drive(rt.file, SECRET, 'Bearer wrong-value');
  need('c/'+rt.id+' secret set, wrong header -> refused',
       c.code === 401 && c.fetches === 0,
       'HTTP ' + c.code + ' · ' + JSON.stringify(c.body) + ' · ' + c.fetches + ' fetch(es)');

  /* The check that stops this gate passing a route that refuses EVERYTHING:
     with the right header it must get past the guard. It then stops on the
     missing service key, which is a 500 — anything but 401 proves the door
     opened for the cron. */
  const d = await drive(rt.file, SECRET, 'Bearer ' + SECRET);
  need('d/'+rt.id+' correct secret gets past the guard',
       d.code !== 401 && d.code != null,
       'HTTP ' + d.code + ' · ' + JSON.stringify(d.body));

  /* The one that measures the DEFECT rather than the fix. Give the route the
     environment production actually has — service key and Resend key present —
     and withhold only CRON_SECRET. The old code walked straight past the guard
     and started contacting Supabase for an anonymous caller; on the control
     this fires with fetches > 0, which is the open door, seen. */
  const e = await drive(rt.file, null, null,
    { SUPABASE_SERVICE_ROLE_KEY:'dummy-service-key', RESEND_API_KEY:'dummy-resend-key' });
  need('f/'+rt.id+' production-shaped env, no secret -> still refused, still silent',
       e.code === 401 && e.fetches === 0,
       'HTTP ' + e.code + ' · ' + JSON.stringify(e.body) + ' · ' + e.fetches + ' fetch(es) to the outside');
}

/* the model this was copied from, asserted so it cannot quietly regress */
{
  const f = join(DIR, 'companycam-sync.js');
  if(!existsSync(f)) need('e/companycam-sync exists', false, f + ' not found');
  else {
    const a = await drive(f, null, null,
      { COMPANYCAM_API_KEY:'dummy-key-for-the-gate', SUPABASE_SERVICE_ROLE_KEY:'dummy-service-key' });
    need('e/companycam-sync still refuses with no secret',
         a.code === 401 && a.fetches === 0,
         'HTTP ' + a.code + ' · ' + JSON.stringify(a.body) + ' · ' + a.fetches + ' fetch(es)');
  }
}

globalThis.fetch = realFetch;
console.log('\ngate_960 [' + LABEL + '] ' + DIR);
console.log('  passed: ' + passes + '   failed: ' + fails.length);
fails.forEach(f => console.log('  FAIL  ' + f));
console.log(fails.length ? '\nRED' : '\nGREEN — 11/11');
process.exit(fails.length ? 1 : 0);
