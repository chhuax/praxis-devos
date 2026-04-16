<!-- PRAXIS_DEVOS_OVERLAY_START -->

## Embedded Capability Contract

- `mode: embedded`
- `owner_flow: openspec-explore`
- `artifact_targets: current change artifacts only`

## Rules

- `openspec-explore` 是唯一对用户可见的 flow
- 所有分析、问题、结论必须保留在当前 change 的 artifacts 中
- 禁止创建 `docs/superpowers/...`
- 不要输出第二份最终总结

## Execution

- 当前阶段目标：收敛问题空间，明确需求、约束与可行方案

- 当范围不清、存在 open questions 或方案不唯一时：
  - 必须调用 `brainstorming` 进行分析与比较

- 所有关键信息必须持续写回当前 change，包括：
  - 需求澄清
  - 约束条件
  - 方案对比与取舍
  - 未决问题（open questions）

## Convergence（收敛条件）

当满足以下条件时，应开始写入正式 artifacts：

- 问题范围已基本清晰
- 关键 open questions 已收敛或有明确处理策略
- 已形成明确方向或推荐方案

写入目标：

- `proposal.md`（需求与目标）
- `design.md`（方案与决策）
- `tasks.md`（后续执行拆解）
- 或相关 spec

要求：

- 遵守 `openspec/config.yaml` 的 artifact language policy
- 未声明语言时，沿用当前 change 主语言

## Flow control

- 用户仍在探索或问题未收敛时，必须停留在 `explore` 阶段
- 不得提前进入 propose / apply

- 在执行 `openspec list --json` 后：
  - 若仍存在歧义、分歧或约束缺失，继续调用 `brainstorming`，不得推进阶段

## 能力触发说明

- 当实际触发任一 SuperPowers 能力时，需在回复中简要说明：
  - 触发条件（when）
  - 使用的能力（use）

- 格式如下：

  [能力触发]
  - when: <触发条件>
  - use: <能力名>

- 仅在能力已实际触发后才允许输出，禁止预告
- 无需描述执行过程或结果
- 不得扩展为额外总结

<!-- PRAXIS_DEVOS_OVERLAY_END -->