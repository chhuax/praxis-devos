---
name: openspec-archive-change
description: Archive a completed change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

归档一个已完成的 experimental workflow change。

**输入**：可以指定 change 名称；如果未指定，则从上下文推断。若上下文模糊或有多个候选，必须提示用户选择。

## OpenSpec + Superpowers 协调

- `opsx-archive` 是当前唯一对外可见的主流程
- 如果你在归档前内部采用验证方法，不要再额外宣告 `Using verification-before-completion`
- 归档时的说明、校验结果、同步结论都必须附着在当前 change/archive flow 中，不要在 archive 阶段创建 `docs/superpowers/...` 输出
- 辅助验证方法只能帮助确认是否可归档，不会形成第二套“完成流程”
- 当你在当前阶段内部 invoke 任意 Superpowers 子 skill 时，必须传递当前主流程类型、当前 change id、当前阶段目标、当前 artifacts 位置和当前输出约束；不得新建独立 workflow、独立文档根目录或改变 change 归属

## 阶段内方法映射

- 当你准备归档时：invoke `verification-before-completion` internally，先确认 artifacts、tasks、校验结果是否足以支撑归档
- 当发现 delta specs 还没同步时：先给出同步评估，再由用户决定是先 sync 还是直接 archive

**步骤**

1. **如果未指定 change 名称，提示用户选择**

   运行 `openspec list --json` 获取当前 changes，并使用 **AskUserQuestion tool** 让用户选择。

   只展示 active changes（不要展示已经 archived 的）。
   如可获得，也一起展示每个 change 的 schema。

   **重要：** 不要猜测或默认选中某个 change；必须让用户明确选择。

2. **检查 artifact 完成情况**

   运行：
   ```bash
   openspec status --change "<name>" --json
   ```

   解析 JSON，了解：
   - `schemaName`
   - `artifacts` 及其状态（`done` 或其他）

   **如果存在未完成的 artifacts：**
   - 展示 warning，并列出未完成项
   - 使用 **AskUserQuestion tool** 询问用户是否仍要继续
   - 若用户确认，则继续

   在汇报“可以归档”之前，先在当前 `opsx-archive` 内 invoke `verification-before-completion` internally，确认这些 artifacts 的完成情况足以支撑归档判断。

3. **检查 task 完成情况**

   读取任务文件（通常是 `tasks.md`），检查是否仍有未完成任务。

   统计：
   - `- [ ]`：未完成
   - `- [x]`：已完成

   **如果存在未完成任务：**
   - 展示 warning，并告诉用户数量
   - 使用 **AskUserQuestion tool** 确认是否仍要继续
   - 若用户确认，则继续

   这一检查同样属于归档前验证的一部分，应纳入当前 `opsx-archive` 内部的 `verification-before-completion` 执行中。

   **如果没有任务文件：** 跳过这一检查。

4. **评估 delta spec 同步状态**

   查看 `openspec/changes/<name>/specs/` 下是否存在 delta specs。若不存在，跳过同步提示。

   **如果存在 delta specs：**
   - 将每个 delta spec 与对应的主 spec（`openspec/specs/<capability>/spec.md`）比较
   - 识别会产生的变更类型：新增、修改、删除、重命名
   - 在询问用户前，先给出一份合并后的影响摘要

   **提示选项：**
   - 如果存在待同步变更：`Sync now (recommended)`、`Archive without syncing`
   - 如果已经同步：`Archive now`、`Sync anyway`、`Cancel`

   如果用户选择 sync，使用 Task tool（`subagent_type: "general-purpose"`），并提示：
   `Use Skill tool to invoke openspec-sync-specs for change '<name>'. Delta spec analysis: <summary>`

   无论用户是否 sync，之后都继续 archive 流程。

5. **执行 archive**

   如果 archive 目录不存在，先创建：
   ```bash
   mkdir -p openspec/changes/archive
   ```

   使用当前日期生成 archive 名称：`YYYY-MM-DD-<change-name>`

   **检查目标目录是否已存在：**
   - 如果已存在：报错，并建议用户改名或处理已有 archive
   - 如果不存在：将 change 目录移动到 archive

   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

6. **展示归档总结**

   总结内容包括：
   - change 名称
   - 使用的 schema
   - archive 位置
   - specs 是否已同步（如果适用）
   - 是否带着 warnings 继续（例如 artifacts/tasks 未全部完成）

**成功输出示例**

```text
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs（或 "No delta specs" / "Sync skipped"）

All artifacts complete. All tasks complete.
```

**Guardrails**

- 如果未指定 change，始终让用户选择
- 完成度检查以 `openspec status --json` 的 artifact graph 为准
- 不要因为 warning 直接阻止 archive；应提示并确认
- 移动目录时要保留 `.openspec.yaml`（它会随目录一起移动）
- 始终明确说明归档过程发生了什么
- 如果用户要求 sync，使用 `openspec-sync-specs` 路线处理
- 如果存在 delta specs，必须先做同步评估并给出摘要，再询问用户
