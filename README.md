# james-init-repo

Claude Code plugin providing the `/init-repo` skill: initialises a repository with a standard baseline (AGENTS.md and agent pointer files, Project Narrative, ontology kit, AI-fingerprint PR check, .NET build workflow, CODEOWNERS, branch protection) and the feature lifecycle kit.

## Feature lifecycle

`init-repo` also installs seven portable skills that take a feature through product owner, analyst,
architect, developer and user phases, with a GitHub issue per handoff and an enforced gate between
phases: `feature` (start, status, resume, pushback, promote), `feature-po`, `feature-analyst`,
`feature-architect`, `feature-dev`, `feature-user` and `feature-park`. They work in Claude Code,
Codex, opencode and Kiro. See the
[design](docs/superpowers/specs/2026-10-29-feature-lifecycle-design.md).

## Install

```
/plugin marketplace add jamiemitchellconsultants/claude-plugins
/plugin install james-init-repo@james-plugins
```

Requires read access to this repo and to `jamiemitchellconsultants/Narrative`, plus `node` and `gh` on the machine.
