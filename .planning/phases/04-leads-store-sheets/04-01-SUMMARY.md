---
phase: 04-leads-store-sheets
plan: "01"
subsystem: storage
tags: [n8n, google-sheets, google-drive, static-data, deduplication, oauth2]

requires:
  - phase: 03-leads-filter-claude
    provides: "Filtered posts array { postId, authorName, postText, postLink, postDate } via Execute Workflow output"

provides:
  - "Complete leads_store_sheets n8n workflow JSON (22 nodes) for Google Sheets persistence"
  - "Sheet auto-creation on first run with static data Sheet ID persistence"
  - "Per-group tab creation with header row initialization"
  - "Post deduplication via Set-based comparison against existing column A values"
  - "Self-healing: deleted sheet detection clears static data and recreates without failing execution"

affects:
  - "05-leads-main (calls this as sub-workflow, needs to import and assign credentials)"

tech-stack:
  added:
    - "n8n-nodes-base.googleSheets typeVersion 4 (create spreadsheet, create sheet, read, appendRow)"
    - "n8n-nodes-base.googleDrive typeVersion 3 (share operation)"
    - "n8n-nodes-base.httpRequest typeVersion 4 with continueErrorOutput + predefinedCredentialType googleSheetsOAuth2Api"
  patterns:
    - "getWorkflowStaticData('global') for cross-execution Sheet ID persistence"
    - "HTTP Request onError: continueErrorOutput for graceful 404/403 handling"
    - "Merge node after HTTP Request to recover upstream data lost by API response replacement"
    - "Self-healing loop: error output -> clear static data -> route back to creation node (no throw)"
    - "defineBelow column mapping in Google Sheets appendRow for deterministic column order"

key-files:
  created:
    - "workflows/leads_store_sheets.json"
  modified: []

key-decisions:
  - "Merge Validate Data node added between HTTP Request and Check Tab Exists to recover sheetId/posts/groupUrl/tabName lost when HTTP response replaces payload"
  - "Self-Heal Sheet uses return (not throw) with needsCreation:true, routing back to Create Spreadsheet for automatic recovery per D-04"
  - "Store Sheet ID falls back to Self-Heal Sheet upstream data when IF Needs Sheet Creation is not on execution path (healing loop)"
  - "Append Rows uses defineBelow mapping with explicit A-E columns to avoid _sheetId/_tabName private fields being written as sheet columns"
  - "Filter New Posts references Check Tab Exists (not Execute Workflow Trigger) for posts — ensures posts flow through the merge/dedup path correctly"

patterns-established:
  - "HTTP Request error output (index 1) for 404/403 self-healing instead of try/catch in Code node"
  - "Merge node pattern: after HTTP Request, always recover upstream context fields from named upstream nodes"
  - "Google Sheets credential placeholder IDs: google-sheets-credential, google-drive-credential (user assigns in n8n UI after import)"

requirements-completed:
  - STOR-01
  - STOR-02
  - STOR-03
  - STOR-04
  - STOR-05
  - STOR-06
  - STOR-07
  - STOR-08

duration: 3min
completed: "2026-03-22"
---

# Phase 4 Plan 1: leads_store_sheets Summary

**22-node n8n workflow JSON for Google Sheets lead persistence with static data Sheet ID, per-group tab creation, Set-based deduplication, and self-healing deleted-sheet recovery via continueErrorOutput loop**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-22T01:04:00Z
- **Completed:** 2026-03-22T01:06:14Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments

- Built complete 22-node leads_store_sheets n8n workflow JSON covering all 8 STOR requirements
- Implemented D-04 self-healing: 404/403 on stored Sheet ID routes to Self-Heal Sheet (clears static data) -> Create Spreadsheet without throwing, preventing workflow failure on deleted sheets
- Added Merge Validate Data node after HTTP Request to recover sheetId/posts/groupUrl/tabName lost when HTTP response replaces the item payload — critical data flow fix
- Used JavaScript Set-based deduplication against column A for O(1) post ID lookup

## Task Commits

Each task was committed atomically:

1. **Task 1: Create leads_store_sheets workflow JSON with all nodes** - `05e9bbb` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified

- `/c/Users/adirg/OneDrive/Desktop/cc-projects/facebook-posts-leads/workflows/leads_store_sheets.json` - Complete n8n workflow JSON with 22 nodes, 20 connection keys, all STOR requirements implemented

## Decisions Made

- Merge Validate Data node is a critical addition not explicitly named in earlier plan sections but required by the "CRITICAL DATA FLOW FIX" note in the plan — HTTP Request replaces the item payload with the API response body, so all upstream context (sheetId, posts, groupUrl, tabName) must be re-injected via named node references
- Store Sheet ID's fallback to Self-Heal Sheet upstream resolves the edge case where the healing loop bypasses IF Needs Sheet Creation, preventing undefined reference errors
- Append Rows uses defineBelow mapping (not autoMapInputData) so that _sheetId and _tabName private fields in Build Rows output don't get written as extra columns in the sheet

## Deviations from Plan

None - plan executed exactly as written. All 22 nodes, all connection patterns, and all code logic implemented per the plan specification including the documented critical fixes.

## Issues Encountered

None. The verification script's check for `/groups/` in Extract Tab Name produced a false negative because the regex pattern is stored as `\/groups\/` (escaped backslashes) in JSON — but the actual runtime behavior was verified by executing the extraction logic directly and confirming correct slug extraction for both named slugs and numeric group IDs.

## User Setup Required

After importing `workflows/leads_store_sheets.json` into n8n:

1. Assign **Google Sheets OAuth2** credential to all Google Sheets nodes (credential placeholder ID: `google-sheets-credential`)
2. Assign **Google Drive OAuth2** credential to the Share Sheet node (credential placeholder ID: `google-drive-credential`)
3. Update the **Share Sheet** node's `emailAddress` field (`PLACEHOLDER_CREDENTIAL_EMAIL`) with the actual Google account email that holds the Google Sheets OAuth2 credential — this is required for the credential account to have editor access to the auto-created spreadsheet
4. Activate the workflow before testing static data persistence (static data only persists in production executions from an active workflow, not manual test runs)

## Next Phase Readiness

- `workflows/leads_store_sheets.json` is ready to import into n8n via "Import from file"
- Phase 5 (leads_main) can now reference this workflow via Execute Workflow node
- Credentials must be assigned in n8n UI before end-to-end testing
- The Share Sheet emailAddress placeholder is the only manual configuration required beyond credential assignment

---
*Phase: 04-leads-store-sheets*
*Completed: 2026-03-22*
