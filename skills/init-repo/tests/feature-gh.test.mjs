import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTH_HINT, makeGh, runGh } from "../assets/lifecycle/scripts/feature-gh.mjs";
import { renderParentBody, renderSubIssueBody } from "../assets/lifecycle/scripts/feature-lib.mjs";

// responses: [[substring of the joined args, string or JSON-able value], ...]; first match wins.
function scripted(responses) {
  const calls = [];
  const runner = (args) => {
    calls.push(args);
    const joined = args.join(" ");
    const hit = responses.find(([match]) => joined.includes(match));
    if (!hit) throw new Error(`unexpected gh ${joined}`);
    return typeof hit[1] === "string" ? hit[1] : JSON.stringify(hit[1]);
  };
  return { calls, gh: makeGh(runner) };
}

const fullParent = { number: 1, title: "Feature: Demo", body: renderParentBody({ name: "Demo", slug: "demo", mode: "full" }), state: "OPEN", labels: [{ name: "feature" }] };

test("runGh adds the authentication hint", () => {
  const exec = () => {
    const error = new Error("exit 1");
    error.stderr = "HTTP 401: Bad credentials";
    throw error;
  };
  assert.throws(
    () => runGh(["issue", "view", "1"], exec),
    (e) => e.message.includes("HTTP 401") && e.message.includes(AUTH_HINT),
  );
});

test("createIssue returns the new number", () => {
  const { gh, calls } = scripted([["issue create", "https://github.com/o/r/issues/12\n"]]);
  assert.equal(gh.createIssue({ title: "T", body: "B", labels: ["a", "b"], assignee: "me" }), 12);
  assert.deepEqual(calls[0], ["issue", "create", "--title", "T", "--body", "B", "--label", "a", "--label", "b", "--assignee", "me"]);
});

test("addSubIssue posts the child's id to the parent", () => {
  const { gh, calls } = scripted([
    ["issues/11 --jq .id", "987654\n"],
    ["sub_issues", "{}"],
  ]);
  gh.addSubIssue(10, 11);
  assert.deepEqual(calls[1], ["api", "-X", "POST", "repos/{owner}/{repo}/issues/10/sub_issues", "-F", "sub_issue_id=987654"]);
});

test("loadFeature reads a full feature's sub-issues", () => {
  const { gh } = scripted([
    ["issue view 1", fullParent],
    ["sub_issues", [[
      { number: 10, state: "closed", labels: [{ name: "phase:po" }], body: renderSubIssueBody({ phaseId: "po", parentNumber: 1 }) },
      { number: 99, state: "open", labels: [], body: "unrelated" },
    ]]],
  ]);
  const state = gh.loadFeature(1);
  assert.equal(state.mode, "full");
  assert.equal(state.slug, "demo");
  assert.deepEqual(
    state.subIssues.map((s) => [s.phaseId, s.number, s.state, s.labels]),
    [["po", 10, "closed", ["phase:po"]]],
  );
});

test("loadFeature refuses a feature with no readable sub-issues", () => {
  const { gh } = scripted([
    ["issue view 1", fullParent],
    ["sub_issues", [[]]],
  ]);
  assert.throws(() => gh.loadFeature(1), /no readable sub-issues/);
});

test("loadFeature returns a lite feature's body", () => {
  const body = renderParentBody({ name: "Demo", slug: "demo", mode: "lite" });
  const { gh } = scripted([["issue view 3", { number: 3, title: "Feature: Demo", body, state: "OPEN", labels: [{ name: "feature" }] }]]);
  assert.deepEqual(gh.loadFeature(3), { number: 3, slug: "demo", mode: "lite", body, labels: ["feature"] });
});

test("loadFeature rejects an issue without the feature marker", () => {
  const { gh } = scripted([["issue view 4", { number: 4, title: "Bug", body: "text", state: "OPEN", labels: [] }]]);
  assert.throws(() => gh.loadFeature(4), /not a feature issue/);
});

test("listSideIssues keeps only issues for this feature", () => {
  const { gh } = scripted([["issue list", [
    { number: 7, title: "a", body: "Side issue of #12, noticed during [PO] Vision." },
    { number: 8, title: "b", body: "Side issue of #123, noticed during [PO] Vision." },
  ]]]);
  assert.deepEqual(gh.listSideIssues(12), [{ number: 7, title: "a" }]);
});

test("linkedPullRequests looks up each closing reference's state, since gh omits it", () => {
  const { gh, calls } = scripted([
    ["issue view 14", { closedByPullRequestsReferences: [{ number: 30, url: "https://github.com/o/r/pull/30" }, { number: 31, url: "https://github.com/o/r/pull/31" }] }],
    ["pr view https://github.com/o/r/pull/30", { state: "OPEN" }],
    ["pr view https://github.com/o/r/pull/31", { state: "MERGED" }],
  ]);
  assert.deepEqual(gh.linkedPullRequests(14), [{ number: 30, state: "open" }, { number: 31, state: "merged" }]);
  assert.ok(calls[0].includes("closedByPullRequestsReferences"));
  assert.deepEqual(calls.slice(1).map((c) => c.slice(0, 2)), [["pr", "view"], ["pr", "view"]]);
});

test("viewPr flattens files and labels", () => {
  const { gh } = scripted([["pr view 5", { body: "Closes #1", files: [{ path: "a.md" }], labels: [{ name: "x" }], headRefName: "feature/demo/build" }]]);
  assert.deepEqual(gh.viewPr(5), { body: "Closes #1", files: ["a.md"], labels: ["x"], head: "feature/demo/build" });
});
