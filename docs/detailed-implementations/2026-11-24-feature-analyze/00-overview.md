# 00 — Overview (Tasks 1–2)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

This is the detailed implementation plan for the feature-analyze skill. It expands [the superpowers plan](../../superpowers/plans/2026-11-24-feature-analyze/plan.md), which implements [the design](../../superpowers/specs/2026-11-24-feature-analyze-design.md). Read both before starting. They hold the decisions; this plan holds the skill text and the tests.

## Increments

The feature has one behaviour and two tasks, so it is one increment.

| Increment | Behaviours | Tasks | File |
| --- | --- | --- | --- |
| 01 — feature-analyze | the advisory review and its nudges | 1–2 | [01-feature-analyze.md](01-feature-analyze.md) |

## What gets built, and where

| Path | What it is |
| --- | --- |
| `skills/init-repo/assets/lifecycle/skills/feature-analyze/SKILL.md` | The new skill. `init-files.mjs` already copies every skill folder, so it needs no change. |
| `skills/init-repo/tests/analyze-skill.test.mjs` | Its tests. |
| `skills/init-repo/assets/lifecycle/skills/feature-architect/SKILL.md` | One sentence added to `## Checkpoint`. |
| `skills/init-repo/assets/lifecycle/skills/feature/SKILL.md` | One step added to resuming. |
| `docs/ontology.ttl`, `docs/ontology.md` | The `LifecycleKit` comment names the new skill. |
| `README.md`, `skills/init-repo/SKILL.md` | The kit's skill lists. |

Run every test with `node --test skills/init-repo/tests/*.test.mjs`.
