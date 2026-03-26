# 快速上手

这份文档给出 Praxis DevOS 最短可用路径。

## 开始前

你需要：

- Node.js `>= 20.19.0`
- Git
- 一个受支持的 agent：OpenCode、Codex 或 Claude Code

## 1. 先执行 Setup

对大多数用户来说，只需要记住 `setup`。

### 新仓库或现有仓库，先接入 Codex

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
```

### 先接入框架，稍后再选技术栈

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
npx praxis-devos use-stack java-spring
```

### 已有 Praxis 项目，在新电脑上接入

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

### 后续再补一个 agent

```bash
npx praxis-devos setup --agent claude
npx praxis-devos doctor --strict
```

Claude Code 目前仍需要一个手工 marketplace 步骤：

```text
/plugin install superpowers@claude-plugins-official
```

## 2. `setup` 会做什么

`setup` 会处理标准开箱流程：

- 安装或复用 OpenSpec
- 在支持的前提下安装或配置对应 agent 的运行时依赖
- 创建 `openspec/`
- 创建 `.praxis/`
- 同步 `AGENTS.md`、`CLAUDE.md` 等 agent 适配入口
- 如果传了 `--stack`，顺手应用技术栈
- 在默认路径上自动应用内置 runtime baseline

标准 onboarding 不需要你手动去跑 `init`、`bootstrap` 或 `use-foundation`。

## 3. 补项目上下文

执行完 setup 后，先编辑这两个文件：

- `AGENTS.md`
- `openspec/project.md`

内容保持简洁即可，通常写清这些就够了：

- 产品做什么
- 核心模块
- 常用命令
- 项目约束
- 对较大变更有影响的业务或治理上下文

## 4. 开始工作

日常开发时，直接在仓库里启动 agent 正常工作即可。

Praxis 的设计目标是让日常实现优先从项目基线开始：

- `.praxis/rules.md`
- `.praxis/stack.md`
- `.praxis/skills/` 下的已安装 skills

你不需要先理解 foundation 或 ECC 内部结构。

## 5. 什么时候用 OpenSpec

OpenSpec 被纳入 Praxis，是因为有些变更需要治理与留痕。它不是日常任务的默认前门。

下面这些场景通常直接走实现流：

- 修 bug
- 常规重构
- 已批准范围内的功能开发
- 普通 review 和验证

下面这些场景更适合进入 OpenSpec：

- 需要提案或变更记录
- 需要 spec delta
- 需要正式 validate
- 需要 archive 留痕

示例：

```bash
npx praxis-devos change --title "Add two factor auth" --capability auth
npx praxis-devos openspec validate <change-id> --strict --no-interactive
```

## 6. 常用命令

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
npx praxis-devos status
npx praxis-devos use-stack java-spring
npx praxis-devos change --title "Add two factor auth" --capability auth
```

高级命令：

- `npx praxis-devos bootstrap`：偏修复和排障
- `npx praxis-devos init`：更底层的初始化命令
- `npx praxis-devos use-foundation`：高级 runtime baseline 补刷 / 重应用

## 7. 接下来读什么

- [README.zh-CN.md](../README.zh-CN.md)
- [docs/dependency-management.md](dependency-management.md)
- [docs/architecture/multi-agent.md](architecture/multi-agent.md)
- [docs/migration-guide.md](migration-guide.md)
