## ADDED Requirements

### Requirement: release-kit SHALL provide a bounded release workflow for Node/npm projects
系统 SHALL 在仓库内提供一个独立的 `release-kit/` 边界，用于承载 Node/npm 项目的 release workflow。该边界 MUST 将交互协议与确定性执行逻辑分离，并且不得要求第一版支持多生态或非 GitHub forge。

#### Scenario: 仓库内独立边界被建立
- **WHEN** 项目实现 `release-kit` 能力
- **THEN** release 相关 skill、脚本、测试与 fixtures MUST 以 `release-kit/` 作为统一根目录组织
- **AND** release 相关实现不得再次散落为仓库中的临时测试残留、临时脚本或对话约定

#### Scenario: 第一版范围被显式限制
- **WHEN** 维护者查看 release-kit 的合同或入口文档
- **THEN** 文档 MUST 明确第一版仅支持 Node/npm + git + GitHub release workflow
- **AND** 文档 MUST 明确多生态、monorepo 多包 versioning 与历史 release 修复不属于第一版范围

### Requirement: release-kit SHALL separate orchestration from deterministic execution
release-kit MUST 采用 `Skill + repo scripts` 模型。skill SHALL 负责输入收集、发布顺序确认与策略约束；脚本 SHALL 负责 verify、publish、tag 与 GitHub Release 的确定性执行。skill MUST NOT 直接承载完整发布命令实现。

#### Scenario: skill 负责交互而脚本负责执行
- **WHEN** 维护者通过 release-kit 触发发布流程
- **THEN** skill MUST 显式收集目标版本、release order、tag/GitHub Release 选项等输入
- **AND** 实际 npm / git / gh 操作 MUST 由 `release-kit/scripts/*` 执行

#### Scenario: 确定性逻辑不依赖对话记忆
- **WHEN** release-kit 执行 verify 或 publish 阶段
- **THEN** 同一输入在相同仓库状态下 MUST 产生可重放、可测试的确定性结果
- **AND** 不得以“之前对话中已经确认”为唯一执行依据

### Requirement: release-kit SHALL remain a maintainer-only in-repo tool in v1
release-kit 第一版 MUST 保持为仓库内 maintainer 工具，而不是接入现有用户级投影体系的通用 skill。其 skill 入口 SHALL 位于 `release-kit/skill/` 边界内，并与 `release-kit/scripts/*` 协同工作。

#### Scenario: 第一版不接入投影体系
- **WHEN** 项目实现 release-kit v1
- **THEN** `release-kit/skill/SKILL.md` MUST NOT 作为 `assets/skills/` 的投影来源进入用户级 agent 目录
- **AND** release-kit 相关执行逻辑 MUST 保持在仓库内边界中

### Requirement: release-kit SHALL enforce verify as a hard prerequisite for publish
release-kit MUST 先执行 verify 阶段，并生成可供 publish 阶段消费的 verified state。若 verified state 缺失、版本不匹配或已失效，publish SHALL 拒绝执行。

#### Scenario: 未 verify 时拒绝 publish
- **WHEN** 维护者直接进入 publish 阶段且不存在有效 verified state
- **THEN** release-kit MUST 拒绝继续执行
- **AND** 返回结果 MUST 明确提示先完成 verify

#### Scenario: verify 产出可消费状态
- **WHEN** verify 阶段成功完成
- **THEN** release-kit MUST 记录目标版本、tarball 路径、已执行检查、生成时间与 ready 状态
- **AND** publish 阶段 MUST 基于该状态判断是否可继续执行

### Requirement: release-kit SHALL validate release candidates using current project expectations
verify 阶段 MUST 至少覆盖当前项目所依赖的发布前校验：版本与 changelog 一致性、测试执行、`npm pack` 成功，以及项目声明的 smoke / preflight 检查。该要求 MUST 通过配置注入点适配项目差异，而不是硬编码单一仓库细节。

#### Scenario: verify 覆盖基础发布前检查
- **WHEN** release-kit 对 Node/npm 项目执行 verify
- **THEN** 它 MUST 检查 `package.json` 版本、对应 changelog 条目、测试命令与 `npm pack` 结果
- **AND** 任何失败 MUST 阻止 verified state 进入 ready 状态

#### Scenario: 项目差异通过配置注入
- **WHEN** 某个项目需要自定义 test command、smoke command 或 working tree allowlist
- **THEN** release-kit MUST 提供显式配置注入点
- **AND** 不得要求通过修改 skill 文本才能适配单个项目

### Requirement: release-kit SHALL treat GitHub Release as part of release completion
对于声明要执行完整 release 的路径，release-kit MUST 将 GitHub Release 创建视为完成条件之一，而不仅是 npm publish 或 git tag。若 npm publish 成功但 GitHub Release 缺失，状态 SHALL 标记为不完整，并提供补偿执行路径。

#### Scenario: 完整 release 包含 GitHub Release
- **WHEN** 维护者选择完整 release 模式
- **THEN** release-kit MUST 在 publish 与 tag 之后检查并创建对应 GitHub Release
- **AND** 只有在 GitHub Release 创建成功后，结果才可标记为完整完成

#### Scenario: 已 publish 但缺失 GitHub Release 时可补偿
- **WHEN** npm 包与 git tag 已存在，但当前版本的 GitHub Release 不存在
- **THEN** release-kit MAY 执行补偿性 GitHub Release 创建
- **AND** 不得因此自动补齐其他历史版本的缺失 release

### Requirement: release-kit SHALL ensure execution on a clean main branch
release-kit MUST 在执行任何发布动作前确保当前执行环境位于远端 main 分支的最新状态。如果当前工作区不满足条件，release-kit MUST 自动创建临时 git worktree 来满足该条件，而不是要求维护者手动切换。

#### Scenario: 已在 main、工作区干净且与 origin/main 一致时直接执行
- **WHEN** 当前分支为 main、工作区无未提交变更，且当前 HEAD 与 `origin/main` 一致
- **THEN** release-kit MUST 直接在当前目录执行后续流程
- **AND** 不创建额外 worktree

#### Scenario: 不在 main 或工作区不干净时自动创建 worktree
- **WHEN** 当前分支不是 main，或存在未提交变更，或本地 main 与 `origin/main` 不一致
- **THEN** release-kit MUST 自动创建临时 git worktree 并 checkout 远端 main 最新状态
- **AND** 全部后续流程（verify / publish / tag / GitHub Release）MUST 在该 worktree 内执行
- **AND** 流程完成后 MUST 自动清理该 worktree

#### Scenario: worktree 创建失败时拒绝执行
- **WHEN** git worktree 创建失败（如同名 worktree 已存在、git 状态异常）
- **THEN** release-kit MUST 拒绝继续执行
- **AND** 返回结果 MUST 包含具体的失败原因

#### Scenario: 异常退出时清理 worktree
- **WHEN** 流程在 worktree 内执行过程中异常退出
- **THEN** release-kit SHOULD 通过注册的 cleanup 钩子清理临时 worktree
- **AND** 若清理失败，MUST 输出 worktree 路径以便维护者手动清理

### Requirement: release-kit SHALL require explicit release-order confirmation
release-kit MUST 在执行高风险发布动作前收集并确认发布顺序（verify、publish、tag、GitHub Release 的执行次序）。若顺序未明确确认，则不得进入发布阶段。PR 和 merge 不属于 release-kit 的职责范围。

#### Scenario: 缺少顺序确认时停止执行
- **WHEN** 维护者未确认 release order 就试图执行 release
- **THEN** release-kit MUST 停止执行
- **AND** 返回结果 MUST 明确指出需要先确认发布顺序

#### Scenario: 第一版支持显式受控顺序
- **WHEN** 第一版 release-kit 执行完整发布路径
- **THEN** 它 MUST 至少支持 `verify -> publish -> tag -> GitHub Release` 这一受控顺序
- **AND** PR 创建与 merge 不属于 release-kit 职责范围，进入 release-kit 流程的前提是代码已 merge 到 main
- **AND** 其他顺序是否支持 MUST 由实现显式声明，而不能由隐式默认推断

### Requirement: release-kit scripts SHALL accept workDir and not assume process.cwd()
所有 release-kit 确定性脚本（verify / publish / release）MUST 接收显式的 `workDir` 参数作为执行目录。`publish.mjs` 同时承担 git tag 创建与 push tag 的子职责。脚本 MUST NOT 假设 `process.cwd()` 是正确的执行目录，因为实际执行可能发生在自动创建的 worktree 中。

#### Scenario: 脚本在 worktree 中正确执行
- **WHEN** release-kit 在自动创建的 worktree 中执行 verify 或 publish
- **THEN** 脚本 MUST 基于传入的 `workDir` 解析 `package.json`、运行测试、执行 npm 命令
- **AND** verified state MUST 写入主仓库根目录 `repoRoot` 而非 worktree 内
