# Facebook Leads System — Architecture Context

## What This Is
An n8n automation that scrapes Facebook group posts via Apify, filters them for relevance using Claude AI (Hebrew-aware), deduplicates against existing records, and appends qualified leads to a Google Sheet — one tab per group.

## System Map

```
[n8n Form]
    │
    ▼
leads_main  ◄── Error ──► leads_error_notify (Gmail)
    │
    ├─ per group URL ─►  leads_scrape_apify   → raw posts
    │                    leads_filter_claude  → relevant posts only
    │                    leads_store_sheets   → append new to Sheet
    │
    ▼
[Form success response]
```

## Workflows

### leads_main
- **Trigger**: n8n Form (group_urls: multi-line text, posts_per_group: number)
- **Role**: Parse URLs → loop → call 3 sub-workflows in sequence per group
- **Error handling**: Error Workflow attached → routes to `leads_error_notify`

### leads_scrape_apify
- **Trigger**: Execute Workflow (called by main)
- **Input**: `{ group_url, post_count }`
- **Output**: `[ { postId, authorName, postText, postLink, postDate } ]`
- **Actor**: `apify~facebook-groups-scraper` (sync run endpoint — blocks until done)

### leads_filter_claude
- **Trigger**: Execute Workflow (called by main)
- **Input**: `{ posts: [...], group_url }`
- **Output**: `[ filtered posts that are genuine leads ]`
- **Strategy**: Batch 10 posts/call → Claude returns `{ "relevant_post_ids": [...] }` → filter original array
- **Model**: `claude-3-5-sonnet-20241022`
- **Prompt**: See PRD.md — Hebrew-aware, family law niche, hardcoded

### leads_store_sheets
- **Trigger**: Execute Workflow (called by main)
- **Input**: `{ posts: [...], group_url }`
- **Behavior**:
  1. Extract group name from URL
  2. Get/create master Google Sheet (Sheet ID stored in n8n static data)
  3. Get/create tab named after group
  4. Read existing Post IDs from column A
  5. Filter: keep only posts whose ID is NOT already in sheet
  6. Append new rows only

### leads_error_notify
- **Trigger**: n8n Error Trigger
- **Action**: Gmail — sends error details (workflow name, message, timestamp, input)

## Data Schema

### Sheet columns (per tab)
| A: Post ID | B: Author | C: Post Link | D: Post Date | E: Scraped At |

### Claude batch request
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 512,
  "system": "[niche system prompt]",
  "messages": [{ "role": "user", "content": "[10 posts as JSON]" }]
}
```

### Claude batch response
```json
{ "relevant_post_ids": ["123", "456"] }
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Sub-workflows over monolith | Each stage independently testable + rerunnable |
| Sync Apify endpoint | Simpler than polling; acceptable for ≤200 posts |
| Batch Claude calls (10/call) | Balances token cost vs. context quality |
| Static data for Sheet ID | Avoids needing external config store; persists across runs |
| Append-only sheets | Safe for client data; never overwrites existing rows |
| Claude structured JSON output | Deterministic parsing; no regex on prose |

## Credentials Needed
- **Apify**: HTTP Header Auth → `Authorization: Bearer <token>`
- **Anthropic**: HTTP Header Auth → `x-api-key: <key>` + `anthropic-version: 2023-06-01`
- **Google Sheets**: OAuth2 (n8n built-in Google Sheets node)
- **Gmail**: OAuth2 (n8n built-in Gmail node)

## Cost Profile (per run)
- Apify: ~$0.50–2.00 depending on post count
- Claude: ~100 posts = 10 batch calls ≈ ~$0.10–0.30
- Google Sheets API: free tier covers all usage

## Adding a New Client Niche
Edit the system prompt in `leads_filter_claude` → "System Prompt" node.
No structural changes needed — everything else is data-driven.
