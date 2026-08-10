/* Build 680 — the four things Theo asked of the claims screen.

   P1 (the giant white boxes) is NOT tested here. It is a question about which
   CSS rule won, and only a real engine can answer that — see
   render_emptyclass.js, which measures it in Chromium and goes red on 679.

   Everything below EXECUTES the shipped code: each function is brace-matched
   out of the artifact and run with mocks, so pointing this at 679 genuinely
   tests 679 rather than testing a re-implementation of it.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_680.js [index.html] [api/sol.js]
   Point it at 679 as the negative control — must go red.                     */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const SOL  = path.resolve(process.argv[3] || '/home/user/cardinal-inspections/api/sol.js');
const SRC = fs.readFileSync(FILE, 'utf8');
const SOLSRC = fs.existsSync(SOL) ? fs.readFileSync(SOL, 'utf8') : '';

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function fnText(name, hay) {
  const s = hay === undefined ? SRC : hay;
  let i = s.indexOf('async function ' + name + '(');
  if (i < 0) i = s.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0;
  for (let k = s.indexOf('{', i); k < s.length; k++) {
    if (s[k] === '{') d++;
    else if (s[k] === '}') { d--; if (d === 0) return s.slice(i, k + 1); }
  }
  return null;
}

/* mocks shared by the claim-module functions under test */
const esc = s => String(s == null ? '' : s).replace(/[<>&"']/g, c =>
  ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c]));
const fmt = n => Number(n || 0).toLocaleString('en-US');
const fmtDate = d => d ? 'DATE(' + d + ')' : '—';
const sect = (n, title, act, body) => '<section data-t="' + title + '">' + body + '</section>';

/* ── P2 · the two date labels stop colliding with the status chip ───────── */
console.log('── P2 · "Filed" and "Approved" say they are dates ──');
{
  const t = fnText('paneClient');
  ok('paneClient() was found', !!t);
  if (t) {
    const state = { claim: {
      policy_number: '000826751113', filed_at: null, approved_at: null,
      cause_of_loss: 'hail', coverage_type: 'RCV', ord_law: null,
      adjuster_name: '', adjuster_company: '', adjuster_phone: '', adjuster_email: ''
    } };
    const run = new Function('state', 'sect', 'esc', 'fmtDate', 'causeLabel', 'ordLawText',
      t + '; return paneClient;')(state, sect, esc, fmtDate, c => c, () => '');
    const html = run();

    const labels = [...html.matchAll(/<div class="lbl">([^<]*)<\/div>/g)].map(m => m[1]);
    console.log('    labels rendered: ' + labels.join(' · '));

    /* The claim's STATUS is one of nine values rendered as a chip at the top of
       this same screen, and two of them are "Filed" and "Approved". A field
       label identical to a status value is the whole confusion. */
    ok('no field label is bare "Filed" — the status chip already says that',
      !labels.includes('Filed'), labels.join(','));
    ok('no field label is bare "Approved"',
      !labels.includes('Approved'), labels.join(','));
    ok('the filed DATE is labelled as a date', labels.includes('Date Filed'));
    ok('the approved DATE is labelled as a date', labels.includes('Date Approved'));

    /* and the placeholders must say what is missing, not just "Not set" twice */
    ok('an unfiled claim says so in words', /Not filed yet/.test(html));
    ok('an unapproved claim says so in words', /Not approved yet/.test(html));

    /* a REAL date must still render — the rename must not have broken the read */
    state.claim.filed_at = '2025-08-01';
    state.claim.approved_at = '2025-09-15';
    const html2 = run();
    ok('a real filed date renders', /DATE\(2025-08-01\)/.test(html2));
    ok('a real approved date renders', /DATE\(2025-09-15\)/.test(html2));
  }
}

/* ── P3 · the Approved date gets a writer it never had ─────────────────── */
console.log('\n── P3 · Approved Date can actually be saved ──');
{
  /* `approved_at` occurred exactly ONCE in the 679 artifact — at the line that
     DISPLAYS it. No input, no line in the save payload. The box could never
     hold a value on any claim, forever. Same defect as 646's adjuster_company.

     This does not read for the string; it EXECUTES the payload builder against
     a stand-in modal and checks the value comes out the other side. */
  const modalFn = fnText('openNewClaimModal');
  ok('openNewClaimModal() was found', !!modalFn);
  if (modalFn) {
    ok('the form has an Approved Date input', /data-f="approved_at"/.test(modalFn),
      'no [data-f="approved_at"] inside openNewClaimModal');

    const gi = modalFn.indexOf('const get = (f) =>');
    ok('the save payload builder was found', gi > -1);
    if (gi > -1) {
      const pi = modalFn.indexOf('const payload = {', gi);
      let d = 0, end = -1;
      for (let k = modalFn.indexOf('{', pi); k < modalFn.length; k++) {
        if (modalFn[k] === '{') d++;
        else if (modalFn[k] === '}') { d--; if (d === 0) { end = k + 1; break; } }
      }
      const body = modalFn.slice(gi, end) + '; return payload;';

      /* a stand-in modal: every [data-f="x"] answers with FEED[x] */
      const FEED = { approved_at: '2025-09-15', filed_at: '2025-08-01',
                     carrier: 'Allstate', ord_law: '' };
      const modal = { querySelector: sel => {
        const f = (sel.match(/data-f="([^"]+)"/) || [])[1];
        return { value: FEED[f] === undefined ? '' : FEED[f] };
      } };
      let payload = null, err = null;
      try {
        payload = new Function('modal', 'window', body)(modal, { insOrdLawFromSelect: () => null });
      } catch (e) { err = e; }
      ok('the payload builder runs', !err, err && err.message);
      if (payload) {
        ok('…and Approved Date reaches the row that gets saved',
          payload.approved_at === '2025-09-15', JSON.stringify(payload.approved_at));
        /* the neighbour must not have been disturbed */
        ok('…and Filed Date still does', payload.filed_at === '2025-08-01',
          JSON.stringify(payload.filed_at));
        ok('…and a blank date saves as null, not an empty string',
          payload.date_of_loss === null, JSON.stringify(payload.date_of_loss));
      }
    }
  }
}

/* ── P4 · Cause of Loss is read off the scope ───────────────────────────── */
console.log('\n── P4 · the scope reader finally asks for the cause ──');
{
  ok('api/sol.js was found', !!SOLSRC);
  if (SOLSRC) {
    ok('the extraction schema asks for cause_of_loss', /"cause_of_loss"/.test(SOLSRC));

    /* The vocabulary is NOT free text: index.html renders a <select> with
       exactly seven options and a value outside that list silently fills
       nothing. Same shape as the STAGES whitelist — the two must agree, so
       assert them against EACH OTHER rather than against a list typed here. */
    const cm = SRC.match(/const CAUSES\s*=\s*\[([\s\S]*?)\];/);
    ok('the CAUSES vocabulary was found in index.html', !!cm);
    if (cm) {
      const vocab = [...cm[1].matchAll(/v:\s*'([^']+)'/g)].map(m => m[1]);
      console.log('    vocabulary: ' + vocab.join(', '));
      const missing = vocab.filter(v => !new RegExp('"' + v + '"').test(SOLSRC));
      ok('every option the claim form offers is named in the prompt',
        missing.length === 0, 'missing from api/sol.js: ' + missing.join(', '));
      ok('…and the prompt invents no eighth token',
        /never invent an eighth token/.test(SOLSRC));
      ok('…and it is told to return null rather than guess',
        /do not\s+\n?\s*'?\s*'?guess/.test(SOLSRC) || /return null — do not/.test(SOLSRC));
    }

    /* the client half has always existed; this build is what makes it reachable */
    ok('index.html still maps the answer onto the form field',
      /cause_of_loss\s*:\s*first\(ex\.cause_of_loss/.test(SRC));
  }
}

/* ── P5 · Job and Contract stop being the same renderer ─────────────────── */
console.log('\n── P5 · two tabs, two different panes ──');
{
  const t = fnText('renderLinkedStrip');
  ok('renderLinkedStrip() was found', !!t);
  if (t) {
    const state = { linked: {
      estimate: { id: 'e1', template: 'roofing', status: 'draft', estimate: { total: 1000 } },
      contract: { id: 'c1', contract_number: 'CTR-1', template: 'roofing', status: 'signed', total: 2000 },
      project:  { id: 'p1', client_name: 'Adam Gunn', address: '9222 Arlington Rd', stage: 'Approved' }
    } };
    const mk = () => new Function('state', 'esc', 'fmt', 'statusLabel', 'cap',
      t + '; return renderLinkedStrip;')(state, esc, fmt, s => s,
      s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1));
    const strip = mk();

    /* the header strip calls it with NO argument and must keep all three */
    const all = strip();
    ok('with no filter it still renders all three cards',
      /data-link="estimate"/.test(all) && /data-link="contract"/.test(all) &&
      /data-link="project"/.test(all));

    const job = strip(['project']);
    ok('the Job filter renders the project', /data-link="project"/.test(job));
    ok('…and NOT the estimate', !/data-link="estimate"/.test(job));
    ok('…and NOT the contract', !/data-link="contract"/.test(job));

    const con = strip(['estimate', 'contract']);
    ok('the Contract filter renders the estimate', /data-link="estimate"/.test(con));
    ok('…and the contract', /data-link="contract"/.test(con));
    ok('…and NOT the project', !/data-link="project"/.test(con));

    /* nothing linked → each pane must EXPLAIN itself rather than render blank */
    const pj = fnText('paneJob'), pc = fnText('paneContract');
    ok('paneJob() and paneContract() were found', !!pj && !!pc);
    if (pj && pc) {
      state.linked = {};
      const empty = mk();
      const jobHtml = new Function('sect', 'renderLinkedStrip',
        pj + '; return paneJob;')(sect, empty)();
      const conHtml = new Function('sect', 'renderLinkedStrip',
        pc + '; return paneContract;')(sect, empty)();
      ok('an empty Job pane says why it is empty',
        /cr-c-empty/.test(jobHtml) && jobHtml.length > 60, jobHtml.slice(0, 80));
      ok('an empty Contract pane says why it is empty',
        /cr-c-empty/.test(conHtml) && conHtml.length > 60, conHtml.slice(0, 80));
      ok('…and the two say DIFFERENT things — that was the whole bug',
        jobHtml !== conHtml);
    }
  }
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
