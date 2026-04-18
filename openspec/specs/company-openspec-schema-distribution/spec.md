## ADDED Requirements

### Requirement: Praxis SHALL distribute the company OpenSpec workflow as a user-level schema
Praxis MUST treat the company OpenSpec workflow as a custom schema installed into the OpenSpec user-level schema surface, rather than as a rewritten copy of upstream workflow skills with Praxis-specific renaming.

#### Scenario: Bundled schema source stays outside project-local OpenSpec schema directories
- **WHEN** Praxis stores the canonical source for the company schema `spec-super`
- **THEN** that source lives at `assets/openspec/schemas/spec-super/` inside Praxis-managed bundled assets rather than in the repository's `openspec/schemas/` project-local schema directory
- **AND** the installed user-level schema is generated from that bundled source

#### Scenario: Distributed schema does not inherit the current project-local artifact order by accident
- **WHEN** Praxis builds the distributed `spec-super` schema bundle
- **THEN** it treats the current project-local `openspec/schemas/spec-super/schema.yaml` as the official fork baseline rather than as an arbitrary local leftover
- **AND** the distributed schema explicitly records whether it preserves or customizes that baseline artifact and dependency graph for the intended company workflow

#### Scenario: Distributed schema promotes blackbox output into a formal artifact
- **WHEN** Praxis customizes the distributed `spec-super` schema for the company workflow
- **THEN** it adds a formal `blackbox-test` artifact that generates `blackbox-test.md`
- **AND** that artifact requires completed `specs` and `design`
- **AND** `tasks` remains a sibling artifact that depends only on `specs` and `design`
- **AND** blackbox coverage is part of the declared workflow output rather than a later injected docs task

#### Scenario: Schema distribution includes same-stage overlay guidance
- **WHEN** Praxis builds or refreshes the distributed `spec-super` schema bundle
- **THEN** it includes the matching stage-local guidance from `assets/overlays/openspec/skills/`
- **AND** each stage in the distributed schema carries the corresponding Praxis overlay content as part of the schema-delivered workflow contract

#### Scenario: Setup installs the company schema into the user-level schema surface
- **WHEN** a user runs Praxis setup or bootstrap for a project that depends on the company workflow
- **THEN** Praxis installs or refreshes the company schema in the OpenSpec-supported user-level schema location
- **AND** the target path resolves to `$XDG_DATA_HOME/openspec/schemas/spec-super/schema.yaml`
- **AND** if `XDG_DATA_HOME` is unset, the fallback path is `~/.local/share/openspec/schemas/spec-super/schema.yaml` on macOS/Linux and `%LOCALAPPDATA%/openspec/schemas/spec-super/schema.yaml` on Windows
- **AND** the installed schema remains discoverable to OpenSpec without copying the schema into each project repository

#### Scenario: Sync refreshes the distributed company schema
- **WHEN** the bundled company schema changes in Praxis and the user runs `sync`
- **THEN** Praxis refreshes the user-level installed schema for the current user
- **AND** the refreshed schema becomes the authoritative workflow source for newly initialized or repaired projects

### Requirement: Praxis SHALL bind projects to the company schema through OpenSpec configuration
Praxis MUST configure initialized projects to use the company schema through `openspec/config.yaml`, so that OpenSpec workflow resolution comes from schema selection rather than Praxis-managed workflow skill text.

#### Scenario: Init writes the company schema into project config
- **WHEN** Praxis initializes or repairs a project that opts into the company workflow
- **THEN** it writes `schema: spec-super` into `openspec/config.yaml`
- **AND** the project can resolve the company workflow through normal OpenSpec schema precedence

#### Scenario: Explicit higher-precedence schema selections still win
- **WHEN** a user or change explicitly selects another schema through CLI flags or change-local metadata
- **THEN** Praxis does not silently overwrite that higher-precedence selection at execution time
- **AND** diagnostics can still explain that the project default points to the company schema

### Requirement: Praxis SHALL configure the OpenSpec user profile for the company workflow
Praxis MUST update the user's OpenSpec configuration during installation so that the OpenSpec user profile is `custom` and the enabled workflow set is explicitly aligned to the company workflow surface.

#### Scenario: Init writes the required OpenSpec user profile and workflows
- **WHEN** Praxis runs the initialization or setup flow for a machine that should use the company OpenSpec workflow
- **THEN** it updates the user's OpenSpec config file at `~/.config/openspec/config.json`
- **AND** it sets `"profile": "custom"`
- **AND** it sets `"workflows"` to `["propose", "explore", "new", "continue", "apply", "ff", "archive"]`

#### Scenario: Existing OpenSpec user config is repaired to the company profile
- **WHEN** the user already has an OpenSpec config file but its `profile` or `workflows` do not match the company requirements
- **THEN** Praxis rewrites the relevant fields to the required values
- **AND** unrelated user config fields such as telemetry metadata are preserved

### Requirement: Praxis SHALL adopt OpenSpec-generated workflow assets into agent user directories
Praxis MUST treat the workflow skills and commands generated by `openspec init` under the project as the upstream source for OpenSpec workflow assets, then install those generated results into agent-native user-level skill and command directories instead of projecting Praxis-owned copies of OpenSpec workflow text.

#### Scenario: Init-generated workflow assets are promoted into user-level discovery directories
- **WHEN** Praxis initializes a project and OpenSpec generates workflow skills and commands for the selected tooling surface
- **THEN** Praxis copies or moves those generated workflow results into the corresponding agent-native user-level discovery directories
- **AND** the user-level installed assets preserve the OpenSpec-generated content while still applying Praxis overlay and compatibility projection where required
- **AND** the canonical workflow skill identity remains the OpenSpec official skill name rather than a Praxis-specific alias
- **AND** agent-specific command surfaces are respected, including nested Claude command paths, flat OpenCode command files, GitHub prompt to shared command-surface adaptation for Copilot, and Codex prompts that OpenSpec already writes directly to `~/.codex/prompts/`

#### Scenario: Project-local workflow copies are removed after adoption
- **WHEN** Praxis successfully adopts OpenSpec-generated workflow assets into the target user-level discovery directories
- **THEN** Praxis removes the redundant project-local workflow skill and command copies produced by initialization
- **AND** the project no longer depends on its own checked-in or generated OpenSpec workflow skill duplicates
- **AND** legacy Praxis-projected `opsx-*` assets are cleaned up according to the existing upgrade strategy

#### Scenario: Praxis keeps projecting only its own non-OpenSpec skills
- **WHEN** Praxis refreshes agent-native skill directories after the new model is enabled
- **THEN** Praxis still projects its own bundled skills such as `devos-docs` and `devos-change-docs`
- **AND** it does not regenerate OpenSpec workflow skill text from `assets/upstream/openspec/skills` or `assets/overlays/openspec/skills`

### Requirement: Praxis SHALL diagnose missing or stale company schema installations
Praxis MUST verify that the configured company schema is installed and compatible before claiming that a project is ready to use the company workflow.

#### Scenario: Doctor reports a missing schema installation
- **WHEN** a project's `openspec/config.yaml` points to the company schema but the schema cannot be resolved on the current machine
- **THEN** `doctor` reports the workflow as misconfigured
- **AND** the output tells the user to install or refresh the user-level schema before relying on the project workflow

#### Scenario: Doctor reports an outdated schema installation
- **WHEN** the installed company schema version is older than the version bundled by Praxis
- **THEN** `doctor` reports that the local workflow source is stale
- **AND** `sync` or an equivalent repair path can refresh the user-level schema

### Requirement: Praxis SHALL preserve the current docs-aware workflow contract while shrinking workflow skill projection
Praxis MUST preserve docs task policy, artifact language policy, and `devos-change-docs` routing semantics even when OpenSpec workflow ownership moves from Praxis-managed `opsx-*` skill projection to the company schema.

#### Scenario: Company schema keeps docs-aware propose and apply behavior
- **WHEN** a project enables docs task policy and uses the company schema
- **THEN** proposal and apply flows still honor `openspec/config.yaml` language and docs task settings
- **AND** docs work continues to route through the existing Praxis docs skills and task contracts

#### Scenario: Blackbox documentation is produced by schema instead of task injection
- **WHEN** a project uses the company schema workflow
- **THEN** `blackbox-test.md` is generated through the schema-defined `blackbox-test` artifact
- **AND** `opsx-propose` does not need to inject a separate `blackbox-test.md` generation task into `tasks.md`
- **AND** downstream apply or archive behavior treats `blackbox-test.md` as a first-class workflow artifact

#### Scenario: API documentation remains conditional
- **WHEN** a change does not imply API surface changes
- **THEN** the company schema does not force a formal API-doc artifact solely because `blackbox-test.md` became formal
- **AND** API docs continue to be routed conditionally through the existing Praxis docs contract when the change semantics require them

#### Scenario: Legacy workflow projections are no longer the primary workflow source
- **WHEN** Praxis migrates a project to the company schema model
- **THEN** OpenSpec workflow semantics come from the installed company schema, project config binding, and the OpenSpec-generated skills adopted into user-level agent directories
- **AND** any retained `opsx-*` projection behavior is limited to compatibility handling or host-specific wrappers, not the primary workflow definition

### Requirement: Praxis SHALL keep AGENTS.md workflow guidance independent of agent-specific command names
Praxis MUST express workflow gating in `AGENTS.md` using stage semantics rather than hard-coded command strings, so different agent command surfaces do not leak into the project-level contract.

#### Scenario: Managed AGENTS entry does not hard-code workflow commands
- **WHEN** Praxis writes or refreshes the managed `AGENTS.md` entry
- **THEN** the text describes when to enter proposal, apply, or archive stages without embedding agent-specific command syntax
- **AND** the same managed entry remains valid across Codex, Claude, OpenCode, and GitHub Copilot
