# 能力：用户认证 (User Authentication)

> 这是一个示例规范文件，展示 spec.md 的标准格式。
> 实际使用时，请删除本文件或将 `_example` 目录移除。

## 概述

系统提供基于 JWT 的用户认证能力，支持登录、登出和令牌刷新。

---

### Requirement: 用户登录

系统 SHALL 允许用户通过用户名和密码进行身份验证，验证成功后返回 JWT 令牌。

#### Scenario: 使用有效凭据登录

- **WHEN** 用户提交正确的用户名和密码
- **THEN** 系统返回 HTTP 200 和包含 access_token 的 JSON 响应
- **AND** access_token 有效期为 30 分钟

#### Scenario: 使用无效凭据登录

- **WHEN** 用户提交错误的密码
- **THEN** 系统返回 HTTP 401
- **AND** 响应体包含错误码 `INVALID_CREDENTIALS`

---

### Requirement: 令牌刷新

系统 SHALL 允许客户端使用 refresh_token 获取新的 access_token，无需重新输入凭据。

#### Scenario: 使用有效 refresh_token 刷新

- **WHEN** 客户端提交未过期的 refresh_token
- **THEN** 系统返回新的 access_token
- **AND** 旧的 access_token 失效

#### Scenario: 使用过期 refresh_token 刷新

- **WHEN** 客户端提交已过期的 refresh_token
- **THEN** 系统返回 HTTP 401
- **AND** 客户端需要重新登录
