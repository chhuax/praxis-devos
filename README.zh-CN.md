# praxis-devos

> 面向 Codex、Claude Code、OpenCode 的产品化项目接入脚手架。

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## 它解决什么问题

Praxis DevOS 会把一个仓库准备成更适合 AI agent 协作的项目工作区，默认提供：

- 作为 canonical source 的 `.praxis/`
- 给不同 agent 用的适配入口，例如 `AGENTS.md`、`CLAUDE.md`
- 可选的技术栈基线，例如 `java-spring`
- 需要时可进入的 OpenSpec 治理流程

默认安装路径很简单：执行 `setup`，用 `doctor` 确认环境，补少量项目上下文，然后直接开始使用 agent。你不需要先理解 foundation、overlay 或 ECC 这些内部概念。

## 快速开始

前置依赖：

- Node.js `>= 20.19.0`
- Git
- 一个受支持的 agent：OpenCode、Codex 或 Claude Code

### 新仓库或现有仓库，先接入 Codex

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
```

如果你想先把框架搭起来，之后再选技术栈：

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

之后再补技术栈：

```bash
npx praxis-devos use-stack java-spring
```

### 仓库已经是 Praxis 项目，但这是你的新电脑

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

### 后续再补一个 agent

```bash
npx praxis-devos setup --agent claude
npx praxis-devos doctor --strict
```

Claude Code 目前仍需要补一个手工 marketplace 步骤：

```text
/plugin install superpowers@claude-plugins-official
```

## 第一次使用

执行完 `setup` 后，先补两处项目上下文：

- `AGENTS.md`：项目目标、架构、常用命令、约束
- `openspec/project.md`：需要治理或留痕的变更上下文

然后就可以直接在仓库里启动 agent，按正常方式工作。

对于日常实现、调试、review，Praxis 的目标是保持轻量：

- 用 `setup` 完成接入
- 平时主要遵循 `.praxis/rules.md` 和已安装的 stack skills
- 只有在需要提案、校验、归档、治理留痕时才进入 OpenSpec

更完整的上手说明见 [docs/getting-started.zh-CN.md](docs/getting-started.zh-CN.md)。

## 日常工作流

大多数团队最常用的是这些命令：

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
npx praxis-devos status
npx praxis-devos use-stack java-spring
```

`setup` 是主入口，负责：

- 第一次接入
- 新电脑接入
- 给项目补 agent
- 修复缺失的 OpenSpec 或 SuperPowers 依赖

`bootstrap`、`init`、`use-foundation` 仍然保留，但更偏高级修复或内部命令。

## OpenSpec 对日常开发是可选的

Praxis 会安装并封装 OpenSpec，是因为有些团队需要提案式治理。这不意味着每个任务都必须先走 OpenSpec。

下面这些场景通常直接走实现流即可：

- 修 bug
- 已对齐范围的功能开发
- 在已批准范围内的重构
- 常规 review 与验证

下面这些场景更适合进入 OpenSpec：

- 需要正式提案或变更记录
- 需要补 spec delta
- 需要显式 validate / archive
- 治理要求比较重的流程

示例：

```bash
npx praxis-devos change --title "Add two factor auth" --capability auth
npx praxis-devos openspec validate <change-id> --strict --no-interactive
```

## 项目结构

执行完 setup 后，主要文件会是：

```text
your-project/
├── AGENTS.md
├── CLAUDE.md
├── openspec/
└── .praxis/
    ├── manifest.json
    ├── framework-rules.md
    ├── stack.md
    ├── rules.md
    ├── skills/
    └── adapters/
```

`.praxis/` 是项目规范层的 canonical source。agent 相关目录只是适配输出，不是事实来源。

## 聚焦文档

- [docs/getting-started.zh-CN.md](docs/getting-started.zh-CN.md)：安装、第一次使用、常见接入场景
- [docs/ecc-integration.zh-CN.md](docs/ecc-integration.zh-CN.md)：ECC runtime 绑定路径、adapter 产物和实际使用方式
- [docs/dependency-management.md](docs/dependency-management.md)：`setup`、`doctor`、`bootstrap` 分别处理什么
- [docs/architecture/command-scenarios.md](docs/architecture/command-scenarios.md)：命令设计模型
- [docs/architecture/multi-agent.md](docs/architecture/multi-agent.md)：canonical layout 与 adapter 模型
- [docs/migration-guide.md](docs/migration-guide.md)：旧 OpenCode 项目迁移

## 高级内部资料

Praxis 默认会自动应用内置 runtime baseline。如果你确实要看这层内部结构，可参考：

- [foundations/README.md](foundations/README.md)
- [profiles/README.md](profiles/README.md)
- [overlays/README.md](overlays/README.md)

大多数用户上手时不需要先看这些文档。

## 迁移

历史上的 OpenCode-only 项目可以原地迁移：

```bash
npx praxis-devos migrate
```

## 贡献

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 赞助

开源不易，如果这个项目对你有帮助，欢迎赞助一杯咖啡 ☕

<img src="https://wxma-1254014761.cos.ap-beijing.myqcloud.com/pay.png" alt="微信赞赏" width="200" />

## 许可证

[Apache License 2.0](LICENSE)
