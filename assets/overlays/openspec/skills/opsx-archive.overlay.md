<!-- PRAXIS_DEVOS_OVERLAY_START -->

## Embedded Capability Contract

- `mode: embedded`
- `owner_flow: openspec-archive-change`
- `artifact_targets: openspec/changes/<change>/...`

## Rules

- `openspec-archive-change` 是唯一对用户可见的 flow
- 所有归档相关内容必须保留在当前 change 的 artifacts 中
- 禁止创建 `docs/superpowers/...`
- 不要输出第二份最终总结

## Preconditions

归档前必须完成以下事项：

1. 执行 `verification-before-completion`

2. 文档 / CodeMap 更新（必须）
   - 必须调用 `devos-docs-refresh`
   - 必须传入当前 change 上下文（proposal / design / spec / tasks / changed paths）
   - 用于更新：
     - `docs/surfaces.yaml`
     - `docs/codemaps/**`

仅当以下完成才允许归档：

- verification 完成
- `devos-docs-refresh` 已执行且成功
<!-- PRAXIS_DEVOS_OVERLAY_END -->
