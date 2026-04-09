## 背景

Praxis 已经有一版 Phase 1 的 docs-lite 实现，当前路径是 `docs/surfaces.yaml` + `docs/codemaps/`，并且仓库里已经存在 `praxis-devos docs init|refresh|check` 这组兼容命令。下一步问题不是推翻这套实现，而是把它演进成 AI-first 的 Phase 2：由宿主 agent command 驱动普通子 agent，执行单一的 `devos-docs` skill，同时不打破现有 Phase 1 的路径和测试基线。

## 变更内容

- 把这次 change 明确为从 docs-lite 演进到 AI-first orchestration 的 Phase 2，而不是重写现有 Phase 1。
- 新增 AI-first 的文档初始化与刷新能力，目标主入口是宿主 agent 的 command。
- 宿主 command 分为两个入口：
  - `/devos:docs-init`
  - `/devos:docs-refresh`
- 新增单一 `devos-docs` skill，供普通子 agent 执行，并通过 `mode=init|refresh` 区分流程。
- 定义 docs 子 agent 的输入上下文和输出 contract，约束可写目标文件集合。
- 保留 `praxis-devos docs init|refresh|check` 作为 compatibility / fallback path，而不是本阶段立即移除。
- 将多 Maven 模块项目的 codemap 产物收敛为固定集合：
  - `docs/surfaces.yaml`
  - `docs/codemaps/project-overview.md`
  - `docs/codemaps/module-map.md`
  - `docs/codemaps/modules/<artifactId>.md`
- 保留 `docs check` 作为机械验收，不负责生成正文。
- 本阶段直接以 `docs/surfaces.yaml` 作为 canonical path，不再保留 `contracts/surfaces.yaml` 作为事实源入口。

## 能力影响

### 新增能力
- `ai-project-docs`: 通过宿主 command 派发普通子 agent，并使用 `devos-docs` skill 为用户项目生成和刷新文档契约与 codemap。

### 修改能力

## 影响范围

- 影响 `src/core/praxis-devos.js` 中当前 docs 相关生成逻辑的定位，需要把脚本式生成明确为 compatibility / fallback 或内部辅助。
- 影响投影与模板资产，需要新增 `devos-docs` skill，并让宿主 command 使用 `init` / `refresh` 两种模式驱动它。
- 影响托管规则，需要明确“宿主 command + 普通子 agent + skill”的协作模型。
- 影响测试策略，需要从“测试文案生成”转为“测试上下文打包、输出 contract、落盘、兼容路径和验收”。
