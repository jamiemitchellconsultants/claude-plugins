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

test("architect checkpoint suggests analyze", () => {
  const checkpoint = section(readSkill("feature-architect"), "## Checkpoint");
  assert.match(checkpoint, /feature-analyze/);
  assert.ok(checkpoint.indexOf("feature-analyze") < checkpoint.indexOf("The next skill is feature-dev"));
});

test("resume mentions analyze", () => {
  assert.match(section(readSkill("feature"), "## Where am I, and resuming after a break"), /feature-analyze/);
});
