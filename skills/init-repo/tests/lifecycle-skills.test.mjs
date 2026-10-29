import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SUBCOMMANDS } from "../assets/lifecycle/scripts/feature.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = resolve(HERE, "../assets/lifecycle");
const SKILLS = join(KIT, "skills");
const SPEC = resolve(HERE, "../../../docs/superpowers/specs/2026-10-29-feature-lifecycle-design.md");

const PERSONAS = ["feature-po", "feature-analyst", "feature-architect", "feature-dev", "feature-user"];
const PERSONA_HEADINGS = [
  "## Role brief",
  "### Cares about",
  "### Deliberately ignores",
  "### Good output",
  "### Exit criteria",
  "## Gate check",
  "## Work",
  "## Checkpoint",
  "## Review feedback",
  "## Pushback",
];
const PASCAL = /`([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*)`/g;
const HAND_EDIT = /edit the file|hand-edit|manually edit/i;
const TEMPLATE_REF = /(?:\.\.\/feature\/)?templates\/[a-z-]+\.md/g;
const COMMAND_REF = /node scripts\/feature\.mjs ([a-z-]+)/g;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const skillNames = () => readdirSync(SKILLS).filter((name) => statSync(join(SKILLS, name)).isDirectory());
const skillText = (name) => readFileSync(join(SKILLS, name, "SKILL.md"), "utf8");
const kitTextFiles = () => walk(KIT).filter((file) => /\.(md|yml)$/.test(file));

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, "SKILL.md must start with frontmatter");
  return Object.fromEntries(
    m[1].split("\n").map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
    }),
  );
}

test("the kit has the feature and park skills", () => {
  for (const name of ["feature", "feature-park"]) assert.ok(skillNames().includes(name), name);
});

test("frontmatter is name and description only", () => {
  for (const name of skillNames()) {
    const fm = frontmatter(skillText(name));
    assert.deepEqual(Object.keys(fm), ["name", "description"], name);
    assert.equal(fm.name, name);
  }
});

test("description starts with Use when and is plain YAML", () => {
  for (const name of skillNames()) {
    const { description } = frontmatter(skillText(name));
    assert.ok(description.startsWith("Use when "), name);
    assert.ok(!description.includes(": "), `${name}: a colon followed by a space breaks YAML`);
    assert.ok(!/^["'>|]/.test(description), `${name}: description must be a plain one-line scalar`);
  }
});

test("no backticked PascalCase", () => {
  for (const file of kitTextFiles()) {
    const found = [...readFileSync(file, "utf8").matchAll(PASCAL)].map((m) => m[1]);
    assert.deepEqual(found, [], file);
  }
});

test("no hand-edit instruction", () => {
  for (const file of kitTextFiles()) {
    const lines = readFileSync(file, "utf8").split("\n").filter((line) => HAND_EDIT.test(line));
    assert.deepEqual(lines, [], file);
  }
});

test("referenced templates exist", () => {
  for (const name of skillNames()) {
    for (const [ref] of skillText(name).matchAll(TEMPLATE_REF)) {
      assert.ok(existsSync(resolve(SKILLS, name, ref)), `${name}: ${ref}`);
    }
  }
});

test("referenced subcommands exist", () => {
  for (const file of kitTextFiles()) {
    for (const [, sub] of readFileSync(file, "utf8").matchAll(COMMAND_REF)) {
      assert.ok(SUBCOMMANDS.includes(sub), `${file}: ${sub}`);
    }
  }
});

test("persona skills have the convention sections", () => {
  for (const name of skillNames().filter((n) => PERSONAS.includes(n))) {
    const lines = skillText(name).split("\n");
    const positions = PERSONA_HEADINGS.map((h) => lines.indexOf(h));
    for (const [i, h] of PERSONA_HEADINGS.entries()) assert.ok(positions[i] >= 0, `${name} lacks ${h}`);
    assert.deepEqual([...positions].sort((a, b) => a - b), positions, `${name}: headings out of order`);
  }
});

test("templates verbatim", () => {
  const spec = readFileSync(SPEC, "utf8");
  for (const [heading, file] of [
    ["### Handoff comment template", "handoff.md"],
    ["### Pushback comment template", "pushback.md"],
  ]) {
    const block = spec.slice(spec.indexOf(heading)).match(/```\n([\s\S]*?)\n```/)[1];
    assert.equal(readFileSync(join(SKILLS, "feature", "templates", file), "utf8"), `${block}\n`, file);
  }
});
