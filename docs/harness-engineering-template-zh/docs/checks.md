# 文档与契约校验规则

## 目的

本文件定义可接入 CI 或本地脚本的最小校验项。

## 必做校验

### 1. 契约存在性校验

- 修改公共 API 时，必须同时存在 `contracts/openapi/public.yaml`
- 修改配置时，必须同时存在 `contracts/config/app.schema.json`
- 修改权限模型时，必须同时存在 `contracts/permissions/permissions.yaml`
- 修改错误模型时，必须同时存在 `contracts/errors/errors.yaml`
- 修改 CLI 行为时，必须同时存在 `contracts/cli/cli.yaml`

### 2. 参考文档同步校验

- `docs/reference/` 中必须存在与契约对应的参考文档
- reference 不得描述契约中不存在的字段

### 3. 占位符校验

正式项目中不应残留以下占位内容：

- `<填写`
- `<项目`
- `example.com`
- `TODO: replace`

### 4. guide / migration 校验

以下场景必须补 guide 或 migration：

- breaking change
- onboarding 流程变化
- 接入方式变化

### 5. runbook 校验

涉及运维或故障处理变化时，runbook 至少应包含：

- 触发条件或阈值
- 观测入口
- 诊断命令
- 回滚条件与步骤
- 恢复验证
- 升级条件

## 推荐接入方式

- 本地脚本：在提交前执行
- CI：在 PR 或 merge request 中执行
- OpenSpec 收尾：在 archive 或 completion 前执行

## 最小通过标准

只有当契约、reference、必要 guide、必要 runbook 都已同步且未残留占位符时，文档校验才算通过。
