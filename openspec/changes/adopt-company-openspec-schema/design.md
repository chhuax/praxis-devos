## Context

当前仓库围绕 OpenSpec workflow 的主实现思路仍然是“把 upstream `opsx-*` skills 收进 Praxis，再叠加 overlay 后投放到各 agent 可发现目录”。这条路虽然能控制 agent 行为，但也把本应属于 OpenSpec workflow definition 的内容放到了 skill projection 层，导致：

- 公司流程定制无法直接复用 OpenSpec 官方的 schema fork 机制
- OpenSpec 升级与 Praxis overlay 升级纠缠在一起
- 项目 workflow 的主真源既不像 OpenSpec schema，也不像项目 config，而更像 Praxis 拼装后的 skill 文本
- 初始化、诊断、修复和升级都需要围绕 `opsx-*` projection 设计

结合这次澄清，新的目标不是继续把 OpenSpec skills 管得更精细，而是重定义边界：

- 公司 workflow 语义优先落在 OpenSpec custom schema
- schema 以 user-level 方式统一分发，避免每个项目重复复制
- 项目通过 `openspec/config.yaml` 绑定公司 schema
- Praxis 保留自己的 docs / host adapter / deterministic checks 能力，但不再把 OpenSpec workflow 文本视为默认投放物
- `blackbox-test.md` 作为公司 schema 的正式 artifact 输出，由 schema 定义其生成时机、模板和依赖关系，而不是继续作为 propose 阶段注入到 `tasks.md` 的附加 docs 任务
- OpenSpec workflow assets 由 `openspec init` 先生成，再由 Praxis 只对项目内真实生成物做 adopter，而不是由 Praxis 自己生成一份
- 公司 schema 真源不再挂在仓库 `openspec/schemas/` 下，以免被误解为当前仓库自己的 project-local workflow；canonical source 改为 `assets/openspec/schemas/spec-super/`
- OpenSpec 的用户级配置也要被显式收敛到公司要求：`profile: custom`，`workflows: ["propose", "explore", "new", "continue", "apply", "ff", "archive"]`
- `assets/overlays/openspec/skills/` 中按阶段维护的 Praxis guidance 需要并入 `spec-super` schema 分发内容，而不是继续作为独立 OpenSpec skill 投放物
- 当前仓库里 `openspec/schemas/spec-super/schema.yaml` 的 `proposal → specs → design → tasks` 来自 OpenSpec 官方 fork 基线；新的公司 schema 需要明确决定是否保留这条官方 artifact graph，而不是把它当成无来源的本地残留

## Goals / Non-Goals

**Goals:**

- 把公司 OpenSpec workflow 迁移为可由 OpenSpec 原生解析的 custom schema
- 把公司 schema 真源迁出仓库 `openspec/schemas/`，改为 Praxis 自己管理的 bundled asset
- 通过 user-level schema 分发，减少每项目一份 workflow 定义的重复
- 明确 `spec-super` 的 artifact/dependency graph 策略：保留官方 fork 基线，还是在其上新增 `blackbox-test` artifact 并调整依赖关系
- 把 OpenSpec init 生成的 workflow skills / commands 搬运到 agent 用户目录，并从项目目录移走冗余副本
- 在 `setup` / `init` / `sync` / `doctor` / `bootstrap` 中建立 schema 安装、修复、版本校验和配置绑定语义
- 在安装流程中维护 OpenSpec 用户配置文件，使 profile/workflows 与公司要求一致
- 把 `assets/overlays/openspec/skills/` 中同阶段的 guidance 迁入 `spec-super` 的分发内容，避免继续作为独立 skill 资产维护
- 保留现有 docs-aware workflow contract，包括 artifact language policy、schema-defined `blackbox-test.md` 输出和 `devos-change-docs` 路由
- 为现有依赖 Praxis 投放 `opsx-*` 的项目提供迁移、清理和诊断路径

**Non-Goals:**

- 不在这次 change 中重新设计一套新的 OpenSpec workflow 概念或 artifact 模型
- 不要求所有项目把公司 schema 再复制到仓库内 `openspec/schemas/`
- 不把公司 schema 继续作为当前 Praxis 仓库的 project-local OpenSpec schema 维护
- 不在这次 change 中强行移除所有与 OpenSpec 相关的宿主包装物；兼容包装可暂时保留
- 不要求 Praxis 继续维护 `assets/upstream/openspec/skills` 与 `assets/overlays/openspec/skills` 作为 OpenSpec workflow skills 的主生成源
- 不要求删除 `assets/overlays/openspec/skills/` 中仍有价值的阶段 guidance；本次更关心把它们迁入 schema 分发边界
- 不把所有 Superpowers 调用都迁成 OpenSpec 的强类型机制；本次只重构 workflow 主来源和投放边界

## Decisions

### 1. 以公司 custom schema 取代 Praxis 自管的 OpenSpec workflow skill 作为主真源

新的 workflow 主真源是公司 fork 出来的 OpenSpec schema，而不是 Praxis 拼装后的 `opsx-*` skill 文本。对于 workflow skills，本次也不再把 Praxis 资产视为真源，而是把 `openspec init` 的生成结果视为上游来源。

原因：

- 这更符合 OpenSpec 官方的自定义模型：workflow 结构、artifact 依赖、模板和 instructions 归 schema 管
- 能减少对 upstream skill 文本的跟随式维护
- 能让项目 workflow 更自然地回到 `schema + config` 的 OpenSpec 原生解析链路

备选方案：

- 继续推进 upstream snapshot + overlay，并把 overlay 做得更薄
- 不采用。即便 overlay 变薄，workflow 主来源仍然是 skill projection，边界问题没有真正解决。

### 2. 公司 schema 以 user-level 安装方式统一分发，项目只做绑定

Praxis 将公司 schema `spec-super` 的 canonical source 保存在 `assets/openspec/schemas/spec-super/`，再安装到 OpenSpec 支持的 user-level schema 目录，由项目通过 `openspec/config.yaml` 选择 `schema: spec-super`。

安装目标路径约束：

- 首选 `$XDG_DATA_HOME/openspec/schemas/spec-super/schema.yaml`
- 当 `XDG_DATA_HOME` 未设置时，macOS/Linux 回退到 `~/.local/share/openspec/schemas/spec-super/schema.yaml`
- Windows 回退到 `%LOCALAPPDATA%/openspec/schemas/spec-super/schema.yaml`

原因：

- `openspec/schemas/` 表示当前项目自己的 schema，不适合作为公司级分发真源
- `assets/openspec/schemas/spec-super/` 可以明确表达“这是 Praxis bundled schema asset，不是项目内 OpenSpec workspace”
- `assets/overlays/openspec/skills/` 中的阶段 guidance 本质上属于公司 workflow contract，放进 `spec-super` 更符合单一真源
- 当前 project-local `schema.yaml` 里的 artifact 顺序来自官方 fork 基线，但它是否继续代表公司的目标 workflow，仍需要在这次重构中明确决策
- 同一名 workflow 可跨项目复用，避免每个仓库都复制一份 schema
- 公司可以统一控制 schema 版本与升级节奏
- 项目仓库保持轻量，只绑定流程，不携带流程定义副本

备选方案：

- 每个项目写入自己的 `openspec/schemas/<company-schema>/`
- 不作为默认方案。项目内 schema 更利于审计，但会产生重复副本和升级扩散成本；后续可作为高管控模式保留。

备选方案：

- 继续把 `spec-super` 维护在 Praxis 仓库 `openspec/schemas/spec-super/` 下，再复制到用户目录
- 不采用。这样会把“Praxis 自己的 OpenSpec project-local schema”和“公司级可分发 schema”混为一谈，增加维护和认知混乱。

备选方案：

- 继续把 `assets/overlays/openspec/skills/` 当成独立 skill 投放源，同时再投 `spec-super`
- 不采用。这样会让阶段 contract 同时存在于 schema 与独立 skill 两处，真源再次分裂。

### 3. `spec-super` 明确在官方 fork 基线上新增 `blackbox-test` artifact

新的 `spec-super` 虽然沿用 schema 名称，但不再只停留在“是否保留官方基线”这个模糊问题上。本次明确采用 OpenSpec 官方 fork 作为基线，并在其上做一项有意识的公司定制：新增正式 artifact `blackbox-test`，输出 `blackbox-test.md`。

目标 artifact graph 调整为：

- `proposal`
- `specs`（requires: `proposal`）
- `design`（requires: `proposal`）
- `blackbox-test`（requires: `specs`, `design`）
- `tasks`（requires: `specs`, `design`）

原因：

- 这保留了官方 schema 的主体节奏与已有 artifact 语义，只在 docs-aware contract 最稳定的一项上做增量定制
- `blackbox-test.md` 本来就依赖需求和设计收敛后才能高质量生成，因此放在 `specs` 与 `design` 之后最自然
- `tasks.md` 与 `blackbox-test.md` 保持同级，可以避免 apply 被黑盒文档阻塞，同时仍把黑盒验证产物纳入正式 workflow 输出
- 这样做之后，company schema 的 docs contract 会更接近“正式 workflow 输出”，而不是“外层 skill 对任务列表的补丁”或“任务列表的前置门槛”

实现约束：

- schema description 必须明确声明这是“基于官方 fork 基线、额外新增 `blackbox-test` artifact 的公司定制”
- `blackbox-test.md` 模板与 instructions 需要聚焦黑盒验证视角，而不是重复 `tasks.md` 的实现 checklist
- tests 需要覆盖最终 artifact order 和 dependency graph，防止实现时无意把 `blackbox-test` 再降回临时 docs task
### 4. 项目配置通过 `openspec/config.yaml` 绑定公司 schema，而不是继续依赖 skill 投放结果

Praxis 在初始化和修复项目时，应把 `openspec/config.yaml` 中的默认 schema 指向公司 schema，并让 OpenSpec 按官方 precedence 解析。

原因：

- `openspec/config.yaml` 是 OpenSpec 官方定义的项目默认 schema 入口
- 这让 workflow 选择对项目更显式，也更容易诊断
- 它避免把“当前项目到底跑哪套流程”隐藏在 agent 私有目录或投放产物里

实现约束：

- 不要在运行时无条件覆盖 CLI `--schema` 或 change-local `.openspec.yaml`
- `doctor` 输出需要能解释 project default、change override 和 runtime override 的关系

### 5. 安装流程同时维护 OpenSpec 用户级 profile/workflows 配置

Praxis 在 setup/init/bootstrap 过程中不仅要安装 schema，还要把 OpenSpec 的用户级配置收敛到公司要求。当前目标配置文件是 `~/.config/openspec/config.json`，至少需要确保：

- `"profile": "custom"`
- `"workflows": ["propose", "explore", "new", "continue", "apply", "ff", "archive"]`

原因：

- 仅安装 schema 还不足以保证 OpenSpec 在本机暴露出公司期望的 workflow surface
- 把 profile/workflows 固定下来，可以让后续 `openspec init` 和用户交互入口更稳定
- 这能减少“schema 已装好但用户仍停留在别的 profile/workflow 组合”带来的行为漂移

实现约束：

- 需要做结构化更新，只改 `profile` 和 `workflows`，不应破坏其他用户配置字段
- 需要考虑已有 config.json 的 repair 场景，而不是只覆盖首次安装
- 后续如果 OpenSpec 为不同平台提供不同用户配置根目录，应优先跟随 OpenSpec 官方目录约定
### 6. OpenSpec workflow assets 以 init 生成结果为源，再按官方 skill 名搬运到用户目录

Praxis 不再维护 OpenSpec workflow skills 的 bundled source；相反，初始化时由 OpenSpec 先在项目工作区生成对应 workflow skills / commands，Praxis 再按 agent-native user-level skill / command surface 的差异把这些结果搬运到用户目录。搬运时保留 OpenSpec 官方 skill 名作为 canonical identity，继续叠加 Praxis overlay，但不再把 skill 重命名为 `opsx-*`。只有在 adopter 成功后，才清理项目内冗余副本与 legacy `opsx-*` projection。

原因：

- 这能让 workflow skill 内容直接跟随 OpenSpec 当前生成结果，而不是跟随 Praxis 自己维护的副本
- 可以避免 `assets/upstream/openspec/skills` 成为另一套事实标准；而 `assets/overlays/openspec/skills` 的阶段内容则迁入 `spec-super` 分发物
- 让 Praxis 的职责回到“安装、搬运、诊断和兼容”而不是“代替 OpenSpec 生成 workflow 文本”
- `AGENTS.md` 不再直接体现具体 command 名后，canonical skill 名与宿主 command 名可以解耦；skill 名统一跟随 OpenSpec 官方，command 差异留给各 agent 自己的 surface 处理

实现约束：

- 搬运逻辑需要保留 OpenSpec 生成内容本身，只允许叠加同阶段 Praxis overlay 与宿主兼容包装，不再做 skill 改名
- 只有在用户目录安装成功后，才能清理项目内冗余 workflow skill 副本
- 需要确认 OpenSpec 后续命令不会因项目副本被移走而失效；若有依赖，则应保留最小兼容路径而非盲删
- Codex 是特例：项目内只生成 workflow skills；`~/.codex/prompts/*.md` 由 OpenSpec 直接写用户目录，Praxis 不重复搬运该 prompt surface

### 7. Stage overlay guidance 作为 schema 分发内容而不是独立 skill 投放物

当前 `assets/overlays/openspec/skills/` 中按阶段维护的 guidance 仍然承载了大量 Praxis 特有 contract。新的边界不是删除这些内容，而是把它们迁为 `spec-super` schema bundle 的组成部分，在分发 schema 时一起下发。

原因：

- 这些内容本质上是公司 workflow 规则，不应再漂浮在独立 skill 投放层
- 这样可以保留现有 stage contract，同时避免 OpenSpec workflow 真源再次拆成 schema 和独立 overlay skill 两处
- 对实现者来说，最终看到的是一份包含阶段 guidance 的公司 schema，而不是“schema + 另一个 skill patch”

实现约束：

- 同阶段 overlay 必须有稳定映射关系，避免 schema stage 与 overlay stage 错配
- schema 打包逻辑需要能把纯文本 overlay guidance 合并进对应 stage 的可分发内容
- 合并后仍要保持现有 docs-aware、verification、debugging 等契约语义

### 8. docs-aware workflow contract 优先迁入 schema/config 可表达层，Praxis docs skills 继续保留

现有 proposal/apply/archive 的 docs-aware 行为不能丢，但要按稳定度分层迁移：`blackbox-test.md` 升格为公司 schema 的正式 artifact；`api-doc.md` 和项目级 API sync 仍保留为条件化 docs 路由；`devos-docs` 和 `devos-change-docs` 继续作为 Praxis 自有能力存在。

原因：

- `blackbox-test.md` 是最稳定、最通用的 change-level docs 输出，适合直接进入 schema artifact graph
- docs task policy 和 artifact language policy 本质上更接近 workflow / project config，而不是 host-specific skill patch
- docs 产出与回写能力仍然是 Praxis 的独特能力，没必要塞回 OpenSpec upstream

实现约束：

- `opsx-propose` 不再负责向 `tasks.md` 注入“生成 `blackbox-test.md`”这一类补丁任务
- `opsx-apply` / `opsx-archive` 需要把 `blackbox-test.md` 视为 schema 产物进行检查和消费，而不是仅依赖 docs tasks
- API 相关文档仍保持按变更语义条件触发，避免因为这次收敛而把所有 docs 输出都一并强制 artifact 化

备选方案：

- 继续把 `blackbox-test.md` 留在 `tasks.md` 注入路径里，只把 wording 调整成“推荐”
- 不采用。这样 docs contract 仍然主要依赖 overlay/task patch，无法体现 company schema 自己的正式输出边界。

备选方案：

- 完全把 `api-doc.md` 也一起升格成正式 artifact
- 暂不采用。API 文档是否需要生成仍强依赖 change 语义判断，这次先收敛最稳定的黑盒文档输出，避免 schema graph 一次性扩张过度。

备选方案：

- 完全删除 docs-aware guidance，先只做 schema 切换
- 不采用。这会让已有 workflow contract 回退，风险过高。

### 9. 收缩 OpenSpec workflow projection 的职责边界，并引入迁移兼容路径

Praxis 不再把 OpenSpec workflow skills 作为默认必须由自身投放的产物，但短期内可保留兼容包装、旧投影清理和迁移提示。

原因：

- 现有用户目录里可能已经存在 Praxis 投放的 `opsx-*`
- 直接硬删除会让升级路径过于陡峭
- 需要一段时间让 `doctor` / `sync` / `setup` 能识别“legacy projection”与“company schema mode”两种状态
- 按原有升级策略清理 legacy `opsx-*`，可以避免新旧命名双轨长期并存

## Risks / Trade-offs

- [Risk] user-level schema 不随项目代码一起版本化，团队成员可能装着不同版本
  → Mitigation: 在 Praxis 中增加 bundled schema version 标识、`doctor` 检查和 `sync` 修复路径。

- [Risk] 用户已有 `~/.config/openspec/config.json`，粗暴覆盖会破坏其他个性化配置
  → Mitigation: 只做结构化字段更新，最小化修改范围，并在测试中覆盖保留 telemetry 等无关字段。

- [Risk] 某些当前 overlay 中的行为未必能完整迁入 schema/config，且 OpenSpec init 生成物未必天然覆盖这些补充
  → Mitigation: 明确区分 workflow semantics 与 host-specific wrappers，先迁主语义，保留必要兼容层。

- [Risk] 同阶段 overlay 合并进 schema 时可能发生错配、重复或语义漂移
  → Mitigation: 为 stage-to-overlay 映射增加显式测试，并以当前 overlay contract 作为回归基线。

- [Risk] 新的 schema bundle 在没有决策记录的情况下默认沿用了官方基线或随意偏离官方基线
  → Mitigation: 在 schema 构建和测试中显式断言最终 artifact order/depends graph，并记录这是保留官方基线还是公司定制。

- [Risk] 把 `blackbox-test.md` 升格为正式 artifact 后，若模板过度细化，可能与 `tasks.md` 或实现测试计划重复
  → Mitigation: 将 `blackbox-test.md` 严格限定为黑盒验证范围、输入/输出与验收场景说明，不承载实现步骤。

- [Risk] 直接移走项目内 skills 可能影响 OpenSpec 对后续命令的预期
  → Mitigation: 先验证 OpenSpec 对项目副本的依赖，再决定是 move、copy+cleanup，还是保留最小占位兼容层。

- [Risk] 现有 in-progress change 和已投放项目可能与新方向冲突
  → Mitigation: 把本次 change 作为新的主方案来源，并为旧 projection 模式提供迁移说明和清理逻辑。

- [Risk] 仅靠 `openspec/config.yaml` 绑定 schema，仍可能被 CLI `--schema` 或 `.openspec.yaml` 覆盖
  → Mitigation: 接受 OpenSpec 官方 precedence，同时在 `doctor` 和文档中解释优先级，避免误判。

## Migration Plan

1. 在 Praxis 资产中引入公司 custom schema 真源，并定义其版本标识与安装目标
   真源位置不再使用仓库 `openspec/schemas/`，改为 `assets/openspec/schemas/spec-super/`
2. 在 `assets/openspec/schemas/spec-super/` 中明确声明公司定制 artifact graph：保留官方基线并新增 `blackbox-test`
3. 为 `blackbox-test.md` 增加模板与 instructions，并将其收敛为与 `tasks.md` 并列的正式 artifact，而不是再注入黑盒 docs task
4. 将 `assets/overlays/openspec/skills/` 的同阶段内容并入 `spec-super` schema bundle，并建立稳定的 stage 映射
5. 调整 setup/bootstrap/sync，使其先按 `XDG_DATA_HOME` / 默认 user-level 路径规则确保 company schema 已安装，再更新 OpenSpec 用户级 `config.json`
6. 更新 init/repair 写入逻辑，让 `openspec/config.yaml` 默认指向公司 schema，并在初始化后按官方 skill 名 adopt OpenSpec 生成的 workflow assets
7. 调整 `AGENTS.md` managed entry，只保留 OpenSpec gate，不直接体现具体 workflow command 名
8. 重构 doctor，使其检查 schema 是否存在、版本是否匹配、项目是否绑定到正确 schema、OpenSpec 用户 profile/workflows 是否符合要求，以及 workflow assets 是否已成功搬运到用户目录
9. 收缩现有 OpenSpec workflow projection 逻辑，使其不再承担默认 workflow 定义职责
10. 为 legacy projected `opsx-*` 模式提供迁移提示、兼容判断和必要清理
11. 更新测试和维护文档，覆盖 schema 安装、artifact graph、`blackbox-test` artifact、OpenSpec user config、project binding、OpenSpec-generated assets adopter、docs contract 保真和迁移路径

## Resolved Decisions

- 公司 schema 版本同时保留在 schema metadata 与旁路 manifest 中：metadata 供 OpenSpec/人读，manifest 供 Praxis 安装、诊断和升级逻辑稳定消费。
- 对缺失 company schema 的机器，`setup` / `bootstrap` / `sync` 自动安装或刷新；`doctor` 只负责诊断并给出 repair 指引，不在检查命令中隐式写环境。
- OpenSpec-generated workflow assets 的 adopter 以“读取项目初始化结果后按 agent surface 适配搬运”为准，不预设所有 agent 都落在同一项目目录结构；实现与测试按 skill / command surface 分别断言。
- `AGENTS.md` 中的流程 gate 只表达 proposal/apply/archive 等阶段语义，不直接引用具体 command 名；skill identity 统一采用 OpenSpec 官方名字，command 名差异由 agent 自己处理。
- `assets/overlays/openspec/skills` 中只有宿主包装或无法进入 schema 的少量兼容内容允许保留在 projection 层；阶段 contract 本身默认并入 schema。
