---
date: 2026-11-24
slug: feat-lifecycle-require-frontmatter-on-feature-artefacts-and-adrs
title: "feat(lifecycle): require frontmatter on feature artefacts and ADRs"
summary: "Require frontmatter that holds only facts that never change on feature artefacts, and frontmatter with status on ADRs, the one status no issue tracks. Enforce both in `feature-gate` and in a local `check-frontmatter` command."
kind: product
status: accepted
sequence: 2026-11-24T06:06:01.000Z
evidence: "https://github.com/jamiemitchellconsultants/claude-plugins/pull/12; merge commit 6807b6a089c631711a2de0f1d1b2ef9205b851b1"
---

## Context

The persona skills generate a lot of Markdown, but nothing machine-readable ties a document to its feature, phase or inputs. ADR status lived in a bullet list that nothing checked. Adding frontmatter without anything that reads it would only create fields that decay. Putting phase progress in frontmatter would duplicate the issue state, which AGENTS.md treats as worse than no copy.

## Decision

Require frontmatter that holds only facts that never change on feature artefacts, and frontmatter with status on ADRs, the one status no issue tracks. Enforce both in `feature-gate` and in a local `check-frontmatter` command. Superpowers plans and detailed implementation plans are deliberately left without frontmatter: superpowers controls its own output, and the detailed-plan header format is already prescribed.

Rejected alternatives: a blanket "add frontmatter" instruction with no check, and progress fields (status, completion) in feature artefacts.

## Consequences

Artefacts can be traced to their feature and inputs by tooling, and an ADR's supersession is explicit. Existing features need their frontmatter added on the next PR that touches them. Whether a source actually exists, and whether its content matches, is deliberately not checked.

---

AI-Fingerprint: sha256:58533b5e586e

🤖 Generated with [Claude Code](https://claude.com/claude-code)
