## 新增需求

### 需求：支持为 Claude Code 投放用户级 docs command adapters

系统必须能将 `devos-docs` 的宿主 command 外壳投放到 Claude Code 用户级 commands 目录。

#### 场景：setup 为 Claude 用户目录写入 docs init command
- **当** 用户启用了 Claude 适配
- **并且** 运行 `setup` 或 `sync`
- **则** 仓库写入 `~/.claude/commands/devos-docs-init.md`
- **并且** 该 command 模板明确指向 `devos-docs` skill 的 `mode=init`

#### 场景：setup 为 Claude 用户目录写入 docs refresh command
- **当** 用户启用了 Claude 适配
- **并且** 运行 `setup` 或 `sync`
- **则** 仓库写入 `~/.claude/commands/devos-docs-refresh.md`
- **并且** 该 command 模板明确指向 `devos-docs` skill 的 `mode=refresh`

#### 场景：Claude command 不重写 skill contract
- **当** Claude command 模板被投放
- **则** 模板只承担宿主入口包装职责
- **并且** 不复制完整的 `devos-docs` skill 正文
- **并且** 不引入与 `devos-docs` skill 不一致的 writeback 或 validation 规则

#### 场景：Claude command 名称与文件名一致
- **当** Claude docs command 模板被安装
- **则** 文件名使用 `devos-docs-init.md` 与 `devos-docs-refresh.md`
- **并且** 对应 slash command 为 `/devos-docs-init` 与 `/devos-docs-refresh`
- **并且** 不使用 `:` 分隔形式

### 需求：支持为 OpenCode 投放用户级 docs command adapters

系统必须能将 `devos-docs` 的宿主 command 外壳投放到 OpenCode 用户级 commands 目录。

#### 场景：setup 为 OpenCode 用户目录写入 docs init command
- **当** 用户启用了 OpenCode 适配
- **并且** 运行 `setup` 或 `sync`
- **则** 仓库写入 `~/.config/opencode/commands/devos-docs-init.md`
- **并且** 该 command 模板明确指向 `devos-docs` skill 的 `mode=init`

#### 场景：setup 为 OpenCode 用户目录写入 docs refresh command
- **当** 用户启用了 OpenCode 适配
- **并且** 运行 `setup` 或 `sync`
- **则** 仓库写入 `~/.config/opencode/commands/devos-docs-refresh.md`
- **并且** 该 command 模板明确指向 `devos-docs` skill 的 `mode=refresh`

#### 场景：OpenCode command 采用用户级 markdown commands
- **当** 本 change 在仓库内实现 docs command adapters
- **则** OpenCode command 资产采用 `~/.config/opencode/commands/*.md` 的用户级 markdown 文件形式
- **并且** 不要求本次 change 把 docs 入口改成 plugin-only path

#### 场景：OpenCode command 名称与文件名一致
- **当** OpenCode docs command 模板被安装
- **则** 文件名使用 `devos-docs-init.md` 与 `devos-docs-refresh.md`
- **并且** 对应 slash command 为 `/devos-docs-init` 与 `/devos-docs-refresh`
- **并且** 不使用 `:` 分隔形式

### 需求：Codex 在本阶段保持 skills-first

系统必须明确 Codex 在本阶段不实现未被官方文档支撑的用户级 docs command adapter。

#### 场景：Codex 继续通过 skill 使用 docs 能力
- **当** 用户项目启用了 Codex 适配
- **则** `devos-docs` 仍通过已有 skill 投影可用
- **并且** 仓库不生成 `.codex/...` 的 docs command 文件

#### 场景：Codex 不实现 command adapter
- **当** 仓库执行本 change 的验收
- **则** 验收不要求 Codex 存在用户级 docs command adapter
- **并且** 不得为了对齐其他宿主而发明未经官方文档支撑的 Codex command 投放路径

### 需求：host command adapter 必须与现有 docs contract 保持一致

系统必须确保新增加的宿主 command adapter 不会引入另一套 docs 协议。

#### 场景：command 模板引用 canonical docs path
- **当** Claude 或 OpenCode command 模板被安装
- **则** 模板引用当前 canonical docs path：`docs/surfaces.yaml`
- **并且** 模板引用 `docs/codemaps/**`

#### 场景：command 模板不改变 allowed target set
- **当** Claude 或 OpenCode command 模板触发 `devos-docs`
- **则** 它们必须遵守已有 allowed target set
- **并且** 不得把 `contracts/surfaces.yaml` 之类非 canonical path 讲成有效目标

#### 场景：refresh command 明确保守更新
- **当** `devos-docs-refresh` command 被投放
- **则** 模板明确 refresh 是非破坏性的更新
- **并且** 不隐式删除、重命名或迁移 docs 产物

### 需求：所有 Praxis 托管资产都通过独立 manifest 管理

系统必须使用独立的 managed asset manifest 统一管理 Praxis 托管资产，而不是依赖写入到 asset 内容中的 marker。

#### 场景：setup 安装用户级 command 资产
- **当** 用户运行 `setup` 或 `sync`
- **则** Claude/OpenCode command 文件写入用户级宿主目录
- **并且** 不写入用户项目目录

#### 场景：manifest 记录托管 command 资产
- **当** Claude 或 OpenCode docs command 模板被安装
- **则** managed asset manifest 记录这些 command 资产的路径、版本、类型和安装时间
- **并且** command markdown 文件本身保持宿主原生格式

#### 场景：manifest 保持在用户级状态目录
- **当** 仓库实现 managed asset manifest
- **则** manifest 存放在 Praxis 的用户级状态目录
- **并且** 不在用户项目根目录下创建 `.praxis/managed-assets.json`
- **并且** 不要求修改用户项目的 `.gitignore`

#### 场景：manifest 可记录非 command 资产
- **当** Praxis 写入其他托管资产
- **则** managed asset manifest 允许记录 `skill`、`command`、`managed-entry` 等类型

#### 场景：sync 更新已托管的资产
- **当** 用户运行 `sync`
- **则** 已被 Praxis 托管的 Claude/OpenCode command 文件会被更新
- **并且** 已被 Praxis 托管的 skill 资产也遵守同一 manifest 规则

#### 场景：未托管同名文件跳过覆盖
- **当** 用户目录中已存在同名 skill 或 command 文件
- **并且** managed asset manifest 未声明该文件由 Praxis 管理
- **则** `setup` 或 `sync` 跳过覆盖
- **并且** 输出明确警告

#### 场景：sync 清理已失效的托管资产
- **当** Claude 或 OpenCode 的托管资产集合发生变化
- **则** 该宿主对应的托管 command / skill 资产会被清理
- **并且** 清理范围仅限 manifest 声明为 Praxis 自己托管的文件

### 需求：OpenCode plugin 与 command 入口协调

系统必须明确 OpenCode 的 plugin/tool 入口与 user-level command 入口的职责边界。

#### 场景：OpenCode command 作为交互式入口
- **当** 用户通过用户级 command 使用 docs 能力
- **则** `~/.config/opencode/commands/*.md` 作为交互式入口
- **并且** 该入口调用共享的 `devos-docs` skill

#### 场景：OpenCode plugin 保留为 tool-based 入口
- **当** OpenCode plugin 继续存在
- **则** 它不需要被本 change 替换或移除
- **并且** plugin 与 command 可以并存
- **并且** 两者都不得引入不同的 docs contract
- **并且** 本 change 不要求新增 docs 专用 plugin tool 名称

### 需求：command 模板内容必须满足最小 contract

系统必须确保 Claude/OpenCode docs command 模板包含最小且一致的包装内容。

#### 场景：command 模板包含 mode 与 canonical paths
- **当** docs command 模板被写入用户级宿主目录
- **则** 模板明确对应的 `mode=init` 或 `mode=refresh`
- **并且** 模板明确引用 canonical paths：`docs/surfaces.yaml` 与 `docs/codemaps/**`

#### 场景：command 模板说明自己是薄包装
- **当** docs command 模板被用户阅读
- **则** 模板明确核心逻辑由 `devos-docs` skill 承担
- **并且** 不把自身描述成第二套 docs 实现

#### 场景：refresh command 明确非破坏性更新
- **当** 用户阅读 `devos-docs-refresh` command 模板
- **则** 模板明确 refresh 是非破坏性的
- **并且** 不暗示会隐式删除、重命名或迁移 docs 产物

### 需求：compatibility path 在帮助文案中降级为 fallback

系统必须在文案和托管说明层面把 `praxis-devos docs ...` 降级为 fallback / compatibility path。

#### 场景：managed guidance 优先推荐宿主 command
- **当** `managed-entry.md` 被注入用户项目
- **则** 文案优先引导 Claude/OpenCode 用户使用 `/devos-docs-init` 与 `/devos-docs-refresh`
- **并且** 明确 Codex 当前通过 `devos-docs` skill 使用 docs 能力
- **并且** 将 `praxis-devos docs init|refresh|check` 说明为 compatibility / fallback path

#### 场景：help 文案不把 compatibility path 表述成首选入口
- **当** 仓库对外描述 docs 工作流
- **则** 不把 `praxis-devos docs init|refresh` 表述成推荐主入口
- **并且** 它们只作为 deterministic fallback 或内部辅助
