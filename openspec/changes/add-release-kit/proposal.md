## Why

当前仓库的发包流程依赖临时人工执行与对话记忆，缺少一个可重复、可验证、可审计的统一边界。近期已经出现 npm 发布、git tag 与 GitHub Release 之间状态不一致的问题，这说明需要把 release 工作流收敛为稳定的 `release-kit/` 能力，而不是继续把流程分散在临时指令、仓库规则和维护者记忆中。

## What Changes

- 新增一个仓库内独立边界 `release-kit/`，用于承载 Node/npm 项目的通用 release workflow。
- 引入 `Skill + repo scripts` 执行模型：`SKILL.md` 负责交互与策略约束，`release-kit/scripts/*` 负责确定性执行。
- 为 release workflow 增加显式的 verify / publish / release 三阶段约束，确保未验证不能发布、发布未完成 GitHub Release 不算完成。PR 和 merge 不属于 release-kit 职责，进入流程的前提是代码已 merge 到 main。
- 引入自动 worktree 策略：当工作区不在 main 或不干净时，自动创建临时 worktree 在远端 main 上执行发布流程，完成后自动清理。
- 定义 release-kit 的可配置边界，使第一版对 Node/npm 项目通用，但不提前承诺多生态或多 forge 支持。
- 明确第一版不自动补齐历史缺失 release，仅保证当前目标版本的完整发布闭环。

## Capabilities

### New Capabilities
- `release-kit-workflow`: 定义一个面向 Node/npm 项目的通用 release workflow，覆盖 verify、publish、tag、GitHub Release 与显式发布顺序控制。

### Modified Capabilities
- 无

## Impact

- 新增目录：`release-kit/`
- 预期影响仓库内的 skill 组织方式、确定性脚本边界、测试组织方式，以及未来维护者执行发布的标准路径
- 不改变当前 `praxis-devos` CLI 对外命令面，除非后续设计明确要求增加调用入口
- 不直接修改现有 OpenSpec docs 能力，但需要与仓库的 OpenSpec 主导流程保持一致

## Docs Impact

- change-blackbox: yes
- change-api: no
- project-api-sync: no
- surfaces: no
- project-overview: no
- module-map: no
- modules: none
- notes: 本次变更主要新增仓库内 release workflow 边界与执行协议，不涉及对外 API 或 docs 合同更新
