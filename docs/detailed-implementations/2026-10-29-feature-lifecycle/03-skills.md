# 03 — The skills (Tasks 6–9)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

These tasks write the skill layer: the prose that agents follow, plus the AGENTS.md section for target repos. The skills hold no logic of their own. Every GitHub action and every gate decision goes through `node scripts/feature.mjs` from Tasks 3–5.

Task 6 adds a linter test that every later skill must pass:
- the frontmatter is portable;
- there are no backticked PascalCase terms;
- there are no hand-edit instructions;
- referenced templates and subcommands exist;
- persona skills have the sections the persona convention requires.

All skill files live under `skills/init-repo/assets/lifecycle/skills/`.

### Task 6: Skill linter, the feature skill, the park skill and the templates

**Files:**
- Create: `skills/init-repo/assets/lifecycle/skills/feature/SKILL.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature/templates/handoff.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature/templates/pushback.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature/templates/adr.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature/templates/persona-common.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature-park/SKILL.md`
- Test: `skills/init-repo/tests/lifecycle-skills.test.mjs`

**Interfaces:**

The task consumes `SUBCOMMANDS` from `feature.mjs` (Tasks 3–5). It produces the persona-skill convention that Tasks 7 and 8 follow:

```js
// Every feature-<persona> SKILL.md (po, analyst, architect, dev, user) contains these headings,
// each on its own line, in this order:
const PERSONA_HEADINGS = [
  "## Role brief",
  "### Cares about",
  "### Deliberately ignores",
  "### Good output",
  "### Exit criteria",
  "## Gate check", // must come before "## Work" and contain the gate command for its phase id
  "## Work",
  "## Checkpoint", // must say "stop" and "break"
  "## Review feedback",
  "## Pushback",
];
// Shared steps live in ../feature/templates/persona-common.md, which every persona skill references.
// Templates are referenced relative to the skill folder: ../feature/templates/<name>.md
// (or templates/<name>.md from the feature skill itself). Commands are "node scripts/feature.mjs <sub>".
```

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/lifecycle-skills.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SUBCOMMANDS } from "../assets/lifecycle/scripts/feature.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = resolve(HERE, "../assets/lifecycle");
const SKILLS = join(KIT, "skills");
const SPEC = resolve(HERE, "../../../docs/superpowers/specs/2026-10-29-feature-lifecycle-design.md");

const PERSONAS = ["feature-po", "feature-analyst", "feature-architect", "feature-dev", "feature-user"];
const PERSONA_HEADINGS = [
  "## Role brief",
  "### Cares about",
  "### Deliberately ignores",
  "### Good output",
  "### Exit criteria",
  "## Gate check",
  "## Work",
  "## Checkpoint",
  "## Review feedback",
  "## Pushback",
];
const PASCAL = /`([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*)`/g;
const HAND_EDIT = /edit the file|hand-edit|manually edit/i;
const TEMPLATE_REF = /(?:\.\.\/feature\/)?templates\/[a-z-]+\.md/g;
const COMMAND_REF = /node scripts\/feature\.mjs ([a-z-]+)/g;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const skillNames = () => readdirSync(SKILLS).filter((name) => statSync(join(SKILLS, name)).isDirectory());
const skillText = (name) => readFileSync(join(SKILLS, name, "SKILL.md"), "utf8");
const kitTextFiles = () => walk(KIT).filter((file) => /\.(md|yml)$/.test(file));

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, "SKILL.md must start with frontmatter");
  return Object.fromEntries(
    m[1].split("\n").map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
    }),
  );
}

test("the kit has the feature and park skills", () => {
  for (const name of ["feature", "feature-park"]) assert.ok(skillNames().includes(name), name);
});

test("frontmatter is name and description only", () => {
  for (const name of skillNames()) {
    const fm = frontmatter(skillText(name));
    assert.deepEqual(Object.keys(fm), ["name", "description"], name);
    assert.equal(fm.name, name);
  }
});

test("description starts with Use when and is plain YAML", () => {
  for (const name of skillNames()) {
    const { description } = frontmatter(skillText(name));
    assert.ok(description.startsWith("Use when "), name);
    assert.ok(!description.includes(": "), `${name}: a colon followed by a space breaks YAML`);
    assert.ok(!/^["'>|]/.test(description), `${name}: description must be a plain one-line scalar`);
  }
});

test("no backticked PascalCase", () => {
  for (const file of kitTextFiles()) {
    const found = [...readFileSync(file, "utf8").matchAll(PASCAL)].map((m) => m[1]);
    assert.deepEqual(found, [], file);
  }
});

test("no hand-edit instruction", () => {
  for (const file of kitTextFiles()) {
    const lines = readFileSync(file, "utf8").split("\n").filter((line) => HAND_EDIT.test(line));
    assert.deepEqual(lines, [], file);
  }
});

test("referenced templates exist", () => {
  for (const name of skillNames()) {
    for (const [ref] of skillText(name).matchAll(TEMPLATE_REF)) {
      assert.ok(existsSync(resolve(SKILLS, name, ref)), `${name}: ${ref}`);
    }
  }
});

test("referenced subcommands exist", () => {
  for (const file of kitTextFiles()) {
    for (const [, sub] of readFileSync(file, "utf8").matchAll(COMMAND_REF)) {
      assert.ok(SUBCOMMANDS.includes(sub), `${file}: ${sub}`);
    }
  }
});

test("persona skills have the convention sections", () => {
  for (const name of skillNames().filter((n) => PERSONAS.includes(n))) {
    const lines = skillText(name).split("\n");
    const positions = PERSONA_HEADINGS.map((h) => lines.indexOf(h));
    for (const [i, h] of PERSONA_HEADINGS.entries()) assert.ok(positions[i] >= 0, `${name} lacks ${h}`);
    assert.deepEqual([...positions].sort((a, b) => a - b), positions, `${name}: headings out of order`);
  }
});

test("templates verbatim", () => {
  const spec = readFileSync(SPEC, "utf8");
  for (const [heading, file] of [
    ["### Handoff comment template", "handoff.md"],
    ["### Pushback comment template", "pushback.md"],
  ]) {
    const block = spec.slice(spec.indexOf(heading)).match(/```\n([\s\S]*?)\n```/)[1];
    assert.equal(readFileSync(join(SKILLS, "feature", "templates", file), "utf8"), `${block}\n`, file);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/init-repo/tests/lifecycle-skills.test.mjs`
Expected: FAIL with `ENOENT` for `assets/lifecycle/skills`.

- [ ] **Step 3: Write the templates**

Create `skills/init-repo/assets/lifecycle/skills/feature/templates/handoff.md` (copied verbatim from the spec, and the test compares the two):

```markdown
## Handoff: <from role> → <to role>

**Artefact:** <link to file on the PR branch> (PR #<n>)
**Summary:** <2–4 lines>
**Questions passed to <to role>:** <list, or "none">
**Assumptions to challenge:** <list, or "none">
**Decisions recorded:** <links to the Narrative fragment and any ADRs>
**Side issues parked this phase:** <links, or "none">

Checkpoint reached. Next: <to role>, once PR #<n> has been reviewed and merged.
```

Create `skills/init-repo/assets/lifecycle/skills/feature/templates/pushback.md` (copied verbatim from the spec):

```markdown
## Pushback: <from role> → <earlier role>

**Problem:** <what is wrong or missing in the earlier artefact>
**Found while:** <what the later role was doing>
**Affects:** <items in the earlier artefact>
**Blocks:** <current phase sub-issue / PR>

Checkpoint reached. Next: re-run <earlier role> in amendment mode.
```

Create `skills/init-repo/assets/lifecycle/skills/feature/templates/adr.md`:

```markdown
# NNNN — <decision title>

- **Status:** accepted
- **Date:** <YYYY-MM-DD>
- **Feature:** #<parent issue> (docs/features/<slug>/)

## Context

<The forces at play: the behaviours this decision serves, the constraints, and why a decision is needed now.>

## Decision

<What was decided, in one or two sentences, then the detail.>

## Consequences

<What becomes easier, what becomes harder, and what must now stay true.>

## Alternatives considered

<Each alternative, and why it was not chosen.>
```

Create `skills/init-repo/assets/lifecycle/skills/feature/templates/persona-common.md`:

```markdown
# Steps every persona skill shares

Each persona skill names its phase id and its artefact. This page says how the shared steps run. Here `<n>` is the feature's parent issue number, `<slug>` is its folder under `docs/features/`, and `<phase>` is the persona's phase id.

## Finding the feature

If the user has not said which feature, run `node scripts/feature.mjs status` and ask which one. Then run `node scripts/feature.mjs status --feature <n>` to see its mode (full or lite) and its current phase.

## Gate check

Run `node scripts/feature.mjs gate --feature <n> --phase <phase>` before any work.

- Exit 0: the gate is open; carry on.
- Exit 2: the gate is closed. Show the printed reasons, say which skill or action meets each one, and stop. Do none of this phase's work. The only bypass is on GitHub: the gate-override label on the pull request, with the reason in its Narrative sections.
- Exit 1: GitHub could not be read. Show the message and stop. An error never counts as an open gate.

## Exit criteria

Show the user this phase's exit criteria: the checklist on its sub-issue in full mode, or its section of the parent issue in lite mode. As each one is met, tick it:

`node scripts/feature.mjs tick --feature <n> --phase <phase> --text "<the criterion, exactly as written>"`

## Staying on track

When something outside this phase's job comes up, park it with the feature-park skill and carry straight on here. Do not chase it.

## Opening the phase pull request

**Full mode.**
1. Work on a branch named `feature/<slug>/<phase>`.
2. Commit the artefact, following the repo's AGENTS.md (its ontology checks run before every commit).
3. Push, then open the pull request with `gh pr create --body-file <file>`. The body:
   - starts with `Closes #<sub-issue>`;
   - carries the three Narrative sections, and the pull request gets the narrative-required label, whenever the phase made a decision (the vision, behaviours, architecture and plan phases always do);
   - ends with the AI-Fingerprint footer, computed as AGENTS.md describes, and recomputed after every push.

**Lite mode.** Lite pull requests close nothing: the parent issue's checklist carries the status.
- The product owner, analyst and architect write their sections of `docs/features/<slug>/feature.md` on one branch, `feature/<slug>/design`. The architect opens the design pull request.
- The developer's plan step opens the plan pull request from `feature/<slug>/plan`.
- The developer's build step and the user share `feature/<slug>/build`. The user opens the build pull request.

## Handoff

Fill in `templates/handoff.md` from the feature skill's folder, write it to a scratch file, and post it:

`node scripts/feature.mjs handoff --feature <n> --body-file <file>`

## Checkpoint

After the handoff, stop. Tell the user plainly that this is a checkpoint: the phase is handed over, and now is a good time to take a break. Name the next role and its skill, and say when it can start: once the pull request has been reviewed and merged in full mode, or once this phase's boxes are ticked in lite mode. Never start the next phase yourself.

## Review feedback

Reviewers write their comments as steering, not as changes to files. To apply them:
1. Read the pull request's review comments with `gh pr view <pr> --comments`.
2. Regenerate the affected parts of the artefact from them.
3. Commit and push to the same branch, and recompute the fingerprint.
4. Reply on the pull request saying what changed.

Nobody changes an artefact directly: every change comes from re-running a skill.

## Pushback

**Raising it.** When this phase finds a problem that belongs to an earlier phase, do not decide it here.
1. Fill in `templates/pushback.md` and write it to a scratch file.
2. Run `node scripts/feature.mjs pushback --feature <n> --from <this phase> --to <earlier phase> --body-file <file>`.

That reopens the earlier phase. Recording pushback is a checkpoint, so stop and suggest a break.

**Answering it (amendment mode).** When this phase has been reopened by pushback:
1. Read the pushback comment, which is on the sub-issue in full mode or on the parent issue in lite mode.
2. Regenerate only the affected parts of the artefact.
3. In full mode, open an amendment pull request from `feature/<slug>/<phase>-amend` that closes the reopened sub-issue. In lite mode, regenerate the section and tick its boxes again.
4. In the handoff, list the later artefacts' items that trace to what changed.
5. Once the amendment has merged, run `node scripts/feature.mjs clear-pushback --feature <n> --phase <phase>`.
6. Run `node scripts/feature.mjs status --feature <n>`, and tell the user which later items need regenerating.
```

- [ ] **Step 4: Write the feature skill**

Create `skills/init-repo/assets/lifecycle/skills/feature/SKILL.md`:

```markdown
---
name: feature
description: Use when starting a new feature, asking where a feature is, resuming one after a break, recording pushback against an earlier phase, or promoting a lite feature to full mode. It is the entry point to the persona workflow of product owner, analyst, architect, developer and user.
---

# Feature

This skill runs the persona workflow for a feature from the outside. It starts features, says where they are, records pushback and promotes lite features. It never does a role's work itself. Each role has its own skill:

| Role | Skill | Phase ids | Artefact in docs/features/<slug>/ |
| --- | --- | --- | --- |
| Product owner | feature-po | po | 01-vision.md |
| Analyst | feature-analyst | analyst | 02-behaviours.md |
| Architect | feature-architect | architect | 03-architecture.md, and ADRs in docs/adr/ |
| Developer | feature-dev | dev-plan, then dev-build | plans under docs/superpowers/plans/<slug>/ and docs/detailed-implementations/<slug>/, then the code |
| User | feature-user | user | 05-runbook.md, 05-user-guide.md, 05-acceptance.md, and the acceptance tests |

All GitHub work goes through `node scripts/feature.mjs`. It exits 0 when all is well, 2 when a gate is closed, and 1 on an error. An error is never a reason to carry on as if a gate were open.

## Ground rules

- One phase at a time. A role finishes, hands off and stops before the next role starts.
- Every handoff is a checkpoint. Stop and suggest a break; never roll on into the next phase.
- Park side issues with the feature-park skill instead of working on them.
- Artefacts are generated. Review feedback and pushback are applied by re-running the role's skill, never by changing files directly.

## Starting a feature

1. Ask for the feature's name in a few words. Ask whether it is small enough for lite mode (one issue, one feature.md and three pull requests) or needs full mode (a sub-issue and pull request for every phase). Suggest lite for a change one person can review in one sitting.
2. Ask who owns it. Default to the current user, from `gh api user --jq .login`.
3. Run `node scripts/feature.mjs start --name "<name>" --owner <login>`. Add `--lite` for lite mode, and `--slug <slug>` if the user wants a particular folder name.
4. If it reports that the slug already exists, show the existing issue and ask whether to resume that feature instead.
5. Tell the user the parent issue number, the folder created, and that the next step is the feature-po skill. This is a natural place to stop.

## Where am I, and resuming after a break

1. Run `node scripts/feature.mjs status` to list the open features. Ask which one if there is more than one.
2. Run `node scripts/feature.mjs status --feature <n>`.
3. Read the latest handoff comment on the parent issue with `gh issue view <n> --comments`. Summarise it in three lines: what was decided, what was passed on, and what the next role should challenge.
4. Name the next skill. If the gate is closed, show the reasons and say what would meet each one.

## Recording pushback

Use this when someone finds that an earlier phase's artefact is wrong or incomplete.

1. Work out which earlier phase owns the problem and which phase found it.
2. Fill in `templates/pushback.md` with the problem, where it was found, what it affects and what it blocks. Write it to a scratch file.
3. Run `node scripts/feature.mjs pushback --feature <n> --from <finding phase> --to <earlier phase> --body-file <file>`.
4. This is a checkpoint. Stop, suggest a break, and say that the next step is the earlier role's skill in amendment mode.

## Promoting a lite feature to full mode

1. Run `node scripts/feature.mjs promote --feature <n>`. It creates the sub-issues, closes the ones whose sections are done, and lists the numbered files.
2. On a branch named `feature/<slug>/promote`, generate each numbered file from its section of `feature.md` and remove `feature.md`.
3. Open a pull request that explains the promotion, following the repo's AGENTS.md for the commit and the pull-request body.
4. Stop at the checkpoint and name the next skill.
```

- [ ] **Step 5: Write the park skill**

Create `skills/init-repo/assets/lifecycle/skills/feature-park/SKILL.md`:

```markdown
---
name: feature-park
description: Use when something outside the current phase comes up during a feature, such as a bug, an idea or a refactor, and it should be recorded as a side issue instead of being worked on now.
---

# Park a side issue

Parking is how a feature stays on one track. Record the side issue in under a minute, then go straight back to the phase you were in. Do not investigate it, estimate it or start fixing it.

## Steps

1. Write a title of a few words and a body of two to five lines: what was noticed, where, and why it might matter. Use the user's own words where you can. Write the body to a scratch file.
2. Run `node scripts/feature.mjs park --feature <n> --title "<title>" --body-file <file>`.
3. Tell the user the new issue number and the phase they are going back to. Then carry on with that phase's work exactly where it was left.

Side issues are deliberately not sub-issues, so they never change the current phase. They are listed by `node scripts/feature.mjs status --feature <n>`, and the owner decides what to do with them at a checkpoint.
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test skills/init-repo/tests/lifecycle-skills.test.mjs`
Expected: PASS, with 9 tests and 0 failures.

- [ ] **Step 7: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): feature and park skills with handoff templates"
git push
```

### Task 7: PO, analyst and architect skills

**Files:**
- Create: `skills/init-repo/assets/lifecycle/skills/feature-po/SKILL.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature-analyst/SKILL.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature-architect/SKILL.md`
- Create: `skills/init-repo/tests/helpers/skill-text.mjs`
- Test: `skills/init-repo/tests/persona-skills.test.mjs`

**Interfaces:**

The task consumes Task 6's persona convention and `persona-common.md`. It produces three persona skills, plus this helper, which Task 8 reuses:

```js
// helpers/skill-text.mjs
export function readSkill(name) {}      // → the text of assets/lifecycle/skills/<name>/SKILL.md
export function section(text, heading) {} // → the heading line down to the next heading of the
                                          //   same or a higher level; asserts the heading exists
```

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/helpers/skill-text.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS = join(dirname(fileURLToPath(import.meta.url)), "../../assets/lifecycle/skills");

export function readSkill(name) {
  return readFileSync(join(SKILLS, name, "SKILL.md"), "utf8");
}

export function section(text, heading) {
  const lines = text.split("\n");
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, `missing ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  const end = lines.findIndex((line, i) => i > start && /^#+ /.test(line) && line.match(/^#+/)[0].length <= level);
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}
```

Create `skills/init-repo/tests/persona-skills.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readSkill, section } from "./helpers/skill-text.mjs";

const PERSONAS = { "feature-po": ["po"], "feature-analyst": ["analyst"], "feature-architect": ["architect"] };

test("po names its artefact", () => {
  assert.ok(readSkill("feature-po").includes("01-vision.md"));
});

test("analyst asks one question at a time and updates ontology", () => {
  const text = readSkill("feature-analyst");
  assert.ok(text.includes("02-behaviours.md"));
  assert.ok(text.includes("one question at a time"));
  assert.match(text, /ontology/);
});

test("architect writes ADRs", () => {
  const text = readSkill("feature-architect");
  assert.ok(text.includes("03-architecture.md"));
  assert.ok(text.includes("docs/adr/"));
  assert.ok(text.includes("../feature/templates/adr.md"));
});

for (const [name, phases] of Object.entries(PERSONAS)) {
  test(`${name} checks its own gate before working`, () => {
    const text = readSkill(name);
    assert.ok(text.indexOf("## Gate check") < text.indexOf("## Work"));
    for (const id of phases) {
      assert.ok(section(text, "## Gate check").includes(`node scripts/feature.mjs gate --feature <n> --phase ${id}`), id);
    }
  });

  test(`${name} stops at the checkpoint`, () => {
    const checkpoint = section(readSkill(name), "## Checkpoint");
    assert.match(checkpoint, /\bstop\b/i);
    assert.match(checkpoint, /\bbreak\b/i);
  });

  test(`${name} follows the shared persona steps`, () => {
    assert.ok(readSkill(name).includes("../feature/templates/persona-common.md"));
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/init-repo/tests/persona-skills.test.mjs`
Expected: FAIL with `ENOENT` for `feature-po/SKILL.md`.

- [ ] **Step 3: Write the product owner skill**

Create `skills/init-repo/assets/lifecycle/skills/feature-po/SKILL.md`:

```markdown
---
name: feature-po
description: Use when acting as the product owner on a feature, exploring an idea, asking for research and setting out the vision, or when applying review feedback or pushback to a feature's vision.
---

# Product owner

You are wearing the product owner hat for one feature. Your phase id is po, and your artefact is `docs/features/<slug>/01-vision.md` (in lite mode, the PO section of `feature.md`). Follow `../feature/templates/persona-common.md` for the steps every persona shares. This page covers what is particular to the product owner.

## Role brief

### Cares about

- The problem, in the words of the people who have it.
- Who the users are, and what changes for them.
- The outcomes, and how success will be measured.
- What is in scope and, just as firmly, what is out.

### Deliberately ignores

- How the system behaves in detail, which is the analyst's job.
- Components, technology and deployment, which are the architect's job.
- Code.

If the conversation drifts into these, note the point for the next role in the handoff and steer back.

### Good output

A colleague who was not in the room can read the vision in five minutes and explain it back. It has:
- one paragraph on the problem;
- the users, named;
- three to five outcomes, each with a measure;
- explicit scope and out-of-scope lists;
- the research findings, summarised with their sources.

### Exit criteria

The checklist on the [PO] Vision sub-issue, or the PO section of the parent issue in lite mode. Tick each criterion as it is met, as persona-common describes.

## Gate check

Run `node scripts/feature.mjs gate --feature <n> --phase po` and act on the result as persona-common describes.

## Work

1. Ask the user to describe the idea in their own words, one question at a time, until the problem, the users and the outcomes are clear.
2. Offer research: say what you would look into and why. When the user agrees, have the agent do the research (in parallel where it can) and summarise each finding with its source.
3. Generate `01-vision.md` with these sections: Problem, Users, Outcomes and measures, Scope, Out of scope, Research. Show it, take the user's steering, and regenerate it until they accept it.
4. Tick the exit criteria as they are met.

## Checkpoint

Open the phase pull request, or in lite mode commit to the design branch, as persona-common describes. Post the handoff to the analyst. Then stop, and suggest that the user takes a break before the analyst starts. The next skill is feature-analyst.

## Review feedback

Apply review comments by regenerating the vision, as persona-common describes.

## Pushback

The product owner's is the first phase, so it never raises pushback. It only answers pushback, in amendment mode, as persona-common describes.
```

- [ ] **Step 4: Write the analyst skill**

Create `skills/init-repo/assets/lifecycle/skills/feature-analyst/SKILL.md`:

```markdown
---
name: feature-analyst
description: Use when acting as the analyst on a feature, turning an accepted vision into system behaviours and driving out uncertainty, or when applying review feedback or pushback to a feature's behaviours.
---

# Analyst

You are wearing the analyst hat for one feature. Your phase id is analyst, and your artefact is `docs/features/<slug>/02-behaviours.md` (in lite mode, the Analyst section of `feature.md`). Follow `../feature/templates/persona-common.md` for the steps every persona shares. This page covers what is particular to the analyst.

## Role brief

### Cares about

- What the system does, as observable behaviours, for every outcome in the vision.
- Uncertainty: every open question is either decided or explicitly deferred.
- Precise, shared vocabulary that matches the repo's ontology.

### Deliberately ignores

- Why the feature is worth doing, which the vision has settled.
- How it is built (components, technology, deployment), which is the architect's job.

If either comes up, note it for the right role, or raise pushback against the vision.

### Good output

Every behaviour has an id (B1, B2 and so on) and a Given/When/Then scenario, grouped under the vision outcome it serves. A developer could write a test from each scenario without asking a question. The uncertainty log shows every question that came up, with its decision or its deferral.

### Exit criteria

The checklist on the [Analyst] Behaviours sub-issue, or the Analyst section of the parent issue in lite mode. Tick each criterion as it is met, as persona-common describes.

## Gate check

Run `node scripts/feature.mjs gate --feature <n> --phase analyst` and act on the result as persona-common describes.

## Work

1. Read `01-vision.md` and the latest handoff, including the questions passed to the analyst.
2. List the uncertainties you can see. Resolve them with the user one question at a time. For each one, record the decision, or record that it is explicitly deferred as out of scope.
3. Generate `02-behaviours.md` with these sections:
   - Behaviours, grouped by outcome, each with its id and its Given/When/Then scenario;
   - Uncertainties, each with its decision or deferral;
   - Terms, listing the domain terms this feature introduces.

   Every outcome needs at least one behaviour.
4. Update the ontology, following the ontology protocol in the repo's AGENTS.md: add each new domain term to the ontology source, regenerate it, and include both in the phase commit. Use the ontology's exact names in the behaviours.
5. Show the behaviours, take the user's steering, and regenerate them until they accept them. Tick the exit criteria as they are met.

## Checkpoint

Open the phase pull request, or in lite mode commit to the design branch, as persona-common describes. Post the handoff to the architect. Then stop, and suggest that the user takes a break before the architect starts. The next skill is feature-architect.

## Review feedback

Apply review comments by regenerating the behaviours, as persona-common describes.

## Pushback

If the vision is contradictory or is missing an outcome, raise pushback to po rather than deciding it here. When this phase is reopened, answer the pushback in amendment mode. Both steps are in persona-common.
```

- [ ] **Step 5: Write the architect skill**

Create `skills/init-repo/assets/lifecycle/skills/feature-architect/SKILL.md`:

```markdown
---
name: feature-architect
description: Use when acting as the architect on a feature, defining components, structure and deployment from its behaviours and recording architecture decisions, or when applying review feedback or pushback to a feature's architecture.
---

# Architect

You are wearing the architect hat for one feature. Your phase id is architect, and your artefact is `docs/features/<slug>/03-architecture.md` (in lite mode, the Architect section of `feature.md`), together with an ADR in `docs/adr/` for each significant decision. Follow `../feature/templates/persona-common.md` for the steps every persona shares. This page covers what is particular to the architect.

## Role brief

### Cares about

- The components, and the responsibility each one has.
- How the components connect, and where the data lives.
- How the feature is deployed and run.
- Every behaviour being served by at least one component.
- Decisions that are recorded with their reasons and the alternatives considered.

### Deliberately ignores

- What the system should do, which the behaviours have settled.
- Line-by-line implementation and task breakdown, which are the developer's job.

If a behaviour turns out to be infeasible or ambiguous, raise pushback against it rather than reinterpreting it.

### Good output

A developer can plan from it without re-deciding anything structural. Every behaviour id appears in the traceability table against the components that serve it. Each significant decision has its own short ADR.

### Exit criteria

The checklist on the [Architect] Structure sub-issue, or the Architect section of the parent issue in lite mode. Tick each criterion as it is met, as persona-common describes.

## Gate check

Run `node scripts/feature.mjs gate --feature <n> --phase architect` and act on the result as persona-common describes.

## Work

1. Read `01-vision.md`, `02-behaviours.md` and the latest handoff.
2. Work out the shape with the user: the components, how they interact, the data stores, the external systems, and deployment and runtime. Where a choice is genuinely open, ask one question at a time. Otherwise, propose a sensible default and say that it is your call.
3. Generate `03-architecture.md` with these sections:
   - Components, each with its responsibility and the behaviour ids it serves;
   - Structure, which covers how the components connect (add a Mermaid diagram if it helps);
   - Deployment and runtime;
   - Traceability, a table from every behaviour id to its components (no row may be empty);
   - Decisions, which links to the ADRs.
4. For each significant decision, write `docs/adr/NNNN-<title>.md` from `../feature/templates/adr.md`, numbering it after the highest existing file in `docs/adr/` (0001 if there are none). Link each ADR from `03-architecture.md` and from the pull request's Narrative sections.
5. Show the architecture, take the user's steering, and regenerate it until they accept it. Tick the exit criteria as they are met.

## Checkpoint

Open the phase pull request as persona-common describes. In lite mode, the architect opens the design pull request for the product owner, analyst and architect sections together. Post the handoff to the developer. Then stop, and suggest that the user takes a break before planning starts. The next skill is feature-dev.

## Review feedback

Apply review comments by regenerating the architecture and any affected ADRs, as persona-common describes.

## Pushback

Raise pushback to analyst when a behaviour is ambiguous or cannot be built as written, and to po when the vision conflicts with what can be built. When this phase is reopened, answer the pushback in amendment mode. Both steps are in persona-common.
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test skills/init-repo/tests/persona-skills.test.mjs skills/init-repo/tests/lifecycle-skills.test.mjs`
Expected: PASS. That is 12 persona tests, plus the 9 linter tests, which now cover the three new skills too.

- [ ] **Step 7: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): product owner, analyst and architect skills"
git push
```

### Task 8: Developer and user skills

**Files:**
- Create: `skills/init-repo/assets/lifecycle/skills/feature-dev/SKILL.md`
- Create: `skills/init-repo/assets/lifecycle/skills/feature-user/SKILL.md`
- Test: `skills/init-repo/tests/dev-user-skills.test.mjs`

**Interfaces:**

The task consumes Task 7's helpers (`readSkill` and `section`) and the persona convention. It produces the two remaining persona skills. `feature-dev` covers two phase ids, dev-plan and dev-build. `feature-user` covers user.

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/dev-user-skills.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readSkill, section } from "./helpers/skill-text.mjs";

const PERSONAS = { "feature-dev": ["dev-plan", "dev-build"], "feature-user": ["user"] };

test("dev has plan and build steps", () => {
  const text = readSkill("feature-dev");
  for (const needle of ["dev-plan", "dev-build", "docs/detailed-implementations/", "writing-plans", "docs/superpowers/plans/"]) {
    assert.ok(text.includes(needle), needle);
  }
});

test("dev has superpowers fallback", () => {
  assert.ok(readSkill("feature-dev").includes("If superpowers is not installed"));
});

test("dev stops after the plan", () => {
  const work = section(readSkill("feature-dev"), "## Work");
  assert.match(work, /plan pull request/);
  assert.match(work, /stop/i);
});

test("user covers two layers and two environments", () => {
  const text = readSkill("feature-user");
  for (const needle of ["walkthrough", "executable", "local", "deployed", "05-runbook.md", "05-user-guide.md", "05-acceptance.md"]) {
    assert.ok(text.includes(needle), needle);
  }
});

test("user approves the executable test after the walkthrough", () => {
  const work = section(readSkill("feature-user"), "## Work");
  assert.ok(work.indexOf("follows each walkthrough") < work.indexOf("approve"));
});

test("user failure is pushback", () => {
  const text = readSkill("feature-user");
  assert.ok(text.includes("--to dev-build"));
  assert.match(text, /pushback/);
});

for (const [name, phases] of Object.entries(PERSONAS)) {
  test(`${name} checks its own gate before working`, () => {
    const text = readSkill(name);
    assert.ok(text.indexOf("## Gate check") < text.indexOf("## Work"));
    for (const id of phases) {
      assert.ok(section(text, "## Gate check").includes(`node scripts/feature.mjs gate --feature <n> --phase ${id}`), id);
    }
  });

  test(`${name} stops at the checkpoint`, () => {
    const checkpoint = section(readSkill(name), "## Checkpoint");
    assert.match(checkpoint, /\bstop\b/i);
    assert.match(checkpoint, /\bbreak\b/i);
  });

  test(`${name} follows the shared persona steps`, () => {
    assert.ok(readSkill(name).includes("../feature/templates/persona-common.md"));
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/init-repo/tests/dev-user-skills.test.mjs`
Expected: FAIL with `ENOENT` for `feature-dev/SKILL.md`.

- [ ] **Step 3: Write the developer skill**

Create `skills/init-repo/assets/lifecycle/skills/feature-dev/SKILL.md`:

```markdown
---
name: feature-dev
description: Use when acting as the developer on a feature, writing its implementation plans from the accepted vision, behaviours and architecture, or building the code from an approved detailed plan, or when applying review feedback or pushback to a feature's plan or build.
---

# Developer

You are wearing the developer hat for one feature. The developer owns two phases, each with its own checkpoint, so that the plan is reviewed before any code exists:

- dev-plan: the plans, under `docs/superpowers/plans/<slug>/` and `docs/detailed-implementations/<slug>/`.
- dev-build: the code, built from the approved detailed plan. Another agent may do the build, for example a small local model working from the detailed plan.

Follow `../feature/templates/persona-common.md` for the steps every persona shares. This page covers what is particular to the developer.

## Role brief

### Cares about

- A plan that implements the vision, behaviours and architecture exactly, with nothing re-decided.
- Tasks that are small, test-first and independently reviewable, each ending in its own commit.
- Tests that prove every behaviour.

### Deliberately ignores

- Changing what the feature does or how it is structured. Raise pushback instead.
- Runbooks, user guides and acceptance, which are the user's job.

### Good output

The detailed plan is complete enough that another agent, or a smaller model, could execute it without asking a question. The build has every task committed, with tests passing.

### Exit criteria

The checklists on the [Dev] Plan and [Dev] Build sub-issues, or the matching sections of the parent issue in lite mode. Tick each criterion as it is met, as persona-common describes.

## Gate check

Run `node scripts/feature.mjs status --feature <n>` to see which step is current. Then, in the plan step, run `node scripts/feature.mjs gate --feature <n> --phase dev-plan`. In the build step, run `node scripts/feature.mjs gate --feature <n> --phase dev-build`. Act on the result as persona-common describes.

## Work

### Plan step (dev-plan)

1. Read `01-vision.md`, `02-behaviours.md`, `03-architecture.md` and the latest handoff.
2. If superpowers is installed, use its writing-plans skill with those three files as the spec, saving the plan under `docs/superpowers/plans/<slug>/`. If superpowers is not installed, write the plan directly in `docs/superpowers/plans/<slug>/plan.md`. It needs a goal, the architecture, the global constraints, then numbered tasks, each with the files it touches, its interfaces, the tests that prove it and its commit.
3. Write the detailed implementation plan under `docs/detailed-implementations/<slug>/`, exactly as the repo's AGENTS.md describes, with its task format, code fragments, and a commit and push for each task. If AGENTS.md says nothing about detailed plans, use the plan's task format with complete test files.
4. Tick the plan criteria. Open the plan pull request, which closes [Dev] Plan in full mode, and post a handoff to the build step that says who will run it. Then stop: this is a checkpoint, and no code is written until the plan pull request has been reviewed and merged.

### Build step (dev-build)

1. If you are executing the plan, work on `feature/<slug>/dev-build` (or `feature/<slug>/build` in lite mode). Execute the detailed plan task by task, test first, with each task ending in its own commit and push. Where superpowers is installed, use its subagent-driven-development or executing-plans skill.
2. If another agent has executed the plan, check that every task has its commit and that the tests pass. Do nothing else.
3. Tick the build criteria. In full mode, open the pull request that closes [Dev] Build. Post the handoff to the user.

## Checkpoint

After the plan step and after the build step alike, post the handoff, then stop and suggest a break. After the plan, the next step is the build, by this skill or by whoever runs the plan. After the build, the next skill is feature-user.

## Review feedback

Apply review comments by regenerating the affected parts of the plan or the code, as persona-common describes.

## Pushback

Raise pushback to analyst when the plan or the build reveals a missing or ambiguous behaviour, and to architect when the structure will not work as described. When the build is reopened, for example by a failed acceptance test, answer the pushback in amendment mode. Both steps are in persona-common.
```

- [ ] **Step 4: Write the user skill**

Create `skills/init-repo/assets/lifecycle/skills/feature-user/SKILL.md`:

```markdown
---
name: feature-user
description: Use when acting as the user on a feature, writing its runbook and user guide and running acceptance with scripted walkthroughs and executable tests in a local build and the deployed environment, or when applying review feedback to them.
---

# User

You are wearing the user hat for one feature. Your phase id is user. Your artefacts are `docs/features/<slug>/05-runbook.md`, `05-user-guide.md` and `05-acceptance.md` (in lite mode, the User section of `feature.md`), plus the executable acceptance tests in the repo's test suite. Follow `../feature/templates/persona-common.md` for the steps every persona shares. This page covers what is particular to the user.

## Role brief

### Cares about

- Whether the feature does what the behaviours promised, seen from the outside.
- Whether someone can deploy, operate and recover it from the runbook alone.
- Whether the people named in the vision can use it from the user guide alone.

### Deliberately ignores

- How the code is written.
- Fixing anything that fails. A failure is pushback, not a task for this phase.

### Good output

Every behaviour has a scripted walkthrough and an executable acceptance test. Both have been run in a local build and in the deployed environment, and the results are recorded with dates and the name of the person who did each walkthrough.

### Exit criteria

The checklist on the [User] Docs & acceptance sub-issue, or the User section of the parent issue in lite mode. Tick each criterion as it is met, as persona-common describes.

## Gate check

Run `node scripts/feature.mjs gate --feature <n> --phase user` and act on the result as persona-common describes.

## Work

1. Read `02-behaviours.md`, `03-architecture.md`, the merged code and the latest handoff.
2. Generate `05-runbook.md` with these sections: Deploy, Operate and Recover. Cover the commands, the configuration, the health checks and the rollback. The runbook names the deployed environment that acceptance uses.
3. Generate `05-user-guide.md` with a section for each user-facing behaviour, written for the users named in the vision.
4. For each behaviour id, write two layers of acceptance:
   - a scripted walkthrough in `05-acceptance.md`: numbered steps, each with its expected result;
   - an executable acceptance test that automates the same scenario, in the repo's test suite and following its conventions.
5. Run both layers in each environment: first in a local build, then in the deployed environment from the runbook. In each environment:
   1. The person acting as user follows each walkthrough and says pass or fail for every step. Record the results.
   2. Once their walkthrough has passed, show them the executable test and ask them to approve it. Then run it and record the result.
6. Record the results in `05-acceptance.md` for each behaviour in each environment: the walkthrough result, the executable result, the date, and the person who did the walkthrough.
7. Do not fix a failure here. Raise pushback to the build with `node scripts/feature.mjs pushback --feature <n> --from user --to dev-build --body-file <file>`, or to an earlier phase if the behaviour itself is wrong. Then stop.

In lite mode, the build pull request carries the code. So run the deployed-environment layer after that pull request has merged, then tick its criterion.

## Checkpoint

Open the phase pull request, or in lite mode the build pull request, as persona-common describes. Post a handoff that summarises the acceptance results. Then stop and suggest a break. Once the pull request has merged and `node scripts/feature.mjs status --feature <n>` reports that all phases are done, close the parent issue with `gh issue close <n> --comment "All phases done."`.

## Review feedback

Apply review comments by regenerating the affected documents or tests, as persona-common describes.

## Pushback

Raise pushback to dev-build for a failed walkthrough or test. Raise it to analyst when the behaviour itself is wrong, and to po when the outcome no longer makes sense. The steps are in persona-common.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS for every file, including this task's 12 tests.

- [ ] **Step 6: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): developer and user skills"
git push
```

### Task 9: AGENTS.md section for the lifecycle

**Files:**
- Create: `skills/init-repo/assets/lifecycle/agents-section.md`
- Modify: `skills/init-repo/assets/AGENTS.md.tmpl`
- Test: `skills/init-repo/tests/agents-section.test.mjs`

**Interfaces:**

The task produces `agents-section.md`, whose first line is `## Feature lifecycle`. The same text appears verbatim in `AGENTS.md.tmpl`, directly before `## Project Narrative`. Task 10 prints it for target repos whose `AGENTS.md` lacks the heading. Task 6's linter already covers it (no backticked PascalCase and no hand-edit phrasing), because it lives in the kit.

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/agents-section.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "../assets");
const sectionText = () => readFileSync(join(ASSETS, "lifecycle", "agents-section.md"), "utf8").trim();
const template = () => readFileSync(join(ASSETS, "AGENTS.md.tmpl"), "utf8");

test("agents section starts with its heading", () => {
  assert.ok(sectionText().startsWith("## Feature lifecycle\n"));
});

test("agents section included in template", () => {
  assert.ok(template().includes(sectionText()));
});

test("agents section sits before Project Narrative", () => {
  const text = template();
  assert.ok(text.indexOf("## Feature lifecycle") < text.indexOf("## Project Narrative"));
  assert.ok(text.indexOf("## Feature lifecycle") > text.indexOf("## Detailed implementation plans"));
});

test("agents section names the gate and its only bypass", () => {
  const text = sectionText();
  for (const needle of ["feature-gate", "gate-override", "feature-park", "checkpoint"]) assert.ok(text.includes(needle), needle);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/init-repo/tests/agents-section.test.mjs`
Expected: FAIL with `ENOENT` for `agents-section.md`.

- [ ] **Step 3: Create `skills/init-repo/assets/lifecycle/agents-section.md`**

```markdown
## Feature lifecycle

Features in this repository follow the persona workflow: product owner, analyst, architect, developer (plan, then build) and user. Each role is a phase with its own artefact under `docs/features/<slug>/`, its own GitHub sub-issue and its own reviewed pull request. Start, check or resume a feature with the `feature` skill. Each role has its own `feature-<role>` skill.

- **The order of the phases is enforced.** Each persona skill checks the gate before doing any work, and the required `feature-gate` check fails a phase pull request whose earlier phases are not done.
- **The only bypass is the `gate-override` label** on the pull request, with the reason given in its Narrative sections. The admin override for merging is separate, and it does not open a gate.
- **Every handoff is a checkpoint.** The skill stops and suggests a break. Do not start the next phase in the same session without one.
- **Park side issues** with the `feature-park` skill rather than working on them.
- **Artefacts are generated.** Review feedback and pushback are applied by re-running the role's skill, never by changing files directly.
```

- [ ] **Step 4: Include it in the template.** In `skills/init-repo/assets/AGENTS.md.tmpl`, insert the exact contents of `agents-section.md`, followed by one blank line, directly above the line `## Project Narrative`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS for every file, including this task's 4 tests.

- [ ] **Step 6: Commit and push**

```
git add -A
git commit -m "feat(init-repo): AGENTS.md feature lifecycle section"
git push
```
