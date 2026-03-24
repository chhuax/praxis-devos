# 迁移指南

本文说明如何把旧版以 `.opencode/` 为中心的 Praxis DevOS 项目，迁移到新的多 agent 架构。

## 迁移目标

迁移完成后，项目会切换为以下模式：

- `.praxis/` 成为唯一 canonical source
- `AGENTS.md` 成为通用项目上下文入口
- `CLAUDE.md` 成为 Claude Code 入口
- `.opencode/` 仅保留为兼容投影

## 适用范围

适用于以下旧项目：

- skills 直接放在 `.opencode/skills/`
- 技术栈元信息放在 `.opencode/stack.md`
- 技术栈规则放在 `.opencode/stack-rules.md`
- 初始化依赖 OpenCode 插件内的 `praxis-init`

## 推荐做法

在项目根目录执行：

```bash
praxis-devos migrate
```

该命令会自动完成：

1. 把 `.opencode/skills/` 迁移到 `.praxis/skills/`
2. 把 `.opencode/stack.md` 迁移到 `.praxis/stack.md`
3. 把 `.opencode/stack-rules.md` 迁移到 `.praxis/rules.md`
4. 生成 `.praxis/framework-rules.md`
5. 生成 `.praxis/adapters/compiled-rules.md`
6. 生成 `.praxis/manifest.json`
7. 生成或更新 `AGENTS.md`
8. 生成或更新 `CLAUDE.md`
9. 重新同步 `.opencode/` 兼容投影

## 手动检查项

迁移完成后，建议检查以下文件：

- `.praxis/manifest.json`
- `.praxis/framework-rules.md`
- `.praxis/adapters/compiled-rules.md`
- `.praxis/stack.md`
- `.praxis/rules.md`
- `.praxis/skills/`
- `AGENTS.md`
- `CLAUDE.md`

重点确认：

- 当前 `selectedStack` 是否正确
- `AGENTS.md` 中原有项目描述是否保留
- `CLAUDE.md` 是否只追加了受管控区块，而没有覆盖人工内容
- `.opencode/` 是否仍可供旧工作流继续使用
- `<!-- PRAXIS_DEVOS_START -->` 与 `<!-- PRAXIS_DEVOS_END -->` 之间的内容是否符合预期

## 迁移后的推荐工作流

### 新项目初始化

```bash
praxis-devos init --stack java-spring
```

### 当你修改了 `.praxis/` 下的内容

```bash
praxis-devos sync
```

### 只刷新某一个 agent

```bash
praxis-devos sync --agent opencode
praxis-devos sync --agent codex
praxis-devos sync --agent claude
```

## 常见问题

### 1. `.opencode/` 还要不要保留？

要保留，但它已经不是事实来源，只是兼容层。

### 2. Codex 会直接读取 `.praxis/` 吗？

不能依赖这个假设。Codex 的稳定入口是根目录 `AGENTS.md`。

### 3. Claude Code 会直接读取 `.praxis/` 吗？

同样不能依赖。Claude Code 的稳定入口是根目录 `CLAUDE.md`。

### 4. 如果我手动改了 `.opencode/`，会怎么样？

下次执行 `praxis-devos sync --agent opencode` 时，这些兼容投影可能会被 canonical `.praxis/` 内容重新覆盖。应优先修改 `.praxis/`。

### 5. 如果我手动改了 `AGENTS.md` 或 `CLAUDE.md` 呢？

只要你修改的是受管控区块之外的内容，就会被保留。

如果修改了以下标记之间的内容：

```md
<!-- PRAXIS_DEVOS_START -->
...
<!-- PRAXIS_DEVOS_END -->
```

那么下次执行 `praxis-devos sync` 时，这部分会被重新生成。

## 建议

- 新功能和新文档都以 `.praxis/` 为中心设计
- 不要再新增只服务于 OpenCode 的项目结构假设
- 把 `.opencode/` 看作运行时缓存或兼容输出，而不是项目资产目录
