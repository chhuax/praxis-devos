# Runtime Contract

Praxis does not ship a private ECC implementation, but it now treats ECC as a real runtime dependency surface instead of a pure placeholder.

Current public binding contract:

- bind an ECC runtime root with `PRAXIS_ECC_RUNTIME`, `ECC_RUNTIME_DIR`, or `ECC_HOME`
- or expose an `ecc` executable on `PATH`
- `status` and `doctor` will report whether the current project is bound to an ECC runtime
- `.praxis/manifest.json` records ECC dependency metadata and the last detected binding snapshot

Expected future extension areas remain the same:

- runtime bootstrap expectations
- agent/session environment variables
- shared policy bundles
- adapter bootstrap hooks

This contract stays generic so the repository can move toward real ECC dependency wiring without exposing proprietary implementation details.
