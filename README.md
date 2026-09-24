# james-init-repo

Claude Code plugin providing the `/init-repo` skill: initialises a repository with a standard baseline (AGENTS.md and agent pointer files, Project Narrative, ontology kit, AI-fingerprint PR check, .NET build workflow, CODEOWNERS, branch protection).

## Install

```
/plugin marketplace add jamiemitchellconsultants/claude-plugins
/plugin install james-init-repo@james-plugins
```

Requires read access to this repo and to `jamiemitchellconsultants/Narrative`, plus `node` and `gh` on the machine.
