> 此区块由 Praxis DevOS 自动维护。执行 `npx praxis-devos sync` 刷新。

## Flow Selection

- `/opsx:propose`、`/opsx:explore` → 提案/探索流程
- 代码实现、调试、缺陷修复 → 实现流程（`/opsx:apply`）
- review、审查 → 评审流程
- 意图不清、范围有分歧 → 先澄清，不要直接写代码

## 强制门控

- 提案入口必须先完成 Proposal Intake，至少收敛：
  - `change target`
  - `intended behavior`
  - `scope/risk`
  - `open questions`
- `open questions` 仍阻塞提案，或存在多方案分歧时，必须显式加载 `superpowers:brainstorming`，在得到用户确认前不要进入实现
- 已批准提案进入实现前必须检查当前 Git 分支；不可直接复用时，必须显式加载 `superpowers:git-workflow` 并切换到对应实现分支
- 多步骤实现必须先显式加载 `superpowers:writing-plans`，输出带文件路径、测试和命令的实施计划
- 按计划执行时，优先显式加载 `superpowers:subagent-driven-development`；如果不做并行拆分，也至少按计划逐步执行，不要跳步
- 需要隔离工作区时，显式加载 `superpowers:using-git-worktrees`；否则按项目默认分支门禁执行
- 出现 bug、失败测试、异常、回归时，必须显式加载 `superpowers:systematic-debugging`，先做根因排查，再修改代码
- 准备完成、提 PR、合并前，必须显式加载 `superpowers:verification-before-completion` 并记录实际验证结果
- 提案/探索阶段必须走原生 OpenSpec proposal 流程：先用 `/opsx:propose`、`/opsx:explore` 进入，再执行 `openspec new change ...` 等原生命令创建/推进 proposal
- `npx praxis-devos openspec ...` 仅用于直接 CLI 调用（例如 `validate`、`list`），不能替代原生 proposal 流程
