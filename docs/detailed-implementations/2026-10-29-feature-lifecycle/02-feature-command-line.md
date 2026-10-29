# 02 — Feature command line and the gate check (Tasks 3–5)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

These tasks build the application and infrastructure layers on top of the pure library from Task 2:
- the `gh` adapter, which is the only code that talks to GitHub;
- the `feature.mjs` command line, which every skill calls;
- the `feature-gate` pull-request workflow, which runs the same gate rules in CI.

The tests never call the real `gh`. The command-line tests pass a fake adapter object, and the adapter tests pass a scripted runner.

### Task 3: gh adapter and the feature command line (start, status, gate)

**Files:**
- Create: `skills/init-repo/assets/lifecycle/scripts/feature-gh.mjs`
- Create: `skills/init-repo/assets/lifecycle/scripts/feature.mjs`
- Create: `skills/init-repo/tests/helpers/fake-gh.mjs`
- Test: `skills/init-repo/tests/feature-gh.test.mjs`
- Test: `skills/init-repo/tests/feature-cli.test.mjs`

**Interfaces:**

The task consumes every export of `feature-lib.mjs` (Task 2). It produces these exports:

```js
// feature-gh.mjs
export const AUTH_HINT; // "Check that gh is installed and authenticated: run gh auth status."
// Runs one gh call and returns stdout; on failure throws Error("gh <a> <b> failed: <stderr>. <AUTH_HINT>").
export function runGh(args, exec = execFileSync) {}
// The adapter. runner(args: string[]) → stdout string. Every method is synchronous.
export function makeGh(runner = runGh) {
  return {
    createIssue({ title, body, labels, assignee }) {}, // → new issue number
    addSubIssue(parentNumber, childNumber) {},         // sub-issues REST API via gh api
    listFeatures() {},             // → [{ number, title, body }] open issues labelled feature
    listSideIssues(featureNumber) {}, // → [{ number, title }] open side issues of that feature
    viewIssue(number) {},          // → { number, title, body, state: "open"|"closed", labels: string[] }
    viewPr(number) {},             // → { body, files: string[], labels: string[] }
    loadFeature(number) {},        // → full or lite state (00-overview.md); throws when unreadable
    comment(number, body) {},
    reopen(number) {},
    close(number) {},
    addLabels(number, labels) {},
    removeLabels(number, labels) {},
    editBody(number, body) {},
  };
}

// feature.mjs
export const SUBCOMMANDS; // Object.keys(COMMANDS): grows in Tasks 4 and 5
// Runs one subcommand. out(line) prints; cwd is where docs/features/ is created.
// Returns 0 (ok / gate open), 1 (usage or gh error), 2 (gate closed). Never calls process.exit.
export function main(argv, { gh, out = console.log, cwd = process.cwd() } = {}) {}
```

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/helpers/fake-gh.mjs`:

```js
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../assets/lifecycle/scripts/feature.mjs";

export function tempDir() {
  return mkdtempSync(join(tmpdir(), "feature-cli-"));
}

// A stand-in for makeGh(): returns canned data and records every write in calls.
// New issues are numbered from 100. failWith makes every method throw that message.
export function fakeGh({ features = [], states = {}, issues = {}, pr, sideIssues = [], failWith } = {}) {
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
```

Create `skills/init-repo/tests/feature-gh.test.mjs`:

```js
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

test("viewPr flattens files and labels", () => {
  const { gh } = scripted([["pr view 5", { body: "Closes #1", files: [{ path: "a.md" }], labels: [{ name: "x" }] }]]);
  assert.deepEqual(gh.viewPr(5), { body: "Closes #1", files: ["a.md"], labels: ["x"] });
});
```

Create `skills/init-repo/tests/feature-cli.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/init-repo/tests/feature-gh.test.mjs skills/init-repo/tests/feature-cli.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `feature-gh.mjs` and `feature.mjs`.

- [ ] **Step 3: Implement `skills/init-repo/assets/lifecycle/scripts/feature-gh.mjs`**

```js
// The only code in the lifecycle kit that talks to GitHub. Everything goes through the gh CLI
// (never an MCP server) so it runs the same in every agent and in Actions.

import { execFileSync } from "node:child_process";
import { parseParent, parseSubIssue } from "./feature-lib.mjs";

export const AUTH_HINT = "Check that gh is installed and authenticated: run gh auth status.";

export function runGh(args, exec = execFileSync) {
  try {
    return exec("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const detail = (error.stderr?.toString() || error.message).trim();
    throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${detail}. ${AUTH_HINT}`);
  }
}

const labelNames = (labels) => (labels ?? []).map((l) => (typeof l === "string" ? l : l.name));
const lower = (value) => String(value).toLowerCase();

export function makeGh(runner = runGh) {
  const json = (args) => JSON.parse(runner(args));

  function viewIssue(number) {
    const issue = json(["issue", "view", String(number), "--json", "number,title,body,state,labels"]);
    return { number: issue.number, title: issue.title, body: issue.body ?? "", state: lower(issue.state), labels: labelNames(issue.labels) };
  }

  return {
    createIssue({ title, body, labels = [], assignee }) {
      const out = runner([
        "issue", "create", "--title", title, "--body", body,
        ...labels.flatMap((l) => ["--label", l]),
        ...(assignee ? ["--assignee", assignee] : []),
      ]);
      const m = out.match(/\/issues\/(\d+)/);
      if (!m) throw new Error(`could not read the new issue number from: ${out.trim()}`);
      return Number(m[1]);
    },

    addSubIssue(parentNumber, childNumber) {
      // The sub-issues API takes the child's database id, not its number.
      const id = runner(["api", `repos/{owner}/{repo}/issues/${childNumber}`, "--jq", ".id"]).trim();
      runner(["api", "-X", "POST", `repos/{owner}/{repo}/issues/${parentNumber}/sub_issues`, "-F", `sub_issue_id=${id}`]);
    },

    listFeatures() {
      return json(["issue", "list", "--label", "feature", "--state", "open", "--limit", "200", "--json", "number,title,body"]);
    },

    listSideIssues(featureNumber) {
      const marker = `Side issue of #${featureNumber},`;
      return json(["issue", "list", "--label", "side-issue", "--state", "open", "--limit", "200", "--json", "number,title,body"])
        .filter((i) => (i.body ?? "").includes(marker))
        .map(({ number, title }) => ({ number, title }));
    },

    viewIssue,

    viewPr(number) {
      const pr = json(["pr", "view", String(number), "--json", "body,files,labels"]);
      return { body: pr.body ?? "", files: (pr.files ?? []).map((f) => f.path), labels: labelNames(pr.labels) };
    },

    loadFeature(number) {
      const parent = viewIssue(number);
      const marker = parseParent(parent.body);
      if (!marker) throw new Error(`#${number} is not a feature issue: its body has no feature marker`);
      if (marker.mode === "lite") return { number, slug: marker.slug, mode: "lite", body: parent.body, labels: parent.labels };
      const pages = json(["api", `repos/{owner}/{repo}/issues/${number}/sub_issues`, "--paginate", "--slurp"]);
      const subIssues = pages.flat().flatMap((issue) => {
        const sub = parseSubIssue(issue.body ?? "");
        return sub
          ? [{ phaseId: sub.phaseId, number: issue.number, state: lower(issue.state), labels: labelNames(issue.labels), body: issue.body ?? "" }]
          : [];
      });
      if (subIssues.length === 0) throw new Error(`feature #${number} has no readable sub-issues, so its gates cannot be evaluated`);
      return { number, slug: marker.slug, mode: "full", subIssues };
    },

    comment(number, body) {
      runner(["issue", "comment", String(number), "--body", body]);
    },
    reopen(number) {
      runner(["issue", "reopen", String(number)]);
    },
    close(number) {
      runner(["issue", "close", String(number)]);
    },
    addLabels(number, labels) {
      runner(["issue", "edit", String(number), "--add-label", labels.join(",")]);
    },
    removeLabels(number, labels) {
      runner(["issue", "edit", String(number), "--remove-label", labels.join(",")]);
    },
    editBody(number, body) {
      runner(["issue", "edit", String(number), "--body", body]);
    },
  };
}
```

- [ ] **Step 4: Implement `skills/init-repo/assets/lifecycle/scripts/feature.mjs`**

```js
#!/usr/bin/env node
// Feature lifecycle command line. The persona skills and the feature-gate workflow call this,
// so the gate rules are the same in every agent and in CI. GitHub access is all in feature-gh.mjs.
//
// Usage: node scripts/feature.mjs <subcommand> [--option value ...]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { makeGh } from "./feature-gh.mjs";
import {
  FULL_ARTEFACTS,
  PHASES,
  classifyPr,
  currentPhase,
  evaluateGate,
  getPhase,
  nextSkill,
  parseLiteSections,
  parseParent,
  parseSubIssue,
  phaseIndex,
  renderParentBody,
  renderSubIssueBody,
  setParentMode,
  slugify,
  subIssueFor,
  tickItem,
  untickSection,
} from "./feature-lib.mjs";

class UsageError extends Error {}

const FLAGS = new Set(["lite"]);

function parseOptions(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new UsageError(`unexpected argument "${arg}"`);
    const key = arg.slice(2);
    if (FLAGS.has(key)) {
      opts[key] = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined || value.startsWith("--")) throw new UsageError(`${arg} needs a value`);
    opts[key] = value;
  }
  return opts;
}

function need(opts, ...keys) {
  for (const key of keys) if (opts[key] === undefined) throw new UsageError(`--${key} is required`);
}

function issueNumber(opts, key) {
  const n = Number(opts[key]);
  if (!Number.isInteger(n) || n <= 0) throw new UsageError(`--${key} must be an issue or PR number`);
  return n;
}

function phaseOption(opts, key) {
  try {
    return getPhase(opts[key]).id;
  } catch (error) {
    throw new UsageError(error.message);
  }
}

function findSub(state, phaseId) {
  const sub = subIssueFor(state, phaseId);
  if (!sub) throw new Error(`feature #${state.number} has no sub-issue for ${getPhase(phaseId).title}`);
  return sub;
}

function start(opts, { gh, out, cwd }) {
  need(opts, "name");
  const slug = opts.slug ?? slugify(opts.name);
  const mode = opts.lite ? "lite" : "full";
  const existing = gh.listFeatures().find((f) => parseParent(f.body)?.slug === slug);
  if (existing) {
    out(`feature "${slug}" already exists as #${existing.number}; nothing created`);
    return 1;
  }
  const parent = gh.createIssue({
    title: `Feature: ${opts.name}`,
    body: renderParentBody({ name: opts.name, slug, mode, owner: opts.owner }),
    labels: ["feature"],
    assignee: opts.owner,
  });
  if (mode === "full") {
    const children = PHASES.map((p) =>
      gh.createIssue({ title: p.title, body: renderSubIssueBody({ phaseId: p.id, parentNumber: parent }), labels: [p.label], assignee: opts.owner }),
    );
    for (const child of children) gh.addSubIssue(parent, child);
  }
  const dir = join(cwd, "docs", "features", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".gitkeep"), "");
  out(`started feature #${parent} (${mode} mode) in docs/features/${slug}/`);
  out(`next: run the ${nextSkill(PHASES[0].id)} skill`);
  return 0;
}

function status(opts, { gh, out }) {
  if (opts.feature === undefined) {
    const features = gh.listFeatures();
    if (features.length === 0) out("no open features");
    for (const f of features) out(`#${f.number} ${f.title} (${parseParent(f.body)?.mode ?? "unknown"} mode)`);
    return 0;
  }
  const n = issueNumber(opts, "feature");
  const state = gh.loadFeature(n);
  out(`feature #${n} ${state.slug} (${state.mode} mode)`);
  for (const s of state.subIssues ?? []) {
    if (s.labels.includes("pushback")) out(`pushback: ${getPhase(s.phaseId).title} (#${s.number})`);
  }
  for (const side of gh.listSideIssues(n)) out(`side issue: #${side.number} ${side.title}`);
  const current = currentPhase(state);
  if (current === null) {
    out("all phases are done");
    return 0;
  }
  const result = evaluateGate(state, current);
  out(`current phase: ${getPhase(current).title}`);
  out(result.open ? `next: run the ${nextSkill(current)} skill` : "next: the gate is closed, because:");
  for (const reason of result.reasons) out(`  - ${reason}`);
  return 0;
}

function gate(opts, { gh, out }) {
  need(opts, "feature", "phase");
  const phaseId = phaseOption(opts, "phase");
  const result = evaluateGate(gh.loadFeature(issueNumber(opts, "feature")), phaseId);
  out(`gate ${result.open ? "open" : "closed"}: ${getPhase(phaseId).title}`);
  for (const reason of result.reasons) out(`  - ${reason}`);
  return result.open ? 0 : 2;
}

const COMMANDS = { start, status, gate };

export const SUBCOMMANDS = Object.keys(COMMANDS);

export function main(argv, { gh, out = console.log, cwd = process.cwd() } = {}) {
  const [name, ...rest] = argv;
  const command = Object.hasOwn(COMMANDS, name ?? "") ? COMMANDS[name] : undefined;
  if (!command) {
    out(`usage: feature.mjs <${SUBCOMMANDS.join("|")}> [options]`);
    return 1;
  }
  try {
    return command(parseOptions(rest), { gh, out, cwd });
  } catch (error) {
    out(`feature ${name}: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2), { gh: makeGh() });
}
```

`SUBCOMMANDS` is computed from `COMMANDS`, so `const COMMANDS` must stay above it. The command functions are declarations, so the table can come after them in the file. Tasks 4 and 5 add their functions above `COMMANDS` and add their keys to it. The import list already covers what those tasks need.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test skills/init-repo/tests/feature-gh.test.mjs skills/init-repo/tests/feature-cli.test.mjs`
Expected: PASS, with 21 tests and 0 failures.

- [ ] **Step 6: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): feature command line for start, status and gate"
git push
```

### Task 4: Feature command line (pushback, park, handoff, tick, clear-pushback, promote)

**Files:**
- Modify: `skills/init-repo/assets/lifecycle/scripts/feature.mjs`
- Test: `skills/init-repo/tests/feature-cli-changes.test.mjs`

**Interfaces:**

The task consumes Task 3's `main`, the fake adapter, and the library. It produces six subcommands, all registered in `COMMANDS`, so `SUBCOMMANDS` now contains them:

```js
// pushback --feature <n> --from <phaseId> --to <earlier phaseId> --body-file <path>
//   full: comment body on the earlier sub-issue, reopen it, add the pushback label, then comment
//         "Blocked by #<earlier> (pushback from <from title>)." on the from-phase sub-issue.
//   lite: untick the earlier section in the parent body, then comment body on the parent.
// park --feature <n> --title <t> --body-file <path>
//   creates an issue labelled side-issue: "Side issue of #<n>, noticed during <current title>.\n\n<body>"
//   (never a sub-issue).
// handoff --feature <n> --body-file <path>      comments body on the parent issue.
// tick --feature <n> --phase <id> --text <criterion>
//   ticks that criterion on the phase's sub-issue (full) or the phase's section of the parent (lite).
// clear-pushback --feature <n> --phase <id>     removes the pushback label (full; a no-op in lite).
// promote --feature <n>
//   lite → full: creates the six sub-issues (a done section becomes a closed sub-issue with its lite
//   checklist ticked; any other carries the full checklist with its ticked lite items kept),
//   links them, flips the parent marker to mode=full, and prints the files to split feature.md into.
```

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/feature-cli-changes.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/init-repo/tests/feature-cli-changes.test.mjs`
Expected: FAIL, because the first test reports that `pushback` is not in `SUBCOMMANDS`, and the others exit `1` with a usage message.

- [ ] **Step 3: Add the six command functions to `feature.mjs`.** Put them above `const COMMANDS`.

```js
function readBodyFile(opts, cwd) {
  need(opts, "body-file");
  return readFileSync(resolve(cwd, opts["body-file"]), "utf8");
}

function pushback(opts, { gh, out, cwd }) {
  need(opts, "feature", "from", "to");
  const from = phaseOption(opts, "from");
  const to = phaseOption(opts, "to");
  if (phaseIndex(to) >= phaseIndex(from)) throw new UsageError("--to must be an earlier phase than --from");
  const body = readBodyFile(opts, cwd);
  const n = issueNumber(opts, "feature");
  const state = gh.loadFeature(n);
  if (state.mode === "lite") {
    gh.editBody(n, untickSection(state.body, to));
    gh.comment(n, body);
  } else {
    const earlier = findSub(state, to);
    const current = findSub(state, from);
    gh.comment(earlier.number, body);
    gh.reopen(earlier.number);
    gh.addLabels(earlier.number, ["pushback"]);
    gh.comment(current.number, `Blocked by #${earlier.number} (pushback from ${getPhase(from).title}).`);
  }
  out(`pushback recorded against ${getPhase(to).title}.`);
  out(`Checkpoint reached: stop and take a break, then re-run ${nextSkill(to)} in amendment mode.`);
  return 0;
}

function park(opts, { gh, out, cwd }) {
  need(opts, "feature", "title");
  const n = issueNumber(opts, "feature");
  const text = readBodyFile(opts, cwd);
  const current = currentPhase(gh.loadFeature(n));
  const during = current ? getPhase(current).title : "a completed feature";
  const issue = gh.createIssue({
    title: opts.title,
    body: `Side issue of #${n}, noticed during ${during}.\n\n${text}`,
    labels: ["side-issue"],
  });
  out(`parked as #${issue}. Back to ${during}.`);
  return 0;
}

function handoff(opts, { gh, out, cwd }) {
  need(opts, "feature");
  const n = issueNumber(opts, "feature");
  gh.comment(n, readBodyFile(opts, cwd));
  out(`handoff posted on #${n}.`);
  out("Checkpoint reached: stop here and take a break before the next role starts.");
  return 0;
}

function tick(opts, { gh, out }) {
  need(opts, "feature", "phase", "text");
  const phaseId = phaseOption(opts, "phase");
  const n = issueNumber(opts, "feature");
  const state = gh.loadFeature(n);
  const target = state.mode === "lite"
    ? { number: n, body: state.body, section: getPhase(phaseId).title }
    : { ...findSub(state, phaseId), section: null };
  const result = tickItem(target.body, opts.text, target.section);
  if (!result.found) throw new Error(`no exit criterion "${opts.text}" on ${getPhase(phaseId).title}`);
  gh.editBody(target.number, result.body);
  out(`ticked on #${target.number}: ${opts.text}`);
  return 0;
}

function clearPushback(opts, { gh, out }) {
  need(opts, "feature", "phase");
  const phaseId = phaseOption(opts, "phase");
  const state = gh.loadFeature(issueNumber(opts, "feature"));
  if (state.mode === "lite") {
    out("lite features carry no pushback label; nothing to clear");
    return 0;
  }
  const sub = findSub(state, phaseId);
  gh.removeLabels(sub.number, ["pushback"]);
  out(`pushback cleared on ${getPhase(phaseId).title} (#${sub.number})`);
  return 0;
}

function promote(opts, { gh, out }) {
  need(opts, "feature");
  const n = issueNumber(opts, "feature");
  const state = gh.loadFeature(n);
  if (state.mode !== "lite") throw new UsageError(`feature #${n} is already in full mode`);
  const sections = parseLiteSections(state.body);
  const children = PHASES.map((p) => {
    const items = sections[p.id];
    const done = items.length > 0 && items.every((i) => i.checked);
    const ticked = new Set(items.filter((i) => i.checked).map((i) => i.text));
    const number = gh.createIssue({
      title: p.title,
      body: renderSubIssueBody({ phaseId: p.id, parentNumber: n, mode: done ? "lite" : "full", ticked }),
      labels: [p.label],
    });
    return { number, done };
  });
  for (const child of children) gh.addSubIssue(n, child.number);
  for (const child of children.filter((c) => c.done)) gh.close(child.number);
  gh.editBody(n, setParentMode(state.body, "full"));
  out(`feature #${n} promoted to full mode. Regenerate docs/features/${state.slug}/feature.md as:`);
  for (const file of FULL_ARTEFACTS) out(`  - docs/features/${state.slug}/${file}`);
  return 0;
}
```

- [ ] **Step 4: Register the commands.** Replace `const COMMANDS = { start, status, gate };` with:

```js
const COMMANDS = {
  start,
  status,
  gate,
  pushback,
  park,
  handoff,
  tick,
  "clear-pushback": clearPushback,
  promote,
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS for every file, including this task's 12 tests.

- [ ] **Step 6: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): pushback, park, handoff, tick and promote commands"
git push
```

### Task 5: The feature-gate check

**Files:**
- Modify: `skills/init-repo/assets/lifecycle/scripts/feature.mjs`
- Create: `skills/init-repo/assets/lifecycle/workflows/feature-gate.yml`
- Test: `skills/init-repo/tests/feature-gate.test.mjs`

**Interfaces:**

The task consumes `classifyPr`, `evaluateGate`, `currentPhase`, `parseParent` and `parseSubIssue`, plus the adapter's `viewPr`, `viewIssue`, `listFeatures` and `loadFeature`. It produces:

```js
// gate-pr --pr <n>
//   0  not a phase PR, or the gate-override label is present, or every affected gate is open
//   2  any affected feature's gate is closed (each closed one is named in the output)
//   1  usage error or gh error — never treated as open
// A feature is affected when the PR closes one of its sub-issues (that sub-issue's phase is gated)
// or touches docs/features/<its slug>/ (its current phase is gated). A slug with no open feature
// is skipped.
```

The workflow is `.github/workflows/feature-gate.yml` in target repos. Its job id is `feature-gate`, which is also the name of the required status check.

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/feature-gate.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderParentBody, renderSubIssueBody } from "../assets/lifecycle/scripts/feature-lib.mjs";
import { fullState } from "./helpers/fixtures.mjs";
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

test("workflow shape", () => {
  const text = readFileSync(WORKFLOW, "utf8");
  assert.match(text, /^name: feature-gate$/m);
  assert.match(text, /^ {2}feature-gate:$/m);
  for (const type of ["opened", "synchronize", "reopened", "edited", "labeled", "unlabeled"]) assert.ok(text.includes(type), type);
  for (const permission of ["contents: read", "issues: read", "pull-requests: read"]) assert.ok(text.includes(permission), permission);
  assert.ok(text.includes("node scripts/feature.mjs gate-pr --pr ${{ github.event.pull_request.number }}"));
  assert.ok(text.includes("GH_TOKEN: ${{ github.token }}"));
  assert.doesNotMatch(text, /`[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*`/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/init-repo/tests/feature-gate.test.mjs`
Expected: FAIL. The `gate-pr` tests exit `1` with a usage message, and the workflow test fails with `ENOENT`.

- [ ] **Step 3: Add `gatePr` to `feature.mjs`** above `const COMMANDS`, and add `"gate-pr": gatePr,` to `COMMANDS` after `gate`.

```js
function gatePr(opts, { gh, out }) {
  need(opts, "pr");
  const { phasePr, slugs, closes, override } = classifyPr(gh.viewPr(issueNumber(opts, "pr")));
  if (!phasePr) {
    out("not a phase PR: the feature gate does not apply");
    return 0;
  }
  if (override) {
    out("gate-override label present: the feature gate is not enforced. Give the reason in the Narrative sections.");
    return 0;
  }
  // feature number → the phase the PR is for (null means "its current phase").
  const targets = new Map();
  for (const number of closes) {
    const sub = parseSubIssue(gh.viewIssue(number).body);
    if (sub?.parentNumber) targets.set(sub.parentNumber, sub.phaseId);
  }
  const features = slugs.length > 0 ? gh.listFeatures() : [];
  for (const slug of slugs) {
    const feature = features.find((f) => parseParent(f.body)?.slug === slug);
    if (!feature) {
      out(`no open feature for docs/features/${slug}/: skipped`);
      continue;
    }
    if (!targets.has(feature.number)) targets.set(feature.number, null);
  }
  let code = 0;
  for (const [number, phaseId] of targets) {
    const state = gh.loadFeature(number);
    const phase = phaseId ?? currentPhase(state);
    if (phase === null) {
      out(`feature #${number}: all phases are done`);
      continue;
    }
    const result = evaluateGate(state, phase);
    out(`feature #${number}: gate ${result.open ? "open" : "closed"} for ${getPhase(phase).title}`);
    for (const reason of result.reasons) out(`  - ${reason}`);
    if (!result.open) code = 2;
  }
  return code;
}
```

- [ ] **Step 4: Create `skills/init-repo/assets/lifecycle/workflows/feature-gate.yml`**

```yaml
# Feature lifecycle gate. Installed by init-repo with the lifecycle kit; a required check.
# A pull request that closes a phase sub-issue, or touches docs/features/<slug>/, fails while an
# earlier phase of that feature is open, unticked or in pushback. Any other pull request passes.
# The only bypass is the gate-override label, with the reason in the Narrative sections.

name: feature-gate

on:
  pull_request:
    types: [opened, synchronize, reopened, edited, labeled, unlabeled]

permissions:
  contents: read
  issues: read
  pull-requests: read

jobs:
  feature-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node scripts/feature.mjs gate-pr --pr ${{ github.event.pull_request.number }}
        env:
          GH_TOKEN: ${{ github.token }}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS for every file, including this task's 8 tests.

- [ ] **Step 6: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): feature-gate pull request check"
git push
```
