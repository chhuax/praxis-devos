## ADDED Requirements

### Requirement: OpenSpec proposal SHALL 显式规划 change-local 文档交付

The system SHALL plan change-local documentation deliverables during proposal generation.

系统必须在 proposal 阶段把 change-local 文档交付写入 `tasks.md`，而不是把文档生成留到 apply 收尾时再临时决定。

#### Scenario: 黑盒测试文档任务默认存在
- **当** `opsx-propose` 为一个新的 change 生成 `tasks.md`
- **则** 结果中包含生成 `openspec/changes/<change>/blackbox-test.md` 的任务
- **并且** 该任务不依赖 API change 判定

#### Scenario: API 文档任务按需存在
- **当** proposal 或 design 明确声明本次 change 涉及 API 变更
- **则** `tasks.md` 中包含生成 `openspec/changes/<change>/api-doc.md` 的任务
- **并且** `tasks.md` 中包含同步 `docs/reference/api.md` 的任务

### Requirement: change-local 文档生成 SHALL 使用 structured result 和封闭写回边界

The system SHALL generate change-local docs through a structured result with a closed write boundary.

系统必须通过统一的 structured result 生成 change-local 文档，而不是允许自由写入任意仓库路径。

#### Scenario: `change-blackbox` 只能写黑盒测试文档
- **当** `devos-change-docs` 以 `mode=change-blackbox` 返回结果
- **则** 合法输出路径只能是 `openspec/changes/<change>/blackbox-test.md`
- **并且** 其他路径在 writeback 前必须被 validation 拒绝
- **并且** 如果结果包含 `changeId`，它必须与当前活动 change 一致

#### Scenario: `change-api` 只能写 change-level API 文档
- **当** `devos-change-docs` 以 `mode=change-api` 返回结果
- **则** 合法输出路径只能是 `openspec/changes/<change>/api-doc.md`
- **并且** 其他路径在 writeback 前必须被 validation 拒绝
- **并且** 如果结果包含 `changeId`，它必须与当前活动 change 一致

#### Scenario: 主流程保留最终写回 authority
- **当** 文档起草由主流程或 sidecar subagent 完成
- **则** 主流程仍然负责最终 validation、writeback 和任务勾选
- **并且** sidecar subagent 不得绕过 validation 直接修改目标文件

#### Scenario: `project-api-sync` 不扩大 `devos-docs` 的写回边界
- **当** 系统实现 `project-api-sync`
- **则** `devos-docs` 的合法输出目标仍然只包含 `docs/surfaces.yaml` 与 `docs/codemaps/**`
- **并且** `docs/reference/api.md` 只能通过 `devos-change-docs` 的 `project-api-sync` contract 写入
- **并且** 实现可以复用现有 docs contract validation 或 writeback helper

#### Scenario: `change-api` 以 change artifacts 为主依据，以实现改动补充细节
- **当** `devos-change-docs` 以 `mode=change-api` 生成结果
- **则** 系统优先依据当前 change 的 `proposal.md`、`design.md`、`tasks.md` 与 `specs/**` 识别 API 范围
- **并且** 可以引用实现改动补充请求、响应、错误与兼容性细节
- **并且** 当 change artifacts 与实现改动明显冲突时返回需要澄清的结果，而不是静默选择其一

#### Scenario: structured result 要求澄清时不得直接写回
- **当** `devos-change-docs` 返回的 structured result `status` 表示需要澄清
- **则** 主流程不得执行目标文件 writeback
- **并且** 必须把 `reason` 报告为当前 change 仍需补充或对齐的依据

### Requirement: change-local 文档 SHALL 满足最小章节约束

The system SHALL enforce minimum required sections for change-local docs.

系统必须为 change-local 文档定义最小章节集合，避免只靠 demo 示例导致格式漂移。

#### Scenario: `blackbox-test.md` 包含最小黑盒测试章节
- **当** 系统生成 `openspec/changes/<change>/blackbox-test.md`
- **则** 文档至少包含以下章节：
- **并且** `测试目标`
- **并且** `测试范围`
- **并且** `前置条件`
- **并且** `请求/操作约束`
- **并且** `核心黑盒场景`
- **并且** `通过标准`
- **并且** `回归重点`

#### Scenario: `api-doc.md` 包含最小 API 文档章节
- **当** 系统生成 `openspec/changes/<change>/api-doc.md`
- **则** 文档至少包含以下章节：
- **并且** `接口概览`
- **并且** `接口说明`
- **并且** `请求参数`
- **并且** `返回参数`
- **并且** `业务规则`
- **并且** `错误场景`
- **并且** `调用示例`
- **并且** `实现落点`

#### Scenario: 章节校验遵守 artifact language policy
- **当** 系统校验 `blackbox-test.md` 或 `api-doc.md` 的必填章节
- **则** validator 根据当前 artifact language policy 选择标题别名集合
- **并且** 第一版至少支持 `zh-CN` 与 `en` 两组标题等价映射
