---
name: git-workflow
description: |
  通用 Git 工作流技能。用于管理分支生命周期、规范化提交消息、执行合并与冲突解决。
  支持 GitHub Flow 和 Git Flow 两种经典模式，强制执行 Conventional Commits 标准。
triggers:
  - git
  - branch
  - commit
  - merge
  - pr
  - pull request
  - rebase
  - cherry-pick
  - conflict
  - 分支
  - 提交
  - 合并
  - 冲突
---

# Git 工作流技能

## 目的

为团队提供通用的 Git 协作规范，确保代码历史清晰、分支管理有序：
1. **规范化分支命名**：区分功能、修复与发布。
2. **标准化提交消息**：采用 Conventional Commits，便于自动生成变更日志。
3. **确定性合并策略**：根据场景选择 Squash 或 Merge。
4. **安全预提交检查**：减少集成失败风险。

## 何时使用此技能

- 初始化项目 Git 结构或选择工作流模式。
- 创建 `feature/`、`bugfix/`、`hotfix/` 或 `release/` 分支。
- 编写代码提交消息时（强制）。
- 准备合并代码或发起 Pull Request (PR) / Merge Request (MR)。
- 解决代码冲突。

---

## 分支模式选择

项目应在以下两种模式中择一使用。

### 1. GitHub Flow (简单模式)
适用于持续交付、单主干开发的团队。

- **main**: 始终保持可部署状态的主分支。
- **feature/**: 从 `main` 切出，开发完成后合并回 `main` 并删除。

### 2. Git Flow (标准模式)
适用于有固定发布周期、需要维护多个版本的团队。

- **main**: 存放生产环境代码。
- **develop**: 日常开发集成分支。
- **feature/**: 从 `develop` 切出，合并回 `develop`。
- **release/**: 从 `develop` 切出，进行发布前最后修整，完成后同时合并回 `main` 和 `develop`。
- **hotfix/**: 从 `main` 切出，修复紧急生产问题，完成后同时合并回 `main` 和 `develop`。

---

## 分支命名规范

| 分支类型 | 模式 (建议) | 起始分支 | 合并目标 | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| **feature** | `feature/{issue-id}-{description}` | `main` / `develop` | 起始分支 | 新功能开发 |
| **bugfix** | `bugfix/{issue-id}-{description}` | `main` / `develop` | 起始分支 | 普通 Bug 修复 |
| **hotfix** | `hotfix/{version}-fix` | `main` | `main` & `develop` | 生产紧急修复 |
| **release** | `release/{version}` | `develop` | `main` & `develop` | 发布预备分支 |

### 示例
```bash
feature/123-add-login-api
bugfix/456-fix-header-style
hotfix/v1.0.1-fix
release/v1.1.0
```

---

## 提交消息标准 (Conventional Commits)

### 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 提交类型 (Type)

| 类型 | 说明 | 示例 |
| :--- | :--- | :--- |
| **feat** | 新功能 | `feat(auth): 增加 JWT 认证支持` |
| **fix** | Bug 修复 | `fix(db): 修复连接池泄漏问题` |
| **docs** | 仅文档变更 | `docs(readme): 完善安装指南` |
| **style** | 代码格式（不影响逻辑） | `style(ui): 统一缩进为 2 空格` |
| **refactor** | 代码重构（既非功能也非修复） | `refactor(user): 简化权限验证逻辑` |
| **perf** | 性能优化 | `perf(search): 优化索引查询速度` |
| **test** | 增加或修改测试 | `test(api): 补充登录接口单元测试` |
| **chore** | 构建过程或辅助工具的变动 | `chore(deps): 升级 spring-boot 版本` |

### 示例
```bash
# 简单提交
git commit -m "feat(api): 增加用户注册接口"

# 包含正文和破坏性变更的提交
git commit -m "feat(api): 重构响应格式

BREAKING CHANGE: 所有接口返回字段由 snake_case 改为 camelCase。

Closes #123"
```

---

## 预提交检查清单

在执行 `git commit` 或推送 PR 前，必须确保：

- [ ] **变更完整**：所有相关修改已通过 `git add` 暂存。
- [ ] **分支正确**：当前所在分支符合命名规范，且是预期的开发分支。
- [ ] **无冲突标记**：代码中不存在 `<<<<<<< HEAD` 等残留标记。
- [ ] **本地验证通过**：
  - 运行 Lint 检查（如 `npm run lint` / `mvn checkstyle:check`）
  - 运行单元测试（如 `npm test` / `mvn test`）
  - 项目能够成功构建（如 `npm run build` / `mvn compile`）

> **提示**：具体构建和测试命令请参考项目根目录下的 `stacks/{stack}/stack.md` 或 `README.md`。

---

## 合并策略与 PR 实操

### 合并策略建议

| 场景 | 推荐策略 | 命令示例 |
| :--- | :--- | :--- |
| **功能开发完结** | **Squash Merge** (压缩合并) | 在 PR/MR 界面勾选 "Squash commits" |
| **发布/修复归档** | **Merge Commit** (普通合并) | `git merge --no-ff release/v1.0` |
| **同步上游变更** | **Rebase** (变基) | `git pull --rebase origin main` |

### PR/MR 最佳实践
1. **小步快跑**：一个 PR 只解决一个问题，避免巨大的 "Monster PR"。
2. **描述清晰**：说明 "为什么改"、"改了什么"、"如何验证"。
3. **及时清理**：合并后立即删除远程和本地的临时分支。

---

## 冲突解决步骤

1. **定位冲突**：执行 `git status` 查看未对齐的文件。
2. **手动修复**：打开冲突文件，搜索 `<<<<<<<`。
3. **决策代码**：保留当前分支变更、保留传入分支变更，或两者结合。
4. **标记完成**：
   ```bash
   git add <resolved-file>
   # 如果是 rebase 中冲突
   git rebase --continue
   # 如果是普通 merge 冲突
   git commit -m "fix: 解决合并冲突"
   ```

---

## 核心规则

### ✅ 应该做
- 保持提交粒度原子化，一个提交只做一件事。
- 频繁从目标分支（如 `main`）拉取最新代码到本地。
- 推送 PR 前先在本地执行 `git rebase` 以保持历史线性（可选）。
- 认真编写提交消息，它是未来的文档。

### ❌ 不应该做
- **禁止** 直接在 `main` 分支进行日常开发提交。
- **禁止** 提交包含敏感信息（密码、API Key）的文件（应使用 `.gitignore`）。
- **禁止** 强制推送 (`git push -f`) 到公共协作分支，除非确定没有其他人基于该分支开发。
- **禁止** 在未解决冲突的情况下强行提交。

---

**技能状态**: 完成
