# OpenSpec 与 Superpowers 协调协议

## 1. 目标

本协议用于协调 `OpenSpec` 与 `superpowers` 两套 skill 体系，避免同一轮对话中出现以下问题：

- 多个主流程同时生效
- 重复的流程公告
- 重复的阶段总结
- 在 `OpenSpec` 之外另起设计文档、计划文档或实现流程

原则上：

- `OpenSpec` 负责“当前处于什么阶段”
- `superpowers` 负责“当前阶段内部用什么方法做”

## 2. 角色定义

### 2.1 OpenSpec

`OpenSpec` 是外层流程系统，负责：

- 管理 `explore / propose / apply / archive`
- 决定是否需要 proposal
- 决定是否允许进入实现
- 决定是否允许归档

### 2.2 Superpowers

`superpowers` 是内层能力系统，负责提供方法论能力，例如：

- `brainstorming`
- `writing-plans`
- `systematic-debugging`
- `verification-before-completion`
- `subagent-driven-development`

这些 skill 只在当前 `OpenSpec` 阶段需要时调用，不负责重新定义阶段本身。

## 3. 单主流程原则

任一时刻，只允许一个“主流程 skill”对用户可见。

主流程 skill 仅限：

- `opsx-explore`
- `opsx-propose`
- `opsx-apply`
- `opsx-archive`

`superpowers` 中的 skill 在 `OpenSpec` 上下文中不得升级为第二个主流程。

## 4. 优先级

当规则冲突时，按以下优先级执行：

1. 用户显式指令
2. 仓库级 `AGENTS.md`
3. 当前激活的 `OpenSpec` 主流程 skill
4. `superpowers` 过程型 skill
5. 其他通用 skill / 默认行为

解释：

- 一旦已进入 `OpenSpec` 流程，`OpenSpec` 对阶段推进拥有更高优先级
- `superpowers` 只能补充方法，不能改写阶段机

## 5. 触发规则

### 5.1 何时由 OpenSpec 接管

满足任一条件时，优先进入 `OpenSpec`：

- 用户显式使用 `/opsx:*`、`/change`、`/proposal`
- 任务属于需求探索、提案、按 change 实现、归档
- 仓库 `AGENTS.md` 已要求 proposal/apply/archive flow
- 当前对话已明确关联某个 active change

### 5.2 何时只用 Superpowers

仅在以下情况，不进入 `OpenSpec` 主流程：

- 纯局部实现
- 小型 bugfix
- 局部调试
- review
- 不涉及 change 生命周期管理

前提是仓库级规则未要求必须先走 proposal flow。

### 5.3 何时直接执行，不升级为工程流程

满足以下条件时，保持 direct-output 路径，不强制进入 `OpenSpec`，也不强制套用工程化的 `brainstorming` / `writing-plans` 门禁：

- 纯写作
- 改写 / 润色
- 翻译
- 总结用户已提供内容

边界条件：

- 一旦请求同时涉及代码、行为、接口、兼容性、架构或流程变化，仍按工程任务处理
- 如果用户明确要求 proposal / explore / implementation flow，则按对应 OpenSpec 阶段执行

## 6. OpenSpec 上下文中的 Superpowers 适配规则

一旦进入 `OpenSpec`，以下规则生效。

### 6.1 Brainstorming

- 只作为 `explore / propose` 阶段的辅助方法
- 不得创建独立的 `docs/superpowers/...` 设计文档
- 设计结论必须写回当前 `openspec/changes/<change>/...`

### 6.2 Writing Plans

- 只用于细化当前 change 的实施计划
- 不得在 `OpenSpec` 之外另起计划目录或独立计划文档

### 6.3 Systematic Debugging

- 可作为 `apply` 阶段内的调试方法
- 不改变当前仍属于 `apply` 阶段这一事实

### 6.4 Verification Before Completion

- 可作为 `apply` 或 `archive` 前的校验方法
- 不单独开启新的完成流程

### 6.5 Subagent Driven Development

- 可作为 `apply` 阶段内的执行手段
- 子任务的上下文、产物和状态都必须归属于当前 change

## 7. 用户可见输出规则

为避免重复，用户可见输出只保留一层主流程表达。

### 7.1 允许显示

当前主流程可以显示：

- 当前阶段
- 当前 change
- 当前动作
- 当前阻塞或结果

### 7.2 不允许重复显示

辅助 skill 不应再次单独输出：

- `Using [skill] ...`
- 第二套流程启动词
- 与主流程重复的总结
- 与上一条 commentary 几乎同义的 final recap

### 7.3 建议格式

同一轮中，最多保留以下一类开场说明：

- `当前进入 opsx-apply，使用 change: xxx`
- `当前在 proposal / explore 阶段，先收敛 open questions`

不要再附加：

- `Using brainstorming...`
- `Using writing-plans...`
- `Using verification-before-completion...`

除非用户明确询问“当前用了什么 skill”。

## 8. 阶段映射

推荐映射如下：

- `opsx-explore`
  - 可隐式使用：`brainstorming`
- `opsx-propose`
  - 可隐式使用：`brainstorming`
- `opsx-apply`
  - 可隐式使用：`writing-plans`、`systematic-debugging`、`subagent-driven-development`
- `opsx-archive`
  - 可隐式使用：`verification-before-completion`

这里的“隐式使用”指内部遵循其方法，不额外向用户宣告第二层流程。

## 9. 状态传递规则

当一个辅助 skill 在 `OpenSpec` 内运行时，必须继承以下上下文：

- 当前主流程类型
- 当前 change id
- 当前阶段目标
- 当前 artifacts 位置
- 当前输出约束

辅助 skill 不得自行假设：

- 新建独立工作流
- 新建独立文档根目录
- 改变 change 归属
- 跳出当前阶段

## 10. 冲突处理

若 `superpowers` skill 的默认要求与 `OpenSpec` 冲突，按以下方式降级：

- 保留其方法论
- 去除其独立 workflow
- 去除其独立公告
- 去除其独立产物目录
- 去除其重复总结

一句话概括：

保留做事方法，移除流程主权。

## 11. 建议加入 AGENTS.md 的显式条款

可将以下内容加入仓库级 `AGENTS.md`：

```md
## OpenSpec 与 Superpowers 协调

- 进入 OpenSpec flow 后，OpenSpec skill 是唯一主流程。
- superpowers 仅作为当前 OpenSpec 阶段的辅助能力使用，不得再次向用户宣告独立流程。
- 在 OpenSpec 上下文中，brainstorming / writing-plans / debugging / verification 的产物和结论必须收敛到当前 change，不得写入独立的 superpowers 文档路径。
- 同一轮对话只保留一层用户可见的流程状态说明，避免重复公告、重复总结、重复收尾。
```

## 12. 最小改造建议

若后续要真正调整 skill，建议优先改以下几处：

1. `using-superpowers`
   - 增加规则：若已处于更高层 workflow，例如 `OpenSpec`，则不再公告 `Using [skill]`
2. `brainstorming`
   - 增加规则：若当前处于 `OpenSpec` flow，设计输出写入当前 change，不进入独立 spec 路径
3. `opsx-apply`
   - 将 `Using change: <name>` 从默认显示改为必要时显示

## 13. 核心结论

一句话总结本协议：

`superpowers` 回答“怎么做”，`OpenSpec` 回答“现在处于哪一步”。

进入 `OpenSpec` 之后，`OpenSpec` 是唯一对外可见的流程控制层，`superpowers` 仅作为内部方法论与执行辅助手段。
