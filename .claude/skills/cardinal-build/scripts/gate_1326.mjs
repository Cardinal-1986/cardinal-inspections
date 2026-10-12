/* gate_1326 — Theo's two screenshots, 12 Oct 2026.
 *   A  New lead, Street, Google live (stubbed): the request leans toward Dayton (locationBias), the pick
 *      splits into Street / City / State / Zip, and the Photon fallback never fires
 *   B  Google unavailable (no key): the Photon fallback still answers
 *   C  the Location Information rule runs UNDER its wrapped hint at 390px, not through it
 *   D  Communications: the @name chips are dark ink on the cream chat box, >= 4.5:1, dark AND light
 * Arg: [index.html] -> negative control (1325: must go RED, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }, { email: 'joan@cardinalrenovations.net', name: 'Joan Hunt', role: 'admin', title: 'Office' }],
  projects: [{ id: 'o1', name: 'Client o1', stage: 'Lead', address: '1 Main St', phone: '', email: '', checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }],
  inspection_reports: [], estimates: [], collections: [], appointments: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
/* Google Places, stubbed to the 2024 library's shape — the real acFetch / acChoose / crAddrApply run on it */
const GSTUB = `(function(){
  var comps = [
    { types:['street_number'], longText:'1632', shortText:'1632' },
    { types:['route'], longText:'East 5th Street', shortText:'E 5th St' },
    { types:['locality'], longText:'Dayton', shortText:'Dayton' },
    { types:['administrative_area_level_1'], longText:'Ohio', shortText:'OH' },
    { types:['postal_code'], longText:'45403', shortText:'45403' }
  ];
  function place(){
    return { formattedAddress:'1632 East 5th Street, Dayton, OH 45403, USA', location:{ lat:39.76, lng:-84.17 },
             addressComponents:comps, fetchFields: async function(){ return {}; } };
  }
  var pred = { mainText:{ text:'1632 East 5th Street' }, secondaryText:{ text:'Dayton, OH, USA' }, toPlace: place };
  window.google = { maps: { places: {
    AutocompleteSessionToken: function(){},
    AutocompleteSuggestion: {
      fetchAutocompleteSuggestions: async function(req){
        (window.__GREQ__ = window.__GREQ__ || []).push(req);
        return { suggestions: [ { placePrediction: pred } ] };
      }
    }
  } } };
})();`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
async function boot(withKey, light){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => d.accept());
  const hits = { photon: 0 };
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.includes('photon.komoot.io')) { hits.photon++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ features: [{ properties: { countrycode: 'US', housenumber: '9', street: 'Fallback Rd', city: 'Xenia', state: 'Ohio', postcode: '45385' } }] }) }); }
    if (url.startsWith('https://app.cardinalroster.com/api/config')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(withKey ? { googleMapsKey: 'test-key' } : {}) });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (url.includes('maps.googleapis.com')) return route.abort();
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(([seed, light]) => { window.__SEED__ = JSON.parse(JSON.stringify(seed)); try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {} }, [SEED, light]);
  if (withKey) await page.addInitScript(GSTUB);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
  await page.waitForTimeout(900);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.waitForTimeout(400); await settle(page);
  return { ctx, page, hits };
}
const openLead = page => page.evaluate(async () => { try { openLeadForm(); } catch (e) {} await new Promise(r => setTimeout(r, 700)); return !!document.getElementById('ldStreet'); });
const lum = c => { const m = (c || '').match(/\d+(\.\d+)?/g); if (!m) return 0; const v = m.slice(0, 3).map(x => { x = x / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
try {
  let { ctx, page, hits } = await boot(true, false);
  await openLead(page);
  await page.focus('#ldStreet'); await page.waitForTimeout(600);
  await page.type('#ldStreet', '1632 e 5th', { delay: 40 }); await page.waitForTimeout(1200);
  const A1 = await page.evaluate(() => { const rq = (window.__GREQ__ || []).slice(-1)[0] || null; const row = document.querySelector('.cr-acbox [data-aci]');
    return { asked: !!rq, bias: rq && rq.locationBias ? rq.locationBias : null, row: row ? row.textContent : '' }; });
  const row = await page.$('.cr-acbox [data-aci]'); if (row) { await row.dispatchEvent('mousedown'); await row.click(); }
  await page.waitForTimeout(900);
  const A2 = await page.evaluate(() => ({ street: document.getElementById('ldStreet').value, city: document.getElementById('ldCity').value, state: document.getElementById('ldState').value, zip: document.getElementById('ldZip').value, sugg: getComputedStyle(document.getElementById('ldSugg')).display }));
  const near = A1.bias && A1.bias.center && Math.abs(A1.bias.center.lat - 39.76) < 0.2 && Math.abs(A1.bias.center.lng + 84.19) < 0.2;
  ok(A1.asked && near && /Dayton/.test(A1.row) && A2.street === '1632 East 5th Street' && A2.city === 'Dayton' && A2.state === 'OH' && A2.zip === '45403' && hits.photon === 0 && A2.sugg === 'none',
     'A  Google live: leans toward Dayton, the pick splits into Street / City / State / Zip, Photon never fires', JSON.stringify({ A1, A2, photon: hits.photon }));
  const C = await page.evaluate(() => { const h = [...document.querySelectorAll('.ldhead')].find(x => /Location Information/.test(x.textContent)); const r = h && h.querySelector('.ldreq');
    if (!h || !r) return null; const hb = h.getBoundingClientRect(), rb = r.getBoundingClientRect(); return { headBottom: Math.round(hb.bottom), hintBottom: Math.round(rb.bottom), hintTop: Math.round(rb.top), headTop: Math.round(hb.top) }; });
  ok(!!C && C.hintBottom <= C.headBottom - 2, 'C  the Location Information rule runs under its wrapped hint at 390px', JSON.stringify(C));
  await ctx.close();
  ({ ctx, page, hits } = await boot(false, false));
  await openLead(page);
  await page.focus('#ldStreet'); await page.waitForTimeout(600);
  await page.type('#ldStreet', '9 Fallback', { delay: 40 }); await page.waitForTimeout(1400);
  const B = await page.evaluate(() => { const b = document.getElementById('ldSugg'); return { shown: getComputedStyle(b).display, txt: b.textContent }; });
  ok(hits.photon > 0 && B.shown === 'block' && /Fallback/.test(B.txt), 'B  no Google key: the Photon fallback still answers', JSON.stringify({ photon: hits.photon, B }));
  await ctx.close();
  const D = [];
  for (const light of [false, true]) {
    ({ ctx, page } = await boot(false, light));
    const r = await page.evaluate(async () => { openProject('o1'); await new Promise(r => setTimeout(r, 1200)); openCommunications(); await new Promise(r => setTimeout(r, 700));
      const b = document.querySelector('#chatTagRow .chipbtn'), box = document.querySelector('#commsView .chatbox');
      return b && box ? { ink: getComputedStyle(b).color, ground: getComputedStyle(box).backgroundColor, h: Math.round(b.getBoundingClientRect().height) } : null; });
    D.push(r ? Object.assign(r, { theme: light ? 'light' : 'dark', ratio: ratio(r.ink, r.ground) }) : null);
    await ctx.close();
  }
  ok(D.every(x => x && x.ratio >= 4.5 && x.h >= 44), 'D  the @name chips read at >= 4.5:1 on the chat box, dark and light, 44px tall', JSON.stringify(D));
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1326: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
