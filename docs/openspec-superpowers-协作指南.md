# OpenSpec × Superpowers 协作指南

> 本文档描述 OpenSpec 各阶段与 Superpowers 能力的完整协作关系，
> 包括：每个阶段激活了哪些能力、能力如何嵌入、产物写在哪里、用户看到什么。

---

## 零、为什么需要 OpenSpec

Superpowers 是一套完整的开发流水线——从设计到实现到收尾，每个环节都有能力覆盖，单独使用完全可以保证执行质量。

但 Superpowers 没有"需求层"的治理。`brainstorming` 产出设计文档，`writing-plans` 产出执行计划，这两样东西是非结构化的 markdown，存在 `docs/superpowers/` 里，没有版本、没有状态、没有生命周期：

```
这个 change 的需求是什么？    → 翻 brainstorming 记录
设计决策是什么？              → 翻 design doc
做了哪些任务？                → 翻 plan 文件
现在完成了没有？              → 不知道，自己看
历史上做过哪些 change？       → 翻文件夹，没有索引
```

OpenSpec 解决的是这层问题。**change 是一等公民**——有 id、有状态、有 artifact graph、有生命周期（propose → apply → archive）。CLI 能告诉你哪些 change 在进行、哪些完成了、每个 change 的任务完成了多少。这是项目级的治理能力，不是执行能力。

**一句话区别**：

> Superpowers 是"怎么把一件事做好"，OpenSpec 是"管理正在做的所有事"。

单人短期项目，Superpowers 够用。多 change 并行、需要追踪历史、需要知道"现在项目整体在什么状态"的时候，OpenSpec 的结构就有价值了。两套系统不是替代关系，而是治理层和执行层的分工。

---

## 一、整体架构

OpenSpec 与 Superpowers 是两套层级不同的系统：

```
┌─────────────────────────────────────────────────────────┐
│                   用户可见的流程层                      │
│                                                         │
│   opsx-explore → opsx-propose → opsx-apply → opsx-archive │
│                                                         │
└──────────────────────────┬──────────────────────────────┘
                           │
                    内部方法论层（不对外宣告）
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    Superpowers 能力                     │
│                                                         │
│  brainstorming        │  using-git-worktrees            │
│  writing-plans        │  test-driven-development        │
│  subagent-driven-development  │  executing-plans        │
│  requesting-code-review       │  systematic-debugging   │
│  verification-before-completion  │  finishing-a-development-branch │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**核心原则**：OpenSpec 回答"现在处于哪一步"，Superpowers 回答"这一步怎么做"。

- 任何时刻只有一个对用户可见的主流程（OpenSpec 的某个阶段）
- Superpowers 能力作为**嵌入式方法**在阶段内部运行，不单独宣告，不创建独立文档树
- 产物始终归属当前 change：`openspec/changes/<change>/...`

---

## 二、阶段 × 能力完整映射

### Phase 1 — `opsx-explore`（探索阶段）

**目的**：理解问题空间，澄清需求边界，不做实现决策。

```
opsx-explore
    │
    ├── [触发条件] scope 不清 / open questions 未收敛 / 多方案需比较
    │
    └── brainstorming（内部隐式激活）
            ├── 澄清用户意图和约束
            ├── 比较多个方案并呈现 trade-off
            └── 收敛后写回当前 change 的 proposal.md / design.md
```

**Superpowers 能力**：`brainstorming`

| 属性 | 值 |
|------|----|
| 激活时机 | scope 不清、open questions 存在、多个方案需比较 |
| 调用方式 | 内部隐式，不对外宣告 |
| 产物位置 | `openspec/changes/<name>/proposal.md`、`design.md`、`tasks.md` |
| 禁止行为 | 创建 `docs/superpowers/...`；宣告第二个流程 |

**用户看到什么**：只看到 `opsx-explore` 的输出（分析、图表、对比、问题），不看到 `Using brainstorming`。

---

### Phase 2 — `opsx-propose`（提案阶段）

**目的**：将探索结论固化为完整变更提案，生成 `proposal.md`、`design.md`、`tasks.md`，并在提案完成后做一次 review。

```
opsx-propose
    │
    ├── [入口] 检查当前分支
    │   └── using-git-worktrees（按需，不强制）
    │           ├── 检测到在 main/master 时提示建 worktree
    │           ├── 在任何 artifact 落盘之前建好隔离环境
    │           └── 用户拒绝则继续，artifacts 写入当前分支
    │
    ├── [触发条件] 请求仍模糊 / 关键约束缺失 / 方案存在分歧
    │   └── brainstorming（内部隐式激活）
    │           ├── 收窄 scope
    │           ├── 解决方案分歧
    │           └── 确认关键约束
    │
    ├── [主体] 按 openspec instructions 生成 artifacts
    │   ├── proposal.md（what & why）
    │   ├── design.md（how，含 Docs Impact 段）
    │   └── tasks.md（实现步骤）
    │
    ├── [完成后] 提案 review
    │   └── requesting-code-review（内部隐式激活）
    │           ├── review 对象：proposal.md + design.md + tasks.md
    │           ├── Critical / Important 问题必须修完才能进 apply
    │           └── 目的：在动代码前发现提案缺陷
    │
    └── [产物规范] 所有 artifact 写入 openspec/changes/<name>/
```

**Superpowers 能力**：`brainstorming` + `requesting-code-review`

| 能力 | 激活时机 | 产物位置 | 禁止行为 |
|------|----------|----------|----------|
| `using-git-worktrees` | propose 入口，任何 artifact 落盘前 | feature branch + worktree 路径 | artifact 已落盘后才建 worktree |
| `brainstorming` | 请求模糊或存在方案分歧时 | `openspec/changes/<name>/proposal.md`、`design.md`、`tasks.md` | 创建 `docs/superpowers/...`；宣告第二个流程 |
| `requesting-code-review` | 所有 artifacts 生成完成后 | review 结果在对话中呈现，问题修回 artifacts | 跳过 Critical/Important 问题直接进 apply |

**文档影响追踪（Docs Impact）**：`opsx-propose` 在生成 `design.md` 时会主动写入 `## Docs Impact` 段，标记 `surfaces`、`project-overview`、`module-map` 是否需要刷新，供 `apply` 和 `archive` 阶段读取。

---

### Phase 3 — `opsx-apply`（实现阶段）

**目的**：按 change 任务逐步实现，完成前做整体代码 review 和验证。

这是 Superpowers 能力最密集的阶段，覆盖从 workspace 隔离到任务执行到质量验收的完整链路。

```
opsx-apply
    │
    ├── [前置] 读取 docs 上下文包
    │   ├── docs/surfaces.yaml（必读）
    │   ├── docs/codemaps/project-overview.md（必读）
    │   ├── docs/codemaps/module-map.md（多模块时读）
    │   └── docs/codemaps/modules/<id>.md（可明确路由时读）
    │
    ├── [每条任务执行前] 任务描述高层或模糊时
    │   └── writing-plans（按需，不强制）
    │           ├── 只展开当前这一条任务
    │           ├── 产出具体步骤：精确文件路径、完整代码、验证命令
    │           ├── 展开结果保留在上下文中，展开后立即执行
    │           └── 不写回 tasks.md
    │
    ├── [每条任务执行时] 涉及代码的任务
    │   └── test-driven-development（强制）
    │           ├── 写失败测试 → 看失败 → 写最小实现 → 看通过
    │           └── 禁止在失败测试存在前写生产代码
    │
    ├── [每条任务执行时] 需要上下文隔离或并行时
    │   └── subagent-driven-development（按需）
    │           ├── 派发 implementer subagent 执行任务
    │           ├── 派发 spec-reviewer subagent（两者都过才勾 [x]）
    │           ├── 派发 code-quality-reviewer subagent
    │           ├── 无 subagent 能力时降级为 executing-plans
    │           └── 所有输出归属当前 change
    │
    ├── [遇到问题] bug / 测试失败 / regression / exception
    │   └── systematic-debugging（强制）
    │           ├── 先找根因，禁止在根因确认前提 fix
    │           └── 不改变"当前仍在 apply 阶段"这一事实
    │
    ├── [所有任务完成后] 整体代码 review
    │   └── requesting-code-review（强制）
    │           ├── review 对象：apply 开始到 HEAD 的完整 diff
    │           ├── Critical / Important 问题必须修完才能进 archive
    │           └── 目的：在归档前做整体代码质量把关
    │
    ├── [完成前] docs 刷新评估
    │   ├── 读取 Docs Impact intent
    │   ├── 如需刷新：invoke devos-docs mode=refresh
    │   └── 如延迟：在 change artifacts 中显式记录原因
    │
    ├── [完成前] 验证
    │   └── verification-before-completion（强制）
    │           ├── 运行实际验证命令，获取真实证据
    │           ├── 不允许在未验证前声称"完成"
    │           └── 证据写入 change status，不单独开启完成流程
    │
    └── [完成时] 提示用户
        └── 建议执行 finishing-a-development-branch
                ├── 处理 merge / push+PR / keep / discard
                ├── 清理 worktree
                └── 完成后再由用户决定何时 archive
```

**Superpowers 能力**：7 个

| 能力 | 激活时机 | 强制/按需 | 产物位置 |
|------|----------|-----------|----------|
| `using-git-worktrees` | 入口检测到 main/master | 按需 | worktree 路径，不写入 change |
| `writing-plans` | 任务描述高层或模糊时 | 按需 | 只在上下文中，不写回 `tasks.md` |
| `test-driven-development` | 每条涉及代码的任务 | 强制 | 测试文件和实现文件 |
| `subagent-driven-development` | 需要上下文隔离或并行时 | 按需 | 各子任务输出归属当前 change |
| `executing-plans` | 无 subagent 能力时 | fallback | 同上 |
| `systematic-debugging` | 遇到 bug / 失败 / exception | 强制 | 调试记录写回当前 change |
| `requesting-code-review` | 所有任务完成后 | 强制 | review 结果在对话中呈现 |
| `verification-before-completion` | 声称完成之前 | 强制 | 验证结果写入 change status |

---

### Phase 4 — `opsx-archive`（归档阶段）

**目的**：验证 change 完整性，同步 delta specs，将 change 移入 archive，清理工作区。

```
opsx-archive
    │
    ├── [前置验证] artifacts 是否全部 done
    │   └── verification-before-completion（强制）
    │           ├── 检查 artifacts 完成状态
    │           ├── 检查 tasks.md 中是否有未勾 [ ] 的任务
    │           └── 检查 Docs Impact 是否已满足（刷新或有豁免记录）
    │
    ├── [delta spec 同步] 检查 openspec/changes/<name>/specs/
    │   ├── 比较 delta spec 与 openspec/specs/<capability>/spec.md
    │   ├── 呈现同步差异摘要
    │   └── 用户选择：立即同步 / 跳过同步后归档
    │
    └── [归档] mv changes/<name> → changes/archive/YYYY-MM-DD-<name>
```

**Superpowers 能力**：`verification-before-completion`

| 能力 | 激活时机 | 强制/按需 | 产物位置 |
|------|----------|-----------|----------|
| `verification-before-completion` | 归档前的完整性检查 | 强制 | 验证结果附属于当前 change artifacts |

---

## 三、全量能力分布总览

```
                        explore  propose  apply   archive
─────────────────────────────────────────────────────────
brainstorming             ◐        ◐
using-git-worktrees                ◐
requesting-code-review             ●       ●
writing-plans                              ◐
test-driven-development                    ●
subagent-driven-development                ◐
executing-plans                            ◐
systematic-debugging                       ●
finishing-a-development-branch             ◐
verification-before-completion             ●        ●
─────────────────────────────────────────────────────────

● = 强制：条件满足时必须触发
◐ = 按需：根据上下文判断是否触发
```

**各能力说明**：

- `brainstorming`：explore/propose 阶段澄清需求、收敛方案，结论写回 change artifacts
- `using-git-worktrees`：propose 入口、任何 artifact 落盘前触发，确保整个 change 在 feature branch 上
- `requesting-code-review`：propose 完成后 review 提案，apply 完成后 review 代码，两处都强制
- `writing-plans`：任务模糊时即时展开单条任务，结果只在上下文，不落盘
- `test-driven-development`：所有涉及代码的任务强制走 RED-GREEN-REFACTOR
- `subagent-driven-development`：需要上下文隔离或并行时按需开，内含三段式 review
- `executing-plans`：无 subagent 能力时的 fallback，不单独触发
- `systematic-debugging`：遇到任何 bug/失败强制先找根因
- `finishing-a-development-branch`：apply 完成后由用户决定时机触发，处理 merge/PR 和 worktree 清理，完成后再 archive
- `verification-before-completion`：apply 完成前和 archive 前各一次，强制

---

## 四、嵌入式能力的约束协议

无论哪个阶段，Superpowers 能力以"嵌入模式"运行时，必须遵守以下约束：

```yaml
mode: embedded
owner_flow: opsx-<stage>
visibility: internal

# 产物归属
artifact_targets: openspec/changes/<change>/...

# 禁止行为
must_not:
  - 宣告第二个 workflow（"Using brainstorming..."）
  - 创建 docs/superpowers/... 目录
  - 输出第二个 final recap / wrap-up
  - 新建独立的文档根目录
  - 改变当前 change 归属
  - 跳出当前 OpenSpec 阶段

# 状态传递要求（调用时必须传入）
context_required:
  - 当前主流程类型（owner_flow）
  - 当前 change id
  - 当前阶段目标
  - 当前 artifacts 位置
  - 当前输出约束
```

---

## 五、用户可见性规则

### 每个阶段用户能看到什么

| 阶段 | 用户看到 | 用户不看到 |
|------|----------|------------|
| `opsx-explore` | 分析、ASCII 图、对比、问题 | `Using brainstorming` |
| `opsx-propose` | artifact 创建进度、review 结果摘要 | `Using brainstorming`、`Using requesting-code-review` |
| `opsx-apply` | 任务进度、TDD 执行过程、review 结果、验证证据 | `Using writing-plans`、`Using systematic-debugging`、`Using subagent-driven-development` |
| `opsx-archive` | 完整性检查结果、delta spec 同步选项、归档确认、branch 选项 | `Using verification-before-completion`、`Using finishing-a-development-branch` |

### 合法的开场说明（每轮最多一个）

```text
✓ 当前进入 opsx-apply，change: add-auth-system
✓ 当前在 explore 阶段，先收敛 open questions
✓ Currently in opsx-archive, change: refactor-projection-layer

✗ Using brainstorming to clarify requirements...
✗ I'm using the writing-plans skill to create the implementation plan.
✗ Using verification-before-completion to check...
```

---

## 六、冲突处理规则

当 Superpowers 能力的默认行为与 OpenSpec 约束冲突时，按"保留方法论，移除流程主权"原则降级：

| Superpowers 默认行为 | 在 OpenSpec 内的降级处理 |
|---------------------|--------------------------|
| 宣告 `Using [skill]` | 静默，不宣告 |
| 写入 `docs/superpowers/specs/...` | 写入 `openspec/changes/<change>/...` |
| 输出独立 final recap | 合并入当前阶段输出 |
| 创建独立 worktree workflow | 保留 worktree 操作，移除独立 workflow |
| 开启独立完成流程 | 验证证据并入当前阶段的 status update |
| brainstorming 写设计文档到 `docs/superpowers/specs/` | 写回当前 change artifacts |

---

## 七、阶段门控（Gate）

```
Proposal Gate（进入 apply 前）
  ├── change target 已收敛
  ├── intended behavior 已明确
  ├── scope/risk 已评估
  ├── open questions 已清空
  └── propose review 的 Critical/Important 问题已修完

Apply Gate（进入 apply 前）
  ├── branch 安全性已检查（main/master 上建议先建 worktree）
  └── 所有 applyRequires artifacts 已完成

Execution Gate（apply 执行中）
  ├── 涉及代码的任务必须先有失败测试
  └── 遇到 bug/失败时先做根因分析，不直接 patch

Review Gate（进入 archive 前）
  ├── apply 整体 code review 的 Critical/Important 问题已修完
  └── verification-before-completion 已运行，有真实证据

Archive Gate（归档前）
  ├── 全部 tasks 已完成
  ├── 全部 artifacts 已完成
  ├── Docs Impact 已满足或有豁免记录
  └── worktree 清理已处理（如有）
```

---

## 八、参考文件

| 文件 | 说明 |
|------|------|
| `assets/skills/opsx-explore/SKILL.md` | explore 阶段 skill 定义，含 PRAXIS_DEVOS_OVERLAY |
| `assets/skills/opsx-propose/SKILL.md` | propose 阶段 skill 定义，含提案 review hook |
| `assets/skills/opsx-apply/SKILL.md` | apply 阶段 skill 定义，含完整 Superpowers 能力链 |
| `assets/skills/opsx-archive/SKILL.md` | archive 阶段 skill 定义，含 finishing-a-development-branch hook |
| `src/templates/managed-entry.md` | 注入用户项目的 AGENTS.md 条款，含 Stage Gates |
| `openspec/config.yaml` | artifact 语言策略（本项目：zh-CN） |
| `docs/OpenSpec与Superpowers协调协议.md` | 协调协议（规则优先级、冲突处理） |

---

> 最后更新：2026-04-11（接入完整 Superpowers 能力链：using-git-worktrees、test-driven-development、requesting-code-review、finishing-a-development-branch、executing-plans）
