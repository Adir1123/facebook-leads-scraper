# Phase 7: Pipeline Update - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Update leads_store_sheets n8n workflow to: (1) read Post IDs from the Seen tab before appending, so seen leads are never re-inserted; (2) append an unchecked checkbox in column F on every new lead row.

</domain>

<decisions>
## Implementation Decisions

### Dedup against Seen tab
- **D-01:** Read Post IDs from both the group tab (existing) AND the global "Seen" tab before filtering new posts
- **D-02:** If the "Seen" tab does not exist yet, create it with headers: Post ID | Author | Post Link | Post Date | Scraped At | Source Group
- **D-03:** A post whose ID appears in the Seen tab is treated identically to one already in the group tab — skipped silently

### New lead row format
- **D-04:** New leads appended to group tabs include an unchecked checkbox (FALSE) in column F
- **D-05:** New group tabs created by the pipeline include "Seen" as the column F header in the header row
- **D-06:** Existing group tabs get "Seen" added to F1 if it's empty (don't overwrite if already set)

### Claude's Discretion
- How to implement the Seen tab read (new Google Sheets node, HTTP Request, or Code node)
- Where in the workflow to insert the Seen tab read (before or merged with existing Read Existing IDs)
- How to handle the checkbox value in the HTTP Request append (boolean vs string)
- Error handling if Seen tab read fails

</decisions>

<specifics>
## Specific Ideas

- Seen tab schema is already established by Phase 6 Apps Script — Post ID is in column A
- Customer Sheet ID is hardcoded in n8n static data: `1vmxiJ1Tnp1uOUHUEZSqHYBpqPUjWq-I5nApGOAupYGg`
- The pipeline runs every 2 hours — dedup must be reliable to avoid duplicate leads

</specifics>

<canonical_refs>
## Canonical References

- `.planning/phases/06-seen-tab-ux/06-CONTEXT.md` — Seen tab schema decisions (D-05 through D-09), column layout
- `.planning/REQUIREMENTS.md` — DDP-01, DDP-02, APP-01 requirement definitions
- `scripts/seen-leads.gs` — Live Apps Script showing Seen tab creation and header format

</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- **leads_store_sheets** (n8n ID: HWJVJIVEDpu69Nbw) — 24-node workflow, the target for modification
- **Read Existing IDs** node — currently reads column A from group tab only; must also read from Seen tab
- **Filter New Posts** node — Code node that compares incoming posts against existing IDs; must include Seen IDs in the set
- **Build Rows** node — Code node that formats rows for append; must add FALSE for column F
- **Write Header Row** node — HTTP Request that writes header on new tabs; must include "Seen" in column F
- **Append Rows** node — HTTP Request that appends data; row format must include column F value

### Established Patterns
- Workflow uses HTTP Request nodes for Sheets API calls (not the built-in Google Sheets node for writes)
- Data is passed between nodes via `$json` properties with manual restoration after Google Sheets nodes
- Post ID in column A is the unique identifier for dedup
- Header row format: Post ID | Author | Post Link | Post Date | Scraped At

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-pipeline-update*
*Context gathered: 2026-03-23*
