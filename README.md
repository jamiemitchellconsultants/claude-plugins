# james-init-repo

A Claude Code plugin marketplace that ships one plugin, `james-init-repo`. Its `/init-repo` skill
sets up a repository with a standard baseline: agent instructions, a decision history, a
vocabulary check, pull-request guards, branch protection, and a set of persona skills that take a
feature from idea to acceptance.

## Install

```
/plugin marketplace add jamiemitchellconsultants/claude-plugins
/plugin install james-init-repo@james-plugins
```

Needs `node` and an authenticated `gh` on the machine.

## Skills

### `init-repo` (provided by the plugin)

Run `/init-repo` in a new or existing repository, or ask for "the usual setup". It lays down:

| Piece | What it does |
| --- | --- |
| `AGENTS.md` and pointer files | One canonical instruction file. `CLAUDE.md`, `GEMINI.md`, Copilot, Cursor, Windsurf and Cline files only point at it, so there is never a stale copy. |
| [Project Narrative](https://github.com/jamiemitchellconsultants/Narrative) | A review-first decision history: PRs labelled `narrative-required` carry three body sections, and a workflow turns them into `Narrative.md` entries on merge. |
| [Ontology kit](https://github.com/jamiemitchellconsultants/InternalOntology) | `docs/ontology.ttl` is the vocabulary source, `docs/ontology.md` is generated from it, and a CI check stops domain terms drifting. |
| AI-fingerprint check | Every PR body carries a hash of the branch diff, checked in CI. |
| .NET build workflow | Optional (`--stack none` skips it). Ignores docs-only changes and cancels superseded runs. |
| `CODEOWNERS` | Combined with branch protection, the code owner must approve every PR. |
| Feature lifecycle kit | The persona skills below, their gate scripts and the `feature-gate` workflow. |
| GitHub settings (opt-in) | Labels, Actions permissions, and protection on `main`: PR required, one code-owner approval, `ai-fingerprint` and `feature-gate` required, admin override kept, no force-push or deletion. |

Existing files are kept, not overwritten (except the lifecycle kit, which is refreshed each run),
and `--dry-run` shows what would change. `--skills-only` adds or refreshes just the lifecycle kit.
See [`skills/init-repo/SKILL.md`](skills/init-repo/SKILL.md) for the full procedure.

### Feature lifecycle skills (installed into your repo by `init-repo`)

Seven portable skills, copied into `.claude/skills/`, `.agents/skills/` and `.kiro/skills/` so
Claude Code, Codex, opencode and Kiro all find them. Each phase hands off through a GitHub issue,
and the `feature-gate` check stops a phase starting before the one before it is accepted.

| Skill | Use it to |
| --- | --- |
| `feature` | Start a feature, see where it is, resume it, record pushback against an earlier phase, or promote a lite feature to full mode. The entry point. |
| `feature-po` | Act as product owner: explore the idea, ask for research, set out the vision. |
| `feature-analyst` | Act as analyst: turn the accepted vision into system behaviours and drive out uncertainty. |
| `feature-architect` | Act as architect: define components, structure and deployment, and record architecture decisions. |
| `feature-dev` | Act as developer: write implementation plans from the accepted vision, behaviours and architecture, then build from the approved plan. |
| `feature-user` | Act as user: write the runbook and user guide, and run acceptance with scripted walkthroughs and executable tests locally and in the deployed environment. |
| `feature-park` | Record something outside the current phase (a bug, an idea, a refactor) as a side issue instead of working on it now. |

Every persona skill also handles review feedback and pushback for its own phase. See the
[design](docs/superpowers/specs/2026-10-29-feature-lifecycle-design.md).

## Dependencies

`init-repo` runs the Narrative and ontology-kit installers so their scripts stay current. It looks
for checkouts at `~/RiderProjects/Narrative` and `~/RiderProjects/InternalOntology`; pass
`--narrative` / `--ontology-kit` to point elsewhere. Narrative falls back to `npx` from GitHub.

## Contributing

`main` is protected: changes land through a pull request approved by the code owner (see
[`.github/CODEOWNERS`](.github/CODEOWNERS)). Read [`AGENTS.md`](AGENTS.md) before opening one.

## License

[MIT](LICENSE)
