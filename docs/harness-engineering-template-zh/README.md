# Harness Engineering 中文模板

这是一套面向 AI 协作开发的最小项目文档模板。

> **阶段提醒**：当前 Phase 1 实际只落地 `docs/codemaps/` + `docs/surfaces.yaml`，模板里展示的 `reference`、`guides`、`runbooks` 等目录属于后续迭代计划，用于帮助团队在准备下一阶段治理时快速填充结构。

说明：

- 本目录本身位于当前仓库的 `docs/` 下，只是为了沉淀模板。
- 本目录内部展示的是“目标项目根目录模板结构”，不是当前仓库真实目录结构的迁移结果。
- 因此这里出现的 `openspec/`、`contracts/`、`docs/` 都应理解为“目标项目根目录下应有这些目录”。

目标：

- `AGENTS.md` 只做导航，不做百科
- `contracts/` 作为对外行为的事实源
- `docs/reference/` 承载参考文档
- `docs/guides/` 承载接入和操作说明
- `docs/runbooks/` 承载排障与恢复流程
- `docs/adr/` 承载设计决策

推荐使用方式：

1. 将本目录内容复制到目标项目根目录
2. 用真实命令、真实路径、真实契约替换占位内容
3. 将 `docs/catalog.yaml` 与 OpenSpec 变更流或 CI 校验接起来

目录结构：

```text
harness-engineering-template-zh/
├── AGENTS.md
├── README.md
├── contracts/
├── docs/
└── openspec/
```
