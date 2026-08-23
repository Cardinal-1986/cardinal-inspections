// gate_1021.mjs — proves an Approved/Completed team email survives an offline
// stage move (build 1021, audit finding 14).
//
// Two shipped things are executed against real behaviour:
//   [A] the outbox flush() op:'notify' branch — a queued notify is REPLAYED
//       through window.notifyTeam: a confirmed {ok:true} send is deleted; a
//       {ok:false,reason:'network'} keeps it (still offline); a notify entry is
//       NEVER buried (no red 'refused' chip).
//   [B] _notifyOrQueue — on a network/offline notify result it queues an
//       op:'notify' entry; on {ok:true} it queues nothing.
//   [C] setStage routes BOTH workflow emails through _notifyOrQueue, not the
//       bare notifyTeam (static check on the shipped source).
//
// Usage:
//   node gate_1021.mjs                 # working tree -> GREEN
//   node gate_1021.mjs <index.html>    # build-1020 copy -> RED

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const INDEX = process.argv[2] || path.join(REPO, 'index.html');
const src = fs.readFileSync(INDEX, 'utf8');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// ---- [A] flush() op:'notify' branch — EXECUTED, not hand-copied -----------
// Brace-extract the shipped `if(row.op === 'notify'){ ... }` block and run it,
// providing the exact free variables it closes over (row, del, sentSome, window,
// Promise). Prove: ok -> del + sentSome + no bury + stop=false; network -> kept
// (no del) + stop=true; signed_out -> kept (no del) + not buried + stop=false.
{
  const marker = "if(row.op === 'notify'){";
  const at = src.indexOf(marker);
  if (at === -1) { fails.push("[A] flush() has no op:'notify' branch"); }
  else {
    let i = src.indexOf('{', at), d = 0, block = null;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') d++;
      else if (src[j] === '}') { d--; if (d === 0) { block = src.slice(at, j + 1); break; } }
    }
    if (!block) fails.push('[A] notify branch brace');
    else {
      ok(!/\bbury\(/.test(block), "[A] a notify entry must NEVER be buried (no red refused chip)");
      ok(/window\.notifyTeam/.test(block), "[A] notify branch must replay through window.notifyTeam");
      const run = async (notifyRes) => {
        let deleted = false, sentSome = false, buried = false;
        const del = () => { deleted = true; return Promise.resolve(); };
        // eslint-disable-next-line no-unused-vars
        const bury = () => { buried = true; return Promise.resolve(false); };
        const row = { id: 1, op: 'notify', to: ['x@y'], subject: 's', html: '<p>h</p>' };
        const win = { notifyTeam: () => Promise.resolve(notifyRes) };
        // The block is `if(row.op==='notify'){ return nf.then(...) }`. Wrap it in an
        // IIFE so its `return` becomes __r, and read sentSome back via a getter.
        const wrapped = new Function('row', 'del', 'window', 'Promise', 'bury',
          'var sentSome=false;\nvar __r = (function(){' + block + '})();\nreturn { r: __r, get sentSome(){ return sentSome; } };');
        const out = wrapped(row, del, win, Promise, bury);
        const stop = await Promise.resolve(out.r);
        await Promise.resolve();
        return { deleted, buried, stop, sentSome: out.sentSome };
      };
      try {
        const sent = await run({ ok: true });
        ok(sent.deleted === true, '[A] ok send must del the entry');
        ok(sent.sentSome === true, '[A] ok send must set sentSome (earns the green badge)');
        ok(sent.buried === false, '[A] ok send must not bury');
        ok(sent.stop === false, '[A] ok send must not stop the flush pass');

        const net = await run({ ok: false, reason: 'network' });
        ok(net.deleted === false, '[A] a network failure must KEEP the entry (not del)');
        ok(net.stop === true, '[A] a network failure must stop the pass (still offline)');
        ok(net.buried === false, '[A] a network failure must not bury');

        const so = await run({ ok: false, reason: 'signed_out' });
        ok(so.deleted === false, '[A] signed_out must keep the entry for the next flush');
        ok(so.buried === false, '[A] signed_out must not bury a notify (best-effort email)');
        ok(so.stop === false, '[A] signed_out must NOT stop real row writes in the same pass');
      } catch (e) { fails.push('[A] notify branch exec: ' + e.message); }
    }
  }
}

// ---- [B] _notifyOrQueue ----------------------------------------------------
{
  const anchor = 'function _notifyOrQueue(to, subject, html){';
  const at = src.indexOf(anchor);
  let body = null;
  if (at === -1) fails.push('[B] _notifyOrQueue not found');
  else {
    let i = src.indexOf('{', at), d = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') d++;
      else if (src[j] === '}') { d--; if (d === 0) { body = src.slice(at, j + 1); break; } }
    }
  }
  if (body) {
    const run = async (notifyRes) => {
      const queued = [];
      const notifyTeam = () => Promise.resolve(notifyRes);
      const window = { CardinalOutbox: { queue: (e) => queued.push(e) } };
      const make = new Function('notifyTeam', 'window', body + '\nreturn _notifyOrQueue;');
      make(notifyTeam, window)(['x@y'], 'subj', '<p>h</p>');
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
      return queued;
    };
    try {
      const okSend = await run({ ok: true });
      ok(okSend.length === 0, `[B] a confirmed send must queue nothing, got ${JSON.stringify(okSend)}`);

      const net = await run({ ok: false, reason: 'network' });
      ok(net.length === 1 && net[0].op === 'notify', `[B] a network failure must queue one op:'notify', got ${JSON.stringify(net)}`);
      ok(net[0].to && net[0].subject === 'subj' && net[0].html === '<p>h</p>', '[B] the queued entry must carry to/subject/html for replay');

      const off = await run({ ok: false, reason: 'offline' });
      ok(off.length === 1, '[B] an offline result must queue too');

      const signedOut = await run({ ok: false, reason: 'signed_out' });
      ok(signedOut.length === 0, `[B] a real refusal (signed_out) must NOT queue — a present, online person already sees it, got ${JSON.stringify(signedOut)}`);
    } catch (e) { fails.push('[B] _notifyOrQueue exec: ' + e.message); }
  }
}

// ---- [C] setStage routes both emails through the helper --------------------
{
  const at = src.indexOf('async function setStage(prId, v){');
  let body = null;
  if (at === -1) fails.push('[C] setStage not found');
  else {
    let i = src.indexOf('{', at), d = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') d++;
      else if (src[j] === '}') { d--; if (d === 0) { body = src.slice(at, j + 1); break; } }
    }
  }
  if (body) {
    const helperCalls = (body.match(/_notifyOrQueue\(/g) || []).length;
    const bareNotify = (body.match(/[^.a-zA-Z_]notifyTeam\(/g) || []).length;
    ok(helperCalls === 2, `[C] setStage must send both workflow emails via _notifyOrQueue, found ${helperCalls}`);
    ok(bareNotify === 0, `[C] setStage must not call notifyTeam directly (fire-and-forget drops the offline email), found ${bareNotify}`);
  }
}

if (fails.length) {
  console.error('RED — gate_1021 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1021: offline Approved/Completed emails queue to the outbox and replay on reconnect; sends delete, offline keeps, signed-out is not queued; setStage routes both through the helper.');
