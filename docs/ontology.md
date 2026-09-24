# claude-plugins — Application Ontology

<!-- GENERATED FROM ontology.ttl. Edit that file, not this one. -->

> **AI instructions:** Read this file in full before starting any task that touches domain
> concepts. To change it, edit `ontology.ttl` and run `node scripts/build-ontology.mjs`. This
> file must never lag behind the code. See the Ontology protocol section in this repository's
> agent-instruction file.

Every domain concept is named here exactly once, as a backticked PascalCase term. Code, specs,
plans and prose use those names; `ontology.ttl` is the source, this file and they are the
consumers. A term that appears in Markdown but not here fails the deterministic check in
`scripts/check-ontology-terms.mjs`.

**Delete the sections that do not apply to this repository from `ontology.ttl`**, and remove the
matching names from `sections` in `ontology.config.json`. An empty section is worse than an
absent one — the optional semantic reviewer treats an empty required section as a configuration
error.
---

## External Systems

| Name | What it is | Description |
| --- | --- | --- |
| `GitHub` | Repository host and CI | Hosts both this marketplace and every `TargetRepository`. Labels, Actions workflow permissions and branch protection are applied to it through the `gh` CLI. |
| `ProjectNarrative` | Deterministic, review-first decision history (jamiemitchellconsultants/Narrative) | Installed into a `TargetRepository` by its own installer (local checkout at `~/RiderProjects/Narrative`, falling back to `npx` from GitHub) so its scripts stay current. |
| `OntologyKit` | The InternalOntology kit: `docs/ontology.ttl` source, generated `docs/ontology.md`, and a CI term check | Installed into a `TargetRepository` by `bin/install-ontology.mjs` from a local checkout (default `~/RiderProjects/InternalOntology`); there is no remote fallback. |

---

## Entities

| Name | Properties | Description |
| --- | --- | --- |
| `Marketplace` | `name`, `owner`, `plugins` | The Claude Code plugin marketplace this repository is, declared in `.claude-plugin/marketplace.json` (name `james-plugins`). |
| `Plugin` | `name`, `version`, `description`, `author`, `source` | An installable Claude Code plugin listed by the `Marketplace`, declared in `.claude-plugin/plugin.json` (name `james-init-repo`). |
| `Skill` | `name`, `description` | A Claude Code skill shipped by a `Plugin`: a `SKILL.md` plus its `assets/` and `scripts/`. The only one today is `init-repo`. |
| `TargetRepository` | `path`, `name`, `description`, `owner`, `stack` | The local git repository the `Baseline` is applied to (the `--target` of `init-files.mjs`), and its `GitHub` counterpart (the `--repo` of `apply-github-settings.sh`). |
| `Baseline` |  | The standard set of pieces applied to a `TargetRepository`: `SteeringFile` and `PointerFile`s, `ProjectNarrative`, `OntologyKit`, the AI-fingerprint check, the .NET build workflow (for `Stack` dotnet only), CODEOWNERS, and the `GitHub` settings. |
| `SteeringFile` |  | The canonical `AGENTS.md` at the root of a `TargetRepository`, rendered from `assets/AGENTS.md.tmpl`. The `OntologyKit` installer splices its Ontology protocol section into it. |
| `PointerFile` |  | A thin per-agent instruction file (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `.windsurf/rules/`, `.clinerules/`) that only directs the agent to the `SteeringFile`. |

---

## Enums

| Name | Values | Description |
| --- | --- | --- |
| `Stack` | `dotnet`, `none` | The `TargetRepository`'s technology stack, passed as `--stack`. Decides whether the .NET build workflow and the `no-build-check` label are part of the `Baseline`. |
| `FileOutcome` | `created`, `kept`, `updated` | What `init-files.mjs` reports for each `Baseline` file it considers. |
| `RepositoryLabel` | `narrative-required`, `no-build-check` | The `GitHub` pull-request labels `apply-github-settings.sh` creates. |

---

## Use Cases

| Name | Actor | Description |
| --- | --- | --- |
| `ApplyFiles` | Agent running the `init-repo` skill | Writes the `Baseline` files into a `TargetRepository` and runs the `ProjectNarrative` and `OntologyKit` installers. Supports `--dry-run`. |
| `ApplyGitHubSettings` | Agent running the `init-repo` skill, after the user agrees | Creates each `RepositoryLabel`, sets Actions workflow permissions, and protects the default branch (PR required, one code-owner approval, `ai-fingerprint` required, admins not enforced, no force-push or deletion). Supports `--dry-run`. |

---

## Relationships

| From | Relationship | To | Cardinality |
| --- | --- | --- | --- |
| `Marketplace` | lists | `Plugin` | 1 → many |
| `Plugin` | provides | `Skill` | 1 → many |
| `Baseline` | appliesTo | `TargetRepository` | 1 → many |
| `PointerFile` | pointsTo | `SteeringFile` | many → 1 |

---

## Business Rules & Invariants

- **`Skill`** — files under `assets/` are copies of mechanisms proven in a repository that uses them; when the mechanism changes there, the asset must be updated here too, or the next `TargetRepository` starts out stale.
- **`Baseline`** — is applied by running the installers, never by copying another repository, so that installer-owned scripts stay current and no other project's Narrative history or ontology is carried over.
- **`Baseline`** — GitHub settings are applied only after the user has explicitly agreed, because they change shared state.
- **`SteeringFile`** — is the only file that states agent rules; edits go here, not into a `PointerFile`.
- **`PointerFile`** — restates no rules, because a stale copy is worse than none: an agent cannot tell which copy is current.
