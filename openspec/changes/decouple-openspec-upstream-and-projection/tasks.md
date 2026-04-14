## 1. Upstream 来源与资产布局

- [x] 1.1 为 OpenSpec 默认 4 个 workflow skills 建立独立的 upstream snapshot 目录，并明确其与现有 Praxis `assets/skills/` 的职责边界
- [x] 1.2 将 Praxis 针对 4-flow 的增强规则整理为独立 overlay 来源，避免继续直接把整合后的最终文本作为唯一真源
- [x] 1.3 为 upstream snapshot 与 overlay 增加必要的命名和结构约束，使后续 projection 可以按 skill 名稳定组合

## 2. Projection 组合与默认 4-flow 约束

- [x] 2.1 在 skill 投放流程中加入 upstream snapshot + overlay 的组合步骤，并生成最终投放 skill
- [x] 2.2 将当前阶段的 managed OpenSpec projection 明确限制为默认 4-flow，对 expanded/6-flow 节点不自动纳入默认投放
- [x] 2.3 保持 commands/prompts 逻辑不变，使首批变更只覆盖 4 个 workflow skills 的统一管控

## 3. 版本判断、诊断与验证

- [x] 3.1 为最终投放 skill 记录 upstream `metadata.version`、`generatedBy` 与 Praxis overlay 版本标识
- [ ] 3.2 更新 `sync` / `doctor` 相关判断逻辑，使其能识别 projection 是否因 upstream 或 overlay 变化而需要重建
- [x] 3.3 补充测试与维护文档，验证 4 个 workflow skills 的组合投放、默认 4-flow 限定和升级判断行为
- [x] 3.4 恢复并锁定 `openspec/config.yaml -> docs task policy -> tasks.md 文档任务注入 -> devos-change-docs` 链路，覆盖 `blackbox-test.md` 默认任务、API 变化时按需生成的 `api-doc.md` 任务，以及兼容性风险警告写入
