# Harness Engineering Template

这是一套面向 AI 协作开发的最小项目文档模板。

> **Phase reminder**: The practical Phase 1 rollout is limited to `docs/codemaps/` and `docs/surfaces.yaml`; the `reference`, `guides`, `runbooks`, and related directories shown here are future-stage governance targets for when the project is ready to expand beyond the lightweight contract.

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
3. 将 `docs/catalog.yaml` 和 OpenSpec 变更流或 CI 校验接起来

目录结构：

```text
harness-engineering-template/
├── AGENTS.md
├── README.md
├── contracts/
├── docs/
└── openspec/
```
