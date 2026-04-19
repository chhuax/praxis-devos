---
name: openspec-continue-change
description: 继续推进一个 OpenSpec change，创建下一个 ready artifact。适用于用户希望继续推进 proposal、specs、design、tasks 等工件，但暂不进入代码实现。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.2"
  generatedBy: "custom"
---

继续推进一个 OpenSpec change，但一次只创建**下一个 ready artifact**。

## 核心定位

- OpenSpec 负责：change 选择、artifact 依赖、status、instructions
- Superpowers 负责：收敛需求与拆解任务
- 每次只推进一个 artifact
- continue 阶段不实现业务代码

## 精确 Skill 协议

- 命中路由时，必须调用对应的**精确 skill 名**
- 不得用相近的本地 skill、todo list、手工拆点或长段 reasoning 替代
- 如果精确 skill 不可用，必须明确报告，并暂停当前路由

## 能力路由

- 如果当前 artifact 依赖不清晰的目标、边界或方案，先用 `superpowers:brainstorming`
- 如果当前 artifact 是 `tasks.md`，默认调用 `superpowers:writing-plans`
- continue 阶段的 `writing-plans` 只服务于**整份 `tasks.md`**
- 不要生成 `docs/superpowers/plans/...` 或额外总 plan

## 输入

可选指定一个 change 名称；如果未指定，先确定要继续哪个 change。

## 执行步骤

### 1. 选择 change

- 如果用户给了 change 名称，直接使用
- 否则运行 `openspec list --json`
- 如果有多个候选，不要猜，让用户选择

### 2. 检查状态

运行：

```bash
openspec status --change "<name>" --json
```

读取：

- `schemaName`
- `artifacts`
- `isComplete`

如果 `isComplete: true`，展示最终状态并停止。

### 3. 选择当前 ready artifact

- 如果存在 `status: "ready"` 的 artifact，只创建第一个
- 如果没有 `ready` artifact`，展示当前状态并说明无法继续推进

### 4. 读取指令并生成 artifact

运行：

```bash
openspec instructions <artifact-id> --change "<name>" --json
```

然后：

1. 读取依赖工件
2. 按 `template` 结构写入文件
3. 把 `context` 与 `rules` 当作约束使用
4. 不要把这些约束块原样抄进 artifact

### 5. 按 artifact 类型应用路由

- proposal / specs / design：如果继续写只会制造伪确定性，先调用 `superpowers:brainstorming`
- tasks：先生成草案，再调用 `superpowers:writing-plans` 把整份 `tasks.md` 收敛成可执行任务结构

对 `writing-plans` 明确约束：

- 只改进当前 change 的 `tasks.md`
- 不要为 apply 阶段单个 task 写微计划
- 不要生成独立总 plan 文件
- 默认保持任务清单简洁

### 6. 展示进度

创建完一个 artifact 后重新运行：

```bash
openspec status --change "<name>"
```

展示：

- 本次创建了哪个 artifact
- 当前 schema
- 当前完成进度
- 接下来解锁了哪些 artifact

## Guardrails

- 每次只创建一个 artifact
- 总是先读依赖工件，再创建新 artifact
- 不要跳过 artifact 或乱序创建
- 如果 context 不清楚，先收敛，不要硬写
- 验证文件已写到正确位置后，再汇报进度
- continue 阶段不要实现业务代码
- `writing-plans` 在 continue 阶段只用于整份 `tasks.md`
