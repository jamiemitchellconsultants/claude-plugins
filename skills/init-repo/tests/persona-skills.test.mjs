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
