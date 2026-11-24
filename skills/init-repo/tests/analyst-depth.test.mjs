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
