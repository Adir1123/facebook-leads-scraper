# Phase 3: leads_filter_claude — Research

**Phase:** 3
**Goal:** Sub-workflow accepts posts array, batches 10 at a time, calls Claude, and returns only relevant posts.

---

## ## RESEARCH COMPLETE

---

## 1. Anthropic API — Messages Endpoint

**URL:** `https://api.anthropic.com/v1/messages`
**Method:** POST

**Required headers:**
```
x-api-key: <ANTHROPIC_API_KEY>
anthropic-version: 2023-06-01
Content-Type: application/json
```

**Request body:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 512,
  "system": "<system prompt from PRD>",
  "messages": [
    {
      "role": "user",
      "content": "<JSON array of 10 posts>"
    }
  ]
}
```

**Response structure:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"relevant_post_ids\": [\"123\", \"456\"]}"
    }
  ]
}
```

Extract: `response.content[0].text` → `JSON.parse()` → `relevant_post_ids` array.

---

## 2. n8n Credential Setup for Anthropic

n8n has a built-in **"Anthropic"** credential type (`anthropicApi`). However, for HTTP Request nodes:
- Header Auth with `x-api-key` works fine
- The `anthropic-version` header must be added as a custom header

**In HTTP Request node:**
- Authentication: Generic Credential Type → Header Auth
- Header Name: `x-api-key`
- Header Value: `<api-key>`
- Additional Header: `anthropic-version: 2023-06-01`

**OR** use n8n's native Anthropic node if available — but HTTP Request gives more control over the exact request format needed here.

---

## 3. n8n Batching Strategy

### Option A: SplitInBatches node (recommended)
- Takes array input, outputs N items at a time
- Loop until no more items
- Built-in loop tracking
- n8n node: `n8n-nodes-base.splitInBatches`

### Option B: Loop Over Items node
- More complex setup for batching arrays

**Decision: Use SplitInBatches** — simpler, battle-tested for exactly this use case.

**Flow:**
```
Execute Workflow Trigger
  → SplitInBatches (batch size: 10)
    → Code (build Claude user message from batch)
    → HTTP Request (Claude API)
    → Code (parse response, filter batch)
  → [loop back to SplitInBatches until done]
  → Merge (aggregate all filtered results)
```

---

## 4. Building the Claude User Message

Input posts come in as `{ postId, authorName, postText, postLink, postDate }`.

Claude expects each post as: `{ "id": "...", "text": "...", "author": "..." }`.

Code node to build the batch message:
```javascript
const items = $input.all();
const posts = items.map(item => ({
  id: item.json.postId,
  text: item.json.postText,
  author: item.json.authorName
}));
return [{ json: { batchMessage: JSON.stringify(posts) } }];
```

---

## 5. Parsing Claude's Response

```javascript
const responseText = $input.first().json.content[0].text;

let parsed;
try {
  parsed = JSON.parse(responseText);
} catch (e) {
  throw new Error(`Claude returned malformed JSON: ${responseText}`);
}

const relevantIds = new Set(parsed.relevant_post_ids ?? []);
// Filter the original batch items — need to access them from the loop context
```

**Challenge:** After the HTTP Request node, the original batch items are not in context. Two approaches:
1. Pass the original batch items forward through the Code (build message) node as extra fields
2. Use n8n's `$('SplitInBatches').all()` to access the batch from earlier in the loop

**Recommended approach:** In the "Build Message" Code node, output both the message AND the original items:
```javascript
return [{ json: {
  batchMessage: JSON.stringify(posts),
  originalItems: items.map(i => i.json)
}}];
```
Then in the "Parse Response" Code node, filter against `originalItems`.

---

## 6. Aggregating Results Across Batches

After SplitInBatches loop completes, all filtered items need to be merged. n8n handles this automatically when SplitInBatches reaches its last batch — items from all iterations flow through to the next node.

The final output should be a flat array of relevant post objects (same schema as input: `{ postId, authorName, postText, postLink, postDate }`).

---

## 7. Error Handling

| Error | Handling |
|-------|----------|
| Claude API error (4xx/5xx) | HTTP Request node throws → error workflow catches |
| Malformed JSON response | Code node throws with clear message → error workflow catches |
| Empty `relevant_post_ids` | Normal — return empty array for that batch |
| All batches empty | Return empty array to leads_main (no storage call needed) |

---

## 8. Validation Architecture

- **Happy path test:** Pass 20 mixed Hebrew posts (10 relevant, 10 not) → confirm only relevant ones returned
- **Malformed JSON test:** Mock Claude response with invalid JSON → confirm error is thrown
- **Empty batch test:** Pass 10 irrelevant posts → confirm empty array returned, no error
- **Batch boundary test:** Pass 25 posts → confirm 3 batches (10+10+5) all processed and results merged

---

## Summary

| Decision | Value |
|----------|-------|
| Claude endpoint | `POST https://api.anthropic.com/v1/messages` |
| Auth | Header Auth — `x-api-key` + `anthropic-version: 2023-06-01` |
| Batching | SplitInBatches node, size 10 |
| User message format | `JSON.stringify([{ id, text, author }])` |
| Response parsing | `content[0].text` → `JSON.parse()` → `relevant_post_ids` |
| Error on bad JSON | Throw error (caught by error workflow) |
| Aggregation | Automatic via SplitInBatches loop completion |
