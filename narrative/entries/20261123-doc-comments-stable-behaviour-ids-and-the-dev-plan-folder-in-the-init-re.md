---
date: 2026-11-23
slug: doc-comments-stable-behaviour-ids-and-the-dev-plan-folder-in-the-init-re
title: "Doc comments, stable behaviour ids and the dev plan folder in the init-repo baseline"
summary: "Require doc comments on every public type and member in the language's standard doc-comment format, with XML doc comments for C#, and make detailed-plan interfaces use that format."
kind: product
status: accepted
sequence: 2026-11-23T13:03:12.000Z
evidence: "https://github.com/jamiemitchellconsultants/claude-plugins/pull/10; merge commit b38cdcc9ae057373495c2b2a7c232a6d8fcc836d"
---

## Context

The baseline said nothing about code comments, so agents wrote whatever comments they liked, and detailed plans asked only for "member-level comments" with no format. Separately, behaviour ids were regenerated freely when pushback reopened the analyst, so anything that referred to an id (tests, commits, and planned source-graph links) could silently point at the wrong behaviour after an amendment. The `feature-dev` wording also left it unclear whether a plan written without superpowers still belonged under `docs/superpowers/plans/`.

## Decision

Require doc comments on every public type and member in the language's standard doc-comment format, with XML doc comments for C#, and make detailed-plan interfaces use that format. Enforce this by instruction only; build enforcement was rejected as a breaking change for existing repositories. Make behaviour ids permanent once published: never renumbered or reused, retired rather than deleted, and referenced as `<slug>#B<n>` outside their feature. Keep `docs/superpowers/plans/` as the plan folder with or without superpowers; a neutral `docs/plans/` folder was tried and reverted to keep existing plan locations.

## Consequences

Generated repositories document public code consistently, and detailed plans show the expected comments to the models that execute them, but nothing fails a build when a comment is missing. Behaviour ids can now be cited from tests, commits and a source knowledge graph without going stale after amendments, at the cost of ids no longer being in order within a group. Existing repositories need their `AGENTS.md` and persona skills refreshed to get these rules. The plan folder keeps a superpowers-specific name even when superpowers is not used.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

AI-Fingerprint: sha256:ce70f1267d01
