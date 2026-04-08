## 新增需求

### 需求：支持为 Claude Code 投放项目级 docs command adapters

系统必须能将 `devos-docs` 的宿主 command 外壳投放到 Claude Code 项目级 commands 目录。

#### 场景：setup 为 Claude 项目写入 docs init command
- **当** 用户项目启用了 Claude 适配
- **并且** 运行 `setup` 或 `sync`
- **则** 仓库写入 `.claude/commands/devos-docs-init.md`
- **并且** 该 command 模板明确指向 `devos-docs` skill 的 `mode=init`

#### 场景：setup 为 Claude 项目写入 docs refresh command
- **当** 用户项目启用了 Claude 适配
- **并且** 运行 `setup` 或 `sync`
- **则** 仓库写入 `.claude/commands/devos-docs-refresh.md`
- **并且** 该 command 模板明确指向 `devos-docs` skill 的 `mode=refresh`

#### 场景：Claude command 不重写 skill contract
- **当** Claude command 模板被投放
- **则** 模板只承担宿主入口包装职责
- **并且** 不复制完整的 `devos-docs` skill 正文
- **并且** 不引入与 `devos-docs` skill 不一致的 writeback 或 validation 规则

### 需求：支持为 OpenCode 投放项目级 docs command adapters

系统必须能将 `devos-docs` 的宿主 command 外壳投放到 OpenCode 项目级 commands 目录。

#### 场景：setup 为 OpenCode 项目写入 docs init command
- **当** 用户项目启用了 OpenCode 适配
- **并且** 运行 `setup` 或 `sync`
- **则** 仓库写入 `.opencode/commands/devos-docs-init.md`
- **并且** 该 command 模板明确指向 `devos-docs` skill 的 `mode=init`

#### 场景：setup 为 OpenCode 项目写入 docs refresh command
- **当** 用户项目启用了 OpenCode 适配
- **并且** 运行 `setup` 或 `sync`
- **则** 仓库写入 `.opencode/commands/devos-docs-refresh.md`
- **并且** 该 command 模板明确指向 `devos-docs` skill 的 `mode=refresh`

#### 场景：OpenCode command 采用项目级 markdown commands
- **当** 本 change 在仓库内实现 docs command adapters
- **则** OpenCode command 资产采用 `.opencode/commands/*.md` 的项目级 markdown 文件形式
- **并且** 不要求本次 change 把 docs 入口改成 plugin-only path

### 需求：Codex 在本阶段保持 skills-first

系统必须明确 Codex 在本阶段不实现未被官方文档支撑的 project-level docs command adapter。

#### 场景：Codex 继续通过 skill 使用 docs 能力
- **当** 用户项目启用了 Codex 适配
- **则** `devos-docs` 仍通过已有 skill 投影可用
- **并且** 仓库不生成 `.codex/...` 的 docs command 文件

#### 场景：Codex command adapter 不在本阶段强制实现
- **当** 仓库执行本 change 的验收
- **则** 验收不要求 Codex 存在 project-level docs command adapter
- **并且** 不得为了对齐其他宿主而发明未经官方文档支撑的 Codex command 投放路径

### 需求：host command adapter 必须与现有 docs contract 保持一致

系统必须确保新增加的宿主 command adapter 不会引入另一套 docs 协议。

#### 场景：command 模板引用 canonical docs path
- **当** Claude 或 OpenCode command 模板被安装
- **则** 模板引用当前 canonical docs path：`contracts/surfaces.yaml`
- **并且** 模板引用 `docs/codemaps/**`

#### 场景：command 模板不改变 allowed target set
- **当** Claude 或 OpenCode command 模板触发 `devos-docs`
- **则** 它们必须遵守已有 allowed target set
- **并且** 不得把 `docs/surfaces.yaml` 之类非 canonical path 讲成有效目标

#### 场景：refresh command 明确保守更新
- **当** `devos-docs-refresh` command 被投放
- **则** 模板明确 refresh 是非破坏性的更新
- **并且** 不隐式删除、重命名或迁移 docs 产物

### 需求：command 资产属于项目级托管文件

系统必须将 docs command adapters 作为用户项目中的托管资产来管理。

#### 场景：setup 安装项目级 command 资产
- **当** 用户在项目中运行 `setup`
- **则** Claude/OpenCode command 文件写入项目目录
- **并且** 不写入用户 home 目录

#### 场景：sync 更新已托管的 command 资产
- **当** 用户在项目中运行 `sync`
- **则** 已被 Praxis 托管的 Claude/OpenCode command 文件会被更新
- **并且** 未被 Praxis 托管的同名文件不会被无条件覆盖

#### 场景：sync 清理已失效的 command 资产
- **当** 某个宿主不再是启用目标
- **则** 该宿主对应的托管 docs command 资产会被清理
- **并且** 清理范围仅限 Praxis 自己托管的文件

### 需求：compatibility path 在帮助文案中降级为 fallback

系统必须在文案和托管说明层面把 `praxis-devos docs ...` 降级为 fallback / compatibility path。

#### 场景：managed guidance 优先推荐宿主 command
- **当** `managed-entry.md` 被注入用户项目
- **则** 文案优先引导 Claude/OpenCode 用户使用宿主 command
- **并且** 将 `praxis-devos docs init|refresh|check` 说明为 compatibility / fallback path

#### 场景：help 文案不把 compatibility path 表述成首选入口
- **当** 仓库对外描述 docs 工作流
- **则** 不把 `praxis-devos docs init|refresh` 表述成推荐主入口
- **并且** 它们只作为 deterministic fallback 或内部辅助
