---
name: openspec-workflow
description: |
  OpenSpec 规范驱动开发工作流。用于创建变更提案、检查现有规范、实现已批准的变更或归档已完成的工作。
  确保规范先行的开发模式。
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

指导 AI 代理完成 OpenSpec 规范驱动开发工作流：
1. 实现前检查现有规范
2. 为重大变更创建提案
3. 系统性地实现已批准的提案
4. 归档已完成的变更

## 何时使用此技能

- 开始新功能实现
- 对 API 或数据模型进行破坏性变更
- 引入新的架构模式
- 检查当前工作是否有对应规范
- 创建或应用变更提案

---

## 快速参考

### 基本命令

```bash
openspec list                    # 显示活跃的变更
openspec list --specs            # 显示现有规范
openspec show <id>               # 查看变更或规范详情
openspec validate <id> --strict  # 验证提案
openspec archive <id> --yes      # 归档已完成的变更
```

### 斜杠命令

| 命令 | 用途 |
|------|------|
| `/openspec:proposal` | 创建新的变更提案 |
| `/openspec:apply` | 实现已批准的提案 |
| `/openspec:archive` | 归档已完成的变更 |

---

## 实现前检查清单

在编写任何非平凡代码之前：

1. **检查现有规范**
   ```bash
   openspec list --specs
   ```
   如果存在相关规范，先阅读。

2. **检查活跃变更**
   ```bash
   openspec list
   ```
   避免与进行中的提案冲突。

3. **决定：是否需要提案？**
   - 完整提案：新功能、破坏性变更、架构调整
   - 轻量提案：单模块、非破坏性、影响 < 3 个文件
   - 无需提案：bug 修复、拼写错误、配置变更、添加测试

---

## 创建提案

### 提案分级

```
判断提案级别
├─ 新增功能 / API变更 / 架构重构 / 破坏性变更？
│   └─ 【完整提案】
├─ 单模块、非破坏性、影响 < 3 个文件？
│   └─ 【轻量提案】
└─ 不确定？
    └─ 按完整提案处理
```

### 完整提案

#### 目录结构

```
openspec/changes/<变更ID>/
├── proposal.md          # 为什么以及变更什么
├── tasks.md             # 实现任务清单
├── design.md            # 技术决策（可选）
└── specs/
    └── <能力名>/
        └── spec.md      # 增量需求
```

### 变更 ID 命名

- 使用 kebab-case：`add-user-auth`、`update-api-response`
- 动词前缀：`add-`、`update-`、`remove-`、`refactor-`
- 保持简短且有描述性

### proposal.md 模板

```markdown
# 变更：[简要描述]

## 为什么
[1-2 句话说明问题/机会]

## 变更内容
- [变更列表]
- [破坏性变更标记 **破坏性**]

## 影响范围
- 受影响的规范：[能力列表]
- 受影响的代码：[关键文件/系统]
```

### tasks.md 模板

```markdown
## 1. 实现任务
- [ ] 1.1 [第一个任务]
- [ ] 1.2 [第二个任务]
- [ ] 1.3 [第三个任务]
```

### 规范增量格式

```markdown
## 新增需求
### 需求：[名称]
[使用"必须"/"应该"描述需求]

#### 场景：[成功场景]
- **当** [条件]
- **则** [预期结果]

## 修改需求
### 需求：[现有名称]
[完整的更新后需求]

## 删除需求
### 需求：[旧名称]
**原因**：[删除原因]
```

### 轻量提案

适用于小范围、非破坏性的变更（如：给现有 API 加一个可选参数、调整 Service 内部逻辑、新增简单查询接口）。

#### 目录结构（精简）

```
openspec/changes/<变更ID>/
├── proposal.md          # 为什么 + 变更内容（3-5 行即可）
└── specs/
    └── <能力名>/
        └── spec.md      # 增量需求
```

#### 与完整提案的区别

| | 完整提案 | 轻量提案 |
|---|---|---|
| proposal.md | 详细动机、影响范围 | 3-5 行说清即可 |
| tasks.md | 必须 | 不需要（用 todowrite 追踪） |
| design.md | 可选 | 不需要 |
| spec delta | 必须 | 必须 |
| validate | 必须 | 必须 |

#### 步骤

1. `openspec list` + `openspec list --specs` 确认无冲突
2. 创建 `change-id`，写 `proposal.md`（简化版）
3. 编写 spec delta，至少一个 `#### 场景：`
4. `openspec validate <id> --strict --no-interactive`
5. 直接进入实现，用 AI 代理的 todowrite 追踪进度

---

## 实现提案

### 工作流程

1. **阅读 proposal.md** - 理解变更内容
2. **阅读 design.md**（如果存在）- 审查技术决策
3. **阅读 tasks.md** - 获取实现任务清单
4. **准备工作区**（可选）- 如需隔离，加载 `using-git-worktrees` skill 创建独立工作区
5. **生成实现计划**（多步骤任务）- 加载 `writing-plans` skill 生成详细实现计划
6. **按顺序实现** - 依次完成任务
   - **强制 TDD**：加载 `test-driven-development` skill，遵循 RED-GREEN-REFACTOR 流程
   - **并行执行**（多个独立子任务时）：加载 `subagent-driven-development` skill
   - **遇到 bug / 测试失败**：加载 `systematic-debugging` skill 系统化排查
7. **标记任务完成** - 完成后更新复选框
8. **对照规范验证** - 确保实现符合需求
9. **完成前验证** - 加载 `verification-before-completion` skill 执行系统化验收
10. **收尾** - 加载 `finishing-a-development-branch` skill 决定合并/PR 策略

### 任务跟踪

工作时更新 tasks.md：
```markdown
- [x] 1.1 已完成的任务
- [ ] 1.2 当前任务  ← 正在处理
- [ ] 1.3 待处理任务
```

---

## 验证

### 请求批准前

```bash
openspec validate <变更ID> --strict --no-interactive
```

### 常见验证错误

| 错误 | 修复方法 |
|------|----------|
| "必须至少有一个增量" | 在 `specs/` 下添加规范文件 |
| "必须至少有一个场景" | 为需求添加 `#### 场景：` |
| "场景格式无效" | 使用 `#### 场景：名称` 格式 |

### 验证错误排查指南

| 错误类型 | 排查与解决方法 |
|----------|----------------|
| **proposal.md 格式不正确** | 检查文件中是否包含必须的二级标题：`## 动机`（或 `## 为什么`）、`## 变更内容`、`## 影响范围`。 |
| **spec delta 缺少场景** | 每个 Requirement 必须至少包含一个 `#### 场景：`。请注意必须使用 4 级标题（四个 #）。 |
| **change-id 命名不规范** | 必须使用 kebab-case（短横线隔开），且建议以动词开头（如 `add-`、`update-`、`fix-`）。 |
| **validate 命令找不到变更** | 检查你的提案目录是否位于 `openspec/changes/<change-id>/` 路径下。 |

---

## 归档

实现部署后：

```bash
openspec archive <变更ID> --yes
```

这会将变更移动到 `changes/archive/YYYY-MM-DD-<变更ID>/`。

---

## 高级参考

### Delta 操作详解

#### ADDED vs MODIFIED 选择

- **ADDED**: 引入可以作为独立需求存在的新能力或子能力。当变更是正交的（如添加"斜杠命令配置"）而非更改现有需求语义时，优先用 ADDED。
- **MODIFIED**: 更改现有需求的行为、范围或验收标准。归档器会用此处内容**替换整个需求**——必须粘贴完整的更新后需求（标题 + 所有场景）。部分 delta 将丢弃之前的详细信息。
- **RENAMED**: 仅名称更改时使用。如果同时更改行为，需要 RENAMED（名称）+ MODIFIED（内容引用新名称）。

**常见陷阱**: 用 MODIFIED 添加新关注点但不包含之前的文本 → 归档时丢失原有细节。如果没有修改现有需求，应该用 ADDED 添加新需求。

#### 正确编写 MODIFIED 需求

1. 在 `openspec/specs/<capability>/spec.md` 中找到现有需求
2. 复制整个需求块（从 `### Requirement:` 到最后一个场景）
3. 粘贴在 `## MODIFIED Requirements` 下并编辑
4. 确保标题文本完全匹配（不区分空格），保留至少一个 `#### Scenario:`

#### RENAMED 示例

```markdown
## RENAMED Requirements
- FROM: `### Requirement: Login`
- TO: `### Requirement: User Authentication`
```

### design.md 指南

#### 何时创建

满足以下任一条件时创建 `design.md`，否则省略：
- 跨领域变更（多个服务/模块）或新的架构模式
- 新的外部依赖项或重大数据模型更改
- 安全性、性能或迁移复杂性
- 编码前需要确定技术决策

#### 模板

```markdown
## 上下文
[背景，约束]

## 目标 / 非目标
- 目标: [...]
- 非目标: [...]

## 决策
- 决策: [内容及原因]
- 考虑的备选方案: [选项 + 排除理由]

## 风险 / 权衡
- [风险] → 缓解措施

## 迁移计划
[步骤，回滚策略]

## 开放问题
- [...]
```

### 快乐路径脚本

```bash
# 1) 探索当前状态
openspec spec list --long
openspec list

# 2) 搭建脚手架
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/specs/auth

# 创建 proposal.md
cat > openspec/changes/$CHANGE/proposal.md << 'EOF'
# 变更：添加双重身份验证

## 为什么
用户账户安全需要第二层验证。

## 变更内容
- 添加 OTP 验证流程
- 登录时要求二次验证

## 影响范围
- 受影响的规范：auth
- 受影响的代码：AuthController, LoginService
EOF

# 创建 tasks.md
cat > openspec/changes/$CHANGE/tasks.md << 'EOF'
## 1. 实现
- [ ] 1.1 添加 OTP 生成逻辑
- [ ] 1.2 实现验证端点
- [ ] 1.3 更新登录流程
- [ ] 1.4 编写测试
EOF

# 创建 spec delta
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: 双重身份验证
用户 MUST 在登录期间提供第二个因素。

#### Scenario: 需要 OTP
- **WHEN** 提供了有效的凭据
- **THEN** 系统发起 OTP 挑战
EOF

# 3) 验证
openspec validate $CHANGE --strict --no-interactive
```

### 多能力变更示例

当一个变更影响多个能力时，在 `specs/` 下创建多个子目录：

```
openspec/changes/add-2fa-notify/
├── proposal.md
├── tasks.md
└── specs/
    ├── auth/
    │   └── spec.md        # ADDED: Two-Factor Authentication
    └── notifications/
        └── spec.md        # ADDED: OTP email notification
```

每个 `spec.md` 独立定义该能力的增量需求。

### 错误恢复

| 场景 | 处理方式 |
|------|---------|
| **变更冲突** | `openspec list` 查看活跃变更 → 检查重叠 specs → 与变更所有者协调或合并提案 |
| **验证失败** | 用 `--strict` 运行 → `openspec show [change] --json --deltas-only` 调试 → 检查 scenario 格式 |
| **缺失上下文** | 先读 `project.md` → 检查相关 specs → 查看 `archive/` 中最近归档 → 寻求澄清 |
| **静默场景解析失败** | 确认 `#### Scenario: Name` 精确格式 → 用 `--json` 输出检查 delta 解析结果 |
| **delta 解析调试** | `openspec show [change] --json \| jq '.deltas'` 或 `openspec show [spec] --json -r 1` |

---

## 决策树

```
新请求？
├─ Bug 修复恢复规范行为？ → 直接修复
├─ 拼写/格式/注释？ → 直接修复
├─ 新功能/能力？ → 完整提案
├─ 破坏性变更？ → 完整提案
├─ 架构变更？ → 完整提案
├─ 单模块、非破坏性、< 3 文件？ → 轻量提案
└─ 不确定？ → 完整提案（更安全）
```

---

## 最佳实践

### 应该做
- 实现前检查规范
- 为重大变更创建提案
- 请求批准前验证
- 完成任务后立即标记
- 验证实现符合规范

### 不应该做
- 跳过"快速"功能的规范检查
- 未经批准就实现提案
- 完成后不标记任务
- 部署前归档

---

## 相关文件

- `openspec/AGENTS.md` — OpenSpec 核心规则（编辑 openspec/ 文件时自动加载，精简版）
- `openspec/project.md` — 项目上下文（使用者填写）
- `openspec/specs/` — 当前规范（已构建的内容）
- `openspec/changes/` — 活跃提案
- `openspec/templates/` — 提案/任务模板
