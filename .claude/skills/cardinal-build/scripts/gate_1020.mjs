// gate_1020.mjs — proves crStageDefer no longer commits a SAME-job pending move
// when it is superseded inside the 5s undo window (build 1020, audit finding 13).
//
// EXECUTES the shipped _crStageCommit + crStageDefer with a stubbed setStage,
// normStage, currentProject and CardinalUndo. Drives four scenarios:
//   [A] same job, forward then BACK inside the window -> zero setStage calls
//       (no phantom "Approved — order materials" email).
//   [B] same job, forward then FORWARD-AGAIN (Sched->Appr->Compl) -> exactly one
//       setStage, to the FINAL stage only (intermediate Approved skipped).
//   [C] different job superseding -> the first move IS committed (1008 rule kept).
//   [D] the pagehide/visibility flush still commits a lone pending move.
//
// Usage:
//   node gate_1020.mjs                 # working tree -> GREEN
//   node gate_1020.mjs <index.html>    # build-1019 copy -> RED (commit-first fires)

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

const commitBody = sliceFn('function _crStageCommit(p){', '_crStageCommit');
const deferBody  = sliceFn('function crStageDefer(pr, target){', 'crStageDefer');

// Build a harness that owns _crStagePending and exposes both functions plus a
// synchronous drain of the microtask queue used by _crStageCommit.
function makeRig() {
  const calls = [];                 // every setStage(id,target) the code makes
  const STAGES = ['Lead','Prospect','OnHold','Approved','Scheduled','Completed','Invoiced','Closed','Lost'];
  const wrap =
    'var _crStagePending = null;\n' +
    'function normStage(s){ return STAGES.indexOf(s) !== -1 ? s : "Lead"; }\n' +
    'function _crStageReviewMaybe(){}\n' +
    'function renderOverview(){} function renderPipeline(){}\n' +
    commitBody + '\n' + deferBody + '\n' +
    'return { defer: crStageDefer, commit: _crStageCommit, pending: function(){ return _crStagePending; } };';
  // setStage records the call and resolves; timers are captured so we can NOT
  // fire them (we test the synchronous supersede path), but pagehide test calls
  // commit directly.
  const timers = [];
  const setTimeoutStub = (fn) => { const t = { fn }; timers.push(t); return t; };
  const clearTimeoutStub = () => {};
  const setStage = (id, target) => { calls.push({ id, target }); return Promise.resolve(); };
  const currentProject = null;
  const CardinalUndo = { enqueue: () => {} };
  const showError = () => {};
  const fn = new Function(
    'STAGES','setStage','setTimeout','clearTimeout','currentProject','CardinalUndo','window','showError','Promise',
    wrap
  )(STAGES, setStage, setTimeoutStub, clearTimeoutStub, currentProject, CardinalUndo, { CardinalUndo, showError }, showError, Promise);
  return { fn, calls, timers };
}

// microtask drain — _crStageCommit uses Promise.resolve().then(setStage); await
// a couple of ticks so those chains run before we assert.
const tick = () => new Promise(r => setTimeout(r, 0));

if (commitBody && deferBody) {
  try {
    // [A] same job: Scheduled -> Approved, then back to Scheduled inside window
    {
      const { fn, calls } = makeRig();
      const P = { id: 'P', stage: 'Scheduled' };
      fn.defer(P, 'Approved');          // optimistic -> Approved, pending queued
      fn.defer(P, 'Scheduled');         // supersede: round-trip back to origin
      await tick(); await tick();
      ok(calls.length === 0, `[A] same-job forward-then-back must fire ZERO setStage (no phantom email), got ${JSON.stringify(calls)}`);
      ok(fn.pending() === null, '[A] no pending move should remain after a clean round-trip');
      ok(P.stage === 'Scheduled', `[A] job must rest at its true origin, got ${P.stage}`);
    }

    // [B] same job: Scheduled -> Approved -> Completed inside window
    {
      const { fn, calls, timers } = makeRig();
      const P = { id: 'P', stage: 'Scheduled' };
      fn.defer(P, 'Approved');
      fn.defer(P, 'Completed');         // supersede to a NEW target (not origin)
      ok(calls.length === 0, `[B] superseding must not commit synchronously, got ${JSON.stringify(calls)}`);
      // now let the surviving pending timer fire
      timers.filter(t => !t.fired).forEach(t => { t.fired = true; t.fn(); });
      await tick(); await tick();
      ok(calls.length === 1, `[B] exactly one setStage after the window, got ${calls.length}: ${JSON.stringify(calls)}`);
      ok(calls[0] && calls[0].target === 'Completed', `[B] the single commit must be the FINAL stage (Completed), not the skipped Approved, got ${JSON.stringify(calls[0])}`);
    }

    // [C] different job supersedes: first job MUST commit (1008 rule)
    {
      const { fn, calls } = makeRig();
      const P = { id: 'P', stage: 'Scheduled' };
      const Q = { id: 'Q', stage: 'Lead' };
      fn.defer(P, 'Approved');          // pending on P
      fn.defer(Q, 'Prospect');          // different job -> commits P first
      await tick(); await tick();
      ok(calls.length === 1 && calls[0].id === 'P' && calls[0].target === 'Approved',
        `[C] a move on a DIFFERENT job must commit the first (P->Approved), got ${JSON.stringify(calls)}`);
      ok(fn.pending() && fn.pending().pr.id === 'Q', '[C] Q must now be the pending move');
    }

    // [D] flush path still commits a lone pending move
    {
      const { fn, calls } = makeRig();
      const P = { id: 'P', stage: 'Scheduled' };
      fn.defer(P, 'Approved');
      const pend = fn.pending();
      ok(pend && pend.pr.id === 'P', '[D] a lone move should be pending');
      fn.commit(pend);                  // what pagehide/visibilitychange calls
      await tick(); await tick();
      ok(calls.length === 1 && calls[0].target === 'Approved', `[D] flush must commit the pending move, got ${JSON.stringify(calls)}`);
    }
  } catch (e) { fails.push('crStageDefer execution failed: ' + e.message); }
}

if (fails.length) {
  console.error('RED — gate_1020 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1020: same-job round-trip fires no setStage; same-job re-target commits only the final stage; cross-job supersede still commits; flush unchanged.');
