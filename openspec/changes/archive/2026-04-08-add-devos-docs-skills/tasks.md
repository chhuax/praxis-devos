## 1. AI-first 文档工作流设计

- [x] 1.1 定义 `/devos:docs-init` 的 host-command 到普通子 agent 的 handoff contract
- [x] 1.2 定义 `/devos:docs-refresh` 的 host-command 到普通子 agent 的 handoff contract
- [x] 1.3 定义单一 `devos-docs` skill 的 contract，并支持 `mode=init|refresh`
- [x] 1.4 定义结构化 docs 生成结果 contract 和允许写入的目标文件
- [x] 1.5 定义 `praxis-devos docs init|refresh|check` 的 CLI 兼容策略
- [x] 1.6 定义仓库内验收范围与宿主集成层验收范围的边界
- [x] 1.7 定义 Phase 2 显式 allowed write target 白名单
- [x] 1.8 定义 refresh 的保守行为和非破坏性 writeback 规则

## 2. Docs skill 资产

- [x] 2.1 创建 `devos-docs` skill，明确 mode 处理、读取范围、写入范围和输出 contract
- [x] 2.2 更新投影后的指导说明，让宿主 command 优先使用这个 skill，而不是直接走脚本生成
- [x] 2.3 调整 fallback helper 的定位，使其明确从属于 AI-first 生成路径

## 3. Maven 多模块 codemap contract

- [x] 3.1 定义用于 docs 生成上下文的 Maven 多模块检测规则
- [x] 3.2 定义根 `pom.xml` 缺少 `<modules>` 时的确定性单模块行为
- [x] 3.3 定义 `docs/codemaps/module-map.md` 的内容要求
- [x] 3.4 定义 `docs/codemaps/modules/<artifactId>.md` 的内容要求
- [x] 3.5 定义基于已发现 `artifactId` 的模块 codemap 命名规则
- [x] 3.6 定义基于显式 `<modules>` 聚合的递归嵌套模块发现规则
- [x] 3.7 定义已发现模块缺少 `<artifactId>` 时的回退命名规则

## 4. 运行时与 validation 对齐

- [x] 4.1 将当前 deterministic docs 生成逻辑重构为 fallback 或内部 helper 模式
- [x] 4.2 在兼容阶段统一使用 `docs/surfaces.yaml` 作为 canonical path
- [x] 4.3 让文件 writeback 与结构化 docs 生成 contract 以及 canonical path 规则保持一致
- [x] 4.4 当检测到 Maven 多模块时，扩展 deterministic validation，覆盖 `module-map.md`、模块 codemap 文件以及路径冲突
- [x] 4.5 为空白 `surfacesYaml`、重复 codemap 路径和空内容 codemap 增加 contract validation 规则
- [x] 4.6 在仓库 writeback 之前拒绝非 canonical 的 `contracts/surfaces.yaml` 写入目标
- [x] 4.7 保持单一 canonical path，阻止回写到 `contracts/surfaces.yaml`

## 5. Codemap 最小内容 contract

- [x] 5.1 定义 `docs/codemaps/module-map.md` 的最小内容要求
- [x] 5.2 定义 `docs/codemaps/modules/<artifactId>.md` 的最小内容要求
