# docs-context-routing Specification

## Purpose
TBD - created by archiving change add-openspec-docs-context-routing. Update Purpose after archive.
## Requirements
### Requirement: Docs context pack SHALL define a stable default read set

The system SHALL provide a docs context pack contract that gives AI tasks a stable default read set for project docs artifacts.

#### Scenario: Default pack for a non-module-specific task
- **WHEN** the system builds a docs context pack for a project task without module-specific routing
- **THEN** the pack includes `docs/surfaces.yaml`
- **AND** the pack includes `docs/codemaps/project-overview.md`

#### Scenario: Default pack excludes unrelated docs families
- **WHEN** the system builds a docs context pack
- **THEN** it does not require `reference`, `guides`, or `runbooks`
- **AND** it only routes artifacts within `docs/surfaces.yaml` and `docs/codemaps/**`

### Requirement: Docs context routing SHALL be module-aware for multi-module projects

The system SHALL route additional codemap artifacts based on multi-module context without defaulting to a full-repository docs load.

#### Scenario: Multi-module pack includes module map
- **WHEN** the project is detected as a Maven multi-module project
- **THEN** the docs context pack includes `docs/codemaps/module-map.md`

#### Scenario: Targeted module routing includes only relevant module codemap
- **WHEN** the system can map the task or changed paths to a discovered module
- **THEN** the docs context pack includes `docs/codemaps/modules/<artifactId>.md` for that module
- **AND** it does not include unrelated module codemap files by default

#### Scenario: Unknown module routing falls back to shared docs only
- **WHEN** the project is multi-module but the system cannot determine a target module
- **THEN** the docs context pack includes `docs/surfaces.yaml`
- **AND** `docs/codemaps/project-overview.md`
- **AND** `docs/codemaps/module-map.md`
- **AND** it does not automatically include every `docs/codemaps/modules/<artifactId>.md`

### Requirement: Docs context pack SHALL expose deterministic routing metadata

The system SHALL expose deterministic metadata describing why each docs artifact was selected for the current pack.

#### Scenario: Routing metadata records selected artifacts
- **WHEN** a docs context pack is built
- **THEN** the result includes the selected artifact paths
- **AND** includes enough routing metadata to explain whether selection came from default routing, module routing, or change-aware routing

#### Scenario: Routing metadata remains within canonical docs scope
- **WHEN** a docs context pack is built
- **THEN** every routed artifact path is either `docs/surfaces.yaml` or under `docs/codemaps/`

### Requirement: Docs context pack SHALL remain compatible with existing docs validation boundaries

The system SHALL keep docs consumption aligned with existing canonical path and writeback boundaries.

#### Scenario: Pack references canonical surface path
- **WHEN** a docs context pack is produced
- **THEN** it references `docs/surfaces.yaml` as the canonical surface contract
- **AND** it does not treat `contracts/surfaces.yaml` as a valid canonical target

#### Scenario: Pack does not widen writeback scope
- **WHEN** a docs context pack is used by `devos-docs` or a host command wrapper
- **THEN** it does not change the existing docs allowed target set
- **AND** it does not imply write access outside `docs/surfaces.yaml` and `docs/codemaps/**`

