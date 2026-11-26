# Product owner open capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** feature-po hears the product owner out in an "Any more thoughts?" loop before asking directed questions, and keeps what they said as the vision's last section.

**Architecture:** Prose changes to one skill, `feature-po/SKILL.md`, plus one README row. No script, gate, exit criterion, frontmatter or artefact list changes. `init-files.mjs` already overwrites the kit on every run, so every target repo gets it.

**Tech Stack:** Agent Skills `SKILL.md`; `node:test` tests under `skills/init-repo/tests/`.

**Spec:** `docs/superpowers/specs/2026-11-26-po-open-capture-design.md`

**This plan is code-free by design.** Per `AGENTS.md`, the detailed plan under `docs/detailed-implementations/2026-11-26-po-open-capture/` carries the skill text and the tests. The test names and assertions below are binding on it.

## Global Constraints

- No change to `EXIT_CRITERIA`, `FULL_ARTEFACTS`, `ARTEFACT_PHASE` or the frontmatter rules in `feature-lib.mjs`.
- The new vision section is named exactly **In the PO's own words** and is the last section.
- The loop's only prompt is exactly "Any more thoughts?".
- No backticked PascalCase and no hand-edit instruction anywhere in the kit (existing tests).
- The persona heading order checked by `lifecycle-skills.test.mjs` is unchanged.

## Review Focus

1. **Regeneration wipes the raw words.** Steering or review comments must never rewrite the section; new thoughts are appended. Pinned by `po keeps the owner's own words in the vision`.
2. **The loop drifts into questions.** Any summarising, sorting or follow-up during the loop recreates the problem. Pinned by `po hears the idea out before asking directed questions`.
3. **Directed questions start too soon.** The loop must come before the gap questions. Pinned by the same test's ordering assertion.
4. **The PO said it all when invoking the skill.** That counts as the first contribution, so the loop still asks "Any more thoughts?" rather than starting over. Pinned by the same test.
5. **Lite mode.** The section lives in the PO section of `feature.md`. Pinned by `po keeps the owner's own words in the vision`.

## Increments

One increment: one behaviour and one task.

| Increment | Delivers | Tasks |
| --- | --- | --- |
| 01 — open capture | the loop, the gap questions, the new vision section | 1 |

### Task 1: open capture in feature-po

- In `## Work`, replace step 1 with two steps: **Open capture** (the "Any more thoughts?" loop, one-line acknowledgement, no summarising, sorting, questioning or follow-up, until the user says they are done; the invoking message is the first contribution) and **Fill the gaps** (directed questions, one at a time, only for what Problem, Users, Outcomes and measures, and Scope still lack). Renumber the rest.
- The generate step lists **In the PO's own words** as the last section, says what it holds (every contribution, in order, lightly tidied, nothing dropped), that lite mode puts it in the PO section of `feature.md`, and that regenerating never rewrites it, only appends.
- `### Good output` gains a bullet for the PO's own words; `## Review feedback` says to leave the section as it is except to append.
- README's `feature-po` row mentions hearing the idea out in the owner's own words.
- Tests (in `skills/init-repo/tests/persona-skills.test.mjs`):
  - `po hears the idea out before asking directed questions`: Work has "Any more thoughts?", "Do not summarise, sort, question or follow up", "until the user says they are done" and "first contribution", and "Any more thoughts?" comes before "one question at a time";
  - `po keeps the owner's own words in the vision`: Work names "In the PO's own words", "feature.md", "never rewrites In the PO's own words" and "append"; Good output mentions "own words"; Review feedback names "In the PO's own words".
- Commit: `feat(lifecycle): let the product owner talk freely before directed questions`.
