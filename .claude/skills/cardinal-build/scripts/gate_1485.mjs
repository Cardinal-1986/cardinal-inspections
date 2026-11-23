/* gate_1485 — Jerry Wamsley on TEAM_ROSTER, and "@jerry" no longer buzzes two people.
   Theo, 23 Nov 2026, with a screenshot of the Reassign list: "Wamsley isn't here".

   Runs the SHIPPED code, sliced out of index.html, in a vm — not a re-implementation:
     R1  TEAM_ROSTER carries Jerry Wamsley once, keeps Jerry Vera, and every email appears once
     R2  the Reassign picker and the new-lead rep picker (their real option builders) offer him
     M1  mentionMatch: @jerry / @jer reach NOBODY; @wamsley, @wam and @vera reach exactly one;
         everyone else's tags are unchanged (@joey, @joan, @theo, @nick, @curt, @scott, @jacob; @j = none)
     M2  mentionEmailsFor on whole messages: @jerry notifies no one, @Wamsley only him, @Vera only Vera
     M3  the Will-notify line for "@jerry" says it fits two people and names Vera and Wamsley
     C1  the three tag-chip rows (job thread, punch card, punch page) show @Wamsley and @Vera, never
         @Jerry, carry no duplicate tag, and EVERY chip's tag round-trips through mentionMatch to
         exactly the member it was drawn for (a chip that buzzes the wrong person is the bug)

   Arg: [index.html] -> negative control: main at 1484 must go RED, not crash. */
import fs from 'fs';
import vm from 'vm';

const APP = process.argv[2] || 'index.html';
const S = fs.readFileSync(APP, 'utf8').replace(/\r\n/g, '\n');   // a Windows checkout (autocrlf) is CRLF; the committed file is LF
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + String(d).slice(0, 300) : '')); c ? pass++ : fail++; };
console.log('gate_1485 on ' + APP);

function slice(from, to, incl = true) {
  const i = S.indexOf(from); if (i < 0) throw new Error('anchor not found: ' + from.slice(0, 60));
  const j = S.indexOf(to, i + from.length); if (j < 0) throw new Error('end not found after: ' + from.slice(0, 60));
  return S.slice(i, incl ? j + to.length : j);
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let ctx;
try {
  const rosterSrc = slice('var TEAM_ROSTER = [', '];');
  const mentionSrc = slice('function mentionNamesIn(', 'window.CardinalMentions = Object.assign', false);
  ctx = { esc };
  vm.createContext(ctx);
  vm.runInContext(rosterSrc + '\n' + 'function rptRepName(e){ var m = TEAM_ROSTER.filter(function(x){ return x.email === e; })[0]; return m ? m.name : ""; }\n' + mentionSrc, ctx);
} catch (e) { ok(false, 'extract the shipped roster and mention code', e.message); console.log(`\ngate_1485: ${pass} pass, ${fail} fail — RED`); process.exit(1); }

const R = ctx.TEAM_ROSTER;
const W = 'jerry@jerrywamsley.com', V = 'jerry@cardinalrenovations.net';
const emailsOf = arr => (arr || []).map(m => m.email);

// R1
const w = R.filter(m => m.email === W), v = R.filter(m => m.email === V);
ok(w.length === 1 && w[0].name === 'Jerry Wamsley', 'R1  TEAM_ROSTER has Jerry Wamsley exactly once', JSON.stringify(w));
ok(v.length === 1 && v[0].name === 'Jerry Vera', 'R1  Jerry Vera is still on it (his access is Theo\'s call)', JSON.stringify(v));
const em = R.map(m => m.email);
ok(new Set(em).size === em.length, 'R1  no email appears twice', em.join(', '));

// R2 — the real option builders
try {
  const reassign = slice("TEAM_ROSTER.map(function(m){ return '<option value=\"' + m.email + '\">'", ".join('')");
  const html = vm.runInContext(reassign, ctx);
  ok(html.includes('<option value="' + W + '">Jerry Wamsley</option>'), 'R2  the Reassign picker offers Jerry Wamsley', html.slice(0, 200));
} catch (e) { ok(false, 'R2  the Reassign picker offers Jerry Wamsley', e.message); }
try {
  const intake = slice("    document.getElementById('ldAssignSel').innerHTML =", "}).join('');");
  const dom = { innerHTML: '' };
  const c2 = vm.createContext({ TEAM_ROSTER: R, esc, document: { getElementById: () => dom } });
  vm.runInContext(intake, c2);
  ok(dom.innerHTML.includes('value="' + W + '">Jerry Wamsley<'), 'R2  the new-lead rep picker offers Jerry Wamsley', dom.innerHTML.slice(0, 160));
} catch (e) { ok(false, 'R2  the new-lead rep picker offers Jerry Wamsley', e.message); }

// M1
const mm = n => emailsOf(ctx.mentionMatch(n));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
ok(eq(mm('jerry'), []), 'M1  @jerry reaches nobody (it fits two people)', JSON.stringify(mm('jerry')));
ok(eq(mm('jer'), []), 'M1  @jer reaches nobody', JSON.stringify(mm('jer')));
ok(eq(mm('wamsley'), [W]), 'M1  @wamsley reaches only Jerry Wamsley', JSON.stringify(mm('wamsley')));
ok(eq(mm('wam'), [W]), 'M1  @wam (3-letter prefix) reaches only Jerry Wamsley', JSON.stringify(mm('wam')));
ok(eq(mm('vera'), [V]), 'M1  @vera reaches only Jerry Vera', JSON.stringify(mm('vera')));
const same = { joey: 'joey@cardinalrenovations.net', joseph: 'joey@cardinalrenovations.net', joan: 'joan@cardinalrenovations.net', theo: 'theo@cardinalrenovations.net', nick: 'nick@cardinalrenovations.net', curt: 'curtis@cardinalrenovations.net', scott: 'scottie@cardinalrenovations.net', jacob: 'jacob@cardinalrenovations.net' };
const bad = Object.keys(same).filter(k => !eq(mm(k), [same[k]]));
ok(!bad.length, 'M1  everyone else\'s tags are unchanged (joey, joseph, joan, theo, nick, curt, scott, jacob)', bad.map(k => k + '→' + JSON.stringify(mm(k))).join(' '));
ok(eq(mm('j'), []), 'M1  @j still reaches nobody', JSON.stringify(mm('j')));

// M2
const ME = 'theo@cardinalrenovations.net';
const msg = t => ctx.mentionEmailsFor(ctx.mentionNamesIn(t), ME);
ok(eq(msg('@jerry can you call Brad'), []), 'M2  "@jerry can you call Brad" notifies no one', JSON.stringify(msg('@jerry can you call Brad')));
ok(eq(msg('@Wamsley can you call Brad'), [W]), 'M2  "@Wamsley …" notifies only Jerry Wamsley', JSON.stringify(msg('@Wamsley can you call Brad')));
ok(eq(msg('@Vera'), [V]), 'M2  "@Vera" notifies only Jerry Vera', JSON.stringify(msg('@Vera')));
ok(!msg('@jerry @wamsley').includes(V), 'M2  "@jerry @wamsley" never reaches Jerry Vera', JSON.stringify(msg('@jerry @wamsley')));

// M3
const pv = ctx.mentionPreview('@jerry call Brad', ME);
ok(pv && pv.warn === true && /fits 2 people/.test(pv.text) && /Vera/.test(pv.text) && /Wamsley/.test(pv.text),
   'M3  the Will-notify line warns "@jerry fits 2 people — type more: Vera, Wamsley"', pv && pv.text);

// C1 — the three chip rows, run from their shipped source
function checkChips(label, html) {
  const tags = [...html.matchAll(/data-tag="([^"]*)"[^>]*>@([^<]*)</g)].map(x => ({ tag: x[1], text: x[2] }));
  ok(tags.length >= R.length - 1, `C1  ${label}: one chip per teammate (${tags.length})`, tags.map(t => t.text).join(' '));
  ok(tags.some(t => t.text === 'Wamsley') && tags.some(t => t.text === 'Vera') && !tags.some(t => t.text === 'Jerry'),
     `C1  ${label}: shows @Wamsley and @Vera, no @Jerry`, tags.map(t => '@' + t.text).join(' '));
  const lows = tags.map(t => t.tag.toLowerCase());
  ok(new Set(lows).size === lows.length, `C1  ${label}: no two chips carry the same tag`, lows.join(','));
  const others = R.filter(m => m.email !== ME);
  const wrong = others.filter(m => {
    const hit = tags.find(t => emailsOf(ctx.mentionMatch(t.tag.toLowerCase())).length === 1 && emailsOf(ctx.mentionMatch(t.tag.toLowerCase()))[0] === m.email);
    return !hit;
  }).map(m => m.name);
  ok(!wrong.length, `C1  ${label}: every chip reaches exactly the teammate it names`, wrong.length ? 'no chip reaches: ' + wrong.join(', ') : '');
}
try {
  const src = slice('  tr.innerHTML = TEAM_ROSTER.filter(function(mbr){ return mbr.email !== me; })', "}).join('');");
  const tr = { innerHTML: '' };
  vm.runInContext(src, vm.createContext({ TEAM_ROSTER: R, esc, me: ME, tr }));
  checkChips('job thread', tr.innerHTML);
} catch (e) { ok(false, 'C1  job thread chips run', e.message); }
try {
  const src = slice('  var chips = roster().filter(function(m){ return m.email !== me; })', "}).join('');");
  const c3 = vm.createContext({ esc, me: ME, roster: () => R, nameOf: e => e.split('@')[0] });
  vm.runInContext(src, c3);
  checkChips('punch card', c3.chips);
} catch (e) { ok(false, 'C1  punch card chips run', e.message); }
try {
  const src = slice('function tagChips(){', "}).join('');\n}");
  const c4 = vm.createContext({ esc, myEmail: () => ME, window: { TEAM_ROSTER: R } });
  vm.runInContext(src, c4);
  checkChips('punch page', vm.runInContext('tagChips()', c4));
} catch (e) { ok(false, 'C1  punch page chips run', e.message); }

console.log(`\ngate_1485: ${pass} pass, ${fail} fail — ${fail ? 'RED' : 'GREEN'}`);
process.exit(fail ? 1 : 0);
