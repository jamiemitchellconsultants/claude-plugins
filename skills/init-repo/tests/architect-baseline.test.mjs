import { test } from "node:test";
import assert from "node:assert/strict";
import { readSkill, section } from "./helpers/skill-text.mjs";

const text = readSkill("feature-architect");
const work = section(text, "## Work");
const has = (haystack, needles) => {
  for (const needle of needles) assert.ok(haystack.includes(needle), needle);
};

test("architect reads the baseline and what is built", () => {
  has(work, ["docs/architecture-baseline.md", "the architecture of earlier features", "the accepted ADRs in `docs/adr/`"]);
});

test("architect settles deployment before the rest of the shape", () => {
  const settle = work.indexOf("2. Settle the deployment");
  const shape = work.indexOf("3. Work out the rest of the shape");
  assert.ok(settle >= 0, "a Settle the deployment step");
  assert.ok(shape > settle, "the shape step follows it");
  assert.doesNotMatch(work.slice(shape).split("\n")[0], /deployment/);
});

test("architect lets what is built win over the baseline", () => {
  has(work, [
    "wins over the baseline",
    "is not recorded again",
    "suggest that the user updates `docs/architecture-baseline.md`",
    "follow the vision",
  ]);
});

test("architect defines a departure", () => {
  has(work, ["A departure is", "is not a departure", "Each departure gets an ADR"]);
});

test("architect scans every trigger heading", () => {
  has(work, [
    "who signs in, and with what accounts",
    "stored files or documents",
    "outgoing messages",
    "scheduled or background work",
    "external systems and integrations",
    "app-store distribution",
    "who must reach it",
    "data retention and recovery",
  ]);
});

test("architect asks in the user's terms, at most five", () => {
  has(work, ["at most five", "one question at a time", "never in technology names", "recommended answer", "the architect's call"]);
});

test("architect falls back to first principles", () => {
  has(work, ["does not exist", "from first principles"]);
});

test("architect records environments, adapters and calls", () => {
  has(work, ["an environments table", "an adapters table", "one-line plain explanation"]);
});

test("architect's departure ADR names the baseline line", () => {
  has(work, ["naming the baseline line it departs from"]);
});

test("architect's role brief names the baseline", () => {
  assert.match(section(text, "### Cares about"), /architecture baseline/);
  assert.match(section(text, "### Good output"), /every departure from the baseline has an ADR/);
});
