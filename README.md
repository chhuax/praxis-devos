# praxis-devos

> AI 原生开发框架 — OpenSpec 规范驱动 + SuperPowers 增强 + 可插拔技术栈

## 概述

面向 AI 编码助手（OpenCode、Claude Code 等）的开发框架，提供：
- OpenSpec 规范驱动开发工作流
- SuperPowers 插件增强（OpenCode / Claude Code）
- 可插拔技术栈架构（rules + skills）
- 一键安装脚本

## 前置依赖

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 20.19.0 | OpenSpec CLI 运行时 |
| Git | 任意 | SuperPowers 克隆 |
| OpenCode 或 Claude Code | 最新版 | AI 编码助手 |

## 版本兼容性

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 20.19.0 | 推荐 LTS 版本 |
| Git | 任意版本 | 用于插件同步 |
| OpenCode | >= 0.1.0 | 推荐最新版本 |
| Claude Code | >= 1.0 | 推荐最新版本 |

## 安装

框架是独立的工具包，通过 `--dir` 指定目标项目目录（不指定则安装到当前目录）：

```bash
# 安装到当前目录（不指定技术栈）
./install.sh

# 安装并指定技术栈
./install.sh --stack yonbip-java

# 安装到指定项目目录
./install.sh --stack yonbip-java --dir /path/to/my-project

# 指定 AI 工具
./install.sh --stack yonbip-java --target opencode

# 带示例 project.md
./install.sh --stack yonbip-java --with-example

# 安装后清理示例文件
./install.sh --stack yonbip-java --clean-examples

# 检查运行环境
./install.sh --check

# 查看可用技术栈
./install.sh --list-stacks

# 卸载
./install.sh --uninstall --dir /path/to/my-project
```

> **技术栈是可选的。** 不指定 `--stack` 时，框架核心功能（OpenSpec、Skills、Git Hooks）仍正常工作，只是不加载技术栈特定的编码规范。

## 项目结构

```
项目根/
├── AGENTS.md                      # 全局调度中心（AI 代理入口）
├── CLAUDE.md                      # Claude Code 入口
├── install.sh                     # 一键安装脚本
├── openspec/                      # OpenSpec 规范系统
│   ├── AGENTS.md                  # OpenSpec 工作流指令
│   ├── project.md                 # 项目上下文（使用者填写）
│   ├── specs/                     # 当前规范
│   ├── changes/                   # 活跃变更提案
│   └── templates/                 # 提案/任务模板
├── .claude/skills/                # Skills（OpenCode + Claude Code 共用）
│   ├── openspec-workflow/         # OpenSpec 工作流
│   ├── git-workflow/              # Git 工作流
│   ├── database-guidelines/       # 数据库设计规范
│   ├── error-handling/            # 异常处理规范
│   ├── security/                  # 安全编码规范
│   └── redis-guidelines/          # Redis 使用规范
└── stacks/                        # 可插拔技术栈
    └── yonbip-java/               # YonBIP Java + Spring Boot
        ├── stack.md               # 技术栈声明
        └── rules.md               # 编码规范
```

## Skills

### 通用 Skills

| Skill | 说明 |
|-------|------|
| openspec-workflow | OpenSpec 规范驱动开发工作流 |
| git-workflow | Git 分支、提交、合并规范 |

### 技术栈 Skills（yonbip-java）

| Skill | 说明 |
|-------|------|
| database-guidelines | 数据库设计、SQL 编写、索引规范 |
| error-handling | 异常处理规范、异常码体系、统一响应格式 |
| security | 安全编码规范（注入防护、密码安全、XSS/CSRF） |
| redis-guidelines | Redis 使用规范（命令、Key 设计、过期策略） |

## 开发流程

1. `openspec list --specs` — 检查规范
2. `/openspec:proposal` — 创建提案
3. `/openspec:apply` — 实现变更
4. `/openspec:archive` — 归档完成

## 自定义 project.md

`openspec/project.md` 是 AI 代理理解项目业务上下文的核心文件。

### 作用
- 帮助 AI 快速掌握项目背景、模块职责和依赖关系。
- 提供项目特有的构建命令和分支策略。
- 补充 `rules.md` 之外的项目级编码约定。

### 关键字段说明
- **项目性质**：描述业务领域和核心功能。
- **技术栈**：列出实际使用的中间件、数据库、缓存等。
- **模块一览**：多模块项目的职责划分。
- **代码规范**：项目特有的命名或架构约定。

> **提示**：建议参考 `stacks/{栈名}/project-example.md` 进行填写。

## 技术栈配置

技术栈是**可选的**。不配置时，框架核心功能正常工作，只是不加载技术栈特定的编码规范和 Skills。

### 查看当前技术栈

技术栈声明在 `openspec/project.md` 顶部的 HTML 注释中：

```markdown
<!-- praxis-devos:stack = yonbip-java -->
```

值为 `none` 表示未配置。

### 切换 / 配置技术栈

只需修改 **一个地方** — `openspec/project.md` 中的注释标记：

```markdown
<!-- praxis-devos:stack = yonbip-java -->
```

确保 `stacks/{栈名}/` 目录存在且包含 `stack.md` 和 `rules.md`。

### AI 代理自动识别

如果未显式配置技术栈，AI 代理会按以下优先级尝试识别：

1. **显式声明**（推荐）：读取 `openspec/project.md` 中的标记
2. **目录扫描**：检查 `stacks/` 下有哪些栈可用
3. **特征文件推断**：根据 `pom.xml`、`package.json` 等项目文件推断
4. **无法识别**：提示用户技术栈为可选项

> AI 代理在推断出栈名后会**主动询问确认**，确认后自动写入 `openspec/project.md`。

## 扩展新技术栈

在 `stacks/` 下创建新目录，包含以下核心文件：

### 1. stack.md (技术栈声明)
必须包含以下字段：
- **基本信息表**：名称、显示名、运行时、框架、构建工具等。
- **工具链命令 (YAML)**：定义 `build`, `test`, `verify`, `lint`, `package`, `format`, `deps` 等命令。
- **包含的 Skills 表**：列出该技术栈特有的 Skill 及其路径。

### 2. rules.md (编码规范)
编写要点：
- **命名规范**：类名、方法名、变量名、包名的具体约定。
- **日志规范**：日志级别使用、日志格式、禁止使用的打印方式（如 `System.out`）。
- **核心禁止项**：明确禁止的反模式或不安全操作。

### 3. 目录结构示例
```
stacks/{栈名}/
├── stack.md               # 技术栈元信息
├── rules.md               # 编码规范
└── project-example.md     # project.md 填写示例（可选）
```

参考 `stacks/yonbip-java/` 的结构。

## 常见问题

### 安装失败
- **Node.js 版本过低**：请确保 Node.js >= 20.19.0。
- **npm 权限问题**：尝试使用 `sudo` 或检查目录所有权。

### OpenSpec CLI 报错
- **init 失败**：检查当前目录是否已有 `openspec` 目录或权限不足。
- **validate 报错**：通常是 `proposal.md` 或 `spec.md` 格式不符合规范，请检查场景（Scenario）标题是否为 4 级标题。

### Skills 不生效
- **路径错误**：确保 Skill 存放在 `.claude/skills/` 下且路径与 `stack.md` 配置一致。
- **Frontmatter 格式错误**：检查 Skill 文件的元数据定义。

### SuperPowers 安装问题
- 确保网络可访问 GitHub，或手动克隆插件仓库到对应目录。

---

MIT
