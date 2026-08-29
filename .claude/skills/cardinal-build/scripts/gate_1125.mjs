/* gate_1125.mjs — the other half of the punch-out deep link.
   harness_deeplink1125.js proves the TEXT MESSAGE now carries
   https://<host>/#p/<id>/punch. This proves that address actually LANDS on the
   punch-out — in a real engine, through the app's own boot and hash router.
   Together they are the whole of Curtis's ask: tap the text, get the punch-out.
   A gate that only checked the SMS would ship a confident link to nowhere.
   ⚠ RED, not a crash, on a tree without the route: every probe is guarded.
   usage: node gate_1125.mjs <file.html> */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const BASE = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } };

const b = await chromium.launch();
async function land(hash){
  const p = await b.newPage({ viewport:{ width:390, height:844 } });
  for (const f of ['sentinel_setup_cardinal.js','e2e_mock_supa.js'])
    await p.addInitScript(readFileSync(S+f,'utf8'));
  await p.goto(BASE + hash, { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(4500);
  const r = await p.evaluate(() => {
    const pane = document.getElementById('tab-punch');
    return { proj: window.currentProject ? window.currentProject.name : null,
             tab: window.__curTab || null,
             punchShown: pane ? getComputedStyle(pane).display !== 'none' : null,
             projShown: (function(){ const v = document.getElementById('projectView');
               return v ? getComputedStyle(v).display !== 'none' : null; })() };
  }).catch(e => ({ err:String(e.message||e) }));
  await p.close();
  return r;
}

/* the exact address the SMS now contains */
const deep = await land('#p/p1/punch');
ok(!deep.err, 'the app boots on a punch-out link' + (deep.err ? ' — ' + deep.err : ''));
ok(deep.projShown === true, 'it opens a client profile');
ok(deep.proj === 'Mark Diamond', 'the RIGHT client (' + deep.proj + ')');
ok(deep.tab === 'punch', 'on the Punch Outs tab (' + deep.tab + ')');
ok(deep.punchShown === true, 'and that pane is actually on screen');

/* the control: the same link without the tab must NOT land on punch, or the
   assertion above proves nothing about the /punch segment */
const plain = await land('#p/p1');
ok(plain.tab === 'overview' && plain.punchShown === false,
   'without the /punch segment it lands on Overview — so the segment is what does the work (tab=' +
   plain.tab + ', punch shown=' + plain.punchShown + ')');

await b.close();
console.log('\n' + (fail ? 'RED — ' + fail + ' failed, ' + pass + ' passed'
                         : 'GREEN — all ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
