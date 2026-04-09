## Dependencies

- Section 2 depends on Section 1 because refresh assessment and change-aware refresh need the docs context pack contract.
- Section 3 depends on Sections 1 and 2 because OpenSpec flow integration consumes both routing and refresh assessment helpers.
- Section 4 depends on Sections 1, 2, and 3 because skill / command / guidance 文案必须与最终 contract 和流程接线一致。
- Section 5 depends on Sections 1 through 4.

## 1. Docs Context Routing Contract

- [x] 1.1 为 `docs/surfaces.yaml`、`project-overview.md`、`module-map.md` 和模块 codemap 定义统一的 docs context pack 数据结构
- [x] 1.2 实现默认 docs routing 规则，确保非模块任务至少读取 `docs/surfaces.yaml` 和 `docs/codemaps/project-overview.md`
- [x] 1.3 实现多模块 routing 规则，使其在定位到模块时只加入对应 `docs/codemaps/modules/<artifactId>.md`
- [x] 1.4 实现 routing metadata 输出，说明每个 docs artifact 为什么被加入 context pack

## 2. OpenSpec-Linked Docs Refresh Assessment

- [x] 2.1 定义 change-aware refresh 输入 contract，包含 `changeId`、OpenSpec artifact paths 和 changed paths
- [x] 2.2 实现 deterministic docs refresh assessment 规则，用于判断 primary surface、模块拓扑和 project map 是否受影响
- [x] 2.3 让 `devos-docs mode=refresh` 能消费 change-aware context，同时继续遵守现有 non-destructive writeback/validation 规则

## 3. OpenSpec Flow Integration

- [x] 3.1 在 `assets/skills/opsx-apply/`、`assets/skills/opsx-archive/` 等 OpenSpec 工作流 guidance 中加入 docs context pack 的读取顺序和使用方式
- [x] 3.2 在 `apply` 相关流程 skill / helper 中接入 docs context pack 构建与 refresh assessment
- [x] 3.3 在 `archive` 相关流程 skill / helper 中接入 docs refresh assessment，并定义需要 refresh 时的处理方式
- [x] 3.4 保持 `praxis-devos docs refresh|check` 作为 fallback，并确保与新 contract 对齐

## 4. Host and Skill Alignment

- [x] 4.1 更新 `assets/skills/devos-docs/` 中的 `devos-docs` skill，补充 docs context pack 与 OpenSpec-linked refresh 的输入说明
- [x] 4.2 更新 `assets/commands/devos-docs-init.md` 与 `assets/commands/devos-docs-refresh.md`，使其文案与新的 docs routing / refresh 约定一致
- [x] 4.3 更新 managed guidance，明确 Claude/OpenCode/Codex 在 docs 消费上的宿主差异

## 5. Verification

- [x] 5.1 增加 docs context pack 的单元测试，覆盖默认 routing、多模块 routing 和未知模块 fallback
- [x] 5.2 增加 refresh assessment 的单元测试，覆盖 surface 变化、模块拓扑变化和无需 refresh 的场景
- [x] 5.3 增加 OpenSpec 联动相关测试，覆盖 apply/archive 的 docs refresh assessment 触发点
- [x] 5.4 跑 `node --test test/praxis-devos.test.js`
- [x] 5.5 跑 `node --test`
