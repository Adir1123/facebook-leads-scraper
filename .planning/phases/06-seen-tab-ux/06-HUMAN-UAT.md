---
status: partial
phase: 06-seen-tab-ux
source: [06-VERIFICATION.md]
started: 2026-03-22T19:00:00.000Z
updated: 2026-03-22T19:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Deploy script and test checkbox trigger
expected: Check a box in column F on any group tab → row disappears from group tab and appears in "Seen" tab with correct data + Source Group column
result: [pending]

### 2. Run addCheckboxesToAllGroups backfill
expected: Running the function from Apps Script editor adds checkboxes to column F on all existing lead rows across all group tabs, with "Seen" header in F1
result: [pending]

### 3. Verify Seen tab auto-creation
expected: If "Seen" tab does not exist, checking a checkbox creates it automatically with headers: Post ID | Author | Post Link | Post Date | Scraped At | Source Group
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
