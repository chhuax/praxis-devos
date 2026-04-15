<!-- PRAXIS_DEVOS_OVERLAY_START -->
Embedded capability contract:

- `mode: embedded`
- `owner_flow: openspec-archive-change`
- `artifact_targets: openspec/changes/<change>/...`

Framework-specific coordination for embedded Superpowers usage:

- 当前唯一可见 flow 是 `openspec-archive-change`。
- 计划细化、任务状态和实现备注必须保留在当前 change 的 artifacts 中；不要创建 `docs/superpowers/...`。
- 不要输出第二份最终总结。

Stage hooks:

- 在说 change 已可归档前，内部调用 `verification-before-completion`。
- 检查 schema 要求的正式 artifact 是否齐备；若当前 schema 要求 `blackbox-test.md`，归档前必须确认其存在且内容有效。
- 归档前，如变更影响项目级 docs / codemap 稳定视图，调用 `devos-docs` 的 `mode=refresh` 完成联动更新。
<!-- PRAXIS_DEVOS_OVERLAY_END -->