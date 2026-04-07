# 文档总索引

## 目的

本文件用于帮助开发者和 AI 代理快速找到项目中的长期知识入口。

## 首先看什么

### 1. 了解项目规则

- `AGENTS.md`
- `docs/guides/contributing.md`
- `docs/definition-of-done.md`
- `docs/checks.md`

### 2. 了解系统事实

- 公共 API：`contracts/openapi/public.yaml`
- 配置契约：`contracts/config/app.schema.json`
- 错误模型：`contracts/errors/errors.yaml`
- 权限模型：`contracts/permissions/permissions.yaml`
- CLI 契约：`contracts/cli/cli.yaml`

### 3. 了解系统全貌

- 系统地图：`docs/architecture/system-map.md`
- 术语表：`docs/glossary.md`
- 运行环境：`docs/operations/environments.md`
- 外部依赖：`docs/operations/dependencies.md`
- 可观测性入口：`docs/operations/observability.md`

### 4. 处理当前变更

- 当前变更：`openspec/changes/<change>/`
- 参考文档：`docs/reference/`
- 操作说明：`docs/guides/`
- 故障处理：`docs/runbooks/`

### 5. 追溯历史

- 变化记录：`docs/changelog/`
- 迁移说明：`docs/migrations/`
- 设计决策：`docs/adr/`

## 使用建议

- 需要事实时先看 `contracts/`
- 需要操作步骤时看 `guides/`
- 需要排障动作时看 `runbooks/`
- 需要理解为什么这样设计时看 `adr/`
- 需要理解当前任务时看 `openspec/changes/<change>/`

