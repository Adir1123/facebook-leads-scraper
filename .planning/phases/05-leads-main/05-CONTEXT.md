# Phase 5: leads_main - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Orchestrator workflow that ties all sub-workflows together. n8n Form trigger accepts group URLs and post count, validates and parses URLs, loops over each group calling scrape → filter → store in sequence, attaches error workflow, and returns a summary response to the form.

</domain>

<decisions>
## Implementation Decisions

### URL parsing & validation
- **D-01:** Split `group_urls` by newline, trim whitespace, remove empty lines
- **D-02:** Validate every URL matches `facebook.com/groups/<slug>` pattern — accept both named slugs (`my-cool-group`) and numeric IDs (`123456789`)
- **D-03:** If ANY URL is invalid, reject the entire form submission with an error listing the bad URLs — do not process partial input
- **D-04:** Deduplicate URLs silently — if the same group URL appears twice, process it only once
- **D-05:** Normalize URLs: strip trailing slashes, remove query parameters (e.g., `?ref=share`), force `https://` scheme. Example: `facebook.com/groups/foo?ref=share` → `https://www.facebook.com/groups/foo`

### Form response & UX
- **D-06:** Wait for all groups to finish processing before returning the form response (synchronous)
- **D-07:** Success response shows per-group breakdown: group name/slug, posts scraped, leads found, new leads added to sheet
- **D-08:** Response includes a clickable link to the Google Sheet
- **D-09:** Sheet link constructed from Sheet ID stored in static data (from leads_store_sheets)

### Per-group error handling
- **D-10:** If scraping or filtering fails for one group, skip it and continue processing remaining groups
- **D-11:** Include failed groups in the response summary with the error reason
- **D-12:** If ALL groups fail (zero successes), throw an error to trigger leads_error_notify so the attorney gets an email alert

### Form access
- **D-13:** Form is open to anyone with the URL — no password protection

### Claude's Discretion
- n8n Form Trigger node configuration details
- Exact Code node implementation for URL parsing/validation
- How to accumulate per-group stats for the summary response
- Loop implementation (SplitInBatches vs Loop Over Items)
- How to catch per-group errors without failing the whole workflow (try/catch pattern in n8n)
- Form response HTML/text formatting

</decisions>

<specifics>
## Specific Ideas

- URL validation regex should match: `https?://(www\.)?facebook\.com/groups/[a-zA-Z0-9._-]+`
- The form is for one attorney — simplicity over configurability
- posts_per_group defaults to 50 if empty or 0 (from ORCH-01)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ORCH-01, ORCH-02, ORCH-03 (authoritative spec)
- `.planning/ROADMAP.md` — Phase 5 plans (step-by-step outline)

### Project architecture
- `CLAUDE.md` — System map, credential setup, data schema, key design decisions
- `.planning/STATE.md` — All n8n workflow IDs (scrape: `H3PMNprdI9tzT7yf`, filter: `CY2ax7bMZaLoODGm`, store: `HWJVJIVEDpu69Nbw`, error: `k5LZs1ntJRXaqNpM`)

### Sub-workflow contracts (input/output schemas)
- `.planning/phases/02-leads-scrape-apify/02-CONTEXT.md` — scrape input: `{ group_url, post_count }`, output: `[ { postId, authorName, postText, postLink, postDate } ]`
- `.planning/phases/03-leads-filter-claude/03-CONTEXT.md` — filter input: `{ posts: [...], group_url }`, output: `[ filtered posts ]`
- `.planning/phases/04-leads-store-sheets/04-CONTEXT.md` — store input: `{ posts: [...], group_url }`, output: append to sheet
- `.planning/phases/04-leads-store-sheets/04-02-SUMMARY.md` — Bugs found during Phase 4 (n8n Google Sheets quirks to be aware of)

### Prior phase learnings
- `.planning/STATE.md` §Decisions Recorded — All technical decisions from Phases 2-4 (n8n node quirks, mode settings, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `workflows/leads_scrape_apify.json` — Execute Workflow Trigger pattern, HTTP Request node pattern
- `workflows/leads_filter_claude.json` — Execute Workflow call pattern, Code node data transformation
- `workflows/leads_store_sheets.json` — Execute Workflow call pattern, static data usage for Sheet ID

### Established Patterns
- Execute Workflow Trigger as entry point for sub-workflows (typeVersion 1)
- Code nodes for data transformation (typeVersion 2)
- `alwaysOutputData: true` on nodes that may return empty results
- HTTP Request nodes preferred over Google Sheets nodes for reliability (Phase 4 learning)

### Integration Points
- Calls 3 sub-workflows via Execute Workflow nodes: scrape, filter, store
- leads_error_notify (`k5LZs1ntJRXaqNpM`) attached as Error Workflow in workflow settings
- Google Sheet ID available from leads_store_sheets static data for constructing response link
- Gmail OAuth2 credential needed on leads_error_notify (pending from Phase 1)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-leads-main*
*Context gathered: 2026-03-22*
