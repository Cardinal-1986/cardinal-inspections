-- design_jobs.achieved — what colour the render ACTUALLY came out, per surface.
--
-- ─────────────────────────────────────────────────────────────────────────
-- WHY
--
-- Three times on 15 Aug a render came back the wrong colour and the only
-- evidence available was a photograph of a monitor. Each diagnosis was a
-- guess, and two of the three guesses were wrong before they were right:
--
--   1. "the prompt leads with marketing copy"        — real, but not this
--   2. "denoise=1 rebuilds from noise"               — correct
--   3. "luminance-preserving is enough"              — wrong; the lightness
--      has to move too, and the same defect looked FINE on siding and
--      broken on roof, which is what made it so hard to see
--
-- The worker is the only thing that can see both the swatch and the finished
-- pixels. So it measures: mean colour inside each mask on the final render,
-- against the hex that was asked for, and the drift between them.
--
-- Then "the roof is still off" stops being an argument and becomes a number,
-- and — more usefully — it separates two failures that look identical from
-- the outside:
--
--   drift SMALL  -> the pipeline did its job; the SWATCH is wrong, or the
--                   eye disagrees with the paint chip. Do not touch the code.
--   drift LARGE  -> the tint did not land, or FLUX pulled it back. Turn
--                   TINT_STRENGTH up or FLUX_DENOISE down.
--
-- Shape:
--   {"roof": {"want": "#6E7A69", "got": "#8A9184", "drift": 28},
--    "siding": {"want": "#4E5154", "got": "#53565A", "drift": 6}}
--
-- drift is the largest per-channel difference, 0-255. Nothing here is a
-- coordinate, a filename or anything about a person — it is three numbers per
-- surface. The GPS exclusion is untouched.
--
-- Idempotent. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.design_jobs
  add column if not exists achieved jsonb;

comment on column public.design_jobs.achieved is
  'Measured mean colour inside each surface mask on the finished render, vs the '
  'hex that was requested: {surface: {want, got, drift}}. Written by the Spark '
  'worker. Large drift means the pipeline missed; small drift with a complaint '
  'means the swatch itself is wrong. Added 15 Aug 2026 to stop diagnosing '
  'colour from photographs of a monitor.';

-- No RLS change. design_jobs policies already cover every column:
--   design_jobs_read/update/delete  is_cardinal_admin() OR created_by = my_email()
--   design_jobs_write               is_staff() AND created_by = my_email()
-- and the worker writes with the service key, which bypasses RLS entirely.
