## 1. Review Contract

- [ ] 1.1 Define the normalized proposal review request payload, including active-workspace binding, `changeId`, and reviewer skill selection rules for an active change.
- [ ] 1.2 Define the review result artifact format, including reviewer metadata, disposition, findings, and timestamped storage under the change.
- [ ] 1.3 Add or extend capability evidence rules if proposal review runs need to be tracked in Praxis state.

## 2. Host Command Integration

- [ ] 2.1 Add the `/spec-review` host command asset and document its optional reviewer agent and model parameters.
- [ ] 2.2 Extend supported agent adapters to project the new command where the host has a command surface.
- [ ] 2.3 Implement backend selection that defaults to the current host reviewer path and strictly validates explicit reviewer overrides.

## 3. Dispatch And Persistence

- [ ] 3.1 Implement the review request builder that passes the bound workspace, `changeId`, and explicit reviewer skill for manual proposal review.
- [ ] 3.2 Integrate native-host and external-dispatch review backends behind the same contract and enforce same-workspace execution for both.
- [ ] 3.3 Persist each manual review run as a separate artifact under `openspec/changes/<change>/reviews/`.

## 4. Verification

- [ ] 4.1 Add tests for reviewed-artifact selection, same-workspace binding, strict override handling, and repeat review artifact persistence.
- [ ] 4.2 Add tests for command projection behavior across supported agent adapters.
- [ ] 4.3 Verify the change reaches OpenSpec apply-ready status without introducing a CLI review fallback.
