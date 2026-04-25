## Why

当前企业扩展包原型仓库把 `skills` 内容和 target-specific 投放器绑在一起维护，这会导致同一套 agent 投放逻辑在 `praxis-devos` 与扩展包仓库之间重复实现。结果是：

- `praxis-devos` 已经具备 user-level projection、managed assets 和清理能力，但企业扩展包又各自实现一套安装/更新逻辑
- 企业内容仓库一旦只想沉淀 skill bundle，本身仍然要维护 Claude/Codex/OpenCode 的投放细节，职责过重
- 同一份技能资产的升级路径被拆成“两边都要跟”，不利于后续企业包的统一接入

现在需要把企业级扩展包能力真正落到 `praxis-devos`：由 Praxis 负责投放，扩展包只负责提供 skills 资产与少量元数据。

## What Changes

- 新增项目级外部 skill pack 配置入口，允许项目在 `package.json` 中声明要接入的企业扩展包本地路径或 git URL
- 新增显式 CLI 命令 `install-pack`，用于从本地路径或 git URL 直接执行当前已支持资产的用户级投放
- 新增外部 skill pack source loader，让 `setup` / `update` / `doctor` / projection health 都能把这些扩展包的 skills 视为正式投放源
- 支持两类扩展包布局：
  - `skills/<name>/SKILL.md`
  - `common/skills/<name>/SKILL.md` + `stacks/<stack>/skills/<name>/SKILL.md`
- 明确 Praxis 会按“当前已支持的资源类型”消费扩展包内容，当前至少覆盖 `skills` 与 `commands`；`rules`、`hooks` 等后续通过新增资源投放器接入
- 为外部 skill pack 增加重复技能名冲突检测、缺失路径校验，以及投放后的 stale cleanup 兼容

## Capabilities

### New Capabilities
- `enterprise-skill-pack-projection`: 允许项目声明外部企业 skill packs，并通过 Praxis 现有 agent projection 能力统一投放

### Modified Capabilities
- 无

## Impact

- 影响 `src/projection/` 的 skill source 发现逻辑和 projection health 计算方式
- 影响 `setup` / `update` / `doctor` 对“预期 skills 集合”的判断
- 影响项目配置面，需要在 `package.json` 新增 `praxis-devos.skillPacks`
- 影响 CLI 命令面，新增更泛化的 `install-pack`；当前阶段实际只做用户级 skills 投放，并为 git pack 维护用户级缓存 checkout
- 不要求企业扩展包继续保留自己的 target-specific projector；Praxis 会承担这部分职责

## Docs Impact

- change-blackbox: no
- change-api: no
- project-api-sync: no
- surfaces: yes
- project-overview: yes
- module-map: no
- modules: src/projection, src/core/runtime, docs
- notes: 需要记录项目级 `package.json` 配置格式、git pack 缓存行为，以及企业 skill pack 的受支持目录布局
