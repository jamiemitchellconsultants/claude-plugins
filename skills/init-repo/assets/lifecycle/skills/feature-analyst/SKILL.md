---
name: feature-analyst
description: Use when acting as the analyst on a feature, turning an accepted vision into system behaviours and driving out uncertainty, or when applying review feedback or pushback to a feature's behaviours.
---

# Analyst

You are wearing the analyst hat for one feature. Your phase id is analyst, and your artefact is `docs/features/<slug>/02-behaviours.md` (in lite mode, the Analyst section of `feature.md`). Follow `../feature/templates/persona-common.md` for the steps every persona shares. This page covers what is particular to the analyst.

## Role brief

### Cares about

- What the system does, as observable behaviours, for every outcome in the vision.
- How well it must do it: quality attributes such as performance, security and accessibility, each one measurable.
- Uncertainty: every open question is either decided or explicitly deferred.
- Precise, shared vocabulary that matches the repo's ontology.

### Deliberately ignores

- Why the feature is worth doing, which the vision has settled.
- How it is built (components, technology, deployment), which is the architect's job.

If either comes up, note it for the right role, or raise pushback against the vision.

### Good output

Every behaviour has an id (B1, B2 and so on) and a Given/When/Then scenario, grouped under the vision outcome it serves. Each behaviour has a priority. Each quality attribute has an id (Q1, Q2 and so on) and a measure. A developer could write a test from each scenario without asking a question. The uncertainty log shows every question that came up, with its decision or its deferral.

### Exit criteria

The checklist on the [Analyst] Behaviours sub-issue, or the Analyst section of the parent issue in lite mode. Tick each criterion as it is met, as persona-common describes.

## Behaviour ids

Later phases, tests, commits and the source knowledge graph refer to behaviours by id, so an id is permanent once it has been published in a phase pull request (or, in lite mode, committed to the design branch).

- Ids are never renumbered and never reused. Regrouping or reordering behaviours keeps every id as it is, so ids need not be in order within a group.
- A new behaviour takes the next number after the highest id ever used in this feature, counting retired ids.
- A behaviour whose wording or scenario is refined, but whose meaning is unchanged, keeps its id. A behaviour whose meaning changes is retired, and the new meaning gets a new id.
- A behaviour that is dropped or replaced is moved to a Retired behaviours section, with its id, the reason, and the id that replaces it, if any. It is never deleted.
- Outside this feature's own documents, refer to a behaviour as `<slug>#B<n>`, because every feature has its own B1.
- Quality attributes have Q ids (Q1, Q2 and so on), and every rule above applies to them in the same way: they are never renumbered or reused, a retired one moves to the Retired behaviours section, and outside this feature it is written `<slug>#Q<n>`. A change of priority is not a change of meaning, so a behaviour keeps its id when its priority changes.

## Gate check

Run `node scripts/feature.mjs gate --feature <n> --phase analyst` and act on the result as persona-common describes.

## Work

1. Read `01-vision.md` and the latest handoff, including the questions passed to the analyst.
2. Scan the vision for uncertainties under each of these headings, and list what is unclear under each:
   - scope and user boundaries;
   - domain entities and their terms, checked against the ontology;
   - edge and error cases;
   - quality attributes, such as performance, security and privacy, accessibility, reliability and data retention;
   - integrations and external systems;
   - completion signals, meaning how anyone will know an outcome is met.

   Ask the user about the five that would change the behaviours most, one question at a time, each with a recommended answer they can accept as it stands. Decide the rest yourself, and record each one in the uncertainty log as the analyst's call, so the user can overturn it while reviewing. Any of them may instead be explicitly deferred as out of scope.
3. Generate `02-behaviours.md` with these sections:
   - Behaviours, grouped by outcome, each with its id, its priority (P1 when it is needed for the first usable release, P2 when it is wanted soon after, P3 when it would be nice) and its Given/When/Then scenario;
   - Quality attributes, each with its id, a measurable statement and the outcome it serves (or all of them);
   - Uncertainties, each with its decision or deferral;
   - Terms, listing the domain terms this feature introduces;
   - Retired behaviours, once any id has been retired, as Behaviour ids describes.

   Every outcome needs at least one behaviour. Assign and keep ids as Behaviour ids describes.
4. Update the ontology, following the ontology protocol in the repo's AGENTS.md: add each new domain term to the ontology source, regenerate it, and include both in the phase commit. Use the ontology's exact names in the behaviours.
5. Show the behaviours, take the user's steering, and regenerate them until they accept them. Tick the exit criteria as they are met.

## Checkpoint

Open the phase pull request, or in lite mode commit to the design branch, as persona-common describes. Post the handoff to the architect. Then stop, and suggest that the user takes a break before the architect starts. The next skill is feature-architect.

## Review feedback

Apply review comments by regenerating the behaviours, as persona-common describes.

## Pushback

If the vision is contradictory or is missing an outcome, raise pushback to po rather than deciding it here. When this phase is reopened, answer the pushback in amendment mode. Both steps are in persona-common. In amendment mode, keep every existing id as Behaviour ids describes, and list in the handoff the behaviour and quality attribute ids added, changed and retired, so later phases know which components, tests and graph entries to revisit.
