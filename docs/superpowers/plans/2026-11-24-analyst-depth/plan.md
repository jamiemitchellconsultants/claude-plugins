# Analyst depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the uncertainty scan, quality attributes (Q ids), behaviour priority and the optional `[P]` task marker to the lifecycle skills as guidance only, and have feature-analyze report where they are skipped.

**Architecture:** Prose changes to the feature-analyst, feature-architect, feature-dev, feature-user and feature-analyze `SKILL.md` files, three new ontology terms, and one new test file. No script, gate or frontmatter change.

**Tech Stack:** Agent Skills `SKILL.md`; `node:test`; the ontology kit (`docs/ontology.ttl`, `node scripts/build-ontology.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-24-analyst-depth-design.md`

**This plan is code-free by design.** Per `AGENTS.md`, the detailed plan under `docs/detailed-implementations/2026-11-24-analyst-depth/` carries the exact text and the complete tests. The test names below are binding on it.

## Global Constraints

- `EXIT_CRITERIA` in `feature-lib.mjs` is not changed.
- No new frontmatter key; `persona-common.md`, `AGENTS.md` and `assets/AGENTS.md.tmpl` are not changed.
- Ids: Q1, Q2 and so on, written `<slug>#Q<n>` outside the feature; priorities P1, P2, P3.
- Existing wording pinned by `persona-skills.test.mjs` and `dev-user-skills.test.mjs` stays (for example "one question at a time", "exactly one increment", "added, changed and retired").
- No backticked PascalCase in the kit.

## Review Focus

1. **A vision with more than five uncertainties.** Only five are asked; the rest are the analyst's call, recorded. Pinned by `analyst asks at most five, with a recommended answer`.
2. **A Q id forced into an increment.** Q ids must stay out of the one-increment rule. Pinned by `dev keeps quality attributes out of the one-increment rule`.
3. **A `[P]` task committed in parallel on one branch.** `[P]` must not mean concurrent commits. Pinned by `dev defines the parallel marker as order only`.
4. **A priority change mistaken for a meaning change.** It keeps its id. Pinned by `analyst keeps ids through a priority change`.
5. **A quality attribute that cannot be automated.** It gets a scripted inspection. Pinned by `user proves every quality attribute`.

## Increments

One increment of four tasks.

| Increment | Delivers | Tasks |
| --- | --- | --- |
| 01 — analyst depth | all four ideas and their feature-analyze checks | 1–4 |

### Task 1: the analyst's scan, quality attributes and priority

- feature-analyst: the six-heading scan, at most five questions each with a recommended answer, the rest recorded as the analyst's call; a Quality attributes section with Q ids; a priority on every behaviour; Q ids under the id rules; priority changes keep the id.
- Ontology: `Behaviour`, `QualityAttribute`, `BehaviourPriority` (P1, P2, P3); regenerate.
- Tests (new `skills/init-repo/tests/analyst-depth.test.mjs`): `analyst scans every uncertainty heading`; `analyst asks at most five, with a recommended answer`; `analyst writes quality attributes with Q ids`; `analyst gives every behaviour a priority`; `analyst keeps ids through a priority change`; `exit criteria are unchanged`.
- Commit: `feat(lifecycle): analyst scans uncertainty, writes quality attributes and priorities`.

### Task 2: architect and developer

- feature-architect: the traceability table covers Q ids.
- feature-dev: increments ordered by priority; Q ids named per increment, outside the one-increment rule; the optional `[P]` marker.
- Tests: `architect traces quality attributes`; `dev orders increments by priority`; `dev keeps quality attributes out of the one-increment rule`; `dev defines the parallel marker as order only`.
- Commit: `feat(lifecycle): trace quality attributes and order increments by priority`.

### Task 3: acceptance proves quality attributes

- feature-user: an acceptance check for every Q id, executable where measurable, otherwise a scripted inspection, run and recorded in both environments.
- Tests: `user proves every quality attribute`.
- Commit: `feat(lifecycle): acceptance proves quality attributes`.

### Task 4: feature-analyze reports the new gaps

- feature-analyze: Q ids with no component or no acceptance check; id rules for Q ids; increments against priority with no reason.
- Tests: `analyze checks quality attributes and priority`.
- Commit: `feat(lifecycle): analyze checks quality attributes and priority`.
