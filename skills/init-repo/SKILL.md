---
name: init-repo
description: >
  Initialise a repository with James's standard baseline: a canonical AGENTS.md plus thin pointer
  files for the other AI agents, Project Narrative, the ontology kit, the AI-fingerprint PR check,
  a docs-skipping .NET build workflow, CODEOWNERS, the feature lifecycle persona skills with their
  feature-gate check, and GitHub branch protection requiring a code-owner approval. Use whenever the user wants to set up, bootstrap, initialise, scaffold or
  "apply the usual setup to" a new or existing repo, asks for the same setup as EventBooking or
  JointBooking, or invokes /init-repo — even if they only name one piece of it (for example "add
  narrative and protect main to this repo"), because the pieces depend on each other.
---

# init-repo

Applies the baseline that was worked out on EventBooking (mechanisms taken from JointBooking) so a
new repository does not need the setup redone by hand. The files come from this skill's `assets/`;
Narrative and the ontology kit come from their own installers so they stay current; the GitHub
settings are applied through `gh`.

## Why it is a skill and not a template repo

A GitHub template copies files only. It would miss the labels, branch protection, required check and
Actions permissions, it would freeze the Narrative and ontology scripts at the copy date, and it
would carry another project's Narrative history and ontology. Do not shortcut by cloning
EventBooking.

## 1. Gather inputs

Take what you can from the repo (directory name, README, git remote, `gh api user`); ask only for
what is missing:

- **Project name** and a **one-line description** (goes in `AGENTS.md`).
- **GitHub owner handle** for CODEOWNERS (`gh api user --jq .login` if the user is the owner).
- **Stack**: `dotnet` (default, adds the build workflow) or `none`.
- **Is the repo new and empty, or does it already have code and a protected `main`?** This decides
  how the baseline lands (step 5).
- Whether to also apply the **GitHub settings** now. They change shared state, so get an explicit
  yes before running step 4.

## 2. Apply the files

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/init-repo/scripts/init-files.mjs \
  --target <repo> --name <Name> --description "<one line>" --owner <handle> [--stack none] [--dry-run]
```

For a repo that already has the baseline and only needs the feature lifecycle kit added or
refreshed, run `node ${CLAUDE_PLUGIN_ROOT}/skills/init-repo/scripts/init-files.mjs --target <repo>
--skills-only`. It needs no other options, runs no installers, and prints the AGENTS.md section to
merge if the repo's AGENTS.md does not have it yet.

Run `--dry-run` first on an existing repo. The script never overwrites: it reports each file as
`created` or `kept`. If `AGENTS.md` already existed, merge the missing sections from
`assets/AGENTS.md.tmpl` by hand rather than replacing the user's instructions. It needs the
Narrative checkout (`~/RiderProjects/Narrative`, falls back to `npx` from GitHub) and the ontology
kit checkout (`~/RiderProjects/InternalOntology`); override with `--narrative` / `--ontology-kit`.

What it lays down, and why each piece exists:

| Piece | Why |
| --- | --- |
| `AGENTS.md` + pointer files | One canonical instruction file; every other agent's file only points at it, because a stale copy is worse than none. |
| Project Narrative (installer) | Deterministic decision history; the `narrative-required` label plus three PR body sections. |
| Ontology kit (installer) | `docs/ontology.ttl` is the source, `docs/ontology.md` is generated, and a CI term check stops vocabulary drifting. |
| `ai-fingerprint.yml` + PR template footer | Every PR body carries a hash of the branch diff. Narrative proposal PRs opened by `github-actions[bot]` on `automation/narrative-pr-*` are exempt; the bot cannot know the hash and its later body edit does not re-run the check. |
| `dotnet-build.yml` (.NET only) | Skips docs-only changes with `paths-ignore`, cancels superseded runs, `no-build-check` label as an opt-out. Deliberately not a required check: a path-filtered required check that never runs leaves a PR pending forever. |
| `CODEOWNERS` | With branch protection, requires the owner's approval. |
| Feature lifecycle kit | The persona skills (`feature`, `feature-po`, `feature-analyst`, `feature-architect`, `feature-dev`, `feature-user`, `feature-park`) copied into `.claude/skills/`, `.agents/skills/` and `.kiro/skills/` so Claude Code, Codex, opencode and Kiro all find them; `scripts/feature*.mjs`, which hold every gate rule; and the `feature-gate` workflow. Unlike everything else here it is **overwritten** on each run (reported `updated`), because the copies must match this marketplace. |

## 3. Replace the placeholder ontology

The installer seeds `Example*` rows. Replace them before committing, following
the ontology-setup skill's seeding guidance (InternalOntology repo, if available): record
vocabulary the repository already uses, do not design the domain. Edit `docs/ontology.ttl` (never
the generated `.md`), run `node scripts/build-ontology.mjs`, and drop entries from `sections.required` in
`ontology.config.json` that would otherwise be empty. If the repo has no code yet, seed only the
concepts its README names, and say in each description what is undecided. If the domain is truly
indeterminate, ask the user instead of inventing one.

Then verify, all three must pass:

```bash
node scripts/build-ontology.mjs --check
node scripts/check-ontology-terms.mjs
node ~/RiderProjects/Narrative/bin/narrative.mjs check
```

## 4. GitHub settings (only with the user's yes)

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/init-repo/scripts/apply-github-settings.sh --repo <owner/name> [--stack none] [--dry-run]
```

Creates the labels (including `feature`, `side-issue`, `pushback`, `gate-override` and the five
`phase:` labels), sets Actions workflow permissions (Narrative opens PRs), and protects the
default branch: PR required, one code-owner approval, `ai-fingerprint` and `feature-gate`
required, `enforce_admins` off so the owner can override the merge, no force-push or deletion. The branch must already exist on the
remote. Report what changed; you cannot see GitHub's UI, so rely on the script's output.

## 5. Land it

Commit in logical pieces (steering files, Narrative, ontology, workflows, CODEOWNERS), with the
repository's own commit conventions. Only commit, push and open PRs when the user asked for it.

- **Existing repo with a protected `main`:** branch, push, open a PR. The PR is mechanical, so no
  `narrative-required` label and delete the three Narrative sections from the body.
- **Brand-new empty repo:** the very first commit has to go straight to `main` (nothing to branch
  from and no protection yet). Push it, then run step 4, then work by PR from then on.

Every PR body needs the fingerprint footer, and supplying a body replaces the template, so carry it
yourself:

```bash
MB=$(git merge-base origin/main HEAD)
git diff "$MB" HEAD | shasum -a 256 | cut -c1-12     # macOS; sha256sum elsewhere
# footer line:  AI-Fingerprint: sha256:<12 hex>
```

Recompute after every push that changes `HEAD`. Lint the drafted body before creating the PR:
`node scripts/check-ontology-terms.mjs --also <body-file>`, since a backticked PascalCase term that
is not in the ontology fails CI.

## Things that will go wrong if forgotten

- The Narrative maintenance workflow fires on merge only. A decision-bearing PR needs the label and
  the three `## Narrative ...` sections before merge; it cannot be repaired afterwards.
- `Narrative.md` is generated. Merge conflicts in it are resolved by recompiling
  (`narrative compile`), never by hand.
- The owner cannot approve their own PR, so merging their own PRs needs the admin override.
- Repos created from this skill need the same upgrade path as the installers: re-run the ontology
  installer with `--force` to refresh its scripts; adopter-owned files are left alone.
- The older `/init-ontology` skill uses a different layout (`DevNotes/Ontology/`). This skill uses
  the kit's `docs/ontology.*`; do not run both.
- A persona skill or `scripts/feature*.mjs` changed inside a target repo is overwritten by the next
  `init-files.mjs` run. Make the change in this marketplace's `assets/lifecycle/` instead, then
  refresh with `--skills-only`.
- `feature-gate` becomes a required check in step 4. Install the kit (step 2) before applying the
  settings, or every pull request waits for a check that never runs.

## Keeping this skill current

The files in `assets/` are copies. When the mechanism changes in a repo that uses it (a workflow
fix, a new AGENTS.md rule), update the asset here too, or the next repo starts out stale.
