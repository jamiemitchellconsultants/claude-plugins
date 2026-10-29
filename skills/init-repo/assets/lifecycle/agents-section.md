## Feature lifecycle

Features in this repository follow the persona workflow: product owner, analyst, architect, developer (plan, then build) and user. Each role is a phase with its own artefact under `docs/features/<slug>/`, its own GitHub sub-issue and its own reviewed pull request. Start, check or resume a feature with the `feature` skill. Each role has its own `feature-<role>` skill.

- **The order of the phases is enforced.** Each persona skill checks the gate before doing any work, and the required `feature-gate` check fails a phase pull request whose earlier phases are not done.
- **The only bypass is the `gate-override` label** on the pull request, with the reason given in its Narrative sections. The admin override for merging is separate, and it does not open a gate.
- **Every handoff is a checkpoint.** The skill stops and suggests a break. Do not start the next phase in the same session without one.
- **Park side issues** with the `feature-park` skill rather than working on them.
- **Artefacts are generated.** Review feedback and pushback are applied by re-running the role's skill, never by changing files directly.
