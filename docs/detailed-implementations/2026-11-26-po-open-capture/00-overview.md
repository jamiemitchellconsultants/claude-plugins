# 00 — Overview (Task 1)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

This is the detailed implementation plan for product owner open capture. It expands [the superpowers plan](../../superpowers/plans/2026-11-26-po-open-capture/plan.md), which implements [the design](../../superpowers/specs/2026-11-26-po-open-capture-design.md). Read both before starting. They hold the decisions; this plan holds the skill text and the tests.

## Increments

The feature has one behaviour and one task, so it is one increment.

| Increment | Behaviours | Tasks | File |
| --- | --- | --- | --- |
| 01 — open capture | the loop, the gap questions and the new vision section | 1 | [01-open-capture.md](01-open-capture.md) |

## What gets built, and where

| Path | What it is |
| --- | --- |
| `skills/init-repo/assets/lifecycle/skills/feature-po/SKILL.md` | Work, Good output and Review feedback change. |
| `skills/init-repo/tests/persona-skills.test.mjs` | Two new tests. |
| `README.md` | The `feature-po` row. |

Run every test with `node --test skills/init-repo/tests/*.test.mjs`.
