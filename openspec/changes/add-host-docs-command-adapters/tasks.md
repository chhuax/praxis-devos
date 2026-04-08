## 1. 宿主调研与设计对齐

- [ ] 1.1 固化 Claude Code command 投放面与路径约定
- [ ] 1.2 固化 OpenCode command 投放面与路径约定
- [ ] 1.3 明确 Codex 在本阶段保持 skills-first 的边界
- [ ] 1.4 将调研结论回写到 managed guidance 与 design 文档

## 2. command 模板资产

- [ ] 2.1 新增 Claude Code docs command 模板：
  - `.claude/commands/devos-docs-init.md`
  - `.claude/commands/devos-docs-refresh.md`
- [ ] 2.2 新增 OpenCode docs command 模板：
  - `.opencode/commands/devos-docs-init.md`
  - `.opencode/commands/devos-docs-refresh.md`
- [ ] 2.3 统一 command 模板的最小内容 contract，保证它们只做薄包装

## 3. 项目级 command 资产管理

- [ ] 3.1 在 `setup` 中安装 Claude/OpenCode project-level docs commands
- [ ] 3.2 在 `sync` 中更新已托管的 docs commands
- [ ] 3.3 为 docs commands 增加托管标记与清理逻辑
- [ ] 3.4 确保未被 Praxis 托管的同名 command 文件不会被无条件覆盖

## 4. 文案与兼容路径

- [ ] 4.1 更新 `managed-entry.md`，优先引导支持命令的宿主使用 host commands
- [ ] 4.2 将 `praxis-devos docs init|refresh|check` 的文案定位统一为 compatibility / fallback path
- [ ] 4.3 明确 Codex 当前通过 skill 使用 docs 能力

## 5. 测试

- [ ] 5.1 增加 Claude project command 资产的安装、更新、清理测试
- [ ] 5.2 增加 OpenCode project command 资产的安装、更新、清理测试
- [ ] 5.3 验证 command 模板与 `devos-docs` skill 的 contract 对齐
- [ ] 5.4 验证 help / managed guidance 文案不再把 compatibility path 作为推荐入口
