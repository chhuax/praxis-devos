# praxis-devos

> The AI-Native Development Framework — OpenSpec-Driven + Pluggable Stacks + Composable Skills

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## What is this?

Praxis DevOS is a framework designed for AI coding agents like OpenCode and Claude Code. It orchestrates the development lifecycle through rigorous specification governance and automated workflows. By combining specification-driven development with pluggable technology stacks, it ensures that AI-generated code remains consistent, high-quality, and aligned with project requirements.

## Why praxis-devos?

While individual tools offer specific capabilities, Praxis DevOS provides a cohesive orchestration layer that bridges the gap between high-level requirements and low-level execution.

*   **vs Superpowers**: Superpowers provides excellent execution skills but lacks a formal specification governance layer. Praxis DevOS uses OpenSpec to ensure every change is justified by a spec.
*   **vs OpenSpec**: OpenSpec provides the specification workflow but doesn't manage technology-specific rules or coding guidelines. Praxis DevOS adds pluggable stacks to enforce domain-specific standards.
*   **The Complete Picture**: Praxis DevOS = OpenSpec (Governance) + Pluggable Stacks (Standards) + Composable Skills (Execution).

## Quick Start

```bash
# 1. Clone the framework
git clone https://github.com/praxis-devos/praxis-devos.git

# 2. Install to your project (with optional tech stack)
./praxis-devos/install.sh --dir /path/to/your-project
./praxis-devos/install.sh --stack java-spring --dir /path/to/your-project

# 3. Fill in project context
#    Edit openspec/project.md in your project

# 4. Start your first AI-driven change
openspec proposal "Add user authentication"
```

## Architecture

The framework operates on a three-layer model to provide clear boundaries for AI agents:

1.  **Layer 1: AGENTS.md (Framework Rules)**
    Defines *how* to work. It contains the global strategy, decision trees for skill loading, and the intent gating logic that determines if a task needs a full proposal or a quick fix.

2.  **Layer 2: OpenSpec (Specification-Driven Dev)**
    Defines *what* to build. It manages the lifecycle of changes from proposal to implementation and archiving, ensuring every line of code has a corresponding specification scenario.

3.  **Layer 3: Pluggable Stacks (Technology Rules)**
    Defines *coding standards*. Each stack provides its own set of rules, naming conventions, and domain-specific skills (database, security, error handling, etc.) that the AI agent must follow.

*   **Optional: SuperPowers (Execution Quality)**
    An enhancement layer that provides advanced workflow skills like TDD automation, systematic debugging, and parallel agent dispatching.

## Project Structure

```text
praxis-devos/
├── AGENTS.md                  # Global strategy & dispatcher center
├── install.sh                 # One-click installation script
├── openspec/                  # Specification system
│   ├── project.md             # Project business context
│   ├── specs/                 # Current system specifications
│   ├── changes/               # Active change proposals
│   └── templates/             # Templates for specs and tasks
├── skills/                    # Universal workflow skills
│   ├── openspec-workflow/     # Spec governance skills
│   ├── git-workflow/          # Git & PR lifecycle skills
│   └── code-review/          # Code review process & checklists
└── stacks/                    # Pluggable technology stacks
    ├── starter/               # Minimal template for creating new stacks
    └── java-spring/           # Java + Spring Boot reference stack
        ├── stack.md           # Stack metadata & skill mapping
        ├── rules.md           # Java coding conventions
        └── skills/            # Domain skills (database, security, testing...)
```

## Skills

The framework uses a composable skill system to extend AI agent capabilities.

### Universal Skills
Available to all projects, providing core workflow automation:
*   `openspec-workflow`: Manages the three-stage spec lifecycle.
*   `git-workflow`: Enforces branch naming and conventional commits.
*   `code-review`: Code review checklists, feedback standards, and self-review process.

### Stack-Specific Skills
Loaded dynamically based on the active technology stack. Each stack defines its own domain-specific skills (e.g., database design, error handling, security, caching). See the stack's `stack.md` for available skills.

## Creating Your Own Stack

You can easily adapt Praxis DevOS to any technology by creating a new directory in `stacks/`:

1.  **`stack.md`**: Define the runtime, build tools, and toolchain commands (YAML). Map your custom skills here.
2.  **`rules.md`**: Write down your naming conventions, logging standards, and architectural constraints.
3.  **Skills**: Add domain-specific skills in your stack folder to give AI agents specialized knowledge.

## Prerequisites

| Requirement | Version | Description |
| :--- | :--- | :--- |
| Node.js | >= 20.19.0 | Runtime for OpenSpec CLI |
| Git | Any | Required for plugin synchronization |
| AI Agent | Latest | OpenCode or Claude Code |

## Installation

Install to your current directory or a specific project:

```bash
# Standard installation
./install.sh

# Install with a specific stack
./install.sh --stack <stack-name>

# Install to a target project directory
./install.sh --dir /path/to/project
```

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to add new stacks or improve existing skills.

## Sponsor

Open source is not easy. If this project helps you, consider buying me a coffee ☕

☕ [Buy Me a Coffee](https://buymeacoffee.com/yourname) · Alipay · WeChat Pay

## License

Copyright 2024-2026 Praxis DevOS Authors.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).
