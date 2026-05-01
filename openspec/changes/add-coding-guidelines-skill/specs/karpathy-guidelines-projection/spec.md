## ADDED Requirements

### Requirement: Bundled coding guidelines skill

Praxis DevOS SHALL ship a bundled `karpathy-guidelines` skill resource that preserves the official `karpathy-guidelines` skill content for implementation, bug fixing, refactoring, and review-preparation tasks.

#### Scenario: Bundled source is discoverable

- **WHEN** Praxis collects bundled skill sources
- **THEN** the collected sources include `karpathy-guidelines`

#### Scenario: Official guidance is preserved

- **WHEN** the `karpathy-guidelines` skill content is inspected
- **THEN** it contains the official `karpathy-guidelines` metadata and sections for thinking before coding, simplicity, surgical changes, and goal-driven execution

### Requirement: Coding guidelines projection

Praxis DevOS SHALL project the bundled `karpathy-guidelines` skill through the existing agent projection mechanism without requiring new CLI options, external dependencies, or package installation steps.

#### Scenario: Codex projection writes the skill

- **WHEN** `projectNativeSkills()` runs for the `codex` agent
- **THEN** `~/.codex/skills/karpathy-guidelines/SKILL.md` exists and contains a Praxis projection marker

#### Scenario: Update flow remains unchanged

- **WHEN** users run `setup` or `update`
- **THEN** the coding guidelines skill is refreshed as part of normal bundled skill projection

### Requirement: Managed block remains flow-focused

Praxis DevOS SHALL keep project-root managed guidance focused on OpenSpec flow selection and stage gates.

#### Scenario: Managed block stays compact

- **WHEN** the managed project entry is rendered
- **THEN** it summarizes routing and contracts without expanding into a long form guide

#### Scenario: No full checklist in managed block

- **WHEN** the managed project entry is rendered
- **THEN** it does not inline the full coding guidelines checklist

#### Scenario: Managed block activates coding guidelines

- **WHEN** the managed project entry is rendered
- **THEN** it instructs agents to load and follow `karpathy-guidelines` for implementation, bug fix, refactor, and review-preparation tasks

#### Scenario: Agents without skill invocation still receive the constraint

- **WHEN** the managed project entry is rendered
- **THEN** it tells agents without explicit skill invocation to apply the coding guidelines inline
