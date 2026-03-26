# Verification Baseline

Every change needs explicit verification before completion.

Minimum expectation by change type:

- docs or copy only: run the smallest relevant check, or record why no automated check exists
- local logic change: run focused tests that exercise the changed behavior
- interface, schema, dependency, or build changes: run focused tests plus at least one integration or smoke path touching the changed surface
- risky refactors or bug fixes without strong test coverage: add a manual reproduction or regression check and report the result

Delivery rules:

- Prefer the highest-signal command that is practical for the scope instead of defaulting to the entire suite.
- Record the exact verification command and whether it passed, failed, or could not run.
- If verification is skipped or incomplete, say so explicitly with the residual risk.
- If the work belongs to an OpenSpec change, run `npx praxis-devos openspec validate <change-id> --strict --no-interactive` before calling the change ready.
