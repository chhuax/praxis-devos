---
name: release-kit
description: Maintainer-only release workflow skill for this repository.
---

# release-kit

This is a maintainer-only skill entry for the in-repo `release-kit/` boundary.

Use this skill only after the intended code is already merged to `main`.

## Modes

- verify / publish / release
- `verify`
- `publish`
- `release`

## Input collection rules

Before running any mode, collect and confirm:

- target version from `package.json`
- explicit release order confirmation
- whether the user wants the normal path or a compensation path

Default controlled order in v1:

1. `verify`
2. `publish`
3. `release`

Do not continue to `publish` or `release` if the release order is not explicitly confirmed.

## Mode responsibilities

### `verify`

Collect:

- target version
- current repository root / worktree context
- confirmation that the user wants to prepare the release candidate

Delegate deterministic execution to `release-kit/scripts/verify.mjs`.

### `publish`

Collect:

- target version
- confirmation that verified state already exists and is still valid
- confirmation that the approved order is `verify -> publish -> release`

Delegate deterministic execution to `release-kit/scripts/publish.mjs`.

### `release`

Collect:

- target version
- confirmation that publish/tag already completed, or that the user wants the compensation path
- confirmation that GitHub Release creation is intended now

Delegate deterministic execution to `release-kit/scripts/release.mjs`.

## Responsibilities

- Collect the target version and release-order confirmation
- Keep the execution flow constrained to the approved release workflow
- Delegate all deterministic execution to repo scripts under `release-kit/scripts/`
- Route normal and compensation paths without embedding release logic here

## Constraints

- Supports Node/npm + git + GitHub only in v1
- Not part of the projection system
- Must not implement high-risk release commands directly in this file
- Must not replace explicit user confirmation for release order
- Must not perform `npm`, `git`, or `gh` release mutations directly from the skill body
