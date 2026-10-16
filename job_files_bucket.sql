-- Build 1359 — job files live in file storage, not inside a database row.
-- Theo, 16 Oct: a rep "is trying upload multiple docs and pdfs. There is a 10mb limit but some are much
-- larger." Theo picked option 1 (Supabase file storage, linked to the job) over the DGX Spark, which is never a
-- live dependency of the app (DGX_SPARK_ILLUSTRATIONS.md).
-- Until now a job file was base64 text inside inspection_reports.html — 404 files, 180 MB in rows, the
-- biggest 13 MB — and that is why the app capped them at 10 MB.
-- Apply BEFORE the build's code. Idempotent, additive: a new private bucket and four policies on it.
--
--   bucket  job-files, private, 50 MB a file, any type (contracts, PDFs, Word, spreadsheets, photos)
--   path    <project_id>/<stamp>-<name>
--   read    anyone signed in who can SEE that job (the projects RLS decides, exactly as for the job itself)
--   write   staff who can see that job
--   update  nobody (a file is replaced by uploading a new one)
--   delete  whoever uploaded it, or an admin

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-files', 'job-files', false, 52428800, null)
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = null;

drop policy if exists job_files_read on storage.objects;
create policy job_files_read on storage.objects for select to authenticated
  using (bucket_id = 'job-files'
         and exists (select 1 from public.projects p where p.id::text = (storage.foldername(name))[1]));

drop policy if exists job_files_write on storage.objects;
create policy job_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'job-files' and is_staff()
              and exists (select 1 from public.projects p where p.id::text = (storage.foldername(name))[1]));

drop policy if exists job_files_delete on storage.objects;
create policy job_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'job-files' and (owner = auth.uid() or is_cardinal_admin()));
