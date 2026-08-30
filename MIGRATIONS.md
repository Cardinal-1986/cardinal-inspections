# Migrations — what ran, in what order, and what must never run twice

**Generated. Do not hand-edit.** Regenerate with:

```bash
python3 .claude/skills/cardinal-build/scripts/migration_manifest.py
```

`95` `.sql` files at the repo root. **All are applied by hand against Supabase** — nothing in the app or the deploy ever runs one, and `.vercelignore` blanket-excludes `*.sql` so none is ever served.

## Read this before trusting the order

**The `shipped at` column is the ordering signal, not the git date.** It is the lowest build number in `cardinal_build_log.md` that names the file. Git cannot answer this: PRs on this repo are **squash-merged**, so a file written across five builds lands in one commit, and dozens of early migrations share a single commit date that has nothing to do with when they ran.

⚠️ **30 file(s) are named by no build-log heading**, so their order is unknown and they are listed last. That is not a grep artifact — checked, only one of them appears anywhere in the log's text. Most are documented in `CLAUDE.md` or `FEATURES.md` instead; the `documented in` column says where. **A file marked `NOTHING` is named by no doc at all** — read it before running it.

⚠️ **13 file(s) drop, delete or truncate something.** They are marked **DESTRUCTIVE** below. Most are one-off repairs against production data that has since been fixed — **replaying one on a live database destroys current rows.** A fresh-database bootstrap must skip every one of them.

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
| 57 | 1078 | `document_versions.sql` | 13 | ✅ | — | OPEN_ITEMS.md |
| 58 | 1098 | `estimate_assemblies.sql` | 11 | ✅ | — | FEATURES.md, OPEN_ITEMS.md |
| 59 | 1108 | `collections_rep_insert.sql` | 2 | ✅ | — | FEATURES.md |
| 60 | 1110 | `pricing_roofing_labor.sql` | 5 | ✅ | **⚠ YES** | FEATURES.md |
| 61 | 1111 | `preinstall_guide.sql` | 13 | ✅ | — | FEATURES.md |
| 62 | 1112 | `preinstall_guides_siding_windows.sql` | 2 | — | — | FEATURES.md |
| 63 | 1113 | `owner_strategy_seed.sql` | 2 | — | — | FEATURES.md |
| 64 | 1123 | `crew_rates_santiago_seed.sql` | 2 | ✅ | — | FEATURES.md |
| 65 | 1139 | `estimate_assembly_default.sql` | 2 | ✅ | — | build log only |
| 66 | — | `collections_payment_provider.sql` | 5 | ✅ | — | **NOTHING** |
| 67 | — | `companycam_caption_sample.sql` | 8 | ✅ | — | **NOTHING** |
| 68 | — | `companycam_projects.sql` | 10 | ✅ | — | FEATURES.md, HANDOFF.md |
| 69 | — | `delete_empty_test_claims.sql` | 2 | — | **⚠ YES** | **NOTHING** |
| 70 | — | `design_jobs_achieved.sql` | 2 | ✅ | — | **NOTHING** |
| 71 | — | `dhrn_partner_name.sql` | 1 | — | — | OPEN_ITEMS.md |
| 72 | — | `finance_plan_fees.sql` | 4 | ✅ | — | **NOTHING** |
| 73 | — | `is_staff_policies.sql` | 18 | ✅ | **⚠ YES** | **NOTHING** |
| 74 | — | `library_counties_entry.sql` | 1 | — | — | **NOTHING** |
| 75 | — | `materials_cardinal_brands.sql` | 1 | ✅ | — | **NOTHING** |
| 76 | — | `materials_carvedwood_from_matrix.sql` | 5 | ✅ | **⚠ YES** | **NOTHING** |
| 77 | — | `materials_mastic_carvedwood.sql` | 1 | — | — | **NOTHING** |
| 78 | — | `materials_pgpm_trim_coil_gutters.sql` | 3 | ✅ | — | **NOTHING** |
| 79 | — | `oc_color_wall_fix.sql` | 3 | ✅ | — | **NOTHING** |
| 80 | — | `oc_colors.sql` | 24 | ✅ | — | **NOTHING** |
| 81 | — | `oc_colors_from_designer_datasheet.sql` | 2 | — | — | **NOTHING** |
| 82 | — | `oc_colors_from_duration_datasheet.sql` | 2 | — | — | **NOTHING** |
| 83 | — | `oc_colors_from_style_board_guide.sql` | 1 | — | — | **NOTHING** |
| 84 | — | `oc_colors_last_three_from_style_boards.sql` | 1 | — | — | **NOTHING** |
| 85 | — | `oc_colors_swatch_path.sql` | 3 | ✅ | — | **NOTHING** |
| 86 | — | `oc_evergreen_mist_from_coty_sheet.sql` | 1 | — | — | **NOTHING** |
| 87 | — | `revoke_anon_objection_rpcs.sql` | 4 | — | — | **NOTHING** |
| 88 | — | `showcase_pairs.sql` | 21 | ✅ | — | CLAUDE.md |
| 89 | — | `studio_findings.sql` | 14 | ✅ | — | BUG_CLASSES.md, OPEN_ITEMS.md |
| 90 | — | `studio_media.sql` | 42 | ✅ | **⚠ YES** | **NOTHING** |
| 91 | — | `studio_photos.sql` | 5 | ✅ | — | CLAUDE.md, OPEN_ITEMS.md |
| 92 | — | `studio_private_objects_rls.sql` | 20 | ✅ | — | CLAUDE.md |
| 93 | — | `visualizer_materials_seed.sql` | 1 | ✅ | — | **NOTHING** |
| 94 | — | `visualizer_schema.sql` | 49 | ✅ | **⚠ YES** | **NOTHING** |
| 95 | — | `workmanship_pairs.sql` | 20 | ✅ | — | CLAUDE.md |

## Rebuilding from empty

There is no verified fresh-database bootstrap, and this file does not claim one. What it gives you is the order to work in and the list to skip. To build one: run the non-destructive files in the order above, skip every **DESTRUCTIVE** row, then diff the result against production’s schema. Until that has actually been done once and the result recorded here, treat a rebuild as untested.
