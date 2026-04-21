---
name: openspec-explore
description: 在 OpenSpec change 开始前或过程中进入探索模式。适用于用户想先 brainstorm、explore options、think through requirements、compare approaches，或还 not sure yet、不想立刻进入 propose/apply。
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.9"
---

进入探索模式。目标是把问题、边界、约束和方案收敛清楚，而不是直接实现代码。

**探索模式用于思考，不用于实现。** 你可以读文件、搜代码、调查代码库；只有在用户明确要求 capture 时，才允许把结论写回当前 change 的 OpenSpec artifact。不要写业务代码或直接实现功能。

## 核心定位

- OpenSpec 负责：change 上下文、artifacts、现有决策
- Superpowers 负责：需求与方案收敛
- `openspec-explore` 负责主导探索过程

## 精确 Skill 协议

- 命中路由时，必须调用对应的**精确 skill 名**
- 不得用语义相近的本地 skill、默认 skill、手工步骤或长段 reasoning 替代
- 如果精确 skill 不可用，必须明确报告不可用，不要静默 fallback

## Brainstorming 门禁

在 `openspec-explore` 中，`superpowers:brainstorming` 不是可选加成，而是默认的收敛能力。

只要当前探索涉及以下任一情况，就必须先真实调用一次 `superpowers:brainstorming`：

- 新 feature / 新能力方向
- 方案比较与设计取舍
- proposal / specs / design 的范围收敛
- 需要把模糊需求拆成可落地 change
- 已有 change 中重新回到设计层讨论

这次调用可以很轻量，但必须真实发生。不得用“方向已经清楚”“可以直接写 proposal/design”“先写 artifact 后补 brainstorming”等理由跳过。

收敛调用必须满足这 4 条：

- 真实加载并使用 `superpowers:brainstorming`，不得只在文字里声称“已经 brainstorm 过”
- 只把它当作当前 explore 的收敛能力，不进入它自带的 spec / plan / implementation 流程
- 不得产出 `docs/superpowers/**` 或其他旁路 spec / plan 文档
- 调用完成后必须先回到 `openspec-explore`，再决定是继续探索、建议 `/opsx:propose` / `openspec-new-change`，还是在用户明确要求 capture 时写回当前 change artifact

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

## 退出条件

- 如果结论尚未收敛：继续探索、比较方案、补充约束
- 如果结论已经收敛但尚无 change：停止在建议层，明确提示下一步使用 `openspec-propose` 或 `openspec-new-change`
- 如果结论已经收敛且存在当前 change：可以建议更新对应 artifact；只有用户明确要求后，才在确认 artifact 上下文后写当前 change 下的目标文件

## 最小示例

```text
用户: /opsx:explore 云市场增加 fieldid

1. 读取代码和 `openspec list --json`
2. 调用 `superpowers:brainstorming` 收敛范围、方案和风险
3. 回到 `openspec-explore` 总结结论
4. 输出下一步建议：
   - 继续探索，或
   - 建议 `/opsx:propose`，或
   - 用户明确要求 capture 时，写回当前 change artifact
```

## 常见进入方式

- 用户带来模糊想法：先用 `superpowers:brainstorming` 缩小问题空间
- 用户带来复杂但混乱的现状：先读代码和 artifacts，再梳理现状与纠缠点
- 用户在 change 中途卡住：把问题拉回设计层，再用 `superpowers:brainstorming` 收敛

## Guardrails

- 探索阶段不实现业务代码
- 不要把“边界清晰”当作跳过 `superpowers:brainstorming` 的理由
- 问题还在发散时允许继续探索；没有共识前不要写死进 artifacts
- explore 阶段默认不创建、不更新 artifact；只有用户明确要求 capture 时，才允许写回当前 change 的原生 artifact
- 不要把 explore 的确认语句直接升级成“开始写 spec 文档”“开始实施”或其他阶段切换
