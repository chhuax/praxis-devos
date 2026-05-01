## Praxis Routing

- OpenSpec explore/propose: medium/large changes, cross-module work, interface/compat/architecture/process changes, unclear requirements, open questions, competing options, or new capabilities/workflows. Examples: “帮我加一个 X”, “新增 Y 能力”, “implement feature X”, “add a release kit”.
- OpenSpec apply directly: only small, local, unambiguous fixes with no design or interface impact. Examples: “修一下这个 bug”, “改一下这段文案”, “update the version number”, “fix the failing test”.
- Review flow: review, audit, and analysis requests.

## Praxis Contract

- OpenSpec explore/propose/apply/archive is the only visible workflow layer; finish clarification and option comparison before implementation.
- SuperPowers may run only as an embedded capability inside the active OpenSpec stage; keep outputs under the current change, not `docs/superpowers/...`.
- Coding tasks (implementation / bug fix / refactor / review-preparation) must follow `karpathy-guidelines`; if skill invocation is unavailable, apply those rules inline.
