> AI 入口区块：以下内容由 Praxis DevOS 自动维护。
> 先按本区块分流，再读取后续项目上下文；执行 `npx praxis-devos sync` 时，此区块会被刷新。

## AI Dispatch

- 你当前位于一个由 Praxis DevOS 管理的项目中。
- 项目 canonical source 位于 `.praxis/`；不要把 `.opencode/`、`.claude/` 等 agent 适配目录视为规范事实来源。
- `.opencode/skills/` 仍可作为 OpenCode supplemental layer，但它不是项目规范的 canonical source。
- 先决定当前任务属于 proposal、implementation、review 中的哪一条流程，不要直接开始实现。

## Flow Selection

- proposal flow: 用户显式输入 `/change` 或 `/proposal`，或者任务属于新功能、API 变更、架构重构、破坏性变更。此时禁止直接实现。
- implementation flow: 任务属于代码实现、测试、重构、调试、修缺陷。
- review flow: 用户要求 review、审查、排查回归风险、检查测试缺口。
- 如果任务意图不清晰，先澄清；不要在未分流前直接写代码。

## Required Reads

- proposal flow: 先读取 `openspec/AGENTS.md`，然后必须加载 `openspec` skill；再按需读取 `openspec/project.md`；先做轻量 `Proposal Intake`，优先基于现有上下文提取 `change target`、`intended behavior`、`scope/risk`、`open questions`。只有当 `open questions` 仍阻塞提案，或存在多种可行方案 / 架构分歧时，才升级进入 `brainstorming`。
- implementation flow: 先读取 `.praxis/rules.md`；如果当前工作来自已批准 proposal，开始编码前先检查 Git 分支；若已位于与该 change 对应的专用实现分支，可继续复用，否则必须加载 `git-workflow` 并创建或切换到实现分支。
- implementation flow: 如果项目已应用 built-in runtime base，先读取 `.praxis/foundation/README.md` 与 `.praxis/foundation/profile/`，把它视作运行时基线；开始实现前优先检查其中的 `branch-workflow.md`、`verification.md`、`operating-agreements.md`；OpenSpec 仅在治理 / proposal 场景中作为入口。
- implementation flow: 技术栈 skill 保持按需加载；需要项目或技术栈 skill 时，再读取 `.praxis/skills/INDEX.md` 并打开对应 `SKILL.md`。若任务变成多步骤依赖、出现 bug / 失败测试、或存在可并行子任务，必须分别判断 `writing-plans`、`systematic-debugging`、`subagent-driven-development`。
- review flow: 先读取 `.praxis/rules.md`；如涉及评审流程或提案关联，再读取对应 skill 与 OpenSpec 文件。

{{dependency_gate_summary}}

{{foundation_section}}

{{project_skills_section}}

## Canonical Sources

- `.praxis/framework-rules.md`：完整框架门控规则
- `.praxis/rules.md`：完整技术栈 / 项目规则
- `.praxis/foundation/README.md`：built-in runtime base 总览
- `.praxis/foundation/profile/`：runtime profile 基线
- `.praxis/overlays/`：runtime overlay 扩展点
- `.praxis/skills/INDEX.md`：当前项目可用 skills 摘要
- `openspec/AGENTS.md`：OpenSpec 规范驱动工作流
- `openspec/project.md`：项目规范上下文
