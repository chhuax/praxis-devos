# release-kit 黑盒测试说明

## 测试目标

验证 `release-kit/` 作为仓库内 maintainer-only 发布边界时，对外可观察行为满足以下合同：

- 在 clean `main` 与非 clean / 非 `main` 场景下正确选择当前工作区或临时 worktree
- `verify` 必须先于 `publish`，并在主仓库根目录生成 `.release-state.json`
- `publish` 在 verified state 缺失或版本漂移时拒绝执行
- `release` 负责 GitHub Release 的创建与补偿路径
- 完整 release 完成后，状态文件更新为 `completed`

## 范围

本黑盒说明覆盖 v1 范围内的 Node/npm + git + GitHub Release workflow，不覆盖：

- 多生态发布
- monorepo 多包版本编排
- 历史 release 批量补齐

## 前置条件

- 仓库存在 `package.json` 与 `CHANGELOG.md`
- git 可用，且可解析 `origin/main`
- npm / gh 命令在真实运行环境中可用
- `release-kit/skill/SKILL.md` 用于收集目标版本与 release order

## 操作约束

- `publish` 之前必须已有有效 `.release-state.json`
- release order 必须显式确认
- `release` 可在已 publish + 已 tag 但缺失 GitHub Release 的场景执行补偿
- `.release-state.json` 写入 `repoRoot`，不写入临时 worktree

## 核心黑盒场景

### 场景 1：已在 clean main

- **给定** 当前分支为 `main`、工作区干净且 `HEAD == origin/main`
- **当** maintainer 进入 release-kit workflow
- **则** 直接使用当前工作区，不创建临时 worktree

### 场景 2：脏工作区或不在 main

- **给定** 当前工作区不满足 clean `main` 条件
- **当** maintainer 进入 release-kit workflow
- **则** 创建临时 worktree，并在异常清理失败时输出手动清理路径

### 场景 3：verify 成功

- **给定** `package.json` 版本与 `CHANGELOG.md` 条目一致，测试命令与 `npm pack` 成功
- **当** 执行 `verify`
- **则** 在主仓库根目录写入 `status=ready` 的 `.release-state.json`

### 场景 4：publish 前置校验

- **给定** verified state 缺失或版本漂移
- **当** 执行 `publish`
- **则** 拒绝执行 `npm publish` / `git tag` / `git push`

### 场景 5：publish 成功

- **给定** verified state 有效且版本一致
- **当** 执行 `publish`
- **则** 顺序执行 `npm publish`、`git tag v<version>`、`git push origin v<version>`

### 场景 6：release 创建与补偿

- **给定** 已 publish 且 tag 存在，但 GitHub Release 不存在
- **当** 执行 `release`
- **则** 调用 `gh release create v<version> --generate-notes`
- **且** 完成后更新 `.release-state.json` 为 `completed`

## 通过标准

- `release-kit/test/*.test.js` 全部通过
- 仓库全量 `node --test` 通过
- `release-kit/skill/SKILL.md` 明确 verify / publish / release 三种模式与输入收集规则
- `release-kit/README.md` 记录范围、使用方式、非目标范围与 worktree 策略

## 回归关注点

- skill 文本收紧后，不得破坏既有 maintainer-only / projection exclusion 合同
- 补偿路径失败时，不得错误把状态写成 `completed`
- publish 失败时，不得错误覆盖 verified state
- worktree cleanup 失败时，必须保留可见的手动清理路径提示
