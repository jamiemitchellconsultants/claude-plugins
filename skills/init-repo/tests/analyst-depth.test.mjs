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
  for (const needle of ["at most five, the ones that would change the behaviours most", "one question at a time", "recommended answer", "the analyst's call"]) {
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

test("user proves every quality attribute", () => {
  const text = readSkill("feature-user");
  assert.match(section(text, "### Good output"), /Every quality attribute has an acceptance check/);
  const work = section(text, "## Work");
  for (const needle of ["For each quality attribute id", "a scripted inspection with its expected result", "for each behaviour and quality attribute in each environment"]) {
    assert.ok(work.includes(needle), needle);
  }
  assert.ok(work.indexOf("For each quality attribute id") < work.indexOf("Run both layers"));
});

test("analyze checks quality attributes and priority", () => {
  const steps = section(readSkill("feature-analyze"), "## Steps");
  for (const needle of ["a quality attribute id with no component or no acceptance check", "the same rules apply to quality attribute ids", "increments ordered against behaviour priority with no reason given"]) {
    assert.ok(steps.includes(needle), needle);
  }
});

test("user acceptance flow runs and records quality attribute checks", () => {
  const work = section(readSkill("feature-user"), "## Work");
  for (const needle of ["an executable check in the repo's test suite", "Follow each scripted inspection", "for a quality attribute, the kind of check, its result, the date and who ran it"]) {
    assert.ok(work.includes(needle), needle);
  }
});

test("analyst never pads the questions to five", () => {
  assert.match(section(readSkill("feature-analyst"), "## Work"), /at most five, the ones that would change the behaviours most/);
});
