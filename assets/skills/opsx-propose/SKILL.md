---
name: opsx-propose
description: Propose a new change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with design, specs, and tasks ready for implementation.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

Propose a new change - create the change and generate all artifacts in one step.

I'll create a change with artifacts:
- proposal.md (what and why)
- design.md (how)
- tasks.md (implementation steps)

When ready to implement, run `/opsx:apply`.

## PRAXIS_DEVOS_OVERLAY

Framework-specific coordination for embedded Superpowers usage:

- `opsx-propose` remains the only visible flow for this stage.
- If you invoke `brainstorming` internally to resolve ambiguity or compare approaches, do not announce `Using brainstorming` or start a second workflow.
- Proposal, design, and task output must stay under `openspec/changes/<name>/...`. Do not create `docs/superpowers/...`.
- Internal methods can help clarify and structure the proposal, but they do not replace the native OpenSpec proposal flow.
- When invoking any internal Superpowers capability, pass the current flow type, current change id, current stage goal, current artifact locations, and current output constraints.

Embedded capability contract:

- `mode: embedded`
- `owner_flow: opsx-propose`
- `visibility: internal`
- `artifact_targets: openspec/changes/<change>/...`
- `evidence_target: user-level Praxis state directory`

Internal capabilities must not:

- announce a second workflow
- create `docs/superpowers/...`
- output a second final recap

Stage hooks:

- If the request is still vague or there are many open questions, invoke `brainstorming` internally to narrow scope, compare options, and clarify constraints.
- If project docs already exist, read the docs context pack before broad repository scanning:
  - always `docs/surfaces.yaml`
  - always `docs/codemaps/project-overview.md`
  - `docs/codemaps/module-map.md` only for multi-module projects
  - `docs/codemaps/modules/<artifactId>.md` only when module routing is deterministic
- If the request is clear enough, return to the native proposal flow and generate the required change artifacts.
- Design decisions, task breakdowns, and scope changes must be written back into the current change instead of creating a parallel document set.
- If the initial request still has critical ambiguity, invoke `brainstorming` internally before proceeding.
- If an artifact requires extra user input because of scope disagreement, solution disagreement, or missing context, invoke `brainstorming` internally, capture the result in the current change artifacts, and then continue.

---

**Input**: The user's request should include a change name (kebab-case) or a description of what they want to build.

**Steps**

1. **If no clear input is provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name, for example `"add user authentication"` becomes `add-user-auth`.

   **IMPORTANT**: Do not proceed without understanding what the user wants to build.

2. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```
   This creates a scaffolded change at `openspec/changes/<name>/` with `.openspec.yaml`.

3. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `applyRequires`: artifact ids needed before implementation
   - `artifacts`: all artifacts with their status and dependencies

4. **Create artifacts in sequence until apply-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   Loop through artifacts in dependency order.

   a. **For each artifact that is `ready`**
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - The instructions JSON includes:
        - `context`: project background for you, not for output
        - `rules`: artifact-specific constraints for you, not for output
        - `template`: the structure to use
        - `instruction`: schema-specific guidance
        - `outputPath`: where to write the artifact
        - `dependencies`: completed artifacts to read first
      - Read completed dependency files for context
      - Create the artifact using `template` as the structure
      - Apply `context` and `rules` as constraints, but do not copy them into the file
      - Show brief progress such as `Created <artifact-id>`

   b. **Continue until all `applyRequires` artifacts are complete**
      - After each artifact, re-run:
        ```bash
        openspec status --change "<name>" --json
        ```
      - Stop when every artifact id in `applyRequires` has `status: "done"`

   c. **If an artifact requires user input**
      - Use **AskUserQuestion tool** to clarify
      - Then continue

5. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After completing all artifacts, summarize:
- Change name and location
- Artifacts created with brief descriptions
- Current readiness, for example `All artifacts created! Ready for implementation.`
- Next step, for example `Run /opsx:apply or ask me to implement to start working on the tasks.`

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- Follow the schema for what each artifact should contain
- Read dependency artifacts before creating new ones
- Use `template` as the structure for the output file
- **IMPORTANT**: `context` and `rules` are constraints for you, not content for the file
  - Do not copy `<context>`, `<rules>`, or `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**

- Create all artifacts needed for implementation as defined by `apply.requires`
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask the user, but otherwise prefer reasonable decisions to keep momentum
- If a change with that name already exists, ask whether to continue it or create a new one
- Verify that each artifact file exists before proceeding
