# Roadmap: Facebook Leads Automation

**Created:** 2026-03-21
**Current Milestone:** v1.1 — Seen Leads UX

---

## Milestones

- [x] **v1.0 Core Pipeline** — Phases 1-5 (complete 2026-03-22)
- [ ] **v1.1 Seen Leads UX** — Phases 6-7 (in progress)

---

<details>
<summary>v1.0 Core Pipeline (Phases 1-5) — COMPLETE 2026-03-22</summary>

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

**Done when:** Calling the sub-workflow with a real Facebook group URL returns a structured post array.

---

## Phase 3: leads_filter_claude

**Goal:** Sub-workflow accepts posts array, batches 10 at a time, calls Claude, and returns only relevant posts.

**Requirements:** FLTR-01, FLTR-02, FLTR-03, FLTR-04, FLTR-05, FLTR-06, FLTR-07

**Plans:** 1 plan

Plans:
- [x] 03-01-PLAN.md — Create leads_filter_claude workflow: trigger, SplitInBatches, Claude API call with Hebrew system prompt, JSON response parsing with try/catch, result aggregation

**Done when:** Passing 20 mixed Hebrew posts returns only the relevant ones with correct IDs.

---

## Phase 4: leads_store_sheets

**Goal:** Sub-workflow accepts filtered posts, deduplicates against sheet, and appends only new rows.

**Requirements:** STOR-01, STOR-02, STOR-03, STOR-04, STOR-05, STOR-06, STOR-07, STOR-08

**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md — Build complete leads_store_sheets workflow JSON
- [x] 04-02-PLAN.md — Import into n8n, assign credentials, verify dedup

**Done when:** Running twice with the same posts results in rows appended only on the first run.

---

## Phase 5: leads_main

**Goal:** Orchestrator workflow wires everything together — form trigger, URL parsing, loop, sub-workflow calls, error attachment.

**Requirements:** ORCH-01, ORCH-02, ORCH-03

**Plans:** 1/1 plans complete

Plans:
- [x] 05-01-PLAN.md — Build leads_main orchestrator workflow JSON with all nodes

**Done when:** Submitting the form with 2 real group URLs results in leads appended to a Google Sheet with no errors.

</details>

---

## v1.1 Seen Leads UX (In Progress)

**Milestone Goal:** Let the client mark leads as handled. Checked leads auto-move to a Seen tab and are never re-inserted by the pipeline.

### Phases

- [ ] **Phase 6: Seen Tab UX** — Google Apps Script: checkbox column, auto-move to Seen tab, Seen tab schema
- [ ] **Phase 7: Pipeline Update** — n8n: dedup against Seen tab, append checkbox column on new leads

---

## Phase Details

### Phase 6: Seen Tab UX

**Goal:** The client can check a box on any lead row and it automatically moves to the Seen tab, removing it from the group tab.

**Depends on:** Phase 5 (Google Sheet exists with group tabs)

**Requirements:** UX-01, UX-02, UX-03, UX-04

**Success Criteria** (what must be TRUE):
  1. Every lead row in a group tab has a checkbox in column F
  2. Checking the checkbox causes the row to disappear from the group tab within seconds
  3. The moved row appears in the "Seen" tab with its original data plus a Source Group column
  4. The "Seen" tab is created automatically if it does not exist when the first row is moved

**Plans:** 1 plan

Plans:
- [x] 06-01-PLAN.md — Google Apps Script: onEdit trigger for row move + addCheckboxesToAllGroups utility

### Phase 7: Pipeline Update

**Goal:** The pipeline writes an unchecked checkbox when appending new leads, and never re-inserts a lead that already exists in the Seen tab.

**Depends on:** Phase 6 (Seen tab schema defined)

**Requirements:** DDP-01, DDP-02, APP-01

**Success Criteria** (what must be TRUE):
  1. New leads appended to a group tab have an unchecked checkbox in column F
  2. Running the pipeline for a group whose leads were moved to Seen does not re-insert them
  3. A lead already in the Seen tab is skipped even if it would match a fresh scrape result

**Plans:** 1 plan

Plans:
- [ ] 07-01-PLAN.md — Update leads_store_sheets with Seen tab dedup and checkbox column

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. leads_error_notify | v1.0 | 1/1 | Complete | 2026-03-22 |
| 2. leads_scrape_apify | v1.0 | 1/1 | Complete | 2026-03-22 |
| 3. leads_filter_claude | v1.0 | 1/1 | Complete | 2026-03-22 |
| 4. leads_store_sheets | v1.0 | 2/2 | Complete | 2026-03-22 |
| 5. leads_main | v1.0 | 1/1 | Complete | 2026-03-22 |
| 6. Seen Tab UX | v1.1 | 0/1 | Planned | - |
| 7. Pipeline Update | v1.1 | 0/1 | Planned | - |

---

*Roadmap created: 2026-03-21*
*Last updated: 2026-03-23 — Phase 7 planned (1 plan)*
