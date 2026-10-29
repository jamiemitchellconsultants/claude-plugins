# Feature lifecycle persona skills — design

Date: 2026-10-29
Status: draft for review

## Intent and the why

James takes every feature through five roles he has held in his career: product owner, analyst, architect, developer and user. He recognises these roles because he has done the jobs, but in practice he goes straight from idea to code without explicit checkpoints. That causes two problems:

1. **Exhaustion.** Nothing marks the natural stopping points, so he doesn't take recovery breaks.
2. **Drift into side work.** When he notices a side issue he chases it, instead of recording it, and ends up running too many things at once.

His colleagues' work has no visible boundaries between roles at all, so what they produce is hard to share within the team and across the wider organisation. Some colleagues are strong in particular roles. Making each role's boundaries explicit helps them develop the roles they are weaker in.

The team works **100% AI-generated**. Code, architecture, design, UI, IaC, CI/CD and documentation are all produced from prompts, and no artefact is ever edited by hand. The human contribution is steering and judgement. The team uses Claude Code, Codex, Kiro and opencode, in that order of precedence. Each feature has one owner, who either does each role's work or orchestrates it, and orchestration can be of colleagues, of AI agents, or of both. The team reviews each other's work.

## Goals

- Make each role a named stage with a recognisable artefact, so anyone can follow a feature from its GitHub issues without having been in the room.
- Make each handoff between roles a **visible checkpoint** and a **default stopping point** that suggests a break.
- **Enforce the order of the phases.** A phase cannot start until the previous one is done.
- Let a later role **push back** to an earlier phase, and make that visible.
- Offer a **lite mode** for small features. It keeps the roles and the checkpoints with less ceremony.
- Make **parking a side issue cheaper than chasing it**.
- Teach the role: each persona skill briefly sets out what the role cares about, what it deliberately ignores, and what good output looks like.
- Make resuming cheap: one command says where a feature is and what comes next.
- Work in all four agents from one set of source files.

## Non-goals (v1)

- A local-only or offline fallback. Each feature requires a GitHub remote and the `gh` CLI.
- Automatic syncing of skill copies between repos.
- Hooks, a SessionStart reminder, or any other agent-specific automation.
- Recording prompts or steering separately. `ProjectNarrative` is the decision record, and ADRs record architecture decisions in more depth.
- Enforcing breaks. The gates enforce the order of the phases. A break is always a recommendation.

## Anti-goals

- Duplicating superpowers. The developer phase hands off to superpowers rather than reimplementing planning, TDD or review.
- Any skill that tells a person to hand-edit an artefact. Review feedback and pushback are both applied by re-prompting.
- Anything that relies on slash commands or Claude-only features to work.

## Constraints

- **Format:** each skill is a folder containing a `SKILL.md`. Its frontmatter is `name` and `description` only, and `name` matches the folder name, because opencode rejects mismatches.
- **Invocation differs per agent.** Claude Code and Kiro support `/name`. Codex uses `$name` mentions or matching against the description. opencode matches the description through its skill tool. So each `description` must say precisely when the skill applies, for example "Use when acting as the analyst on a feature".
- **GitHub access is through the `gh` CLI only**, never the GitHub MCP, because every agent can run a shell command.
- **Superpowers is a soft dependency.** The developer skill uses superpowers' writing-plans where it is installed, and gives plain fallback instructions where it is not.
- **Copies live in each repo:** the skills are committed into every `TargetRepository` and installed there by `init-repo`.
- The **existing repo conventions apply to every phase PR**: the `AI-Fingerprint:` footer, the `narrative-required` label and its three sections on decision-bearing PRs, the ontology protocol, and a code-owner review.

## What the user decided

### Roles and their skills

There are five persona skills, one orchestrator, and one parking skill. (The names are my call; see "Calls I made".)

| Skill | Role | Produces (in `docs/features/<slug>/`) |
| --- | --- | --- |
| `feature` | Orchestrator | Starts a feature (full or lite); reports status and the next step; resumes; records pushback |
| `feature-po` | Product owner | `01-vision.md`: problem, users, outcomes, success measures, scope and out-of-scope. Research is delegated to the agent. |
| `feature-analyst` | Analyst | `02-behaviours.md`: system behaviours as Given/When/Then scenarios, with uncertainties resolved one question at a time. Also updates the target repo's ontology. |
| `feature-architect` | Architect | `03-architecture.md`: structure, components, deployment. Each component traces back to the behaviours it serves. Significant decisions get explicit ADRs. |
| `feature-dev` | Developer | Works in two steps, each with its own checkpoint. **Plan:** hands `01`–`03` to superpowers writing-plans as the spec, writes the detailed implementation plan following the target repo's convention, then stops. **Build:** executes the detailed plan. |
| `feature-user` | User | `05-runbook.md`; `05-user-guide.md`; `05-acceptance.md`, which gives each behaviour in `02-behaviours.md` a scripted walkthrough and an executable acceptance test; and the executable tests themselves |
| `feature-park` | Any role | Files a side issue and returns the user to the current phase |

### The flow (full mode)

1. **Start.** The `feature` skill, asked to start a feature, creates:
   - a parent issue `Feature: <name>`, labelled `feature` and assigned to the owner;
   - six sub-issues, `[PO] Vision`, `[Analyst] Behaviours`, `[Architect] Structure`, `[Dev] Plan`, `[Dev] Build` and `[User] Docs & acceptance`, each labelled `phase:<role>` (both developer sub-issues are `phase:dev`) and containing that phase's exit-criteria checklist;
   - the folder `docs/features/<slug>/`.
2. **Gate check.** Before a persona skill does anything, it runs the gate check (see Enforced gates). If the gate is closed, it says why and stops.
3. **Each phase.** The persona skill:
   - opens with its role brief (what it cares about, what it ignores, what good output looks like, its exit criteria);
   - generates the artefact from the user's prompts and answers;
   - opens one PR for the phase with `Closes #<sub-issue>` in the body.
4. **Checkpoint.** Once the PR is open, the skill:
   - posts a handoff comment on the parent issue (template below);
   - **stops**, says this is a checkpoint, suggests a break, and names the next role.

   It never continues into the next phase on its own.
5. **Review.** A colleague reviews the PR. Review comments are written as steering. Re-running the same persona skill on the open PR regenerates the artefact from those comments, and nobody edits files by hand.
6. **Next phase.** The gate opens once the previous phase's PR has merged and every box on its exit-criteria checklist is ticked.
7. **Park, any time.** The `feature-park` skill creates an issue labelled `side-issue` with a link to the parent feature and the phase it was noticed in. It is deliberately not a sub-issue, so it does not affect phase detection. The skill then returns to the current phase's work.
8. **Resume.** The `feature` skill:
   - lists open features (open issues labelled `feature`);
   - for a chosen feature, reports the current phase (the first open sub-issue), whether that phase's PR is open, waiting for review or merged, any pushback, the side issues parked against the feature, and the next step.

**Where status and content live:** the issues are the source of truth for status, and the files are the source of truth for content. There is no separate state file.

### The developer phase

The developer phase is split into two sub-issues, so that the plan is reviewed before any code is written. This also means a different agent can run the build, for example opencode with superpowers and qwen, as the target repo's `AGENTS.md` intends.

1. **Plan.** `feature-dev` gives `01`–`03` to superpowers writing-plans as the spec. It then writes the detailed implementation plan under `docs/detailed-implementations/<slug>/`, following the target repo's `AGENTS.md` convention. It opens a plan PR that closes `[Dev] Plan`, posts a handoff comment and stops at a checkpoint.
2. **Build.** Once the plan PR has merged, the gate opens for `[Dev] Build`. Whoever executes the detailed plan follows its task-by-task commits on one phase branch: `feature-dev` in its build step, or another agent working directly from the plan. The PR on that branch closes `[Dev] Build`. When the executor is not running `feature-dev`, the owner runs `feature-dev` afterwards to open the PR and post the handoff.

### The user phase and acceptance

Acceptance has two layers for each behaviour in `02-behaviours.md`.

- **A scripted walkthrough.** These are numbered steps with an expected result for each, written for a person to follow. The person acting as user follows the script and records pass or fail for each step.
- **An executable acceptance test** that automates the same scenario. The person acting as user approves it only after their walkthrough has passed, so the executable test is checked against what they saw for themselves.

Both layers run in **two environments**: a local build, and the deployed environment described in `05-runbook.md`. `05-acceptance.md` records the results of the walkthrough and of the executable test for each behaviour in each environment, together with the date and the person who did the walkthrough.

Because the executable tests are code, the user-phase PR follows the target repo's usual build, test and ontology conventions. A failed walkthrough or test is recorded as pushback against the developer phase, or against an earlier phase if the behaviour itself is wrong.

### Pushback (reopening an earlier phase)

When a later role finds a problem that belongs to an earlier phase, for example a developer discovers a missing behaviour, it records pushback rather than deciding the question itself.

1. **Record it.** Any persona skill, or the `feature` skill, records pushback against the earlier phase:
   - it posts a pushback comment on that phase's sub-issue (template below), saying what is wrong, where it was found, and what it blocks;
   - it reopens the sub-issue and adds the `pushback` label;
   - it adds a "blocked by" note to the current phase's sub-issue.
2. **Earlier phase becomes current.** Phase detection still takes the first open sub-issue, so the reopened phase is now current and the gate for the later phase closes. The current phase's open PR, if it has one, stays open but cannot merge until the pushback is resolved.
3. **Fix by amendment.** The earlier persona skill is re-run in amendment mode. It regenerates only the affected parts of its artefact and opens an amendment PR that closes the reopened sub-issue. The handoff comment for an amendment lists which downstream items trace to what changed.
4. **Return.** Once the amendment merges, the gate reopens for the blocked phase. The `feature` skill lists the downstream artefacts that trace to the changed items, so the later role can regenerate them before carrying on.

Pushback is a checkpoint too. The skill stops after recording it and suggests a break.

### Lite mode

Lite mode is for small features. The owner chooses it when starting the feature.

- **One issue.** There is a parent issue only, with no sub-issues. Its body holds a single checklist with a section for each role, and each section has a shortened set of exit criteria.
- **One artefact.** `docs/features/<slug>/feature.md` has a section for each role (vision, behaviours, architecture, build notes, user docs) instead of separate files.
- **Three PRs.** A design PR covers the PO, analyst and architect sections. A plan PR holds the developer plans, so they are reviewed before any code exists. A build PR covers the code and the user section.
- **Roles and checkpoints are kept.** Each persona skill still opens with its role brief and still stops at the end of its role and suggests a break. In lite mode the handoff is a comment on the parent issue, not a PR.
- **Gates still apply,** worked out from the parent's checklist rather than from sub-issues.
- **Pushback** reopens nothing. It unticks the earlier role's section and posts a pushback comment on the parent issue.
- **Promotion.** The `feature` skill can promote a lite feature to full mode. It creates the sub-issues and splits `feature.md` into the numbered files.

### Enforced gates

The gates enforce the order of the phases in two places.

**In the skills.** Every persona skill runs the gate check first. The gate for a phase is open only when:
- every earlier phase's sub-issue is closed (in lite mode, every earlier section of the checklist is ticked);
- every earlier phase's exit-criteria checklist is fully ticked;
- no earlier phase carries the `pushback` label.

If the gate is closed, the skill names the unmet condition and the action that would meet it, then stops.

**In CI.** A new `feature-gate` workflow runs on every pull request:
- A PR that closes a phase sub-issue, or touches `docs/features/<slug>/`, is a phase PR. The check fails if that phase's gate is closed.
- Any other PR passes, so the check is safe to make required.

`apply-github-settings.sh` makes `feature-gate` a required check.

**Override.** A `gate-override` label on the PR makes the CI check pass. The PR body must give the reason in its Narrative sections, so every override shows up in the decision record. The skills have no override switch: anyone who needs to bypass a gate has to do it visibly, on GitHub.

Breaks are not gated. The checkpoint always suggests a break and never enforces one.

### Handoff comment template

```
## Handoff: <from role> → <to role>

**Artefact:** <link to file on the PR branch> (PR #<n>)
**Summary:** <2–4 lines>
**Questions passed to <to role>:** <list, or "none">
**Assumptions to challenge:** <list, or "none">
**Decisions recorded:** <links to the Narrative fragment and any ADRs>
**Side issues parked this phase:** <links, or "none">

Checkpoint reached. Next: <to role>, once PR #<n> has been reviewed and merged.
```

### Pushback comment template

```
## Pushback: <from role> → <earlier role>

**Problem:** <what is wrong or missing in the earlier artefact>
**Found while:** <what the later role was doing>
**Affects:** <items in the earlier artefact>
**Blocks:** <current phase sub-issue / PR>

Checkpoint reached. Next: re-run <earlier role> in amendment mode.
```

### ADRs

The architect phase writes an ADR for each significant architectural decision. ADRs are numbered across the whole repo and live in `docs/adr/NNNN-<title>.md`, so a decision that outlives the feature stays easy to find. `03-architecture.md` links to the ADRs it relies on. A decision-bearing architect PR still carries the Narrative sections, and they link to its ADRs: Narrative records that a decision was made and why it mattered, and the ADR holds the full reasoning and the alternatives considered.

### Distribution

- The skill sources live in this marketplace, under `init-repo`'s assets. They are not plugin skills, so Claude Code does not also load a user-wide copy alongside the repo copy.
- `init-repo` copies them into the `TargetRepository` at `.claude/skills/` (Claude Code), `.agents/skills/` (Codex and opencode) and `.kiro/skills/` (Kiro). They are real copies, not symlinks.
- Running `init-repo` again refreshes the copies, with the outcome reported as `updated`. These copies are owned by `init-repo`, unlike the adopter-owned files it never overwrites.
- `init-repo` also installs the `feature-gate` workflow.
- `apply-github-settings.sh`:
  - adds these labels: `feature`, `side-issue`, `pushback`, `gate-override`, and `phase:po`, `phase:analyst`, `phase:architect`, `phase:dev` and `phase:user`;
  - makes `feature-gate` a required check.

## Exit criteria per phase (the sub-issue checklists)

These are draft checklists. Each persona skill shows its own list and ticks the boxes as the criteria are met. Lite mode uses the criteria marked *(lite)*.

- **PO:**
  - the problem is stated in user terms *(lite)*;
  - the target users are named *(lite)*;
  - outcomes and success measures are listed;
  - scope and out-of-scope are explicit *(lite)*;
  - research findings are summarised with sources.
- **Analyst:**
  - every outcome is covered by at least one behaviour;
  - each behaviour is a Given/When/Then scenario *(lite)*;
  - no uncertainty is left unresolved (each one is either decided or explicitly deferred as out of scope) *(lite)*;
  - new domain terms are added to the target repo's ontology *(lite)*.
- **Architect:**
  - components are listed with their responsibilities *(lite)*;
  - every behaviour is served by at least one component;
  - deployment and runtime are described;
  - each significant decision has an ADR, linked from the Narrative sections *(lite)*.
- **Dev, plan:**
  - a superpowers plan exists *(lite)*;
  - the detailed implementation plan exists, following the target repo's convention *(lite)*.
- **Dev, build:**
  - every task in the detailed plan is executed and committed *(lite)*;
  - tests pass *(lite)*.
- **User:**
  - the runbook covers deploy, operate and recover;
  - the user guide covers each user-facing behaviour *(lite)*;
  - every behaviour has a scripted walkthrough and an executable acceptance test *(lite)*;
  - in a local build, every walkthrough has been followed and passed, and every executable test has been approved and passes *(lite)*;
  - in the deployed environment, every walkthrough has been followed and passed, and every executable test passes *(lite)*;
  - the results are recorded in `05-acceptance.md` *(lite)*.

## Changes to this repository

- **Skill sources:** add the seven skills as assets of `init-repo`.
- **`feature-gate` workflow:** add it as an `init-repo` asset.
- **`init-files.mjs`:** copy the skills into the three folders listed under Distribution, install the `feature-gate` workflow, and add a `--skills-only` mode.
- **`apply-github-settings.sh`:** create the new labels and make `feature-gate` a required check.
- **Ontology (`docs/ontology.ttl`):** add the new concepts before any code or skill text uses them:
  - feature, with a mode enum of full and lite;
  - persona, an enum of the five roles;
  - phase;
  - handoff;
  - pushback;
  - gate;
  - side issue;
  - feature artefact;
  - ADR;
  - the new label values, as additions to the `RepositoryLabel` enum.
- **`init-repo`'s `SKILL.md`:** document the new pieces of the `Baseline`.
- **`AGENTS.md.tmpl`:** add a short section telling agents that features follow the persona workflow, that the gates are enforced, and pointing them at the `feature` skill.

## Left to the builder

- The exact wording of each role brief and skill description, within the constraints above.
- How sub-issues are linked with `gh`, either the sub-issues REST API through `gh api` or GraphQL.
- The branch naming for phase and amendment PRs.
- How each skill computes and inserts the AI-fingerprint footer, which can reuse the commands in `AGENTS.md`.
- How the `feature-gate` workflow tells which phase a PR belongs to: the `Closes #` reference, the branch name, or the paths it touches.
- The ADR template, which should be short and conventional (context, decision, consequences, alternatives).
- **Verify** whether opencode loads duplicate skills, because it scans both `.claude/skills/` and `.agents/skills/`. If it does, adjust the install locations.

### Approvals

CODEOWNERS and branch protection stay as `init-repo` sets them today, and this work changes neither. James expects the close team to be added to CODEOWNERS, so that a colleague's approval counts. The admin override for merging stays available both before and after the team is added, because `enforce_admins` remains off. Until the team is added, the owner merges their own phase PRs with it, as `init-repo` already documents. The override for merging is separate from the `gate-override` label, which is the only way past the `feature-gate` check.

## Calls I made (for review)

1. **Skill names are prefixed with `feature-`** to avoid generic names such as `user` and `dev` colliding with other skills in any agent. The roles keep the short names you used.
2. **A phase's gate opens only after the previous PR merges** and its checklist is complete, so that review sits between every pair of roles.
3. **Explicit ADRs, repo-wide in `docs/adr/`,** linked from both `03-architecture.md` and the Narrative sections. ADRs record the depth of a decision, and Narrative records that it was made.
4. **Skill sources sit under `init-repo` assets, not as plugin skills**, so Claude does not load them twice.
5. **Re-running `init-repo` overwrites the skill copies**, unlike the other files it lays down.
6. **The user-phase artefacts are prefixed `05-`**, and the developer phase has no `04-` file, because its plans live where superpowers and `AGENTS.md` already put them.
7. **Skills-only refresh.** `init-files.mjs` gains a `--skills-only` mode that copies or refreshes the persona skills and the `feature-gate` workflow and does nothing else. Existing baseline repos can then adopt the skills without re-running the Narrative and ontology installers. The `AGENTS.md` section is printed for a manual merge.
8. **No backticked PascalCase terms in skill text, handoff or pushback comments.** The copies land as tracked Markdown in every target repo, where the ontology term check would reject terms that repo doesn't define. So the skills use plain lowercase words. The workflow concepts go into this repo's ontology only.
9. **Pushback uses amendment PRs** and the existing rule that the first open sub-issue is the current phase. No new state is needed, and an open PR in the later phase is blocked by the gate rather than closed.
10. **Lite mode has one issue, one file and three PRs** (design, plan, build), and can be promoted to full mode. The roles and checkpoints are kept, and only the GitHub ceremony is reduced. The plan PR stays even in lite mode, so plans are always reviewed before code.
11. **Gates are enforced in the skills and by a required CI check.** The only override is a `gate-override` label with its reason recorded in Narrative. There is no override switch in the skills, so bypassing a gate is always visible.
12. **The developer role has two sub-issues, both labelled `phase:dev`.** Phase detection still takes the first open sub-issue, and the developer role still has a single skill.
13. **A failed acceptance walkthrough or test is pushback**, recorded against the developer phase by default.
