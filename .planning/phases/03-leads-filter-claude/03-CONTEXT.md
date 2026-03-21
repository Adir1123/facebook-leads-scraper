# Phase 3: leads_filter_claude - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning
**Source:** PRD.md + REQUIREMENTS.md (no discuss-phase questions asked)

<domain>
## Phase Boundary

Sub-workflow that accepts `{ posts: [...], group_url }`, batches posts 10 at a time, calls Claude (`claude-3-5-sonnet-20241022`) with a Hebrew-aware family law system prompt, parses the `{ "relevant_post_ids": [...] }` response, and returns only the relevant posts. Handles malformed JSON and empty results gracefully.

</domain>

<decisions>
## Implementation Decisions

### Trigger
- Execute Workflow trigger — called by leads_main
- Input: `{ posts: [...], group_url }`

### Batching
- Split posts into batches of 10 using Loop Over Items node
- Each batch processed independently through Claude

### Claude API call
- Model: `claude-3-5-sonnet-20241022`
- Endpoint: `https://api.anthropic.com/v1/messages`
- Auth: HTTP Header Auth — `x-api-key: <token>` + `anthropic-version: 2023-06-01`
- Max tokens: 512
- Each post sent as: `{ "id": "...", "text": "...", "author": "..." }`

### System prompt (locked — from PRD)
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

### Response parsing
- Code node: `JSON.parse()` the Claude response text
- Extract `relevant_post_ids` array
- Filter original batch to posts whose `postId` is in the array
- Malformed JSON → throw error (caught by error workflow)

### Aggregation
- Merge filtered results across all batches into a single array
- Return flat array of relevant post objects

### Edge cases (from PRD)
- Empty `relevant_post_ids` → return empty array silently (no storage call needed)
- Malformed JSON from Claude → raise error (error workflow handles it)
- All posts irrelevant → empty array is normal

### Claude's Discretion
- n8n node structure for batching (SplitInBatches vs Loop Over Items)
- Exact aggregation node choice
- Whether to use n8n's Anthropic node or HTTP Request node

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — FLTR-01 through FLTR-07 (authoritative spec)
- `.planning/ROADMAP.md` — Phase 3 plans (step-by-step outline)

### System prompt & batch format
- `PRD.md` — Full system prompt text, batch input format, edge cases (§ AI Relevance Filter)

### Project architecture
- `CLAUDE.md` — Credential setup, data schema, design decisions
- `.planning/STATE.md` — n8n workflow IDs

</canonical_refs>

<specifics>
## Specific Ideas

- System prompt is LOCKED — use exactly as written in PRD.md
- Each post sent to Claude as `{ "id": postId, "text": postText, "author": authorName }`
- Claude response must be parsed strictly — no regex fallback, pure JSON.parse()

</specifics>

<deferred>
## Deferred Ideas

None — all requirements captured above.

</deferred>

---

*Phase: 03-leads-filter-claude*
*Context gathered: 2026-03-21*
