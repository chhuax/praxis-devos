<!-- PRAXIS_DEVOS_OVERLAY_START -->

Embedded capability contract:

- `mode: embedded`
- `owner_flow: openspec-apply-change`
- `artifact_targets: openspec/changes/<change>/...`

Framework-specific coordination for embedded Superpowers usage:

- 在这个阶段里，`openspec-apply-change` 仍然是唯一对用户可见的 flow。
- 计划细化、任务状态和实现备注必须保留在当前 change 的 artifacts 中；不要创建 `docs/superpowers/...`。
- 不要输出第二份最终总结。

Stage hooks:

- 在第一次实际代码改动前，先在内部调用 `test-driven-development`，用失败测试驱动实现。
- 如果工作明显是多步骤且需要更细的拆解，在内部调用 `writing-plans`，但计划仍然收敛在当前 change 上下文内,可以在对应的 task 下细化子任务，但不要创建新的 change。
- 如果遇到 bug、失败测试、回归、异常或阻塞，先在内部调用 `systematic-debugging`，再决定修复方案。
- 如果多个子任务可以独立推进，在内部调用 `subagent-driven-development` 做并行执行，但所有输出仍归属同一个 change。
- 在声明工作完成、问题已修复或测试通过之前，先在内部调用 `verification-before-completion`，并基于真实验证结果更新状态。
<!-- PRAXIS_DEVOS_OVERLAY_END -->
