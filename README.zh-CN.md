# praxis-devos

> 一个轻量级 harness，用来把 OpenSpec 治理层、SuperPowers 技能层，以及各类 agent adapter 连接到用户项目中。

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## 它是什么

`praxis-devos` 会把项目准备成一个统一的 AI 工作区，让 OpenCode、Codex、Claude Code、GitHub Copilot 在同一套外层流程下工作：

- OpenSpec 负责 propose、apply、validate、archive 等治理流程
- SuperPowers 负责 planning、debugging、verification 等执行技能
- agent-specific adapter 负责把这些规则投放到各工具的原生入口里

`praxis-devos` 的定位是薄脚手架和编排层，不是内容生成器。

## 安装与升级

### 全局 npm 安装

```bash
npm install -g praxis-devos
```

升级全局 CLI：

```bash
npm install -g praxis-devos@latest
```

### `npx` 一次性使用

```bash
npx praxis-devos@latest setup --agent codex
```

一次性执行最新版本命令：

```bash
npx praxis-devos@latest update --agent codex
```

## `setup` 会改什么

执行 `npx praxis-devos setup ...` 时，Praxis 既可能改项目，也可能改本机用户环境。

在项目内，通常会创建或刷新这些入口：

```text
your-project/
├── AGENTS.md          # 各 agent 共享的项目规则
├── CLAUDE.md          # 通过 @AGENTS.md 引入共享规则的薄包装
├── openspec/          # OpenSpec 工作区
├── .opencode/         # 选中 OpenCode 时生成的兼容标记目录
└── opencode.json      # 选中 OpenCode 时的项目级配置
```

在项目外，Praxis 还可能：

- 在 OpenSpec 用户级 schema 目录安装或刷新内置的公司 schema `spec-super`
- 修复用户级 OpenSpec 配置为 `profile: custom`、`delivery: both`，以及 `propose`、`explore`、`new`、`continue`、`apply`、`ff`、`archive` 这一组 workflow
- 将项目内由 OpenSpec 生成的 workflow skills / commands adopt 到目标 agent 的原生发现位置
- 向目标 agent 的原生发现位置投放 Praxis 自有 skills 和 commands
- 在 OpenCode 支持自动化时修改用户级 OpenCode 插件配置
- 安装或校验 OpenSpec 运行时
- 安装或校验各 agent 所需的 SuperPowers 依赖

## 快速开始

### Codex

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

### Claude Code

```bash
npx praxis-devos setup --agent claude
npx praxis-devos doctor --strict
```

### OpenCode

```bash
npx praxis-devos setup --agent opencode
npx praxis-devos doctor --strict
```

### GitHub Copilot

```bash
npx praxis-devos setup --agent copilot
npx praxis-devos doctor --strict
```

### 多 Agent 项目

```bash
npx praxis-devos setup --agents opencode,codex,claude,copilot
npx praxis-devos doctor --strict
```

## 命令

| 命令 | 用途 |
|---|---|
| `setup` | 主 onboarding / 修复入口 |
| `init` | 初始化项目骨架和托管 adapter |
| `update` | 刷新托管 adapter 与原生投放 |
| `status` | 查看当前项目与依赖状态 |
| `doctor` | 检查 OpenSpec、agent 依赖和投放情况 |
| `bootstrap` | 打印或执行依赖 bootstrap 指引 |

## 文档工作流

Praxis 也把 codemap 和 API 文档视为 harnessed workflow，而不是硬编码在 JS 里的内容生成。

- project-level 的 codemap / surface 文档通过 docs skill 流程完成
- change-level 的黑盒文档和 API 变更文档通过 change-doc skill 流程完成
- archive 时的 API reference 同步也是 harness 驱动的工作流
- JS 脚手架只负责路由、投放、约束和校验，不负责生成这些给人看的正文内容

也就是说，Praxis 不只是 setup 的 harness，也是 docs workflow 的 outer harness。

## 各 Agent 的接入方式

Praxis 对外给用户的是统一契约，但每个 agent 的底层接入方式不同：

- OpenSpec workflow assets 会先由项目内的 `openspec init` 生成，再被 adopt 到各 agent 的用户级发现目录；Praxis 不再回退到仓库内 upstream workflow snapshot
- OpenCode：向用户 OpenCode 配置合并必须的插件声明，并投放内置资产
- Codex：校验或安装 `~/.codex/` 下的 SuperPowers clone/link 布局
- Claude Code：通过 Claude CLI 校验或安装官方 SuperPowers 插件
- GitHub Copilot：作为独立 agent 接入，但默认把 skills 和 commands 投放到共享的 Claude 兼容发现面 `~/.claude/skills/` 与 `~/.claude/commands/`

如果你只想做依赖修复或查看指导而不执行完整 setup，可以使用 `bootstrap`。

## 扩展包

Praxis 应该保持在框架层尽量轻。企业 rules、skills、hooks、stack 约定，更适合放到独立 extension pack，而不是继续硬编码到这个仓库里。

这样职责会比较清楚：

- `praxis-devos`：负责 OpenSpec harness、SuperPowers 集成、adapter 管理、projection 和统一工作流入口
- extension pack：负责企业规则、stack-specific skills、hooks 和额外投放内容

## 仓库结构

如果你是在维护这个包本身，当前最重要的目录是：

```text
assets/              # 内置 skills、commands、overlays 和公司 schema 资产
bin/                 # 发布后的 CLI 入口
src/core/            # 脚手架编排、运行时检查、adapter、共享常量
src/projection/      # 各 agent 的 projection 逻辑
src/templates/       # 托管模板
test/                # 单测与 smoke 脚本
```

## 开发

本地运行测试：

```bash
node --test
```

对打包产物执行安装 smoke：

```bash
npm pack
node test/install-smoke-cli.mjs --package ./praxis-devos-<version>.tgz --scenario opencode
node test/install-smoke-cli.mjs --package ./praxis-devos-<version>.tgz --scenario claude
```

## License

Apache-2.0
