# Architect baseline: deployment questions derived from the behaviours

## Intent

James works as an architect. When he writes a vision he puts the deployment in it (front end and back end, dev, home lab and live environments, OIDC sign-in, Terraform), so the architect phase has few open infrastructure questions. Someone without architecture skills cannot do that. They do not know these are decisions at all, so nothing gets specified, and feature-architect quietly makes defaults nobody looked at. The developer's walking skeleton ("the CI/CD pipeline and the infrastructure baseline") and the user's runbook then inherit those unexamined defaults.

This change carries James's judgement to people who do not have it:
- a per-repo **architecture baseline** holds the house deployment standard;
- feature-architect starts from it, works out its deployment questions from the behaviours and quality attributes, and asks only where the feature leaves the baseline, in the user's terms rather than technical ones.

## Guiding principles (James)

- **Low friction.** Guidance only. Nothing blocks.
- **Readable documents.** Additions are prose conventions, not forms.

## Goals, non-goals and anti-goals

- Goal: a user with no architecture skills gets a deployment that matches the house standard without having to know its vocabulary.
- Goal: every infrastructure need a behaviour or quality attribute implies is either covered by the baseline, asked about or recorded as the architect's call.
- Goal: a reviewer can see where a feature departs from the baseline, and why.
- Goal: each repo can adjust its baseline (for example to target Azure, or to drop the home lab).
- Non-goal: any new or changed exit criterion in `EXIT_CRITERIA`. "deployment and runtime are described" stays as it is.
- Non-goal: any new frontmatter key, artefact file or change to `FULL_ARTEFACTS` or `ARTEFACT_PHASE`. The baseline is a repo document, not a feature artefact.
- Non-goal: changes to feature-dev, feature-user or feature-analyze. They read `03-architecture.md` as today.
- Non-goal: a baseline for stack `none`.
- Anti-goal: technical questions put to a non-architect ("OIDC or SAML?"). That recreates the problem.
- Anti-goal: the architect phase turning into a long infrastructure questionnaire.

## Decisions (James)

- **A house baseline**, not first-principles derivation every time (approach A below).
- **It lives in a per-repo file**, `docs/architecture-baseline.md`, written by init-repo only when missing (approach B below).
- The baseline's content is James's standard, as described in Design › The baseline's content.
- When the vision states deployment detail, the vision wins, and each departure from the baseline gets an ADR. *(Proposed by Claude, accepted by James.)*
- Quality attributes, as well as behaviours, prompt deployment questions. *(Proposed by Claude, accepted by James.)*
- Identity providers: Entra and Keycloak are preferred, and the architect may specify another.
- Scaling: propose AWS Lambda for the service layer when the usage pattern supports it.
- Mobile apps, when required: a .NET MAUI app, not MAUI Blazor Hybrid ("too many compromises").
- The rest of the baseline's gap-filling content (AWS hosting, home lab, logging, CI/CD, secrets, backups) was proposed by Claude, and James left it unchanged while correcting the three lines above.

## Approaches considered

**Baseline or not:**
- **A. A house baseline the architect proposes by default.** **Chosen.** Non-architects inherit James's judgement, and the questions shrink to genuine exceptions.
- **B. No baseline; derive everything from first principles.** Rejected: more questions, and a non-architect answers more of them. It remains the fallback when a repo has no baseline file.

**Where the baseline lives:**
- **A. Inside the feature-architect skill.** Rejected: the kit is overwritten on every run, so a repo cannot adjust it, and stack `none` repos would get a .NET baseline.
- **B. A per-repo `docs/architecture-baseline.md`, written only when missing.** **Chosen.** The repo owns its opinion, reviewers can read it, and it follows the kit's existing split: the method (in the skill) is overwritten on every run, and what a repo adjusts is written once. Cost: later improvements to the house baseline do not reach repos that already have the file.
- **C. A house default in the kit plus an optional per-repo override.** Rejected: two sources and a precedence rule, which is the stale-copy problem `AGENTS.md` warns about.

## Design

### Seeding the baseline (init-repo)

- Add `skills/init-repo/assets/files/docs/architecture-baseline.md.dotnet`. The existing `.dotnet` handling in `init-files.mjs` writes it as `docs/architecture-baseline.md` only for stack `dotnet`, and only when missing (reported `created` or `kept`). No script change is needed.
- `--skills-only` runs do not seed it, as they seed nothing outside the kit. An existing repo gets it on its next full run, which is non-destructive.
- It is rendered like the other files, so it may use `{{PROJECT_NAME}}`.
- List it in `skills/init-repo/SKILL.md`'s table of what is written, and in the README.
- Add `ArchitectureBaseline` to `docs/ontology.ttl` (distinct from the existing `Baseline`, which is the repo baseline init-repo applies), and regenerate `docs/ontology.md`.

### The baseline's content (James's standard)

The file opens with one paragraph: it is the house deployment standard feature-architect starts from; the repo may edit it; a feature that departs from it records an ADR. It has three sections.

**Fixed**, which the architect proposes without asking:
- a Blazor WebAssembly standalone app, mobile first, hosted on AWS from S3 behind CloudFront;
- a clean-architecture service layer, on AWS in a container on ECS Fargate by default (see Scaling);
- PostgreSQL persistence, on AWS in RDS for PostgreSQL with automated backups, their retention set by any data-retention quality attribute;
- OIDC sign-in behind dependency injection, so the identity provider can be swapped. Entra and Keycloak are preferred; Keycloak runs in a container in local dev and the home lab. The architect may specify another provider where the users' accounts call for it;
- environments: local dev on Docker (always), the home lab (optional, see Variable), and production on AWS, scripted with Terraform;
- CI/CD on GitHub Actions: Terraform plan on pull requests, apply on merge;
- secrets: .NET user-secrets or an `.env` file locally, AWS Secrets Manager in production;
- scaling: when the behaviours or quality attributes give a usage pattern that suits it (for example low or bursty traffic), propose AWS Lambda for the service layer; otherwise one small Fargate service, with redundancy added only when an availability quality attribute calls for it.

**Per-environment adapters.** Every external dependency sits behind an interface, with one implementation for local dev and the home lab and another for AWS. A table of concern → local dev and home lab → AWS, seeded with:
- object storage: MinIO → S3;
- logging (trace, info, warning, exception), through Serilog: a file → CloudWatch Logs, with the destination set by configuration;
- identity provider: Keycloak in a container → Entra or Keycloak, as the users' accounts decide.

The rule, stated in the file, applies to any new dependency a behaviour brings in, not only the rows listed.

**Variable**, each with the plain-language question that decides it and what each answer produces:
- the home lab: "Does anyone outside your own network need to try this before it goes live?" Yes: a home lab environment, Docker Compose on a home server behind a reverse proxy with TLS, reachable from the internet. No: local dev and production only.
- mobile apps: asked when the vision or behaviours mention phones, offline use or app-store distribution. "Do people need to install this from an app store, use phone features such as the camera or notifications, or use it without a connection?" Yes: a .NET MAUI app (not MAUI Blazor Hybrid) calling the same service layer, alongside the web app. No: the mobile-first web app only.
- system integrations: each one gets a local and AWS adapter pair proposed, and a question only when no pair fits.

### Deployment questions (feature-architect)

Work step 1 also reads `docs/architecture-baseline.md` when it exists, the `03-architecture.md` (or Architect section) of earlier features, and the accepted ADRs in `docs/adr/`.

A new Work step, before the existing "work out the shape" step:

1. **Start from the baseline, then what already exists.** What is already built, as earlier features' architecture and accepted ADRs record it, wins over the baseline, and a departure an accepted ADR already records is not recorded again. When the same departure appears in a second feature, suggest that the user updates `docs/architecture-baseline.md` instead of carrying it forward. Where this feature's vision states deployment detail, follow the vision.
   A **departure** is the vision, an answer or a call that overrides a Fixed or Per-environment adapters line. Choosing an option the baseline allows (a Variable answer, another identity provider, Lambda or Fargate) is not a departure. Each departure gets an ADR.
2. **Scan for infrastructure triggers.** Read every behaviour and quality attribute, and list what each implies under these headings:
   - who signs in, and with what accounts;
   - stored files or documents;
   - outgoing messages (email, text, push);
   - scheduled or background work;
   - external systems and integrations;
   - phones, offline use or app-store distribution;
   - who must reach it, and from where, before and after go-live;
   - quality attributes: load and response time (scaling), availability (redundancy), data retention and recovery (backups), and security and privacy (secrets, encryption, where data is kept).
3. **Cover, ask or decide.** For each trigger:
   - when the baseline covers it, propose the baseline's answer with a one-line plain explanation of what it means for the user;
   - when the baseline marks it variable, or does not cover it, it is a candidate question.

   Ask about at most five candidates, the ones that would change the deployment most, one at a time. Phrase each in the user's terms (who, where, how many, how long, what happens if it is down), never in technology names, and give a recommended answer they can accept as it stands. Translate the answer into the technical choice yourself. Decide the rest, and record each as the architect's call so the user can overturn it while reviewing.
4. **No baseline.** When the file does not exist, run the same scan and the same question rules from first principles.

The existing step 2 ("Work out the shape...") then covers components, interactions, data stores and external systems as today, and no longer lists deployment.

### What the architecture records

- The Deployment and runtime section of `03-architecture.md` (or the Architect section of `feature.md` in lite mode) gains:
  - an environments table (environment → where and how it runs → who can reach it);
  - an adapters table (concern → local dev and home lab → AWS, or whatever the baseline names), listing every dependency the feature uses;
  - the architect's calls, each with its one-line plain explanation.
- Each departure from the baseline gets an ADR, in the existing ADR format, and its Context section starts by saying which baseline line it departs from.
- `### Good output` gains: every infrastructure need the behaviours and quality attributes imply is covered by the baseline, answered, or recorded as the architect's call; and every departure from the baseline has an ADR.
- `### Cares about` gains: starting from the repo's architecture baseline, and asking in the user's terms.

## Constraints

- Kit skill text: no backticked PascalCase and no hand-edit instruction (existing tests); the persona heading order checked by `lifecycle-skills.test.mjs` is unchanged.
- The seeded file must pass the target repo's ontology term check: no backticked PascalCase in it.
- Ontology protocol (`AGENTS.md`): define `ArchitectureBaseline` in `docs/ontology.ttl` before using it, regenerate `docs/ontology.md`, and commit both.
- TDD: tests first, in `skills/init-repo/tests/`.

## Calls made (Claude), from the builder check

- Home lab: local dev always runs, the home lab is optional and internet-reachable when used, and production is AWS. The home lab question's "yes" turns the home lab on.
- What already exists wins over the baseline, accepted departures are not re-recorded, and a repeated departure prompts a suggestion to update the baseline file.
- A departure is only an override of a Fixed or adapter line. Allowed options are not departures.
- Reading "suggest Lambda if the usage pattern is available" as: propose Lambda when the behaviours or quality attributes give a usage pattern that suits it, otherwise Fargate.
- The mobile apps question's wording.

## Left to the builder

- The exact wording of the skill text and the seeded file, in the existing kit's voice.
- Which test file the new tests go in, following the existing pattern (`init-files.test.mjs` for seeding, `persona-skills.test.mjs` or a new file for the architect).
- Whether the plain-language line for each call sits in the tables or in a list under them.
