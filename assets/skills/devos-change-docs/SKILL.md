---
name: devos-change-docs
description: Generate change-local blackbox and API docs, or sync stable API reference docs, using task-driven inputs and a structured result with closed writeback boundaries.
license: MIT
compatibility: Designed for OpenSpec-linked change flows and project-level API reference sync.
metadata:
  author: praxis-devos
  version: "0.1"
---

Generate or sync change-oriented docs artifacts without allowing arbitrary repository writes.

Use this skill when a change needs:

- `openspec/changes/<change>/blackbox-test.md`
- `openspec/changes/<change>/api-doc.md`
- `docs/reference/api.md`

The caller owns final validation and writeback. This skill should return a structured result rather than directly editing repository files.

## Modes

- `mode=change-blackbox`
- `mode=change-api`
- `mode=project-api-sync`

## Input

The caller should provide:

- active `changeId` when the mode is change-scoped
- current change artifacts such as `proposal.md`, `design.md`, `tasks.md`, and relevant `specs/**`
- relevant implementation changes when request, response, compatibility, or error details need confirmation
- project artifact language policy when available
- existing `docs/reference/api.md` content for `mode=project-api-sync`

For `mode=change-api`, treat the current change artifacts as the primary source for scope. Use implementation changes to confirm and enrich details, not to silently redefine the change.

## Structured Result

Return a single object:

```json
{
  "schemaVersion": 1,
  "changeId": "add-auth",
  "mode": "change-api",
  "path": "openspec/changes/add-auth/api-doc.md",
  "content": "# ...",
  "sources": [
    "openspec/changes/add-auth/proposal.md",
    "openspec/changes/add-auth/design.md"
  ]
}
```

When the current change artifacts and implementation do not provide enough aligned evidence to produce a trustworthy result, return a clarification result instead:

```json
{
  "schemaVersion": 1,
  "changeId": "add-auth",
  "mode": "change-api",
  "status": "needs-clarification",
  "reason": "design.md does not clearly identify affected external APIs"
}
```

The caller validates this structured result before writeback.

## Allowed Write Targets

- `mode=change-blackbox`:
  - `openspec/changes/<change>/blackbox-test.md`
- `mode=change-api`:
  - `openspec/changes/<change>/api-doc.md`
- `mode=project-api-sync`:
  - `docs/reference/api.md`

No other repository paths are valid output targets for this skill.

## Required Content

### `mode=change-blackbox`

The document should cover:

- test objectives
- scope
- prerequisites
- request or operation constraints
- core blackbox scenarios
- pass criteria
- regression focus

### `mode=change-api`

The document should cover:

- API overview
- API description
- request parameters
- response parameters
- business rules
- error cases
- example calls
- implementation locations

Scope discipline:

- use the current change artifacts to identify which external APIs belong to this change
- use implementation changes to fill in request, response, error, and compatibility details
- if the artifacts and implementation clearly conflict, return `needs-clarification`
- do not treat existing `docs/reference/api.md` as the source of truth for deciding the current change scope

### `mode=project-api-sync`

The document should update the stable API reference and cover:

- API overview
- endpoint catalog
- request/response summary
- compatibility notes
- contracts and implementation locations

When updating an existing `docs/reference/api.md`, prefer a non-destructive managed section strategy:

- replace only the managed section
- preserve user-authored content outside the managed section
- remove deleted endpoints from the managed inventory when they are no longer part of the stable API
- leave compatibility notes when a removal is breaking or migration-sensitive

Managed section markers:

- `<!-- PRAXIS_API_REFERENCE_START -->`
- `<!-- PRAXIS_API_REFERENCE_END -->`

## Language Policy

Honor the current artifact language policy when it is provided.

The first implementation must support heading aliases for at least:

- `zh-CN`
- `en`

Keep code identifiers, commands, file paths, and capability names in their original form.

## Validation Expectations

The caller validates:

- `schemaVersion === 1`
- `mode` is one of the supported values
- `path` matches the mode-specific allowlist
- `content` is non-empty
- `changeId` matches the active change when supplied for change-scoped modes
- required headings are present using the artifact-language alias set
- `sources` is an array when present
- `status=needs-clarification` includes a non-empty `reason`

## Quality Bar

- write for humans reviewing a change, not for generic marketing copy
- stay tightly scoped to the current change or the stable API inventory
- prefer concrete request/response, rules, examples, and verification cues over vague summaries
- do not drift into codemap-style repository overviews; that remains the job of `devos-docs`
