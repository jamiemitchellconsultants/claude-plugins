import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS = join(dirname(fileURLToPath(import.meta.url)), "../../assets/lifecycle/skills");

export function readSkill(name) {
  return readFileSync(join(SKILLS, name, "SKILL.md"), "utf8");
}

export function section(text, heading) {
  const lines = text.split("\n");
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, `missing ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  const end = lines.findIndex((line, i) => i > start && /^#+ /.test(line) && line.match(/^#+/)[0].length <= level);
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}
