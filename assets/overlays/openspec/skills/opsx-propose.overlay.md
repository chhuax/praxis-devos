<!-- PRAXIS_DEVOS_OVERLAY_START -->
Embedded capability contract:

- `mode: embedded`
- `owner_flow: openspec-propose`
- `artifact_targets: openspec/changes/<change>/...`

Framework-specific coordination for embedded Superpowers usage:

- 当前唯一可见 flow 是 `openspec-propose`。
- 计划细化、任务状态和实现备注必须保留在当前 change 的 artifacts 中；不要创建 `docs/superpowers/...`。
- 不要输出第二份最终总结。

Stage hooks:

- 进入 propose 时先看分支；若在 `main`/`master`，建议先用 `using-git-worktrees` 建隔离工作区。
- 请求仍模糊或 open questions 很多时，内部调用 `brainstorming`。
- 项目 docs 已存在时，广泛扫仓库前先读 docs context pack：`docs/surfaces.yaml`、`docs/codemaps/project-overview.md`；多模块项目再读 `docs/codemaps/module-map.md`；仅在路由明确时读 `docs/codemaps/modules/<artifactId>.md`。
- 生成或修改 OpenSpec artifacts 时，遵守 `openspec/config.yaml` 的 artifact language policy。
- 在 proposal / design 中记录简短 `Docs Impact`，并保持它与正式黑盒 artifact 及条件化 API docs task 一致。
- 设计决策、任务拆分、范围变化都写回当前 change；若仍有关键歧义或缺上下文，先内部调用 `brainstorming` 再继续。
<!-- PRAXIS_DEVOS_OVERLAY_END -->
