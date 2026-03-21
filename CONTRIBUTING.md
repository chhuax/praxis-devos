# Contributing to Praxis DevOS

We're excited to have you contribute to the praxis-devos framework! This guide outlines how to get started and how to maintain the project's high standards.

## Project Architecture

Praxis DevOS is built around a three-layered architecture designed for maximum flexibility and AI efficiency:

- **Universal Skills** (`skills/`): Core process-oriented workflow skills such as `openspec-workflow`, `git-workflow`, and `code-review`. These are strictly technology-agnostic and focus on *how* work is managed.
- **Technology Stacks** (`stacks/`): Language and framework-specific implementations. Each stack defines its own `rules.md` (coding standards) and optional `skills/` (domain-specific expertise).
- **OpenSpec** (`openspec/`): The core specification-driven development system that manages the lifecycle of all changes.

## How to Contribute

### Adding a Universal Skill
Universal skills should be strictly PROCESS-focused. Avoid code examples tied to a specific language.
1. Create a new directory under `skills/{skill-name}/` and add a `SKILL.md` file.
2. Follow the standard Agent Skills format, including the YAML frontmatter and clear instructions.
3. Ensure the skill is broadly applicable across all potential technology stacks.

### Adding a Technology Stack
New stacks help AI agents understand different development environments.
1. Use `stacks/starter/` as your starting point by copying the entire directory.
2. Complete `stack.md` with runtime versions, build tools, and essential commands.
3. Define comprehensive coding conventions in `rules.md` (naming, patterns, anti-patterns).
4. Add domain-specific skills to the `skills/` sub-directory within your stack.
5. Refer to `stacks/README.md` for a detailed guide on stack creation.

### Improving Existing Content
- Fix typos, enhance clarity in descriptions, and add relevant examples.
- Ensure universal skills remain technology-neutral at all times.
- Keep stack-specific skills focused purely on their designated technology.

## Development Setup

To contribute effectively, you will need:
- **Node.js >= 20.19.0**: Required for running the OpenSpec CLI and associated tools.
- **Git**: For version control and managing the contribution lifecycle.
- **Installation Check**: Run `./install.sh --check` to verify that your local environment meets all requirements.

## Coding and Documentation Guidelines

- **Code Identifiers**: All variables, functions, and class names must be in English.
- **Language Policy**: Use Chinese for Chinese-focused documentation and English for global documentation like this one.
- **Commit Messages**: Follow the Conventional Commits specification: `type(scope): description`.
- **Focus**: Keep Pull Requests granular. Each PR should address a single feature or bug fix.

## Pull Request Process

1. Fork the repository on GitHub.
2. Create a dedicated feature branch from `main`: `git checkout -b feature/your-feature-name`.
3. Implement your changes and verify them thoroughly.
4. Commit your work using the Conventional Commits format.
5. Push your branch to your fork and open a Pull Request.
6. Link the PR to any relevant issues or discussions.

## What NOT to Submit

- **Enterprise-specific content**: Keep proprietary tools or company-specific patterns in private stacks.
- **Branded content**: Avoid hardcoding specific brand names or third-party tools unless they are part of a public technology stack.
- **Protected sections**: Never modify the `<!-- PRAXIS_DEVOS_START -->` block in the root `AGENTS.md` file.

## Code of Conduct

All contributors are expected to uphold the standards outlined in our [Code of Conduct](CODE_OF_CONDUCT.md). We strive to maintain a welcoming and professional environment for everyone.
