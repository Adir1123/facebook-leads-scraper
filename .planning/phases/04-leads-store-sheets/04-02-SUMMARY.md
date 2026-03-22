# Phase 04-02 Summary: leads_store_sheets Import, Debug & Test

## Objective
Import the leads_store_sheets workflow JSON into n8n, assign credentials, and verify all features end-to-end.

## What Was Done

### Workflow Import & Credential Assignment
- Imported `workflows/leads_store_sheets.json` into n8n as workflow `HWJVJIVEDpu69Nbw`
- Google Sheets OAuth2 credential assigned to all Google Sheets nodes
- Google Drive OAuth2 credential assigned to Share Sheet node
- Share Sheet email set to `adirgabay9@gmail.com`

### Test Harness
- Created `test_store_sheets_harness` workflow (`EvQcXDJnbPYWkVII`)
- Manual Trigger → Set Test Data (Code node) → Execute Workflow (calls leads_store_sheets)
- Generates dynamic test posts with unique timestamp-based Post IDs

### Bugs Found & Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Create Tab creates default-named tabs | Missing `title` and `resource: "sheet"` parameters | Added `title: ={{ $json.tabName }}`, `resource: "sheet"` |
| "Sheet with ID test-leads-store not found" on all Google Sheets read/write nodes | `sheetName` resource locator `mode: "byName"` is invalid | Changed to `mode: "name"` (valid modes: list, url, id, name) |
| Create Tab returns 0 items, breaking downstream chain | Google Sheets `create` operation returns empty | Added `alwaysOutputData: true` + "Restore Data After Tab Create" Code node |
| Read Existing IDs returns 0 items on empty tab | Empty sheet = 0 output items | Added `alwaysOutputData: true` |
| Write Header Row writes wrong data (sheetId as column) | n8n Google Sheets `append` with `defineBelow` ignores column mapping on empty sheets, auto-maps all JSON fields | Replaced with HTTP Request: `PUT .../values/'{tabName}'!A1:E1` |
| Write Header Row HTTP response replaces $json | HTTP Request node output overwrites upstream data | Added "Restore Data After Header" Code node |
| Append Rows reports success but writes nothing | n8n Google Sheets `append` with `defineBelow` + `mode: "name"` silently fails | Replaced with HTTP Request: `POST .../values/append` |

### Test Results
- Tab creation with correct name: PASS
- Header row (Post ID, Author, Post Link, Post Date, Scraped At): PASS
- Data append (new post appears in sheet): PASS
- Second append (different Post ID adds new row): PASS
- Dedup (same Post ID does NOT add duplicate row): PASS

## Final Workflow State (24 nodes)
- 2 nodes added during debugging: "Restore Data After Tab Create", "Restore Data After Header"
- 2 nodes replaced with HTTP Request: "Write Header Row", "Append Rows"
- Static data stores Sheet ID: `1N3FqJBgg-az5f_bbMdK4ZW8KNZpuOUHkoE5kfPrpDKE`

## Key Decisions
- Direct HTTP Sheets API calls for Write Header Row and Append Rows (bypasses n8n node bugs)
- `sheetName` mode must be `"name"` not `"byName"` across all Google Sheets v4 nodes
- `alwaysOutputData: true` required on nodes that may return empty (Create Tab, Read Existing IDs)

## Artifacts
- n8n workflow: `HWJVJIVEDpu69Nbw` (leads_store_sheets)
- n8n test harness: `EvQcXDJnbPYWkVII` (test_store_sheets_harness)
- Google Sheet: `1N3FqJBgg-az5f_bbMdK4ZW8KNZpuOUHkoE5kfPrpDKE`
