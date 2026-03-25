# 多 Agent 架构

## 目标

Praxis DevOS 需要同时支持多个 AI 编码助手，而不能把项目状态耦合到某一个运行时目录或插件协议。

因此框架明确拆分为三层：

- **规范层资产**：保存在 `.praxis/`，是唯一事实来源
- **通用入口**：`AGENTS.md`、`CLAUDE.md`、`openspec/`
- **运行时适配层**：OpenCode、Codex、Claude Code 各自的接入方式

此外，Praxis 还额外区分：

- **CLI 依赖**：`openspec`
- **运行时依赖**：`superpowers`

## 设计原则

1. `.praxis/` 是项目安装态的唯一 canonical source。
2. `.opencode/` 只是兼容投影，不是事实来源。
3. Codex 通过根目录 `AGENTS.md` 接入。
4. Claude Code 通过根目录 `CLAUDE.md` 接入。
5. Agent-specific 逻辑必须保持很薄，统一复用共享核心实现。

## Canonical 项目布局

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
        └── compiled-rules.md
```

各目录职责：

- `AGENTS.md`：项目通用上下文，主要供 Codex 等读取
- `CLAUDE.md`：Claude Code 的项目级记忆入口
- `openspec/`：规范驱动开发的工作区
- `.praxis/stack.md`：当前项目选定技术栈的工具链和元信息
- `.praxis/framework-rules.md`：框架级门控规则的项目镜像
- `.praxis/rules.md`：当前项目技术栈规则
- `.praxis/skills/`：项目安装态的可复用 skills
- `.praxis/manifest.json`：框架版本、已选技术栈、适配目标等元数据
- `.praxis/adapters/compiled-rules.md`：跨 agent 共享的规则编译产物

## 适配策略

### OpenCode

- OpenCode 插件读取框架内置 `skills/`
- 同时读取项目内 `.praxis/skills/`
- `.praxis/skills/` 仍然是 canonical source，`.opencode/skills/` 只是兼容投影
- 注入框架 `RULES.md` 和项目 `.praxis/rules.md`
- 同时可以复用 `.praxis/adapters/compiled-rules.md` 作为统一规则摘要
- `praxis-devos sync --agent opencode` 会生成 `.opencode/` 兼容投影

### Codex

- Codex 读取仓库根目录 `AGENTS.md`
- Praxis 在 `AGENTS.md` 中维护一段受管控区块，指向 `.praxis/` 和 `openspec/`
- 受管控区块会包含项目 skills 摘要，完整索引位于 `.praxis/skills/INDEX.md`
- 如果项目已经存在 `AGENTS.md`，Praxis 只追加或刷新受管控区块，不覆盖人工内容
- `/change` 作为显式提案主入口写入受管控语义；`/proposal` 保留为兼容别名
- 不要求 Codex 使用专属项目目录

### Claude Code

- Claude Code 读取仓库根目录 `CLAUDE.md`
- Praxis 在 `CLAUDE.md` 中维护一段受管控区块，指向 `.praxis/` 和 `openspec/`
- 受管控区块会包含项目 skills 摘要，完整索引位于 `.praxis/skills/INDEX.md`
- 如果项目已经存在 `CLAUDE.md`，Praxis 只追加或刷新受管控区块，不覆盖人工内容
- `/change` 作为显式提案主入口写入受管控语义；`/proposal` 保留为兼容别名
- 不把 canonical project state 放进 Claude 专属目录

## CLI 归属

所有初始化、同步、迁移动作都归属于外部 CLI，而不是某一个插件内部：

```bash
praxis-devos init --stack java-spring
praxis-devos sync --agents opencode,codex,claude
praxis-devos migrate
praxis-devos status
praxis-devos list-stacks
```

插件里保留的 `praxis-init`、`praxis-sync`、`praxis-migrate` 只是共享核心的薄封装，不能再拥有独立逻辑。

## 依赖管理

Praxis 强依赖：

- `openspec`：CLI 依赖
- `superpowers`：agent runtime 依赖

这部分不属于 `.praxis/` 的项目资产，而属于环境能力管理。

相关命令：

```bash
praxis-devos doctor
praxis-devos doctor --strict
praxis-devos bootstrap --openspec
praxis-devos bootstrap --agent opencode
praxis-devos bootstrap --agent codex
praxis-devos bootstrap --agent claude
praxis-devos openspec list --specs
```

详细说明见 [docs/dependency-management.md](../dependency-management.md)。

## 为什么不能只依赖 `.praxis/`

`.praxis/` 解决的是“项目资产统一存放在哪里”的问题，但不能自动解决“各 agent 会不会主动读取这些资产”的问题。

因此架构必须同时满足两点：

1. 有一个跨 agent 的统一事实来源
2. 有每个 agent 可识别的接入入口

Praxis 的设计就是：

- 用 `.praxis/` 统一存放规范层资产
- 用 `AGENTS.md` 和 `CLAUDE.md` 提供通用入口
- 用 `.opencode/` 兼容旧有 OpenCode 运行时

## 托管区与用户区

`AGENTS.md` 和 `CLAUDE.md` 中由 Praxis 写入的内容，统一放在以下受管控标记之间：

```md
<!-- PRAXIS_DEVOS_START -->
...
<!-- PRAXIS_DEVOS_END -->
```

规则如下：

- 标记内内容由 `praxis-devos sync` 自动刷新
- 标记外内容视为用户区，Praxis 不会主动覆盖
- 如果目标文件原本不存在，Praxis 会先创建基础文件，再写入受管控区块

## 规则编译产物

为了避免各 adapter 分别拼接规则文本，Praxis 会在同步时先生成：

```text
.praxis/adapters/compiled-rules.md
```

这个文件是统一的中间产物，包含：

- 运行约定
- 强制执行摘要
- 依赖门禁摘要
- 框架门控规则
- 技术栈 / 项目规则

注意：这里的“强制执行”指的是规范治理和完成前验证，不意味着所有代码变更都必须走 TDD。TDD 在框架层是风险驱动策略，不是全局硬门槛。

随后再分发到：

- OpenCode 的 prompt 注入
- Codex 的 `AGENTS.md` 托管区
- Claude Code 的 `CLAUDE.md` 托管区

## 向后兼容

历史上只有 OpenCode 的项目结构仍然支持迁移：

1. 把 `.opencode/skills/` 拷贝到 `.praxis/skills/`
2. 把 `.opencode/stack.md` 拷贝到 `.praxis/stack.md`
3. 把 `.opencode/stack-rules.md` 拷贝到 `.praxis/rules.md`
4. 生成 `.praxis/manifest.json`
5. 重新同步各 agent 的适配输出

该流程由 `praxis-devos migrate` 实现。
