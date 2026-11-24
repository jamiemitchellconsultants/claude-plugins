# 01 — feature-analyze (Tasks 1–2)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

This increment delivers the whole feature: the advisory feature-analyze skill and the nudges to run it before planning. It depends on nothing outside the existing `LifecycleKit`. When it is done, the next `init-repo` run installs the skill in every target repo.

### Task 1: the feature-analyze skill

**Files:**
- Create: `skills/init-repo/assets/lifecycle/skills/feature-analyze/SKILL.md`
- Test: `skills/init-repo/tests/analyze-skill.test.mjs`
- Modify: `skills/init-repo/tests/init-files.test.mjs` (the `KIT_FILES` list)
- Modify: `docs/ontology.ttl` (the `LifecycleKit` comment), then regenerate `docs/ontology.md`
- Modify: `README.md` (the skill table and its count)
- Modify: `skills/init-repo/SKILL.md` (the Feature lifecycle kit row)

**Interfaces:**

```yaml
# Consumes: node scripts/feature.mjs status [--feature <n>]  (existing; read only)
# Consumes: tests/helpers/skill-text.mjs readSkill(name) -> string, section(text, heading) -> string
# Produces: a skill folder the existing lifecycle-skills.test.mjs linters also check
name: feature-analyze        # equals the folder name
description: Use when ...    # one plain line, no ": "
```

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/analyze-skill.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSkill, section } from "./helpers/skill-text.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SKILLS = join(ROOT, "skills/init-repo/assets/lifecycle/skills");
const COMMAND_REF = /node scripts\/feature\.mjs ([a-z-]+)/g;
const KINDS = ["Coverage", "Id hygiene", "Terminology drift", "Ambiguity", "Contradiction"];

test("the kit has the analyze skill", () => {
  assert.ok(readdirSync(SKILLS).includes("feature-analyze"));
});

test("analyze is not a persona", () => {
  const lines = readSkill("feature-analyze").split("\n");
  for (const heading of ["## Gate check", "### Exit criteria", "## Checkpoint"]) {
    assert.ok(!lines.includes(heading), heading);
  }
});

test("analyze changes nothing", () => {
  const text = readSkill("feature-analyze");
  assert.deepEqual([...new Set([...text.matchAll(COMMAND_REF)].map((m) => m[1]))], ["status"]);
  assert.match(text, /changes no file/);
  assert.match(text, /posts nothing/);
});

test("analyze names every finding kind", () => {
  const text = readSkill("feature-analyze");
  for (const kind of KINDS) assert.ok(text.includes(`**${kind}**`), kind);
});

test("analyze reviews only what exists", () => {
  assert.match(readSkill("feature-analyze"), /never report a later artefact as missing/);
});

test("analyze reads lite mode", () => {
  assert.ok(readSkill("feature-analyze").includes("docs/features/<slug>/feature.md"));
});

test("analyze caps and ranks the report", () => {
  const text = readSkill("feature-analyze");
  for (const needle of ["most important first", "about ten", "**before next phase**", "**worth a look**"]) {
    assert.ok(text.includes(needle), needle);
  }
});

test("analyze says so when nothing is found", () => {
  assert.match(readSkill("feature-analyze"), /If nothing is found, say so in one line/);
});

test("analyze offers the existing routes", () => {
  const text = readSkill("feature-analyze");
  for (const needle of ["pushback", "review feedback", "feature-park", "unless the user asks"]) {
    assert.ok(text.includes(needle), needle);
  }
});

test("the kit docs list the analyze skill", () => {
  for (const file of ["README.md", "skills/init-repo/SKILL.md"]) {
    assert.ok(readFileSync(join(ROOT, file), "utf8").includes("`feature-analyze`"), file);
  }
});
```

`section` is imported now because Task 2 adds the tests that use it.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test skills/init-repo/tests/analyze-skill.test.mjs`
Expected: FAIL. `the kit has the analyze skill` fails, and the others fail with ENOENT for `feature-analyze/SKILL.md`.

- [ ] **Step 3: Write the skill**

Create `skills/init-repo/assets/lifecycle/skills/feature-analyze/SKILL.md` with exactly:

````markdown
---
name: feature-analyze
description: Use when checking a feature's artefacts against each other before moving on, such as after the architect phase and before planning, to find gaps, behaviour id mistakes, terminology drift, vague wording or contradictions without changing anything.
---

# Analyze a feature

This skill reviews a feature's artefacts against each other and reports where they disagree, so that drift is caught before it turns into the wrong work downstream. It is advisory. It changes no file, posts nothing and never blocks a phase. It is not a persona: it owns no phase and has no gate, so it can be run at any phase, as often as is useful.

Read the artefacts as prose. Any reasonable layout is fine, so never ask for headings or tables to be reshaped to make them easier to check.

## Steps

1. Find the feature. If the user has not said which one, run `node scripts/feature.mjs status` and ask. Then run `node scripts/feature.mjs status --feature <n>` for its slug, its mode and its current phase.
2. Read whatever exists so far:
   - in full mode, `01-vision.md`, `02-behaviours.md`, `03-architecture.md` and the ADRs it links, and the `05-` files, all under `docs/features/<slug>/`;
   - in lite mode, the sections of `docs/features/<slug>/feature.md`;
   - in either mode, the plans under `docs/superpowers/plans/<slug>/` and `docs/detailed-implementations/<slug>/`, and the repo's ontology.

   Review only what exists. A feature in the analyst phase has no architecture yet, so never report a later artefact as missing.
3. Look for these kinds of finding across the artefacts that exist:
   - **Coverage**: an outcome with no behaviour; a behaviour id with no component, no increment, or no walkthrough and acceptance test; an increment or task that serves no behaviour.
   - **Id hygiene**: a behaviour id used downstream that does not exist or has been retired; an id that was reused or renumbered; a behaviour whose meaning changed but kept its id.
   - **Terminology drift**: a domain term that differs from the ontology's name for it, or one term used with two meanings.
   - **Ambiguity**: vague or unmeasurable wording in an outcome or a behaviour, such as "fast", "secure" or "as appropriate", and scenarios a developer could not write a test from.
   - **Contradiction**: artefacts that disagree, or a later artefact that quietly re-decides an earlier one, such as its scope, its structure or a recorded decision.
4. Report in chat, most important first. For each finding, give the artefacts and the places involved, what is wrong, and the role whose skill owns the fix. Mark each one **before next phase** when it will turn into wrong work downstream, or **worth a look** otherwise. Keep to about ten findings; if there are more, say how many were left out. If nothing is found, say so in one line.
5. Offer the existing routes for any finding the user wants acted on: pushback to the earlier phase that owns it, as the feature skill's Recording pushback describes; review feedback on an open pull request; or feature-park for something outside the feature. Take none of them unless the user asks.

## What it never does

- Change an artefact. A fix comes from re-running the skill of the role that owns it, as the ground rules require.
- Tick a criterion, post a handoff, or stop a phase from starting.
````

- [ ] **Step 4: List the skill in the kit's docs and the install test**

- `skills/init-repo/tests/init-files.test.mjs`: add `".claude/skills/feature-analyze/SKILL.md",` to `KIT_FILES` after the `.kiro/skills/feature-analyst/SKILL.md` entry.
- `README.md`: change "Seven portable skills" to "Eight portable skills", and add this row after the `feature-park` row:

  ```markdown
  | `feature-analyze` | Check a feature's artefacts against each other and report gaps, behaviour id mistakes, terminology drift, vague wording and contradictions. It changes nothing and blocks nothing. |
  ```
- `skills/init-repo/SKILL.md`: in the Feature lifecycle kit row, change `` `feature-user`, `feature-park`) `` to `` `feature-user`, `feature-park`, `feature-analyze`) ``.

- [ ] **Step 5: Update the ontology**

In `docs/ontology.ttl`, in the `:LifecycleKit` comment, change ``plus the `feature` and `feature-park` skills`` to ``plus the `feature`, `feature-park` and `feature-analyze` skills``. Then run:

```bash
node scripts/build-ontology.mjs
```

Expected: `docs/ontology.md` is regenerated, and its `LifecycleKit` row shows the new text.

- [ ] **Step 6: Run all the tests**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS, including the existing `lifecycle-skills.test.mjs` linters (frontmatter, no backticked PascalCase, no hand-edit instruction, referenced subcommands exist) for the new skill.

- [ ] **Step 7: Check the ontology and terms**

```bash
node scripts/build-ontology.mjs --check
git add -A
node scripts/check-ontology-terms.mjs
```

Expected: both exit 0.

- [ ] **Step 8: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): add the advisory feature-analyze skill"
git push
```

### Task 2: the nudges

**Files:**
- Modify: `skills/init-repo/assets/lifecycle/skills/feature-architect/SKILL.md` (`## Checkpoint`)
- Modify: `skills/init-repo/assets/lifecycle/skills/feature/SKILL.md` (`## Where am I, and resuming after a break`)
- Test: `skills/init-repo/tests/analyze-skill.test.mjs`

**Interfaces:**

```yaml
# Consumes: the feature-analyze skill from Task 1, by name only
# Produces: no new surface; two existing sections each name feature-analyze
```

- [ ] **Step 1: Write the failing tests**

Append to `skills/init-repo/tests/analyze-skill.test.mjs`:

```js
test("architect checkpoint suggests analyze", () => {
  const checkpoint = section(readSkill("feature-architect"), "## Checkpoint");
  assert.match(checkpoint, /feature-analyze/);
  assert.ok(checkpoint.indexOf("feature-analyze") < checkpoint.indexOf("The next skill is feature-dev"));
});

test("resume mentions analyze", () => {
  assert.match(section(readSkill("feature"), "## Where am I, and resuming after a break"), /feature-analyze/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/init-repo/tests/analyze-skill.test.mjs`
Expected: FAIL on `architect checkpoint suggests analyze` and `resume mentions analyze`.

- [ ] **Step 3: Add the architect nudge**

In `feature-architect/SKILL.md` `## Checkpoint`, insert this sentence before "The next skill is feature-dev.":

> Before planning starts, suggest a run of feature-analyze to check the vision, behaviours and architecture against each other. It only reports, so whether to run it is the user's call.

- [ ] **Step 4: Add the resume step**

In `feature/SKILL.md` `## Where am I, and resuming after a break`, add after step 4:

> 5. If the next skill is feature-dev or a later one, mention that feature-analyze can check the artefacts so far against each other. It only reports, so it is optional.

- [ ] **Step 5: Run all the tests**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): suggest feature-analyze before planning"
git push
```

Increment done. This is the last increment, so the work is ready for its pull request.
