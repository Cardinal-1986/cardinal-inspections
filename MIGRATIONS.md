# Migrations — what ran, in what order, and what must never run twice

**Generated. Do not hand-edit.** Regenerate with:

```bash
python3 .claude/skills/cardinal-build/scripts/migration_manifest.py
```

`84` `.sql` files at the repo root. **All are applied by hand against Supabase** — nothing in the app or the deploy ever runs one, and `.vercelignore` blanket-excludes `*.sql` so none is ever served.

## Read this before trusting the order

**The `shipped at` column is the ordering signal, not the git date.** It is the lowest build number in `cardinal_build_log.md` that names the file. Git cannot answer this: PRs on this repo are **squash-merged**, so a file written across five builds lands in one commit, and dozens of early migrations share a single commit date that has nothing to do with when they ran.

⚠️ **28 file(s) are named by no build-log heading**, so their order is unknown and they are listed last. That is not a grep artifact — checked, only one of them appears anywhere in the log's text. Most are documented in `CLAUDE.md` or `FEATURES.md` instead; the `documented in` column says where. **A file marked `NOTHING` is named by no doc at all** — read it before running it.

⚠️ **12 file(s) drop, delete or truncate something.** They are marked **DESTRUCTIVE** below. Most are one-off repairs against production data that has since been fixed — **replaying one on a live database destroys current rows.** A fresh-database bootstrap must skip every one of them.

`replayable` means every statement in the file guards itself (`if not exists` / `if exists` / `or replace` / `on conflict`). A file that is **not** replayable errors on a second run rather than corrupting anything — that is the safe failure, and it is not the same as DESTRUCTIVE.

## The files

| # | shipped at | file | stmts | replayable | destructive | documented in |
|---:|---:|---|---:|:---:|:---:|---|
| 1 | 473 | `companycam_index.sql` | 13 | ✅ | — | CONTRACTOR_VISION_SUITE.md, FEATURES.md … |
| 2 | 496 | `companycam_search.sql` | 5 | ✅ | — | build log only |
| 3 | 524 | `estimates_delete_policy.sql` | 2 | ✅ | — | FEATURES.md |
| 4 | 568 | `estimates_update_policy.sql` | 2 | ✅ | — | CLAUDE.md, HANDOFF.md |
| 5 | 579, 592, 1076 | `walks_schema.sql` | 36 | ✅ | — | CLAUDE.md, FEATURES.md … |
| 6 | 592 | `studio_objects_rls.sql` | 2 | — | — | CLAUDE.md |
| 7 | 602 | `punch_comments.sql` | 2 | ✅ | — | build log only |
| 8 | 614 | `itel_register.sql` | 11 | ✅ | — | CR_AUDIT_2026-08.md |
| 9 | 614 | `oc_color_covers.sql` | 8 | ✅ | — | build log only |
| 10 | 614 | `oc_colors_hidden.sql` | 3 | ✅ | — | build log only |
| 11 | 614 | `oc_coty_year.sql` | 10 | ✅ | — | build log only |
| 12 | 614 | `oc_discontinued_fix.sql` | 1 | — | — | build log only |
| 13 | 614 | `oc_peppercorn.sql` | 1 | ✅ | — | build log only |
| 14 | 614 | `oc_williamsburg_gray.sql` | 1 | ✅ | — | build log only |
| 15 | 614 | `studio_archive.sql` | 4 | ✅ | — | build log only |
| 16 | 614 | `studio_site_facets.sql` | 3 | ✅ | — | build log only |
| 17 | 614 | `studio_tag_repair.sql` | 5 | ✅ | — | build log only |
| 18 | 615 | `oc_color_covers_set.sql` | 1 | — | — | FEATURES.md, OPEN_ITEMS.md |
| 19 | 627 | `studio_tray.sql` | 6 | ✅ | — | CLAUDE.md, FEATURES.md |
| 20 | 628 | `studio_tray_bucket.sql` | 5 | ✅ | — | CLAUDE.md |
| 21 | 629 | `studio_tray_bins.sql` | 9 | ✅ | **⚠ YES** | build log only |
| 22 | 636 | `photos_bucket_pdf.sql` | 1 | — | — | build log only |
| 23 | 646 | `insurance_claim_backfill.sql` | 3 | — | — | FEATURES.md |
| 24 | 650 | `commission_system.sql` | 49 | ✅ | **⚠ YES** | FEATURES.md |
| 25 | 650 | `crews_schema.sql` | 46 | ✅ | **⚠ YES** | CLAUDE.md, FEATURES.md |
| 26 | 651 | `commission_finance_source.sql` | 5 | ✅ | **⚠ YES** | FEATURES.md, OPEN_ITEMS.md |
| 27 | 655 | `insurance_claims_coverage_cols.sql` | 3 | ✅ | — | FEATURES.md |
| 28 | 658 | `insurance_claims_ord_law_basis.sql` | 6 | ✅ | — | build log only |
| 29 | 660 | `insurance_claims_ord_law_bc_totals.sql` | 5 | ✅ | — | build log only |
| 30 | 665 | `scope_reads.sql` | 12 | ✅ | — | FEATURES.md |
| 31 | 667 | `supplement_desk.sql` | 9 | ✅ | — | FEATURES.md |
| 32 | 670 | `code_letters.sql` | 13 | ✅ | — | CLAUDE.md |
| 33 | 671 | `supplement_mirror_tiebreak.sql` | 2 | ✅ | — | OPEN_ITEMS.md |
| 34 | 684 | `contracts_lifecycle_policy.sql` | 3 | ✅ | — | build log only |
| 35 | 684 | `design_renders.sql` | 14 | ✅ | — | FEATURES.md, HANDOFF.md … |
| 36 | 766 | `punch_steps.sql` | 4 | ✅ | — | CLAUDE.md, FEATURES.md … |
| 37 | 822 | `design_jobs_engine.sql` | 13 | ✅ | — | build log only |
| 38 | 844 | `crew_work_orders_add_superseded_status.sql` | 2 | ✅ | **⚠ YES** | FEATURES.md |
| 39 | 882 | `punch_scheduled_time.sql` | 1 | ✅ | — | build log only |
| 40 | 895 | `owner_console_schema.sql` | 8 | ✅ | — | FEATURES.md |
| 41 | 897 | `owner_reminders_schema.sql` | 4 | ✅ | — | build log only |
| 42 | 899 | `owner_ledger_schema.sql` | 9 | ✅ | — | build log only |
| 43 | 900 | `owner_vault_schema.sql` | 4 | ✅ | — | build log only |
| 44 | 900 | `owner_vault_storage.sql` | 10 | ✅ | — | FEATURES.md |
| 45 | 928 | `sales_floor_objections_928.sql` | 1 | — | — | FEATURES.md |
| 46 | 934 | `project_po_sequence_934.sql` | 8 | ✅ | — | build log only |
| 47 | 940 | `punch_visits_940.sql` | 2 | ✅ | — | FEATURES.md |
| 48 | 1002 | `itel_project_link.sql` | 2 | ✅ | — | OPEN_ITEMS.md |
| 49 | 1003 | `appointments_shared_calendar.sql` | 4 | ✅ | — | FEATURES.md, OPEN_ITEMS.md |
| 50 | 1014 | `estimates_dangling_docids.sql` | 2 | — | — | OPEN_ITEMS.md |
| 51 | 1030 | `drop_manual_estimates.sql` | 2 | — | **⚠ YES** | FEATURES.md, OPEN_ITEMS.md |
| 52 | 1033, 1034, 1056 | `drop_ai_estimates.sql` | 6 | ✅ | **⚠ YES** | FEATURES.md, OPEN_ITEMS.md |
| 53 | 1034, 1056 | `fix_onhold_stage_since.sql` | 1 | — | — | FEATURES.md |
| 54 | 1036 | `photos_upload_prefix_exclusions.sql` | 1 | — | — | OPEN_ITEMS.md |
| 55 | 1036 | `team_profiles_self_edit.sql` | 5 | ✅ | — | OPEN_ITEMS.md |
| 56 | 1056 | `claim_chase.sql` | 4 | ✅ | — | FEATURES.md |
| 57 | — | `companycam_caption_sample.sql` | 8 | ✅ | — | **NOTHING** |
| 58 | — | `companycam_projects.sql` | 10 | ✅ | — | FEATURES.md, HANDOFF.md |
| 59 | — | `design_jobs_achieved.sql` | 2 | ✅ | — | **NOTHING** |
| 60 | — | `is_staff_policies.sql` | 18 | ✅ | **⚠ YES** | **NOTHING** |
| 61 | — | `library_counties_entry.sql` | 1 | — | — | **NOTHING** |
| 62 | — | `materials_cardinal_brands.sql` | 1 | ✅ | — | **NOTHING** |
| 63 | — | `materials_carvedwood_from_matrix.sql` | 5 | ✅ | **⚠ YES** | **NOTHING** |
| 64 | — | `materials_mastic_carvedwood.sql` | 1 | — | — | **NOTHING** |
| 65 | — | `materials_pgpm_trim_coil_gutters.sql` | 3 | ✅ | — | **NOTHING** |
| 66 | — | `oc_color_wall_fix.sql` | 3 | ✅ | — | **NOTHING** |
| 67 | — | `oc_colors.sql` | 24 | ✅ | — | **NOTHING** |
| 68 | — | `oc_colors_from_designer_datasheet.sql` | 2 | — | — | **NOTHING** |
| 69 | — | `oc_colors_from_duration_datasheet.sql` | 2 | — | — | **NOTHING** |
| 70 | — | `oc_colors_from_style_board_guide.sql` | 1 | — | — | **NOTHING** |
| 71 | — | `oc_colors_last_three_from_style_boards.sql` | 1 | — | — | **NOTHING** |
| 72 | — | `oc_colors_swatch_path.sql` | 3 | ✅ | — | **NOTHING** |
| 73 | — | `oc_evergreen_mist_from_coty_sheet.sql` | 1 | — | — | **NOTHING** |
| 74 | — | `showcase_pairs.sql` | 21 | ✅ | — | CLAUDE.md |
| 75 | — | `studio_findings.sql` | 14 | ✅ | — | BUG_CLASSES.md, OPEN_ITEMS.md |
| 76 | — | `studio_media.sql` | 42 | ✅ | **⚠ YES** | **NOTHING** |
| 77 | — | `studio_photos.sql` | 5 | ✅ | — | CLAUDE.md, OPEN_ITEMS.md |
| 78 | — | `studio_private_objects_rls.sql` | 20 | ✅ | — | CLAUDE.md |
| 79 | — | `visualizer_materials_seed.sql` | 1 | ✅ | — | **NOTHING** |
| 80 | — | `visualizer_schema.sql` | 49 | ✅ | **⚠ YES** | **NOTHING** |
| 81 | — | `workmanship_pairs.sql` | 20 | ✅ | — | CLAUDE.md |
| 82 | — | `dhrn_partner_name.sql` | 1 | — | — | OPEN_ITEMS.md |
| 83 | — | `delete_empty_test_claims.sql` | 2 | — | **⚠ YES** | **NOTHING** |
| 84 | — | `revoke_anon_objection_rpcs.sql` | 4 | — | — | **NOTHING** |

## Rebuilding from empty

There is no verified fresh-database bootstrap, and this file does not claim one. What it gives you is the order to work in and the list to skip. To build one: run the non-destructive files in the order above, skip every **DESTRUCTIVE** row, then diff the result against production’s schema. Until that has actually been done once and the result recorded here, treat a rebuild as untested.

## Git, for what it is worth

| file | first commit | date | commit subject |
|---|---|---|---|
| `companycam_index.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `companycam_search.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `estimates_delete_policy.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `estimates_update_policy.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `walks_schema.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_objects_rls.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `punch_comments.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `itel_register.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_color_covers.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_colors_hidden.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_coty_year.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_discontinued_fix.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_peppercorn.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_williamsburg_gray.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_archive.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_site_facets.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_tag_repair.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_color_covers_set.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_tray.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_tray_bucket.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_tray_bins.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `photos_bucket_pdf.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `insurance_claim_backfill.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `commission_system.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `crews_schema.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `commission_finance_source.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `insurance_claims_coverage_cols.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `insurance_claims_ord_law_basis.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `insurance_claims_ord_law_bc_totals.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `scope_reads.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `supplement_desk.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `code_letters.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `supplement_mirror_tiebreak.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `contracts_lifecycle_policy.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `design_renders.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `punch_steps.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `design_jobs_engine.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `crew_work_orders_add_superseded_status.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `punch_scheduled_time.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `owner_console_schema.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `owner_reminders_schema.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `owner_ledger_schema.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `owner_vault_schema.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `owner_vault_storage.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `sales_floor_objections_928.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `project_po_sequence_934.sql` | `b0b37439` | 2026-08-19 | Build 934 — Job numbers move to the database; the last created_by-as-rep site (# |
| `punch_visits_940.sql` | `4d80678f` | 2026-08-20 | Build 940 — check in and check out on a repair (#437) |
| `itel_project_link.sql` | `2a59b28e` | 2026-08-22 | Builds 995–1003 — the audit follow-up batch (#473) |
| `appointments_shared_calendar.sql` | `2a59b28e` | 2026-08-22 | Builds 995–1003 — the audit follow-up batch (#473) |
| `estimates_dangling_docids.sql` | `ec9e2d6a` | 2026-08-23 | Build 1014 — six fixes closing out the 23 Aug audit (#480) |
| `drop_manual_estimates.sql` | `c119087b` | 2026-08-23 | Builds 1025–1030 — the manual-estimates arc: audit findings built (A–F, Theo's p |
| `drop_ai_estimates.sql` | `e4638a2b` | 2026-08-23 | Builds 1032–1035 — post-merge batch: light inks, the AI arm deleted, the dropped |
| `fix_onhold_stage_since.sql` | `e4638a2b` | 2026-08-23 | Builds 1032–1035 — post-merge batch: light inks, the AI arm deleted, the dropped |
| `photos_upload_prefix_exclusions.sql` | `e03195c6` | 2026-08-23 | Audit 2026-08-23 — all 17 findings closed (builds 1015–1023 + 2 RLS migrations a |
| `team_profiles_self_edit.sql` | `e03195c6` | 2026-08-23 | Audit 2026-08-23 — all 17 findings closed (builds 1015–1023 + 2 RLS migrations a |
| `claim_chase.sql` | `aeca770e` | 2026-08-24 | Builds 1055–1056 — the Desk's evidence table, then the chase clock (#489) |
| `companycam_caption_sample.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `companycam_projects.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `design_jobs_achieved.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `is_staff_policies.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `library_counties_entry.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `materials_cardinal_brands.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `materials_carvedwood_from_matrix.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `materials_mastic_carvedwood.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `materials_pgpm_trim_coil_gutters.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_color_wall_fix.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_colors.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_colors_from_designer_datasheet.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_colors_from_duration_datasheet.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_colors_from_style_board_guide.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_colors_last_three_from_style_boards.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_colors_swatch_path.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `oc_evergreen_mist_from_coty_sheet.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `showcase_pairs.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_findings.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_media.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_photos.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `studio_private_objects_rls.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `visualizer_materials_seed.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `visualizer_schema.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `workmanship_pairs.sql` | `15d452e8` | 2026-08-19 | Build 933 — CompanyCam keeps itself up to date (#431) |
| `dhrn_partner_name.sql` | `2e586101` | 2026-08-21 | Builds 976–978 — tarps, the waitlist, and two more doors onto the punch composer |
| `delete_empty_test_claims.sql` | `2cd473a6` | 2026-08-25 | Builds 1062–1064 — the stale-job caller, the landing screenshot, the audit, and  |
| `revoke_anon_objection_rpcs.sql` | `171610ba` | 2026-08-25 | Items 1–3 — the anon RPCs closed, the chase nudge, and the Desk reads photograph |
