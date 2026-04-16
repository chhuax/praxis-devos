<!-- PRAXIS_DEVOS_OVERLAY_START -->

## Embedded Capability Contract

- `mode: embedded`
- `owner_flow: openspec-propose`
- `artifact_targets: openspec/changes/<change>/...`

## Rules

- `openspec-propose` 是唯一对用户可见的 flow
- 所有计划、分析、决策、任务状态必须写入当前 change 的 artifacts
- 禁止创建 `docs/superpowers/...`
- 不要输出第二份最终总结

## Execution

- 所有分析、设计与决策必须收敛在当前 change 内，严禁创建新的 change

- 请求不清晰或存在 open questions 时，必须先澄清或调用 `brainstorming`
- 设计决策、任务拆分、范围变化，必须持续写回当前 change

- 生成或修改 OpenSpec artifacts 时，必须遵守 `openspec/config.yaml` 的 artifact language policy

- 在 proposal / design 中必须记录简短的 `Docs Impact`，并与后续 docs / API tasks 保持一致

## Context Loading

- 在进行大规模分析或设计前，优先加载 docs context：
  - `docs/surfaces.yaml`
  - `docs/codemaps/project-overview.md`
  - 多模块项目再加载：`docs/codemaps/module-map.md`
  - 仅在路由明确时加载：`docs/codemaps/modules/<artifactId>.md`

## Hooks

- 进入 propose 阶段时：
  - 若当前在 `main` / `master`，应建议使用 `using-git-worktrees` 创建隔离工作区

- 若出现以下情况，应调用 `brainstorming`：
  - 需求模糊
  - open questions 较多
  - 存在多种可行方案需要权衡

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