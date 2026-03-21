---
phase: 02-leads-scrape-apify
verified: 2026-03-21T20:30:00Z
status: gaps_found
score: 3/4 must-haves verified
re_verification: false
gaps:
  - truth: "Zero posts returned results in empty array passed downstream, not an error"
    status: partial
    reason: "Zero-post branch returns { posts: [] } (a wrapper object) while the true branch returns flat post items. The output schema differs between branches, creating an inconsistency that leads_main will need to handle differently per code path."
    artifacts:
      - path: "workflows/leads_scrape_apify.json"
        issue: "Log Empty node returns [{ json: { posts: [] } }] — a wrapped object — while Map Fields returns flat [{ json: { postId, authorName, ... } }]. The two branches emit incompatible item shapes."
    missing:
      - "Log Empty node should return [] (empty array, no items) to match the true branch's behavior of passing zero items to the caller — OR leads_main must explicitly handle both shapes"
      - "VALIDATION.md sign-off checkboxes remain unchecked and nyquist_compliant is still false — update after confirming zero-post scenario output shape is intentional"
human_verification:
  - test: "Zero-post branch output shape"
    expected: "When Apify returns 0 posts, the calling workflow (leads_main) receives either zero items or a consistent empty structure it knows how to consume"
    why_human: "Cannot verify runtime behavior of n8n Execute Workflow return value shape from a sub-workflow's false branch without live execution"
  - test: "Real Apify response field names confirmed"
    expected: "postId, authorName, postText, postLink, postDate are non-empty for a real group — VALIDATION.md Scenario 3 field mapping check"
    why_human: "Scenario 3 in VALIDATION.md requires inspecting raw Apify output to confirm which fallback aliases activated"
---

# Phase 2: leads_scrape_apify Verification Report

**Phase Goal:** Sub-workflow accepts a group URL + post count, calls Apify, and returns structured post array.
**Verified:** 2026-03-21T20:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sub-workflow accepts `{ group_url, post_count }` as input | VERIFIED | Execute Workflow Trigger node present; Apify Scrape body references `$json.group_url` and `$json.post_count` in `workflows/leads_scrape_apify.json` |
| 2 | Apify sync endpoint is called with correct actor and input mapping | VERIFIED | URL is exactly `apify~facebook-groups-scraper/run-sync-get-dataset-items`, method POST, body contains `startUrls`, `resultsLimit`, `viewOption: CHRONOLOGICAL`, 300s timeout, Header Auth credential |
| 3 | Response fields are mapped to `{ postId, authorName, postText, postLink, postDate }` | VERIFIED | Map Fields Code node maps all 5 fields with `??` fallback aliases (`postId ?? id`, `message ?? text`, `url ?? postUrl`, `time ?? timestamp`) |
| 4 | Zero posts returned results in empty array passed downstream, not an error | PARTIAL | IF node correctly routes zero-length to Log Empty node, no error is thrown — but Log Empty returns `[{ json: { posts: [] } }]` (a wrapper object), while the true branch passes flat post items. Output shapes differ between branches. |

**Score:** 3/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `workflows/leads_scrape_apify.json` | n8n workflow export — Execute Workflow Trigger, HTTP Request, Code, IF nodes | VERIFIED | All 5 nodes present: Execute Workflow Trigger, Apify Scrape (HTTP Request), Map Fields (Code), Has Posts? (IF), Log Empty (Code) |
| n8n workflow instance `H3PMNprdI9tzT7yf` | Imported, credentialed, tested | VERIFIED | STATE.md records workflow ID, Apify credential assigned, 5 posts returned on test run, nodes verified via MCP |
| `workflows/IMPORT_GUIDE.md` | Post-import setup instructions | VERIFIED | Documents credential setup, node chain diagram, quick test procedure |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Execute Workflow Trigger | Apify Scrape | `connections` object in JSON | VERIFIED | `"Execute Workflow Trigger": { main: [[{ node: "Apify Scrape" }]] }` |
| Apify Scrape | Map Fields | `connections` object in JSON | VERIFIED | `"Apify Scrape": { main: [[{ node: "Map Fields" }]] }` |
| Map Fields | Has Posts? | `connections` object in JSON | VERIFIED | `"Map Fields": { main: [[{ node: "Has Posts?" }]] }` |
| Has Posts? (true) | Workflow output | Empty `main[0]` array | VERIFIED | `main[0]: []` — items reach workflow end and are returned to caller |
| Has Posts? (false) | Log Empty | `main[1]` in connections | VERIFIED | Routes to Log Empty Code node which logs group URL |
| Log Empty | Workflow output | Return value shape | PARTIAL | Returns `[{ json: { posts: [] } }]` — a wrapped object, inconsistent with true branch flat item array |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCRP-01 | 02-01-PLAN.md | leads_scrape_apify accepts `{ group_url, post_count }` via Execute Workflow trigger | SATISFIED | Execute Workflow Trigger node present; body expressions reference both input fields |
| SCRP-02 | 02-01-PLAN.md | Calls Apify `apify~facebook-groups-scraper` via sync HTTP endpoint (blocks until complete) | SATISFIED | Sync endpoint URL confirmed in JSON; 300s timeout set; Header Auth credential wired |
| SCRP-03 | 02-01-PLAN.md | Returns array of `{ postId, authorName, postText, postLink, postDate }` | SATISFIED | Map Fields Code node maps all 5 fields with fallback aliases; live test returned 5 posts |
| SCRP-04 | 02-01-PLAN.md | If zero posts returned, logs "no posts found for [URL]" and passes empty array downstream | PARTIAL | Log Empty node logs the group URL and does not throw an error — satisfied. However, it returns `{ posts: [] }` (a wrapper) rather than an empty item array, which is an inconsistent output schema vs. the happy path |

### Anti-Patterns Found

| File | Location | Pattern | Severity | Impact |
|------|----------|---------|----------|--------|
| `workflows/leads_scrape_apify.json` | Log Empty node, `jsCode` | Returns `[{ json: { posts: [] } }]` — wrapper object instead of empty item array | Warning | leads_main Phase 5 must handle two different output shapes: flat post items on true branch, `{ posts: [] }` wrapper on false branch |
| `.planning/phases/02-leads-scrape-apify/02-VALIDATION.md` | Frontmatter + sign-off | `nyquist_compliant: false`, all 3 scenario checkboxes unchecked despite successful live test | Info | Administrative gap — STATE.md confirms the test passed but VALIDATION.md was never updated to reflect completion |

### Human Verification Required

#### 1. Zero-Post Branch Output Shape

**Test:** Trigger the workflow with `post_count: 0` (or a private/empty group) and observe what leads_main receives when it calls this sub-workflow.
**Expected:** The calling workflow receives a consistent structure it can iterate — either zero items, or a known wrapper it explicitly handles.
**Why human:** Cannot determine from static JSON what n8n does with a sub-workflow's false-branch output shape at the Execute Workflow call site in leads_main. This requires a live n8n run with the zero-post scenario.

#### 2. Real Apify Field Name Confirmation (VALIDATION.md Scenario 3)

**Test:** After a live Apify run, inspect the raw "Apify Scrape" node output and confirm which field name aliases were used (`postId` or `id`, `message` or `text`, `url` or `postUrl`, `time` or `timestamp`).
**Expected:** All 5 mapped fields resolve to non-empty values — no field falls through to the `''` fallback.
**Why human:** The fallback alias strategy is defensive but untested against a real Apify response. The live test confirmed 5 posts returned but Scenario 3 of VALIDATION.md was not signed off.

### Gaps Summary

One gap blocks full goal achievement:

**Zero-post output schema inconsistency:** The true branch (posts found) passes flat post item objects downstream. The false branch (Log Empty) returns `[{ json: { posts: [] } }]` — a single item with a `posts` key wrapping an empty array. These are incompatible shapes. When leads_main (Phase 5) iterates the sub-workflow output to build its post list, the zero-post case will produce a single item `{ posts: [] }` rather than zero items. This could cause leads_main to pass `{ posts: [] }` into leads_filter_claude as if it were a post, or to count 1 item when it expects 0.

The fix is straightforward: change Log Empty to `return [];` (zero items, matching true-branch behavior when 0 posts are found). Alternatively, document the intentional difference and add explicit handling in leads_main.

The two administrative items (VALIDATION.md not updated, human verification pending) are non-blocking for the workflow's technical function.

---

_Verified: 2026-03-21T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
