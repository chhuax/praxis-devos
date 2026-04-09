## MODIFIED Requirements

### Requirement: host command adapters SHALL remain consistent with the existing docs contract

The system SHALL ensure that host command adapters do not introduce a second docs contract.

#### Scenario: command 模板引用 canonical docs path
- **当** Claude 或 OpenCode command 模板被安装
- **则** 模板引用当前 canonical docs path：`docs/surfaces.yaml`
- **并且** 模板引用 `docs/codemaps/**`

#### Scenario: command 模板不改变 allowed target set
- **当** Claude 或 OpenCode command 模板触发 `devos-docs`
- **则** 它们必须遵守已有 allowed target set
- **并且** 不得把 `contracts/surfaces.yaml` 之类非 canonical path 讲成有效目标

#### Scenario: refresh command 明确保守更新
- **当** `devos-docs-refresh` command 被投放
- **则** 模板明确 refresh 是非破坏性的更新
- **并且** 不隐式删除、重命名或迁移 docs 产物

#### Scenario: command asset source is shared across supported hosts
- **当** Claude 与 OpenCode 投放 docs command adapter
- **则** 它们从同一份 bundled command source 读取模板
- **并且** 宿主差异只体现在目标投放目录
- **并且** 不再要求为不同宿主维护重复的 source command 文件
