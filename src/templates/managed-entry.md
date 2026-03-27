> 此区块由 Praxis DevOS 自动维护。执行 `npx praxis-devos sync` 刷新。

## Flow Selection

- 先判断是否必须进入 OpenSpec proposal flow；满足任一条件时，不要直接进入实现：
  - 中大型变更、跨模块改动、接口或兼容性调整、架构/流程重构
  - 需求不明确、存在 `open questions`、需要多方案比较或边界澄清
- 上述情况先用 `/opsx:propose`、`/opsx:explore` 进入提案/探索流程；如果范围尚未收敛，先显式加载 `superpowers:brainstorming`，收敛后继续 proposal
- 仅当任务是小范围实现、无需提案且没有明显疑问时，才可直接进入实现流程（`/opsx:apply`）
- review、审查 → 评审流程

## 强制门控

- 提案入口必须先完成 Proposal Intake，至少收敛：
  - `change target`
  - `intended behavior`
  - `scope/risk`
  - `open questions`
- `open questions` 仍阻塞提案，或存在多方案分歧时，必须显式加载 `superpowers:brainstorming`，在得到用户确认前不要进入实现
- 提案/探索阶段必须走原生 OpenSpec proposal 流程：先用 `/opsx:propose`、`/opsx:explore` 进入，再执行 `openspec new change ...` 等原生命令创建/推进 proposal
- `npx praxis-devos openspec ...` 仅用于直接 CLI 调用（例如 `validate`、`list`），不能替代原生 proposal 流程
- 如果尚未完成 Proposal Intake 或尚未执行原生 OpenSpec proposal 流程，就不要加载 `superpowers:writing-plans`；一旦已经触发 `writing-plans`，必须回到 proposal flow，把计划和文档统一收敛在当前 OpenSpec change 下
- 已批准提案进入实现前必须检查当前 Git 分支；不可直接复用时，必须显式加载 `superpowers:git-workflow` 并切换到对应实现分支
- 多步骤实现必须先显式加载 `superpowers:writing-plans`，并确保计划服务于当前已批准的 OpenSpec change，避免在 OpenSpec 之外另起文档目录
- 按计划执行时，优先显式加载 `superpowers:subagent-driven-development`；如果不做并行拆分，也至少按计划逐步执行，不要跳步
- 需要隔离工作区时，显式加载 `superpowers:using-git-worktrees`；否则按项目默认分支门禁执行
- 出现 bug、失败测试、异常、回归时，必须显式加载 `superpowers:systematic-debugging`，先做根因排查，再修改代码
- 准备完成、提 PR、合并前，必须显式加载 `superpowers:verification-before-completion` 并记录实际验证结果
