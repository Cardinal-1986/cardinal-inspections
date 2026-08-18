-- owner_vault_schema.sql — Build 900
-- The Vault (Owner Console, module 6, admin-only): key business documents the owner
-- keeps in one place — EIN letter, insurance, licenses, formation papers, banking.
-- Files live in the `photos` bucket under an `owner-vault/` prefix that is fenced to
-- admins two ways: the DB row (owner_docs) is is_cardinal_admin() RLS, and the storage
-- object read is admin-only (see owner_vault_storage.sql — that prefix is EXCLUDED from
-- the general photos read, exactly as Studio's `studio/` prefix is).
--
-- Apply BOTH this file and owner_vault_storage.sql BEFORE the index.html change.
-- Idempotent.

create table if not exists public.owner_docs (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  category      text not null default 'other'
                 check (category in ('formation','insurance','license','tax','banking','other')),
  storage_path  text not null,
  file_name     text,
  mime          text,
  size_bytes    bigint,
  note          text,
  expires_on    date,
  created_by    text,
  created_at    timestamptz not null default now()
);

alter table public.owner_docs enable row level security;
drop policy if exists owner_docs_admin on public.owner_docs;
create policy owner_docs_admin on public.owner_docs
  for all
  using (public.is_cardinal_admin())
  with check (public.is_cardinal_admin());
