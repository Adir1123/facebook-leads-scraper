---
phase: 2
slug: leads-scrape-apify
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 2 — Validation Strategy

> Manual validation checklist for an n8n UI workflow. No shell-runnable automated tests — all verification is done via n8n execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | n8n manual execution (no automated test framework) |
| **Config file** | none — n8n UI workflow |
| **Quick run command** | Manually trigger workflow in n8n with test input |
| **Full suite** | Run all 3 scenarios below in n8n |
| **Estimated runtime** | ~5–10 minutes (includes Apify API call time) |

---

## Validation Scenarios (from RESEARCH.md §7)

### Scenario 1 — Unit test (happy path)

**Requirement:** SCRP-02, SCRP-03

**Steps:**
1. Open `leads_scrape_apify` workflow in n8n
2. Click "Test workflow" with input:
   ```json
   { "group_url": "<known public Facebook group URL>", "post_count": 5 }
   ```
3. Observe output of "Map Fields" node

**Pass criteria:**
- Execution completes without errors
- Output array contains items with all 5 fields: `postId`, `authorName`, `postText`, `postLink`, `postDate`
- All 5 fields are non-empty strings

---

### Scenario 2 — Zero-post test

**Requirement:** SCRP-04

**Steps:**
1. Temporarily set `resultsLimit` to 0 in the HTTP Request body (or use a group with no posts)
2. Run the workflow
3. Observe the "Has Posts?" IF node routing

**Pass criteria:**
- Execution routes to false branch ("Log Empty" node)
- n8n execution log shows: `No posts found for <group_url>`
- Output to calling workflow is `{ posts: [] }` (no error thrown)

---

### Scenario 3 — Field mapping fallback test

**Requirement:** SCRP-03

**Steps:**
1. After a real Apify run, inspect the raw output of the "Apify Scrape" HTTP Request node
2. Confirm the actual Apify field names (e.g., `message` vs `text`, `time` vs `timestamp`)
3. Verify the Code node maps correctly using the right alias

**Pass criteria:**
- `postId` is a non-empty string (numeric Facebook ID)
- `postDate` is parseable as a date (ISO or similar format)
- `postLink` is a valid Facebook URL starting with `https://`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Apify sync endpoint blocks until done | SCRP-02 | n8n UI only | Observe that execution waits for Apify response before proceeding |
| Auth credential works | SCRP-02 | Requires real token | HTTP Request returns 200, not 401 |
| Empty array passed downstream (not error) | SCRP-04 | Runtime behavior | Zero-post scenario: calling workflow receives empty array, no error workflow triggered |

---

## Validation Sign-Off

- [ ] Scenario 1 (happy path) passed in n8n
- [ ] Scenario 2 (zero-post) passed in n8n
- [ ] Scenario 3 (field mapping) confirmed with real Apify output
- [ ] Workflow ID recorded in `.planning/STATE.md`
- [ ] `nyquist_compliant: true` set in frontmatter after all scenarios pass

**Approval:** pending
