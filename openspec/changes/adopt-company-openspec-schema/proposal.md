## Why

当前 `praxis-devos` 仍把 OpenSpec workflow 作为需要二次管理和投放的 `opsx-*` skills 处理，这会把公司流程定制、OpenSpec 上游升级、agent 投放适配和项目初始化语义耦合在一起。既然 OpenSpec 官方已经支持通过 fork schema 自定义 workflow，并支持 user-level schema 目录，那么 Praxis 更合理的边界应该是分发公司 schema、绑定项目配置，并把 OpenSpec 自己生成的 workflow skills 提升到用户目录，而不是继续维护一层对 OpenSpec skills 的重写投放。

## What Changes

- 将公司级 OpenSpec workflow 定制重构为 user-level custom schema 分发方案，不再以“改写 OpenSpec workflow skills”作为默认集成方式
- 将公司 schema `spec-super` 的默认投放目标明确为 OpenSpec user-level schema 目录：`$XDG_DATA_HOME/openspec/schemas/spec-super/schema.yaml`；当未设置 `XDG_DATA_HOME` 时，macOS/Linux 使用 `~/.local/share/openspec/schemas/spec-super/schema.yaml`，Windows 使用 `%LOCALAPPDATA%/openspec/schemas/spec-super/schema.yaml`
- 将 `spec-super` 的仓库内真源定义为 Praxis 自己的 bundled asset，放在 `assets/openspec/schemas/spec-super/`，而不是当前仓库 `openspec/schemas/` 下的 project-local schema
- 当前 project-local `openspec/schemas/spec-super/schema.yaml` 是从 OpenSpec 官方 schema fork 下来的基线；新的公司版 `spec-super` 需要明确决定是保留这条官方 artifact/dependency graph，还是在此基础上做有意识的定制，而不能在迁移过程中含混继承
- 在公司自定义 schema 中将 `blackbox-test.md` 提升为正式 artifact 输出，而不是继续只靠 propose 阶段向 `tasks.md` 注入黑盒文档任务
- 在投放 `spec-super` schema 时，将 `assets/overlays/openspec/skills/` 下与各阶段对应的 overlay 内容一并并入 schema 结果，使 stage-specific Praxis guidance 成为 schema 分发内容的一部分
- 在初始化安装流程中接管 OpenSpec 的用户级配置文件 `~/.config/openspec/config.json`，将 `profile` 设为 `custom`，并将 `workflows` 显式写为 `["propose", "explore", "new", "continue", "apply", "ff", "archive"]`
- 在 `setup` / `init` / `sync` / `doctor` / `bootstrap` 流程中增加公司 schema 的安装、发现、版本校验和项目绑定语义
- 让项目初始化后的 `openspec/config.yaml` 默认指向公司 schema，而不是继续依赖 Praxis 自管的 OpenSpec workflow skill projection
- 让 `openspec init` 生成的 workflow skills / commands 成为 OpenSpec workflow asset 的上游来源；Praxis 只提升项目内真实生成物到 agent 用户目录，不再额外改名
- 将 workflow 的 canonical skill identity 统一为 OpenSpec 官方 skill 名；`AGENTS.md` 只表达流程 gate，不直接写具体 command 名，避免与不同 agent 的 command surface 耦合
- 对 Codex，Praxis 只 adopt 项目内生成的 workflow skills；OpenSpec 已直接写入 `~/.codex/prompts/*.md` 的 prompt surface 不由 Praxis 二次搬运
- 收缩 `src/projection/` 对 OpenSpec workflow assets 的职责边界，只保留 OpenSpec 生成结果的搬运、Praxis 自有 skills、宿主包装层和兼容性适配，不再把 OpenSpec workflow 文本本身作为默认投放物
- **BREAKING**：对依赖 Praxis 投放增强版 `opsx-*` skills 的现有项目，迁移后需要通过公司 schema、项目 `openspec/config.yaml`、OpenSpec 官方 skill 名以及 OpenSpec 生成后搬运到用户目录的 assets 获得等价流程语义
- 保留现有 docs-aware workflow contract，包括 artifact language policy、schema-defined `blackbox-test.md` 输出、条件化 API docs 路由、`devos-change-docs` 调用和 archive 前校验，并将其优先迁移到 schema / config 能表达的层次

## Capabilities

### New Capabilities
- `company-openspec-schema-distribution`: 统一管理公司自定义 OpenSpec schema 的用户级分发、项目绑定、诊断和迁移语义

### Modified Capabilities
- 无

## Impact

- 影响 `src/core/runtime/`、`src/core/project/`、`src/projection/` 和 CLI setup/sync/doctor/bootstrap 的流程边界
- 影响 schema 资产布局，需要把公司 workflow 真源与当前仓库的 project-local OpenSpec artifacts 明确分离
- 影响公司 schema 的 artifact graph，需要把 `blackbox-test.md` 纳入正式输出与依赖关系设计
- 影响 `assets/upstream/openspec/skills` 与 `assets/overlays/openspec/skills` 的默认地位，二者不再作为公司 workflow assets 的主真源
- 影响 OpenSpec 用户级配置写入逻辑，需要在安装时维护 `profile: custom` 和指定 workflow 列表
- 影响 OpenSpec init 后的项目清理和用户目录 adopter 逻辑，需要把项目内 workflow skills / commands 按各 agent surface 差异安全搬运到用户目录，并清理 legacy `opsx-*` 产物
- 影响 `AGENTS.md` managed entry 的流程表达方式，需要移除对具体 workflow command 名的直接引用
- 影响 user-level schema 安装目录解析，需要对 `XDG_DATA_HOME`、macOS/Linux 默认目录和 Windows `%LOCALAPPDATA%` 路径做一致处理
- 影响项目初始化后的 `openspec/config.yaml` 写入逻辑，以及现有项目的迁移策略和兼容校验
- 影响维护文档、安装说明、doctor 输出和测试基线，需要新增 user-level schema 安装与版本诊断覆盖
- 不直接影响对外 API，但会改变 OpenSpec workflow 在本地环境中的来源和升级路径
