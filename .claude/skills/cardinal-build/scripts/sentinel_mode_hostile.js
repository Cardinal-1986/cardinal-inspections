/* Prelude for the HOSTILE-STRINGS sweep: pass BEFORE sentinel_setup_cardinal.js.
   Client names and addresses become 100-char strings and an <img onerror>
   injection; the full walk runs. What this proves: no renderer lets a name
   execute as markup (the XSS canary), and blowouts surface as CLIPPED /
   OVERFLOW. Not a fuzzer — three boundary values on the primary fixtures. */
globalThis.__SENTINEL_MODE__ = 'hostile';
