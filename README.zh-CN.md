# praxis-devos

> AI 原生开发框架 — OpenSpec 规范驱动 + SuperPowers 增强 + 可插拔技术栈

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## 概述

面向 AI 编码助手（OpenCode、Claude Code 等）的开发框架，提供：
- **OpenSpec 规范驱动开发**工作流（propose → apply → archive）
- **可插拔技术栈**架构（rules + skills，按项目选择）
- **通用 Skills**（OpenSpec 工作流、Git 协作流程等流程类最佳实践）
- **SuperPowers 执行增强**（可选，提供 TDD、调试、计划编写等高级技能）
- 一键安装脚本

## 为什么选择 praxis-devos？

| | OpenSpec | SuperPowers | **praxis-devos** |
|---|---|---|---|
| 规范驱动 | ✅ | ❌ | ✅ |
| 执行质量 Skills | ❌ | ✅ | ✅（可选集成） |
| 技术栈管理 | ❌ | ❌ | ✅ |
| 编码规范治理 | ❌ | ❌ | ✅ |

praxis-devos **编排** OpenSpec（定义做什么）和 SuperPowers（定义怎么做），再叠加可插拔技术栈（定义编码标准）。

## 快速开始

```bash
# 1. 安装框架到项目目录
./install.sh --dir /path/to/your-project

# 2. 填写项目信息
#    编辑 openspec/project.md

# 3. 开始使用
openspec list --specs
```

> **技术栈是可选的。** 不指定 `--stack` 时，框架核心功能（OpenSpec + 通用 Skills + Git Hooks）仍正常工作。

## 架构

```
┌─────────────────────────────────────────────────┐
│                  AGENTS.md                       │
│          全局策略与调度中心（WHEN）               │
├─────────────┬──────────────┬────────────────────┤
│  OpenSpec   │  通用 Skills  │  技术栈 Rules      │
│  规范治理    │  最佳实践     │  编码标准           │
│  (WHAT)     │  (UNIVERSAL)  │  (STACK-SPECIFIC) │
├─────────────┴──────────────┴────────────────────┤
│           SuperPowers（可选增强）                  │
│     执行质量 Skills: TDD / 调试 / 计划 / 验收     │
│                    (HOW)                         │
└─────────────────────────────────────────────────┘
```

### 三层上下文

| 层级 | 文件 | 作用 |
|------|------|------|
| 框架层 | `AGENTS.md` | **怎么做事**（流程与规范） |
| 项目层 | `openspec/project.md` | **做的是什么事**（业务上下文） |
| 目录层 | 子目录 `AGENTS.md` | **当前在哪里做事**（本地上下文） |

## 项目结构

```
praxis-devos/
├── AGENTS.md                      # 全局调度中心（AI 代理入口）
├── CLAUDE.md                      # Claude Code 入口
├── install.sh / install.ps1       # 一键安装脚本
├── openspec/                      # OpenSpec 规范系统
│   ├── AGENTS.md                  # OpenSpec 工作流指令
│   ├── project.md                 # 项目上下文（使用者填写）
│   ├── specs/                     # 当前规范
│   ├── changes/                   # 活跃变更提案
│   └── templates/                 # 提案/任务模板
├── skills/                        # 通用 Skills（流程类，所有栈共享）
│   ├── openspec-workflow/         # OpenSpec 工作流
│   ├── git-workflow/              # Git 分支、提交、合并
│   └── code-review/              # 代码评审流程与清单
└── stacks/                        # 可插拔技术栈
    ├── starter/                   # 最小模板（创建新栈的起点）
    └── java-spring/              # Java + Spring Boot 参考栈
        ├── stack.md               # 技术栈声明
        ├── rules.md               # Java 编码规范
        └── skills/                # 栈专属 Skills（数据库、安全、测试等）
```

## Skills

### 通用 Skills（框架自带）

框架层只提供**流程类**通用 skills，不包含技术实现细节。

| Skill | 说明 |
|-------|------|
| openspec-workflow | OpenSpec 规范驱动开发工作流 |
| git-workflow | Git 分支、提交、合并规范（GitHub Flow / Git Flow） |
| code-review | 代码评审流程、评审清单、反馈分级、自审规范 |

### 栈专属 Skills（按技术栈加载）

技术实现细节（数据库设计、异常处理、安全编码、缓存等）由各技术栈自行定义。详见各栈的 `stack.md`。

## 技术栈配置

技术栈是**可选的**。不配置时，框架核心功能正常工作。

```markdown
<!-- 在 openspec/project.md 顶部设置 -->
<!-- praxis-devos:stack = starter -->
```

### 扩展新技术栈

参考 `stacks/starter/` 模板创建：

```
stacks/{栈名}/
├── stack.md               # 技术栈元信息
├── rules.md               # 编码规范
├── skills/                # 栈专属 Skills（可选）
└── project-example.md     # project.md 填写示例（可选）
```

## 前置依赖

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 20.19.0 | OpenSpec CLI 运行时 |
| npm / pnpm / yarn | 任意 | 包管理器 |
| Git | 任意 | SuperPowers 安装需要 |
| OpenCode 或 Claude Code | 最新版 | AI 编码助手 |

## 安装

```bash
# 安装到当前目录
./install.sh

# 安装并指定技术栈
./install.sh --stack <栈名>

# 安装到指定项目目录
./install.sh --stack <栈名> --dir /path/to/my-project

# 查看可用技术栈
./install.sh --list-stacks

# 检查运行环境
./install.sh --check

# 卸载
./install.sh --uninstall --dir /path/to/my-project
```

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

## 许可证

[Apache License 2.0](LICENSE)
