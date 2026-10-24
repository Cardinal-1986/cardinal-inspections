-- definer_guards.sql — Supabase security advisor follow-up, 24 Oct 2026.
--
-- 1. snapshot_document() is SECURITY DEFINER, so its "can the caller see the project?" test
--    (exists (select 1 from projects ...)) ran with RLS OFF and was true for every document.
--    Any signed-in account could add version rows to any sent or signed document. The test now
--    also requires Cardinal staff, which is what the app's only caller (saving a document) is.
--    Nothing else changes: same reasons, same return values.
-- 2. job_total_for(pid) is SECURITY DEFINER and was executable by anon: anyone holding a job's
--    id could read its contract total without signing in. Only SQL calls it (the collections
--    guards, which run as the owner), so anon loses EXECUTE; authenticated keeps it.
--
-- REVERT: grant execute on function public.job_total_for(uuid) to anon; and re-create
--         snapshot_document without "is_staff() and" in its guard.

set lock_timeout = '3s';

create or replace function public.snapshot_document(p_doc uuid, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare v int; r inspection_reports%rowtype;
begin
  if p_reason is null or p_reason not in ('sent','signed','before_edit') then
    raise exception 'snapshot_document: bad reason %', p_reason;
  end if;
  select * into r from inspection_reports where id = p_doc;
  if not found then return null; end if;
  if not ( is_full_access() or r.created_by = my_email()
           or (is_staff() and exists (select 1 from projects p where p.id = r.project_id)) ) then
    raise exception 'snapshot_document: not permitted';
  end if;
  if r.sent_at is null and r.signed_at is null then return null; end if;
  select coalesce(max(version), 0) + 1 into v from document_versions where document_id = p_doc;
  insert into document_versions (document_id, version, reason, html, title, status, total, sent_at, signed_at, created_by)
  values (p_doc, v, p_reason, coalesce(r.html, ''), r.title, r.status, r.total, r.sent_at, r.signed_at, my_email());
  return v;
end $$;

revoke execute on function public.job_total_for(uuid) from public, anon;
grant execute on function public.job_total_for(uuid) to authenticated, service_role;
