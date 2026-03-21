# Facebook Leads Automation

## What This Is

An n8n automation for a Family Law Attorney in Israel. The client submits a form with Facebook group URLs; the system scrapes posts via Apify, filters them for Hebrew-language leads using Claude AI, deduplicates against existing records, and appends qualified leads to a Google Sheet — one tab per group.

## Core Value

Automatically surface real people seeking family law help in Hebrew Facebook groups, so the attorney never misses a potential client.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] n8n form accepts `group_urls` (multi-line) and `posts_per_group` (number, default 50)
- [ ] Apify `facebook-groups-scraper` scrapes each group and returns posts with ID, author, text, link, date
- [ ] Claude filters posts in batches of 10, returning only genuine family law leads (Hebrew-aware)
- [ ] Google Sheet auto-created on first run; Sheet ID persisted in n8n static data
- [ ] One tab per group, named after the group URL slug
- [ ] Columns: Post ID | Author | Post Link | Post Date | Scraped At
- [ ] Deduplication: never append a Post ID already in the sheet
- [ ] Error workflow sends Gmail alert with workflow name, node, error message, timestamp
- [ ] All credentials stored in n8n Credential Store only — never in workflow JSON

### Out of Scope

- Multi-client or multi-niche support — single attorney, single prompt
- UI dashboard — n8n form is sufficient
- Post content storage — metadata only
- Lead scoring or ranking — binary relevant/not
- CRM integration or automated follow-up

## Context

- Platform: n8n Cloud (adir1123.app.n8n.cloud)
- Architecture: 5 sub-workflows — leads_main, leads_scrape_apify, leads_filter_claude, leads_store_sheets, leads_error_notify
- Apify actor: `apify~facebook-groups-scraper` (sync run endpoint)
- Claude model: `claude-3-5-sonnet-20241022`
- Credentials needed: Apify (HTTP Header Auth), Anthropic (HTTP Header Auth), Google Sheets (OAuth2), Gmail (OAuth2)
- leads_error_notify already created in n8n (id: k5LZs1ntJRXaqNpM) — needs credential assignment

## Constraints

- **Security**: All API keys in n8n Credential Store — `.mcp.json` is gitignored
- **Apify**: Sync endpoint used (blocks until done) — acceptable for ≤200 posts
- **Claude batching**: 10 posts per API call — balances cost vs. context quality
- **Sheets**: Append-only — never overwrite existing rows
- **Static data**: Sheet ID stored in n8n static data to avoid external config

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sub-workflows over monolith | Each stage independently testable and rerunnable | — Pending |
| Sync Apify endpoint | Simpler than polling; acceptable latency for ≤200 posts | — Pending |
| Batch Claude calls (10/call) | Balances token cost vs. context quality | — Pending |
| Static data for Sheet ID | Avoids external config store; persists across runs | — Pending |
| Append-only sheets | Safe for client data; never overwrites existing rows | — Pending |
| Claude structured JSON output | Deterministic parsing; no regex on prose | — Pending |

---
*Last updated: 2026-03-21 — initial project setup*
