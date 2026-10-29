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
