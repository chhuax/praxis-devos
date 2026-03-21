# Starter Stack Template

> Use this as a starting point for creating your own technology stack.

## Basic Info

| Field | Value |
|-------|-------|
| Name | starter |
| Display Name | Starter Template |
| Runtime | (your runtime) |
| Framework | (your framework) |
| Build Tool | (your build tool) |

## Toolchain Commands

```yaml
commands:
  build: "echo 'Configure your build command'"
  test: "echo 'Configure your test command'"
  verify: "echo 'Configure your verify command'"
  lint: "echo 'Configure your lint command'"
```

## Stack-Specific Skills

This starter stack has no custom skills. To add stack-specific skills:

1. Create `stacks/starter/skills/{skill-name}/SKILL.md`
2. Reference it in this file's skills table
3. Run `install.sh --stack starter` to deploy

## Included Rules

| File | Description |
|------|-------------|
| `rules.md` | Basic coding conventions |
