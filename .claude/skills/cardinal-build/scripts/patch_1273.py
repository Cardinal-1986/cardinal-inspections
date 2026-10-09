#!/usr/bin/env python3
"""Build 1273 — edit the email's subject and message before it goes (Theo, 9 Oct).

"When sending the email of estimate allow us to edit the email subject and body."

Email to client asked for an address in a bare prompt() and sent a fixed
subject and body built on the server. It now opens a sheet — To, Subject,
Message — prefilled with exactly what the email has always said. senddoc gains
`message` (plain text, escaped, blank lines become paragraphs) and its homeowner
path accepts `subject`; with neither, it sends what it always sent, so the
other caller (the guide) is unchanged. The rep's signature, the company address
and the view-online link stay server-side, below the message. From and reply_to
are untouched: reply_to is still the signed-in sender.

usage: python3 patch_1273.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. the address prompt goes; the sheet runs after the greeting is worked out
src = pl.sub(src, """    var to = prompt(toAsk, toDflt);
    if(to === null) return;
    to = to.trim();
    if(!to || to.indexOf('@') === -1){ showError('Enter a valid email address.'); return; }
    btn.disabled = true; _bl.textContent = 'Sending\\u2026';
""", "")
src = pl.sub(src, """    }catch(_e2){ try{ if(window.report) window.report(_e2, 'Documents', 'send greeting'); }catch(__e){} }
""", """    }catch(_e2){ try{ if(window.report) window.report(_e2, 'Documents', 'send greeting'); }catch(__e){} }
    /* 1273: the rep sees and can change To, Subject and Message. The defaults are
       the words senddoc has always sent. */
    var _docTtl = (row && row.title) || 'Cardinal Document';
    var em = await crEmailSheet({ toLabel: toAsk.replace(/:\\s*$/, ''), to: toDflt,
      subject: _docTtl + ' \\u2014 Cardinal Roofing & Renovations',
      message: 'Hi' + (greetName ? ' ' + greetName : '') + ',\\n\\n' +
        'Please find your ' + _docTtl + ' attached. Open the attachment in any web browser to view it, and print or save it as a PDF from there.' +
        (propLine ? '\\n\\n' + propLine : '') + '\\n\\nQuestions? Just reply to this email.' });
    if(!em) return;
    var to = em.to;
    btn.disabled = true; _bl.textContent = 'Sending\\u2026';
""")
src = pl.sub(src, """        title: (row && row.title) || 'Cardinal Document',
        html: await inlineDocImages(serializeFrame()),   /* 1270 */""", """        title: (row && row.title) || 'Cardinal Document',
        subject: em.subject, message: em.message,   /* 1273 */
        html: await inlineDocImages(serializeFrame()),   /* 1270 */""")
# 1b. a document published a moment ago is not in cacheRows yet (publish never
#     reloads), so row and project were null: no To, "Hi," and "Cardinal Document".
src = pl.sub(src, """    if(!await priceOkToSend((titleInput.value || '').trim() || 'document')) return;
    var row = currentDocRow();""", """    if(!await priceOkToSend((titleInput.value || '').trim() || 'document')) return;
    /* 1273: just published (the estimate bar's Email does exactly this) — the
       list has not caught up, so fetch it before reading who this is for. */
    if(!currentDocRow()){ try{ await reload(); }catch(_rl){} }
    var row = currentDocRow();""")
A = "document.getElementById('emailDocBtn').addEventListener('click', async function(){"
src = pl.sub(src, A, open(os.path.join(HERE, 'email_1273_add.js')).read().strip('\n') + '\n' + A)

# 2. its styles — the 1262 sheet, above the installed app's bottom nav
src = pl.sub(src, """/* 1262: Upload signed contract — the same fixed dark sheet as 1258 */
""", """/* 1273: Email to client — the 1262 sheet. z-index above body.standalone #pwaNav
   (9990), or the installed app's nav covers Send. */
#crEmailSheet{position:fixed;left:0;right:0;bottom:0;z-index:9995;display:none;max-height:92vh;overflow:auto;
  padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));background:#16161b;color:#eceef0;
  border-top:1px solid #2a2d33;box-shadow:0 -8px 30px rgba(0,0,0,.4);}
#crEmailSheet.open{display:block;}
#crEmailSheet .q{max-width:560px;margin:0 auto;}
#crEmailSheet b{display:block;font:700 18px 'Segoe UI',Arial,sans-serif;color:#eceef0;}
#crEmailSheet p{margin:4px 0 12px;font:400 15px 'Segoe UI',Arial,sans-serif;color:#b8bec6;}
#crEmailSheet label{display:block;margin:0 0 12px;font:700 13px 'Segoe UI',Arial,sans-serif;color:#b8bec6;}
#crEmailSheet input, #crEmailSheet textarea{display:block;width:100%;box-sizing:border-box;margin-top:6px;min-height:48px;
  padding:12px;border-radius:10px;border:1px solid #3a3e46;background:#0f1014;color:#eceef0;
  font:400 16px 'Segoe UI',Arial,sans-serif;}
#crEmailSheet textarea{min-height:190px;line-height:1.45;resize:vertical;}
#crEmailSheet .st{min-height:22px;margin:0 0 10px;font:600 15px 'Segoe UI',Arial,sans-serif;color:#e8b04a;}
#crEmailSheet .row{display:flex;flex-wrap:wrap;gap:10px;}
#crEmailSheet .pri, #crEmailSheet .no{flex:1 1 140px;display:flex;align-items:center;justify-content:center;min-height:48px;
  border-radius:10px;cursor:pointer;font:700 15px 'Segoe UI',Arial,sans-serif;}
#crEmailSheet .pri{background:#c8202e;border:1px solid #c8202e;color:#ffffff;}
#crEmailSheet .no{background:transparent;border:1px solid #3a3e46;color:#eceef0;}
/* 1262: Upload signed contract — the same fixed dark sheet as 1258 */
""")

src = pl.sub(src, '>v2026-10-09 build 1272<', '>v2026-10-09 build 1273<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1273, d: '2026-10-09', t: 'Edit the email before it goes',
    s: '<b>Email to client</b> now opens a sheet with the address, the subject and the message, filled in with what the email has always said. Change any of it, then <b>Send</b>. Your name, the company address and the view-online link are still added under your message.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
