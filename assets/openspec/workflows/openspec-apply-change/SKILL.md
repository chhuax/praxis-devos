---
name: openspec-apply-change
description: 实现一个 OpenSpec change 中的任务。适用于用户希望开始实现、继续实现，或按任务推进一个 change。优先借助 Superpowers 细化并完成单个 OpenSpec task。
license: MIT
compatibility: Requires openspec CLI. Works best with Superpowers skills.
metadata:
  author: openspec
  version: "1.3"
  generatedBy: "custom"
---

实现一个 OpenSpec change 中的任务，一次只推进**一个** OpenSpec task。

## 核心定位

- OpenSpec 负责：选择 change、读取 `contextFiles`、识别当前 task、维护 `tasks.md` 状态
- Superpowers 负责：task 细化、执行模式、TDD、调试、验证
- `tasks.md` 是默认任务事实来源
- 不为整个 change 再生成第二份总计划

## 精确 Skill 协议

- 命中路由时，必须调用对应的**精确 skill 名**
- 不得用相近的本地 skill、TodoWrite、手工拆点或长段 reasoning 替代
- 如果精确 skill 不可用，必须明确报告，并暂停当前路由
- 在当前 change 与当前 task 尚未锁定前，不得创建 TodoWrite、列执行待办或进入实现规划

## 能力路由

### 1. 任务细化

默认先对**当前单个 task** 调用 `superpowers:writing-plans`。

只有在任务纯属文档文字修改、机械重命名、格式整理等极小改动时，才允许跳过。

`writing-plans` 的作用范围只限当前 task，不是整个 change，也不是额外 plan 文件。

### 2. 执行模式分流

`writing-plans` 之后，不能直接进入实现，必须二选一：

- 有可并行的独立子工作：`superpowers:subagent-driven-development`
- 否则：`superpowers:executing-plans`

除非已经明确识别出可并行的独立子工作，否则默认走 `superpowers:executing-plans`。

在执行模式确认前，不得：

- 创建 TodoWrite
- 运行测试命令
- 开始 patch / 编码
- 调用实现型辅助 skill

开始实现前，必须先显式输出一次“执行模式确认”，至少包含：

- 当前 task
- 执行模式
- 选择理由

### 3. TDD

如果当前 task 涉及功能实现、bugfix、行为变更或测试代码改动，必须在写生产代码前调用 `superpowers:test-driven-development`。

### 4. 调试

如果实现或验证过程中出现不明确失败、反复失败或猜测式修补冲动，必须切换到 `superpowers:systematic-debugging`。

### 5. 完成验证

在宣称 task 完成、更新 checkbox 之前，必须调用 `superpowers:verification-before-completion`。

没有新鲜验证证据，就不能：

- 勾选当前 task
- 宣称当前 task 已完成
- 继续推进下一个 task

## 输入

可选指定一个 change 名称；如果未指定：

- 先尝试从对话上下文推断
- 如果用户提到某个 task 编号或标题，先据此反查当前 change
- 如果仓库根目录没有 active change，继续检查 worktree 中是否存在正在推进的 change
- 如果只有一个 active change，可自动选择
- 如果存在歧义，运行 `openspec list --json` 获取候选项

无论如何，先明确宣布：

```text
当前使用的 change：<name>
如需切换，可显式指定其他 change。
```

## 执行步骤

### 1. 识别当前 change

- 如果用户给了 change 名称，直接使用
- 如果用户提到 `3.1` 这类 task 编号，先在当前工作区及 worktree 中搜索匹配的 `tasks.md`
- 如果 `openspec list --json` 返回空，但用户显然在继续已有 change，必须继续检查 `.worktrees/*/openspec/changes/*/tasks.md`
- 找到唯一匹配项后，切到对应 worktree 上下文继续

### 2. 读取 apply 上下文

运行：

```bash
openspec status --change "<name>" --json
openspec instructions apply --change "<name>" --json
```

读取：

- `schemaName`
- `contextFiles`
- `tasks`
- `state`

如果 `state: "blocked"`，提示先使用 `openspec-continue-change`；如果 `state: "all_done"`，提示可 archive。

### 3. 选择当前单个 task

- 一次只处理一个 task
- 明确显示当前任务编号与文本
- 检查是否存在未满足的前置依赖
- 在当前 task 未锁定前，不得创建 TodoWrite 或展开执行待办

### 4. 生成当前 task brief

先生成一个只聚焦当前 task 的 brief，至少覆盖：

- 当前 task 要达成什么
- 相关 spec / design / tasks 上下文
- 主要约束
- 完成后至少要验证什么

默认不单独落盘；必要时才按需回写到当前 task 的子 bullets。

### 5. 细化当前 task

默认调用 `superpowers:writing-plans`，并明确约束：

- 只细化当前这个 task
- 不为整个 change 再写总 plan
- 默认不生成单独 plan 文件
- 默认保持简洁
- 如果存在可并行的独立子工作，显式标出即可

### 6. 确认执行模式并进入实现

完成 `writing-plans` 后，先显式输出执行模式确认，再立刻调用：

- `superpowers:subagent-driven-development`，或
- `superpowers:executing-plans`

禁止出现以下顺序：

- `writing-plans -> TodoWrite -> 实现`
- `writing-plans -> test-driven-development -> 实现`
- `writing-plans -> 直接测试/patch/编码`

### 7. 按路由完成实现

- 涉及实现代码时，先走 `superpowers:test-driven-development`
- 只实现当前 task
- 不顺手推进下一个 task
- 如果进行并行，只能发生在当前 task 内部
- 如果实现中发现设计与 artifacts 不一致，立即暂停并反馈

### 8. 验证并更新状态

调用 `superpowers:verification-before-completion` 后，只有在当前 task 的关键验证通过时，才允许把 `- [ ]` 改成 `- [x]`。

完成后立即更新 `tasks.md`，不要先批量实现多个任务再统一勾选。

## Guardrails

- 开始前必须读取 `contextFiles`
- 不要假设固定 artifact 名称，必须以 CLI 输出为准
- 若 `openspec list --json` 返回空，不得在未检查 worktree 前直接宣称“没有 active change”
- `writing-plans` 在 apply 阶段只用于当前单个 task
- `writing-plans` 之后必须先进入执行模式分流
- 若没有明确并行子工作，默认走 `superpowers:executing-plans`
- 在执行模式确认前，不允许 TodoWrite、测试、patch 或编码
- 出现不明确失败时，必须进入 `superpowers:systematic-debugging`
- 未经 `superpowers:verification-before-completion`，不允许勾选 task
- 不要跨 task 扩大范围
