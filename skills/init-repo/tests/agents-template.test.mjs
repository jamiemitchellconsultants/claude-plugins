import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = readFileSync(join(HERE, "../assets/AGENTS.md.tmpl"), "utf8");

// Mirrors the stack handling in scripts/init-files.mjs.
function render(dotnet) {
  return TEMPLATE.replace(/<!-- if:dotnet -->\n([\s\S]*?)<!-- endif -->\n/g, (m, body) => (dotnet ? body : ""));
}

function section(text, heading) {
  const start = text.indexOf(`\n${heading}\n`);
  assert.notEqual(start, -1, heading);
  const next = text.indexOf("\n## ", start + heading.length + 2);
  return text.slice(start, next === -1 ? undefined : next);
}

for (const [stack, dotnet] of [["dotnet", true], ["none", false]]) {
  test(`${stack}: public code is documented in the language's doc-comment format`, () => {
    const comments = section(render(dotnet), "## Code comments");
    assert.match(comments, /every public type and member/);
    assert.match(comments, /standard doc-comment format/);
    for (const name of ["Javadoc", "TSDoc", "docstrings", "rustdoc"]) {
      assert.ok(comments.includes(name), name);
    }
  });

  test(`${stack}: detailed-plan interfaces carry doc comments`, () => {
    const plans = section(render(dotnet), "## Detailed implementation plans");
    assert.match(plans, /doc comment/);
    assert.match(plans, /\[Code comments\]\(#code-comments\)/);
    assert.doesNotMatch(plans, /member-level comments/);
  });
}

test("dotnet: C# uses XML doc comments", () => {
  const comments = section(render(true), "## Code comments");
  assert.match(comments, /XML doc comments/);
  assert.match(comments, /<summary>/);
});

test("none: the C# rule is left out", () => {
  assert.doesNotMatch(section(render(false), "## Code comments"), /XML doc comments/);
});
