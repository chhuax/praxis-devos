# Starter Stack — Coding Rules

Universal coding conventions for the starter stack. Extend this file when creating language-specific stacks.

## Naming Conventions

- **Variables & Functions**: Use meaningful, descriptive names in camelCase (JavaScript/Java) or snake_case (Python).
- **Constants**: ALL_CAPS with underscores.
- **Classes & Types**: PascalCase.
- **Avoid**: Single-letter names (except loop counters `i`, `j`), cryptic abbreviations.

## Formatting & Style

- Maintain consistent indentation (2 spaces for YAML/JSON, 4 spaces for code).
- Use your language's standard formatter before committing.
- Keep lines reasonably sized (aim for <100 characters).
- Use trailing commas in multi-line structures where allowed.

## Error Handling

- **Never silently swallow exceptions.** Always log or re-throw with context.
- Use structured error responses (include error code, message, and context).
- Fail fast: validate inputs at entry points, propagate errors upward.

## Security

- **Never hardcode credentials, API keys, or secrets** in code.
- Use environment variables, config files (ignored via `.gitignore`), or secure vaults.
- Sanitize user inputs before database queries or API calls.
- Validate data types and bounds on entry.

## Testing

- Write tests for new features and bug fixes (TDD workflow).
- Aim for >80% code coverage on business logic.
- Test both happy path and error cases.
- Use descriptive test names that explain the scenario.

## Comments & Documentation

- Comment the "why", not the "what" — code should be self-explanatory.
- Document public APIs, edge cases, and non-obvious decisions.
- Keep comments synchronized with code during refactoring.

## Version Control

- Use Conventional Commits format: `type(scope): description`.
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
  - Example: `feat(auth): add JWT validation`
- Keep commits atomic and logically grouped.
