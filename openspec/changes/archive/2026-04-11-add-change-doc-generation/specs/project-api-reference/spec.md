## ADDED Requirements

### Requirement: 项目级 API 参考文档 SHALL 有稳定 canonical path

The system SHALL use `docs/reference/api.md` as the canonical project API reference path.

系统必须把项目级稳定 API 参考文档收敛到 `docs/reference/api.md`，以便 `doc-init` 和 archive sync 都有明确目标。

#### Scenario: `doc-init` 可以初始化项目级 API 参考文档
- **当** 项目触发 `doc-init`
- **并且** `docs/reference/api.md` 尚不存在
- **则** 系统可以创建 `docs/reference/api.md`
- **并且** 不要求先存在某个历史 API 参考文件

#### Scenario: `project-api-sync` 在缺少初始化时可以首次创建目标文件
- **当** archive 前执行 `project-api-sync`
- **并且** `docs/reference/api.md` 尚不存在
- **则** 系统仍可以创建 `docs/reference/api.md`
- **并且** 其内容以当前 change 已稳定的 API 结果为起点逐步积累

#### Scenario: 项目级 API 参考文档路径是封闭的
- **当** `devos-change-docs` 以 `mode=project-api-sync` 返回结果
- **则** 合法输出路径只能是 `docs/reference/api.md`
- **并且** 不得借此写入其他 `docs/reference/*.md` 文件
- **并且** 如果结果包含 `changeId`，它可以指向来源 change 以提供 traceability

### Requirement: 项目级 API 参考文档 SHALL 支持 change-level API 文档的稳定沉淀

The system SHALL support syncing stable outcomes from change-level API docs into the project API reference.

系统必须允许把 `openspec/changes/<change>/api-doc.md` 中已经稳定的结果同步进 `docs/reference/api.md`。

#### Scenario: archive 前同步 API 变更
- **当** 当前 change 的 `Docs Impact` 声明 `change-api: yes`
- **并且** `project-api-sync: yes`
- **则** archive 前流程要求 `docs/reference/api.md` 已完成同步
- **或** 明确记录 waiver reason

#### Scenario: 无 API 变更时不强制同步
- **当** 当前 change 的 `Docs Impact` 未声明 API 变更
- **则** archive 流程不要求同步 `docs/reference/api.md`

### Requirement: 项目级 API 参考文档 SHALL 有最小稳定结构

The system SHALL enforce a minimum stable structure for `docs/reference/api.md`.

系统必须为 `docs/reference/api.md` 定义最小稳定结构，以便它既能作为首次初始化结果，也能作为后续同步目标。

#### Scenario: `docs/reference/api.md` 包含最小参考结构
- **当** 系统创建或更新 `docs/reference/api.md`
- **则** 文档至少包含以下章节：
- **并且** `API 总览`
- **并且** `接口目录`
- **并且** `请求/响应摘要`
- **并且** `兼容性或变更说明`
- **并且** `契约与实现落点`

### Requirement: 项目级 API 参考文档 SHALL 采用 non-destructive managed-section 更新

The system SHALL update `docs/reference/api.md` through a non-destructive managed-section strategy.

系统必须以 non-destructive 的方式更新 `docs/reference/api.md`，而不是在 sync 时重写整份文件。

#### Scenario: 保留 managed section 外的用户内容
- **当** `project-api-sync` 更新一个已存在的 `docs/reference/api.md`
- **则** 系统只替换受管理的生成 section
- **并且** managed section 之外的用户内容必须保留

#### Scenario: 删除的接口从 managed inventory 中移除
- **当** 某个接口已不属于当前稳定 API 集合
- **则** `project-api-sync` 可以将其从 managed inventory 中移除
- **并且** 如果该变化属于 breaking 或迁移风险，文档需要在 `兼容性或变更说明` 中留下对应提示
