# 迁移记录

## 目的

沉淀历史 breaking change、兼容性调整和迁移动作，避免这些知识只停留在当前变更上下文中。

## 什么时候需要新增迁移记录

- 出现 breaking change
- 配置默认值或行为发生不兼容变化
- 权限模型变化影响既有使用方式
- API / CLI 行为变化影响现有调用方

## 建议格式

每条迁移记录建议包含：

- 变更名称
- 影响范围
- 破坏性变化说明
- 升级步骤
- 回滚方法
- 验证方式
- 关联契约

## 关联文档

- `docs/guides/migration-template.md`
- `docs/changelog/`
- `contracts/`

