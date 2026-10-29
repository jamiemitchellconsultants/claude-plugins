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
