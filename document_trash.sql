-- Build 1345 — deleting a document moves it to a Trash it can be restored from for 30 days.
-- Theo, 14 Oct ("2a"), after five signed/priced documents on one job were deleted in three minutes and could
-- not be recovered: a hard DELETE on inspection_reports also cascades its document_versions away.
-- Apply BEFORE the build's code. Idempotent.
--
-- trash_document(p_doc)   — the app's delete. Same permission as the reports_delete policy
--                           (full access, or the document's creator). Copies the row AND its saved versions
--                           into document_trash, then deletes it. Purges trash older than 30 days.
-- restore_document(p_id)  — full access, or whoever deleted it. Puts the row and its versions back, same id.
-- document_trash          — read: full access or the deleter. Removed for good only by an admin
--                           (or the 30-day purge). Nobody inserts directly; only the functions write.

drop table if exists public.document_trash_probe;   -- an empty table left by the 14 Oct diagnosis

create table if not exists public.document_trash (
  id          uuid primary key default gen_random_uuid(),
  doc_id      uuid not null,
  project_id  uuid,
  title       text,
  doc         jsonb not null,
  versions    jsonb,
  deleted_by  text,
  deleted_at  timestamptz not null default now()
);
create index if not exists document_trash_project_idx on public.document_trash (project_id, deleted_at desc);
alter table public.document_trash enable row level security;
drop policy if exists document_trash_select on public.document_trash;
create policy document_trash_select on public.document_trash for select
  using (is_full_access() or deleted_by = my_email());
drop policy if exists document_trash_delete on public.document_trash;
create policy document_trash_delete on public.document_trash for delete
  using (is_cardinal_admin());

create or replace function public.trash_document(p_doc uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r  inspection_reports%rowtype;
  tid uuid;
begin
  select * into r from inspection_reports where id = p_doc;
  if not found then raise exception 'That document no longer exists.' using errcode = 'P0002'; end if;
  if not (is_full_access() or r.created_by = my_email()) then
    raise exception 'You can only delete documents you created.' using errcode = '42501';
  end if;
  insert into document_trash (doc_id, project_id, title, doc, versions, deleted_by)
  values (r.id, r.project_id, r.title, to_jsonb(r),
          (select jsonb_agg(to_jsonb(v)) from document_versions v where v.document_id = r.id),
          my_email())
  returning id into tid;
  delete from inspection_reports where id = p_doc;
  delete from document_trash where deleted_at < now() - interval '30 days';
  return tid;
end;
$$;

create or replace function public.restore_document(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  t document_trash%rowtype;
begin
  select * into t from document_trash where id = p_id;
  if not found then raise exception 'That item is no longer in the Trash.' using errcode = 'P0002'; end if;
  if not (is_full_access() or t.deleted_by = my_email()) then
    raise exception 'Only the person who deleted it, or the office, can restore it.' using errcode = '42501';
  end if;
  if exists (select 1 from inspection_reports where id = t.doc_id) then
    raise exception 'That document is already back.' using errcode = '23505';
  end if;
  insert into inspection_reports select * from jsonb_populate_record(null::inspection_reports, t.doc);
  if t.versions is not null then
    insert into document_versions select * from jsonb_populate_recordset(null::document_versions, t.versions);
  end if;
  delete from document_trash where id = p_id;
  return t.doc_id;
end;
$$;

revoke all on function public.trash_document(uuid) from public, anon;
revoke all on function public.restore_document(uuid) from public, anon;
grant execute on function public.trash_document(uuid) to authenticated;
grant execute on function public.restore_document(uuid) to authenticated;
grant select, delete on public.document_trash to authenticated;

-- Revert:
--   drop function if exists public.restore_document(uuid);
--   drop function if exists public.trash_document(uuid);
--   drop table if exists public.document_trash;   -- ⚠ destroys anything still in the Trash
