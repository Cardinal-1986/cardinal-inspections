#!/usr/bin/env python3
"""Build 1278 — an estimate looks the same on a phone as on paper (Theo, 10 Oct:
"Why does the finished estimate look different when made on the phone?" … "It shouldn't").

The document was never different — buildDocHtml has no device logic — but it was
SHOWN differently: device-width viewport + max-width:560px rules restacked it on a
phone. Theo's call: one look everywhere, the Letter page shrunk to fit, like a PDF.

Three surfaces, three levers (an estimate = a document with .est-head and table.items):
  1. The estimate template (and Good/Better/Best) says viewport width=900, so a phone
     lays it out at Letter width and zooms to fit. No 560px/9in rule can match.
  2. api/share.js rewrites an OLD estimate's device-width viewport to width=900 as it
     serves it, so estimates already sent look the same too. serializeFrame does the
     same on save/email, so a reopened old estimate is fixed for good.
  3. The in-app viewer is an iframe, where a viewport meta is ignored and media queries
     read the IFRAME width. Zooming the page inside would not help — at 390px it has
     already restacked. So the IFRAME is given 880px and scaled down from outside
     (fitEstimateFrame), and the editor's screenFix is told to keep the Letter body.
     Reports, contracts without a price table, and computers are untouched.

usage: python3 patch_1278.py [index.html] [api/share.js]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
SHARE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '../../../../api/share.js')
src = pl.load(PATH)

# 1. the templates
OLD = "'<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\\n' +"
i = src.index("function buildDocHtml(est, project, urls){")
j = src.index(OLD, i)
src = src[:j] + "'<meta name=\"viewport\" content=\"width=900\"><style>html{-webkit-text-size-adjust:100%;text-size-adjust:100%}</style>\\n' +   /* 1278: the Letter page, shrunk to fit — same as paper */" + src[j+len(OLD):]
src = pl.sub(src, "    '<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\\n' +", "    '<meta name=\"viewport\" content=\"width=900\"><style>html{-webkit-text-size-adjust:100%;text-size-adjust:100%}</style>\\n' +   /* 1278 */")

# 2. serializeFrame: an old estimate is fixed the next time it is saved or emailed
src = pl.sub(src, """  var sf = clone.querySelector('#screenFix');
  if(sf) sf.remove();""", """  var sf = clone.querySelector('#screenFix');
  if(sf) sf.remove();
  var _ef = clone.querySelector('#estFrameFix');   /* 1278 */
  if(_ef) _ef.remove();
  /* 1278: an estimate is laid out at Letter width on every screen. */
  if(clone.querySelector('.est-head') && clone.querySelector('table.items')){
    var _vp = clone.querySelector('meta[name="viewport"]');
    if(_vp) _vp.setAttribute('content', 'width=900');
  }""")

# 3. the in-app viewer
src = pl.sub(src, """      doc.body.setAttribute('spellcheck','true');
      doc.body.style.outline = 'none';
      Array.prototype.forEach.call(doc.querySelectorAll('[data-cardinal-hint]'), function(el){ el.remove(); });   /* 1270 */""", """      /* 1278: an estimate keeps its Letter body in the editor too (screenFix above
         would let it run to the frame's width); fitEstimateFrame scales the frame. */
      if(doc.querySelector('.est-head') && doc.querySelector('table.items') && !doc.getElementById('estFrameFix')){
        var _eff = doc.createElement('style');
        _eff.id = 'estFrameFix';
        _eff.textContent = '@media screen{body{width:8.5in !important;max-width:none !important;padding:0.75in 0.65in 0.9in !important;}}';
        doc.head.appendChild(_eff);
      }
      doc.body.setAttribute('spellcheck','true');
      doc.body.style.outline = 'none';
      Array.prototype.forEach.call(doc.querySelectorAll('[data-cardinal-hint]'), function(el){ el.remove(); });   /* 1270 */""")
src = pl.sub(src, """      wireInvoiceLive(doc, r);   /* 1109: live invoice status/balance/ledger */""", """      wireInvoiceLive(doc, r);   /* 1109: live invoice status/balance/ledger */
      fitEstimateFrame();   /* 1278 */""")
src = pl.sub(src, """function serializeFrame(){""", """/* 1278: on a narrow screen an ESTIMATE is shown as its Letter page, shrunk to fit,
   so it looks the same as on paper and on a computer. An iframe ignores a viewport
   meta and its media queries read the iframe's own width, so the frame itself is
   given a Letter-wide 880px and scaled down from outside. Anything else, and any
   screen wide enough, gets the frame back exactly as it was. */
var EST_FIT_W = 880;
function fitEstimateFrame(){
  try{
    var wrap = document.getElementById('reportFrameWrap');
    var d = frame && /** @type {any} */ (frame).contentDocument;
    var isEst = !!(d && d.querySelector('.est-head') && d.querySelector('table.items'));
    var ww = wrap ? wrap.clientWidth : 0, wh = wrap ? wrap.clientHeight : 0;
    if(isEst && ww && ww < EST_FIT_W){
      var k = ww / EST_FIT_W;
      frame.style.width = EST_FIT_W + 'px';
      frame.style.height = (wh / k) + 'px';
      frame.style.right = 'auto'; frame.style.bottom = 'auto';
      frame.style.transformOrigin = '0 0';
      frame.style.transform = 'scale(' + k + ')';
      frame.setAttribute('data-est-fit', k.toFixed(3));
    } else if(frame && frame.hasAttribute('data-est-fit')){
      ['width','height','right','bottom','transformOrigin','transform'].forEach(function(p){ frame.style[p] = ''; });
      frame.removeAttribute('data-est-fit');
    }
  }catch(_f){}
}
window.addEventListener('resize', function(){ fitEstimateFrame(); });
function serializeFrame(){""")

src = pl.sub(src, '>v2026-10-10 build 1277<', '>v2026-10-10 build 1278<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1278, d: '2026-10-10', t: 'An estimate looks the same on a phone',
    s: 'On a phone an estimate used to rearrange itself into one narrow column. It now shows the same Letter page you see on a computer and on paper, shrunk to fit the screen \\u2014 pinch to zoom in. That holds in the app, on the link the client opens, and in the emailed file, for estimates already sent too.' },
''')
pl.write_atomic(PATH, src)

sh = open(SHARE, encoding='utf-8').read()
a = "    html = html.includes('</head>') ? html.replace('</head>', FIX + '\\n</head>') : FIX + html;"
assert sh.count(a) == 1, 'share anchor'
sh = sh.replace(a, a + """
    // 1278: an estimate is shown as its Letter page on every screen, the same as
    // paper. Estimates stored before 1278 carry a device-width viewport; serve them
    // at Letter width too, so a client's phone never restacks them — and never
    // enlarges one paragraph of it on its own (text autosizing).
    if (/class="est-head"/.test(html) && /<table class="items">/.test(html)) {
      html = html.replace(/<meta name="viewport" content="[^"]*">/, '<meta name="viewport" content="width=900"><style>html{-webkit-text-size-adjust:100%;text-size-adjust:100%}</style>');
    }""")
open(SHARE, 'w', encoding='utf-8').write(sh)
print('patched', PATH, SHARE)
