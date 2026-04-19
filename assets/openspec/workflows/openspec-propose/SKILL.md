---
name: openspec-propose
description: 在一次会话中创建新的 OpenSpec change，并把 proposal、specs、design、tasks 等工件推进到可进入实现的状态。适用于用户已有大致方向，希望快速得到一套可执行的变更工件。
compatibility: Requires openspec CLI. Works best with Superpowers skills.
metadata:
  author: openspec
  version: "1.3"
---

提出一个新的 OpenSpec change，并尽量把它推进到 **apply-ready**。

## 核心定位

- OpenSpec 负责：change、schema、artifact 依赖、status、instructions、readiness
- Superpowers 负责：需求收敛、任务拆解
- 正式结果只保留在当前 change 目录中
- propose 阶段不实现业务代码

## 精确 Skill 协议

- 命中路由时，必须调用对应的**精确 skill 名**
- 不得用相近的本地 skill、todo list、手工拆点或长段 reasoning 替代
- 如果精确 skill 不可用，必须明确报告，并暂停当前路由

## 能力路由

- 如果输入仍然模糊、边界不稳、存在多个合理方案，先用 `superpowers:brainstorming`
- 在生成 `tasks.md` 时，默认使用 `superpowers:writing-plans`
- propose 阶段的 `writing-plans` 只服务于**整份 `tasks.md`**
- 不要为整个 change 额外生成默认总 plan 文件

## 输入

用户至少提供以下之一：

- 一个 change 名称
- 一段“想做什么 / 想修什么”的描述

如果只给了描述，从中推导 kebab-case 名称。

## 执行步骤

### 1. 确定 change 名称

- 如果名称和目标都清楚，直接使用
- 否则先判断是否需要 `superpowers:brainstorming`
- 收敛后再确定 kebab-case change 名

### 2. 检查是否已存在同名 change

如果同名 change 已存在：

- 不要覆盖
- 让用户决定是继续已有 change，还是改用新名称

### 3. 进入隔离工作区

在正式创建 change 前，优先调用 `superpowers:using-git-worktrees`。

如果已经处于合适的隔离 worktree，可直接继续。

### 4. 创建 change 并读取状态

运行：

```bash
openspec new change "<name>"
openspec status --change "<name>" --json
```

读取：

- `applyRequires`
- `artifacts`

目标是优先生成让 change 达到 apply-ready 所需的工件集合。

### 5. 按依赖顺序生成 artifacts

每次只处理依赖已满足、状态为 `ready` 的 artifact：

```bash
openspec instructions <artifact-id> --change "<name>" --json
```

对每个 artifact：

1. 读取 `instruction`、`template`、`outputPath`、`dependencies`
2. 先读已完成依赖工件
3. 按模板写入内容
4. 把 `context`、`rules` 当作约束使用，不要原样抄进文件
5. 写完后确认文件已落盘，再刷新 `openspec status`

达到 apply-ready 后，如果还有不阻塞 `apply` 的 `ready` artifact，默认继续生成，除非用户要求先停。

### 6. 生成 `tasks.md` 时的特殊处理

如果当前 artifact 是 `tasks`：

1. 先基于 `specs` 与 `design` 产出任务草案
2. 再调用 `superpowers:writing-plans`
3. 用它把整份 `tasks.md` 收敛成可执行任务结构

对 `writing-plans` 明确约束：

- 只改进整份 `tasks.md`
- 不生成额外 plan 文件
- 默认保持简洁，不把每个 task 扩成重型计划
- 必要时只补少量子 bullets，如 `验证`、`关联需求`

### 7. 输出状态

完成后总结：

- change 名称与路径
- 已生成的 artifacts
- 当前 readiness 状态
- 下一步动作

## Guardrails

- 目标是让 change 达到 apply-ready，而不是只创建空目录
- 正式写 artifact 前，优先进入隔离 worktree
- 生成新 artifact 前，总是先读依赖工件
- 不要把 `context` / `rules` 块原样抄进 artifacts
- 不要额外生成一套 Superpowers 文档体系
- propose 阶段不要实现业务代码
- `writing-plans` 在 propose 阶段只用于整份 `tasks.md`
