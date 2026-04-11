## 1. `devos-change-docs` Contract 与 Validation

- [x] 1.1 新增 `devos-change-docs` skill，定义 `change-blackbox`、`change-api`、`project-api-sync` 三种 mode 的职责、输入来源与 structured result
- [ ] 1.2 为三种 mode 实现 path allowlist、`changeId` traceability、必填章节校验和 deterministic writeback validation
- [x] 1.3 将 `demo/api-doc.md` 与 `demo/blackbox-test.md` 提炼为 skill guidance 与 validator 的最小格式约束，并支持 `zh-CN` / `en` 标题别名
- [ ] 1.4 复用 `devos-docs` 的 contract / validation helper 思路或公共实现，但保持 `devos-docs` 现有 writeback boundary 不扩展到 `docs/reference/api.md`

## 2. OpenSpec Proposal / Apply / Archive 联动

- [x] 2.1 更新 `opsx-propose`，自动在 `tasks.md` 的独立文档交付 section 中注入 `blackbox-test.md` 任务，并在 API change 场景下注入 `api-doc.md` 与 `docs/reference/api.md` 同步任务
- [x] 2.2 更新 `opsx-propose` / proposal artifacts，写入可被后续 stage 消费的 `Docs Impact` 字段：`change-blackbox`、`change-api`、`project-api-sync`
- [x] 2.3 更新 `opsx-apply`，把 change-level 文档作为实现后任务完成，并支持 optional sidecar subagent 起草文档 contract
- [x] 2.4 更新 `opsx-archive`，在 API change 场景下要求 `docs/reference/api.md` 同步 evidence 或显式 waiver
- [x] 2.5 明确 `change-api` 以当前 change artifacts 为主依据、以实现改动为补充依据的 skill 约束，并在冲突时返回需要澄清的结果

## 3. 项目级 API 参考文档

- [ ] 3.1 扩展 `doc-init` 或相关 helper，使 `docs/reference/api.md` 可以被初始化为稳定骨架
- [ ] 3.2 让 `project-api-sync` 在 `docs/reference/api.md` 不存在时可创建，在存在时通过 managed section 做 non-destructive 更新
- [x] 3.3 明确项目级 API 文档与 change-level `api-doc.md` 的职责边界，避免两份文档语义重复

## 4. Verification

- [x] 4.1 增加 proposal/apply/archive 相关测试，锁定文档任务注入、`Docs Impact` 传递和 API sync gate
- [ ] 4.2 增加 `devos-change-docs` validation 测试，覆盖 path allowlist、`changeId`、章节缺失、标题语言别名、空内容和非法 mode
- [ ] 4.3 增加项目级 API 文档初始化与 archive 同步测试，覆盖“首次创建”“已有文档更新”和“waiver”三类场景
