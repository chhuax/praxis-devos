---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

按照 OpenSpec change 中的任务执行实现。

**输入**：可以指定 change 名称；如果未指定，则从上下文推断。若上下文含糊或有多个候选，必须提示用户选择。

## OpenSpec + Superpowers 协调

- `opsx-apply` 是当前唯一对外可见的主流程
- 如果你在内部采用计划、调试、验证或并行执行的方法，不要再额外宣告 `Using writing-plans`、`Using systematic-debugging` 或 `superpowers:...`
- 计划细化、任务状态、实现笔记等都必须留在当前 change artifacts 中，不要在 apply 阶段创建 `docs/superpowers/...` 输出
- 辅助方法只能帮助执行，不会改变当前仍然处于 `apply` 阶段这一事实

## 阶段内方法映射

- 当任务是多步骤、需要进一步拆细时：在内部采用 `writing-plans` 的方法，把实施计划收敛到当前 change 的任务与上下文中
- 当出现 bug、failed test、回归、异常时：在内部采用 `systematic-debugging` 的方法，先复现、列假设、做验证，再动代码
- 当存在多个可独立推进的子任务时：在内部采用 `subagent-driven-development` 的方法进行并行拆分，但所有产物与状态仍归属于当前 change
- 当你准备宣称“完成”“修复”或“已通过”时：在内部采用 `verification-before-completion` 的方法，先拿到真实验证证据再对外表述

**步骤**

1. **选择 change**

   如果用户显式提供名称，就直接使用；否则：
   - 从对话上下文推断用户提到的是哪个 change
   - 如果只有一个 active change，可自动选中
   - 如果存在歧义，运行 `openspec list --json` 查看候选 change，并使用 **AskUserQuestion tool** 让用户选择

   当说明 change 有助于用户理解时，可以在单一 OpenSpec 叙事里说明，例如：
   `当前进入 opsx-apply，change: <name>`

2. **查看状态，理解当前 schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   解析 JSON，了解：
   - `schemaName`：当前 workflow 所使用的 schema
   - 哪个 artifact 存放任务列表（spec-driven 通常是 `tasks`，其他 schema 以状态输出为准）

3. **读取 apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   返回内容通常包括：
   - `contextFiles`：当前实现应读取的上下文文件路径
   - 当前进度（总数、已完成、剩余）
   - 任务列表与状态
   - 动态 instruction

   **处理不同状态：**
   - 如果 `state: "blocked"`：说明 artifacts 不完整，显示提示，并建议使用 `openspec-continue-change`
   - 如果 `state: "all_done"`：说明任务已全部完成，提示用户考虑 archive
   - 其他状态：继续进入实现

4. **读取上下文文件**

   按 `apply instructions` 返回的 `contextFiles` 读取上下文。
   不同 schema 下文件会不同：
   - **spec-driven**：通常包括 `proposal`、`specs`、`design`、`tasks`
   - 其他 schema：以 CLI 返回的 `contextFiles` 为准

5. **展示当前进度**

   告诉用户：
   - 当前 schema
   - 进度，例如：`N/M tasks complete`
   - 剩余任务概览
   - CLI 给出的动态 instruction

6. **逐个实现任务，直到完成或被阻塞**

   对每个 pending task：
   - 说明正在处理哪个 task
   - 做必要的代码修改
   - 保持改动聚焦、最小化
   - 完成后把 tasks 文件中的复选框从 `- [ ]` 改成 `- [x]`
   - 然后继续下一个 task

   **以下情况应暂停：**
   - 任务含义不清 → 先向用户确认
   - 实现过程中暴露出设计问题 → 建议更新 artifacts
   - 遇到错误或 blocker → 明确报告并等待指示
   - 用户打断

7. **完成或暂停时，回报状态**

   展示：
   - 本次会话完成了哪些任务
   - 总体进度，例如：`N/M tasks complete`
   - 如果全部完成：建议 archive
   - 如果暂停：说明原因并等待用户指示

**实现过程中输出示例**

```text
## 正在实现：<change-name>（schema: <schema-name>）

当前任务 3/7：<task description>
[...正在实现...]
✓ Task complete

当前任务 4/7：<task description>
[...正在实现...]
✓ Task complete
```

**完成时输出示例**

```text
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! Ready to archive this change.
```

**暂停时输出示例**

```text
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Guardrails**

- 除非完成或被阻塞，否则持续推进任务
- 开始实现前，始终先读 `contextFiles`
- 任务含糊时先问，不要猜
- 如果实现暴露出 artifacts 问题，暂停并建议更新
- 每个任务的代码改动都应保持小而聚焦
- 完成一个任务后立即更新任务复选框
- 遇到错误、阻塞或不明确需求时暂停，不要硬猜
- 以 CLI 返回的 `contextFiles` 为准，不要自己假定固定文件名
- 对用户只保留一层主流程进度，不要再额外输出第二套方法论流程

**Fluid Workflow Integration**

该 skill 支持“围绕 change 做动作”的模型：

- **可在任意时点调用**：例如 artifacts 尚未全部齐备但已有任务、实现中途暂停后继续、与其他动作交错进行
- **允许回写 artifacts**：如果实现暴露设计问题，可以建议更新 artifacts，而不是把流程理解为僵硬的单向阶段机
