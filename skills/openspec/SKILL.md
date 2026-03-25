---
name: openspec
description: |
  OpenSpec 规范驱动开发工作流。用于检查现有规范、创建变更提案、验证提案和归档已完成的变更。
  所有 OpenSpec 命令统一通过 praxis-devos wrapper 调用。
triggers:
  - 提案
  - proposal
  - 规范
  - spec
  - 变更
  - change
  - 归档
  - archive
  - openspec
---

# OpenSpec 工作流技能

## 目的

在多 agent 环境下，为 AI 代理提供一致的 OpenSpec 操作流程：

1. 实现前核查现有规范与活跃变更
2. 按变更风险选择完整提案、轻量提案或直接实现
3. 在实现前验证提案，在完成后归档变更

> `openspec/AGENTS.md` 是最小规则集；本技能提供更完整的执行步骤、判断标准和故障排查。

## 核心原则

- `/change` 是显式提案主入口，`/proposal` 是兼容别名
- 这两个入口表示“进入提案通道”，不是“直接开始实现”
- 进入提案通道后，MUST 显式加载本 `openspec` skill，而不是只依赖 `openspec/AGENTS.md` 的最小规则文本
- 所有 OpenSpec 命令统一使用 `praxis-devos openspec ...`
- 不要直接调用裸 `openspec ...`
- 提案是否需要，按变更风险判断
- 框架层强制的是规范治理、关键管控 skill 加载和完成前验证；技术栈 skill 继续按需加载，不强制所有代码改动都走 TDD

## 快速参考

```bash
praxis-devos change --title "Add two factor auth" --capability auth
praxis-devos openspec list
praxis-devos openspec list --specs
praxis-devos openspec show <id>
praxis-devos openspec validate <id> --strict --no-interactive
praxis-devos openspec archive <id> --yes
```

## 使用步骤

### Slash 入口语义

当用户输入 `/change ...` 或 `/proposal ...` 时：

1. 立即切换到提案模式
2. 禁止直接进入实现
3. 如果需求不明确，先加载 `brainstorming`
4. 如果需求明确，可直接运行 `praxis-devos change --title ... --capability ...`
5. 或手工创建 proposal / spec delta
6. 提案获批后，才进入实现和 Git 分支阶段；若当前已在该 change 的专用实现分支，可继续复用，否则再创建 / 切换

### 1. 实现前先核查

在编写任何非平凡代码之前，按顺序执行：

1. `praxis-devos openspec list --specs`
2. `praxis-devos openspec list`
3. 阅读 `openspec/project.md`
4. 如已有相关规范，优先修改现有能力，不要创建重复能力

### 2. 判断是否需要提案

```
判断提案级别
├─ 新增功能 / API变更 / 架构重构 / 破坏性变更？
│   └─ 【完整提案】
├─ 单模块、非破坏性、影响 < 3 个文件？
│   └─ 【轻量提案】
├─ Bug修复 / 拼写 / 格式 / 注释 / 非破坏性配置？
│   └─ 【直接实现】
└─ 不确定？
    └─ 按完整提案处理
```

### 3. 创建提案

#### 完整提案

适用于新功能、API 变更、架构调整、破坏性变更。

目录结构：

```text
openspec/changes/<change-id>/
├── proposal.md
├── tasks.md
├── design.md          # 可选
└── specs/
    └── <capability>/
        └── spec.md
```

#### 轻量提案

适用于小范围、非破坏性的单模块改动。

目录结构：

```text
openspec/changes/<change-id>/
├── proposal.md
└── specs/
    └── <capability>/
        └── spec.md
```

#### 变更 ID 规则

- 使用 `kebab-case`
- 以动词开头：`add-`、`update-`、`remove-`、`refactor-`
- 示例：`add-two-factor-auth`

### 4. 编写 spec delta

仅使用标准 delta 操作：

- `## ADDED Requirements`
- `## MODIFIED Requirements`
- `## REMOVED Requirements`
- `## RENAMED Requirements`

每个需求至少包含一个 `#### Scenario:`。

正确示例：

```markdown
## ADDED Requirements
### Requirement: 双重身份验证
用户 MUST 在登录期间提供第二个因素。

#### Scenario: 需要 OTP
- **WHEN** 提供了有效的凭据
- **THEN** 系统发起 OTP 挑战
```

编写 `MODIFIED` 时，必须粘贴完整的更新后需求，不能只写局部差异。

### 5. 实现提案

建议顺序：

1. 阅读 `proposal.md`
2. 阅读 `design.md`（如有）
3. 如提案已批准并准备实现，先检查当前 Git 分支；若已在该 change 的专用实现分支，可直接继续，否则加载 `git-workflow` 并创建实现分支
4. 如存在 `tasks.md`，按任务顺序实施
5. 多步骤任务可加载 `writing-plans`
6. Bug 或测试失败时加载 `systematic-debugging`
7. 多个独立子任务可加载 `subagent-driven-development`

提案创建本身不强制立刻创建 Git 分支；更合理的边界是“提案批准后、开始实现前”再开分支。若用户已经在与当前 change 对应的专用实现分支，则 SHOULD 直接复用该分支，而不是重复切分支。分支名 SHOULD 优先复用 `change-id`，例如 `feature/add-two-factor-auth`。

测试策略按风险选择：

- 低风险：可直接实现，做最小必要验证
- 中风险：补充或更新测试，是否采用 TDD 由收益决定
- 高风险：优先使用 `test-driven-development`，或至少先构造失败用例/复现步骤

无论是否采用 TDD，完成前都必须执行 `verification-before-completion`。

### 6. 验证

请求批准前或准备进入实现前，执行：

```bash
praxis-devos openspec validate <change-id> --strict --no-interactive
```

常见错误：

| 错误 | 修复方法 |
|------|----------|
| 缺少 delta | 在 `specs/` 下补充规范文件 |
| 缺少场景 | 为每个 Requirement 添加 `#### Scenario:` |
| change-id 无效 | 改为 kebab-case，并使用动词前缀 |
| 找不到变更 | 检查目录是否位于 `openspec/changes/<change-id>/` |

需要排查 delta 解析时：

```bash
praxis-devos openspec show <change-id> --json --deltas-only
```

### 7. 归档

实现完成并部署后，执行：

```bash
praxis-devos openspec archive <change-id> --yes
```

归档通常应发生在代码已经合并之后，而不是提案刚写完或 PR 尚未合并时。

## 最佳实践

### 应该做

- 实现前先看规范和活跃变更
- 变更较大时先提案再实现
- 提案验证通过后再进入实现
- 完成后及时更新 `tasks.md`
- 用规范和场景反向核对实现

### 不应该做

- 跳过规范检查直接开工
- 未获批准就实现提案
- 用裸 `openspec ...` 命令绕过 Praxis wrapper
- 把 TDD 当成所有场景的唯一流程
- 未验证就归档

## 相关文件

- `openspec/AGENTS.md`：最小规则集
- `openspec/project.md`：项目特有约定
- `openspec/specs/`：当前规范真相
- `openspec/changes/`：活跃提案
- `openspec/templates/`：模板文件
