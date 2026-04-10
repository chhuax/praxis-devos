## ADDED Requirements

### Requirement: Codemap generation SHALL prioritize AI task routing over generic onboarding

The system SHALL generate codemap artifacts that help an implementation agent quickly determine system shape, likely edit locations, and high-risk paths instead of defaulting to thin file-navigation summaries.

#### Scenario: Project overview carries system-level routing context
- **WHEN** `devos-docs` generates `docs/codemaps/project-overview.md`
- **THEN** the artifact includes the project purpose, primary external surface, major subsystem map, and implementation-routing guidance
- **AND** it includes the most decision-relevant architecture, runtime flow, and constraint context supported by repository evidence

#### Scenario: Module map carries ownership and inspection guidance
- **WHEN** `devos-docs` generates `docs/codemaps/module-map.md`
- **THEN** the artifact helps an AI decide which module owns a change, what dependencies matter, and where to inspect first
- **AND** it does not degrade into a module name inventory with no routing value

#### Scenario: Module codemap carries edit hazards and local flows
- **WHEN** `devos-docs` generates `docs/codemaps/modules/<artifactId>.md`
- **THEN** the artifact includes entrypoints, key local flows, dependencies, and change hazards that affect edits inside that module
- **AND** it remains focused on task-relevant signal rather than repeating repository boilerplate

### Requirement: AI-first codemap guidance SHALL remain within the current docs contract

The system SHALL improve codemap density without widening the allowed writeback boundary beyond the current lightweight docs contract.

#### Scenario: Cross-cutting context is folded into existing codemap targets
- **WHEN** repository evidence would normally justify separate architecture, backend, or dependency summaries
- **THEN** `devos-docs` folds the most decision-relevant parts into the existing codemap artifacts
- **AND** it does not require new write targets outside `docs/surfaces.yaml` and `docs/codemaps/**`

#### Scenario: AI-first path is canonical for codemap quality
- **WHEN** codemap guidance is evaluated for quality expectations
- **THEN** the AI-first `devos-docs` skill path is treated as the canonical behavior
- **AND** compatibility or fallback paths do not set the quality bar for this capability
