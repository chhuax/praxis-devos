# OpenSpec 核心规则

编辑 `openspec/` 下文件时自动注入的最小指令集。

> **完整工作流指南**（模板、故障排除、最佳实践）→ 加载 `openspec-workflow` skill。

## TL;DR 快速核查

- 搜索现有工作：`openspec list --specs`，`openspec list`
- 确定范围：新能力 vs 修改现有能力
- 选择唯一 `change-id`：kebab-case，动词开头（`add-`、`update-`、`remove-`、`refactor-`）
- 脚手架：`proposal.md`、`tasks.md`、`design.md`（可选）、spec deltas
- 编写 deltas：`## ADDED|MODIFIED|REMOVED|RENAMED Requirements`
- 每个需求至少一个 `#### Scenario:`
- 验证：`openspec validate [change-id] --strict --no-interactive`
- **请求批准后才开始实现**

---

## 三阶段工作流

### 第一阶段：创建变更

| 级别 | 条件 | 产出物 |
|------|------|--------|
| 完整提案 | 新功能 / API变更 / 架构重构 / 破坏性变更 | `proposal.md` + `tasks.md` + `design.md`(可选) + spec deltas |
| 轻量提案 | 单模块、非破坏性、< 3 文件 | `proposal.md` + spec delta |
| 无需提案 | Bug修复、拼写、格式、配置、测试 | 直接实现 |

### 第二阶段：实施变更

读 `proposal.md` → 读 `design.md`(如有) → 按 `tasks.md` 逐项实现 → 全部完成后标记 `[x]` → 验证

### 第三阶段：归档变更

`openspec archive <change-id> --yes` → 移至 `archive/`，更新 `specs/`

---

## 在任何任务之前

- [ ] `openspec list --specs` — 查看现有规范
- [ ] `openspec list` — 查看活跃变更
- [ ] 阅读 `openspec/project.md` — 了解项目约定
- [ ] 检查 `changes/` — 是否有冲突
- [ ] 能力已存在？→ 优先修改，不要创建重复项

---

## 目录结构

```
openspec/
├── project.md              # 项目约定（使用者填写）
├── specs/                  # 当前真相 — 已构建的内容
│   └── [capability]/
│       ├── spec.md         # 需求和场景
│       └── design.md       # 技术模式
├── changes/                # 活跃提案
│   ├── [change-name]/
│   │   ├── proposal.md     # 为什么 + 做什么
│   │   ├── tasks.md        # 实现清单
│   │   ├── design.md       # 技术决策（可选）
│   │   └── specs/          # Delta 变更
│   └── archive/            # 已归档
└── templates/              # 提案/任务模板
```

---

## 关键格式规则

### Scenario 必须使用 4 级标题

**正确** ✅
```markdown
#### Scenario: 用户登录成功
- **WHEN** 提供有效凭据
- **THEN** 返回 JWT 令牌
```

**错误** ❌
```markdown
- **Scenario: 用户登录**     ← 列表格式
**Scenario**: 用户登录        ← 加粗格式
### Scenario: 用户登录        ← 3级标题
```

### Delta 操作类型

| 操作 | 用途 | 注意 |
|------|------|------|
| `## ADDED Requirements` | 新能力 | 独立的新需求 |
| `## MODIFIED Requirements` | 变更行为 | **必须粘贴完整的更新后需求** |
| `## REMOVED Requirements` | 弃用功能 | 需注明原因和迁移方式 |
| `## RENAMED Requirements` | 名称变更 | `FROM:` → `TO:` 格式 |

### 需求措辞

规范性需求使用 **SHALL / MUST**。避免 should / may（除非有意为非规范性）。

---

## CLI 快速参考

```bash
openspec list                                      # 活跃变更
openspec list --specs                              # 现有规范
openspec show [item]                               # 查看详情
openspec show <spec-id> --type spec                # 查看特定规范
openspec validate [id] --strict --no-interactive   # 验证
openspec archive <id> --yes                        # 归档
openspec show [change] --json --deltas-only        # 调试 delta 解析
```

| 标志 | 作用 |
|------|------|
| `--json` | 机器可读输出 |
| `--strict` | 全面验证 |
| `--no-interactive` | 禁用交互提示 |
| `--skip-specs` | 归档时不更新规范 |
| `--yes` / `-y` | 跳过确认 |

---

> **详细模板、delta 编写指南、故障排除、快乐路径脚本** → 加载 `openspec-workflow` skill。
>
> 记住：**规范即真相 (Specs are truth)。变更是提案 (Changes are proposals)。保持它们同步。**
