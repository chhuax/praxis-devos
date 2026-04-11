# release-kit

`release-kit/` is the v1 maintainer-only release workflow boundary for this repository.

## Scope

- Supports Node/npm + git + GitHub release workflow only
- Stays in-repo as a maintainer-only tool in v1
- Is not part of the projection system and must not be added to `assets/skills/`

## Intended structure

- `skill/` for maintainer interaction protocol
- `scripts/` for deterministic release execution
- `test/` for release-kit focused tests
- `fixtures/` for release-kit test fixtures

## Usage

The v1 workflow is intentionally split into three explicit stages:

1. `verify`
2. `publish`
3. `release`

The maintainer skill is responsible for collecting:

- target version
- explicit release order confirmation
- whether a compensation path is needed

All deterministic execution is delegated to:

- `release-kit/scripts/lib.mjs`
- `release-kit/scripts/verify.mjs`
- `release-kit/scripts/publish.mjs`
- `release-kit/scripts/release.mjs`

## Worktree strategy

`release-kit` runs on a clean `main` aligned with `origin/main`.

- If already on clean synced `main`, it can use the current working tree
- Otherwise it creates a temporary worktree under `.worktrees/`
- Cleanup hooks try to remove the temporary worktree on exit
- If cleanup fails, the worktree path is reported for manual cleanup

## Non-goals

- Multi-ecosystem publishing
- Monorepo version orchestration
- Automatic historical release repair

## Notes

- v1 remains limited to Node/npm + git + GitHub Release
- the maintainer skill stays in-repo and is not part of the projection system
- completion of a release requires the GitHub Release step, not only npm publish or git tag
