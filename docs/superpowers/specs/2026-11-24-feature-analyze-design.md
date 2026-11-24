# feature-analyze: an advisory cross-artefact review

## Intent

The exit criteria are ticked by the agent doing the work, and nothing checks the artefacts against each other. Drift between vision, behaviours, architecture, plan and acceptance goes unnoticed until it becomes code. Spec Kit's `/speckit.analyze` closes this gap with a read-only review; this borrows the idea.

## Guiding principles (James)

- **Low friction.** Nothing runs unless asked, and nothing blocks.
- **Readable documents.** The artefacts stay prose. No fixed headings, table shapes or markers are added for a checker's sake.

## Goals

- An on-demand review that reads every artefact a feature has so far and reports where they disagree.
- A nudge at the point where it pays off most: design complete, before planning.

## Non-goals and anti-goals

- No CI step and no gate. A finding never stops a phase or a merge.
- No script or parser, and no new `feature.mjs` subcommand. A script would pull the documents towards forms.
- It never edits an artefact. Fixes still go through re-running the owning role, as the ground rules require.
- Anti-goal: the review turning into a mandatory ceremony on every phase.

## Approaches considered

- **A. A review step at every checkpoint.** Always runs, nothing to remember, but adds a step to every phase even when there is nothing to find. Rejected: friction.
- **B. A separate `feature-analyze` skill, run on demand.** Zero cost unless called, but easy to forget.
- **C. B plus a one-line suggestion at the architect checkpoint and in the resume summary.** **Chosen**: B's zero cost, with a nudge rather than a rule against forgetting it.

## Design

### The skill

New skill `skills/init-repo/assets/lifecycle/skills/feature-analyze/SKILL.md`. It is not a persona: it owns no phase, has no gate check, no exit criteria and no checkpoint, so it sits with `feature` and `feature-park` rather than the persona skills.

It can be run at any phase. It:

1. Finds the feature (as persona-common's Finding the feature describes) and reads whatever exists of: `01-vision.md`, `02-behaviours.md`, `03-architecture.md` and the ADRs it links, the plans under `docs/superpowers/plans/<slug>/` and `docs/detailed-implementations/<slug>/`, and the `05-*` files. In lite mode, the sections of `feature.md` plus the plan folders. It also reads the repo's ontology.
2. Looks for these kinds of finding, only across artefacts that exist:
   - **Coverage**: an outcome with no behaviour; a behaviour id with no component, no increment, or no walkthrough and acceptance test; an increment or task that serves no behaviour.
   - **Id hygiene**: an id used downstream that does not exist or is retired; an id reused or renumbered; a meaning change that kept its id.
   - **Terminology drift**: a domain term that differs from the ontology, or is used with two meanings.
   - **Ambiguity**: vague or unmeasurable wording ("fast", "secure", "as appropriate") in outcomes or behaviours, and scenarios a developer could not write a test from.
   - **Contradiction**: artefacts that disagree, or a later artefact that quietly re-decides an earlier one (scope, structure, a recorded decision).
3. Reports in chat: a short list, most important first, each with the artefacts and places involved, what is wrong, and the role that owns the fix. At most about ten findings; if there are more, say how many were left out. Each finding is marked **before next phase** (it will turn into wrong work downstream) or **worth a look**. If nothing is found, say so in one line.
4. Offers the existing routes for anything the user wants acted on: pushback to the owning earlier phase, review feedback on an open pull request, or feature-park for something outside the feature. It does none of these unasked.

It reads the artefacts as prose, so any reasonable layout works. It reads, and calls `feature.mjs status` only to find the feature; it posts and changes nothing.

### The nudges

- **feature-architect, Checkpoint**: one sentence suggesting a feature-analyze run before planning starts.
- **feature skill, Where am I and resuming**: when the next skill is feature-dev or later, mention that feature-analyze is available.

### Housekeeping

- `init-repo` copies the new skill with the rest of the kit; update the kit's skill lists in `skills/init-repo/SKILL.md` and `README.md`.
- Ontology: the `LifecycleKit` definition names the non-persona skills, so add feature-analyze there and regenerate `docs/ontology.md`.
- Tests: the kit has the skill; its frontmatter passes the existing checks; it is not treated as a persona; it names no `feature.mjs` subcommand that writes (`tick`, `handoff`, `pushback`, `park` and so on); the architect checkpoint and the feature skill mention it.

## Left to the builder

The skill's exact wording, and the test assertions' exact form, following the existing tests in `skills/init-repo/tests/`.
