# Feature lifecycle persona skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship seven portable persona skills, a deterministic feature script and a required `feature-gate` check as part of `init-repo`, so that every `TargetRepository` gets the feature lifecycle: GitHub issues for the handoffs, enforced gates, pushback, lite mode and parking side issues.

**Architecture:**
- **Deterministic logic is in Node scripts.** All feature state, gate and GitHub logic lives in three Node scripts that land in the target repo's `scripts/`:
  - `feature-lib.mjs`: the phase model, checklists, gate evaluation and PR classification;
  - `feature-gh.mjs`: the `gh` adapter;
  - `feature.mjs`: the command line.

  These scripts are what keeps behaviour identical across Claude Code, Codex, Kiro and opencode, and they keep the skill text thin.
- **Skills and CI call the script.** The skills are prose instructions that call `node scripts/feature.mjs`. The `feature-gate` workflow calls the same script.
- **`init-repo` owns the copies.** `init-files.mjs` copies the kit and overwrites it on every run.

**Tech Stack:**
- Node 20 ESM scripts using only built-in modules, matching the existing `init-files.mjs`;
- `node:test` for the tests;
- the `gh` CLI;
- GitHub Actions;
- Agent Skills `SKILL.md` files.

**Spec:** `docs/superpowers/specs/2026-10-29-feature-lifecycle-design.md`

**This plan is code-free by design.** Per `AGENTS.md`, it is the input for the detailed implementation plan under `docs/detailed-implementations/2026-10-29-feature-lifecycle/`. That plan adds the code fragments and complete test files. The test names and assertions below are binding on it.

## Global Constraints

- **Skill format:** each skill is a folder containing a `SKILL.md`, with frontmatter of exactly `name` and `description`, and `name` must equal the folder name.
- **Skill names:**
  - `feature`;
  - `feature-po`;
  - `feature-analyst`;
  - `feature-architect`;
  - `feature-dev`;
  - `feature-user`;
  - `feature-park`.
- **Every `description` starts "Use when"** and says precisely when the skill applies. No skill relies on slash commands.
- **GitHub access is through the `gh` CLI only.** Nothing uses the GitHub MCP.
- **No backticked PascalCase terms in any file under the lifecycle kit.** That covers skill text, templates, scripts' printed text and the workflow.
- **No skill instructs a person to hand-edit an artefact.** Review feedback and pushback are applied by re-running a skill.
- **Superpowers is a soft dependency.** `feature-dev` uses superpowers writing-plans where it is installed, and has a plain fallback where it is not.
- **Phase ids, in order:** `po`, `analyst`, `architect`, `dev-plan`, `dev-build`, `user`.
- **Sub-issue titles:**
  - `[PO] Vision`;
  - `[Analyst] Behaviours`;
  - `[Architect] Structure`;
  - `[Dev] Plan`;
  - `[Dev] Build`;
  - `[User] Docs & acceptance`.
- **Phase labels:**
  - `phase:po`;
  - `phase:analyst`;
  - `phase:architect`;
  - `phase:dev` (on both developer sub-issues);
  - `phase:user`.
- **Other labels:** `feature`, `side-issue`, `pushback` and `gate-override`.
- **Feature artefacts** go in `docs/features/<slug>/`:
  - full mode: `01-vision.md`, `02-behaviours.md`, `03-architecture.md`, `05-runbook.md`, `05-user-guide.md` and `05-acceptance.md`;
  - lite mode: `feature.md`.
- **ADRs** are at `docs/adr/NNNN-<title>.md`, numbered across the whole repo.
- **Exit-criteria text** is copied verbatim from the spec section "Exit criteria per phase". The items marked *(lite)* make up the lite checklist.
- **Where things land in the target repo:**
  - the skills go into `.claude/skills/`, `.agents/skills/` and `.kiro/skills/` as real copies, not symlinks;
  - the scripts go into `scripts/`;
  - the workflow goes into `.github/workflows/feature-gate.yml`.
- **Every commit and PR follows `AGENTS.md`:**
  - the ontology protocol before each commit;
  - an `AI-Fingerprint:` footer on the PR;
  - the `narrative-required` label and its three Narrative sections on the final PR, because it is decision-bearing.

## Review Focus

1. **A feature whose issues can't be read.** For example, `gh` is not authenticated, or the sub-issue API returns nothing. Expected: the gate reports an error and exits non-zero, and never reports the gate as open. *(Task 3)*
2. **Checklists ticked on GitHub with different formatting.** For example `[X]`, `* [x]`, or extra spaces. Expected: they still parse as ticked. *(Task 2)*
3. **Starting a feature whose slug already belongs to an open feature.** Expected: the start is refused, naming the existing issue, and nothing is created. *(Task 3)*
4. **A PR touching two features' folders, or closing a sub-issue from one feature while touching another's folder.** Expected: the PR is treated as a phase PR for each feature, and the check fails if any of those gates is closed. *(Task 2 and Task 5)*
5. **Re-running `--skills-only` on a repo where someone changed a skill copy, or targeting a folder that isn't a git repo.** Expected: the copy is overwritten and reported `updated`; a non-git target fails with the existing message. *(Task 10)*

---

### Task 1: Ontology for the lifecycle

**Files:**
- Modify: `docs/ontology.ttl`
- Modify (generated): `docs/ontology.md`

**Interfaces:**
- Consumes: the existing terms.
- Produces: the canonical names every later task uses in prose. The new entities are:
  - feature;
  - persona skill;
  - phase;
  - handoff;
  - pushback;
  - gate;
  - side issue;
  - feature artefact;
  - architecture decision record;
  - lifecycle kit (the files `init-repo` owns and copies).

  The new enums are:
  - feature mode: `full`, `lite`;
  - persona: `po`, `analyst`, `architect`, `dev`, `user`;
  - phase id: the six ids from Global Constraints.

  The task also adds the new label values to the `RepositoryLabel` enum, two new use cases (start feature, and apply lifecycle kit), and relationships (a feature has phases, a phase is owned by a persona, and the lifecycle kit is part of the `Baseline`).

- [ ] **Step 1: Run the term check on the spec with the new names backticked in a scratch copy, and confirm it fails.** Run: `node scripts/check-ontology-terms.mjs --also <scratch copy>`. Expected: FAIL, listing the undefined terms.
- [ ] **Step 2: Add the concepts to `docs/ontology.ttl`,** following the existing rows' style. Each description says where the concept lives (for example, "the parent issue labelled `feature`").
- [ ] **Step 3: Run `node scripts/build-ontology.mjs`, then `node scripts/build-ontology.mjs --check` and `node scripts/check-ontology-terms.mjs --also <scratch copy>`.** Expected: all three print OK.
- [ ] **Step 4: Commit:** `docs(ontology): add feature lifecycle concepts`.

### Task 2: Pure lifecycle library and the test runner

**Files:**
- Create: `skills/init-repo/assets/lifecycle/scripts/feature-lib.mjs`
- Create: `skills/init-repo/tests/feature-lib.test.mjs`
- Create: `.github/workflows/tests.yml`. It runs `node --test skills/init-repo/tests/` on every pull request and on pushes to `main`, using Node 20.

**Interfaces:**
- Produces (all named exports of `feature-lib.mjs`):
  - `PHASES`: an ordered array of `{ id, persona, title, label }`. Its values are exactly the Global Constraints ids, titles and labels.
  - `EXIT_CRITERIA`: an object keyed by phase id. Each value is an array of `{ text, lite }`, with the text taken verbatim from the spec.
  - `renderChecklist(phaseId, mode)` returns the Markdown lines `- [ ] <text>`. In `lite` mode it includes only the items marked lite.
  - `parseChecklist(markdown)` returns an array of `{ text, checked }` and ignores every line that is not a checkbox.
  - `renderParentBody({ name, slug, mode, owner })`:
    - starts with the marker `<!-- feature: slug=<slug> mode=<mode> -->`;
    - in full mode, lists the phases;
    - in lite mode, has one `### <title>` section per phase, each with that phase's lite checklist.
  - `renderSubIssueBody({ phaseId, parentNumber })` starts with the marker `<!-- feature-phase: <id> -->`, followed by the full checklist.
  - `parseParent(body)` returns `{ slug, mode }`, or `null` when the marker is absent.
  - `parseLiteSections(body)` returns an object keyed by phase id. Each value is an array of `{ text, checked }`.
  - `currentPhase(state)` returns the first phase id that is not done, or `null` when every phase is done. A phase is not done when:
    - in full mode, its sub-issue is open;
    - in lite mode, any of its section's boxes is unticked.
  - `evaluateGate(state, phaseId)` returns `{ open, reasons }`. Each reason names one unmet condition and the action that would meet it.
  - `classifyPr({ body, files, labels })` returns `{ phasePr, slugs, closes, override }`:
    - `slugs` comes from paths under `docs/features/<slug>/`;
    - `closes` comes from `Closes #N` (case-insensitive, and the `Fixes #N` and `Resolves #N` forms too);
    - `override` is true when the `gate-override` label is present.
  - `slugify(name)` returns lowercase kebab-case.
- **State shape:**
  - full mode: `{ number, slug, mode: 'full', subIssues: [{ phaseId, number, state, labels, body }] }`;
  - lite mode: `{ number, slug, mode: 'lite', body, labels }`.

Steps:

- [ ] **Step 1: Write the failing tests:**
  - `PHASES order and labels`: the ids, the titles and the labels equal the Global Constraints lists, and both developer phases carry `phase:dev`.
  - `lite checklist is the lite subset`: `renderChecklist('po','lite')` has 3 lines, and `renderChecklist('po','full')` has 5.
  - `parseChecklist tolerates formatting`: `- [x] a`, `* [X] b`, `-  [ ]  c` and a non-checkbox line produce three items with checked values true, true and false.
  - `parent marker round-trips`: `parseParent(renderParentBody(...))` returns the slug and mode it was given, and `parseParent('no marker')` returns `null`.
  - `currentPhase full`: with `po` closed and the rest open, it returns `analyst`. With everything closed, it returns `null`.
  - `currentPhase lite`: when the `po` section is fully ticked and `analyst` has one unticked box, it returns `analyst`.
  - `gate closed while earlier phase open`: `evaluateGate` for `architect` while `analyst` is open returns `open: false`, with a reason containing `[Analyst] Behaviours`.
  - `gate closed on unticked criterion`: when `po` is closed but has one unticked box, the gate for `analyst` is closed, and the reason quotes the unticked text.
  - `gate closed on pushback`: when an earlier sub-issue carries `pushback`, the gate is closed, and the reason mentions pushback.
  - `gate open`: when every earlier phase is closed and fully ticked, the result is `open: true` with no reasons.
  - `classifyPr two features` (Review Focus 4): a PR whose files are under two slugs returns both slugs and `phasePr: true`.
  - `classifyPr non-phase`: a PR with no matching files and no `Closes #N` returns `phasePr: false`.
  - `classifyPr override`: a PR with the `gate-override` label returns `override: true`.
- [ ] **Step 2: Run `node --test skills/init-repo/tests/feature-lib.test.mjs`.** Expected: FAIL with a missing module.
- [ ] **Step 3: Implement `feature-lib.mjs` with the exports above.** It is pure: no I/O and no `gh` calls.
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Add the workflow `tests.yml`.**
- [ ] **Step 6: Commit:** `feat(lifecycle): pure feature phase and gate library`.

### Task 3: gh adapter and the feature command line (start, status, gate)

**Files:**
- Create: `skills/init-repo/assets/lifecycle/scripts/feature-gh.mjs`
- Create: `skills/init-repo/assets/lifecycle/scripts/feature.mjs`
- Create: `skills/init-repo/tests/feature-cli.test.mjs`

**Interfaces:**
- Consumes: Task 2's exports.
- Produces, from `feature-gh.mjs`: `makeGh(runner)`.
  - `runner(args: string[]) → string` is the stdout of one `gh` call. The default runner runs `gh` with `execFileSync`, throws on a non-zero exit, and adds a hint to authenticate with `gh` first.
  - It returns:
    - `createIssue({ title, body, labels, assignee }) → number`;
    - `addSubIssue(parentNumber, childNumber)`, which uses the sub-issues REST API through `gh api`;
    - `listFeatures() → [{ number, title, body }]`: the open issues labelled `feature`;
    - `loadFeature(number) → state`, in Task 2's shape;
    - `comment(number, body)`;
    - `reopen(number)`;
    - `addLabels(number, labels)`;
    - `editBody(number, body)`.
  - It creates no labels, because labels belong to Task 11.
- Produces, from `feature.mjs`: `main(argv, { gh, out }) → exitCode`. It is exported for tests and runs itself when it is the entry point. Its subcommands are:
  - `start --name <n> [--slug <s>] [--lite] [--owner <login>]`:
    - creates the parent issue;
    - in full mode, also creates the six sub-issues and links them;
    - creates `docs/features/<slug>/` containing a `.gitkeep`;
    - prints the parent number.
  - `status [--feature <n>]`:
    - without `--feature`, lists the open features;
    - with it, prints the mode, the current phase, any phases in pushback, the open side issues that link the feature, and the next step.
  - `gate --feature <n> --phase <id>`: prints the reasons and exits `0` when the gate is open or `2` when it is closed.
- Exit codes: `1` for usage errors and `gh` errors, `2` when a gate is closed.

Steps:

- [ ] **Step 1: Write the failing tests.** Each uses a fake runner that records its args and returns canned JSON.
  - `start full creates parent and six linked sub-issues`: the recorded calls contain one parent creation labelled `feature`, then six issue creations with the Global Constraints titles and labels, then six sub-issue links.
  - `start lite creates only the parent`: exactly one issue is created, and its body contains six `### ` sections.
  - `start refuses duplicate slug` (Review Focus 3): when `listFeatures` returns an issue whose marker has the same slug, the exit code is `1`, the output names that issue, and no create call is recorded.
  - `gate exits 2 with reasons`: for a canned state with `analyst` open, the gate for `architect` exits `2` and prints `[Analyst] Behaviours`.
  - `gate errors are not open` (Review Focus 1): when the runner throws, the exit code is `1`, never `0`, and the output contains the authentication hint.
  - `status reports current phase and next step`: for a canned state, the output contains the current phase's title and the name of the skill to run next, `feature-<persona>`.
- [ ] **Step 2: Run `node --test skills/init-repo/tests/feature-cli.test.mjs`.** Expected: FAIL.
- [ ] **Step 3: Implement `feature-gh.mjs`, then `feature.mjs`, with the interfaces above.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(lifecycle): feature command line for start, status and gate`.

### Task 4: Feature command line (pushback, park, handoff, promote)

**Files:**
- Modify: `skills/init-repo/assets/lifecycle/scripts/feature.mjs`
- Modify: `skills/init-repo/tests/feature-cli.test.mjs`

**Interfaces:**
- Consumes: Task 3's `makeGh` and `main`.
- Produces these subcommands:
  - `pushback --feature <n> --to <phaseId> --from <phaseId> --body-file <path>`:
    - in full mode, it comments the body on the earlier sub-issue, reopens it, labels it `pushback`, and comments "Blocked by #<earlier>" on the current sub-issue;
    - in lite mode, it unticks the earlier section's boxes in the parent body and comments the body on the parent.
  - `park --feature <n> --title <t> --body-file <path>`: creates an issue labelled `side-issue` whose body starts with `Side issue of #<n>, noticed during <current phase title>`. It never creates a sub-issue link.
  - `handoff --feature <n> --body-file <path>`: comments the body on the parent issue.
  - `promote --feature <n>`:
    - creates the six sub-issues, closing any whose lite section is fully ticked, and links them;
    - rewrites the parent marker to `mode=full`;
    - prints the files to split `feature.md` into. The split itself is done by a skill.
  - When an amendment PR merges, the pushback label is removed by the persona skill running `gh` through the adapter. No subcommand does this.

Steps:

- [ ] **Step 1: Write the failing tests:**
  - `pushback full reopens and labels`: the calls recorded are a comment, a reopen and `pushback` being added on the earlier sub-issue, then a comment containing "Blocked by" on the current sub-issue.
  - `pushback lite unticks section`: the edited parent body has no ticked boxes in the target section, and the other sections are unchanged.
  - `park is not a sub-issue`: one issue is created with `side-issue`, its body references the parent, and no sub-issue link call is recorded.
  - `handoff comments on parent`: exactly one comment is posted, on the parent number.
  - `promote creates sub-issues and flips mode`: six issues are created, the ones whose sections were ticked are closed, and the new parent body's marker contains `mode=full`.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement the four subcommands.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(lifecycle): pushback, park, handoff and promote commands`.

### Task 5: The feature-gate check

**Files:**
- Modify: `skills/init-repo/assets/lifecycle/scripts/feature.mjs` (add the `gate-pr` subcommand)
- Create: `skills/init-repo/assets/lifecycle/workflows/feature-gate.yml`
- Modify: `skills/init-repo/tests/feature-cli.test.mjs`
- Create: `skills/init-repo/tests/feature-gate-workflow.test.mjs`

**Interfaces:**
- Consumes: `classifyPr`, `evaluateGate` and `loadFeature`.
- Produces `gate-pr --pr <n>`. It:
  - loads the PR's body, files and labels with `gh pr view --json`;
  - exits `0` for a PR that isn't a phase PR, or one with the override label;
  - otherwise finds each affected feature, from the slugs (by matching parent markers) and from the `closes` numbers (by matching sub-issues);
  - works out which phase the PR is for;
  - exits `2` if any of those gates is closed.
- Produces the workflow, named `feature-gate`, with:
  - job id `feature-gate`, so that the required check context is `feature-gate`;
  - triggers on `pull_request` (opened, synchronize, reopened, edited, labeled, unlabeled);
  - permissions `contents: read`, `issues: read` and `pull-requests: read`;
  - steps: checkout, set up Node 20, then run `node scripts/feature.mjs gate-pr --pr ${{ github.event.pull_request.number }}` with `GH_TOKEN` set.

Steps:

- [ ] **Step 1: Write the failing tests:**
  - `gate-pr passes non-phase PR`: the exit code is `0`.
  - `gate-pr passes override`: with `gate-override` on the PR and the gate closed, the exit code is `0`.
  - `gate-pr fails when any feature gate closed` (Review Focus 4): with two slugs where one feature's gate is closed, the exit code is `2`, and the output names that feature.
  - `gate-pr passes open gate`: the exit code is `0`.
  - `workflow shape`: the workflow text contains the job id `feature-gate`, every trigger type listed above, the three permissions, and the `gate-pr` command line, and contains no backticked PascalCase term.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement `gate-pr` and write the workflow.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(lifecycle): feature-gate pull request check`.

### Task 6: Skill linter, the feature skill, the park skill and the templates

**Files:**
- Create: `skills/init-repo/tests/lifecycle-skills.test.mjs`
- Create: `skills/init-repo/assets/lifecycle/skills/feature/SKILL.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature/templates/handoff.md` (the spec's handoff template, verbatim)
- Create: `skills/init-repo/assets/lifecycle/skills/feature/templates/pushback.md` (the spec's pushback template, verbatim)
- Create: `skills/init-repo/assets/lifecycle/skills/feature/templates/adr.md` (four sections: context, decision, consequences, alternatives)
- Create: `skills/init-repo/assets/lifecycle/skills/feature-park/SKILL.md`

**Interfaces:**
- Produces the linter test, which runs over every folder under `assets/lifecycle/skills/`. It also covers the skills from Tasks 7 and 8 as they are added.
- Produces the convention every persona skill follows:
  - the sections `## Role brief` (with `### Cares about`, `### Deliberately ignores`, `### Good output`, `### Exit criteria`), `## Gate check`, `## Work`, `## Checkpoint`, `## Review feedback` and `## Pushback`;
  - templates are referenced by relative path, for example `../feature/templates/handoff.md`;
  - script calls are `node scripts/feature.mjs <subcommand>`.
- The `feature` skill covers starting a feature (full or lite), status and resume, recording pushback, and promoting to full mode. It tells the user which persona skill to run next and never starts the next phase itself.
- The `feature-park` skill takes a title and a short body, runs `park`, says the side issue is parked, and returns to the current phase's work. It does no investigation of the side issue.

Steps:

- [ ] **Step 1: Write the failing linter tests:**
  - `frontmatter is name and description only`: there are exactly two keys, and `name` equals the folder name.
  - `description starts with Use when`.
  - `no backticked PascalCase`: no match for a backticked PascalCase pattern in any file under the kit.
  - `no hand-edit instruction`: no line tells the reader to edit an artefact by hand. The test matches the phrases "edit the file", "hand-edit" and "manually edit".
  - `referenced templates exist`: every relative `templates/` path a `SKILL.md` mentions resolves.
  - `referenced subcommands exist`: every `node scripts/feature.mjs <sub>` that a skill mentions is a subcommand `feature.mjs` implements, read from a `SUBCOMMANDS` export added to `feature.mjs`.
  - `persona skills have the convention sections`: every `feature-<persona>` skill has all the section headings above. `feature` and `feature-park` are exempt.
  - `templates verbatim`: the handoff and pushback templates equal the spec's code blocks, which the test extracts from the spec file.
- [ ] **Step 2: Run `node --test skills/init-repo/tests/lifecycle-skills.test.mjs`.** Expected: FAIL.
- [ ] **Step 3: Write the templates, the `feature` skill and the `feature-park` skill,** and add the `SUBCOMMANDS` export.
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(lifecycle): feature and park skills with handoff templates`.

### Task 7: PO, analyst and architect skills

**Files:**
- Create: `skills/init-repo/assets/lifecycle/skills/feature-po/SKILL.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature-analyst/SKILL.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature-architect/SKILL.md`
- Modify: `skills/init-repo/tests/lifecycle-skills.test.mjs`

**Interfaces:**
- Consumes: Task 6's convention and templates, and the `gate`, `handoff` and `pushback` subcommands.
- **Every persona skill:**
  - runs `gate` first and stops if it exits `2`;
  - opens the phase PR with `Closes #<sub-issue>`, the fingerprint footer and the Narrative sections when the phase is decision-bearing;
  - posts a handoff from the template;
  - stops, says a checkpoint has been reached, and suggests a break;
  - in review-feedback mode, regenerates the artefact from the PR's review comments;
  - in amendment mode, regenerates only the affected parts and removes the `pushback` label once its PR has merged.
  - In lite mode, it writes its section of `feature.md` and posts the handoff on the parent instead of opening a PR. The design PR is opened by the architect.
- **`feature-po`** produces `01-vision.md` and delegates research to the agent, with sources.
- **`feature-analyst`**:
  - produces `02-behaviours.md` as Given/When/Then scenarios;
  - asks one question at a time until every uncertainty is decided or explicitly deferred;
  - updates the target repo's ontology under its ontology protocol.
- **`feature-architect`**:
  - produces `03-architecture.md`, tracing every component to behaviours;
  - writes an ADR from the template for each significant decision, numbered after the highest existing `docs/adr/` file;
  - links the ADRs from the Narrative sections.

Steps:

- [ ] **Step 1: Add the failing tests:**
  - `po names its artefact`: the skill mentions `01-vision.md`.
  - `analyst asks one question at a time and updates ontology`: the skill contains "one question at a time" and "ontology".
  - `architect writes ADRs`: the skill mentions `docs/adr/` and `../feature/templates/adr.md`.
  - `persona skills stop at checkpoint`: each `## Checkpoint` section contains "stop" and "break".
  - `persona skills check the gate first`: in each skill, `## Gate check` comes before `## Work`.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Write the three skills.**
- [ ] **Step 4: Run the tests again.** Expected: PASS, including Task 6's linter over the new skills.
- [ ] **Step 5: Commit:** `feat(lifecycle): product owner, analyst and architect skills`.

### Task 8: Developer and user skills

**Files:**
- Create: `skills/init-repo/assets/lifecycle/skills/feature-dev/SKILL.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature-user/SKILL.md`
- Modify: `skills/init-repo/tests/lifecycle-skills.test.mjs`

**Interfaces:**
- Consumes: Task 7's persona-skill behaviour.
- **`feature-dev`** has two steps, chosen by the current phase.
  - **Plan (`dev-plan`):** uses superpowers writing-plans with `01`–`03` as the spec, falling back to plain instructions where superpowers is absent. It then writes the detailed implementation plan under `docs/detailed-implementations/<slug>/` following the target repo's `AGENTS.md`, opens a plan PR closing `[Dev] Plan`, and stops.
  - **Build (`dev-build`):** executes the detailed plan task by task on one phase branch. When another agent has executed the plan, it only opens the PR closing `[Dev] Build` and posts the handoff.
- **`feature-user`** produces `05-runbook.md`, `05-user-guide.md`, `05-acceptance.md` and the executable acceptance tests.
  - Each behaviour gets a scripted walkthrough of numbered steps with expected results.
  - The person acting as user follows the script, then approves the executable test.
  - Both layers run in a local build and in the deployed environment from the runbook.
  - The results, dates and walkthrough person are recorded.
  - A failure is recorded as pushback to `dev-build` by default.

Steps:

- [ ] **Step 1: Add the failing tests:**
  - `dev has plan and build steps`: the skill contains both `dev-plan` and `dev-build`, `docs/detailed-implementations/`, and "writing-plans".
  - `dev has superpowers fallback`: the skill contains a fallback paragraph for when superpowers is not installed.
  - `user covers two layers and two environments`: the skill contains "walkthrough", "executable", "local" and "deployed".
  - `user failure is pushback`: the skill mentions `pushback` and `dev-build`.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Write the two skills.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(lifecycle): developer and user skills`.

### Task 9: AGENTS.md section for the lifecycle

**Files:**
- Create: `skills/init-repo/assets/lifecycle/agents-section.md`
- Modify: `skills/init-repo/assets/AGENTS.md.tmpl` (include the section)
- Modify: `skills/init-repo/tests/lifecycle-skills.test.mjs`

**Interfaces:**
- Produces the section text, under the heading `## Feature lifecycle`. It:
  - says features follow the persona workflow;
  - says the gates are enforced locally and by the `feature-gate` check;
  - says the only bypass is the `gate-override` label, with its reason in Narrative;
  - says the merge override is separate;
  - points at the `feature` skill.
- Task 10 prints this text for repos that already have an `AGENTS.md`.

Steps:

- [ ] **Step 1: Add the failing test** `agents section included in template`: `AGENTS.md.tmpl` contains the section text exactly.
- [ ] **Step 2: Run the test.** Expected: FAIL.
- [ ] **Step 3: Write the section and include it in the template.**
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(init-repo): AGENTS.md feature lifecycle section`.

### Task 10: init-files.mjs copies the lifecycle kit, and the --skills-only mode

**Files:**
- Modify: `skills/init-repo/scripts/init-files.mjs`
- Create: `skills/init-repo/tests/init-files.test.mjs`

**Interfaces:**
- Consumes: everything under `assets/lifecycle/`.
- Produces a new step in `init-files.mjs`, before the summary, that installs the lifecycle kit:
  - each skill folder is copied to the three skill locations;
  - `scripts/feature*.mjs` go into the target's `scripts/`;
  - the workflow goes into `.github/workflows/feature-gate.yml`.
  - The kit is overwritten, unlike the rest of the `Baseline`. The report says `created` for a new file, `updated` for a changed one, and `kept` for one that is identical.
- Produces the `--skills-only` flag:
  - only `--target` is required;
  - it installs the lifecycle kit and nothing else, so no Narrative or ontology installers run;
  - it then prints the AGENTS section with an instruction to merge it, unless `AGENTS.md` already contains `## Feature lifecycle`.
- `--dry-run` applies to the kit too.

Steps:

- [ ] **Step 1: Write the failing tests.** Each uses a temporary folder with `git init` and runs the script as a child process.
  - `skills-only installs kit in three places`: after the run, `.claude/skills/feature-analyst/SKILL.md`, `.agents/skills/feature-analyst/SKILL.md` and `.kiro/skills/feature-analyst/SKILL.md` exist, along with `scripts/feature.mjs` and `.github/workflows/feature-gate.yml`, and none of them is a symlink.
  - `skills-only overwrites changed copy` (Review Focus 5): after altering one copy and re-running, the copy matches the asset again and the report has an `updated` line for it.
  - `identical copy is kept`: a second run with no changes reports `kept` for every kit file.
  - `skills-only needs no other options and runs no installers`: the run succeeds with only `--target`, and the output has no "Project Narrative" or "Ontology kit" headings.
  - `non-git target fails` (Review Focus 5): the exit code is non-zero, with the existing "is not a git repository" message.
  - `dry run writes nothing`: no kit file exists after a `--dry-run --skills-only` run.
  - `agents section printed when missing`: the output contains `## Feature lifecycle` when the target has no such section.
- [ ] **Step 2: Run `node --test skills/init-repo/tests/init-files.test.mjs`.** Expected: FAIL.
- [ ] **Step 3: Implement the kit step and `--skills-only`,** keeping the existing `writeIfMissing` path unchanged for the rest of the `Baseline`.
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(init-repo): install the lifecycle kit and add skills-only mode`.

### Task 11: GitHub settings for labels and the required check

**Files:**
- Modify: `skills/init-repo/scripts/apply-github-settings.sh`
- Create: `skills/init-repo/tests/apply-github-settings.test.mjs`

**Interfaces:**
- Produces the new labels (`feature`, `side-issue`, `pushback`, `gate-override`, and the five `phase:` labels), each created with `--force` and a description.
- Adds `feature-gate` to the required status check contexts, alongside `ai-fingerprint`.
- `enforce_admins` stays `false`, so the merge override is preserved.

Steps:

- [ ] **Step 1: Write the failing tests.** These run the script with `--dry-run --repo o/r --stack none`:
  - `creates lifecycle labels`: the output has a `gh label create <name>` line for each of the nine labels.
  - `requires feature-gate`: the protection JSON contains both `ai-fingerprint` and `feature-gate`.
  - `admins not enforced`: the protection JSON contains `"enforce_admins": false`.
- [ ] **Step 2: Run the tests.** Expected: FAIL. The protection JSON is only echoed as a summary in dry runs today, so this step also makes dry runs print the JSON.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(init-repo): lifecycle labels and required feature-gate check`.

### Task 12: Document the lifecycle in init-repo

**Files:**
- Modify: `skills/init-repo/SKILL.md`
- Modify: `README.md`

**Interfaces:**
- **`SKILL.md`:**
  - adds the lifecycle kit as a row in the "What it lays down" table, with the reason it is overwritten;
  - adds `--skills-only` to step 2 for repos that already have the `Baseline`;
  - adds the new labels and the required check to step 4;
  - adds a "Things that will go wrong" entry: a skill copy edited in a target repo is overwritten by the next run, so changes go into this marketplace's assets.
- **`README.md`:** adds one paragraph naming the seven skills.

Steps:

- [ ] **Step 1: Run `node scripts/check-ontology-terms.mjs` with the edited files staged.** Expected: OK.
- [ ] **Step 2: Run `node --test skills/init-repo/tests/`.** Expected: every test passes.
- [ ] **Step 3: Commit:** `docs(init-repo): document the feature lifecycle kit`.
