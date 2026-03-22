# PRD — Facebook Leads Automation

## Product Summary
An n8n workflow that lets a Family Law Attorney discover and store relevant Hebrew-language Facebook leads automatically. The client submits a form with Facebook group URLs; the system scrapes, AI-filters, deduplicates, and stores results in Google Sheets.

---

## Inputs

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `group_urls` | Multi-line text | ≥1 URL required | One URL per line |
| `posts_per_group` | Number | 1–500 | Default: 50 |

---

## Outputs

**Google Sheet** (auto-created on first run, ID stored in n8n static data):
- One tab per Facebook group
- Tab name = extracted group name from URL slug
- Columns: `Post ID | Author | Post Link | Post Date | Scraped At`
- Rows: append-only, never modified after insert

---

## AI Relevance Filter

### System Prompt (Hebrew-aware, Family Law)
```
You are a lead qualification expert for a Family Law Attorney in Israel.
You read Hebrew fluently and understand conversational, colloquial, and formal Hebrew.

A LEAD is a Facebook post where a real person is actively seeking help related to:
- Divorce or separation (גירושין, פרידה)
- Child custody disputes (משמורת ילדים)
- Alimony or financial disputes in marriage (מזונות, הסכם ממון)
- Restraining orders or domestic violence (צו הגנה, אלימות במשפחה)
- Family legal advice requests (ייעוץ משפטי משפחתי)
- Property disputes in marriage or divorce (חלוקת רכוש)

NOT a lead:
- Posts offering legal services (attorneys advertising)
- General news, opinion, or informational posts
- Posts that mention these topics without expressing a personal need
- Spam, promotions, or unrelated content

Respond ONLY with valid JSON in this exact format:
{"relevant_post_ids": ["id1", "id2"]}

If no posts are relevant, return: {"relevant_post_ids": []}
```

### Batch Strategy
- Input: up to 10 posts per API call
- Each post sent as: `{ "id": "...", "text": "...", "author": "..." }`
- Claude returns: `{ "relevant_post_ids": [...] }`
- Relevant posts are filtered from original array and passed to storage

---

## Re-run Behavior

| Scenario | Behavior |
|----------|----------|
| Group tab exists | DO NOT create new tab. Read existing Post IDs. Append only new posts. |
| Group tab does not exist | Create tab named after group. Insert all relevant posts. |
| Post ID already in sheet | Skip silently. Never duplicate. |
| Post ID not in sheet | Insert as new row. |
| Relevance filter applies | Always — even on re-runs. Old posts are never re-evaluated. |

---

## Edge Cases

### Apify
| Case | Behavior |
|------|----------|
| Actor run fails | n8n error → `leads_error_notify` → Gmail alert |
| Zero posts returned | Log "no posts found for [URL]", skip to next group |
| Apify timeout (>10 min) | n8n error → notify |
| Invalid Facebook URL | Apify returns error → n8n catches → notify |

### Claude
| Case | Behavior |
|------|----------|
| API rate limit / error | n8n error → notify |
| Returns malformed JSON | Code node catches parse error → notify |
| Returns empty `relevant_post_ids` | Skip storage for that batch silently |
| All posts in batch are irrelevant | Normal — pass empty array to storage |

### Google Sheets
| Case | Behavior |
|------|----------|
| Sheet not yet created | Create automatically, store ID in static data |
| Tab does not exist | Create tab, insert header row, then append posts |
| Header row missing | Re-insert before first data row |
| Google API quota exceeded | n8n error → notify |
| Zero new posts after dedup | Log "all posts already exist", skip write |

### Form Input
| Case | Behavior |
|------|----------|
| Multiple URLs submitted | Loop — process each independently |
| Duplicate URLs in same submission | Both processed; deduplication handles post-level duplication |
| Empty group_urls | Form validation prevents submission |
| posts_per_group = 0 | Default to 50 |

---

## Error Notification Format (Gmail)

**Subject**: `⚠️ Leads Workflow Error — [Workflow Name]`

**Body**:
```
Workflow:   leads_main
Node:       [node that failed]
Error:      [error message]
Timestamp:  [ISO timestamp]
Input:      [group_url that was being processed]

Please check n8n executions for full trace.
```

---

## Security

- All API keys stored in n8n Credential Store only
- No credentials in workflow JSON exports
- Google Sheet is private (only accessible to the account owner)
- Apify API token scoped to read + run only

---

## Non-Goals (Out of Scope)
- No multi-client support (single niche, single sheet)
- No UI dashboard
- No post content stored (only metadata: ID, author, link, date)
- No scoring or ranking of leads (binary: relevant or not)
- No automated follow-up or CRM integration
