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
