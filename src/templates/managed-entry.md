> 此区块由 Praxis DevOS 自动维护。执行 `npx praxis-devos sync` 刷新。

## Flow Selection

- 先区分任务类型：纯写作、改写、翻译、总结等直接产出型请求，默认直接执行；不要为这类任务强制进入 OpenSpec proposal flow，也不要套用工程化设计/计划门禁
- 如果请求同时涉及代码、行为、接口、兼容性、架构或流程变化，则按工程任务处理，继续应用 OpenSpec 与阶段内方法门禁
- 先判断是否必须进入 OpenSpec proposal flow；满足任一条件时，不要直接进入实现：
  - 中大型变更、跨模块改动、接口或兼容性调整、架构/流程重构
  - 需求不明确、存在 `open questions`、需要多方案比较或边界澄清
- 上述情况先用 `/opsx:propose`、`/opsx:explore` 进入提案/探索流程；如果范围尚未收敛，先在当前 OpenSpec 阶段内完成范围澄清与方案比较，再继续 proposal
- 仅当任务是小范围实现、无需提案且没有明显疑问时，才可直接进入实现流程（`/opsx:apply`）
- review、审查 → 评审流程

## OpenSpec 与 Superpowers 协调

- 进入 OpenSpec flow 后，OpenSpec skill 是唯一主流程；`opsx-explore`、`opsx-propose`、`opsx-apply`、`opsx-archive` 负责对外阶段推进
- superpowers 仅作为当前 OpenSpec 阶段的辅助能力使用，只回答“怎么做”，不能改写阶段机或另起独立 workflow
- 在 OpenSpec 上下文中，避免再次向用户宣告 `Using [skill]` 或 `superpowers:<skill>`；同一轮对话只保留一层主流程状态说明
- 所有阶段内的方案澄清、实施计划、调试排查、完成前验证结论都必须收敛到当前 `openspec/changes/<change>/...`，不得写入独立的 `docs/superpowers/...` 路径

## 强制门控

- 提案入口必须先完成 Proposal Intake，至少收敛：
  - `change target`
  - `intended behavior`
  - `scope/risk`
  - `open questions`
- `open questions` 仍阻塞提案，或存在多方案分歧时，必须先在当前 proposal/explore 阶段内完成范围澄清与方案比较，在得到用户确认前不要进入实现
- 提案/探索阶段必须走原生 OpenSpec proposal 流程：先用 `/opsx:propose`、`/opsx:explore` 进入，再执行 `openspec new change ...` 等原生命令创建/推进 proposal
- 如果尚未完成 Proposal Intake 或尚未执行原生 OpenSpec proposal 流程，就不要进入多步骤实施计划；一旦已经产生计划，必须回到 proposal flow，把计划和文档统一收敛在当前 OpenSpec change 下
- 已批准提案进入实现前必须检查当前 Git 分支；不可直接复用时，先完成分支切换，再进入实现
- 多步骤实现必须先整理当前 change 的实施计划，并确保计划服务于当前已批准的 OpenSpec change，避免在 OpenSpec 之外另起文档目录
- 按计划执行时，优先采用并行拆分或逐步执行，但子任务上下文、产物和状态都必须归属于当前 change
- 需要隔离工作区时，先准备独立工作区；否则按项目默认分支门禁执行
- 出现 bug、失败测试、异常、回归时，先做根因排查，再修改代码，不改变当前仍属于 `apply` 阶段这一事实
- 准备完成、提 PR、合并前，必须执行完整验证并记录实际验证结果；验证是完成前校验，不是第二套完成流程
