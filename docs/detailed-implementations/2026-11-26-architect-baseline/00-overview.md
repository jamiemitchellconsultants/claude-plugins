# 00 — Overview (Tasks 1–2)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

This is the detailed implementation plan for the architect baseline. It expands [the superpowers plan](../../superpowers/plans/2026-11-26-architect-baseline/plan.md), which implements [the design](../../superpowers/specs/2026-11-26-architect-baseline-design.md). Read both before starting. They hold the decisions; this plan holds the file contents, the skill text and the tests.

## Increments

The feature has two behaviours and two tasks, so it is one increment.

| Increment | Behaviours | Tasks | File |
| --- | --- | --- | --- |
| 01 — architect baseline | the seeded baseline and the architect's deployment questions | 1–2 | [01-architect-baseline.md](01-architect-baseline.md) |

## What gets built, and where

| Path | What it is |
| --- | --- |
| `skills/init-repo/assets/files/docs/architecture-baseline.md.dotnet` | The seeded baseline. `init-files.mjs` already writes `.dotnet` assets only for stack dotnet and only when missing, so it needs no change. |
| `skills/init-repo/tests/init-files.test.mjs` | Seeding tests. |
| `skills/init-repo/assets/lifecycle/skills/feature-architect/SKILL.md` | The deployment step and its role-brief lines. |
| `skills/init-repo/tests/architect-baseline.test.mjs` | The architect's tests. |
| `docs/ontology.ttl`, `docs/ontology.md` | The `Baseline` comment names the new piece. `ArchitectureBaseline` itself is already defined. |
| `README.md`, `skills/init-repo/SKILL.md` | The piece tables and the `feature-architect` row. |

Run every test with `node --test skills/init-repo/tests/*.test.mjs`.
