/* harness_guide1112.js — functional gate for Build 1112 (Siding + Windows guides).
   Extracts the SHIPPED cr-guide-script and proves the multi-guide generalization:
   slugForJob trade→guide mapping, the auto-send picking the RIGHT guide per trade
   (correct title + trade-specific content in the /api/senddoc payload), the
   no-guide skip (gutters/repairs), per-(job,guide) once-guard, docsRows for the
   Company Documents filter, and the manual send. Negative control: build 1111
   (roof only, no siding/windows config) → RED.
   Usage: node harness_guide1112.js [path-to-index.html]   (NODE_PATH -> jsdom) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');
let fails = 0;
function ok(c, m){ console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);
const tick = () => new Promise(r => setTimeout(r, 0));

const ST = '<script id="cr-guide-script">';
const s = html.indexOf(ST);
const e = s >= 0 ? html.indexOf('</script>', s) : -1;
const script = e > s ? html.slice(s + ST.length, e) : '';
// negative control: 1111 has no siding/windows guides
if(s < 0 || !/preinstall_siding/.test(script) || !/preinstall_windows/.test(script)){
  console.log('  ✗ FAIL siding/windows guides not present (negative control)');
  console.log('\nRED — Build 1112 generalization absent from ' + path.basename(APP));
  process.exit(1);
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts:'outside-only', pretendToBeVisual:true });
const w = dom.window;

// company_templates select returns null → the module falls back to its baked
// per-slug content, so the sent HTML carries the real guide for that trade.
const store = { sent:{}, inserts:[] };
function makeSb(){
  return {
    auth:{ getSession(){ return Promise.resolve({ data:{ session:{ access_token:'tok' } } }); } },
    from(table){
      const b = { _t:table, _filters:[] };
      b.select = function(){ return this; };
      b.eq = function(k, v){ this._filters.push([k, v]); return this; };
      b.maybeSingle = function(){
        const self = this;
        return Promise.resolve().then(function(){
          if(self._t === 'company_templates') return { data:null, error:null };  // fall back to baked content
          if(self._t === 'client_guide_sends'){
            const pid = (self._filters.find(f => f[0] === 'project_id') || [])[1];
            const kind = (self._filters.find(f => f[0] === 'kind') || [])[1];
            return { data: store.sent[pid + '|' + kind] ? { project_id:pid } : null, error:null };
          }
          return { data:null, error:null };
        });
      };
      b.insert = function(p){
        return Promise.resolve().then(function(){ store.inserts.push(p); store.sent[p.project_id + '|' + p.kind] = true; return { error:null }; });
      };
      b.upsert = function(){ return { then(res){ return Promise.resolve().then(function(){ return res({ error:null }); }); } }; };
      return b;
    }
  };
}

let TRADES = {};
const toasts = [], fetches = [];
let PROMPT_RETURN = null;
const patchCalls = [];
w.TEAM = true; w.sb = makeSb();
w.currentUser = { email:'nick@cardinalrenovations.net' };
w.cacheTeam = { 'nick@cardinalrenovations.net': { name:'Nick Hey', phone:'(937) 555-0142' } };
w.cacheProjects = [
  { id:'PR', name:'Roof Client', address:'1 A St', email:'roof@example.com', sales_rep:'nick@cardinalrenovations.net' },
  { id:'PS', name:'Siding Client', address:'2 B St', email:'siding@example.com', sales_rep:'nick@cardinalrenovations.net' },
  { id:'PW', name:'Window Client', address:'3 C St', email:'window@example.com', sales_rep:'nick@cardinalrenovations.net' },
  { id:'PG', name:'Gutter Client', address:'4 D St', email:'gutter@example.com', sales_rep:'nick@cardinalrenovations.net' },
  { id:'PU', name:'Untagged Client', address:'5 E St', email:'untagged@example.com', sales_rep:'nick@cardinalrenovations.net' }
];
w.ljTrades = pr => TRADES[pr.id] || [];
w.ljAssignedEmail = pr => (pr && pr.sales_rep) || '';
w.rptRepName = email => (w.cacheTeam[email] && w.cacheTeam[email].name) || email;
w.is_admin = () => true;
w.hideAllViews = () => {}; w.navSetView = () => {}; w.showHome = () => {}; w.scrollTo = () => {};
w.crTell = () => {}; w.crToastOk = m => toasts.push(String(m || ''));
w.patchProject = (id, fields) => { patchCalls.push({ id, fields }); return Promise.resolve(); };
w.prompt = () => PROMPT_RETURN; w.confirm = () => true;
w.open = () => ({ document:{ open(){}, write(){}, close(){} } });
w.fetch = (url, opts) => { fetches.push({ url, body: JSON.parse((opts && opts.body) || '{}') }); return Promise.resolve({ ok:true, json:() => Promise.resolve({ ok:true }) }); };

try{ w.eval(script); }
catch(err){ console.log('  ✗ FAIL module threw on eval: ' + err.message); console.log('\nRED'); process.exit(1); }
const Gm = w.CardinalGuide;
function lastFetch(){ return fetches[fetches.length - 1]; }

(async function(){
  // 1. three guides configured
  ok(Gm && Gm.GUIDES && Gm.GUIDES.preinstall_roof && Gm.GUIDES.preinstall_siding && Gm.GUIDES.preinstall_windows, 'GUIDES has roof + siding + windows');
  ok(typeof Gm.slugForJob === 'function' && typeof Gm.docsRows === 'function', 'slugForJob + docsRows exported');

  // 2. slugForJob trade → guide
  TRADES = { PR:['Roofing'], PS:['Siding'], PW:['Windows'], PG:['Gutters'], PU:[] };
  ok(Gm.slugForJob(w.cacheProjects[0]) === 'preinstall_roof', 'Roofing → roof guide');
  ok(Gm.slugForJob(w.cacheProjects[1]) === 'preinstall_siding', 'Siding → siding guide');
  ok(Gm.slugForJob(w.cacheProjects[2]) === 'preinstall_windows', 'Windows → windows guide');
  ok(Gm.slugForJob(w.cacheProjects[3]) === null, 'Gutters-only → no guide (null)');
  ok(Gm.slugForJob(w.cacheProjects[4]) === 'preinstall_roof', 'Untagged → roof guide (default)');
  ok(Gm.slugForJob({ id:'X', }) === 'preinstall_roof' && (TRADES.X = ['Roofing','Siding']) && Gm.slugForJob({ id:'X' }) === 'preinstall_roof', 'Roofing wins when multiple trades present');

  // 3. auto-send picks the SIDING guide for a siding job
  fetches.length = 0;
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'PS', appt_date:'2026-09-05' });
  await tick(); await tick(); await tick();
  ok(fetches.length === 1, 'a siding build day emails a guide');
  ok(lastFetch().body.title === 'Siding Installation — Pre-Install Guide', 'siding job gets the SIDING title');
  ok(/transform the exterior|siding panels|Yard Sign/.test(lastFetch().body.html) && !/cr-gtok/.test(lastFetch().body.html), 'the email carries siding-specific content, fully filled');
  ok(lastFetch().body.to === 'siding@example.com', 'sent to the siding client');
  ok(store.inserts.some(i => i.project_id === 'PS' && i.kind === 'preinstall_siding'), 'recorded under kind=preinstall_siding');

  // 4. auto-send picks the WINDOWS guide for a windows job
  fetches.length = 0;
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'PW', appt_date:'2026-09-06' });
  await tick(); await tick(); await tick();
  ok(lastFetch().body.title === 'Window Replacement — Pre-Install Guide', 'windows job gets the WINDOWS title');
  ok(/One Window at a Time|blinds, shades, curtains|window replacement/i.test(lastFetch().body.html), 'the email carries windows-specific content');

  // 5. auto-send picks ROOF for a roofing job
  fetches.length = 0;
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'PR', appt_date:'2026-09-07' });
  await tick(); await tick(); await tick();
  ok(lastFetch().body.title === 'Roof Installation — Pre-Install Guide' && /new roof system|existing roofing/.test(lastFetch().body.html), 'roofing job gets the ROOF guide');

  // 6. gutters-only job → nothing sent
  fetches.length = 0;
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'PG', appt_date:'2026-09-08' });
  await tick(); await tick(); await tick();
  ok(fetches.length === 0, 'a gutters-only build day sends no guide');

  // 7. per-(job,guide) once-guard
  fetches.length = 0;
  w.__apptEmailPreInstallGuide({ kind:'job', project_id:'PS', appt_date:'2026-09-20' });
  await tick(); await tick(); await tick();
  ok(fetches.length === 0, 'the siding job does not re-send its guide');

  // 8. docsRows respects the trade filter and carries slugs
  const all = Gm.docsRows('All', true);
  ok((all.match(/cd-guiderow/g) || []).length === 3, 'docsRows("All") lists all three guides');
  ok(/data-cr-guide-edit="preinstall_siding"/.test(all) && /data-cr-guide-edit="preinstall_windows"/.test(all), 'each row carries its own slug for Edit');
  const sid = Gm.docsRows('Siding', true);
  ok((sid.match(/cd-guiderow/g) || []).length === 1 && /Siding Pre-Install Guide/.test(sid), 'docsRows("Siding") lists only the siding guide');
  const noadmin = Gm.docsRows('All', false);
  ok(!/data-cr-guide-edit/.test(noadmin) && /data-cr-guide-preview-doc/.test(noadmin), 'non-admin gets Preview but no Edit');

  // 9. manual send picks the trade's guide
  fetches.length = 0;
  Gm.send(w.cacheProjects[2]);   // PW windows, force re-send
  await tick(); await tick(); await tick();
  ok(lastFetch() && lastFetch().body.title === 'Window Replacement — Pre-Install Guide', 'manual send uses the job trade’s guide');

  // 10. wiring landed in the artifact
  ok(/id="cr-ge-ttl"/.test(html), 'editor title carries an id (set per guide)');
  ok(/CardinalGuide\.docsRows\(__cdTrade/.test(html), 'Company Documents renders guide rows via docsRows');
  ok(/window\.__apptEmailPreInstallGuide\(fields\)/.test(html) && /window\.__apptEmailPreInstallGuide\(merged\)/.test(html), 'both appointment hooks still wired');

  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' failed') : '\nGREEN — all Build 1112 assertions passed');
  process.exit(fails ? 1 : 0);
})();
