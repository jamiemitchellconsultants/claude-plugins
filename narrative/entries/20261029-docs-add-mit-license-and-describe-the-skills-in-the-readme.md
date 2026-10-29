---
date: 2026-10-29
slug: docs-add-mit-license-and-describe-the-skills-in-the-readme
title: "docs: add MIT license and describe the skills in the README"
summary: "License the repository under MIT and make it public. The README now lists every skill with its purpose."
kind: product
status: accepted
sequence: 2026-10-29T09:14:18.000Z
evidence: "https://github.com/jamiemitchellconsultants/claude-plugins/pull/5; merge commit a14d29cea5d07145e51d877a27347eaec7a850e0"
---

## Context

The marketplace was private, so installing the plugin needed read access to the repo. It had no
licence, and its README said little about what each skill does. Opening it up needs both a
licence and a README a stranger can read.

## Decision

License the repository under MIT and make it public. The README now lists every skill with its
purpose. Branch protection stays as it is: one code-owner approval, `ai-fingerprint` required,
and `enforce_admins` off so the owner can override. Apache-2.0 was considered and not chosen,
because MIT is shorter and the project has no patent concerns.

## Consequences

Anyone can install, fork and reuse the plugin. The commit history, including author emails, is
now public. The `init-repo` dependency notes still assume local checkouts under
`~/RiderProjects`, with flags to override them.

---

AI-Fingerprint: sha256:eb443d3a0bc6

🤖 Generated with [Claude Code](https://claude.com/claude-code)
