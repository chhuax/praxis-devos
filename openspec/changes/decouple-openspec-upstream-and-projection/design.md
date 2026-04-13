## Context

当前仓库将增强后的 `opsx-*` workflow skills 直接作为 bundled assets 维护在 `assets/skills/` 下。这样做的问题是，OpenSpec upstream 一旦升级：

- 4 个默认 workflow skills 的正文可能变化
- YAML 头部中的 `generatedBy`、`metadata.version` 等字段可能变化
- 不同宿主的 command 引用文案可能变化

维护者只能直接对最终产物做手工比对，难以区分：

- upstream 变了什么
- Praxis overlay 变了什么
- 哪些变更会影响最终投放

另外，当前讨论已经明确：

- 当前阶段统一管控范围先限定在 4 个 workflow skills
- commands / prompts 继续视为宿主包装层，暂不纳入首批统一投放
- 默认产品流程继续坚持 4-flow，不随 OpenSpec expanded/6-flow 自动扩张

因此需要把 upstream 来源和最终投放拆开，建立一条可升级、可比对、可诊断的 projection 链路。

## Goals / Non-Goals

**Goals:**

- 把 OpenSpec 官方 4 个 workflow skills 的 upstream 来源与 Praxis overlay 分离维护
- 让最终投放产物由“upstream snapshot + overlay”在投放时组合生成
- 为投放产物记录足够的 upstream / overlay 版本信息，支持升级判断
- 明确当前阶段只统一 4 个 workflow skills，不扩展到 commands/prompts
- 明确当前阶段只跟随 4-flow 默认流，不跟随 expanded/6-flow 自动投放
- 保持并恢复已有的 OpenSpec docs 联动行为，尤其是 `openspec/config.yaml -> docs task policy -> tasks.md 文档任务注入 -> apply 阶段调用 devos-change-docs`

**Non-Goals:**

- 不在本次变更中统一管理 commands 或 `.github/prompts`
- 不在本次变更中重构多 agent 项目目录布局
- 不在本次变更中支持 expanded/6-flow 的默认投放
- 不在用户运行 `sync` 时在线拉取最新 OpenSpec upstream 模板
- 不在本次变更中重新设计全新的 docs policy；这里只恢复并保留此前已经讨论并部分实现过的 change-level 文档任务链路

## Decisions

### 1. 使用仓库内 upstream snapshot，而不是运行时直接读取本机 OpenSpec 安装目录

Praxis DevOS 将在仓库中保留一份 OpenSpec 默认 4 个 workflow skills 的 upstream snapshot，作为可 review、可版本化的基础输入。

原因：

- 仓库内 snapshot 可复现，review 和回滚都清晰
- 不依赖用户机器的 OpenSpec 安装版本是否一致
- 不要求 `sync` 在运行时访问 npm 安装目录或远程仓库

备选方案：

- 运行时直接从本机 `@fission-ai/openspec` 安装目录抽取模板
- 不采用。不同机器版本可能不同，投放结果不可复现，也会让调试和回滚变复杂。

### 2. Overlay 单独存放，最终 skill 在投放时组合生成

新的 skill 维护模型为：

```text
upstream snapshot
+ Praxis overlay
= final projected skill
```

也就是说，仓库中不再把“整合完成后的最终 skill 文本”当成唯一真源；真正的真源拆成两层：

- OpenSpec upstream snapshot
- Praxis overlay

最终 skill 只在投放阶段生成。

原因：

- upstream 变更和 overlay 变更可以独立 review
- 可以更清楚地判断升级影响
- 可以把整合逻辑收敛到 projection 层，而不是把结果散落在静态文件中

### 3. 当前阶段只统一 4 个 workflow skills

首批统一管控对象限定为：

- `openspec-explore`
- `openspec-propose`
- `openspec-apply-change`
- `openspec-archive-change`

原因：

- 这 4 个 skill 对应 Praxis 当前默认 4-flow
- 这是当前用户最核心的 workflow contract
- commands/prompts 在不同宿主中表现不同，更适合作为后续宿主包装层议题单独处理

备选方案：

- 连同 commands 一起统一投放
- 不采用。当前不同宿主的 command / prompt 包装差异较大，而 Codex 项目侧并不依赖 commands；现在一起做只会扩大变更面。

### 4. Projection 默认只处理 4-flow，不自动跟随 expanded/6-flow

Praxis DevOS 在当前阶段只会投放并维护 4-flow 默认流对应的 skills，不会因为 OpenSpec upstream 支持更多 workflow，就自动把 `new`、`continue`、`ff`、`verify`、`sync` 等 expanded 节点一起纳入。

原因：

- 产品层默认流程已经明确为 4-flow
- expanded/6-flow 会改变用户对 stage contract 的理解
- 如果用户在项目中直接初始化 expanded flow，会冲淡 Praxis DevOS 的默认工作流心智

这个约束既是产品决策，也是 projection 边界。

### 5. 用 upstream metadata 和 Praxis overlay 版本共同判断升级

最终投放产物必须能表达至少以下信息：

- 来自哪个 upstream skill
- upstream 的 `metadata.version`
- upstream 的 `generatedBy`
- Praxis overlay 的版本或等价标识

这样在 `sync` 或 `doctor` 中可以判断：

- upstream snapshot 是否变化
- overlay 是否变化
- 当前投放产物是否需要重建

### 6. upstream / overlay 重构不能丢失已有的 docs task injection 行为

这次 change 虽然聚焦在 upstream snapshot 与 overlay 的拆分，但 `opsx-propose`、`opsx-apply`、`opsx-archive` 之前已经承载了一部分 docs 联动 contract：

- proposal 阶段生成 `Docs Impact`
- proposal 阶段根据项目配置与 change 语义注入 change-level docs tasks
- apply 阶段依据 `tasks.md` 和 `Docs Impact` 触发 `devos-change-docs`

这条链路不能因为资产拆分而退化成“只剩 `Docs Impact`，不再生成 `blackbox-test.md` 等任务”。

因此本次变更把“恢复并锁定 docs task injection 行为”视为保真要求，而不是后续可选优化。

最低要求：

- 当项目配置声明启用或要求 change-level 文档任务时，`opsx-propose` 必须能把相应任务写入 `tasks.md`
- `blackbox-test.md` 任务是默认恢复项
- `api-doc.md` 不是默认必需项；只有当 proposal / design / specs / implementation context 明确显示存在 API 变化时，`opsx-propose` 才需要补回 `api-doc.md` 任务；必要时同时补回项目级 API 同步任务
- 如果 API 变化涉及 breaking change、兼容性风险、迁移要求或调用方行为变化，生成的 `api-doc.md` 与后续项目级 API 同步文档必须显式给出兼容性说明和警告
- `opsx-apply` 继续以 `tasks.md` 为权威来源，在存在 docs tasks 时调用 `devos-change-docs`
- 测试必须覆盖：
  - `config.yaml -> tasks.md -> devos-change-docs(change-blackbox)`
  - `API change detected -> tasks.md -> devos-change-docs(change-api)`

## Risks / Trade-offs

- [Risk] 仓库内维护 upstream snapshot 会引入一份额外资产副本
  → Mitigation: 这份副本是可 review 的、受控的输入，优先于运行时动态读取的不确定性。

- [Risk] 组合生成逻辑可能让 projection 层更复杂
  → Mitigation: 当前阶段只处理 4 个 skills，先把组合逻辑限定在最小范围。

- [Risk] 用户已经在项目中使用 expanded flow，可能对默认 4-flow 限定不满
  → Mitigation: 明确把 expanded flow 支持定义为后续高级模式议题，不在本次变更中默认启用。

- [Risk] 若 upstream 模板结构变化过大，overlay 锚点可能需要调整
  → Mitigation: 通过 snapshot review 和版本检查，尽早在维护阶段发现不兼容，而不是在用户机器运行时暴露问题。

## Migration Plan

1. 引入仓库内 OpenSpec upstream 4-skill snapshot 目录
2. 将 Praxis 增强内容整理为独立 overlay 层
3. 在 projection 流程中增加组合步骤，先合成再投放
4. 为投放结果补充 upstream / overlay 版本标识
5. 更新 `sync` / `doctor` 的判断逻辑与相关测试
6. 恢复并验证 docs task injection 行为，确保 upstream / overlay 重构没有丢失 `blackbox-test.md` 等 change-level 文档任务注入
7. 保持 commands/prompts 逻辑不变，留待后续处理

## Open Questions

- upstream snapshot 的具体存放目录命名是否需要与现有 `assets/skills/` 目录完全并列，还是应放在更明确的 `assets/upstream/openspec-skills/` 下
- overlay 版本标识是写入 YAML metadata 还是投影 marker 中更合适

## Docs Impact

- surfaces: no
- project-overview: yes
- module-map: no
- modules: src/projection, assets/skills, docs
- notes: 需要增加一份面向维护者的说明，解释 4-flow 默认流、upstream snapshot、overlay 和升级判断的关系
