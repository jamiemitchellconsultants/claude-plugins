---
name: feature-analyze
description: Use when checking a feature's artefacts against each other before moving on, such as after the architect phase and before planning, to find gaps, behaviour id mistakes, terminology drift, vague wording or contradictions without changing anything.
---

# Analyze a feature

This skill reviews a feature's artefacts against each other and reports where they disagree, so that drift is caught before it turns into the wrong work downstream. It is advisory. It changes no file, posts nothing and never blocks a phase. It is not a persona: it owns no phase and has no gate, so it can be run at any phase, as often as is useful.

Read the artefacts as prose. Any reasonable layout is fine, so never ask for headings or tables to be reshaped to make them easier to check.

## Steps

1. Find the feature. If the user has not said which one, run `node scripts/feature.mjs status` and ask. Then run `node scripts/feature.mjs status --feature <n>` for its slug, its mode and its current phase.
2. Read whatever exists so far:
   - in full mode, `01-vision.md`, `02-behaviours.md`, `03-architecture.md` and the ADRs it links, and the `05-` files, all under `docs/features/<slug>/`;
   - in lite mode, the sections of `docs/features/<slug>/feature.md`;
   - in either mode, the plans under `docs/superpowers/plans/<slug>/` and `docs/detailed-implementations/<slug>/`, and the repo's ontology.

   Review only what exists. A feature in the analyst phase has no architecture yet, so never report a later artefact as missing.
3. Look for these kinds of finding across the artefacts that exist:
   - **Coverage**: an outcome with no behaviour; a behaviour id with no component, no increment, or no walkthrough and acceptance test; an increment or task that serves no behaviour.
   - **Id hygiene**: a behaviour id used downstream that does not exist or has been retired; an id that was reused or renumbered; a behaviour whose meaning changed but kept its id.
   - **Terminology drift**: a domain term that differs from the ontology's name for it, or one term used with two meanings.
   - **Ambiguity**: vague or unmeasurable wording in an outcome or a behaviour, such as "fast", "secure" or "as appropriate", and scenarios a developer could not write a test from.
   - **Contradiction**: artefacts that disagree, or a later artefact that quietly re-decides an earlier one, such as its scope, its structure or a recorded decision.
4. Report in chat, most important first. For each finding, give the artefacts and the places involved, what is wrong, and the role whose skill owns the fix. Mark each one **before next phase** when it will turn into wrong work downstream, or **worth a look** otherwise. Keep to about ten findings; if there are more, say how many were left out. If nothing is found, say so in one line.
5. Offer the existing routes for any finding the user wants acted on: pushback to the earlier phase that owns it, as the feature skill's Recording pushback describes; review feedback on an open pull request; or feature-park for something outside the feature. Take none of them unless the user asks.

## What it never does

- Change an artefact. A fix comes from re-running the skill of the role that owns it, as the ground rules require.
- Tick a criterion, post a handoff, or stop a phase from starting.
