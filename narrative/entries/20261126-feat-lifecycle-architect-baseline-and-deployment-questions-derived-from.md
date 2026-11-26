---
date: 2026-11-26
slug: feat-lifecycle-architect-baseline-and-deployment-questions-derived-from
title: "feat(lifecycle): architect baseline and deployment questions derived from behaviours"
summary: "Carry the house standard to people who do not have it. A per-repo `docs/architecture-baseline.md`, seeded for stack dotnet and then owned by the repo, holds the standard."
kind: product
status: accepted
sequence: 2026-11-26T15:14:51.000Z
evidence: "https://github.com/jamiemitchellconsultants/claude-plugins/pull/19; merge commit 53348d487e41a47ed688a0acf0b5e6e752a66312"
---

## Context

The architect phase handled deployment as one item in a long list, asking only when a choice was "genuinely open". An architect writing the vision fills in the deployment up front, but someone without architecture skills does not know that a front-end and back-end split, dev, home lab and live environments, OIDC sign-in or Terraform are decisions at all. So nothing was specified, and the architect made defaults nobody examined. The developer's walking skeleton and the user's runbook then inherited those defaults.

## Decision

Carry the house standard to people who do not have it. A per-repo `docs/architecture-baseline.md`, seeded for stack dotnet and then owned by the repo, holds the standard. feature-architect starts from it and works out targeted, plain-language questions from the behaviours and quality attributes, asking only where a feature leaves the baseline. We rejected deriving every question from first principles each time, because it means more questions for the people least able to answer them. It remains the fallback when a repo has no baseline. We rejected putting the baseline inside the kit, because repos could not adjust it and stack none repos would get a .NET baseline. We rejected a kit default plus a per-repo override, because it creates two sources and a precedence rule. The change is guidance only, with no new exit criterion.

## Consequences

Every dotnet repo gets the baseline on its next full init-repo run, and every repo gets the new architect step on any run. Later improvements to the house baseline do not reach repos that already have the file, and `--skills-only` runs do not seed it. Features record departures from the baseline as ADRs, and a departure that recurs prompts an update to the baseline rather than another ADR. Still open: where Keycloak runs on AWS, how a shared service layer reconciles per-feature scaling choices, and whether feature-dev's walking skeleton should name the baseline explicitly.
