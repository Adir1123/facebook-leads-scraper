---
status: awaiting_human_verify
trigger: "SplitInBatches loop in leads_main workflow dies when a group returns 0 leads after Claude filtering"
created: 2026-03-23T00:00:00Z
updated: 2026-03-23T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED. Execute Workflow - Filter returns 0 items when Claude finds no leads. Despite alwaysOutputData: true on the node, this setting does NOT force output when sub-workflow returns 0 items (it only applies to error cases). Assemble Store Input (Code node) then receives 0 items and does not execute, so Capture Success Stats never runs and nothing loops back to SplitInBatches.
test: Applied 4-part fix across 3 workflows. All changes verified via n8n REST API read-back.
expecting: Every group produces exactly 1 stats item that flows back to SplitInBatches regardless of lead count
next_action: Await human verification that loop processes all 10 groups on next scheduled run

## Symptoms

expected: All 10 Facebook groups should be processed every scheduled run (every 2 hours). The SplitInBatches node should iterate through all 10 groups sequentially.
actual: Only 1-3 groups get processed per run. The loop stops at the first group where leads_filter_claude returns 0 relevant posts.
errors: No errors — the workflow reports "success" status even though 7-9 groups were silently skipped.
reproduction: Every scheduled run (cron: 0 6,8,10,12,14,16,18,20,22,0 * * * Asia/Jerusalem). The number of groups processed depends on which groups happen to have leads in the current batch of posts.
started: Has likely been present since v1.0 but only noticed now that the pipeline is stable.

## Eliminated

(none - root cause was already provided in symptoms and confirmed by code inspection)

## Evidence

- timestamp: 2026-03-23T00:00:00Z
  checked: scrape sub-workflow execution counts per scheduled run
  found: 14:00 run=1 execution, 12:00=2, 10:00=3, 08:00=3, 06:00=3 (out of 10 groups)
  implication: Loop stops early, correlating with groups that have 0 leads from Claude filter

- timestamp: 2026-03-23T00:00:00Z
  checked: leads_filter_claude Parse and Filter Response node code
  found: When relevantIds.length === 0, the node explicitly returns []. This causes Execute Workflow - Filter in leads_main to output 0 items.
  implication: The filter sub-workflow is the origin of the 0-item chain

- timestamp: 2026-03-23T00:00:00Z
  checked: leads_main Execute Workflow - Filter → Assemble Store Input connection
  found: alwaysOutputData: true is set on Execute Workflow - Filter but does NOT guarantee 1-item output when sub-workflow itself returns 0 items. It only outputs input data on errors.
  implication: Assemble Store Input (Code node) receives 0 items and does not execute in n8n v1 execution order

- timestamp: 2026-03-23T00:00:00Z
  checked: leads_store_sheets Log Skip node
  found: Returns [] when all posts are already in the sheet (deduplication). This is a second kill point — if filter finds leads but store deduplication removes all of them, Execute Workflow - Store returns 0 items and Capture Success Stats never runs.
  implication: Fix must cover both the 0-leads case AND the all-already-in-sheet case

- timestamp: 2026-03-23T00:00:00Z
  checked: All 3 workflow updates via n8n REST API read-back
  found: All 7 verification checks pass (sentinel in filter, Log Skip fixed, IF Has Leads node, Capture No-Leads Stats node, all 3 new connections correct)
  implication: Fix applied correctly

## Resolution

root_cause: Two zero-item kill points in the leads_main SplitInBatches loop: (1) When leads_filter_claude finds 0 relevant posts, it returned [] which propagated as 0 items out of Execute Workflow - Filter; (2) When the store deduplication finds all leads already in the sheet, Log Skip returned [] causing Execute Workflow - Store to output 0 items. In both cases, Capture Success Stats never executed and no item flowed back to SplitInBatches, silently terminating the loop.

fix: |
  1. leads_filter_claude (CY2ax7bMZaLoODGm) - Parse and Filter Response:
     Changed `return []` to `return [{ json: { _no_leads_sentinel: true } }]` when Claude finds 0 relevant posts.
     Sentinel ensures Execute Workflow - Filter always outputs >=1 item.

  2. leads_store_sheets (HWJVJIVEDpu69Nbw) - Log Skip:
     Changed `return []` to `return [{ json: { added: 0, skipped: true } }]`.
     Ensures Execute Workflow - Store always outputs >=1 item even when all posts are already in the sheet.

  3. leads_main (RJ315y6bn4zO0stE) - Three changes:
     a. Assemble Store Input: updated to explicitly filter sentinel items
        (.filter(p => p.postId && !p._no_leads_sentinel))
     b. Added new IF Has Leads node: checks posts.length > 0, routes to Store (true) or Capture No-Leads Stats (false)
     c. Added Capture No-Leads Stats node: emits {status:"success", scraped:X, leads:0, added:0} → SplitInBatches
     d. Updated connections: Assemble Store Input → IF Has Leads (instead of directly to Execute Workflow - Store)

verification: All 7 verification checks passed against live n8n API. Local workflow JSON files synced.
files_changed: [leads_filter_claude (n8n + local JSON), leads_store_sheets (n8n + local JSON), leads_main (n8n + local JSON)]
