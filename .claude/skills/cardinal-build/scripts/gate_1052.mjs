/* gate_1052.mjs — the INSURANCE CRM ink pass.
 *
 * Proves, in a real Chromium render:
 *   1  the insurance client profile's identity block clears the WCAG floor in
 *      BOTH insurance themes (docket = cream, siren = near-black). The client's
 *      own name measured 1.00:1 before this build.
 *   2  every value flips WITH the theme — i.e. it is a --ct-* token, not a
 *      literal that happens to suit one of them. Asserted by measuring the same
 *      element twice and requiring the two inks to DIFFER.
 *   3  the stage banner grounds on STAGE_INK, not STAGE_COLORS, on every stage.
 *   4  RETAIL is untouched — the same selectors keep their --rbe-* inks.
 *
 * Run:  node gate_1052.mjs <artifact> [--control <prev>]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
const args = process.argv.slice(2);
const FILE = args[0];
const ci = args.indexOf('--control');
const CONTROL = ci >= 0 ? args[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1052.mjs <artifact> [--control <prev>]'); process.exit(2); }
const SK = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const CARD = readFileSync(SK + 'sentinel_setup_cardinal.js', 'utf8');
const MOCK = readFileSync(SK + 'e2e_mock_supa.js', 'utf8');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/* an insurance job and a retail one, same shape otherwise, so "retail is
   untouched" is measured on the same screen rather than assumed. */
const SEED = `(function(){ if(!window.__SEED__) return;
  function mk(id,name,ins){ return { id:id, name:name, address:'2184 Cedarbrook Dr', city:'Kettering',
    state:'OH', zip:'45429', stage:'Approved', created_by:'theo@cardinalrenovations.net', sales_rep:null,
    checklist: JSON.stringify({ po:2201, job_category:'Residential', work_type: ins?'Insurance':'Retail',
      lead: ins ? { assigned:[], claim_type:'insurance',
        insurance:{ carrier:'State Farm', claim_number:'SF-88213', deductible:2500 } } : { assigned:[] } }),
    phone:'937-555-0177', email:'renfrew@example.com', crm:'retail',
    created_at:'2026-06-15T10:00:00Z', updated_at:'2026-08-20T10:00:00Z', stage_since:'2026-07-28T10:00:00Z' }; }
  window.__SEED__.projects.push(mk('pins','Harold & Marla Renfrew',true), mk('pret','Dale Whitfield',false));
})();`;

/* contrast, scored against the element's real composited ground */
const MEASURE = `(function(){
  function parse(c){ var m=String(c||'').match(/rgba?\\(([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:[,\\s\\/]+([\\d.]+))?/);
    return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]===undefined?1:+m[4]}:null; }
  function over(f,b){ var a=f.a; return {r:f.r*a+b.r*(1-a),g:f.g*a+b.g*(1-a),b:f.b*a+b.b*(1-a),a:1}; }
  function lum(c){ function f(v){v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}
    return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); }
  function cr(a,b){ var l1=lum(a),l2=lum(b); if(l1<l2){var t=l1;l1=l2;l2=t;} return (l1+0.05)/(l2+0.05); }
  function ground(el){
    var n=el, cover=0, stack=[];
    while(n && n.nodeType===1){
      var cs=getComputedStyle(n), bc=parse(cs.backgroundColor);
      if(bc && bc.a>0){ stack.push(bc); cover=cover+(1-cover)*bc.a; if(cover>=0.8) break; }
      var bi=cs.backgroundImage||'';
      if(bi && bi!=='none'){
        var depth=0,cur='',layers=[];
        for(var i=0;i<bi.length;i++){var ch=bi[i]; if(ch==='(')depth++; else if(ch===')')depth--;
          if(ch===','&&depth===0){layers.push(cur);cur='';continue;} cur+=ch;}
        if(cur) layers.push(cur);
        var clip=String(cs.backgroundClip||'').split(',')[0].trim();
        if(clip!=='border-box'||layers.length===1){
          var re=/rgba?\\([^)]+\\)/g,m; var first=layers[0]||'';
          while((m=re.exec(first))){ var st=parse(m[0]); if(st&&st.a>0){ stack.push(st); cover=cover+(1-cover)*st.a; } }
          var hx=/#([0-9a-f]{6})\\b/gi,h;
          while((h=hx.exec(first))){ var v=h[1];
            stack.push({r:parseInt(v.slice(0,2),16),g:parseInt(v.slice(2,4),16),b:parseInt(v.slice(4,6),16),a:1}); cover=1; }
          if(cover>=0.8) break;
        }
      }
      n=n.parentElement;
    }
    if(!stack.length) stack.push(parse(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1});
    var base=stack[stack.length-1].a===1?stack[stack.length-1]:{r:255,g:255,b:255,a:1};
    var worst=null;
    stack.forEach(function(s){ var b=s.a<1?over(s,base):s; if(worst===null) worst=b; });
    return worst;
  }
  function look(sel){
    var el=document.querySelector(sel); if(!el) return null;
    var cs=getComputedStyle(el), fg=parse(cs.color); if(!fg) return null;
    var bg=ground(el); var eff=fg.a<1?over(fg,bg):fg;
    var size=parseFloat(cs.fontSize)||16, w=parseInt(cs.fontWeight,10)||400;
    return { color:cs.color, ratio:+cr(eff,bg).toFixed(2),
             floor:(size>=24||(size>=18.66&&w>=700))?3.0:4.5,
             ground:'rgb('+Math.round(bg.r)+','+Math.round(bg.g)+','+Math.round(bg.b)+')' };
  }
  var SELS = {
    heroNm:'#projectView .heroNm', hph:'#projectView .hph', hem:'#projectView .hem',
    mlbl:'#projectView .projmeta .mlbl', poPfx:'#projectView .poPfx',
    dbmdir:'#projectView .dbmtabs .dbmdir', dbpaid:'#projectView .dbmoney b.db-paid',
    danger:'#dangerZone .danger-note'
  };
  var out={};
  Object.keys(SELS).forEach(function(k){ out[k]=look(SELS[k]); });
  var b=document.querySelector('.dbstage');
  out._banner = b ? { bg:getComputedStyle(b).backgroundColor,
                      inline:(b.getAttribute('style')||''),
                      ink:(function(){var m=document.querySelector('.dbstage .dbstgmid b');
                           return m?look('.dbstage .dbstgmid b'):null;})() } : null;
  out._crm = { ins:document.body.classList.contains('claim-insurance'),
               rl:document.body.getAttribute('data-rltheme') };
  return out;
})`;

async function drive(file, rlTheme, projectId) {
  const HTML = readFileSync(file, 'utf8');
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] })
    .catch(() => chromium.launch({ args:['--no-sandbox'] }));
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => { const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:HTML });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status:200, contentType:'image/png', body:PNG1 });
    return r.fulfill({ status:200, body:'' }); });
  if (rlTheme) await page.addInitScript(`try{localStorage.setItem('cardinalRLTheme',${JSON.stringify(rlTheme)});}catch(e){}`);
  await page.addInitScript(CARD); await page.addInitScript(SEED); await page.addInitScript(MOCK);
  await page.goto('https://sentinel.test/', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(1700);
  await page.evaluate(`(async function(){ var l=document.getElementById('landingView'); if(l) l.style.display='none';
     await window.openProject(${JSON.stringify(projectId)}); })()`);
  await page.waitForTimeout(1300);
  const r = await page.evaluate(`(${MEASURE})()`);
  await ctx.close(); await browser.close();
  return r;
}

const INK_KEYS = ['heroNm','hph','hem','mlbl','poPfx','dbmdir','dbpaid','danger'];
/* the sanctioned darkened twin — the banner must ground on one of these */
const STAGE_INK = ['#8A6608','#9A4E06','#0B5F57','#3F6B23','#15607F','#5B4080','#455A64','#5E5E5E'];

async function judge(file) {
  const f = [];
  const docket = await drive(file, 'docket', 'pins');
  const siren  = await drive(file, 'siren',  'pins');
  const retail = await drive(file, 'docket', 'pret');

  if (!docket._crm.ins) { f.push('rig fault: the seeded job is not an insurance claim'); return f; }
  if (retail._crm.ins)  { f.push('rig fault: the retail control opened as an insurance claim'); return f; }

  /* 1 + 2 — readable in BOTH insurance themes, and actually theme-aware */
  for (const k of INK_KEYS) {
    const d = docket[k], s = siren[k];
    if (!d) { f.push(`${k} is not on the insurance profile (rig fault — proves nothing)`); continue; }
    if (d.ratio < d.floor) f.push(`${k} is ${d.ratio}:1 on the DEFAULT insurance theme (${d.color} on ${d.ground}, floor ${d.floor})`);
    if (s && s.ratio < s.floor) f.push(`${k} is ${s.ratio}:1 on the dark insurance theme (${s.color} on ${s.ground}, floor ${s.floor})`);
    /* dbmdir and dbpaid are deliberately NOT the same in both — dbmdir is fixed
       because its bar never flips, dbpaid is a declared pair. Everything else
       must genuinely move with the theme, or it is a literal that happens to
       suit one of them and will rot the moment the other is used. */
    if (s && !['dbmdir'].includes(k) && d.color === s.color && d.ground !== s.ground)
      f.push(`${k} paints ${d.color} in BOTH insurance themes — it is not reading a --ct-* token`);
  }

  /* 3 — the stage banner grounds on the darkened twin */
  const b = docket._banner;
  if (!b) f.push('the stage banner did not render (rig fault)');
  else {
    const hit = STAGE_INK.some(v => b.inline.toUpperCase().includes(v.toUpperCase()));
    if (!hit) f.push(`the stage banner grounds on ${b.inline.slice(0,40)} — not a STAGE_INK value`);
    if (b.ink && b.ink.ratio < b.ink.floor)
      f.push(`the stage banner title is ${b.ink.ratio}:1 (floor ${b.ink.floor})`);
  }

  /* 4 — retail is untouched: its identity block still paints the RETAIL inks */
  if (retail.heroNm && retail.heroNm.color !== 'rgb(255, 255, 255)')
    f.push(`retail's .heroNm moved to ${retail.heroNm.color} — this build must not touch retail`);
  if (retail.heroNm && retail.heroNm.ratio < retail.heroNm.floor)
    f.push(`retail's .heroNm is ${retail.heroNm.ratio}:1 — the fix leaked and broke retail`);

  return f;
}

const fails = await judge(FILE);
if (fails.length) {
  console.log(`GATE 1052 RED — ${fails.length} failure(s)`);
  fails.forEach(x => console.log('    ' + x));
} else {
  console.log('GATE 1052 GREEN — insurance identity reads in both themes, banner on STAGE_INK, retail untouched');
}
if (CONTROL && existsSync(CONTROL)) {
  const c = await judge(CONTROL);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${c.length} named failure(s) — ${c.length ? 'RED as expected' : '*** GREEN, THIS GATE PROVES NOTHING ***'}`);
  c.slice(0, 10).forEach(x => console.log('    control-fail ' + x));
  if (!c.length) process.exit(1);
}
process.exit(fails.length ? 1 : 0);
