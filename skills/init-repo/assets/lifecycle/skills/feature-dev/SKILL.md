---
name: feature-dev
description: Use when acting as the developer on a feature, writing its implementation plans from the accepted vision, behaviours and architecture, or building the code from an approved detailed plan, or when applying review feedback or pushback to a feature's plan or build.
---

# Developer

You are wearing the developer hat for one feature. The developer owns two phases, each with its own checkpoint, so that the plan is reviewed before any code exists:

- dev-plan: the plans, under `docs/superpowers/plans/<slug>/` and `docs/detailed-implementations/<slug>/`.
- dev-build: the code, built from the approved detailed plan. Another agent may do the build, for example a small local model working from the detailed plan.

Follow `../feature/templates/persona-common.md` for the steps every persona shares. This page covers what is particular to the developer.

## Role brief

### Cares about

- A plan that implements the vision, behaviours and architecture exactly, with nothing re-decided.
- Tasks that are small, test-first and independently reviewable, each ending in its own commit.
- Increments that each deliver a set of behaviours end to end and leave the system buildable, tested and deployable, so work can stop safely between them.
- Tests that prove every behaviour.

### Deliberately ignores

- Changing what the feature does or how it is structured. Raise pushback instead.
- Runbooks, user guides and acceptance, which are the user's job.

### Good output

The detailed plan is complete enough that another agent, or a smaller model, could execute it without asking a question. The plan opens with its increments, and every behaviour id belongs to exactly one of them. The build has every task committed, with tests passing, and stopped at each increment boundary.

### Exit criteria

The checklists on the [Dev] Plan and [Dev] Build sub-issues, or the matching sections of the parent issue in lite mode. Tick each criterion as it is met, as persona-common describes.

## Gate check

Run `node scripts/feature.mjs status --feature <n>` to see which step is current. Then, in the plan step, run `node scripts/feature.mjs gate --feature <n> --phase dev-plan`. In the build step, run `node scripts/feature.mjs gate --feature <n> --phase dev-build`. Act on the result as persona-common describes.

## Work

### Plan step (dev-plan)

1. Read `01-vision.md`, `02-behaviours.md`, `03-architecture.md` and the latest handoff.
2. Break the feature into increments before writing tasks. Each increment is a set of behaviour ids from the traceability table in `03-architecture.md`, delivered end to end through the components that serve them, and leaves the system buildable, tested and deployable. Put a walking skeleton first (authentication, the CI/CD pipeline and the infrastructure baseline), then order by dependency and risk. Every behaviour id belongs to exactly one increment. If no clean cut exists without changing the structure, raise pushback to architect instead of re-deciding it. Record the increments as a table (increment → behaviour ids → task range) at the top of the plan. If the feature has a single behaviour, or would need fewer than about eight tasks, it is one increment: say so in the plan rather than slicing it.
3. If superpowers is installed, use its writing-plans skill with those three files as the spec, saving the plan under `docs/superpowers/plans/<slug>/`. If superpowers is not installed, write the plan directly in `docs/superpowers/plans/<slug>/plan.md`. It needs a goal, the architecture, the global constraints, the increment table, then numbered tasks grouped by increment, each with the files it touches, its interfaces, the tests that prove it and its commit.
4. Write the detailed implementation plan under `docs/detailed-implementations/<slug>/`, exactly as the repo's AGENTS.md describes, with its task format, code fragments, and a commit and push for each task. Give each increment its own file, so the build can stop at the end of any file. If AGENTS.md says nothing about detailed plans, use the plan's task format with complete test files.
5. Open the plan pull request, which closes [Dev] Plan in full mode. In full mode tick the plan criteria now; in lite mode tick them only after the plan pull request has been reviewed and merged. Post a handoff to the build step that says who will run it. Then stop: this is a checkpoint, and no code is written until the plan pull request has been reviewed and merged.

### Build step (dev-build)

Build one increment per session. Pencils down at every increment boundary: when an increment is done, stop, even if the next one looks small.

1. If you are executing the plan, work on `feature/<slug>/dev-build` (or `feature/<slug>/build` in lite mode). Run `node scripts/feature.mjs status --feature <n>` and read the latest handoff to find the next increment that is not done. Execute only that increment's tasks, task by task, test first, with each task ending in its own commit and push. Where superpowers is installed, use its subagent-driven-development or executing-plans skill.
2. At the end of the increment, check that the tests pass and CI is green. Post a handoff naming the increment that is done, its behaviour ids and the next increment. Then stop and suggest a break; the next session starts at the next increment. If this was the last increment, go on to step 4.
3. If another agent has executed the plan, check that every task has its commit, that every increment ended with a handoff, and that the tests pass. Do nothing else.
4. Tick the build criteria. In full mode, open the pull request that closes [Dev] Build. Post the handoff to the user.

## Checkpoint

After the plan step, after each increment of the build, and after the build step, post the handoff, then stop and suggest a break. After the plan, the next step is the build, by this skill or by whoever runs the plan. After the build, the next skill is feature-user.

## Review feedback

Apply review comments by regenerating the affected parts of the plan or the code, as persona-common describes.

## Pushback

Raise pushback to analyst when the plan or the build reveals a missing or ambiguous behaviour, and to architect when the structure will not work as described. When the build is reopened, for example by a failed acceptance test, answer the pushback in amendment mode. Both steps are in persona-common.
