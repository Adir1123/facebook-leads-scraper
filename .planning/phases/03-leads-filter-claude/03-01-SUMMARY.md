---
plan: 03-01
phase: 03-leads-filter-claude
status: complete
completed: 2026-03-22
---

# Summary: leads_filter_claude Workflow

## What Was Built

Complete n8n sub-workflow that accepts `{ posts: [...], group_url }`, filters posts for Hebrew family law relevance using Claude AI, and returns only relevant post objects.

## n8n Workflow

- **ID:** CY2ax7bMZaLoODGm
- **Name:** leads_filter_claude
- **Status:** Created and tested ✓

## Node Chain

```
Execute Workflow Trigger
  → Unpack Posts (Code) — splits posts array into individual items
  → SplitInBatches (batch size: 10)
      → Build Batch Message (Code) — serializes batch + carries originalItems
      → Claude API Request (Anthropic node) — Hebrew family law prompt
      → Parse and Filter Response (Code) — JSON.parse, filter by relevant_post_ids
      → [loop back to SplitInBatches]
  → No Operation (done output — aggregates all batches)
```

## Key Files

- `workflows/leads_filter_claude.json` — exportable n8n workflow JSON

## Decisions Made During Execution

| Decision | Rationale |
|----------|-----------|
| Official Anthropic node over HTTP Request | Simpler credential setup (anthropicApi type vs manual headers) |
| Model: claude-sonnet-4-6 | User selected from list — newer/better than originally planned claude-3-5-sonnet-20241022 |
| Response field: `content[0].text` | Anthropic node with simplify:true returns `content` array, not flat `text` |
| Code-fence stripping in parser | Claude occasionally wraps JSON in ```json blocks despite instructions |
| Unpack Posts node added | Required to split `posts` array from trigger input into individual items before SplitInBatches |

## Test Result

Passed: 2 Hebrew family law posts (divorce/custody) identified as relevant, 1 spam post filtered out.
