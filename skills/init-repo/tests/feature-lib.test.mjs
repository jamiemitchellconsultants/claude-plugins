import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXIT_CRITERIA,
  PHASES,
  classifyPr,
  currentPhase,
  evaluateGate,
  nextSkill,
  parseChecklist,
  parseLiteSections,
  parseParent,
  parseSubIssue,
  renderChecklist,
  renderParentBody,
  renderSubIssueBody,
  setParentMode,
  slugify,
  tickItem,
  untickSection,
} from "../assets/lifecycle/scripts/feature-lib.mjs";
import { fullState, liteState } from "./helpers/fixtures.mjs";

const ALL = ["po", "analyst", "architect", "dev-plan", "dev-build", "user"];

test("PHASES order and labels", () => {
  assert.deepEqual(PHASES.map((p) => p.id), ALL);
  assert.deepEqual(PHASES.map((p) => p.title), [
    "[PO] Vision",
    "[Analyst] Behaviours",
    "[Architect] Structure",
    "[Dev] Plan",
    "[Dev] Build",
    "[User] Docs & acceptance",
  ]);
  assert.deepEqual(PHASES.map((p) => p.label), [
    "phase:po",
    "phase:analyst",
    "phase:architect",
    "phase:dev",
    "phase:dev",
    "phase:user",
  ]);
});

test("every phase has exit criteria with at least one lite item", () => {
  for (const p of PHASES) {
    assert.ok(EXIT_CRITERIA[p.id].length > 0, p.id);
    assert.ok(EXIT_CRITERIA[p.id].some((c) => c.lite), p.id);
  }
});

test("lite checklist is the lite subset", () => {
  assert.equal(renderChecklist("po", "lite").split("\n").length, 3);
  assert.equal(renderChecklist("po", "full").split("\n").length, 5);
  assert.match(renderChecklist("po", "full"), /^- \[ \] the problem is stated in user terms$/m);
});

test("renderChecklist ticks the given items", () => {
  const out = renderChecklist("dev-build", "full", new Set(["tests pass"]));
  assert.match(out, /^- \[x\] tests pass$/m);
  assert.match(out, /^- \[ \] every task in the detailed plan is executed and committed$/m);
});

test("unknown phase is rejected", () => {
  assert.throws(() => renderChecklist("qa"), /unknown phase "qa"/);
});

test("parseChecklist tolerates formatting", () => {
  const items = parseChecklist("- [x] a\n* [X] b\n-  [ ]  c\nnot a box\n");
  assert.deepEqual(items, [
    { text: "a", checked: true },
    { text: "b", checked: true },
    { text: "c", checked: false },
  ]);
});

test("parent marker round-trips", () => {
  for (const mode of ["full", "lite"]) {
    assert.deepEqual(parseParent(renderParentBody({ name: "Demo", slug: "demo", mode })), { slug: "demo", mode });
  }
  assert.equal(parseParent("no marker"), null);
  assert.equal(parseParent(undefined), null);
});

test("parent body names the owner without mentioning them", () => {
  const body = renderParentBody({ name: "Demo", slug: "demo", mode: "full", owner: "jamie" });
  assert.match(body, /\*\*Owner:\*\* jamie/);
  assert.doesNotMatch(body, /@jamie/);
});

test("lite parent body has one section per phase", () => {
  const body = renderParentBody({ name: "Demo", slug: "demo", mode: "lite" });
  assert.equal((body.match(/^### /gm) ?? []).length, 6);
  const sections = parseLiteSections(body);
  assert.equal(sections.po.length, 3);
  assert.ok(sections.user.every((i) => !i.checked));
});

test("sub-issue marker round-trips", () => {
  const body = renderSubIssueBody({ phaseId: "architect", parentNumber: 7 });
  assert.deepEqual(parseSubIssue(body), { phaseId: "architect", parentNumber: 7 });
  assert.equal(parseChecklist(body).length, EXIT_CRITERIA.architect.length);
  assert.equal(parseSubIssue("plain issue"), null);
});

test("setParentMode flips the marker only", () => {
  const body = renderParentBody({ name: "Demo", slug: "demo", mode: "lite" });
  const flipped = setParentMode(body, "full");
  assert.deepEqual(parseParent(flipped), { slug: "demo", mode: "full" });
  assert.equal(flipped.replace("mode=full", "mode=lite"), body);
});

test("tickItem ticks within one section only", () => {
  const body = renderParentBody({ name: "Demo", slug: "demo", mode: "lite" });
  const result = tickItem(body, "tests  pass", "[Dev] Build");
  assert.equal(result.found, true);
  assert.ok(parseLiteSections(result.body)["dev-build"].find((i) => i.text === "tests pass").checked);
  assert.equal(tickItem(body, "tests pass", "[PO] Vision").found, false);
});

test("untickSection clears one section", () => {
  const state = liteState(["po", "analyst"]);
  const sections = parseLiteSections(untickSection(state.body, "analyst"));
  assert.ok(sections.po.every((i) => i.checked));
  assert.ok(sections.analyst.every((i) => !i.checked));
});

test("currentPhase full", () => {
  assert.equal(currentPhase(fullState(["po"])), "analyst");
  assert.equal(currentPhase(fullState(ALL)), null);
});

test("currentPhase lite", () => {
  const state = liteState(["po"]);
  assert.equal(currentPhase(state), "analyst");
  const partly = {
    ...state,
    body: tickItem(state.body, "each behaviour is a Given/When/Then scenario", "[Analyst] Behaviours").body,
  };
  assert.equal(currentPhase(partly), "analyst");
});

test("gate closed while earlier phase open", () => {
  const result = evaluateGate(fullState(["po"]), "architect");
  assert.equal(result.open, false);
  assert.ok(result.reasons.some((r) => r.includes("[Analyst] Behaviours") && r.includes("still open")));
});

test("gate closed on unticked criterion", () => {
  const result = evaluateGate(fullState(["po"], { po: { ticked: false } }), "analyst");
  assert.equal(result.open, false);
  assert.ok(result.reasons.some((r) => r.includes('"the problem is stated in user terms"')));
});

test("gate closed on pushback", () => {
  const state = fullState(["analyst"], { po: { labels: ["phase:po", "pushback"] } });
  const result = evaluateGate(state, "architect");
  assert.equal(result.open, false);
  assert.ok(result.reasons.some((r) => r.includes("pushback") && r.includes("feature-po") && r.includes("amendment mode")));
});

test("gate closed on pushback left on a closed sub-issue says how to clear it", () => {
  const state = fullState(["po", "analyst"], { po: { labels: ["phase:po", "pushback"] } });
  const result = evaluateGate(state, "architect");
  assert.equal(result.open, false);
  assert.ok(result.reasons.some((r) => r.includes("has pushback but is closed") && r.includes("clear-pushback --feature 1 --phase po")));
});

test("gate open", () => {
  assert.deepEqual(evaluateGate(fullState(["po", "analyst"]), "architect"), { open: true, reasons: [] });
  assert.deepEqual(evaluateGate(fullState([]), "po"), { open: true, reasons: [] });
});

test("gate closed when a sub-issue is missing", () => {
  const state = fullState(["po"]);
  state.subIssues = state.subIssues.filter((s) => s.phaseId !== "po");
  const result = evaluateGate(state, "analyst");
  assert.equal(result.open, false);
  assert.ok(result.reasons.some((r) => r.includes("[PO] Vision") && r.includes("no sub-issue") && r.includes("as a sub-issue of #1")));
});

test("lite gate follows the checklist", () => {
  assert.equal(evaluateGate(liteState(["po"]), "analyst").open, true);
  const closed = evaluateGate(liteState(["po"]), "architect");
  assert.equal(closed.open, false);
  assert.ok(closed.reasons.length > 0);
  assert.ok(closed.reasons.every((r) => r.startsWith("[Analyst] Behaviours")));
});

test("classifyPr two features", () => {
  const result = classifyPr({
    body: "",
    files: ["docs/features/b/01-vision.md", "docs/features/a/x.md", "src/a.js"],
    labels: [],
  });
  assert.deepEqual(result, { phasePr: true, slugs: ["a", "b"], closes: [], override: false });
});

test("classifyPr reads closing keywords", () => {
  const result = classifyPr({ body: "Closes #12\nfixes #13 and Resolved #14. See #15.", files: [], labels: [] });
  assert.deepEqual(result.closes, [12, 13, 14]);
  assert.equal(result.phasePr, true);
});

test("classifyPr reads colon, cross-repo and URL closing references", () => {
  const body = "Closes: #1\nFixes acme/widgets#2\nresolved https://github.com/acme/widgets/issues/3\nCloses: acme/widgets#4";
  assert.deepEqual(classifyPr({ body, files: [], labels: [] }).closes, [1, 2, 3, 4]);
});

test("classifyPr non-phase", () => {
  assert.equal(classifyPr({ body: "See #3", files: ["README.md"], labels: [] }).phasePr, false);
});

test("classifyPr override", () => {
  assert.equal(classifyPr({ body: "Closes #1", files: [], labels: ["gate-override"] }).override, true);
});

test("slugify and nextSkill", () => {
  assert.equal(slugify("  Booking Reminders: v2! "), "booking-reminders-v2");
  assert.throws(() => slugify("!!!"), /slug/);
  assert.equal(nextSkill("dev-plan"), "feature-dev");
  assert.equal(nextSkill("po"), "feature-po");
});
