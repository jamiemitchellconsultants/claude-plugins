import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADR_STATUSES,
  ARTEFACT_PHASE,
  FULL_ARTEFACTS,
  checkAdr,
  checkFeatureArtefact,
  parseFrontmatter,
  renderParentBody,
} from "../assets/lifecycle/scripts/feature-lib.mjs";
import { makeGh } from "../assets/lifecycle/scripts/feature-gh.mjs";
import { fullState, liteState } from "./helpers/fixtures.mjs";
import { fakeGh, run, tempDir } from "./helpers/fake-gh.mjs";
import { readSkill, section } from "./helpers/skill-text.mjs";

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "../assets/lifecycle/skills/feature/templates");
const template = (name) => readFileSync(join(TEMPLATES, name), "utf8");

const feature = { number: 1, slug: "demo" };
const doc = (lines) => `---\n${lines.join("\n")}\n---\n\n# Title\n`;
const architecture = doc(["feature: 1", "slug: demo", "phase: architect", "sources: [01-vision.md, 02-behaviours.md]"]);
const adr = (extra = []) => doc(["status: accepted", "date: 2026-11-24", "feature: 1", ...extra]);

test("parseFrontmatter reads scalars, quoted strings and inline lists", () => {
  const result = parseFrontmatter(doc(["feature: 12", 'slug: "demo"', "sources: [01-vision.md, '02-behaviours.md']", "empty: []"]));
  assert.deepEqual(result, { fields: { feature: "12", slug: "demo", sources: ["01-vision.md", "02-behaviours.md"], empty: [] } });
});

test("parseFrontmatter returns null without a leading fence", () => {
  assert.equal(parseFrontmatter("# Title\n\n---\nfeature: 1\n---\n"), null);
});

test("parseFrontmatter reports malformed blocks", () => {
  assert.match(parseFrontmatter("---\nfeature: 1\n").error, /closing ---/);
  assert.match(parseFrontmatter(doc(["feature 1"])).error, /line 1/);
  assert.match(parseFrontmatter(doc(["feature: 1", "feature: 2"])).error, /twice/);
});

test("parseFrontmatter accepts CRLF line endings", () => {
  assert.deepEqual(parseFrontmatter("---\r\nfeature: 1\r\n---\r\n# T\r\n"), { fields: { feature: "1" } });
});

test("every full artefact has a phase", () => {
  assert.deepEqual(Object.keys(ARTEFACT_PHASE).sort(), [...FULL_ARTEFACTS].sort());
});

test("checkFeatureArtefact accepts a correct artefact", () => {
  assert.deepEqual(checkFeatureArtefact({ path: "docs/features/demo/03-architecture.md", text: architecture, feature }), []);
});

test("checkFeatureArtefact ignores files that are not artefacts", () => {
  assert.deepEqual(checkFeatureArtefact({ path: "docs/features/demo/.gitkeep", text: "", feature }), []);
  assert.deepEqual(checkFeatureArtefact({ path: "docs/features/demo/diagram.md", text: "# x", feature }), []);
});

test("checkFeatureArtefact requires frontmatter and says what to write", () => {
  const [reason] = checkFeatureArtefact({ path: "docs/features/demo/02-behaviours.md", text: "# Behaviours\n", feature });
  assert.match(reason, /no frontmatter/);
  assert.match(reason, /feature: 1/);
  assert.match(reason, /phase: analyst/);
  assert.match(reason, /feature-analyst/);
});

test("checkFeatureArtefact flags a wrong feature, slug and phase", () => {
  const text = doc(["feature: 2", "slug: other", "phase: po", "sources: [01-vision.md]"]);
  const reasons = checkFeatureArtefact({ path: "docs/features/demo/03-architecture.md", text, feature });
  assert.equal(reasons.length, 3);
  assert.match(reasons.join("\n"), /feature is 2, expected 1/);
  assert.match(reasons.join("\n"), /slug is other, expected demo/);
  assert.match(reasons.join("\n"), /phase is po, expected architect/);
});

test("checkFeatureArtefact checks sources point at earlier artefacts", () => {
  const later = doc(["feature: 1", "slug: demo", "phase: analyst", "sources: [03-architecture.md]"]);
  assert.match(checkFeatureArtefact({ path: "docs/features/demo/02-behaviours.md", text: later, feature }).join(), /03-architecture\.md is not an earlier artefact/);
  const missing = doc(["feature: 1", "slug: demo", "phase: analyst"]);
  assert.match(checkFeatureArtefact({ path: "docs/features/demo/02-behaviours.md", text: missing, feature }).join(), /sources/);
  const vision = doc(["feature: 1", "slug: demo", "phase: po", "sources: [02-behaviours.md]"]);
  assert.match(checkFeatureArtefact({ path: "docs/features/demo/01-vision.md", text: vision, feature }).join(), /po artefact has no sources/);
  const okVision = doc(["feature: 1", "slug: demo", "phase: po"]);
  assert.deepEqual(checkFeatureArtefact({ path: "docs/features/demo/01-vision.md", text: okVision, feature }), []);
});

test("checkFeatureArtefact rejects unknown and status-like keys", () => {
  const text = doc(["feature: 1", "slug: demo", "phase: po", "status: done"]);
  assert.match(checkFeatureArtefact({ path: "docs/features/demo/01-vision.md", text, feature }).join(), /unknown key status/);
});

test("checkFeatureArtefact checks the lite feature.md", () => {
  assert.deepEqual(checkFeatureArtefact({ path: "docs/features/demo/feature.md", text: doc(["feature: 1", "slug: demo"]), feature }), []);
  const withPhase = doc(["feature: 1", "slug: demo", "phase: po"]);
  assert.match(checkFeatureArtefact({ path: "docs/features/demo/feature.md", text: withPhase, feature }).join(), /unknown key phase/);
});

test("checkAdr accepts a correct ADR and ignores other files", () => {
  assert.deepEqual(checkAdr({ path: "docs/adr/0003-use-postgres.md", text: adr(), features: [1] }), []);
  assert.deepEqual(checkAdr({ path: "docs/adr/README.md", text: "# ADRs", features: [1] }), []);
});

test("checkAdr requires frontmatter", () => {
  assert.match(checkAdr({ path: "docs/adr/0003-x.md", text: "# 0003 — x\n", features: [1] }).join(), /no frontmatter/);
});

test("checkAdr checks status, date and feature", () => {
  const text = doc(["status: maybe", "date: 24/11/2026", "feature: 2"]);
  const reasons = checkAdr({ path: "docs/adr/0003-x.md", text, features: [1] }).join("\n");
  assert.match(reasons, new RegExp(`status is maybe, expected one of ${ADR_STATUSES.join(", ")}`));
  assert.match(reasons, /date is 24\/11\/2026, expected YYYY-MM-DD/);
  assert.match(reasons, /feature is 2, expected #1/);
});

test("checkAdr ties superseded to superseded-by", () => {
  const path = "docs/adr/0003-x.md";
  assert.match(checkAdr({ path, text: doc(["status: superseded", "date: 2026-11-24", "feature: 1"]), features: [1] }).join(), /superseded-by/);
  assert.match(checkAdr({ path, text: adr(["superseded-by: 0007"]), features: [1] }).join(), /only a superseded ADR/);
  assert.deepEqual(checkAdr({ path, text: doc(["status: superseded", "date: 2026-11-24", "feature: 1", "superseded-by: 0007"]), features: [1] }), []);
  assert.match(checkAdr({ path, text: adr(["supersedes: [3]"]), features: [1] }).join(), /supersedes/);
  assert.deepEqual(checkAdr({ path, text: adr(["supersedes: [0001, 0002]"]), features: [1] }), []);
});

const demoParent = { number: 1, title: "Feature: demo", body: renderParentBody({ name: "demo", slug: "demo", mode: "full" }) };

test("gate-pr fails a phase PR whose artefact frontmatter is wrong", () => {
  const gh = fakeGh({
    pr: { body: "", files: ["docs/features/demo/03-architecture.md", "docs/adr/0001-x.md"], labels: [] },
    features: [demoParent],
    states: { 1: fullState(["po", "analyst"]) },
    prFiles: { "docs/features/demo/03-architecture.md": "# Architecture\n", "docs/adr/0001-x.md": adr() },
  });
  const { code, output } = run(["gate-pr", "--pr", "9"], gh);
  assert.equal(code, 2);
  assert.match(output, /gate open for \[Architect\] Structure/);
  assert.match(output, /docs\/features\/demo\/03-architecture\.md has no frontmatter/);
});

test("gate-pr passes a phase PR with correct frontmatter", () => {
  const gh = fakeGh({
    pr: { body: "", files: ["docs/features/demo/03-architecture.md", "docs/adr/0001-x.md"], labels: [] },
    features: [demoParent],
    states: { 1: fullState(["po", "analyst"]) },
    prFiles: { "docs/features/demo/03-architecture.md": architecture, "docs/adr/0001-x.md": adr() },
  });
  const { code, output } = run(["gate-pr", "--pr", "9"], gh);
  assert.equal(code, 0, output);
  assert.match(output, /frontmatter: ok/);
});

test("gate-pr checks ADR frontmatter against the features it targets", () => {
  const gh = fakeGh({
    pr: { body: "", files: ["docs/features/demo/03-architecture.md", "docs/adr/0001-x.md"], labels: [] },
    features: [demoParent],
    states: { 1: fullState(["po", "analyst"]) },
    prFiles: { "docs/features/demo/03-architecture.md": architecture, "docs/adr/0001-x.md": doc(["status: accepted", "date: 2026-11-24", "feature: 7"]) },
  });
  const { code, output } = run(["gate-pr", "--pr", "9"], gh);
  assert.equal(code, 2);
  assert.match(output, /feature is 7, expected #1/);
});

test("gate-pr skips deleted files", () => {
  const gh = fakeGh({
    pr: { body: "", files: ["docs/features/demo/03-architecture.md"], deleted: ["docs/features/demo/03-architecture.md"], labels: [] },
    features: [demoParent],
    states: { 1: fullState(["po", "analyst"]) },
  });
  assert.equal(run(["gate-pr", "--pr", "9"], gh).code, 0);
  assert.equal(gh.calls.some(([name]) => name === "readPrFile"), false);
});

test("gate-pr does not check frontmatter under gate-override", () => {
  const gh = fakeGh({
    pr: { body: "", files: ["docs/features/demo/03-architecture.md"], labels: ["gate-override"] },
    features: [demoParent],
    prFiles: { "docs/features/demo/03-architecture.md": "# no frontmatter\n" },
  });
  assert.equal(run(["gate-pr", "--pr", "9"], gh).code, 0);
});

test("gate-pr treats an unreadable file as an error, not a pass", () => {
  const gh = fakeGh({
    pr: { body: "", files: ["docs/features/demo/03-architecture.md"], labels: [] },
    features: [demoParent],
    states: { 1: fullState(["po", "analyst"]) },
    readFails: "gh api repos failed: HTTP 500",
  });
  assert.equal(run(["gate-pr", "--pr", "9"], gh).code, 1);
});

function writeRepo(files) {
  const cwd = tempDir();
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(cwd, path, ".."), { recursive: true });
    writeFileSync(join(cwd, path), text);
  }
  return cwd;
}

test("check-frontmatter checks the local artefacts and linked ADRs", () => {
  const cwd = writeRepo({
    "docs/features/demo/01-vision.md": doc(["feature: 1", "slug: demo", "phase: po"]),
    "docs/features/demo/03-architecture.md": architecture.replace("# Title", "# Title\n\nSee [ADR](../../adr/0002-queue.md)."),
    "docs/adr/0001-old.md": "# legacy ADR without frontmatter\n",
    "docs/adr/0002-queue.md": "# 0002 — queue\n",
    "docs/adr/0003-cache.md": adr(),
  });
  const { code, output } = run(["check-frontmatter", "--feature", "1"], fakeGh({ states: { 1: fullState([]) } }), cwd);
  assert.equal(code, 2);
  assert.match(output, /docs\/adr\/0002-queue\.md has no frontmatter/);
  assert.doesNotMatch(output, /0001-old/);
  assert.doesNotMatch(output, /0003-cache/);
});

test("check-frontmatter passes a clean lite feature", () => {
  const cwd = writeRepo({ "docs/features/demo/feature.md": doc(["feature: 1", "slug: demo"]) });
  const { code, output } = run(["check-frontmatter", "--feature", "1"], fakeGh({ states: { 1: liteState([]) } }), cwd);
  assert.equal(code, 0, output);
  assert.match(output, /frontmatter: ok/);
});

test("viewPr reports deleted files and the head commit", () => {
  const runner = () => JSON.stringify({
    body: "",
    files: [{ path: "a.md", changeType: "MODIFIED" }, { path: "b.md", changeType: "DELETED" }],
    labels: [],
    headRefName: "x",
    headRefOid: "abc123",
  });
  const pr = makeGh(runner).viewPr(5);
  assert.deepEqual(pr.files, ["a.md", "b.md"]);
  assert.deepEqual(pr.deleted, ["b.md"]);
  assert.equal(pr.headSha, "abc123");
});

test("readPrFile fetches the raw file at the head commit", () => {
  const calls = [];
  const gh = makeGh((args) => {
    calls.push(args);
    return "---\nfeature: 1\n---\n";
  });
  assert.equal(gh.readPrFile("docs/adr/0001 x.md", "abc123"), "---\nfeature: 1\n---\n");
  assert.deepEqual(calls[0], ["api", "-H", "Accept: application/vnd.github.raw", "repos/{owner}/{repo}/contents/docs/adr/0001%20x.md?ref=abc123"]);
});

test("the ADR template's frontmatter passes once filled in", () => {
  const filled = template("adr.md").replace("<YYYY-MM-DD>", "2026-11-24").replace("<parent issue number>", "1");
  assert.deepEqual(checkAdr({ path: "docs/adr/0001-x.md", text: filled, features: [1] }), []);
});

test("persona-common describes the frontmatter and checks it before committing", () => {
  const common = template("persona-common.md");
  const frontmatter = section(common, "## Frontmatter");
  for (const key of ["feature: <n>", "slug: <slug>", "phase: <phase>", "sources:", "never add a status"]) assert.ok(frontmatter.includes(key), key);
  assert.ok(section(common, "## Opening the phase pull request").includes("node scripts/feature.mjs check-frontmatter --feature <n>"));
});

test("architect keeps ADR supersession in the frontmatter", () => {
  const work = section(readSkill("feature-architect"), "## Work");
  for (const key of ["`supersedes`", "`superseded-by`", "`status`"]) assert.ok(work.includes(key), key);
});
