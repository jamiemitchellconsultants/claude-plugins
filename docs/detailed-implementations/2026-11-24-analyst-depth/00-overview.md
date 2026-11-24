# 00 — Overview (Tasks 1–4)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

This is the detailed implementation plan for analyst depth. It expands [the superpowers plan](../../superpowers/plans/2026-11-24-analyst-depth/plan.md), which implements [the design](../../superpowers/specs/2026-11-24-analyst-depth-design.md). Read both before starting. They hold the decisions; this plan holds the exact text and the tests.

## Increments

Four tasks, so one increment.

| Increment | Behaviours | Tasks | File |
| --- | --- | --- | --- |
| 01 — analyst depth | uncertainty scan, quality attributes, priority, `[P]`, and their feature-analyze checks | 1–4 | [01-analyst-depth.md](01-analyst-depth.md) |

## What changes, and where

All skill paths are under `skills/init-repo/assets/lifecycle/skills/`.

| Path | Change |
| --- | --- |
| `feature-analyst/SKILL.md` | scan, Q ids, priority |
| `feature-architect/SKILL.md` | traceability covers Q ids |
| `feature-dev/SKILL.md` | priority order, Q ids per increment, `[P]` |
| `feature-user/SKILL.md` | an acceptance check per Q id |
| `feature-analyze/SKILL.md` | new findings |
| `docs/ontology.ttl`, `docs/ontology.md` | `Behaviour`, `QualityAttribute`, `BehaviourPriority` |
| `skills/init-repo/tests/analyst-depth.test.mjs` | new tests |

Run every test with `node --test skills/init-repo/tests/*.test.mjs`.
