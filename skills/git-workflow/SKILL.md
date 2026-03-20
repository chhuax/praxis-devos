---
name: git-workflow
description: |
  Git 工作流管理。用于创建分支、提交代码、代码审查、合并分支等 Git 操作。
  强制执行分支命名规范、提交消息标准和预提交检查。
triggers:
  - Git
  - 分支
  - 提交
  - 合并
  - PR
  - Pull Request
  - rebase
  - cherry-pick
  - 冲突解决
---

# Git 工作流技能

## 目的

管理团队协作中的 Git 操作，建立标准化规范：
1. 分支命名规范 (feature/, bugfix/, hotfix/)
2. 提交消息标准 (Conventional Commits)
3. 预提交验证检查
4. 合并与 PR 工作流

## 何时使用此技能

- 创建 feature/bugfix/hotfix 分支
- 编写规范的提交消息
- 执行预提交检查
- 合并分支
- 管理 Pull Request
- 解决冲突

---

## 分支命名规范

### 长期分支（永久存在）

| 分支                      | 环境                | 用途               |
| ------------------------- | ------------------- | ------------------ |
| **develop**               | 测试环境 + 日常环境 | 日常开发主分支     |
| **release**               | 预发布环境          | 准备发布的预发分支 |
| **hotfix/迭代版本号-fix** | 公有云生产环境      | 线上版本分支       |
| **onpremise-***           | 专属化生产环境      | 私有化部署版本     |

### 临时分支（MR 后自动删除）

| 分支类型   | 模式                                  | 切出源                | 合并目标   | 用途     |
| ---------- | ------------------------------------- | --------------------- | ---------- | -------- |
| feature    | `feature/{YYYYMMDD}/{故事ID}`         | develop               | develop    | 功能开发 |
| bugfix     | `bugfix/{YYYYMMDD}/{源分支}/{bugid}`  | develop 或 release    | 源分支     | Bug 修复 |
| hotfix-bug | `hotfix/{YYYYMMDD}/{bugid}`           | hotfix/YYYYMMDD-fix   | 源 hotfix  | 生产修复 |

### 示例

```bash
# 功能分支
feature/20260106/STORY-123

# Bug 修复分支（从 develop）
bugfix/20260106/develop/BUG-456

# Bug 修复分支（从 release）
bugfix/20260106/release/BUG-789

# 生产紧急修复分支
hotfix/20260106/BUG-111
```

### 创建分支

```bash
# 功能分支（从 develop）
git checkout develop
git pull origin develop
git checkout -b feature/20260106/STORY-123

# Bug 修复分支（从 develop）
git checkout develop
git pull origin develop
git checkout -b bugfix/20260106/develop/BUG-456

# Bug 修复分支（从 release）
git checkout release
git pull origin release
git checkout -b bugfix/20260106/release/BUG-789

# 生产紧急修复分支（从 hotfix）
git checkout hotfix/20260106-fix
git pull origin hotfix/20260106-fix
git checkout -b hotfix/20260106/BUG-111
```

---

## 提交消息标准

### 格式 (Conventional Commits)

```
{type}({scope}): {subject}

{body}

{footer}
```

### 提交类型

| 类型     | 说明         | 示例                                      |
| -------- | ------------ | ----------------------------------------- |
| feat     | 新功能       | `feat(auth): add JWT authentication`      |
| fix      | Bug 修复     | `fix(login): resolve session timeout`     |
| docs     | 文档         | `docs(readme): update installation guide` |
| style    | 代码格式     | `style(api): fix indentation`             |
| refactor | 代码重构     | `refactor(user): simplify validation`     |
| test     | 测试         | `test(auth): add login unit tests`        |
| chore    | 构建/工具    | `chore(deps): update dependencies`        |
| perf     | 性能优化     | `perf(query): optimize user lookup`       |

### 示例

```bash
# 简单提交
git commit -m "feat(auth): add password reset functionality"

# 带正文的提交
git commit -m "fix(api): resolve rate limiting issue

The rate limiter was not properly resetting after the window expired.
This caused legitimate requests to be blocked.

Task: TASK-123"

# 破坏性变更
git commit -m "feat(api): change response format

BREAKING CHANGE: API responses now use camelCase instead of snake_case.
All clients need to update their parsers.

Task: TASK-456"
```

---

## 预提交检查

### 检查清单

提交前验证：

- [ ] 所有变更已暂存
- [ ] 分支名称符合规范
- [ ] 代码中无冲突标记
- [ ] 本地测试通过
- [ ] Lint 检查通过

### 通用命令

```bash
# 检查状态
git status

# 检查冲突标记
git diff --check

# 暂存所有变更
git add .

# 暂存特定文件
git add path/to/file
```

### 技术栈特定命令

> 以下命令取决于项目使用的技术栈。
> 当前栈通过 `openspec/project.md` 中的 `<!-- praxis-devos:stack = {栈名} -->` 标记识别。
> 请参考 `stacks/{当前栈}/stack.md` 中的 `commands` 定义。

| 操作 | 说明 |
|------|------|
| `{commands.lint}` | 代码风格检查 |
| `{commands.test}` | 运行测试 |
| `{commands.build}` | 构建项目 |
| `{commands.verify}` | 完整验证（构建+测试） |

---

## 合并工作流

### 合并前检查

```bash
# 更新目标分支
git checkout develop
git pull origin develop

# 切回功能分支并 rebase
git checkout feature/20260106/STORY-123
git rebase develop

# 解决冲突（如有）
# 编辑冲突文件
git add .
git rebase --continue
```

### 合并策略

| 策略 | 命令 | 适用场景 |
|------|------|---------|
| Squash merge | `git merge --squash feature/xxx` | MR 自动 Squash，一个 feature 一次 MR |
| Merge commit | `git merge --no-ff hotfix/xxx` | 保留 hotfix 完整历史 |
| Rebase | `git rebase develop` | 线性历史 |

### 合并后清理

```bash
# 删除本地分支
git branch -d feature/20260106/STORY-123

# 删除远程分支
git push origin --delete feature/20260106/STORY-123
```

---

## 冲突解决

### 步骤

1. 识别冲突文件：`git status`
2. 打开冲突文件，查找 `<<<<<<<` 标记
3. 选择正确的代码（或合并两者）
4. 删除冲突标记
5. 暂存已解决的文件：`git add <file>`
6. 继续操作：`git rebase --continue` 或 `git merge --continue`

### 冲突标记格式

```
<<<<<<< HEAD
当前分支的代码
=======
传入分支的代码
>>>>>>> feature/xxx
```

---

- **MR 控制**：一个 feature 一次 MR，自动 Squash 提交
- **分支生命周期**：临时分支（feature/bugfix/hotfix-bug）MR 合并后自动删除
- **版本命名**：迭代版本号格式为 YYYYMMDD（如 `feature/20260106/STORY-123`、`hotfix/20260106-fix`）
- **迭代切换点**：develop 推送到 release 后，更新 develop 版本号，标志新迭代开始

---

## 核心规则

### ✅ 应该做

- 频繁提交，保持提交粒度小
- 提交消息清晰描述变更内容
- 合并前先 rebase 目标分支
- 使用 `--no-ff` 保留合并历史
- 合并后删除已完成的分支

### ❌ 不应该做

- 直接在 main/develop 上提交
- 提交消息含糊不清（如 "fix bug"、"update"）
- 提交包含调试代码或临时文件
- 强制推送到共享分支 (`git push -f`)
- 忽略冲突标记

---

## 相关文件

- `.gitignore` — Git 忽略规则
- `.pre-commit-config.yaml` — 预提交钩子配置（如已配置）
- `openspec/project.md` — 技术栈声明（`<!-- praxis-devos:stack = {栈名} -->` 标记）
- `stacks/{当前栈}/stack.md` — 技术栈特定的构建/测试/lint 命令

---

**技能状态**: 完成
