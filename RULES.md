<!-- PRAXIS_DEVOS_START — 以下内容由 praxis-devos 框架管理 -->

# Praxis DevOS 框架规则

本项目强制执行 **OpenSpec (规范驱动开发)** 和 **Verification (完成前验证)**。

## 0. 显式提案入口

- 用户输入 `/change` 时，表示**进入提案通道**，而不是直接进入实现。
- `/proposal` 是兼容别名，语义与 `/change` 相同。
- 进入提案通道后，MUST 先做一次轻量 `Proposal Intake`，先基于现有上下文自行提取，而不是立刻盘问用户。
- `Proposal Intake` 至少要收敛出 4 项：
  - `change target`：本次变更作用到哪个 capability / 模块 / API
  - `intended behavior`：预期新增、修改或移除什么行为
  - `scope/risk`：影响范围、约束、潜在风险
  - `open questions`：仍然阻塞提案的缺口或分歧
- 若 `open questions` 为空或不阻塞提案创建，可直接进入 OpenSpec 提案脚手架。
- 若 `open questions` 仍阻塞提案，或存在多种可行方案 / 架构分歧，再升级加载 `brainstorming`。
- `/change` 或 `/proposal` 都**不应直接触发实现**，也**不应自动创建 Git 分支**。
- 提案获批并进入实现前，MUST 先检查当前 Git 分支；如果用户已经位于与该 change 对应的专用实现分支，可继续复用，否则先加载 `git-workflow` 并创建 / 切换分支。

## 1. 意图门控 — 收到任务时必须过此决策

```
收到任务
├─ 用户显式输入 `/change` 或 `/proposal`？
│   └─ 进入提案通道；先做 Proposal Intake；若仍有阻塞缺口或多方案分歧，再升级到 brainstorming
│
├─ 任务模糊或有多种解读？
│   └─ 加载 brainstorming skill → 明确需求后再分流
│
├─ 新增功能 / API变更 / 架构重构 / 破坏性变更？
│   └─ 【完整提案】加载 openspec skill → 创建提案 → 加载 writing-plans skill
│
├─ 单模块、非破坏性、< 3 个文件？
│   └─ 【轻量提案】加载 openspec skill → 只需 proposal.md + spec delta
│
├─ Bug修复 / 拼写 / 格式 / 注释 / 非破坏性配置？
│   └─ 【直接实现】选择合适的验证策略 → 低风险可直接实现
│
└─ 不确定？ → 创建提案（更安全）
```

## 2. Skill 触发表 — 按意图 / 阶段加载

**规则**：多个 skill 可同时加载。框架管控 skill 必须按阶段显式加载；技术栈领域 skills 保持按需加载，不做全局强制。
**命令面**：所有 OpenSpec 命令统一使用 `npx praxis-devos openspec ...`，不要直接调用裸 `openspec`。

| 意图 / 阶段 | 加载 Skill | 来源 |
|---|---|---|
| 提案入口出现阻塞缺口 / 方案分歧、需求模糊、方案探索 | `brainstorming` | SuperPowers |
| 提案 / 规范 / 变更 / 归档 | `openspec` | 插件内置 |
| 多步骤任务 → 生成计划 | `writing-plans` | SuperPowers |
| 高风险代码变更 / 先写失败用例更划算 | `test-driven-development` | SuperPowers |
| Bug / 测试失败 / 异常 | `systematic-debugging` | SuperPowers |
| 多个独立子任务可并行 | `subagent-driven-development` | SuperPowers |
| **即将完成（强制）** | `verification-before-completion` | SuperPowers |
| Git 分支 / 提交 / 合并 | `git-workflow` | 用户可自定义 |
| 代码评审 / PR Review | `code-review` | 用户可自定义 |
| 实现完成 → 合并 / PR | `finishing-a-development-branch` | SuperPowers |
| 隔离工作区 | `using-git-worktrees` | SuperPowers |
| 技术栈领域（数据库等） | 栈专属 skills（如 java-database） | 技术栈 |

> **标记「强制」的 skill** 不可跳过：`openspec`（提案 / 规范 / 归档）、`git-workflow`（已批准提案进入实现且当前分支不可直接复用时）、`verification-before-completion`（完成前）都属于框架层强制 skill。`brainstorming` 不再作为每个 proposal 的默认硬门槛，而是在 Proposal Intake 暴露阻塞缺口、范围分歧或多方案选择时强制升级。TDD 是高价值策略，但不是全局硬门槛；技术栈 skill 继续按需触发。

### Skill 优先级

RULES.md 规则 > OpenSpec 工作流 > SuperPowers skills > 技术栈领域 skills

## 2.1 SuperPowers 事件钩子

不要只把 SuperPowers 当成“可选工具列表”。收到以下事件信号时，MUST 至少显式判断一次是否进入对应能力，并在会话中留下证据：

| 事件信号 | 必须判断的能力 | 最小证据 |
|---|---|---|
| 进入 proposal flow | `Proposal Intake` | `change target` / `intended behavior` / `scope/risk` / `open questions` |
| Proposal Intake 暴露阻塞缺口、边界分歧、多方案取舍 | `brainstorming` | 澄清问题、方案比较或边界收敛记录 |
| 已批准 proposal 开始实现 | `git-workflow` | 当前分支检查，或复用 / 创建实现分支的说明 |
| 实施任务超过 3 个明确步骤、存在依赖关系 | `writing-plans` | 步骤化实施计划 |
| 出现 bug、失败测试、异常、不可解释回归 | `systematic-debugging` | 复现条件、假设、验证结果 |
| 多个独立子任务可并行推进 | `subagent-driven-development` | 并行拆分或委派记录 |
| 即将完成、提 PR、准备合并 / 发布 | `verification-before-completion` | 验证项与实际结果 |

## 3. 测试策略选择

写代码时，MUST 选择与风险相匹配的验证策略，而不是无差别强制 TDD。

### 低风险变更

- 文档、注释、格式调整
- 小型非破坏性配置修改
- 明确无业务逻辑变化的微调

处理方式：

- 可直接实现
- 完成前执行最小必要验证

### 中风险变更

- 单模块逻辑调整
- 非破坏性功能增强
- 一般接口行为修改

处理方式：

- 应补充或更新测试
- 是否采用 TDD，由上下文和收益决定
- 完成前必须验证

### 高风险变更

- 核心业务逻辑
- 回归风险高的 bug 修复
- 边界条件复杂的改动
- 跨模块行为变化

处理方式：

- SHOULD 优先使用 `test-driven-development`
- 至少先构造失败用例、复现步骤或其他可重复验证手段
- 完成前必须验证

## 4. 完成门控

即将标记任务完成时，MUST 加载 `verification-before-completion` skill 执行通用验收流程后，再执行以下项目额外检查：

### 提案变更额外检查
- [ ] 逐条验证 proposal 中每个 `#### Scenario:` 的预期行为
- [ ] `tasks.md` 中每一项都标记为 `[x]`
- [ ] `npx praxis-devos openspec validate <change-id> --strict --no-interactive` 通过

### Git 提交前检查
- [ ] 提交消息符合 Conventional Commits 格式
- [ ] 分支命名符合 `feature/` / `bugfix/` / `hotfix/` 规范
- [ ] `git diff --check` 无冲突标记

## 5. 沟通约定

- 代码标识符：**英文**
- 文档 / 注释 / 反馈：**中文**

<!-- PRAXIS_DEVOS_END -->
