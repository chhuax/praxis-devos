# OpenCode Lifecycle Hooks: Design and Findings

## 1. Overview
OpenCode (specifically the `oh-my-opencode` / `omo` project) uses a sophisticated event-driven hook system to manage AI agent behavior, context injection, and task reliability.

## 2. Internal Lifecycle Events
The system attaches hooks to four primary internal events:

| Event Type | Description |
|:---|:---|
| **`UserPromptSubmit`** | Triggers immediately after a user submits a message. |
| **`PreToolUse`** | Triggers after the AI decides to use a tool but before execution. |
| **`PostToolUse`** | Triggers after a tool execution completes and returns output. |
| **`Stop`** | Triggers when the agent enters an idle state (waiting for user). |

## 3. Configuration Hierarchy
Configuration is JSON-based (`oh-my-opencode.json`) with a project-level override:

1. **User Global**: `~/.config/opencode/oh-my-opencode.json`
2. **Project Local**: `.opencode/oh-my-opencode.json`

### Root Fields:
- `disabled_hooks`: Array of hook IDs to deactivate.
- `agents`: Custom prompt injections or behavioral overrides.
- `$schema`: URL for IDE autocompletion.

## 4. Hook Categories (32 Built-in Hooks)
Hooks are grouped into seven functional categories:

1. **Context Injection**: Injects project-specific files (e.g., `AGENTS.md`, `CLAUDE.md`).
2. **Quality & Security**: Prevents common AI errors (e.g., `comment-checker`).
3. **Productivity**: Automates tasks (e.g., `auto-slash-command`).
4. **Task Management**: Enforces workflows (e.g., `todo-continuation-enforcer`).
5. **Recovery**: Handles transient failures (e.g., `error-retry-handler`).
6. **UX/UI**: Enhances feedback (e.g., `notification-manager`).
7. **Truncation**: Manages token limits (e.g., `log-truncator`).

## 5. Execution Sequence (Example)
For a `UserPromptSubmit` event, the default sequence is:
`keyword-detector` -> `claude-code-hooks` -> `auto-slash-command`.

## 6. Concrete Configuration Examples

### Example: Disabling Specific Hooks
```json
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  "disabled_hooks": ["keyword-detector", "todo-continuation-enforcer"]
}
```

### Example: Custom Pre-Tool Context Injection
```json
{
  "agents": {
    "custom_instructions": [
      "Always include unit tests when generating new Java classes."
    ]
  }
}
```
