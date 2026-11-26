import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const BASELINE_ASSET = new URL("../assets/files/docs/architecture-baseline.md.dotnet", import.meta.url);
const INIT_REPO_SKILL = new URL("../SKILL.md", import.meta.url);
const shapeStep = () => work.slice(work.indexOf("3. Work out the rest of the shape")).split("\n")[0];

test("architect counts infrastructure files in the repo as built", () => {
  has(work, ["the infrastructure files already in the repo", "count as what is built"]);
});

test("init-repo asks for the seeded baseline to be reviewed on an existing repo", () => {
  assert.ok(readFileSync(INIT_REPO_SKILL, "utf8").includes("review the seeded `docs/architecture-baseline.md` with the user"));
});

test("architect's shape questions share the deployment rules and budget", () => {
  has(shapeStep(), ["the same rules as step 2", "share its budget of five", "do not reopen"]);
});

test("baseline separates backups from data retention", () => {
  const text = readFileSync(BASELINE_ASSET, "utf8");
  assert.ok(!text.includes("kept for as long as the feature's data-retention quality attribute needs"));
  has(text, ["point-in-time recovery", "longer than the backup window"]);
});

test("architect suggests a baseline update only on a second feature", () => {
  assert.ok(!work.includes("repeats a departure an earlier feature made"));
  has(work, ["the same departure appears in a second feature"]);
});

test("architect supersedes an ADR the vision contradicts", () => {
  has(work, ["contradicts an accepted ADR", "supersedes it"]);
});

test("architect's adapters table works without a baseline", () => {
  has(work, ["or, with no baseline, the environments settled in step 2"]);
});
