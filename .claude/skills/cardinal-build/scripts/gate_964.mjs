/* gate_964.mjs — siding and gutter agreements get catalog dropdowns.

   The roofing agreement has had real pickers since 750. Siding and gutters had
   none: 91 free-text boxes between them. Seventeen are now <select class="crsel">
   fed from `materials`.

     1  the templates carry the new pickers, and the roofing one is untouched
     2  `materials` has exactly ONE reader in index.html
     3  the filter is status='current' — NOT 'active', which matches no row and
        would ship four empty dropdowns looking like a working build
     4  siding colours arrive GROUPED by manufacturer · line (84 of them)
     5  gutter colours arrive grouped too
     6  brand and profile lists are de-duplicated
     7  trim and qty kinds still work — the roofing lists are not disturbed
     8  choosing writes the `selected` ATTRIBUTE, so the choice survives the
        clone that saves a contract (750's rule, and the one that silently
        loses a colour if forgotten)
     9  a select that already has options is NOT refilled — a signed contract
        keeps the catalogue it was offered

   Usage: node gate_964.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash. */
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
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

/* ── 1 + 2 + 3: read off the artifact, no browser needed ── */
{
  const kinds = {};
  for(const m of APP.matchAll(/data-crsel="([a-z]+)"/g)) kinds[m[1]] = (kinds[m[1]]||0)+1;
  need('1 the new picker kinds are in the templates',
       (kinds.sbrand>=1 && kinds.sline>=1 && kinds.scolor>=1 && kinds.gcolor>=3 &&
        (kinds.occ||0)>=1 && (kinds.style||0)>=1),
       JSON.stringify(kinds));
  const readers = (APP.match(/from\('materials'\)/g)||[]).length;
  need('2 materials has exactly one reader', readers===1, readers+' reader(s)');
  need("3 the filter is status='current'",
       /\.eq\('status'\s*,\s*'current'\)/.test(APP) && !/\.eq\('status'\s*,\s*'active'\)/.test(APP),
       /current/.test(APP) ? 'current present; active present = ' + /\.eq\('status','active'\)/.test(APP) : 'no status filter found');
}

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

/* the real catalogue's shape, trimmed: two siding lines, one gutter line */
const EXTRA = `(function(){ try{
  var S = window.__SEED__; if(!S) return;
  function m(cat,mfr,line,color,so){ return { id:cat+mfr+line+color, category:cat, manufacturer:mfr,
    product_line:line, color_name:color, status:'current', sort_order:so||0 }; }
  S.materials = [
    m('siding','Mastic','Carvedwood','Almond',1),
    m('siding','Mastic','Carvedwood','Woodland Retreat',2),
    m('siding','Mastic','Quest','White',1),
    m('siding','James Hardie','HardiePlank Lap','Aged Pewter',1),
    m('siding','James Hardie','HardiePlank Lap','Timber Bark',2),
    m('gutters','Cardinal','Seamless Aluminum 6" K-Style','Almond',1),
    m('gutters','Cardinal','Seamless Aluminum 6" K-Style','White',2),
    m('gutters','Ply Gem Performance Metals','Trim Coil','Musket Brown',1),
    /* a row that must NEVER appear: retired, and roofing is not this table's job */
    { id:'x1', category:'siding', manufacturer:'Gone', product_line:'Retired',
      color_name:'Should Not Appear', status:'retired', sort_order:9 }
  ];
}catch(e){} })();`;

const page=await browser.newPage({viewport:{width:1194,height:834}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.addInitScript(EXTRA);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* Drive the SHIPPED function against the real data shape, in a document built
   exactly the way the templates build one. */
const out = await page.evaluate(async ()=>{
  if(typeof window.wireColorSelects !== 'function') return { noFn:true };
  const host = document.createElement('div');
  host.style.display='none';
  function s(kind){ return '<select class="crsel" data-crsel="'+kind+'" aria-label="'+kind+'">'+
    '<option value="">— select —</option></select>'; }
  host.innerHTML = s('scolor')+s('gcolor')+s('sbrand')+s('sline')+s('trim')+s('qty')+
    '<select class="crsel" data-crsel="scolor" id="prefilled">'+
    '<option value="">— select —</option><option value="Frozen Colour" selected>Frozen Colour</option></select>';
  document.body.appendChild(host);
  await window.wireColorSelects(document);
  const get = k => host.querySelector('select[data-crsel="'+k+'"]');
  function read(el){
    if(!el) return null;
    return {
      groups: [...el.querySelectorAll('optgroup')].map(g=>g.label),
      opts: [...el.querySelectorAll('option')].map(o=>o.value).filter(Boolean),
    };
  }
  const scolor = read(get('scolor')), gcolor = read(get('gcolor'));
  const sbrand = read(get('sbrand')), sline = read(get('sline'));
  const trim = read(get('trim')), qty = read(get('qty'));

  /* choosing must write the ATTRIBUTE, or the clone that saves loses it */
  const el = get('scolor');
  el.value = 'Timber Bark';
  el.dispatchEvent(new Event('change', {bubbles:true}));
  const clone = el.cloneNode(true);
  const attrKept = !!clone.querySelector('option[selected]');
  const attrValue = attrKept ? clone.querySelector('option[selected]').value : null;
  const onlyOne = clone.querySelectorAll('option[selected]').length;

  const pre = document.getElementById('prefilled');
  const preOpts = [...pre.querySelectorAll('option')].map(o=>o.value).filter(Boolean);

  host.remove();
  return { scolor, gcolor, sbrand, sline, trim, qty, attrKept, attrValue, onlyOne, preOpts };
});

need('4 siding colours arrive grouped by manufacturer · line',
     !!(out && out.scolor && out.scolor.groups.length>=3 &&
        out.scolor.groups.some(g=>/Mastic · Carvedwood/.test(g)) &&
        out.scolor.opts.includes('Timber Bark') &&
        !out.scolor.opts.includes('Should Not Appear')),
     out&&out.scolor ? JSON.stringify(out.scolor) : (out&&out.noFn ? 'wireColorSelects is not a global' : 'nothing'));
need('5 gutter colours arrive grouped too',
     !!(out && out.gcolor && out.gcolor.groups.length>=2 && out.gcolor.opts.includes('Musket Brown')),
     out&&out.gcolor ? JSON.stringify(out.gcolor) : 'nothing');
need('6 brand and profile lists are de-duplicated',
     !!(out && out.sbrand && out.sbrand.opts.filter(v=>v==='Mastic').length===1 &&
        out.sbrand.opts.includes('Other (see notes)') &&
        out.sline && out.sline.opts.filter(v=>/Carvedwood/.test(v)).length===1),
     out&&out.sbrand ? 'brands='+JSON.stringify(out.sbrand.opts)+' lines='+JSON.stringify(out.sline.opts) : 'nothing');
need('7 the existing trim and qty kinds still fill',
     !!(out && out.trim && out.trim.opts.includes('White') && out.qty && out.qty.opts.includes('3')),
     out&&out.trim ? 'trim='+out.trim.opts.length+' qty='+out.qty.opts.length : 'nothing');
need('8 a choice writes the selected ATTRIBUTE and survives the clone',
     !!(out && out.attrKept && out.attrValue==='Timber Bark' && out.onlyOne===1),
     out ? 'kept='+out.attrKept+' value='+out.attrValue+' count='+out.onlyOne : 'nothing');
need('9 an already-filled select is left alone',
     !!(out && out.preOpts && out.preOpts.length===1 && out.preOpts[0]==='Frozen Colour'),
     out ? JSON.stringify(out.preOpts) : 'nothing');

await browser.close();
console.log('\ngate_964 ['+LABEL+'] '+FILE);
console.log('  passed: '+passes+'   failed: '+fails.length);
fails.forEach(f=>console.log('  FAIL  '+f));
console.log(fails.length? '\nRED' : '\nGREEN — 9/9');
process.exit(fails.length?1:0);
