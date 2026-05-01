## 1. Bundled Skill

- [x] 1.1 Create `assets/skills/karpathy-guidelines/SKILL.md` with the official `karpathy-guidelines` content.
- [x] 1.2 Preserve the official skill metadata and trigger description for coding, review, and refactor tasks.
- [x] 1.3 Keep Praxis-specific activation outside the official skill content.

## 2. Projection Coverage

- [x] 2.1 Add or update tests that assert bundled skill collection includes `karpathy-guidelines`.
- [x] 2.2 Add or update tests that run `projectNativeSkills()` for `codex` and assert `~/.codex/skills/karpathy-guidelines/SKILL.md` is written with a Praxis projection marker.
- [x] 2.3 Confirm no CLI option, external dependency, or pack resolver change is required.
- [x] 2.4 Add managed block activation guidance so coding tasks must load `karpathy-guidelines`, with inline fallback for agents that cannot invoke skills.
- [x] 2.5 Compress the managed block so routing and contracts stay concise.
- [x] 2.6 Remove non-execution maintenance prose from the managed block.
- [x] 2.7 Align the managed block activation name with the official `karpathy-guidelines` skill metadata.

## 3. Verification

- [x] 3.1 Run the focused projection tests affected by bundled skill collection.
- [x] 3.2 Run `node --test`.
- [x] 3.3 Run `openspec validate add-coding-guidelines-skill --strict`.
