<!-- PRAXIS_DEVOS_OVERLAY_START -->

Embedded capability contract:

- `mode: embedded`
- `owner_flow: openspec-explore`
- `artifact_targets: current change artifacts only`

Framework-specific coordination for embedded Superpowers usage:

- 当前唯一可见 flow 是 `openspec-explore`。
- 计划细化、任务状态和实现备注必须保留在当前 change 的 artifacts 中；不要创建 `docs/superpowers/...`。
- 不要输出第二份最终总结。

Stage hooks:

- 范围不清、open questions 未收敛、或需要比较方案时，内部调用 `brainstorming`。
- 结论明确时，写回 `proposal.md`、`design.md`、`tasks.md` 或相关 spec，并遵守 `openspec/config.yaml` 的 artifact language policy；未声明时沿用当前 change 主语言。
- 用户仍在探索时，留在 `explore`。
- After `openspec list --json`，如果问题仍是歧义、分歧或约束缺失，继续在当前 flow 内部调用 `brainstorming`。
<!-- PRAXIS_DEVOS_OVERLAY_END -->
