/* gate_968.mjs — the Supplement Desk stops signing you out of the CRM (build 968).

   The Desk shares ONE stored Supabase session with index.html and studio.html
   (same project, same origin, default storageKey). Its admin check used to call
   sb.auth.signOut(), which in supabase-js v2 defaults to scope 'global' — so a
   rep who tapped "Supplement Desk" was signed out of the whole CRM everywhere.

     1  a non-admin is REFUSED without signOut() ever being called
     2  ...the shared session survives the visit
     3  ...and the refusal names a person to ask
     4  the refusal offers a way back to the app
     5  a FAILED CHECK and a NO are different sentences (671's rule)
     6  ...and only the failed check offers Try again
     7  an admin still gets the Desk
     8  the Desk header carries a way home for admins too
     9  the real Sign out button still signs out

   Usage: node gate_968.mjs [path-to-supplement.html] — previous build = negative
   control; must go RED with named failures and MUST NOT crash (BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../supplement.html');
const LABEL=process.argv[3]||'SHIPPED';
const PAGE=readFileSync(FILE,'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

/* A stand-in Supabase that RECORDS signOut instead of performing it, so the
   assertion is "was it called", which is the whole question. */
const STUB = (isAdmin, rpcErrors) => `
window.__SIGNOUTS__ = [];
window.__SESSION__ = { user: { id:'u1', email:'nick@cardinalrenovations.net' } };
window.supabase = { createClient: function(){
  var q = function(){ var o={}; ['select','eq','order','limit','in','is','update','insert','upsert','delete','match','single','maybeSingle'].forEach(function(k){ o[k]=function(){return o;}; });
    o.then=function(res,rej){ return Promise.resolve({ data:[], error:null }).then(res,rej); }; return o; };
  return {
    from: function(){ return q(); },
    rpc: function(name){ return Promise.resolve(${rpcErrors}
        ? { data:null, error:{ message:'could not reach the checker' } }
        : { data:${isAdmin}, error:null }); },
    storage: { from: function(){ return { list:function(){return Promise.resolve({data:[],error:null});},
      createSignedUrl:function(){return Promise.resolve({data:{signedUrl:''},error:null});},
      upload:function(){return Promise.resolve({data:{},error:null});} }; } },
    auth: {
      getSession: function(){ return Promise.resolve({ data:{ session: window.__SESSION__ }, error:null }); },
      getUser: function(){ return Promise.resolve({ data:{ user: window.__SESSION__ && window.__SESSION__.user }, error:null }); },
      signInWithPassword: function(){ return Promise.resolve({ data:{ session: window.__SESSION__ }, error:null }); },
      onAuthStateChange: function(){ return { data:{ subscription:{ unsubscribe:function(){} } } }; },
      signOut: function(){ window.__SIGNOUTS__.push(Date.now()); window.__SESSION__ = null; return Promise.resolve({ error:null }); }
    }
  };
}};
`;

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },90000);

async function visit(isAdmin, rpcErrors){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://desk.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:PAGE});
    return r.fulfill({status:200,contentType:'application/javascript',body:''});});
  await page.addInitScript(STUB(isAdmin, rpcErrors));
  await page.goto('https://desk.test/supplement.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1200);
  const out = await page.evaluate(()=>{
    const vis = id => { const e=document.getElementById(id); return !!(e && getComputedStyle(e).display !== 'none'); };
    const txt = id => { const e=document.getElementById(id); return e ? (e.textContent||'').trim() : null; };
    const denied = document.getElementById('deniedView');
    return {
      signouts : (window.__SIGNOUTS__||[]).length,
      session  : !!window.__SESSION__,
      appShown : vis('appView'),
      loginShown: vis('loginView'),
      deniedShown: !!denied && getComputedStyle(denied).display !== 'none',
      denyTtl  : txt('denyTtl'),
      denyMsg  : txt('denyMsg'),
      retryShown: (function(){ const e=document.getElementById('denyRetry'); return !!(e && getComputedStyle(e).display !== 'none'); })(),
      deniedHome: !!(denied && denied.querySelector('a[href="/"]')),
      headerHome: !!document.querySelector('header.sd-hd a[href="/"]'),
      outBtn   : !!document.getElementById('outBtn')
    };
  }).catch(e=>({ err:String(e&&e.message||e) }));
  await page.close();
  return out;
}

/* ---- a rep opens the Desk ---- */
const rep = await visit('false', 'false');
need('1 a non-admin is refused WITHOUT signOut()', rep.signouts === 0,
     rep.err ? ('threw: '+rep.err) : ('signOut called ' + rep.signouts + 'x'));
need('2 the shared CRM session survives the visit', rep.session === true,
     'session present=' + rep.session);
need('3 the refusal names a person to ask', /theo|joan/i.test(rep.denyMsg||''),
     JSON.stringify(rep.denyMsg));
need('3b the refusal is shown, not the login form', rep.deniedShown === true && rep.appShown === false,
     'denied=' + rep.deniedShown + ' app=' + rep.appShown);
need('4 the refusal offers a way back to the app', rep.deniedHome === true, 'no a[href="/"] in the panel');
need('6a a plain NO does not offer Try again', rep.retryShown === false, 'retry shown on a refusal');

/* ---- the check itself fails ---- */
const broke = await visit('false', 'true');
need('5 a failed check reads differently from a refusal',
     !!(broke.denyTtl && rep.denyTtl && broke.denyTtl !== rep.denyTtl),
     'failed=' + JSON.stringify(broke.denyTtl) + ' refused=' + JSON.stringify(rep.denyTtl));
need('5b a failed check does not sign out either', broke.signouts === 0, 'signOut called ' + broke.signouts + 'x');
need('6b a failed check DOES offer Try again', broke.retryShown === true, 'no retry offered');

/* ---- an admin opens the Desk ---- */
const admin = await visit('true', 'false');
need('7 an admin still gets the Desk', admin.appShown === true && admin.deniedShown === false,
     'app=' + admin.appShown + ' denied=' + admin.deniedShown);
need('8 the Desk header carries a way home', admin.headerHome === true, 'no a[href="/"] in header.sd-hd');
need('9 the real Sign out button survives', admin.outBtn === true, 'outBtn missing');

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_968 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
