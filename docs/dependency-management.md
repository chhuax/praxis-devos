# 依赖管理

Praxis DevOS 强依赖两类外部能力：

- `openspec`：CLI 依赖
- `superpowers`：agent runtime 依赖

这两类依赖的管理方式不同，不能混在一起处理。

## 依赖分层

### OpenSpec

- 类型：CLI
- 用途：规范初始化、校验、归档
- 特征：与具体 agent 无关
- 当前策略：统一通过 `praxis-devos openspec ...` 调用，优先使用项目本地安装，找不到时才回退到全局安装

### Superpowers

- 类型：agent runtime
- 用途：提供 TDD、调试、验证、计划、子代理等能力
- 特征：安装方式因 agent 不同而不同
- 当前策略：按 agent 分别检测与引导安装

说明：

- Praxis 依赖的是 Superpowers 提供的执行能力集合
- 其中 `verification-before-completion` 是框架硬要求
- `test-driven-development` 是高风险变更的优先策略，但不是所有场景的强制要求

## 为什么不能把 Superpowers 放进 `.praxis/`

`.praxis/` 负责保存项目的 canonical state，但 `superpowers` 是运行时能力，不是项目资产。

不能直接把它复制进 `.praxis/` 的原因：

- OpenCode 依赖插件接入
- Codex 依赖本地 skills 目录和 symlink
- Claude Code 依赖 marketplace 安装

所以 Praxis 只做三件事：

1. 声明依赖
2. 检测依赖
3. 引导安装

而不是替代官方安装方式。

## doctor

使用：

```bash
praxis-devos doctor
praxis-devos doctor --agents opencode,codex
praxis-devos doctor --strict
```

检查内容：

- `openspec` 是否可被 `praxis-devos openspec ...` 成功解析
- OpenCode 是否在 `opencode.json` 中声明了 `superpowers` 插件
- Codex 是否检测到 `~/.agents/skills/superpowers`
- Claude Code 安装是否需要人工确认

说明：

- Claude Code 的 marketplace 安装当前无法从项目工作区做稳定、可移植的自动检测
- 因此普通 `doctor` 会标记为 `UNKNOWN`
- `doctor --strict` 会把 `UNKNOWN` 视为失败，提醒用户手动确认

## bootstrap

使用：

```bash
praxis-devos bootstrap --openspec
praxis-devos bootstrap --agent opencode
praxis-devos bootstrap --agent codex
praxis-devos bootstrap --agent claude
```

行为：

- `openspec`：输出 OpenSpec 的项目本地/全局安装建议
- `opencode`：自动写入或更新项目根目录 `opencode.json`
- `codex`：输出官方安装步骤
- `claude`：输出官方 marketplace 安装命令

## OpenSpec

OpenSpec 是 Praxis DevOS 的硬依赖，不再提供“无 OpenSpec 的降级初始化”。

所有 OpenSpec 命令统一使用：

```bash
praxis-devos openspec list --specs
praxis-devos openspec validate <change-id> --strict --no-interactive
praxis-devos openspec archive <change-id> --yes
```

解析顺序：

1. 项目本地 `node_modules/.bin/openspec`
2. 全局 `openspec`

推荐安装：

```bash
npm install -D @fission-ai/openspec
```

全局安装只作为兼容兜底：

```bash
npm install -g @fission-ai/openspec
```

如果当前环境无法解析 OpenSpec，`praxis-devos init` 会直接失败。

## OpenCode

OpenCode 当前采用项目级插件配置。`bootstrap --agent opencode` 会把以下插件写入 `opencode.json`：

- `praxis-devos`
- `superpowers@git+https://github.com/obra/superpowers.git`

之后需要重启 OpenCode。

参考：

- https://github.com/obra/superpowers/blob/main/docs/README.opencode.md

## Codex

Codex 当前采用本地 clone + skills symlink 方式。

Praxis 的 `bootstrap --agent codex` 会输出官方推荐步骤：

1. clone superpowers 仓库到 `~/.codex/superpowers`
2. 创建 `~/.agents/skills/superpowers` 指向其 `skills/`
3. 重启 Codex

参考：

- https://github.com/obra/superpowers/blob/main/docs/README.codex.md

## Claude Code

Claude Code 当前通过插件市场安装。

可选方式：

### 官方市场

```text
/plugin install superpowers@claude-plugins-official
```

### Marketplace 注册方式

```text
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

由于该安装方式对本地工作区不可见，Praxis 当前只提供命令提示，不做自动化安装。

## manifest 中的声明

Praxis 会在 `.praxis/manifest.json` 中声明这两个依赖是必需项。

该声明的目的不是记录“安装在哪里”，而是记录：

- 这个项目依赖哪些外部能力
- 哪些 agent 运行时必须具备 `superpowers`

## 与规则门控的关系

Praxis 不只提供 `doctor` 和 `bootstrap` 命令，还会把依赖状态摘要编译进：

- `.praxis/adapters/compiled-rules.md`
- `AGENTS.md` 的托管区
- `CLAUDE.md` 的托管区

这意味着 agent 在读取项目入口规则时，会直接看到：

- `openspec` 是否缺失
- 各 agent 的 `superpowers` 是否已安装
- 缺失依赖时应先安装，不要直接进入实现

## 建议

- 新项目初始化后，第一时间执行 `praxis-devos doctor`
- 在 CI 或发布前，可执行 `praxis-devos doctor --strict`
- 对 Claude Code，团队应在 onboarding 文档中补充人工确认步骤
