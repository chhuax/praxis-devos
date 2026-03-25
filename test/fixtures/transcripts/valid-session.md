User: /change add order search filters

Assistant: 我先进入 proposal flow。

## Proposal Intake
- change target: order-search API
- intended behavior: 为订单查询增加状态和时间区间过滤
- scope/risk: 影响查询接口、仓储过滤条件和接口测试
- open questions: 过滤字段是否允许组合使用，存在边界分歧

Assistant: 我会读取 openspec/AGENTS.md，并显式加载 openspec skill。
Assistant: 这个提案存在方案比较，我先进入 brainstorming，收敛范围并记录边界收敛结论。
Assistant: 已创建 proposal.md、spec delta、tasks.md。

User: 提案通过，继续实现。

Assistant: 我已进入 implementation flow。当前 Git 分支是 main，所以先加载 git-workflow，切换到 feature/add-order-search-filters。
Assistant: 这是一个多步骤任务，我会使用 writing-plans 输出实施计划。
1. 更新查询参数与 capability 行为
2. 调整仓储过滤实现
3. 补充接口与集成测试

Assistant: 集成测试失败，出现 bug；我开始使用 systematic-debugging。
- 复现步骤: 使用状态+时间区间组合过滤
- 假设: 仓储层忽略了结束时间边界
- 验证假设: 修正 SQL 条件后测试通过

Assistant: 还有两个独立子任务可以并行处理，所以进入 subagent-driven-development，拆成 API 文档和测试修正两个并行子任务。

Assistant: 准备提交前，我先执行 verification-before-completion。
Verification results:
- npm test
- git diff --check
- praxis-devos openspec validate add-order-search-filters --strict --no-interactive
