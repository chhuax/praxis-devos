<!-- PRAXIS_DEVOS_OVERLAY_START -->
归档阶段约束（含 CodeMap 更新）

- mode: embedded
- owner_flow: openspec-archive-change

规则：
- 仅在当前 flow 内执行
- 所有内容写入当前 change
- 禁止创建 docs/superpowers
- 禁止输出额外总结

归档前必须：

1. 执行 verification-before-completion

2. 文档 / CodeMap 更新（必须）
   - 必须调用 `devos-docs-refresh`
   - 且必须传入当前 change 上下文（proposal / design / spec / tasks / 变更路径）
   - 用于更新：
     - docs/surfaces.yaml
     - docs/codemaps/**

仅当以下完成才允许归档：
- verification 完成
- devos-docs-refresh 已执行且成功
<!-- PRAXIS_DEVOS_OVERLAY_END -->