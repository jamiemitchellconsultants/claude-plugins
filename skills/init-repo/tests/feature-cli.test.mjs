import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SUBCOMMANDS } from "../assets/lifecycle/scripts/feature.mjs";
import { AUTH_HINT } from "../assets/lifecycle/scripts/feature-gh.mjs";
import { PHASES, renderParentBody } from "../assets/lifecycle/scripts/feature-lib.mjs";
import { fullState } from "./helpers/fixtures.mjs";
import { fakeGh, run } from "./helpers/fake-gh.mjs";

test("start full creates parent and six linked sub-issues", () => {
  const gh = fakeGh();
  const { code, cwd } = run(["start", "--name", "Booking Reminders", "--owner", "jamie"], gh);
  assert.equal(code, 0);
  const creates = gh.calls.filter((c) => c[0] === "createIssue").map((c) => c[1]);
  assert.equal(creates.length, 7);
  assert.equal(creates[0].title, "Feature: Booking Reminders");
  assert.deepEqual(creates[0].labels, ["feature"]);
  assert.equal(creates[0].assignee, "jamie");
  assert.deepEqual(creates.slice(1).map((s) => s.title), PHASES.map((p) => p.title));
  assert.deepEqual(creates.slice(1).map((s) => s.labels), PHASES.map((p) => [p.label]));
  const links = gh.calls.filter((c) => c[0] === "addSubIssue");
  assert.deepEqual(links, [101, 102, 103, 104, 105, 106].map((n) => ["addSubIssue", 100, n]));
  const lastCreate = gh.calls.findLastIndex((c) => c[0] === "createIssue");
  const firstLink = gh.calls.findIndex((c) => c[0] === "addSubIssue");
  assert.ok(lastCreate < firstLink);
  assert.ok(existsSync(join(cwd, "docs/features/booking-reminders/.gitkeep")));
});

test("start rejects a malformed slug before any gh call", () => {
  for (const slug of ["My_Feature", "../../x", "-a", "a--b", ""]) {
    const gh = fakeGh();
    const { code, output, cwd } = run(["start", "--name", "X", "--slug", slug], gh);
    assert.equal(code, 1, slug);
    assert.match(output, /--slug must match/);
    assert.deepEqual(gh.calls, []);
    assert.equal(existsSync(join(cwd, "docs")), false);
  }
});

test("start lite creates only the parent", () => {
  const gh = fakeGh();
  const { code } = run(["start", "--name", "Small Fix", "--lite"], gh);
  assert.equal(code, 0);
  const creates = gh.calls.filter((c) => c[0] === "createIssue");
  assert.equal(creates.length, 1);
  assert.equal((creates[0][1].body.match(/^### /gm) ?? []).length, 6);
  assert.equal(gh.calls.filter((c) => c[0] === "addSubIssue").length, 0);
});

test("start refuses duplicate slug", () => {
  const gh = fakeGh({
    features: [{ number: 42, title: "Feature: Demo", body: renderParentBody({ name: "Demo", slug: "demo", mode: "full" }) }],
  });
  const { code, output, cwd } = run(["start", "--name", "Demo"], gh);
  assert.equal(code, 1);
  assert.match(output, /#42/);
  assert.equal(gh.calls.length, 0);
  assert.equal(existsSync(join(cwd, "docs/features/demo")), false);
});

test("start needs a name", () => {
  const { code, output } = run(["start"], fakeGh());
  assert.equal(code, 1);
  assert.match(output, /--name is required/);
});

test("gate exits 2 with reasons", () => {
  const { code, output } = run(["gate", "--feature", "1", "--phase", "architect"], fakeGh({ states: { 1: fullState(["po"]) } }));
  assert.equal(code, 2);
  assert.match(output, /gate closed: \[Architect\] Structure/);
  assert.match(output, /\[Analyst\] Behaviours/);
});

test("gate exits 0 when open", () => {
  const { code, output } = run(["gate", "--feature", "1", "--phase", "analyst"], fakeGh({ states: { 1: fullState(["po"]) } }));
  assert.equal(code, 0);
  assert.match(output, /gate open: \[Analyst\] Behaviours/);
});

test("gate rejects an unknown phase", () => {
  const { code, output } = run(["gate", "--feature", "1", "--phase", "qa"], fakeGh({ states: { 1: fullState([]) } }));
  assert.equal(code, 1);
  assert.match(output, /unknown phase "qa"/);
});

test("gate errors are not open", () => {
  const gh = fakeGh({ failWith: `gh issue view failed: HTTP 401. ${AUTH_HINT}` });
  const { code, output } = run(["gate", "--feature", "1", "--phase", "analyst"], gh);
  assert.equal(code, 1);
  assert.ok(output.includes(AUTH_HINT));
});

test("status reports current phase and next step", () => {
  const gh = fakeGh({
    states: { 1: fullState(["po", "analyst"]) },
    sideIssues: [{ number: 77, title: "Flaky date parsing" }],
  });
  const { code, output } = run(["status", "--feature", "1"], gh);
  assert.equal(code, 0);
  assert.match(output, /current phase: \[Architect\] Structure/);
  assert.match(output, /next: run the feature-architect skill/);
  assert.match(output, /side issue: #77 Flaky date parsing/);
});

test("status shows the open pull request on the current phase", () => {
  const gh = fakeGh({ states: { 1: fullState(["po", "analyst"]) }, linkedPrs: { 12: [{ number: 40, state: "open" }] } });
  const { output } = run(["status", "--feature", "1"], gh);
  assert.match(output, /pull request: #40 \(open\)/);
  assert.match(output, /next: wait for review of #40, then merge it/);
  assert.doesNotMatch(output, /run the feature-architect skill/);
});

test("status with only a merged or no pull request still says to run the skill", () => {
  const gh = fakeGh({ states: { 1: fullState(["po", "analyst"]) }, linkedPrs: { 12: [{ number: 41, state: "merged" }] } });
  const { output } = run(["status", "--feature", "1"], gh);
  assert.match(output, /pull request: #41 \(merged\)/);
  assert.match(output, /next: run the feature-architect skill/);
});

test("status reports pushback", () => {
  const gh = fakeGh({ states: { 1: fullState(["analyst"], { po: { labels: ["phase:po", "pushback"] } }) } });
  const { output } = run(["status", "--feature", "1"], gh);
  assert.match(output, /pushback: \[PO\] Vision \(#10\)/);
});

test("status lists open features", () => {
  const gh = fakeGh({
    features: [{ number: 5, title: "Feature: Demo", body: renderParentBody({ name: "Demo", slug: "demo", mode: "lite" }) }],
  });
  const { code, output } = run(["status"], gh);
  assert.equal(code, 0);
  assert.match(output, /#5 Feature: Demo \(lite mode\)/);
});

test("unknown subcommand prints usage", () => {
  const { code, output } = run(["frobnicate"], fakeGh());
  assert.equal(code, 1);
  assert.match(output, /usage: feature\.mjs/);
  for (const name of ["start", "status", "gate"]) assert.ok(SUBCOMMANDS.includes(name), name);
});
