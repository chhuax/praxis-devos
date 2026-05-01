## Why

Praxis DevOS 已经投放 OpenSpec 流程治理和少量文档能力，但缺少一份面向日常编码动作的轻量行为准则，无法稳定约束 agent 在小任务中的假设、范围漂移和过度设计问题。

借鉴 `andrej-karpathy-skills` 的核心原则，可以把“先澄清、保持简洁、精准修改、可验证完成”内化到 Praxis 投放内容中，同时不把项目根规则膨胀成编码风格手册。

## What Changes

- 新增一份内置投放 skill，用于指导 agent 在编码、修 bug、重构和评审类任务中执行轻量但明确的编码准则。
- 该 skill 保留 `andrej-karpathy-skills` 官方 `karpathy-guidelines` 内容，并通过 Praxis 现有 bundled skill 投影机制交付。
- 保持 OpenSpec managed block 的治理职责不变；仅添加短激活提示，不把完整准则放进 `AGENTS.md` managed block。
- 覆盖测试，确保新增内置 skill 会被 `projectNativeSkills()` 投放到支持的 agent skill 目录，并携带 Praxis projection marker。

## Capabilities

### New Capabilities

- `karpathy-guidelines-projection`: 定义 Praxis 如何投放官方 `karpathy-guidelines` 日常编码行为准则，以及投放后 agent 应如何发现、触发和执行这些准则。

### Modified Capabilities

- 无

## Impact

- 影响 `assets/skills/**` 中的内置 skill 资产。
- 影响 `src/templates/managed-entry.md`，仅新增短激活提示；不改变 OpenSpec flow gate。
- 影响投影测试，主要验证新增 bundled skill 的收集和写入。
- 不引入新的运行时依赖、CLI 参数或外部 pack 安装逻辑。
