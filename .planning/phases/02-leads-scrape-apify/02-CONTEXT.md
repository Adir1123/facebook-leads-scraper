# Phase 2: leads_scrape_apify - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning
**Source:** Requirements + roadmap (no discuss-phase questions asked)

<domain>
## Phase Boundary

Sub-workflow that accepts `{ group_url, post_count }` via Execute Workflow trigger, calls Apify `apify~facebook-groups-scraper` via sync HTTP endpoint, and returns a structured post array `[ { postId, authorName, postText, postLink, postDate } ]`. Handles the zero-post case.

</domain>

<decisions>
## Implementation Decisions

### Trigger
- Execute Workflow trigger (called by leads_main, not a standalone form)
- Input: `{ group_url, post_count }`

### Apify integration
- Actor: `apify~facebook-groups-scraper`
- Endpoint: sync run endpoint (blocks until complete — no polling needed)
- Auth: HTTP Header Auth `Authorization: Bearer <token>` (n8n credential store)
- Parameters: `group_url` and `post_count` passed as actor input

### Output schema
- Returns array of `{ postId, authorName, postText, postLink, postDate }`
- Fields mapped from Apify response

### Zero-post handling
- IF node detects empty result
- Log "no posts found for [URL]"
- Pass empty array downstream (no error thrown)

### Claude's Discretion
- Exact Apify input field names (verify from actor schema)
- postDate format (pass through as-is from Apify)
- HTTP timeout value
- Failure behavior on Apify HTTP error (let n8n error workflow handle it)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project architecture
- `CLAUDE.md` — System map, credential setup, data schema, key design decisions
- `.planning/REQUIREMENTS.md` — SCRP-01, SCRP-02, SCRP-03, SCRP-04 (authoritative spec)
- `.planning/ROADMAP.md` — Phase 2 plans (step-by-step outline)

### n8n state
- `.planning/STATE.md` — Existing workflow IDs, current status

</canonical_refs>

<specifics>
## Specific Ideas

No specific requirements beyond what's in REQUIREMENTS.md — standard Apify sync integration.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-leads-scrape-apify*
*Context gathered: 2026-03-21*
