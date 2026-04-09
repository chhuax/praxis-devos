## ADDED Requirements

### Requirement: Bundled skills SHALL be organized as directory bundles under `assets/skills`

The system SHALL treat each bundled skill as a directory bundle rooted at `assets/skills/<skill-name>/`.

#### Scenario: Bundled skill discovery enumerates skill directories
- **WHEN** the repository discovers bundled skills
- **THEN** it enumerates directories under `assets/skills/`
- **AND** each directory name becomes the bundled skill name
- **AND** each discovered skill directory must contain `SKILL.md`

#### Scenario: Skill discovery is no longer split by source group
- **WHEN** bundled skills are discovered
- **THEN** the system does not require separate `openspec-skills` and `devos-skills` groups
- **AND** all bundled skills are discovered from the same `assets/skills/` root

### Requirement: Skill projection SHALL copy the full skill bundle

The system SHALL project the entire skill bundle directory, not only the `SKILL.md` file.

#### Scenario: Projection copies supporting files with the skill
- **WHEN** a bundled skill contains supporting files or subdirectories alongside `SKILL.md`
- **THEN** projection copies those files into the target host skill directory
- **AND** the projected skill remains usable as a full bundle

#### Scenario: Sync restores missing bundled files
- **WHEN** a Praxis-managed projected skill directory is missing supporting files that still exist in the bundled source
- **THEN** sync restores those missing files
- **AND** the target skill remains a complete bundle

### Requirement: Bundled commands SHALL be organized as shared markdown assets under `assets/commands`

The system SHALL store shared host command source files in `assets/commands/*.md`.

#### Scenario: Shared command assets use a single source file
- **WHEN** `devos-docs-init` and `devos-docs-refresh` command assets are bundled
- **THEN** each command has a single markdown source file under `assets/commands/`
- **AND** the system does not require separate source copies for Claude and OpenCode

#### Scenario: Host-specific command projection uses shared source
- **WHEN** Claude or OpenCode command assets are projected
- **THEN** both hosts read from the same bundled command source file
- **AND** host-specific behavior differs only by target directory, not by source asset duplication

### Requirement: Bundled asset reorganization SHALL preserve public names and target paths

The system SHALL preserve the existing external names and host target paths while reorganizing bundled assets.

#### Scenario: OpenSpec skill names remain unchanged
- **WHEN** bundled assets are reorganized
- **THEN** the skill names `opsx-propose`, `opsx-explore`, `opsx-apply`, and `opsx-archive` remain unchanged
- **AND** they continue to project to the same host skill target locations as before

#### Scenario: Docs skill and command names remain unchanged
- **WHEN** bundled assets are reorganized
- **THEN** the skill name `devos-docs` remains unchanged
- **AND** the command names `devos-docs-init` and `devos-docs-refresh` remain unchanged

### Requirement: Stale cleanup and managed asset tracking SHALL remain compatible with bundled layout

The system SHALL continue to support cleanup and manifest tracking after the bundled layout is reorganized.

#### Scenario: Stale skill cleanup still works by skill name
- **WHEN** a bundled skill is no longer part of the valid bundled asset set
- **THEN** stale cleanup removes the corresponding projected skill directory by skill name

#### Scenario: Managed asset tracking still records projected outputs
- **WHEN** a bundled skill or command is projected
- **THEN** managed asset tracking records the projected output path
- **AND** bundled asset reorganization does not require changing the tracked host target paths
