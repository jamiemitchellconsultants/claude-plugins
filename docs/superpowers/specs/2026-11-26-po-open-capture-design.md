# Product owner open capture: an "any more thoughts?" loop before directed questions

## Intent

Today feature-po's first step asks directed questions until the problem, the users and the outcomes are clear. Directed questions close the vision capture too early: once the PO is answering "who are the users?", the half-formed thoughts that fit no question never get said.

This change lets the PO talk freely first, keeps what they said, and only then fills the gaps with directed questions.

## Guiding principles (James)

- **Low friction.** Guidance only. Nothing blocks.
- **Readable documents.** Additions are prose conventions, not forms.

## Goals, non-goals and anti-goals

- Goal: the PO says everything they want to say before anything is categorised or questioned.
- Goal: reviewers can see what the PO said beside what the vision distilled from it, so they can check that nothing was lost.
- Goal: reaches every target repo on its next `init-repo` run, because the kit is overwritten on every run.
- Non-goal: any new or changed exit criterion in `EXIT_CRITERIA`.
- Non-goal: any new frontmatter key, artefact file or change to `FULL_ARTEFACTS` or `ARTEFACT_PHASE`.
- Anti-goal: the loop steering the PO. If the agent summarises, sorts or follows up during the loop, it has recreated the problem.

## Approaches considered (where the raw thoughts live)

- **A. Conversation only.** No tooling change, but the raw thoughts are lost once the vision is written, and reviewers cannot compare them with the vision.
- **B. A section in `01-vision.md`** (and in the PO section of lite mode's `feature.md`). **Chosen (James).** No tooling change, and reviewers see both side by side.
- **C. A separate `00-raw-thoughts.md`.** Cleaner separation, but it touches the artefact list, the phase mapping, the frontmatter rules and their tests for little gain.

## Design

All changes are to `skills/init-repo/assets/lifecycle/skills/feature-po/SKILL.md`.

### Work step 1 becomes two steps

1. **Open capture.** Ask the user to describe the idea in their own words, however they like. After each contribution, acknowledge it in one line and ask only "Any more thoughts?". Do not summarise, sort, question or follow up during the loop. Keep going until the user says they are done. Anything they said when invoking the skill counts as the first contribution.
2. **Fill the gaps.** Check what was captured against Problem, Users, Outcomes and measures, and Scope. Ask directed questions, one at a time, only about what is still missing or unclear.

Research and generation follow as today (renumbered).

### The vision gains a section

`01-vision.md` gains a final section, **In the PO's own words**: the open-capture contributions, in the order given, lightly tidied (typos fixed, fragments joined) but not categorised, reworded or trimmed. Nothing is dropped, including thoughts that did not make it into the structured sections.

- It goes last, so the five-minute read of the structured sections is not padded.
- Regenerating the vision from steering or review comments never rewrites this section. If the PO adds more thoughts later (in steering, review or amendment mode), they are appended.
- Good output gains a bullet: the PO's own words, as captured.

## Left to the builder

- Exact wording of the skill text, matching the existing skill's voice.
- A test in `skills/init-repo/tests/persona-skills.test.mjs` asserting that feature-po's Work section has the open-capture loop and names the "In the PO's own words" section, written first as the repo's TDD practice requires.

## Calls made (Claude)

- One-line acknowledgement during the loop, so the PO knows they were heard without being steered.
- The section is placed last and is append-only.
- No new exit criterion, following the low-friction principle and the analyst-depth precedent.
