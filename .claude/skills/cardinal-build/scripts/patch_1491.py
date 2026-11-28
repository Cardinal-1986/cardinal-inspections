import sys
sys.path.insert(0, '/Users/cardinal/Library/Application Support/Claude/local-agent-mode-sessions/6faf96fc-b092-4eb3-bb94-9529487cc28c/6141bb56-7dbc-45f6-9b2b-f2e1860be711/rpm/plugin_01TFruGAR5g4rn2KiAVaYtG9/skills/cardinal-build/scripts')
import patch_lib as pl

src = pl.load('index_main.html')   # main 3810a86 == build 1490

# 1) 20 MB cap: a 25 MB PDF is ~33 MB as base64, over the Claude API's 32 MB request limit (PC, 27 Nov)
src = pl.sub(src, "var MAXB = 25 * 1024 * 1024;   /* 1490: originals go to storage; Claude reads PDFs up to ~30 MB */",
             "var MAXB = 20 * 1024 * 1024;   /* 1491: 20 MB — base64 of a bigger PDF passes Claude's 32 MB request limit */")
src = pl.sub(src, "if(file.size > MAXB) throw new Error('That file is ' + (file.size / 1048576).toFixed(1) + ' MB; the limit is 25 MB. Take a photo of the page instead.');",
             "if(file.size > MAXB) throw new Error('That file is ' + (file.size / 1048576).toFixed(1) + ' MB; the limit is 20 MB. Take a photo of the page instead.');")

# 2) a second pick after a failed read removes the first, unapplied upload
src = pl.sub(src, """    var f = await shrink(file);
    /* 1490: keep the original — private crew-docs bucket, office-only like crew pay */""",
"""    var f = await shrink(file);
    /* 1491: picking another file after a failed read — drop the earlier, never-applied upload first */
    if(st.saved && !st.applied){ var old = st.saved; st.saved = null; try{ await db().storage.from(old.bucket).remove([old.path]); }catch(_){} }
    /* 1490: keep the original — private crew-docs bucket, office-only like crew pay */""")

src = pl.sub(src, 'v2026-11-27 build 1490', 'v2026-11-27 build 1491')
pl.write_atomic('index_v1491.html', src)
pl.assert_in('index_v1491.html', '/* 1491: picking another file after a failed read')
pl.assert_in('index_v1491.html', "the limit is 20 MB. Take a photo of the page instead.")
print('patched')
