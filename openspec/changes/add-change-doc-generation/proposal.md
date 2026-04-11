## Why

当前仓库已经把 `docs/surfaces.yaml`、`docs/codemaps/**` 和 OpenSpec 的 `propose/apply/archive` 串起来了，但还缺少一类真正面向人的 change-level 文档交付物：

- 每次 change 完成后，评审者仍然需要自己从代码和 `tasks.md` 里拼“这次应该怎么黑盒验收”
- 当 change 涉及 API 变更时，也缺少一份只描述“本次提案改了什么接口行为”的 `api-doc.md`
- 项目级 API 参考文档需要一个稳定落点，让 archive 阶段知道“把本次 API 变更沉淀到哪里”；这个落点可以由 `doc-init` 初始化，也可以在后续 change 中逐步积累

这会让文档维护仍然停留在临时补充，而不是 proposal/apply/archive 流程中的显式交付。

## What Changes

- 新增 change-local 文档交付约定，统一放在 `openspec/changes/<change>/` 下：
  - `blackbox-test.md`：默认生成
  - `api-doc.md`：仅在本次 change 涉及 API 变更时生成
- 新增统一 `devos-change-docs` skill，以 task 驱动并返回可校验的 structured result，支持 3 种模式：
  - `change-blackbox`
  - `change-api`
  - `project-api-sync`
- 保持现有 `devos-docs` skill 的能力边界不变，仍只负责 `docs/surfaces.yaml` 与 `docs/codemaps/**`；`project-api-sync` 不并入 `devos-docs`，但可复用其 contract / validation / non-destructive writeback 模式
- 更新 `opsx-propose`，让它在生成 `tasks.md` 时自动注入文档任务，并在 `Docs Impact` 中显式声明：
  - `change-blackbox`
  - `change-api`
  - `project-api-sync`
- 更新 `opsx-apply`，把 change-local 文档作为正常任务完成；`change-api` 以当前 change artifacts 为主依据，代码改动只作为补充依据，并允许把文档起草交给 sidecar subagent，但最终 validation 与 writeback 仍由主流程负责
- 将项目级 API 文档稳定落点收敛到 `docs/reference/api.md`；`doc-init` 可初始化其骨架，若尚未初始化，也允许在后续 archive sync 时首次创建并逐步积累
- 更新 `opsx-archive`，要求当本次 change 存在 API 变更时，必须把 change-level `api-doc.md` 的稳定结果同步到 `docs/reference/api.md`，或显式记录 waiver

## Capabilities

### New Capabilities
- `change-doc-artifacts`：定义 change-local 黑盒测试文档、change-level API 文档和项目级 API 参考同步的 skill 约束、structured result、路径边界与最小内容约束
- `project-api-reference`：定义项目级 `docs/reference/api.md` 的初始化与持续同步约定

### Modified Capabilities
- `openspec-docs-sync`：扩展 `Docs Impact` 的可声明范围，并让 `propose/apply/archive` 对 change-level 文档任务和项目级 API 同步义务形成闭环

## Docs Impact

- change-blackbox: yes
- change-api: yes
- project-api-sync: yes
- notes: 这次 change 调整的是 OpenSpec proposal/apply/archive 与项目级 API 参考之间的文档交付闭环

## Impact

- 影响 `assets/skills/opsx-propose/SKILL.md`、`assets/skills/opsx-apply/SKILL.md`、`assets/skills/opsx-archive/SKILL.md` 对文档任务与 `Docs Impact` 的描述
- 影响新的 `devos-change-docs` skill 及其 structured result、path allowlist、validation 规则，同时要求保留 `devos-docs` 现有 boundary
- 影响 `doc-init` / `project-api-sync` 的项目级 API 文档初始化与同步行为
- 影响与 OpenSpec flow、文档 contract 和 archive gate 相关的测试
