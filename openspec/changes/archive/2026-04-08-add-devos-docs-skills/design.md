## 背景

当前方向已经明确：Praxis 的文档契约 Phase 1 已经围绕 `docs/surfaces.yaml` 和 `docs/codemaps/` 落了一版轻量实现。问题不在于“这套实现是否存在”，而在于它当前仍以脚本式生成为主路径。Phase 2 的目标是把这套能力演进成 AI-first 编排，同时和现有 Phase 1 保持兼容。

用户已经明确边界：

- 主入口不是 `praxis-devos docs init` 这类 CLI，而是宿主 agent 里的 command
- 当前仓库里已经存在 `praxis-devos docs init|refresh|check`，因此本次设计必须明确兼容策略
- command 负责编排
- 派发的是普通子 agent，不固定专门角色名
- 能力边界主要由 skill 约束
- `docs check` 只负责机械验收
- 多 Maven 模块项目的产物集合固定为：
  - `docs/surfaces.yaml`
  - `docs/codemaps/project-overview.md`
  - `docs/codemaps/module-map.md`
  - `docs/codemaps/modules/<artifactId>.md`

## 目标 / 非目标

**目标：**
- 定义 AI-first 的 docs init / refresh 协作模型
- 引入单一 `devos-docs` skill，并支持 `mode=init|refresh`
- 定义上下文输入包和输出 contract
- 明确 Phase 1 兼容路径的保留策略
- 明确本仓库可验收范围与宿主集成层验收范围
- 明确多 Maven 模块项目的 codemap 目标文件集合
- 保留 deterministic 校验和 fallback 的位置
- 补足允许写入目标、refresh 保守行为和迁移保护

**非目标：**
- 不在本次设计中实现完整的宿主 command 适配层
- 不实现复杂的语言特化静态分析器
- 不扩展到 `reference/guides/runbooks`
- 不引入固定的 docs 专用子 agent 角色名
- 不在本次 change 中保留第二条 surfaces canonical path

## 设计决策

### 0. 本仓库验收聚焦 contract、writeback、validation 和 compatibility

本次 change 会继续在 spec 中描述宿主 command 的目标行为，因为这是 AI-first 路径的外部接口定义；但实现与验收必须拆层：

- 本仓库内可验收内容：
  - `devos-docs` skill contract
  - host-to-subagent handoff contract
  - structured output contract
  - writeback rules
  - deterministic validation
  - compatibility / fallback path
- 宿主侧后续集成层验证内容：
  - `/devos:docs-init`
  - `/devos:docs-refresh`
  - 不同 agent 宿主中的 command 接线方式

这意味着本仓库当前阶段不要求实现完整的宿主 command 适配层，但要求把相关 contract 定义清楚，并把仓库内可测部分做成 deterministic。

### 1. 主入口采用宿主 command，不新增 Praxis 专属 docs 生成 CLI

命令触发点应位于 OpenCode、Claude Code、Codex 这类宿主环境。Praxis 提供的是 skill、上下文协议、结果写回规则和校验器，而不是另一套并行用户心智。

推荐命令入口：

- `/devos:docs-init`
- `/devos:docs-refresh`

备选方案：

- 新增 `praxis-devos docs-init` / `docs-refresh` 命令
- 结论：不采用。该方案弱化了 AI 在生成过程中的地位，也偏离宿主 command 的实际使用场景。

兼容策略：

- `praxis-devos docs init|refresh|check` 在本阶段保留
- 其中 `docs init|refresh` 被重新定义为 compatibility / fallback path
- `docs check` 继续作为 deterministic validator
- 只有在宿主 command 接入完成后，才评估是否将 CLI 路径标记为 deprecated

### 2. 使用普通子 agent + 单一 skill，不固定 docs 专用子 agent 名称

子 agent 的能力边界主要由 skill 约束。普通子 agent 执行：

- `devos-docs`

并通过输入参数区分：

- `mode=init`
- `mode=refresh`

即可满足需求，避免为单一场景引入过重的角色体系，也避免维护两个高度重叠的 skill。

备选方案：

- 固定 `devos-docs-subagent`
- 结论：暂不采用。除非后续宿主生态需要稳定的 agent 角色注册，否则普通子 agent 更通用。

### 3. 输出 contract 固定为结构化结果，再由主流程写回文件

docs 子 agent 不直接任意修改仓库，而是返回结构化结果，主流程统一写回目标文件。

建议输出结构：

```json
{
  "schemaVersion": 1,
  "mode": "init",
  "surfacesYaml": "...",
  "codemaps": [
    {
      "path": "docs/codemaps/project-overview.md",
      "content": "...",
      "action": "upsert"
    },
    {
      "path": "docs/codemaps/module-map.md",
      "content": "...",
      "action": "upsert"
    }
  ]
}
```

约束：

- `schemaVersion` 必须存在
- `schemaVersion` 必须等于 `1`
- `mode` 只能是 `init` 或 `refresh`
- `surfacesYaml` 必须存在且非空
- `codemaps` 必须是数组
- `path` 只能落在允许目标集合内
- `content` 必须存在且非空
- 第一阶段 `action` 只允许 `upsert`
- 不允许通过 refresh 删除文件
- Maven 模块文件必须使用 `docs/codemaps/modules/<artifactId>.md`
- 重复的 `path` 视为 invalid
- 任何 invalid contract 都必须在 repository writeback 之前失败

这样可以把 AI 生成和仓库写回解耦，并让测试聚焦在 contract、落盘与校验。

Phase 2 的允许写入目标集合：

- `docs/surfaces.yaml`
- `docs/codemaps/project-overview.md`
- `docs/codemaps/module-map.md`
- `docs/codemaps/modules/<artifactId>.md`

除上述白名单外，不允许 `devos-docs` 结果写入任何其他仓库路径。

### 4. 多 Maven 模块项目的产物只在检测到多模块时生成

模块发现算法：

1. 只有根目录存在 `pom.xml` 时，才进入 Maven 检测流程；否则直接判定为非 Maven 项目。
2. 从根 `pom.xml` 开始，递归读取当前 `pom.xml` 中显式声明的 `<modules>` 列表；每个 `<module>` 解析为相对当前 `pom.xml` 目录的子模块路径。
3. 只有被某个已发现聚合 `pom.xml` 显式列在 `<modules>` 中的模块，才算有效发现结果；当前阶段不做基于目录扫描的隐式模块猜测。
4. 对每个已发现模块，继续读取其 `pom.xml`；如果该模块自身也声明了非空 `<modules>`，则继续递归发现其子模块，直到没有新的显式子模块为止。
5. 每个输出模块的稳定标识优先取该模块 `pom.xml` 的 `<artifactId>`；如果缺失，则回退为该模块相对仓库根目录的规范化路径；若产生重复标识，validation 必须报冲突而不是自动覆盖。

当前阶段的 deterministic 目标是“只相信 Maven 显式聚合关系”，而不是根据目录结构猜模块。

如果不是 Maven 多模块项目：

- 不生成 `module-map.md`
- 不生成 `modules/<artifactId>.md`

如果是 Maven 多模块项目：

- 生成 `docs/codemaps/module-map.md`
- 为每个检测到的模块生成 `docs/codemaps/modules/<artifactId>.md`

验收规则：

- 只有在检测到 Maven 多模块时，这两类文件才是必需项
- 如果未检测到 Maven 多模块，缺少这些文件不应导致校验失败
- 如果检测到模块但缺少模块 codemap，应报告为 needs-attention

### 5. `docs check` 保留为机械验收

`docs check` 不负责“写什么”，只负责检查：

- 必要文件是否存在
- 路径引用是否有效
- `docs/surfaces.yaml` 是否合法
- codemap 是否残留占位符或空托管区块
- 多模块检测成立时，`module-map.md` 和 `modules/<artifactId>.md` 是否齐全

路径优先级：

- 在本阶段，`docs/surfaces.yaml` 是 canonical path
- 如果同时出现 `docs/surfaces.yaml` 和 `contracts/surfaces.yaml`，校验应报告冲突
- `contracts/surfaces.yaml` 不作为本阶段有效输出路径

这样它可以在 AI 生成后承担验货角色。

### 6. 输出 contract 的 validation rules 必须 deterministic

除基础 schema 外，还要求以下规则：

- `surfacesYaml` 不能为空字符串，也不能只包含空白字符；否则判定为 invalid
- `schemaVersion` 必须存在且必须等于 `1`
- `mode` 必须存在且只能是 `init` 或 `refresh`
- `codemaps[].path` 不能为空，且同一结果内不得重复
- `codemaps[].content` 不能为空字符串，也不能只包含空白字符
- `codemaps[].action` 必须存在且只能是 `upsert`
- `codemaps[].path` 必须落在允许目标集合内；合法路径但不在 allowlist 中时视为 invalid
- `mode=refresh` 时，结果中不得包含删除语义；缺失某个已有 codemap 不等于删除它
- `mode=refresh` 时，系统只更新 validated contract 中显式返回的文件；不得隐式删除、重命名或迁移 docs 产物
- `docs/codemaps/modules/<artifactId>.md` 中的 `<artifactId>` 必须匹配模块发现结果中的已知模块名

这些规则的目的不是评估文档“写得好不好”，而是保证 AI 结果可落盘、可校验、可保持兼容。

### 7. Compatibility path 必须遵守同一协议边界

在 compatibility phase 中，`praxis-devos docs init|refresh|check` 可以继续使用 deterministic helper 或内部 fallback 逻辑，但必须遵守与 AI-first 主路径一致的约束：

- 使用同一个 canonical path：`docs/surfaces.yaml`
- 使用同一个 allowed target set
- 使用同一个 deterministic validation 规则
- 不得产生另一套独立的 writeback 协议

这可以避免 fallback 路径和 AI-first 路径逐渐分叉成两套世界观。

### 8. 非 canonical surfaces 路径必须被明确拦截

当前阶段只允许 `docs/surfaces.yaml` 作为 canonical path。

- `contracts/surfaces.yaml` 不是有效输出目标
- 如果 writeback contract 试图写入 `contracts/surfaces.yaml`，validation 必须在 repository writeback 前拒绝该结果
- 如果仓库中同时存在 `docs/surfaces.yaml` 与 `contracts/surfaces.yaml`，`docs check` 必须报告冲突

### 9. Module codemap 需要最小内容骨架

`docs/codemaps/module-map.md` 最小内容：

- 模块列表
- 每个模块的相对路径
- 每个模块的 `artifactId` 或回退后的稳定名称
- 简短职责摘要

`docs/codemaps/modules/<artifactId>.md` 最小内容：

- 模块标识
- 模块用途或职责
- 关键入口点或公开接口
- 仓库内的重要依赖关系

当前阶段 validator 不需要理解语义质量，但 skill contract 和测试应以这些最小骨架为依据。

### 10. Migration guard

本次 change 不允许自动执行以下行为：

- 将已有 `docs/surfaces.yaml` 自动移动到 `contracts/surfaces.yaml`
- 将已有 `docs/surfaces.yaml` 自动重命名为其他路径
- 为了路径整齐而在 writeback 中偷偷改写 canonical surfaces path

## 风险 / 权衡

- [风险] 宿主 command 集成方式在不同 agent 中差异较大 → 缓解：先固定 skill 和输入输出 contract，把宿主接入层留给后续实现。
- [风险] 如果子 agent 直接写仓库，边界容易失控 → 缓解：输出 contract 结构化，写回由主流程控制。
- [风险] Maven 模块检测做得过重会重新滑回脚本主导 → 缓解：第一版只做模块发现和轻量项目地图，不做深层静态分析。
- [风险] 当前仓库已有 deterministic docs 逻辑，容易与 AI-first 方向混淆 → 缓解：明确其降级为 compatibility / fallback 或内部辅助，不再作为主路径。
