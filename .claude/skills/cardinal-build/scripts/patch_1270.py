"""patch_1270.py — the emailed estimate/report: pictures inside the file, no editing banner.
usage: python3 patch_1270.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. every editing banner comes off, not just the first
src = pl.sub(src, '''  var hint = clone.querySelector('[data-cardinal-hint]');
  if(hint) hint.remove();''', '''  /* 1270: ALL of them. The banner is added each time the frame loads, so a
     document opened twice carried two, and querySelector took off one. */
  clone.querySelectorAll('[data-cardinal-hint]').forEach(function(el){ el.remove(); });''')
# 2. and it is only ever added once
src = pl.sub(src, '''      var hint = doc.createElement('div');
      hint.setAttribute('data-cardinal-hint','1');''', '''      Array.prototype.forEach.call(doc.querySelectorAll('[data-cardinal-hint]'), function(el){ el.remove(); });   /* 1270 */
      var hint = doc.createElement('div');
      hint.setAttribute('data-cardinal-hint','1');''')
# 3. the email carries its pictures
src = pl.sub(src, '''        html: serializeFrame(),
        shareUrl: tok ? shareUrlFor(tok) : null''', '''        html: await inlineDocImages(serializeFrame()),   /* 1270 */
        shareUrl: tok ? shareUrlFor(tok) : null''')
A = '''function serializeFrame(){'''
src = pl.sub(src, A, open(os.path.join(HERE, 'inline_1270_add.js')).read().strip('\n') + '\n' + A)

src = pl.sub(src, '>v2026-10-09 build 1269<', '>v2026-10-09 build 1270<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1270, d: '2026-10-09', t: 'Emailed estimates show their pictures',
    s: 'An estimate or report sent with <b>Email to client</b> arrives as a file. Opened on an iPhone, every picture in it was a \\u201C?\\u201D box \\u2014 the Cardinal logo and the photos \\u2014 and the yellow \\u201CEditing mode\\u201D banner could ride along at the top. The pictures now travel inside the file, so they show without the internet, and the banner never goes out.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
