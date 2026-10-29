import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderParentBody, renderSubIssueBody } from "../assets/lifecycle/scripts/feature-lib.mjs";
import { fullState, liteState } from "./helpers/fixtures.mjs";
import { fakeGh, run } from "./helpers/fake-gh.mjs";

const WORKFLOW = join(dirname(fileURLToPath(import.meta.url)), "../assets/lifecycle/workflows/feature-gate.yml");

const parent = (number, slug) => ({ number, title: `Feature: ${slug}`, body: renderParentBody({ name: slug, slug, mode: "full" }) });
const subIssue = (phaseId, parentNumber) => ({ number: 0, title: "", body: renderSubIssueBody({ phaseId, parentNumber }), state: "open", labels: [] });

test("gate-pr passes non-phase PR", () => {
  const { code, output } = run(["gate-pr", "--pr", "9"], fakeGh({ pr: { body: "See #3", files: ["README.md"], labels: [] } }));
  assert.equal(code, 0);
  assert.match(output, /not a phase PR/);
});

test("gate-pr passes override", () => {
  const gh = fakeGh({
    pr: { body: "Closes #12", files: [], labels: ["gate-override"] },
    issues: { 12: subIssue("architect", 1) },
    states: { 1: fullState([]) },
  });
  const { code, output } = run(["gate-pr", "--pr", "9"], gh);
  assert.equal(code, 0);
  assert.match(output, /gate-override/);
});

test("gate-pr passes open gate", () => {
  const gh = fakeGh({
    pr: { body: "Closes #12", files: ["docs/features/demo/03-architecture.md"], labels: [] },
    issues: { 12: subIssue("architect", 1) },
    features: [parent(1, "demo")],
    states: { 1: fullState(["po", "analyst"]) },
  });
  const { code, output } = run(["gate-pr", "--pr", "9"], gh);
  assert.equal(code, 0);
  assert.match(output, /feature #1: gate open for \[Architect\] Structure/);
});

test("gate-pr fails when the closed sub-issue's gate is closed", () => {
  const gh = fakeGh({
    pr: { body: "Closes #12", files: [], labels: [] },
    issues: { 12: subIssue("architect", 1) },
    states: { 1: fullState(["po", "analyst"], { po: { labels: ["phase:po", "pushback"] } }) },
  });
  const { code, output } = run(["gate-pr", "--pr", "9"], gh);
  assert.equal(code, 2);
  assert.match(output, /pushback/);
});

test("gate-pr fails when any feature gate closed", () => {
  const second = { ...fullState(["po"], { po: { ticked: false } }), number: 2, slug: "b" };
  const gh = fakeGh({
    pr: { body: "", files: ["docs/features/a/03-architecture.md", "docs/features/b/02-behaviours.md"], labels: [] },
    features: [parent(1, "a"), parent(2, "b")],
    states: { 1: { ...fullState(["po", "analyst"]), slug: "a" }, 2: second },
  });
  const { code, output } = run(["gate-pr", "--pr", "9"], gh);
  assert.equal(code, 2);
  assert.match(output, /feature #1: gate open/);
  assert.match(output, /feature #2: gate closed for \[Analyst\] Behaviours/);
});

test("gate-pr skips a slug with no open feature", () => {
  const gh = fakeGh({ pr: { body: "", files: ["docs/features/old/01-vision.md"], labels: [] }, features: [] });
  const { code, output } = run(["gate-pr", "--pr", "9"], gh);
  assert.equal(code, 0);
  assert.match(output, /no open feature for docs\/features\/old\//);
});

test("gate-pr errors are not open", () => {
  const { code } = run(["gate-pr", "--pr", "9"], fakeGh({ failWith: "gh pr view failed: HTTP 401" }));
  assert.equal(code, 1);
});

test("lite gate-pr derives the phase from the head branch", () => {
  const lite = (ids) => ({ 1: liteState(ids) });
  const build = fakeGh({
    pr: { body: "", files: ["docs/features/demo/feature.md"], labels: [], head: "feature/demo/build" },
    features: [{ number: 1, title: "Feature: demo", body: renderParentBody({ name: "demo", slug: "demo", mode: "lite" }) }],
    states: lite(["po"]),
  });
  assert.equal(run(["gate-pr", "--pr", "9"], build).code, 2);
  const design = fakeGh({
    pr: { body: "", files: ["docs/features/demo/feature.md"], labels: [], head: "feature/demo/design" },
    features: [{ number: 1, title: "Feature: demo", body: renderParentBody({ name: "demo", slug: "demo", mode: "lite" }) }],
    states: lite(["po", "analyst"]),
  });
  const result = run(["gate-pr", "--pr", "9"], design);
  assert.equal(result.code, 0);
  assert.match(result.output, /gate open for \[Architect\] Structure/);
});

test("workflow shape", () => {
  const text = readFileSync(WORKFLOW, "utf8");
  assert.match(text, /^name: feature-gate$/m);
  assert.match(text, /^ {2}feature-gate:$/m);
  for (const type of ["opened", "synchronize", "reopened", "edited", "labeled", "unlabeled"]) assert.ok(text.includes(type), type);
  for (const permission of ["contents: read", "issues: read", "pull-requests: read"]) assert.ok(text.includes(permission), permission);
  assert.ok(text.includes("ref: ${{ github.event.pull_request.base.sha }}"));
  assert.ok(text.includes("feature-gate: kit not installed on the base branch yet; passing"));
  assert.ok(text.includes("node scripts/feature.mjs gate-pr --pr ${{ github.event.pull_request.number }}"));
  assert.ok(text.includes("GH_TOKEN: ${{ github.token }}"));
  assert.doesNotMatch(text, /`[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*`/);
});

test("gate-pr checks every closed sub-issue of a feature", () => {
  const gh = fakeGh({
    pr: { body: "Closes #13\nCloses #12", files: [], labels: [] },
    issues: { 12: subIssue("architect", 1), 13: subIssue("analyst", 1) },
    states: { 1: fullState(["po"]) },
  });
  const { code, output } = run(["gate-pr", "--pr", "9"], gh);
  assert.equal(code, 2);
  assert.match(output, /gate closed for \[Architect\] Structure/);
  assert.match(output, /gate open for \[Analyst\] Behaviours/);
});
