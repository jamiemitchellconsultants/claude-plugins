---
date: 2026-11-26
slug: feat-lifecycle-let-the-product-owner-talk-freely-before-directed-questio
title: "feat(lifecycle): let the product owner talk freely before directed questions"
summary: "Put an open \"Any more thoughts?\" loop before the directed questions, and keep the PO's words as an append-only last section of the vision."
kind: product
status: accepted
sequence: 2026-11-26T13:45:47.000Z
evidence: "https://github.com/jamiemitchellconsultants/claude-plugins/pull/17; merge commit 99dca11d7abd14f43234f1b0c9ade0d86b61a811"
---

## Context

The PO's first step asked directed questions until the problem, users and outcomes were clear. In practice those questions closed the vision capture too early: once the PO was answering "who are the users?", half-formed thoughts that fit no question were never said, and nothing kept what the PO said before it was sorted into the vision's sections.

## Decision

Put an open "Any more thoughts?" loop before the directed questions, and keep the PO's words as an append-only last section of the vision. We rejected keeping the raw words in the conversation only, because reviewers could not then check that nothing was lost. We also rejected a separate `00-raw-thoughts.md`, because it would touch the artefact list, the phase mapping, the frontmatter rules and their tests for little gain. The change is guidance only, with no new exit criterion, following the low-friction principle and the analyst-depth precedent.

## Consequences

Every target repo gets the loop on its next `init-repo` run. Visions get longer by one section, placed last so the five-minute read is not padded. Later roles read a section that is explicitly not the decided vision, so they must rely on the structured sections. What stays open: whether promotion from lite to full mode should protect the raw section, and whether contributions should be kept one entry each rather than joined.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

AI-Fingerprint: sha256:5c0d9ec46348
