# Codemap: Project Overview

<!-- PRAXIS_DOCS_REFRESH_START -->
## Generated Overview

> This section is maintained by `praxis-devos docs refresh` as a compatibility path. Prefer `/devos-docs-refresh` when host command wiring is available.

## Project Summary

- Primary surface: `public-interface`
- Surface kind: `other`
- Surface location: `src/index.ts`

## Read These Files First

- `AGENTS.md`
- `README.md`
- `docs/codemaps/project-overview.md`
- `docs/surfaces.yaml`
- `src/index.ts`
- `test/`

## Top-Level Structure

- `assets/`
- `bin/`
- `contracts/`
- `docs/`
- `openspec/`
- `src/`
- `test/`
- `AGENTS.md`
- `CHANGELOG.md`
- `CLAUDE.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `opencode-plugin.js`
- `package.json`
- `praxis-devos-0.4.9.tgz`
- `README.md`
- `README.zh-CN.md`
- `SECURITY.md`

## Entry Candidates

- `src/index.ts`
- `bin/`

## Problem Routing

- External surface changes: read `docs/surfaces.yaml`.
- Source code changes: read `src/`.
- Tests: read `test/`.
- Docs and project map updates: read `docs/codemaps/project-overview.md` and `docs/surfaces.yaml`.
<!-- PRAXIS_DOCS_REFRESH_END -->

## User Notes

Add project-specific notes here. Praxis refresh preserves this section.

# Codemap: Project Overview

## 用途

这份 codemap 用于帮助 AI 或新接手的开发者在最短时间内建立对 `praxis-devos` 的整体认知。

优先回答 5 个问题：

1. 这是个什么项目
2. 主入口在哪里
3. 核心目录分别负责什么
4. 当前功能改动大概率落在哪
5. 先看哪些文件最值当

## 一句话概述

`praxis-devos` 是一个 Node.js CLI，用来把 OpenSpec 治理层和 SuperPowers 执行层安装进用户项目，并把 OpenSpec `opsx-*` skills 投影到不同 agent 的原生技能目录中。

## 首先看哪些文件

按优先级建议阅读顺序：

1. [AGENTS.md](../../AGENTS.md)
2. [src/core/praxis-devos.js](../../src/core/praxis-devos.js)
3. [src/templates/managed-entry.md](../../src/templates/managed-entry.md)
4. [src/projection/index.js](../../src/projection/index.js)
5. [src/monitoring/index.js](../../src/monitoring/index.js)
6. [test/praxis-devos.test.js](../../test/praxis-devos.test.js)

## 仓库结构速览

```text
bin/
  praxis-devos.js              # CLI 入口

src/core/
  praxis-devos.js              # 命令分发、项目初始化、sync、doctor、validate-session
  capability-policy.js         # OpenSpec 各阶段 capability 选择策略

src/projection/
  index.js                     # 不同 agent 投影分发入口
  codex.js                     # 投影到 ~/.codex/skills
  claude.js                    # 投影到 ~/.claude/skills
  opencode.js                  # OpenCode 共享投影
  markers.js                   # PRAXIS_PROJECTION marker 注入/解析

src/monitoring/
  commands.js                  # instrumentation / record / validate-change 命令处理
  state-store.js               # 证据文件读写与校验
  overlay.js                   # 给投影后的 opsx skill 注入 monitoring overlay
  index.js                     # monitoring 导出入口

src/templates/
  managed-entry.md             # 注入用户项目 AGENTS.md 的托管规则

assets/skills/
  opsx-propose/SKILL.md
  opsx-explore/SKILL.md
  opsx-apply/SKILL.md
  opsx-archive/SKILL.md        # 内置 OpenSpec skill 资产
  devos-docs/SKILL.md          # docs skill 资产

assets/commands/
  devos-docs-init.md
  devos-docs-refresh.md        # 共享 host command 资产

test/
  praxis-devos.test.js         # 主测试文件
```

## 问题路由

### 改 CLI 参数、命令、help 文本

先看：

- [src/core/praxis-devos.js](../../src/core/praxis-devos.js)
- [test/praxis-devos.test.js](../../test/praxis-devos.test.js)

### 改投影逻辑或用户 home 下的技能分发

先看：

- [src/projection/index.js](../../src/projection/index.js)
- [src/projection/codex.js](../../src/projection/codex.js)
- [src/projection/claude.js](../../src/projection/claude.js)
- [src/projection/opencode.js](../../src/projection/opencode.js)

### 改 OpenSpec flow 规则或用户项目注入文案

先看：

- [src/templates/managed-entry.md](../../src/templates/managed-entry.md)
- [assets/skills/opsx-propose/SKILL.md](../../assets/skills/opsx-propose/SKILL.md)
- [assets/skills/opsx-apply/SKILL.md](../../assets/skills/opsx-apply/SKILL.md)
- [assets/skills/opsx-archive/SKILL.md](../../assets/skills/opsx-archive/SKILL.md)

### 改 capability evidence、monitoring overlay 或 validate-change

先看：

- [src/monitoring/state-store.js](../../src/monitoring/state-store.js)
- [src/monitoring/commands.js](../../src/monitoring/commands.js)
- [src/monitoring/overlay.js](../../src/monitoring/overlay.js)
- [src/core/capability-policy.js](../../src/core/capability-policy.js)

## 关键事实

- 单一主入口是 [src/core/praxis-devos.js](../../src/core/praxis-devos.js)
- `setup` 和 `sync` 最终都会回到 agent adapter sync 和 AGENTS managed block 注入
- OpenSpec skill 与 docs skill 的正式源资产都在 `assets/skills/`
- 投影后的技能文件通过 marker 判断是否可被 Praxis 覆盖
- 监控证据不写进仓库，写进用户 home 下的 Praxis state 目录
