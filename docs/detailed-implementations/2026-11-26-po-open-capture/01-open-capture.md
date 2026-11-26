# 01 — Open capture (Task 1)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

This increment delivers the whole feature: feature-po hears the product owner out in an "Any more thoughts?" loop, asks directed questions only for the gaps, and keeps the owner's words as the vision's last section. It depends on nothing outside the existing `LifecycleKit`. When it is done, the next `init-repo` run installs it in every target repo.

### Task 1: open capture in feature-po

**Files:**
- Modify: `skills/init-repo/assets/lifecycle/skills/feature-po/SKILL.md` (`### Good output`, `## Work`, `## Review feedback`)
- Modify: `README.md` (the `feature-po` row of the skill table)
- Test: `skills/init-repo/tests/persona-skills.test.mjs`

**Interfaces:**

```yaml
# Consumes: tests/helpers/skill-text.mjs readSkill(name) -> string, section(text, heading) -> string
# Produces: nothing later tasks use. The feature-po headings and their order are unchanged,
# so lifecycle-skills.test.mjs keeps passing.
vision section: "In the PO's own words"   # last section of 01-vision.md, or of the PO section of feature.md
loop prompt: "Any more thoughts?"          # the only thing asked during open capture
```

- [ ] **Step 1: Write the failing tests**

Append to `skills/init-repo/tests/persona-skills.test.mjs`, after the `po names its artefact` test:

```js
test("po hears the idea out before asking directed questions", () => {
  const work = section(readSkill("feature-po"), "## Work");
  for (const needle of [
    "Any more thoughts?",
    "Do not summarise, sort, question or follow up",
    "until the user says they are done",
    "first contribution",
  ]) {
    assert.ok(work.includes(needle), needle);
  }
  assert.ok(work.indexOf("Any more thoughts?") < work.indexOf("one question at a time"), "open capture comes first");
});

test("po keeps the owner's own words in the vision", () => {
  const text = readSkill("feature-po");
  const work = section(text, "## Work");
  for (const needle of ["In the PO's own words", "feature.md", "never rewrites In the PO's own words", "append"]) {
    assert.ok(work.includes(needle), needle);
  }
  assert.match(section(text, "### Good output"), /own words/);
  assert.match(section(text, "## Review feedback"), /In the PO's own words/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/init-repo/tests/persona-skills.test.mjs`
Expected: the two new tests FAIL (first on `Any more thoughts?`, second on `In the PO's own words`); every other test passes.

- [ ] **Step 3: Change `### Good output` in feature-po**

After the bullet `- the research findings, summarised with their sources.`, add:

```markdown
- the PO's own words, as they gave them before any directed question.
```

Change the bullet before it to end with `;` instead of `.`.

- [ ] **Step 4: Replace `## Work` in feature-po**

Replace the whole numbered list under `## Work` with:

```markdown
1. Open capture. Ask the user to describe the idea in their own words, however they like. Anything they said when they asked for this skill is their first contribution. After each contribution, acknowledge it in one line and ask only "Any more thoughts?". Do not summarise, sort, question or follow up while the loop runs, because directed questions close the capture too early. Keep going until the user says they are done.
2. Fill the gaps. Check what was captured against the problem, the users, the outcomes and their measures, and the scope. Ask about only what is still missing or unclear, one question at a time.
3. Offer research: say what you would look into and why. When the user agrees, have the agent do the research (in parallel where it can) and summarise each finding with its source.
4. Generate `01-vision.md` with these sections: Problem, Users, Outcomes and measures, Scope, Out of scope, Research, In the PO's own words. In lite mode they go in the PO section of `feature.md`. The last section holds every open-capture contribution in the order given, lightly tidied (typos fixed, fragments joined) but not sorted, reworded or trimmed, including thoughts the other sections do not use. Show the vision, take the user's steering, and regenerate it until they accept it. Regenerating never rewrites In the PO's own words: when the user adds new thoughts, in steering, in review or in amendment mode, append them to it.
5. Tick the exit criteria as they are met.
```

- [ ] **Step 5: Change `## Review feedback` in feature-po**

Replace its sentence with:

```markdown
Apply review comments by regenerating the vision, as persona-common describes. Leave In the PO's own words as it is, except to append any new thoughts the product owner adds.
```

- [ ] **Step 6: Change the README row**

In `README.md`, replace the `feature-po` row with:

```markdown
| `feature-po` | Act as product owner: hear the idea out in the owner's own words, fill the gaps, ask for research, set out the vision. |
```

- [ ] **Step 7: Run every test to verify they pass**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS, 0 failures.

- [ ] **Step 8: Check the ontology terms**

Run: `git add skills/init-repo/assets/lifecycle/skills/feature-po/SKILL.md skills/init-repo/tests/persona-skills.test.mjs README.md && git diff --cached --name-only && node scripts/check-ontology-terms.mjs`
Expected: exactly those three files are listed, then `ontology term check: OK`.

- [ ] **Step 9: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): let the product owner talk freely before directed questions"
git push
```
