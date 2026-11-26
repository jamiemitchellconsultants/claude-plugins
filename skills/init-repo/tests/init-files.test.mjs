import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "../scripts/init-files.mjs");
const KIT = join(HERE, "../assets/lifecycle");
const BASELINE = join(HERE, "../assets/files/docs/architecture-baseline.md.dotnet");
const PASCAL = /`([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*)`/g;

// A stand-in installer checkout: a full run only checks that the file exists, and --dry-run never runs it.
function installer(name, file) {
  const dir = mkdtempSync(join(tmpdir(), `${name}-`));
  mkdirSync(join(dir, "bin"));
  writeFileSync(join(dir, "bin", file), "");
  return dir;
}

function fullDryRun(dir, stack) {
  return initFiles(
    "--target", dir, "--name", "Demo", "--description", "A demo", "--owner", "someone", "--stack", stack,
    "--narrative", installer("narrative", "narrative.mjs"),
    "--ontology-kit", installer("ontology-kit", "install-ontology.mjs"),
    "--dry-run",
  );
}

const KIT_FILES = [
  ".claude/skills/feature-analyst/SKILL.md",
  ".agents/skills/feature-analyst/SKILL.md",
  ".kiro/skills/feature-analyst/SKILL.md",
  ".claude/skills/feature-analyze/SKILL.md",
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

test("kit installation skips dotfiles such as .DS_Store", () => {
  const stray = join(KIT, "scripts", ".DS_Store");
  writeFileSync(stray, "junk");
  try {
    const dir = repo();
    assert.equal(initFiles("--target", dir, "--skills-only").code, 0);
    assert.equal(existsSync(join(dir, "scripts", ".DS_Store")), false);
    const installed = [".claude/skills", ".agents/skills", ".kiro/skills", "scripts"].flatMap((d) => readdirSync(join(dir, d), { recursive: true }));
    assert.deepEqual(installed.filter((p) => p.split("/").some((s) => s.startsWith("."))), []);
  } finally {
    rmSync(stray, { force: true });
  }
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

test("baseline is seeded for stack dotnet", () => {
  const { code, output } = fullDryRun(repo(), "dotnet");
  assert.equal(code, 0, output);
  assert.match(output, /created\s+docs\/architecture-baseline\.md/);
});

test("baseline is not seeded for stack none", () => {
  const { code, output } = fullDryRun(repo(), "none");
  assert.equal(code, 0, output);
  assert.doesNotMatch(output, /architecture-baseline/);
});

test("an existing baseline is kept", () => {
  const dir = repo();
  mkdirSync(join(dir, "docs"));
  writeFileSync(join(dir, "docs/architecture-baseline.md"), "ours\n");
  const { code, output } = fullDryRun(dir, "dotnet");
  assert.equal(code, 0, output);
  assert.match(output, /kept\s+docs\/architecture-baseline\.md/);
});

test("the seeded baseline has the three sections", () => {
  const headings = readFileSync(BASELINE, "utf8").split("\n").filter((line) => line.startsWith("## "));
  assert.deepEqual(headings, ["## Fixed", "## Per-environment adapters", "## Variable"]);
});

test("the seeded baseline records the house choices", () => {
  const text = readFileSync(BASELINE, "utf8");
  for (const needle of [
    "Blazor WebAssembly", "PostgreSQL", "OIDC", "Entra", "Keycloak", "Terraform", "MinIO", "S3", "Lambda",
    ".NET MAUI", "not MAUI Blazor Hybrid",
    "Does anyone outside your own network need to try this before it goes live?",
    "Do people need to install this from an app store, use phone features such as notifications, or use it without a connection?",
  ]) {
    assert.ok(text.includes(needle), needle);
  }
});

test("the seeded baseline has no backticked PascalCase", () => {
  assert.deepEqual([...readFileSync(BASELINE, "utf8").matchAll(PASCAL)].map((m) => m[1]), []);
});
