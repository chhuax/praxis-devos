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

## 快速开始

推荐直接用 `npx`，每次都拿到你指定的版本：

```bash
npx praxis-devos@latest setup --agent codex
npx praxis-devos@latest doctor --strict
```

按你实际使用的 agent 选择：

```bash
# Codex
npx praxis-devos@latest setup --agent codex

# Claude Code
npx praxis-devos@latest setup --agent claude

# OpenCode
npx praxis-devos@latest setup --agent opencode

# GitHub Copilot
npx praxis-devos@latest setup --agent copilot
```

如果一个项目会同时给多个 agent 使用：

```bash
npx praxis-devos@latest setup --agents opencode,codex,claude,copilot
npx praxis-devos@latest doctor --strict
```

## `setup` 会做什么

执行 `npx praxis-devos@latest setup ...` 时，Praxis 既可能改项目，也可能改本机用户环境。

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
- 将项目内由 OpenSpec 生成的 workflow skills，以及在支持该能力的宿主里仅作为入口的薄 workflow commands，adopt 到目标 agent 的原生发现位置
- 向目标 agent 的原生发现位置投放 Praxis 自有 skills 和 commands
- 在 OpenCode 支持自动化时修改用户级 OpenCode 插件配置
- 安装或校验 OpenSpec 运行时
- 安装或校验各 agent 所需的 SuperPowers 依赖

## 核心命令

大多数用户只需要这几个入口：

| 命令 | 用途 |
|---|---|
| `setup` | 主 onboarding / 修复入口 |
| `doctor` | 检查 OpenSpec、agent 依赖和投放情况 |
| `install-pack <path-or-git-url>` | 安装本地或 git-backed 的扩展包到用户级支持资产中 |

## 扩展包

Praxis 应该保持在框架层尽量轻。企业 rules、skills、hooks、stack 约定，更适合放到独立 extension pack，而不是继续硬编码到这个仓库里。

这样职责会比较清楚：

- `praxis-devos`：负责 OpenSpec harness、SuperPowers 集成、adapter 管理、projection 和统一工作流入口
- extension pack：负责企业规则、stack-specific skills、commands、hooks 和额外投放内容

### 直接安装扩展包

如果你想显式安装一个扩展包，而不是修改项目配置，可以使用 `install-pack`：

```bash
npx praxis-devos@latest install-pack ../company-devos-pack --agent codex
npx praxis-devos@latest install-pack git+https://example.com/company/devos-pack.git --stack java --agent claude
```

对于采用 `common/` 加 `stacks/` 布局的扩展包，至少传入一个 stack：

```bash
npx praxis-devos@latest install-pack ../company-devos-pack --stacks java,golang --agents codex,claude
```

### 项目声明的扩展包

项目也可以在 `package.json` 里声明扩展包，这样 `setup` 和 `doctor` 会在正常的项目 projection 流程里一起处理：

```json
{
  "praxis-devos": {
    "skillPacks": [
      "../company-devos-pack",
      {
        "path": "git+https://example.com/company/devos-pack.git",
        "stacks": ["java", "golang"]
      }
    ]
  }
}
```

当扩展包本身属于项目契约时，使用项目声明方式；如果只是显式做一次用户级安装，则使用 `install-pack`。

## 进阶信息

### 文档工作流

Praxis 也把 codemap 和 API 文档视为 harnessed workflow，而不是硬编码在 JS 里的内容生成。脚手架负责路由、投放、校验和约束这些工作流，但不负责生成最终给人阅读的正文内容。

- `devos-docs`：项目级 codemap 和 surface 文档，例如 `docs/surfaces.yaml` 与 `docs/codemaps/project-overview.md`
- `devos-change-docs`：change 级文档，例如 `openspec/changes/<change>/blackbox-test.md` 和 `api-doc.md`
- `project-api-sync`：稳定 API 变更落地后更新 `docs/reference/api.md`

### 各 Agent 的接入方式

- OpenSpec workflow assets 会先在项目内生成，再 adopt 到各 agent 的用户级发现目录
- OpenCode 会投放内置 skills 和 commands，并清理 runtime config 中的旧 Praxis 插件项
- Codex 会校验或安装 `~/.codex/` 下的 SuperPowers clone/link 布局
- Claude Code 会通过 Claude CLI 校验或安装官方 SuperPowers 插件
- GitHub Copilot 会把内置 skills 投放到共享的 `~/.claude/skills/` 发现面

### 仓库结构

如果你是在维护这个包本身，主要目录是：

```text
assets/              # 内置 skills、commands、overlays 和公司 schema 资产
bin/                 # 发布后的 CLI 入口
release-kit/         # 仅维护者可用的 release workflow 边界
src/core/            # 脚手架编排、运行时检查、adapter、共享常量
src/projection/      # 各 agent 的 projection 逻辑
src/templates/       # 托管模板
test/                # 单测与 smoke 脚本
```

### 开发

```bash
node --test
```

## License

Apache-2.0
