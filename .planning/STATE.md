# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Automatically surface real Hebrew-language family law leads from Facebook groups into a Google Sheet
**Current focus:** Phase 1 — leads_error_notify

## Current Status

- Phase 1 (leads_error_notify): **In Progress**
  - Workflow created in n8n (id: `k5LZs1ntJRXaqNpM`)
  - Gmail OAuth2 credential needs to be assigned in n8n UI
  - Will be set as Error Workflow on leads_main in Phase 5

## n8n Workflow IDs

| Workflow | n8n ID | Status |
|----------|--------|--------|
| leads_error_notify | k5LZs1ntJRXaqNpM | Created, credential needed |
| leads_scrape_apify | — | Not yet created |
| leads_filter_claude | — | Not yet created |
| leads_store_sheets | — | Not yet created |
| leads_main | — | Not yet created |

## Next Action

Run `/gsd:plan-phase 1` to create the detailed plan for Phase 1, or continue building directly.

---
*State initialized: 2026-03-21*
