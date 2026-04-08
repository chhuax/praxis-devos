# AGENTS.md

## Project Map

- `contracts/`: source of truth for public behavior and external contracts
- `docs/reference/`: generated or curated reference docs
- `docs/guides/`: onboarding, integration, and workflow guidance
- `docs/runbooks/`: troubleshooting and recovery procedures
- `docs/adr/`: architecture decision records
- `openspec/changes/`: active change artifacts and implementation context

## Commands

```bash
# test
<fill-test-command>

# lint
<fill-lint-command>

# run locally
<fill-run-command>

# docs check
<fill-docs-check-command>
```

## Development Rules

- Treat `contracts/` as the single source of truth for public behavior.
- Do not manually maintain `docs/reference/` if it is generated from contracts.
- When changing public API, config, permissions, errors, or CLI behavior, update the matching contract first.
- When behavior changes user workflows or onboarding steps, update `docs/guides/`.
- When incident handling or recovery changes, update `docs/runbooks/`.

## High-Risk Areas

- Authentication and authorization
- Data migration and destructive changes
- External API compatibility
- Background jobs and retries
- Production configuration changes

## Where To Look

- Public API: `contracts/openapi/public.yaml`
- Config contract: `contracts/config/app.schema.json`
- Error model: `contracts/errors/errors.yaml`
- Permission model: `contracts/permissions/permissions.yaml`
- CLI contract: `contracts/cli/cli.yaml`
- Change context: `openspec/changes/<change>/`

