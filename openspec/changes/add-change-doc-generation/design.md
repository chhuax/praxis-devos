## Context

当前仓库已经有两类文档能力：

- AI-first lightweight docs：`docs/surfaces.yaml` 与 `docs/codemaps/**`
- OpenSpec docs flow：`opsx-propose`、`opsx-apply`、`opsx-archive` 会读取 docs context，并在 apply/archive 前做 docs refresh assessment

但这两类能力还没有覆盖“每个 change 自己要交付什么给人看”的需求。用户已经明确希望：

- `blackbox-test.md` 作为 change-level 产物，默认存在
- `api-doc.md` 作为 change-level 产物，仅在 API change 时存在
- 这两类文件都放在 `openspec/changes/<change>/` 下，不影响 OpenSpec 主工件
- 项目级稳定 API 文档放在 `docs/reference/api.md`
- `doc-init` 可以初始化项目级 API 文档，但不是前置条件
- `archive` 前要把 change-level API 变化同步到项目级 API 文档
- 文档生成可以用 sidecar subagent 加速，但不能把 subagent 作为唯一路径

## Goals / Non-Goals

**Goals:**

- 让 OpenSpec proposal 阶段能显式规划文档交付，而不是只在 apply 收尾时提醒
- 为 change-level 黑盒测试文档和 API 文档建立统一的 skill 约束、structured result、最小章节约束和 writeback 边界
- 为项目级 `docs/reference/api.md` 建立 archive 同步约定，并允许由 `doc-init` 提前初始化
- 让 apply/archive 对 change-level 文档和 project-level API reference 形成闭环
- 允许 sidecar subagent 并行生成文档，但主流程保留 validation 与 writeback authority

**Non-Goals:**

- 不把 `blackbox-test.md` 或 `api-doc.md` 提升成 OpenSpec schema 的强制核心 artifact 类型
- 不在本次 change 中新增完整的 docs portal、OpenAPI parser 或接口静态分析器
- 不扩展到 `docs/guides/`、`docs/runbooks/`、`docs/changelog/` 等其他 docs family
- 不要求 `devos-change-docs` 直接写仓库任意路径

## Decisions

### 1. change-local 文档继续留在 `openspec/changes/<change>/`，不改变 OpenSpec 主 artifact 集合

这次不改 `proposal.md`、`design.md`、`tasks.md`、`specs/**` 的核心地位。新增文档只是 change-local delivery artifacts：

- `openspec/changes/<change>/blackbox-test.md`
- `openspec/changes/<change>/api-doc.md`

它们的职责是：

- 帮评审者快速理解“这次应该怎么黑盒验收”
- 帮接口消费者快速理解“这次 API 改了什么”
- 作为 archive 前同步到稳定项目文档的中间产物

备选方案：

- 把两份文档都塞进 `proposal.md` / `design.md`
- 不采用。这样会让 proposal 工件混入大量 apply 后才稳定的信息，也不利于 change-level 文档单独演进。

### 2. 使用一个统一 `devos-change-docs` skill，而不是两个重复 skill，并保留 `devos-docs` 现有边界

这次采用单一 skill：

- `devos-change-docs`

支持 3 个 mode：

- `change-blackbox`
- `change-api`
- `project-api-sync`

原因：

- change-local 黑盒文档、change-level API 文档和项目级 API 同步共享大量上下文来源、validation 规则和 writeback 约束
- 用一个 skill 更容易共享输入约束、path allowlist 和 test harness
- 后续如果要补 `migration`、`runbook-impact` 等文档类型，也可以继续扩 mode，而不是继续堆叠 skill 名称

同时明确：

- 现有 `devos-docs` 继续只负责 `docs/surfaces.yaml` 与 `docs/codemaps/**`
- `project-api-sync` 不直接并入 `devos-docs`
- 实现层可以复用 `devos-docs` 已有的 structured result 约束、validator、non-destructive writeback helper 和 allowlist 设计思路
- `src/core/praxis-devos.js` 作为脚手架与投放层，不承担任何人类文档内容生成；它最多只负责命令路由、能力投放和确定性校验

这样可以避免把“AI-first 项目地图”和“面向人的 API 参考文档”揉成一个过宽的 skill。

### 3. 文档生成返回 structured result，主流程验证后再写回

和现有 `devos-docs` 一样，`devos-change-docs` 不直接自由写文件，而是先返回一份供主流程消费的 structured result，再由调用方校验并写回。

建议 structured result 至少包含：

- `schemaVersion`
- `mode`
- `changeId`
- `path`
- `content`
- `sources`
- `status` / `reason`（当 skill 认为当前输入仍需澄清时）

验证规则：

- `schemaVersion` 必须存在且等于 `1`
- `changeId` 在 `change-blackbox` 与 `change-api` 场景下建议返回；若返回则必须与活动 change 一致
- `mode` 只能是 `change-blackbox`、`change-api`、`project-api-sync`
- `path` 必须命中 mode 对应的 allowlist
- `content` 必须存在且非空
- `sources` 必须只包含当前 change 或项目允许读取的上下文文件
- 内容必须满足对应文档类型的最小章节要求

路径白名单：

- `change-blackbox` 只能写 `openspec/changes/<change>/blackbox-test.md`
- `change-api` 只能写 `openspec/changes/<change>/api-doc.md`
- `project-api-sync` 只能写 `docs/reference/api.md`

### 4. 通过最小章节模板约束文档形态，而不是只依赖 demo 示例

`demo/api-doc.md` 和 `demo/blackbox-test.md` 继续作为风格示例，但真正的约束落在 skill 的 structured result 约束与 validator 上。

`blackbox-test.md` 最少包含：

- 测试目标
- 测试范围
- 前置条件
- 请求/操作约束
- 核心黑盒场景
- 通过标准
- 回归重点

`api-doc.md` 最少包含：

- 接口概览
- 接口说明
- 请求参数
- 返回参数
- 业务规则
- 错误场景
- 调用示例
- 实现落点

`docs/reference/api.md` 最少包含：

- API 总览
- 接口目录
- 请求/响应摘要
- 兼容性或变更说明
- 契约与实现落点

章节约束不按单一中文字面量硬编码，而是按 artifact language policy 选择标题别名集合。第一版至少支持：

- `zh-CN`：`测试目标`、`接口概览` 等中文标题
- `en`：`Test Objectives`、`API Overview` 等英文等价标题

这样 demo 提供示例密度，structured result 约束负责兜底一致性，同时避免语言策略与 validator 打架。

### 5. `opsx-propose` 负责把文档交付显式写入 `tasks.md`

proposal 阶段是这次 change 的主切入点。`opsx-propose` 需要做两件事：

1. 自动补文档任务
2. 自动记录机器可消费的 `Docs Impact`

推荐 `Docs Impact` 形状：

```md
## Docs Impact

- change-blackbox: yes
- change-api: yes/no
- project-api-sync: yes/no
- notes: <brief reason>
```

任务注入规则：

- 默认注入 `blackbox-test.md` 任务
- 当 proposal/design 明确存在 API 变更时，注入 `api-doc.md` 任务
- 当 proposal/design 明确存在 API 变更时，也注入 `docs/reference/api.md` 同步任务
- 文档任务放在 `tasks.md` 的独立“文档交付” section，默认位于实现任务之后
- 文档任务默认依赖相关实现与验证已经完成，避免在行为未稳定前过早生成人类文档

这样 `tasks.md` 对人可见，`Docs Impact` 对后续 stage 可消费，两者互相补强。

### 6. `opsx-apply` 由任务驱动文档生成，change artifacts 是主依据

`opsx-apply` 的职责不是“提醒应该写文档”，而是把文档当成真正的 pending task 去完成。

执行策略：

- 默认由主流程驱动 `devos-change-docs`
- 触发信号来自 `tasks.md` 与 `Docs Impact` 中已声明的文档义务，而不是由 JS 再去做语义推断
- `change-api` 应优先依据当前 change 的 `proposal.md`、`design.md`、`tasks.md` 与 `specs/**` 识别本次受影响的 API 范围
- 代码改动可以作为补充证据，用来校验和补全接口细节，但不应反客为主地重新定义 change scope
- 如果 change artifacts 与实现改动之间存在明显冲突，skill 应返回需要澄清的结果，而不是由流程侧静默选择其一
- apply 完成前应做一次 AI 自查；如果实现已明显引入 API 行为变更，但 `tasks.md` / `Docs Impact` 尚未声明 `change-api` 与相关文档义务，应先提醒补录 change artifacts，再继续完成流程
- 如果代码改动和文档生成可以独立推进，允许 sidecar subagent 起草 `change-blackbox` 或 `change-api`
- 但 subagent 只负责生成 structured result
- validation、最终 writeback、task 勾选和 completion recap 仍由主流程负责

这样既能利用并行，又不会让“有无 subagent”影响功能正确性。

### 7. `project-api-sync` 只负责 archive 时的稳定同步，`doc-init` 负责初始化

项目级 API 参考文档的稳定落点是：

- `docs/reference/api.md`

职责拆分如下：

- `doc-init` 可以创建项目级 API 文档的初始骨架
- `project-api-sync` 在 archive 前把当前 change 的 `api-doc.md` 稳定内容合并到 `docs/reference/api.md`
- 如果 `docs/reference/api.md` 尚不存在，`project-api-sync` 也可以首次创建它，让项目级 API 文档按 change 逐步积累

这样初始化和沉淀是两个时机，但共享同一个稳定目标文件。

这里的 non-destructive 更新语义定义为：

- `docs/reference/api.md` 中允许存在 managed section
- `project-api-sync` 只替换 managed section 内的生成内容
- managed section 外的用户内容必须保留
- 当某个接口在当前稳定 API 集合中被删除时，可以从 managed inventory 中移除
- 如果删除属于 breaking 或迁移风险，managed section 需要在“兼容性或变更说明”中留下对应提示

这里的边界是：

- `doc-init` 可以单独初始化 `docs/reference/api.md`
- `project-api-sync` 只负责 archive 阶段的稳定沉淀
- 这不意味着 `devos-docs` 的 mode 或 write target 要扩到 `docs/reference/api.md`
- `devos-docs` 仍保持 codemap / surfaces 导向，`project-api-sync` 则是 change-docs family 的一部分

### 8. `opsx-archive` 必须对 API change 的稳定沉淀给出结果，而不是静默归档

当 `Docs Impact` 声明：

- `change-api: yes`
- `project-api-sync: yes`

archive 阶段必须满足二选一：

- 已完成 `docs/reference/api.md` 同步，并有 evidence
- 明确记录 waiver reason

不允许在存在 API change 的情况下直接归档而不交代项目级 API 文档结果。

## Risks / Trade-offs

- [Risk] change artifacts 对 API 范围描述不足，导致 `change-api` 输出失焦
  → Mitigation: 让 proposal/design/specs 成为主依据，并允许 skill 引用实现改动补全细节；当两者明显冲突时返回需要澄清的结果。

- [Risk] `doc-init` 与 `project-api-sync` 都会触达 `docs/reference/api.md`
  → Mitigation: 让二者职责分离，一个负责初始化骨架，一个负责 archive 沉淀，并统一遵守同一个目标路径与 non-destructive 写回规则。

- [Risk] sidecar subagent 输出质量不稳定
  → Mitigation: subagent 只产出 structured result，不直接写回；validation 失败时由主流程拒绝。

- [Risk] 最小章节模板可能让文档看起来过于格式化，或与项目语言策略冲突
  → Mitigation: 约束只锁定章节语义和语言别名集合，不锁定段落长度和具体表达；第一版至少支持中文和英文标题映射。

## Migration Plan

1. 新增 `devos-change-docs` skill 约束和对应 validator / writeback helper
2. 更新 `opsx-propose`，让 `tasks.md` 自动包含文档任务，并记录 `Docs Impact`
3. 更新 `opsx-apply`，完成 change-level 文档任务并支持 optional sidecar subagent
4. 更新 `doc-init`，初始化 `docs/reference/api.md` 骨架
5. 更新 `project-api-sync`，在 archive 阶段维护 `docs/reference/api.md`
6. 更新 `opsx-archive`，在 API change 场景下要求稳定文档同步 evidence 或 waiver
7. 补充测试，锁定 proposal/apply/archive 与 path allowlist/section validation 行为

## Open Questions

- 当前没有进一步的产品级 open question；实现阶段重点在于把 task 驱动触发、章节校验和 project-level sync evidence 做成稳定测试
