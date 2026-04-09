## Context

当前仓库已经具备两块基础能力：

- `devos-docs` 可以生成或刷新 `docs/surfaces.yaml` 与 `docs/codemaps/**`
- Claude / OpenCode 已经有用户级 docs command adapter，可以触发 `devos-docs`
- bundled 资产布局已经统一到 `assets/skills/<skill-name>/...` 与 `assets/commands/*.md`

缺口也很明确：

1. 文档生成后，AI 主要还是通过 `managed-entry.md` 被建议去读这些文件，并没有稳定的 context routing / packing 机制。
2. OpenSpec 变更流和 docs refresh 没有联动。proposal/apply/archive 期间，文档不会根据 change context 被有选择地消费，也没有明确的 refresh 时机。

因此下一阶段不应该继续扩文档类型，而应该先解决两件事：

- AI 如何稳定消费 `docs/surfaces.yaml` 与 `docs/codemaps/**`
- OpenSpec 流转中，何时、基于什么上下文触发 docs refresh

## Goals / Non-Goals

**Goals:**

- 定义一套 deterministic 的 docs context pack，用于日常 AI 任务和宿主 command 调用
- 定义多模块项目下的 docs 路由规则，避免每次都全量扫描 `docs/codemaps/**`
- 定义 OpenSpec `propose/apply/archive` 与 docs refresh 的联动时机
- 让 `devos-docs` 的 `mode=refresh` 能消费 change context 和 changed paths，而不只依赖全量项目扫描
- 保持当前文档范围克制，仍然只围绕 `docs/surfaces.yaml` 和 `docs/codemaps/**`

**Non-Goals:**

- 不新增 `reference`、`guides`、`runbooks`
- 不做深层静态分析器或语言特化架构提取
- 不要求所有宿主都实现自动上下文注入；本次先定义仓库侧 contract 和可投影资产
- 不把 docs refresh 变成隐式的大范围重写

## Decisions

### 1. 引入 docs context pack，而不是继续堆文档正文

核心问题不是“文档不够多”，而是“AI 没有稳定读取顺序”。因此本次采用 docs context pack：

- `docs/surfaces.yaml`：总入口，提供主对外面和 primary location
- `docs/codemaps/project-overview.md`：默认必读
- `docs/codemaps/module-map.md`：仅在多模块项目时加入
- `docs/codemaps/modules/<artifactId>.md`：按需加入，而不是默认全读

与之对应，不再把下一阶段目标定义成“补更多文档目录”。

备选方案：

- 继续扩 `reference/guides/runbooks`
- 不采用。当前主要瓶颈是消费协议，不是文档数量。

### 2. docs routing 采用分层选择，而不是全量读取

docs context pack 的选择顺序固定为：

1. 始终加入 `docs/surfaces.yaml`
2. 始终加入 `docs/codemaps/project-overview.md`
3. 多模块项目时加入 `docs/codemaps/module-map.md`
4. 若任务、change context 或 changed paths 能定位到模块，则只加入对应 `docs/codemaps/modules/<artifactId>.md`
5. 若无法定位模块，则不默认把所有模块 codemap 都塞进上下文

这样做的原因是：

- token 成本更低
- 子 agent 更容易快速建立正确局部上下文
- 避免多模块项目一上来就把十几个模块说明全部喂进去

备选方案：

- 多模块时默认加入全部模块 codemap
- 不采用。对大项目上下文污染太重。

### 3. OpenSpec 联动只做两个关键动作：context packing 和 refresh assessment

本次不把 OpenSpec 变成文档生成器，而只增加两类联动：

- 在 OpenSpec 工作流中构建 docs context pack，供主 agent / 子 agent 使用
- 在合适时机评估是否需要 `devos-docs mode=refresh`

推荐联动点：

- `propose`
  - 允许读取 docs context pack 作为问题理解背景
  - 不强制 refresh
- `apply`
  - 在实现前构建 docs context pack
  - 在实现完成后，根据 change context 和 changed paths 评估是否需要 refresh
- `archive`
  - 在归档前再次做 refresh assessment
  - 若本次 change 影响 primary surface、模块结构、入口路径或 codemap 关注点，则要求 docs 已刷新或显式说明豁免

备选方案：

- propose/apply/archive 每个阶段都自动 refresh
- 不采用。会导致过度刷新和无效 churn。

### 4. `devos-docs mode=refresh` 的输入必须扩展为 change-aware

当前 refresh 更像“看当前项目后重新生成”。下一阶段应扩展为同时接收：

- `changeId`
- OpenSpec change 下的 proposal/design/spec/tasks 路径
- changed paths
- optional target module hints
- existing docs artifacts

这样 `devos-docs` 可以：

- 判断这次刷新是不是主要影响 `docs/surfaces.yaml`
- 判断是否只需要更新 `project-overview`
- 判断是否需要触达 `module-map.md` 或特定模块 codemap

备选方案：

- 继续只做全量 refresh
- 不采用。和 OpenSpec 联动价值太弱。

### 5. refresh assessment 使用 deterministic 规则，不做主观 AI 判断

是否需要 refresh，应该尽量机械化。第一版使用规则集：

- changed paths 命中 `docs/surfaces.yaml`
- changed paths 命中主对外面 location
- changed paths 命中多模块 `pom.xml`
- changed paths 命中入口候选目录
- change 文档明确声明影响 external surface / module topology / project map

满足任一规则，即判定“需要 refresh assessment 为 true”。

这里先做 deterministic，是因为这层会进入 OpenSpec gate；它不能依赖模糊判断。

### 6. 仍然保留 CLI fallback，但 contract 必须共享

OpenSpec 联动和宿主 command 是主路径，但：

- `praxis-devos docs refresh`
- `praxis-devos docs check`

仍然保留为 fallback / CI / 本地调试手段。要求它们继续遵守同一个：

- canonical path
- allowed targets
- docs context routing contract
- validation contract

避免出现“OpenSpec / host command 一套逻辑，CLI fallback 又是另一套逻辑”的分叉。

### 7. 实现落点必须对齐统一后的 bundled assets 布局

本 change 形成于 `unify-bundled-assets-layout` 之前，但实现时必须以当前仓库结构为准：

- `devos-docs` skill 的变更落在 `assets/skills/devos-docs/`
- OpenSpec apply / archive 的 docs 消费 guidance 落在 `assets/skills/opsx-apply/` 与 `assets/skills/opsx-archive/`
- Claude / OpenCode 的 docs command 文案落在共享的 `assets/commands/*.md`
- 项目内托管提示仍落在 `src/templates/managed-entry.md`

因此本次实现不应再依赖已经移除的旧路径：

- `assets/openspec-skills/`
- `assets/devos-skills/`
- `src/templates/claude-commands/`
- `src/templates/opencode-commands/`

备选方案：

- 继续沿用提案形成时的旧资产路径
- 不采用。当前仓库已经统一资产布局，继续引用旧路径只会让实现和测试再次分叉。

补充说明：

- 当前 `assets/skills/devos-docs/`、`assets/skills/opsx-apply/`、`assets/skills/opsx-archive/` 目录内实际都只有 `SKILL.md`
- 因此本 change 主要调整的是 skill 文案、helper 和 routing contract，而不是引入新的 supporting files

### 8. docs refresh assessment 结果只作为运行时判断，不新增 change artifact

本次实现中，docs refresh assessment 的结果只作为 OpenSpec 流程中的运行时判断存在：

- `apply` 阶段在实现前后计算是否需要 refresh
- `archive` 阶段在归档前再次计算是否需要 refresh
- assessment 结果可进入日志、提示和测试断言
- 不新增 `openspec/changes/<change>/docs-refresh.json` 之类的持久化状态文件

备选方案：

- 将 assessment 结果写入新的 change artifact
- 不采用。本次目标是定义消费协议和联动 gate，不扩展新的持久化状态面。

### 9. command 模板只暴露稳定读取顺序，不要求回显本次实际 pack 内容

本次实现中，Claude / OpenCode 的 command 模板应明确说明 docs routing 的稳定顺序：

- 始终优先读取 `docs/surfaces.yaml`
- 始终优先读取 `docs/codemaps/project-overview.md`
- 多模块时再考虑 `module-map.md`
- 定位到模块时才加入 `modules/<artifactId>.md`

但模板不要求在用户界面中回显“本次实际读了哪些 docs artifact”。实际 pack 内容和 routing metadata 作为仓库侧 helper / skill contract 的输出，由实现和测试消费即可。

备选方案：

- 在 command 模板中显式打印本次 pack 明细
- 不采用。这会把薄包装 command 变成运行时输出协议，超出当前 change 的范围。

## Risks / Trade-offs

- [Risk] docs routing 规则过粗，导致上下文仍然不准
  → Mitigation: 第一版先只引入 surfaces + overview + module-map + module codemap 四层，规则 deterministic，后续再扩。

- [Risk] OpenSpec 联动过深，导致每个 change 都被迫刷新文档
  → Mitigation: propose 只读取，不强制 refresh；apply/archive 只做 refresh assessment，不做无条件刷新。

- [Risk] 多模块映射不准，导致错误模块 codemap 被加入 context pack
  → Mitigation: 继续复用现有 Maven 模块发现算法，并允许在定位失败时只退回到 `module-map.md`，不盲猜模块。

- [Risk] docs refresh 仍然可能写得过宽
  → Mitigation: 保持现有 allowed target set 和 deterministic validation，不引入隐式删除或迁移。

## Migration Plan

本次变更不涉及路径迁移。迁移重点是调用关系：

1. 先在仓库内新增 docs context pack builder 与 refresh assessment helper
2. 再让 `assets/skills/opsx-apply/`、`assets/skills/opsx-archive/`、`assets/skills/devos-docs/` 和 `assets/commands/*.md` 引用这些 contract
3. 保持现有 `devos-docs`、`docs check`、CLI fallback 均可工作
4. 若后续宿主集成层需要更强自动注入，再在该层消费已经稳定的 context pack contract

回滚策略：

- 若 OpenSpec 联动出现问题，可回退到仅保留 docs 生成与手动 refresh
- 因为文档 writeback 仍由既有 validator 约束，所以不会影响已有 canonical path 和 writeback 边界
