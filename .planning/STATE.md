---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-22T01:06:30Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 5
  completed_plans: 3
current_phase: 04-leads-store-sheets
current_plan: 2
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Automatically surface real Hebrew-language family law leads from Facebook groups into a Google Sheet
**Current focus:** Phase 04 — leads-store-sheets

## Current Status

- Phase 1 (leads_error_notify): **In Progress**
  - Workflow created in n8n (id: `k5LZs1ntJRXaqNpM`)
  - Gmail OAuth2 credential needs to be assigned in n8n UI
  - Will be set as Error Workflow on leads_main in Phase 5

- Phase 2 (leads_scrape_apify): **Complete**
  - Workflow imported and tested in n8n (id: `H3PMNprdI9tzT7yf`)
  - Apify credential assigned, 5 posts returned on test run
  - All nodes verified via MCP

## n8n Workflow IDs

| Workflow | n8n ID | Status |
|----------|--------|--------|
| leads_error_notify | k5LZs1ntJRXaqNpM | Created, credential needed |
| leads_scrape_apify | H3PMNprdI9tzT7yf | Complete ✓ |
| leads_filter_claude | CY2ax7bMZaLoODGm | Complete ✓ |
| leads_store_sheets | — | JSON created (04-01), import pending |
| leads_main | — | Not yet created |

## Decisions Recorded

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 02-01 | Sync Apify endpoint (run-sync-get-dataset-items) | Simpler than async polling; acceptable latency for <=200 posts |
| 02-01 | Field fallback aliases (?? chaining in Map Fields) | Guards against Apify field renames between actor versions |
| 02-01 | n8n workflows exported as JSON to /workflows/ | Version-controlled, reproducible, importable |
| 02-01 | Zero-post returns empty array, not error | leads_main continues to next group gracefully |

- Phase 3 (leads_filter_claude): **Complete**
  - Workflow created and tested in n8n (id: `CY2ax7bMZaLoODGm`)
  - Official Anthropic node, model: claude-sonnet-4-6
  - Hebrew family law posts correctly filtered, spam excluded

- Phase 4 (leads_store_sheets): **In Progress** (04-01 complete)
  - Workflow JSON created: `workflows/leads_store_sheets.json` (22 nodes)
  - Covers STOR-01 through STOR-08: trigger input, URL slug extraction, sheet get/create with static data, tab get/create with header row, dedup filter, conditional append, zero-posts skip
  - Self-healing: deleted sheet detection routes back to Create Spreadsheet (no throw)
  - Awaiting import into n8n and credential assignment

## Decisions Recorded

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 02-01 | Sync Apify endpoint (run-sync-get-dataset-items) | Simpler than async polling; acceptable latency for <=200 posts |
| 02-01 | Field fallback aliases (?? chaining in Map Fields) | Guards against Apify field renames between actor versions |
| 02-01 | n8n workflows exported as JSON to /workflows/ | Version-controlled, reproducible, importable |
| 02-01 | Zero-post returns empty array, not error | leads_main continues to next group gracefully |
| 04-01 | Merge Validate Data node after HTTP Request | HTTP response replaces payload — upstream context (sheetId/posts/groupUrl/tabName) must be re-injected from named upstream nodes |
| 04-01 | Self-Heal Sheet uses return not throw | D-04: deleted sheet must not fail execution — use continueErrorOutput + return to route back to Create Spreadsheet |
| 04-01 | defineBelow column mapping in Append Rows | Prevents _sheetId/_tabName private fields from being written as extra sheet columns |

## Next Action

Phase 4 Plan 1 complete. Next: import `leads_store_sheets.json` into n8n, assign credentials, run verification.

---
*State updated: 2026-03-22 — Phase 04-01 (leads_store_sheets workflow JSON) complete*
