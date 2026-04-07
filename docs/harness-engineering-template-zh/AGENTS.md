# AGENTS.md

## 项目地图

- `contracts/`：对外行为和外部契约的事实源
- `docs/reference/`：生成式或人工维护的参考文档
- `docs/guides/`：上手、接入和操作说明
- `docs/runbooks/`：排障与恢复流程
- `docs/adr/`：架构决策记录
- `docs/architecture/`：系统边界、模块关系和关键数据流
- `docs/operations/`：环境、依赖、可观测性入口
- `docs/changelog/`：面向消费者的变化记录
- `docs/migrations/`：历史迁移说明与 breaking change 记录
- `docs/glossary.md`：术语表
- `openspec/changes/`：当前变更上下文与交付产物

## 常用命令

```bash
# 测试
<填写测试命令>

# 静态检查
<填写静态检查命令>

# 本地运行
<填写本地运行命令>

# 文档校验
<填写 docs check 命令>
```

## 协作原则

- `contracts/` 是对外行为的事实源。
- `AGENTS.md` 只做导航和最小协作约束，不承载详细流程说明。
- 详细变更要求、完成定义和校验规则见 `docs/guides/contributing.md`、`docs/definition-of-done.md`、`docs/checks.md`。

## 关键入口

- 公共 API：`contracts/openapi/public.yaml`
- 配置契约：`contracts/config/app.schema.json`
- 错误模型：`contracts/errors/errors.yaml`
- 权限模型：`contracts/permissions/permissions.yaml`
- CLI 契约：`contracts/cli/cli.yaml`
- 变更上下文：`openspec/changes/<change>/`
- 变更协作规则：`docs/guides/contributing.md`
- 完成定义：`docs/definition-of-done.md`
- 文档与契约校验：`docs/checks.md`
- 文档总索引：`docs/index.md`
- 系统地图：`docs/architecture/system-map.md`
- 术语表：`docs/glossary.md`
- 运行环境：`docs/operations/environments.md`
