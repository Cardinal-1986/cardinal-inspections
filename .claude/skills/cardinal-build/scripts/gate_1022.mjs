// gate_1022.mjs — proves Community Analytics, the Line Item Library and the
// contract viewer are cleared by hideAllViews() and restored by navRestore()
// (build 1022, audit finding 16 — the 570-572/941 nav-trap class).
//
//   [A] EXECUTE the shipped hideAllViews() against a mock DOM: cr-can (display-
//       shown) goes display:none; cr-lil-view and cr-ce-view (class-shown) lose
//       .open, and cr-ce-view routes through window.closeContractEditor.
//   [B] EXECUTE the shipped navRestore() for the three new cases: 'contract'
//       reopens by recorded id; 'communityAnalytics' and 'lineitems' reopen.
//   [C] the load-time history wiring exists: wrapNav('openContractEditor', ...)
//       and the __crNav method-wraps for CommunityAnalytics + LineItems.
//
// Usage:
//   node gate_1022.mjs                 # working tree -> GREEN
//   node gate_1022.mjs <index.html>    # build-1021 copy -> RED

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const INDEX = process.argv[2] || path.join(REPO, 'index.html');
const src = fs.readFileSync(INDEX, 'utf8');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
function sliceFn(anchor, label) {
  const at = src.indexOf(anchor);
  if (at === -1) { fails.push('[extract] ' + label + ' not found'); return null; }
  let i = src.indexOf('{', at), d = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) return src.slice(at, j + 1); }
  }
  fails.push('[extract] ' + label + ' brace'); return null;
}

function mkEl() {
  const set = new Set();
  return {
    style: { display: '' },
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      contains: (c) => set.has(c), _set: set,
    },
    setAttribute: () => {}, querySelector: () => null,
  };
}

// ---- [A] hideAllViews clears all three -------------------------------------
{
  const body = sliceFn('function hideAllViews(){', 'hideAllViews');
  if (body) {
    try {
      const els = {};
      const get = (id) => { if (!els[id]) els[id] = mkEl(); return els[id]; };
      // seed the three as OPEN before the call
      get('cr-can').style.display = 'block';
      get('cr-lil-view').classList.add('open');
      get('cr-ce-view').classList.add('open');
      let closedContract = 0, lilCloseCalled = 0;
      const doc = {
        body: { style: { overflow: '' }, classList: { remove: () => {} } },
        querySelector: () => null,
        getElementById: (id) => get(id),
      };
      const stubView = () => ({ style: { display: '' } });
      const win = {
        CardinalLineItems: { close: () => { lilCloseCalled++; } },
        closeContractEditor: () => { closedContract++; },
      };
      const make = new Function(
        'document', 'window', 'mainView', 'projectView', 'listView', 'profileView',
        'clientsView', 'activityView', 'boardView', 'commsView', 'setHeaderJobMenu',
        body + '\nreturn hideAllViews;');
      const fn = make(doc, win, stubView(), stubView(), stubView(), stubView(),
        stubView(), stubView(), stubView(), stubView(), function () {});
      fn();

      ok(els['cr-can'].style.display === 'none', `[A] cr-can (display-shown) must be display:none after hideAllViews, got '${els['cr-can'].style.display}'`);
      ok(!els['cr-lil-view'].classList.contains('open'), '[A] cr-lil-view must lose .open after hideAllViews');
      ok(!els['cr-ce-view'].classList.contains('open'), '[A] cr-ce-view must lose .open after hideAllViews');
      ok(closedContract === 1, `[A] cr-ce-view must close through window.closeContractEditor, called ${closedContract}×`);
      ok(lilCloseCalled === 1, `[A] cr-lil-view must close through CardinalLineItems.close, called ${lilCloseCalled}×`);
    } catch (e) { fails.push('[A] hideAllViews exec: ' + e.message); }
  }
}

// ---- [B] navRestore reopens all three -------------------------------------
{
  const body = sliceFn('function navRestore(state){', 'navRestore');
  if (body) {
    try {
      const make = (win) => new Function('window', 'setTimeout',
        'var _navRestoring=false;\n' + body + '\nreturn navRestore;');
      const run = (state) => {
        const calls = [];
        const win = {
          openContractEditor: (a) => calls.push(['contract', a]),
          CardinalCommunityAnalytics: { open: () => calls.push(['analytics']) },
          CardinalLineItems: { open: () => calls.push(['lineitems']) },
        };
        const fn = make(win)(win, () => {});
        fn(state);
        return calls;
      };
      const c1 = run({ app: 'cardinal-nav', view: 'contract', data: { contractId: 'C1' } });
      ok(c1.some(x => x[0] === 'contract' && x[1] && x[1].id === 'C1'),
        `[B] navRestore 'contract' must reopen openContractEditor({id}), got ${JSON.stringify(c1)}`);
      const c2 = run({ app: 'cardinal-nav', view: 'communityAnalytics' });
      ok(c2.some(x => x[0] === 'analytics'), `[B] navRestore 'communityAnalytics' must reopen it, got ${JSON.stringify(c2)}`);
      const c3 = run({ app: 'cardinal-nav', view: 'lineitems' });
      ok(c3.some(x => x[0] === 'lineitems'), `[B] navRestore 'lineitems' must reopen it, got ${JSON.stringify(c3)}`);
      // guard: no contractId -> does NOT call opener (avoids a broken reopen)
      const c4 = run({ app: 'cardinal-nav', view: 'contract', data: {} });
      ok(!c4.some(x => x[0] === 'contract'), '[B] contract without an id must not reopen');
    } catch (e) { fails.push('[B] navRestore exec: ' + e.message); }
  }
}

// ---- [C] load-time history wiring present ----------------------------------
{
  ok(/wrapNav\('openContractEditor',\s*'contract'/.test(src), "[C] wrapNav('openContractEditor','contract',...) missing");
  ok(/CardinalCommunityAnalytics;[\s\S]{0,220}navSetView\('communityAnalytics'\)/.test(src), "[C] __crNav wrap for CommunityAnalytics.open missing");
  ok(/CardinalLineItems;[\s\S]{0,220}navSetView\('lineitems'\)/.test(src), "[C] __crNav wrap for LineItems.open missing");
}

if (fails.length) {
  console.error('RED — gate_1022 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1022: hideAllViews clears cr-can/cr-lil-view/cr-ce-view; navRestore reopens all three; history wiring present.');
