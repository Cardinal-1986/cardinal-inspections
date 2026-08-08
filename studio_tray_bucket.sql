-- studio_tray_bucket.sql — the tray stops being one undifferentiated pile.
-- Idempotent. RUN THIS BEFORE the HTML change.
--
-- WHY: Theo, looking at the tray shipped at 627 — "Is there a bin for keep for
-- before and after, a bin for damage vs how we do it, and a bin for junk?"
--
-- Three destinations already existed; only two were reachable, and the tray did
-- not distinguish between them:
--
--   junk               -> studio_photos.archived_at   (the Bin, per site) ✅
--   before & after     -> showcase_pairs              (via the tray)      ✅
--   theirs vs ours     -> workmanship_pairs           UPLOAD-ONLY         ❌
--
-- The Hall of Fame table has existed since build 576, but saveWork() read its
-- two photographs from file inputs and could not see the tray at all. So a
-- ticked bad-install photo landed in the same pile as the before/afters and the
-- only thing it could become was a Showcase pair.
--
-- WHY A COLUMN AND NOT A SECOND TABLE: a tray entry is the same fact either way
-- — "Theo picked this photograph" — differing only in what he picked it FOR. A
-- second table would be two mechanisms answering one question, which is a named
-- trap on this project. storage_path stays the primary key, so a photo lives in
-- one bucket at a time and re-ticking MOVES it rather than duplicating it.
-- That is deliberate: the same photograph being both halves of two different
-- stories is not a thing that happens.
--
-- WHY NOT REUSE THE EXISTING `note` COLUMN: `note` is free text meant for a
-- human remark. Overloading it as an enum would make both uses unsafe — no
-- check constraint possible, and any note someone types would silently change
-- which bucket the photo is in.
--
-- ⚠️ THE GPS FENCE IS UNCHANGED AND STILL RUNS THROUGH HERE.
-- studio_photos carries lat/lon (all 60,503 rows NULL today). studio_tray has
-- no coordinate columns, toggleTray() names its fields explicitly rather than
-- spreading the source row, and harness_tray.js asserts all of it. Adding a
-- bucket does not change that. Do not "complete" the row.

alter table public.studio_tray
  add column if not exists bucket text not null default 'showcase';

-- Existing rows default to 'showcase', which is what they already were: the
-- tray had exactly one consumer before this.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.studio_tray'::regclass
       and conname  = 'studio_tray_bucket_ck'
  ) then
    alter table public.studio_tray
      add constraint studio_tray_bucket_ck
      check (bucket in ('showcase', 'workmanship'));
  end if;
end $$;

comment on column public.studio_tray.bucket is
  'What the photo was picked FOR: showcase = a before/after pair, workmanship = a theirs-vs-ours comparison. Mirrors the two pair tables. Constrained; one bucket per photo, because storage_path is the primary key.';

-- The picker reads one bucket at a time, newest first.
create index if not exists studio_tray_bucket_added_idx
  on public.studio_tray (bucket, added_at desc);

-- RLS is unchanged — studio_tray_admin_all already covers every column, and a
-- new column on an existing table inherits the table's policies. Stated because
-- "do I need a new policy for a new column?" is a real question and the answer
-- here is no.

-- Revert, for the record:
--   drop index if exists public.studio_tray_bucket_added_idx;
--   alter table public.studio_tray drop constraint if exists studio_tray_bucket_ck;
--   alter table public.studio_tray drop column if exists bucket;
