## 1. 建立 release-kit 边界

- [x] 1.1 创建 `release-kit/` 根目录及其基础结构（`skill/`、`scripts/`、`test/`、`fixtures/`、`README.md`）
- [x] 1.2 为 `release-kit/` 定义第一版边界说明，明确仅支持 Node/npm + git + GitHub workflow，且为仓库内 maintainer 工具，不接入投影体系

## 2. 实现工作区准备与 worktree 策略

> blocked-by: 1

- [x] 2.1 在 `release-kit/scripts/lib.mjs` 中实现 `ensureMainWorktree()`：检测当前分支和工作区状态，决定直接执行或创建临时 worktree
- [x] 2.2 实现 worktree 的 cleanup 钩子（正常退出清理 + 异常退出时输出路径供手动清理）
- [x] 2.3 在 `lib.mjs` 中实现 `loadConfig()`：从 `package.json` 的 `"release-kit"` 字段读取项目配置，提供默认值回退
- [x] 2.4 确保 `ensureMainWorktree()` 返回 `workDir` 和 `repoRoot`，后续脚本全部基于这两个路径工作

## 3. 实现 verify 状态机

> blocked-by: 2

- [x] 3.1 实现 `release-kit/scripts/verify.mjs`，接收 `workDir` 参数，覆盖 `package.json` 版本、`CHANGELOG.md`、测试命令与 `npm pack` 校验
- [x] 3.2 为 verify 结果定义 verified state 格式（目标版本、tarball 路径、已执行检查、生成时间），写入主仓库根目录的 `.release-state.json`
- [x] 3.3 确保 `.release-state.json` 加入 `.gitignore`

## 4. 实现 publish 与 tag

> blocked-by: 3

- [x] 4.1 实现 `release-kit/scripts/publish.mjs`，在缺少有效 verified state 或版本漂移时拒绝执行
- [x] 4.2 `publish.mjs` 职责：npm publish + git tag + git push tag，接收 `workDir` 参数

## 5. 实现 GitHub Release

> blocked-by: 4

- [x] 5.1 实现 `release-kit/scripts/release.mjs`，在 publish 与 tag 完成后创建 GitHub Release
- [x] 5.2 支持补偿路径：检测到 npm 包与 git tag 已存在但 GitHub Release 缺失时，可单独执行 release 补偿
- [x] 5.3 完整 release 后更新 `.release-state.json` 状态为完成

## 6. 定义 skill 与交互协议

> blocked-by: 2

- [x] 6.1 编写 `release-kit/skill/SKILL.md`，定义 verify / publish / release 三种模式及输入收集规则
- [x] 6.2 skill 负责收集目标版本、release order 确认；实际执行全部委托给 scripts
- [x] 6.3 确保 skill 只负责交互和策略，不直接承载高风险确定性发布命令实现

## 7. 补齐测试与可验证性

> blocked-by: 4, 5

- [x] 7.1 为 `ensureMainWorktree()` 添加测试：覆盖"已在 main + clean"、"脏工作区 → worktree"、"worktree 创建失败 → 拒绝"三条路径
- [x] 7.2 为 `verify.mjs`、`publish.mjs`、`release.mjs` 添加单元测试
- [x] 7.3 为中断恢复场景添加 fixtures 驱动测试：npm publish 成功但 tag 失败、tag 成功但 GitHub Release 失败
- [x] 7.4 将 release-kit 测试纳入现有 `node --test` 流程，确保不破坏当前仓库测试面

## 8. 变更级文档

> blocked-by: 5

- [x] 8.1 生成 `openspec/changes/add-release-kit/blackbox-test.md`：描述 release-kit 的黑盒行为契约与验收场景

## 9. 文档收尾

> blocked-by: 7, 8

- [x] 9.1 在 `release-kit/README.md` 中记录第一版范围、使用方式、非目标范围与 worktree 策略说明
- [x] 9.2 在完成实现后复核是否仍满足 Node/npm 限定与 GitHub Release 完整性要求
