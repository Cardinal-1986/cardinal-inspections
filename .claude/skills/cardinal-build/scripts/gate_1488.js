// jsdom gate for build 1488: Recent leads "To call" (Option A)
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const file = process.argv[2] || '../index_v1488.html';
const html = fs.readFileSync(file, 'utf8');
const vc = new VirtualConsole();
const realErrors = [];
vc.on('jsdomError', e => { const m = String(e && e.message || e); if (!/Not implemented|canvas|scrollTo|matchMedia|getContext/i.test(m)) realErrors.push(m.slice(0, 200)); });
const DAY = 86400000, now = Date.now();
const iso = d => new Date(now - d * DAY).toISOString();
const projects = [
  { id: 'p1', name: 'Old Lead', stage: 'Lead', phone: '(937) 555-0101', city: 'Xenia', created_at: iso(30), checklist: JSON.stringify({ po: 1381, stage_since: iso(30) }) },
  { id: 'p2', name: 'Commented Lead', stage: 'Lead', phone: '9375550102', city: 'Dayton', created_at: iso(40), checklist: JSON.stringify({ po: 1382, stage_since: iso(40), comments: [{ at: iso(2), by: 'x', name: 'x', text: 'called' }] }) },
  { id: 'p3', name: 'Mid Lead', stage: 'Lead', phone: '', city: 'Beavercreek', created_at: iso(9), checklist: JSON.stringify({ po: 1383, stage_since: iso(9) }) },
  { id: 'p4', name: 'A Prospect', stage: 'Prospect', phone: '9375550104', city: 'Fairborn', created_at: iso(50), checklist: JSON.stringify({ stage_since: iso(50) }) },
];
const opened = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', url: 'https://app.cardinalroster.com/', virtualConsole: vc, pretendToBeVisual: true,
  beforeParse(w) {
    Object.defineProperty(w.HTMLElement.prototype, 'offsetParent', { get() { return this.parentNode; } });
    const chain = new Proxy(function () {}, { get: (t, p) => p === 'then' ? (res) => res({ data: [], error: null }) : () => chain, apply: () => chain });
    Object.defineProperty(w, 'supa', { value: chain, writable: false });
    w.sb = chain;
    w.scrollTo = () => {};
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  }
});
const w = dom.window;
let fails = 0;
const check = (label, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) fails++; };
setTimeout(() => {
  try {
    w.cacheProjects = projects;
    w.cacheAppts = [];
    Object.defineProperty(w, 'openProject', { value: id => opened.push(id), writable: true });
    w.sessionStorage.removeItem('kpLeadMode');
    check('real renderer exists', typeof w.renderKpHomeRow === 'function');
    w.renderKpHomeRow();
    const seg = w.document.getElementById('kpLeadSeg');
    check('toggle sits inside the Recent leads title', !!seg && seg.parentElement.classList.contains('pipetitle') && seg.parentElement.textContent.includes('Recent leads'));
    const btns = [...seg.querySelectorAll('button[data-kpm]')];
    check('two buttons: Newest (on) and To call · 3', btns.length === 2 && btns[0].matches('.on') && btns[0].textContent === 'Newest' && btns[1].textContent === 'To call · 3');
    const lm = w.document.getElementById('kpLeadsList');
    check('default view is unchanged (newest, no call rows)', lm.querySelectorAll('.kpcallrow').length === 0 && lm.querySelectorAll('.kplrow').length === 4);
    btns[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const rows = [...lm.querySelectorAll('.kpcallrow')];
    check('To call shows Leads only (Prospect excluded)', rows.length === 3 && !lm.textContent.includes('A Prospect'));
    check('oldest untouched first; a comment counts as a touch', rows.map(r => r.getAttribute('data-proj')).join(',') === 'p1,p3,p2');
    check('day colours: 30 red, 9 amber, 2 plain', rows[0].querySelector('.kpcd').matches('.old') && rows[1].querySelector('.kpcd').matches('.mid') && !rows[2].querySelector('.kpcd').matches('.mid,.old'));
    check('town shown', rows[0].querySelector('.kpct').textContent === 'Xenia');
    const call = rows[0].querySelector('a.kpcall');
    check('Call link dials the cleaned number', !!call && call.getAttribute('href') === 'tel:9375550101');
    check('no Call link when no phone on file', !rows[1].querySelector('a.kpcall'));
    check('mode remembered for the session', w.sessionStorage.getItem('kpLeadMode') === 'call' && w.document.querySelector('#kpLeadSeg button[data-kpm="call"]').matches('.on'));
    call.addEventListener('click', e => e.preventDefault());
    call.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    check('tapping Call does not open the lead', opened.length === 0);
    rows[0].querySelector('.nm').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    check('tapping the row opens the lead', opened.join() === 'p1');
    const esc = projects.slice(); esc.push({ id: 'p5', name: '<img src=x onerror=alert(1)>', stage: 'Lead', city: '<b>x</b>', created_at: iso(1), checklist: '{}' });
    w.cacheProjects = esc; w.renderKpHomeRow();
    check('names and towns are escaped', !lm.querySelector('img') && !lm.querySelector('.kpct b'));
    w.document.querySelector('#kpLeadSeg button[data-kpm="new"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    check('back to Newest restores the original list', lm.querySelectorAll('.kpcallrow').length === 0);
  } catch (e) { check('harness ran without throwing: ' + e.message, false); }
  if (realErrors.length) console.log('boot errors (not failing):', realErrors.slice(0, 5));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
}, 4000);
