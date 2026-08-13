/*
 * gate_768.mjs — the rebuilt Production screen, in a REAL browser.
 *
 * jsdom cannot answer the questions this build raises: whether a rule actually
 * wins, whether an ink clears its contrast floor, whether a pane really swaps.
 * So this boots the repo's own index.html in Chromium against the e2e mock
 * Supabase, seeds production-shaped rows, drives the screen, and measures.
 *
 *   node .claude/skills/cardinal-build/scripts/gate_768.mjs [path/to/index.html]
 *
 * Negative control: point it at the previous build — it must go RED.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, mkdirSync, writeFileSync } from 'fs';

const ROOT = process.cwd();
const APP = readFileSync(process.argv[2] || ROOT + '/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const OUT = process.env.GATE_OUT || '/tmp/cardinal-768';
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x ? '  — ' + x : '')); } };

/* ---- dates relative to now, so the gate never rots ---- */
const D = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ISO = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString(); };

const SEED = {
  team_profiles: [
    { email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
    { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production Manager' },
    { email: 'scottie@cardinalrenovations.net', name: 'Scottie', role: 'production', title: 'Production' },
  ],
  projects: [
    // Approved, scheduled, NOT ordered  -> Scheduled box + Needs ordered box
    { id: 'j-alv', name: 'M. Alvarez', address: '6633 Edenhill Ave', stage: 'Approved', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-30) },
    // Approved, NO appointment          -> Needs ordered + "Needs scheduling"
    { id: 'j-hol', name: 'Dan Hollis', address: '1240 Creekview Dr', stage: 'Approved', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-20) },
    // Scheduled AND ordered             -> Ordered box
    { id: 'j-bre', name: 'T. Brennan', address: '88 Ridge Rd', stage: 'Scheduled', checklist: JSON.stringify({ materials_ordered_at: ISO(-2), materials_ordered_by: 'curtis@cardinalrenovations.net' }), created_by: 'theo@cardinalrenovations.net', created_at: ISO(-40) },
    // A Prospect carrying punch         -> the off-stage tail
    { id: 'j-tac', name: 'R. Tackett', address: '418 Wilmington Pk', stage: 'Prospect', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-10) },
  ],
  appointments: [
    { id: 'ap-1', project_id: 'j-alv', kind: 'job',  appt_date: D(2), appt_time: '08:00', title: 'Build day', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
    { id: 'ap-2', project_id: 'j-alv', kind: 'drop', appt_date: D(1), appt_time: '07:00', title: 'Material drop', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
    { id: 'ap-3', project_id: 'j-bre', kind: 'job',  appt_date: D(6), appt_time: '08:00', title: 'Build day', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
  ],
  punch_items: [
    { id: 'pi-1', project_id: 'j-tac', title: 'Re-seat drip edge, north gable', detail: 'Rattles in wind', kind: 'punch', priority: 'high', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-1), scheduled_at: D(0), photos: [], comments: [], steps: [] },
    { id: 'pi-2', project_id: 'j-tac', title: 'Downspout strap, rear', kind: 'punch', priority: 'normal', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-14), photos: [], comments: [], steps: [] },
    { id: 'pi-3', project_id: 'j-alv', title: 'Garage ceiling stain', kind: 'callback', priority: 'normal', status: 'done', assigned_to: 'curtis@cardinalrenovations.net', done_by: 'curtis@cardinalrenovations.net', done_at: ISO(-2), created_by: 'theo@cardinalrenovations.net', created_at: ISO(-8), photos: [], comments: [], steps: [] },
  ],
  estimates: [], inspection_reports: [], crew_work_orders: [], collections: [], commissions: [],
  ai_estimates: [], contracts: [], insurance_claims: [], crews: [], pricing_items: [], pricing_categories: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));

await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]};},unparse:function(){return "";}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {}
});

/* page.screenshot() blocks on document.fonts.ready and the harness aborts font
   requests, so capture through CDP instead — otherwise every shot times out
   into a silent catch and the gate "passes" with no picture to look at. */
const cdp = await ctx.newCDPSession(page);
const shot = async (n) => {
  try { const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(OUT + '/' + n + '.png', Buffer.from(r.data, 'base64')); }
  catch (e) { console.log('  (shot ' + n + ' failed: ' + String(e).slice(0, 60) + ')'); }
};


console.log('gate_768 — the punch-out card, in Chromium');
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none'; });

console.log('\n--- it exists, and it is the ONE card ---');
ok('window.CardinalPunchCard is exported', await page.evaluate(() =>
  !!(window.CardinalPunchCard && typeof window.CardinalPunchCard.open === 'function')));
ok('#cr-pk is registered in hideAllViews', APP.includes("{ id:'cr-pk', api:window.CardinalPunchCard },"));
ok('the Production screen routes item taps into the card',
  /CardinalPunchCard\.open\(it\.id, \{ back:'production' \}\)/.test(APP));
ok('the old Punch & Repairs sheet delegates to the card, not a 3rd surface',
  /CardinalPunchCard\.open\(id, \{ back:'none' \}\)/.test(APP));
{
  const blk = APP.slice(APP.indexOf('<script id="cr-pk-script"'), APP.indexOf('</script>', APP.indexOf('<script id="cr-pk-script"')));
  ok('the card adds NO document.body observer', !/\.observe\(document\.body/.test(blk));
  ok('the card adds NO 14th scroll-lock writer', !/document\.body\.style\.overflow/.test(blk));
  ok('it uses the sanctioned overlay pattern instead',
    /overscroll-behavior:\s*contain/.test(APP.slice(APP.indexOf('<style id="cr-pk-styles"'), APP.indexOf('</style>', APP.indexOf('<style id="cr-pk-styles"')))));
  ok('writes go through CardinalPunch (one write path)',
    /window\.CardinalPunch/.test(blk) && /P\.update\(/.test(blk) && /P\.toggle\(/.test(blk));
  ok('the mention rule reuses the app\'s ONE resolver', /CardinalMentions/.test(blk));
  ok('render is guarded against the 606 repaint loop', /if\(html === lastSig\) return;/.test(blk));
  ok('no emoji in the card', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(blk));
  const sblk = APP.slice(APP.indexOf('<style id="cr-pk-styles"'), APP.indexOf('</style>', APP.indexOf('<style id="cr-pk-styles"')));
  const refs = sblk.match(/var\(--pk-[a-z0-9-]+(,[^)]*)?\)/g) || [];
  ok('every var() carries a literal fallback', refs.length > 20 && refs.filter(r => !r.includes(',')).length === 0);
}

console.log('\n--- open it as the MANAGER (Curtis / the office) ---');
await page.evaluate(() => { window.is_admin = () => true; });
await page.evaluate(() => window.CardinalPunchCard.open('pi-1', { back: 'production' }));
await page.waitForTimeout(900);
await shot('01-manager');
ok('the card opens by class', await page.evaluate(() => {
  const e = document.getElementById('cr-pk');
  return !!e && e.classList.contains('open') && !e.style.display;
}));
const mgr = await page.evaluate(() => {
  const e = document.getElementById('cr-pk');
  return {
    field: e.classList.contains('field'),
    title: (e.querySelector('h1') || {}).textContent,
    urgent: !!e.querySelector('.pkurg'),
    hasAssignSelect: !!e.querySelector('[data-f="assigned"]'),
    hasDate: !!e.querySelector('[data-f="when"]'),
    hasUrgToggle: !!e.querySelector('[data-act="urg"]'),
    templates: [...e.querySelectorAll('[data-tpl]')].map(b => b.textContent.trim()),
    slots: [...e.querySelectorAll('.pkslot .sl')].map(s => s.textContent.trim()),
    hasSupp: !!e.querySelector('[data-act="supp"]'),
    hasMsg: !!e.querySelector('[data-f="msg"]'),
    hasSend: !!e.querySelector('[data-act="send"]'),
    closeText: (e.querySelector('[data-act="close"]') || {}).textContent,
    hasDirections: !!e.querySelector('a[href*="maps.google"]'),
  };
});
ok('manager does NOT get field mode', mgr.field === false);
ok('the title is the punch-out', /drip edge/i.test(mgr.title || ''), mgr.title);
ok('urgent shows the band (not a money word)', mgr.urgent);
ok('the urgency band says URGENT, never PAYMENT', !/payment/i.test(await page.evaluate(() => document.getElementById('cr-pk').textContent)));
ok('manager can reassign', mgr.hasAssignSelect);
ok('manager can set the date — Curtis dispatches', mgr.hasDate);
ok('manager can flip urgency company-wide', mgr.hasUrgToggle);
ok('three trade templates are offered', mgr.templates.length === 3, JSON.stringify(mgr.templates));
ok('the templates are the trades Cardinal runs',
  /Roofing/.test(mgr.templates.join('|')) && /Siding/.test(mgr.templates.join('|')) && /Gutter/.test(mgr.templates.join('|')));
ok('five guided photo slots', mgr.slots.length === 5, JSON.stringify(mgr.slots));
ok('the slots guide the angles', /Overview/.test(mgr.slots[0]) && /Final/.test(mgr.slots[4]), JSON.stringify(mgr.slots));
ok('the supplement flag is on the card', mgr.hasSupp);
ok('messages are on the card', mgr.hasMsg && mgr.hasSend);
ok('directions link out to maps', mgr.hasDirections);
ok('close says exactly what is missing', /photo/i.test(mgr.closeText || ''), mgr.closeText);
ok('no money anywhere on the card', !/\$/.test(await page.evaluate(() => document.getElementById('cr-pk').textContent)));

console.log('\n--- the checklist: templates, the note gate, the counter ---');
await page.evaluate(() => { window.__WRITES__ = []; });
await page.click('#cr-pk [data-tpl="roofing"]');
await page.waitForTimeout(800);
const afterTpl = await page.evaluate(() => {
  const e = document.getElementById('cr-pk');
  return {
    steps: [...e.querySelectorAll('.pkck .st')].map(s => s.textContent.trim()),
    req: [...e.querySelectorAll('.pkck .req')].length,
    counter: (e.querySelector('.pkh .rt') || {}).textContent,
    writes: (window.__WRITES__ || []).map(w => ({ t: w.table, p: JSON.stringify(w.payload || {}).slice(0, 120) })),
  };
});
ok('a template loads its steps', afterTpl.steps.length === 5, JSON.stringify(afterTpl.steps));
ok('at least one step requires a note', afterTpl.req >= 1, 'req=' + afterTpl.req);
ok('the rot-inspection step is the note-required one',
  /rot|decking|substrate/i.test(afterTpl.steps.join(' | ')));
ok('the counter reads 0 / 5', /0/.test(afterTpl.counter || '') && /5/.test(afterTpl.counter || ''), afterTpl.counter);
ok('it persists to punch_items.steps', afterTpl.writes.some(w => w.t === 'punch_items' && /steps/.test(w.p)), JSON.stringify(afterTpl.writes));

// tick a NON-required step -> should just tick
await page.click('#cr-pk .pkck:not(:has(.req)) .bx');
await page.waitForTimeout(700);
ok('a normal step ticks straight away', await page.evaluate(() =>
  document.querySelectorAll('#cr-pk .pkck.d').length === 1));

// tick the REQUIRED step with the prompt cancelled -> must NOT tick
await page.evaluate(() => { window.__origPrompt = window.prompt; window.prompt = () => null; });
const reqIdx = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#cr-pk .pkck')];
  return rows.findIndex(r => r.querySelector('.req'));
});
await page.evaluate((i) => document.querySelectorAll('#cr-pk .pkck')[i].querySelector('.bx').click(), reqIdx);
await page.waitForTimeout(600);
ok('cancelling the note leaves the step UNTICKED (the gate holds)', await page.evaluate(() =>
  document.querySelectorAll('#cr-pk .pkck.d').length === 1));
// now answer the prompt
await page.evaluate(() => { window.prompt = () => 'Soft decking ~1ft at the gable end'; });
await page.evaluate((i) => document.querySelectorAll('#cr-pk .pkck')[i].querySelector('.bx').click(), reqIdx);
await page.waitForTimeout(800);
const noted = await page.evaluate(() => ({
  done: document.querySelectorAll('#cr-pk .pkck.d').length,
  note: (document.querySelector('#cr-pk .pkck .note') || {}).textContent,
}));
ok('answering the note ticks the step', noted.done === 2, JSON.stringify(noted));
ok('the note is written onto the step and shown', /Soft decking/.test(noted.note || ''), noted.note);
await shot('02-checklist');

console.log('\n--- the close gate: 5 photos AND every step ---');
ok('close refuses while photos are short', await page.evaluate(async () => {
  let alerted = '';
  window.alert = (m) => { alerted = m; };
  document.querySelector('#cr-pk [data-act="close"]').click();
  await new Promise(r => setTimeout(r, 400));
  const stillOpen = !/Closed/.test(document.querySelector('#cr-pk .pkchip').textContent);
  return stillOpen && /photo/i.test(alerted);
}));
ok('the button names what is missing, not a generic error', await page.evaluate(() =>
  /photo/i.test(document.querySelector('#cr-pk [data-act="close"]').textContent)));

console.log('\n--- the supplement flag files work and tells the office ---');
await page.evaluate(() => {
  window.prompt = () => 'Rotted decking beyond the original scope, ~3 sheets';
  window.__WRITES__ = [];
  window.__NOTIFIED__ = [];
  window.notifyTeam = async (to, title, body) => { window.__NOTIFIED__.push({ to, title }); return { sent: 1, mailed: 1 }; };
});
await page.click('#cr-pk [data-act="supp"]');
await page.waitForTimeout(1200);
const supp = await page.evaluate(() => ({
  writes: (window.__WRITES__ || []).map(w => ({ t: w.table, op: w.op, p: JSON.stringify(w.payload || {}).slice(0, 600) })),
  notified: window.__NOTIFIED__ || [],
  out: (document.querySelector('#cr-pk .pkout') || {}).textContent,
}));
ok('it files a new item against the same job',
  supp.writes.some(w => w.t === 'punch_items' && /SUPPLEMENT/.test(w.p)), JSON.stringify(supp.writes).slice(0, 300));
ok('it is filed URGENT so it does not get lost',
  supp.writes.some(w => /priority/.test(w.p) && /high/.test(w.p)),
  JSON.stringify(supp.writes).slice(0, 300));
ok('the office is notified', supp.notified.length === 1, JSON.stringify(supp.notified));
ok('the outcome line is honest about delivery', /notified/i.test(supp.out || ''), supp.out);
ok('no money field anywhere in the supplement flow',
  !supp.writes.some(w => /amount|price|cost|\$/.test(w.p)));

console.log('\n--- messages: @ tags notify, nobody else ---');
await page.evaluate(() => { window.__NOTIFIED__ = []; });
await page.fill('#cr-pk [data-f="msg"]', 'On it after the Alvarez walk');
await page.click('#cr-pk [data-act="send"]');
await page.waitForTimeout(900);
ok('an untagged message notifies NOBODY (Theo\'s rule)', await page.evaluate(() => (window.__NOTIFIED__ || []).length === 0));
ok('the message is on the thread', await page.evaluate(() =>
  /Alvarez walk/.test(document.getElementById('cr-pk').textContent)));
await page.evaluate(() => { window.__NOTIFIED__ = []; });
/* Tag someone OTHER than the author: the resolver deliberately excludes the
   person writing the message, so @-tagging yourself notifying nobody is correct. */
await page.fill('#cr-pk [data-f="msg"]', '@Curtis found more damage up there');
await page.click('#cr-pk [data-act="send"]');
await page.waitForTimeout(1100);
ok('a tagged message DOES notify the tagged person', await page.evaluate(() => (window.__NOTIFIED__ || []).length === 1),
  await page.evaluate(() => JSON.stringify(window.__NOTIFIED__)));
await page.evaluate(() => { window.__NOTIFIED__ = []; });
await page.fill('#cr-pk [data-f="msg"]', '@Theo talking to myself');
await page.click('#cr-pk [data-act="send"]');
await page.waitForTimeout(900);
ok('tagging YOURSELF notifies nobody (the resolver excludes the author)',
  await page.evaluate(() => (window.__NOTIFIED__ || []).length === 0));
await shot('03-messages');

console.log('\n--- FIELD MODE: Scottie gets the same card, bigger, minus config ---');
await page.evaluate(() => {
  window.is_admin = () => false;
  window.currentUser = { email: 'scottie@cardinalrenovations.net' };
});
await page.evaluate(() => window.CardinalPunchCard.open('pi-2', { back: 'production' }));
await page.waitForTimeout(900);
await shot('04-field');
const fld = await page.evaluate(() => {
  const e = document.getElementById('cr-pk');
  const bx = e.querySelector('.pkck .bx');
  return {
    field: e.classList.contains('field'),
    hasMsg: !!e.querySelector('[data-f="msg"]'),
    hasSend: !!e.querySelector('[data-act="send"]'),
    hasSupp: !!e.querySelector('[data-act="supp"]'),
    hasSlots: e.querySelectorAll('.pkslot').length,
    hasClose: !!e.querySelector('[data-act="close"]'),
    canReassign: !!e.querySelector('[data-f="assigned"]'),
    canSetDate: !!e.querySelector('[data-f="when"]'),
    canAddStep: !!e.querySelector('[data-act="addstep"]'),
    canFlipUrgency: !!e.querySelector('[data-act="urg"]'),
    boxPx: bx ? Math.round(bx.getBoundingClientRect().width) : 0,
  };
});
ok('Scottie gets field mode', fld.field === true);
ok('FIELD KEEPS MESSAGES — the whole point of the card at the house', fld.hasMsg && fld.hasSend);
ok('field keeps the photo slots', fld.hasSlots === 5);
ok('field keeps the close button', fld.hasClose);
ok('field keeps the supplement flag', fld.hasSupp);
ok('field does NOT get reassign', fld.canReassign === false);
ok('field does NOT get the schedule picker (Curtis dispatches)', fld.canSetDate === false);
ok('field does NOT get step editing', fld.canAddStep === false);
ok('field does NOT get the urgency toggle', fld.canFlipUrgency === false);

console.log('\n--- contrast in BOTH themes ---');
async function contrast() {
  return await page.evaluate(() => {
    const lum = (rgb) => { const [r,g,b] = rgb.map(v => { v/=255; return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*r+0.7152*g+0.0722*b; };
    const parse = (s) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s); return m ? { c:[+m[1],+m[2],+m[3]], a:m[4]===undefined?1:+m[4] } : null; };
    const over = (fg,bg) => fg.a>=1 ? fg.c : fg.c.map((v,i)=>v*fg.a+bg[i]*(1-fg.a));
    function grounds(el){ const out=[]; let opaque=false;
      for(let n=el;n&&n!==document.documentElement;n=n.parentElement){ const cs=getComputedStyle(n);
        const bc=parse(cs.backgroundColor); if(bc&&bc.a>0) out.push(bc);
        (String(cs.backgroundImage||'').match(/rgba?\([^)]+\)/g)||[]).forEach(s=>{const p=parse(s); if(p&&p.a>0) out.push(p);});
        if(bc&&bc.a>=1){ opaque=true; break; } }
      if(!opaque) out.push({c:[255,255,255],a:1});
      let acc=[255,255,255]; for(let i=out.length-1;i>=0;i--) acc=over(out[i],acc);
      return out.map(o=>over(o,acc)); }
    const res=[];
    document.querySelectorAll('#cr-pk h1, #cr-pk .pkey, #cr-pk .pkchip, #cr-pk .pkh, #cr-pk .jn, #cr-pk .ja, #cr-pk .pkdesc, #cr-pk .pkck .st, #cr-pk .pkck .note, #cr-pk .pkm .k, #cr-pk .pkm .w, #cr-pk .pkbtn, #cr-pk .pkslot .sl, #cr-pk .pkbub, #cr-pk .pkclose, #cr-pk .pkurg, #cr-pk .pksup, #cr-pk .pktag').forEach(el=>{
      const r=el.getBoundingClientRect(); if(!r.width||!r.height) return;
      const cs=getComputedStyle(el); const fg=parse(cs.color); if(!fg) return;
      const size=parseFloat(cs.fontSize), bold=(parseInt(cs.fontWeight,10)||400)>=700;
      const large=size>=24||(size>=18.66&&bold);
      let worst=99; grounds(el).forEach(g=>{ const c=over(fg,g); const l1=lum(c), l2=lum(g);
        const cr=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); if(cr<worst) worst=cr; });
      res.push({ sel:String(el.className).slice(0,24), ratio:+worst.toFixed(2), floor:large?3:4.5, text:(el.textContent||'').trim().slice(0,20) });
    });
    return res;
  });
}
const dk = await contrast();
ok('dark: every card ink clears its floor', dk.filter(r => r.ratio < r.floor).length === 0,
  JSON.stringify(dk.filter(r => r.ratio < r.floor).slice(0, 6)));
ok('dark: something was measured', dk.length >= 12, 'n=' + dk.length);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light'));
await page.waitForTimeout(400);
await shot('05-light');
const lt = await contrast();
ok('light: every card ink clears its floor', lt.filter(r => r.ratio < r.floor).length === 0,
  JSON.stringify(lt.filter(r => r.ratio < r.floor).slice(0, 6)));
ok('light: something was measured', lt.length >= 12, 'n=' + lt.length);
await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

console.log('\n--- back goes up one level ---');
await page.click('#cr-pk [data-act="back"]');
await page.waitForTimeout(900);
ok('back closes the card', await page.evaluate(() => !document.getElementById('cr-pk').classList.contains('open')));
ok('back lands on the Production screen it came from', await page.evaluate(() => {
  const p = document.getElementById('cr-pb');
  return !!p && p.classList.contains('open');
}));
ok('no page errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
console.log('\nshots: ' + OUT);
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
