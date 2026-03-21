---
phase: 02-leads-scrape-apify
plan: 01
subsystem: api
tags: [n8n, apify, facebook, workflow, http-request]

# Dependency graph
requires: []
provides:
  - "n8n sub-workflow leads_scrape_apify: accepts { group_url, post_count }, calls Apify sync endpoint, returns structured post array"
  - "Workflow JSON export at workflows/leads_scrape_apify.json (importable into n8n)"
  - "Import guide with post-import credential setup instructions"
affects:
  - 03-leads-filter-claude
  - 05-leads-main

# Tech tracking
tech-stack:
  added:
    - "Apify facebook-groups-scraper actor (sync HTTP endpoint)"
    - "n8n HTTP Request node with Header Auth"
    - "n8n Code node (JavaScript field mapping)"
    - "n8n IF node (zero-post branching)"
  patterns:
    - "n8n sub-workflow pattern: Execute Workflow Trigger receives { group_url, post_count } from leads_main"
    - "Apify sync endpoint pattern: POST run-sync-get-dataset-items, blocks until done, returns direct JSON array"
    - "Field mapping with fallback aliases: ?? chaining handles Apify field name variations between actor versions"
    - "Zero-post guard: IF on array length, false branch logs and returns { posts: [] } — no error thrown"

key-files:
  created:
    - workflows/leads_scrape_apify.json
    - workflows/IMPORT_GUIDE.md
  modified: []

key-decisions:
  - "Sync Apify endpoint (run-sync-get-dataset-items) chosen over async polling — simpler, acceptable latency for <=200 posts"
  - "Field fallback aliases (?? chaining) added to handle Apify actor field name variations between versions"
  - "300s HTTP timeout set on Apify HTTP Request node — Apify sync runs can take 60-300s for large groups"
  - "Workflow exported as JSON for version-controlled import rather than manual UI-only creation"
  - "Zero-post case returns { posts: [] } (not error) — lets leads_main continue to next group gracefully"

patterns-established:
  - "n8n workflow JSON export: all sub-workflows versioned as JSON exports in /workflows/"
  - "Credential placeholder: credential ID set as placeholder string in JSON; real binding done after import in n8n UI"

requirements-completed: [SCRP-01, SCRP-02, SCRP-03, SCRP-04]

# Metrics
duration: 15min
completed: 2026-03-21
---

# Phase 2 Plan 01: leads_scrape_apify Sub-Workflow Summary

**n8n sub-workflow that scrapes Facebook group posts via Apify sync endpoint and normalizes output to a 5-field schema with zero-post handling**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-21T20:07:23Z
- **Completed:** 2026-03-21T20:22:00Z
- **Tasks:** 2 of 3 completed (Task 3 is checkpoint:human-verify — awaiting manual n8n test)
- **Files created:** 2

## Accomplishments

- Complete n8n workflow JSON export for leads_scrape_apify with all 5 required nodes
- Apify sync endpoint integration: POST to `apify~facebook-groups-scraper/run-sync-get-dataset-items` with Header Auth, 300s timeout
- Field mapping Code node with fallback aliases handles Apify field name variations (postId/id, message/text, url/postUrl, time/timestamp)
- Zero-post IF branch: logs "No posts found for [URL]" and returns `{ posts: [] }` — no error thrown, calling workflow continues
- Import guide documents credential setup, node chain verification, and 3-scenario test procedure

## Task Commits

Each task was committed atomically:

1. **Task 1: Create leads_scrape_apify workflow with trigger and Apify HTTP Request** - `2bd8533` (feat)
2. **Task 2: Add field mapping Code node and zero-post IF node** - `3edb4eb` (feat)

**Plan metadata:** (see final commit after SUMMARY is committed)

## Files Created/Modified

- `workflows/leads_scrape_apify.json` - n8n workflow export with 5 nodes: Execute Workflow Trigger, Apify Scrape (HTTP Request), Map Fields (Code), Has Posts? (IF), Log Empty (Code)
- `workflows/IMPORT_GUIDE.md` - Step-by-step n8n import instructions with credential setup, node chain diagram, and quick test procedure

## Decisions Made

- Used sync endpoint (`run-sync-get-dataset-items`) over async polling — acceptable for <=200 posts, no polling logic needed
- Added `??` fallback aliases in Map Fields Code node to guard against Apify field renames between actor versions
- Set 300s HTTP timeout (n8n default is 5 min which matches) — Apify sync can take up to 300s for large groups
- Zero-post case returns empty array without error, consistent with leads_main expecting an array from each sub-workflow
- Exported workflow as JSON for version control; credentials use placeholder IDs (real binding done after import in n8n UI)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Created workflow as versioned JSON export instead of UI-only instructions**
- **Found during:** Task 1
- **Issue:** The plan described UI steps for creating nodes in n8n — this produces no version-controlled artifact and is not reproducible
- **Fix:** Created `workflows/leads_scrape_apify.json` as a proper n8n workflow export that can be imported directly. Added `IMPORT_GUIDE.md` with post-import setup steps
- **Files modified:** workflows/leads_scrape_apify.json, workflows/IMPORT_GUIDE.md
- **Verification:** JSON structure validated against n8n workflow export format (nodes, connections, settings)
- **Committed in:** 2bd8533 (Task 1 commit)

**2. [Rule 2 - Missing] Task 1 and Task 2 nodes written in single JSON file (correct approach)**
- **Found during:** Task 1
- **Issue:** Plan split Tasks 1 and 2 into UI steps as if adding nodes incrementally — for a JSON export, all nodes must exist in the same file
- **Fix:** Created complete workflow JSON with all 5 nodes in Task 1 write; Task 2 commit added IMPORT_GUIDE.md as the Task 2 artifact
- **Files modified:** workflows/IMPORT_GUIDE.md
- **Committed in:** 3edb4eb (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 2 — missing/incomplete artifact production)
**Impact on plan:** Both deviations improve on the original plan. JSON export is a stronger deliverable than UI-only instructions — versioned, reproducible, importable. No scope creep.

## Issues Encountered

None — n8n workflow JSON format is straightforward. Credential binding uses placeholder IDs in JSON (n8n standard pattern for exported workflows).

## User Setup Required

**Manual n8n import and credential assignment required before testing.** See `workflows/IMPORT_GUIDE.md` for:

1. Import `workflows/leads_scrape_apify.json` into n8n
2. Create "Apify API" credential (Header Auth, `Authorization: Bearer <token>`)
3. Run 3 validation scenarios from `.planning/phases/02-leads-scrape-apify/02-VALIDATION.md`
4. Record workflow ID in `.planning/STATE.md` (leads_scrape_apify row)

## Next Phase Readiness

- Workflow JSON ready to import into n8n at `adir1123.app.n8n.cloud`
- After import + successful test run: proceed to Phase 3 (leads_filter_claude)
- Task 3 checkpoint (real Apify test) must pass before Phase 3 can start — the output field names from the real Apify response need to be confirmed against the Map Fields fallback aliases

---
*Phase: 02-leads-scrape-apify*
*Completed: 2026-03-21*
