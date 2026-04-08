## 背景

`add-devos-docs-skills` 已经把 `devos-docs` skill、handoff contract、writeback rules 和 deterministic validation 落到了仓库里，但宿主侧的 command 入口还没有接上。当前状态仍然偏向 skills-first，用户需要自己知道如何调用 skill，缺少对 Claude Code 和 OpenCode 这类明确支持 project-level command 的宿主的直接入口包装。

本次 change 的目标不是重新设计文档生成能力，而是补齐“宿主 command 外壳”这一层，并基于官方文档确认各宿主的真实投放面：

- Claude Code：`.claude/commands/` 文件仍然可用，但官方推荐优先用 skills；同名时 skill 优先。
- OpenCode：支持 `.opencode/commands/` 项目级 markdown command，也支持 config 中定义 command。
- Codex：官方文档当前明确列出了 app/IDE/CLI 的 slash commands 与 skills，但没有找到与 Claude/OpenCode 对等的仓库内自定义 command 投放面。

## 变更内容

- 为 `devos-docs` 增加宿主 command adapter 设计与实现。
- 对 Claude Code 新增 project-level command 资产：
  - `.claude/commands/devos-docs-init.md`
  - `.claude/commands/devos-docs-refresh.md`
- 对 OpenCode 新增 project-level command 资产：
  - `.opencode/commands/devos-docs-init.md`
  - `.opencode/commands/devos-docs-refresh.md`
- command 只作为薄包装入口，核心能力继续由共享的 `devos-docs` skill 承担。
- `setup` / `sync` 负责把 command 模板投放到用户项目，而不是投放到用户 home 目录。
- Codex 在本阶段保持 skills-first，不新增未被官方文档支撑的 project command 投放逻辑。
- 保留现有 `praxis-devos docs init|refresh|check` 作为 compatibility / fallback path，但不再把它作为推荐的宿主入口。

## 能力影响

### 新增能力
- `host-docs-command-adapters`：为支持 project-level commands 的宿主投放 `devos-docs` 的命令入口包装。

### 修改能力
- `ai-project-docs`：从“只有 skill 和 compatibility CLI”升级为“skill + host-specific command adapters + compatibility CLI”。

## 影响范围

- 影响用户项目安装资产，需要新增宿主 command 模板目录。
- 影响 `setup` / `sync` 写入逻辑，需要将项目级 command 文件和 managed guidance 一起同步。
- 影响投影和说明文案，需要明确 command 与 skill 的职责分层。
- 影响测试，需要新增对 Claude/OpenCode command 写入、刷新、清理和 compatibility 行为的仓库内验证。
