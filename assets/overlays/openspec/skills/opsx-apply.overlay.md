<!-- PRAXIS_DEVOS_OVERLAY_START -->

## Embedded Capability Contract

- `mode: embedded`
- `owner_flow: openspec-apply-change`
- `artifact_targets: openspec/changes/<change>/...`

## Rules

- `openspec-apply-change` 是唯一对用户可见的 flow  
- 所有产物必须保留在当前 change 的 artifacts 中，不得创建额外目录或产物（如 `docs/superpowers/...`）  
- 不要输出第二份最终总结  

## Execution

- 所有计划与执行必须收敛在当前 change 内，严禁创建新的 change  

- 默认使用 `writing-plans` 拆解并推进任务  
- 仅当存在多个相互独立且可并行的子任务时，才使用 `subagent-driven-development` 
- 默认使用 `test-driven-development` 测试驱动开发
- 必要时使用 `requesting-code-review`

- 仅允许在当前 task 下细化  

- `writing-plans` 输出默认不落地；仅在需要形成可追踪子任务时，才写入 `tasks.md`，且必须符合 OpenSpec 格式  

## Hooks

- 遇到 bug / 失败 / 回归 / 阻塞时，先调用 `systematic-debugging`  
- 在声明完成或通过前，必须调用 `verification-before-completion` 并基于结果更新状态  

<!-- PRAXIS_DEVOS_OVERLAY_END -->