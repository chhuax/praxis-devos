## 1. 公司 schema 真源与安装通路

- [x] 1.1 设计并落地公司 custom schema 在 `assets/openspec/schemas/spec-super/` 的仓库内资产布局、版本标识和用户级安装目标，确保真源不再位于 `openspec/schemas/`
- [x] 1.2 将 `spec-super` 定义为“保留官方 fork 基线并新增 `blackbox-test` artifact”的公司 schema，并把新的 artifact/dependency graph 与 schema description 写入分发真源
- [x] 1.3 为 `blackbox-test.md` 增加 schema 模板与 instructions，并将其收敛为与 `tasks` 并列的正式 artifact，替代 propose 阶段注入黑盒 docs task 的旧路径
- [x] 1.4 将 `assets/overlays/openspec/skills/` 中同阶段内容并入 `spec-super` schema bundle，并建立稳定的 stage 映射与打包逻辑
- [x] 1.5 实现 user-level schema 安装与刷新逻辑，使 `setup` / `bootstrap` / `sync` 能按 `XDG_DATA_HOME`、macOS/Linux 默认目录和 Windows `%LOCALAPPDATA%` 分发公司 schema
- [x] 1.6 实现 OpenSpec 用户配置更新逻辑，将 `~/.config/openspec/config.json` 中的 `profile` 设为 `custom`，并将 `workflows` 设为 `["propose", "explore", "new", "continue", "apply", "ff", "archive"]`
- [x] 1.7 为 schema 安装结果与用户配置状态补充可诊断元数据，供后续 `doctor` 和迁移逻辑消费

## 2. 项目绑定与 OpenSpec workflow adopter

- [x] 2.1 更新项目初始化与修复流程，使 `openspec/config.yaml` 默认绑定公司 schema
- [x] 2.2 实现对 OpenSpec init 生成 workflow skills / commands 的 adopter 逻辑，按各 agent 用户级 surface 差异搬运结果，保留 OpenSpec 官方 skill 名，不再改名，并在安全前提下清理项目副本与 legacy `opsx-*`
- [x] 2.3 更新 runtime/doctor 检查，识别 schema 缺失、版本过旧、OpenSpec user config 偏离、项目未绑定、skill adopter 失败和 precedence 覆盖场景
- [x] 2.4 为 legacy projected `opsx-*` 项目增加迁移提示、兼容判断和必要清理策略

## 3. Projection 边界收缩与 docs contract 保真

- [x] 3.1 收缩 `src/projection/` 对 OpenSpec workflow skills 的默认职责，只保留 OpenSpec 生成结果的 adopter、Praxis 自有 skills、宿主包装和兼容适配；同步把 `AGENTS.md` managed entry 改成不直接体现 workflow command 名
- [x] 3.2 将可由 schema/config 表达的 workflow 语义迁入公司 schema，并把 `blackbox-test.md` 收敛为正式 artifact，保留现有 docs-aware contract
- [x] 3.3 确认 `devos-docs` / `devos-change-docs` 仍能在 company schema 模式下被正确路由和消费

## 4. 验证与维护文档

- [x] 4.1 补充测试覆盖 artifact graph 决策保真、`blackbox-test` artifact、user-level schema 安装路径解析、OpenSpec user config 更新、project config 绑定、OpenSpec-generated skill adopter、doctor 诊断和 migration path
- [x] 4.2 补充测试覆盖 docs task policy、artifact language policy 和 company schema 模式下的 docs 路由保真
- [x] 4.3 更新维护文档，说明公司 schema 分发模式、优先级、升级方式和 legacy projection 迁移规则
