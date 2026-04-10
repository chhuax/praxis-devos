## 1. AI-First Codemap Guidance

- [x] 1.1 强化 `devos-docs` guidance，让现有 codemap 工件对 AI 消费者携带架构、路由、流转和 edit-hazard 上下文
- [x] 1.2 保持 codemap 生成仍然落在当前 lightweight docs contract 内，同时把最影响决策的横切上下文折叠进现有 targets
- [x] 1.3 补充或更新测试，锁定 AI-first codemap 的质量门槛和 canonical path 假设

## 2. OpenSpec Docs Impact 与语言策略联动

- [x] 2.1 更新 `opsx-propose`，在 docs intent 重要时记录简短 `Docs Impact`，并让新建工件遵守 `openspec/config.yaml` 中的 artifact language policy
- [x] 2.2 更新 `opsx-explore`，在补写 proposal/design/tasks/spec artifacts 时保持与当前 change 一致的工件语言
- [x] 2.3 更新 `opsx-apply`，让 `Docs Impact` 成为 docs refresh routing 的第一信号，changed paths 仅作 fallback
- [x] 2.4 更新 `opsx-archive`，让已声明的 docs impact 在归档前必须提供 refresh evidence 或显式 waiver
- [x] 2.5 为 `openspec/config.yaml` 增加 artifact language policy 的约定方式或模板示例，便于项目显式设置中文或英文

## 3. Verification

- [x] 3.1 运行 `node --test test/praxis-devos.test.js`
- [ ] 3.2 用代表性项目验证新的 codemap 输出对 AI 使用是否明显更丰富
- [x] 3.3 验证未配置语言时会继承当前 change 的主语言，已配置语言时会稳定遵守项目设置
