# Codemap: OpenSpec Integration

## 用途

这份 codemap 聚焦 OpenSpec 集成面，帮助快速定位：

- 用户项目里到底会被写入什么
- OpenSpec flow 规则在哪里定义
- `opsx-*` skill 和 `managed-entry` 是怎么协作的

## 两条主线

`praxis-devos` 的 OpenSpec 集成由两部分组成：

1. **用户项目根目录的托管规则**
   - 通过 [src/templates/managed-entry.md](../../src/templates/managed-entry.md) 注入到用户项目 `AGENTS.md`

2. **投影到 agent 原生目录的 `opsx-*` skills**
   - 来源于 [assets/skills/](../../assets/skills)

这两部分一起决定“AI 在用户项目里如何进入 OpenSpec flow”。

## 用户项目注入面

相关函数在：

- `renderManagedEntryTemplate` in [src/core/praxis-devos.js](../../src/core/praxis-devos.js)
- `renderManagedBlock` in [src/core/praxis-devos.js](../../src/core/praxis-devos.js)
- `upsertManagedBlock` in [src/core/praxis-devos.js](../../src/core/praxis-devos.js)
- `syncCodexAdapter` in [src/core/praxis-devos.js](../../src/core/praxis-devos.js)
- `syncClaudeAdapter` in [src/core/praxis-devos.js](../../src/core/praxis-devos.js)
- `syncOpenCodeAdapter` in [src/core/praxis-devos.js](../../src/core/praxis-devos.js)

## OpenSpec flow 规则源

最关键的规则文案在：

- [src/templates/managed-entry.md](../../src/templates/managed-entry.md)

这里定义：

- 什么情况应进入 `/opsx:propose` 或 `/opsx:explore`
- 什么时候可以直接 `/opsx:apply`
- OpenSpec 是唯一对外可见工作流层
- SuperPowers 只能作为阶段内嵌能力使用
- stage gate 的基本约束

## `opsx-*` skill 角色

### `opsx-propose`

- [assets/skills/opsx-propose/SKILL.md](../../assets/skills/opsx-propose/SKILL.md)
- 负责提案与工件生成

### `opsx-explore`

- [assets/skills/opsx-explore/SKILL.md](../../assets/skills/opsx-explore/SKILL.md)
- 负责探索和澄清

### `opsx-apply`

- [assets/skills/opsx-apply/SKILL.md](../../assets/skills/opsx-apply/SKILL.md)
- 负责任务实施

### `opsx-archive`

- [assets/skills/opsx-archive/SKILL.md](../../assets/skills/opsx-archive/SKILL.md)
- 负责归档与收尾校验

## 改 OpenSpec 集成时的路由

### 改用户项目 AGENTS 注入文案

先看：

- [src/templates/managed-entry.md](../../src/templates/managed-entry.md)
- `upsertManagedBlock` in [src/core/praxis-devos.js](../../src/core/praxis-devos.js)

### 改 `opsx-*` 的行为

先看：

- `assets/skills/opsx-*/SKILL.md`
- 再看 `projection` 层确保会被正确投影

### 改会话验证规则

先看：

- `analyzeSessionTranscript` in [src/core/praxis-devos.js](../../src/core/praxis-devos.js)
- `SESSION_EVENT_RULES`

## 关键事实

- OpenSpec 集成不是只靠 skill，也不是只靠 AGENTS managed block，而是两者配合
- 会话 validator 会检查 OpenSpec flow 中是否出现不该暴露的第二层流程
- `docs/superpowers/...` 在 OpenSpec flow 中被视为不正确输出位置
