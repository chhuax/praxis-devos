## 实现顺序（推荐）

### 1. 基础设施

- [x] 1.1 新增 managed asset manifest 的结构与读写规则
- [x] 1.2 固化 Claude Code command 投放面与路径约定
- [x] 1.3 固化 OpenCode command 投放面与路径约定
- [x] 1.4 明确 Codex 在本阶段保持 skills-first 的边界

### 2. command 模板资产

- [x] 2.1 新增 Claude Code docs command 模板：
  - `~/.claude/commands/devos-docs-init.md`
  - `~/.claude/commands/devos-docs-refresh.md`
- [x] 2.2 新增 OpenCode docs command 模板：
  - `~/.config/opencode/commands/devos-docs-init.md`
  - `~/.config/opencode/commands/devos-docs-refresh.md`
- [x] 2.3 统一 command 模板的最小内容 contract，保证它们只做薄包装
- [x] 2.4 固化 slash command 命名约定：`/devos-docs-init`、`/devos-docs-refresh`

### 3. 用户级托管资产管理

- [x] 3.1 在用户级宿主目录安装 Claude/OpenCode docs commands
- [x] 3.2 在 `sync` 中更新 manifest 中已托管的 docs commands
- [x] 3.3 将用户级 skill / command 资产纳入统一 manifest 与清理逻辑
- [x] 3.4 确保未被 Praxis 托管的同名 skill / command 文件不会被无条件覆盖

### 4. 文案与兼容路径

- [x] 4.1 更新 `managed-entry.md`，将 `/devos:docs-init`、`/devos:docs-refresh` 收敛为 `/devos-docs-init`、`/devos-docs-refresh`
- [x] 4.2 更新文案，说明 Claude/OpenCode 推荐使用 host commands，Codex 当前通过 `devos-docs` skill 使用 docs 能力
- [x] 4.3 将 `praxis-devos docs init|refresh|check` 的文案定位统一为 compatibility / fallback path
- [x] 4.4 更新 `design.md` 的宿主调研、manifest、命名与入口协调章节

### 5. 测试

- [x] 5.1 增加 Claude user-level command 资产的安装、更新与托管测试
  - [x] 5.1.1 `setup` 写入 `~/.claude/commands/devos-docs-init.md`
  - [x] 5.1.2 `setup` 写入 `~/.claude/commands/devos-docs-refresh.md`
  - [x] 5.1.3 manifest 注册 Claude command 资产
  - [x] 5.1.4 `sync` 更新已托管 Claude command
  - [x] 5.1.5 `sync` 跳过未托管同名 Claude command
- [x] 5.2 增加 OpenCode user-level command 资产的安装、更新与托管测试
  - [x] 5.2.1 `setup` 写入 `~/.config/opencode/commands/devos-docs-init.md`
  - [x] 5.2.2 `setup` 写入 `~/.config/opencode/commands/devos-docs-refresh.md`
  - [x] 5.2.3 manifest 注册 OpenCode command 资产
  - [x] 5.2.4 `sync` 更新已托管 OpenCode command
  - [x] 5.2.5 `sync` 跳过未托管同名 OpenCode command
- [x] 5.3 验证 command 模板与 `devos-docs` skill 的 contract 对齐
  - [x] 5.3.1 command 模板引用正确的 canonical paths
  - [x] 5.3.2 command 模板不包含与 skill 冲突的 writeback 规则
  - [x] 5.3.3 refresh command 明确说明非破坏性更新
- [x] 5.4 验证帮助文案不再把 compatibility path 作为推荐入口
  - [x] 5.4.1 `managed-entry.md` 优先推荐 host commands
  - [x] 5.4.2 `managed-entry.md` 将 CLI 标记为 fallback
  - [x] 5.4.3 文案明确 Codex 当前通过 skill 使用 docs 能力
- [x] 5.5 验证 managed asset manifest 能正确记录和识别 skill / command 资产
  - [x] 5.5.1 manifest JSON 结构正确
  - [x] 5.5.2 能正确识别托管资产
  - [x] 5.5.3 能正确判断覆盖权限
- [x] 5.6 验证用户手动修改或自管同名 skill / command 文件后的 `sync` 行为
