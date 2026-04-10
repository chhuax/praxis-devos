## MODIFIED Requirements

### Requirement: Docs context routing SHALL be module-aware for multi-module projects

The system SHALL route additional codemap artifacts based on multi-module context without defaulting to a full-repository docs load, and SHALL keep module dossier artifacts as the preferred deep-dive path.

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

The system SHALL expose deterministic metadata describing why each docs artifact was selected for the current pack, including whether explicit docs-impact hints influenced selection.

#### Scenario: Routing metadata records selected artifacts
- **WHEN** a docs context pack is built
- **THEN** the result includes the selected artifact paths
- **AND** includes enough routing metadata to explain whether selection came from default routing, module routing, docs-impact hints, or change-aware routing

#### Scenario: Routing metadata remains within canonical docs scope
- **WHEN** a docs context pack is built
- **THEN** every routed artifact path is either `docs/surfaces.yaml` or under `docs/codemaps/`

## ADDED Requirements

### Requirement: Docs context routing SHALL consume explicit docs-impact hints without widening docs scope

The system SHALL allow OpenSpec-provided docs-impact hints to bias which existing codemap artifacts are loaded, while preserving the current lightweight docs boundary.

#### Scenario: Docs impact can bias module selection
- **WHEN** OpenSpec change artifacts declare target modules in `Docs Impact`
- **THEN** the docs context pack may use those module hints to prefer matching `docs/codemaps/modules/<artifactId>.md` artifacts
- **AND** it still avoids loading unrelated module codemap files by default

#### Scenario: Docs impact does not introduce new docs families
- **WHEN** docs-impact hints are present
- **THEN** they only affect routing among `docs/surfaces.yaml` and `docs/codemaps/**`
- **AND** they do not imply automatic loading of unrelated docs families
