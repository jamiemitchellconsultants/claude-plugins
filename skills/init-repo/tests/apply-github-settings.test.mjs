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
