# Phase 6: Seen Tab UX - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Google Apps Script attached to the customer's Google Sheet. Client checks a checkbox on a lead row → row auto-moves to a global "Seen" tab → row is deleted from the group tab. The "Seen" tab is created automatically if it doesn't exist.

</domain>

<decisions>
## Implementation Decisions

### Checkbox placement
- **D-01:** Checkbox in column F (after Scraped At in column E)
- **D-02:** Add checkboxes to all existing lead rows retroactively, not just new rows going forward

### Row move behavior
- **D-03:** Instant move via Apps Script `onEdit` trigger — fires per cell change, no batch/button
- **D-04:** When checkbox in column F is checked (TRUE), move that row to "Seen" tab immediately and delete from source tab

### Seen tab schema
- **D-05:** One global "Seen" tab (not per-group)
- **D-06:** Columns: Post ID | Author | Post Link | Post Date | Scraped At | Source Group
- **D-07:** Source Group = the tab name the row was moved from (identifies which Facebook group)

### Seen tab creation
- **D-08:** Apps Script creates "Seen" tab automatically on first checkbox check if it doesn't exist
- **D-09:** Header row written on creation: Post ID | Author | Post Link | Post Date | Scraped At | Source Group

### Claude's Discretion
- Apps Script trigger type details (simple vs installable onEdit)
- Error handling if sheet API calls fail
- Whether to skip header rows or non-lead rows when checking for checkbox edits
- How to handle the "Sheet1" default tab (ignore it)

</decisions>

<specifics>
## Specific Ideas

- Client confirmed she never revisits handled leads — Seen tab is purely an archive for dedup purposes
- Must work on the customer's existing sheet (ID: 1vmxiJ1Tnp1uOUHUEZSqHYBpqPUjWq-I5nApGOAupYGg)

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above and ROADMAP.md Phase 6 section.

</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- Customer Google Sheet: `1vmxiJ1Tnp1uOUHUEZSqHYBpqPUjWq-I5nApGOAupYGg`
- Group tabs are named after Facebook group URL slugs (e.g., "lawyersanswer")
- Current columns A-E: Post ID | Author | Post Link | Post Date | Scraped At
- n8n leads_store_sheets (HWJVJIVEDpu69Nbw) appends rows — Phase 7 will update it to include checkbox in column F

### Established Patterns
- Header row is row 1 on each group tab — Apps Script must skip it
- Post ID in column A is the unique identifier used for dedup

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-seen-tab-ux*
*Context gathered: 2026-03-22*
