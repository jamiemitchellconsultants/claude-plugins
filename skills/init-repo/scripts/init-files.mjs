#!/usr/bin/env node
// Applies the repository baseline to a local git repository: agent steering files, Project
// Narrative, the ontology kit, the AI fingerprint check and (optionally) the .NET build workflow.
// Non-destructive: an existing file is kept and reported, never overwritten.
//
// Usage:
//   node init-files.mjs --target <repo> --name <ProjectName> --description "<one line>" \
//        --owner <github-handle> [--stack dotnet|none] [--narrative <checkout>] \
//        [--ontology-kit <checkout>] [--dry-run]
//   node init-files.mjs --target <repo> --skills-only [--dry-run]
//
// The feature lifecycle kit (persona skills, scripts/feature*.mjs, the feature-gate workflow) is
// init-repo-owned: unlike the rest of the baseline it is overwritten on every run.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(SKILL_ROOT, "assets");

const VALUE_OPTIONS = ["target", "name", "description", "owner", "stack", "narrative", "ontology-kit"];
const args = { stack: "dotnet" };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--dry-run") args.dryRun = true;
  else if (arg === "--skills-only") args.skillsOnly = true;
  else if (arg.startsWith("--") && VALUE_OPTIONS.includes(arg.slice(2))) {
    const value = argv[++i];
    if (value === undefined || value.startsWith("--")) fail(`${arg} needs a value`);
    args[arg.slice(2)] = value;
  } else fail(`unknown option "${arg}"`);
}

function fail(message) {
  console.error(`init-repo: ${message}`);
  process.exit(1);
}

for (const required of args.skillsOnly ? ["target"] : ["target", "name", "description", "owner"]) {
  if (!args[required]) fail(`--${required} is required`);
}
if (!["dotnet", "none"].includes(args.stack)) fail('--stack must be "dotnet" or "none"');

const target = resolve(args.target);
if (!existsSync(join(target, ".git"))) fail(`${target} is not a git repository — run git init first`);

const dotnet = args.stack === "dotnet";
const values = { PROJECT_NAME: args.name, DESCRIPTION: args.description, OWNER: (args.owner ?? "").replace(/^@/, "") };

function render(text) {
  let out = text.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!(key in values)) fail(`no value for placeholder ${match}`);
    return values[key];
  });
  // <!-- if:dotnet --> ... <!-- endif --> blocks are kept for a .NET stack and dropped otherwise.
  out = out.replace(/<!-- if:dotnet -->\n([\s\S]*?)<!-- endif -->\n/g, (m, body) => (dotnet ? body : ""));
  return out.replace(/\n{3,}/g, "\n\n");
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function run(command, commandArgs, options = {}) {
  console.log(`  $ ${command} ${commandArgs.join(" ")}`);
  if (args.dryRun) return;
  execFileSync(command, commandArgs, { cwd: target, stdio: "inherit", ...options });
}

const report = [];
function writeIfMissing(dest, content) {
  const path = join(target, dest);
  if (existsSync(path)) {
    report.push(`kept     ${dest}`);
    return false;
  }
  if (!args.dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  report.push(`created  ${dest}`);
  return true;
}

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

const walkKit = (dir) => walk(dir).filter((file) => !relative(dir, file).split(sep).some((part) => part.startsWith(".")));

function installLifecycleKit() {
  console.log("\nFeature lifecycle kit");
  const skills = join(KIT, "skills");
  for (const file of walkKit(skills)) {
    for (const dir of SKILL_DIRS) writeKitFile(join(dir, relative(skills, file)), readFileSync(file));
  }
  const scripts = join(KIT, "scripts");
  for (const file of walkKit(scripts)) writeKitFile(join("scripts", relative(scripts, file)), readFileSync(file));
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

if (args.skillsOnly) {
  console.log(`init-repo: ${args.dryRun ? "planning" : "applying"} the feature lifecycle kit in ${target}`);
  installLifecycleKit();
  printSummary();
  printAgentsSectionIfMissing();
  process.exit(0);
}

console.log(`init-repo: ${args.dryRun ? "planning" : "applying"} baseline in ${target} (stack: ${args.stack})`);

// 1. Hand-written files. AGENTS.md goes first because the ontology installer splices its protocol
//    into whichever agent file already exists, and would otherwise create one containing only that.
writeIfMissing("AGENTS.md", render(readFileSync(join(ASSETS, "AGENTS.md.tmpl"), "utf8")));
const agentsPreexisting = report[0].startsWith("kept");

for (const file of walk(join(ASSETS, "files"))) {
  let dest = relative(join(ASSETS, "files"), file);
  if (dest.endsWith(".dotnet")) {
    if (!dotnet) continue;
    dest = dest.slice(0, -".dotnet".length);
  }
  writeIfMissing(dest, render(readFileSync(file, "utf8")));
}

// 2. Project Narrative.
console.log("\nProject Narrative");
const narrativeCheckout = resolve(args.narrative ?? process.env.NARRATIVE_REPO ?? join(homedir(), "RiderProjects", "Narrative"));
const narrativeCli = join(narrativeCheckout, "bin", "narrative.mjs");
const narrative = existsSync(narrativeCli)
  ? (sub) => run("node", [narrativeCli, sub])
  : (sub) => run("npx", ["--yes", "--package=github:jamiemitchellconsultants/Narrative", "narrative", sub]);
narrative("install");

const narrativeConfig = join(target, ".project-narrative.json");
if (!args.dryRun && existsSync(narrativeConfig)) {
  const config = JSON.parse(readFileSync(narrativeConfig, "utf8"));
  if (config.title === "Project Narrative") {
    config.title = `${args.name} — Project Narrative`;
    writeFileSync(narrativeConfig, `${JSON.stringify(config, null, 2)}\n`);
    narrative("compile");
  }
}
narrative("check");

// 3. The PR template the Narrative installer writes needs the fingerprint footer.
const template = join(target, ".github", "pull_request_template.md");
if (!args.dryRun && existsSync(template)) {
  const text = readFileSync(template, "utf8");
  if (text.includes("AI-Fingerprint:")) report.push("kept     .github/pull_request_template.md (footer already present)");
  else {
    writeFileSync(template, text.replace(/\n*$/, "\n") + readFileSync(join(ASSETS, "pr-template-footer.md"), "utf8"));
    report.push("updated  .github/pull_request_template.md (fingerprint footer)");
  }
}

// 4. Ontology kit.
console.log("\nOntology kit");
const kitCheckout = resolve(args["ontology-kit"] ?? process.env.ONTOLOGY_KIT_REPO ?? join(homedir(), "RiderProjects", "InternalOntology"));
const kitInstaller = join(kitCheckout, "bin", "install-ontology.mjs");
if (!existsSync(kitInstaller)) fail(`ontology kit not found at ${kitCheckout} — pass --ontology-kit <checkout>`);
run("node", [kitInstaller, "--target", target, "--project-name", args.name, "--default-branch", "main"]);
run("node", ["scripts/build-ontology.mjs"]);

installLifecycleKit();
printSummary();
if (agentsPreexisting) {
  console.log("\n  AGENTS.md already existed: it was kept, so merge the missing sections from");
  console.log(`  ${join(ASSETS, "AGENTS.md.tmpl")} by hand (the ontology protocol was spliced in).`);
}
console.log("\nNext: replace the placeholder Example* rows in docs/ontology.ttl, rebuild, then run the checks.");
