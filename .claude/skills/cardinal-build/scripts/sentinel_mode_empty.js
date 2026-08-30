/* Prelude for the EMPTY-BOOK sweep: pass BEFORE sentinel_setup_cardinal.js in
   --setup. The setup empties every seeded collection, relaxes seedLanded()
   (an empty store IS the state under test), and trims the walk to states
   that do not open a specific project. What this proves: every remaining
   screen renders its honest empty state instead of crashing or painting a
   blank tile — the 493 class. */
globalThis.__SENTINEL_MODE__ = 'empty';
