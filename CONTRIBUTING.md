# Contributing to Praxis DevOS

We welcome contributions! This guide helps you get started.

## Development Setup

- Node.js >= 20.19.0
- Install `openspec` CLI: `npm install -g openspec`

## How to Contribute

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Make changes and commit: `git commit -m "feat: your feature"`.
4. Push to your fork: `git push origin feature/your-feature`.
5. Open a Pull Request.

## Creating a New Tech Stack

Tech stacks live in the `stacks/` directory.
- Reference `stacks/starter/` for the required structure.
- Include `stack.md` (metadata) and `rules.md` (coding standards).
- Add stack-specific skills to `stacks/{stack}/skills/`.

## Creating a New Skill

Skills live in the `.claude/skills/` directory.
- Follow the directory structure of existing skills.
- Ensure each skill has a `SKILL.md` file.

## Adding Translations

- Documentation is primarily in English and Chinese.
- Follow the existing file naming conventions for translated versions (e.g., `README.zh.md`).

## Issue and PR Guidelines

- Use descriptive titles for issues and PRs.
- Link PRs to relevant issues.
- Ensure all tests pass before submitting.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Code of Conduct

All contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md).
