## Context

当前仓库已经明确要求发布动作必须由维护者显式确认，并且需要确保 npm publish、git tag 与 GitHub Release 之间的状态一致性；但这些约束目前散落在 `AGENTS.md`、`CLAUDE.md`、CI 约定和维护者临时执行过程中，缺少统一的确定性实现边界。仓库本身也已经形成了稳定的职责分离：人类/AI 协议内容由 skill 承载，确定性执行逻辑由 JS 脚本承载，因此新的 release workflow 必须遵循同样的边界，而不是再次混入 ad hoc 对话流程。

此外，本仓库受 OpenSpec 主导，发布流程设计必须写入 `openspec/changes/<change>/...`，而不能创建第二套 `docs/superpowers/...` 文档体系。第一版目标范围也已经明确收敛到 Node/npm 项目，避免在初版中引入 monorepo、多语言生态或非 GitHub forge 的额外复杂度。

## Goals / Non-Goals

**Goals:**
- 在仓库内新增独立边界 `release-kit/`，承载第一版通用 Node/npm release workflow
- 采用 `Skill + repo scripts` 执行模型，明确交互层与确定性执行层分工
- 定义 verify / publish / release 三阶段状态机，保证未 verify 不可 publish，且发布完成必须包含 GitHub Release
- 为项目差异保留明确的配置注入点，例如 test command、smoke command、GitHub Release 模板
- 使该边界未来可以整体抽离为独立项目或 extension pack，而无需大规模重写内部结构

**Non-Goals:**
- 第一版不支持 pnpm、yarn、bun、PyPI、Cargo、Go 等多生态发包流程
- 第一版不支持 monorepo 多包 versioning 或 changesets / semantic-release 集成
- 第一版不自动补齐历史缺失的 GitHub Release、tag 或 npm 版本
- 第一版不要求新增 `praxis-devos` CLI 对外命令面，除非后续实现阶段明确需要

## Decisions

### Decision: 采用仓库内独立目录 `release-kit/`
`release-kit/` 作为一个清晰的产品边界，内部再拆分为 `skill/`、`scripts/`、`test/`、`fixtures/`、`README.md`。这样既避免继续把 release 能力散落在 `assets/skills/`、顶层 `scripts/`、测试文件和维护者记忆中，又保留未来整体抽离成独立项目的可能性。

**Alternatives considered:**
- 直接放回 `assets/skills/` + 顶层 `scripts/`：实现最快，但会继续扩大 release 逻辑在仓库中的分散度
- 立即拆成单独项目：可复用性更强，但在第一版接口尚未稳定时会过早引入版本协同和分发成本

### Decision: 采用 `Skill + repo scripts` 执行模型
`release-kit/skill/SKILL.md` 负责收集输入、约束流程和定义交互协议；`release-kit/scripts/*.mjs` 负责 verify、publish、状态持久化以及与 npm / git / GitHub 的确定性交互。skill 不直接承载高风险命令实现，脚本也不自行承担交互式决策。

**Alternatives considered:**
- Skill only：实现快，但容易再次出现遗漏 GitHub Release 之类的非确定性错误
- CLI first + skill wrapper：长期更强，但第一版会引入额外接口设计成本，并且可能扩大当前 CLI surface

### Decision: `release-kit/skill/SKILL.md` 第一版不接入现有投影体系
release-kit 第一版定位为仓库内 maintainer 工具，而不是投影到用户级 agent 目录的通用 skill。因此 `release-kit/skill/SKILL.md` 在第一版中不进入现有 `assets/skills/` → `src/projection/*` 投影路径，而是作为仓库内入口与 `release-kit/scripts/*` 协同工作。

**Alternatives considered:**
- 直接接入现有投影体系：会把 release-kit 过早绑定为用户侧通用 skill，扩大第一版分发与兼容面
- 完全不保留 skill 入口：会削弱交互层与执行层分离的目标

### Decision: 第一版通用范围限定为 Node/npm + git + GitHub
release-kit v1 仅假设项目存在 `package.json`、使用 npm publish、使用 git tag，并采用 GitHub Release 工作流。对于 smoke、test 等项目差异，通过配置注入点解决，而不是将第一版做成多生态总线。

**Alternatives considered:**
- 直接做任意 git + GitHub 项目：会弱化 npm pack / publish / version 校验这些本仓库已经需要的能力
- 直接做多生态：会把设计重心从”做稳发布闭环”转移到”做大抽象层”，超出当前问题范围

### Decision: release-kit 的职责边界从 main 分支开始，不包含 PR/merge
release-kit 不负责 PR 创建、代码审查和 merge。进入 release-kit 流程的前提是目标版本的代码已经 merge 到 main 分支。release-kit 的职责链为：工作区准备 → verify → publish → tag → GitHub Release。

**Alternatives considered:**
- 把 PR/merge 也纳入流程：PR 和 merge 是人机交互行为，放进确定性脚本会模糊交互层与执行层的分工，而且不同项目的 PR 流程差异很大
- 假设维护者手动切到 main：增加人工操作负担，容易在非 main 分支上误执行发布

### Decision: 自动 worktree 策略保证在干净的 main 上执行
release-kit 在入口阶段检测当前工作区状态，并采用以下策略：

1. **当前已在 main、工作区干净，且 HEAD 与 `origin/main` 一致** → 直接在当前目录执行
2. **当前不在 main，或存在未提交变更，或本地 main 与 `origin/main` 不一致** → 自动创建临时 git worktree，checkout 远端 main（`origin/main`），在 worktree 内执行全部后续流程，完成后自动清理 worktree
3. **worktree 创建失败**（如已存在同名 worktree、git 状态异常） → 拒绝执行，输出明确的失败原因

所有后续脚本（verify / publish / tag / release）接收 `workDir` 参数，不假设 `process.cwd()` 是执行目录。

**Alternatives considered:**
- 仅检查并拒绝：安全但会打断维护者工作流，尤其是在开发分支上临时需要发包时
- 自动 stash + checkout main + restore：对主工作区有侵入性，stash 丢失风险高于 worktree

### Decision: 第一版配置采用约定式发现
第一版通过 `package.json` 的 `"release-kit"` 字段读取项目级配置（test command、smoke command 等），不引入独立配置文件格式。内部通过 `loadConfig()` 抽象隔离，未来拆仓或切换为独立配置文件时只需替换该函数。

**Alternatives considered:**
- 独立 YAML/JSON 配置文件：第一版只服务本仓库，引入额外配置文件增加维护负担
- 纯脚本参数：无法持久化项目约定，每次执行都需要手动传参

### Decision: verified state 存储在主仓库根目录
verify 阶段产出的 `.release-state.json` 写入主仓库根目录（而非 worktree 内），因为 worktree 会在流程完成后清理。这里的 `repoRoot` 指维护者最初发起 release-kit 的主工作区根目录，不等同于 `workDir`。该文件加入 `.gitignore`，不进入版本控制。

**Alternatives considered:**
- 存在 worktree 内：worktree 清理后状态丢失，publish 无法消费
- 存在 `os.tmpdir()`：跨会话不可靠，维护者需要记住临时路径

### Decision: verify 是 publish 的硬前置条件
`verify.mjs` 必须生成可被 `publish.mjs` 消费的 verified state，其中包含目标版本、tarball 路径、已执行检查、生成时间等信息。`publish.mjs` 在缺少 verified state、版本漂移或检查结果失效时必须拒绝继续执行。

**Alternatives considered:**
- 允许 publish 临时补跑检查：会重新把 verify / publish 边界混回一次性脚本
- 允许只依赖对话确认：无法形成可测试、可重放的状态机

### Decision: tag 属于 `publish.mjs` 的子职责，而不是独立脚本
第一版不引入单独的 `tag.mjs`。`publish.mjs` 负责在 verify 成功后执行 npm publish、创建 git tag 并 push tag，从而把发布与 tag 保持在一个确定性步骤里；GitHub Release 则继续由独立的 `release.mjs` 负责。

**Alternatives considered:**
- 单独拆出 `tag.mjs`：职责更细，但会在第一版引入额外脚本边界而没有明显收益
- 将 GitHub Release 也并入 `publish.mjs`：会把补偿路径与完成条件混入同一巨石脚本

### Decision: “发布完成”必须包含 GitHub Release
release-kit 对“完整发布”的定义不再停留在 npm publish 或 tag push。对于声明要做 release 的路径，GitHub Release 创建成功是完成条件之一；若 npm publish 成功但 GitHub Release 缺失，状态必须标记为不完整，并提供补偿执行路径。

**Alternatives considered:**
- 把 GitHub Release 视为可选收尾步骤：无法解决当前真实问题
- 默认补历史缺口：会扩大风险范围，并把当前版本闭环与历史修复混在一起

## Risks / Trade-offs

- **[Risk] Node/npm 假设过强，未来迁移到多生态时需要重构** → **Mitigation**：把生态相关逻辑集中到 `scripts/lib.mjs` 和显式配置注入点，而不是散落到 skill 文本中
- **[Risk] 把 release 状态机做得过重，导致维护者使用成本增加** → **Mitigation**：限定第一版只覆盖当前仓库实际需要的 verify / publish / release 路径，不提前支持历史修复、多生态和 monorepo 版本编排
- **[Risk] OpenSpec 主导与 release-kit 目录边界之间出现职责混淆** → **Mitigation**：所有设计和实现决策继续通过 OpenSpec change 管理，而 `release-kit/` 仅作为仓库中的目标实现边界
- **[Risk] 自动 worktree 在特殊 git 状态下失败** → **Mitigation**：worktree 创建失败时拒绝执行并输出明确原因，不尝试 fallback 到 stash/checkout 等侵入性操作；同时为 worktree 清理注册 cleanup 钩子，防止异常退出时残留

## Migration Plan

1. 通过当前 OpenSpec change 完成 release-kit 的 proposal / design / spec / tasks，形成实现前合同。
2. 在实现阶段创建 `release-kit/` 基础目录与测试骨架。
3. 先落地 `lib.mjs`（含 worktree 策略与配置加载），再落地 `verify.mjs` 与 verified state，然后落地 `publish.mjs`，最后补 `release.mjs`（GitHub Release）与 `SKILL.md`。
4. 用 fixtures 和测试覆盖工作区策略三种路径、完整发布状态机与中断恢复，并与现有 `node --test` 流程集成。
5. 在确认仓库内运行稳定后，再决定是否把 release-kit 整体抽离为独立项目或 extension pack。

## Open Questions

- 项目级配置的 `"release-kit"` 字段结构是否需要在第一版即定义 JSON Schema，还是仅以文档约定为准？
- `publish.mjs` 是否需要在第一版支持 `--dry-run` 模式用于本地验证完整流程而不实际发包？
