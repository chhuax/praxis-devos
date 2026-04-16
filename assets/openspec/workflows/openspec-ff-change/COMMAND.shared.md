Use this command to fast-forward a change through artifact creation until it is ready for implementation.

Expect a change name or a short feature description as input. Clarify missing intent before generating artifacts.

Shared workflow expectations:

- Create or reuse the target change under `openspec/changes/<change>/`.
- Iterate through ready artifacts in dependency order until all apply-required artifacts are done.
- Read dependency artifacts before generating each subsequent artifact.
- Ask for clarification only when missing context would materially derail the artifacts.
- End with a concise status summary and direct the user to `/opsx:apply`.
