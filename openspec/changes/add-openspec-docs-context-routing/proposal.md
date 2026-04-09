## Why

Praxis 现在已经能为项目生成 `docs/surfaces.yaml` 和 `docs/codemaps/**`，但这些文档还主要停留在“被建议阅读”的层面，没有形成稳定的 AI 消费协议，也没有和 OpenSpec 的变更流转联动。结果是文档生成了，但不会稳定进入日常任务上下文，变更完成后也缺少明确的 docs refresh 时机。

## What Changes

- 新增一套 docs context routing 约定，定义 AI 在日常任务中如何优先读取 `docs/surfaces.yaml`、`docs/codemaps/project-overview.md`、`module-map.md` 和模块级 codemap。
- 新增 OpenSpec 联动的 docs sync 约定，定义在哪些 propose/apply/archive 时机构建 docs context pack，以及哪些变更需要触发 `devos-docs` refresh。
- 让 `devos-docs` 在 `mode=refresh` 下能够接收 OpenSpec change context、变更文件集合和模块定位结果，而不仅仅是全量项目扫描。
- 保持当前文档范围克制，仍然只围绕 `docs/surfaces.yaml` 和 `docs/codemaps/**`，不扩展到 reference / guides / runbooks。

## Capabilities

### New Capabilities
- `docs-context-routing`: 为 AI 任务定义稳定的 docs 读取顺序、模块路由规则和 context pack 边界。
- `openspec-docs-sync`: 定义 OpenSpec change 与 `devos-docs` refresh 的联动时机、输入上下文和验收规则。

### Modified Capabilities
- None.

## Impact

- 影响 `assets/skills/devos-docs/` 中 `devos-docs` skill 的输入 contract，以及 `assets/skills/opsx-apply/`、`assets/skills/opsx-archive/` 的 OpenSpec 流程 guidance。
- 影响 `src/core/praxis-devos.js` 中 docs compatibility path 与 handoff/validation 逻辑。
- 影响 `src/templates/managed-entry.md`、`assets/commands/*.md` 等可投影资产，以及后续宿主集成层的 context packing 行为。
- 影响测试策略，需要新增 docs context routing、OpenSpec refresh 时机和非破坏性 refresh 的覆盖。
