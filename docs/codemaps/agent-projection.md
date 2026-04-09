# Codemap: Agent Projection

## 用途

这份 codemap 聚焦 `src/projection/`，帮助快速回答：

- OpenSpec skill 是从哪里来的
- 如何投影到不同 agent
- stale projection 如何清理
- 哪些文件决定目标路径和覆盖规则

## 源资产

正式 skill 资产在：

- [assets/skills/opsx-propose/SKILL.md](../../assets/skills/opsx-propose/SKILL.md)
- [assets/skills/opsx-explore/SKILL.md](../../assets/skills/opsx-explore/SKILL.md)
- [assets/skills/opsx-apply/SKILL.md](../../assets/skills/opsx-apply/SKILL.md)
- [assets/skills/opsx-archive/SKILL.md](../../assets/skills/opsx-archive/SKILL.md)
- [assets/skills/devos-docs/SKILL.md](../../assets/skills/devos-docs/SKILL.md)
- [assets/commands/devos-docs-init.md](../../assets/commands/devos-docs-init.md)
- [assets/commands/devos-docs-refresh.md](../../assets/commands/devos-docs-refresh.md)

## 投影流转

```text
collectBundledSkillSources()
  -> 从 assets/skills/ 收集 sourceDir

projectToAgent({ agent, version, log })
  -> 选择 adapter
  -> cleanStaleProjections()
  -> projectSkills()
  -> 写入目标 agent 的技能目录
  -> projectCommands() (Claude/OpenCode)
```

## 关键文件

### 总分发

- [src/projection/index.js](../../src/projection/index.js)

职责：

- 收集 bundled skill bundle 目录
- 选择 agent adapter
- 对外提供 `projectToAgent()`、`detectForAgent()`、`expectedSkillNames()`

### Codex 投影

- [src/projection/codex.js](../../src/projection/codex.js)

目标目录：

- `~/.codex/skills/<skill>/SKILL.md`

### Claude 投影

- [src/projection/claude.js](../../src/projection/claude.js)

目标目录：

- `~/.claude/skills/<skill>/SKILL.md`

### OpenCode 投影

- [src/projection/opencode.js](../../src/projection/opencode.js)

特点：

- 目前复用 `~/.claude/skills/`
- 更像 OpenCode 共享技能投递
- command 额外写入 `~/.config/opencode/commands/*.md`

### Marker 规则

- [src/projection/markers.js](../../src/projection/markers.js)

职责：

- 注入 `PRAXIS_PROJECTION` marker
- 判断文件是否是 Praxis 管理的 projection
- 防止覆盖用户自定义 skill

## 改投影逻辑时先看什么

### 改目标目录

先看：

- 各 adapter 文件
- [resolveUserHomeDir](../../src/support/home.js)

### 改哪些 skill 会被投影

先看：

- [src/projection/index.js](../../src/projection/index.js)

### 改 marker / 覆盖策略

先看：

- [src/projection/markers.js](../../src/projection/markers.js)

## 关键事实

- skill 来源不是 `src/`，而是 `assets/skills/`
- stale 清理发生在 `projectToAgent()` 调 adapter 之前
- 写入前会检查目标文件是否仍然是 Praxis projection
- projection marker 是防止误覆盖的关键边界
