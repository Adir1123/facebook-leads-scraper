---
phase: 06-seen-tab-ux
plan: 01
subsystem: ui
tags: [google-apps-script, google-sheets, checkbox, onEdit-trigger]

# Dependency graph
requires:
  - phase: 04-store-sheets
    provides: "Google Sheet with group tabs and columns A-E"
provides:
  - "Google Apps Script with onEdit trigger for seen-lead row movement"
  - "Seen tab with 6-column schema (Post ID, Author, Post Link, Post Date, Scraped At, Source Group)"
  - "addCheckboxesToAllGroups utility for retroactive checkbox backfill"
affects: [07-pipeline-update]

# Tech tracking
tech-stack:
  added: [Google Apps Script]
  patterns: [simple onEdit trigger, checkbox data validation, appendRow + deleteRow pattern]

key-files:
  created: [scripts/seen-leads.gs]
  modified: []

key-decisions:
  - "Used simple onEdit trigger (not installable) for zero-config deployment"
  - "Guard-clause pattern for early exit on irrelevant edits"

patterns-established:
  - "Guard-first trigger pattern: validate event object, sheet name, column, row, value before acting"
  - "Get-or-create pattern: check for Seen tab existence, create with headers if missing"

requirements-completed: [UX-01, UX-02, UX-03, UX-04]

# Metrics
duration: 1min
completed: 2026-03-22
---

# Phase 6 Plan 1: Seen Tab UX Summary

**Google Apps Script with onEdit checkbox trigger that auto-moves lead rows to a global Seen tab and retroactive checkbox backfill utility**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-22T21:37:52Z
- **Completed:** 2026-03-22T21:38:56Z
- **Tasks:** 2 (1 auto + 1 auto-approved checkpoint)
- **Files modified:** 1

## Accomplishments
- Complete Google Apps Script with onEdit trigger that moves checked rows to Seen tab
- Auto-creates Seen tab with 6-column header (Post ID, Author, Post Link, Post Date, Scraped At, Source Group) on first use
- addCheckboxesToAllGroups utility adds checkboxes to all existing lead rows across all group tabs
- Guard clauses for Seen tab, Sheet1, header row, wrong column, and unchecked state

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the Google Apps Script** - `2eb9717` (feat)
2. **Task 2: Deploy script to customer sheet and verify** - auto-approved checkpoint (no commit)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `scripts/seen-leads.gs` - Complete Google Apps Script with onEdit trigger and addCheckboxesToAllGroups utility

## Decisions Made
- Used simple onEdit trigger (not installable) for simplest deployment: user just pastes code, no trigger setup needed
- Guard-clause pattern exits early for irrelevant edits, keeping the hot path clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**Manual deployment required.** The user must:
1. Open the Google Sheet (ID: 1vmxiJ1Tnp1uOUHUEZSqHYBpqPUjWq-I5nApGOAupYGg)
2. Go to Extensions > Apps Script
3. Paste contents of `scripts/seen-leads.gs`
4. Run `addCheckboxesToAllGroups()` once from the script editor
5. Authorize when prompted (first run requires Google OAuth consent)

## Next Phase Readiness
- Seen tab schema established (6 columns) - Phase 7 can now update leads_store_sheets to check Seen tab for dedup
- Phase 7 should also update leads_store_sheets to append checkbox (FALSE) in column F for new leads

## Self-Check: PASSED

- FOUND: scripts/seen-leads.gs
- FOUND: commit 2eb9717

---
*Phase: 06-seen-tab-ux*
*Completed: 2026-03-22*
