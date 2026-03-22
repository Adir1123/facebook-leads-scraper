# Phase 5: leads_main - Research

**Researched:** 2026-03-22
**Domain:** n8n orchestrator workflow — Form Trigger, loop, Execute Workflow calls, per-item error isolation, form response
**Confidence:** MEDIUM (Form Trigger JSON structure verified via source code + docs; Execute Workflow verified via docs; error isolation pattern is community-verified workaround)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**URL parsing & validation**
- D-01: Split `group_urls` by newline, trim whitespace, remove empty lines
- D-02: Validate every URL matches `facebook.com/groups/<slug>` — accept named slugs AND numeric IDs
- D-03: If ANY URL is invalid, reject the entire form submission with an error listing the bad URLs — do not process partial input
- D-04: Deduplicate URLs silently — if the same URL appears twice, process it only once
- D-05: Normalize URLs: strip trailing slashes, remove query params, force `https://www.facebook.com` prefix. Example: `facebook.com/groups/foo?ref=share` → `https://www.facebook.com/groups/foo`

**Form response & UX**
- D-06: Wait for ALL groups to finish before returning the form response (synchronous)
- D-07: Success response shows per-group breakdown: group name/slug, posts scraped, leads found, new leads added
- D-08: Response includes a clickable link to the Google Sheet
- D-09: Sheet link constructed from Sheet ID in static data (from leads_store_sheets)

**Per-group error handling**
- D-10: If scraping or filtering fails for one group, skip it and continue processing remaining groups
- D-11: Include failed groups in the response summary with the error reason
- D-12: If ALL groups fail (zero successes), throw an error to trigger leads_error_notify

**Form access**
- D-13: Form is open to anyone with the URL — no password protection

### Claude's Discretion
- n8n Form Trigger node configuration details
- Exact Code node implementation for URL parsing/validation
- How to accumulate per-group stats for the summary response
- Loop implementation (SplitInBatches vs Loop Over Items)
- How to catch per-group errors without failing the whole workflow (try/catch pattern in n8n)
- Form response HTML/text formatting

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORCH-01 | n8n form accepts `group_urls` (multi-line text, ≥1 URL) and `posts_per_group` (number, 1–500, default 50) | Form Trigger node with `textarea` + `number` field types; default value handled in Parse URLs Code node |
| ORCH-02 | leads_main loops over each URL and calls scrape → filter → store in sequence | SplitInBatches with batchSize 1; Execute Workflow nodes for H3PMNprdI9tzT7yf, CY2ax7bMZaLoODGm, HWJVJIVEDpu69Nbw |
| ORCH-03 | leads_error_notify attached as Error Workflow on leads_main; sends Gmail alerts on failure | `settings.errorWorkflow` = `k5LZs1ntJRXaqNpM`; Stop And Error node for D-12 all-groups-fail case |
</phase_requirements>

---

## Summary

leads_main is the orchestrator. It receives a form submission, validates and normalizes group URLs, loops over each group calling three sub-workflows in sequence (scrape → filter → store), accumulates per-group stats, and returns a formatted summary to the user when all groups are done.

The primary complexity is per-item error isolation inside the loop: n8n's `continueOnFail` / `onError: continueErrorOutput` on the Execute Workflow node allows individual group failures to be routed to an error branch rather than halting the whole workflow. Results (success + failure) are accumulated in a Code node using `$input.all()` after the loop completes.

For the "all groups fail" case (D-12), a Stop And Error node at the end of the workflow checks if zero groups succeeded and throws, triggering leads_error_notify.

**Primary recommendation:** Use SplitInBatches (batchSize 1) for the per-group loop. Set `onError: continueErrorOutput` on each Execute Workflow node to capture failures without stopping. Accumulate results using a final Code node that reads all items after the loop.

---

## Standard Stack

### Core

| Node | Type | Purpose | Notes |
|------|------|---------|-------|
| Form Trigger | `n8n-nodes-base.formTrigger` typeVersion 2.2–2.5 | Entry point; renders form UI, blocks until workflow completes | "Respond When: Workflow Finishes" for synchronous UX (D-06) |
| Code (Parse URLs) | `n8n-nodes-base.code` typeVersion 2 | Split by newline, validate, normalize, deduplicate | Outputs one item per URL |
| Stop And Error | `n8n-nodes-base.stopAndError` | Halt workflow and trigger error notify when all groups fail (D-12) | Only reached if zero successes |
| SplitInBatches | `n8n-nodes-base.splitInBatches` typeVersion 3 | Loop over one URL at a time sequentially | batchSize: 1 |
| Execute Workflow (scrape) | `n8n-nodes-base.executeWorkflow` typeVersion 1 | Call leads_scrape_apify | workflowId: H3PMNprdI9tzT7yf |
| Execute Workflow (filter) | `n8n-nodes-base.executeWorkflow` typeVersion 1 | Call leads_filter_claude | workflowId: CY2ax7bMZaLoODGm |
| Execute Workflow (store) | `n8n-nodes-base.executeWorkflow` typeVersion 1 | Call leads_store_sheets | workflowId: HWJVJIVEDpu69Nbw |
| Code (Accumulate Stats) | `n8n-nodes-base.code` typeVersion 2 | Collect per-group results (success + error items) | Run after loop exits |
| Code (Build Response) | `n8n-nodes-base.code` typeVersion 2 | Format summary text with group breakdown + sheet link | Produces final response text |

### Workflow-level settings

```json
{
  "settings": {
    "executionOrder": "v1",
    "errorWorkflow": "k5LZs1ntJRXaqNpM"
  }
}
```

This is how the Error Workflow is attached — a field in the `settings` object of the workflow JSON (not a node). The value is the workflow ID of leads_error_notify.

---

## Architecture Patterns

### Recommended Node Sequence

```
Form Trigger
  └── Parse URLs (Code) — validate, normalize, deduplicate
        └── [IF validation fails] → Return error response to form
        └── [IF valid] → SplitInBatches (batchSize 1)
              ├── [output 0: done] → Accumulate Stats (Code)
              │                         └── Build Response (Code)
              │                               └── [Check if all failed] → Stop And Error (if D-12)
              │                                                          → Form Trigger responds (workflow ends)
              └── [output 1: batch] → Execute Workflow (scrape)
                                        ├── [onError: continueErrorOutput] → Capture Error (Code node)
                                        └── [success] → Execute Workflow (filter)
                                                          ├── [onError: continueErrorOutput] → Capture Error (Code node)
                                                          └── [success] → Execute Workflow (store)
                                                                            └── Capture Stats (Code node)
                                                                                  └── back to SplitInBatches
```

### Pattern 1: Form Trigger Node JSON Structure

**What:** Form Trigger with two fields — textarea for URLs, number for post count. Responds after workflow finishes.

```json
{
  "parameters": {
    "formTitle": "Facebook Leads Scraper",
    "formDescription": "Enter one Facebook group URL per line. Posts will be scraped, filtered for leads, and saved to your Google Sheet.",
    "formFields": {
      "values": [
        {
          "fieldLabel": "Group URLs",
          "fieldName": "group_urls",
          "fieldType": "textarea",
          "placeholder": "https://www.facebook.com/groups/example\nhttps://www.facebook.com/groups/another",
          "requiredField": true
        },
        {
          "fieldLabel": "Posts Per Group",
          "fieldName": "posts_per_group",
          "fieldType": "number",
          "placeholder": "50",
          "requiredField": false
        }
      ]
    },
    "options": {
      "respondWhen": "lastNode"
    }
  },
  "type": "n8n-nodes-base.formTrigger",
  "typeVersion": 2.2,
  "webhookId": "auto-generated-on-import"
}
```

**Respond when "Workflow Finishes"** is the key option for synchronous UX (D-06). In the JSON this is `"respondWhen": "lastNode"` (MEDIUM confidence — verified from docs + form source; exact JSON key may vary by version; verify against instance after import).

Form output field names match `fieldName` values: `$json["group_urls"]` and `$json["posts_per_group"]`.

### Pattern 2: URL Parse/Validate Code Node

**What:** Split by newline, validate regex, normalize, deduplicate. Returns one item per valid URL or throws on invalid input (D-01 through D-05).

```javascript
// Source: CONTEXT.md decisions D-01 through D-05
const raw = $input.first().json["group_urls"] || "";
const postCount = Number($input.first().json["posts_per_group"]) || 50;
const effectiveCount = (postCount < 1 || postCount > 500) ? 50 : postCount;

const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);

if (lines.length === 0) {
  throw new Error("No URLs provided. Enter at least one Facebook group URL.");
}

// Validate pattern: must contain facebook.com/groups/<slug>
const validPattern = /^https?:\/\/(www\.)?facebook\.com\/groups\/[a-zA-Z0-9._-]+\/?(\?.*)?$/;
const invalidUrls = lines.filter(url => !validPattern.test(url));
if (invalidUrls.length > 0) {
  throw new Error("Invalid URLs (must be facebook.com/groups/slug):\n" + invalidUrls.join("\n"));
}

// Normalize: https://www.facebook.com/groups/slug (no trailing slash, no query params)
const normalize = (url) => {
  const match = url.match(/facebook\.com\/groups\/([a-zA-Z0-9._-]+)/);
  return match ? `https://www.facebook.com/groups/${match[1]}` : url;
};

const normalized = lines.map(normalize);

// Deduplicate silently (D-04)
const seen = new Set();
const unique = normalized.filter(url => {
  if (seen.has(url)) return false;
  seen.add(url);
  return true;
});

return unique.map(url => ({
  json: {
    group_url: url,
    post_count: effectiveCount
  }
}));
```

### Pattern 3: Execute Workflow Node JSON Structure

**What:** Call a sub-workflow by ID, pass named fields, wait for completion.

```json
{
  "parameters": {
    "source": "database",
    "workflowId": "H3PMNprdI9tzT7yf",
    "workflowInputs": {
      "mappingMode": "defineBelow",
      "value": {
        "group_url": "={{ $json.group_url }}",
        "post_count": "={{ $json.post_count }}"
      }
    },
    "options": {}
  },
  "type": "n8n-nodes-base.executeWorkflow",
  "typeVersion": 1,
  "onError": "continueErrorOutput"
}
```

Key points:
- `source: "database"` = call by ID (as opposed to local file or inline JSON)
- `workflowId` = the target workflow's n8n ID string
- `workflowInputs.mappingMode: "defineBelow"` = explicitly map named fields
- `onError: "continueErrorOutput"` = on failure, route to output pin 1 (error output) rather than halting — this is how per-group error isolation works (D-10)
- The sub-workflow's output (last node's items) becomes this node's output on output pin 0

**IMPORTANT:** typeVersion may be 1 or 1.2 depending on n8n version. Use typeVersion 1 (same as existing sub-workflows) unless n8n auto-upgrades on import.

### Pattern 4: SplitInBatches for Sequential Group Loop

**What:** Loop over one URL at a time. Output 0 = all done; Output 1 = current batch to process.

```json
{
  "parameters": {
    "batchSize": 1,
    "options": {}
  },
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3
}
```

Connection pattern:
- SplitInBatches output 0 (done) → Accumulate Stats
- SplitInBatches output 1 (batch) → Execute Workflow (scrape)
- After scrape → filter → store chain completes → loop back to SplitInBatches input

### Pattern 5: Per-Group Error Isolation

**What:** When Execute Workflow node has `onError: "continueErrorOutput"`, failed executions exit on output pin 1 with error data in `$json.error`. Success exits on output pin 0.

**Strategy:**
1. Add a Capture Error Code node on each Execute Workflow's error output (pin 1)
2. Capture Error Code node normalizes the error into a stats object and routes back to the loop
3. After loop, Accumulate Stats reads all items — mix of success and error stats

```javascript
// Capture Error Code node (after scrape Execute Workflow error output)
const groupUrl = $input.first().json.group_url;
const errMsg = $input.first().json.error?.message || "Unknown error";
return [{
  json: {
    group_url: groupUrl,
    status: "error",
    error_reason: errMsg,
    scraped: 0,
    leads: 0,
    added: 0
  }
}];
```

**Known issue:** n8n Execute Workflow node with `onError: continueErrorOutput` has a reported bug where it may produce no output at all when the sub-workflow throws (as of late 2025). **Mitigation:** Add `alwaysOutputData: true` to the Execute Workflow node and check `$json.error` in the downstream Code node as a fallback.

### Pattern 6: Accumulate Stats After Loop

**What:** After SplitInBatches output 0 fires (all items processed), collect all per-group stat items and build the response.

The stats items were passed through the loop at each iteration. By the time SplitInBatches output 0 fires, n8n has accumulated all items from prior iterations.

```javascript
// Accumulate Stats Code node
const items = $input.all();
// items is an array of { json: { group_url, status, scraped, leads, added, error_reason? } }
return [{ json: { groups: items.map(i => i.json) } }];
```

### Pattern 7: Build Response and Check All-Fail

**What:** Format the HTML summary and check D-12 (all groups failed).

```javascript
// Build Response Code node
const groups = $input.first().json.groups || [];
const sheetId = "1N3FqJBgg-az5f_bbMdK4ZW8KNZpuOUHkoE5kfPrpDKE";
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;

const allFailed = groups.length > 0 && groups.every(g => g.status === "error");
const successCount = groups.filter(g => g.status !== "error").length;

// Build HTML lines per group
const lines = groups.map(g => {
  const slug = g.group_url.match(/\/groups\/([^\/]+)/)?.[1] || g.group_url;
  if (g.status === "error") {
    return `<li><strong>${slug}</strong>: FAILED — ${g.error_reason}</li>`;
  }
  return `<li><strong>${slug}</strong>: scraped ${g.scraped}, leads ${g.leads}, new ${g.added}</li>`;
});

const html = `
<h2>Leads Run Complete</h2>
<ul>${lines.join("")}</ul>
<p><a href="${sheetUrl}" target="_blank">Open Google Sheet</a></p>
`.trim();

return [{
  json: {
    responseText: html,
    allFailed,
    successCount,
    sheetUrl
  }
}];
```

Then an IF node checks `allFailed`:
- If true → Stop And Error node (triggers leads_error_notify via ORCH-03)
- If false → workflow ends normally, Form Trigger responds with the HTML text

### Pattern 8: Stop And Error Node (D-12)

```json
{
  "parameters": {
    "errorMessage": "All group scrapes failed — check leads_error_notify for details."
  },
  "type": "n8n-nodes-base.stopAndError",
  "typeVersion": 1
}
```

When this node executes, it causes the workflow execution to fail, which triggers the Error Workflow (leads_error_notify, id: k5LZs1ntJRXaqNpM).

### Pattern 9: Setting Error Workflow in Workflow JSON

The Error Workflow is NOT a node — it is a setting in the workflow's `settings` object:

```json
{
  "settings": {
    "executionOrder": "v1",
    "errorWorkflow": "k5LZs1ntJRXaqNpM"
  }
}
```

This can be set in the n8n UI via Workflow Settings > Error Workflow dropdown, or pre-populated in the JSON before import.

### Anti-Patterns to Avoid

- **Parallel Execute Workflow calls per group:** n8n does not guarantee sequential execution if items are processed in parallel. Use SplitInBatches with batchSize 1 to force sequential per-group processing.
- **Relying on the last node output for accumulation inside a loop:** After a SplitInBatches loop, only the items from the most recent iteration are visible unless explicitly accumulated. The loop architecture must ensure each iteration's result flows back into the loop as a stat object.
- **Using `continueOnFail: true` instead of `onError: continueErrorOutput`:** `continueOnFail` swallows errors silently with no data — the error output branch is needed to capture error details for the summary (D-11).
- **Using `respondWhen: "immediately"` on Form Trigger:** This would return before sub-workflows finish, making synchronous response impossible (violates D-06).
- **Not passing `post_count` via workflowInputs:** The sub-workflow expects named input fields. If `workflowInputs` is misconfigured, the sub-workflow receives the whole item payload instead of named params, causing failures.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-item looping | Custom recursive webhook chain | SplitInBatches batchSize 1 | Built-in, handles done/batch outputs, clean loop termination |
| Error isolation per group | Complex try/catch node graph | `onError: continueErrorOutput` on Execute Workflow | Native n8n feature; routes error items to separate output pin |
| Form UI | External HTML form or webhook endpoint | n8n Form Trigger | Built-in, handles HTTPS, no auth needed for D-13 |
| Workflow-level error notification | Error catch inside leads_main | `settings.errorWorkflow` + Stop And Error | n8n built-in Error Workflow mechanism |

---

## Common Pitfalls

### Pitfall 1: Execute Workflow Data Context Loss

**What goes wrong:** After calling a sub-workflow, the current item's context (`$json.group_url`, `$json.post_count`) is replaced by the sub-workflow's output. Downstream Execute Workflow nodes can't see the original URL.

**Why it happens:** Each Execute Workflow node output is the sub-workflow's last node output — it replaces the current item's data entirely.

**How to avoid:** Pass `group_url` forward explicitly through each sub-workflow's output. Alternatively, use a Code node before each Execute Workflow call to inject `group_url` into the payload being passed. The scrape sub-workflow already outputs individual post objects (not a wrapper), so the filter call must be structured as `{ posts: [...], group_url }` — which requires a Code node to assemble between scrape and filter.

**Warning signs:** Filter sub-workflow receives `group_url: undefined`. Store sub-workflow receives `posts: undefined`.

### Pitfall 2: SplitInBatches Result Accumulation

**What goes wrong:** Per-group stat objects get overwritten each iteration — only the last group's stats are visible after the loop ends.

**Why it happens:** n8n items flowing through the loop are the current batch's items. Prior iterations' outputs are not automatically concatenated.

**How to avoid:** At the end of each iteration's success/error branch, output a normalized stat object. These stat objects feed back into the loop and n8n accumulates them because SplitInBatches holds the item count. After loop exits, `$input.all()` on the Accumulate Stats Code node returns one stat item per group.

**Warning signs:** Final response only shows one group, or `groups` array has length 1 regardless of URL count.

### Pitfall 3: webhookId Missing or Duplicate on Form Trigger

**What goes wrong:** If the Form Trigger node is imported without a `webhookId`, n8n may not generate one automatically, making the form inaccessible.

**Why it happens:** n8n Form Trigger requires a unique `webhookId` UUID. If left blank or duplicated across workflows, the form URL won't resolve.

**How to avoid:** Let n8n generate the webhookId on first activation (import without one, activate workflow). Do NOT copy a webhookId from another workflow.

**Warning signs:** Form URL returns 404 after activation.

### Pitfall 4: "Workflow Finishes" Response + Long Execution Timeout

**What goes wrong:** If Apify takes >5 minutes per group and multiple groups are submitted, the form response blocks until all groups complete. Browser may time out.

**Why it happens:** `respondWhen: "lastNode"` holds the HTTP connection open.

**How to avoid:** This is acceptable for the current use case (one attorney, ≤5 groups, ≤200 posts each). Document the expected wait time in the form description. The Apify HTTP Request already has a 300-second timeout configured.

**Warning signs:** Browser shows loading spinner for >5 minutes.

### Pitfall 5: onError + continueErrorOutput Bug on Execute Workflow

**What goes wrong:** Execute Workflow node with `onError: continueErrorOutput` may produce zero output items on the error branch in some n8n versions, breaking the Capture Error Code node downstream.

**Why it happens:** Known n8n bug reported September 2025 — "Cannot read properties of undefined (reading 'entries')" when error output has no items.

**How to avoid:** Add `alwaysOutputData: true` to the Execute Workflow node. In the downstream Capture Error Code node, guard with: `const item = $input.first()?.json || {}; const errMsg = item.error?.message || "Sub-workflow failed";`.

**Warning signs:** Capture Error Code node errors on "Cannot read properties of undefined".

---

## Code Examples

### Sub-workflow input assembly (scrape → filter handoff)

After the scrape Execute Workflow returns an array of post items, a Code node must assemble them into `{ posts: [...], group_url }` before calling filter:

```javascript
// Source: derived from sub-workflow contracts in CONTEXT.md
// This Code node runs between Execute Workflow (scrape) and Execute Workflow (filter)
const posts = $input.all().map(item => item.json);
const groupUrl = $('SplitInBatches').first().json.group_url;
return [{
  json: {
    posts: posts,
    group_url: groupUrl
  }
}];
```

Note: `$('SplitInBatches').first()` accesses the current iteration's item from the loop node by name — this is how to recover context that was replaced by the sub-workflow output.

### Filter → Store handoff

```javascript
// Code node between Execute Workflow (filter) and Execute Workflow (store)
const posts = $input.all().map(item => item.json);
const groupUrl = $('SplitInBatches').first().json.group_url;
return [{
  json: {
    posts: posts,
    group_url: groupUrl
  }
}];
```

### Capture success stats (after store Execute Workflow)

```javascript
// Code node after Execute Workflow (store) — captures stats for accumulation
const storeOutput = $input.all();
const groupUrl = $('SplitInBatches').first().json.group_url;
// Store sub-workflow currently does not return counts — derive from context
// scrapeCount and leadsCount need to be threaded through from prior steps
// Simplest approach: store a stats object in the loop context
const scrapeCount = $('Assemble Filter Input').first().json.posts.length;
const leadsCount = $('Assemble Store Input').first().json.posts.length;
// added count: store sub-workflow doesn't return this directly — use leadsCount as proxy
// or retrieve from store output if it returns a count field
return [{
  json: {
    group_url: groupUrl,
    status: "success",
    scraped: scrapeCount,
    leads: leadsCount,
    added: leadsCount  // conservative: same as leads if store doesn't return count
  }
}];
```

**OPEN QUESTION:** The leads_store_sheets sub-workflow (HWJVJIVEDpu69Nbw) does not appear to return a structured summary count in its final node output. The planner should verify what the store sub-workflow's last node actually outputs and whether it includes an "added" count. If not, added = leads (conservative proxy: all leads were new).

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| HTTP Webhook trigger + manual form | n8n Form Trigger (built-in) | No external form hosting needed; synchronous response possible |
| Error handling via IF + Set Error nodes | `onError: continueErrorOutput` on node settings | Cleaner; native error routing without extra IF nodes |
| Global error catch only | Per-node error output + workflow-level Error Workflow | Fine-grained: per-group errors captured; fatal errors notify |

---

## Open Questions

1. **What does leads_store_sheets (HWJVJIVEDpu69Nbw) actually output from its last node?**
   - What we know: The workflow appends rows and returns some output from the last node in the success chain
   - What's unclear: Whether it outputs `{ added: N }` or just the raw HTTP response or nothing useful
   - Recommendation: Before writing the Accumulate Stats code, read the store workflow's last node output (check `workflows/leads_store_sheets.json` last node in the connections chain). If no count is returned, use leadsCount as proxy for added count.

2. **Exact `respondWhen` JSON key for Form Trigger "Workflow Finishes"**
   - What we know: The option exists; docs call it "Workflow Finishes"; in source it filters `responseNode` mode starting v2.2
   - What's unclear: Whether the JSON parameter name is `respondWhen: "lastNode"` or `formResponseMode: "afterLastNode"` or another value
   - Recommendation: After importing into n8n, check the workflow JSON export to verify the actual key name. Alternatively, set via UI and re-export to capture the canonical value.

3. **Does `alwaysOutputData: true` work on Execute Workflow node?**
   - What we know: This property works on Code, Google Sheets, and other nodes (proven in Phase 4)
   - What's unclear: Whether Execute Workflow node supports this property when `onError: continueErrorOutput` is active
   - Recommendation: Test in n8n. If it doesn't work, use a Merge node in Append mode after the error output branch as an alternative accumulation point.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual execution in n8n (no automated test runner for workflow JSON) |
| Config file | None — n8n is the runtime |
| Quick run command | Manual Trigger via n8n UI with test URL input |
| Full suite command | Submit form with 2 real Facebook group URLs; verify Sheet has new rows |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ORCH-01 | Form accepts group_urls (textarea) and posts_per_group (number, default 50) | smoke | n8n Form UI submit | ❌ Wave 0 |
| ORCH-02 | Loop calls scrape → filter → store for each URL; data appears in Sheet | integration | Submit form with 2 URLs; check Sheet | ❌ Wave 0 |
| ORCH-03 | leads_error_notify fires on all-fail; Gmail alert arrives | manual | Trigger Stop And Error manually | ❌ Wave 0 |

All tests are manual execution in n8n. No automated test files needed — this is consistent with Phases 2–4 where verification was done via n8n execution.

### Wave 0 Gaps

- [ ] `workflows/leads_main.json` — does not exist yet; created in this phase
- [ ] Error Workflow setting on leads_main must be configured (can be done in JSON or UI)
- [ ] Gmail credential must be assigned to leads_error_notify before ORCH-03 can be tested (pending from Phase 1)

*(No test file framework needed — n8n execution is the test runtime)*

---

## Sources

### Primary (HIGH confidence)
- n8n Form Trigger docs — https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.formtrigger/ — field types, respondWhen options, completion page
- n8n Form Trigger source — https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Form/v2/FormTriggerV2.node.ts — typeVersion 2.5 current
- n8n Execute Sub-workflow docs — https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/ — source database, workflowInputs, data flow
- n8n Error handling docs — https://docs.n8n.io/flow-logic/error-handling/ — continueOnFail, Error Workflow setting, Stop And Error node
- n8n Looping docs — https://docs.n8n.io/flow-logic/looping/ — SplitInBatches, batchSize 1, continueOnFail in loops
- `CLAUDE.md`, `STATE.md`, `05-CONTEXT.md` — all sub-workflow IDs, decisions, established patterns

### Secondary (MEDIUM confidence)
- n8n community: per-item error handling with Execute Workflow — https://community.n8n.io/t/problem-with-execute-workflow-where-some-of-the-subflows-fail/186896 — onError continueErrorOutput bug + workarounds
- Ryan & Matt Data Science — https://ryanandmattdatascience.com/n8n-form-trigger-node/ — field types (textarea, number), completion page types

### Tertiary (LOW confidence)
- respondWhen JSON key name ("lastNode" vs "afterLastNode") — not directly confirmed from source; verify after import
- alwaysOutputData support on Execute Workflow node — inferred from behavior on other nodes; not explicitly documented

---

## Metadata

**Confidence breakdown:**
- Standard stack (nodes to use): HIGH — all nodes are core n8n, used in Phases 2–4
- Form Trigger parameters: MEDIUM — field types confirmed; exact respondWhen JSON key not confirmed
- Execute Workflow structure: MEDIUM — `source: "database"`, `workflowId`, `workflowInputs` confirmed; typeVersion exact value requires verification
- Per-item error isolation: MEDIUM — `onError: continueErrorOutput` confirmed; known bug requires alwaysOutputData mitigation
- Stats accumulation pattern: LOW — no official docs on accumulating items across SplitInBatches iterations; derived from understanding of n8n data model
- Error Workflow JSON field: MEDIUM — `settings.errorWorkflow` confirmed via community + docs narrative; exact field name not seen in raw JSON export

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (n8n Form Trigger is stable; Execute Workflow node behavior may change with n8n updates)
