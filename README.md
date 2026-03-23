# praxis-devos

> The AI-Native Development Framework — [OpenSpec](https://github.com/Fission-AI/OpenSpec) Governance + [SuperPowers](https://github.com/obra/superpowers) Execution + Pluggable Stacks

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## What is this?

Praxis DevOS is a framework designed for AI coding agents like OpenCode and Claude Code. It orchestrates the development lifecycle through rigorous specification governance and automated workflows. By combining specification-driven development with pluggable technology stacks, it ensures that AI-generated code remains consistent, high-quality, and aligned with project requirements.

## Why praxis-devos?

Where others emphasize execution or governance in isolation, Praxis DevOS unifies all three into a single, coherent framework. It uniquely integrates governance, standards, and execution to guide AI-driven development from proposal to production.

*   **[OpenSpec](https://github.com/Fission-AI/OpenSpec) (Governance)**: Formal specification governance ensures every change is justified by a spec — from proposal to implementation to archiving.
*   **[SuperPowers](https://github.com/obra/superpowers) (Execution)**: Advanced execution skills provide TDD automation, systematic debugging, development planning, and verification — the engine that drives code quality.
*   **Pluggable Stacks (Standards)**: Technology-specific rules, naming conventions, and domain skills enforce consistent coding standards across any stack.

The Complete Picture: Praxis DevOS = [OpenSpec](https://github.com/Fission-AI/OpenSpec) (Governance) + [SuperPowers](https://github.com/obra/superpowers) (Execution) + Pluggable Stacks (Standards).

## Quick Start

```bash
# 1. Add praxis-devos plugin to your project's opencode.json
{
  "plugin": [
    "praxis-devos@git+https://github.com/chhuax/praxis-devos.git",
    "superpowers@git+https://github.com/obra/superpowers.git"
  ]
}

# 2. Restart OpenCode (plugins auto-install)

# 3. Initialize your project (ask the AI or it will offer automatically)
#    "Run praxis-init with java-spring stack"

# 4. Fill in project context
#    Edit AGENTS.md in your project

```

## Architecture

The framework operates on a three-pillar model, orchestrated by RULES.md:

```
┌─────────────────────────────────────────────────────┐
│                    RULES.md                          │
│          Global Strategy & Dispatcher (WHEN)         │
├──────────────────┬──────────────┬───────────────────┤
│     OpenSpec     │  SuperPowers  │  Pluggable Stacks │
│    Governance    │   Execution   │     Standards     │
│     (WHAT)       │    (HOW)      │    (STANDARD)     │
└──────────────────┴──────────────┴───────────────────┘
```

1.  **[OpenSpec](https://github.com/Fission-AI/OpenSpec) (Governance)**
    Defines *what* to build. Manages the lifecycle of changes from proposal to implementation and archiving, ensuring every line of code has a corresponding specification scenario.

2.  **[SuperPowers](https://github.com/obra/superpowers) (Execution)**
    Defines *how* to execute. Provides TDD automation, systematic debugging, development planning, and verification — the engine that drives code quality.

3.  **Pluggable Stacks (Standards)**
    Defines *coding standards*. Each stack provides its own set of rules, naming conventions, and domain-specific skills (database, security, error handling, etc.) that the AI agent must follow.

## Project Structure

```text
praxis-devos/                          # Plugin repository
├── RULES.md                           # Framework rules (injected into AI system prompt)
├── .opencode/plugins/praxis-devos.js  # Plugin entry point
├── package.json                       # Package manifest
├── openspec/                          # Specification templates
│   └── templates/                     # Proposal & task templates
├── skills/                            # Plugin-bundled skills (framework-coupled)
│   └── openspec/                      # OpenSpec governance workflow
└── stacks/                            # Pluggable technology stacks (templates)
    ├── starter/                       # Minimal template for creating new stacks
    └── java-spring/                   # Java + Spring Boot reference stack
        ├── stack.md                   # Stack metadata
        └── skills/                    # Domain skills (database, security, testing...)

your-project/                          # After running praxis-init
├── opencode.json                      # Plugin configuration
├── AGENTS.md                          # Project strategy (you fill this in)
├── openspec/                          # OpenSpec structure (created by CLI)
│   ├── AGENTS.md                      # OpenSpec workflow instructions
│   ├── specs/                         # Current system specifications
│   ├── changes/                       # Active change proposals
│   └── templates/                     # Proposal & task templates
└── .opencode/
    ├── stack.md                       # Toolchain reference (from selected stack)
    └── skills/                        # All skills live here
        ├── git-workflow/              # Git & PR lifecycle (customizable)
        ├── code-review/               # Code review process & checklists
        ├── java-database/             # ← from stack (if java-spring selected)
        ├── java-error-handling/       # ← from stack
        ├── java-security/             # ← from stack
        └── java-testing/              # ← from stack
```

## Skills

The framework uses a composable skill system to extend AI agent capabilities.

### Plugin Skills
Bundled with the plugin, framework-coupled — not meant for user customization:
*   `openspec`: Manages the three-stage spec lifecycle (proposal → implementation → archive).

### User-Customizable Skills
Copied to your project's `.opencode/skills/` by `praxis-init`. You can freely modify these to match your team's workflow:
*   `git-workflow`: Branch naming, commit conventions, merge flow.
*   `code-review`: Review checklists, feedback standards, self-review process.

### SuperPowers Skills
Loaded from the SuperPowers plugin system and treated as a core execution layer.
- `brainstorming`: Structured idea generation to help scope features and outcomes.
- `writing-plans`: Translate ideas into concrete development plans and milestones.
- `test-driven-development`: Automated RED-GREEN-REFACTOR cycles to drive code quality.
- `systematic-debugging`: Systematic workflows to locate and fix issues efficiently.
- `subagent-driven-development`: Parallel dispatch of multiple SuperPowers agents to speed up work.
- `verification-before-completion`: Pre-merge validations, tests, and quality gates before completion.
- `finishing-a-development-branch`: Finalize work, prepare PRs, and ensure clean history.
- `using-git-worktrees`: Isolate work areas with Git worktrees for parallel development.

### Stack-Specific Skills
Loaded dynamically based on the selected technology stack. Each stack provides domain-specific skills (e.g., database design, error handling, security, caching) that are copied to `.opencode/skills/` during initialization.

## Creating Your Own Stack

You can create a new stack by adding a directory in the framework's `stacks/`:

1.  **`stack.md`**: Define the runtime, build tools, and toolchain commands.
2.  **`skills/`**: Add domain-specific skills to give AI agents specialized knowledge.

When users run `praxis-init` with your stack, the skills are copied to their project's `.opencode/skills/`.

## Prerequisites

| Requirement | Version | Description |
| :--- | :--- | :--- |
| Node.js | >= 20.19.0 | Runtime for OpenSpec CLI |
| Git | Any | Required for plugin synchronization |
| AI Agent | Latest | OpenCode or Claude Code |

## Installation

### OpenCode Plugin (Recommended)

1. Add plugins to your project's `opencode.json`:

```json
{
  "plugin": [
    "praxis-devos@git+https://github.com/chhuax/praxis-devos.git",
    "superpowers@git+https://github.com/obra/superpowers.git"
  ]
}
```

2. Restart OpenCode — plugins auto-install on startup.

3. Initialize your project — ask the AI or it will offer automatically:

```
"Run praxis-init with java-spring stack"
```

`praxis-init` will:
- Auto-install OpenSpec CLI (`@fission-ai/openspec`) if not found
- Run `openspec init` to create the specification structure
- Copy framework templates (proposal/task templates)
- Copy `git-workflow` and `code-review` skills to `.opencode/skills/` (customizable)
- Copy selected stack's skills and toolchain reference to `.opencode/`
- Create `AGENTS.md` skeleton (if not present)

4. Fill in project context — edit `AGENTS.md` in your project.

> Claude Code users: run `/plugin install superpowers@claude-plugins-official` separately.

### Upgrading

The plugin is installed via `git+https://`, so OpenCode caches a specific Git commit. To pull the latest version:

```bash
rm -rf ~/.cache/opencode/node_modules/praxis-devos
rm -f ~/.cache/opencode/bun.lock
# Then restart OpenCode
```

> **Note**: `praxis-init` is idempotent — existing files in your project will NOT be overwritten. To pick up new templates or stack rules, delete the specific file first, then re-run `praxis-init`.

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to add new stacks or improve existing skills.

## Sponsor

Open source is not easy. If this project helps you, consider buying me a coffee ☕

<img src="https://wxma-1254014761.cos.ap-beijing.myqcloud.com/pay.png" alt="WeChat Pay" width="200" />

## License

Copyright 2024-2026 Praxis DevOS Authors.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).
