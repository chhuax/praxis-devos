# praxis-devos

> AI 原生开发框架 — Runtime Foundations + [OpenSpec](https://github.com/Fission-AI/OpenSpec) 规范治理 + [SuperPowers](https://github.com/obra/superpowers) 执行增强 + 可插拔技术栈

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## 概述

Praxis DevOS 是一个面向 OpenCode、Codex、Claude Code 等 AI 编码助手的开发框架，组合了三类能力：

- **Runtime foundations**：AI 工程运行时基线
- **OpenSpec**：规范治理，定义做什么
- **SuperPowers**：执行增强，定义怎么做
- **可插拔技术栈**：编码标准，定义按什么标准做

在新的 foundation 方向里，Praxis 把 runtime foundation 和 stack 作为日常执行的默认基线。OpenSpec 继续保留，但更偏治理与受控变更入口，而不是所有日常任务的必经前门；测试策略仍按风险选择。

当前版本已经调整为 **多 agent 架构**。项目状态不再绑定到某一个运行时目录，例如 `.opencode/`。Praxis 统一把规范层资产放到 `.praxis/`，再按需要同步到不同 agent 的适配入口。

## 为什么选择 praxis-devos？

| 能力 | OpenSpec | SuperPowers | Praxis DevOS |
|---|---|---|---|
| Runtime foundation | ❌ | ❌ | ✅ |
| 规范治理 | ✅ | ❌ | ✅ |
| 执行技能 | ❌ | ✅ | ✅ |
| 技术栈标准 | ❌ | ❌ | ✅ |
| 多 agent 项目布局 | ❌ | ❌ | ✅ |

Praxis DevOS = Foundations（BASE）+ OpenSpec（GOVERNANCE）+ SuperPowers（HOW）+ Pluggable Stacks（STANDARD）。

## 架构

项目的 canonical state 统一落在 `.praxis/`，各 agent 看到的是适配输出，不是事实来源。

```text
┌────────────────────────────────────────────────────────────┐
│                        Canonical Layer                     │
│       AGENTS.md + CLAUDE.md + openspec/ + .praxis/        │
├───────────────────────────────┬────────────────────────────┤
│ Runtime Adapters              │ Framework Engine           │
│ OpenCode / Codex / Claude     │ RULES.md + stacks + skills │
└───────────────────────────────┴────────────────────────────┘
```

初始化后的项目结构：

```text
your-project/
├── AGENTS.md                  # 通用项目上下文，Codex 使用
├── CLAUDE.md                  # Claude Code 项目记忆文件
├── openspec/                  # OpenSpec 结构
└── .praxis/                   # Praxis canonical state
    ├── manifest.json
    ├── foundation/
    │   ├── README.md
    │   └── profile/
    ├── framework-rules.md
    ├── overlays/
    ├── stack.md
    ├── rules.md
    ├── skills/
    └── adapters/
        └── compiled-rules.md
```

OpenCode 仍然支持，但 `.opencode/` 现在只是最小兼容目录。OpenCode 通过插件优先读取 `.praxis/`，并把 `.opencode/skills/` 当作补充层；不再默认镜像 canonical skills、stack、rules 到 `.opencode/`。

更详细的设计说明见：

- [docs/architecture/multi-agent.md](docs/architecture/multi-agent.md)
- [docs/architecture/foundation-overlays.md](docs/architecture/foundation-overlays.md)
- [docs/architecture/command-scenarios.md](docs/architecture/command-scenarios.md)
- [docs/dependency-management.md](docs/dependency-management.md)
- [docs/migration-guide.md](docs/migration-guide.md)
- [docs/releases/v0.2.0.md](docs/releases/v0.2.0.md)
- [docs/releases/v0.2.1.md](docs/releases/v0.2.1.md)
- [docs/releases/v0.2.2.md](docs/releases/v0.2.2.md)
- [docs/releases/v0.2.3.md](docs/releases/v0.2.3.md)

## 快速开始

快速开始要按场景读，而不是按框架内部命令分层来读。

当前这个发布版本的支持范围：

- 发布支持：macOS、Linux、Windows PowerShell
- Windows 下如果要接入 Codex，请优先使用 PowerShell，以便直接执行生成的 SuperPowers junction 指令

### 1. 全新项目，Codex + Java Spring，一次接入

```bash
npx praxis-devos setup --agent codex --foundation ecc-foundation --stack java-spring
npx praxis-devos doctor --strict
```

### 2. 全新项目，先只把框架搭起来，稍后再选 stack

```bash
npx praxis-devos setup --agent codex --foundation ecc-foundation
npx praxis-devos doctor --strict
```

等你准备好再补上更多运行时层：

```bash
npx praxis-devos list-foundations
npx praxis-devos use-foundation ecc-foundation
npx praxis-devos use-stack java-spring
npx praxis-devos doctor --strict
```

### 3. 仓库已经初始化过，但这是你的新电脑

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

### 4. 现有项目后续补一个 agent

```bash
npx praxis-devos setup --agent claude
npx praxis-devos doctor --strict
```

Claude Code 在 `setup` 之后仍然需要补一条 marketplace 手工步骤：

```text
/plugin install superpowers@claude-plugins-official
```

### 5. 从第一天就启用多 agent

```bash
npx praxis-devos setup --agents opencode,codex,claude --stack java-spring
npx praxis-devos doctor --strict
```

`setup` 会：

- 创建或刷新 `openspec/`
- 创建 canonical `.praxis/`
- 安装或复用 OpenSpec
- 自动配置或自动安装所选 agent 可自动处理的 runtime 依赖
- 如果带了 `--foundation`，顺手应用对应 runtime foundation
- 把可自定义 skills 安装到 `.praxis/skills/`
- 把框架门控规则写入 `.praxis/framework-rules.md`
- 同步所选 agent 的适配入口
- 如果带了 `--stack`，顺手应用对应技术栈

命令职责建议这样理解：

- `setup` 是用户主入口
- `init` 是底层框架骨架初始化命令
- `use-foundation` 用于在框架初始化后补上 runtime foundation
- `use-stack` 用于在框架初始化后补上技术栈
- `bootstrap` 保留为高级修复 / 调试命令
- `sync` 保留为手工调整后刷新 adapters 的命令

`setup` 是推荐 onboarding 命令。它会自动配置 OpenCode、自动安装 Codex SuperPowers，只有 Claude Code 仍然保留为需要用户在 marketplace 手工确认的路径。

### 2. 补充项目上下文

编辑：

- `AGENTS.md`
- `openspec/project.md`

### 3. 可选：安装 OpenCode 插件

在项目的 `opencode.json` 中添加：

```json
{
  "plugin": [
    "praxis-devos",
    "superpowers@git+https://github.com/obra/superpowers.git"
  ]
}
```

然后重启 OpenCode。

插件不再拥有独立初始化逻辑。它直接读取 `.praxis/`，并只暴露 `praxis-init`、`praxis-sync`、`praxis-migrate`、`praxis-change`、`praxis-status`、`praxis-openspec` 这类薄封装工具。

## 门控规则如何生效

框架级门控规则的源文件仍然是仓库里的 `RULES.md`，但安装到项目时会镜像为 `.praxis/framework-rules.md`。

随后由 `npx praxis-devos sync` 统一分发：

- OpenCode：通过插件注入 system prompt
- Codex：写入 `AGENTS.md` 的受管控区块
- Claude Code：写入 `CLAUDE.md` 的受管控区块

在分发之前，Praxis 会先生成统一的规则编译产物 `.praxis/adapters/compiled-rules.md`，各 agent 入口都基于这份中间结果同步。

这份规则编译产物还会带上依赖门禁摘要：如果当前环境缺少 `openspec` 或缺少对应 agent 的 `superpowers`，规则会明确要求先安装依赖，再继续实现。

如果项目原本已经有 `AGENTS.md` 或 `CLAUDE.md`，Praxis 只会追加或刷新 `<!-- PRAXIS_DEVOS_START -->` 到 `<!-- PRAXIS_DEVOS_END -->` 之间的托管区，不会覆盖区块外的人工内容。

另外，Praxis 约定 `/change` 为显式提案主入口，`/proposal` 为兼容别名。这里说的是“文本语义入口”，不是保证所有 agent 平台都会原生注册同名 slash 命令；在 Codex / Claude 里，它表示“进入提案通道”的受管控语义，而真正可执行的脚手架命令仍然是 `npx praxis-devos change` / `npx praxis-devos proposal`。如果需求不明确，应先进入 `brainstorming`，再决定完整提案或轻量提案。

下方所有命令示例默认都按项目本地 CLI 通过 `npx` 调用，不要求用户全局安装。

## CLI

```bash
npx praxis-devos setup --agent codex --foundation ecc-foundation --stack java-spring
npx praxis-devos use-foundation ecc-foundation
npx praxis-devos use-stack java-spring
npx praxis-devos init
npx praxis-devos sync --agents opencode,codex,claude
npx praxis-devos migrate
npx praxis-devos change --title "Add two factor auth" --capability auth
npx praxis-devos status
npx praxis-devos doctor --strict
npx praxis-devos bootstrap --agents codex
npx praxis-devos openspec list --specs
npx praxis-devos list-foundations
npx praxis-devos list-stacks
```

说明：

- `setup` 是 onboarding、修复依赖、补 agent 的推荐入口
- `init` 是底层框架初始化命令
- `use-foundation` 用于应用 runtime foundation profile 和 overlay 组合
- `use-stack` 用于在框架初始化后应用技术栈
- 不带 `--agent` / `--agents` 时，默认会处理 `opencode,codex,claude`
- 可以只指定单个 agent，例如 `--agents codex`
- 后续增量扩展不会覆盖已有配置，`sync --agent opencode` 会把 `opencode` 合并进当前项目的已配置 agents

## 依赖管理

Praxis DevOS 的运行时依赖有两类：

- `openspec`：CLI 依赖
- `superpowers`：agent runtime 依赖

其中 OpenSpec 现在统一通过 `npx praxis-devos openspec ...` 调用，优先使用项目本地安装，找不到时才回退到全局安装。在 ECC foundation 方向里，它被定位为治理层，而不是日常实现的默认前门。

由于 `superpowers` 在 OpenCode、Codex、Claude Code 下的安装方式不同，Praxis 不会把它复制到 `.praxis/`，而是通过依赖管理命令处理：

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor
npx praxis-devos bootstrap --agents codex
npx praxis-devos bootstrap --agents claude
```

## Runtime Foundations

内置 runtime foundations 位于 `foundations/`、`profiles/`、`overlays/`。

- foundation 声明一组运行时操作模型，例如 `ecc-foundation`
- profile 会被脚手架到 `.praxis/foundation/profile/`
- overlays 会被脚手架到 `.praxis/overlays/`

当前首个里程碑内置的是 `ecc-foundation`，它：

- 把 ECC 作为 runtime base 概念
- 不引入任何私有公司集成
- 预留 future internal MCP、docs、commands、hooks、rules、skills 的扩展占位
- 保留 OpenSpec 的治理能力，但不把它设定为所有日常任务的必经路径

## Skills

### 框架 Skills

框架内置：

- `openspec`：规范驱动开发工作流
- `git-workflow`：可自定义 Git 流程规范
- `code-review`：可自定义评审流程

### 项目 Skills

在 `init` 时安装到 `.praxis/skills/`，项目可以直接修改。
Praxis 还会生成 `.praxis/skills/INDEX.md`，让 Codex / Claude 的托管区能直接看到当前项目已安装的 skills 摘要，而不是只依赖文件被动发现。

### 栈专属 Skills

技术栈可以提供数据库、安全、异常处理、测试等领域 skill，同样安装到 `.praxis/skills/`。
这些技术栈内容的定位是“初始基线”，安装到项目后可以继续按公司或项目规范修改。

## 技术栈

可用技术栈位于 `stacks/`：

```text
stacks/{栈名}/
├── stack.md
├── rules.md
└── skills/
```

新增技术栈时，推荐从 `stacks/starter/` 复制。

## 迁移

历史上只支持 OpenCode 的项目可以原地迁移：

```bash
npx praxis-devos migrate
```

该命令会把旧的 `.opencode` 项目资产迁移到 `.praxis/`，然后重新生成适配输出。

## 前置依赖

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 20.19.0 | CLI 运行时 |
| Git | 任意 | 仓库管理 |
| AI Agent | 最新版 | OpenCode、Codex 或 Claude Code |

## 贡献

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 赞助

开源不易，如果这个项目对你有帮助，欢迎赞助一杯咖啡 ☕

<img src="https://wxma-1254014761.cos.ap-beijing.myqcloud.com/pay.png" alt="微信赞赏" width="200" />

## 许可证

[Apache License 2.0](LICENSE)
