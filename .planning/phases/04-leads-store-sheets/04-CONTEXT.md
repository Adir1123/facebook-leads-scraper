# Phase 4: leads_store_sheets - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Sub-workflow that accepts `{ posts: [...], group_url }` via Execute Workflow trigger, deduplicates against existing Google Sheet rows, and appends only new leads. Handles sheet creation on first run, tab creation per group, and the zero-new-posts case.

</domain>

<decisions>
## Implementation Decisions

### Google Sheet creation
- **D-01:** Auto-create a Google Sheet named "Facebook Leads" on first run
- **D-02:** Store Sheet ID in n8n static data after creation
- **D-03:** The n8n Google Sheets OAuth2 credential account is different from the sheet owner — sheet must be shared with the credential account as editor
- **D-04:** Self-healing: if static data Sheet ID points to a deleted/inaccessible sheet, create a new one automatically and update static data (don't error out)

### Tab naming from URL
- **D-05:** Extract group slug from URL as-is — use the path segment after `/groups/` (e.g., `my-cool-group` or `123456789`)
- **D-06:** Truncate tab name to 100 characters AND clean special characters that Google Sheets doesn't allow in tab names
- **D-07:** If the tab already exists (same group URL in a later run), append to the existing tab — dedup prevents duplicate rows

### Tab initialization
- **D-08:** When a new tab is created, insert a header row: `Post ID | Author | Post Link | Post Date | Scraped At`
- **D-09:** Header row matches STOR-07 spec exactly — no extra columns

### Deduplication
- **D-10:** Read all existing Post IDs from column A of the group's tab
- **D-11:** Filter input posts to only those whose Post ID is NOT already in column A
- **D-12:** If zero new posts after dedup, log "all posts already exist" and skip the append step (STOR-08)

### Row format
- **D-13:** Append rows with column mapping: A=Post ID, B=Author, C=Post Link, D=Post Date, E=Scraped At (ISO timestamp)
- **D-14:** Scraped At = current ISO timestamp at time of append

### Claude's Discretion
- n8n node choice for Google Sheets operations (built-in Google Sheets node vs HTTP Request)
- Static data read/write implementation details
- Exact URL parsing logic for extracting the group slug
- Special character replacement strategy for tab names

</decisions>

<specifics>
## Specific Ideas

- Sheet name is exactly "Facebook Leads" — not parameterized
- Self-healing on deleted sheet is important — don't require manual intervention
- Tab names use the URL slug directly — no attempt to resolve human-readable group names from numeric IDs

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — STOR-01 through STOR-08 (authoritative spec)
- `.planning/ROADMAP.md` — Phase 4 plans (step-by-step outline)

### Project architecture
- `CLAUDE.md` — System map, credential setup, data schema (Sheet columns spec), key design decisions
- `.planning/STATE.md` — n8n workflow IDs, completed phases

### Prior phases (input contract)
- `.planning/phases/03-leads-filter-claude/03-01-SUMMARY.md` — Output schema from filter workflow (what this phase receives)
- `workflows/leads_filter_claude.json` — Upstream workflow structure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `workflows/leads_scrape_apify.json` — Established n8n workflow JSON structure pattern (nodes, connections, settings, meta)
- `workflows/leads_filter_claude.json` — Execute Workflow Trigger pattern, Code node patterns

### Established Patterns
- Execute Workflow Trigger as entry point (typeVersion 1)
- Code nodes for data transformation (typeVersion 2)
- JSON export format: `{ name, nodes, connections, active, settings: { executionOrder: "v1" }, meta: { instanceId: "" } }`

### Integration Points
- Called by leads_main (Phase 5) via Execute Workflow node
- Receives output from leads_filter_claude: array of `{ postId, authorName, postText, postLink, postDate }`
- Google Sheets OAuth2 credential must be configured in n8n UI after import

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-leads-store-sheets*
*Context gathered: 2026-03-22*
