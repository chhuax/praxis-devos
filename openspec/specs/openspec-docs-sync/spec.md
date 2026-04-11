## MODIFIED Requirements

### Requirement: OpenSpec workflows SHALL support docs context pack consumption

The system SHALL support consuming a docs context pack during OpenSpec-driven work so AI tasks use project docs intentionally instead of ad hoc scanning, and proposal artifacts may declare docs-impact hints that later stages consume.

#### Scenario: Propose flow can read docs context pack
- **WHEN** an OpenSpec proposal flow starts for a project that already has docs artifacts
- **THEN** the workflow may build a docs context pack
- **AND** that pack follows the same routing rules as normal task routing
- **AND** proposal flow does not require an immediate docs refresh

#### Scenario: Apply flow builds docs context before implementation
- **WHEN** an OpenSpec apply flow begins
- **THEN** the workflow can build a docs context pack for the active change
- **AND** the pack may include change-aware module routing when change metadata or changed paths make that possible
- **AND** the pack may prefer artifacts named by `Docs Impact` when that declaration exists

### Requirement: Docs refresh assessment SHALL use deterministic signals as advisory input

The system SHALL evaluate docs refresh need using deterministic signals rather than free-form model judgment. These signals inform routing but do not independently create obligations; `tasks.md` is the authoritative source for which docs work to execute.

#### Scenario: Surface change triggers refresh assessment
- **WHEN** changed paths or change metadata indicate the primary external surface or its source location has changed
- **THEN** docs refresh assessment reports that refresh is needed

#### Scenario: Module topology change triggers refresh assessment
- **WHEN** changed paths include Maven aggregation `pom.xml` files or other discovered module topology inputs
- **THEN** docs refresh assessment reports that refresh is needed

#### Scenario: Docs impact can trigger refresh assessment
- **WHEN** OpenSpec proposal or design artifacts explicitly indicate project-map, external-surface, module-structure, or codemap impact in `Docs Impact`
- **THEN** docs refresh assessment reports that refresh is needed

## ADDED Requirements

### Requirement: OpenSpec apply and archive SHALL treat tasks.md as the authoritative source for docs work

The system SHALL use `tasks.md` as the single authority for which docs tasks to execute. `Docs Impact` declarations serve as advisory routing context but do not independently create obligations or hard gates.

#### Scenario: Apply uses tasks.md to determine docs work
- **WHEN** `tasks.md` explicitly lists docs tasks (blackbox, api-doc, docs-refresh, etc.)
- **THEN** OpenSpec apply executes those tasks after the relevant implementation has stabilized
- **AND** `Docs Impact` may inform routing decisions but does not independently trigger docs work beyond what `tasks.md` declares

#### Scenario: Archive verifies only planned docs tasks
- **WHEN** `tasks.md` listed docs tasks for the active change
- **THEN** archive flow verifies those tasks were completed before archiving
- **AND** missing docs that were never planned in `tasks.md` do not block archive

### Requirement: OpenSpec artifact generation SHALL honor project-configured artifact language

The system SHALL treat OpenSpec artifact language as a project-level policy instead of a hard-coded skill default, using `openspec/config.yaml` as the primary configuration source when available.

#### Scenario: Configured artifact language is applied consistently
- **WHEN** `openspec/config.yaml` declares an artifact language policy for OpenSpec artifacts
- **THEN** proposal, design, tasks, and related spec artifacts generated for the same change use that configured language consistently
- **AND** code identifiers, commands, paths, and capability names may remain in their original form

#### Scenario: Missing language config falls back to the active change language
- **WHEN** no explicit artifact language policy is configured in `openspec/config.yaml`
- **AND** the active change already contains one or more OpenSpec artifacts
- **THEN** subsequent artifact generation uses the dominant language already present in that change
- **AND** the workflow does not switch languages mid-change without an explicit user request
