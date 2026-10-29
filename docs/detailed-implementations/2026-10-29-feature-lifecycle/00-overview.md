# 00 — Overview (Tasks 1–12)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

This is the detailed implementation plan for the feature lifecycle persona skills. It expands [the superpowers plan](../../superpowers/plans/2026-10-29-feature-lifecycle/plan.md), which implements [the design](../../superpowers/specs/2026-10-29-feature-lifecycle-design.md). Read both before starting. They hold the decisions, and this plan holds the code. The work is layered:
- **Domain:** the ontology, and the pure lifecycle library.
- **Application:** the feature command line.
- **Infrastructure:** the gh adapter, the feature-gate workflow, and the init-repo scripts.
- **Skills:** the prose that agents follow.

## Files in this plan

| File | Tasks | Layer |
| --- | --- | --- |
| [01-ontology-and-library.md](01-ontology-and-library.md) | 1–2 | domain |
| [02-feature-command-line.md](02-feature-command-line.md) | 3–5 | application and infrastructure |
| [03-skills.md](03-skills.md) | 6–9 | skills |
| [04-init-repo.md](04-init-repo.md) | 10–12 | infrastructure and docs |

## What gets built, and where

All paths are relative to the repository root.

| Path | What it is |
| --- | --- |
| `skills/init-repo/assets/lifecycle/scripts/feature-lib.mjs` | Pure model: phases, exit criteria, checklists, markers, gates, PR classification. No I/O. |
| `skills/init-repo/assets/lifecycle/scripts/feature-gh.mjs` | The only code that talks to GitHub, through the `gh` CLI. |
| `skills/init-repo/assets/lifecycle/scripts/feature.mjs` | The command line that skills and CI call. |
| `skills/init-repo/assets/lifecycle/workflows/feature-gate.yml` | The required PR check. |
| `skills/init-repo/assets/lifecycle/skills/<name>/SKILL.md` | The seven skills. |
| `skills/init-repo/assets/lifecycle/skills/feature/templates/*.md` | The handoff, pushback and ADR templates, and the shared persona steps. |
| `skills/init-repo/assets/lifecycle/agents-section.md` | The AGENTS.md section for target repos. |
| `skills/init-repo/tests/*.test.mjs` | The `node:test` tests, plus `tests/helpers/`. |
| `.github/workflows/tests.yml` | Runs the tests in this repository. |

In a target repo, `init-files.mjs` installs:
- the scripts into `scripts/`;
- the workflow as `.github/workflows/feature-gate.yml`;
- each skill folder into `.claude/skills/`, `.agents/skills/` and `.kiro/skills/`.

## Domain detail every task relies on

**Phases**, in order:

| id | persona | sub-issue title | label | next skill |
| --- | --- | --- | --- | --- |
| `po` | po | `[PO] Vision` | `phase:po` | `feature-po` |
| `analyst` | analyst | `[Analyst] Behaviours` | `phase:analyst` | `feature-analyst` |
| `architect` | architect | `[Architect] Structure` | `phase:architect` | `feature-architect` |
| `dev-plan` | dev | `[Dev] Plan` | `phase:dev` | `feature-dev` |
| `dev-build` | dev | `[Dev] Build` | `phase:dev` | `feature-dev` |
| `user` | user | `[User] Docs & acceptance` | `phase:user` | `feature-user` |

**Markers.** These HTML comments in issue bodies are how the scripts recognise feature issues:
- the parent issue body starts with `<!-- feature: slug=<slug> mode=<full|lite> -->`;
- a sub-issue body starts with `<!-- feature-phase: <phase id> -->`, followed by the line `Phase of #<parent>.`.

**State shapes.** `loadFeature` returns one of these, and every gate function takes it:

```js
// Full mode: one sub-issue per phase, read from the GitHub sub-issues API.
const fullState = {
  number: 1,              // parent issue number
  slug: "demo",           // docs/features/<slug>/
  mode: "full",
  subIssues: [
    // phaseId from the sub-issue marker; state is "open" | "closed"; labels are names;
    // body holds the exit-criteria checklist.
    { phaseId: "po", number: 10, state: "closed", labels: ["phase:po"], body: "..." },
  ],
};

// Lite mode: no sub-issues; the parent body has one "### <title>" checklist section per phase.
const liteState = { number: 1, slug: "demo", mode: "lite", body: "...", labels: ["feature"] };
```

**Exit codes** for `feature.mjs`:
- `0`: success, or the gate is open;
- `1`: a usage error or a GitHub error (never treated as an open gate);
- `2`: the gate is closed.

## Conventions for every task

- Node 20, ES modules, and only built-in modules, matching `skills/init-repo/scripts/init-files.mjs`.
- Run every test with `node --test skills/init-repo/tests/*.test.mjs`. A single test file runs with `node --test <file>`.
- The ontology protocol applies before each commit:
  - stage the task's files;
  - review `git diff --cached`;
  - run `node scripts/check-ontology-terms.mjs`.

  Backticked PascalCase words outside code fences must be ontology terms. Fenced code blocks are not checked.
- Each task ends with its own commit and push. The branch must already track a remote. If `git push` reports there is no upstream, run `git push -u origin HEAD` once, then carry on.
- The final PR is decision-bearing. Give it the `narrative-required` label, the three `## Narrative ...` sections and the `AI-Fingerprint:` footer, as `AGENTS.md` describes.

## Where this plan departs from the superpowers plan

These are details the superpowers plan left open, settled here:

1. **Two more subcommands, `tick` and `clear-pushback` (Task 4).** Skills need a deterministic way to tick an exit criterion and to remove the `pushback` label after an amendment merges, without editing issue bodies by hand.
2. **`SUBCOMMANDS` is exported from Task 3**, not Task 6. It is the keys of the command table, so it grows as Tasks 4 and 5 add commands.
3. **Each task has its own test file.** Shared fixtures are in `skills/init-repo/tests/helpers/`, so that each task's first step is one complete new file.
4. **The steps all persona skills share** live in `feature/templates/persona-common.md`, which each persona skill references. That keeps every `SKILL.md` short enough for a small model.
5. **Descriptions contain no colon followed by a space.** That keeps the frontmatter valid YAML in every agent, and Task 6's linter enforces it.
