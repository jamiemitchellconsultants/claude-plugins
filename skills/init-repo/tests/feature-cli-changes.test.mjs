import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { SUBCOMMANDS } from "../assets/lifecycle/scripts/feature.mjs";
import { parseChecklist, parseLiteSections, parseParent } from "../assets/lifecycle/scripts/feature-lib.mjs";
import { fullState, liteState } from "./helpers/fixtures.mjs";
import { fakeGh, run, tempDir } from "./helpers/fake-gh.mjs";

function withBody(text) {
  const dir = tempDir();
  writeFileSync(join(dir, "body.md"), text);
  return dir;
}

const calls = (gh, name) => gh.calls.filter((c) => c[0] === name);

test("the new subcommands are registered", () => {
  for (const name of ["pushback", "park", "handoff", "tick", "clear-pushback", "promote"]) {
    assert.ok(SUBCOMMANDS.includes(name), name);
  }
});

test("pushback full reopens and labels", () => {
  const gh = fakeGh({ states: { 1: fullState(["po", "analyst"]) } });
  const { code, output } = run(
    ["pushback", "--feature", "1", "--from", "architect", "--to", "analyst", "--body-file", "body.md"],
    gh,
    withBody("Missing a cancellation behaviour."),
  );
  assert.equal(code, 0);
  assert.deepEqual(gh.calls.slice(0, 3), [
    ["comment", 11, "Missing a cancellation behaviour."],
    ["reopen", 11],
    ["addLabels", 11, ["pushback"]],
  ]);
  assert.equal(gh.calls[3][0], "comment");
  assert.equal(gh.calls[3][1], 12);
  assert.match(gh.calls[3][2], /Blocked by #11/);
  assert.match(output, /Checkpoint reached/);
});

test("pushback must point at an earlier phase", () => {
  const gh = fakeGh({ states: { 1: fullState(["po"]) } });
  const { code, output } = run(
    ["pushback", "--feature", "1", "--from", "analyst", "--to", "architect", "--body-file", "body.md"],
    gh,
    withBody("x"),
  );
  assert.equal(code, 1);
  assert.match(output, /earlier phase/);
  assert.equal(gh.calls.length, 0);
});

test("pushback lite unticks section", () => {
  const gh = fakeGh({ states: { 1: liteState(["po", "analyst"]) } });
  const { code } = run(
    ["pushback", "--feature", "1", "--from", "architect", "--to", "analyst", "--body-file", "body.md"],
    gh,
    withBody("Ambiguous reminder timing."),
  );
  assert.equal(code, 0);
  const [, number, body] = calls(gh, "editBody")[0];
  assert.equal(number, 1);
  const sections = parseLiteSections(body);
  assert.ok(sections.po.every((i) => i.checked));
  assert.ok(sections.analyst.every((i) => !i.checked));
  assert.deepEqual(calls(gh, "comment"), [["comment", 1, "Ambiguous reminder timing."]]);
});

test("park is not a sub-issue", () => {
  const gh = fakeGh({ states: { 1: fullState(["po"]) } });
  const { code, output } = run(
    ["park", "--feature", "1", "--title", "Flaky dates", "--body-file", "body.md"],
    gh,
    withBody("Dates parse differently on CI."),
  );
  assert.equal(code, 0);
  const [[, spec]] = calls(gh, "createIssue");
  assert.equal(spec.title, "Flaky dates");
  assert.deepEqual(spec.labels, ["side-issue"]);
  assert.ok(spec.body.startsWith("Side issue of #1, noticed during [Analyst] Behaviours."));
  assert.ok(spec.body.endsWith("Dates parse differently on CI."));
  assert.equal(calls(gh, "addSubIssue").length, 0);
  assert.match(output, /parked as #100/);
});

test("handoff comments on parent", () => {
  const gh = fakeGh({ states: { 1: fullState(["po"]) } });
  const { code, output } = run(["handoff", "--feature", "1", "--body-file", "body.md"], gh, withBody("## Handoff"));
  assert.equal(code, 0);
  assert.deepEqual(gh.calls, [["comment", 1, "## Handoff"]]);
  assert.match(output, /Checkpoint reached/);
});

test("tick full ticks the sub-issue", () => {
  const gh = fakeGh({ states: { 1: fullState([]) } });
  const { code } = run(["tick", "--feature", "1", "--phase", "po", "--text", "the target users are named"], gh);
  assert.equal(code, 0);
  const [[, number, body]] = calls(gh, "editBody");
  assert.equal(number, 10);
  assert.ok(parseChecklist(body).find((i) => i.text === "the target users are named").checked);
});

test("tick lite ticks the parent section", () => {
  const gh = fakeGh({ states: { 1: liteState([]) } });
  const { code } = run(["tick", "--feature", "1", "--phase", "po", "--text", "the target users are named"], gh);
  assert.equal(code, 0);
  const [[, number, body]] = calls(gh, "editBody");
  assert.equal(number, 1);
  assert.ok(parseLiteSections(body).po.find((i) => i.text === "the target users are named").checked);
});

test("tick rejects unknown text", () => {
  const gh = fakeGh({ states: { 1: fullState([]) } });
  const { code, output } = run(["tick", "--feature", "1", "--phase", "po", "--text", "nonsense"], gh);
  assert.equal(code, 1);
  assert.match(output, /no exit criterion "nonsense"/);
  assert.equal(gh.calls.length, 0);
});

test("clear-pushback removes the label", () => {
  const gh = fakeGh({ states: { 1: fullState(["po"], { po: { labels: ["phase:po", "pushback"] } }) } });
  const { code } = run(["clear-pushback", "--feature", "1", "--phase", "po"], gh);
  assert.equal(code, 0);
  assert.deepEqual(gh.calls, [["removeLabels", 10, ["pushback"]]]);
});

test("promote creates sub-issues and flips mode", () => {
  const gh = fakeGh({ states: { 1: liteState(["po", "analyst", "architect"]) } });
  const { code, output } = run(["promote", "--feature", "1"], gh);
  assert.equal(code, 0);
  const creates = calls(gh, "createIssue").map((c) => c[1]);
  assert.equal(creates.length, 6);
  assert.ok(creates.slice(0, 3).every((s) => parseChecklist(s.body).every((i) => i.checked)));
  assert.ok(parseChecklist(creates[3].body).every((i) => !i.checked));
  assert.deepEqual(calls(gh, "addSubIssue"), [100, 101, 102, 103, 104, 105].map((n) => ["addSubIssue", 1, n]));
  assert.deepEqual(calls(gh, "close"), [["close", 100], ["close", 101], ["close", 102]]);
  const [[, number, body]] = calls(gh, "editBody");
  assert.equal(number, 1);
  assert.equal(parseParent(body).mode, "full");
  assert.match(output, /docs\/features\/demo\/01-vision\.md/);
});

test("promote refuses a full feature", () => {
  const { code, output } = run(["promote", "--feature", "1"], fakeGh({ states: { 1: fullState([]) } }));
  assert.equal(code, 1);
  assert.match(output, /already in full mode/);
});
