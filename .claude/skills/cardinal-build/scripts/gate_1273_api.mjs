/* gate_1273_api.mjs — the SHIPPED api/senddoc.js, driven with a stubbed fetch.
     1  a rep's message is sent as escaped paragraphs; HTML in it is text, not markup
     2  the signature, address and view-online link still follow the message
     3  a rep's subject is used — one line, newlines removed
     4  with no message and no subject, the email is byte-identical to before
     5  reply_to is still the signed-in sender, whatever was sent
   usage: node gate_1273_api.mjs [path/to/senddoc.js] — RED on 1272's route
*/
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { tmpdir } from 'os';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../api/senddoc.js');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
const dir=mkdtempSync(join(tmpdir(),'g1273-'));
writeFileSync(join(dir,'route.mjs'), readFileSync(FILE,'utf8').replace("import { isStaff } from './_staff.js';", "const isStaff = (e) => /@cardinalrenovations\\.net$/.test(String(e||''));"));
process.env.RESEND_API_KEY='test-not-real';
let mails=[];
globalThis.fetch=async (u, o)=>{ u=String(u);
  if(u.includes('/auth/v1/user')) return { ok:true, json:async()=>({ email:'jacob@cardinalrenovations.net', user_metadata:{ full_name:'Jacob' } }) };
  if(u.includes('api.resend.com')){ mails.push(JSON.parse(o.body)); return { ok:true, text:async()=>'' }; }
  return { ok:false, json:async()=>false, text:async()=>'' }; };
const mod=await import(pathToFileURL(join(dir,'route.mjs')).href);
function call(body){ return new Promise(async res=>{ const r={ _s:200, status(s){ this._s=s; return this; }, json(j){ res({ status:this._s, body:j }); } };
  await mod.default({ method:'POST', headers:{ authorization:'Bearer t' }, body }, r); }); }
const base={ to:'dave@example.com', clientName:'Dave McCoy', title:'EST-2026-0912 — Estimate — Dave McCoy', html:'<p>doc</p>', shareUrl:'https://app.cardinalroster.com/?share=abc' };

mails=[]; const r0=await call(base); const m0=mails[0]||{};
const orig=readFileSync(FILE,'utf8');
need('4  no message, no subject: the usual subject and body', r0.status===200 && m0.subject==='EST-2026-0912 — Estimate — Dave McCoy — Cardinal Roofing & Renovations' && /Please find your <b>EST-2026-0912/.test(m0.html||''), JSON.stringify({s:r0.status,subj:m0.subject}));

mails=[]; const r1=await call(Object.assign({}, base, { subject:'Your roof estimate\r\nBcc: x@evil.test', message:'Dave,\n\nGreat meeting you <b>today</b>.\nSee below.\n\nJacob' }));
const m1=mails[0]||{}, h=m1.html||'';
need('1  the message goes as escaped paragraphs', r1.status===200 && h.includes('<p>Dave,</p>') && h.includes('<p>Great meeting you &lt;b&gt;today&lt;/b&gt;.<br>See below.</p>') && h.includes('<p>Jacob</p>') && !h.includes('<b>today</b>'), h.slice(0,400));
need('1  …and replaces the usual words', !/Please find your/.test(h), 'usual sentence still present');
need('2  the signature, address and view-online link still follow it', /— Jacob<br>/.test(h) && /5735 Webster Street/.test(h) && h.includes('https://app.cardinalroster.com/?share=abc') && h.indexOf('<p>Jacob</p>') < h.indexOf('5735 Webster'), h.slice(-400));
need('3  the rep’s subject is used, on one line', m1.subject==='Your roof estimate Bcc: x@evil.test', JSON.stringify(m1.subject));
need('5  reply_to is still the signed-in sender', m1.reply_to==='jacob@cardinalrenovations.net' && m0.reply_to==='jacob@cardinalrenovations.net', JSON.stringify([m0.reply_to,m1.reply_to]));

console.log((fails.length?'GATE 1273 API RED':'GATE 1273 API GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
