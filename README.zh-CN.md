# praxis-devos

> 面向 OpenCode、Codex、Claude Code 的 OpenSpec 治理层与 SuperPowers 执行层集成框架。

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) · [简体中文](README.zh-CN.md)

## 它做什么

`praxis-devos` 用来把用户项目准备成一个统一的 AI 开发工作区，让不同 agent 遵守同一套流程约束：

- 用 OpenSpec 管理提案、spec、校验、归档
- 用 SuperPowers 提供计划、调试、完成前验证等执行能力
- 为 OpenCode、Codex、Claude Code 生成各自的接入适配

这个包的定位是安装到用户项目里，然后在那个项目目录下通过 `npx praxis-devos ...` 使用。

## 项目结构

执行 `setup` 后，用户项目通常会出现这些入口：

```text
your-project/
├── AGENTS.md          # Codex / OpenCode 共享项目规则
├── CLAUDE.md          # 通过 @AGENTS.md 引入共享规则的薄包装
├── openspec/          # OpenSpec 工作区
├── .opencode/         # 选中 OpenCode 时生成的最小兼容目录
└── opencode.json      # OpenCode 插件配置
```

`AGENTS.md` 是跨 agent 的共享项目规则文件；`CLAUDE.md` 保持很薄，只通过 `@AGENTS.md` 引入共享规则，避免再复制一份。

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

Praxis 现在会通过 Claude CLI 自动安装 SuperPowers：

```bash
claude plugin install superpowers@claude-plugins-official --scope user
```

### OpenCode

```bash
npx praxis-devos setup --agent opencode
npx praxis-devos doctor --strict
```

### 多 Agent 项目

```bash
npx praxis-devos setup --agents opencode,codex,claude
npx praxis-devos doctor --strict
```

## 命令

| 命令 | 用途 |
|---|---|
| `setup` | 主 onboarding / 修复入口 |
| `init` | 底层项目骨架初始化 |
| `sync` | 刷新托管适配输出 |
| `migrate` | 遗留兼容命令；当前主要做 adapter 重同步 |
| `status` | 查看当前项目与运行时状态 |
| `doctor` | 检查 OpenSpec 与 SuperPowers 依赖 |
| `bootstrap` | 打印修复/安装指导，不执行完整 setup |
| `validate-session` | 按 Praxis hook 证据校验会话记录 |

## 运行时行为

当前 `setup` 会做这些事：

- 确保 OpenSpec 可用；缺失时自动安装项目本地版本
- 为所选 agent 自动安装或配置 SuperPowers
- 创建或刷新 `openspec/`
- 将共享托管规则写入 `AGENTS.md`
- 在 `CLAUDE.md` 中写入引用 `@AGENTS.md` 的薄包装
- 为 OpenCode 创建最小 `.opencode/README.md` 兼容目录
- 在 setup 结束后执行依赖检查

各 agent 当前行为：

- OpenCode：向 `opencode.json` 写入插件声明，并把共享 OpenSpec skills 投放到 `~/.claude/skills`
- Codex：将共享 OpenSpec skills 投放到 `~/.agents/skills`，供 Codex 原生发现
- Claude Code：执行 `claude plugin install superpowers@claude-plugins-official --scope user`

## OpenSpec 与 SuperPowers 的结合方式

Praxis 不替代 OpenSpec 或 SuperPowers，而是把两者编排到一起。

托管项目规则会要求 agent：

- 对纯写作、改写、翻译、总结这类直接产出型请求默认直接执行，而不是升级成工程流程
- 用 `/opsx:propose` 或 `/opsx:explore` 进入提案/探索流程
- 在进入实现前先完成 Proposal Intake
- 一旦进入 OpenSpec 阶段，始终以 OpenSpec 作为唯一对外可见的主流程
- 仅把 SuperPowers 当作阶段内的方法论能力使用，不再额外宣告第二层流程
- brainstorming / planning / debugging / verification 的结论与产物必须收敛到当前 `openspec/changes/<change>/...`

Praxis 目前不会 fork 或覆盖上游 SuperPowers 插件。当前的协调方式由三层构成：

- `AGENTS.md` 中的共享托管规则，以及负责引入它的薄 `CLAUDE.md`
- 投影后的 OpenSpec `opsx-*` skills，它们定义 OpenSpec 是外层主流程
- transcript/session validator，它会拦截 OpenSpec flow 中重复的流程公告或写入 `docs/superpowers/...` 的输出

这也意味着 Praxis 只能收窄自己投影到仓库内的路由边界，不能全局重写上游 SuperPowers skill。本仓库定义的“轻任务直出”规则会体现在 Praxis 托管规则与示例里，而代码、行为、接口、兼容性、架构/流程变化仍然必须走工程门禁。

## 企业级扩展包

Praxis 有意保持为核心框架层，企业定制资产不再硬编码在这个仓库里，而是放到独立扩展包中。

这种扩展包模型适合承载：

- 企业 rules
- 企业 skills
- 企业 hooks
- 语言或领域级标准
- common 层 + stack 层的组合分发

一个典型例子就是外部规则包 `iuap-rules-pack`。它按下面的方式组织能力：

- `common/`：企业公共资产
- `stacks/<stack>/`：技术栈专属资产
- `rules/`、`skills/`、`hooks/` 分开管理
- 再按 Claude、Codex、OpenCode 的原生入口做 target-specific 投影

这样 Praxis 的职责边界会更清晰：

- `praxis-devos`：负责 OpenSpec 治理、SuperPowers 运行时接入、agent adapter 管理、统一工作流入口
- 企业扩展包：负责企业 rules/skills/hooks 内容，以及各 target 的具体投放逻辑

下一步即将落地的方向，是让 `praxis-devos` 提供类似 `praxis-devos install-rules` 这样的统一扩展包入口。这个方向已经很近了，但截至当前版本，仍不应把它理解成已经在本仓库里落地完成的现成功能。

## 仓库结构

这个仓库本身是 npm 包源码仓库，当前重要目录如下：

```text
assets/            # 内置 OpenSpec skill 资产
bin/               # 发布后的 CLI 入口
src/core/          # setup/doctor/sync 等主逻辑
src/projection/    # 各 agent 的 projection 逻辑
src/templates/     # AGENTS.md 共享规则模板
test/              # 单测与安装 smoke 脚本
```

## 开发

本地运行测试：

```bash
npm test
```

对打包产物执行安装 smoke：

```bash
npm pack
node test/install-smoke-cli.mjs --package ./praxis-devos-<version>.tgz --scenario opencode
node test/install-smoke-cli.mjs --package ./praxis-devos-<version>.tgz --scenario claude
```

`codex` 场景也支持，但它会走真实的 clone/link 路径，对环境更敏感。

## License

Apache-2.0
