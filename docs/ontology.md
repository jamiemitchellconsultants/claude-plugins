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
| `Skill` | `name`, `description` | A Claude Code skill shipped by a `Plugin`: a `SKILL.md` plus its `assets/` and `scripts/`. The only plugin skill today is `init-repo`; the persona skills belong to the `LifecycleKit` and are copied into each `TargetRepository` instead of being loaded from the plugin. |
| `TargetRepository` | `path`, `name`, `description`, `owner`, `stack` | The local git repository the `Baseline` is applied to (the `--target` of `init-files.mjs`), and its `GitHub` counterpart (the `--repo` of `apply-github-settings.sh`). |
| `Baseline` |  | The standard set of pieces applied to a `TargetRepository`: `SteeringFile` and `PointerFile`s, `ProjectNarrative`, `OntologyKit`, the AI-fingerprint check, the .NET build workflow (for `Stack` dotnet only), CODEOWNERS, the `LifecycleKit`, and the `GitHub` settings. |
| `SteeringFile` |  | The canonical `AGENTS.md` at the root of a `TargetRepository`, rendered from `assets/AGENTS.md.tmpl`. The `OntologyKit` installer splices its Ontology protocol section into it. |
| `PointerFile` |  | A thin per-agent instruction file (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `.windsurf/rules/`, `.clinerules/`) that only directs the agent to the `SteeringFile`. |
| `Feature` | `number`, `slug`, `mode`, `owner` | A unit of product work in a `TargetRepository`, taken through every `Phase` in order. Its status lives on a parent `GitHub` issue labelled `feature` whose body starts with the marker `<!-- feature: slug=<slug> mode=<mode> -->`; its content lives in `docs/features/<slug>/`. |
| `Phase` | `id`, `title`, `label`, `exitCriteria` | One stage of a `Feature`, owned by a `Persona`. In `FeatureMode` full it is a sub-issue of the parent issue whose body starts with `<!-- feature-phase: <id> -->` and holds the exit-criteria checklist; in lite it is a `###` section of the parent issue's checklist. |
| `PersonaSkill` | `name`, `description` | A portable `SKILL.md` for one `Persona` (`feature-po`, `feature-analyst`, `feature-architect`, `feature-dev`, `feature-user`), part of the `LifecycleKit`. It opens with a role brief, checks the `Gate`, generates its `FeatureArtefact`, posts a `Handoff` and stops. |
| `Handoff` |  | The templated comment a `PersonaSkill` posts on the parent issue at the end of its `Phase`: artefact link, summary, questions and assumptions passed on, decisions recorded, side issues parked. |
| `Pushback` |  | A later `Persona` reopening an earlier `Phase` because its artefact is wrong or incomplete. In full mode the earlier sub-issue is reopened and labelled `pushback`; in lite mode its section is unticked. It is resolved by an amendment PR. |
| `Gate` |  | The rule that a `Phase` may start only when every earlier phase is done, fully ticked and free of `Pushback`. Evaluated by `feature.mjs gate` in the skills and by the required `feature-gate` check on pull requests. |
| `SideIssue` |  | A `GitHub` issue labelled `side-issue` that records something noticed during a `Feature` without working on it. Its body starts `Side issue of #<n>, noticed during <phase title>.`; it is never a sub-issue, so it does not affect the current `Phase`. |
| `FeatureArtefact` |  | A generated document in `docs/features/<slug>/`: `01-vision.md`, `02-behaviours.md`, `03-architecture.md`, `05-runbook.md`, `05-user-guide.md`, `05-acceptance.md` in full mode, or the single `feature.md` in lite mode. |
| `ArchitectureDecisionRecord` |  | An ADR written by the architect for each significant decision, at `docs/adr/NNNN-<title>.md` numbered across the whole repository, linked from `03-architecture.md` and from the PR's Narrative sections. |
| `LifecycleKit` |  | The files `init-repo` owns and copies into a `TargetRepository`: every `PersonaSkill` plus the `feature` and `feature-park` skills (into `.claude/skills/`, `.agents/skills/` and `.kiro/skills/`), `scripts/feature*.mjs`, and `.github/workflows/feature-gate.yml`. |

---

## Enums

| Name | Values | Description |
| --- | --- | --- |
| `Stack` | `dotnet`, `none` | The `TargetRepository`'s technology stack, passed as `--stack`. Decides whether the .NET build workflow and the `no-build-check` label are part of the `Baseline`. |
| `FileOutcome` | `created`, `kept`, `updated` | What `init-files.mjs` reports for each `Baseline` file it considers. |
| `RepositoryLabel` | `narrative-required`, `no-build-check`, `feature`, `side-issue`, `pushback`, `gate-override`, `phase:po`, `phase:analyst`, `phase:architect`, `phase:dev`, `phase:user` | The `GitHub` pull-request labels `apply-github-settings.sh` creates. |
| `FeatureMode` | `full`, `lite` | How much GitHub ceremony a `Feature` carries: full (a sub-issue and PR per `Phase`) or lite (one issue, one `feature.md`, three PRs). |
| `Persona` | `po`, `analyst`, `architect`, `dev`, `user` | The role that owns a `Phase`. Each has its own `PersonaSkill`. |
| `PhaseId` | `po`, `analyst`, `architect`, `dev-plan`, `dev-build`, `user` | The id of a `Phase`, in order. The dev `Persona` owns two phases, so the plan is reviewed before any code is written. |

---

## Use Cases

| Name | Actor | Description |
| --- | --- | --- |
| `ApplyFiles` | Agent running the `init-repo` skill | Writes the `Baseline` files into a `TargetRepository` and runs the `ProjectNarrative` and `OntologyKit` installers. Supports `--dry-run`. |
| `ApplyGitHubSettings` | Agent running the `init-repo` skill, after the user agrees | Creates each `RepositoryLabel` (including the lifecycle labels), sets Actions workflow permissions, and protects the default branch (PR required, one code-owner approval, `ai-fingerprint` and `feature-gate` required, admins not enforced, no force-push or deletion). Supports `--dry-run`. |
| `StartFeature` | Feature owner, through the `feature` skill | Creates a `Feature`'s parent issue and, in full mode, one sub-issue per `Phase` linked to it, then the `docs/features/<slug>/` folder. Refuses a slug that an open feature already uses. |
| `ApplyLifecycleKit` | Agent running the `init-repo` skill | Copies the `LifecycleKit` into a `TargetRepository`, overwriting earlier copies. Runs as part of `ApplyFiles`, or alone with `--skills-only`. |

---

## Relationships

| From | Relationship | To | Cardinality |
| --- | --- | --- | --- |
| `Marketplace` | lists | `Plugin` | 1 → many |
| `Plugin` | provides | `Skill` | 1 → many |
| `Baseline` | appliesTo | `TargetRepository` | 1 → many |
| `PointerFile` | pointsTo | `SteeringFile` | many → 1 |
| `Feature` | hasPhase | `Phase` | 1 → many |
| `Phase` | ownedBy | `Persona` | many → 1 |
| `LifecycleKit` | partOf | `Baseline` | 1 → 1 |
| `Pushback` | raisedAgainst | `Phase` | many → 1 |
| `SideIssue` | parkedFrom | `Feature` | many → 1 |

---

## Business Rules & Invariants

- **`Skill`** — files under `assets/` are copies of mechanisms proven in a repository that uses them; when the mechanism changes there, the asset must be updated here too, or the next `TargetRepository` starts out stale.
- **`Baseline`** — is applied by running the installers, never by copying another repository, so that installer-owned scripts stay current and no other project's Narrative history or ontology is carried over.
- **`Baseline`** — GitHub settings are applied only after the user has explicitly agreed, because they change shared state.
- **`SteeringFile`** — is the only file that states agent rules; edits go here, not into a `PointerFile`.
- **`PointerFile`** — restates no rules, because a stale copy is worse than none: an agent cannot tell which copy is current.
- **`Feature`** — has exactly one owner, who is accountable from vision to acceptance whether they do a `Phase` themselves or orchestrate colleagues or agents.
- **`Feature`** — issues are the source of truth for status and files for content; there is no separate state file.
- **`Phase`** — the current phase is the first one that is not done: an open sub-issue in full mode, a section with an unticked box in lite mode.
- **`PersonaSkill`** — never tells anyone to change an artefact by hand; review feedback and `Pushback` are applied by re-running the skill.
- **`PersonaSkill`** — never starts the next `Phase` itself: every `Handoff` is a checkpoint that stops and suggests a break.
- **`Gate`** — can be bypassed only by the `gate-override` label on a pull request, with the reason in its Narrative sections; the admin merge override does not open a gate.
- **`Gate`** — an error reading GitHub never counts as an open gate.
- **`FeatureArtefact`** — is generated from prompts and never changed by hand.
- **`LifecycleKit`** — is overwritten on every run of `init-files.mjs` (reported `updated`), unlike the rest of the `Baseline`; changes belong in this marketplace's assets.
