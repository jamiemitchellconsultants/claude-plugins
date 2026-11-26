# 01 — Architect baseline (Tasks 1–2)

[← Overview](00-overview.md) · [Ontology](../../ontology.md)

This increment delivers the whole feature: init-repo seeds `docs/architecture-baseline.md` for stack dotnet, and feature-architect starts from it, works out its deployment questions from the behaviours and quality attributes, and asks them in the user's terms. It depends on nothing outside the existing `Baseline` and `LifecycleKit`. When it is done, the next full `init-repo` run seeds the baseline, and every run installs the new architect step.

### Task 1: seed the architecture baseline

**Files:**
- Create: `skills/init-repo/assets/files/docs/architecture-baseline.md.dotnet`
- Test: `skills/init-repo/tests/init-files.test.mjs`
- Modify: `docs/ontology.ttl` (the `Baseline` comment), then regenerate `docs/ontology.md`
- Modify: `README.md` (the piece table)
- Modify: `skills/init-repo/SKILL.md` (the piece table)

**Interfaces:**

```yaml
# Consumes: init-files.mjs — a file under assets/files/ ending .dotnet is rendered ({{PROJECT_NAME}} etc.),
#   written without the suffix only for --stack dotnet, and only when missing (report: "created  <path>"
#   or "kept     <path>"). --dry-run reports without writing.
# Produces, for Task 2: a target-repo file docs/architecture-baseline.md with exactly these sections:
sections: ["## Fixed", "## Per-environment adapters", "## Variable"]
```

- [ ] **Step 1: Write the failing tests**

In `skills/init-repo/tests/init-files.test.mjs`, add after the `KIT` constant:

```js
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
```

Append at the end of the file:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/init-repo/tests/init-files.test.mjs`
Expected: `baseline is seeded for stack dotnet`, `an existing baseline is kept` and the three content tests FAIL (the content tests with ENOENT on the asset). `baseline is not seeded for stack none` passes already: it is a guard against the asset losing its `.dotnet` suffix. Every existing test passes.

- [ ] **Step 3: Create the baseline asset**

Create `skills/init-repo/assets/files/docs/architecture-baseline.md.dotnet` with exactly:

```markdown
# {{PROJECT_NAME}} architecture baseline

This is the house deployment standard that the feature-architect skill starts from. It proposes everything under Fixed and Per-environment adapters without asking, and asks a question under Variable only when a feature's behaviours or quality attributes point at it. This repository owns this file: change it when the standard changes here, for example to target Azure or to drop the home lab. A feature that departs from it records an ADR in `docs/adr/` that names the line it departs from.

## Fixed

- **Front end:** a Blazor WebAssembly standalone app, mobile first. On AWS it is hosted from S3 behind CloudFront.
- **Service layer:** clean architecture. On AWS it runs in a container on ECS Fargate, unless Scaling says otherwise.
- **Persistence:** PostgreSQL. On AWS, RDS for PostgreSQL with automated backups, kept for as long as the feature's data-retention quality attribute needs.
- **Sign-in:** OIDC, behind dependency injection so the identity provider can be swapped. Entra and Keycloak are preferred. Another provider may be specified where the users' accounts call for it.
- **Environments:** local dev on Docker, always; the home lab, when Variable says so; production on AWS, scripted with Terraform.
- **CI/CD:** GitHub Actions. Terraform plan runs on pull requests and apply runs on merge.
- **Secrets:** .NET user-secrets or an `.env` file locally; AWS Secrets Manager in production.
- **Scaling:** when the behaviours or quality attributes describe a usage pattern that suits it, such as low or bursty traffic, propose AWS Lambda for the service layer. Otherwise run one small Fargate service, and add redundancy only when an availability quality attribute calls for it.

## Per-environment adapters

Every external dependency sits behind an interface, with one implementation for local dev and the home lab and another for AWS. Apply the same rule to any new dependency a feature brings in, and add its row here once it becomes part of the standard.

| Concern | Local dev and home lab | AWS |
| --- | --- | --- |
| Object storage | MinIO | S3 |
| Logging (trace, info, warning, exception), through Serilog | a file | CloudWatch Logs, chosen by configuration |
| Identity provider | Keycloak in a container | Entra or Keycloak, as the users' accounts decide |

## Variable

- **Home lab.** Ask: "Does anyone outside your own network need to try this before it goes live?" Yes: a home lab environment, Docker Compose on a home server behind a reverse proxy with TLS, reachable from the internet. No: local dev and production only.
- **Mobile apps.** Ask when the vision or behaviours mention phones, offline use or app-store distribution: "Do people need to install this from an app store, use phone features such as notifications, or use it without a connection?" Yes: a .NET MAUI app (not MAUI Blazor Hybrid) calling the same service layer, alongside the web app. No: the mobile-first web app only.
- **System integrations.** For each external system a behaviour touches, propose a local and an AWS adapter pair. Ask only when no pair fits.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test skills/init-repo/tests/init-files.test.mjs`
Expected: PASS, 0 failures.

- [ ] **Step 5: Update the ontology and the docs**

- In `docs/ontology.ttl`, in the `:Baseline` comment, after ``the .NET build workflow (for `Stack` dotnet only), `` insert ``the `ArchitectureBaseline` (for `Stack` dotnet only), ``. Run `node scripts/build-ontology.mjs`.
- In `README.md`'s piece table, after the `.NET build workflow` row, add:

  ```markdown
  | Architecture baseline | .NET only. `docs/architecture-baseline.md`, the house deployment standard that `feature-architect` starts from. Written once; after that the repo owns it. |
  ```

- In `skills/init-repo/SKILL.md`'s piece table, after the `dotnet-build.yml` row, add:

  ```markdown
  | `docs/architecture-baseline.md` (.NET only) | The house deployment standard (Blazor WebAssembly, PostgreSQL, OIDC, Docker locally, AWS with Terraform) that `feature-architect` starts from, so a user without architecture skills is asked only where a feature leaves it. Written only when missing; after that the repo owns it. |
  ```

- [ ] **Step 6: Run every test and the ontology checks**

Run: `node --test skills/init-repo/tests/*.test.mjs && node scripts/build-ontology.mjs --check`
Expected: 0 failures, then `docs/ontology.md is up to date`.

Run: `git add skills/init-repo/assets/files/docs/architecture-baseline.md.dotnet skills/init-repo/tests/init-files.test.mjs docs/ontology.ttl docs/ontology.md README.md skills/init-repo/SKILL.md && git diff --cached --name-only && node scripts/check-ontology-terms.mjs`
Expected: exactly those six files, then `ontology term check: OK`.

- [ ] **Step 7: Commit and push**

```
git add -A
git commit -m "feat(init-repo): seed a per-repo architecture baseline for stack dotnet"
git push
```

### Task 2: the architect's deployment questions

**Files:**
- Modify: `skills/init-repo/assets/lifecycle/skills/feature-architect/SKILL.md` (`### Cares about`, `### Good output`, `## Work`)
- Test: `skills/init-repo/tests/architect-baseline.test.mjs`
- Modify: `README.md` (the `feature-architect` row of the skill table)

**Interfaces:**

```yaml
# Consumes: Task 1's docs/architecture-baseline.md and its section names Fixed, Per-environment adapters, Variable
#   (the skill refers to them by name; it does not read Task 1's asset).
# Consumes: tests/helpers/skill-text.mjs readSkill(name) -> string, section(text, heading) -> string
# Produces: nothing later tasks use. The feature-architect headings and their order are unchanged.
```

- [ ] **Step 1: Write the failing tests**

Create `skills/init-repo/tests/architect-baseline.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readSkill, section } from "./helpers/skill-text.mjs";

const text = readSkill("feature-architect");
const work = section(text, "## Work");
const has = (haystack, needles) => {
  for (const needle of needles) assert.ok(haystack.includes(needle), needle);
};

test("architect reads the baseline and what is built", () => {
  has(work, ["docs/architecture-baseline.md", "the architecture of earlier features", "the accepted ADRs in `docs/adr/`"]);
});

test("architect settles deployment before the rest of the shape", () => {
  const settle = work.indexOf("2. Settle the deployment");
  const shape = work.indexOf("3. Work out the rest of the shape");
  assert.ok(settle >= 0, "a Settle the deployment step");
  assert.ok(shape > settle, "the shape step follows it");
  assert.doesNotMatch(work.slice(shape).split("\n")[0], /deployment/);
});

test("architect lets what is built win over the baseline", () => {
  has(work, [
    "wins over the baseline",
    "is not recorded again",
    "suggest that the user updates `docs/architecture-baseline.md`",
    "follow the vision",
  ]);
});

test("architect defines a departure", () => {
  has(work, ["A departure is", "is not a departure", "Each departure gets an ADR"]);
});

test("architect scans every trigger heading", () => {
  has(work, [
    "who signs in, and with what accounts",
    "stored files or documents",
    "outgoing messages",
    "scheduled or background work",
    "external systems and integrations",
    "app-store distribution",
    "who must reach it",
    "data retention and recovery",
  ]);
});

test("architect asks in the user's terms, at most five", () => {
  has(work, ["at most five", "one question at a time", "never in technology names", "recommended answer", "the architect's call"]);
});

test("architect falls back to first principles", () => {
  has(work, ["does not exist", "from first principles"]);
});

test("architect records environments, adapters and calls", () => {
  has(work, ["an environments table", "an adapters table", "one-line plain explanation"]);
});

test("architect's departure ADR names the baseline line", () => {
  has(work, ["naming the baseline line it departs from"]);
});

test("architect's role brief names the baseline", () => {
  assert.match(section(text, "### Cares about"), /architecture baseline/);
  assert.match(section(text, "### Good output"), /every departure from the baseline has an ADR/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/init-repo/tests/architect-baseline.test.mjs`
Expected: all ten FAIL, each on its first missing phrase.

- [ ] **Step 3: Change the role brief**

- Under `### Cares about`, after `- How the feature is deployed and run.`, add:

  ```markdown
  - Starting from the repo's architecture baseline, and asking about deployment in the user's terms, never in technology names.
  ```

- Under `### Good output`, append this sentence to the paragraph:

  ```markdown
  Every infrastructure need the behaviours and quality attributes imply is covered by the baseline, answered by the user, or recorded as the architect's call, and every departure from the baseline has an ADR.
  ```

- [ ] **Step 4: Replace Work steps 1 and 2**

Replace steps 1 and 2 under `## Work` with:

```markdown
1. Read `01-vision.md`, `02-behaviours.md` and the latest handoff. Also read `docs/architecture-baseline.md` when it exists, the architecture of earlier features (their `03-architecture.md`, or the Architect section of their `feature.md` in lite mode), and the accepted ADRs in `docs/adr/`.
2. Settle the deployment, starting from the baseline.
   - What is already built, as the architecture of earlier features and the accepted ADRs record it, wins over the baseline, and a departure that an accepted ADR already records is not recorded again. When this feature repeats a departure an earlier feature made, suggest that the user updates `docs/architecture-baseline.md` instead of carrying it forward. Where the vision states deployment detail, follow the vision.
   - A departure is the vision, an answer or your own call overriding a line under Fixed or Per-environment adapters in the baseline. Choosing an option the baseline allows, such as a Variable answer, another identity provider, or Lambda rather than Fargate, is not a departure. Each departure gets an ADR.
   - Scan every behaviour and quality attribute, and list what each implies about infrastructure under these headings:
     - who signs in, and with what accounts;
     - stored files or documents;
     - outgoing messages (email, text, push);
     - scheduled or background work;
     - external systems and integrations;
     - phones, offline use or app-store distribution;
     - who must reach it, and from where, before and after go-live;
     - quality attributes: load and response time (scaling), availability (redundancy), data retention and recovery (backups), and security and privacy (secrets, encryption, where data is kept).
   - Where the baseline covers a need, propose its answer with a one-line plain explanation of what it means for the user. Where the baseline marks it Variable, or does not cover it, it is a candidate question. Ask about at most five candidates, the ones that would change the deployment most, one question at a time. Phrase each in the user's terms (who, where, how many, how long, what happens if it is down), never in technology names, and give a recommended answer they can accept as it stands. Translate the answer into the technical choice yourself. Decide the rest, and record each one as the architect's call, so the user can overturn it while reviewing.
   - When `docs/architecture-baseline.md` does not exist, run the same scan and the same question rules from first principles.
3. Work out the rest of the shape with the user: the components, how they interact, the data stores and the external systems. Where a choice is genuinely open, ask one question at a time. Otherwise, propose a sensible default and say that it is your call.
```

Renumber the remaining steps 3, 4 and 5 to 4, 5 and 6.

- [ ] **Step 5: Change the generate and ADR steps**

- In the generate step (now 4), replace `   - Deployment and runtime;` with:

  ```markdown
     - Deployment and runtime: an environments table (environment, where and how it runs, who can reach it); an adapters table (each concern, then its implementation in each environment the baseline names) listing every external dependency the feature uses; and the architect's calls, each with its one-line plain explanation;
  ```

- At the end of the ADR step (now 5), append:

  ```markdown
  An ADR for a departure from the baseline starts its Context by naming the baseline line it departs from.
  ```

- [ ] **Step 6: Change the README row**

In `README.md`, replace the `feature-architect` row with:

```markdown
| `feature-architect` | Act as architect: start from the repo's architecture baseline, ask deployment questions drawn from the behaviours, define components and structure, and record architecture decisions. |
```

- [ ] **Step 7: Run every test to verify they pass**

Run: `node --test skills/init-repo/tests/*.test.mjs`
Expected: PASS, 0 failures.

- [ ] **Step 8: Check the ontology terms**

Run: `git add skills/init-repo/assets/lifecycle/skills/feature-architect/SKILL.md skills/init-repo/tests/architect-baseline.test.mjs README.md && git diff --cached --name-only && node scripts/check-ontology-terms.mjs`
Expected: exactly those three files, then `ontology term check: OK`.

- [ ] **Step 9: Commit and push**

```
git add -A
git commit -m "feat(lifecycle): architect derives deployment questions from the baseline and behaviours"
git push
```
