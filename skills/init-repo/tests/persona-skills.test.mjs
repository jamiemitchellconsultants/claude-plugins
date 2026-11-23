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
