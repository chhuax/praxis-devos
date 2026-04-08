# 文档与契约完成定义

## 目的

本文件定义一次变更在契约和文档层面何时才算真正完成。

## 完成定义

### 改公共 API

必须满足：

- 已更新 `contracts/openapi/public.yaml`
- 已同步 `docs/reference/api.md`
- 如果是 breaking change，已补 `docs/guides/` 中的迁移说明
- 如果涉及错误语义变化，已同步 `contracts/errors/errors.yaml`
- 如果涉及权限变化，已同步 `contracts/permissions/permissions.yaml`

### 改配置

必须满足：

- 已更新 `contracts/config/app.schema.json`
- 已同步 `docs/reference/config.md`
- 已更新默认值、取值范围和兼容性说明

### 改权限

必须满足：

- 已更新 `contracts/permissions/permissions.yaml`
- 已同步 `docs/reference/permissions.md`
- 如用户接入或操作受到影响，已更新相关 guide

### 改错误模型

必须满足：

- 已更新 `contracts/errors/errors.yaml`
- 已同步 API 或 CLI 对错误码的引用
- 已确认调用方应依赖错误码而不是消息文本

### 改运维流程

必须满足：

- 已更新对应 `docs/runbooks/`
- 已同步观测入口、诊断命令、回滚条件和恢复验证

### 改关键设计决策

必须满足：

- 已补充 `docs/adr/`，或
- 已在当前变更上下文中清楚记录决策及其原因

## 最终判断

如果一项代码变更已经合入，但对应契约、reference、guide 或 runbook 仍未同步，则该变更不应视为“完成”。

