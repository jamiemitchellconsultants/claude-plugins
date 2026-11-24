# 01 — Analyst depth (Tasks 1–4)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

This increment delivers the whole feature: the analyst's uncertainty scan, quality attributes with Q ids from the analyst through to acceptance, behaviour priority driving increment order, the optional `[P]` task marker, and feature-analyze checks for all of them. It depends only on the existing `LifecycleKit`. When it is done, the next `init-repo` run installs the changes in every target repo. All skill paths below are under `skills/init-repo/assets/lifecycle/skills/`.

### Task 1: the analyst's scan, quality attributes and priority

**Files:**
- Create: `skills/init-repo/tests/analyst-depth.test.mjs`
- Modify: `feature-analyst/SKILL.md` (Role brief, Behaviour ids, Work steps 2 and 3, Pushback)
- Modify: `docs/ontology.ttl`, then regenerate `docs/ontology.md`

**Interfaces:**

```yaml
# Consumes: tests/helpers/skill-text.mjs readSkill(name) -> string, section(text, heading) -> string
# Consumes: feature-lib.mjs EXIT_CRITERIA: { [phaseId]: { text: string, lite: boolean }[] }
# Produces (prose conventions later tasks rely on):
#   quality attribute ids Q1, Q2 ...; written <slug>#Q<n> outside the feature
#   behaviour priorities P1, P2, P3
#   02-behaviours.md section "Quality attributes"
# Produces (ontology): Behaviour, QualityAttribute, BehaviourPriority {P1, P2, P3}
```

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/analyst-depth.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readSkill, section } from "./helpers/skill-text.mjs";
import { EXIT_CRITERIA } from "../assets/lifecycle/scripts/feature-lib.mjs";

const SCAN = [
  "scope and user boundaries",
  "domain entities and their terms",
  "edge and error cases",
  "quality attributes",
  "integrations and external systems",
  "completion signals",
];

test("analyst scans every uncertainty heading", () => {
  const work = section(readSkill("feature-analyst"), "## Work");
  for (const heading of SCAN) assert.ok(work.includes(heading), heading);
});

test("analyst asks at most five, with a recommended answer", () => {
  const work = section(readSkill("feature-analyst"), "## Work");
  for (const needle of ["the five that would change the behaviours most", "one question at a time", "recommended answer", "the analyst's call"]) {
    assert.ok(work.includes(needle), needle);
  }
});

test("analyst writes quality attributes with Q ids", () => {
  const text = readSkill("feature-analyst");
  assert.match(section(text, "## Work"), /Quality attributes, each with its id, a measurable statement and the outcome it serves/);
  const ids = section(text, "## Behaviour ids");
  for (const needle of ["Q ids (Q1, Q2 and so on)", "`<slug>#Q<n>`"]) assert.ok(ids.includes(needle), needle);
});

test("analyst gives every behaviour a priority", () => {
  const work = section(readSkill("feature-analyst"), "## Work");
  for (const needle of ["its priority", "P1", "P2", "P3"]) assert.ok(work.includes(needle), needle);
});

test("analyst keeps ids through a priority change", () => {
  assert.match(section(readSkill("feature-analyst"), "## Behaviour ids"), /A change of priority is not a change of meaning/);
});

test("exit criteria are unchanged", () => {
  for (const [phase, items] of Object.entries(EXIT_CRITERIA)) {
    for (const { text } of items) assert.doesNotMatch(text, /quality|priority|\bQ\d|\[P\]/i, `${phase}: ${text}`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test skills/init-repo/tests/analyst-depth.test.mjs`
Expected: FAIL on every test except `exit criteria are unchanged`, which passes now and pins the current state.

- [ ] **Step 3: Edit the analyst skill**

In `feature-analyst/SKILL.md`:

1. Under `### Cares about`, add after the "What the system does" bullet:

   > - How well it must do it: quality attributes such as performance, security and accessibility, each one measurable.

2. In `### Good output`, after the first sentence, add:

   > Each behaviour has a priority. Each quality attribute has an id (Q1, Q2 and so on) and a measure.

3. At the end of `## Behaviour ids`, add this bullet:

   > - Quality attributes have Q ids (Q1, Q2 and so on), and every rule above applies to them in the same way: they are never renumbered or reused, a retired one moves to the Retired behaviours section, and outside this feature it is written `<slug>#Q<n>`. A change of priority is not a change of meaning, so a behaviour keeps its id when its priority changes.

4. Replace Work step 2 ("List the uncertainties you can see. … explicitly deferred as out of scope.") with:

   > 2. Scan the vision for uncertainties under each of these headings, and list what is unclear under each:
   >    - scope and user boundaries;
   >    - domain entities and their terms, checked against the ontology;
   >    - edge and error cases;
   >    - quality attributes, such as performance, security and privacy, accessibility, reliability and data retention;
   >    - integrations and external systems;
   >    - completion signals, meaning how anyone will know an outcome is met.
   >
   >    Ask the user about the five that would change the behaviours most, one question at a time, each with a recommended answer they can accept as it stands. Decide the rest yourself, and record each one in the uncertainty log as the analyst's call, so the user can overturn it while reviewing. Any of them may instead be explicitly deferred as out of scope.

5. In Work step 3, replace the Behaviours bullet with these two bullets:

   > - Behaviours, grouped by outcome, each with its id, its priority (P1 when it is needed for the first usable release, P2 when it is wanted soon after, P3 when it would be nice) and its Given/When/Then scenario;
   > - Quality attributes, each with its id, a measurable statement and the outcome it serves (or all of them);

6. In `## Pushback`, change "list in the handoff the ids added, changed and retired" to "list in the handoff the behaviour and quality attribute ids added, changed and retired".

- [ ] **Step 4: Add the ontology terms**

In `docs/ontology.ttl`, after the `:FeatureArtefact` block, add:

```turtle
:Behaviour a owl:Class ;
    rdfs:subClassOf kit:Entity ;
    rdfs:label "Behaviour" ;
    rdfs:comment "An observable system behaviour in `02-behaviours.md`, written by the analyst as a Given/When/Then scenario with a permanent B id and a `BehaviourPriority`." ;
    kit:invariant "its id is never renumbered or reused; a change of meaning retires it and takes a new id, while a change of priority keeps it." ;
    kit:definedIn "[design](superpowers/specs/2026-11-24-analyst-depth-design.md)" .

:QualityAttribute a owl:Class ;
    rdfs:subClassOf kit:Entity ;
    rdfs:label "QualityAttribute" ;
    rdfs:comment "A measurable quality the system must meet, such as performance, security or accessibility, in `02-behaviours.md` with a permanent Q id. The analyst writes it, the architect traces it to components, and acceptance proves it." ;
    kit:invariant "follows the same id rules as a `Behaviour`, and is never placed in an increment." ;
    kit:definedIn "[design](superpowers/specs/2026-11-24-analyst-depth-design.md)" .

:BehaviourPriority a owl:Class ;
    rdfs:subClassOf kit:Enum ;
    rdfs:label "BehaviourPriority" ;
    rdfs:comment "How soon a `Behaviour` is needed. Increments are ordered by it after the walking skeleton." .

:BehaviourPriority_P1 a :BehaviourPriority ;
    rdfs:label "P1" ;
    rdfs:comment "Needed for the first usable release." .

:BehaviourPriority_P2 a :BehaviourPriority ;
    rdfs:label "P2" ;
    rdfs:comment "Wanted soon after." .

:BehaviourPriority_P3 a :BehaviourPriority ;
    rdfs:label "P3" ;
    rdfs:comment "Would be nice." .
```

Then run `node scripts/build-ontology.mjs`.
Expected: `docs/ontology.md` regenerated, listing the three new terms.

- [ ] **Step 5: Run all the tests and the ontology checks**

```bash
node --test skills/init-repo/tests/*.test.mjs
node scripts/build-ontology.mjs --check
git add -A
node scripts/check-ontology-terms.mjs
```

Expected: all tests pass, and both ontology commands exit 0.

- [ ] **Step 6: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): analyst scans uncertainty, writes quality attributes and priorities"
git push
```

### Task 2: architect and developer

**Files:**
- Modify: `feature-architect/SKILL.md` (Work step 3)
- Modify: `feature-dev/SKILL.md` (Work, plan steps 2 and 4)
- Test: `skills/init-repo/tests/analyst-depth.test.mjs`

**Interfaces:**

```yaml
# Consumes: Q ids, P1-P3 and the "Quality attributes" section from Task 1
# Produces: the task heading marker "### Task N: <name> [P]"
```

- [ ] **Step 1: Write the failing tests**

Append to `analyst-depth.test.mjs`:

```js
test("architect traces quality attributes", () => {
  assert.match(section(readSkill("feature-architect"), "## Work"), /every behaviour id and quality attribute id/);
});

test("dev orders increments by priority", () => {
  const work = section(readSkill("feature-dev"), "## Work");
  assert.match(work, /by the behaviours' priority \(P1, then P2, then P3\)/);
  assert.match(work, /say why in the increment table/);
});

test("dev keeps quality attributes out of the one-increment rule", () => {
  const work = section(readSkill("feature-dev"), "## Work");
  assert.match(work, /Quality attribute ids are not placed in increments/);
  assert.ok(work.includes("exactly one increment"));
});

test("dev defines the parallel marker as order only", () => {
  const work = section(readSkill("feature-dev"), "## Work");
  for (const needle of ["`### Task N: <name> [P]`", "only says that order does not matter", "one at a time, each with its own commit and push", "Leaving a task unmarked is always correct"]) {
    assert.ok(work.includes(needle), needle);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/init-repo/tests/analyst-depth.test.mjs`
Expected: the four new tests FAIL; Task 1's pass.

- [ ] **Step 3: Edit the architect skill**

In `feature-architect/SKILL.md` Work step 3, replace the Traceability bullet with:

> - Traceability, a table from every behaviour id and quality attribute id to the components or mechanisms that serve it (no row may be empty);

- [ ] **Step 4: Edit the developer skill**

In `feature-dev/SKILL.md`, plan step 2:

1. Replace "then order by dependency and risk." with:

   > then order by the behaviours' priority (P1, then P2, then P3), and by dependency and risk within each priority. Where a dependency forces a lower-priority behaviour earlier, say why in the increment table.

2. After "Every behaviour id belongs to exactly one increment.", add:

   > Quality attribute ids are not placed in increments. Instead, each increment row names the Q ids its tasks must respect, and those tasks name the tests that measure them where a test can.

3. Change "(increment → behaviour ids → task range)" to "(increment → behaviour ids → quality attribute ids to respect → task range)".

At the end of plan step 4, add:

> A task may end its heading with `[P]`, as in `### Task N: <name> [P]`, when it touches no file that another unfinished task in its increment touches and uses nothing those tasks produce. The marker only says that order does not matter. Tasks are still executed one at a time, each with its own commit and push, unless the executor runs them in separate worktrees and merges them before the increment ends. Leaving a task unmarked is always correct.

- [ ] **Step 5: Run all the tests**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS, including the existing `dev slices the feature into increments before writing tasks`.

- [ ] **Step 6: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): trace quality attributes and order increments by priority"
git push
```

### Task 3: acceptance proves quality attributes

**Files:**
- Modify: `feature-user/SKILL.md` (Good output, Work steps 4 to 7)
- Test: `skills/init-repo/tests/analyst-depth.test.mjs`

**Interfaces:**

```yaml
# Consumes: Q ids from Task 1
# Produces: a quality attribute check per Q id in 05-acceptance.md
```

- [ ] **Step 1: Write the failing test**

Append:

```js
test("user proves every quality attribute", () => {
  const text = readSkill("feature-user");
  assert.match(section(text, "### Good output"), /Every quality attribute has an acceptance check/);
  const work = section(text, "## Work");
  for (const needle of ["For each quality attribute id", "a scripted inspection with its expected result", "for each behaviour and quality attribute in each environment"]) {
    assert.ok(work.includes(needle), needle);
  }
  assert.ok(work.indexOf("For each quality attribute id") < work.indexOf("Run both layers"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test skills/init-repo/tests/analyst-depth.test.mjs`
Expected: `user proves every quality attribute` FAILS.

- [ ] **Step 3: Edit the user skill**

In `feature-user/SKILL.md`:

1. In `### Good output`, after the first sentence, add: "Every quality attribute has an acceptance check too, run in both environments."
2. After Work step 4, insert a new step 5 and renumber the steps after it (5 → 6, 6 → 7, 7 → 8):

   > 5. For each quality attribute id, write an acceptance check in `05-acceptance.md`: an executable check where the attribute can be measured (a load test, an accessibility scan, a security check), otherwise a scripted inspection with its expected result.

3. In the step that begins "Run both layers in each environment", change its first sentence to "Run both layers, and the quality attribute checks, in each environment: first in a local build, then in the deployed environment from the runbook."
4. In the step that begins "Record the results in `05-acceptance.md`", change "for each behaviour in each environment" to "for each behaviour and quality attribute in each environment".

- [ ] **Step 4: Run all the tests**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS, including `user approves the executable test after the walkthrough`.

- [ ] **Step 5: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): acceptance proves quality attributes"
git push
```

### Task 4: feature-analyze reports the new gaps

**Files:**
- Modify: `feature-analyze/SKILL.md` (Steps, step 3)
- Test: `skills/init-repo/tests/analyst-depth.test.mjs`

**Interfaces:**

```yaml
# Consumes: Q ids, priorities and the increment ordering rule from Tasks 1-3
# Produces: no new surface
```

- [ ] **Step 1: Write the failing test**

Append:

```js
test("analyze checks quality attributes and priority", () => {
  const steps = section(readSkill("feature-analyze"), "## Steps");
  for (const needle of ["a quality attribute id with no component or no acceptance check", "the same rules apply to quality attribute ids", "increments ordered against behaviour priority with no reason given"]) {
    assert.ok(steps.includes(needle), needle);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test skills/init-repo/tests/analyst-depth.test.mjs`
Expected: `analyze checks quality attributes and priority` FAILS.

- [ ] **Step 3: Edit feature-analyze**

In `feature-analyze/SKILL.md` step 3:
- end the **Coverage** bullet with "; a quality attribute id with no component or no acceptance check." (replacing its final full stop);
- end the **Id hygiene** bullet with "; the same rules apply to quality attribute ids.";
- end the **Contradiction** bullet with "; or increments ordered against behaviour priority with no reason given.".

- [ ] **Step 4: Run all the tests**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS, including `analyze names every finding kind`.

- [ ] **Step 5: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): analyze checks quality attributes and priority"
git push
```

Increment done. This is the last increment, so the work is ready for its pull request.
