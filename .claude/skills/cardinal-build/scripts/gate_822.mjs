// gate_822.mjs — the Visualizer's two engines.
//
// The functions under test are EXTRACTED FROM THE FILE and executed, not
// re-implemented here. A gate that re-writes the logic it is checking proves
// only that two of my drafts agree.
//
//   node gate_822.mjs                     # the working tree
//   node gate_822.mjs /tmp/prev.html      # negative control — must go red
//
// The case that matters most is stalled(). That banner tells Theo the render
// machine may be asleep and hands him the command to wake it. A Gemini job is
// never claimed by the Spark BY DESIGN — claim_design_job() filters on engine
// — so counting one there would send him to ssh into a box that is right to
// be ignoring the job. Two of the assertions below are the ones that catch a
// filter written the wrong way round: a spark job must STILL stall.

import fs from 'node:fs';

const FILE = process.argv[2] || 'visualizer/index.html';
const CONTROL = process.argv[2] != null;
const src = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0; const bad = [];
const ok = (n, c, d) => { if (c) { pass++; return; } fail++; bad.push(n + (d ? '  — ' + d : '')); };

/* Brace-match a named function out of the file. The file is 100 KB with
   braces inside strings and comments everywhere, so a regex to the closing
   brace is not an option — CLAUDE.md's "recon regexes need bounds". */
function grab(name) {
  const at = src.indexOf('function ' + name + '(');
  if (at < 0) return null;
  const open = src.indexOf('{', at);
  let depth = 0, i = open, inStr = null, inCmt = null;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inCmt === '/*') { if (c === '*' && n === '/') { inCmt = null; i++; } continue; }
    if (inCmt === '//') { if (c === '\n') inCmt = null; continue; }
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '/' && n === '*') { inCmt = '/*'; i++; continue; }
    if (c === '/' && n === '/') { inCmt = '//'; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (!depth) return src.slice(at, i + 1); }
  }
  return null;
}

// ── stalled() ────────────────────────────────────────────────────────────
{
  const body = grab('stalled');
  ok('stalled() found', !!body);
  if (body) {
    const now = Date.UTC(2026, 7, 15, 5, 0, 0);
    const old = new Date(now - 10 * 60 * 1000).toISOString();   // 10 min ago
    const mk = (status, engine) => ({ status, engine, created_at: old, claimed_at: null });

    /* Date has to stay a CONSTRUCTOR — stalled() calls both new Date(s) and
       Date.now(). Spreading it into an object literal gives you neither. */
    class FrozenDate extends Date { static now() { return now; } }

    const run = (jobs) => {
      const fn = new Function('jobs', 'WAIT_MS', 'Date',
        body + '; return stalled();');
      return fn(jobs, 3 * 60 * 1000, FrozenDate);
    };

    ok('a stale SPARK job still stalls',
       run([mk('queued', 'spark')]) !== null,
       'the filter must not disable the banner outright');

    ok('a stale GEMINI job does NOT stall',
       run([mk('queued', 'gemini')]) === null,
       'no worker claims it by design; the "wake the Spark" banner would be a lie');

    const mixed = run([mk('queued', 'gemini'), mk('queued', 'spark')]);
    ok('a mix counts only the spark one', mixed && mixed.n === 1,
       'n=' + (mixed && mixed.n));

    ok('a row with NO engine counts as spark',
       run([mk('queued', undefined)]) !== null,
       'every row written before the column existed was Spark work');

    ok('a fresh spark job does not stall yet',
       run([{ status: 'queued', engine: 'spark',
              created_at: new Date(now - 5000).toISOString(), claimed_at: null }]) === null);
  }
}

// ── changesFor() ─────────────────────────────────────────────────────────
{
  const body = grab('changesFor');
  ok('changesFor() found', !!body);
  if (body) {
    const fn = new Function('sel', body + '; return changesFor(sel);');
    const out = fn({
      roof: { name: 'Evergreen Mist', sub: 'Owens Corning TruDefinition Duration',
              prompt: 'architectural asphalt shingle', hex: '#6E7A69' }
    });
    ok('carries the colour NAME', /Evergreen Mist/.test(out.roof));
    ok('carries the product LINE', /TruDefinition Duration/.test(out.roof),
       'the line lands the colour far closer than the colour word alone');
    ok('carries the prompt', /architectural asphalt shingle/.test(out.roof));
    ok('does NOT send a hex', !/#6E7A69/.test(out.roof),
       'Gemini takes words; a hex in the prose is noise it may echo as text');
    ok('a missing surface is absent, not empty',
       Object.keys(fn({ roof: null })).length === 0);
  }
}

// ── wiring, read off the file ────────────────────────────────────────────
ok('insert carries engine', /engine:\s*engine,/.test(src));
ok('job select reads engine back', /claimed_at,engine'/.test(src),
   'without it every row looks like spark and the card cannot say otherwise');
ok('gemini runs in the browser, not the queue',
   /if\(engine === 'gemini'\)[\s\S]{0,400}runGemini\(r\.data\)/.test(src));
ok('spark still gets the poll sentence',
   /Queued\. The Spark picks it up on its next poll\./.test(src));
ok('the engine picker exists', /id="vzEngine"/.test(src) &&
   /data-engine="spark"/.test(src) && /data-engine="gemini"/.test(src));
ok('spark is the default', /var engine = 'spark';/.test(src),
   'a wrong colour gets thrown away; a quietly repainted siding reaches a customer');

{
  const body = grab('runGemini') || '';
  ok('runGemini() found', !!body);
  ok('every failure path writes a terminal status',
     /\.catch\(function\(err\)[\s\S]*status:\s*'failed'/.test(body),
     'a row left at running is the 3am spinner');
  ok('success writes done + both paths',
     /status:\s*'done'[\s\S]{0,200}render_path[\s\S]{0,200}preview_path/.test(body) ||
     /render_path:rp[\s\S]{0,120}preview_path:pp/.test(body));
  ok('the model’s own refusal text is passed through',
     /j\.error \|\| \('The renderer refused that/.test(body),
     '"failed" alone sends you hunting for a bug that is not there');
  /* `drift` bare matches the COMMENT beside this code explaining why there is
     no drift — the comment-pollution trap in CLAUDE.md, hit inside the gate
     written to enforce it. A written property is `drift:`; prose is not. */
  ok('no fabricated achieved drift',
     !/drift\s*:/.test(body),
     'Gemini takes words, so there is no requested hex to measure against');
  ok('the source is shrunk before it is posted',
     /shrinkToB64/.test(body),
     'a 5712x4284 drone frame exceeds the serverless body limit');
}

// ── report ───────────────────────────────────────────────────────────────
console.log('\ngate_822 — %s%s', FILE, CONTROL ? '   [negative control]' : '');
console.log('  %d/%d pass', pass, pass + fail);
if (fail) { console.log('\n  FAILED:'); bad.forEach(b => console.log('    - ' + b)); }
if (CONTROL) {
  console.log(fail ? '\n  RED, as a control should be.'
                   : '\n  ⚠ the control PASSED — these assertions test nothing.');
  process.exit(fail ? 0 : 1);
}
process.exit(fail ? 1 : 0);
