# Analyst depth: uncertainty scan, quality attributes, priority and parallel tasks

## Intent

Four ideas borrowed from Spec Kit, each making the feature artefacts more complete without adding a gate:

- an uncertainty scan with fixed categories, so the analyst misses fewer questions;
- quality attributes (performance, security and the like) with an owner, traced and proved like behaviours;
- a priority on each behaviour, so increment order comes from the spec instead of being decided at planning;
- a `[P]` marker on detailed-plan tasks whose order does not matter.

## Guiding principles (James)

- **Low friction.** Guidance only. Nothing blocks.
- **Readable documents.** Additions are prose conventions, not forms.

## Goals and non-goals

- Goal: each idea lives in the skill of the role it belongs to, and reaches every target repo on its next `init-repo` run.
- Goal: feature-analyze reports where the new guidance was skipped.
- Non-goal: any new or changed exit criterion in `EXIT_CRITERIA`. The existing criteria keep their wording, and they talk about behaviours, so quality attributes add nothing to any gate.
- Non-goal: any new frontmatter key. PR 12's check rejects unknown keys.
- Non-goal: changing the task format in `AGENTS.md` or `assets/AGENTS.md.tmpl`.
- Anti-goal: the analyst phase turning into a long questionnaire.

## Decisions (James)

- The **analyst** owns quality attributes, and the **user's acceptance proves them**, as it proves behaviours.
- The `[P]` marker lives in **feature-dev's plan step**, not in the `AGENTS.md` task format (approach B below).

## Approaches considered (for the `[P]` marker)

- **A. In the `AGENTS.md` task format, here and in the template.** The task format's home, but `init-repo` writes `AGENTS.md` only when it is missing, so existing repos would never get it.
- **B. In feature-dev's plan step.** **Chosen.** The kit is overwritten on every run, so every repo gets it. The marker is optional, so an `AGENTS.md` that does not mention it stays correct.
- **C. Both.** Rejected: two copies of one rule, which `AGENTS.md` warns against.

Ideas 3 to 5 had one sensible home each: the skill of the role that owns them.

## Design

### Uncertainty scan (feature-analyst, Work step 2)

Before asking anything, scan the vision against these categories and list what is unclear in each:
- scope and user boundaries;
- domain entities and their terms (checked against the ontology);
- edge and error cases;
- quality attributes (see below);
- integrations and external systems;
- completion signals: how anyone will know an outcome is met.

Ask the user about the five uncertainties that would change the behaviours most, one at a time. Give each question a recommended answer the user can accept as it stands. For the rest, record the analyst's proposed decision in the uncertainty log, marked as the analyst's call, so the user can overturn it while reviewing. Deferring as out of scope is still a valid answer to any of them.

This keeps the existing criterion ("no uncertainty is left unresolved") met without asking more than five questions.

### Quality attributes (analyst writes, architect traces, user proves)

- **feature-analyst** adds a Quality attributes section to `02-behaviours.md` (the Analyst section in lite mode). Each attribute has an id (Q1, Q2 and so on), a measurable statement, and the outcome it serves, or "all". Q ids follow the same permanence rules as B ids: never renumbered or reused, retired rather than deleted, and written as `<slug>#Q<n>` outside the feature. Amendment-mode handoffs list Q ids added, changed and retired, as they do for B ids.
- **feature-architect** includes Q ids in the traceability table, against the components or mechanisms that meet them.
- **feature-dev** does not place Q ids into increments, because the existing criterion requires every behaviour id to be in exactly one increment, and Q ids are not behaviour ids. Instead, each increment row names the Q ids that its tasks must respect, and the tasks name the tests that measure them where a test can.
- **feature-user** writes an acceptance check for each Q id: executable where the attribute can be measured (a load test, an accessibility scan, a security check), otherwise a scripted inspection with an expected result. The check runs in both environments, and the results are recorded in `05-acceptance.md` beside the behaviours'.

### Priority (analyst writes, developer orders by it)

- **feature-analyst** gives each behaviour a priority in its heading or line: P1 (needed for the first usable release), P2 (wanted soon after) or P3 (would be nice). Priority can change in amendment mode without changing the behaviour id, because a change of priority is not a change of meaning.
- **feature-dev** orders increments as: walking skeleton first, then P1 behaviours, then P2, then P3, ordering by dependency and risk within each priority. Where a dependency forces a lower-priority behaviour earlier, say so in the increment table.

### The `[P]` marker (feature-dev, plan step 4)

A task may end its heading with `[P]` (`### Task N: <name> [P]`) when it touches no file that another unfinished task in the same increment touches, and uses nothing those tasks produce. It means only that order does not matter. Tasks are still executed one at a time, each with its own commit and push, unless the executor runs them in separate worktrees and merges them before the increment ends. Leaving a task unmarked is always correct.

### feature-analyze additions

- **Coverage**: a Q id with no component, or with no acceptance check.
- **Id hygiene**: the existing rules apply to Q ids too.
- **Contradiction**: increments ordered against behaviour priority with no reason given.

### Ontology (my call)

The ontology has no term for a behaviour yet. Add `Behaviour` (an observable system behaviour with a permanent B id), `QualityAttribute` (a measurable quality with a permanent Q id, owned by the analyst and proved in acceptance) and an enumeration `BehaviourPriority` (P1, P2, P3), with the id permanence rules as invariants. Regenerate `docs/ontology.md` in the same commit as the skill changes that use them.

### Tests

Following the style of the existing skill tests, add assertions that:
- the analyst skill names each scan category, the five-question limit, the recommended answer and the "analyst's call" record;
- the analyst names Q ids and the priorities;
- the architect's traceability includes Q ids;
- feature-dev orders by priority, keeps Q ids out of the one-increment rule, and defines `[P]` as order-independent with one commit per task;
- feature-user writes an acceptance check per Q id;
- feature-analyze names the new findings;
- `EXIT_CRITERIA` is unchanged.

## Left to the builder

The exact wording in each skill, where in each Work step the new text sits, and the exact form of the test assertions.
