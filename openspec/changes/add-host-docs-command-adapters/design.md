## 背景

当前仓库已经具备 `devos-docs` 的核心能力：

- `devos-docs` skill
- host-to-subagent handoff contract
- AI 结果 writeback contract
- deterministic validator
- compatibility / fallback path

缺的不是能力内核，而是宿主入口。用户前面明确了两个判断：

1. 这类入口更应该落在宿主 command，而不是 `praxis-devos docs ...` 这种框架自有 CLI。
2. command 是宿主专属外壳，skill 是跨宿主的内核。

本次 change 的目标是把这个分层落成仓库内可测的实现。

## 调研结论

### Claude Code

官方文档当前结论很明确：

- `.claude/commands/*.md` 仍然可用。
- custom commands 已经合并进 skills 的统一体系。
- 同名时 skill 优先。
- skills 仍然是官方更推荐的形态，因为支持 supporting files、自动加载、subagent、动态上下文等能力。

因此对 Claude Code 的策略应为：

- 允许投放 project-level command 文件
- command 只做入口包装
- 真正能力保持在 `devos-docs` skill

### OpenCode

OpenCode 官方文档明确支持：

- `.opencode/commands/*.md` 作为 per-project commands
- `~/.config/opencode/commands/` 作为全局 commands
- 也可通过 config 的 `command` 字段定义

对 Praxis 来说，最自然的路径是：

- 继续让 `setup` / `sync` 写用户项目目录
- 直接投放 `.opencode/commands/*.md`
- 不把 `opencode-plugin.js` 当成本次 command 入口的唯一实现面

### Codex

官方文档当前明确列出了：

- app commands
- IDE / CLI slash commands
- skills
- AGENTS.md
- plugins

但本次调研没有找到与 Claude/OpenCode 对等的“仓库内 project-level custom command 文件投放面”的官方文档。基于这个现实，本次不应发明一套 Codex command 落盘约定。

因此对 Codex 的策略应为：

- 继续 skills-first
- 不在本次实现中新增未被官方文档支撑的 project-level command adapter
- 在文档中明确这是宿主能力差异，不是 Praxis 功能缺失

### ECC 可借鉴的部分

ECC 在这件事上的模式值得借鉴，但不应照搬其大 catalog：

- `commands/*.md` 作为宿主入口包装
- `doc-updater` 这类 agent / skill 负责真正执行
- `/update-docs`、`/update-codemaps` 这类 command 保持薄包装
- 共享逻辑放在 agent / skill 和脚本层

我们应该借鉴的是“薄 command + 共享 skill 内核”的组织方式，而不是复制大量 legacy command shims。

## 目标 / 非目标

**目标：**

- 为 Claude Code 和 OpenCode 增加 project-level docs command adapters
- 明确 command 与 `devos-docs` skill 的职责边界
- 让 `setup` / `sync` 能安装、更新、清理这些 command 资产
- 定义 command 模板的最小内容 contract
- 保持与当前 compatibility / fallback path 一致的 canonical path 和 validation 语义
- 明确 Codex 在本阶段保持 skills-first

**非目标：**

- 不重新设计 `devos-docs` skill contract
- 不替换现有 `writeback`、`validation`、`compatibility` 逻辑
- 不把 OpenCode plugin tools 重构成 command-only 体系
- 不在本次变更中发明 Codex 的自定义 project command 投放约定
- 不扩展到 `reference/guides/runbooks`

## 设计决策

### 1. command 是宿主专属入口，skill 是跨宿主内核

本次 change 采用固定分层：

- host command：用户入口
- `devos-docs`：跨宿主共享 skill
- existing writeback / validation：共享执行约束

command 只负责：

- 告诉宿主该做什么
- 指定 `mode=init` 或 `mode=refresh`
- 引导普通子 agent 执行 `devos-docs`
- 提醒使用既有的 deterministic validation / compatibility path

command 不负责：

- 重复写一整套 `devos-docs` 逻辑
- 绕过结构化输出 contract
- 绕过 canonical path / allowed target rules

### 2. Claude Code 采用项目级 `.claude/commands/` 投放

项目内路径固定为：

- `.claude/commands/devos-docs-init.md`
- `.claude/commands/devos-docs-refresh.md`

采用扁平命名而不是目录命名空间，原因是本阶段官方文档已明确 `.claude/commands/*.md` 可用，但没有必要在 Praxis 侧额外依赖未验证的嵌套命令命名行为。

这些 command 模板的正文应：

- 明确调用 `devos-docs`
- 明确 `mode=init` 或 `mode=refresh`
- 指向当前 canonical docs contract：
  - `contracts/surfaces.yaml`
  - `docs/codemaps/**`
- 提醒生成结果必须遵守现有 writeback / validation contract

### 3. OpenCode 采用项目级 `.opencode/commands/` 投放

项目内路径固定为：

- `.opencode/commands/devos-docs-init.md`
- `.opencode/commands/devos-docs-refresh.md`

本阶段优先采用 markdown command 文件，而不是 config JSON 或 plugin-only command surfaces，原因是：

- 与 Claude Code 的模板资产形态更一致
- 更适合 `setup` / `sync` 直接落盘
- 更适合项目级托管和 cleanup

OpenCode 现有 `opencode-plugin.js` 保留，不作为本次 command adapter 的唯一入口。

### 4. Codex 在本阶段保持 skills-first，不新增 project-level command adapter

由于没有找到足够明确的官方文档来支撑仓库内 custom command 投放面，本次 change 对 Codex 采取保守策略：

- 继续投影 `devos-docs` skill
- managed guidance 说明 Codex 当前通过 skill 使用 docs 能力
- 不新增 `.codex/...` 命令模板资产

后续如果官方文档明确提供 project-level custom command 安装面，再单独追加 change。

### 5. command 资产属于项目模板，不属于 home-level skill projection

当前 projection 层负责把 skill 投到各宿主的 user-home skill 发现面。command adapter 不同，它应该属于用户项目本身。

因此本次实现应区分两类资产：

- home-level/shared：skills projection
- project-level/local：command templates

command adapter 的安装、更新、清理应放在 `setup` / `sync` 的 project asset 管理逻辑里，而不是塞进现有 `src/projection/*.js` 的 user-home projector。

### 6. command 模板必须是薄包装，且与现有 contract 对齐

每个 command 模板至少要包含：

- command 描述
- 对应 mode
- 调用 `devos-docs` 的明确指令
- 允许写入目标与 canonical path 提示
- refresh 时的保守更新提示

但 command 模板不应：

- 内嵌完整的 `devos-docs` skill 全文
- 引入另一套 path 或 writeback 规则
- 把 compatibility path 讲成推荐主路径

### 7. compatibility path 保留，但从推荐入口降级

`praxis-devos docs init|refresh|check` 继续保留，原因是：

- 已经存在实现和测试
- 仍可作为 deterministic fallback / compatibility path

但在 managed guidance、command 模板和后续文档里，其定位应统一为：

- fallback
- compatibility
- internal helper

而不是推荐给宿主用户的首选入口。

## 风险 / 权衡

- [风险] Claude Code 已将 custom commands 融入 skills 语义，未来可能继续弱化 `.claude/commands/`
  - 缓解：保留 `devos-docs` skill 为核心能力，command 仅是可替换外壳。
- [风险] OpenCode 既有 commands 又有 plugin/tool surfaces，容易出现双轨入口
  - 缓解：本次只为 docs 能力定义 command adapter，plugin tools 不作为 docs 的主入口。
- [风险] Codex 没有明确的 project-level custom command 投放文档，贸然实现会发明非官方约定
  - 缓解：本次明确不做 Codex command adapter。

## 验收边界

本仓库可验收的内容：

- command 模板资产存在且内容正确
- `setup` / `sync` 能正确安装和更新 Claude/OpenCode command 文件
- command 资产清理遵循托管边界
- managed guidance 与 command / skill 分层一致
- compatibility path 的帮助文案与定位一致

本仓库当前不验收的内容：

- Claude Code / OpenCode 实际运行 command 后的宿主 UI 交互体验
- Codex 尚不存在的 project-level custom command 安装面
