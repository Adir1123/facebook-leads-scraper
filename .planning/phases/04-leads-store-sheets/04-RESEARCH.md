# Phase 4: leads_store_sheets - Research

**Researched:** 2026-03-22
**Domain:** n8n Google Sheets integration, static data persistence, Google Drive permissions
**Confidence:** MEDIUM — n8n built-in node capabilities confirmed via official docs; exact JSON typeVersion parameters inferred from community sources; static data persistence caveats verified via GitHub issue.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Auto-create a Google Sheet named "Facebook Leads" on first run
- **D-02:** Store Sheet ID in n8n static data after creation
- **D-03:** The n8n Google Sheets OAuth2 credential account is different from the sheet owner — sheet must be shared with the credential account as editor
- **D-04:** Self-healing: if static data Sheet ID points to a deleted/inaccessible sheet, create a new one automatically and update static data (don't error out)
- **D-05:** Extract group slug from URL as-is — use the path segment after `/groups/` (e.g., `my-cool-group` or `123456789`)
- **D-06:** Truncate tab name to 100 characters AND clean special characters that Google Sheets doesn't allow in tab names
- **D-07:** If the tab already exists (same group URL in a later run), append to the existing tab — dedup prevents duplicate rows
- **D-08:** When a new tab is created, insert a header row: `Post ID | Author | Post Link | Post Date | Scraped At`
- **D-09:** Header row matches STOR-07 spec exactly — no extra columns
- **D-10:** Read all existing Post IDs from column A of the group's tab
- **D-11:** Filter input posts to only those whose Post ID is NOT already in column A
- **D-12:** If zero new posts after dedup, log "all posts already exist" and skip the append step (STOR-08)
- **D-13:** Append rows with column mapping: A=Post ID, B=Author, C=Post Link, D=Post Date, E=Scraped At (ISO timestamp)
- **D-14:** Scraped At = current ISO timestamp at time of append

### Claude's Discretion
- n8n node choice for Google Sheets operations (built-in Google Sheets node vs HTTP Request)
- Static data read/write implementation details
- Exact URL parsing logic for extracting the group slug
- Special character replacement strategy for tab names

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STOR-01 | leads_store_sheets accepts `{ posts: [...], group_url }` via Execute Workflow trigger | Execute Workflow Trigger pattern established in prior phases |
| STOR-02 | Extracts group name from URL slug for tab naming | Code node URL parsing pattern; forbidden chars list researched |
| STOR-03 | Gets or creates master Google Sheet; stores Sheet ID in n8n static data on first run | Google Sheets node Create Spreadsheet op + `$getWorkflowStaticData('global')` |
| STOR-04 | Gets or creates tab named after group; inserts header row if tab is new | Google Sheets API `spreadsheets.get` for tab list + Google Sheets node Create Sheet op |
| STOR-05 | Reads existing Post IDs from column A before appending | Google Sheets node Get Row(s) op; returns all rows without filter |
| STOR-06 | Appends only posts whose Post ID is not already in the sheet | Code node Set filter; IF node branch |
| STOR-07 | Row format: Post ID | Author | Post Link | Post Date | Scraped At (ISO timestamp) | Google Sheets Append Row with manual column mapping |
| STOR-08 | If zero new posts after dedup, logs "all posts already exist" and skips write | IF node zero-branch with console.log Code node |
</phase_requirements>

---

## Summary

This phase builds `leads_store_sheets`, a sub-workflow that receives filtered posts, persists a Google Sheet ID across runs, manages tab creation, deduplicates against existing rows, and appends new leads. The key complexity is the combination of: (a) stateful sheet discovery using n8n static data, (b) tab existence checking via Google Sheets API, and (c) reliable deduplication before append.

The n8n Google Sheets built-in node (typeVersion 4.x) covers all required sheet-level operations: create spreadsheet, create sheet/tab, get rows, and append rows. Tab listing — checking whether a named tab already exists — requires either an HTTP Request to `GET https://sheets.googleapis.com/v4/spreadsheets/{id}` using the existing `googleSheetsOAuth2Api` credential, or a Code node that calls the same endpoint. This is the only gap in the built-in node's operations.

Sharing the newly created spreadsheet with the credential account (D-03) requires a Google Drive node `share` operation (typeVersion 3, `operation: "share"`), or an HTTP Request to the Drive API's `permissions.create` endpoint. The Drive node approach is cleaner and avoids credential scope complexity.

**Primary recommendation:** Use built-in Google Sheets nodes for all create/get/append operations. Use an HTTP Request node (with `googleSheetsOAuth2Api` predefined credential) for the tab-listing check. Use a Google Drive node for the one-time share step after sheet creation. Use `$getWorkflowStaticData('global')` in Code nodes for Sheet ID persistence — but note it only persists in production (active workflow, triggered by trigger node, not manual test runs).

---

## Standard Stack

### Core

| Library / Node | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| `n8n-nodes-base.googleSheets` | typeVersion 4 (latest ~4.7) | Create spreadsheet, create tab, get rows, append rows | Built-in n8n node; uses existing OAuth2 credential; no extra auth setup |
| `n8n-nodes-base.googleDrive` | typeVersion 3 (defaultVersion: 3 per source) | Share spreadsheet with credential account editor | Community-confirmed solution for permission grant; built-in node |
| `n8n-nodes-base.httpRequest` | typeVersion 4 | GET spreadsheets metadata (tab list) | Only way to check existing tab names without the built-in node |
| `n8n-nodes-base.code` | typeVersion 2 | URL parsing, dedup logic, static data read/write, row building | Established pattern from phases 2 and 3 |
| `n8n-nodes-base.if` | typeVersion 1 | Branch on "zero new posts" case | Established pattern from phase 2 |
| `n8n-nodes-base.executeWorkflowTrigger` | typeVersion 1 | Entry point for sub-workflow | Established pattern from phases 2 and 3 |

### Credentials Required

| Credential Type | Node | Purpose |
|----------------|------|---------|
| `googleSheetsOAuth2Api` | Google Sheets node | All sheet operations |
| `googleDriveOAuth2Api` | Google Drive node | Share spreadsheet (one-time per new sheet) |

Both credential types share the same Google OAuth2 flow in n8n. The same Google account credential can often cover both if scopes include Drive and Sheets.

### Installation

No npm packages needed — all built-in n8n nodes. Credentials must be assigned in n8n UI after workflow import, as per established project convention (`ERR-04`).

---

## Architecture Patterns

### Recommended Node Chain

```
Execute Workflow Trigger
  → Read Input (Code) — unpack posts[], group_url from trigger
  → Extract Tab Name (Code) — parse URL slug, sanitize, truncate
  → Get or Create Sheet (Code) — read/write static data, create sheet if needed
      ↓ (if new sheet created)
      → Share Sheet (Google Drive node) — add credential account as editor
  → Get or Create Tab (HTTP Request + Code) — list tabs, create if missing, write header if new
  → Read Existing IDs (Google Sheets node — Get Rows) — all rows from column A
  → Filter New Posts (Code) — Set-subtract existing IDs from input posts
  → IF: Has New Posts?
      → YES: Append Rows (Google Sheets node — Append Row) — one item per post
      → NO: Log Skip (Code) — console.log "all posts already exist"
```

### Pattern 1: Static Data for Sheet ID Persistence

**What:** `$getWorkflowStaticData('global')` provides a key-value store that persists across workflow executions.

**When to use:** Reading and writing the Sheet ID between runs so the workflow doesn't create a duplicate spreadsheet on each run.

**Critical caveat (VERIFIED — GitHub issue #17321):** Static data only persists in **production executions** from an **active workflow** triggered by a trigger node. It does NOT persist during manual test runs in the n8n UI. This means the self-healing logic (D-04) must be tested by running the active workflow via trigger, not the "Test workflow" button.

```javascript
// Source: docs.n8n.io/code/cookbook/builtin/get-workflow-static-data/ + community verification
const staticData = $getWorkflowStaticData('global');

// Read
const sheetId = staticData.sheetId;

// Write (persists after successful execution)
staticData.sheetId = 'your-spreadsheet-id-here';

// Self-healing: if sheetId exists but sheet is gone, catch 404 and reset
if (staticData.sheetId) {
  try {
    // attempt to use it — if 404/403, fall through to create
  } catch (err) {
    if (err.message.includes('404') || err.message.includes('403')) {
      staticData.sheetId = undefined;
    } else {
      throw err;
    }
  }
}
```

**Confidence:** HIGH for syntax; MEDIUM for cloud persistence behavior (known issues but root cause was manual testing, not actual bug).

### Pattern 2: Tab Name Sanitization

**What:** Facebook group URLs contain slugs that may include characters forbidden in Google Sheets tab names.

**Forbidden characters in Google Sheets tab names (verified):** `/`, `\`, `?`, `:`, `*`, `[`, `]`

**Character limit:** 100 characters maximum (verified).

```javascript
// Source: Google Sheets UI error messages (community-verified)
function sanitizeTabName(slug) {
  // Replace forbidden chars with hyphen
  let name = slug.replace(/[\/\\?:*\[\]]/g, '-');
  // Collapse multiple hyphens
  name = name.replace(/-+/g, '-');
  // Trim leading/trailing hyphens
  name = name.replace(/^-|-$/g, '');
  // Truncate to 100 chars
  return name.substring(0, 100) || 'unknown-group';
}
```

### Pattern 3: URL Slug Extraction

**What:** Extract the group identifier from a Facebook group URL.

**Facebook group URL patterns:**
- `https://www.facebook.com/groups/my-cool-group/` → `my-cool-group`
- `https://www.facebook.com/groups/123456789/` → `123456789`
- `https://www.facebook.com/groups/my-group/permalink/...` → `my-group`

```javascript
// Source: D-05 decision + URL structure analysis
function extractGroupSlug(url) {
  const match = url.match(/\/groups\/([^\/\?#]+)/);
  return match ? match[1] : 'unknown-group';
}
```

### Pattern 4: Tab List Check via HTTP Request

**What:** The built-in Google Sheets node has no "list tabs" operation. To check if a tab exists before creating it, call the Sheets API directly.

**Endpoint:** `GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}?fields=sheets.properties.title`

**Auth:** Use `predefinedCredentialType: "googleSheetsOAuth2Api"` in the HTTP Request node.

**Response structure:**
```json
{
  "sheets": [
    { "properties": { "title": "Sheet1" } },
    { "properties": { "title": "my-cool-group" } }
  ]
}
```

**Code node to process:**
```javascript
const response = $input.first().json;
const tabs = (response.sheets || []).map(s => s.properties.title);
const tabExists = tabs.includes(targetTabName);
return [{ json: { tabs, tabExists } }];
```

### Pattern 5: Google Sheets Node — Create Spreadsheet

**Operation:** Resource: `spreadsheet`, Operation: `create`

**Returns:** Output item includes `spreadsheetId` field → reference as `{{ $json.spreadsheetId }}` in next node.

**Key behavior:** Creating a spreadsheet also creates one default "Sheet1" tab. The header row must be added separately after tab creation.

### Pattern 6: Google Sheets Node — Append Row

**Operation:** Resource: `sheet`, Operation: `appendRow`

**Column mapping mode:** Use "Map Each Column Manually" (`fieldsUi`) for deterministic ordering when the sheet has a fixed schema. This avoids the n8n auto-map behavior that matches JSON keys to header names (which requires the sheet to already have headers).

**Row data structure (for manual mapping):**
```json
{
  "values": {
    "value": [
      { "column": "A", "fieldValue": "={{ $json.postId }}" },
      { "column": "B", "fieldValue": "={{ $json.authorName }}" },
      { "column": "C", "fieldValue": "={{ $json.postLink }}" },
      { "column": "D", "fieldValue": "={{ $json.postDate }}" },
      { "column": "E", "fieldValue": "={{ $now.toISO() }}" }
    ]
  }
}
```

Alternatively, build a Code node that outputs items with field names matching the header row, then use "Map Automatically" mode — this is simpler if headers already exist.

### Pattern 7: Google Drive Node — Share

**What:** After creating a new spreadsheet, share it with the credential account as editor (D-03).

**Node type:** `n8n-nodes-base.googleDrive`, `typeVersion: 3`

**Parameters:**
```json
{
  "operation": "share",
  "fileId": "={{ $json.spreadsheetId }}",
  "permissionsUi": {
    "permissionsValues": {
      "role": "writer",
      "type": "user",
      "emailAddress": "credential-account@gmail.com"
    }
  },
  "options": {
    "sendNotificationEmail": false
  }
}
```

**Note:** The email address for the credential account must be hardcoded in the workflow or sourced from a Code node. It cannot be auto-discovered from the credential itself. The planner should note this as a configuration step in the task instructions.

### Anti-Patterns to Avoid

- **Using "Append or Update Row" instead of "Append Row":** The `appendOrUpdate` operation requires a column to match on (for updates). For pure append-only writes, use `appendRow` — simpler and safer.
- **Relying on auto-map with an empty sheet:** If the sheet has no header row yet and you use "Map Automatically", n8n writes the JSON field names as the first row (treating them as headers). This is OK for header initialization but confusing for subsequent appends. Prefer explicit: write the header row manually first with a Code node output matching the expected column names.
- **Testing static data with the "Test workflow" button:** Static data writes are silently discarded in test mode. Always test static data paths by activating the workflow and triggering via actual trigger. Use a temporary manual trigger or set `active: true` during testing.
- **Not handling the 403/404 on deleted sheet:** Without self-healing (D-04), a deleted sheet causes a permanent failure. Always wrap the "use existing sheet ID" path in try/catch.
- **Creating duplicate tabs:** If the workflow runs twice before the tab name check completes, a race condition could create duplicate tabs. Acceptable risk for this use case (sequential single-executor workflow), but note it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth2 token management for Google APIs | Custom token refresh logic | n8n built-in credential store | Handles refresh, expiry, retry automatically |
| Append-only idempotent writes | Custom "check then write" SQL-like logic | Read column A + Set.filter in Code node | Simple, reliable for append-only sheets |
| Tab existence check | Full Sheets API wrapper | Single HTTP Request to spreadsheets.get with `?fields=sheets.properties.title` | Minimal API call, returns exactly what's needed |
| Row-level dedup | Hash comparison, external DB | JavaScript Set on column A values | All data is in column A; Set lookup is O(1) |

**Key insight:** The entire storage workflow can be built from built-in n8n nodes plus two Code nodes (for logic). No external libraries or custom services needed.

---

## Common Pitfalls

### Pitfall 1: Static Data Not Persisting in Tests
**What goes wrong:** Developer tests the workflow using "Test workflow" button, writes Sheet ID to static data, re-runs — Sheet ID is always `undefined`.
**Why it happens:** n8n does not persist static data during manual/test executions. The workflow must be active and triggered by a real trigger node.
**How to avoid:** During development, activate the workflow and use a real or simulated trigger. For the sub-workflow specifically: call it from an active parent workflow.
**Warning signs:** `staticData.sheetId` is always undefined on second run during development.

### Pitfall 2: Tab Not Found Despite Being Created
**What goes wrong:** The HTTP Request to get tabs returns the old list; the newly created tab isn't visible yet.
**Why it happens:** The Google Sheets API is eventually consistent for metadata operations in some edge cases.
**How to avoid:** After "Create Tab" operation, do not immediately re-query for existence check — assume creation succeeded (n8n node throws on failure).
**Warning signs:** 404 error on the newly created tab name in subsequent read.

### Pitfall 3: Duplicate Rows on Retry
**What goes wrong:** If the workflow partially fails after append but before completion, a retry creates duplicate rows.
**Why it happens:** Append is not idempotent — the dedup check runs before appending, but if the workflow fails mid-append, the dedup state is stale on retry.
**How to avoid:** Dedup is per-run against existing rows in the sheet. On retry, the rows from the failed append will already be in the sheet, so dedup will catch them. This is safe as long as the partial write was committed to the sheet. If the Google Sheets node failed mid-batch, some rows may be missing — acceptable for v1.
**Warning signs:** Duplicate Post IDs in column A.

### Pitfall 4: Tab Name Characters Causing API Error
**What goes wrong:** Google Sheets API rejects tab creation with a 400 error about invalid characters.
**Why it happens:** Facebook group slugs rarely have forbidden characters, but numeric-only IDs or slugs with colons/slashes do occur.
**How to avoid:** Always run the slug through `sanitizeTabName()` before using it in any Google Sheets API call.
**Warning signs:** 400 "Invalid sheet title" error from Google Sheets API.

### Pitfall 5: "Get Rows" Returns Empty When Sheet Has Only Header Row
**What goes wrong:** Code node tries to extract post IDs from rows but gets empty array — but there IS a header row.
**Why it happens:** n8n Google Sheets "Get Rows" skips the first row (treats it as header by default). So a sheet with only the header row returns zero data rows.
**How to avoid:** This is the correct behavior — an empty array of existing IDs means all incoming posts are new. Just treat empty array as "no existing IDs".
**Warning signs:** None — this is expected behavior; handle empty array gracefully.

### Pitfall 6: Google Drive Share Node Credential Scope
**What goes wrong:** Google Drive node fails with "insufficient permissions" even though Google Sheets credential is configured.
**Why it happens:** The Google Drive node requires a separate `googleDriveOAuth2Api` credential type. The Google Sheets credential (`googleSheetsOAuth2Api`) is a different credential type even if it accesses the same Google account.
**How to avoid:** In the n8n UI, create a Google Drive credential (separate from Sheets credential) after workflow import. Or use an HTTP Request node with the Sheets credential if it has the `drive` scope included.
**Warning signs:** "The caller does not have permission" error from Drive API.

---

## Code Examples

Verified patterns from official sources and community:

### Static Data Read/Write (Code node, typeVersion 2)
```javascript
// Source: docs.n8n.io/code/cookbook/builtin/get-workflow-static-data/
const staticData = $getWorkflowStaticData('global');

// Read existing sheet ID
let sheetId = staticData.sheetId;

if (!sheetId) {
  // Sheet doesn't exist yet — will be created by next node
  return [{ json: { sheetId: null, needsCreation: true } }];
}

// Sheet ID exists — pass it forward
return [{ json: { sheetId, needsCreation: false } }];
```

### URL Slug Extraction + Tab Name Sanitization (Code node)
```javascript
// Source: D-05, D-06 decisions + Google Sheets tab name restriction research
const groupUrl = $input.first().json.group_url;

// Extract slug after /groups/
const match = groupUrl.match(/\/groups\/([^\/\?#]+)/);
const rawSlug = match ? match[1] : 'unknown-group';

// Sanitize: remove forbidden chars, truncate to 100
const tabName = rawSlug
  .replace(/[\/\\?:*\[\]]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .substring(0, 100) || 'unknown-group';

return [{ json: { groupUrl, rawSlug, tabName } }];
```

### Self-Healing Sheet Lookup (Code node — combines static data + error handling)
```javascript
// After HTTP Request to GET spreadsheets/{id} — checks if sheet is accessible
const staticData = $getWorkflowStaticData('global');
const httpStatus = $input.first().json._statusCode; // if error returned as data

// Check if the stored ID returned an error
if (httpStatus === 404 || httpStatus === 403) {
  console.log(`Sheet ID ${staticData.sheetId} is inaccessible. Creating new sheet.`);
  staticData.sheetId = undefined;
  return [{ json: { sheetId: null, needsCreation: true } }];
}

return [{ json: { sheetId: staticData.sheetId, needsCreation: false } }];
```

### Dedup Filter (Code node)
```javascript
// Input: existingRows from Get Rows node, inputPosts from trigger
const existingRows = $('Read Existing IDs').all();
const inputPosts = $('Execute Workflow Trigger').first().json.posts || [];

// Build set of existing Post IDs from column A
// n8n Google Sheets node returns rows as objects with header keys
// Column A header is "Post ID"
const existingIds = new Set(existingRows.map(row => String(row.json['Post ID'] || '')));

// Filter to only new posts
const newPosts = inputPosts.filter(post => !existingIds.has(String(post.postId)));

if (newPosts.length === 0) {
  console.log('All posts already exist in sheet. Skipping append.');
}

return newPosts.map(post => ({ json: post }));
```

### Row Builder (Code node — outputs items for Append Row with auto-map)
```javascript
// Build items with field names matching the header row exactly
// Source: D-13, D-14 decisions
const posts = $input.all();

return posts.map(item => ({
  json: {
    'Post ID': item.json.postId,
    'Author': item.json.authorName,
    'Post Link': item.json.postLink,
    'Post Date': item.json.postDate,
    'Scraped At': new Date().toISOString()
  }
}));
```

### Google Sheets Append Row Node (JSON parameters reference)
```json
{
  "parameters": {
    "resource": "sheet",
    "operation": "appendRow",
    "documentId": {
      "__rl": true,
      "value": "={{ $('Get or Create Sheet').first().json.sheetId }}",
      "mode": "id"
    },
    "sheetName": {
      "__rl": true,
      "value": "={{ $('Extract Tab Name').first().json.tabName }}",
      "mode": "name"
    },
    "columns": {
      "mappingMode": "autoMapInputData",
      "value": {}
    },
    "options": {}
  },
  "type": "n8n-nodes-base.googleSheets",
  "typeVersion": 4
}
```

### HTTP Request — List Tabs (check tab existence)
```json
{
  "parameters": {
    "method": "GET",
    "url": "=https://sheets.googleapis.com/v4/spreadsheets/{{ $json.sheetId }}?fields=sheets.properties.title",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "googleSheetsOAuth2Api",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4
}
```

### Google Drive Share Node (JSON parameters reference)
```json
{
  "parameters": {
    "operation": "share",
    "fileId": {
      "__rl": true,
      "value": "={{ $json.sheetId }}",
      "mode": "id"
    },
    "permissionsUi": {
      "permissionsValues": {
        "role": "writer",
        "type": "user",
        "emailAddress": "PLACEHOLDER_CREDENTIAL_EMAIL"
      }
    },
    "options": {
      "sendNotificationEmail": false
    }
  },
  "type": "n8n-nodes-base.googleDrive",
  "typeVersion": 3,
  "credentials": {
    "googleDriveOAuth2Api": {
      "id": "google-drive-credential",
      "name": "Google Drive account"
    }
  }
}
```

**Note for planner:** The `emailAddress` in the Google Drive share node must be replaced with the actual Google account email that holds the `googleSheetsOAuth2Api` credential. This is a manual configuration step that cannot be automated from within the workflow JSON.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Function node (typeVersion 1) | Code node (typeVersion 2) | n8n ~0.214 | Use typeVersion 2 — established in phases 2 and 3 |
| Google Sheets node typeVersion 1-3 | typeVersion 4.x (latest 4.7) | n8n ~1.x | typeVersion 4 required for current operations; do not use older |
| HTTP Request with manual Google OAuth | Predefined credential type in HTTP Request | n8n ~0.180 | Use `predefinedCredentialType` for all Google API calls |
| Google Drive node typeVersion 1-2 | typeVersion 3 (defaultVersion) | n8n ~1.x | Use typeVersion 3 for share operation |

**Deprecated/outdated:**
- `n8n-nodes-base.googleSheets` typeVersion 1-3: Old parameter schema; some operations not available.
- Function node (`typeVersion: 1`): Replaced by Code node (`typeVersion: 2`).

---

## Open Questions

1. **Credential email for Google Drive share (D-03)**
   - What we know: The Google Drive node `share` operation requires the email address of the recipient as a hardcoded string in the node parameters.
   - What's unclear: What is the email address of the Google account configured as the `googleSheetsOAuth2Api` credential in this n8n instance?
   - Recommendation: Document this as a post-import manual step. The planner should include a task: "After importing workflow, update the Google Drive Share node's emailAddress field with the credential account email."

2. **Static data persistence for sub-workflows called via Execute Workflow**
   - What we know: Static data persists in production (active workflow) executions. The sub-workflow is called from `leads_main` via Execute Workflow node.
   - What's unclear: Whether the sub-workflow is considered "active" when invoked by a parent workflow, or whether static data writes from a child workflow (called via Execute Workflow) persist. Community discussions do not definitively confirm this edge case.
   - Recommendation: LOW confidence. Test this explicitly during implementation. If static data does not persist in sub-workflows, the fallback is to use a Google Drive file or a Set node in the parent to pass the sheet ID between calls. The planner should add a verification task for this behavior.

3. **n8n.cloud Google Drive credential vs HTTP Request credential access**
   - What we know: There was a reported issue where the HTTP Request node cannot use Google Drive OAuth credentials on n8n.cloud (the credential shows as "unavailable" in the dropdown).
   - What's unclear: Whether this issue is resolved in 2025 n8n.cloud instances.
   - Recommendation: Plan for the Google Drive built-in node (not HTTP Request) for the share operation. If the credential is unavailable, fall back to HTTP Request with a generic OAuth2 credential configured manually with Drive scope.

---

## Validation Architecture

> `nyquist_validation` is `true` in `.planning/config.json` — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual n8n execution testing (no unit test framework — workflow-level integration tests only) |
| Config file | None — n8n cloud instance |
| Quick run command | Trigger `leads_store_sheets` via `leads_main` parent with a test group URL |
| Full suite command | Run `leads_main` with 2 group URLs, verify sheet contents after 2 runs |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | How to Verify | Notes |
|--------|----------|-----------|---------------|-------|
| STOR-01 | Accepts `{ posts, group_url }` via Execute Workflow trigger | Integration | Call workflow via Execute Workflow node in leads_main | Manual |
| STOR-02 | Extracts correct group slug from URL | Unit-in-node | Inspect "Extract Tab Name" Code node output in n8n execution | Manual |
| STOR-03 | Creates sheet on first run, reuses on second run | Integration | Run twice; verify only one sheet named "Facebook Leads" exists | Manual — requires active workflow |
| STOR-04 | Creates tab named after group; header row present | Integration | Inspect sheet after first run; verify tab name + A1:E1 content | Manual |
| STOR-05 | Reads existing Post IDs before append | Integration | Inspect "Read Existing IDs" node output in execution log | Manual |
| STOR-06 | Appends only new posts (second run same posts = 0 appended) | Integration | Run twice with same posts; row count must not increase on second run | Manual — KEY test |
| STOR-07 | Row format: A=PostID, B=Author, C=PostLink, D=PostDate, E=ScrapedAt | Integration | Inspect sheet after append; verify column order | Manual |
| STOR-08 | Zero new posts: logs message, no append | Integration | Run with posts already in sheet; verify execution log message | Manual |

### Sampling Rate
- **Per task commit:** Review workflow JSON for structural correctness; import into n8n to verify node connections
- **Per wave merge:** Full end-to-end test: two runs with same group URL, verify dedup behavior
- **Phase gate:** All 8 STOR requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps
None — no test framework to install. All validation is manual n8n execution testing consistent with phases 2 and 3.

---

## Sources

### Primary (HIGH confidence)
- [docs.n8n.io — Google Sheets node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/) — operations list, append row, create spreadsheet
- [docs.n8n.io — Google Sheets sheet operations](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/sheet-operations/) — get rows, create sheet, append row
- [docs.n8n.io — getWorkflowStaticData](https://docs.n8n.io/code/cookbook/builtin/get-workflow-static-data/) — syntax, global vs node scope
- [developers.google.com — Drive permissions.create](https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/create) — share endpoint spec
- [developers.google.com — Sheets spreadsheets.get](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get) — list tabs endpoint spec

### Secondary (MEDIUM confidence)
- [community.n8n.io — Grant permissions to sheet created by service account](https://community.n8n.io/t/grant-permissions-through-a-node-to-a-spreadsheet-created-by-a-service-account/16646) — Google Drive node share operation confirmed as solution
- [community.n8n.io — Read list of sheets in Google Spreadsheet](https://community.n8n.io/t/read-list-of-sheets-in-google-spreadsheet/76106) — HTTP Request required for tab listing
- [nguyenthanhluan.com — getWorkflowStaticData guide](https://nguyenthanhluan.com/en/glossary/getworkflowstaticdata-type-en/) — exact syntax examples

### Tertiary (LOW confidence — flag for validation)
- [github.com/n8n-io/n8n — issue #17321](https://github.com/n8n-io/n8n/issues/17321) — static data not persisting; closed as "user was testing manually, not production" — behavior verified as expected per docs
- Google Sheets tab name forbidden characters: `/`, `\`, `?`, `:`, `*`, `[`, `]` — sourced from Google UI error message descriptions in community posts, not official API docs
- Google Drive node `typeVersion: 3` — inferred from n8n GitHub source file (`defaultVersion: 3`), not official docs page
- Google Sheets node `typeVersion: 4` — inferred from community issues mentioning "v4.7"; planner should verify in n8n UI after import

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — built-in nodes confirmed; exact typeVersion parameters require UI verification after import
- Architecture: MEDIUM — tab listing via HTTP Request is confirmed required; Drive node share is community-confirmed
- Static data: MEDIUM — syntax confirmed; sub-workflow persistence edge case unconfirmed (flagged as Open Question 2)
- Pitfalls: HIGH — most pitfalls verified against official docs or GitHub issues

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable n8n node APIs; re-verify if n8n version bumped significantly)
