# Foundation And Overlay Direction

## Goal

This milestone introduces a built-in runtime foundation layer inside Praxis DevOS so teams can treat an ECC-style internal AI engineering distro as the base operating model without requiring any private integrations yet.

The slice is intentionally small:

- foundations are built into this repository
- profiles and overlays are scaffolded into `.praxis/`
- OpenSpec stays available for governance
- daily workflows can start from the runtime foundation and stack instead of entering OpenSpec first

## Repository Layout

```text
foundations/
  ecc-foundation/
    foundation.json
profiles/
  internal-base/
    README.md
    runtime-base.md
    workflow.md
overlays/
  ecc-runtime-base/
    docs/runtime-contract.md
  internal-extension-points/
    commands/
    hooks/
    rules/
    docs/
    mcp/
    skills/
```

## Runtime Model

`ecc-foundation` is the first built-in foundation.

It declares:

- runtime base: `ecc`
- profile: `internal-base`
- overlays: `ecc-runtime-base`, `internal-extension-points`
- OpenSpec mode: `optional-governance`

When applied, Praxis scaffolds these assets into the target project:

- `.praxis/foundation/README.md`
- `.praxis/foundation/profile/`
- `.praxis/foundation/manifest.json`
- `.praxis/overlays/<overlay>/`

The profile becomes the editable local baseline. Overlays remain the seams for add-on capabilities that may arrive later.

## Why This Is Separate From Stacks

Stacks remain language/framework specific. They answer questions like:

- what toolchain is used
- what coding standards apply for that stack
- which domain skills should be seeded

Foundations answer different questions:

- what runtime operating model the AI engineering environment assumes
- where future internal extensions will attach
- whether governance is default or optional in daily execution

This separation lets Praxis support an internal distro direction without coupling it to Java, Node, Python, or any one stack.

## OpenSpec Positioning

OpenSpec is still kept in the repository and in the CLI.

In this direction, OpenSpec is positioned as:

- the governance path for controlled changes
- the proposal/spec validation path when teams want that rigor
- an optional layer for daily work, rather than the universal front door

That means the runtime foundation should be the first context for implementation, while OpenSpec remains available when the task explicitly needs governance artifacts.

## Future Extension Seams

The first milestone does not ship any proprietary capability. It only reserves clean attachment points for:

- internal MCP
- internal docs
- internal commands
- internal hooks
- internal rules
- internal skills

Those seams live in `overlays/internal-extension-points/` today and are scaffolded into `.praxis/overlays/internal-extension-points/` when the foundation is applied.

## CLI Surface

Stage 1 keeps the public path intentionally simple:

- `npx praxis-devos setup` and `npx praxis-devos init` automatically apply the built-in `ecc-foundation`
- `npx praxis-devos status` reports the selected foundation, profile, overlays, and ECC binding state after scaffolding

Advanced or secondary commands still exist for inspection and recovery:

- `npx praxis-devos list-foundations`
- `npx praxis-devos use-foundation ecc-foundation`

That keeps the internal foundation architecture available without making users choose a foundation during the default onboarding flow.

## Stage 2 First Slice

The next step is no longer only about scaffolding preset names.

Praxis now starts to treat ECC as a real dependency surface by:

- recording ECC dependency metadata in `.praxis/manifest.json`
- detecting ECC runtime presence from `PRAXIS_ECC_RUNTIME`, `ECC_RUNTIME_DIR`, `ECC_HOME`, or `ecc` on `PATH`
- surfacing ECC binding state in `use-foundation`, `status`, and `doctor`

This is still intentionally small, but it changes ECC from a pure placeholder into an explicit runtime binding contract.
