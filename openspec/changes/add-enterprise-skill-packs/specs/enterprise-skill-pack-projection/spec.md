## ADDED Requirements

### Requirement: Praxis SHALL load configured enterprise packs from local paths or git URLs

Praxis MUST allow a project to declare external enterprise packs in `package.json["praxis-devos"].skillPacks`, then resolve those packs into additional resource bundle sources during projection.

#### Scenario: Project config declares a flat skills pack
- **WHEN** `package.json["praxis-devos"].skillPacks` contains a local path or git URL whose root has `skills/<name>/SKILL.md`
- **THEN** Praxis treats every valid `skills/<name>/` directory as an external skill source
- **AND** those sources join the same projection set as built-in Praxis skills

#### Scenario: Project config declares a flat commands pack
- **WHEN** `package.json["praxis-devos"].skillPacks` contains a local path or git URL whose root has `commands/<name>.md`
- **THEN** Praxis treats every valid `commands/<name>.md` file as an external command source
- **AND** those sources join the same projection set as built-in Praxis commands

#### Scenario: Project config declares a git-backed pack
- **WHEN** `package.json["praxis-devos"].skillPacks` contains a git URL for a supported enterprise pack
- **THEN** Praxis clones that pack into a Praxis-managed user cache before reading skills
- **AND** repeated projection refreshes update the cached checkout before projecting

#### Scenario: Project config declares a common-plus-stacks resource pack
- **WHEN** a configured pack contains `common/<resource>/...` and `stacks/<stack>/<resource>/...`
- **AND** the config entry selects one or more stacks
- **THEN** Praxis loads all `common/<resource>/*` bundles for each supported resource type
- **AND** loads only the selected `stacks/<stack>/<resource>/*` bundles for each supported resource type

#### Scenario: CLI install command installs a local path or git URL pack without mutating project config
- **WHEN** the user runs `praxis-devos install-pack <path-or-git-url>`
- **THEN** Praxis immediately triggers the normal user-level resource projection flow for the selected pack
- **AND** it does not need to mutate project config files to complete the install

#### Scenario: Reinstalling a pack prunes resources removed from that pack
- **WHEN** the user runs `praxis-devos install-pack <path-or-git-url>` for a pack that was previously installed
- **AND** the current pack version no longer contains a previously projected supported resource
- **THEN** Praxis removes that stale resource from the selected agents
- **AND** the prune operation is scoped to that pack's managed owner record
- **AND** resources from other packs, built-in Praxis resources, and unrelated user-owned assets remain untouched

#### Scenario: CLI install command requires explicit stack selection for common-plus-stacks packs
- **WHEN** the user runs `praxis-devos install-pack <path-or-git-url>` for a pack that exposes `common/<resource> + stacks/*/<resource>`
- **AND** no `--stack` argument is provided
- **THEN** the command fails with a deterministic error asking for at least one `--stack`
- **AND** it does not leave behind a partial install state

#### Scenario: Pack layout is invalid
- **WHEN** a configured skill pack path does not exist or does not expose a supported skills layout
- **THEN** projection setup fails with a deterministic error
- **AND** read-only health checks report the configuration as invalid instead of silently ignoring it

### Requirement: Praxis SHALL project enterprise pack resources through the existing managed projection pipeline

Praxis MUST project external enterprise packs through the same marker injection, managed-assets registration, and stale cleanup pipeline used for built-in resources, while keeping each resource projector independent.

#### Scenario: External skill bundle projects like a native Praxis skill
- **WHEN** Praxis projects a configured external pack that contains skills
- **THEN** each resolved skill bundle is copied into the agent-native skill directory
- **AND** the projected `SKILL.md` receives a Praxis projection marker
- **AND** the managed-assets registry records the projected asset as Praxis-managed

#### Scenario: External command bundle projects like a native Praxis command
- **WHEN** Praxis projects a configured external pack that contains commands
- **THEN** each resolved command bundle is copied into the agent-native command directory for that agent
- **AND** the managed-assets registry records the projected asset as Praxis-managed

#### Scenario: Removing a configured external resource removes stale projections
- **WHEN** a project removes an external pack or deselects one of its stacks
- **AND** the user runs `update` or `setup`
- **THEN** Praxis removes the previously managed projections for each affected resource type that are no longer part of the valid source set
- **AND** unrelated user-owned assets remain untouched

#### Scenario: Projection health includes configured enterprise skills
- **WHEN** `doctor` or projection health evaluates an agent for a project with configured external skill packs
- **THEN** the expected skill set includes those external skill names
- **AND** a fully projected machine is reported as healthy only when both built-in and configured external skills are present

### Requirement: Praxis SHALL treat enterprise packs as extensible resource content sources

Praxis MUST only consume resource directories claimed by registered resource projectors, and MUST reject ambiguous names within the same resource type.

#### Scenario: Unregistered resource directories are ignored
- **WHEN** a configured enterprise pack also contains `rules/`, `hooks/`, `src/`, or installer code and no corresponding resource projector is registered
- **THEN** Praxis ignores those directories for projection
- **AND** it does not attempt to map them into current agent-native surfaces

#### Scenario: Duplicate resource names are rejected per resource type
- **WHEN** two external bundles of the same resource type share the same name
- **OR** an external bundle name conflicts with a built-in Praxis bundle of the same resource type
- **THEN** Praxis rejects the projection with a deterministic duplicate-name error
- **AND** the error identifies the conflicting sources
