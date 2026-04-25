## Context

`praxis-devos` 当前已经把内置 skills 和 OpenSpec workflow skills 统一投放到各 agent 的原生目录，并通过 managed assets manifest 处理安全覆盖、共享 ownership 和 stale cleanup。企业扩展包这边则另起一套安装器和 projectors，把同一份 agent-native 落点规则重新实现了一遍。

这和当前产品边界不一致：Praxis 本来就应该是“统一投放层”，而企业扩展包应当更像“内容包”。本次设计要把这个职责边界落地，同时保证第一版实现足够小，不引入 npm registry 拉取或 rules/hooks 兼容；但会补一个更泛化的显式 CLI 命令，并支持从本地路径或 git 仓库直接安装当前已支持的资源资产。

## Goals / Non-Goals

**Goals:**

- 让项目可以声明一个或多个外部企业 packs，并在现有 `setup` / `update` 流程中自动投放当前已支持的资源
- 提供一个显式 CLI 命令，支持从本地路径或 git URL 直接执行用户级投放
- 保持现有 agent projection、marker、managed-assets 和 stale cleanup 逻辑不被绕开
- 允许复用现有 `gpaas-rules-pack` 的目录组织，至少支持 `common/skills` + `stacks/<stack>/skills`
- 明确 Praxis 以资源投放器扩展能力，当前至少支持 `skills` 与 `commands`，后续可新增 `rules`

**Non-Goals:**

- 第一版不实现 `rules` 投放器本身，但架构需要为后续新增 `rules` 留出独立扩展位
- 第一版不负责从 npm registry 下载扩展包
- 第一版不把外部 `rules` / `hooks` 映射到 Claude rules、AGENTS.md 或 OpenCode plugins
- 第一版不要求改写现有外部包仓库的全部结构；Praxis 侧会先兼容既有技能目录布局

## Decisions

### Decision: 项目通过 `package.json["praxis-devos"].skillPacks` 声明外部 skill packs

第一版把接入配置放在项目根 `package.json` 的 `"praxis-devos"` 字段下，避免引入新的配置文件。`skillPacks` 支持两种写法：

- 字符串：表示一个相对项目根或绝对路径的 pack 根目录
- 对象：`{ "path": "...", "stacks": ["java", "golang"] }`

其中 `stacks` 仅在 `common/<resource> + stacks/*/<resource>` 布局下生效。

**Alternatives considered:**

- 单独引入 `praxis-devos.json`：结构更专门，但第一版会增加配置面
- 新增 CLI 参数 `--skill-pack`：不利于配置持久化，也不适合 `doctor` / `status` 读取

### Decision: 提供 `install-pack <path-or-git-url> --stack <name>` 作为显式投放入口

除了允许直接编辑 `package.json`，Praxis 还提供 `install-pack` 命令。它的职责边界是：

- 读取并校验本地扩展包路径或 git URL
- 对 `common + stacks` 布局要求显式传入至少一个 `--stack`
- 直接调用现有 projection 链路完成用户级资源投放
- 不改写项目目录中的配置文件

它不是 npm 安装器，但会在用户目录下缓存并刷新 git 仓库 checkout。命令始终按“当前已支持的所有资源类型”投放，而不是针对单一资源加开关。

**Alternatives considered:**

- 只保留手工改 `package.json`：实现最小，但用户体验偏差，而且不利于后续推广
- 做成 `setup --skill-pack ...`：会把一次性安装动作和项目全量 setup 混在一起

### Decision: 扩展包第一版支持本地路径与 git URL

Praxis 直接从本地文件系统读取扩展包，也允许通过 git URL 拉取仓库到用户级缓存目录后再读取。这样能覆盖当前真实场景，例如 sibling repo、git submodule、vendor 目录、公司内部 checkout 或内部 git 仓库，而不必在第一版处理 npm 解析、registry 认证。

**Alternatives considered:**

- 直接支持 npm package name：长期有价值，但会把当前需求从“统一投放”扩大到“包获取和缓存”
- 只支持本地路径：实现更小，但会迫使用户手工 clone 扩展包仓库

### Decision: 支持按资源类型组织的 `flat` 与 `common + stacks` 两类布局

Praxis 接入面按资源类型支持两种确定性布局：

1. `skills/<name>/SKILL.md`
2. `commands/<name>.md`
3. `common/<resource>/<name>` 与可选的 `stacks/<stack>/<resource>/<name>`

这样既能支持简化后的平铺资源包，也能平滑兼容现有 `gpaas-rules-pack` 的目录组织。Praxis 只读取已注册资源投放器声明的目录，未注册的 `rules`、`hooks`、`src`、`bin` 等目录先忽略，后续通过新增资源投放器接入。

**Alternatives considered:**

- 只支持新的 `skills/` 平铺布局：最干净，但会让现有企业包迁移成本过高
- 全量解析 `rules` / `hooks`：能力更完整，但与本次“统一 skills 投放”目标不匹配

### Decision: `install-pack` 对 `common + stacks` 布局要求显式 stack 选择

当扩展包布局包含 `common/<resource> + stacks/*/<resource>` 时，`install-pack` 必须显式传入一个或多个 `--stack`。这样可以避免用户误以为“整包已完成企业资源投放”，但实际只投了 common 部分。

手工编辑 `package.json` 时仍然允许只配置 common skills；这里的约束仅针对显式安装命令。

**Alternatives considered:**

- 命令默认只装 common skills：容易造成误解，与用户期望不一致
- 命令自动装全部 stacks：违背“技术栈显式选择”的原则

### Decision: 投放能力按资源类型拆分，外部 packs 与内置资源共享统一编排层

外部 pack 解析出来的 `skills`、`commands` 等资源，会和内置 `assets/skills/*`、`assets/commands/*`、OpenSpec workflow assets 一起交给独立的 projection service 构建投放计划并执行。该 service 不再通过资源开关混合逻辑，而是按资源投放器列表遍历执行。每个资源投放器各自负责：

- source 发现与冲突校验
- 对应资源的 stale cleanup 与 managed-assets prune
- 对 agent 资源处理器的调用

这样 `setup` / `update` 的框架内置资源投放，以及 `install-pack` 的显式扩展包投放，都复用同一编排层；而后续新增 `rules` 时，只需要增加新的资源投放器和 agent 处理器，不需要回头修改现有 `skills` / `commands` 投放。

**Alternatives considered:**

- 为外部 packs 单独写一套 projector：会再次复制当前已经存在的宿主投放逻辑
- 先把外部 pack 复制进 `assets/skills/` 再投放：会污染仓库边界，也不利于多项目配置差异

### Decision: 技能名冲突直接报错，不做覆盖

如果外部 pack 内部发生重名，或与 Praxis 内置同类资源重名，Praxis 直接拒绝投放并输出冲突源。这样可以避免 silent overwrite 和 agent 端重复发现。

**Alternatives considered:**

- 后者覆盖前者：实现简单，但诊断困难且风险高
- 自动加前缀：会改变用户可见 skill 名称，不符合“扩展包只沉淀内容”的目标

### Decision: `doctor` 需要理解外部 skill pack 期望集，但配置错误不应导致诊断崩溃

projection health 计算时至少也要纳入外部 `skills`，否则 `doctor` 会把企业技能误判为“多余”或“无关”。但如果 pack 路径不存在或布局非法，`doctor` 应该报告配置错误而不是直接抛异常；而 `setup` / `update` 在真正投放时仍然应该失败。

**Alternatives considered:**

- `doctor` 忽略外部 packs：状态不完整，无法支撑运维
- `doctor` 与 `setup` 一样直接抛异常：诊断体验较差

## Risks / Trade-offs

- **[Risk] git pack 缓存会引入 clone/update 生命周期管理** → **Mitigation**：第一版仅维护按 URL 哈希的用户级 checkout，并在重复安装/投放时执行确定性的 fetch + fast-forward 更新
- **[Risk] `common + stacks` 布局继续保留 `rules/hooks` 目录，用户误以为 Praxis 会立即消费它们** → **Mitigation**：文档和校验里明确只有已注册资源投放器声明的目录会被读取
- **[Risk] 外部资源名与内置同类资源冲突** → **Mitigation**：在对应资源的 source 收集阶段做硬错误，给出冲突源
- **[Risk] projection health 与 managed cleanup 逻辑因为新增 source 类型而回归** → **Mitigation**：补测试覆盖配置读取、投放、清理和 doctor 行为

## Migration Plan

1. 在 OpenSpec change 中定义 `package.json["praxis-devos"].skillPacks` 合同、`install-pack` 命令合同和支持的目录布局。
2. 在 `src/projection/` 中新增外部 pack resource source 发现逻辑，并接入统一 projection service。
3. 在 CLI 层实现 `install-pack`，负责直接触发用户级资源投放。
4. 调整 projection health，使 `doctor` 能看到外部 skill packs 并处理配置错误。
5. 为本地 path pack、git pack、`common + stacks` 布局、support files、冲突报错和 doctor 诊断补测试。
6. 更新 `docs/surfaces.yaml` 与 `docs/codemaps/project-overview.md`，记录新的项目配置面和命令面。

## Open Questions

- 第一版是否需要在仓库内提供一份外部 skill pack 示例模板，还是先只记录格式合同？
