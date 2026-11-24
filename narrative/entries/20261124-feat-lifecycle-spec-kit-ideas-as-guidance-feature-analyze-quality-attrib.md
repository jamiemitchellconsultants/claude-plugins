---
date: 2026-11-24
slug: feat-lifecycle-spec-kit-ideas-as-guidance-feature-analyze-quality-attrib
title: "feat(lifecycle): Spec Kit ideas as guidance: feature-analyze, quality attributes, priority"
summary: "Adopt the ideas as guidance, with no enforcement. - The consistency review is an advisory skill (`feature-analyze`), run when wanted and suggested once at the architect checkpoint."
kind: product
status: accepted
sequence: 2026-11-24T06:30:00.000Z
evidence: "https://github.com/jamiemitchellconsultants/claude-plugins/pull/14; merge commit 341873ffd64501265ad25423efd58451a4dc863c"
---

## Context

The exit criteria are ticked by the agent doing the work, and nothing checks the artefacts against each other, so drift between the vision, behaviours, architecture, plan and acceptance goes unnoticed until it becomes code. Several things were also left to the agent:
- the analyst's uncertainty list depended on what it happened to notice;
- non-functional requirements had no owner;
- increment order was decided at planning;
- nothing marked tasks whose order doesn't matter.

Spec Kit covers each of these. The owner's tooling principles rule out the usual way of enforcing them: low friction (nothing new may block) and readable documents (no fixed layouts for a checker).

## Decision

Adopt the ideas as guidance, with no enforcement.

- The consistency review is an advisory skill (`feature-analyze`), run when wanted and suggested once at the architect checkpoint.
- The analyst owns quality attributes and the user's acceptance proves them. Priority lives in the document body, because PR 12's frontmatter check rejects unknown keys.
- The `[P]` marker lives in feature-dev rather than the `AGENTS.md` task format, because `init-repo` overwrites the kit on every run but never rewrites an existing `AGENTS.md`.

Rejected alternatives:
- a `feature.mjs analyze` script or a CI step, because it would force fixed formats and could block;
- a review step at every checkpoint, which adds friction even when there's nothing to find;
- giving quality attributes to the product owner (too coarse) or the architect (the builder would decide what's required);
- putting `[P]` in both `AGENTS.md` and the skill, which leaves two copies of one rule.

## Consequences

- Drift and gaps can be found on demand, but nothing guarantees anyone looks.
- Quality attributes are traced and accepted like behaviours, without entering any gate.
- Increment order now follows the spec's priorities.
- Existing target repos get all of this on their next `init-repo` run, because the kit is overwritten.

Deliberately left open:
- whether P3 behaviours may be dropped (today priority only sets the order);
- whether every quality attribute can be checked in a local build;
- the deferred wording minors listed above.

---

AI-Fingerprint: sha256:a7345219c9de

🤖 Generated with [Claude Code](https://claude.com/claude-code)
