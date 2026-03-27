User: /opsx:propose add order search filters

Assistant: 我先进入 proposal flow。

## Proposal Intake
- change target: order-search API
- intended behavior: 为订单查询增加状态和时间区间过滤
- scope/risk: 影响查询接口、仓储过滤条件和接口测试
- open questions: 过滤字段是否允许组合使用，存在边界分歧

Assistant: 我会按原生 OpenSpec proposal 流程执行 `openspec new change "add-order-search-filters"`，然后继续生成 proposal artifacts。
Assistant: 这个提案存在方案比较，我先收敛范围并记录边界收敛结论，结论统一写回当前 change artifacts。
Assistant: 已创建 proposal.md、spec delta、tasks.md。

User: 提案通过，继续实现。

Assistant: 我已进入 implementation flow。当前 Git 分支是 main，所以先检查分支并切换到 feature/add-order-search-filters。
Assistant: 这是一个多步骤任务，我会先整理当前 change 下的实施计划。
1. 更新查询参数与 capability 行为
2. 调整仓储过滤实现
3. 补充接口与集成测试

Assistant: 集成测试失败，出现 bug；我先做根因排查。
- 复现步骤: 使用状态+时间区间组合过滤
- 假设: 仓储层忽略了结束时间边界
- 验证假设: 修正 SQL 条件后测试通过

Assistant: 还有两个独立子任务可以并行处理，所以拆成 API 文档和测试修正两个并行子任务。

Assistant: 准备提交前，我先执行完整验证。
Verification results:
- npm test
- git diff --check
- openspec validate add-order-search-filters --strict --no-interactive
