# OpenSpec 项目约定

> 本文件定义 openspec 规范编写时的项目特有约定。编辑 `openspec/` 下文件时自动加载。
>
> 项目概述、技术栈、模块结构等通用信息请写在项目根目录的 `AGENTS.md` 中。

## 规范语言

<!-- 选择一种并删除另一种 -->

- 规范标题（Requirement / Scenario）：**中文**
- 需求描述正文：**中文**
- 代码标识符、API 路径：**英文**

## 能力命名规则

- 格式：`kebab-case`，按业务领域命名
- 示例：`user-auth`、`order-management`、`payment-gateway`
- 一个能力 = 一个独立的业务关注点（可独立理解、独立测试）

## 规范粒度指导

```
太粗 ✗  "系统管理" — 包含用户、角色、权限、日志等不相关关注点
合适 ✓  "user-auth" — 登录、登出、令牌刷新，围绕一个业务域
太细 ✗  "login-button" — UI 实现细节，不是业务能力
```

### 何时拆分

- 两个需求之间无共享场景 → 应拆为不同能力
- 一个 spec.md 超过 30 个场景 → 考虑按子域拆分

## Scenario 编写风格

- 使用 **WHEN / THEN / AND** 结构
- WHEN 描述触发条件（输入、前置状态）
- THEN 描述可验证的预期结果（HTTP 状态码、返回字段、副作用）
- 避免描述实现细节（不要写"调用 XXService"，写预期行为）

```markdown
#### Scenario: 使用过期令牌访问
- **WHEN** 客户端携带已过期的 access_token 请求受保护资源
- **THEN** 系统返回 HTTP 401
- **AND** 响应体包含错误码 `TOKEN_EXPIRED`
```

## 变更 ID 约定

- 格式：`动词-名词短语`，kebab-case
- 动词：`add-`（新增）、`update-`（修改）、`remove-`（删除）、`refactor-`（重构）
- 示例：`add-two-factor-auth`、`update-order-status-flow`、`remove-legacy-api`
