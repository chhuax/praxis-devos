## Why

当前 `praxis-devos` 直接在仓库中维护增强后的 `opsx-*` skills，OpenSpec upstream 一旦升级 4 个默认 workflow skills 的模板、元数据或生成逻辑，Praxis 就需要手工比对并重写最终产物。这样既不利于升级 review，也让 upstream 变更和 Praxis overlay 变更混在一起，难以判断真正的兼容风险。

现在需要把“官方 upstream 来源”和“Praxis 投放增强”拆开，建立可复用、可比对、可升级的 projection 链路，降低后续跟随 OpenSpec 升级的维护成本。

## What Changes

- 为 OpenSpec 默认 4 个 workflow skills 引入单独的 upstream snapshot 来源，不再把整合后的最终 skills 直接作为仓库真源
- 为 Praxis 的 `opsx-*` 增强规则引入独立 overlay 层，与 upstream snapshot 分离维护
- 在投放阶段增加组合步骤：先读取 upstream snapshot，再叠加 Praxis overlay，最后生成投放产物
- 为最终投放产物记录 upstream 版本信息与 Praxis overlay 版本信息，支持升级判断和诊断
- 将当前阶段的统一管控范围明确限定为 4 个 workflow skills；commands/prompts 继续作为宿主包装层，暂不纳入首批统一投放
- 在拆分 upstream / overlay 的同时恢复并保留现有 OpenSpec docs 联动行为，避免丢失 `openspec/config.yaml -> propose 阶段文档任务注入 -> apply 阶段调用 devos-change-docs` 的链路

## Capabilities

### New Capabilities
- `openspec-upstream-projection`: 管理 OpenSpec workflow skills 的 upstream snapshot、Praxis overlay 和最终投放整合链路。

### Modified Capabilities
- 无。

## Impact

- 影响 `assets/skills/opsx-*` 的来源管理方式，不再把增强后的最终文本视为唯一真源
- 影响 `src/projection/` 中的 skill 投放逻辑，需要先做 upstream + overlay 组合，再写入目标目录
- 影响 `doctor` / `sync` 的诊断与刷新语义，需要识别 upstream 版本与 overlay 版本
- 影响后续跟随 OpenSpec 升级的维护流程和测试基线
- 影响 `opsx-propose` / `opsx-apply` 的保真要求，projection 重构后仍需保留 change-level 文档任务注入和 `devos-change-docs` 调用链

## Docs Impact

- surfaces: no
- project-overview: yes
- module-map: no
- modules: src/projection, assets/skills, docs
- notes: 需要补充一份面向维护者的投放与升级说明，解释 upstream snapshot、overlay 和最终投放的关系
