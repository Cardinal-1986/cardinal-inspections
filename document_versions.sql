-- document_versions — build 1079
--
-- Half two of the document history ("1 and 3"). Build 1078 records THAT a
-- delivered document changed; this keeps the copy that was delivered.
--
-- WHY THIS EXISTS, measured on production 26 Aug 2026 before a line was written:
--   inspection_reports          23 rows   (reports, estimates, contracts, work orders)
--     ...sent                    2
--     ...signed                  1
--     ...written to after being sent or signed   2
--   version / history tables     none
--   triggers on the table        none
--   html: one column, overwritten in place; avg 628 KB, largest 6.4 MB
--
-- So the document somebody signed was a single mutable copy, and regenerating
-- it overwrote what they had. This does not stop an edit — Theo picked "record
-- it AND version it", not "refuse it". It keeps the delivered copy.
--
-- ⚠ APPLY THIS BEFORE THE index.html THAT USES IT. The browser call is
--   guarded and fire-and-forget, so shipping the HTML first is not a breakage —
--   it just silently keeps no versions, which is the failure this whole build
--   is about. Run the SQL first.
--
-- Idempotent. Safe to re-run.

create table if not exists document_versions (
  id            uuid primary key default gen_random_uuid(),

  -- ⚠ ON DELETE CASCADE is a deliberate choice and it has a cost: deleting a
  --   document deletes its history with it. The alternative (restrict) would
  --   make db.remove() fail with a foreign-key violation and break a flow that
  --   works today, and orphaned versions of a document nobody can find are not
  --   an audit trail either. If document deletion should become soft instead,
  --   that is a separate decision — say so rather than changing this quietly.
  document_id   uuid not null references inspection_reports(id) on delete cascade,

  -- Per-document, starting at 1. Assigned by snapshot_document() below, never
  -- by the browser.
  version       int  not null,

  -- Why this copy was kept. 'before_edit' is the one that matters: it is the
  -- copy as it stood immediately before somebody changed a delivered document.
  reason        text not null check (reason in ('sent','signed','before_edit')),

  -- ⚠ The html lives in this column rather than in storage, on purpose. At
  --   today's volume (3 delivered documents, 628 KB average) a storage bucket
  --   would add signed URLs, an object RLS policy and a cleanup job to save a
  --   few megabytes. Revisit if this table passes ~1 GB — the shape to move to
  --   is a path into the existing private `photos` bucket, as walks/ and
  --   visualizer/ already do.
  html          text not null,

  -- The document's own state at the moment of the snapshot, copied so a
  -- version can be read and understood without joining back to a row that has
  -- since moved on.
  title         text,
  status        text,
  total         numeric,
  sent_at       timestamptz,
  signed_at     timestamptz,

  created_by    text,
  created_at    timestamptz not null default now(),

  unique (document_id, version)
);

create index if not exists document_versions_doc_idx
  on document_versions (document_id, version desc);

-- ── the writer ─────────────────────────────────────────────────────────────
-- security definer so the version number is assigned atomically and so the
-- browser never has to send the html back up: the server already has it.
-- A 6.4 MB round trip per save is exactly what this avoids.
--
-- The permission check inside is the SAME expression as reports_select, so a
-- caller can only snapshot a document they can already read. security definer
-- without that check would be a hole.
create or replace function snapshot_document(p_doc uuid, p_reason text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v int;
  r inspection_reports%rowtype;
begin
  if p_reason is null or p_reason not in ('sent','signed','before_edit') then
    raise exception 'snapshot_document: bad reason %', p_reason;
  end if;

  select * into r from inspection_reports where id = p_doc;
  if not found then
    return null;                      -- nothing to snapshot; not an error
  end if;

  if not (
    is_full_access()
    or r.created_by = my_email()
    or exists (select 1 from projects p where p.id = r.project_id)
  ) then
    raise exception 'snapshot_document: not permitted';
  end if;

  -- Only delivered documents are worth keeping history for. An unsent draft is
  -- edited constantly and nobody has a copy of it, so versioning one is pure
  -- storage. before_edit on an undelivered document is therefore a no-op.
  if r.sent_at is null and r.signed_at is null then
    return null;
  end if;

  select coalesce(max(version), 0) + 1 into v
    from document_versions where document_id = p_doc;

  insert into document_versions
    (document_id, version, reason, html, title, status, total, sent_at, signed_at, created_by)
  values
    (p_doc, v, p_reason, coalesce(r.html, ''), r.title, r.status, r.total,
     r.sent_at, r.signed_at, my_email());

  return v;
end
$$;

-- ⚠ security definer functions are callable by `public` by default, which
--   includes the anon role. Revoke first, then grant only what is needed —
--   the same tightening the anon-RPC pass applied in August.
revoke all on function snapshot_document(uuid, text) from public;
revoke all on function snapshot_document(uuid, text) from anon;
grant execute on function snapshot_document(uuid, text) to authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table document_versions enable row level security;

-- A version is visible exactly when its document is. Mirrors reports_select
-- through the parent rather than restating it, so the two cannot drift.
drop policy if exists docver_select on document_versions;
create policy docver_select on document_versions
  for select to authenticated
  using (exists (
    select 1 from inspection_reports d
     where d.id = document_versions.document_id
       and (is_full_access()
            or d.created_by = my_email()
            or exists (select 1 from projects p where p.id = d.project_id))
  ));

-- ⚠ There is deliberately NO insert policy and NO update policy.
--   Inserts happen only through snapshot_document(), which is security definer
--   and bypasses RLS after doing its own permission check. A version that the
--   browser could write directly, or edit afterwards, would not be evidence of
--   anything. Do not add one to "make a script work".

-- Delete is admin-only, for genuine cleanup. is_cardinal_admin() is
-- security-definer and already in the database.
drop policy if exists docver_delete on document_versions;
create policy docver_delete on document_versions
  for delete to authenticated
  using (is_cardinal_admin());

comment on table document_versions is
  'Immutable copies of a delivered document (inspection_reports). Written only '
  'by snapshot_document(); no insert or update policy exists on purpose. '
  'Build 1079.';
