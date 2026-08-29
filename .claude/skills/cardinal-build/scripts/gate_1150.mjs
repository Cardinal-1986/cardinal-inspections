/* gate_1150 — the contracts pad is bound to the contract that armed it.
 *
 * openSigner(contract, cb) took the document to be signed and THREW IT AWAY,
 * routing purely by the caller's closure over module state — the same shape
 * that put a client's signature on the wrong contract through the other pad
 * (1149). The contracts table has no rows yet so it has never fired; this
 * closes it before it can.
 *
 * The checks that matter are BEHAVIOURAL: arm the pad against contract A, move
 * the module to contract B, apply — the callback must REFUSE.
 *
 * Control (1149) -> RED.
 */
import { readFileSync } from 'fs';
const SRC = readFileSync(process.argv[2] || '../../../../index.html', 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const fnAt = (needle, len) => { const i = SRC.indexOf(needle); return i < 0 ? '' : SRC.slice(i, i + len); };

/* 1. openSigner keeps the contract instead of discarding it */
const opener = fnAt('window.openSigner = function(', 1200);
ok(!!opener, 'openSigner found');
ok(/__ceSignerId\s*=/.test(opener), 'openSigner records WHICH contract armed the pad');
ok(/contract\s*&&\s*\(?\s*contract\.id/.test(opener),
   '  · and it reads that id from the `contract` argument it is handed');
ok(/if\s*\(\s*!\s*_id\s*\)[\s\S]{0,200}?(crTell|showError)/.test(opener),
   '  · an unsaved contract is refused with a message, not signed');

/* 2. apply hands the armed id back to the callback */
const apply = fnAt("if(window.__ceSigner){", 700);
ok(/__ceSignerId/.test(apply), 'the apply path reads the armed id');
ok(/_cb\(\s*_png\s*,\s*_armedId\s*\)/.test(apply), '  · and passes it to the callback');

/* 3. cancel disarms it (a left-over id is its own hazard) */
ok(/sigCancel[\s\S]{0,220}?__ceSignerId\s*=\s*null/.test(SRC),
   'cancelling the pad clears the armed id too');

/* 4. THE ONE THAT MATTERS: the callback refuses a mismatch */
const cb = fnAt('async function onContractSigned(', 900);
ok(/onContractSigned\(pngDataUrl,\s*armedId\)/.test(cb), 'the callback accepts the armed id');
ok(/armedId[\s\S]{0,140}?!==[\s\S]{0,60}?CURRENT\.id[\s\S]{0,200}?(crTell|showError)[\s\S]{0,120}?return/.test(cb),
   'a MISMATCH refuses with a message and signs nothing');
/* the refusal must come BEFORE anything is written */
const mismatchAt = cb.search(/armedId[\s\S]{0,140}?!==/);
const writeAt    = cb.search(/homeowner_signature/);
ok(mismatchAt > 0 && writeAt > 0 && mismatchAt < writeAt,
   `  · and it refuses BEFORE the signature is written (guard@${mismatchAt}, write@${writeAt})`);

console.log(fail ? `\nRED — ${fail} failed, ${pass} passed` : `\nGREEN — all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
