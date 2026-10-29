# 04 — init-repo installs the lifecycle kit (Tasks 10–12)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

These tasks connect the lifecycle kit to `init-repo`, the infrastructure layer that sets up target repositories:
- `init-files.mjs` copies the kit into a target repo and overwrites earlier copies, either as part of the full `Baseline` or on its own with `--skills-only`;
- `apply-github-settings.sh` creates the new labels and makes `feature-gate` a required check;
- the last task documents all of this in the skill and the README.

Every edit below is an exact replacement in an existing file. Where a step says "replace", the old text appears exactly once in that file.

### Task 10: init-files.mjs copies the lifecycle kit, and the --skills-only mode

**Files:**
- Modify: `skills/init-repo/scripts/init-files.mjs`
- Test: `skills/init-repo/tests/init-files.test.mjs`

**Interfaces:**

The task consumes everything under `skills/init-repo/assets/lifecycle/` from Tasks 2–9. It produces these behaviours of `init-files.mjs`:

```js
// New flag: --skills-only. Only --target is required; installs the lifecycle kit and nothing else
// (no steering files, no Narrative or ontology installers), prints the summary, then prints the
// AGENTS.md section unless the target's AGENTS.md already contains "## Feature lifecycle".
//
// Normal runs install the kit too, just before the summary.
//
// Kit files are overwritten, unlike the rest of the Baseline. Each is reported as one of:
//   "created  <path>"  missing before
//   "updated  <path>"  differed, now replaced
//   "kept     <path>"  identical
// Destinations: assets/lifecycle/skills/** → .claude/skills/**, .agents/skills/**, .kiro/skills/**
//               assets/lifecycle/scripts/* → scripts/*
//               assets/lifecycle/workflows/feature-gate.yml → .github/workflows/feature-gate.yml
// --dry-run reports the same outcomes and writes nothing.
```

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/init-files.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "../scripts/init-files.mjs");
const KIT = join(HERE, "../assets/lifecycle");

const KIT_FILES = [
  ".claude/skills/feature-analyst/SKILL.md",
  ".agents/skills/feature-analyst/SKILL.md",
  ".kiro/skills/feature-analyst/SKILL.md",
  ".claude/skills/feature/templates/handoff.md",
  "scripts/feature.mjs",
  "scripts/feature-lib.mjs",
  "scripts/feature-gh.mjs",
  ".github/workflows/feature-gate.yml",
];

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "init-files-"));
  mkdirSync(join(dir, ".git"));
  return dir;
}

function initFiles(...args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
  return { code: result.status, output: `${result.stdout}${result.stderr}` };
}

test("skills-only installs kit in three places", () => {
  const dir = repo();
  const { code } = initFiles("--target", dir, "--skills-only");
  assert.equal(code, 0);
  for (const file of KIT_FILES) {
    assert.ok(existsSync(join(dir, file)), file);
    assert.equal(lstatSync(join(dir, file)).isSymbolicLink(), false, file);
  }
  assert.equal(
    readFileSync(join(dir, ".kiro/skills/feature-po/SKILL.md"), "utf8"),
    readFileSync(join(KIT, "skills/feature-po/SKILL.md"), "utf8"),
  );
});

test("skills-only overwrites changed copy", () => {
  const dir = repo();
  initFiles("--target", dir, "--skills-only");
  const copy = join(dir, ".agents/skills/feature-dev/SKILL.md");
  writeFileSync(copy, "changed locally\n");
  const { code, output } = initFiles("--target", dir, "--skills-only");
  assert.equal(code, 0);
  assert.equal(readFileSync(copy, "utf8"), readFileSync(join(KIT, "skills/feature-dev/SKILL.md"), "utf8"));
  assert.match(output, /updated\s+\.agents\/skills\/feature-dev\/SKILL\.md/);
});

test("identical copy is kept", () => {
  const dir = repo();
  initFiles("--target", dir, "--skills-only");
  const { code, output } = initFiles("--target", dir, "--skills-only");
  assert.equal(code, 0);
  assert.doesNotMatch(output, /^\s+(created|updated)\s/m);
  assert.match(output, /kept\s+scripts\/feature\.mjs/);
});

test("skills-only needs no other options and runs no installers", () => {
  const { code, output } = initFiles("--target", repo(), "--skills-only");
  assert.equal(code, 0);
  assert.doesNotMatch(output, /Project Narrative|Ontology kit/);
});

test("non-git target fails", () => {
  const dir = mkdtempSync(join(tmpdir(), "init-files-"));
  const { code, output } = initFiles("--target", dir, "--skills-only");
  assert.notEqual(code, 0);
  assert.match(output, /is not a git repository/);
});

test("dry run writes nothing", () => {
  const dir = repo();
  const { code, output } = initFiles("--target", dir, "--skills-only", "--dry-run");
  assert.equal(code, 0);
  for (const file of KIT_FILES) assert.equal(existsSync(join(dir, file)), false, file);
  assert.match(output, /created\s+scripts\/feature\.mjs/);
});

test("agents section printed when missing", () => {
  const dir = repo();
  assert.match(initFiles("--target", dir, "--skills-only").output, /## Feature lifecycle/);
  writeFileSync(join(dir, "AGENTS.md"), "# Rules\n\n## Feature lifecycle\n\nAlready here.\n");
  assert.doesNotMatch(initFiles("--target", dir, "--skills-only").output, /Add this section to AGENTS\.md/);
});

test("without skills-only the usual options are still required", () => {
  const { code, output } = initFiles("--target", repo());
  assert.equal(code, 1);
  assert.match(output, /--name is required/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/init-repo/tests/init-files.test.mjs`
Expected: FAIL. Every `--skills-only` test exits `1` with `unknown option "--skills-only"`. The last test passes already.

- [ ] **Step 3: Accept the flag.** In `skills/init-repo/scripts/init-files.mjs`, make these replacements.

Replace

```js
//        [--ontology-kit <checkout>] [--dry-run]
```

with

```js
//        [--ontology-kit <checkout>] [--dry-run]
//   node init-files.mjs --target <repo> --skills-only [--dry-run]
//
// The feature lifecycle kit (persona skills, scripts/feature*.mjs, the feature-gate workflow) is
// init-repo-owned: unlike the rest of the baseline it is overwritten on every run.
```

Replace

```js
  if (arg === "--dry-run") args.dryRun = true;
```

with

```js
  if (arg === "--dry-run") args.dryRun = true;
  else if (arg === "--skills-only") args.skillsOnly = true;
```

Replace

```js
for (const required of ["target", "name", "description", "owner"]) {
```

with

```js
for (const required of args.skillsOnly ? ["target"] : ["target", "name", "description", "owner"]) {
```

Replace

```js
const values = { PROJECT_NAME: args.name, DESCRIPTION: args.description, OWNER: args.owner.replace(/^@/, "") };
```

with

```js
const values = { PROJECT_NAME: args.name, DESCRIPTION: args.description, OWNER: (args.owner ?? "").replace(/^@/, "") };
```

- [ ] **Step 4: Add the kit installer.** Insert this directly after the closing `}` of `function writeIfMissing`:

```js
const KIT = join(ASSETS, "lifecycle");
const SKILL_DIRS = [".claude/skills", ".agents/skills", ".kiro/skills"];

// Kit files are init-repo-owned, so they are overwritten rather than kept.
function writeKitFile(dest, content) {
  const path = join(target, dest);
  const outcome = !existsSync(path) ? "created" : readFileSync(path).equals(content) ? "kept" : "updated";
  if (outcome !== "kept" && !args.dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  report.push(`${outcome.padEnd(8)} ${dest}`);
}

function installLifecycleKit() {
  console.log("\nFeature lifecycle kit");
  const skills = join(KIT, "skills");
  for (const file of walk(skills)) {
    for (const dir of SKILL_DIRS) writeKitFile(join(dir, relative(skills, file)), readFileSync(file));
  }
  const scripts = join(KIT, "scripts");
  for (const file of walk(scripts)) writeKitFile(join("scripts", relative(scripts, file)), readFileSync(file));
  writeKitFile(".github/workflows/feature-gate.yml", readFileSync(join(KIT, "workflows", "feature-gate.yml")));
}

function printSummary() {
  console.log("\nSummary");
  for (const line of report) console.log(`  ${line}`);
}

function printAgentsSectionIfMissing() {
  const agents = join(target, "AGENTS.md");
  if (existsSync(agents) && readFileSync(agents, "utf8").includes("## Feature lifecycle")) return;
  console.log("\nAdd this section to AGENTS.md (it is not there yet):\n");
  console.log(readFileSync(join(KIT, "agents-section.md"), "utf8"));
}
```

- [ ] **Step 5: Add the skills-only path.** Replace

```js
console.log(`init-repo: ${args.dryRun ? "planning" : "applying"} baseline in ${target} (stack: ${args.stack})`);
```

with

```js
if (args.skillsOnly) {
  console.log(`init-repo: ${args.dryRun ? "planning" : "applying"} the feature lifecycle kit in ${target}`);
  installLifecycleKit();
  printSummary();
  printAgentsSectionIfMissing();
  process.exit(0);
}

console.log(`init-repo: ${args.dryRun ? "planning" : "applying"} baseline in ${target} (stack: ${args.stack})`);
```

- [ ] **Step 6: Install the kit on normal runs too.** Replace

```js
console.log("\nSummary");
for (const line of report) console.log(`  ${line}`);
```

with

```js
installLifecycleKit();
printSummary();
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS for every file, including this task's 8 tests.

- [ ] **Step 8: Commit and push**

```
git add -A
git commit -m "feat(init-repo): install the lifecycle kit and add skills-only mode"
git push
```

### Task 11: GitHub settings for labels and the required check

**Files:**
- Modify: `skills/init-repo/scripts/apply-github-settings.sh`
- Test: `skills/init-repo/tests/apply-github-settings.test.mjs`

**Interfaces:**

The task produces these behaviours of `apply-github-settings.sh`:

```js
// New labels (all created with --force, so re-running updates them):
//   feature, side-issue, pushback, gate-override, phase:po, phase:analyst, phase:architect,
//   phase:dev, phase:user
// Required status checks: ["ai-fingerprint", "feature-gate"]; enforce_admins stays false, so the
// admin merge override is preserved.
// --dry-run now also prints the protection JSON it would send.
```

- [ ] **Step 1: Write the failing test**

Create `skills/init-repo/tests/apply-github-settings.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "../scripts/apply-github-settings.sh");
const LABELS = [
  "feature",
  "side-issue",
  "pushback",
  "gate-override",
  "phase:po",
  "phase:analyst",
  "phase:architect",
  "phase:dev",
  "phase:user",
];

function dryRun() {
  const result = spawnSync("bash", [SCRIPT, "--repo", "o/r", "--stack", "none", "--dry-run"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("creates lifecycle labels", () => {
  const out = dryRun();
  for (const label of LABELS) assert.ok(out.includes(`gh label create ${label} -R o/r --force`), label);
});

test("requires feature-gate", () => {
  assert.ok(dryRun().includes('"contexts": ["ai-fingerprint", "feature-gate"]'));
});

test("admins not enforced", () => {
  assert.ok(dryRun().includes('"enforce_admins": false'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/init-repo/tests/apply-github-settings.test.mjs`
Expected: FAIL. No lifecycle labels appear in the output, and the dry run never prints the protection JSON.

- [ ] **Step 3: Update the header comment.** Replace

```bash
#   - labels: narrative-required (and no-build-check for a .NET stack)
```

with

```bash
#   - labels: narrative-required (and no-build-check for a .NET stack), plus the feature lifecycle
#     labels: feature, side-issue, pushback, gate-override and phase:<persona>
```

Then replace

```bash
#     `ai-fingerprint` required, admins NOT enforced (owner override), no force-push/deletion
```

with

```bash
#     `ai-fingerprint` and `feature-gate` required, admins NOT enforced (owner override),
#     no force-push/deletion
```

- [ ] **Step 4: Create the lifecycle labels.** Replace

```bash
echo "Actions workflow permissions"
```

with

```bash
lifecycle_label() {
  do_gh label create "$1" -R "$repo" --force --description "$2" --color "$3"
}
lifecycle_label feature "Parent issue of a feature in the persona workflow" 0e8a16
lifecycle_label side-issue "Noticed during a feature and parked instead of worked on" fbca04
lifecycle_label pushback "An earlier feature phase reopened by a later role" d93f0b
lifecycle_label gate-override "Bypasses the feature-gate check; give the reason in the Narrative sections" b60205
for persona in po analyst architect dev user; do
  lifecycle_label "phase:$persona" "Feature phase owned by the $persona" 1d76db
done

echo "Actions workflow permissions"
```

- [ ] **Step 5: Require the gate and show the JSON on dry runs.** Replace

```bash
  "required_status_checks": {"strict": false, "contexts": ["ai-fingerprint"]},
```

with

```bash
  "required_status_checks": {"strict": false, "contexts": ["ai-fingerprint", "feature-gate"]},
```

Then replace

```bash
echo "  gh api -X PUT repos/$repo/branches/$branch/protection --input - <<< (protection JSON)"
```

with

```bash
echo "  gh api -X PUT repos/$repo/branches/$branch/protection --input - <<< (protection JSON)"
if [ "$dry" -eq 1 ]; then printf '%s\n' "$protection"; fi
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS for every file, including this task's 3 tests.

- [ ] **Step 7: Commit and push**

```
git add -A
git commit -m "feat(init-repo): lifecycle labels and required feature-gate check"
git push
```

### Task 12: Document the lifecycle in init-repo

**Files:**
- Modify: `skills/init-repo/SKILL.md`
- Modify: `README.md`

**Interfaces:**

The task consumes the behaviour from Tasks 10 and 11. It produces documentation only, with no code.

- [ ] **Step 1: Update the skill description.** In `skills/init-repo/SKILL.md`, replace

```markdown
  a docs-skipping .NET build workflow, CODEOWNERS, and GitHub branch protection requiring a
  code-owner approval.
```

with

```markdown
  a docs-skipping .NET build workflow, CODEOWNERS, the feature lifecycle persona skills with their
  feature-gate check, and GitHub branch protection requiring a code-owner approval.
```

- [ ] **Step 2: Document `--skills-only`.** Replace

```markdown
Run `--dry-run` first on an existing repo.
```

with

```markdown
For a repo that already has the baseline and only needs the feature lifecycle kit added or
refreshed, run `node ${CLAUDE_PLUGIN_ROOT}/skills/init-repo/scripts/init-files.mjs --target <repo>
--skills-only`. It needs no other options, runs no installers, and prints the AGENTS.md section to
merge if the repo's AGENTS.md does not have it yet.

Run `--dry-run` first on an existing repo.
```

- [ ] **Step 3: Add the kit to the table.** In the "What it lays down" table, add this row after the `CODEOWNERS` row:

```markdown
| Feature lifecycle kit | The persona skills (`feature`, `feature-po`, `feature-analyst`, `feature-architect`, `feature-dev`, `feature-user`, `feature-park`) copied into `.claude/skills/`, `.agents/skills/` and `.kiro/skills/` so Claude Code, Codex, opencode and Kiro all find them; `scripts/feature*.mjs`, which hold every gate rule; and the `feature-gate` workflow. Unlike everything else here it is **overwritten** on each run (reported `updated`), because the copies must match this marketplace. |
```

- [ ] **Step 4: Update step 4.** In section `## 4. GitHub settings (only with the user's yes)`, replace

```markdown
Creates the labels, sets Actions workflow permissions (Narrative opens PRs), and protects the
default branch: PR required, one code-owner approval, `ai-fingerprint` required, `enforce_admins`
off so the owner can override, no force-push or deletion.
```

with

```markdown
Creates the labels (including `feature`, `side-issue`, `pushback`, `gate-override` and the five
`phase:` labels), sets Actions workflow permissions (Narrative opens PRs), and protects the
default branch: PR required, one code-owner approval, `ai-fingerprint` and `feature-gate`
required, `enforce_admins` off so the owner can override the merge, no force-push or deletion.
```

- [ ] **Step 5: Add two warnings.** Append these bullets to the list under `## Things that will go wrong if forgotten`:

```markdown
- A persona skill or `scripts/feature*.mjs` changed inside a target repo is overwritten by the next
  `init-files.mjs` run. Make the change in this marketplace's `assets/lifecycle/` instead, then
  refresh with `--skills-only`.
- `feature-gate` becomes a required check in step 4. Install the kit (step 2) before applying the
  settings, or every pull request waits for a check that never runs.
```

- [ ] **Step 6: Update the README.** In `README.md`, replace

```markdown
.NET build workflow, CODEOWNERS, branch protection).
```

with

```markdown
.NET build workflow, CODEOWNERS, branch protection) and the feature lifecycle kit.

## Feature lifecycle

`init-repo` also installs seven portable skills that take a feature through product owner, analyst,
architect, developer and user phases, with a GitHub issue per handoff and an enforced gate between
phases: `feature` (start, status, resume, pushback, promote), `feature-po`, `feature-analyst`,
`feature-architect`, `feature-dev`, `feature-user` and `feature-park`. They work in Claude Code,
Codex, opencode and Kiro. See the
[design](docs/superpowers/specs/2026-10-29-feature-lifecycle-design.md).
```

- [ ] **Step 7: Check the docs and the whole suite**

Run: `git add -A && node scripts/check-ontology-terms.mjs && node --test skills/init-repo/tests/*.test.mjs`
Expected: the term check prints OK, and every test file passes.

- [ ] **Step 8: Commit and push**

```
git add -A
git commit -m "docs(init-repo): document the feature lifecycle kit"
git push
```
