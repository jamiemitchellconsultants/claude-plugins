import { test } from "node:test";
import assert from "node:assert/strict";
import { readSkill, section } from "./helpers/skill-text.mjs";

const PERSONAS = { "feature-po": ["po"], "feature-analyst": ["analyst"], "feature-architect": ["architect"] };

test("po names its artefact", () => {
  assert.ok(readSkill("feature-po").includes("01-vision.md"));
});

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

test("po does not ask again for an idea already given", () => {
  const work = section(readSkill("feature-po"), "## Work");
  const given = work.indexOf("If the user described the idea when they asked for this skill");
  assert.ok(given >= 0, "conditional on the invoking message");
  assert.ok(given < work.indexOf("Otherwise, ask them to describe the idea"), "the condition comes first");
});

test("po does not steer or park during open capture", () => {
  const text = readSkill("feature-po");
  assert.ok(section(text, "## Work").includes("do not steer back or park anything"));
  assert.ok(section(text, "### Deliberately ignores").includes("Outside open capture"));
});

test("po acknowledges without restating", () => {
  assert.ok(section(readSkill("feature-po"), "## Work").includes("one neutral line, without restating it"));
});

test("po marks the raw words as said, not decided", () => {
  assert.ok(section(readSkill("feature-po"), "## Work").includes("what was said, not what was decided"));
});

test("po appends only the product owner's new ideas", () => {
  const text = readSkill("feature-po");
  const work = section(text, "## Work");
  assert.ok(work.includes("When the product owner adds new thoughts"));
  assert.ok(work.includes("not instructions to change the vision, and never a reviewer's comments"));
  assert.ok(!work.includes("when the user adds new thoughts"));
  assert.ok(section(text, "## Review feedback").includes("the product owner adds"));
});

test("po good output allows thoughts added later", () => {
  const good = section(readSkill("feature-po"), "### Good output");
  assert.ok(!good.includes("before any directed question"));
  assert.ok(good.includes("as captured, plus any they add later"));
});

test("po never reconstructs missing raw words", () => {
  assert.ok(section(readSkill("feature-po"), "## Work").includes("never reconstruct earlier words"));
});

test("analyst asks one question at a time and updates ontology", () => {
  const text = readSkill("feature-analyst");
  assert.ok(text.includes("02-behaviours.md"));
  assert.ok(text.includes("one question at a time"));
  assert.match(text, /ontology/);
});

test("analyst keeps behaviour ids stable", () => {
  const text = readSkill("feature-analyst");
  const ids = section(text, "## Behaviour ids");
  for (const needle of ["never renumbered", "never reused", "highest id ever used", "Retired behaviours", "`<slug>#B<n>`"]) {
    assert.ok(ids.includes(needle), needle);
  }
  assert.match(section(text, "## Work"), /Retired behaviours/);
  assert.match(section(text, "## Pushback"), /added, changed and retired/);
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
