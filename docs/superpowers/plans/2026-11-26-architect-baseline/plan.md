# Architect baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** init-repo seeds a per-repo architecture baseline for stack dotnet, and feature-architect starts from it, working out its deployment questions from the behaviours and quality attributes and asking them in the user's terms.

**Architecture:** One new asset, `assets/files/docs/architecture-baseline.md.dotnet`, which the existing `.dotnet` handling in `init-files.mjs` writes only for stack dotnet and only when missing, so no script change is needed. The method is prose in `feature-architect/SKILL.md`, overwritten on every run. There are no gate, exit-criterion, frontmatter or artefact-list changes.

**Tech Stack:** Agent Skills `SKILL.md`; `node:test` tests under `skills/init-repo/tests/`; the ontology kit (`docs/ontology.ttl`, `node scripts/build-ontology.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-26-architect-baseline-design.md`

**This plan is code-free by design.** Per `AGENTS.md`, the detailed plan under `docs/detailed-implementations/2026-11-26-architect-baseline/` carries the file contents, the skill text and the tests. The test names and assertions below are binding on it.

## Global Constraints

- No change to `EXIT_CRITERIA`, `FULL_ARTEFACTS`, `ARTEFACT_PHASE`, the frontmatter rules or `init-files.mjs`.
- The seeded file is `docs/architecture-baseline.md`, with exactly three sections: `## Fixed`, `## Per-environment adapters`, `## Variable`.
- The seeded file and all kit text have no backticked PascalCase (the target repo's ontology check would fail) and no hand-edit instruction.
- The persona heading order checked by `lifecycle-skills.test.mjs` is unchanged.
- At most five deployment questions, one at a time, in the user's terms and never in technology names, each with a recommended answer.
- `ArchitectureBaseline` is already defined in `docs/ontology.ttl` (spec commit). Any further ontology edit is regenerated with `node scripts/build-ontology.mjs` and committed with it.

## Review Focus

1. **Stack none gets a .NET baseline.** It must not be written. Pinned by `baseline is not seeded for stack none`.
2. **An edited baseline is overwritten.** It must be kept. Pinned by `an existing baseline is kept`.
3. **The baseline breaks the target repo's ontology check.** Pinned by `the seeded baseline has no backticked PascalCase`.
4. **The architect re-proposes the baseline over what is already built,** or re-records departures already accepted. Pinned by `architect lets what is built win over the baseline`.
5. **A repo without a baseline file.** The architect must still scan and ask. Pinned by `architect falls back to first principles`.

## Increments

One increment: two behaviours and two tasks.

| Increment | Delivers | Tasks |
| --- | --- | --- |
| 01 — architect baseline | the seeded baseline and the architect's deployment questions | 1–2 |

### Task 1: seed the architecture baseline

- Create `skills/init-repo/assets/files/docs/architecture-baseline.md.dotnet` with the spec's Design › The baseline's content.
- Add the `ArchitectureBaseline` (for `Stack` dotnet only) to the `Baseline` comment in `docs/ontology.ttl` and regenerate. List the file in the README's piece table and in `skills/init-repo/SKILL.md`'s piece table.
- Tests (in `skills/init-repo/tests/init-files.test.mjs`, using a full `--dry-run` with stand-in Narrative and ontology-kit checkouts):
  - `baseline is seeded for stack dotnet`: output has `created  docs/architecture-baseline.md`;
  - `baseline is not seeded for stack none`: the output never names it;
  - `an existing baseline is kept`: output has `kept     docs/architecture-baseline.md`;
  - `the seeded baseline has the three sections`;
  - `the seeded baseline records the house choices`: Blazor WebAssembly, PostgreSQL, OIDC, Entra, Keycloak, Terraform, MinIO, S3, Lambda, .NET MAUI and "not MAUI Blazor Hybrid", and the two Variable questions;
  - `the seeded baseline has no backticked PascalCase`.
- Commit: `feat(init-repo): seed a per-repo architecture baseline for stack dotnet`.

### Task 2: the architect's deployment questions

- In feature-architect: Work step 1 also reads the baseline, earlier features' architecture and the accepted ADRs. A new step 2, **Settle the deployment**, covers what wins, what a departure is, the trigger scan, cover-ask-decide with the five-question cap, and the first-principles fallback. The old shape step becomes step 3 and no longer lists deployment. The generate step's Deployment and runtime gains the environments table, the adapters table and the architect's calls. A departure ADR names the baseline line in its Context. Cares about and Good output gain their lines.
- README's `feature-architect` row mentions starting from the architecture baseline.
- Tests (new `skills/init-repo/tests/architect-baseline.test.mjs`):
  - `architect reads the baseline and what is built`;
  - `architect settles deployment before the rest of the shape`;
  - `architect lets what is built win over the baseline`;
  - `architect defines a departure`;
  - `architect scans every trigger heading`;
  - `architect asks in the user's terms, at most five`;
  - `architect falls back to first principles`;
  - `architect records environments, adapters and calls`;
  - `architect's departure ADR names the baseline line`;
  - `architect's role brief names the baseline`.
- Commit: `feat(lifecycle): architect derives deployment questions from the baseline and behaviours`.
