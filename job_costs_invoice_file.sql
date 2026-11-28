-- Build 1490 (27 Nov 2026): link a job cost to the crew's original invoice file.
-- The file itself lives in the private crew-docs bucket (read: is_full_access only — the same
-- office fence as crew pay). Run this BEFORE uploading index 1490.
alter table public.job_costs
  add column if not exists file_bucket text,
  add column if not exists file_path   text,
  add column if not exists file_name   text;
alter table public.job_costs drop constraint if exists job_costs_file_bucket_ck;
alter table public.job_costs add constraint job_costs_file_bucket_ck
  check (file_bucket is null or file_bucket = 'crew-docs');
