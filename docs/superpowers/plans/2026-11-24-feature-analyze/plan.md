# feature-analyze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an advisory `feature-analyze` skill to the `LifecycleKit` that reviews a feature's artefacts against each other and reports where they disagree, plus a one-line nudge to run it before planning.

**Architecture:** A prose `SKILL.md` alongside `feature` and `feature-park`; no script, no `feature.mjs` subcommand, no CI step. `init-files.mjs` already copies every folder under `assets/lifecycle/skills/`, so installation needs no code change. Two existing skills gain one sentence each.

**Tech Stack:** Agent Skills `SKILL.md`; `node:test` tests under `skills/init-repo/tests/`; the ontology kit (`docs/ontology.ttl`, `node scripts/build-ontology.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-24-feature-analyze-design.md`

**This plan is code-free by design.** Per `AGENTS.md`, the detailed plan under `docs/detailed-implementations/2026-11-24-feature-analyze/` carries the skill text and complete test files. The test names and assertions below are binding on it.

## Global Constraints

- Frontmatter is exactly `name: feature-analyze` and a `description` starting "Use when", one plain line with no ": ".
- No backticked PascalCase and no hand-edit instruction anywhere in the kit (existing tests).
- The skill names no `feature.mjs` subcommand other than `status`.
- The skill is not a persona: no `## Gate check`, no exit criteria, no checkpoint.
- Nothing blocks and nothing is posted: the report is in chat only.

## Review Focus

1. **A feature that has only a vision.** The skill must review what exists and must not report later artefacts as missing. Pinned by `analyze reviews only what exists`.
2. **Lite mode.** Artefacts are sections of `feature.md`, not numbered files. Pinned by `analyze reads lite mode`.
3. **Too many findings.** A long list buries the important ones. Pinned by `analyze caps and ranks the report`.
4. **No findings.** The skill must say so briefly instead of padding. Pinned by `analyze says so when nothing is found`.
5. **The user asks it to fix something.** It must route to the owning role, not edit. Pinned by `analyze changes nothing`.

## Increments

One increment: a single behaviour and two tasks.

| Increment | Delivers | Tasks |
| --- | --- | --- |
| 01 — feature-analyze | the skill, its nudges and the kit docs | 1–2 |

### Task 1: the feature-analyze skill

- Create `skills/init-repo/assets/lifecycle/skills/feature-analyze/SKILL.md` as the spec's Design › The skill describes: find the feature, read what exists (full and lite mode, plus the ontology), the five finding kinds (Coverage, Id hygiene, Terminology drift, Ambiguity, Contradiction), a ranked report of at most about ten findings marked **before next phase** or **worth a look**, and the existing routes (pushback, review feedback, feature-park) offered but not taken.
- Add `.claude/skills/feature-analyze/SKILL.md` to `KIT_FILES` in `init-files.test.mjs`.
- Add `feature-analyze` to the `LifecycleKit` comment in `docs/ontology.ttl` and regenerate; list it in `skills/init-repo/SKILL.md` and in the README skill table (which becomes "Eight portable skills").
- Tests (new `skills/init-repo/tests/analyze-skill.test.mjs`):
  - `the kit has the analyze skill`;
  - `analyze is not a persona`: no `## Gate check`, no `feature.mjs gate`, no `tick` or `handoff`;
  - `analyze changes nothing`: the only `feature.mjs` subcommand named is `status`; it says it changes no file and posts nothing;
  - `analyze names every finding kind`: the five kind names;
  - `analyze reviews only what exists`;
  - `analyze reads lite mode`: mentions `feature.md`;
  - `analyze caps and ranks the report`: "most important first", "about ten", "before next phase", "worth a look";
  - `analyze says so when nothing is found`;
  - `analyze offers the existing routes`: pushback and feature-park;
  - `the kit docs list the analyze skill`: README and init-repo `SKILL.md`.
- Commit: `feat(lifecycle): add the advisory feature-analyze skill`.

### Task 2: the nudges

- In feature-architect's `## Checkpoint`, one sentence suggesting a feature-analyze run before planning starts, saying it only reports.
- In the feature skill's "Where am I, and resuming after a break", a step: when the next skill is feature-dev or later, mention feature-analyze.
- Tests (same file): `architect checkpoint suggests analyze`; `resume mentions analyze`.
- Commit: `feat(lifecycle): suggest feature-analyze before planning`.
