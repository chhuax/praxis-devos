# /devos-docs-init 修复计划

> 基于 iuap-yms-manage 项目上的完整执行流程分析
> Issue 追踪: #58 #59 #60 #61 #62 #63 #64 #65 #66 #67 #68

## 问题全景

```
#65 主 agent 丢弃子 agent 成果（根因）
 ├─ 直接原因 → #66 子 agent 输出格式不可消费
 ├─ 导致 → #58 跨模块信息污染
 ├─ 导致 → #59 surface owner 归属错误
 ├─ 导致 → #60 重复写入与收敛不稳定
 └─ 导致 → #61 推断写成事实

#68 合约验证被完全跳过（独立根因）
 ├─ 加剧 → #60 重复写入
 └─ 前置 → #64 验证失败处理未定义

#67 Cancelled/errored 无处理
 └─ 加剧 → #61 推断写成事实

#62 Language Policy 缺失（独立缺陷）
#63 分批策略缺失（独立增强）
```

## 修复分三批

修复按"先堵根因、再补机制、最后增强"排序。每批内各修改互不依赖，可并行。

---

## 第一批：堵根因（#65 #66 #68）

这三个问题不修，其他都是治标。

### 修改 1：技能定义增加 Agent Collaboration 节

**文件**: `assets/skills/devos-docs/SKILL.md`

**在 `## Repository Interrogation Order` 之前插入整节**:

```markdown
## Agent Collaboration

当主 agent 使用子 agent（Explore 或其他类型）进行仓库探索时，必须遵守以下协议。

### 子 agent 的 prompt 规范

主 agent 派发子 agent 时，prompt 必须包含：

1. 明确的返回格式要求——要求子 agent 将结果**作为文本消息返回**，禁止写入 `/tmp` 或其他外部文件
2. 期望的返回结构（见下方"标准探索返回结构"）
3. 目标仓库路径

禁止使用模糊 prompt 如"explore the repository to gather evidence"。

### 标准探索返回结构

子 agent 应返回以下结构化信息（作为文本，非文件）：

```yaml
module_topology:
  - artifactId: xxx
    path: relative/path
    packaging: jar|war|pom
    parent_artifactId: xxx

package_roots:
  module_artifactId:
    - com.example.module.package1
    - com.example.module.package2

controller_map:
  - controller_class: XxxController
    module: module_artifactId
    url_prefixes:
      - /api/v1/xxx

integration_points:
  - system: kubernetes
    classes:
      - com.example.KubeService
    module: module_artifactId

dependency_graph:
  module_a:
    - module_b
    - module_c
```

### 子 agent 结果使用规则

1. 主 agent **必须首先评估子 agent 的返回**，不得跳过
2. 只有当子 agent 的返回存在**可列举的事实错误**时，才可以针对性补充扫描
3. 补充扫描必须基于子 agent 的结果做增量，禁止从零重建
4. 如果主 agent 判断子 agent 结果不可用，必须在输出中列出具体原因（缺哪些字段、哪些事实有误），不得使用模糊理由
```

### 修改 2：技能定义增加强制合约验证步骤

**文件**: `assets/skills/devos-docs/SKILL.md`

**将现有的 `## Validation Expectations` 节替换为**:

```markdown
## Validation Contract

### 合约组装（写回前必须执行）

在调用 Write 写入任何文件之前，必须先组装完整的 JSON 合约并输出。
跳过此步骤直接执行 Write 是流程违规。

组装步骤：

1. 将所有待写入的内容组装为 Required Outputs 节定义的 JSON 结构
2. 逐条执行下方的验证检查
3. 输出验证结果（通过/不通过及原因）
4. 全部通过后，再逐文件执行 Write

### 验证检查项

- `schemaVersion` 存在且等于 `1`
- `mode` 存在且为 `init` 或 `refresh`
- `surfacesYaml` 非空
- `codemaps` 是数组
- 每个 codemap 条目有非空 `path`、非空 `content`、`action=upsert`
- 无重复 codemap path
- 所有 path 在 Allowed Write Targets 范围内
- `contracts/surfaces.yaml` 不是合法输出路径

### 验证失败处理

验证失败时：

1. **All-or-nothing**: 任何一个条目验证失败，全部不写回
2. 返回结构化错误：

```json
{
  "status": "validation-failed",
  "errors": [
    { "path": "docs/codemaps/modules/foo.md", "reason": "path outside allowed target set" }
  ]
}
```

3. 终止流程，不自动重试
4. 向用户报告失败原因
```

### 修改 3：命令定义增加子 agent 使用说明

**文件**: `assets/commands/devos-docs-init.md`

**将 `## Implementation` 节替换为**:

```markdown
## Implementation

- 调用 `devos-docs` 技能，传入 `mode=init`
- 如果使用子 agent 进行仓库探索，必须遵守 `devos-docs` 技能的 Agent Collaboration 节
- 子 agent 的 prompt 必须明确要求返回标准探索返回结构，禁止写入外部文件
- 主 agent 必须使用子 agent 的返回结果，不得丢弃后从零重建
- 使用稳定的文档路由顺序:
  - `docs/surfaces.yaml`
  - `docs/codemaps/project-overview.md`
  - `docs/codemaps/module-map.md` 仅多模块项目
  - `docs/codemaps/modules/<artifactId>.md` 仅当模块路由可确定时
- 写回前必须完成合约组装与验证（见 devos-docs 技能 Validation Contract 节）
- 验证通过后一次性写入，禁止边探索边多次落盘
```

---

## 第二批：补机制（#62 #67 #64）

### 修改 4：技能定义增加 Language Policy 节

**文件**: `assets/skills/devos-docs/SKILL.md`

**在 `## AI-First Quality Bar` 之后插入**:

```markdown
## Language Policy

尊重当前项目的 artifact language policy。

当调用方提供了语言偏好（通过 `surfaces.yaml` 中的 `artifact_language` 字段或其他方式），生成的文档必须使用该语言。

最低要求支持以下语言的标题别名：

- `zh-CN`
- `en`

以下内容始终保持原始形式，不翻译：

- 代码标识符（类名、方法名、包名）
- 命令和 CLI 参数
- 文件路径
- 技术术语专有名词（如 artifactId、Tekton、fabric8）
- YAML/JSON 字段名
```

**同时修改 `## Input` 节，在 caller must provide 列表中追加**:

```markdown
- `artifact_language` 语言偏好（如 `zh-CN`），未提供时默认 `en`
```

### 修改 5：surfaces.yaml schema 增加语言字段

**文件**: `assets/skills/devos-docs/SKILL.md`

**在 Required Outputs 节的 JSON 示例中追加字段**:

```json
{
  "schemaVersion": 1,
  "mode": "init",
  "artifactLanguage": "zh-CN",
  "surfacesYaml": "...",
  "codemaps": [...]
}
```

**同时在 Validation Contract 的检查项中追加**:

```markdown
- `artifactLanguage` 存在时，必须是已支持的语言代码
```

### 修改 6：命令定义增加语言传递

**文件**: `assets/commands/devos-docs-init.md` 和 `assets/commands/devos-docs-refresh.md`

**在 Implementation 节追加**:

```markdown
- 检测当前项目的语言偏好：
  - 优先读取已有 `surfaces.yaml` 中的 `artifact_language` 字段
  - 其次检查项目中 `AGENTS.md` / `README.md` 的主要语言
  - 将检测到的语言偏好传入 `devos-docs` 技能的 `artifact_language` 参数
```

### 修改 7：增加证据完整性检查点

**文件**: `assets/skills/devos-docs/SKILL.md`

**在 `## Agent Collaboration` 之后、`## Repository Interrogation Order` 之前插入**:

```markdown
## Evidence Completeness

在宣称"证据充分"并进入合约组装阶段之前，必须通过以下检查点。

### 必须信息（缺失任一项不得进入写回）

对于 `mode=init`：

- [ ] 模块拓扑：所有 `<modules>` 声明的模块均已扫描，artifactId 和 path 已确认
- [ ] 包根列表：每个模块的 `src/main/java` 下的实际顶级包已确认（非推断）
- [ ] 主入口：主应用的 Spring Boot entry point 已定位

对于多模块项目额外要求：

- [ ] controller → module 映射：至少对每个暴露 HTTP 端点的模块，已确认其 controller 所在模块
- [ ] 依赖方向：模块间依赖关系已从 pom.xml 的 `<dependencies>` 确认

### 探索失败处理

- 如果某个扫描命令被 Cancelled 或 errored，该命令对应的信息视为**缺失**
- 不得对同一命令做相同参数的重试——要么换一种方式获取，要么接受缺失
- 对缺失信息对应的 codemap 内容，必须标注为低置信度或跳过该部分
- 禁止用推断填补缺失信息后将推断结果写成事实性描述
```

---

## 第三批：增强（#63）

### 修改 8：增加大项目分批策略

**文件**: `assets/skills/devos-docs/SKILL.md`

**在 `## Maven Multi-Module Rules` 之后插入**:

```markdown
## Large Project Strategy

当目标项目的模块数量超过 5 个时，启用分批生成策略。

### 分批顺序

1. **全局阶段**（一次完成）：
   - 扫描所有模块的 `pom.xml`，建立模块拓扑
   - 生成 `docs/surfaces.yaml`
   - 生成 `docs/codemaps/project-overview.md`
   - 生成 `docs/codemaps/module-map.md`

2. **模块阶段**（分批完成）：
   - 每批最多 3 个模块
   - 每个模块的 codemap 生成在**隔离的子 agent 上下文**中进行
   - 子 agent 只接收：该模块的拓扑信息 + 全局阶段确定的依赖关系 + 该模块自身的源码
   - 禁止将其他模块的详细源码信息传入当前批次的上下文

### 分批目的

- 避免上下文窗口压力导致跨模块信息污染（#58）
- 每批模块的推断质量一致，不因排列顺序而退化
- 减少单次执行的 token 消耗
```

---

## 文件修改清单

| 批次 | 文件 | 修改类型 | 对应 Issue |
|------|------|---------|-----------|
| 1 | `assets/skills/devos-docs/SKILL.md` | 新增 Agent Collaboration 节 | #65 #66 |
| 1 | `assets/skills/devos-docs/SKILL.md` | 替换 Validation Expectations → Validation Contract | #68 #64 |
| 1 | `assets/commands/devos-docs-init.md` | 替换 Implementation 节 | #65 #66 #60 |
| 2 | `assets/skills/devos-docs/SKILL.md` | 新增 Language Policy 节 | #62 |
| 2 | `assets/skills/devos-docs/SKILL.md` | Input 节追加 artifact_language | #62 |
| 2 | `assets/skills/devos-docs/SKILL.md` | Required Outputs JSON 追加 artifactLanguage | #62 |
| 2 | `assets/commands/devos-docs-init.md` | Implementation 追加语言检测 | #62 |
| 2 | `assets/commands/devos-docs-refresh.md` | Implementation 追加语言检测 | #62 |
| 2 | `assets/skills/devos-docs/SKILL.md` | 新增 Evidence Completeness 节 | #67 #61 |
| 3 | `assets/skills/devos-docs/SKILL.md` | 新增 Large Project Strategy 节 | #63 |

## 不需要改 JS 代码

所有修改都在技能定义（SKILL.md）和命令定义（commands/*.md）层面。当前架构下 `/devos-docs-init` 是纯 AI 驱动的技能调用，没有 JS 代码参与文档生成过程。`src/core/praxis-devos.js` 只负责 CLI 路由和 scaffold 操作，不需要修改。

如果未来希望将合约验证从"AI 自律"升级为"确定性代码保障"，可以在 `src/core/` 下新增一个 `docs-contract-validator.js`，但那是后续增强，不在本次修复范围内。

## 验证方式

修改完成后，用以下方式验证：

1. **在 praxis-devos 自身上测试**: 执行 `/devos-docs-init`，检查是否输出 JSON 合约再写文件
2. **在 iuap-yms-manage 上回归测试**: 重新执行 `/devos-docs-init`，对照 #58 #59 #60 #61 检查是否修复
3. **语言测试**: 在目标项目的 `surfaces.yaml` 中设置 `artifact_language: zh-CN`，验证生成内容为中文
4. **分批测试**: 在 >5 模块的项目上验证是否触发分批逻辑

## 风险点

- **Agent Collaboration 节是建议性约束而非强制机制**：AI 仍可能不遵守。长期应考虑在 hook 或 JS 层面增加检查。
- **Language Policy 依赖 AI 的多语言生成能力**：对于专业领域术语的中文表达，可能需要在技能中提供术语表。
- **分批策略增加了执行复杂度**：需要在技能中明确分批间的状态传递方式。
