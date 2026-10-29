import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../assets/lifecycle/scripts/feature.mjs";

export function tempDir() {
  return mkdtempSync(join(tmpdir(), "feature-cli-"));
}

// A stand-in for makeGh(): returns canned data and records every write in calls.
// New issues are numbered from 100. failWith makes every method throw that message.
export function fakeGh({ features = [], states = {}, issues = {}, pr, sideIssues = [], linkedPrs = {}, failWith } = {}) {
  const calls = [];
  let nextNumber = 100;
  const guard = (fn) => (...args) => {
    if (failWith) throw new Error(failWith);
    return fn(...args);
  };
  const record = (name) => guard((...args) => {
    calls.push([name, ...args]);
  });
  return {
    calls,
    createIssue: guard((spec) => {
      calls.push(["createIssue", spec]);
      return nextNumber++;
    }),
    addSubIssue: record("addSubIssue"),
    listFeatures: guard(() => features),
    listSideIssues: guard(() => sideIssues),
    linkedPullRequests: guard((n) => linkedPrs[n] ?? []),
    viewIssue: guard((n) => issues[n] ?? { number: n, title: "", body: "", state: "open", labels: [] }),
    viewPr: guard(() => pr ?? { body: "", files: [], labels: [] }),
    loadFeature: guard((n) => {
      if (!states[n]) throw new Error(`#${n} is not a feature issue: its body has no feature marker`);
      return structuredClone(states[n]);
    }),
    comment: record("comment"),
    reopen: record("reopen"),
    close: record("close"),
    addLabels: record("addLabels"),
    removeLabels: record("removeLabels"),
    editBody: record("editBody"),
  };
}

export function run(argv, gh, cwd = tempDir()) {
  const lines = [];
  const code = main(argv, { gh, out: (line) => lines.push(line), cwd });
  return { code, output: lines.join("\n"), cwd };
}
