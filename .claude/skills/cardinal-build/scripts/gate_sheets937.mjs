/* Sweep gate — EVERY bottom-anchored modal, checked the way a finger checks it.
   The 935 class: in the INSTALLED app body.standalone raises #pwaNav to
   z-index 9990, so it paints over any modal below that, and a control sitting
   in the bottom ~62px+safe-area cannot be tapped even though it is on screen
   and looks perfectly fine.

   The check is a HIT TEST, not arithmetic: scroll each modal's own scroller to
   its end, then ask document.elementFromPoint what a tap at each control's
   centre would actually reach. That cannot be fooled by z-index, transforms,
   or a bar that is transparent where it overlaps.

   Optional path arg = negative control. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const APP_PATH=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const LABEL=process.argv[3]||(/v9\d\d/.test(APP_PATH)?'CONTROL':'SHIPPED');
const APP=readFileSync(APP_PATH,'utf8');
const MOCK=readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js','utf8');

const LONG='Chimney flashing, step flashing and counter flashing all need replacing on the north elevation; the drip edge is undersized and the valley metal is rusted through in two places.';
const ck={po:1048,lead:{assigned:[]},meas:{squares:32}};
for(let i=0;i<14;i++) ck['note'+i]=LONG;
const SEED={
 team_profiles:[{email:'theodorion1986@gmail.com',name:'Theodore Dorion',role:'admin'},
                {email:'joan@cardinalrenovations.net',name:'Joan Dorion',role:'admin'},
                {email:'nick@cardinalrenovations.net',name:'Nick',role:'sales'}],
 projects:[{id:'p1',name:'Mark Diamond',address:'7990 Germantown Pike',stage:'Approved',
   created_by:'theo@cardinalrenovations.net',sales_rep:null,checklist:JSON.stringify(ck),
   updated_at:'2026-08-18T10:00:00Z',created_at:'2026-08-01T10:00:00Z',stage_since:'2026-08-01T10:00:00Z'}],
 appointments:Array.from({length:9},(_,i)=>({id:'a'+i,project_id:'p1',when:'2026-08-20T1'+(i%10)+':00:00Z',
   note:LONG,kind:'inspection',created_by:'theo@cardinalrenovations.net'})),
 objections:[],punch_items:[],crews:[],crew_work_orders:[],owner_tasks:[],owner_items:[],owner_reminders:[],
 owner_ledger:[],owner_ledger_txns:[],owner_docs:[],crew_docs:[],estimates:[],insurance_claims:[],
 project_photos:[],inspection_reports:[],crew_rates:[],pricing_items:[],crew_notes:[]};

/* Each surface names its REAL opener. Anything that cannot be staged is
   reported as "could not stage" and counts as a FAILURE of the gate, never as
   a pass — a check that cannot fail is worse than no check. */
const SURFACES=[
 {id:'projModal',    why:'New/Edit project (fixed at 595 — the control that proves the probe works)',
  open:"var b=document.querySelector('[onclick*=openProjModal],#newProjBtn'); if(typeof openProjModal==='function'){openProjModal();return 'openProjModal';} if(b){b.click();return 'click';} return null;"},
 {id:'ckModal',      why:'Roof inspection checklist',
  open:"if(typeof openChecklist==='function'){currentProject=PROJ;openChecklist();return 'openChecklist';}return null;"},
 {id:'gcModal',      why:'General/exterior checklist',
  open:"if(typeof openGeneralCk==='function'){currentProject=PROJ;openGeneralCk();return 'openGeneralCk';}return null;"},
 {id:'leadFormModal',why:'New lead intake form (the 932 front door)',
  open:"if(typeof openLeadForm==='function'){openLeadForm();return 'openLeadForm';}return null;"},
 {id:'leadModal',    why:'Lead list — every trade flagged, which is the tall case',
  open:"if(typeof openLeadModal!=='function')return null; var L=(typeof computeLeads==='function'&&typeof GC_FIELDS!=='undefined')?computeLeads(GC_FIELDS.reduce(function(o,f){o[f]='Poor (needs replacement)';return o;},{})):[]; if(!L.length)return null; openLeadModal(L); return 'openLeadModal x'+L.length;"},
 {id:'apptModal',    why:'Appointments for a day',
  open:"if(typeof openApptDay==='function'){openApptDay('2026-08-20');return 'openApptDay';}return null;"},
 {id:'sigModal',     why:'Signature pad (openPad is closure-scoped; this is the same two lines it runs)',
  open:"var m=document.getElementById('sigModal'); if(!m)return null; try{ if(typeof sigReset==='function') sigReset(); }catch(e){} m.style.display='block'; return 'display';"},
 {id:'tskModal',     why:'Task',
  open:"if(typeof openTaskModal==='function'){openTaskModal(PROJ,null);return 'openTaskModal';}return null;"},
 {id:'qiWhoModal',   why:'Who is this for',
  open:"if(typeof qiAskWho==='function'){qiAskWho();return 'qiAskWho';} var m=document.getElementById('qiWhoModal'); if(m&&m.querySelector('button')){m.style.display='block';return 'display';} return null;"},
 {id:'cr-pb-modal',  why:'Production add-an-item sheet (fixed at 936)',
  open:"if(window.CardinalProduction&&window.CardinalProduction.addFor){window.CardinalProduction.addFor('p1');return 'addFor';}return null;"},
 /* the module full-screen views — same bar, same z-index question */
 {id:'cr-abc',       why:'Suppliers / ABC catalog',
  open:"if(window.CardinalABC&&window.CardinalABC.open){window.CardinalABC.open();return 'ABC.open';}return null;"},
 {id:'cr-storm',     why:'Storm Data (927)',
  open:"if(window.CardinalStorm&&window.CardinalStorm.open){window.CardinalStorm.open();return 'Storm.open';}return null;"},
 {id:'cr-occ',       why:'OC Colors',
  open:"if(window.CardinalColors&&window.CardinalColors.open){window.CardinalColors.open();return 'Colors.open';}return null;"},
 {id:'crewsView',    why:'Crews directory',
  open:"if(window.CardinalCrews&&window.CardinalCrews.open){window.CardinalCrews.open();return 'Crews.open';}return null;"},
 {id:'cr-estimates-mount', why:'Estimates list',
  open:"if(window.CardinalEstimates&&window.CardinalEstimates.open){window.CardinalEstimates.open();return 'Est.open';}return null;"},
 {id:'cr-sf',        why:'Sales Floor (928)',
  open:"if(window.CardinalSalesFloor&&window.CardinalSalesFloor.open){window.CardinalSalesFloor.open();return 'SF.open';} if(window.CardinalObjections&&window.CardinalObjections.open){window.CardinalObjections.open();return 'Obj.open';} return null;"},
 {id:'cr-pb',        why:'Production board',
  open:"if(window.CardinalProduction&&window.CardinalProduction.open){window.CardinalProduction.open();return 'Prod.open';}return null;"},
];

let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('  ✗ '+m);} else console.log('  ✓ '+m); };

/* One viewport is how build 626 shipped a width-only bug three renders green.
   The SHORT screens are the ones that bite here — a card that clears the bar
   at 932px tall can sit right under it at 667. */
const VIEWPORTS=[{w:430,h:932,n:'16 Pro Max'},{w:375,h:667,n:'SE'},{w:844,h:390,n:'phone landscape'},{w:1194,h:834,n:'iPad landscape'}];

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

async function newPage(VP){
  const ctx=await browser.newContext({viewport:{width:VP.w,height:VP.h},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const page=await ctx.newPage();
  await page.route('**/*', async r=>{const u=r.request().url(),t=r.request().resourceType();
   if(u==='https://app.cardinalroster.com/')return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
   if(u.includes('@supabase/supabase-js'))return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
   if(u.includes('chart.js')||u.includes('papaparse'))return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){};window.Papa={parse:()=>({data:[]})};'});
   if(u.startsWith('https://app.cardinalroster.com/api/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
   if(t==='image'||t==='font'||t==='media')return r.abort();
   if(u.startsWith('https://app.cardinalroster.com/'))return r.fulfill({status:200,body:''}); return r.abort();});
  await page.addInitScript(s=>{window.__SEED__=s;},SEED); await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1600);
  return {ctx,page};
}

async function probe(surface,VP){
  const {ctx,page}=await newPage(VP);
  let r;
  try{
    r = await page.evaluate(async (S)=>{
      ['landingView','loginView'].forEach(function(id){var e=document.getElementById(id); if(e){e.style.display='none';e.classList&&e.classList.remove('open');}});
      /* the INSTALLED app — the real mechanism, not a forced display */
      document.body.classList.add('standalone');
      window.PROJ = (window.projects&&window.projects[0]) || {id:'p1',name:'Mark Diamond',checklist:{po:1048}};
      var how=null, err=null;
      try{ how = (new Function('PROJ', S.open))(window.PROJ); }catch(e){ err = e && e.message || String(e); }
      return {how:how, err:err};
    }, surface);
  }catch(e){ r={how:null, err:String(e&&e.message||e)}; }
  await page.waitForTimeout(600);

  const d = await page.evaluate((S)=>{
    const m=document.getElementById(S.id);
    const nav=document.getElementById('pwaNav');
    if(!m) return {missing:true};
    const cs=getComputedStyle(m);
    if(cs.display==='none'||cs.visibility==='hidden') return {closed:true};
    /* Scrolling everything to its END and judging from there was this probe's
       own bug, twice: it pushes the top of a list under a sticky header and
       reports perfectly reachable controls as blocked. What a person actually
       does is bring the control they want into view and then tap it, so that
       is what is measured — scrollIntoView per control, then hit test. A
       control still covered after that is covered at EVERY scroll position,
       which is exactly what a fixed bottom bar does and a sticky header
       does not. */
    const scrollers=[m].concat(Array.from(m.querySelectorAll('*')).filter(e=>{
      const s=getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight>e.clientHeight+4; }));
    const navCS = nav?getComputedStyle(nav):null;
    const nb = nav && navCS.display!=='none' ? nav.getBoundingClientRect() : null;
    const sel='button,input,select,textarea,a[href],[role="button"],[onclick]';
    const ctrls=Array.from(m.querySelectorAll(sel)).filter(e=>{
      const s=getComputedStyle(e); if(s.display==='none'||s.visibility==='hidden'||s.pointerEvents==='none') return false;
      const b=e.getBoundingClientRect(); return b.width>4 && b.height>4;
    });
    const bad=[];
    ctrls.forEach(e=>{
      const label=(e.textContent||e.value||e.type||e.tagName).trim().slice(0,34);
      try{ e.scrollIntoView({block:'center', inline:'nearest'}); }catch(_){ }
      const r=e.getBoundingClientRect();
      if(r.bottom<=0 || r.top>=innerHeight){
        bad.push({label:label, blocker:'cannot be scrolled into view at all', byNav:true,
                  rect:Math.round(r.top)+'..'+Math.round(r.bottom)+' of '+innerHeight});
        return;
      }
      const cx=Math.round(r.left+r.width/2);
      const cy=Math.round(Math.min(Math.min(r.bottom-2, innerHeight-2), Math.max(Math.max(r.top+2, 2), r.top+r.height/2)));
      const t=document.elementFromPoint(cx,cy);
      const reach = !!(t && (t===e || e.contains(t) || t.contains(e)));
      if(!reach){
        const blocker = t ? (t.id || (typeof t.className==='string'?t.className:'') || t.tagName) : 'nothing';
        bad.push({ label:label, blocker:String(blocker).slice(0,28),
                   byNav: !!(nb && cy>=nb.top),
                   rect:Math.round(r.top)+'..'+Math.round(r.bottom)+' of '+innerHeight });
      }
    });
    return { scrollers:scrollers.length, ctrls:ctrls.length, bad:bad,
             navZ: navCS?navCS.zIndex:null, navShown: !!nb,
             navTop: nb?Math.round(nb.top):null, modalZ:cs.zIndex,
             tall: m.scrollHeight>m.clientHeight+4 || scrollers.length>1 };
  }, surface);

  await ctx.close();
  return {open:r, d};
}

console.log('\n=== bottom-bar reachability sweep ('+LABEL+') — '+APP_PATH+' ===');
console.log('    installed app. A control fails only if a tap at its centre lands on something else.\n');

const rows=[];
for(const VP of VIEWPORTS){
  console.log('  ── '+VP.w+'x'+VP.h+'  '+VP.n+' ──');
  for(const S of SURFACES){
    const {open,d}=await probe(S,VP);
    rows.push({S,open,d,VP});
    const head='  '+S.id.padEnd(15)+' ';
    if(d.missing){ fails++; console.log(head+'✗ not in the document'); continue; }
    if(!open.how || d.closed){
      fails++;
      console.log(head+'✗ COULD NOT STAGE — opener '+(open.err?('threw: '+open.err):'returned nothing')+'. Proves nothing.');
      continue;
    }
    const n=d.bad.length;
    if(n===0) console.log(head+'✓ '+d.ctrls+' controls, all reachable  ['+open.how+', z='+d.modalZ+(d.tall?', scrolls':'')+']');
    else{
      fails++;
      console.log(head+'✗ '+n+' of '+d.ctrls+' controls UNREACHABLE  ['+open.how+', z='+d.modalZ+']');
      d.bad.slice(0,6).forEach(b=>console.log('                    └ "'+b.label+'" '+b.rect+'px — blocked by '+b.blocker+(b.byNav?'  (the bottom bar zone)':'')));
    }
  }
  console.log('');
}

const staged=rows.filter(r=>r.d && !r.d.missing && !r.d.closed && r.open.how);
ok(staged.length===SURFACES.length*VIEWPORTS.length, 'every surface staged on every screen ('+staged.length+'/'+(SURFACES.length*VIEWPORTS.length)+') — an unstaged surface is not a pass');
ok(staged.length && staged.every(r=>r.d.navShown && r.d.navZ==='9990'),
   'the installed bar is really raised above these modals — the condition that makes this bite');
ok(staged.some(r=>r.d.tall), 'at least one surface is genuinely taller than the screen — otherwise nothing could ever overlap');
ok(rows.every(r=>!r.d || !r.d.bad || r.d.bad.length===0), 'no control anywhere is covered by the bottom bar');

console.log(fails?('\nRED — '+fails+' failed'):'\nGREEN — every control on every bottom-anchored modal is tappable in the installed app');
await browser.close();
process.exit(fails?1:0);
