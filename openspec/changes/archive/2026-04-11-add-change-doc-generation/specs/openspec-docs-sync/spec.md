## MODIFIED Requirements

### Requirement: OpenSpec 工作流 SHALL 让 `Docs Impact` 覆盖 change-level 文档义务

The system SHALL allow `Docs Impact` to declare and route change-level documentation obligations.

系统必须允许 proposal 阶段用 `Docs Impact` 显式声明 change-level 文档和项目级 API 同步义务，并让 apply/archive 后续阶段消费这些声明。

#### Scenario: proposal 记录 change 文档义务
- **当** `opsx-propose` 生成新的 proposal 或 design artifact
- **则** `Docs Impact` 可以声明 `change-blackbox`
- **并且** 可以声明 `change-api`
- **并且** 可以声明 `project-api-sync`

#### Scenario: 文档任务注入到独立 section 且位于实现任务之后
- **当** `opsx-propose` 为活动 change 生成或更新 `tasks.md`
- **则** change-level 文档任务写入独立的文档交付 section
- **并且** 默认位于主要实现任务之后
- **并且** 这些文档任务被视为依赖实现结果稳定后的交付任务

#### Scenario: apply 用 `Docs Impact` 作为文档任务主信号
- **当** 活动 change 的 `Docs Impact` 已声明 `change-blackbox` 或 `change-api`
- **则** `opsx-apply` 优先按该声明完成对应文档任务
- **并且** 相关任务由 `tasks.md` 的文档交付 section 显式承载

#### Scenario: apply 以已声明义务驱动 API 文档任务
- **当** 活动 change 的 `tasks.md` 或 `Docs Impact` 已经声明 `api-doc.md` 与 `project-api-sync` 义务
- **则** `opsx-apply` 要求补齐 `api-doc.md`
- **并且** 将 `project-api-sync` 视为后续 archive 义务

#### Scenario: apply 完成前对 API 文档义务做 AI 自查
- **当** `opsx-apply` 准备结束当前 change 的实现工作
- **并且** AI 从实现结果中识别到明显的 API 行为变更
- **并且** 当前 `tasks.md` 与 `Docs Impact` 尚未声明 `change-api` 或相关文档义务
- **则** apply 流程应提醒先补录 change artifacts
- **并且** 不应在缺少该决定的情况下静默宣告文档义务已完成

### Requirement: archive SHALL 对声明过的项目级 API 同步义务给出结果

The system SHALL require archive to resolve declared project-level API sync obligations.

系统必须确保 archive 不会在声明过 API 变更和项目级同步义务时静默通过。

#### Scenario: API change 需要同步 evidence 或 waiver
- **当** 当前 change 的 `Docs Impact` 声明 `change-api: yes`
- **并且** 声明 `project-api-sync: yes`
- **则** archive 流程要求存在 `docs/reference/api.md` 已同步的 evidence
- **或** 要求在当前 change artifact 中存在显式 waiver reason

#### Scenario: 仅黑盒文档 change 不触发项目级 API gate
- **当** `Docs Impact` 只声明 `change-blackbox: yes`
- **并且** 未声明 `change-api: yes`
- **则** archive 流程不要求 `docs/reference/api.md` 同步 evidence
