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

- `~/.claude/commands/*.md` 仍然可用。
- custom commands 已经合并进 skills 的统一体系。
- 同名时 skill 优先。
- skills 仍然是官方更推荐的形态，因为支持 supporting files、自动加载、subagent、动态上下文等能力。

因此对 Claude Code 的策略应为：

- 允许投放用户级 command 文件
- command 只做入口包装
- 真正能力保持在 `devos-docs` skill

### OpenCode

OpenCode 官方文档明确支持：

- `~/.config/opencode/commands/` 作为 user-level commands
- 也可通过 config 的 `command` 字段定义

对 Praxis 来说，最自然的路径是：

- 继续让 `setup` / `sync` / projection 写用户级宿主目录
- 直接投放 `~/.config/opencode/commands/*.md`
- 不把 `opencode-plugin.js` 当成本次 command 入口的唯一实现面

### Codex

官方文档当前明确列出了：

- app commands
- IDE / CLI slash commands
- skills
- AGENTS.md
- plugins

但本次调研没有找到与 Claude/OpenCode 对等的稳定用户级 custom command 投放面的官方文档。基于这个现实，本次不应发明一套 Codex command 落盘约定。

因此对 Codex 的策略应为：

- 继续 skills-first
- 不在本次实现中新增未被官方文档支撑的用户级 command adapter
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

- 为 Claude Code 和 OpenCode 增加 user-level docs command adapters
- 明确 command 与 `devos-docs` skill 的职责边界
- 让 `setup` / `sync` / projection 能安装、更新并托管这些 command 资产
- 为 Praxis 托管资产增加独立的 managed asset manifest
- 定义 command 模板的最小内容 contract
- 保持与当前 compatibility / fallback path 一致的 canonical path 和 validation 语义
- 明确 Codex 在本阶段保持 skills-first

**非目标：**

- 不重新设计 `devos-docs` skill contract
- 不替换现有 `writeback`、`validation`、`compatibility` 逻辑
- 不把 OpenCode plugin tools 重构成 command-only 体系
- 不在本次变更中发明 Codex 的自定义用户级 command 投放约定
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

### 2. Claude Code 采用用户级 `~/.claude/commands/` 投放

用户目录路径固定为：

- `~/.claude/commands/devos-docs-init.md`
- `~/.claude/commands/devos-docs-refresh.md`

采用扁平命名而不是目录命名空间，原因是本阶段官方文档已明确 `.claude/commands/*.md` 可用，但没有必要在 Praxis 侧额外依赖未验证的嵌套命令命名行为。

这些 command 模板的正文应：

- 明确调用 `devos-docs`
- 明确 `mode=init` 或 `mode=refresh`
- 指向当前 canonical docs contract：
  - `docs/surfaces.yaml`
  - `docs/codemaps/**`
- 提醒生成结果必须遵守现有 writeback / validation contract

### 3. OpenCode 采用用户级 `~/.config/opencode/commands/` 投放

用户目录路径固定为：

- `~/.config/opencode/commands/devos-docs-init.md`
- `~/.config/opencode/commands/devos-docs-refresh.md`

本阶段优先采用 markdown command 文件，而不是 config JSON 或 plugin-only command surfaces，原因是：

- 与 Claude Code 的模板资产形态更一致
- 更适合纳入现有用户级投影逻辑
- 更适合统一到同一份 managed asset manifest 中

OpenCode 现有 `opencode-plugin.js` 保留，不作为本次 command adapter 的唯一入口。

### 3.1 OpenCode 双轨入口协调策略

OpenCode 在本仓库中已经同时存在两类入口：

- `opencode-plugin.js` 提供 plugin / tool-based 入口
- `~/.config/opencode/commands/*.md` 提供用户级 command 入口

本次 change 不试图合并为单一入口，而是明确两者职责：

- plugin / tool 入口适合编程式调用、工具化集成和宿主插件运行时
- command 入口适合交互式 slash-command 使用
- 两者都不重新实现 docs 逻辑，而是共同指向 `devos-docs` skill 与既有 writeback / validation contract

文案上应避免把 plugin 和 command 描述成互斥关系，而应明确 command 是 docs 能力的推荐交互式入口，plugin 保留为现有的 tool-based surface。

### 4. Codex 在本阶段保持 skills-first，不新增 user-level command adapter

由于没有找到足够明确的官方文档来支撑仓库内 custom command 投放面，本次 change 对 Codex 采取保守策略：

- 继续投影 `devos-docs` skill
- managed guidance 说明 Codex 当前通过 skill 使用 docs 能力
- 不新增 `.codex/...` 命令模板资产

后续如果官方文档明确提供稳定的用户级 custom command 安装面，再单独追加 change。

### 5. 所有托管资产统一使用独立 manifest 管理

当前仓库已经有两类托管资产：

- user-level skills
- project managed blocks / docs-lite compatibility assets

继续依赖“把归属元数据写进资产正文”会导致模型文件、command 文件和普通 markdown 文件被不同方式污染，也很难统一清理策略。这里应引入独立清单文件来统一管理所有 Praxis 托管资产。

建议新增：

- 用户级 managed asset manifest
- 用于记录 Praxis 托管的所有用户级资产
- command / skill 都通过这份 manifest 判断归属、版本、清理范围

建议形态：

- 路径：放在 Praxis 自己的用户级状态目录下
- 例如：`~/.praxis-devos/managed-assets.json`
- 内容包含：
  - `version`
  - `assets`
  - 每个 asset 的 `source`、`version`、`type`、`installedAt`

本次 change 先覆盖用户级资产：

- `~/.claude/skills/**`
- `~/.claude/commands/**`
- `~/.config/opencode/commands/**`

现有项目级 managed blocks 是否也迁入同一 manifest，属于后续演进问题；本次不要求顺手重构。

### 6. 托管标记与清理策略

docs command 文件在本 change 里属于用户级托管资产。这里的关键不是 project vs user，而是：

- 不把托管元数据直接写进 asset 文件内容
- 不再为 command 单独发明一套 marker 机制
- 由独立 manifest 统一记录托管归属与版本

本次实现约束：

- 不向 `~/.claude/commands/*.md` 或 `~/.config/opencode/commands/*.md` 文件正文注入 marker
- command 文件正文保持宿主原生 markdown command 形态
- skill 与 command 的归属判断都通过 managed asset manifest 完成

托管状态检测逻辑：

- 如果 manifest 记录某个 skill / command 由 Praxis 管理，则 `sync` 可更新，并在托管集合变化时清理失效的 Praxis 资产记录
- 如果同名文件存在，但 manifest 未声明其归属，则视为用户自管
- 对用户自管 command 文件，`setup` / `sync` 必须跳过覆盖并给出明确告警

覆盖与托管维护策略：

- 对已托管文件，`sync` 可以更新
- 对未托管同名文件，`setup` / `sync` 必须跳过覆盖并给出明确告警
- 本阶段不做“智能合并用户修改”
- `sync` 的托管维护仅作用于 manifest 中声明为 Praxis 管理的资产

### 7. command 模板必须是薄包装，且与现有 contract 对齐

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

最小模板示例：

```md
# devos-docs-init

Initialize project documentation using the `devos-docs` skill.

## What this does

- Generates `docs/surfaces.yaml`
- Generates `docs/codemaps/project-overview.md`
- Uses deterministic validation before writeback

## Mode

`init`

## How to use

Run this command when:

- setting up docs for the first time
- the project structure has changed significantly

## Implementation

- 调用 `devos-docs` skill，并传入 `mode=init`
- Canonical paths:
  - `docs/surfaces.yaml`
  - `docs/codemaps/**`
- Validation:
  - results must pass the existing docs contract before writeback

## Notes

- 这是宿主 command 薄包装，不重复实现 docs 逻辑
- 如宿主 command 不可用，可回退到 compatibility / fallback path
```

```md
# devos-docs-refresh

Refresh existing project documentation using the `devos-docs` skill.

## What this does

- Updates `docs/surfaces.yaml` when the external surface changes
- Updates `docs/codemaps/project-overview.md` to match the current structure
- Preserves existing docs artifacts where possible

## Mode

`refresh`

## How to use

Run this command when:

- code structure has evolved
- new modules or surfaces have been added
- existing docs are out of date

## Implementation

- 调用 `devos-docs` skill，并传入 `mode=refresh`
- Canonical paths:
  - `docs/surfaces.yaml`
  - `docs/codemaps/**`
- Validation:
  - results must pass the existing docs contract before writeback
- Refresh is non-destructive:
  - do not implicitly delete, rename, or relocate docs artifacts

## Notes

- 这是宿主 command 薄包装，不重复实现 docs 逻辑
- 如宿主 command 不可用，可回退到 compatibility / fallback path
```

### 8. compatibility path 保留，但从推荐入口降级

`praxis-devos docs init|refresh|check` 继续保留，原因是：

- 已经存在实现和测试
- 仍可作为 deterministic fallback / compatibility path

但在 managed guidance、command 模板和后续文档里，其定位应统一为：

- fallback
- compatibility
- internal helper

而不是推荐给宿主用户的首选入口。

compatibility path 还必须满足同一个协议边界：

- 使用相同 canonical path
- 遵守相同 allowed target / writeback 约束
- 不得演化出与 AI-first command / skill 路径分叉的另一套 docs 协议

### 9. Maven 与 docs command 本 change 的关系

本次 change 不重新设计 Maven 多模块 docs contract，但 command adapter 触发 `devos-docs` 时，仍然必须兼容现有多模块行为：

- `docs/surfaces.yaml`
- `docs/codemaps/project-overview.md`
- 多模块时额外包括：
  - `docs/codemaps/module-map.md`
  - `docs/codemaps/modules/<artifactId>.md`

### 10. Command 命名约定

本次 change 统一采用“文件名即命令名”的约定：

- 文件名：
  - `devos-docs-init.md`
  - `devos-docs-refresh.md`
- slash command：
  - `/devos-docs-init`
  - `/devos-docs-refresh`

不使用 `:` 分隔形式，例如 `/devos:docs-init`。原因：

- Claude Code 和 OpenCode 的 command 发现都围绕文件名展开
- 文件名与 slash command 一致，用户理解成本最低
- 避免为不同宿主引入额外命名映射

### 11. 宿主能力差异的用户沟通

需要在 `managed-entry.md` 和相关说明文案中明确宿主差异：

- Claude Code 和 OpenCode：
  - 推荐使用 `/devos-docs-init` 与 `/devos-docs-refresh`
  - 也可以直接调用 `devos-docs` skill
- Codex：
  - 当前通过 `devos-docs` skill 使用 docs 能力
  - 本阶段不承诺用户级 command adapter
  - 如果未来官方文档明确支持稳定的用户级 command 面，再单独追加
- 所有宿主的 fallback：
  - `praxis-devos docs init|refresh|check`
  - 用于 compatibility、自动化脚本或 CI 辅助场景

### 12. managed asset manifest 的位置与版本控制边界

本次 change 管理的是用户级资产，因此 manifest 也必须是用户级状态，而不是项目仓库文件。

约束如下：

- manifest 放在 Praxis 自己的用户级状态目录
- 例如：`~/.praxis-devos/managed-assets.json`
- 本 change 不引入项目根目录下的 `.praxis/managed-assets.json`
- 本 change 不修改用户项目的 `.gitignore`

原因：

- 当前要管理的是用户级 `skill` / `command` 资产，而不是项目仓库资产
- 如果把 manifest 落到项目目录，会重新把用户级投影和项目仓库耦合
- 本次 proposal 的范围是统一托管用户级资产，不是引入项目内状态管理目录

### 13. OpenCode 双轨入口的协调策略

OpenCode 当前同时存在：

- plugin tools：`opencode-plugin.js`
- user-level commands：`~/.config/opencode/commands/*.md`

本 change 的边界需要明确：

- 本次新增的是 command adapters
- 现有 plugin 保留，不删除、不重构为 docs-only 入口
- 本次不承诺新增 docs 专用 plugin tool 名称
- 对用户的推荐入口是 commands，用于交互式场景
- plugin 继续保留为现有 tool-based surface，适合工具链或程序化调用

两者关系：

- command 是推荐的交互式入口
- plugin 是保留的 tool-based 入口
- 两者都不得引入与 `devos-docs` skill 冲突的第二套 docs contract

## 风险 / 权衡

- [风险] Claude Code 已将 custom commands 融入 skills 语义，未来可能继续弱化 `.claude/commands/`
  - 缓解：保留 `devos-docs` skill 为核心能力，command 仅是可替换外壳。
- [风险] OpenCode 既有 commands 又有 plugin/tool surfaces，容易出现双轨入口
  - 缓解：本次只为 docs 能力定义 command adapter，plugin tools 不作为 docs 的主入口。
- [风险] Codex 没有明确的用户级 custom command 投放文档，贸然实现会发明非官方约定
  - 缓解：本次明确不做 Codex command adapter。
- [风险] 从 inline marker 转向独立 manifest 后，需要保证清理逻辑不会误删现有已投影 skill
  - 缓解：为 manifest 引入兼容读取与渐进迁移策略，先覆盖新写入资产，再评估旧资产迁移。
- [风险] 宿主 command 支持可能随版本调整，导致投放目录仍存在但宿主不再推荐或不再执行
  - 缓解：在 `sync` 时做最小能力探测或版本告警；如未来宿主完全取消对应 command surface，单独提供迁移说明并回退到 skill-first。

## 验收边界

本仓库可验收的内容：

- command 模板资产存在且内容正确
- `setup` / `sync` / projection 能正确安装和更新 Claude/OpenCode command 文件
- command / skill 资产清理遵循 manifest 托管边界
- managed guidance 与 command / skill 分层一致
- compatibility path 的帮助文案与定位一致
- managed asset manifest 可识别、可清理、不会覆盖用户自管同名文件

本仓库当前不验收的内容：

- Claude Code / OpenCode 实际运行 command 后的宿主 UI 交互体验
- Codex 尚不存在的用户级 custom command 安装面
