---
phase: 4
slug: leads-store-sheets
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | n8n MCP tools (workflow validation + manual test execution) |
| **Config file** | none — n8n workflows validated via MCP |
| **Quick run command** | `mcp__n8n-mcp__n8n_validate_workflow` |
| **Full suite command** | `mcp__n8n-mcp__n8n_test_workflow` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `mcp__n8n-mcp__n8n_validate_workflow`
- **After every plan wave:** Run `mcp__n8n-mcp__n8n_test_workflow`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | STOR-01 | manual | n8n workflow import | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | STOR-02 | manual | n8n MCP validate | ✅ | ⬜ pending |
| 04-01-03 | 01 | 1 | STOR-03 | manual | n8n test workflow | ✅ | ⬜ pending |
| 04-01-04 | 01 | 1 | STOR-04 | manual | n8n test workflow | ✅ | ⬜ pending |
| 04-01-05 | 01 | 1 | STOR-05 | manual | n8n test workflow | ✅ | ⬜ pending |
| 04-01-06 | 01 | 1 | STOR-06 | manual | n8n test workflow | ✅ | ⬜ pending |
| 04-01-07 | 01 | 1 | STOR-07 | manual | n8n test workflow | ✅ | ⬜ pending |
| 04-01-08 | 01 | 1 | STOR-08 | manual | n8n test workflow | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — n8n MCP tools handle validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sheet auto-creation | STOR-03 | Requires Google Sheets OAuth2 credential in n8n | Run workflow with no prior sheet; verify sheet created |
| Tab creation per group | STOR-04 | Requires real Google Sheet interaction | Run with new group URL; verify tab appears |
| Dedup on second run | STOR-06 | Requires two sequential runs with same data | Run twice; verify no duplicates in sheet |
| Self-healing on deleted sheet | D-04 | Requires manually deleting sheet between runs | Delete sheet; re-run; verify new sheet created |
| Static data persistence | STOR-03 | Must verify in production execution, not test mode | Activate workflow; trigger via Execute Workflow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
