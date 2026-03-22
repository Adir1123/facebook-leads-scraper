# Roadmap: Facebook Leads Automation

**Created:** 2026-03-21
**Milestone:** v1 — Full working pipeline

---

## Phase 1: leads_error_notify

**Goal:** Error notification workflow exists, fires on n8n errors, and sends formatted Gmail alerts.

**Requirements:** ERR-01, ERR-02, ERR-03, ERR-04

**Plans:**
1. Create workflow with Error Trigger node
2. Add Gmail node with formatted subject + body (workflow name, node, error, timestamp, execution ID)
3. Assign Gmail OAuth2 credential
4. Set as Error Workflow on leads_main (once leads_main exists)

**Done when:** Manually triggering a test error causes a Gmail to arrive with correct format.

**Status:** In Progress (workflow created in n8n, credential assignment pending)

---

## Phase 2: leads_scrape_apify

**Goal:** Sub-workflow accepts a group URL + post count, calls Apify, and returns structured post array.

**Requirements:** SCRP-01, SCRP-02, SCRP-03, SCRP-04

**Plans:** 1/1 plans complete

Plans:
- [x] 02-01-PLAN.md — Create leads_scrape_apify workflow: trigger, Apify HTTP Request, field mapping, zero-post handling
  - Tasks 1-2 complete (commits 2bd8533, 3edb4eb); Task 3 checkpoint awaiting human-verify in n8n

**Done when:** Calling the sub-workflow with a real Facebook group URL returns a structured post array.

---

## Phase 3: leads_filter_claude

**Goal:** Sub-workflow accepts posts array, batches 10 at a time, calls Claude, and returns only relevant posts.

**Requirements:** FLTR-01, FLTR-02, FLTR-03, FLTR-04, FLTR-05, FLTR-06, FLTR-07

**Plans:** 1 plan

Plans:
- [ ] 03-01-PLAN.md — Create leads_filter_claude workflow: trigger, SplitInBatches, Claude API call with Hebrew system prompt, JSON response parsing with try/catch, result aggregation

**Done when:** Passing 20 mixed Hebrew posts returns only the relevant ones with correct IDs.

---

## Phase 4: leads_store_sheets

**Goal:** Sub-workflow accepts filtered posts, deduplicates against sheet, and appends only new rows.

**Requirements:** STOR-01, STOR-02, STOR-03, STOR-04, STOR-05, STOR-06, STOR-07, STOR-08

**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md — Build complete leads_store_sheets workflow JSON: trigger, URL slug extraction, sheet get/create with static data, tab get/create with header row, dedup, conditional append, zero-posts skip (commit: 05e9bbb)
- [ ] 04-02-PLAN.md — Import into n8n, assign Google Sheets + Drive credentials, verify sheet creation and dedup, update STATE.md

**Done when:** Running twice with the same posts results in rows appended only on the first run.

---

## Phase 5: leads_main

**Goal:** Orchestrator workflow wires everything together — form trigger, URL parsing, loop, sub-workflow calls, error attachment.

**Requirements:** ORCH-01, ORCH-02, ORCH-03

**Plans:**
1. Create workflow with n8n Form trigger (group_urls, posts_per_group fields)
2. Code node: split `group_urls` by newline, default `posts_per_group` to 50 if 0/empty
3. Loop Over Items: for each URL → call leads_scrape_apify → leads_filter_claude → leads_store_sheets
4. Attach leads_error_notify as Error Workflow
5. Set success response on form

**Done when:** Submitting the form with 2 real group URLs results in leads appended to a Google Sheet with no errors.

---

## Summary

| Phase | Workflow | Requirements | Status |
|-------|----------|-------------|--------|
| 1 | leads_error_notify | ERR-01–04 | In Progress |
| 2 | leads_scrape_apify | Complete    | 2026-03-21 |
| 3 | leads_filter_claude | FLTR-01–07 | Planning Complete |
| 4 | leads_store_sheets | STOR-01–08 | In Progress (04-01 complete) |
| 5 | leads_main | ORCH-01–03 | Pending |

---
*Roadmap created: 2026-03-21*
