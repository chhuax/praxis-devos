## Why

`devos-docs` 已经能给 AI 提供轻量项目地图，但当前生成的 codemap 仍然偏向目录导航，对功能开发和排障来说信息密度不够。与此同时，OpenSpec 的 docs refresh 判断也还缺少比 changed paths 更明确的信号，容易让文档维护和 proposal/design 的真实意图脱节。

另外，当前 OpenSpec proposal/design/tasks 等工件没有统一语言策略，实际产物会随着模型默认习惯在中文和英文之间漂移。这会让同一个 change 内的工件读起来不一致，也不利于团队形成稳定约定。

## What Changes

- 强化 `devos-docs` 的生成契约，让 `project-overview.md`、`module-map.md` 和 `modules/*.md` 承载更高密度的 AI-first 信息，例如架构、运行流转、问题路由和 edit hazards。
- 保持当前 writeback boundary 仍然限定在 `docs/surfaces.yaml` 和 `docs/codemaps/**`，但要求现有 codemap 文件吸收最影响决策的横切上下文，而不是继续停留在薄弱的文件导航层。
- 在 OpenSpec proposal/design 工件中加入简短的 `Docs Impact` 区块，用显式声明表达 docs refresh 意图。
- 更新 OpenSpec apply/archive 行为，把 `Docs Impact` 作为 docs refresh routing 的第一信号，changed paths 只作为 fallback。
- 为 OpenSpec 工件增加“语言必须统一但可配置”的约束：默认从 `openspec/config.yaml` 读取项目级 artifact language policy，并要求同一 change 下的 proposal/design/tasks/spec artifacts 保持一致语言。
- 要求 archive 阶段在 `Docs Impact` 命中 refresh-sensitive 变更时，必须给出 refresh evidence 或显式 waiver。

## Capabilities

### New Capabilities
- `ai-first-codemap-guidance`：定义现有 lightweight docs contract 下 codemap 工件的最小语义密度和 routing 质量门槛。

### Modified Capabilities
- `docs-context-routing`：docs context pack 继续保持 module-first，并用声明式 docs impact hints 辅助 artifact 选择，而不是只依赖 path heuristics。
- `openspec-docs-sync`：OpenSpec 驱动的 docs refresh assessment 在 apply/archive 阶段消费 `Docs Impact`，同时遵守项目配置的 artifact language policy。

## Impact

- 影响 `assets/skills/devos-docs/SKILL.md` 以及现有 allowed targets 内 AI 生成 codemap 的内容形态。
- 影响 `assets/skills/opsx-propose/SKILL.md`、`assets/skills/opsx-explore/SKILL.md`、`assets/skills/opsx-apply/SKILL.md` 和 `assets/skills/opsx-archive/SKILL.md`，使其既能消费 docs intent，也能遵守项目级 artifact language policy。
- 影响 `openspec/config.yaml` 的约定方式或模板示例，使项目可以显式声明 OpenSpec 工件语言。
- 影响用于锁定 docs guidance、OpenSpec stage instructions、语言一致性和 refresh/archival 期望的测试。
