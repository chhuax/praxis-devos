# ECC Integration

This is the user-facing runtime flow for Praxis projects that depend on ECC.

## Standard Flow

1. Run setup as usual.

```bash
npx praxis-devos setup --agent codex --stack java-spring
```

2. Check whether ECC is already bound.

- If ECC is already available on `PATH`, or bound through `PRAXIS_ECC_RUNTIME`, `ECC_RUNTIME_DIR`, `ECC_HOME`, or `.praxis/ecc-binding.json`, Praxis will detect it automatically during `setup`, `init`, or `use-foundation`.
- If ECC is still unbound, bind it explicitly:

```bash
npx praxis-devos bind --ecc-runtime /path/to/ecc-runtime
```

3. Refresh generated adapter artifacts after binding or runtime changes.

```bash
npx praxis-devos sync
```

4. Verify the result.

```bash
npx praxis-devos doctor --strict
npx praxis-devos status
```

The remediation order is fixed:

1. bind ECC
2. sync if artifacts need refresh
3. verify with `doctor` or `status`

## Generated Adapter Artifacts

When the built-in ECC runtime baseline is active, Praxis generates:

- `.praxis/adapters/ecc-commands/commands.json`
- `.praxis/adapters/ecc-commands/bin/ecc` when ECC is bound
- `.praxis/adapters/ecc-hooks/hooks/runtime-bound.json` when ECC is bound
- `.praxis/adapters/ecc-hooks/hooks/wiring-example.json` when ECC is bound

These files are generated project artifacts. Re-run `bind` or `sync` if the runtime path changes.

## ECC Commands Adapter

`.praxis/adapters/ecc-commands/commands.json` is the minimal command contract for ECC-bound projects.

It exposes:

- `bind-runtime`: `npx praxis-devos bind --ecc-runtime <path>`
- `refresh-adapters`: `npx praxis-devos sync`
- `verify-runtime`: `npx praxis-devos doctor --strict`
- `status`: `npx praxis-devos status`
- `runtime-cli`: `.praxis/adapters/ecc-commands/bin/ecc` when ECC is bound

Use `runtime-cli` when you need a project-local ECC CLI entrypoint that tracks Praxis binding state.

## ECC Hooks Adapter

`.praxis/adapters/ecc-hooks/hooks/runtime-bound.json` exposes the declared hook slots:

- `pre-task-environment`
- `post-change-audit`
- `session-evidence`

`.praxis/adapters/ecc-hooks/hooks/wiring-example.json` shows one minimal way to attach those slots to project workflow nodes. It is a wiring example, not an automatic runtime installer.

## When Users Need Internal Commands

Most users should start with:

- `setup`
- `bind` when ECC is not already detected
- `sync`
- `doctor`

`init` and `use-foundation` remain valid, but they are advanced or repair-oriented commands rather than the normal onboarding path.
