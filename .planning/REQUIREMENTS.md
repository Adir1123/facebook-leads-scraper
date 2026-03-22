# Requirements: Facebook Leads Automation

**Defined:** 2026-03-21
**Core Value:** Automatically surface real Hebrew-language family law leads from Facebook groups into a Google Sheet

## v1 Requirements

### Orchestration

- [x] **ORCH-01**: n8n form accepts `group_urls` (multi-line text, ≥1 URL) and `posts_per_group` (number, 1–500, default 50)
- [x] **ORCH-02**: leads_main loops over each URL and calls the three sub-workflows in sequence: scrape → filter → store
- [x] **ORCH-03**: leads_error_notify is attached as the Error Workflow on leads_main and sends Gmail alerts on failure

### Scraping

- [x] **SCRP-01**: leads_scrape_apify accepts `{ group_url, post_count }` via Execute Workflow trigger
- [x] **SCRP-02**: Calls Apify `apify~facebook-groups-scraper` via sync HTTP endpoint (blocks until complete)
- [x] **SCRP-03**: Returns array of `{ postId, authorName, postText, postLink, postDate }`
- [x] **SCRP-04**: If zero posts returned, logs "no posts found for [URL]" and passes empty array downstream

### Filtering

- [ ] **FLTR-01**: leads_filter_claude accepts `{ posts: [...], group_url }` via Execute Workflow trigger
- [ ] **FLTR-02**: Splits posts into batches of 10 before calling Claude
- [ ] **FLTR-03**: Calls Anthropic API with `claude-3-5-sonnet-20241022`, Hebrew-aware family law system prompt
- [ ] **FLTR-04**: Claude returns `{ "relevant_post_ids": [...] }` — parsed and used to filter original array
- [ ] **FLTR-05**: Returns only posts whose ID appeared in `relevant_post_ids`
- [ ] **FLTR-06**: Malformed JSON from Claude raises an error (caught by error workflow)
- [ ] **FLTR-07**: Empty `relevant_post_ids` returns empty array silently (no storage call needed)

### Storage

- [x] **STOR-01**: leads_store_sheets accepts `{ posts: [...], group_url }` via Execute Workflow trigger
- [x] **STOR-02**: Extracts group name from URL slug for tab naming
- [x] **STOR-03**: Gets or creates master Google Sheet; stores Sheet ID in n8n static data on first run
- [x] **STOR-04**: Gets or creates tab named after group; inserts header row if tab is new
- [x] **STOR-05**: Reads existing Post IDs from column A before appending
- [x] **STOR-06**: Appends only posts whose Post ID is not already in the sheet
- [x] **STOR-07**: Row format: Post ID | Author | Post Link | Post Date | Scraped At (ISO timestamp)
- [x] **STOR-08**: If zero new posts after dedup, logs "all posts already exist" and skips write

### Error Handling

- [ ] **ERR-01**: leads_error_notify triggers on n8n Error Trigger
- [ ] **ERR-02**: Gmail alert subject: `⚠️ Leads Workflow Error — [Workflow Name]`
- [ ] **ERR-03**: Gmail body includes: workflow name, failed node, error message, timestamp, execution ID
- [ ] **ERR-04**: All credentials stored in n8n Credential Store — never hardcoded in workflow JSON

## v1.1 Requirements

Requirements for Seen Leads UX milestone.

### Sheet UX

- [x] **UX-01**: Each group tab has a "Seen" checkbox column (column F) on every lead row
- [x] **UX-02**: Checking the checkbox moves the row to a global "Seen" tab and deletes it from the group tab (via Google Apps Script)
- [x] **UX-03**: "Seen" tab has columns: Post ID | Author | Post Link | Post Date | Scraped At | Source Group
- [x] **UX-04**: "Seen" tab is auto-created if it doesn't exist

### Dedup

- [x] **DDP-01**: leads_store_sheets reads Post IDs from both the group tab and the "Seen" tab before appending
- [x] **DDP-02**: A lead that exists in the "Seen" tab is never re-inserted into any group tab

### Append

- [x] **APP-01**: New leads appended to group tabs include an unchecked checkbox in column F

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-client / multi-niche | Single attorney, single prompt — no config layer needed |
| UI dashboard | n8n form sufficient for client |
| Post content storage | Privacy; metadata only needed for outreach |
| Lead scoring / ranking | Binary filter is sufficient for v1 |
| CRM integration | Out of scope per PRD |
| Mobile app or web frontend | n8n form is the interface |
| Undo "seen" (move back to group tab) | Client confirmed she never revisits handled leads |
| Per-group "Seen" tabs | One global tab is simpler; client doesn't need group-level archive |
| Automatic "seen" detection | Client wants explicit control via checkbox |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ERR-01, ERR-02, ERR-03, ERR-04 | Phase 1 | Complete |
| SCRP-01, SCRP-02, SCRP-03, SCRP-04 | Phase 2 | Complete |
| FLTR-01–FLTR-07 | Phase 3 | Complete |
| STOR-01–STOR-08 | Phase 4 | Complete |
| ORCH-01, ORCH-02, ORCH-03 | Phase 5 | Complete |
| UX-01, UX-02, UX-03, UX-04 | Phase 6 | Pending |
| DDP-01, DDP-02, APP-01 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 26 total (mapped, complete)
- v1.1 requirements: 7 total
- v1.1 mapped to phases: 7/7 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-22 — v1.1 requirements mapped to Phases 6 and 7*
