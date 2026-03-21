# Phase 2: leads_scrape_apify — Research

**Phase:** 2
**Goal:** Sub-workflow accepts group URL + post count → calls Apify sync → returns structured post array.

---

## ## RESEARCH COMPLETE

---

## 1. Apify Actor: `apify/facebook-groups-scraper`

### Input Schema (confirmed from MCP tool)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `startUrls` | array | YES | `[{ "url": "https://facebook.com/groups/..." }]` |
| `resultsLimit` | integer | no | Number of posts to scrape (default: 20) |
| `viewOption` | string | no | `"CHRONOLOGICAL"` (default), `"RECENT_ACTIVITY"`, `"TOP_POSTS"` |
| `onlyPostsNewerThan` | string | no | e.g. `"7 days"` or `"2025-01-01"` |

**Mapping from workflow input:**
- `group_url` → `startUrls[0].url`
- `post_count` → `resultsLimit`

### Output Schema (actor documentation)

The actor returns an array of items. Key fields:

| Apify Field | Map To | Notes |
|-------------|--------|-------|
| `postId` | `postId` | Unique Facebook post ID |
| `authorName` | `authorName` | Display name of post author |
| `message` | `postText` | Full post text content |
| `url` | `postLink` | Direct link to the post |
| `time` | `postDate` | ISO 8601 timestamp |

> **Note:** Verify exact field names on first real run — Apify occasionally renames output fields between actor versions. Use n8n Code node to safely map with fallbacks.

---

## 2. Apify Sync Endpoint

**URL format:**
```
POST https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items
```

**Query params:**
- `token` can be passed as query param OR via Authorization header

**Auth header (use n8n credential):**
```
Authorization: Bearer {APIFY_TOKEN}
```

**Content-Type:** `application/json`

**Body:** Actor input JSON:
```json
{
  "startUrls": [{ "url": "{{ $json.group_url }}" }],
  "resultsLimit": "{{ $json.post_count }}",
  "viewOption": "CHRONOLOGICAL"
}
```

**Response:** Direct JSON array of scraped items (no polling needed — sync endpoint blocks until done).

**Timeout risk:** Apify sync runs can take 60–300 seconds for large groups. n8n HTTP Request default timeout is 5 minutes — acceptable for ≤200 posts.

---

## 3. n8n Execute Workflow Trigger

- Input fields from `leads_main` arrive as `$json` on the trigger node
- `$json.group_url` — the Facebook group URL
- `$json.post_count` — number of posts requested
- Downstream nodes reference these as `{{ $('Execute Workflow Trigger').item.json.group_url }}`

---

## 4. n8n HTTP Request Node Configuration

```
Method: POST
URL: https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items
Authentication: Generic Credential Type → HTTP Header Auth
  Header Name: Authorization
  Header Value: Bearer {credential value}
Content-Type: application/json
Body: JSON (raw or using n8n fields)
Response Format: JSON (auto-parse array)
```

The response is already an array — no `.items` unwrapping needed.

---

## 5. Zero-Post Handling

```
IF node condition: {{ $json.length === 0 }} (or check items count)
  True branch: Set node → log "no posts found for [URL]", pass empty array []
  False branch: proceed to field mapping
```

In n8n, after an HTTP Request that returns an array, use a **Code node** to check length and branch, or use an **IF node** on `{{ $items().length === 0 }}`.

---

## 6. Field Mapping Strategy

Use a **Code node** after the HTTP Request to normalize the Apify output:

```javascript
return $input.all().map(item => ({
  json: {
    postId: item.json.postId ?? item.json.id ?? '',
    authorName: item.json.authorName ?? item.json.author ?? '',
    postText: item.json.message ?? item.json.text ?? '',
    postLink: item.json.url ?? item.json.postUrl ?? '',
    postDate: item.json.time ?? item.json.timestamp ?? '',
  }
}));
```

Fallback aliases handle Apify field name variations between actor versions.

---

## 7. Validation Architecture

- **Unit test:** Call sub-workflow with known public Facebook group URL → verify array returned with all 5 fields populated
- **Zero-post test:** Call with a group that has no recent posts → verify empty array returned, no error thrown
- **Field mapping test:** Check that `postId` is non-empty string, `postDate` is parseable as date

---

## Summary

| Decision | Value |
|----------|-------|
| Apify endpoint | `POST .../acts/apify~facebook-groups-scraper/run-sync-get-dataset-items` |
| Auth | HTTP Header Auth — `Authorization: Bearer {token}` |
| Input: group URL | `startUrls[0].url` |
| Input: post count | `resultsLimit` |
| Output mapping | Code node with fallback field aliases |
| Zero-post handling | IF node on array length → pass empty array |
| Timeout | n8n default (5 min) — acceptable |
