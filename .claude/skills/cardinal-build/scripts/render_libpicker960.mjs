/* render_libpicker960.mjs — Add-from-Library sections (build 960).

   ⚠ NAMING: gate_960.mjs is NOT this build. It belongs to the cron fail-closed
   change, which took no build number because index.html was untouched. This is
   a render_* because only a real engine settles a colour and a cascade — and
   this surface is painted by cr-nvl-styles, NOT by cr-est-styles, which is
   where every one of these rules would have been a silent no-op.

   Seeds estimate_line_items across four categories (one of them unknown to the
   colour map), opens a real estimate editor, opens the picker, and reads
   computed style:

     1  sections render as .cat > .cat-header(button) + .cat-body
     2  each header carries name, chevron SVG, and a count matching its body
     3  categories are visibly DIFFERENT from each other — ≥3 distinct name
        colours, and the stripe matches the name on every one
     4  every name colour clears 4.5:1 against its own header ground
     5  the known trades land on their mapped colour slots (roofing 0, gutters 2)
     6  an UNKNOWN category still gets a colour, and the same one twice
     7  tap a header -> body hidden, aria-expanded=false, chevron rotated
     8  tap again -> open
     9  the fold SURVIVES closing and reopening the picker
    10  a search force-opens a folded section that holds a match
    11  a fold made DURING a search is not recorded (it would strand a section)
    12  the price ink is legible on the dark sheet (was 2.16:1 at 959)
    13  tapping an item still adds the line — the old behaviour, unbroken

   Usage: node render_libpicker960.mjs [path] — previous build = negative
   control; must go RED with named failures and MUST NOT crash. */
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

/* four categories: three the colour map knows, one it does not */
const EXTRA = `(function(){ try{
  var S = window.__SEED__; if(!S) return;
  function it(id, cat, name, price, unit){
    return { id:id, category:cat, name:name, description:name+' — seeded for the gate',
             default_price:price, unit:unit, active:true, sort_order:1 }; }
  S.estimate_line_items = [
    it('li1','Roofing','OC Duration Tear-off',  450, 'SQ'),
    it('li2','Roofing','Ridge Vent',              12, 'LF'),
    it('li3','Gutters','6\\" K-Style Seamless',   9.5, 'LF'),
    it('li4','Siding', 'LP SmartSide',           7.25,'SQFT'),
    it('li5','Decking','Composite Deck Board',   14,  'LF'),
    it('li6','Decking','Deck Railing',           38,  'LF')
  ];
}catch(e){} })();`;

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

async function boot(){
  const page=await browser.newPage({viewport:{width:414,height:896}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.addInitScript(EXTRA);
  await page.addInitScript(`try{ localStorage.removeItem('cr-est-libfold'); }catch(e){}`);
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  await page.evaluate(async ()=>{
    ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    if(window.CardinalLineItems && window.CardinalLineItems.load) await window.CardinalLineItems.load();
    const p=(window.cacheProjects||[])[0];
    if(window.CardinalEstimates && window.CardinalEstimates.openEditor && p) await window.CardinalEstimates.openEditor(p);
  });
  await page.waitForTimeout(1200);
  return page;
}
async function openPicker(page){
  await page.evaluate(()=>{ const b=document.querySelector('[data-act="add-lib"]'); if(b) b.click(); });
  await page.waitForTimeout(600);
}
const READ = () => {
  const pk=document.getElementById('cr-est-picker');
  if(!pk || !pk.classList.contains('open')) return null;
  const cats=[...pk.querySelectorAll('.cat')].map(c=>{
    const h=c.querySelector('.cat-header'), body=c.querySelector('.cat-body');
    const cn=h?h.querySelector('.cn'):null, cc=h?h.querySelector('.cc'):null;
    const chev=h?h.querySelector('.chev'):null;
    const hs=h?getComputedStyle(h):null;
    return {
      name: cn?cn.textContent.trim():'(no .cn)',
      ci: c.getAttribute('data-ci'),
      closed: c.classList.contains('closed'),
      expanded: h?h.getAttribute('aria-expanded'):null,
      isButton: !!(h && h.tagName==='BUTTON'),
      hasBody: !!body,
      bodyShown: body ? getComputedStyle(body).display !== 'none' : null,
      items: body ? body.querySelectorAll('.p-item').length : 0,
      count: cc?cc.textContent.trim():null,
      chevSvg: !!(chev && chev.querySelector('svg')),
      chevRot: chev?getComputedStyle(chev).transform:null,
      nameColor: cn?getComputedStyle(cn).color:null,
      stripe: h?getComputedStyle(h,'::before').backgroundColor:null,
      ground: hs?hs.backgroundColor:null
    };
  });
  const price=pk.querySelector('.p-item .price');
  const list=pk.querySelector('.box-list');
  return { cats, nCat:cats.length,
    priceColor: price?getComputedStyle(price).color:null,
    listBg: list?getComputedStyle(list).backgroundColor:null };
};
function lum(rgb){ const m=String(rgb).match(/[\d.]+/g); if(!m) return null;
  const c=m.slice(0,3).map(x=>{ const v=+x/255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); });
  return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
function ratio(a,b){ const la=lum(a), lb=lum(b); if(la==null||lb==null) return 0;
  const hi=Math.max(la,lb), lo=Math.min(la,lb); return (hi+.05)/(lo+.05); }

/* ── A: structure, colour, contrast ── */
{
  const page=await boot();
  await openPicker(page);
  const f=await page.evaluate(READ);

  need('1 sections are .cat > button.cat-header + .cat-body',
       !!(f && f.nCat>=4 && f.cats.every(c=>c.isButton && c.hasBody)),
       f?(f.nCat+' section(s); buttons='+f.cats.filter(c=>c.isButton).length+' bodies='+f.cats.filter(c=>c.hasBody).length):'picker never opened');

  need('2 each header has a name, a chevron and a matching count',
       !!(f && f.cats.length && f.cats.every(c=>c.name && c.chevSvg && String(c.items)===String(c.count))),
       f?JSON.stringify(f.cats.map(c=>({n:c.name,cnt:c.count,items:c.items,chev:c.chevSvg}))):'no picker');

  const colors = f ? [...new Set(f.cats.map(c=>c.nameColor))] : [];
  need('3 the categories are visibly different from one another',
       !!(f && colors.length>=3 && f.cats.every(c=>c.nameColor===c.stripe)),
       f?(colors.length+' distinct name colour(s): '+colors.join(' | ')+
          ' · stripe matches name on '+f.cats.filter(c=>c.nameColor===c.stripe).length+'/'+f.nCat):'no picker');

  const bad = f ? f.cats.filter(c=>ratio(c.nameColor,c.ground)<4.5) : [{name:'(no picker)'}];
  need('4 every category name clears 4.5:1 on its own ground',
       !!(f && bad.length===0),
       f?bad.map(c=>c.name+' '+ratio(c.nameColor,c.ground).toFixed(2)+':1 on '+c.ground).join(' · '):'no picker');

  const byName = {}; (f?f.cats:[]).forEach(c=>{ byName[c.name.toLowerCase()]=c; });
  need('5 known trades land on their mapped colour slots',
       !!(byName.roofing && byName.roofing.ci==='0' && byName.gutters && byName.gutters.ci==='2'
          && byName.siding && byName.siding.ci==='1'),
       'roofing=' + (byName.roofing&&byName.roofing.ci) + ' siding=' + (byName.siding&&byName.siding.ci) +
       ' gutters=' + (byName.gutters&&byName.gutters.ci));

  const unk = byName.decking;
  need('6 an unknown category still gets a colour',
       !!(unk && unk.ci !== null && unk.nameColor && ratio(unk.nameColor, unk.ground)>=4.5),
       unk?('ci='+unk.ci+' '+unk.nameColor+' '+ratio(unk.nameColor,unk.ground).toFixed(2)+':1'):'Decking section missing');

  need('12 the price is legible on the dark sheet',
       !!(f && f.priceColor && ratio(f.priceColor, f.listBg)>=4.5),
       f?(f.priceColor+' on '+f.listBg+' = '+ratio(f.priceColor,f.listBg).toFixed(2)+':1'):'no picker');
  await page.context().close();
}

/* ── B: folding, persistence, search ── */
{
  const page=await boot();
  await openPicker(page);

  const tap = async (name)=> page.evaluate((n)=>{
    for(const h of document.querySelectorAll('#cr-est-picker .cat-header'))
      if((h.getAttribute('data-cath')||'').toLowerCase()===n){ h.click(); return true; }
    return false;
  }, name);

  const t1 = await tap('roofing'); await page.waitForTimeout(300);
  let f = await page.evaluate(READ);
  let r = f && f.cats.find(c=>c.name.toLowerCase()==='roofing');
  need('7 a tap folds the section shut',
       !!(t1 && r && r.closed && r.bodyShown===false && r.expanded==='false' && /matrix/.test(r.chevRot||'')),
       r?('closed='+r.closed+' shown='+r.bodyShown+' aria='+r.expanded+' chev='+r.chevRot):'no roofing section');

  await tap('roofing'); await page.waitForTimeout(300);
  f = await page.evaluate(READ); r = f && f.cats.find(c=>c.name.toLowerCase()==='roofing');
  need('8 a second tap opens it', !!(r && !r.closed && r.bodyShown===true),
       r?('closed='+r.closed+' shown='+r.bodyShown):'no roofing section');

  /* fold it, close the sheet, open it again */
  await tap('roofing'); await page.waitForTimeout(250);
  await page.evaluate(()=>{ const b=document.querySelector('#cr-est-picker [data-act="close"]'); if(b) b.click(); });
  await page.waitForTimeout(350);
  await openPicker(page);
  f = await page.evaluate(READ); r = f && f.cats.find(c=>c.name.toLowerCase()==='roofing');
  need('9 the fold survives closing and reopening the sheet',
       !!(r && r.closed && r.bodyShown===false),
       r?('closed='+r.closed+' shown='+r.bodyShown):'no roofing section');

  /* searching must not leave results hidden inside a folded section */
  await page.evaluate(()=>{ const i=document.querySelector('#cr-est-picker .box-search input');
    if(i){ i.value='ridge'; i.dispatchEvent(new Event('input',{bubbles:true})); } });
  await page.waitForTimeout(400);
  f = await page.evaluate(READ); r = f && f.cats.find(c=>c.name.toLowerCase()==='roofing');
  need('10 a search force-opens the folded section holding the match',
       !!(r && !r.closed && r.bodyShown===true && r.items>=1),
       r?('closed='+r.closed+' shown='+r.bodyShown+' items='+r.items):'roofing not in the results');

  /* A fold made mid-search must not be written down. Aim this at a section
     that has NEVER been folded — Roofing was legitimately folded at step 9, so
     finding it in storage proves nothing either way. The first version of this
     assertion did exactly that and failed correct code. */
  await tap('gutters'); await page.waitForTimeout(250);
  const stored = await page.evaluate(()=>{ try{ return localStorage.getItem('cr-est-libfold'); }catch(e){ return 'ERR'; } });
  need('11 a fold made during a search is not recorded',
       stored !== 'ERR' && !/gutters/i.test(String(stored||'')),
       'cr-est-libfold = ' + stored + ' (Roofing in there is correct — folded before the search)');
  await page.context().close();
}

/* ── C: the old behaviour still works ── */
{
  const page=await boot();
  await openPicker(page);
  const before=await page.evaluate(()=>document.querySelectorAll('#cr-est-view .ln, #cr-est-view [data-lid]').length);
  const added=await page.evaluate(()=>{
    const it=document.querySelector('#cr-est-picker .cat-body .p-item');
    if(!it) return false; it.click(); return true; });
  await page.waitForTimeout(600);
  const st=await page.evaluate(()=>{
    const s=window.CardinalEstimates && window.CardinalEstimates.currentState && window.CardinalEstimates.currentState();
    /* currentState() publishes `line_items`, not `lines` — the internal name is
       not the exported one, and reading the wrong key reports a working feature
       as broken. */
    return { lines: s && s.line_items ? s.line_items.length : null,
      open: !!(document.getElementById('cr-est-picker')||{classList:{contains:()=>false}}).classList.contains('open') };
  });
  need('13 tapping an item still adds the line and closes the sheet',
       !!(added && st && st.lines>0 && !st.open),
       'clicked=' + added + ' lines=' + (st&&st.lines) + ' picker still open=' + (st&&st.open) + ' (before=' + before + ')');
  await page.context().close();
}

await browser.close();
console.log('\nrender_libpicker960 ['+LABEL+'] '+FILE);
console.log('  passed: '+passes+'   failed: '+fails.length);
fails.forEach(f=>console.log('  FAIL  '+f));
console.log(fails.length? '\nRED' : '\nGREEN — 13/13');
process.exit(fails.length?1:0);
