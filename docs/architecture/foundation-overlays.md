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

This milestone adds a minimal, reviewable CLI surface:

- `npx praxis-devos list-foundations`
- `npx praxis-devos use-foundation ecc-foundation`
- `npx praxis-devos setup --foundation ecc-foundation`
- `npx praxis-devos status`

`status` reports the selected foundation, profile, and overlays so the result is easy to inspect after scaffolding.
