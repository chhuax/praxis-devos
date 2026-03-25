# Praxis 命令场景模型

## 目标

把 Praxis DevOS 的命令面从“暴露内部实现细节”收敛成“按用户场景给出最少命令”。

核心原则：

- 用户优先记 `setup`，而不是先理解 `bootstrap` / `init`
- `init` 负责项目骨架，`use-stack` 负责技术栈安装
- `bootstrap` 保留为高级 / 修复命令，不再作为 Quick Start 主入口
- README 第一屏按场景给命令，不按内部依赖分层给命令

## 用户可见命令

### 主入口

```bash
npx praxis-devos setup [--agent <name> | --agents a,b,c] [--stack <name>]
```

用途：

- 全新项目第一次接入
- 已初始化项目在新电脑上接入
- 给已有项目补一个新 agent
- 修复缺失的 OpenSpec / SuperPowers 依赖

语义：

- `setup` 始终是用户主入口
- 内部由 `setup` 判断要不要执行 `init`
- 如果带 `--stack`，则在基础框架 ready 后应用 stack

### 栈选择

```bash
npx praxis-devos use-stack <name>
```

用途：

- 初始化后再选择 stack
- 明确把“框架初始化”和“stack 应用”拆成两个阶段

### 检查与状态

```bash
npx praxis-devos doctor [--strict]
npx praxis-devos status
```

用途：

- `doctor`：检查当前机器是否真的能在这个项目里工作
- `status`：查看当前项目初始化态、stack、agents、依赖状态

### 提案与迁移

```bash
npx praxis-devos change ...
npx praxis-devos proposal ...
npx praxis-devos migrate
```

## 内部命令关系

### `setup` 与 `init`

关系不是 `init` 包含 `setup`，而是：

- `setup` 是用户入口
- `init` 是内部步骤 / 高级命令
- `setup` 在需要时调用 `init`

也就是：

```text
setup > init
```

### `bootstrap`

`bootstrap` 不再作为 Quick Start 主路径，而保留为：

- 高级拆分命令
- 依赖修复 / 调试入口
- 文档中用于解释 OpenSpec 和 SuperPowers 的底层引导方式

## 场景与命令

### 1. 全新项目，Codex + Java Spring，一次接入

```bash
npx praxis-devos setup --agent codex --stack java-spring
npx praxis-devos doctor --strict
```

### 2. 全新项目，先只把框架搭起来，不选 stack

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

后续再选 stack：

```bash
npx praxis-devos use-stack java-spring
npx praxis-devos doctor --strict
```

### 3. 已初始化项目，新电脑第一次接入

```bash
npx praxis-devos setup --agent codex
npx praxis-devos doctor --strict
```

说明：

- 这种场景不应该要求用户重新思考要不要 `init`
- `setup` 内部自己判断项目骨架是否已存在

### 4. 已有项目，后续补一个 agent

```bash
npx praxis-devos setup --agent claude
npx praxis-devos doctor --strict
```

### 5. 多 agent 项目，一次接入

```bash
npx praxis-devos setup --agents opencode,codex,claude --stack java-spring
npx praxis-devos doctor --strict
```

### 6. 依赖缺失修复

```bash
npx praxis-devos doctor --strict
npx praxis-devos setup --agent codex
```

## 兼容策略

- `init --stack ...` 继续兼容，但不再作为 README 主路径
- `bootstrap` 继续保留，但从“用户主入口”降级为“高级 / 修复命令”
- `--openspec` 已移除；`bootstrap` 默认始终包含 OpenSpec

## 实施顺序

1. 新增 `setup`
2. 新增 `use-stack`
3. 把 `init` 改成可无 stack 初始化
4. 重写 README Quick Start 为场景式说明
5. 让 `doctor` 优先推荐 `setup`
