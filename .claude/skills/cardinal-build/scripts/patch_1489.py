import sys
sys.path.insert(0, '/Users/cardinal/Library/Application Support/Claude/local-agent-mode-sessions/6faf96fc-b092-4eb3-bb94-9529487cc28c/6141bb56-7dbc-45f6-9b2b-f2e1860be711/rpm/plugin_01TFruGAR5g4rn2KiAVaYtG9/skills/cardinal-build/scripts')
import patch_lib as pl

src = pl.load('index_v1488.html')
mod = open('crinv_module.html', encoding='utf8').read()

# 1) Costs tab foot: office gets "Read crew invoice" beside "Add a cost"
OLD = """      else h += '<div class="crjp-foot"><button type="button" class="crji-btn primary" data-crjp-add="' + E(pid) + '">' + (office ? 'Add a cost' : 'Add a receipt') + '</button></div>';"""
NEW = """      else h += '<div class="crjp-foot"><button type="button" class="crji-btn primary" data-crjp-add="' + E(pid) + '">' + (office ? 'Add a cost' : 'Add a receipt') + '</button>' +
        (office ? '<button type="button" class="crji-btn" data-crinv-open="' + E(pid) + '">Read crew invoice</button>' : '') + '</div>';   /* 1489 */"""
src = pl.sub(src, OLD, NEW)

# 2) the module, appended before the document's own closing body tag (rfind: templates embed full documents)
i = src.rfind('</body>')
assert i > 0
src = src[:i] + mod + '\n' + src[i:]

# 3) build label
src = pl.sub(src, 'v2026-11-27 build 1488', 'v2026-11-27 build 1489')
pl.write_atomic('index_v1489.html', src)
pl.assert_in('index_v1489.html', 'Build 1489 · Crew invoice reader')
pl.assert_in('index_v1489.html', 'data-crinv-open="')
print('patched')
