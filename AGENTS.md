# [项目名称]

<!-- 项目摘要区域 — /init 或 /init-deep 可自由修改此区域 -->
<!-- 请用 3-5 行描述项目核心信息，帮助 AI 快速理解上下文 -->

> **技术栈**：[如 Java 21 + Spring Boot 3.x]
> **项目类型**：[如 多模块 Maven 聚合工程]
> **核心业务**：[如 DevOps 流水线管理、应用部署治理]
> **详细信息**：参见 [`openspec/project.md`](./openspec/project.md)

<!-- PRAXIS_DEVOS_START — 以下内容由 praxis-devos 框架管理 -->
<!-- AI 代理注意：执行 /init 或 /init-deep 时，请勿修改此标记内的内容。仅修改此标记之上的项目摘要区域。 -->

# Praxis DevOS 项目入口 (AGENTS.md)

本文件是所有 AI 代理（OpenCode, Claude Code 等）的 **全局策略与调度中心 (Strategy & Dispatcher Center)**。

## 0. 核心开发准则 (不可逾越)

本项目强制执行 **OpenSpec (规范驱动开发)** 和 **TDD (测试驱动开发)**。AI 代理在开始任何编码前，必须通过以下门控逻辑：

### 0.1 意图门控：是否需要提案？

```
收到任务
├─ 任务模糊或有多种解读？
│   └─ 🧠 加载 brainstorming skill
│       发散列出可能的方案，选最优路径后再分流
│       输出设计文档保存至 openspec/changes/<change-id>/design.md
│
├─ 新增功能 / API变更 / 架构重构 / 破坏性变更？
│   └─ YES → 【完整提案】
│       1. 加载 brainstorming skill → 明确需求与设计
│       2. 加载 openspec-workflow skill → 创建提案，走三阶段工作流
│       3. 加载 writing-plans skill → 生成实现计划
│
├─ 单模块、非破坏性、小范围变更（< 3 个文件）？
│   └─ YES → 【轻量提案】只需 proposal.md + spec delta
│
├─ Bug 修复 / 拼写 / 格式 / 注释 / 非破坏性配置？
│   └─ YES → 【直接实现】加载 test-driven-development skill，强制 TDD
│
└─ 不确定？
    └─ 创建提案（更安全）
```

### 0.2 技术栈规范 (门控)

本项目采用**可插拔技术栈**架构。技术栈声明和编码规范存放在 `stacks/{栈名}/` 下，所有 skills 统一存放在 `.claude/skills/` 下（OpenCode 和 Claude Code 均兼容此路径）。

**加载流程：**
1. **感知技术栈**：检查项目根目录特征文件自动识别（见下方识别规则），或由用户在 `openspec/project.md` 中显式声明。
2. 读取 `stacks/{当前栈}/stack.md` 了解技术栈元信息（运行时版本、构建工具、命令等）。
3. 加载 `stacks/{当前栈}/rules.md` 作为编码规范。
4. 按需加载 `.claude/skills/` 下的领域技能。

**技术栈自动识别规则：**

| 特征文件 | 识别为 |
|----------|--------|
| `pom.xml` + Maven + Spring Boot 依赖 | `yonbip-java` |
| `package.json` + NestJS 依赖 | `ts-nestjs`（待扩展） |
| `go.mod` | `go`（待扩展） |
| `requirements.txt` 或 `pyproject.toml` | `python`（待扩展） |

> 如果自动识别失败，AI 代理应**主动询问**用户当前使用的技术栈。

**当前可用技术栈：**

| 栈名 | 路径 | 说明 |
|------|------|------|
| yonbip-java | [`stacks/yonbip-java/`](./stacks/yonbip-java/stack.md) | YonBIP Java + Spring Boot |

> 如需扩展新技术栈，在 `stacks/` 下创建新目录，遵循 `stack.md` 声明格式即可。

## 1. 交互与协作原则

- **主体思考**: 你是唯一决策者。先独立规划，后执行实现，证据先于断言。
- **沟通语言**:
  - 代码标识符: **英文**。
  - 文档/注释/反馈: **中文**。
- **任务分发 (OpenCode)**: 优先使用 `task(category="...", ...)` 派发子任务，强制使用 `todowrite` 追踪进度。

## 2. 上下文层级与 AGENTS.md 加载机制

本框架采用**三层上下文架构**，与 AI 工具的 AGENTS.md 向上遍历拼接机制兼容。

### 加载机制

AI 工具（OpenCode、Claude Code 等）从当前编辑文件所在目录**向上遍历**到项目根目录，将沿途所有 `AGENTS.md` **按 Root → CWD 顺序拼接**后注入上下文。

### 三层上下文

| 层级 | 文件 | 谁写的 | 作用 |
|------|------|--------|------|
| 框架层 | 根 `AGENTS.md`（本文件） | praxis-devos 模板 | **怎么做事**（流程与规范） |
| 项目层 | `openspec/project.md` | 使用者手动填写 | **做的是什么事**（业务上下文） |
| 目录层 | 子目录 `AGENTS.md` | `/init-deep` 自动生成 | **当前在哪里做事**（本地上下文） |

### 关键约定

- `/init-deep` 在复杂子目录（文件数 >20、子目录 >5）自动生成目录层 `AGENTS.md`，与本文件互补不冲突
- `openspec/AGENTS.md` 是 OpenSpec 工作流**专用指令**，编辑 `openspec/` 下文件时自动加载；其他目录通过 §0.1 意图门控显式引导
- 本文件 `<!-- PRAXIS_DEVOS_START -->` 标记内的内容受保护，`/init` 和 `/init-deep` 不得修改
- 目录结构参见项目 `README.md`

## 3. Skill 路由规则

AI 代理根据以下决策树判断需要加载哪些 skills。**多个 skill 可同时加载。**

### 路由决策树

```
收到任务
│
├─ 任务模糊或有多种解读？
│   └─ 加载: brainstorming（需求澄清与方案探索）
│
├─ 涉及 OpenSpec 操作（提案/规范/变更/归档）？
│   └─ 加载: openspec-workflow
│
├─ 涉及 Git 操作（分支/提交/合并/PR）？
│   └─ 加载: git-workflow
│   └─ 实现完成后: finishing-a-development-branch（合并/PR 决策）
│
├─ 涉及代码编写或修改？
│   ├─ 1. 加载当前技术栈的 rules.md（始终）
│   ├─ 2. 涉及数据库设计、SQL 编写？
│   │   └─ 加载: database-guidelines
│   ├─ 3. 涉及异常处理、异常码？
│   │   └─ 加载: error-handling
│   ├─ 4. 涉及安全编码、注入防护？
│   │   └─ 加载: security
│   ├─ 5. 涉及 Redis 操作？
│   │   └─ 加载: redis-guidelines
│   │
│   ├─ 【执行质量 — 以下 skills 按阶段自动触发】
│   ├─ 6. 多步骤任务需要计划？
│   │   └─ 加载: writing-plans（实现计划编写）
│   ├─ 7. 开始写代码？
│   │   └─ 加载: test-driven-development（强制 TDD 流程）
│   ├─ 8. 遇到 bug / 测试失败 / 异常行为？
│   │   └─ 加载: systematic-debugging（系统化调试）
│   ├─ 9. 任务有多个独立子任务可并行？
│   │   └─ 加载: subagent-driven-development（子代理并行执行）
│   └─ 10. 即将标记完成？
│       └─ 加载: verification-before-completion（完成前验证）
│
└─ 纯问答/咨询？
    └─ 无需加载 skill，直接回答
```

### 通用 Skills（始终可用）

| Skill | 路径 | 触发场景 |
|-------|------|---------| 
| `openspec-workflow` | `.claude/skills/openspec-workflow/SKILL.md` | 创建提案、检查规范、实现变更、归档 |
| `git-workflow` | `.claude/skills/git-workflow/SKILL.md` | 分支管理、提交规范、合并流程 |

### 技术栈 Skills（按 stack 加载）

加载路径为 `.claude/skills/{skill名}/SKILL.md`。

**yonbip-java 栈可用 skills：**

| Skill | 触发场景 | 触发词 |
|-------|---------|--------|
| `database-guidelines` | 数据库设计、SQL 编写、索引规范 | 数据库设计、表结构、SQL、索引、分页、建表、字段命名 |
| `error-handling` | 异常处理规范、异常码体系、统一响应格式 | 异常处理、异常码、BusinessException、统一响应、displayCode |
| `security` | 安全编码规范（注入防护、密码安全、XSS/CSRF） | 安全编码、SQL注入、XSS、CSRF、密码安全、文件上传、输入验证 |
| `redis-guidelines` | Redis 使用规范（命令、Key 设计、过期策略） | Redis、缓存、分布式锁、Key设计、过期策略、pipeline |

### 执行质量 Skills（Superpowers — 按阶段自动触发）

> **定位**：OpenSpec 管"规范治理"（什么该做），Superpowers 管"执行质量"（怎么做好）。
> 以下 skills 不按技术栈区分，**所有项目通用**，在开发生命周期的关键阶段自动触发。

| Skill | 阶段 | 触发场景 | 触发词 |
|-------|------|---------|--------|
| `brainstorming` | 需求 | 任务模糊、新功能设计、多种方案选择 | 需求不明确、方案探索、设计讨论、功能规划 |
| `writing-plans` | 计划 | 多步骤任务实现前、spec 已确认后 | 实现计划、任务分解、开发计划 |
| `test-driven-development` | 编码 | 所有代码编写（**强制**） | 写代码、实现功能、修复 bug、TDD |
| `systematic-debugging` | 调试 | bug、测试失败、异常行为 | 调试、debug、测试失败、报错、异常 |
| `subagent-driven-development` | 执行 | 多个独立子任务可并行 | 并行任务、子任务分发、多模块实现 |
| `verification-before-completion` | 验收 | 即将标记任务完成时（**强制**） | 完成验证、验收检查、提交前检查 |
| `finishing-a-development-branch` | 收尾 | 实现完成、准备合并或创建 PR | 合并分支、创建 PR、完成开发 |
| `using-git-worktrees` | 隔离 | 需要隔离工作区的功能开发 | worktree、隔离开发、独立工作区 |

### 多代理协作（OpenCode oh-my-opencode）

主代理（Sisyphus）应利用子代理体系实现并行化：

| 时机 | 代理 | 方式 |
|------|------|------|
| 任务开始 | `explore` x1-2 | `run_in_background=true` — 查找项目中相关代码模式和约定 |
| 涉及不熟悉的技术 | `librarian` | `run_in_background=true` — 查外部文档和最佳实践 |
| 需求模糊或复杂 | `metis` | `run_in_background=true` — 分析隐含意图和歧义 |
| 完整提案创建后 | `momus` | `run_in_background=true` — 评审提案质量和完整性 |
| 2+ 个独立子任务 | `task(category, skills)` | 并行分发，每个子代理只传相关 skills |
| 2+ 次修复失败 | `oracle` | 架构咨询 |

#### 子代理分发规则

识别无依赖的子任务后，通过 `task()` 并行分发：

```python
# 示例：用户注册 API 的并行实现
task(category="business-logic",
     load_skills=["database-guidelines", "error-handling", "test-driven-development"],
     prompt="实现用户 DAO 和 Service 层...")

task(category="business-logic",
     load_skills=["security", "error-handling", "test-driven-development"],
     prompt="实现注册 Controller 和输入验证...")
```

- `explore` / `librarian` 始终 `run_in_background=true`，不阻塞主线
- 子代理通过 `load_skills` 继承技术栈 skills，**只传与其任务相关的**
- 主代理验证每个子代理输出后再继续下一步
- 架构级疑难 → `oracle` 咨询（连续 2+ 次修复失败后）

### Skill 与代理协作示例

| 任务 | 并行代理 | 主线 Skills | 子代理分发 |
|------|---------|------------|-----------|
| "创建用户注册 API" | `explore` x2 + `librarian` | `brainstorming` → `openspec-workflow` → `writing-plans` | `task` x2: 各自 `test-driven-development` + 领域 skills |
| "修复登录接口 500 错误" | `explore` x1 | `systematic-debugging` + `error-handling` | 失败 2+ 次 → `oracle` |
| "提交代码并创建 PR" | — | `git-workflow` + `finishing-a-development-branch` | — |
| "设计订单表结构" | `librarian` | `brainstorming` + `database-guidelines` → `openspec-workflow` | — |
| "实现 Redis 缓存" | `librarian` | `redis-guidelines` + `test-driven-development` | → `verification-before-completion` |

## 4. TDD 执行规范

所有代码变更（无论是否需要提案）都必须遵循 TDD。**实现代码时 MUST 加载 `test-driven-development` skill**，以获取完整的 RED-GREEN-REFACTOR 流程指导。连续 3 次测试失败时，**MUST 加载 `systematic-debugging` skill** 系统化排查。

## 5. 完成门控（验收清单）

即将标记任务完成时，**MUST 加载 `verification-before-completion` skill** 执行通用验收流程（测试通过、构建通过、LSP 诊断、无调试残留等）。

以下为**本项目特有的额外检查**，在 skill 通用流程之上叠加：

### 5.1 提案变更额外检查

- [ ] **Spec Scenario 对照**：逐条验证 proposal 中每个 `#### Scenario:` 的预期行为
- [ ] **tasks.md 全部勾选**：`tasks.md` 中每一项都标记为 `[x]`
- [ ] **openspec validate**：运行 `openspec validate <change-id> --strict --no-interactive` 通过（**Git Hook 自动执行**）

### 5.2 Git 提交前检查

以下检查由 `.githooks/` 中的 Git Hook **自动执行**（确定性安全网，不依赖 AI 遵守）：

- [ ] **提交消息**：符合 Conventional Commits 格式（`commit-msg` hook 强制）
- [ ] **OpenSpec 验证**：spec 文件变更时自动 validate（`pre-commit` hook 强制）
- [ ] **分支命名**：符合 `feature/`、`bugfix/`、`hotfix/` 规范
- [ ] **无冲突标记**：`git diff --check` 无输出

## 6. 多工具协作边界

当项目中同时使用多个 AI 工具时，遵循以下分工：

| 职责 | OpenCode | Claude Code |
|------|----------|-------------|
| 入口文件 | `AGENTS.md` | `CLAUDE.md` → `AGENTS.md` |
| Skill 加载 | 项目内 `.claude/skills/`（兼容路径） | 项目内 `.claude/skills/` |
| 任务分发 | `task(category="...", ...)` 子代理 | 单线程执行 |
| 适用场景 | 复杂多步骤任务、需要并行探索 | 单文件修改、快速问答 |

**核心原则**：无论使用哪个工具，都遵循同一套 AGENTS.md 规则。工具只是执行器，规范是统一的。

<!-- PRAXIS_DEVOS_END -->
