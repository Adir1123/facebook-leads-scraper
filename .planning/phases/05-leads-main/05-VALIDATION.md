---
phase: 5
slug: leads-main
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | n8n MCP tools (workflow validation + test execution) |
| **Config file** | none — n8n cloud workflows validated via MCP |
| **Quick run command** | `n8n_validate_workflow` via MCP |
| **Full suite command** | `n8n_test_workflow` via MCP + manual form submission |
| **Estimated runtime** | ~30 seconds (validation) / ~120 seconds (full test with Apify) |

---

## Sampling Rate

- **After every task commit:** Run `n8n_validate_workflow` via MCP
- **After every plan wave:** Run `n8n_test_workflow` via MCP
- **Before `/gsd:verify-work`:** Full suite must be green (form submission with real URLs)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | ORCH-01 | manual | n8n_validate_workflow | N/A | ⬜ pending |
| 05-01-02 | 01 | 1 | ORCH-01 | manual | n8n_validate_workflow | N/A | ⬜ pending |
| 05-01-03 | 01 | 1 | ORCH-02 | manual | n8n_validate_workflow | N/A | ⬜ pending |
| 05-01-04 | 01 | 1 | ORCH-02 | manual | n8n_test_workflow | N/A | ⬜ pending |
| 05-01-05 | 01 | 1 | ORCH-03 | manual | n8n settings check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — n8n MCP tools provide validation and testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Form submission with real URLs | ORCH-01, ORCH-02 | Requires live Facebook group URLs and Apify credits | Submit form with 2 real group URLs, verify leads appear in Google Sheet |
| Error workflow fires on failure | ORCH-03 | Requires triggering a real error condition | Submit form with invalid group URL that passes validation but fails at Apify, verify Gmail alert received |
| Per-group error isolation | D-10, D-11 | Requires one valid + one failing URL | Submit with mix of valid/invalid-at-scrape URLs, verify valid groups still processed |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
