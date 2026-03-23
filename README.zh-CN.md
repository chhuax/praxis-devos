# praxis-devos

> AI 原生开发框架 — [OpenSpec](https://github.com/Fission-AI/OpenSpec) 规范治理 + [SuperPowers](https://github.com/obra/superpowers) 执行增强 + 可插拔技术栈

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## 概述

面向 AI 编码助手（OpenCode、Claude Code 等）的开发框架，三大核心支柱协同驱动高质量 AI 开发：
- **[OpenSpec](https://github.com/Fission-AI/OpenSpec) 规范治理** — 定义做什么（WHAT），从提案到实现到归档的全生命周期管理
- **[SuperPowers](https://github.com/obra/superpowers) 执行增强** — 定义怎么做（HOW），提供 TDD、调试、计划编写、验收等核心执行能力
- **可插拔技术栈** — 定义编码标准（STANDARD），按项目选择技术栈规则与领域技能
- 通用 Skills（OpenSpec 工作流、Git 协作流程等流程类最佳实践）

## 为什么选择 praxis-devos？

| | OpenSpec | SuperPowers | **praxis-devos** |
|---|---|---|---|
| 规范驱动 | ✅ | ❌ | ✅ |
| 执行质量 Skills | ❌ | ✅ | ✅ |
| 技术栈管理 | ❌ | ❌ | ✅ |
| 编码规范治理 | ❌ | ❌ | ✅ |

praxis-devos 编排三个核心支柱：[OpenSpec](https://github.com/Fission-AI/OpenSpec)（规范治理）+ [SuperPowers](https://github.com/obra/superpowers)（执行质量）+ 可插拔技术栈（编码标准），三者同等重要、相互支撑。

## 快速开始

```json
{
  "plugin": [
    "praxis-devos@git+https://github.com/chhuax/praxis-devos.git",
    "superpowers@git+https://github.com/obra/superpowers.git"
  ]
}
```

1. 在项目的 `opencode.json` 中添加插件配置
2. 重启 OpenCode（插件自动安装）
3. 初始化项目（让 AI 执行或它会自动提示）："Run praxis-init with java-spring stack"
4. 在项目根目录创建 `AGENTS.md` 描述项目上下文

## 架构

```
┌─────────────────────────────────────────────────┐
│                  RULES.md                        │
│          全局策略与调度中心（WHEN）               │
├────────────────┬────────────────┬──────────────────┤
│   OpenSpec     │  SuperPowers   │  Pluggable 技术栈 │
│   规范治理      │  执行增强      │  编码标准与技能    │
│   (WHAT)       │  (HOW)         │  (STANDARD)       │
└────────────────┴────────────────┴──────────────────┘
```

### 三层上下文

| 层级 | 文件 | 作用 |
|------|------|------|
| 框架层 | `RULES.md` | **怎么做事**（流程与规范） |
| 项目层 | 用户项目根 `AGENTS.md` | **做的是什么事**（业务上下文） |
| 目录层 | 子目录 `AGENTS.md` | **当前在哪里做事**（本地上下文） |

## 项目结构

```
praxis-devos/                              # 插件仓库
├── RULES.md                               # 框架规则（注入 AI 系统提示词）
├── .opencode/plugins/praxis-devos.js      # 插件入口
├── package.json                           # 包清单
├── openspec/                              # 规范模板
│   └── templates/                         # 提案/任务模板
├── skills/                                # 插件内置 Skills（框架耦合）
│   └── openspec/                          # OpenSpec 规范工作流
└── stacks/                                # 可插拔技术栈（模板）
    ├── starter/                           # 最小模板（创建新栈的起点）
    └── java-spring/                       # Java + Spring Boot 参考栈
        ├── stack.md                       # 技术栈声明
        └── skills/                        # 栈专属 Skills（数据库、安全、测试等）

your-project/                              # 运行 praxis-init 后
├── opencode.json                          # 插件配置
├── AGENTS.md                              # 项目策略（你来填写）
├── openspec/                              # OpenSpec 结构（CLI 创建）
│   ├── AGENTS.md                          # OpenSpec 工作流指令
│   ├── specs/                             # 当前规范
│   ├── changes/                           # 活跃变更提案
│   └── templates/                         # 提案/任务模板
└── .opencode/
    ├── stack.md                           # 工具链参考（来自所选技术栈）
    └── skills/                            # 所有 skills 统一在这里
        ├── git-workflow/                   # Git 分支、提交、合并（可自由修改）
        ├── code-review/                    # 代码评审流程与清单
        ├── java-database/                  # ← 来自技术栈（如选了 java-spring）
        ├── java-error-handling/            # ← 来自技术栈
        ├── java-security/                  # ← 来自技术栈
        └── java-testing/                   # ← 来自技术栈
```

## Skills

### 插件内置 Skills

框架耦合，不建议用户修改：

| Skill | 说明 |
|-------|------|
| openspec | OpenSpec 规范驱动开发工作流（提案 → 实现 → 归档） |

### 用户可自定义 Skills

由 `praxis-init` 复制到项目的 `.opencode/skills/`，可自由修改以适配团队流程：

| Skill | 说明 |
|-------|------|
| git-workflow | Git 分支、提交、合并规范（GitHub Flow / Git Flow） |
| code-review | 代码评审流程、评审清单、反馈分级、自审规范 |

### SuperPowers Skills（核心执行层）

通过插件系统加载，提供开发生命周期中的关键执行能力。

| Skill | 说明 |
|-------|------|
| brainstorming | 结构化头脑风暴，明确需求与功能范围 |
| writing-plans | 将创意转化为具体的开发计划与里程碑 |
| test-driven-development | 自动化 RED-GREEN-REFACTOR 循环，驱动代码质量 |
| systematic-debugging | 系统化调试流程，高效定位并修复问题 |
| subagent-driven-development | 并行分发多个子代理，加速开发 |
| verification-before-completion | 合并前验证、测试与质量门控 |
| finishing-a-development-branch | 收尾工作、准备 PR、确保提交历史整洁 |
| using-git-worktrees | 使用 Git Worktree 隔离工作区，支持并行开发 |

### 栈专属 Skills（按技术栈加载）

技术实现细节（数据库设计、异常处理、安全编码、缓存等）由各技术栈自行定义。安装时复制到 `.opencode/skills/`。

## 技术栈配置

技术栈是**可选的**。不配置时，框架核心功能正常工作。安装时通过 `praxis-init` 指定技术栈，对应的领域 skills 会被复制到 `.opencode/skills/`。

### 扩展新技术栈

参考 `stacks/starter/` 模板创建：

```
stacks/{栈名}/
├── stack.md               # 技术栈元信息
├── skills/                # 栈专属 Skills（可选）
└── project-example.md     # AGENTS.md 填写示例（可选）
```

## 前置依赖

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 20.19.0 | OpenSpec CLI 运行时 |
| npm / pnpm / yarn | 任意 | 包管理器 |
| Git | 任意 | 插件同步与版本管理 |
| OpenCode 或 Claude Code | 最新版 | AI 编码助手 |

## 安装

### OpenCode 插件安装（推荐）

1. 在项目的 `opencode.json` 中添加插件配置

```json
{
  "plugin": [
    "praxis-devos@git+https://github.com/chhuax/praxis-devos.git",
    "superpowers@git+https://github.com/obra/superpowers.git"
  ]
}
```

2. 重启 OpenCode — 插件启动时自动安装
3. 初始化项目 — 让 AI 执行或它会自动提示："Run praxis-init with java-spring stack"
4. 填写项目信息 — 编辑 AGENTS.md 项目摘要区

`praxis-init` 会自动完成：
- 检测并安装 OpenSpec CLI（`@fission-ai/openspec`）
- 运行 `openspec init` 创建规范目录结构
- 复制框架模板（提案/任务模板）
- 复制 `git-workflow` 和 `code-review` 到 `.opencode/skills/`（可自定义）
- 复制所选技术栈的工具链声明到 `.opencode/stack.md`
- 创建 `AGENTS.md` 骨架文件（如不存在）

> Claude Code 用户：另需执行 `/plugin install superpowers@claude-plugins-official`。

### 升级

插件通过 `git+https://` 安装，OpenCode 会缓存特定的 Git commit。拉取最新版本：

```bash
rm -rf ~/.cache/opencode/node_modules/praxis-devos
rm -f ~/.cache/opencode/bun.lock
# 然后重启 OpenCode
```

> **注意**：`praxis-init` 是幂等的 — 已存在的文件不会被覆盖。如需更新模板或栈规范，先删除对应文件再重新运行 `praxis-init`。

## 开发流程

1. `openspec list --specs` — 检查规范
2. 创建变更提案 — 通过 OpenSpec 工作流
3. 按提案实现 — TDD + 技术栈规范
4. `openspec archive <id>` — 归档完成

## 贡献

欢迎贡献！详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

- 创建新技术栈
- 创建新 Skill
- 翻译文档
- 报告问题

## 赞助

开源不易，如果这个项目对你有帮助，欢迎赞助一杯咖啡 ☕

<img src="https://wxma-1254014761.cos.ap-beijing.myqcloud.com/pay.png" alt="微信赞赏" width="200" />

## 许可证

[Apache License 2.0](LICENSE)
