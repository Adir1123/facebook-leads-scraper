# Facebook Leads Automation

## What This Is

An n8n automation for a Family Law Attorney in Israel. The client submits a form with Facebook group URLs; the system scrapes posts via Apify, filters them for Hebrew-language leads using Claude AI, deduplicates against existing records, and appends qualified leads to a Google Sheet — one tab per group.

## Core Value

Automatically surface real people seeking family law help in Hebrew Facebook groups, so the attorney never misses a potential client.

## Requirements

### Validated

- [x] n8n form accepts `group_urls` (multi-line) and `posts_per_group` (number, default 50) — Validated in Phase 5: leads_main
- [x] Apify `facebook-groups-scraper` scrapes each group and returns posts with ID, author, text, link, date — Validated in Phase 2: leads_scrape_apify
- [x] Claude filters posts in batches of 10, returning only genuine family law leads (Hebrew-aware) — Validated in Phase 3: leads_filter_claude
- [x] Google Sheet auto-created on first run; Sheet ID persisted in n8n static data — Validated in Phase 4: leads_store_sheets
- [x] One tab per group, named after the group URL slug — Validated in Phase 4: leads_store_sheets
- [x] Columns: Post ID | Author | Post Link | Post Date | Scraped At | Seen — Validated in Phase 4, extended in Phase 7
- [x] Deduplication: never append a Post ID already in the sheet (includes Seen tab) — Validated in Phase 4, enhanced in Phase 7
- [x] Error workflow sends Gmail alert with workflow name, node, error message, timestamp — Created in Phase 1 (credential pending)
- [x] All credentials stored in n8n Credential Store only — never in workflow JSON — Enforced across all phases

### Active

(All requirements validated — see above)

### Out of Scope

- Multi-client or multi-niche support — single attorney, single prompt
- UI dashboard — n8n form is sufficient
- Post content storage — metadata only
- Lead scoring or ranking — binary relevant/not
- CRM integration or automated follow-up

## Context

- Platform: n8n Cloud (adir1123.app.n8n.cloud)
- Architecture: 5 n8n sub-workflows + 1 Google Apps Script
- Apify actor: `apify~facebook-groups-scraper` (sync run endpoint)
- Claude model: `claude-3-5-sonnet-20241022`
- Credentials: Apify (HTTP Header Auth), Anthropic (HTTP Header Auth), Google Sheets (OAuth2), Gmail (OAuth2)
- Customer Sheet ID: `1vmxiJ1Tnp1uOUHUEZSqHYBpqPUjWq-I5nApGOAupYGg`
- Schedule: Every 2 hours (6am-midnight Israel time), 10 Facebook groups
- Apps Script: `seen-leads.gs` deployed on customer sheet (onEdit trigger)

## Constraints

- **Security**: All API keys in n8n Credential Store — `.mcp.json` is gitignored
- **Apify**: Sync endpoint used (blocks until done) — acceptable for ≤200 posts
- **Claude batching**: 10 posts per API call — balances cost vs. context quality
- **Sheets**: Append-only — never overwrite existing rows
- **Static data**: Sheet ID stored in n8n static data to avoid external config

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sub-workflows over monolith | Each stage independently testable and rerunnable | Validated |
| Sync Apify endpoint | Simpler than polling; acceptable latency for ≤200 posts | Validated |
| Batch Claude calls (10/call) | Balances token cost vs. context quality | Validated |
| Static data for Sheet ID | Avoids external config store; persists across runs | Validated |
| Append-only sheets | Safe for client data; never overwrites existing rows | Validated |
| Claude structured JSON output | Deterministic parsing; no regex on prose | Validated |
| Simple onEdit trigger (not installable) | Zero-config deployment for Apps Script | Validated |
| neverError HTTP Request for Seen tab | Graceful 404 when Seen tab doesn't exist | Validated |
| Dual-source dedup (group + Seen tab) | Single Set merge prevents re-insertion | Validated |

## Shipped Milestones

### v1.0 Core Pipeline (2026-03-22)
Full scrape → filter → store pipeline with 5 n8n sub-workflows, scheduled runs, and error alerting.

### v1.1 Seen Leads UX (2026-03-23)
Checkbox column on leads, Apps Script auto-move to Seen tab, pipeline dedup against Seen tab.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-23 — after v1.1 milestone (Seen Leads UX shipped)*
