import {
  EXIT_CRITERIA,
  PHASES,
  renderParentBody,
  renderSubIssueBody,
  tickItem,
} from "../../assets/lifecycle/scripts/feature-lib.mjs";

// A full-mode state for parent #1 with sub-issues #10..#15 in phase order. A closed phase has
// its checklist ticked unless overrides[id].ticked says otherwise.
export function fullState(closedIds, overrides = {}) {
  return {
    number: 1,
    slug: "demo",
    mode: "full",
    subIssues: PHASES.map((p, i) => {
      const o = overrides[p.id] ?? {};
      const closed = closedIds.includes(p.id);
      const body = renderSubIssueBody({ phaseId: p.id, parentNumber: 1 });
      return {
        phaseId: p.id,
        number: 10 + i,
        state: closed ? "closed" : "open",
        labels: o.labels ?? [p.label],
        body: (o.ticked ?? closed) ? body.replaceAll("- [ ]", "- [x]") : body,
      };
    }),
  };
}

// A lite-mode state for parent #1 with the named phases' sections fully ticked.
export function liteState(tickedIds) {
  let body = renderParentBody({ name: "Demo", slug: "demo", mode: "lite" });
  for (const p of PHASES.filter((q) => tickedIds.includes(q.id))) {
    for (const item of EXIT_CRITERIA[p.id].filter((c) => c.lite)) body = tickItem(body, item.text, p.title).body;
  }
  return { number: 1, slug: "demo", mode: "lite", body, labels: ["feature"] };
}
