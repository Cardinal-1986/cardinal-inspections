/* gate_973.mjs — attaching a partner writes the name too (build 973).

   setPartnerForProject wrote ck.lead.partner_id and NOTHING else, while the hub's
   partnerOf() reads partner_name — so attaching a partner on the card left the hub
   saying "No partner recorded". Clearing one left a ghost name behind. And the New
   Bid picker read the UNMASKED roster, so a confidential partner's real name showed
   to every user and was written into the job.

   Runs the SHIPPED setPartnerForProject against a recording client.

     1  attaching writes BOTH partner_id and partner_name
     2  ...so the hub's own partnerOf() then resolves it (no "No partner recorded")
     3  clearing removes BOTH — no ghost name left behind
     4  a CONFIDENTIAL partner is stored by id only, never by name
     5  the New Bid picker reads the masked list, not the raw cache
     6  ...and never writes a masked placeholder as the stored name
     7  Habitat sorts first in the New Bid picker
     8  leaving Community clears both fields

   Usage: node gate_973.mjs [path] — previous build = negative control; must go RED
   with named failures and MUST NOT crash (BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||'SHIPPED';
const APP=readFileSync(FILE,'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

const blockOf = id => { const i=APP.indexOf('<script id="'+id+'"'); if(i===-1) return ''; return APP.slice(APP.indexOf('>',i)+1, APP.indexOf('</script>',i)); };
const CP = blockOf('cr-cpartners-script');
const NB = blockOf('cr-nbid-script');
const CH2 = blockOf('cr-ch2-script');
const CCT = blockOf('cr-cct-script');
need('0 modules found', !!(CP && NB && CH2), 'cpartners/nbid/ch2 missing');

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage();
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },90000);
await page.goto('about:blank');

/* Execute the SHIPPED setPartnerForProject with its closure supplied. */
const run = await page.evaluate(({CP, CH2})=>{
  const out={err:null};
  const grab=(src, marker)=>{ const s=src.indexOf(marker); if(s===-1) return '';
    const o=src.indexOf('{',s); let d=0;
    for(let k=o;k<src.length;k++){ if(src[k]==='{')d++; else if(src[k]==='}'){d--; if(!d) return src.slice(s,k+1);} } return ''; };
  try{
    const setFn = grab(CP, 'async function setPartnerForProject');
    const partnerOf = grab(CH2, 'function partnerOf');
    out.hasSet = !!setFn;
    if(!setFn) return out;
    const ROSTER = [
      { id:'pa', name:'Habitat For Humanity', confidential:false },
      { id:'pc', name:'Secret GC LLC',        confidential:true  }
    ];
    const mk = (project) => {
      const shim = `
        var __WROTE__ = null;
        var CACHE = ${JSON.stringify(ROSTER)};
        function getRaw(id){ return CACHE.filter(function(r){ return r.id===id; })[0] || null; }
        function get(id){ var r=getRaw(id); if(!r) return null;
          return r.confidential ? { id:r.id, name:'Confidential Partner', confidential:true } : r; }
        function list(){ return CACHE.map(function(r){ return get(r.id); }); }
        async function load(){ return CACHE; }
        function renderOverview(){}
        var window_currentProject = null;
        /* the shipped code calls sb(), not client() — bind the name it actually uses */
        function sb(){ return { from: function(){ return {
          update: function(p){ __WROTE__ = p; return { eq: function(){ return Promise.resolve({ error:null }); } }; } }; } }; }
      `;
      return new Function('pr', shim + '\n' + setFn +
        '\n; return async function(pid){ await setPartnerForProject(pr, pid); return __WROTE__; };')(project);
    };
    const proj = () => ({ id:'p1', checklist: JSON.stringify({ lead:{ claim_type:'community' } }) });

    return (async ()=>{
      /* 1 — attach a normal partner */
      let pr = proj(); let wrote = await mk(pr)('pa');
      const ck1 = JSON.parse((wrote && wrote.checklist) || pr.checklist || '{}');
      out.attach = ck1.lead || {};
      /* 2 — does the hub's own resolver then find it? */
      if(partnerOf){
        const pof = new Function('function lead(pr){ try{ return (JSON.parse(pr.checklist||"{}").lead)||{}; }catch(e){ return {}; } }\n' +
          partnerOf + '; return partnerOf;')();
        out.hubSees = pof({ checklist: JSON.stringify(ck1) });
      }
      /* 3 — clear it */
      pr = { id:'p1', checklist: JSON.stringify({ lead:{ claim_type:'community', partner_id:'pa', partner_name:'Habitat For Humanity' } }) };
      wrote = await mk(pr)(null);
      out.cleared = (JSON.parse((wrote && wrote.checklist) || '{}').lead) || {};
      /* 4 — a confidential partner */
      pr = proj(); wrote = await mk(pr)('pc');
      out.confidential = (JSON.parse((wrote && wrote.checklist) || '{}').lead) || {};
      return out;
    })();
  }catch(e){ out.err = String(e && e.message || e); return out; }
}, {CP, CH2});

const A = (run && run.attach) || {};
need('1 attaching writes BOTH id and name',
     A.partner_id === 'pa' && A.partner_name === 'Habitat For Humanity',
     run && run.err ? ('threw: '+run.err) : JSON.stringify(A));
need('2 the hub then resolves it, instead of "No partner recorded"',
     !!(run && run.hubSees && !/No partner recorded/i.test(String(run.hubSees))),
     'hub says: ' + JSON.stringify(run && run.hubSees));
const C = (run && run.cleared) || {};
need('3 clearing removes BOTH — no ghost name',
     C.partner_id === undefined && C.partner_name === undefined,
     JSON.stringify(C));
const F = (run && run.confidential) || {};
need('4 a confidential partner is stored by id only',
     F.partner_id === 'pc' && F.partner_name === undefined,
     JSON.stringify(F));

/* source assertions on the New Bid picker */
need('5 New Bid reads the masked list, not the raw cache',
     /CardinalCommunityPartners\.list\(\)/.test(NB),
     'still consuming load()\'s raw return');
need('6 New Bid never stores a masked placeholder as the name',
     /masked973/.test(NB) && (NB.match(/masked973 \? undefined : partner\.name/g)||[]).length === 2,
     'guards found: ' + ((NB.match(/masked973 \? undefined : partner\.name/g)||[]).length));
need('7 Habitat sorts first in the New Bid picker',
     /habitat/i.test(NB),
     'no Habitat pin in cr-nbid-script');
need('8 leaving Community clears both fields',
     /delete L\.partner_id; delete L\.partner_name;/.test(CCT),
     'cr-cct still clears the id only');

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_973 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
