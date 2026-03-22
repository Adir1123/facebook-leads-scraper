---
phase: 05-leads-main
plan: 01
subsystem: workflow
tags: [n8n, orchestrator, form-trigger, execute-workflow, splitinbatches, error-isolation]

# Dependency graph
requires:
  - phase: 02-leads-scrape-apify
    provides: scrape sub-workflow (H3PMNprdI9tzT7yf) accepting group_url + post_count
  - phase: 03-leads-filter-claude
    provides: filter sub-workflow (CY2ax7bMZaLoODGm) accepting posts + group_url
  - phase: 04-leads-store-sheets
    provides: store sub-workflow (HWJVJIVEDpu69Nbw) accepting posts + group_url
  - phase: 01-leads-error-notify
    provides: error notify workflow (k5LZs1ntJRXaqNpM) as error workflow target
provides:
  - leads_main.json — complete n8n orchestrator workflow JSON with 16 nodes
  - Form trigger UI at form URL after activation in n8n
  - Per-group loop calling scrape -> filter -> store with error isolation
  - HTML response with per-group stats and clickable Google Sheet link
affects: [import into n8n, end-to-end integration testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SplitInBatches (batchSize 1) for sequential per-group looping
    - onError continueErrorOutput + alwaysOutputData for per-item error isolation
    - Code nodes between Execute Workflow calls to reassemble context (group_url recovery)
    - Normalized stat objects flow back into loop for accumulation via $input.all()
    - settings.errorWorkflow for workflow-level error notification attachment

key-files:
  created:
    - workflows/leads_main.json
  modified: []

key-decisions:
  - "SplitInBatches batchSize 1 forces sequential group processing (prevents parallel Execute Workflow race)"
  - "alwaysOutputData: true on Execute Workflow nodes mitigates n8n bug where continueErrorOutput produces zero items"
  - "Assemble Filter Input and Assemble Store Input Code nodes recover group_url from SplitInBatches after sub-workflow replaces $json context"
  - "Capture error nodes emit normalized stat objects routing back to loop — enables $input.all() accumulation after loop exits"
  - "Build Response hardcodes Sheet ID 1N3FqJBgg-az5f_bbMdK4ZW8KNZpuOUHkoE5kfPrpDKE for the sheet link (same as leads_store_sheets)"
  - "Stop And Error + settings.errorWorkflow triggers leads_error_notify when all groups fail (D-12)"

patterns-established:
  - "Context recovery pattern: use $('SplitInBatches').first().json.group_url in Code nodes after Execute Workflow replaces $json"
  - "Stat accumulation pattern: every loop branch (success + error) emits {group_url, status, scraped, leads, added} object back to loop"

requirements-completed: [ORCH-01, ORCH-02, ORCH-03]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 5 Plan 1: leads_main Orchestrator Summary

**n8n Form Trigger orchestrator calling scrape/filter/store sub-workflows per group with per-item error isolation, stats accumulation, and HTML response with Google Sheet link**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T16:16:43Z
- **Completed:** 2026-03-22T16:18:23Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Built complete 16-node orchestrator workflow JSON importable into n8n
- Form Trigger with textarea (group_urls) + number (posts_per_group) fields implements ORCH-01
- Per-group loop via SplitInBatches calling all 3 sub-workflows in sequence implements ORCH-02
- settings.errorWorkflow pointing to leads_error_notify (k5LZs1ntJRXaqNpM) implements ORCH-03
- Per-group error isolation: each Execute Workflow node uses onError + alwaysOutputData, capture error nodes normalize failures into stat objects and route back to loop
- All-fail detection via IF All Failed + Stop And Error triggers leads_error_notify

## Task Commits

Each task was committed atomically:

1. **Task 1: Build leads_main.json workflow with all nodes and connections** - `0701746` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `workflows/leads_main.json` - Complete 16-node n8n orchestrator workflow JSON

## Decisions Made
- Used `$('SplitInBatches').first().json.group_url` in all Code nodes after Execute Workflow calls — this is the correct pattern to recover context that gets replaced by sub-workflow output (Pitfall 1 from RESEARCH.md)
- Capture error nodes guard with `$input.first()?.json || {}` and `item.error?.message || "fallback"` to handle the known n8n Execute Workflow continueErrorOutput bug (zero output items)
- Build Response hardcodes Sheet ID rather than reading from static data — simpler and reliable since Phase 4 already established the sheet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

After importing leads_main.json into n8n:
1. Activate the workflow to generate the Form Trigger webhookId and URL
2. Verify the errorWorkflow setting is visible in Workflow Settings > Error Workflow
3. Assign Gmail OAuth2 credential to leads_error_notify if not already done (pending from Phase 1)

## Next Phase Readiness
- leads_main.json is ready for import into n8n
- All sub-workflow IDs are wired correctly (verified against STATE.md)
- errorWorkflow setting k5LZs1ntJRXaqNpM is pre-configured in JSON
- End-to-end test: submit form with 1-2 real Facebook group URLs, verify rows appear in Sheet 1N3FqJBgg-az5f_bbMdK4ZW8KNZpuOUHkoE5kfPrpDKE

---
*Phase: 05-leads-main*
*Completed: 2026-03-22*
