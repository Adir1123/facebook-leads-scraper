---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-22T16:23:03.535Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 5
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Automatically surface real Hebrew-language family law leads from Facebook groups into a Google Sheet
**Current focus:** Phase 05 — leads-main

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
| leads_store_sheets | HWJVJIVEDpu69Nbw | Complete ✓ |
| leads_main | — | JSON created ✓ (import to n8n needed) |
| test_store_sheets_harness | EvQcXDJnbPYWkVII | Test harness (can delete) |

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

- Phase 4 (leads_store_sheets): **Complete**
  - Workflow imported and tested in n8n (id: `HWJVJIVEDpu69Nbw`, 24 nodes)
  - Tab creation, header row writing, append, and dedup all verified end-to-end
  - Write Header Row and Append Rows use direct HTTP Sheets API (bypasses n8n Google Sheets node bugs)
  - Static data stores Sheet ID: `1N3FqJBgg-az5f_bbMdK4ZW8KNZpuOUHkoE5kfPrpDKE`

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
| 04-02 | HTTP Request for Write Header Row and Append Rows | n8n Google Sheets v4 node has bugs with `defineBelow` append and `mode: "name"` — direct Sheets API calls are reliable |
| 04-02 | `sheetName` resource locator mode must be `"name"` not `"byName"` | `"byName"` is not a valid mode — causes n8n to treat tab name as numeric ID |
| 04-02 | `alwaysOutputData: true` on Create Tab and Read Existing IDs | Google Sheets create/read return 0 items on empty results — breaks downstream chain |

| 05-01 | SplitInBatches batchSize 1 for sequential per-group loop | Prevents parallel Execute Workflow race; forces sequential scrape->filter->store per group |
| 05-01 | alwaysOutputData: true on Execute Workflow nodes | Mitigates n8n bug where continueErrorOutput produces zero items on failure |
| 05-01 | Context recovery via $('SplitInBatches').first().json.group_url | Execute Workflow replaces $json with sub-workflow output — Code nodes must recover group_url from named upstream node |
| 05-01 | Capture error nodes emit normalized stat objects back to loop | Enables $input.all() accumulation in Accumulate Stats after loop exits |
| 05-01 | Stop And Error + settings.errorWorkflow for all-fail detection | D-12: triggers leads_error_notify (k5LZs1ntJRXaqNpM) when zero groups succeed |

## Current Status

- Phase 5 (leads_main): **JSON Complete — Pending n8n Import**
  - `workflows/leads_main.json` created (16 nodes, commit 0701746)
  - Import into n8n and activate to get Form Trigger URL
  - Assign Gmail OAuth2 credential to leads_error_notify before full end-to-end test

## Next Action

Import `workflows/leads_main.json` into n8n. Activate workflow. Test with 1-2 real Facebook group URLs via the form. Verify rows appear in Google Sheet.

---
*State updated: 2026-03-22 — Phase 05 Plan 01 complete, leads_main.json created*
