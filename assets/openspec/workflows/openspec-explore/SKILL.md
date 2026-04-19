---
name: openspec-explore
description: 在 OpenSpec 变更开始前或过程中进入探索模式。适用于需求尚未收敛、方案需要比较、约束需要澄清，或用户想先讨论方向而不是立刻实现。
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.1"
---

进入探索模式。目标是把问题、边界、约束和方案收敛清楚，而不是直接实现代码。

**探索模式用于思考，不用于实现。** 你可以读文件、搜代码、调查代码库，也可以创建或更新 OpenSpec artifacts；但不要写业务代码或直接实现功能。

## 核心定位

- OpenSpec 负责：change 上下文、artifacts、现有决策
- Superpowers 负责：需求与方案收敛
- `openspec-explore` 负责主导探索过程

## 精确 Skill 协议

- 命中路由时，必须调用对应的**精确 skill 名**
- 不得用语义相近的本地 skill、默认 skill、手工步骤或长段 reasoning 替代
- 如果精确 skill 不可用，必须明确报告不可用，不要静默 fallback

## 默认收敛门禁

在 `openspec-explore` 中，`superpowers:brainstorming` 不是可选加成，而是**默认收敛门禁**。

只要当前探索涉及以下任一情况，就必须先真实调用一次 `superpowers:brainstorming`，再继续创建或更新 OpenSpec artifacts：

- 新 feature / 新能力方向
- 方案比较与设计取舍
- proposal / specs / design 的范围收敛
- 需要把模糊需求拆成可落地 change
- 已有 change 中重新回到设计层讨论

这次调用可以很轻量，但必须真实发生。

不得用以下理由跳过：

- “方向已经很清楚，可以直接写 proposal”
- “设计边界已经清楚，可以直接写 design”
- “先把 artifact 写出来，后面再补 brainstorming”

正确顺序：

1. 在 `openspec-explore` 中调用 `superpowers:brainstorming`
2. 收敛方向、边界、约束、成功标准
3. 再决定是起新 change，还是继续 proposal / specs / design / tasks

## OpenSpec 上下文

开始时先看当前有哪些 change：

```bash
openspec list --json
```

如果用户提到了某个 change，或当前讨论明显与某个 change 强相关：

- 先读相关 artifacts 获取上下文
- 在对话里自然引用已有 proposal / design / tasks / specs
- 当关键结论形成时，再建议是否写回 artifact

优先读取：

- `openspec/changes/<name>/proposal.md`
- `openspec/changes/<name>/design.md`
- `openspec/changes/<name>/tasks.md`
- 相关 spec

## 可以做什么

- 澄清问题，挑战隐藏假设
- 调查代码结构、集成点、现有模式
- 比较多个方案并做取舍分析
- 用表格、ASCII 图、依赖图帮助理解
- 指出风险、未知项和需要补充调查的问题
- 在结论形成后，建议回写 proposal / design / spec / tasks

## Artifact 原则

- 可以创建或更新 OpenSpec artifacts，因为这属于沉淀思考
- 不要把未收敛结论过早固化进 artifacts
- 不要额外生成一套独立的 Superpowers 文档体系
- 如果讨论已经收敛，应主动建议写回合适的 artifact

## 常见进入方式

- 用户带来模糊想法：先用 `superpowers:brainstorming` 缩小问题空间
- 用户带来复杂但混乱的现状：先读代码和 artifacts，再梳理现状与纠缠点
- 用户在 change 中途卡住：把问题拉回设计层，再用 `superpowers:brainstorming` 收敛

## Guardrails

- 探索阶段不实现业务代码
- 命中收敛路由时必须真实调用 `superpowers:brainstorming`
- 不要把“边界清晰”当作跳过 `brainstorming` 的理由
- 不要强行结构化；问题还在发散时，允许继续发散
- 不要在没有共识前就把未收敛结论写死进 artifacts
