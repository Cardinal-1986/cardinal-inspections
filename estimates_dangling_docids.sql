-- estimates_dangling_docids.sql — build 1014 (23 Aug 2026)
-- One-time cleanup for audit finding DB-1: 5 estimates rows carry a doc_id
-- pointing at an inspection_reports row that no longer exists, because the
-- document-delete path never cleared the referring columns (the code fix ships
-- in the same build). A dangling doc_id makes the publish path "update" a
-- nonexistent document (0 rows, no error) instead of creating a fresh one.
--
-- Measured before writing (23 Aug 2026, build 1013):
--   00771120-07b4-437b-9583-ba98eb75914d  Betty Mann     draft  $0         doc_id 0c4d6bba-9284-4758-89d5-201859c4b5e5
--   0b901d7c-a183-4593-ae24-c842f4efcf9e  Betty Mann     sent   $1,820.00  doc_id ce7d23f6-32a6-4ca4-a98e-fd2a9f9cc1dc
--   7e5e88b2-ea63-4b2a-a8fa-abadcc4da75f  Kimberly Guy   sent   $21,451.00 doc_id dc1e5bf1-37f9-4bdd-b3a8-8d931093b2f9
--   fe820471-1f26-42fd-a7cd-c9d8f0afeb1f  Kimberly Guy   sent   $36,654.00 doc_id 786a99e9-27e2-4682-8ecf-c559270e0fca
--   ee7afee2-6a2e-4f57-9264-794ac88cfd7d  Dan Thompson   sent   $11,920.99 doc_id 947b50a2-02b2-4525-b02e-40c790be7abf
--   (no contract_doc_id dangles existed)
-- Revert: re-set each doc_id above with an UPDATE ... WHERE id = ...;
--
-- IDEMPOTENT: only nulls references whose target row genuinely does not exist,
-- so re-running it (or running it after the code fix) changes nothing.

UPDATE estimates e
SET doc_id = NULL
WHERE e.doc_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM inspection_reports ir WHERE ir.id = e.doc_id);

UPDATE estimates e
SET contract_doc_id = NULL
WHERE e.contract_doc_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM inspection_reports ir WHERE ir.id = e.contract_doc_id);
