## Context

当前仓库的 lightweight docs contract 已经能稳定落盘：

- `docs/surfaces.yaml`
- `docs/codemaps/project-overview.md`
- `docs/codemaps/module-map.md`
- `docs/codemaps/modules/<artifactId>.md`

但实际生成出来的 codemap 仍然容易退化成目录导航和文件索引。对 AI 来说，这会导致两个问题：

- 进入仓库后缺少高密度的系统方向感，开发和排障容易先被局部文件带偏
- 即使存在多份 codemap，OpenSpec 也缺少一条明确的“这次 change 影响哪些 docs 产物”的声明路径，apply/archive 阶段只能过度依赖 changed paths 猜测

这次 change 不扩大 docs writeback 范围，也不引入新的 topical docs family。它只解决两件事：

1. 在现有 codemap 文件集合内提升 AI-first 信息密度
2. 让 OpenSpec 用 `Docs Impact` 显式声明 docs refresh 意图，并在 apply/archive 阶段消费它
3. 让 OpenSpec 工件语言由项目配置决定，并在同一 change 内保持一致

## Goals / Non-Goals

**Goals:**

- 让 `devos-docs` 在现有 allowed target set 内生成更适合 AI 开发/排障的 codemap
- 把系统边界、关键流转、问题路由、编辑风险等高价值信息压进现有 codemap 文件，而不是只输出目录导航
- 为 OpenSpec proposal/design 引入短小、可读、可被后续阶段消费的 `Docs Impact` 区块
- 让 apply/archive 阶段优先使用 `Docs Impact` 判定 docs refresh routing 与 evidence 要求
- 为 OpenSpec proposal/design/tasks/spec artifacts 建立统一但可配置的语言策略
- 保持 routing 偏向模块 dossier 优先，而不是把横切专题文档当成默认入口

**Non-Goals:**

- 不新增 `architecture.md`、`backend.md`、`dependencies.md` 等新的 writeback 目标
- 不扩展到 `docs/reference/`、`contracts/`、`guides/`、`runbooks/` 等其他 docs family
- 不要求 fallback/compatibility docs path 追平 AI-first skill 质量
- 不实现 Java HTTP API contract/reference 生成
- 不在 `opsx-*` skill 中写死中文或英文

## Decisions

### 1. 保持现有 writeback 边界，但提高单篇 codemap 的语义密度

这次不扩展 `devos-docs` 的允许写回路径，仍然限制在 `docs/surfaces.yaml` 与 `docs/codemaps/**`。为了避免在当前 contract 下继续生成“薄文档”，要求：

- `project-overview.md` 承担系统级 summary、主链路、外部面和问题路由
- `module-map.md` 承担模块边界、依赖方向和 inspection routing
- `modules/*.md` 承担入口点、关键流转、依赖、风险与 edit hazards

备选方案：

- 新增 `architecture.md`、`backend.md`、`dependencies.md`
- 不采用。当前 change 先对齐现有 contract 和已落地实现，避免又引入一轮 writeback boundary 扩张。

### 2. 用 `Docs Impact` 做显式 docs refresh 意图，而不是只靠 changed paths 猜

在 OpenSpec proposal/design 中增加一个短的 `Docs Impact` 区块，允许 change 作者声明：

- 哪些 docs 面向受影响，例如 `surfaces`、`project-overview`、`module-map`
- 是否需要模块级 codemap 刷新
- 受影响模块提示

apply/archive 阶段优先使用这个声明；只有当声明缺失或不够具体时，才退回到 changed paths heuristics。

备选方案：

- 继续完全依赖 changed paths 和自由文本判断
- 不采用。路径命中能发现“哪里改了”，但不能稳定表达“这次 change 认为哪些 docs 需要更新”。

### 3. routing 保持模块 dossier 优先，`Docs Impact` 只做选择增强

这次不把 docs context pack 默认扩展为更多横切文档，而是保持：

- 默认读取 `docs/surfaces.yaml`
- 默认读取 `docs/codemaps/project-overview.md`
- 多模块时优先命中 `module-map.md` 与对应 `modules/<artifactId>.md`

`Docs Impact` 只负责告诉 OpenSpec 和 `devos-docs` 哪些现有 artifact 更值得优先刷新或加载，而不是改变主入口结构。

备选方案：

- 让 apply/archive 总是全量加载或全量刷新所有 codemap
- 不采用。对 AI 上下文不友好，也会让 refresh 成本与噪声都变大。

### 4. archive gate 需要 refresh evidence 或显式 waiver

如果 `Docs Impact` 表明这次 change 影响了 docs，而 apply 阶段没有完成 refresh，那么 archive 阶段必须给出两种结果之一：

- refresh evidence
- 明确 waiver reason

这样可以把 docs 刷新从“最好做”提升为“有声明就必须交代结果”。

备选方案：

- 只在 archive 提示一下 docs 可能需要刷新，不要求 evidence
- 不采用。这样很容易退化成提醒型流程，长期仍然会丢失维护价值。

### 5. OpenSpec 工件语言由 `openspec/config.yaml` 决定，skill 只负责执行统一性

这次不在 `opsx-propose`、`opsx-explore` 等 skill 里写死“必须中文”或“必须英文”。语言属于项目级偏好，应该由项目自己声明。这里将 `openspec/config.yaml` 作为 language policy 的来源，允许项目用明确字段或等价规则声明 OpenSpec artifact 的默认语言。

skill 层负责的约束是：

- 读取项目配置的 artifact language policy
- 在同一 change 下让 `proposal.md`、`design.md`、`tasks.md` 和相关 spec artifacts 保持一致语言
- 保留代码标识、命令、路径、capability 名称等技术 token 的原文
- 当用户在当前对话中明确要求其他语言时，允许覆盖默认配置

如果项目没有显式配置语言，flow 应优先继承当前 change 里已存在工件的主语言，避免在补写 design/tasks/spec 时突然切换语言。

备选方案：

- 直接在 `opsx-*` skill 中强制中文
- 不采用。这样对英语项目不成立，也会把项目偏好错误地下沉成全局默认。

- 完全依赖自由文本提示，不提供项目级配置入口
- 不采用。这样无法形成稳定、可复用、可测试的 artifact language policy。

## Risks / Trade-offs

- [Risk] 现有 codemap 文件承担更多横切信息后，单篇文档可能变长
  → Mitigation: 强调 decision-relevant 压缩，而不是堆叠背景介绍；优先写 AI 会据此做判断的信息。

- [Risk] `Docs Impact` 可能写得太宽或太窄
  → Mitigation: 保留 changed paths 作为 fallback，并把 `Docs Impact` 设计成短格式，降低填写负担。

- [Risk] 只改 skill guidance 而不改 fallback path 会带来双轨行为差异
  → Mitigation: 本 change 明确将 AI-first skill path 视为 canonical path，不把 fallback 视为质量基线。

- [Risk] archive gate 变严后，change 完成前的收尾工作增加
  → Mitigation: 只在 `Docs Impact` 明确命中 docs 影响时要求 evidence 或 waiver，不对所有 change 一刀切。

- [Risk] artifact language policy 如果只靠自然语言提示，仍可能被模型忽略
  → Mitigation: 把 `openspec/config.yaml` 作为明确来源，并在 `opsx-*` guidance 与测试中同时锁定。

- [Risk] 旧项目没有配置语言时，新增约束可能造成过多追问
  → Mitigation: 未配置时优先继承当前 change 既有工件的主语言，只在缺少可继承上下文时才回退到用户明确指示。

## Migration Plan

1. 先更新 `devos-docs` skill guidance，明确 AI-first codemap 内容要求
2. 再更新 `opsx-propose`、`opsx-explore`、`opsx-apply`、`opsx-archive`，让 `Docs Impact` 成为 stage 间传递的 docs intent，并让 OpenSpec 工件语言遵守项目配置
3. 为 `openspec/config.yaml` 增加 artifact language policy 的约定方式或模板示例
4. 补充测试，锁定新的 guidance、language policy 与 gate 规则
5. 用真实仓库验证新的 codemap 产出是否比旧版更适合 AI 消费

回滚策略：

- 如果新 guidance 质量不稳定，可回退到旧版 codemap guidance，而不会影响现有 docs 路径结构
- 如果 `Docs Impact` gate 过重，可保留字段但降低 archive 阶段的强制性
- 如果 language policy 的显式字段方案过重，可先保留 `openspec/config.yaml` 中的约定写法，再延后做更强结构化

## Open Questions

- `Docs Impact` 是否需要进一步结构化成更严格的字段集合，还是保持当前短格式即可
- 后续若需要真正引入横切总览文档，是否应另开 change 扩展 writeback contract，而不是继续挤入现有 codemap 文件
- `openspec/config.yaml` 的 artifact language policy 应该采用专门字段，还是先用现有 `context` / `rules` 约定承载
