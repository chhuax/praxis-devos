---
name: openspec-propose
description: Propose a new change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with design, specs, and tasks ready for implementation.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

创建一个新的 change，并在一次流程中补齐 proposal 所需 artifacts。

我会创建以下 artifacts：
- `proposal.md`：做什么、为什么做
- `design.md`：准备怎么做
- `tasks.md`：后续怎么实现

准备开始实现时，使用 `/opsx:apply`。

## OpenSpec + Superpowers 协调

- `opsx-propose` 是当前唯一对外可见的主流程
- 如果你在内部采用 `brainstorming` 的方法来处理模糊需求或方案分歧，不要再额外宣告 `Using brainstorming` 或 `superpowers:brainstorming`
- proposal、design、tasks 等输出都必须留在 `openspec/changes/<name>/...` 下，不要创建 `docs/superpowers/...` 提案侧文档
- 辅助方法只能帮助你澄清和组织 proposal，不能替代原生 OpenSpec proposal 步骤

## 阶段内方法映射

- 当用户的问题还很模糊，或 `open questions` 仍然很多时：在内部采用 `brainstorming` 的方法收敛边界、比较方案、明确约束
- 当范围已经足够清楚时：回到原生 OpenSpec proposal 流程，逐个生成当前 change 所需 artifacts
- 所有设计结论、任务拆分、范围变更都必须写回当前 change，而不是另起一套文档路径

---

**输入**：用户请求中应包含一个 kebab-case 的 change 名称，或者至少给出要构建/修改的内容描述。

**步骤**

1. **如果输入还不够清楚，先问用户要做什么**

   使用 **AskUserQuestion tool**（开放式，不带预设选项）询问：
   > “What change do you want to work on? Describe what you want to build or fix.”

   再根据用户描述推导一个 kebab-case 名称，例如 `"add user authentication"` → `add-user-auth`。

   **重要：** 在没有理解用户要做什么之前，不要继续推进。

2. **创建 change 目录**
   ```bash
   openspec new change "<name>"
   ```
   该命令会在 `openspec/changes/<name>/` 下创建 scaffold，并包含 `.openspec.yaml`。

3. **读取 artifact 构建顺序**
   ```bash
   openspec status --change "<name>" --json
   ```
   解析 JSON，获取：
   - `applyRequires`：进入实现前必须完成的 artifact ID 列表
   - `artifacts`：所有 artifact 的状态与依赖关系

4. **按顺序创建 artifacts，直到 apply-ready**

   使用 **TodoWrite tool** 跟踪 artifact 进度。

   按依赖顺序循环处理 artifacts（优先处理依赖已满足的项）：

   a. **对于每个状态为 `ready` 的 artifact：**
      - 获取生成指令：
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - 返回的 JSON 包含：
        - `context`：项目背景，仅作为你的约束，不要写进输出
        - `rules`：artifact-specific 规则，仅作为你的约束，不要写进输出
        - `template`：输出文件结构模板
        - `instruction`：当前 artifact 类型的写作指引
        - `outputPath`：输出路径
        - `dependencies`：需要先读的依赖 artifacts
      - 先读已完成的依赖文件
      - 按 `template` 结构创建 artifact
      - 应用 `context` 和 `rules`，但不要把它们原样复制进文件
      - 简短汇报进展，例如：`Created <artifact-id>`

   b. **持续推进，直到 `applyRequires` 全部完成**
      - 每创建完一个 artifact，就重新执行：
        ```bash
        openspec status --change "<name>" --json
        ```
      - 检查 `applyRequires` 中每个 artifact 是否都已是 `status: "done"`
      - 全部完成后停止

   c. **如果某个 artifact 需要额外用户输入**
      - 使用 **AskUserQuestion tool** 追问
      - 然后继续生成

5. **展示最终状态**
   ```bash
   openspec status --change "<name>"
   ```

**输出**

完成后，给出简短总结：
- change 名称与位置
- 已创建的 artifacts 及简要说明
- 当前 readiness，例如：`All artifacts created! Ready for implementation.`
- 下一步提示，例如：`Run /opsx:apply or ask me to implement to start working on the tasks.`

**Artifact 创建准则**

- 按 `openspec instructions` 返回的 `instruction` 来生成每类 artifact
- schema 决定 artifact 应包含哪些内容，遵循 schema
- 创建新 artifact 前先读依赖 artifacts
- 使用 `template` 作为结构骨架，再填入内容
- **重要：** `context` 和 `rules` 是给你的约束，不是 artifact 内容本身
  - 不要把 `<context>`、`<rules>`、`<project_context>` 之类区块复制进输出文件
  - 它们只是指导你写作，不应该直接出现在结果中

**Guardrails**

- 必须创建 schema `apply.requires` 所要求的全部 artifacts
- 创建任何新 artifact 前，先读完它依赖的 artifacts
- 如果上下文确实关键且不清楚，可以询问用户；否则优先做出合理判断，保持推进
- 如果同名 change 已存在，先询问用户是继续该 change 还是创建新 change
- 每生成完一个 artifact，都确认目标文件已真实存在
