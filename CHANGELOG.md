# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `skills/code-review/` — Universal code review workflow skill (checklists, feedback levels, self-review)
- `stacks/java-spring/` — Generic Java + Spring Boot reference stack with 4 domain skills:
  - `java-database`: Table design, SQL safety, JPA/MyBatis, pagination
  - `java-error-handling`: BusinessException, RFC 7807, @RestControllerAdvice
  - `java-security`: Spring Security, input validation, password hashing
  - `java-testing`: JUnit 5, Mockito, Spring Boot Test, coverage targets
- `stacks/README.md` — Guide for creating and managing technology stacks (including private stacks)
- English documentation (README.md)
- Community files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`

### Changed
- Skills architecture: universal skills are now process-only (`openspec`, `git-workflow`, `code-review`); technology-specific skills moved to `stacks/{stack}/skills/`
- `AGENTS.md`: dynamic stack skill loading, code-review added to routing tree
- `CONTRIBUTING.md`: rewritten to match current three-layer architecture
- SuperPowers marked as optional enhancement in `AGENTS.md`

### Removed
- `database-guidelines`, `error-handling`, `security`, `redis-guidelines` from framework-level `skills/` (moved to stack layer)
