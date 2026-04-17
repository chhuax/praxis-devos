## ADDED Requirements

### Requirement: Praxis SHALL separate OpenSpec upstream workflow source from Praxis overlay source

The system SHALL maintain the OpenSpec default 4-flow workflow skills as an upstream source distinct from Praxis-managed overlay content, and SHALL generate projected workflow skills by combining those two sources rather than treating the final projected text as the only source of truth.

#### Scenario: Upstream snapshot and overlay are stored separately
- **WHEN** the repository defines managed workflow skills for OpenSpec integration
- **THEN** it stores the OpenSpec upstream 4-skill source separately from Praxis overlay content
- **AND** it does not require maintainers to edit only the final projected skill text to preserve both concerns

#### Scenario: Projection composes final skills from two inputs
- **WHEN** Praxis projects a managed OpenSpec workflow skill
- **THEN** it first reads the upstream source for that skill
- **AND** then applies the corresponding Praxis overlay
- **AND** writes the resulting composed skill as the projected output

### Requirement: Praxis SHALL limit managed OpenSpec workflow projection to the default 4-flow set

The system SHALL treat the default 4-flow workflow set as the managed OpenSpec projection surface for the current product mode, and SHALL NOT automatically expand managed projection to additional workflow nodes merely because upstream OpenSpec supports them.

#### Scenario: Managed projection includes only the default 4 workflow skills
- **WHEN** Praxis prepares OpenSpec workflow skills for projection
- **THEN** the managed set includes only `explore`, `propose`, `apply`, and `archive`
- **AND** it excludes expanded workflow nodes such as `new`, `continue`, `ff`, `verify`, `sync`, `bulk-archive`, and `onboard`

#### Scenario: Expanded upstream support does not change default Praxis projection
- **WHEN** the upstream OpenSpec package exposes additional workflow templates beyond the default 4-flow set
- **THEN** Praxis does not automatically project those additional workflows in its default managed mode
- **AND** the default projected workflow surface remains aligned to the 4-flow product contract

### Requirement: Projected workflow skills SHALL expose enough source version metadata for upgrade decisions

The system SHALL preserve enough metadata in the projected output to determine whether a projected workflow skill is stale relative to the current upstream source or Praxis overlay.

#### Scenario: Projected skill records upstream version identity
- **WHEN** Praxis projects a managed OpenSpec workflow skill
- **THEN** the projected output includes the upstream skill identity
- **AND** includes the upstream `metadata.version`
- **AND** includes the upstream `generatedBy` value or an equivalent upstream version marker

#### Scenario: Projected skill records Praxis overlay identity
- **WHEN** Praxis projects a managed OpenSpec workflow skill
- **THEN** the projected output includes a Praxis-managed overlay version marker or equivalent projection marker
- **AND** that marker is sufficient for `sync` or `doctor` to decide whether the projected skill must be regenerated

### Requirement: Commands and prompts SHALL remain outside the first-phase managed projection scope

The system SHALL allow the first-phase OpenSpec upstream projection change to standardize workflow skills without requiring immediate unification of host-specific commands or prompts.

#### Scenario: Skill projection can proceed without command projection changes
- **WHEN** Praxis enables managed OpenSpec upstream projection for the default 4-flow set
- **THEN** it may update workflow skill projection independently of host-specific commands or prompts
- **AND** missing command unification does not block the first-phase skill projection rollout

### Requirement: Projection refactors SHALL preserve the current docs task injection contract

The system SHALL preserve previously supported docs-aware workflow behavior while refactoring OpenSpec upstream projection, so that the managed 4-flow surface does not regress from "docs tasks are injected and executed" to "docs intent is recorded but never turned into tasks".

#### Scenario: Propose restores change-level docs task injection from project policy
- **WHEN** project policy in `openspec/config.yaml` indicates that change-level docs tasks should be created
- **THEN** `opsx-propose` records the relevant docs intent in current change artifacts
- **AND** injects the corresponding docs tasks into `tasks.md`
- **AND** this includes restoring `blackbox-test.md` task injection as the minimum supported default

#### Scenario: Propose restores API change docs task injection when API impact is detected
- **WHEN** project policy allows change-level docs tasks
- **AND** the current change artifacts or implementation context indicate API surface changes
- **THEN** `opsx-propose` injects an `api-doc.md` task into `tasks.md`
- **AND** records the corresponding API-related docs intent in current change artifacts
- **AND** the resulting apply flow can route that task through `devos-change-docs`

#### Scenario: API docs are not required when no API impact exists
- **WHEN** project policy allows change-level docs tasks
- **AND** the current change does not alter request/response contracts, externally observable API behavior, or stable API surfaces
- **THEN** `opsx-propose` still restores `blackbox-test.md` as the default docs task
- **BUT** it does not require an `api-doc.md` task for that change

#### Scenario: API docs include compatibility warnings when API changes are risky
- **WHEN** a change introduces breaking API behavior, compatibility risk, migration-sensitive changes, or caller-visible contract changes
- **THEN** the generated `api-doc.md` includes an explicit compatibility or warning section
- **AND** that warning is preserved or reflected by later stable API sync when applicable

#### Scenario: Apply still executes docs tasks through devos-change-docs
- **WHEN** `tasks.md` contains change-level docs tasks such as `blackbox-test.md` or `api-doc.md`
- **THEN** `opsx-apply` treats those tasks as normal pending work under the current change
- **AND** invokes `devos-change-docs` for the declared targets rather than silently skipping docs generation
