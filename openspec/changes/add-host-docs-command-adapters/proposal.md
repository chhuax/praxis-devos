## 背景

`add-devos-docs-skills` 已经把 `devos-docs` skill、handoff contract、writeback rules 和 deterministic validation 落到了仓库里，但宿主侧的 command 入口还没有接上。当前状态仍然偏向 skills-first，用户需要自己知道如何调用 skill，缺少对 Claude Code 和 OpenCode 这类明确支持 user-level command 的宿主的直接入口包装。

本次 change 的目标不是重新设计文档生成能力，而是补齐“宿主 command 外壳”这一层，并基于官方文档确认各宿主的真实投放面：

- Claude Code：`~/.claude/commands/` 仍然可用，但官方推荐优先用 skills；同名时 skill 优先。
- OpenCode：支持 `~/.config/opencode/commands/` 的 user-level markdown command，也支持 config 中定义 command。
- Codex：官方文档当前明确列出了 app/IDE/CLI 的 slash commands 与 skills，但没有找到与 Claude/OpenCode 对等的仓库内自定义 command 投放面。

## 变更内容

- 为 `devos-docs` 增加宿主 command adapter 设计与实现。
- 对 Claude Code 新增 user-level command 资产：
  - `~/.claude/commands/devos-docs-init.md`
  - `~/.claude/commands/devos-docs-refresh.md`
- 对 OpenCode 新增 user-level command 资产：
  - `~/.config/opencode/commands/devos-docs-init.md`
  - `~/.config/opencode/commands/devos-docs-refresh.md`
- command 只作为薄包装入口，核心能力继续由共享的 `devos-docs` skill 承担。
- `setup` / `sync` 负责把 command 模板投放到用户级宿主目录。
- Codex 在本阶段保持 skills-first，不新增未被官方文档支撑的用户级 command 投放逻辑。
- 保留现有 `praxis-devos docs init|refresh|check` 作为 compatibility / fallback path，但不再把它作为推荐的宿主入口。
- 为所有 Praxis 托管资产引入独立的 managed asset manifest，而不是依赖写入到资产正文的 marker。

## 能力影响

### 新增能力
- `host-docs-command-adapters`：为支持 user-level commands 的宿主投放 `devos-docs` 的命令入口包装。
- `managed-assets-manifest`：用独立清单文件统一记录 Praxis 托管资产的归属、版本与类型。

### 修改能力
- `devos-docs`：从“只有 skill 和 compatibility CLI”升级为“skill + host-specific command adapters + compatibility CLI”。

## 影响范围

- 影响用户级投影资产，需要新增宿主 command 模板目录与写入逻辑。
- 影响 `setup` / `sync` 与 projection 层，需要将 user-level command 资产纳入统一托管。
- 影响托管元数据，需要新增 managed asset manifest 并让技能/命令等托管资产统一登记。
- 影响说明文案，需要明确 command 与 skill 的职责分层。
- 影响测试，需要新增对 Claude/OpenCode command 写入、刷新、manifest 记录和 compatibility 行为的仓库内验证。
