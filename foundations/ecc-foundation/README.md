# ECC Foundation

`ecc-foundation` is the first built-in runtime foundation for Praxis DevOS.

It assumes an ECC-style internal AI engineering distro becomes the runtime base later, while keeping this repository free of proprietary integrations today.

This foundation currently wires together:

- profile: `internal-base`
- overlays: `ecc-runtime-base`, `internal-extension-points`
- OpenSpec mode: optional governance
- ECC binding contract: detect `PRAXIS_ECC_RUNTIME`, `ECC_RUNTIME_DIR`, `ECC_HOME`, or `ecc` on `PATH`
